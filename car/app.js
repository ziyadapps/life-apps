/*
 * Car: the screens.
 *
 * Fill-ups, services and the odometer are typed here. The figures (km a
 * litre, what is due, what to set aside) come from calc.js. Budget reads
 * this app's sheet to post fill-ups and services into its envelopes, and
 * writes back which envelopes are the car's and any fill-up it heard of
 * from the bank first.
 */
(function () {
  "use strict";

  var h = Kit.h;
  var C = window.CarCalc;
  var TABLES = ["settings", "fuel", "services", "odo", "envelopes", "bank"];
  var S = { hub: null, data: null, main: null };

  /* ---------------------------------------------------------------- */
  /*  data                                                             */
  /* ---------------------------------------------------------------- */

  function today() {
    return Calc.ymd(new Date());
  }

  function refresh() {
    var d = {};
    TABLES.forEach(function (t) {
      d[t] = S.hub.all(t);
    });
    S.data = d;
    S.set = C.settingsOf(d.settings);
  }

  function setting(k) {
    return C.setting(S.set, k);
  }

  function money(n) {
    return Calc.money(n);
  }

  function whole(n) {
    return Calc.money(n, { whole: true });
  }

  function km(n) {
    return Math.round(Number(n) || 0).toLocaleString("en-US") + " km";
  }

  function day(d) {
    if (!d) return "";
    var y = String(d).slice(0, 4);
    return Calc.dayLabel(String(d).slice(0, 10)) + (y !== today().slice(0, 4) ? " " + y : "");
  }

  function inDays(d) {
    var n = Calc.daysBetween(today(), d);
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    if (n < 0) return day(d);
    if (n < 45) return "in " + n + " days";
    var m = Math.round(n / 30.4);
    return m < 24 ? "in about " + m + " months" : "in about " + Math.round(n / 365) + " years";
  }

  function hasCar() {
    return !!S.set.delivered || S.data.fuel.length > 0;
  }

  /* ---------------------------------------------------------------- */
  /*  small pieces (the same ones Budget uses)                         */
  /* ---------------------------------------------------------------- */

  function go(path) {
    if (location.hash === "#" + path) render();
    else location.hash = path;
  }

  function back(label, path) {
    return h("a", { class: "back", href: "#" + (path || "/") }, "‹ " + (label || "Back"));
  }

  function title(text, lead) {
    return [h("h1", { class: "page-title" }, text), lead ? h("p", { class: "page-lead" }, lead) : null];
  }

  function section(name, kids) {
    return h("section", { class: "section" }, name ? h("h2", { class: "section-title" }, name) : null, kids);
  }

  function kv(label, value) {
    return h("div", { class: "kv" }, h("span", null, label), h("span", null, value));
  }

  function field(label, input, hint) {
    var single = input && /^(INPUT|SELECT|TEXTAREA)$/.test(input.tagName);
    return h(
      single ? "label" : "div",
      single ? { class: "field" } : { class: "field", role: "group", "aria-label": label },
      h("span", { class: "field-label" }, label),
      input,
      hint ? h("span", { class: "note" }, hint) : null
    );
  }

  function numberInput(value, attrs) {
    var a = { class: "field-input", type: "text", inputmode: "decimal", autocomplete: "off", value: value === null || value === undefined || value === "" ? "" : String(value) };
    Object.keys(attrs || {}).forEach(function (k) {
      a[k] = attrs[k];
    });
    return h("input", a);
  }

  function readNumber(input) {
    var v = String(input.value || "").replace(/,/g, "").replace(/[٠-٩]/g, function (d) {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(d));
    }).replace(/٫/g, ".").trim();
    if (v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }

  function dateInput(value, attrs) {
    var a = { class: "field-input", type: "date", value: value || today() };
    Object.keys(attrs || {}).forEach(function (k) {
      a[k] = attrs[k];
    });
    return h("input", a);
  }

  function select(options, value, attrs) {
    var a = { class: "select" };
    Object.keys(attrs || {}).forEach(function (k) {
      a[k] = attrs[k];
    });
    var el = h("select", a);
    options.forEach(function (o) {
      var opt = h("option", { value: o.value }, o.label);
      if (String(o.value) === String(value === null || value === undefined ? "" : value)) opt.selected = true;
      el.appendChild(opt);
    });
    return el;
  }

  /** Two or three choices as buttons: { el, get() } */
  function toggle(options, value, attrs) {
    var cur = value;
    var wrap = h("div", Object.assign({ class: "toggle", role: "group" }, attrs || {}));
    var btns = options.map(function (o) {
      var b = h("button", { type: "button", "data-value": o.value, "aria-pressed": String(o.value === cur) }, o.label);
      b.addEventListener("click", function () {
        cur = o.value;
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-value") === cur)); });
        wrap.dispatchEvent(new Event("change"));
      });
      wrap.appendChild(b);
      return b;
    });
    return { el: wrap, get: function () { return cur; } };
  }

  function errorLine() {
    return h("p", { class: "form-error", role: "alert" });
  }

  function primary(label, onclick, id) {
    return h("button", { class: "btn btn-primary btn-wide", type: "button", onclick: onclick, id: id || null }, label);
  }

  function chevron() {
    return h("span", { class: "chev", "aria-hidden": "true" }, "›");
  }

  function banner(a) {
    return h("a", { class: "banner", href: a.href, "data-tone": a.tone || null }, h("span", { class: "banner-title" }, a.text), a.sub ? h("span", { class: "banner-text" }, a.sub) : null);
  }

  var ICONS = {
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5h14M4.5 16.5V12l2-5h11l2 5v4.5M4.5 12h15"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20M3.5 20h12M5 10h9M14 8h2.5l2 2v7a1.5 1.5 0 0 1-3 0v-3H14"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    service: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/></svg>',
  };

  function icon(name) {
    var span = h("span", { "aria-hidden": "true" });
    span.innerHTML = ICONS[name];
    return span.firstChild;
  }

  /* ---------------------------------------------------------------- */
  /*  home                                                             */
  /* ---------------------------------------------------------------- */

  function nextMonth() {
    var m = Calc.addMonths(Calc.monthOf(today()), 1);
    var r = Calc.range(m);
    return { month: m, start: r.start, end: r.end, days: Calc.daysBetween(r.start, r.end) + 1 };
  }

  function visitLine(v) {
    var names = v.items.filter(function (i) { return i.kind !== "check"; }).map(function (i) { return i.name; });
    var checks = v.items.filter(function (i) { return i.kind === "check"; }).length;
    if (checks) names.push(checks === 1 ? "1 check" : checks + " checks");
    return names.join(", ");
  }

  function costText(v) {
    if (v.free) return "Free";
    if (v.unknown.length) return v.cost ? money(v.cost) + " + prices to add" : "Add prices in Settings";
    return money(v.cost);
  }

  function viewHome(main) {
    if (!hasCar()) return viewWelcome(main);
    var t = today();
    var now = C.odoNow(S.data, t);
    var rate = C.kmPerDay(S.data, t);
    main.appendChild(h("div", { class: "month-head" }, h("h2", { class: "month-name" }, setting("name") || "Your car"), h("span", { class: "month-range" }, rate ? Math.round(rate) + " km a day" : "")));
    main.appendChild(
      h("a", { class: "hero", href: "#/odo", style: "display:block;text-decoration:none;color:inherit" },
        h("span", { class: "hero-value", id: "odo-now" }, (now.estimated ? "≈ " : "") + Math.round(now.odo).toLocaleString("en-US"), h("span", { class: "cur" }, "km")),
        h("span", { class: "hero-label" }, now.estimated ? "Estimated. Last reading " + km(now.reading) + " on " + day(now.date) + ". Tap to update." : now.date ? "Reading on " + day(now.date) + ". Tap to update." : "Tap to add a reading."))
    );
    C.alerts(S.data, t).forEach(function (a) {
      main.appendChild(banner(a));
    });

    /* next service */
    var vs = C.visits(S.data, t, 400);
    var v = vs[0];
    if (v) {
      var when = v.date ? "About " + day(v.date) + ", " : "";
      main.appendChild(section("Next service", h("a", { class: "row-link", href: "#/service" },
        h("div", { class: "row-main" }, h("span", { class: "row-title", id: "next-service" }, (v.free ? "Free service at " : "At ") + km(v.km)), h("span", { class: "row-sub" }, when + visitLine(v) + ". " + costText(v))),
        chevron())));
    }

    /* fuel */
    var fs = C.fills(S.data);
    var eco = C.economy(S.data, t);
    var M = Calc.monthOf(t);
    var r = Calc.range(M);
    var fig = h("div", { class: "figures" },
      h("div", null, h("b", { id: "kmpl" }, eco ? eco.kmPerL.toFixed(1) : "–"), h("span", null, eco ? "km a litre" : "km a litre, after your next full tank")),
      h("div", null, h("b", null, eco ? (eco.perKm * 100).toFixed(1) : "–"), h("span", null, "halalas a km")),
      h("div", null, h("b", null, whole(C.fuelSpent(S.data, r.start, r.end))), h("span", null, "fuel since payday")),
      h("div", null, h("b", null, fs.length ? day(fs[0].date) : "–"), h("span", null, fs.length ? "last fill, " + money(fs[0].cost) : "no fill-ups yet")));
    main.appendChild(section("Fuel", h("div", null, fig, h("div", { class: "btn-row", style: "margin-top:10px" }, h("a", { class: "btn btn-primary", href: "#/fill" }, "Log a fill-up"), h("a", { class: "btn", href: "#/fuel" }, "All fill-ups")))));

    /* set aside */
    var nm = nextMonth();
    var fuel = C.fuelFor(S.data, nm.days, t);
    var mt = C.maintenanceFor(S.data, t, nm.start, nm.end);
    var aside = h("div", { class: "list", id: "aside" });
    aside.appendChild(kv("Fuel", fuel ? money(fuel.amount) : "After two readings"));
    aside.appendChild(kv("Maintenance, saved monthly", mt.dated ? money(mt.monthly) : "After two readings"));
    if (mt.due) aside.appendChild(kv("Service due in " + Calc.monthLabel(nm.month), money(mt.due)));
    var why = [];
    if (fuel) why.push("Fuel: " + km(fuel.km) + " at " + fuel.kmPerL.toFixed(1) + " km a litre" + (fuel.fromSticker ? " (the sticker's figure until two full tanks)" : "") + ", " + money(fuel.price) + " a litre.");
    if (mt.dated) why.push("Maintenance: the next 12 months of services, " + money(mt.year) + ", spread evenly so the bigger ones are already saved." + (mt.unknown.length ? " Some prices are missing: add them in Settings." : ""));
    main.appendChild(section("Set aside for " + Calc.monthLabel(nm.month), h("div", null, aside, h("p", { class: "note" }, why.join(" ")))));

    /* the car envelopes in Budget */
    var envs = S.data.envelopes.slice().sort(function (a, b) { return String(a.role) < String(b.role) ? -1 : 1; });
    if (envs.length) {
      var el = h("div", { class: "list" });
      envs.forEach(function (e) {
        el.appendChild(kv(e.name, money(e.left)));
      });
      main.appendChild(section("In Budget", h("div", null, el, h("p", { class: "note" }, "Left in each envelope this month. Updated " + Kit.ago(envs[0].updated) + "."))));
    }
  }

  function viewWelcome(main) {
    main.appendChild(h("div", null, title("Your car", "Start with the car's details: the day you got it, financing and renewal dates. Then log fill-ups as you go.")));
    main.appendChild(h("div", { class: "btn-row" }, h("a", { class: "btn btn-primary", href: "#/settings", id: "start" }, "Car details"), h("a", { class: "btn", href: "#/fill" }, "Log a fill-up")));
  }

  /* ---------------------------------------------------------------- */
  /*  fuel                                                             */
  /* ---------------------------------------------------------------- */

  function viewFuel(main) {
    main.appendChild(h("div", null, title("Fuel", "From one full tank to the next shows your real km a litre. A tank that was not filled to the top is added into the next full one.")));
    var bank = S.data.bank.filter(function (b) { return !b.done; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    if (bank.length) {
      var bl = h("div", { class: "list", id: "bank" });
      bank.forEach(function (b) {
        bl.appendChild(h("a", { class: "row-link", href: "#/fill?bank=" + encodeURIComponent(b.id) },
          h("div", { class: "row-main" }, h("span", { class: "row-title" }, money(b.amount) + ", " + day(b.date)), h("span", { class: "row-sub" }, (b.merchant || "Fuel") + ". Add the odometer and litres")), chevron()));
      });
      main.appendChild(section("From the bank", bl));
    }
    var fs = C.fills(S.data);
    var list = h("div", { class: "list", id: "fills" });
    if (!fs.length) list.appendChild(h("div", { class: "empty" }, "No fill-ups yet."));
    fs.forEach(function (f) {
      var bits = [km(f.odo), f.litres.toFixed(1) + " L", money(f.price) + " a litre"];
      if (f.kmPerL) bits.push(f.kmPerL.toFixed(1) + " km a litre");
      else if (!f.full) bits.push("not full");
      else if (f.km === null) bits.push("first full tank");
      list.appendChild(h("a", { class: "row-link", href: "#/fill/" + f.id, "data-fill": f.id },
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, day(f.date) + (f.km ? ", " + km(f.km) + " since" : ""), f.row.budget ? h("span", { class: "tag" }, "In Budget") : null), h("span", { class: "row-sub" }, bits.join(" · "))),
        h("span", { class: "amt" }, money(f.cost))));
    });
    main.appendChild(section("Fill-ups", list));
  }

  /** The fill-up form, for a new one, one from the bank, or one to change. */
  function viewFill(main, id, query) {
    var row = id ? S.hub.get("fuel", id) : null;
    if (id && !row) return viewMissing(main);
    var bank = query && query.bank ? S.hub.get("bank", query.bank) : null;
    var price0 = row ? Number(row.price) || setting("price") : setting("price");
    main.appendChild(back(id || bank ? "Fuel" : "Car", id || bank ? "/fuel" : "/"));
    main.appendChild(h("div", null, title(row ? "Fill-up" : "Log a fill-up", bank ? "The bank's message already put this in Budget. Add the odometer and litres." : null)));
    var prev = C.fills(S.data).filter(function (f) { return !row || f.id !== row.id; })[0];
    var date = dateInput(row ? String(row.date).slice(0, 10) : bank ? bank.date : today(), { id: "f-date" });
    var odo = numberInput(row ? row.odo : "", { id: "f-odo", inputmode: "numeric", placeholder: prev ? "More than " + Math.round(prev.odo) : "" });
    var cost = numberInput(row ? row.cost : bank ? bank.amount : "", { id: "f-cost", placeholder: "SAR" });
    var price = numberInput(price0, { id: "f-price" });
    var litres = numberInput(row ? row.litres : "", { id: "f-litres" });
    var full = toggle([{ value: "yes", label: "Filled to the top" }, { value: "no", label: "Not full" }], row ? (row.full === "no" ? "no" : "yes") : "yes", { id: "f-full" });
    var note = h("input", { class: "field-input", type: "text", id: "f-note", value: row ? row.note || "" : bank ? bank.merchant || "" : "", placeholder: "Station, optional" });
    var litresTouched = !!row;
    function autoLitres() {
      if (litresTouched) return;
      var c = readNumber(cost), p = readNumber(price);
      litres.value = c > 0 && p > 0 ? C.litresFor(c, p).toFixed(1) : "";
    }
    litres.addEventListener("input", function () { litresTouched = litres.value !== ""; });
    cost.addEventListener("input", autoLitres);
    price.addEventListener("input", function () { litresTouched = false; autoLitres(); });
    autoLitres();
    var tripHint = h("span", { class: "note" });
    function paintTrip() {
      var o = readNumber(odo);
      tripHint.textContent = prev ? (o > prev.odo ? Math.round(o - prev.odo) + " km since the last fill-up (" + km(prev.odo) + ", " + day(prev.date) + "). That is your Trip A." : "Last fill-up at " + km(prev.odo) + ".") : "";
    }
    odo.addEventListener("input", paintTrip);
    paintTrip();
    var dup = h("p", { class: "note", role: "status", id: "f-dup" });
    function checkDup() {
      var c = readNumber(cost);
      var same = S.data.fuel.filter(function (f) { return f.id !== id && String(f.date).slice(0, 10) === date.value && Math.abs(Number(f.cost) - c) < 0.01; });
      dup.textContent = same.length ? "A fill-up of " + money(c) + " on this day is already logged. Save only if this is another one." : "";
      dup.hidden = !same.length;
    }
    cost.addEventListener("input", checkDup);
    date.addEventListener("change", checkDup);
    checkDup();

    main.appendChild(h("div", { class: "two" }, field("Odometer", odo), field("Date", date)));
    main.appendChild(tripHint);
    main.appendChild(h("div", { class: "two" }, field("Cost", cost), field("Price a litre", price)));
    main.appendChild(field("Litres", litres, "Worked out from the cost and price. Change it if the pump shows something else."));
    main.appendChild(field("Tank", full.el));
    main.appendChild(field("Note", note));
    main.appendChild(dup);
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary(row ? "Save fill-up" : "Log fill-up", function () {
      var o = readNumber(odo), c = readNumber(cost), p = readNumber(price), l = readNumber(litres);
      if (!(o > 0)) { msg.textContent = "Type the odometer reading."; return; }
      if (!(c > 0)) { msg.textContent = "Type what it cost."; return; }
      if (!(p > 0)) { msg.textContent = "Type the price a litre."; return; }
      if (!(l > 0)) l = C.litresFor(c, p);
      if (l > Number(setting("tank")) + 5) { msg.textContent = "That is more than the tank holds (" + setting("tank") + " L). Check the litres."; return; }
      var clash = S.data.fuel.filter(function (f) { return f.id !== id && Number(f.odo) === o; });
      if (clash.length) { msg.textContent = "Another fill-up is already at " + km(o) + "."; return; }
      var out = { date: date.value || today(), odo: Math.round(o), cost: Calc.r2(c), price: Calc.r2(p), litres: Math.round(l * 100) / 100, full: full.get(), note: note.value.trim() };
      if (row) {
        out.id = row.id;
        /* a changed cost goes to Budget again */
        if (row.budget === "posted" && Number(row.cost) !== out.cost) out.budget = "update";
      } else {
        out.added = new Date().toISOString();
        out.by = Kit.who().name || "";
        out.budget = bank ? "linked" : "";
        out.budget_ref = bank ? bank.ref || bank.id : "";
      }
      var writes = [{ table: "fuel", row: out }];
      if (bank) writes.push({ table: "bank", row: { id: bank.id, done: new Date().toISOString() } });
      var saved = S.hub.putMany(writes)[0];
      var f = C.fills(S.data).filter(function (x) { return x.id === saved.id; })[0];
      refresh();
      f = C.fills(S.data).filter(function (x) { return x.id === saved.id; })[0];
      Kit.toast(f && f.kmPerL ? "Logged. " + f.kmPerL.toFixed(1) + " km a litre since the last full tank" : "Logged " + money(out.cost));
      go(bank || row ? "/fuel" : "/");
    }, "f-save")));
    if (row) {
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:12px" }, Kit.confirmButton("Delete fill-up", "Tap again to delete", function () {
        S.hub.put("fuel", { id: row.id, del: new Date().toISOString(), budget: row.budget === "posted" ? "remove" : row.budget || "" });
        go("/fuel");
      })));
      if (row.budget) main.appendChild(h("p", { class: "note" }, row.budget === "linked" ? "Matched to a payment Budget already had from the bank." : "In Budget. Changes here reach it next time Budget opens."));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  services                                                         */
  /* ---------------------------------------------------------------- */

  function intervalText(item) {
    if (item.once) return "Once, at " + km(item.once);
    var bits = [];
    if (item.first) bits.push("first at " + km(item.first) + ", then");
    bits.push("every " + [item.km ? km(item.km) : "", item.months ? item.months + " months" : ""].filter(String).join(" or "));
    if (item.after) bits.push("(every " + km(item.after.km2) + " or " + item.after.months2 + " months after " + km(item.after.km) + ")");
    return bits.join(" ");
  }

  function viewService(main) {
    var t = today();
    main.appendChild(h("div", null, title("Service", "When something falls due, anything else due before about halfway to the next service is done at the same visit.")));
    main.appendChild(h("div", { class: "btn-row", style: "margin-bottom:8px" }, h("a", { class: "btn btn-primary", href: "#/service/new", id: "log-service" }, "Log a service"), h("a", { class: "btn", href: "#/plan" }, "The full plan")));
    var vs = C.visits(S.data, t, 400);
    var list = h("div", { class: "list", id: "visits" });
    if (!vs.length) list.appendChild(h("div", { class: "empty" }, "Nothing in the next year."));
    vs.forEach(function (v) {
      list.appendChild(h("div", { class: "row stack" },
        h("div", { class: "row-main" },
          h("span", { class: "row-title" }, (v.free ? "Free service, " : "") + km(v.km) + (v.date ? ", about " + day(v.date) : "")),
          h("span", { class: "row-sub" }, visitLine(v)),
          h("span", { class: "row-sub", style: "font-weight:600" }, costText(v)))));
    });
    main.appendChild(section("Coming up", list));
    var done = S.data.services.slice().sort(function (a, b) { return Number(b.odo) - Number(a.odo); });
    var hl = h("div", { class: "list", id: "services" });
    if (!done.length) hl.appendChild(h("div", { class: "empty" }, "No services logged yet."));
    done.forEach(function (r) {
      var names = C.itemsOf(r).map(function (id) { var it = C.ITEMS.filter(function (i) { return i.id === id; })[0]; return it ? it.name : id; });
      hl.appendChild(h("a", { class: "row-link", href: "#/service/" + r.id },
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, day(r.date) + ", " + km(r.odo) + (r.place ? ", " + r.place : ""), r.budget ? h("span", { class: "tag" }, "In Budget") : null), h("span", { class: "row-sub" }, names.join("; "))),
        h("span", { class: "amt" }, Number(r.cost) ? money(r.cost) : "Free")));
    });
    main.appendChild(section("Done", hl));
  }

  function viewServiceForm(main, id) {
    var isNew = !id || id === "new";
    var row = isNew ? null : S.hub.get("services", id);
    if (!isNew && !row) return viewMissing(main);
    var t = today();
    main.appendChild(back("Service", "/service"));
    main.appendChild(h("div", null, title(isNew ? "Log a service" : "Service")));
    var next = C.visits(S.data, t, 400)[0];
    var picked = {};
    if (row) C.itemsOf(row).forEach(function (i) { picked[i] = true; });
    else if (next) next.items.forEach(function (i) { picked[i.id] = true; });
    var now = C.odoNow(S.data, t);
    var last = S.data.services.slice().sort(function (a, b) { return Number(b.odo) - Number(a.odo); })[0];
    var date = dateInput(row ? String(row.date).slice(0, 10) : t, { id: "s-date" });
    var odo = numberInput(row ? row.odo : "", { id: "s-odo", inputmode: "numeric", placeholder: now.odo ? "About " + Math.round(now.odo) : "" });
    var cost = numberInput(row ? row.cost : "", { id: "s-cost", placeholder: "0 if free" });
    var place = h("input", { class: "field-input", type: "text", id: "s-place", value: row ? row.place || "" : last ? last.place || "" : "", placeholder: "For example the dealer" });
    var note = h("input", { class: "field-input", type: "text", id: "s-note", value: row ? row.note || "" : "", placeholder: "Optional" });
    main.appendChild(h("div", { class: "two" }, field("Odometer", odo), field("Date", date)));
    main.appendChild(h("div", { class: "two" }, field("Cost", cost), field("Where", place)));
    var mode = setting("mode");
    var boxes = {};
    var listEl = h("div", { class: "list", id: "s-items" });
    C.plan(mode).forEach(function (item) {
      var cb = h("input", { type: "checkbox", "data-item": item.id });
      cb.checked = !!picked[item.id];
      boxes[item.id] = cb;
      listEl.appendChild(h("label", { class: "check-line" }, cb, h("span", null, item.name)));
    });
    main.appendChild(field("What was done", listEl, isNew && next ? "Ticked: what was due at this service. Untick anything they did not do." : null));
    main.appendChild(field("Note", note));
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary(isNew ? "Log service" : "Save service", function () {
      var o = readNumber(odo), c = readNumber(cost);
      if (!(o > 0)) { msg.textContent = "Type the odometer reading."; return; }
      if (c === null) c = 0;
      if (isNaN(c) || c < 0) { msg.textContent = "The cost is a number, 0 if it was free."; return; }
      var items = Object.keys(boxes).filter(function (k) { return boxes[k].checked; });
      if (!items.length) { msg.textContent = "Tick what was done."; return; }
      var out = { date: date.value || t, odo: Math.round(o), cost: Calc.r2(c), place: place.value.trim(), items: items.join(" "), note: note.value.trim() };
      if (row) {
        out.id = row.id;
        if (row.budget === "posted" && Number(row.cost) !== out.cost) out.budget = "update";
      } else {
        out.added = new Date().toISOString();
        out.budget = out.cost > 0 ? "" : "none";
      }
      S.hub.put("services", out);
      Kit.toast(isNew ? "Service logged" : "Saved");
      go("/service");
    }, "s-save")));
    if (row) {
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:12px" }, Kit.confirmButton("Delete service", "Tap again to delete", function () {
        S.hub.put("services", { id: row.id, del: new Date().toISOString(), budget: row.budget === "posted" ? "remove" : row.budget || "" });
        go("/service");
      })));
    }
  }

  function viewPlan(main) {
    var t = today();
    main.appendChild(back("Service", "/service"));
    main.appendChild(h("div", null, title("Maintenance plan", "From the owner's manual (Corolla, M20A-FKS engine). Whichever comes first, the km or the months.")));
    var mode = toggle(C.MODES.map(function (m) { return { value: m.id, label: m.name }; }), setting("mode"), { id: "mode", "aria-label": "Schedule" });
    mode.el.addEventListener("change", function () {
      S.hub.put("settings", { id: "mode", value: mode.get() });
      Kit.toast(C.MODES.filter(function (m) { return m.id === mode.get(); })[0].name + " schedule");
      render();
    });
    main.appendChild(mode.el);
    main.appendChild(h("p", { class: "note" }, {
      normal: "The regular table.",
      dust: "The regular table, plus the dust checks: air filter every 2,500 km, A/C filter every 15,000 km, brakes every 5,000 km.",
      dusty: "The manual's dusty roads table: oil every 5,000 km or 6 months, and the dust checks.",
    }[setting("mode")] || ""));
    var list = h("div", { class: "list", id: "plan" });
    C.schedule(S.data, t).forEach(function (x) {
      var tone = x.status === "overdue" ? "bad" : x.status === "soon" ? "warn" : "good";
      var due = [x.km ? "at " + km(x.km) : "", x.date ? "by " + day(x.date) : ""].filter(String).join(" or ");
      var iv = intervalText(x.item);
      var sub = [iv.charAt(0).toUpperCase() + iv.slice(1), x.last ? "Last done " + day(x.last.date) + " at " + km(x.last.odo) : "Not done yet"].join(". ");
      var kids = [h("span", { class: "status-dot", "data-tone": tone }),
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, x.item.name), h("span", { class: "row-sub" }, "Next " + due + (x.when ? ", " + inDays(x.when) : "")), h("span", { class: "row-sub" }, sub))];
      if (x.item.quick) {
        kids.push(Kit.confirmButton("Done", "Done today?", function () {
          var o = C.odoNow(S.data, t);
          S.hub.put("services", { date: t, odo: Math.round(o.odo), cost: 0, place: "Quick check", items: x.item.id, note: "", budget: "none", added: new Date().toISOString() });
          Kit.toast(x.item.name + " done");
        }, "btn btn-quiet"));
      }
      list.appendChild(h("div", { class: "row item", "data-item": x.item.id }, kids));
    });
    main.appendChild(section("Items", list));
  }

  /* ---------------------------------------------------------------- */
  /*  odometer, money and dates, settings                              */
  /* ---------------------------------------------------------------- */

  function viewOdo(main) {
    var t = today();
    main.appendChild(back("Car", "/"));
    main.appendChild(h("div", null, title("Odometer", "A reading now and then keeps the service dates right. Fill-ups and services count as readings too.")));
    var last = C.latest(S.data);
    var odo = numberInput("", { id: "o-odo", inputmode: "numeric", placeholder: last ? "Last " + Math.round(last.odo) : "" });
    var date = dateInput(t, { id: "o-date" });
    main.appendChild(h("div", { class: "two" }, field("Odometer", odo), field("Date", date)));
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary("Save reading", function () {
      var o = readNumber(odo);
      if (!(o > 0)) { msg.textContent = "Type the odometer reading."; return; }
      if (last && o < last.odo && date.value >= last.date) { msg.textContent = "That is less than the last reading (" + km(last.odo) + ")."; return; }
      S.hub.put("odo", { date: date.value || t, odo: Math.round(o) });
      Kit.toast("Saved " + km(o));
      go("/");
    }, "o-save")));
    var rs = C.readings(S.data).slice(-8).reverse();
    if (rs.length) {
      var l = h("div", { class: "list" });
      rs.forEach(function (r) {
        l.appendChild(kv(day(r.date) + ({ fuel: ", fill-up", services: ", service", odo: "" }[r.from] || ""), km(r.odo)));
      });
      main.appendChild(section("Recent readings", l));
    }
  }

  function viewMoney(main) {
    var t = today();
    main.appendChild(back("More", "/more"));
    main.appendChild(h("div", null, title("Financing and dates")));
    var f = C.finance(S.data, t);
    if (f) {
      var l = h("div", { class: "list", id: "finance" });
      l.appendChild(kv("Monthly", money(f.monthly)));
      l.appendChild(kv("Paid", f.paid + " of " + f.count));
      if (f.next) l.appendChild(kv("Next", day(f.next)));
      l.appendChild(kv("Last instalment", day(f.last)));
      if (f.balloon) l.appendChild(kv("Final payment, " + day(f.balloonDate), money(f.balloon)));
      l.appendChild(kv("Still to pay", money(f.remaining)));
      main.appendChild(section("Financing", h("div", null, l, f.balloon && f.balloonDays > 0
        ? h("p", { class: "note" }, "To pay the final " + whole(f.balloon) + " in cash, put aside about " + money(f.toSave) + " a month from now. Or refinance it with the bank when it comes. Six months before, this shows on the home screen.")
        : null)));
    } else {
      main.appendChild(section("Financing", h("p", { class: "empty" }, "Add the financing in Settings.")));
    }
    var ds = C.dates(S.data, t);
    var dl = h("div", { class: "list", id: "dates" });
    if (!ds.length) dl.appendChild(h("div", { class: "empty" }, "Add the dates in Settings."));
    ds.forEach(function (d) {
      dl.appendChild(h("div", { class: "row item" }, h("span", { class: "status-dot", "data-tone": d.days < 0 ? "bad" : d.soon ? "warn" : "good" }),
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, d.name), h("span", { class: "row-sub" }, day(d.date) + ", " + inDays(d.date) + (d.note ? ". " + d.note : "")))));
    });
    main.appendChild(section("Dates", dl));
  }

  function viewMore(main) {
    main.appendChild(h("div", null, title("More")));
    var items = [
      ["#/odo", "Odometer", "Add a reading"],
      ["#/plan", "Maintenance plan", "Every item, when it is next due"],
      ["#/money", "Financing and dates", "Instalments, insurance, registration, inspection"],
      ["#/settings", "Settings", "Car details, fuel price, schedule, prices"],
    ];
    var el = h("div", { class: "list" });
    items.forEach(function (i) {
      el.appendChild(h("a", { class: "row-link", href: i[0] }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, i[1]), h("span", { class: "row-sub" }, i[2])), chevron()));
    });
    main.appendChild(el);
    main.appendChild(section("This device", h("div", null, h("p", { class: "note" }, "Key: " + (Kit.who().name || "")), Kit.confirmButton(Kit.t("lockDevice"), Kit.t("tapToLock"), function () { Kit.lockDevice(S.hub); }))));
  }

  var COST_ITEMS = ["ac", "air", "bfluid", "ffilter", "plugs", "coolant"];

  function viewSettings(main) {
    main.appendChild(back("More", "/more"));
    main.appendChild(h("div", null, title("Settings")));
    var s = S.set;
    var inputs = {};
    function text(id, ph) {
      inputs[id] = h("input", { class: "field-input", type: "text", id: "set-" + id, value: s[id] || "", placeholder: ph || "" });
      return inputs[id];
    }
    function number(id, ph) {
      inputs[id] = numberInput(s[id], { id: "set-" + id, placeholder: ph === undefined ? "" : String(ph) });
      inputs[id].dataset.num = "1";
      return inputs[id];
    }
    function date(id) {
      inputs[id] = h("input", { class: "field-input", type: "date", id: "set-" + id, value: s[id] ? String(s[id]).slice(0, 10) : "" });
      return inputs[id];
    }
    main.appendChild(section("The car", h("div", null,
      field("Name", text("name", "Corolla")),
      h("div", { class: "two" }, field("Received", date("delivered")), field("Tank, litres", number("tank", C.DEFAULTS.tank))),
      h("div", { class: "two" }, field("Fuel price a litre", number("price", C.DEFAULTS.price)), field("Sticker km a litre", number("sticker", C.DEFAULTS.sticker))),
      h("p", { class: "note" }, "The fuel price fills in each fill-up; change it there for a station that charges more."))));
    var mode = select(C.MODES.map(function (m) { return { value: m.id, label: m.name }; }), setting("mode"), { id: "set-mode" });
    main.appendChild(section("Maintenance", h("div", null,
      field("Schedule", mode),
      field("A regular service (oil, filter, checks)", number("cost_base", "SAR"), "Your estimate until you log one; after that, what you last paid."),
      h("p", { class: "note" }, "Extra parts, what each adds to a service:"),
      COST_ITEMS.map(function (id) {
        var it = C.ITEMS.filter(function (i) { return i.id === id; })[0];
        return field(it.name, number("cost_" + id, "SAR"));
      }))));
    main.appendChild(section("Financing", h("div", null,
      h("div", { class: "two" }, field("Monthly", number("fin_monthly")), field("Instalments", number("fin_count"))),
      h("div", { class: "two" }, field("First payment", date("fin_first")), field("Last payment", date("fin_last"))),
      field("Final (balloon) payment", number("fin_balloon", "0 if none"), "Due with the last payment."))));
    main.appendChild(section("Dates", h("div", null, C.DATES.map(function (d) { return field(d.name, date(d.id)); }))));
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary("Save settings", function () {
      var writes = [];
      var bad = false;
      Object.keys(inputs).forEach(function (k) {
        var el = inputs[k];
        var v = el.value.trim();
        if (el.dataset.num && v !== "") {
          var n = readNumber(el);
          if (isNaN(n) || n < 0) bad = k;
          v = String(n);
        }
        if (String(s[k] === undefined ? "" : s[k]) !== v) writes.push({ table: "settings", row: { id: k, value: v } });
      });
      if (bad) { msg.textContent = "Check the numbers: each is a number of 0 or more."; return; }
      if (mode.value !== String(s.mode || "")) writes.push({ table: "settings", row: { id: "mode", value: mode.value } });
      if (inputs.fin_first.value && inputs.fin_last.value && inputs.fin_last.value < inputs.fin_first.value) { msg.textContent = "The last payment is before the first."; return; }
      S.hub.putMany(writes);
      Kit.toast(writes.length ? "Settings saved" : "Nothing changed");
      go("/");
    }, "set-save")));
  }

  function viewMissing(main) {
    main.appendChild(back("Car", "/"));
    main.appendChild(h("p", { class: "empty" }, "That is not here any more."));
  }

  /* ---------------------------------------------------------------- */
  /*  frame                                                            */
  /* ---------------------------------------------------------------- */

  var tabEls = {};
  function tabbar() {
    var bar = h("nav", { class: "tabbar", "aria-label": "Main" });
    var inner = h("div", { class: "tabbar-inner" });
    [["", "Car", "car"], ["fuel", "Fuel", "fuel"], ["fill", "", "add"], ["service", "Service", "service"], ["more", "More", "more"]].forEach(function (t) {
      var el;
      if (t[0] === "fill") el = h("a", { class: "tab-add", href: "#/fill", "aria-label": "Log a fill-up" }, icon("add"));
      else el = h("a", { class: "tab", href: "#/" + t[0] }, icon(t[2]), h("span", null, t[1]));
      tabEls[t[0]] = el;
      inner.appendChild(el);
    });
    bar.appendChild(inner);
    return bar;
  }

  function paintTabs(name) {
    var owner = { "": "", odo: "", fuel: "fuel", fill: "fuel", service: "service", plan: "service", more: "more", money: "more", settings: "more" }[name];
    Object.keys(tabEls).forEach(function (k) {
      if (k === "fill") return;
      if (k === owner) tabEls[k].setAttribute("aria-current", "page");
      else tabEls[k].removeAttribute("aria-current");
    });
  }

  var FORMS = { fill: 1, odo: 1, settings: 1, "service-form": 1 };
  var current = null;

  function parseRoute() {
    var raw = (location.hash || "#/").slice(1);
    var q = raw.indexOf("?");
    var path = q >= 0 ? raw.slice(0, q) : raw;
    var query = {};
    if (q >= 0) new URLSearchParams(raw.slice(q + 1)).forEach(function (v, k) { query[k] = v; });
    var parts = path.replace(/^\//, "").split("/").filter(String);
    var name = parts[0] || "";
    if (name === "service" && parts[1]) name = "service-form";
    return { name: name, args: parts.slice(1), query: query };
  }

  function render() {
    refresh();
    var r = parseRoute();
    current = r;
    var main = Kit.clear(S.main);
    var a = r.args;
    switch (r.name) {
      case "": viewHome(main); break;
      case "fuel": viewFuel(main); break;
      case "fill": viewFill(main, a[0], r.query); break;
      case "service": viewService(main); break;
      case "service-form": viewServiceForm(main, a[0]); break;
      case "plan": viewPlan(main); break;
      case "odo": viewOdo(main); break;
      case "money": viewMoney(main); break;
      case "more": viewMore(main); break;
      case "settings": viewSettings(main); break;
      default: viewMissing(main);
    }
    paintTabs(r.name === "service-form" ? "service" : r.name);
    window.scrollTo(0, 0);
  }

  Kit.start({
    app: "car",
    title: "Car",
    render: function (main, hub) {
      S.hub = hub;
      S.main = main;
      refresh();
      document.body.appendChild(tabbar());
      hub.on(function () {
        if (!current || !FORMS[current.name]) {
          var y = window.scrollY;
          render();
          window.scrollTo(0, y);
        }
      });
      window.addEventListener("hashchange", render);
      render();
    },
  });
})();
