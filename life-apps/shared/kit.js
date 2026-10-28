/*
 * Life apps: the small toolkit every app shares.
 *
 *   Kit.start({ app: "household", title: "Household", render: function (main, hub) { ... } })
 *
 * start() shows the unlock screen when this device has no key yet; otherwise
 * it builds the header with the sync status, hands the page to the app's own
 * render function, and starts syncing.
 */
(function (global) {
  "use strict";

  var doc = global.document;

  /** h("button", { class: "btn", onclick: fn }, "Save") */
  function h(tag, props) {
    var el = doc.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function append(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) return kid.forEach(function (k) { append(el, k); });
    el.appendChild(kid.nodeType ? kid : doc.createTextNode(String(kid)));
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  var toastTimer = null;
  function toast(message) {
    var el = doc.getElementById("kit-toast");
    if (!el) {
      el = h("div", { id: "kit-toast", class: "toast", role: "status", "aria-live": "polite" });
      doc.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 3200);
  }

  /** "just now", "4 min ago", "yesterday 21:40", or a date */
  function ago(iso) {
    if (!iso) return "never";
    var d = new Date(iso);
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 45) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    var time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    var today = new Date();
    if (d.toDateString() === today.toDateString()) return "today " + time;
    var y = new Date(today.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return "yesterday " + time;
    return d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + time;
  }

  /* -------------------------------------------------------------- */
  /*  sync status                                                    */
  /* -------------------------------------------------------------- */

  function statusText(hub) {
    var n = hub.pendingCount();
    var waiting = n === 1 ? "1 waiting" : n + " waiting";
    if (hub.state === "syncing") return { text: "Syncing", tone: "busy" };
    if (hub.state === "offline") return { text: n ? "Offline, " + waiting : "Offline", tone: "warn" };
    if (hub.state === "error") return { text: "Sync problem", tone: "bad" };
    if (n) return { text: waiting, tone: "warn" };
    return { text: "In your sheet", tone: "good" };
  }

  /** The pill in the header. Tap it to sync now. */
  function statusPill(hub) {
    var dot = h("span", { class: "pill-dot", "aria-hidden": "true" });
    var label = h("span", { class: "pill-label" });
    var pill = h(
      "button",
      {
        class: "pill",
        type: "button",
        onclick: function () {
          hub.sync().then(function (ok) {
            if (!ok) toast(hub.error);
            else toast("Synced " + ago(hub.lastSync));
          });
        },
      },
      dot,
      label
    );
    function paint() {
      var s = statusText(hub);
      pill.dataset.tone = s.tone;
      label.textContent = s.text;
      pill.setAttribute(
        "aria-label",
        s.text + ". Last synced " + ago(hub.lastSync) + ". Tap to sync now." + (hub.error ? " " + hub.error : "")
      );
    }
    hub.on(paint);
    paint();
    return pill;
  }

  /* -------------------------------------------------------------- */
  /*  unlock                                                         */
  /* -------------------------------------------------------------- */

  var HUB_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

  function unlockScreen(root, opts) {
    var params = new URLSearchParams((global.location.hash || "").slice(1));
    var url = h("input", {
      id: "hub-url",
      class: "field-input",
      type: "url",
      inputmode: "url",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      placeholder: "https://script.google.com/macros/s/.../exec",
      value: params.get("hub") || "",
    });
    var key = h("input", {
      id: "hub-key",
      class: "field-input",
      type: "text",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      placeholder: "la-...",
      value: params.get("key") || "",
    });
    if (params.get("hub") || params.get("key")) {
      global.history.replaceState(null, "", global.location.pathname);
    }
    var msg = h("p", { class: "form-error", role: "alert" });
    var btn = h("button", { class: "btn btn-primary btn-wide", type: "submit" }, "Unlock");

    var form = h(
      "form",
      {
        class: "unlock",
        onsubmit: function (e) {
          e.preventDefault();
          var u = url.value.trim();
          var k = key.value.trim();
          msg.textContent = "";
          if (!HUB_URL.test(u)) {
            msg.textContent =
              "The hub address starts with https://script.google.com/macros/s/ and ends in /exec. Copy it from Deploy, then Manage deployments.";
            return;
          }
          if (!k) {
            msg.textContent = "Paste a key. Make one from the Life apps menu in your hub sheet.";
            return;
          }
          btn.disabled = true;
          btn.textContent = "Checking";
          global.Hub.call({ url: u, key: k }, { action: "ping" })
            .then(function (res) {
              if (res.mode !== "full") {
                throw new Error("That is an add-only key, made for shortcuts. Apps need a full key.");
              }
              if (res.apps.indexOf("*") < 0 && res.apps.indexOf(opts.app) < 0) {
                throw new Error("That key is not allowed to use " + opts.title + ".");
              }
              global.Hub.setConfig(u, k);
              global.location.reload();
            })
            .catch(function (err) {
              msg.textContent =
                err.kind === "offline"
                  ? "Cannot reach the hub. Check your connection and the address, then try again."
                  : err.message;
              btn.disabled = false;
              btn.textContent = "Unlock";
            });
        },
      },
      h("h1", { class: "unlock-title" }, opts.title),
      h(
        "p",
        { class: "unlock-lead" },
        "Paste your hub address and a full key. You do this once for each app on each device."
      ),
      h("label", { class: "field", for: "hub-url" }, h("span", { class: "field-label" }, "Hub address"), url),
      h("label", { class: "field", for: "hub-key" }, h("span", { class: "field-label" }, "Key"), key),
      msg,
      btn
    );
    clear(root).appendChild(form);
  }

  /** A button that needs a second tap, instead of a confirm box. */
  function confirmButton(label, confirmLabel, onConfirm, cls) {
    var armed = false;
    var timer = null;
    var btn = h("button", {
      type: "button",
      class: cls || "btn",
      onclick: function () {
        if (!armed) {
          armed = true;
          btn.textContent = confirmLabel;
          btn.classList.add("armed");
          timer = setTimeout(function () {
            armed = false;
            btn.textContent = label;
            btn.classList.remove("armed");
          }, 4000);
          return;
        }
        clearTimeout(timer);
        onConfirm();
      },
    }, label);
    return btn;
  }

  /** Removes the key and this app's copy from this device. The sheet is untouched. */
  function lockDevice(hub) {
    hub.forget();
    global.Hub.clearConfig();
    global.location.reload();
  }

  /* -------------------------------------------------------------- */
  /*  start                                                          */
  /* -------------------------------------------------------------- */

  function start(opts) {
    if ("serviceWorker" in global.navigator && global.location.protocol !== "file:") {
      global.navigator.serviceWorker.register("./sw.js").catch(function () {});
    }
    var root = doc.getElementById("app");
    if (!global.Hub.config()) {
      unlockScreen(root, opts);
      return null;
    }
    var hub = new global.Hub(opts.app);
    var main = h("main", { class: "app-main" });
    clear(root).appendChild(
      h(
        "header",
        { class: "app-header" },
        h("h1", { class: "app-title" }, opts.title),
        statusPill(hub)
      )
    );
    root.appendChild(main);
    opts.render(main, hub);
    hub.start();
    return hub;
  }

  global.Kit = {
    h: h,
    clear: clear,
    toast: toast,
    ago: ago,
    statusPill: statusPill,
    confirmButton: confirmButton,
    lockDevice: lockDevice,
    start: start,
  };
})(window);
