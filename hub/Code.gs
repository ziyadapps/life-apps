/**
 * Life apps hub.
 *
 * One script, one web address, for every app on your home screen. It lives
 * inside the "Life apps hub" sheet and keeps each app's data in a sheet of its
 * own, in the "Life apps" folder on Drive. Apps, Siri shortcuts and the
 * nightly jobs all talk to this script and to nothing else.
 *
 * There is no secret in this file. Keys are made from the sheet's
 * "Life apps" menu, shown to you once, and only a fingerprint of each one is
 * kept in the Keys tab. That is why this file can sit in a public repo.
 *
 * Every table follows the same three rules:
 *   - row 1 holds the column names, one row per record below it
 *   - id, ts and del are the first three columns of every table
 *       id   a short random text made by the app
 *       ts   when the hub last wrote the row (the hub's own clock)
 *       del  blank, or when the row was deleted
 *   - everything is kept as plain text, except number columns
 */

/* ------------------------------------------------------------------ */
/*  settings                                                          */
/* ------------------------------------------------------------------ */

/* Bump this whenever you paste in a new copy. Apps read it back from the
   published address, which proves the address serves the code you saved. */
const VERSION = "2026-11-05a";

const TZ = "Asia/Riyadh";
const APPS_FOLDER = "Life apps";
const BACKUP_FOLDER = "Life apps backups";
const KEEP_BACKUP_DAYS = 90; // nightly copies older than this go to the bin
const KEEP_DELETED_DAYS = 90; // deleted rows are removed for good after this
const KEEP_LOG_ROWS = 500;
const MAX_ROWS_PER_PUSH = 1000;
const PULL_OVERLAP_MS = 2000; // re-send rows this close to the cursor, to be safe

const HUB_TABS = {
  Apps: ["app", "sheet_id", "sheet_url", "created", "last_backup"],
  Keys: ["name", "apps", "mode", "active", "created", "last_used", "hash"],
  Inbox: ["id", "ts", "del", "source", "text", "status"],
  Log: ["time", "job", "result"],
};

const FIXED_COLS = ["id", "ts", "del"];
const README_TAB = "README";

/* ------------------------------------------------------------------ */
/*  set up                                                            */
/* ------------------------------------------------------------------ */

/**
 * Run once from the editor before the first deploy. Safe to run again at any
 * time: it only adds what is missing and repairs the schedule.
 */
function setUp() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  Object.keys(HUB_TABS).forEach(function (name) {
    const sh = ensureTab_(ss, name, HUB_TABS[name]);
    sh.getRange(1, 1, sh.getMaxRows(), HUB_TABS[name].length).setNumberFormat("@");
  });

  /* drop the empty starter tab a new spreadsheet comes with */
  ss.getSheets().forEach(function (sh) {
    if (!HUB_TABS[sh.getName()] && sh.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sh);
    }
  });

  folder_(APPS_FOLDER);
  folder_(BACKUP_FOLDER);
  registerApp_("test");

  ScriptApp.getProjectTriggers().forEach(function (t) {
    const fn = t.getHandlerFunction();
    if (fn === "dailyBackup" || fn === "weeklyCleanup") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("dailyBackup").timeBased().atHour(2).everyDays(1).create();
  ScriptApp.newTrigger("weeklyCleanup")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(3)
    .create();

  log_("setUp", "ok, version " + VERSION);
  return "Ready. Reload the sheet, make your keys from the Life apps menu, then deploy.";
}

/** Adds the Life apps menu to the hub sheet. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Life apps")
    .addItem("New key...", "menuNewKey")
    .addItem("New family member key...", "menuNewFamilyKey")
    .addItem("Add an app...", "menuAddApp")
    .addItem("Emby login for Watchlist...", "menuEmby")
    .addItem("Export the Emby library", "menuExportEmby")
    .addSeparator()
    .addItem("Run the check", "menuHealth")
    .addItem("Back up now", "dailyBackup")
    .addItem("Set up or repair", "setUp")
    .addToUi();
}

/* ------------------------------------------------------------------ */
/*  the door                                                          */
/* ------------------------------------------------------------------ */

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return reply_({ ok: false, error: "The request was not valid JSON." });
  }
  try {
    const key = auth_(req);
    const action = String(req.action || "");
    if (action === "ping") return reply_(ping_(key));
    if (action === "add") return reply_(add_(key, req));
    /* a family member's key reads its app and writes only suggestions */
    if (key.mode === "suggest" && action === "pull") return reply_(pull_(key, req));
    if (key.mode === "suggest" && action === "push") return reply_(pushSuggestions_(key, req));
    if (key.mode !== "full") {
      throw fail_(key.mode === "suggest" ? "This key can read and send suggestions only." : "This key can only add rows.");
    }
    if (action === "pull") return reply_(pull_(key, req));
    if (action === "push") return reply_(push_(key, req));
    if (action === "health") return reply_(health_());
    if (action === "emby") {
      allowedApp_(key, "watchlist");
      return reply_(emby_(req));
    }
    throw fail_("The hub does not know the action \"" + action + "\".");
  } catch (err) {
    return reply_({ ok: false, error: String((err && err.message) || err) });
  }
}

/** Opening the address in a browser only tells you the hub is up. */
function doGet() {
  return reply_({ ok: true, hub: "Life apps", version: VERSION });
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function fail_(message) {
  return new Error(message);
}

/* ------------------------------------------------------------------ */
/*  keys                                                              */
/* ------------------------------------------------------------------ */

/**
 * Finds the key a request carries. Only a fingerprint (SHA-256) of each key
 * is stored, so the Keys tab alone cannot be used to get in.
 */
function auth_(req) {
  const raw = String(req.key || "").trim();
  if (!raw) throw fail_("No key was sent.");
  const hash = sha256_(raw);
  const t = readHubTab_("Keys");
  for (let i = 0; i < t.rows.length; i++) {
    const r = t.rows[i];
    if (r.hash !== hash) continue;
    if (!isActive_(r.active)) throw fail_("This key has been turned off.");
    touchKey_(t.sheet, i + 2, r);
    return {
      name: r.name,
      mode: r.mode === "add" ? "add" : r.mode === "suggest" ? "suggest" : "full",
      apps: String(r.apps || "*")
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(String),
    };
  }
  throw fail_("Unknown key.");
}

function isActive_(v) {
  const s = String(v || "").trim().toLowerCase();
  return s !== "" && s !== "no" && s !== "false" && s !== "0";
}

/* last_used is written at most once an hour per key, to keep requests fast */
function touchKey_(sheet, rowNumber, r) {
  const now = new Date();
  const last = Date.parse(r.last_used || "") || 0;
  if (now.getTime() - last < 3600000) return;
  const col = HUB_TABS.Keys.indexOf("last_used") + 1;
  sheet.getRange(rowNumber, col).setValue(stamp_(now));
}

function allowedApp_(key, app) {
  if (key.apps.indexOf("*") >= 0 || key.apps.indexOf(app) >= 0) return;
  throw fail_("This key cannot use the app \"" + app + "\".");
}

/**
 * Makes a new key, stores its fingerprint, and returns the key itself. The
 * key is never stored anywhere, so it can only be seen at this moment.
 */
function createKey_(name, apps, mode) {
  name = String(name || "").trim();
  if (!name) throw fail_("A key needs a name.");
  const key =
    "la-" +
    (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "").slice(0, 40);
  const sh = ensureTab_(SpreadsheetApp.getActive(), "Keys", HUB_TABS.Keys);
  const row = HUB_TABS.Keys.map(function (c) {
    if (c === "name") return name;
    if (c === "apps") return String(apps || "*").trim() || "*";
    if (c === "mode") return mode === "add" || mode === "suggest" ? mode : "full";
    if (c === "active") return "yes";
    if (c === "created") return stamp_(new Date());
    if (c === "hash") return sha256_(key);
    return "";
  });
  appendRows_(sh, [row], HUB_TABS.Keys.length);
  log_("key", "made \"" + name + "\" (" + row[2] + ", apps " + row[1] + ")");
  return key;
}

function menuNewKey() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt(
    "New key: name",
    "Which device or use is this key for? For example: iPhone, Laptop, Shortcuts.",
    ui.ButtonSet.OK_CANCEL
  );
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt(
    "New key: apps",
    "Which apps may it use? Type * for all of them, or names separated by commas, like: household, watchlist",
    ui.ButtonSet.OK_CANCEL
  );
  if (b.getSelectedButton() !== ui.Button.OK) return;
  const c = ui.alert(
    "New key: what may it do?",
    "Yes = full key: read, add, change and delete. Use this for your phone and laptop.\n\n" +
      "No = add-only key: it can only add new rows and never read anything back. Use this for Siri shortcuts.",
    ui.ButtonSet.YES_NO_CANCEL
  );
  if (c === ui.Button.CANCEL || c === ui.Button.CLOSE) return;
  const key = createKey_(
    a.getResponseText(),
    b.getResponseText(),
    c === ui.Button.YES ? "full" : "add"
  );
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial,sans-serif">' +
      "<p>Copy this key now. It is shown only once; the sheet keeps just a fingerprint of it.</p>" +
      '<input id="k" readonly value="' +
      key +
      '" style="width:100%;font:13px monospace;padding:8px" onclick="this.select()">' +
      '<p><button onclick="var k=document.getElementById(\'k\');k.select();document.execCommand(\'copy\');this.textContent=\'Copied\'">Copy</button></p>' +
      "<p>To turn a key off later, type <b>no</b> in its <b>active</b> cell on the Keys tab.</p></div>"
  )
    .setWidth(460)
    .setHeight(230);
  ui.showModalDialog(html, "Your new key");
}

/* ------------------------------------------------------------------ */
/*  apps                                                              */
/* ------------------------------------------------------------------ */

/**
 * Gives an app its own sheet in the Life apps folder. Tabs inside it are made
 * the first time the app writes to a table, so nothing else is needed here.
 */
/**
 * A key for a family member: it opens only the family app, reads it, and
 * can send suggestions, which change nothing until you accept them.
 */
function menuNewFamilyKey() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt("New family member key", "Whose key is it? The name shows next to their suggestions, for example: أبوي, سلمان.", ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const key = createKey_(a.getResponseText(), "family", "suggest");
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial,sans-serif">' +
      "<p>Copy this key now. It is shown only once.</p>" +
      '<input id="k" readonly value="' + key + '" style="width:100%;font:13px monospace;padding:8px" onclick="this.select()">' +
      '<p><button onclick="var k=document.getElementById(\'k\');k.select();document.execCommand(\'copy\');this.textContent=\'Copied\'">Copy</button></p>' +
      "<p>It reads the family app and sends suggestions only. To turn it off later, type <b>no</b> in its <b>active</b> cell on the Keys tab.</p></div>"
  )
    .setWidth(460)
    .setHeight(230);
  ui.showModalDialog(html, "Family member key");
}

function registerApp_(app) {
  app = String(app || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{1,23}$/.test(app)) {
    throw fail_("An app name is 2 to 24 small letters, digits or dashes, starting with a letter.");
  }
  const found = findApp_(app);
  if (found) return found;

  const ss = SpreadsheetApp.create("Life apps: " + app);
  ss.setSpreadsheetTimeZone(TZ);
  const first = ss.getSheets()[0];
  first.setName(README_TAB);
  first
    .getRange(1, 1, 4, 1)
    .setValues([
      ["This sheet belongs to the Life apps hub (app: " + app + ")."],
      ["Each other tab is one table: one row per record, column names in row 1."],
      ["You can read, sort, filter and fix values here. Do not rename tabs or column names, and never change an id."],
      ["To delete a row, put the date in its del cell instead of removing the row, so your devices hear about it."],
    ]);
  DriveApp.getFileById(ss.getId()).moveTo(folder_(APPS_FOLDER));

  const sh = ensureTab_(SpreadsheetApp.getActive(), "Apps", HUB_TABS.Apps);
  appendRows_(sh, [[app, ss.getId(), ss.getUrl(), stamp_(new Date()), ""]], HUB_TABS.Apps.length);
  log_("app", "added " + app);
  return findApp_(app);
}

function findApp_(app) {
  const t = readHubTab_("Apps");
  for (let i = 0; i < t.rows.length; i++) {
    if (t.rows[i].app === app) return { row: t.rows[i], rowNumber: i + 2 };
  }
  return null;
}

function menuAddApp() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt("Add an app", "Short name, like: budget, household, car", ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const found = registerApp_(a.getResponseText());
  ui.alert("Done. The app \"" + found.row.app + "\" now has its own sheet in the Life apps folder.");
}

/* one open spreadsheet per app per request */
const OPEN_ = {};
function appSheet_(app) {
  if (OPEN_[app]) return OPEN_[app];
  const found = findApp_(app);
  if (!found) throw fail_("The hub has no app called \"" + app + "\". Add it from the Life apps menu.");
  OPEN_[app] = SpreadsheetApp.openById(found.row.sheet_id);
  return OPEN_[app];
}

function appName_(req) {
  const app = String(req.app || "").trim().toLowerCase();
  if (!app) throw fail_("No app was named.");
  return app;
}

/* ------------------------------------------------------------------ */
/*  actions                                                           */
/* ------------------------------------------------------------------ */

function ping_(key) {
  return {
    ok: true,
    version: VERSION,
    time: stamp_(new Date()),
    key: key.name,
    mode: key.mode,
    apps: key.apps,
  };
}

/**
 * Everything that changed in an app since the cursor the device last saw.
 * With no cursor, the whole app comes back, deleted rows included, so a new
 * device starts complete.
 */
/*
 * Opening an app usually finds nothing new. The hub notes when it last wrote
 * to each app, so it can say so without opening the app's sheet at all. A
 * full read still happens at least every few hours, to catch changes typed
 * straight into a sheet.
 */
const FULL_READ_HOURS = 3;

function markWrite_(app, ts) {
  try {
    PropertiesService.getScriptProperties().setProperty("W_" + app, ts);
  } catch (err) {}
}

function pull_(key, req) {
  const app = appName_(req);
  allowedApp_(key, app);
  const since = String(req.since || "");
  if (since) {
    const props = PropertiesService.getScriptProperties();
    const wrote = props.getProperty("W_" + app) || "";
    const read = props.getProperty("R_" + app) || "";
    const fresh = read && Date.now() - Date.parse(read) < FULL_READ_HOURS * 3600000;
    /* the device already has the last write, and a full read has happened since it */
    if (wrote && fresh && wrote <= since && read > wrote) {
      return { ok: true, app: app, cursor: since, tables: {}, quick: true };
    }
  }
  const out = pullAll_(app, since);
  try {
    PropertiesService.getScriptProperties().setProperty("R_" + app, stamp_(new Date()));
  } catch (err) {}
  return out;
}

/*
 * Reads take no lock, so the apps that open together (Budget with Household
 * and Car) are answered side by side. A read that lands in the middle of a
 * write is safe: the overlap on the cursor brings those rows again next time.
 */
function pullAll_(app, since) {
  const from = since ? new Date(Date.parse(since) - PULL_OVERLAP_MS).toISOString() : "";
  {
    const ss = appSheet_(app);
    const out = {};
    let cursor = since;
    ss.getSheets().forEach(function (sh) {
      const name = sh.getName();
      if (name === README_TAB) return;
      const t = readTable_(sh);
      out[name] = [];
      t.rows.forEach(function (r) {
        if (from && !(r.ts > from)) return;
        out[name].push(r);
        if (r.ts > cursor) cursor = r.ts;
      });
    });
    return { ok: true, app: app, cursor: cursor, tables: out };
  }
}

/**
 * Writes changed rows. A row is found by id and updated in place, or added at
 * the bottom. Fields left out of a row keep their current values, so a
 * shortcut can change one field without knowing the rest.
 */
function push_(key, req) {
  const app = appName_(req);
  allowedApp_(key, app);
  const items = Array.isArray(req.rows) ? req.rows : [];
  if (items.length > MAX_ROWS_PER_PUSH) {
    throw fail_("Send at most " + MAX_ROWS_PER_PUSH + " rows at a time.");
  }
  const res = writeRows_(app, items, false);
  return { ok: true, app: app, ts: res.ts, written: res.written };
}

/**
 * A family member's push: rows of the suggestions table only, always under
 * their own name, never someone else's suggestion, and never accepted or
 * rejected by themselves.
 */
function pushSuggestions_(key, req) {
  const app = appName_(req);
  allowedApp_(key, app);
  const items = Array.isArray(req.rows) ? req.rows : [];
  if (items.length > MAX_ROWS_PER_PUSH) throw fail_("Send at most " + MAX_ROWS_PER_PUSH + " rows at a time.");
  const owner = {};
  const sh = appSheet_(app).getSheetByName("suggestions");
  if (sh) {
    readTable_(sh).rows.forEach(function (r) {
      owner[r.id] = { by: r.by, status: r.status };
    });
  }
  const clean = items.map(function (it) {
    if (!it || it.table !== "suggestions" || !it.row || typeof it.row !== "object") {
      throw fail_("This key can send suggestions only.");
    }
    const row = {};
    Object.keys(it.row).forEach(function (k) {
      row[k] = it.row[k];
    });
    const had = owner[String(row.id || "")];
    if (had && had.by !== key.name) throw fail_("This suggestion belongs to someone else.");
    if (had && had.status && had.status !== "pending") throw fail_("This suggestion was already decided.");
    if (row.status !== undefined && row.status !== "pending" && row.status !== "withdrawn") {
      throw fail_("Only the owner of the app can accept or reject suggestions.");
    }
    delete row.decided;
    delete row.reply;
    row.by = key.name;
    return { table: "suggestions", row: row };
  });
  const res = writeRows_(app, clean, false);
  return { ok: true, app: app, ts: res.ts, written: res.written };
}

/**
 * Adds one row. The only action an add-only key may use besides ping. If the
 * row's id is already in the table nothing changes, so a shortcut that
 * retries never makes a second copy.
 */
function add_(key, req) {
  const app = appName_(req);
  allowedApp_(key, app);
  const table = String(req.table || "");
  const row = req.row && typeof req.row === "object" ? req.row : {};
  const copy = {};
  Object.keys(row).forEach(function (k) {
    copy[k] = row[k];
  });
  if (!copy.id) copy.id = newId_();
  delete copy.del;
  const res = writeRows_(app, [{ table: table, row: copy }], true);
  return {
    ok: true,
    app: app,
    table: table,
    id: copy.id,
    ts: res.ts,
    added: res.written === 1,
  };
}

/* ------------------------------------------------------------------ */
/*  tables                                                            */
/* ------------------------------------------------------------------ */

function writeRows_(app, items, insertOnly) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = appSheet_(app);
    const ts = stamp_(new Date());
    const byTable = {};
    items.forEach(function (it) {
      const table = String((it && it.table) || "");
      if (!/^[a-z][a-z0-9_]{0,30}$/.test(table)) {
        throw fail_("\"" + table + "\" is not a valid table name.");
      }
      const row = it && it.row;
      if (!row || typeof row !== "object") throw fail_("A row is missing in table " + table + ".");
      const id = String(row.id || "");
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
        throw fail_("Row id \"" + id + "\" in table " + table + " is not valid.");
      }
      /* the same id twice in one push: merge them, the later fields winning */
      const t = (byTable[table] = byTable[table] || { order: [], byId: {} });
      if (!t.byId[id]) {
        t.byId[id] = {};
        t.order.push(id);
      }
      Object.keys(row).forEach(function (k) {
        t.byId[id][k] = row[k];
      });
    });

    let written = 0;
    Object.keys(byTable).forEach(function (table) {
      const sh = ensureTable_(ss, table);
      const rows = byTable[table].order.map(function (id) {
        return byTable[table].byId[id];
      });
      addColumns_(sh, rows);
      const t = readTable_(sh);
      const updates = [];
      const appends = [];
      rows.forEach(function (row) {
        const at = t.index[String(row.id)];
        if (at !== undefined && insertOnly) return;
        const current = at !== undefined ? t.rows[at] : null;
        const values = t.header.map(function (col) {
          if (col === "id") return String(row.id);
          if (col === "ts") return ts;
          if (col === "del") {
            const keep = current ? current.del : "";
            if (!Object.prototype.hasOwnProperty.call(row, "del")) return keep;
            return row.del ? keep || ts : "";
          }
          if (Object.prototype.hasOwnProperty.call(row, col)) return cell_(row[col], t.types[col]);
          return current ? cell_(current[col], t.types[col]) : "";
        });
        if (current) {
          t.rows[at] = toRow_(t.header, values, t.types);
          updates.push({ at: at, values: values });
        } else {
          t.index[String(row.id)] = t.rows.length;
          t.rows.push(toRow_(t.header, values, t.types));
          appends.push(values);
        }
        written++;
      });
      const formats = t.header.map(function (col) {
        return t.types[col] === "num" ? "0.00" : "@";
      });
      if (updates.length > 20) {
        /* many changes: rewrite the whole table in one go */
        const all = t.rows.slice(0, t.rows.length - appends.length).map(function (r) {
          return t.header.map(function (col) {
            return cell_(r[col], t.types[col]);
          });
        });
        writeBlock_(sh, 2, all.concat(appends), formats);
      } else {
        updates.forEach(function (u) {
          writeBlock_(sh, u.at + 2, [u.values], formats);
        });
        if (appends.length) writeBlock_(sh, t.rows.length - appends.length + 2, appends, formats);
      }
    });
    if (written) markWrite_(app, ts);
    return { ts: ts, written: written };
  } finally {
    lock.releaseLock();
  }
}

/** Makes a table's tab, with id, ts and del as its first three columns. */
function ensureTable_(ss, table) {
  let sh = ss.getSheetByName(table);
  if (!sh) {
    sh = ss.insertSheet(table);
    sh.getRange(1, 1, 1, FIXED_COLS.length).setValues([FIXED_COLS]).setFontWeight("bold");
    sh.getRange(1, 1, sh.getMaxRows(), FIXED_COLS.length).setNumberFormat("@");
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * New field names become new columns at the right. A column is a number
 * column if any value sent to it when it is made is a number (blanks do not
 * count); it says so in the note on its header cell, and keeps that type.
 */
function addColumns_(sh, rows) {
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const added = [];
  rows.forEach(function (row) {
    Object.keys(row).forEach(function (k) {
      if (k === "ts" || header.indexOf(k) >= 0) return;
      const found = added.filter(function (a) { return a.name === k; })[0];
      if (found) {
        if (typeof row[k] === "number") found.num = true;
        return;
      }
      if (!/^[a-z_][a-z0-9_]{0,39}$/i.test(k)) throw fail_("\"" + k + "\" is not a valid column name.");
      added.push({ name: k, num: typeof row[k] === "number" });
    });
  });
  if (!added.length) return;
  if (header.length + added.length > 60) throw fail_("A table can have at most 60 columns.");
  if (sh.getMaxColumns() < header.length + added.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), header.length + added.length - sh.getMaxColumns());
  }
  added.forEach(function (a, i) {
    const col = header.length + i + 1;
    const cell = sh.getRange(1, col);
    cell.setNumberFormat("@").setValue(a.name).setFontWeight("bold");
    if (a.num) cell.setNote("num");
    if (sh.getMaxRows() > 1) {
      sh.getRange(2, col, sh.getMaxRows() - 1, 1).setNumberFormat(a.num ? "0.00" : "@");
    }
  });
}

/** Reads a whole table into rows, plus an index from id to position. */
function readTable_(sh) {
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const lastRow = sh.getLastRow();
  const head = sh.getRange(1, 1, 1, lastCol);
  const header = head.getValues()[0].map(String);
  const notes = head.getNotes()[0];
  const types = {};
  header.forEach(function (col, i) {
    types[col] = String(notes[i] || "").trim() === "num" ? "num" : "text";
  });
  const rows = [];
  const index = {};
  if (lastRow >= 2) {
    sh.getRange(2, 1, lastRow - 1, lastCol)
      .getValues()
      .forEach(function (v) {
        const r = toRow_(header, v, types);
        if (!r.id) return;
        index[r.id] = rows.length;
        rows.push(r);
      });
  }
  return { header: header, types: types, rows: rows, index: index };
}

function toRow_(header, values, types) {
  const r = {};
  header.forEach(function (col, i) {
    const v = values[i];
    if (!col) return;
    if (types[col] === "num") {
      r[col] = v === "" || v === null || v === undefined ? null : isFinite(Number(v)) ? Number(v) : String(v);
    } else {
      r[col] = v instanceof Date ? Utilities.formatDate(v, TZ, "yyyy-MM-dd") : v === null || v === undefined ? "" : String(v);
    }
  });
  return r;
}

/* what goes into a cell: numbers stay numbers in number columns, all else is text */
function cell_(v, type) {
  if (v === null || v === undefined) return "";
  if (type === "num") {
    if (v === "") return "";
    const n = Number(v);
    return isFinite(n) ? n : String(v);
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Writes rows starting at a row number, growing the sheet if needed. */
function writeBlock_(sh, startRow, values, formats) {
  if (!values.length) return;
  const need = startRow + values.length - 1;
  if (need > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows() + 200);
  const width = formats.length;
  const range = sh.getRange(startRow, 1, values.length, width);
  range.setNumberFormats(values.map(function () { return formats; }));
  range.setValues(values);
}

/* ------------------------------------------------------------------ */
/*  the check                                                         */
/* ------------------------------------------------------------------ */

function health_() {
  const out = { ok: true, version: VERSION, checks: [] };
  const add = function (name, pass, detail) {
    out.checks.push({ name: name, pass: !!pass, detail: String(detail || "") });
  };
  const hub = SpreadsheetApp.getActive();
  const missing = Object.keys(HUB_TABS).filter(function (n) {
    return !hub.getSheetByName(n);
  });
  add("Hub tabs exist", !missing.length, missing.length ? "missing " + missing.join(", ") : "Apps, Keys, Inbox, Log");

  const keys = readHubTab_("Keys").rows;
  const on = keys.filter(function (k) { return isActive_(k.active); }).length;
  add("Keys", on > 0, on + " on, " + (keys.length - on) + " off");

  let triggers = [];
  try {
    triggers = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  } catch (err) {}
  add("Nightly backup scheduled", triggers.indexOf("dailyBackup") >= 0, "2am");
  add("Weekly cleanup scheduled", triggers.indexOf("weeklyCleanup") >= 0, "Fridays, 3am");

  readHubTab_("Apps").rows.forEach(function (a) {
    try {
      const ss = SpreadsheetApp.openById(a.sheet_id);
      const tables = ss.getSheets().filter(function (sh) { return sh.getName() !== README_TAB; });
      const detail = tables.length
        ? tables.map(function (sh) {
            return sh.getName() + " " + Math.max(sh.getLastRow() - 1, 0);
          }).join(", ")
        : "no tables yet";
      const badIds = tables.filter(function (sh) {
        return sh.getRange(1, 1).getNumberFormat() !== "@";
      });
      add("App " + a.app, !badIds.length, detail + (badIds.length ? "; id column not text in " + badIds.length : ""));
      add("App " + a.app + " last backup", true, a.last_backup || "none yet, the first lands at 2am");
    } catch (err) {
      add("App " + a.app, false, "cannot open its sheet: " + err.message);
    }
  });
  add("Time zone", true, Session.getScriptTimeZone() + " (script), " + hub.getSpreadsheetTimeZone() + " (sheet)");
  out.ok = out.checks.every(function (c) { return c.pass; });
  return out;
}

function menuHealth() {
  const h = health_();
  const text = h.checks
    .map(function (c) {
      return (c.pass ? "OK   " : "FIX  ") + c.name + (c.detail ? ": " + c.detail : "");
    })
    .join("\n");
  SpreadsheetApp.getUi().alert("Hub check, version " + VERSION, text, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ------------------------------------------------------------------ */
/*  scheduled jobs                                                    */
/* ------------------------------------------------------------------ */

/**
 * Every night: a dated copy of every app's sheet, plus the hub's own tabs as
 * a small text file, in the Life apps backups folder. Old copies are binned.
 */
function dailyBackup() {
  const folder = folder_(BACKUP_FOLDER);
  const day = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  const done = [];
  const apps = readHubTab_("Apps");
  apps.rows.forEach(function (a, i) {
    const name = a.app + " " + day;
    try {
      if (!folder.getFilesByName(name).hasNext()) {
        DriveApp.getFileById(a.sheet_id).makeCopy(name, folder);
      }
      apps.sheet.getRange(i + 2, HUB_TABS.Apps.indexOf("last_backup") + 1).setValue(day);
      done.push(a.app);
    } catch (err) {
      done.push(a.app + " FAILED (" + err.message + ")");
    }
  });

  /* The hub sheet itself is saved as text, not copied: a copy would also copy
     this script, and leave a pile of script copies behind. */
  const hubName = "hub " + day + ".json";
  if (!folder.getFilesByName(hubName).hasNext()) {
    const dump = {};
    ["Apps", "Keys"].forEach(function (n) {
      dump[n] = readHubTab_(n).rows;
    });
    folder.createFile(hubName, JSON.stringify(dump, null, 1), MimeType.PLAIN_TEXT);
  }

  const cutoff = Date.now() - KEEP_BACKUP_DAYS * 86400000;
  let binned = 0;
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (f.getDateCreated().getTime() < cutoff) {
      f.setTrashed(true);
      binned++;
    }
  }
  log_("backup", "copied " + (done.join(", ") || "no apps") + "; binned " + binned + " old");
}

/**
 * Every Friday: rows deleted more than 90 days ago are removed for good, and
 * the Log tab is trimmed.
 */
function weeklyCleanup() {
  const cutoff = new Date(Date.now() - KEEP_DELETED_DAYS * 86400000).toISOString();
  let purged = 0;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    readHubTab_("Apps").rows.forEach(function (a) {
      let ss;
      try {
        ss = SpreadsheetApp.openById(a.sheet_id);
      } catch (err) {
        return;
      }
      ss.getSheets().forEach(function (sh) {
        if (sh.getName() === README_TAB) return;
        const t = readTable_(sh);
        for (let i = t.rows.length - 1; i >= 0; i--) {
          const del = t.rows[i].del;
          if (del && del < cutoff) {
            sh.deleteRow(i + 2);
            purged++;
          }
        }
      });
    });
  } finally {
    lock.releaseLock();
  }
  const logSheet = SpreadsheetApp.getActive().getSheetByName("Log");
  if (logSheet && logSheet.getLastRow() - 1 > KEEP_LOG_ROWS) {
    logSheet.deleteRows(2, logSheet.getLastRow() - 1 - KEEP_LOG_ROWS);
  }
  log_("cleanup", "removed " + purged + " deleted rows");
}

/* ------------------------------------------------------------------ */
/*  odds and ends                                                     */
/* ------------------------------------------------------------------ */

function readHubTab_(name) {
  const sh = ensureTab_(SpreadsheetApp.getActive(), name, HUB_TABS[name]);
  const cols = HUB_TABS[name];
  const rows = [];
  const last = sh.getLastRow();
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, cols.length)
      .getValues()
      .forEach(function (v) {
        const r = {};
        cols.forEach(function (c, i) {
          r[c] = v[i] instanceof Date ? stamp_(v[i]) : String(v[i] === null ? "" : v[i]);
        });
        rows.push(r);
      });
  }
  return { sheet: sh, rows: rows };
}

function ensureTab_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function appendRows_(sh, rows, width) {
  const formats = [];
  for (let i = 0; i < width; i++) formats.push("@");
  writeBlock_(sh, sh.getLastRow() + 1, rows, formats);
}

function log_(job, result) {
  try {
    const sh = ensureTab_(SpreadsheetApp.getActive(), "Log", HUB_TABS.Log);
    appendRows_(sh, [[stamp_(new Date()), job, String(result).slice(0, 500)]], 3);
  } catch (err) {}
}

function folder_(name) {
  const found = DriveApp.getFoldersByName(name);
  return found.hasNext() ? found.next() : DriveApp.createFolder(name);
}

/* the hub's clock, as sortable text: 2026-10-28T07:25:00.123Z */
function stamp_(d) {
  return d.toISOString();
}

function newId_() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 12);
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) {
      return ((b + 256) % 256).toString(16).padStart(2, "0");
    })
    .join("");
}

/* ------------------------------------------------------------------ */
/*  Emby, for the Watchlist                                           */
/* ------------------------------------------------------------------ */

/*
 * The Watchlist asks the hub whether a title is on your Emby server. The
 * server's address and your login live in this script's properties (set
 * from the menu), never in a sheet or on a phone. The hub signs in like the
 * Emby app does and keeps the session it gets back.
 */
const EMBY_CLIENT = 'Emby Client="Life apps", Device="Hub", DeviceId="lifeapps-hub", Version="1.0.0"';

function menuEmby() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt("Emby: server address", "Like https://050.example.com (with the port only if it is not 443).", ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt("Emby: username", "", ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  const c = ui.prompt("Emby: password", "", ui.ButtonSet.OK_CANCEL);
  if (c.getSelectedButton() !== ui.Button.OK) return;
  setEmbyLogin_(a.getResponseText(), b.getResponseText(), c.getResponseText());
  let msg;
  try {
    const st = emby_({ op: "status" });
    msg = "Signed in to " + (st.server || "Emby") + ". The Watchlist can use it now.";
  } catch (err) {
    msg = "Saved, but signing in failed: " + err.message;
  }
  ui.alert("Emby", msg, ui.ButtonSet.OK);
}

function setEmbyLogin_(url, user, pass) {
  const p = PropertiesService.getScriptProperties();
  p.setProperty("EMBY_URL", String(url || "").trim().replace(/\/+$/, "").replace(/\/emby$/i, ""));
  p.setProperty("EMBY_USER", String(user || "").trim());
  p.setProperty("EMBY_PASS", String(pass || ""));
  p.setProperty("EMBY_TOKEN", "");
  p.setProperty("EMBY_UID", "");
}

function embyConf_() {
  const p = PropertiesService.getScriptProperties();
  const url = p.getProperty("EMBY_URL");
  if (!url) throw fail_("Emby is not set up. In the hub sheet: Life apps, Emby login for Watchlist.");
  return { p: p, url: url, user: p.getProperty("EMBY_USER") || "", pass: p.getProperty("EMBY_PASS") || "", token: p.getProperty("EMBY_TOKEN") || "", uid: p.getProperty("EMBY_UID") || "" };
}

function embyLogin_(c) {
  const res = UrlFetchApp.fetch(c.url + "/emby/Users/AuthenticateByName", {
    method: "post",
    contentType: "application/json",
    headers: { "X-Emby-Authorization": EMBY_CLIENT },
    payload: JSON.stringify({ Username: c.user, Pw: c.pass }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code === 401) throw fail_("Emby refused the username or password.");
  if (code !== 200) throw fail_("Emby answered " + code + " when signing in.");
  const data = JSON.parse(res.getContentText());
  c.token = data.AccessToken;
  c.uid = data.User && data.User.Id;
  c.p.setProperty("EMBY_TOKEN", c.token);
  c.p.setProperty("EMBY_UID", c.uid);
  return c;
}

function embyQuery_(path, params) {
  return Object.keys(params || {})
    .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ""; })
    .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
    .join("&");
}

/** Several GETs at once, signing in again once if the session has expired. */
function embyGetAll_(c, requests) {
  function build() {
    return requests.map(function (r) {
      const path = r.path.replace("{uid}", c.uid);
      const params = {};
      Object.keys(r.params || {}).forEach(function (k) { params[k] = r.params[k] === "{uid}" ? c.uid : r.params[k]; });
      return { url: c.url + path + "?" + embyQuery_(path, params), method: "get", headers: { "X-Emby-Token": c.token, "X-Emby-Authorization": EMBY_CLIENT }, muteHttpExceptions: true };
    });
  }
  if (!c.token || !c.uid) embyLogin_(c);
  let out = UrlFetchApp.fetchAll(build());
  if (out.some(function (r) { return r.getResponseCode() === 401; })) {
    embyLogin_(c);
    out = UrlFetchApp.fetchAll(build());
  }
  return out.map(function (r) {
    if (r.getResponseCode() !== 200) throw fail_("Emby answered " + r.getResponseCode() + ".");
    return JSON.parse(r.getContentText());
  });
}

const EMBY_FIELDS = "ProviderIds,ProductionYear,ChildCount,RecursiveItemCount,DateCreated,PremiereDate";

function bareName_(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "");
}

function embyItem_(it) {
  const ids = {};
  Object.keys(it.ProviderIds || {}).forEach(function (k) { ids[k.toLowerCase()] = String(it.ProviderIds[k]); });
  return {
    name: it.Name,
    year: it.ProductionYear || "",
    type: it.Type === "Series" ? "tv" : "movie",
    tmdb: ids.tmdb || "",
    imdb: ids.imdb || "",
    seasons: it.Type === "Series" ? it.ChildCount || 0 : "",
    episodes: it.Type === "Series" ? it.RecursiveItemCount || 0 : "",
    added: it.DateCreated ? String(it.DateCreated).slice(0, 10) : "",
  };
}

/**
 * op status: signs in, returns the server's name.
 * op find:   items [{ key, kind (movie|tv), tmdb, imdb, title, year }] (up to 30):
 *            returns { found: { key: { seasons, episodes, added, name } } } for those on the server.
 *            Matched by TMDB or IMDb id first, then by name and year.
 * op latest: kind movie|tv, limit: the newest on the server, with their ids.
 */
function emby_(req) {
  const c = embyConf_();
  const op = String(req.op || "");
  if (op === "status") {
    if (!c.token || !c.uid) embyLogin_(c);
    const info = embyGetAll_(c, [{ path: "/emby/System/Info", params: {} }])[0];
    return { ok: true, server: info.ServerName || "", version: info.Version || "" };
  }
  if (op === "find") {
    const items = (req.items || []).slice(0, 30);
    if (!items.length) return { ok: true, found: {} };
    const any = [];
    items.forEach(function (i) {
      if (i.tmdb) any.push("tmdb." + i.tmdb);
      if (i.imdb) any.push("imdb." + i.imdb);
    });
    const requests = [{ path: "/emby/Users/{uid}/Items", params: { Recursive: "true", IncludeItemTypes: "Movie,Series", AnyProviderIdEquals: any.join(","), Fields: EMBY_FIELDS, Limit: 200 } }];
    items.forEach(function (i) {
      requests.push({ path: "/emby/Users/{uid}/Items", params: { Recursive: "true", IncludeItemTypes: i.kind === "tv" ? "Series" : "Movie", SearchTerm: i.title, Fields: EMBY_FIELDS, Limit: 8 } });
    });
    const res = embyGetAll_(c, requests);
    const byId = (res[0].Items || []).map(embyItem_);
    const found = {};
    items.forEach(function (i, n) {
      const kind = i.kind === "tv" ? "tv" : "movie";
      let hit = byId.filter(function (e) { return e.type === kind && ((i.tmdb && e.tmdb === String(i.tmdb)) || (i.imdb && e.imdb === String(i.imdb))); })[0];
      if (!hit) {
        const named = (res[n + 1].Items || []).map(embyItem_);
        hit = named.filter(function (e) { return (i.tmdb && e.tmdb === String(i.tmdb)) || (i.imdb && e.imdb === String(i.imdb)); })[0];
        if (!hit) {
          hit = named.filter(function (e) {
            return !e.tmdb && bareName_(e.name) === bareName_(i.title) && (!i.year || !e.year || Math.abs(Number(e.year) - Number(i.year)) <= 1);
          })[0];
        }
      }
      if (hit) found[i.key] = { name: hit.name, seasons: hit.seasons, episodes: hit.episodes, added: hit.added };
    });
    return { ok: true, found: found };
  }
  if (op === "latest") {
    const tv = req.kind === "tv";
    const res = embyGetAll_(c, [{ path: "/emby/Users/{uid}/Items", params: { Recursive: "true", IncludeItemTypes: tv ? "Series" : "Movie", SortBy: tv ? "DateLastContentAdded" : "DateCreated", SortOrder: "Descending", Fields: EMBY_FIELDS, Limit: Math.min(Number(req.limit) || 30, 60) } }])[0];
    return { ok: true, items: (res.Items || []).map(embyItem_) };
  }
  if (op === "libraries") {
    const res = embyGetAll_(c, [{ path: "/emby/Users/{uid}/Views", params: {} }])[0];
    return {
      ok: true,
      libraries: (res.Items || [])
        .filter(function (v) { return !v.CollectionType || ["movies", "tvshows", "mixed"].indexOf(v.CollectionType) >= 0; })
        .map(function (v) { return { id: v.Id, name: v.Name, type: v.CollectionType || "mixed" }; }),
    };
  }
  if (op === "genres") {
    const res = embyGetAll_(c, [{ path: "/emby/Genres", params: { UserId: "{uid}", ParentId: req.parent || "", IncludeItemTypes: req.kind === "tv" ? "Series" : req.kind === "movie" ? "Movie" : "Movie,Series", Recursive: "true", SortBy: "SortName" } }])[0];
    return { ok: true, genres: (res.Items || []).map(function (g) { return g.Name; }) };
  }
  if (op === "browse") {
    const tv = req.kind === "tv";
    const sorts = { added: tv ? "DateLastContentAdded,DateCreated" : "DateCreated", rating: "CommunityRating", newest: "PremiereDate,ProductionYear", random: "Random", name: "SortName" };
    const sort = sorts[req.sort] ? req.sort : "added";
    const res = embyGetAll_(c, [{ path: "/emby/Users/{uid}/Items", params: {
      Recursive: "true",
      ParentId: req.parent || "",
      IncludeItemTypes: req.kind === "tv" ? "Series" : req.kind === "movie" ? "Movie" : "Movie,Series",
      Genres: req.genre || "",
      SortBy: sorts[sort],
      SortOrder: sort === "name" ? "Ascending" : "Descending",
      StartIndex: Math.max(0, Number(req.start) || 0),
      Limit: Math.min(Number(req.limit) || 30, 60),
      Fields: EMBY_FIELDS + ",CommunityRating,Genres",
      EnableImages: "false",
    } }])[0];
    return {
      ok: true,
      total: res.TotalRecordCount || 0,
      items: (res.Items || []).map(function (it) {
        const e = embyItem_(it);
        e.rating = it.CommunityRating ? Math.round(it.CommunityRating * 10) / 10 : "";
        e.genres = (it.Genres || []).join(", ");
        return e;
      }),
    };
  }
  throw fail_("Emby: unknown request.");
}

/* ------------------------------------------------------------------ */
/*  Emby library export                                               */
/* ------------------------------------------------------------------ */

const EMBY_EXPORT_COLS = ["library", "type", "name", "year", "rating", "genres", "seasons", "episodes", "added", "tmdb", "imdb"];
const EMBY_PAGE = 500;

/**
 * Every film and series on the Emby server, one row each, into a sheet of
 * its own ("Life apps: Emby library" in the Life apps folder). Run again to
 * refresh it. Download it as Excel from File, Download.
 */
function exportEmby_() {
  const c = embyConf_();
  const libs = emby_({ op: "libraries" }).libraries;
  const plan = [];
  libs.forEach(function (l) {
    const types = l.type === "movies" ? "Movie" : l.type === "tvshows" ? "Series" : "Movie,Series";
    const head = embyGetAll_(c, [{ path: "/emby/Users/{uid}/Items", params: { Recursive: "true", ParentId: l.id, IncludeItemTypes: types, Limit: 0 } }])[0];
    for (let start = 0; start < (head.TotalRecordCount || 0); start += EMBY_PAGE) plan.push({ lib: l, types: types, start: start });
  });
  const rows = [];
  for (let i = 0; i < plan.length; i += 8) {
    const batch = plan.slice(i, i + 8);
    const res = embyGetAll_(c, batch.map(function (p) {
      return { path: "/emby/Users/{uid}/Items", params: { Recursive: "true", ParentId: p.lib.id, IncludeItemTypes: p.types, SortBy: "SortName", StartIndex: p.start, Limit: EMBY_PAGE, Fields: "ProviderIds,ProductionYear,ChildCount,RecursiveItemCount,DateCreated,CommunityRating,Genres", EnableImages: "false" } };
    }));
    res.forEach(function (r, n) {
      (r.Items || []).forEach(function (it) {
        const e = embyItem_(it);
        rows.push([batch[n].lib.name, e.type === "tv" ? "series" : "film", e.name, e.year, it.CommunityRating ? Math.round(it.CommunityRating * 10) / 10 : "", (it.Genres || []).join(", "), e.seasons, e.episodes, e.added, e.tmdb, e.imdb]);
      });
    });
  }
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty("EMBY_EXPORT_ID");
  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (err) {
      ss = null;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create("Life apps: Emby library");
    ss.setSpreadsheetTimeZone(TZ);
    DriveApp.getFileById(ss.getId()).moveTo(folder_(APPS_FOLDER));
    props.setProperty("EMBY_EXPORT_ID", ss.getId());
  }
  const sh = ss.getSheets()[0];
  sh.setName("library");
  sh.clear();
  const all = [EMBY_EXPORT_COLS].concat(rows);
  if (sh.getMaxRows() < all.length) sh.insertRowsAfter(sh.getMaxRows(), all.length - sh.getMaxRows());
  if (sh.getMaxColumns() < EMBY_EXPORT_COLS.length) sh.insertColumnsAfter(sh.getMaxColumns(), EMBY_EXPORT_COLS.length - sh.getMaxColumns());
  sh.getRange(1, 1, all.length, EMBY_EXPORT_COLS.length).setNumberFormat("@").setValues(all.map(function (r) { return r.map(function (v) { return v === null || v === undefined ? "" : String(v); }); }));
  sh.getRange(1, 1, 1, EMBY_EXPORT_COLS.length).setFontWeight("bold");
  sh.setFrozenRows(1);
  log_("emby", "exported " + rows.length + " titles from " + libs.length + " libraries");
  return { url: ss.getUrl(), count: rows.length, libraries: libs.length };
}

function menuExportEmby() {
  const ui = SpreadsheetApp.getUi();
  let msg;
  try {
    const r = exportEmby_();
    msg = r.count.toLocaleString() + " titles from " + r.libraries + " libraries are in the sheet \"Life apps: Emby library\" in your Life apps folder.\n\n" + r.url + "\n\nTo get an Excel file: open it, File, Download, Microsoft Excel.";
  } catch (err) {
    msg = "The export stopped: " + err.message;
  }
  ui.alert("Emby library", msg, ui.ButtonSet.OK);
}


/**
 * Run this once from the editor (choose "authorize", press Run) so Google
 * asks for the permission to reach servers outside Google, which Emby needs.
 */
function authorize() {
  UrlFetchApp.fetch("https://www.google.com", { muteHttpExceptions: true });
  return "Allowed. Now run Life apps, Emby login for Watchlist.";
}
