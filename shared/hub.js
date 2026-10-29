/*
 * Life apps: the sync client every app shares.
 *
 * The screen never waits for Google. Every app keeps a full copy of its own
 * data on the device, and every change goes into an outbox first. The outbox
 * is sent to the hub whenever the device can reach it; then anything changed
 * elsewhere is pulled back in.
 *
 *   const hub = new Hub("household");
 *   hub.all("items")                       rows, deleted ones left out
 *   hub.put("items", { name: "Milk" })     add or change; returns the row
 *   hub.remove("items", id)                mark deleted
 *   hub.on(fn)                             called after any change or sync
 *   hub.start()                            sync now, then keep syncing
 */
(function (global) {
  "use strict";

  var CONFIG_KEY = "lifeapps.config";
  var KEEP_DELETED_DAYS = 90;
  var PUSH_CHUNK = 500;

  function readJSON(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
  }

  function newId() {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var bytes = new Uint8Array(12);
    global.crypto.getRandomValues(bytes);
    var out = "";
    for (var i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length];
    return out;
  }

  function copy(row) {
    var out = {};
    Object.keys(row || {}).forEach(function (k) {
      out[k] = row[k];
    });
    return out;
  }

  /* -------------------------------------------------------------- */
  /*  the address and key, shared by every app on this device        */
  /* -------------------------------------------------------------- */

  function getConfig() {
    var c = readJSON(CONFIG_KEY, null);
    return c && c.url && c.key ? c : null;
  }

  /** extra: { name, apps } from the hub's answer to ping, so apps know who this is */
  function setConfig(url, key, extra) {
    var c = { url: String(url).trim(), key: String(key).trim() };
    if (extra && extra.name) c.name = String(extra.name);
    if (extra && extra.apps) c.apps = extra.apps;
    writeJSON(CONFIG_KEY, c);
  }

  function clearConfig() {
    global.localStorage.removeItem(CONFIG_KEY);
  }

  /** Sends one request to the hub. Throws on network trouble or a hub error. */
  function call(config, body) {
    var payload = copy(body);
    payload.key = config.key;
    /* text/plain keeps this a "simple" request: Apps Script cannot answer
       the extra permission check a browser makes for application/json */
    return global
      .fetch(config.url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
      })
      .then(
        function (res) {
          return res.text().then(function (text) {
            var data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              var err = new Error("The hub answered with something that is not JSON. Check the address ends in /exec.");
              err.kind = "hub";
              throw err;
            }
            if (!data.ok) {
              var hubErr = new Error(data.error || "The hub said no.");
              hubErr.kind = "hub";
              throw hubErr;
            }
            return data;
          });
        },
        function () {
          var err = new Error("Cannot reach the hub.");
          err.kind = "offline";
          throw err;
        }
      );
  }

  /* -------------------------------------------------------------- */
  /*  one app's data                                                 */
  /* -------------------------------------------------------------- */

  function Hub(app) {
    this.app = app;
    this.storeKey = "lifeapps.data." + app;
    var saved = readJSON(this.storeKey, null) || {};
    this.tables = saved.tables || {}; // table -> id -> row
    this.outbox = saved.outbox || {}; // "table/id" -> { table, row, rev }
    this.cursor = saved.cursor || "";
    this.lastSync = saved.lastSync || "";
    this.rev = saved.rev || 0;
    this.state = "idle"; // idle | syncing | offline | error
    this.error = "";
    this.listeners = [];
    this.running = null;
    this.timer = null;
  }

  Hub.config = getConfig;
  Hub.setConfig = setConfig;
  Hub.clearConfig = clearConfig;
  Hub.call = call;
  Hub.newId = newId;

  Hub.prototype.save = function () {
    try {
      writeJSON(this.storeKey, {
        tables: this.tables,
        outbox: this.outbox,
        cursor: this.cursor,
        lastSync: this.lastSync,
        rev: this.rev,
      });
    } catch (e) {
      this.state = "error";
      this.error =
        e && (e.name === "QuotaExceededError" || e.code === 22)
          ? "This device is out of room for app data."
          : "Could not save on this device: " + ((e && e.message) || e);
      if (global.console) global.console.error(e);
    }
  };

  Hub.prototype.on = function (fn) {
    this.listeners.push(fn);
  };

  Hub.prototype.emit = function () {
    var self = this;
    this.listeners.forEach(function (fn) {
      try {
        fn(self);
      } catch (e) {
        if (global.console) global.console.error(e);
      }
    });
  };

  /** Rows of a table, deleted ones left out, oldest first. */
  Hub.prototype.all = function (table) {
    var t = this.tables[table] || {};
    return Object.keys(t)
      .map(function (id) {
        return t[id];
      })
      .filter(function (r) {
        return !r.del;
      });
  };

  Hub.prototype.get = function (table, id) {
    var r = (this.tables[table] || {})[id];
    return r && !r.del ? r : null;
  };

  /** True while a row's latest change has not reached the hub yet. */
  Hub.prototype.isPending = function (table, id) {
    return !!this.outbox[table + "/" + id];
  };

  Hub.prototype.pendingCount = function () {
    return Object.keys(this.outbox).length;
  };

  /** Adds a row, or changes the fields given on an existing one. */
  Hub.prototype.put = function (table, row) {
    var t = (this.tables[table] = this.tables[table] || {});
    var id = row.id || newId();
    var merged = copy(t[id]);
    /* writing to a row that was deleted brings it back, unless this write deletes it */
    if (merged.del && !Object.prototype.hasOwnProperty.call(row, "del")) merged.del = "";
    Object.keys(row).forEach(function (k) {
      if (k !== "ts") merged[k] = row[k];
    });
    merged.id = id;
    if (merged.del === undefined) merged.del = "";
    if (merged.ts === undefined) merged.ts = "";
    t[id] = merged;
    this.rev++;
    var sent = copy(merged);
    delete sent.ts;
    this.outbox[table + "/" + id] = { table: table, row: sent, rev: this.rev };
    this.save();
    this.emit();
    this.soon();
    return merged;
  };

  /**
   * Adds or changes many rows at once: [{ table, row }, ...]. Same as put,
   * but saves and redraws once, for imports and bills that post themselves.
   */
  Hub.prototype.putMany = function (items) {
    var self = this;
    var out = [];
    items.forEach(function (it) {
      var t = (self.tables[it.table] = self.tables[it.table] || {});
      var id = it.row.id || newId();
      var merged = copy(t[id]);
      if (merged.del && !Object.prototype.hasOwnProperty.call(it.row, "del")) merged.del = "";
      Object.keys(it.row).forEach(function (k) {
        if (k !== "ts") merged[k] = it.row[k];
      });
      merged.id = id;
      if (merged.del === undefined) merged.del = "";
      if (merged.ts === undefined) merged.ts = "";
      t[id] = merged;
      self.rev++;
      var sent = copy(merged);
      delete sent.ts;
      self.outbox[it.table + "/" + id] = { table: it.table, row: sent, rev: self.rev };
      out.push(merged);
    });
    if (!items.length) return out;
    this.save();
    this.emit();
    this.soon();
    return out;
  };

  /** A row as stored on this device, deleted or not. */
  Hub.prototype.raw = function (table, id) {
    return (this.tables[table] || {})[id] || null;
  };

  Hub.prototype.remove = function (table, id) {
    if (!(this.tables[table] || {})[id]) return;
    this.put(table, { id: id, del: new Date().toISOString() });
  };

  /** Sync shortly, so a burst of changes goes up as one request. */
  Hub.prototype.soon = function () {
    var self = this;
    clearTimeout(this.timer);
    this.timer = setTimeout(function () {
      self.sync();
    }, 400);
  };

  /** Sends the outbox, then pulls what changed. Never throws. */
  Hub.prototype.sync = function () {
    var self = this;
    if (this.running) return this.running;
    var config = getConfig();
    if (!config) {
      this.state = "error";
      this.error = "This device is not unlocked.";
      this.emit();
      return Promise.resolve(false);
    }
    this.state = "syncing";
    this.emit();
    this.running = this.pushAll(config)
      .then(function () {
        return self.pull(config);
      })
      .then(function () {
        self.state = "idle";
        self.error = "";
        self.lastSync = new Date().toISOString();
        self.save();
        return true;
      })
      .catch(function (err) {
        self.state = err && err.kind === "offline" ? "offline" : "error";
        self.error = (err && err.message) || String(err);
        return false;
      })
      .then(function (ok) {
        self.running = null;
        self.emit();
        /* something changed while that request was out: go again */
        if (ok && self.pendingCount()) self.soon();
        return ok;
      });
    return this.running;
  };

  Hub.prototype.pushAll = function (config) {
    var self = this;
    var keys = Object.keys(this.outbox);
    if (!keys.length) return Promise.resolve();
    var chunk = keys.slice(0, PUSH_CHUNK);
    var sent = chunk.map(function (k) {
      return { key: k, rev: self.outbox[k].rev };
    });
    var rows = chunk.map(function (k) {
      return { table: self.outbox[k].table, row: self.outbox[k].row };
    });
    return call(config, { action: "push", app: this.app, rows: rows }).then(function (res) {
      sent.forEach(function (s) {
        var item = self.outbox[s.key];
        /* only clear what was sent; a newer change stays queued */
        if (item && item.rev === s.rev) {
          delete self.outbox[s.key];
          var local = (self.tables[item.table] || {})[item.row.id];
          if (local) local.ts = res.ts;
        }
      });
      self.save();
      return self.pushAll(config);
    });
  };

  Hub.prototype.pull = function (config) {
    var self = this;
    return call(config, { action: "pull", app: this.app, since: this.cursor }).then(function (res) {
      var tables = res.tables || {};
      Object.keys(tables).forEach(function (name) {
        var t = (self.tables[name] = self.tables[name] || {});
        tables[name].forEach(function (row) {
          /* a change made here and not yet sent beats what the hub has */
          if (self.outbox[name + "/" + row.id]) return;
          t[row.id] = row;
        });
      });
      if (res.cursor) self.cursor = res.cursor;
      self.prune();
      self.save();
    });
  };

  /* deleted rows are kept a while so other devices hear about them */
  Hub.prototype.prune = function () {
    var cutoff = new Date(Date.now() - KEEP_DELETED_DAYS * 86400000).toISOString();
    var self = this;
    Object.keys(this.tables).forEach(function (name) {
      var t = self.tables[name];
      Object.keys(t).forEach(function (id) {
        if (t[id].del && t[id].del < cutoff && !self.outbox[name + "/" + id]) delete t[id];
      });
    });
  };

  /** Sync now, then whenever the app comes back to the screen or the network returns. */
  Hub.prototype.start = function () {
    var self = this;
    global.addEventListener("online", function () {
      self.sync();
    });
    global.document.addEventListener("visibilitychange", function () {
      if (global.document.visibilityState === "visible") self.sync();
    });
    setInterval(function () {
      if (self.pendingCount() || self.state === "offline") self.sync();
    }, 60000);
    return this.sync();
  };

  /** Forget this app's data on this device. The hub is untouched. */
  Hub.prototype.forget = function () {
    global.localStorage.removeItem(this.storeKey);
  };

  global.Hub = Hub;
})(window);
