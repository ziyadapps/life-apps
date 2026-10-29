/*
 * Life apps: the small toolkit every app shares.
 *
 *   Kit.start({
 *     app: "household",
 *     title: { en: "Household", ar: "البيت" },   // or a plain string
 *     languages: ["en", "ar"],                     // leave out for English only
 *     render: function (main, hub) { ... }
 *   })
 *
 * start() shows the unlock screen when this device has no key yet; otherwise
 * it builds the header with the sync status, hands the page to the app's own
 * render function, and starts syncing.
 *
 * Words on screen go through Kit.t("key"), so an app that offers Arabic
 * reads right to left with every shared word translated, unlock included.
 */
(function (global) {
  "use strict";

  var doc = global.document;
  var LANG_KEY = "lifeapps.lang";

  /* -------------------------------------------------------------- */
  /*  words                                                          */
  /* -------------------------------------------------------------- */

  var STR = {
    en: {
      unlock: "Unlock",
      checking: "Checking",
      unlockLead: "Paste your hub address and a full key. You do this once for each app on each device.",
      hubAddress: "Hub address",
      key: "Key",
      badUrl: "The hub address starts with https://script.google.com/macros/s/ and ends in /exec. Copy it from Deploy, then Manage deployments.",
      noKey: "Paste a key. Make one from the Life apps menu in your hub sheet.",
      addOnly: "That is an add-only key, made for shortcuts. Apps need a full key.",
      notAllowed: "That key is not allowed to use {app}.",
      cannotReach: "Cannot reach the hub. Check your connection and the address, then try again.",
      syncing: "Syncing",
      offline: "Offline",
      waiting: "{n} waiting",
      syncProblem: "Sync problem",
      inSheet: "In your sheet",
      synced: "Synced {when}",
      statusLabel: "{status}. Last synced {when}. Tap to sync now.",
      lockDevice: "Lock this device",
      tapToLock: "Tap again to lock",
      never: "never",
      justNow: "just now",
      minAgo: "{n} min ago",
      todayAt: "today {t}",
      yesterdayAt: "yesterday {t}",
      language: "Language",
    },
    ar: {
      unlock: "فتح",
      checking: "جاري التحقق",
      unlockLead: "الصق عنوان المركز والمفتاح. هذا يتم مرة واحدة لكل تطبيق على كل جهاز.",
      hubAddress: "عنوان المركز",
      key: "المفتاح",
      badUrl: "عنوان المركز يبدأ بـ https://script.google.com/macros/s/ وينتهي بـ /exec",
      noKey: "الصق المفتاح.",
      addOnly: "هذا مفتاح للاختصارات فقط، والتطبيق يحتاج مفتاح كامل.",
      notAllowed: "هذا المفتاح لا يسمح باستخدام {app}.",
      cannotReach: "تعذر الوصول للمركز. تأكد من الاتصال والعنوان ثم حاول مرة ثانية.",
      syncing: "جاري المزامنة",
      offline: "بدون اتصال",
      waiting: "{n} بانتظار الإرسال",
      syncProblem: "مشكلة في المزامنة",
      inSheet: "محفوظ",
      synced: "تمت المزامنة {when}",
      statusLabel: "{status}. آخر مزامنة {when}. اضغط للمزامنة الآن.",
      lockDevice: "قفل هذا الجهاز",
      tapToLock: "اضغط مرة ثانية للقفل",
      never: "أبدا",
      justNow: "الآن",
      minAgo: "قبل {n} د",
      todayAt: "اليوم {t}",
      yesterdayAt: "أمس {t}",
      language: "اللغة",
    },
  };

  var lang = "en";

  /** Adds an app's own words: Kit.words({ en: {...}, ar: {...} }) */
  function words(dict) {
    Object.keys(dict).forEach(function (l) {
      STR[l] = STR[l] || {};
      Object.keys(dict[l]).forEach(function (k) {
        STR[l][k] = dict[l][k];
      });
    });
  }

  /** t("waiting", { n: 3 }) -> "3 waiting" in the device's language */
  function t(key, vars) {
    var s = (STR[lang] && STR[lang][key]) || STR.en[key] || key;
    Object.keys(vars || {}).forEach(function (k) {
      s = s.split("{" + k + "}").join(String(vars[k]));
    });
    return s;
  }

  function pickLang(languages) {
    var allowed = languages && languages.length ? languages : ["en"];
    var saved = null;
    try {
      saved = global.localStorage.getItem(LANG_KEY);
    } catch (e) {}
    if (saved && allowed.indexOf(saved) >= 0) return saved;
    var nav = String(global.navigator.language || "").toLowerCase();
    if (allowed.indexOf("ar") >= 0 && nav.indexOf("ar") === 0) return "ar";
    return allowed[0];
  }

  function setLang(l) {
    try {
      global.localStorage.setItem(LANG_KEY, l);
    } catch (e) {}
    global.location.reload();
  }

  function applyLang(l) {
    lang = l;
    doc.documentElement.lang = l;
    doc.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }

  function titleOf(opts) {
    return typeof opts.title === "string" ? opts.title : opts.title[lang] || opts.title.en;
  }

  /* -------------------------------------------------------------- */
  /*  building pages                                                 */
  /* -------------------------------------------------------------- */

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
    if (!iso) return t("never");
    var d = new Date(iso);
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 45) return t("justNow");
    if (s < 3600) return t("minAgo", { n: Math.round(s / 60) });
    var time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    var today = new Date();
    if (d.toDateString() === today.toDateString()) return t("todayAt", { t: time });
    var y = new Date(today.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return t("yesterdayAt", { t: time });
    return d.toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short" }) + " " + time;
  }

  /* -------------------------------------------------------------- */
  /*  sync status                                                    */
  /* -------------------------------------------------------------- */

  function statusText(hub) {
    var n = hub.pendingCount();
    var waiting = t("waiting", { n: n });
    if (hub.state === "syncing") return { text: t("syncing"), tone: "busy" };
    if (hub.state === "offline") return { text: n ? t("offline") + ", " + waiting : t("offline"), tone: "warn" };
    if (hub.state === "error") return { text: t("syncProblem"), tone: "bad" };
    if (n) return { text: waiting, tone: "warn" };
    return { text: t("inSheet"), tone: "good" };
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
            else toast(t("synced", { when: ago(hub.lastSync) }));
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
      pill.setAttribute("aria-label", t("statusLabel", { status: s.text, when: ago(hub.lastSync) }) + (hub.error ? " " + hub.error : ""));
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
      dir: "ltr",
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
      dir: "ltr",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      placeholder: "la-...",
      value: params.get("key") || "",
    });
    /* a setup link keeps its key in the address until the device is unlocked,
       so adding the page to the home screen first carries the key along */
    var msg = h("p", { class: "form-error", role: "alert" });
    var btn = h("button", { class: "btn btn-primary btn-wide", type: "submit" }, t("unlock"));

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
            msg.textContent = t("badUrl");
            return;
          }
          if (!k) {
            msg.textContent = t("noKey");
            return;
          }
          btn.disabled = true;
          btn.textContent = t("checking");
          global.Hub.call({ url: u, key: k }, { action: "ping" })
            .then(function (res) {
              if (res.mode !== "full") throw new Error(t("addOnly"));
              if (res.apps.indexOf("*") < 0 && res.apps.indexOf(opts.app) < 0) {
                throw new Error(t("notAllowed", { app: titleOf(opts) }));
              }
              global.Hub.setConfig(u, k, { name: res.key, apps: res.apps });
              global.location.replace(global.location.pathname); // drops the key from the address
            })
            .catch(function (err) {
              msg.textContent = err.kind === "offline" ? t("cannotReach") : err.message;
              btn.disabled = false;
              btn.textContent = t("unlock");
            });
        },
      },
      h("h1", { class: "unlock-title" }, titleOf(opts)),
      h("p", { class: "unlock-lead" }, t("unlockLead")),
      h("label", { class: "field", for: "hub-url" }, h("span", { class: "field-label" }, t("hubAddress")), url),
      h("label", { class: "field", for: "hub-key" }, h("span", { class: "field-label" }, t("key")), key),
      msg,
      btn,
      opts.languages && opts.languages.length > 1 ? langSwitch(opts.languages) : null
    );
    clear(root).appendChild(form);
  }

  /** English / العربية, each written in its own language. */
  function langSwitch(languages) {
    var names = { en: "English", ar: "العربية" };
    var wrap = h("div", { class: "toggle", role: "group", "aria-label": t("language"), style: "margin-top:20px" });
    languages.forEach(function (l) {
      wrap.appendChild(
        h(
          "button",
          {
            type: "button",
            lang: l,
            "aria-pressed": l === lang ? "true" : "false",
            onclick: function () {
              if (l !== lang) setLang(l);
            },
          },
          names[l] || l
        )
      );
    });
    return wrap;
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

  /**
   * Who this device is (the key's name, like "iPhone" or "Wife") and which
   * apps its key opens. Devices unlocked before this was kept ask the hub once.
   */
  function who() {
    var c = global.Hub.config();
    return c ? { name: c.name || "", apps: c.apps || null } : { name: "", apps: null };
  }

  function canUse(app) {
    var w = who();
    return !!w.apps && (w.apps.indexOf("*") >= 0 || w.apps.indexOf(app) >= 0);
  }

  /* asked on every start, so renaming a key in the Keys tab reaches its phone */
  function learnWho(onDone) {
    var c = global.Hub.config();
    if (!c) return;
    global.Hub.call(c, { action: "ping" })
      .then(function (res) {
        var same = c.name === res.key && JSON.stringify(c.apps || null) === JSON.stringify(res.apps);
        if (same) return;
        global.Hub.setConfig(c.url, c.key, { name: res.key, apps: res.apps });
        if (onDone) onDone();
      })
      .catch(function () {});
  }

  /* -------------------------------------------------------------- */
  /*  start                                                          */
  /* -------------------------------------------------------------- */

  function start(opts) {
    applyLang(pickLang(opts.languages));
    doc.title = titleOf(opts);
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
      h("header", { class: "app-header" }, h("h1", { class: "app-title" }, titleOf(opts)), statusPill(hub))
    );
    root.appendChild(main);
    opts.render(main, hub);
    hub.start();
    learnWho(opts.onWho);
    return hub;
  }

  global.Kit = {
    h: h,
    clear: clear,
    toast: toast,
    ago: ago,
    t: t,
    words: words,
    lang: function () {
      return lang;
    },
    setLang: setLang,
    langSwitch: langSwitch,
    who: who,
    canUse: canUse,
    statusPill: statusPill,
    confirmButton: confirmButton,
    lockDevice: lockDevice,
    start: start,
  };
})(window);
