/*
 * Budget v2: the screens.
 *
 * Every screen reads the same model from calc.js, so a figure is the same
 * wherever it appears. Screens are plain functions that draw into <main>;
 * the address bar holds which one is showing (#/, #/env/rent, #/payday ...).
 */
(function () {
  "use strict";

  var h = Kit.h;
  var TABLES = [
    "envelopes", "accounts", "splits", "months", "budgets", "payments",
    "moves", "reconciles", "reserves", "reserve_moves", "planned", "labels", "settings",
    "subs", "sms", "memory",
  ];
  var GROUPS = ["Living", "Bills", "Committed", "Funds"];
  var KIND_NAMES = { spending: "Spending", bill: "Bill", fund: "Fund", remaining: "Remaining" };

  var S = { hub: null, data: null, model: null, main: null, syncedOnce: false };

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
    S.model = Calc.build(d, today());
  }

  function money(n) {
    return Calc.money(n);
  }

  function env(id) {
    return S.model.index.env[id] || null;
  }

  function envName(id) {
    var e = Calc.findEnv(S.model.index, id);
    return e ? e.name : id || "No envelope";
  }

  function acctName(id) {
    var a = S.model.index.acct[id];
    return a ? a.name : id || "No account";
  }

  function monthRow(m) {
    return S.data.months.filter(function (r) {
      return r.id === m;
    })[0];
  }

  function statusOf(m) {
    var r = monthRow(m);
    return r ? r.status : "none";
  }

  function setting(k) {
    return S.model.index.settings[k];
  }

  function hasBooks() {
    return S.data.envelopes.length > 0;
  }

  function budgetsOf(m) {
    var out = {};
    S.data.budgets.forEach(function (b) {
      if (b.month === m) out[b.env] = Calc.num(b.amount);
    });
    return out;
  }

  function paymentsIn(m, filter) {
    return S.data.payments
      .filter(function (p) {
        return Calc.monthOf(Calc.dateOf(p)) === m && (!filter || filter(p));
      })
      .sort(function (a, b) {
        var da = Calc.dateOf(a);
        var db = Calc.dateOf(b);
        return da < db ? 1 : da > db ? -1 : String(b.ts || "~") < String(a.ts || "~") ? -1 : 1;
      });
  }

  function envOfPayment(p) {
    var e = Calc.findEnv(S.model.index, p.env);
    return e ? e.id : p.env;
  }

  function activeEnvs() {
    return S.model.index.envs.filter(function (e) {
      return e.active !== "no";
    });
  }

  /**
   * One-time tidy for books brought in before bills could be due "on payday":
   * a bill due on the 25th (the old payday) becomes a payday bill, so it
   * follows the new payday. Marked done in settings, so it runs once.
   */
  function upgradePaydayBills() {
    if (setting("payday_bills") === "done" || S.upgraded) return;
    S.upgraded = true;
    var items = activeEnvs()
      .filter(function (e) {
        return e.kind === "bill" && Calc.num(e.due_day) === 25 && e.on_payday !== "yes";
      })
      .map(function (e) {
        return { table: "envelopes", row: { id: e.id, on_payday: "yes", due_day: null } };
      });
    items.push({ table: "settings", row: { id: "payday_bills", value: "done" } });
    S.hub.putMany(items);
  }

  /** Bills whose due day has come post themselves, once this device has caught up. */
  function postDueBills() {
    if (!S.syncedOnce || !hasBooks()) return;
    if (setting("payday_bills") !== "done") return upgradePaydayBills();
    var posts = Calc.duePosts(S.data, today(), function (id) {
      return S.hub.raw("payments", id);
    });
    if (posts.length) {
      S.hub.putMany(
        posts.map(function (p) {
          return { table: "payments", row: p };
        })
      );
    }
  }

  /* ---------------------------------------------------------------- */
  /*  small pieces                                                     */
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

  /*
   * A labelled control. Only a single input, select or textarea goes inside a
   * <label>: on iPhone, a tap anywhere in a label also "clicks" the first
   * control in it, so a group of buttons (envelope or label chips) must sit in
   * a plain group instead, or every tap lands on the first button.
   */
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
    var a = {
      class: "field-input",
      type: "text",
      inputmode: "decimal",
      autocomplete: "off",
      value: value === null || value === undefined || value === "" ? "" : String(value),
    };
    Object.keys(attrs || {}).forEach(function (k) {
      a[k] = attrs[k];
    });
    return h("input", a);
  }

  function readNumber(input) {
    var v = String(input.value || "").replace(/,/g, "").replace(/[٠-٩]/g, function (d) {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(d));
    }).trim();
    if (v === "") return null;
    var n = Number(v);
    return isFinite(n) ? Calc.r2(n) : NaN;
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

  function envOptions(withNone, noneLabel) {
    var out = withNone ? [{ value: "", label: noneLabel || "None" }] : [];
    activeEnvs().forEach(function (e) {
      out.push({ value: e.id, label: e.name });
    });
    return out;
  }

  function acctOptions(withNone, noneLabel) {
    var out = withNone ? [{ value: "", label: noneLabel || "None" }] : [];
    S.model.index.accts.forEach(function (a) {
      if (a.active === "no") return;
      out.push({ value: a.id, label: a.name });
    });
    return out;
  }

  function amountText(n, cls) {
    return h("span", { class: "amt" + (cls ? " " + cls : "") }, money(n));
  }

  function errorLine() {
    return h("p", { class: "form-error", role: "alert" });
  }

  function primary(label, onclick) {
    return h("button", { class: "btn btn-primary btn-wide", type: "button", onclick: onclick }, label);
  }

  function chevron() {
    return h("span", { class: "chev", "aria-hidden": "true" }, "›");
  }

  var ICONS = {
    month: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    accounts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5 12 4l8 5.5M5.5 10v8M10 10v8M14 10v8M18.5 10v8M3.5 20h17"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V9M12 19V5M19 19v-7"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/></svg>',
  };

  function icon(name) {
    var span = h("span", { "aria-hidden": "true" });
    span.innerHTML = ICONS[name];
    return span.firstChild;
  }

  /* ---------------------------------------------------------------- */
  /*  Month                                                            */
  /* ---------------------------------------------------------------- */

  function paydayBanner() {
    var M = S.model.current;
    var open = S.data.months
      .filter(function (r) {
        return r.status === "open";
      })
      .map(function (r) {
        return r.id;
      })
      .sort();
    if (open.length && open[0] < M) {
      return h(
        "a",
        { class: "banner", href: "#/payday" },
        h("span", { class: "banner-title" }, "It's payday. Close " + Calc.monthLabel(open[0])),
        h("span", { class: "banner-text" }, "Check your accounts, close the month, then open " + Calc.monthLabel(M) + ".")
      );
    }
    if (statusOf(M) !== "open" && statusOf(M) !== "closed") {
      return h(
        "a",
        { class: "banner", href: "#/payday" },
        h("span", { class: "banner-title" }, "Open " + Calc.monthLabel(M)),
        h("span", { class: "banner-text" }, "Enter this month's salary and review its budget. Until then, nothing new is funded.")
      );
    }
    return null;
  }

  function envRow(e, mo, M) {
    var o = mo.env[e.id] || { left: 0, budget: 0, spent: 0, carry: 0, moved: 0, received: 0, opening: 0 };
    var sub = "";
    var bar = null;
    var avail = o.carry + o.opening + o.budget + Math.max(o.moved, 0) + o.received;
    if (e.kind === "bill") {
      var pays = paymentsIn(M, function (p) {
        return envOfPayment(p) === e.id && p.kind !== "opening";
      });
      if (pays.length) sub = "Paid " + Calc.dayLabel(Calc.dateOf(pays[0])) + (pays.length > 1 ? " and more" : "");
      else if (!o.budget) sub = "Nothing due this month";
      else if (Calc.billDate(M, e) && mo.funded) sub = (e.on_payday === "yes" ? "Due on payday, " : "Due ") + Calc.dayLabel(Calc.billDate(M, e));
      else sub = "Budget " + money(o.budget);
    } else if (e.kind === "remaining") {
      sub = "Not set aside for anything";
    } else if (e.kind === "fund") {
      var target = Calc.num(e.target);
      sub = target ? money(o.left) + " of " + money(target) : "Saved " + money(o.left);
      if (o.moved < 0) sub += ", borrowed " + money(-o.moved) + " this month";
      if (target) bar = Math.max(0, Math.min(1, o.left / target));
    } else {
      sub = "Spent " + money(o.spent) + " of " + money(avail);
      bar = avail > 0 ? Math.max(0, Math.min(1, o.spent / avail)) : o.spent > 0 ? 1 : 0;
    }
    var tone = o.left < 0 ? "bad" : e.kind === "spending" && bar > 0.85 ? "warn" : null;
    return h(
      "a",
      { class: "env", href: "#/env/" + e.id },
      h(
        "div",
        { class: "env-main" },
        h("span", { class: "env-name" }, e.name),
        h("span", { class: "env-sub" }, sub),
        bar !== null
          ? h("div", { class: "bar", "data-tone": tone, "aria-hidden": "true" }, h("span", { style: "width:" + Math.round(bar * 100) + "%" }))
          : null
      ),
      h("span", { class: "env-left" + (o.left < 0 ? " neg" : Math.abs(o.left) < 0.005 ? " zero" : "") }, money(o.left))
    );
  }

  function dailyCards(mo, M) {
    var t = today();
    return activeEnvs()
      .filter(function (e) {
        return Calc.num(e.daily_cap) > 0;
      })
      .map(function (e) {
        var spent = paymentsIn(M, function (p) {
          return envOfPayment(p) === e.id && Calc.dateOf(p) === t && p.kind !== "opening";
        }).reduce(function (s, p) {
          return s + Calc.num(p.amount);
        }, 0);
        var cap = Calc.num(e.daily_cap);
        var left = Calc.r2(cap - spent);
        return h(
          "a",
          { class: "banner", href: "#/env/" + e.id, "data-tone": left < 0 ? "bad" : null },
          h("span", { class: "banner-title" }, e.name + " today: " + money(left) + " left"),
          h("span", { class: "banner-text" }, "Spent " + money(spent) + " of your " + money(cap) + " a day. " + money((mo.env[e.id] || {}).left || 0) + " left this month.")
        );
      });
  }

  function viewMonth(main) {
    if (!hasBooks()) return viewEmpty(main);
    var M = S.model.current;
    var mo = S.model.byMonth[M];
    var r = Calc.range(M);
    var daysLeft = Calc.daysBetween(today(), r.end) + 1;

    main.appendChild(
      h(
        "div",
        { class: "month-head" },
        h("h2", { class: "month-name" }, Calc.monthLabel(M)),
        h("span", { class: "month-range" }, Calc.dayLabel(r.start) + " to " + Calc.dayLabel(r.end) + ", " + daysLeft + (daysLeft === 1 ? " day" : " days") + " to payday")
      )
    );
    var payBanner = paydayBanner();
    if (payBanner) main.appendChild(payBanner);
    var tripBanner = tripsBanner();
    if (tripBanner) main.appendChild(tripBanner);
    var smsB = smsBanner();
    if (smsB) main.appendChild(smsB);
    dailyCards(mo, M).forEach(function (c) {
      main.appendChild(c);
    });
    if (mo && mo.totals.gap !== 0) {
      main.appendChild(
        h(
          "a",
          { class: "banner", "data-tone": "bad", href: "#/accounts" },
          h("span", { class: "banner-title" }, "Books out by " + money(mo.totals.gap)),
          h("span", { class: "banner-text" }, "Accounts and envelopes no longer add up to the same total. Something has an envelope but no account. Tap to see accounts.")
        )
      );
    }
    var unknown = S.model.issues.filter(function (i) {
      return i.kind === "unknown-envelope" && i.id;
    });
    if (unknown.length) {
      main.appendChild(
        h(
          "a",
          { class: "banner", "data-tone": "warn", href: "#/add/" + unknown[0].id },
          h("span", { class: "banner-title" }, unknown.length === 1 ? "A payment has no envelope" : unknown.length + " payments have no envelope"),
          h("span", { class: "banner-text" }, "\"" + unknown[0].env + "\" is not an envelope name, so it is counted in Remaining. Tap to choose one.")
        )
      );
    }

    GROUPS.concat(["Other"]).forEach(function (g) {
      var envs = activeEnvs().filter(function (e) {
        if (e.kind === "remaining") return false;
        var eg = GROUPS.indexOf(e.group) >= 0 ? e.group : "Other";
        return eg === g;
      });
      if (g === "Funds" && S.model.index.remaining) envs.push(env(S.model.index.remaining));
      if (!envs.length) return;
      var list = h("div", { class: "list" });
      envs.forEach(function (e) {
        list.appendChild(envRow(e, mo, M));
      });
      main.appendChild(section(g, list));
    });

    if (mo) {
      main.appendChild(
        h(
          "p",
          { class: "note", style: "margin:16px 0 0" },
          mo.totals.gap === 0
            ? "Books balance: your accounts hold " + money(mo.totals.accounts) + ", exactly what your envelopes add up to."
            : "Accounts " + money(mo.totals.accounts) + ", envelopes " + money(mo.totals.envelopes) + "."
        )
      );
    }
  }

  function viewEmpty(main) {
    main.appendChild(h("div", null, title("Set up your budget", "Bring in the books from your old budget app, or start with an empty set of envelopes.")));
    main.appendChild(primary("Bring in my old books", function () { go("/import"); }));
    main.appendChild(h("p", { class: "note", style: "margin-top:16px" }, "Starting fresh instead? Add accounts and envelopes from More, then Envelopes and accounts."));
  }

  /* ---------------------------------------------------------------- */
  /*  Envelope                                                         */
  /* ---------------------------------------------------------------- */

  function viewEnv(main, id) {
    var e = env(id);
    if (!e) return viewMissing(main);
    var M = S.model.current;
    var mo = S.model.byMonth[M];
    var o = (mo && mo.env[id]) || {};
    var st = statusOf(M);
    main.appendChild(back("Month"));
    main.appendChild(h("h1", { class: "page-title" }, e.name));
    main.appendChild(h("p", { class: "page-lead" }, KIND_NAMES[e.kind] + (e.home_acct ? ", kept in " + acctName(e.home_acct) : "")));
    main.appendChild(
      h("div", { class: "hero" }, h("span", { class: "hero-value" + (o.left < 0 ? " neg" : "") }, money(o.left || 0), h("span", { class: "cur" }, "SAR")), h("span", { class: "hero-label" }, "Left in " + Calc.monthLabel(M)))
    );

    var rows = h("div", { class: "list" });
    if (o.carry || o.opening) rows.appendChild(kv("Brought forward", money((o.carry || 0) + (o.opening || 0))));
    rows.appendChild(kv(e.kind === "remaining" ? "This month (salary less budgets)" : "Budget this month", money(o.budget || 0)));
    if (o.moved) rows.appendChild(kv(o.moved > 0 ? "Moved in" : "Moved out", money(Math.abs(o.moved))));
    if (o.received) rows.appendChild(kv("Money in", money(o.received)));
    rows.appendChild(kv("Spent", money(o.spent || 0)));
    if (e.kind === "fund" && Calc.num(e.target)) rows.appendChild(kv("Target", money(e.target) + (e.target_date ? " by " + e.target_date : "")));
    if (e.kind === "bill" && e.on_payday === "yes") rows.appendChild(kv("Due", "On payday"));
    else if (e.kind === "bill" && Calc.num(e.due_day)) rows.appendChild(kv("Due day", String(e.due_day)));
    main.appendChild(section(null, rows));

    if (e.kind !== "remaining" && st === "open") {
      var inp = h("input", { class: "inline-input", inputmode: "decimal", value: String(Calc.num(budgetsOf(M)[id])) , "aria-label": "Budget for " + Calc.monthLabel(M)});
      var msg = errorLine();
      main.appendChild(
        section(
          "Budget for " + Calc.monthLabel(M) + " only",
          h(
            "div",
            null,
            h(
              "div",
              { class: "list" },
              h(
                "div",
                { class: "row" },
                h("div", { class: "row-main" }, h("span", { class: "row-title" }, "This month"), h("span", { class: "row-sub" }, "Standard month: " + money(e.standard))),
                inp,
                h(
                  "button",
                  {
                    class: "btn",
                    type: "button",
                    onclick: function () {
                      var n = readNumber(inp);
                      if (n === null || isNaN(n) || n < 0) {
                        msg.textContent = "Type an amount of 0 or more.";
                        return;
                      }
                      S.hub.put("budgets", { id: M + "_" + id, month: M, env: id, amount: n });
                      Kit.toast(e.name + " is " + money(n) + " for " + Calc.monthLabel(M));
                      render();
                    },
                  },
                  "Save"
                )
              )
            ),
            msg,
            h("p", { class: "note" }, "To change every month from now on, edit the standard month in Plan.")
          )
        )
      );
    }

    main.appendChild(
      h(
        "div",
        { class: "btn-row", style: "margin-top:16px" },
        h("a", { class: "btn btn-primary", href: "#/add?env=" + id, style: "text-decoration:none" }, "Add payment"),
        h("a", { class: "btn", href: "#/move?from=" + id, style: "text-decoration:none" }, "Move money"),
        h("a", { class: "btn", href: "#/edit-env/" + id, style: "text-decoration:none" }, "Settings")
      )
    );

    if (e.kind === "bill" || e.kind === "spending") {
      var subs = subsOf(id);
      var sl = h("a", { class: "row-link", href: "#/subs/" + id, id: "subs-link" },
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, subs.length ? "Subscriptions (" + subs.length + ")" : "Subscriptions list"),
          h("span", { class: "row-sub" }, subs.length ? money(Calc.subsMonthly(subs).perMonth) + " a month, each posts on its own day" : "For an envelope paid in several charges through the month")),
        chevron());
      main.appendChild(h("div", { class: "list", style: "margin-top:12px" }, sl));
    }

    var pays = paymentsIn(M, function (p) {
      return envOfPayment(p) === id;
    });
    var moves = S.data.moves.filter(function (m) {
      return (m.from_env === id || m.to_env === id) && Calc.monthOf(Calc.dateOf(m)) === M;
    });
    main.appendChild(section("Payments this month", paymentList(pays, true)));
    if (moves.length) main.appendChild(section("Moves this month", moveList(moves, id)));
  }

  function paymentList(pays, hideEnv) {
    var list = h("div", { class: "list" });
    if (!pays.length) {
      list.appendChild(h("div", { class: "empty" }, "No payments yet."));
      return list;
    }
    pays.forEach(function (p) {
      var amt = Calc.num(p.amount);
      var titleText = p.kind === "opening" ? "Brought forward" : p.label || (amt < 0 ? "Money in" : "Payment");
      var bits = [Calc.dayLabel(Calc.dateOf(p))];
      if (!hideEnv && p.env) bits.push(envName(p.env));
      if (p.acct) bits.push(acctName(p.acct));
      if (p.note) bits.push(p.note);
      if (p.source === "auto") bits.push("posted on its due day");
      if (S.hub.isPending("payments", p.id)) bits.unshift("waiting to send");
      list.appendChild(
        h(
          p.kind === "opening" ? "div" : "a",
          { class: "row-link", href: p.kind === "opening" ? null : "#/add/" + p.id },
          h("div", { class: "row-main" }, h("span", { class: "row-title" }, titleText), h("span", { class: "row-sub" }, bits.join(", "))),
          amountText(Math.abs(amt), amt < 0 ? "in" : "")
        )
      );
    });
    return list;
  }

  function moveList(moves, envId) {
    var list = h("div", { class: "list" });
    moves.forEach(function (m) {
      var out = envId ? m.from_env === envId : false;
      var from = m.from_env ? envName(m.from_env) : acctName(m.from_acct);
      var to = m.to_env ? envName(m.to_env) : acctName(m.to_acct);
      list.appendChild(
        h(
          "a",
          { class: "row-link", href: "#/move/" + m.id },
          h("div", { class: "row-main" }, h("span", { class: "row-title" }, from + " to " + to), h("span", { class: "row-sub" }, Calc.dayLabel(Calc.dateOf(m)) + (m.note ? ", " + m.note : ""))),
          amountText(Calc.num(m.amount), out ? "" : "in")
        )
      );
    });
    return list;
  }

  /* ---------------------------------------------------------------- */
  /*  Add or edit a payment                                            */
  /* ---------------------------------------------------------------- */

  function usageOrder() {
    var since = Calc.ymd(new Date(Date.now() - 90 * 86400000));
    var count = {};
    S.data.payments.forEach(function (p) {
      if (Calc.dateOf(p) < since || p.kind === "opening" || p.kind === "bill") return;
      var id = envOfPayment(p);
      count[id] = (count[id] || 0) + 1;
    });
    return activeEnvs().sort(function (a, b) {
        return (count[b.id] || 0) - (count[a.id] || 0) || Calc.num(a.order) - Calc.num(b.order);
      });
  }

  function viewAdd(main, id, query) {
    var existing = id ? S.data.payments.filter(function (p) { return p.id === id; })[0] : null;
    if (id && !existing) return viewMissing(main);
    var f = {
      dir: existing && Calc.num(existing.amount) < 0 ? "in" : "out",
      env: existing ? envOfPayment(existing) : query.env || "",
      acct: existing ? existing.acct || "" : "",
      acctTouched: !!(existing && existing.acct),
      label: existing ? existing.label || "" : "",
      date: existing ? Calc.dateOf(existing) : today(),
    };
    if (f.env && !env(f.env)) f.env = "";

    main.appendChild(back("Back", existing ? "/" : query.env ? "/env/" + query.env : "/"));
    main.appendChild(h("h1", { class: "page-title" }, existing ? "Payment" : "Add payment"));

    var dirToggle = h("div", { class: "toggle", role: "group", "aria-label": "Money out or in" });
    [["out", "Spent"], ["in", "Money in"]].forEach(function (d) {
      dirToggle.appendChild(
        h("button", { type: "button", "aria-pressed": f.dir === d[0] ? "true" : "false", onclick: function () {
          f.dir = d[0];
          Array.prototype.forEach.call(dirToggle.children, function (b, i) { b.setAttribute("aria-pressed", i === (d[0] === "out" ? 0 : 1) ? "true" : "false"); });
        } }, d[1])
      );
    });
    main.appendChild(dirToggle);

    var amount = h("input", {
      class: "amount-input",
      id: "pay-amount",
      type: "text",
      inputmode: "decimal",
      autocomplete: "off",
      placeholder: "0.00",
      "aria-label": "Amount",
      value: existing ? String(Math.abs(Calc.num(existing.amount))) : "",
    });
    main.appendChild(h("div", { style: "margin:14px 0 18px" }, amount));

    var envChips = h("div", { class: "chips", role: "group", "aria-label": "Envelope" });
    var acctSel = select(acctOptions(true, "The envelope's own account"), f.acct, { id: "pay-acct" });
    var labelChips = h("div", { class: "chips", role: "group", "aria-label": "Label" });

    function paintEnvs() {
      Kit.clear(envChips);
      usageOrder().forEach(function (e) {
        envChips.appendChild(
          h("button", { type: "button", class: "chip", "aria-pressed": f.env === e.id ? "true" : "false", "data-env": e.id, onclick: function () {
            f.env = e.id;
            if (!f.acctTouched) acctSel.value = "";
            paintEnvs();
            paintLabels();
          } }, e.name)
        );
      });
    }
    function paintLabels() {
      Kit.clear(labelChips);
      S.data.labels
        .slice()
        .sort(function (a, b) { return Calc.num(a.order) - Calc.num(b.order); })
        .filter(function (l) {
          var envs = String(l.envs || "").split(",").map(function (s) { return s.trim(); }).filter(String);
          return !envs.length || !f.env || envs.indexOf(f.env) >= 0;
        })
        .forEach(function (l) {
          labelChips.appendChild(
            h("button", { type: "button", class: "chip", "aria-pressed": f.label === l.name ? "true" : "false", onclick: function () {
              f.label = f.label === l.name ? "" : l.name;
              paintLabels();
            } }, l.name)
          );
        });
    }
    paintEnvs();
    paintLabels();
    acctSel.addEventListener("change", function () {
      f.acctTouched = true;
    });

    main.appendChild(field("Envelope", envChips));
    main.appendChild(field("From account", acctSel, "Left as is, the payment comes from the envelope's own account."));
    main.appendChild(field("Label", labelChips));
    var date = h("input", { class: "field-input", type: "date", value: f.date, id: "pay-date" });
    var note = h("input", { class: "field-input", type: "text", value: existing ? existing.note || "" : "", placeholder: "Optional", id: "pay-note" });
    main.appendChild(h("div", { class: "two" }, field("Date", date), field("Note", note)));
    var msg = errorLine();
    main.appendChild(msg);

    var save = primary(existing ? "Save changes" : "Save payment", function () {
      var n = readNumber(amount);
      if (n === null || isNaN(n) || n <= 0) {
        msg.textContent = "Type the amount, more than 0.";
        amount.focus();
        return;
      }
      if (!f.env) {
        msg.textContent = "Choose an envelope.";
        return;
      }
      var d = date.value || today();
      var m = Calc.monthOf(d);
      if (statusOf(m) === "closed") {
        msg.textContent = Calc.monthLabel(m) + " is closed. Change the date, or reopen the month from History.";
        return;
      }
      var row = {
        date: d,
        env: f.env,
        acct: acctSel.value || "",
        amount: f.dir === "in" ? -n : n,
        label: f.label,
        note: note.value.trim(),
        kind: existing ? (existing.kind === "bill" || existing.kind === "adjust" || existing.kind === "income" ? existing.kind : "spend") : f.dir === "in" ? "income" : "spend",
        source: existing ? existing.source || "" : "app",
      };
      if (existing) row.id = existing.id;
      S.hub.put("payments", row);
      Kit.toast("Saved " + money(n) + (f.dir === "in" ? " into " : " from ") + envName(f.env));
      history.length > 1 ? history.back() : go("/");
    });
    main.appendChild(h("div", { class: "save-bar" }, save));

    if (existing) {
      main.appendChild(
        h("div", { class: "btn-row", style: "margin-top:12px" }, Kit.confirmButton("Delete payment", "Tap again to delete", function () {
          if (statusOf(Calc.monthOf(Calc.dateOf(existing))) === "closed") {
            msg.textContent = "That month is closed. Reopen it from History to delete this.";
            return;
          }
          S.hub.remove("payments", existing.id);
          Kit.toast("Payment deleted");
          go("/");
        }))
      );
      if (existing.kind === "bill" && existing.source === "auto") {
        main.appendChild(h("p", { class: "note" }, "This bill posted itself on its due day at the budgeted amount. If the real bill was different, change the amount: the difference settles against Remaining at the end of the month."));
      }
    } else {
      setTimeout(function () {
        amount.focus();
      }, 50);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Move money                                                       */
  /* ---------------------------------------------------------------- */

  function viewMove(main, id, query) {
    var existing = id ? S.data.moves.filter(function (m) { return m.id === id; })[0] : null;
    if (id && !existing) return viewMissing(main);
    main.appendChild(back("Back", query.from ? "/env/" + query.from : "/"));
    main.appendChild(h("div", null, title(existing ? "Move" : "Move money", "From one envelope or account to another. When the two accounts differ, make the same transfer in your bank apps.")));

    var fromEnv = select(envOptions(true, "No envelope (account only)"), existing ? existing.from_env : query.from || onlyEnvOf(query.from_acct), { id: "mv-from-env" });
    var fromAcct = select(acctOptions(true, "No account (envelope only)"), existing ? existing.from_acct : query.from ? Calc.homeOf(S.model.index, query.from) || "" : query.from_acct || "", { id: "mv-from-acct" });
    var toEnv = select(envOptions(true, "No envelope (account only)"), existing ? existing.to_env : onlyEnvOf(query.to_acct), { id: "mv-to-env" });
    var toAcct = select(acctOptions(true, "No account (envelope only)"), existing ? existing.to_acct : query.to_acct || "", { id: "mv-to-acct" });
    fromEnv.addEventListener("change", function () {
      fromAcct.value = Calc.homeOf(S.model.index, fromEnv.value) || "";
      explain();
    });
    toEnv.addEventListener("change", function () {
      toAcct.value = Calc.homeOf(S.model.index, toEnv.value) || "";
      explain();
    });
    var amount = numberInput(existing ? existing.amount : query.amount || "", { id: "mv-amount", placeholder: "0.00" });
    var date = h("input", { class: "field-input", type: "date", value: existing ? Calc.dateOf(existing) : query.date || today(), id: "mv-date" });
    var note = h("input", { class: "field-input", type: "text", value: existing ? existing.note || "" : "", placeholder: "Optional", id: "mv-note" });
    var expl = h("p", { class: "note" });
    function explain() {
      var bits = [];
      if (fromEnv.value && toEnv.value && fromEnv.value !== toEnv.value) bits.push("Money changes purpose: " + envName(fromEnv.value) + " to " + envName(toEnv.value) + ".");
      if (fromAcct.value && toAcct.value && fromAcct.value !== toAcct.value) bits.push("Transfer it in your bank apps: " + acctName(fromAcct.value) + " to " + acctName(toAcct.value) + ".");
      if (fromAcct.value && toAcct.value && fromAcct.value === toAcct.value) bits.push("Both sides are in " + acctName(fromAcct.value) + ", so no bank transfer is needed.");
      expl.textContent = bits.join(" ");
    }
    [fromAcct, toAcct].forEach(function (s) { s.addEventListener("change", explain); });
    explain();

    main.appendChild(section("From", h("div", null, field("Envelope", fromEnv), field("Account", fromAcct))));
    main.appendChild(section("To", h("div", null, field("Envelope", toEnv), field("Account", toAcct))));
    main.appendChild(h("div", { class: "two" }, field("Amount", amount), field("Date", date)));
    main.appendChild(field("Note", note));
    main.appendChild(expl);
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(
      h("div", { class: "save-bar" }, primary(existing ? "Save changes" : "Move money", function () {
        var n = readNumber(amount);
        if (n === null || isNaN(n) || n <= 0) {
          msg.textContent = "Type the amount, more than 0.";
          return;
        }
        if (!fromEnv.value && !fromAcct.value) { msg.textContent = "Choose where the money comes from."; return; }
        if (!toEnv.value && !toAcct.value) { msg.textContent = "Choose where the money goes."; return; }
        if (!!fromEnv.value !== !!toEnv.value) { msg.textContent = "Choose an envelope on both sides, or on neither (a move between accounts only)."; return; }
        if (!!fromAcct.value !== !!toAcct.value) { msg.textContent = "Choose an account on both sides, or on neither (a change of purpose only)."; return; }
        if (fromEnv.value === toEnv.value && fromAcct.value === toAcct.value) { msg.textContent = "The two sides are the same."; return; }
        var d = date.value || today();
        if (statusOf(Calc.monthOf(d)) === "closed") { msg.textContent = Calc.monthLabel(Calc.monthOf(d)) + " is closed. Change the date."; return; }
        var row = { date: d, from_env: fromEnv.value, from_acct: fromAcct.value, to_env: toEnv.value, to_acct: toAcct.value, amount: n, note: note.value.trim() };
        if (existing) row.id = existing.id;
        var saved = S.hub.put("moves", row);
        if (query.sms) S.hub.put("sms", { id: query.sms, status: "move-ok", ref: saved.id });
        Kit.toast("Moved " + money(n));
        history.length > 1 ? history.back() : go("/");
      }))
    );
    if (existing) {
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:12px" }, Kit.confirmButton("Delete move", "Tap again to delete", function () {
        S.hub.remove("moves", existing.id);
        Kit.toast("Move deleted");
        go("/");
      })));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Accounts                                                         */
  /* ---------------------------------------------------------------- */

  function latestMonth() {
    return S.model.months[S.model.months.length - 1];
  }

  function viewAccounts(main) {
    if (!hasBooks()) return viewEmpty(main);
    var M = latestMonth();
    var mo = S.model.byMonth[M];
    main.appendChild(h("div", null, title("Accounts", "Where your money sits right now, by the books. Tap one to check it against your bank.")));
    var list = h("div", { class: "list" });
    S.model.index.accts.forEach(function (a) {
      var o = mo.acct[a.id];
      if (a.active === "no" && Math.abs(o.left) < 0.005) return;
      list.appendChild(
        h("a", { class: "row-link", href: "#/acct/" + a.id },
          h("div", { class: "row-main" }, h("span", { class: "row-title" }, a.name), h("span", { class: "row-sub" }, (a.bank || "") + (a.type && a.type !== "bank" ? ", " + a.type : ""))),
          amountText(o.left, Math.abs(o.left) < 0.005 ? "muted" : ""), chevron())
      );
    });
    main.appendChild(list);
    main.appendChild(h("div", { class: "list", style: "margin-top:16px" },
      kv("All accounts", money(mo.totals.accounts)),
      kv("All envelopes", money(mo.totals.envelopes)),
      kv("Difference", mo.totals.gap === 0 ? "None, the books balance" : money(mo.totals.gap))
    ));
    var res = S.model.reserves;
    if (res.length) {
      var rl = h("div", { class: "list" });
      res.forEach(function (r) {
        rl.appendChild(h("a", { class: "row-link", href: "#/reserves" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, r.name)), amountText(r.balance), chevron()));
      });
      main.appendChild(section("Reserves, kept outside the month", rl));
    }
  }

  function viewAccount(main, id) {
    var a = S.model.index.acct[id];
    if (!a) return viewMissing(main);
    var M = latestMonth();
    var o = S.model.byMonth[M].acct[id];
    main.appendChild(back("Accounts", "/accounts"));
    main.appendChild(h("h1", { class: "page-title" }, a.name));
    main.appendChild(h("div", { class: "hero" }, h("span", { class: "hero-value" }, money(o.left), h("span", { class: "cur" }, "SAR")), h("span", { class: "hero-label" }, "By the books, " + Calc.monthLabel(M))));
    var rows = h("div", { class: "list" });
    if (o.carry || o.opening) rows.appendChild(kv("Brought forward", money(o.carry + o.opening)));
    rows.appendChild(kv("Payday", money(o.funding)));
    if (o.moved) rows.appendChild(kv(o.moved > 0 ? "Moved in" : "Moved out", money(Math.abs(o.moved))));
    if (o.received) rows.appendChild(kv("Money in", money(o.received)));
    rows.appendChild(kv("Spent", money(o.spent)));
    main.appendChild(rows);
    main.appendChild(reconcileBlock(id, M, o.left, render));
    var pays = paymentsIn(M, function (p) {
      var acct = p.acct || Calc.homeOf(S.model.index, envOfPayment(p));
      return acct === id && p.kind !== "opening";
    });
    main.appendChild(section("Payments this month", paymentList(pays, false)));
  }

  /**
   * Type what the bank shows; a difference becomes one adjustment payment in
   * the envelope you choose, dated inside the month being checked.
   */
  function reconcileBlock(acctId, M, book, onDone) {
    var bank = numberInput("", { placeholder: "What your bank app shows", "aria-label": "Bank balance for " + acctName(acctId) });
    var envSel = select(envOptions(false), S.model.index.remaining || "", { "aria-label": "Envelope for the difference" });
    var out = h("p", { class: "note" });
    var msg = errorLine();
    var fixBtn = h("button", { class: "btn", type: "button", hidden: true }, "Fix the difference");
    function check() {
      var n = readNumber(bank);
      fixBtn.hidden = true;
      if (n === null) { out.textContent = ""; return; }
      if (isNaN(n)) { out.textContent = "Type a number."; return; }
      var gap = Calc.r2(book - n);
      if (gap === 0) { out.textContent = "Matches the books exactly."; return; }
      out.textContent = gap > 0
        ? "The bank has " + money(gap) + " less than the books: something was spent and not logged."
        : "The bank has " + money(-gap) + " more than the books: money came in that was not logged.";
      fixBtn.hidden = false;
    }
    bank.addEventListener("input", check);
    fixBtn.addEventListener("click", function () {
      var n = readNumber(bank);
      var gap = Calc.r2(book - n);
      var r = Calc.range(M);
      var d = today() > r.end ? r.end : today() < r.start ? r.start : today();
      var pid = Hub.newId();
      S.hub.putMany([
        { table: "payments", row: { id: pid, date: d, env: envSel.value, acct: acctId, amount: gap, label: "Adjustment", note: "Bank showed " + money(n), kind: "adjust", source: "app" } },
        { table: "reconciles", row: { id: M + "_" + acctId, month: M, acct: acctId, bank_balance: n, book_balance: book, fix: pid } },
      ]);
      Kit.toast(acctName(acctId) + " now matches the bank");
      if (onDone) onDone();
    });
    var save = h("button", { class: "btn", type: "button", onclick: function () {
      var n = readNumber(bank);
      if (n === null || isNaN(n)) { msg.textContent = "Type the bank balance first."; return; }
      if (Calc.r2(book - n) !== 0) { msg.textContent = "There is a difference. Choose an envelope for it and press Fix the difference."; return; }
      S.hub.put("reconciles", { id: M + "_" + acctId, month: M, acct: acctId, bank_balance: n, book_balance: book, fix: "" });
      Kit.toast(acctName(acctId) + " checked");
      if (onDone) onDone();
    } }, "Matches");
    return section("Check against your bank", h("div", null,
      field("Balance in your bank app", bank),
      out,
      field("Put any difference in", envSel),
      h("div", { class: "btn-row" }, save, fixBtn),
      msg));
  }

  /* ---------------------------------------------------------------- */
  /*  Payday                                                           */
  /* ---------------------------------------------------------------- */

  function viewPayday(main, step) {
    if (!hasBooks()) return viewEmpty(main);
    var M = S.model.current;
    var open = S.data.months.filter(function (r) { return r.status === "open"; }).map(function (r) { return r.id; }).sort();
    var closing = open.length && open[0] < M ? open[0] : null;
    var opening = statusOf(M) === "open" || statusOf(M) === "closed" ? null : M;
    if (!step) step = closing ? "check" : opening ? "open" : "transfers";

    var order = ["check", "close", "open", "transfers"];
    var bar = h("div", { class: "steps", "aria-hidden": "true" });
    order.forEach(function (s, i) {
      bar.appendChild(h("span", { "data-on": i <= order.indexOf(step) ? "yes" : null }));
    });
    main.appendChild(back("Month"));
    main.appendChild(h("h1", { class: "page-title" }, "Payday"));
    main.appendChild(bar);

    if (step === "check") return paydayCheck(main, closing || open[0] || M);
    if (step === "close") return paydayClose(main, closing);
    if (step === "open") return paydayOpen(main, opening || M);
    return paydayTransfers(main, M);
  }

  function paydayCheck(main, m) {
    var mo = S.model.byMonth[latestMonth()];
    main.appendChild(h("p", { class: "page-lead" }, "Step 1 of 4: check each account against your bank app. Do this before you move the new salary around. For the account your salary lands in, type the balance without the salary."));
    var done = {};
    S.data.reconciles.forEach(function (r) { if (r.month === m) done[r.acct] = r; });
    var list = h("div", { class: "list" });
    S.model.index.accts.forEach(function (a) {
      if (a.active === "no") return;
      var o = mo.acct[a.id];
      var r = done[a.id];
      list.appendChild(h("a", { class: "row-link", href: "#/payday-acct/" + a.id + "/" + m },
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, a.name), h("span", { class: "row-sub" }, r ? "Checked: bank " + money(r.bank_balance) : "Not checked yet")),
        amountText(o.left, r ? "in" : ""), chevron()));
    });
    main.appendChild(list);
    main.appendChild(h("p", { class: "note" }, "You can skip any account. Checking is what keeps the books honest, though."));
    main.appendChild(h("div", { class: "save-bar" }, primary("Next: close " + Calc.monthLabel(m), function () { go("/payday/close"); })));
  }

  function viewPaydayAcct(main, acctId, m) {
    var a = S.model.index.acct[acctId];
    if (!a) return viewMissing(main);
    var book = S.model.byMonth[latestMonth()].acct[acctId].left;
    main.appendChild(back("Payday", "/payday/check"));
    main.appendChild(h("h1", { class: "page-title" }, a.name));
    main.appendChild(h("div", { class: "hero" }, h("span", { class: "hero-value" }, money(book), h("span", { class: "cur" }, "SAR")), h("span", { class: "hero-label" }, "By the books")));
    main.appendChild(reconcileBlock(acctId, m, book, function () { go("/payday/check"); }));
  }

  function paydayClose(main, m) {
    if (!m) {
      main.appendChild(h("p", { class: "page-lead" }, "There is no month waiting to be closed."));
      main.appendChild(primary("Next: open " + Calc.monthLabel(S.model.current), function () { go("/payday/open"); }));
      return;
    }
    var mo = S.model.byMonth[m];
    var billsLeft = 0;
    var rolling = [];
    activeEnvs().forEach(function (e) {
      var o = mo.env[e.id];
      if (!o) return;
      if (e.kind === "bill") billsLeft += o.left;
      else if (e.kind !== "remaining" && Math.abs(o.left) >= 0.005) rolling.push(e.name + " " + money(o.left));
    });
    main.appendChild(h("p", { class: "page-lead" }, "Step 2 of 4: close " + Calc.monthLabel(m) + ". Once closed, nothing new can be dated into it unless you reopen it."));
    main.appendChild(h("div", { class: "list" },
      kv("Remaining at the end", money(mo.env[S.model.index.remaining].left)),
      kv("Left in bills, going to Remaining", money(billsLeft)),
      kv("Books balance", mo.totals.gap === 0 ? "Yes" : "Out by " + money(mo.totals.gap))
    ));
    if (rolling.length) main.appendChild(h("p", { class: "note" }, "Carrying over in their envelopes: " + rolling.join(", ") + "."));
    main.appendChild(h("div", { class: "save-bar" }, primary("Close " + Calc.monthLabel(m), function () {
      /* bills that fell due in this month and were never posted go in first */
      var posts = Calc.duePosts(S.data, today(), function (id) { return S.hub.raw("payments", id); }).filter(function (p) {
        return Calc.monthOf(p.date) === m;
      });
      var items = posts.map(function (p) { return { table: "payments", row: p }; });
      items.push({ table: "months", row: { id: m, month: m, status: "closed", closed: new Date().toISOString() } });
      S.hub.putMany(items);
      Kit.toast(Calc.monthLabel(m) + " is closed");
      go("/payday/open");
    })));
  }

  function paydayOpen(main, m) {
    var plan = Calc.planFor(S.data, m);
    var already = statusOf(m) === "open" || statusOf(m) === "closed";
    main.appendChild(h("p", { class: "page-lead" }, "Step 3 of 4: open " + Calc.monthLabel(m) + ". " + (plan.fromDraft ? "These figures come from the plan you prepared for it." : "These figures come from your standard month.") + " Change anything for this month only."));
    if (already) {
      main.appendChild(h("p", { class: "note" }, Calc.monthLabel(m) + " is already open. Change its budget from Plan."));
      main.appendChild(primary("Next: transfers", function () { go("/payday/transfers"); }));
      return;
    }
    var salary = numberInput(plan.salary || "", { id: "open-salary" });
    main.appendChild(field("Salary this month", salary));
    var inputs = {};
    var remLine = h("span", null);
    function total() {
      var sum = 0;
      Object.keys(inputs).forEach(function (k) { sum += readNumber(inputs[k]) || 0; });
      var s = readNumber(salary) || 0;
      remLine.textContent = money(s - sum);
    }
    GROUPS.concat(["Other"]).forEach(function (g) {
      var envs = activeEnvs().filter(function (e) {
        return e.kind !== "remaining" && (GROUPS.indexOf(e.group) >= 0 ? e.group : "Other") === g;
      });
      if (!envs.length) return;
      var list = h("div", { class: "list" });
      envs.forEach(function (e) {
        var inp = h("input", { class: "inline-input", inputmode: "decimal", value: String(Calc.num(plan.budgets[e.id])), "aria-label": e.name, "data-env": e.id });
        inp.addEventListener("input", total);
        inputs[e.id] = inp;
        list.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, e.name), h("span", { class: "row-sub" }, KIND_NAMES[e.kind] + (Calc.num(e.standard) !== Calc.num(plan.budgets[e.id]) ? ", standard " + money(e.standard) : ""))), inp));
      });
      main.appendChild(section(g, list));
    });
    salary.addEventListener("input", total);
    total();
    main.appendChild(h("div", { class: "list", style: "margin-top:16px" }, h("div", { class: "kv" }, h("span", null, "Remaining after budgets"), remLine)));
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary("Open " + Calc.monthLabel(m), function () {
      var s = readNumber(salary);
      if (s === null || isNaN(s) || s <= 0) { msg.textContent = "Type this month's salary."; salary.focus(); return; }
      var items = [];
      var bad = false;
      Object.keys(inputs).forEach(function (k) {
        var n = readNumber(inputs[k]);
        if (n === null) n = 0;
        if (isNaN(n) || n < 0) bad = true;
        items.push({ table: "budgets", row: { id: m + "_" + k, month: m, env: k, amount: n } });
      });
      if (bad) { msg.textContent = "Every budget needs to be a number of 0 or more."; return; }
      items.push({ table: "months", row: { id: m, month: m, status: "open", salary: s, opened: new Date().toISOString(), closed: "", transfers_done: "" } });
      S.hub.putMany(items);
      Kit.toast(Calc.monthLabel(m) + " is open");
      go("/payday/transfers");
    })));
  }

  function paydayTransfers(main, m) {
    var row = monthRow(m);
    if (!row || row.status === "draft" || row.status === "none") {
      main.appendChild(h("p", { class: "page-lead" }, Calc.monthLabel(m) + " is not open yet."));
      main.appendChild(primary("Open " + Calc.monthLabel(m), function () { go("/payday/open"); }));
      return;
    }
    var sheet = Calc.transferSheet(S.data, m, budgetsOf(m), row.salary);
    var done = String(row.transfers_done || "").split(",").filter(String);
    main.appendChild(h("p", { class: "page-lead" }, "Step 4 of 4: send each account its share. Your salary lands in " + acctName(sheet.salaryAcct) + ", which keeps " + money(sheet.keep) + "."));
    sheet.banks.forEach(function (b) {
      var list = h("div", { class: "list" });
      b.rows.forEach(function (r) {
        var box = h("input", { type: "checkbox", class: "tick", "aria-label": "Sent to " + r.name });
        box.checked = done.indexOf(r.acct) >= 0;
        box.addEventListener("change", function () {
          var now = String((monthRow(m) || {}).transfers_done || "").split(",").filter(String).filter(function (x) { return x !== r.acct; });
          if (box.checked) now.push(r.acct);
          S.hub.put("months", { id: m, transfers_done: now.join(",") });
        });
        list.appendChild(h("label", { class: "row" }, box, h("div", { class: "row-main" }, h("span", { class: "row-title" }, r.name)), amountText(r.amount)));
      });
      main.appendChild(section(b.bank + ", " + money(b.total), list));
    });
    main.appendChild(h("div", { class: "save-bar" }, primary("Done", function () { go("/"); })));
  }

  /* ---------------------------------------------------------------- */
  /*  Plan: standard month and months ahead                            */
  /* ---------------------------------------------------------------- */

  function viewPlan(main) {
    if (!hasBooks()) return viewEmpty(main);
    main.appendChild(h("div", null, title("Plan", "Your standard month is what a normal month looks like. Changing it only affects months you have not opened yet; a month with its own plan keeps it.")));
    var M = S.model.current;

    var months = S.data.months.filter(function (r) { return r.id >= M; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var ml = h("div", { class: "list" });
    months.forEach(function (r) {
      var b = budgetsOf(r.id);
      var sum = Object.keys(b).reduce(function (s, k) { return s + b[k]; }, 0);
      ml.appendChild(h("a", { class: "row-link", href: "#/month/" + r.id },
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, Calc.monthLabel(r.id)), h("span", { class: "row-sub" }, (r.status === "open" ? "Open now" : r.status === "draft" ? "Planned ahead" : r.status) + ", salary " + money(r.salary))),
        amountText(Calc.num(r.salary) - sum), chevron()));
    });
    var next = Calc.addMonths(months.length ? months[months.length - 1].id : M, 1);
    ml.appendChild(h("button", { class: "row-link", type: "button", style: "width:100%;border:0;background:none;font:inherit;text-align:left;cursor:pointer", onclick: function () {
      var plan = Calc.planFor(S.data, next);
      var items = Object.keys(plan.budgets).map(function (k) { return { table: "budgets", row: { id: next + "_" + k, month: next, env: k, amount: plan.budgets[k] } }; });
      items.push({ table: "months", row: { id: next, month: next, status: "draft", salary: plan.salary, opened: "", closed: "", transfers_done: "" } });
      S.hub.putMany(items);
      go("/month/" + next);
    } }, h("div", { class: "row-main" }, h("span", { class: "row-title", style: "color:var(--accent-text)" }, "Plan " + Calc.monthLabel(next) + " ahead"), h("span", { class: "row-sub" }, "Starts from the standard month"))));
    main.appendChild(section("This month and ahead", ml));
    main.appendChild(h("p", { class: "note" }, "Each figure on the right is what would be left in Remaining after budgets."));

    /* standard month */
    var inputs = {};
    var salary = numberInput(setting("standard_salary") || "", { id: "std-salary" });
    var remLine = h("span", null);
    function total() {
      var sum = 0;
      Object.keys(inputs).forEach(function (k) { sum += readNumber(inputs[k]) || 0; });
      remLine.textContent = money((readNumber(salary) || 0) - sum);
    }
    var std = h("div", null, field("Standard salary", salary));
    GROUPS.concat(["Other"]).forEach(function (g) {
      var envs = activeEnvs().filter(function (e) { return e.kind !== "remaining" && (GROUPS.indexOf(e.group) >= 0 ? e.group : "Other") === g; });
      if (!envs.length) return;
      var list = h("div", { class: "list", style: "margin-bottom:12px" });
      envs.forEach(function (e) {
        var inp = h("input", { class: "inline-input", inputmode: "decimal", value: String(Calc.num(e.standard)), "aria-label": e.name + " standard", "data-env": e.id });
        inp.addEventListener("input", total);
        inputs[e.id] = inp;
        list.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, e.name), h("span", { class: "row-sub" }, g + (e.ends_on ? ", ends " + Calc.monthLabel(e.ends_on) : ""))), inp));
      });
      std.appendChild(list);
    });
    salary.addEventListener("input", total);
    total();
    std.appendChild(h("div", { class: "list" }, h("div", { class: "kv" }, h("span", null, "Remaining in a standard month"), remLine)));
    var msg = errorLine();
    std.appendChild(msg);
    std.appendChild(h("div", { class: "save-bar" }, primary("Save standard month", function () {
      var items = [];
      var bad = false;
      Object.keys(inputs).forEach(function (k) {
        var n = readNumber(inputs[k]);
        if (n === null) n = 0;
        if (isNaN(n) || n < 0) bad = true;
        if (Calc.num(env(k).standard) !== n) items.push({ table: "envelopes", row: { id: k, standard: n } });
      });
      var s = readNumber(salary);
      if (bad || (s !== null && isNaN(s))) { msg.textContent = "Every amount needs to be a number of 0 or more."; return; }
      if (s !== null && String(s) !== String(setting("standard_salary"))) items.push({ table: "settings", row: { id: "standard_salary", value: String(s) } });
      S.hub.putMany(items);
      Kit.toast(items.length ? "Standard month saved" : "Nothing changed");
    })));
    main.appendChild(section("Standard month", std));
  }

  function viewMonthBudget(main, m) {
    var row = monthRow(m);
    if (!row) return viewMissing(main);
    var closed = row.status === "closed";
    main.appendChild(back("Plan", "/plan"));
    main.appendChild(h("div", null, title(Calc.monthLabel(m), row.status === "open" ? "Open now. Changes here apply to " + Calc.monthLabel(m) + " only." : row.status === "draft" ? "Planned ahead. When payday comes, this month opens with these figures instead of the standard month." : "Closed. Reopen it from History to change it.")));
    var b = budgetsOf(m);
    var salary = numberInput(row.salary, { id: "m-salary", disabled: closed });
    main.appendChild(field("Salary", salary));
    var inputs = {};
    var remLine = h("span", null);
    function total() {
      var sum = 0;
      Object.keys(inputs).forEach(function (k) { sum += readNumber(inputs[k]) || 0; });
      remLine.textContent = money((readNumber(salary) || 0) - sum);
    }
    GROUPS.concat(["Other"]).forEach(function (g) {
      var envs = activeEnvs().filter(function (e) { return e.kind !== "remaining" && (GROUPS.indexOf(e.group) >= 0 ? e.group : "Other") === g; });
      if (!envs.length) return;
      var list = h("div", { class: "list" });
      envs.forEach(function (e) {
        var inp = h("input", { class: "inline-input", inputmode: "decimal", value: String(Calc.num(b[e.id])), "aria-label": e.name, disabled: closed });
        inp.addEventListener("input", total);
        inputs[e.id] = inp;
        list.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, e.name), h("span", { class: "row-sub" }, "Standard " + money(e.standard))), inp));
      });
      main.appendChild(section(g, list));
    });
    salary.addEventListener("input", total);
    total();
    main.appendChild(h("div", { class: "list", style: "margin-top:16px" }, h("div", { class: "kv" }, h("span", null, "Remaining after budgets"), remLine)));
    if (closed) return;
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary("Save " + Calc.monthLabel(m), function () {
      var items = [];
      var bad = false;
      Object.keys(inputs).forEach(function (k) {
        var n = readNumber(inputs[k]);
        if (n === null) n = 0;
        if (isNaN(n) || n < 0) bad = true;
        if (Calc.num(b[k]) !== n || b[k] === undefined) items.push({ table: "budgets", row: { id: m + "_" + k, month: m, env: k, amount: n } });
      });
      var s = readNumber(salary);
      if (bad || s === null || isNaN(s)) { msg.textContent = "Every amount needs to be a number of 0 or more."; return; }
      if (s !== Calc.num(row.salary)) items.push({ table: "months", row: { id: m, salary: s } });
      S.hub.putMany(items);
      Kit.toast(Calc.monthLabel(m) + " saved");
    })));
    if (row.status === "draft") {
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:12px" },
        Kit.confirmButton("Reset to standard month", "Tap again to reset", function () {
          var items = activeEnvs().filter(function (e) { return e.kind !== "remaining"; }).map(function (e) {
            return { table: "budgets", row: { id: m + "_" + e.id, month: m, env: e.id, amount: e.ends_on && m > e.ends_on ? 0 : Calc.num(e.standard) } };
          });
          items.push({ table: "months", row: { id: m, salary: Calc.num(setting("standard_salary")) } });
          S.hub.putMany(items);
          Kit.toast(Calc.monthLabel(m) + " now matches the standard month");
        })));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  More                                                             */
  /* ---------------------------------------------------------------- */

  function viewMore(main) {
    main.appendChild(h("div", null, title("More")));
    var links = [
      ["/payday", "Payday", "Check accounts, close the month, open the next, transfers"],
      ["/move", "Move money", "Between envelopes or accounts"],
      ["/reserves", "Reserves and planned money", "Portfolio, other reserves, things you expect to pay or receive"],
      ["/history", "History", "Past months and their payments"],
      ["/trips", "Shopping trips", "From Household, to post or leave out"],
      ["/inbox", "Bank messages", "Your bank SMS, read and logged"],
      ["/setup", "Envelopes and accounts", "Names, kinds, home accounts, due days, labels"],
      ["/import", "Bring in old books", "One time, from the old budget app"],
    ];
    var list = h("div", { class: "list" });
    links.forEach(function (l) {
      list.appendChild(h("a", { class: "row-link", href: "#" + l[0] }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, l[1]), h("span", { class: "row-sub" }, l[2])), chevron()));
    });
    main.appendChild(list);

    var checks = h("div", { class: "list", hidden: true, style: "margin-top:12px" });
    var checkBtn = h("button", { class: "btn", type: "button", onclick: function () {
      checkBtn.disabled = true;
      var config = Hub.config();
      Promise.all([Hub.call(config, { action: "ping" }), Hub.call(config, { action: "health" })]).then(function (res) {
        Kit.clear(checks);
        [{ name: "Hub version", pass: true, detail: res[0].version }, { name: "This device's key", pass: true, detail: res[0].key }].concat(res[1].checks).forEach(function (c) {
          checks.appendChild(h("div", { class: "row check", "data-pass": c.pass ? "yes" : "no" }, h("span", { class: "check-mark" }, c.pass ? "✓" : "!"), h("div", { class: "row-main" }, h("span", { class: "row-title" }, c.name), c.detail ? h("span", { class: "row-sub" }, c.detail) : null)));
        });
        checks.hidden = false;
      }).catch(function (err) {
        Kit.toast(err.kind === "offline" ? "Cannot reach the hub right now." : err.message);
      }).then(function () { checkBtn.disabled = false; });
    } }, "Check the hub");
    main.appendChild(section("This device", h("div", null,
      h("div", { class: "btn-row" }, checkBtn, Kit.confirmButton("Lock this device", "Tap again to lock", function () { Kit.lockDevice(S.hub); })),
      checks,
      h("p", { class: "note" }, "Last synced " + Kit.ago(S.hub.lastSync) + ".")
    )));
  }

  /* ---------------------------------------------------------------- */
  /*  Setup: envelopes, accounts, labels                               */
  /* ---------------------------------------------------------------- */

  function viewSetup(main) {
    main.appendChild(back("More", "/more"));
    main.appendChild(h("div", null, title("Envelopes and accounts")));
    var el = h("div", { class: "list" });
    S.model.index.envs.forEach(function (e) {
      el.appendChild(h("a", { class: "row-link", href: "#/edit-env/" + e.id }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, e.name + (e.active === "no" ? " (hidden)" : "")), h("span", { class: "row-sub" }, KIND_NAMES[e.kind] + ", " + (e.group || "Other") + (e.home_acct ? ", " + acctName(e.home_acct) : ""))), chevron()));
    });
    main.appendChild(section("Envelopes", el));
    main.appendChild(h("div", { class: "btn-row", style: "margin-top:10px" }, h("a", { class: "btn", href: "#/edit-env/new", style: "text-decoration:none" }, "Add envelope")));
    var al = h("div", { class: "list" });
    S.model.index.accts.forEach(function (a) {
      al.appendChild(h("a", { class: "row-link", href: "#/edit-acct/" + a.id }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, a.name + (a.active === "no" ? " (hidden)" : "")), h("span", { class: "row-sub" }, (a.bank || "") + ", " + (a.type || "bank"))), chevron()));
    });
    main.appendChild(section("Accounts", al));
    main.appendChild(h("div", { class: "btn-row", style: "margin-top:10px" }, h("a", { class: "btn", href: "#/edit-acct/new", style: "text-decoration:none" }, "Add account")));

    /* labels */
    var ll = h("div", { class: "list" });
    S.data.labels.slice().sort(function (a, b) { return Calc.num(a.order) - Calc.num(b.order); }).forEach(function (l) {
      ll.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, l.name)), Kit.confirmButton("Remove", "Tap again", function () { S.hub.remove("labels", l.id); render(); }, "btn btn-quiet")));
    });
    var newLabel = h("input", { class: "field-input", type: "text", placeholder: "New label, like Pharmacy", "aria-label": "New label" });
    main.appendChild(section("Labels", h("div", null, ll, h("div", { class: "composer-inner", style: "margin-top:10px" }, newLabel, h("button", { class: "btn", type: "button", onclick: function () {
      var name = newLabel.value.trim();
      if (!name) return;
      S.hub.put("labels", { id: Migrate.slug(name) + "-" + Hub.newId().slice(0, 4), name: name, envs: "", order: S.data.labels.length + 1 });
      render();
    } }, "Add")))));
  }

  function viewEditEnv(main, id) {
    var isNew = id === "new";
    var e = isNew ? { kind: "spending", group: "Living", active: "yes" } : env(id);
    if (!e) return viewMissing(main);
    main.appendChild(back("Envelopes", "/setup"));
    main.appendChild(h("h1", { class: "page-title" }, isNew ? "New envelope" : e.name));
    var name = h("input", { class: "field-input", type: "text", value: e.name || "", id: "e-name" });
    var kind = e.kind === "remaining" ? null : select([{ value: "spending", label: "Spending: what is left rolls on" }, { value: "bill", label: "Bill: posts itself on its due day" }, { value: "fund", label: "Fund: saves toward a target" }], e.kind, { id: "e-kind" });
    var group = select(GROUPS.map(function (g) { return { value: g, label: g }; }), e.group, { id: "e-group" });
    var standard = numberInput(e.standard, { id: "e-standard" });
    var home = select(acctOptions(true, "No account"), e.home_acct, { id: "e-home" });
    var dueWhen = select([{ value: "payday", label: "On payday" }, { value: "day", label: "On a day of the month" }], e.on_payday === "yes" ? "payday" : "day", { id: "e-when" });
    var due = numberInput(e.due_day, { id: "e-due", inputmode: "numeric", placeholder: "1 to 31" });
    var cap = numberInput(e.daily_cap, { id: "e-cap", placeholder: "Optional" });
    var target = numberInput(e.target, { id: "e-target", placeholder: "Optional" });
    var targetDate = h("input", { class: "field-input", type: "date", value: e.target_date || "", id: "e-tdate" });
    var ends = h("input", { class: "field-input", type: "month", value: e.ends_on || "", id: "e-ends" });
    var active = select([{ value: "yes", label: "Shown" }, { value: "no", label: "Hidden" }], e.active || "yes", { id: "e-active" });
    var inHousehold = select([{ value: "", label: "No" }, { value: "yes", label: "Yes: name, balance and spending this month" }], e.household || "", { id: "e-household" });
    var nameAr = h("input", { class: "field-input", type: "text", dir: "rtl", value: e.name_ar || "", id: "e-name-ar", placeholder: "Optional" });

    main.appendChild(field("Name", name));
    if (kind) main.appendChild(field("Kind", kind));
    main.appendChild(field("Group", group));
    if (e.kind !== "remaining") main.appendChild(field("Standard month amount", standard));
    main.appendChild(field("Kept in", home, "Payday money for this envelope lands here, and payments come from here unless you choose another account."));
    var dueField = field("Day of the month", due);
    var billBits = h("div", null, field("Due", dueWhen, "A bill posts itself on this day at its budgeted amount."), h("div", { class: "two" }, dueField, field("Last month", ends)));
    function showDue() {
      dueField.style.visibility = dueWhen.value === "day" ? "visible" : "hidden";
    }
    dueWhen.addEventListener("change", showDue);
    showDue();
    var spendBits = h("div", null, field("Daily allowance", cap, "Shows how much is left today on the Month screen."));
    var fundBits = h("div", null, h("div", { class: "two" }, field("Target", target), field("By", targetDate)));
    main.appendChild(billBits);
    main.appendChild(spendBits);
    main.appendChild(fundBits);
    function show() {
      var k = kind ? kind.value : e.kind;
      billBits.hidden = k !== "bill";
      spendBits.hidden = k !== "spending";
      fundBits.hidden = k !== "fund";
    }
    if (kind) kind.addEventListener("change", show);
    show();

    /* fixed amounts that go to other accounts */
    var splits = isNew ? [] : S.data.splits.filter(function (s) { return s.env === id; });
    var splitRows = h("div", { class: "list" });
    var splitState = splits.map(function (s) { return { id: s.id, acct: s.acct, amount: s.amount, keep: true }; });
    function paintSplits() {
      Kit.clear(splitRows);
      if (!splitState.filter(function (s) { return s.keep; }).length) splitRows.appendChild(h("div", { class: "empty" }, "None. The whole amount goes to the account above."));
      splitState.forEach(function (s) {
        if (!s.keep) return;
        var a = select(acctOptions(false), s.acct, { "aria-label": "Account" });
        var amt = h("input", { class: "inline-input", inputmode: "decimal", value: String(s.amount || ""), "aria-label": "Amount" });
        a.addEventListener("change", function () { s.acct = a.value; });
        amt.addEventListener("input", function () { s.amount = readNumber(amt); });
        splitRows.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, a), amt, h("button", { class: "btn btn-quiet", type: "button", onclick: function () { s.keep = false; paintSplits(); } }, "Remove")));
      });
    }
    paintSplits();
    main.appendChild(section("Fixed amounts to other accounts", h("div", null, splitRows, h("div", { class: "btn-row", style: "margin-top:8px" }, h("button", { class: "btn", type: "button", onclick: function () {
      splitState.push({ id: "", acct: (S.model.index.accts[0] || {}).id, amount: 0, keep: true });
      paintSplits();
    } }, "Add a fixed amount")), h("p", { class: "note" }, "For example 200 a month to Rajhi 2nd, the rest to UrPay."))));
    main.appendChild(field("Visibility", active));
    main.appendChild(field("Show in Household", inHousehold, "Household shows this envelope's balance to everyone with a Household key. You still post the purchases."));
    main.appendChild(field("Arabic name for Household", nameAr));

    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary(isNew ? "Add envelope" : "Save envelope", function () {
      var nm = name.value.trim();
      if (!nm) { msg.textContent = "Give it a name."; return; }
      var clash = S.model.index.envs.filter(function (x) { return x.id !== id && String(x.name).toLowerCase() === nm.toLowerCase(); });
      if (clash.length) { msg.textContent = "Another envelope is already called that."; return; }
      var k = kind ? kind.value : e.kind;
      var std = readNumber(standard);
      var d = readNumber(due);
      var onPayday = k === "bill" && dueWhen.value === "payday";
      if (k === "bill" && !onPayday && d !== null && (isNaN(d) || d < 1 || d > 31)) { msg.textContent = "The due day is a day of the month, 1 to 31."; return; }
      var row = {
        name: nm,
        kind: k,
        group: group.value,
        home_acct: home.value,
        active: active.value,
        household: inHousehold.value,
        name_ar: nameAr.value.trim(),
        on_payday: onPayday ? "yes" : "",
        due_day: k === "bill" && !onPayday && d ? Math.round(d) : null,
        daily_cap: k === "spending" ? readNumber(cap) : null,
        target: k === "fund" ? readNumber(target) : null,
        target_date: k === "fund" ? targetDate.value : "",
        ends_on: k === "bill" ? ends.value : "",
      };
      if (k !== "remaining") row.standard = std === null || isNaN(std) ? 0 : std;
      if (isNew) {
        var nid = Migrate.slug(nm);
        while (env(nid)) nid = Migrate.slug(nm) + "-" + Hub.newId().slice(0, 3);
        row.id = nid;
        row.order = S.model.index.envs.length + 1;
      } else row.id = id;
      var items = [{ table: "envelopes", row: row }];
      splitState.forEach(function (s) {
        if (!s.keep) { if (s.id) S.hub.remove("splits", s.id); return; }
        if (!s.acct || !s.amount) return;
        items.push({ table: "splits", row: { id: s.id || row.id + "_" + s.acct, env: row.id, acct: s.acct, amount: s.amount } });
      });
      S.hub.putMany(items);
      Kit.toast(isNew ? nm + " added" : nm + " saved");
      go("/setup");
    })));
  }

  function viewEditAcct(main, id) {
    var isNew = id === "new";
    var a = isNew ? { type: "bank", active: "yes" } : S.model.index.acct[id];
    if (!a) return viewMissing(main);
    main.appendChild(back("Envelopes and accounts", "/setup"));
    main.appendChild(h("h1", { class: "page-title" }, isNew ? "New account" : a.name));
    var name = h("input", { class: "field-input", type: "text", value: a.name || "", id: "a-name" });
    var bank = h("input", { class: "field-input", type: "text", value: a.bank || "", id: "a-bank", placeholder: "Rajhi, SNB, Cash ..." });
    var type = select([{ value: "bank", label: "Bank account" }, { value: "savings", label: "Savings" }, { value: "cash", label: "Cash" }], a.type || "bank", { id: "a-type" });
    var active = select([{ value: "yes", label: "Shown" }, { value: "no", label: "Hidden" }], a.active || "yes", { id: "a-active" });
    var smsNums = h("input", { class: "field-input", type: "text", value: a.sms || "", id: "a-sms", placeholder: "Like 1234 5678", autocomplete: "off" });
    main.appendChild(field("Name", name));
    main.appendChild(field("Bank", bank, "Payday transfers are grouped by bank."));
    main.appendChild(field("Type", type));
    main.appendChild(field("Visibility", active));
    main.appendChild(field("Numbers in bank messages", smsNums, "The last 4 digits of this account and its cards, with spaces between. For a wallet whose messages carry no number, its name (barq)."));
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary(isNew ? "Add account" : "Save account", function () {
      var nm = name.value.trim();
      if (!nm) { msg.textContent = "Give it a name."; return; }
      var row = { name: nm, bank: bank.value.trim(), type: type.value, active: active.value, sms: smsNums.value.trim() };
      if (isNew) {
        var nid = Migrate.slug(nm);
        while (S.model.index.acct[nid]) nid = Migrate.slug(nm) + "-" + Hub.newId().slice(0, 3);
        row.id = nid;
        row.order = S.model.index.accts.length + 1;
      } else row.id = id;
      S.hub.put("accounts", row);
      Kit.toast(nm + " saved");
      go("/setup");
    })));
  }

  /* ---------------------------------------------------------------- */
  /*  Reserves and planned money                                       */
  /* ---------------------------------------------------------------- */

  function viewReserves(main) {
    main.appendChild(back("More", "/more"));
    main.appendChild(h("div", null, title("Reserves and planned money", "Reserves sit outside the monthly envelopes, like your portfolio. Planned money is what you expect to pay or receive.")));
    var rl = h("div", { class: "list" });
    S.model.reserves.forEach(function (r) {
      rl.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, r.name)), amountText(r.balance)));
    });
    main.appendChild(section("Reserves", rl));

    /* a move in or out of a reserve */
    var res = select(S.model.reserves.map(function (r) { return { value: r.id, label: r.name }; }), (S.model.reserves[0] || {}).id, { "aria-label": "Reserve" });
    var dir = select([{ value: "in", label: "Into the reserve" }, { value: "out", label: "Out of the reserve" }], "out", { "aria-label": "Direction" });
    var amt = numberInput("", { placeholder: "0.00", "aria-label": "Amount" });
    var acct = select(acctOptions(true, "Not through an account"), "", { "aria-label": "Account" });
    var note = h("input", { class: "field-input", type: "text", placeholder: "Note", "aria-label": "Note" });
    var msg = errorLine();
    main.appendChild(section("Record a reserve move", h("div", null,
      h("div", { class: "two" }, field("Reserve", res), field("Direction", dir)),
      h("div", { class: "two" }, field("Amount", amt), field("Account", acct)),
      field("Note", note),
      h("p", { class: "note" }, "With an account, the money also lands in (or leaves) that account and Remaining. Without one, only the reserve changes."),
      msg,
      h("div", { class: "btn-row" }, h("button", { class: "btn btn-primary", type: "button", onclick: function () {
        var n = readNumber(amt);
        if (n === null || isNaN(n) || n <= 0) { msg.textContent = "Type the amount, more than 0."; return; }
        S.hub.put("reserve_moves", { date: today(), reserve: res.value, acct: acct.value, amount: n, dir: dir.value, note: note.value.trim() });
        Kit.toast("Reserve move saved");
        render();
      } }, "Save move"))
    )));

    var moves = S.data.reserve_moves.slice().sort(function (a, b) { return Calc.dateOf(a) < Calc.dateOf(b) ? 1 : -1; }).slice(0, 15);
    if (moves.length) {
      var ml = h("div", { class: "list" });
      moves.forEach(function (m) {
        var r = S.model.reserves.filter(function (x) { return x.id === m.reserve; })[0];
        ml.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, (m.dir === "in" ? "Into " : "Out of ") + (r ? r.name : m.reserve)), h("span", { class: "row-sub" }, Calc.dayLabel(Calc.dateOf(m)) + (m.acct ? ", " + acctName(m.acct) : "") + (m.note ? ", " + m.note : ""))), amountText(Calc.num(m.amount), m.dir === "in" ? "in" : ""), Kit.confirmButton("Delete", "Sure?", function () { S.hub.remove("reserve_moves", m.id); render(); }, "btn btn-quiet")));
      });
      main.appendChild(section("Recent reserve moves", ml));
    }

    /* planned money */
    var pl = h("div", { class: "list" });
    var planned = S.data.planned.slice().sort(function (a, b) {
      var o = { planned: 0, idea: 1, done: 2 };
      return (o[a.status] - o[b.status]) || String(a.month || "~").localeCompare(String(b.month || "~"));
    });
    if (!planned.length) pl.appendChild(h("div", { class: "empty" }, "Nothing planned."));
    planned.forEach(function (p) {
      var target = String(p.target || "");
      var tname = target.indexOf("reserve:") === 0 ? (S.model.reserves.filter(function (r) { return r.id === target.slice(8); })[0] || {}).name : envName(target.slice(4));
      var sub = (p.dir === "in" ? "Coming in to " : "Going out of ") + (tname || target) + (p.month ? ", " + Calc.monthLabel(p.month) : "") + (p.status === "done" ? ", done" : p.status === "idea" ? ", an idea" : "");
      var actions = h("div", { class: "btn-row" });
      if (p.status !== "done") actions.appendChild(h("button", { class: "btn", type: "button", onclick: function () { recordPlanned(p); render(); } }, "Record"));
      else if (/^(payments|reserve_moves)\//.test(p.record || "")) actions.appendChild(Kit.confirmButton("Undo", "Tap again", function () { undoPlanned(p); render(); }, "btn btn-quiet"));
      actions.appendChild(Kit.confirmButton("Delete", "Sure?", function () { S.hub.remove("planned", p.id); render(); }, "btn btn-quiet"));
      pl.appendChild(h("div", { class: "row stack" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, p.name), h("span", { class: "row-sub" }, sub)), amountText(Calc.num(p.amount), p.dir === "in" ? "in" : ""), actions));
    });
    main.appendChild(section("Planned", pl));

    var pName = h("input", { class: "field-input", type: "text", placeholder: "What is it", "aria-label": "Name" });
    var pAmt = numberInput("", { placeholder: "0.00", "aria-label": "Amount" });
    var pDir = select([{ value: "out", label: "Money out" }, { value: "in", label: "Money in" }], "out", { "aria-label": "Direction" });
    var pMonth = h("input", { class: "field-input", type: "month", "aria-label": "Month" });
    var targets = envOptions(false).map(function (o) { return { value: "env:" + o.value, label: o.label }; }).concat(S.model.reserves.map(function (r) { return { value: "reserve:" + r.id, label: r.name + " (reserve)" }; }));
    var pTarget = select(targets, "env:" + (S.model.index.remaining || ""), { "aria-label": "Envelope or reserve" });
    var pMsg = errorLine();
    main.appendChild(section("Plan something", h("div", null,
      field("Name", pName),
      h("div", { class: "two" }, field("Amount", pAmt), field("Direction", pDir)),
      h("div", { class: "two" }, field("Month", pMonth), field("Envelope or reserve", pTarget)),
      pMsg,
      h("div", { class: "btn-row" }, h("button", { class: "btn btn-primary", type: "button", onclick: function () {
        var n = readNumber(pAmt);
        if (!pName.value.trim()) { pMsg.textContent = "Give it a name."; return; }
        if (n === null || isNaN(n) || n <= 0) { pMsg.textContent = "Type the amount, more than 0."; return; }
        S.hub.put("planned", { name: pName.value.trim(), amount: n, month: pMonth.value, dir: pDir.value, target: pTarget.value, status: pMonth.value ? "planned" : "idea", record: "" });
        Kit.toast("Planned");
        render();
      } }, "Add to plan"))
    )));
  }

  /** Recording turns a plan into the real thing: a payment, money in, or a reserve move. */
  function recordPlanned(p) {
    var target = String(p.target || "");
    var amount = Calc.num(p.amount);
    var ref;
    if (target.indexOf("reserve:") === 0) {
      var rid = Hub.newId();
      S.hub.put("reserve_moves", { id: rid, date: today(), reserve: target.slice(8), acct: "", amount: amount, dir: p.dir === "in" ? "in" : "out", note: p.name });
      ref = "reserve_moves/" + rid;
    } else {
      var envId = target.slice(4) || S.model.index.remaining;
      if (statusOf(S.model.current) === "closed") { Kit.toast("This month is closed."); return; }
      var pid = Hub.newId();
      S.hub.put("payments", { id: pid, date: today(), env: envId, acct: "", amount: p.dir === "in" ? -amount : amount, label: p.dir === "in" ? "Income" : "Planned", note: p.name, kind: p.dir === "in" ? "income" : "spend", source: "plan" });
      ref = "payments/" + pid;
    }
    S.hub.put("planned", { id: p.id, status: "done", record: ref });
    Kit.toast(p.name + " recorded");
  }

  function undoPlanned(p) {
    var parts = String(p.record || "").split("/");
    if (parts.length === 2) S.hub.remove(parts[0], parts[1]);
    S.hub.put("planned", { id: p.id, status: p.month ? "planned" : "idea", record: "" });
    Kit.toast(p.name + " undone");
  }

  /* ---------------------------------------------------------------- */
  /*  History                                                          */
  /* ---------------------------------------------------------------- */

  function viewHistory(main) {
    main.appendChild(back("More", "/more"));
    main.appendChild(h("div", null, title("History")));
    var months = {};
    S.data.months.forEach(function (r) { months[r.id] = r; });
    S.data.payments.forEach(function (p) { var m = Calc.monthOf(Calc.dateOf(p)); if (!months[m]) months[m] = { id: m, status: "none" }; });
    var list = h("div", { class: "list" });
    Object.keys(months).sort().reverse().forEach(function (m) {
      var spent = paymentsIn(m, function (p) { return p.kind !== "opening" && Calc.num(p.amount) > 0; }).reduce(function (s, p) { return s + Calc.num(p.amount); }, 0);
      var st = months[m].status;
      list.appendChild(h("a", { class: "row-link", href: "#/history/" + m }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, Calc.monthLabel(m)), h("span", { class: "row-sub" }, (st === "open" ? "Open" : st === "closed" ? "Closed" : st === "draft" ? "Planned ahead" : "Not opened") + ", spent " + money(spent))), chevron()));
    });
    main.appendChild(list);
  }

  function viewHistoryMonth(main, m) {
    var row = monthRow(m);
    main.appendChild(back("History", "/history"));
    main.appendChild(h("div", null, title(Calc.monthLabel(m), Calc.dayLabel(Calc.range(m).start) + " to " + Calc.dayLabel(Calc.range(m).end) + (row && row.salary ? ", salary " + money(row.salary) : ""))));
    var b = budgetsOf(m);
    var spent = {};
    paymentsIn(m, function (p) { return p.kind !== "opening"; }).forEach(function (p) {
      var id = envOfPayment(p);
      spent[id] = (spent[id] || 0) + Calc.num(p.amount);
    });
    var table = h("table", { class: "check-table" }, h("thead", null, h("tr", null, h("th", null, "Envelope"), h("th", null, "Budget"), h("th", null, "Spent"))));
    var body = h("tbody");
    S.model.index.envs.forEach(function (e) {
      if (!b[e.id] && !spent[e.id]) return;
      body.appendChild(h("tr", null, h("td", null, e.name), h("td", null, e.kind === "remaining" ? "" : money(b[e.id] || 0)), h("td", null, money(spent[e.id] || 0))));
    });
    table.appendChild(body);
    main.appendChild(section("Budget and spending", table));
    main.appendChild(section("Payments", paymentList(paymentsIn(m), false)));
    if (row && row.status === "closed" && m >= S.model.start) {
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:14px" }, Kit.confirmButton("Reopen " + Calc.monthLabel(m), "Tap again to reopen", function () {
        S.hub.put("months", { id: m, status: "open", closed: "" });
        Kit.toast(Calc.monthLabel(m) + " is open again");
      })));
    }
    if (m < S.model.start) main.appendChild(h("p", { class: "note" }, "This month comes from the old app. It is kept for the record; balances start in " + Calc.monthLabel(S.model.start) + "."));
  }

  /* ---------------------------------------------------------------- */
  /*  Bring in old books                                               */
  /* ---------------------------------------------------------------- */

  function viewImport(main) {
    main.appendChild(back("More", "/more"));
    main.appendChild(h("div", null, title("Bring in old books", "In the old app, open Setup, scroll to Backup and press Copy. Paste it here. Nothing is saved until you have seen the check.")));
    if (hasBooks()) {
      main.appendChild(h("p", { class: "banner", "data-tone": "warn" }, h("span", { class: "banner-title" }, "This app already has books"), h("span", { class: "banner-text" }, "Bringing books in is for an empty app. Clear this app's books first if you want to start again from the old app.")));
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:12px" }, Kit.confirmButton("Clear this app's books", "Tap again: this deletes everything here", function () {
        var items = [];
        TABLES.forEach(function (t) {
          S.hub.all(t).forEach(function (r) { items.push({ table: t, row: { id: r.id, del: new Date().toISOString() } }); });
        });
        S.hub.putMany(items);
        Kit.toast("Cleared. Paste your backup again.");
      })));
      return;
    }
    var text = h("textarea", { class: "field-input", id: "import-text", placeholder: "Paste the backup here", spellcheck: "false" });
    var file = h("input", { type: "file", accept: ".txt,.json,text/plain", "aria-label": "Or choose the downloaded backup file" });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { text.value = String(reader.result || ""); };
      reader.readAsText(f);
    });
    var out = h("div");
    var msg = errorLine();
    main.appendChild(field("Backup text", text));
    main.appendChild(field("Or the downloaded backup file", file));
    main.appendChild(msg);
    main.appendChild(primary("Check it", function () {
      msg.textContent = "";
      Kit.clear(out);
      var res;
      try {
        res = Migrate.run(text.value, today());
      } catch (err) {
        msg.textContent = err.message;
        return;
      }
      showCheck(out, res);
    }));
    main.appendChild(out);
  }

  function showCheck(out, res) {
    var h2 = h;
    var bad = res.check.filter(function (c) { return Math.abs(c.gap) >= 0.005; });
    out.appendChild(h2("div", { class: "banner", "data-tone": res.ok ? null : "bad", style: "margin-top:18px" },
      h2("span", { class: "banner-title" }, res.ok ? "Everything matches the old app" : bad.length + " balances do not match"),
      h2("span", { class: "banner-text" }, res.ok
        ? "All " + res.check.length + " envelopes, accounts and reserves for " + Calc.monthLabel(res.month) + " are the same to the halala."
        : "Do not bring these books in. Send me a screenshot of this page.")));
    var table = h2("table", { class: "check-table" }, h2("thead", null, h2("tr", null, h2("th", null, ""), h2("th", null, "Old app"), h2("th", null, "Budget v2"))));
    var body = h2("tbody");
    res.check.forEach(function (c) {
      body.appendChild(h2("tr", { "data-bad": Math.abs(c.gap) >= 0.005 ? "yes" : null }, h2("td", null, c.name), h2("td", null, money(c.old)), h2("td", null, money(c.now))));
    });
    table.appendChild(body);
    out.appendChild(section("Balances in " + Calc.monthLabel(res.month), table));
    out.appendChild(h2("p", { class: "note" }, "Coming across: " + res.counts.payments + " payments, " + res.counts.envelopes + " envelopes, " + res.counts.accounts + " accounts, " + res.counts.months + " months, " + res.counts.moves + " moves, " + res.counts.planned + " planned items."));
    if (!res.ok) return;
    out.appendChild(h2("div", { class: "save-bar" }, primary("Bring it in", function () {
      var items = [];
      Object.keys(res.tables).forEach(function (t) {
        res.tables[t].forEach(function (row) { items.push({ table: t, row: row }); });
      });
      S.hub.putMany(items);
      Kit.toast("Your books are in. Sending them to your sheet.");
      go("/");
    })));
  }

  function viewMissing(main) {
    main.appendChild(back("Month"));
    main.appendChild(h("p", { class: "empty" }, "That is not here any more. It may have been deleted on another device."));
  }

  /* ---------------------------------------------------------------- */
  /*  Household: shared envelope balances, and trips into the books     */
  /* ---------------------------------------------------------------- */

  /*
   * Envelopes with "Show in Household" are copied into the Household sheet
   * (left, spent this month, the month's dates), so a household-only key
   * sees those figures and nothing else. Written only once this device has
   * caught up with the hub, so an old copy never overwrites a newer one.
   */
  var SHARE_FIELDS = ["name", "name_ar", "order", "left", "spent", "month", "month_start", "month_end", "opened"];

  function shareEnvelopes() {
    if (!S.household || !S.syncedOnce || !S.householdSynced || !hasBooks()) return;
    var M = S.model.current;
    var mo = S.model.byMonth[M];
    if (!mo) return;
    var r = Calc.range(M);
    var now = new Date().toISOString();
    var want = {};
    S.model.index.envs.forEach(function (e, i) {
      if (e.household !== "yes" || e.active === "no") return;
      var o = mo.env[e.id] || { left: 0, spent: 0, received: 0 };
      want[e.id] = {
        id: e.id,
        name: e.name,
        name_ar: e.name_ar || "",
        order: i + 1,
        left: Calc.r2(o.left),
        spent: Calc.r2(o.spent - (o.received || 0)),
        month: M,
        month_start: r.start,
        month_end: r.end,
        opened: mo.funded ? "yes" : "no",
      };
    });
    var writes = [];
    Object.keys(want).forEach(function (id) {
      var have = S.household.get("envelopes", id);
      var same = have && SHARE_FIELDS.every(function (k) { return String(have[k]) === String(want[id][k]); });
      /* unchanged figures are re-dated once an hour, so "Updated" stays honest */
      if (same && have.updated && Date.parse(now) - Date.parse(have.updated) < 3600000) return;
      writes.push({ table: "envelopes", row: Object.assign({ updated: now }, want[id]) });
    });
    S.household.all("envelopes").forEach(function (row) {
      if (!want[row.id]) writes.push({ table: "envelopes", row: { id: row.id, del: now } });
    });
    if (writes.length) S.household.putMany(writes);
  }

  function tripsWaiting() {
    if (!S.household) return [];
    return S.household
      .all("trips")
      .filter(function (t) {
        return t.status === "done" && !t.budget;
      })
      .sort(function (a, b) {
        return String(a.date) < String(b.date) ? -1 : 1;
      });
  }

  function tripStore(t) {
    var s = t.store ? S.household.get("stores", t.store) : null;
    if (s) return s.name || s.name_ar;
    return t.kind === "paid" ? "Quick purchase" : t.store || "Shop";
  }

  function tripNote(t, items) {
    var bits = [tripStore(t)];
    if (t.note) bits.push(t.note);
    else if (items.length) bits.push(items.length + (items.length === 1 ? " item" : " items"));
    return bits.join(", ");
  }

  function tripPayment(t, env, acct, amount, date, items) {
    return {
      id: "trip-" + t.id,
      date: date,
      env: env,
      acct: acct || "",
      amount: amount,
      label: "",
      note: tripNote(t, items),
      kind: "spend",
      source: "household",
    };
  }

  /*
   * Trips entered on a phone whose key also opens Budget (yours) post
   * straight away, to the envelope chosen when the trip was saved. Anything
   * that cannot post (no envelope, a closed month) waits for review instead.
   */
  function postOwnTrips() {
    if (!S.household || !S.syncedOnce || !S.householdSynced || !hasBooks()) return;
    var now = new Date().toISOString();
    var pays = [];
    var marks = [];
    tripsWaiting().forEach(function (t) {
      if (t.auto !== "yes") return;
      var e = Calc.findEnv(S.model.index, t.env);
      var d = String(t.date || today()).slice(0, 10);
      if (!e || !(Calc.num(t.total) > 0) || statusOf(Calc.monthOf(d)) === "closed") return;
      if (S.hub.get("payments", "trip-" + t.id)) return;
      pays.push({ table: "payments", row: tripPayment(t, e.id, "", Calc.r2(Calc.num(t.total)), d, tripItems(t)) });
      marks.push({ table: "trips", row: { id: t.id, budget: "posted", budget_ref: "trip-" + t.id, posted: now } });
    });
    if (!pays.length) return;
    S.hub.putMany(pays);
    S.household.putMany(marks);
    refresh();
  }

  function tripsBanner() {
    var n = tripsWaiting().filter(function (t) { return t.auto !== "yes"; }).length;
    if (!n) return null;
    return h(
      "a",
      { class: "banner", href: "#/trips", id: "trips-banner" },
      h("span", { class: "banner-title" }, n === 1 ? "1 shopping trip to review" : n + " shopping trips to review"),
      h("span", { class: "banner-text" }, "From Household. Check the amount and envelope, then post it or leave it out.")
    );
  }

  /* items stay readable here after they are cleared from the list */
  function tripItems(t) {
    var all = S.household.tables.items || {};
    return Object.keys(all)
      .map(function (k) {
        return all[k];
      })
      .filter(function (i) {
        return i.trip === t.id;
      });
  }

  /** Payments already in the books that look like this trip: same envelope and amount, within 3 days. */
  function lookalikes(t, envId, amount) {
    var d = String(t.date || today()).slice(0, 10);
    return S.data.payments.filter(function (p) {
      if (p.id === "trip-" + t.id || envOfPayment(p) !== envId) return false;
      if (Math.abs(Calc.num(p.amount) - amount) > 0.01) return false;
      return Math.abs(Calc.daysBetween(Calc.dateOf(p), d)) <= 3;
    });
  }

  function productName(i) {
    var p = S.household.get("products", i.product);
    var name = p ? p.name || p.name_ar : i.name;
    return name + (i.size ? " " + i.size : "");
  }

  function tripCard(t) {
    var items = tripItems(t);
    var list = t.list ? S.household.get("lists", t.list) : null;
    var guess = Calc.findEnv(S.model.index, t.env || (list && (list.env || list.budget_env)) || "Groceries");
    var date = h("input", { class: "field-input", type: "date", value: String(t.date || today()).slice(0, 10), "aria-label": "Date" });
    var amount = numberInput(Calc.num(t.total) ? Calc.num(t.total).toFixed(2) : "", { "aria-label": "Amount", class: "field-input trip-amount" });
    var envSel = select(envOptions(true, "Choose an envelope"), guess ? guess.id : "", { "aria-label": "Envelope", class: "select trip-env" });
    var acctSel = select(acctOptions(true, "The envelope's own account"), "", { "aria-label": "Account" });
    var warn = h("p", { class: "note trip-dup", role: "status" });
    function checkDup() {
      var n = readNumber(amount);
      var same = n && envSel.value ? lookalikes(t, envSel.value, n) : [];
      warn.textContent = same.length
        ? "Already in Budget? " + same.map(function (p) { return money(p.amount) + " on " + Calc.dayLabel(Calc.dateOf(p)) + (p.note ? " (" + p.note + ")" : ""); }).join("; ") + ". Leave this out if it is the same purchase."
        : "";
      warn.hidden = !same.length;
    }
    amount.addEventListener("input", checkDup);
    envSel.addEventListener("change", checkDup);
    checkDup();
    var msg = errorLine();
    var who = t.by ? ", by " + t.by : "";
    var lines = items.map(function (i) {
      return h("div", { class: "kv" }, h("span", null, productName(i) + " (" + Calc.num(i.qty) + " " + (i.unit || "") + ")"), h("span", null, Calc.num(i.price) > 0 ? money(i.price) : "no price"));
    });
    var diff = Calc.r2(Calc.num(t.total) - Calc.num(t.items_total));
    return h(
      "section",
      { class: "section trip", "data-trip": t.id },
      h("h2", { class: "section-title" }, tripStore(t) + ", " + Calc.dayLabel(String(t.date).slice(0, 10)) + who),
      h(
        "div",
        { class: "card-pad" },
        t.note ? h("p", { class: "note", style: "margin-top:0" }, t.note) : null,
        items.length
          ? h("details", null, h("summary", null, items.length + (items.length === 1 ? " item" : " items") + ", priced " + money(t.items_total) + (diff ? ", receipt " + money(t.total) : "")), h("div", { style: "margin-top:6px" }, lines))
          : null,
        h("div", { class: "two" }, field("Amount", amount), field("Date", date)),
        field("Envelope", envSel),
        field("Account", acctSel),
        warn,
        msg,
        h(
          "div",
          { class: "btn-row" },
          h("button", { class: "btn btn-primary", type: "button", onclick: function () {
            var n = readNumber(amount);
            if (n === null || isNaN(n) || n <= 0) { msg.textContent = "Type the amount, more than 0."; return; }
            if (!envSel.value) { msg.textContent = "Choose an envelope."; return; }
            var d = date.value || today();
            if (statusOf(Calc.monthOf(d)) === "closed") { msg.textContent = Calc.monthLabel(Calc.monthOf(d)) + " is closed. Change the date."; return; }
            S.hub.put("payments", tripPayment(t, envSel.value, acctSel.value, n, d, items));
            S.household.put("trips", { id: t.id, env: envSel.value, budget: "posted", budget_ref: "trip-" + t.id, posted: new Date().toISOString() });
            Kit.toast("Posted " + money(n) + " from " + envName(envSel.value));
            render();
          } }, "Post to Budget"),
          Kit.confirmButton("Leave out", "Tap again to leave out", function () {
            S.household.put("trips", { id: t.id, budget: "skipped" });
            render();
          })
        )
      )
    );
  }

  function viewTrips(main) {
    main.appendChild(back("Back", "/"));
    main.appendChild(h("div", null, title("Shopping trips", "From Household. Hers wait here for review; yours post by themselves.")));
    if (!S.household) {
      main.appendChild(h("p", { class: "empty" }, "This device's key does not open Household."));
      return;
    }
    var waiting = tripsWaiting();
    if (!waiting.length) main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "Nothing to review.")));
    waiting.forEach(function (t) {
      main.appendChild(tripCard(t));
    });
    var recent = S.household
      .all("trips")
      .filter(function (t) {
        return t.budget === "posted" || t.budget === "skipped";
      })
      .sort(function (a, b) {
        return String(b.date) < String(a.date) ? -1 : 1;
      })
      .slice(0, 20);
    if (!recent.length) return;
    var list = h("div", { class: "list", id: "trips-done" });
    recent.forEach(function (t) {
      var pay = t.budget === "posted" ? S.hub.get("payments", t.budget_ref) : null;
      var sub = t.budget === "posted" ? (pay ? envName(pay.env) + ", " + money(pay.amount) + (t.auto === "yes" ? ", posted by itself" : "") : "Payment deleted in Budget") : "Left out";
      list.appendChild(
        h(
          "div",
          { class: "row", "data-trip": t.id },
          h("div", { class: "row-main" }, h("span", { class: "row-title" }, tripStore(t) + ", " + Calc.dayLabel(String(t.date).slice(0, 10)) + (t.by ? ", " + t.by : "")), h("span", { class: "row-sub" }, sub)),
          Kit.confirmButton("Undo", "Tap again", function () {
            if (pay) {
              if (statusOf(Calc.monthOf(Calc.dateOf(pay))) === "closed") { Kit.toast("That month is closed."); return; }
              S.hub.remove("payments", pay.id);
            }
            /* an undone trip waits for review, even one that posted by itself */
            S.household.put("trips", { id: t.id, budget: "", budget_ref: "", posted: "", auto: "" });
            render();
          }, "btn btn-quiet")
        )
      );
    });
    main.appendChild(section("Done", list));
  }

  /* ---------------------------------------------------------------- */
  /*  Subscriptions: a list inside an envelope                         */
  /* ---------------------------------------------------------------- */

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function subsOf(envId, all) {
    return (S.data.subs || [])
      .filter(function (s) { return s.env === envId && (all || s.active !== "no"); })
      .sort(function (a, b) { return Calc.num(a.day) - Calc.num(b.day) || String(a.name).localeCompare(String(b.name)); });
  }

  function ordinal(n) {
    n = Number(n);
    var s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th";
    return n + s;
  }

  function subWhen(s) {
    return s.every === "year" ? "Every year, " + Number(s.day) + " " + (MONTHS[Number(s.month) - 1] || "") : "Every month on the " + ordinal(s.day);
  }

  /** This month's state of one subscription: paid (and when), due on a day, or not this month. */
  function subState(s, M) {
    if (!Calc.subDate(M, s)) return { paid: null, text: "Not this month" };
    if (S.data.payments.some(function (p) { return p.id === Calc.billId(M, s.env); })) return { paid: true, text: "Paid on payday with the whole envelope this month" };
    var pid = Calc.subId(M, s.id);
    var paid = S.data.payments.filter(function (p) { return p.id === pid || (p.sub === s.id && Calc.monthOf(Calc.dateOf(p)) === M); })[0];
    if (paid) {
      var bySms = S.data.sms.some(function (m) { return m.ref === paid.id && (m.status === "updated" || m.status === "posted"); });
      return { paid: paid, text: "Paid " + Calc.dayLabel(Calc.dateOf(paid)) + (Calc.r2(Calc.num(paid.amount)) !== Calc.r2(Calc.num(s.amount)) ? ", " + money(paid.amount) : "") + (bySms ? ", confirmed by the bank" : "") };
    }
    var d = Calc.subDate(M, s);
    return { paid: null, text: d ? "Due " + Calc.dayLabel(d) : "Not this month" };
  }

  function viewSubs(main, envId) {
    var e = env(envId);
    if (!e) return viewMissing(main);
    var M = S.model.current;
    main.appendChild(back(e.name, "/env/" + envId));
    main.appendChild(h("div", null, title("Subscriptions", "In " + e.name + ". Each one posts itself on its own day, and its bank message corrects the amount.")));
    var all = subsOf(envId, true);
    var list = h("div", { class: "list", id: "subs" });
    if (!all.length) list.appendChild(h("div", { class: "empty" }, "None yet."));
    all.forEach(function (s) {
      var st = subState(s, M);
      list.appendChild(h("a", { class: "row-link", href: "#/sub/" + s.id, "data-sub": s.id },
        h("div", { class: "row-main" }, h("span", { class: "row-title" }, s.name + (s.active === "no" ? " (stopped)" : "")), h("span", { class: "row-sub" }, subWhen(s) + ". " + (s.active === "no" ? "" : st.text))),
        amountText(s.amount, s.every === "year" ? "muted" : ""), chevron()));
    });
    main.appendChild(list);
    main.appendChild(h("div", { class: "btn-row", style: "margin-top:10px" }, h("a", { class: "btn btn-primary", href: "#/sub/new?env=" + envId, style: "text-decoration:none" }, "Add a subscription")));

    var t = Calc.subsMonthly(subsOf(envId));
    if (all.length) {
      var rows = h("div", { class: "list" });
      rows.appendChild(kv("Monthly ones", money(t.monthly)));
      if (t.yearly) rows.appendChild(kv("Yearly ones, " + money(t.yearly) + " a year", money(Calc.r2(t.yearly / 12)) + " a month"));
      rows.appendChild(kv("Set aside each month", money(t.perMonth)));
      rows.appendChild(kv("Standard month now", money(e.standard)));
      main.appendChild(section("What it costs", rows));
      if (Calc.r2(Calc.num(e.standard)) !== t.perMonth) {
        main.appendChild(h("div", { class: "btn-row", style: "margin-top:8px" }, h("button", { class: "btn", type: "button", id: "subs-standard", onclick: function () {
          S.hub.put("envelopes", { id: envId, standard: t.perMonth });
          Kit.toast("Standard month for " + e.name + " is " + money(t.perMonth));
          render();
        } }, "Make " + money(t.perMonth) + " the standard month")));
      }
      if (t.yearly && e.kind === "bill") {
        main.appendChild(h("p", { class: "note" }, "This envelope is a Bill, so what is left goes to Remaining at the end of each month, and the money set aside for yearly ones would not build up. Change its kind to Spending in Settings."));
      }
    }
  }

  function viewSub(main, id, query) {
    var isNew = id === "new";
    var s = isNew ? { env: query.env || "", every: "month", active: "yes" } : (S.data.subs || []).filter(function (x) { return x.id === id; })[0];
    if (!s || !env(s.env)) return viewMissing(main);
    main.appendChild(back("Subscriptions", "/subs/" + s.env));
    main.appendChild(h("h1", { class: "page-title" }, isNew ? "New subscription" : s.name));
    var name = h("input", { class: "field-input", type: "text", id: "sub-name", value: s.name || "", placeholder: "Netflix" });
    var amount = numberInput(s.amount, { id: "sub-amount", placeholder: "0.00" });
    var day = numberInput(s.day, { id: "sub-day", inputmode: "numeric", placeholder: "1 to 31" });
    var every = select([{ value: "month", label: "Every month" }, { value: "year", label: "Every year" }], s.every || "month", { id: "sub-every" });
    var month = select(MONTHS.map(function (m, i) { return { value: String(i + 1), label: m }; }), s.month || "1", { id: "sub-month" });
    var merchant = h("input", { class: "field-input", type: "text", id: "sub-merchant", value: s.merchant || "", placeholder: "Optional, like NETFLIX", dir: "ltr" });
    var active = select([{ value: "yes", label: "Active" }, { value: "no", label: "Stopped" }], s.active || "yes", { id: "sub-active" });
    main.appendChild(field("Name", name));
    main.appendChild(h("div", { class: "two" }, field("Amount", amount), field("Day it charges", day)));
    main.appendChild(field("How often", every));
    var monthField = field("Month it renews", month);
    main.appendChild(monthField);
    function showMonth() { monthField.hidden = every.value !== "year"; }
    every.addEventListener("change", showMonth);
    showMonth();
    main.appendChild(field("Name in the bank message", merchant, "How it shows in the SMS. Leave it empty if the name is the same."));
    main.appendChild(field("Status", active));
    var msg = errorLine();
    main.appendChild(msg);
    main.appendChild(h("div", { class: "save-bar" }, primary(isNew ? "Add subscription" : "Save", function () {
      var nm = name.value.trim();
      var n = readNumber(amount);
      var d = readNumber(day);
      if (!nm) { msg.textContent = "Give it a name."; return; }
      if (n === null || isNaN(n) || n <= 0) { msg.textContent = "Type the amount, more than 0."; return; }
      if (d === null || isNaN(d) || d < 1 || d > 31) { msg.textContent = "The day is a day of the month, 1 to 31."; return; }
      var row = { env: s.env, name: nm, amount: n, day: Math.round(d), every: every.value, month: every.value === "year" ? Number(month.value) : 0, merchant: merchant.value.trim(), active: active.value };
      if (!isNew) row.id = s.id;
      S.hub.put("subs", row);
      Kit.toast(nm + (isNew ? " added" : " saved"));
      go("/subs/" + s.env);
    })));
    if (!isNew) {
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:12px" }, Kit.confirmButton("Delete", "Tap again to delete", function () {
        S.hub.remove("subs", s.id);
        go("/subs/" + s.env);
      })));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Bank messages                                                    */
  /* ---------------------------------------------------------------- */

  var BANK_NAMES = { rajhi: "Al Rajhi", snb: "SNB", alinma: "Alinma", sab: "SAB", stc: "STC Bank", urpay: "UrPay", barq: "Barq", anb: "ANB" };

  /** The single envelope an account holds, if it holds only one. */
  function onlyEnvOf(acctId) {
    if (!acctId) return "";
    var held = activeEnvs().filter(function (e) { return e.home_acct === acctId && e.kind !== "remaining"; });
    return held.length === 1 ? held[0].id : "";
  }

  function smsIgnore() {
    return String(setting("sms_ignore") || "").split(/[\s,]+/).filter(String);
  }

  function smsMemory() {
    var m = {};
    (S.data.memory || []).forEach(function (r) { if (r.key) m[r.key] = r.env; });
    return m;
  }

  function arrivedDay(ts) {
    return ts ? Calc.ymd(new Date(ts)) : today();
  }

  /*
   * Reads new messages and acts on them: logs, matches, corrects bills and
   * subscriptions, or leaves them for you. Runs once this device has caught
   * up, like bills posting themselves.
   */
  function processSms() {
    if (!S.syncedOnce || !hasBooks() || S.processing) return;
    var todo = S.data.sms.filter(function (r) { return r.ts && r.text && (!r.status || r.status === "waiting"); })
      .sort(function (a, b) { return String(a.ts) < String(b.ts) ? -1 : 1; });
    if (!todo.length) return;
    S.processing = true;
    try {
      var linked = {};
      S.data.sms.forEach(function (r) { if (r.ref) linked[r.ref] = 1; });
      var others = S.data.sms.filter(function (r) { return r.status && r.status !== "waiting"; }).map(function (r) { return { date: r.date, status: r.status, amount: Calc.num(r.amount) }; });
      var trips = S.household ? S.household.all("trips") : [];
      var ctx = {
        accounts: S.model.index.accts,
        envs: activeEnvs(),
        ignore: smsIgnore(),
        memory: smsMemory(),
        subs: S.data.subs || [],
        payments: S.data.payments,
        trips: trips,
        others: others,
        linked: linked,
        now: new Date().toISOString(),
        closed: function (m) { return statusOf(m) === "closed"; },
      };
      var pays = [];
      var smsRows = [];
      var tripMarks = [];
      var seen = S.data.sms.filter(function (o) { return o.status && o.status !== "waiting" && o.status !== "duplicate"; });
      todo.forEach(function (r) {
        var text = Sms.clean(r.text);
        /* the same message twice (two automations both caught it) is read once */
        var twin = seen.filter(function (o) {
          return o.id !== r.id && Sms.clean(o.text) === text && Math.abs(Date.parse(o.ts) - Date.parse(r.ts)) < 30 * 60000;
        })[0];
        if (twin) {
          smsRows.push({ id: r.id, status: "duplicate", ref: twin.id, bank: twin.bank || "", amount: Calc.num(twin.amount), date: twin.date || "", merchant: twin.merchant || "" });
          return;
        }
        var p = Sms.read(r.text, r.sender, arrivedDay(r.ts));
        var d = Sms.decide(r, p, ctx);
        var row = { id: r.id, kind: p.type, bank: p.bank, amount: p.amount || 0, date: p.date || "", merchant: p.merchant || p.biller || "", status: d.status };
        switch (d.status) {
          case "post":
            pays.push(d.payment);
            linked[d.payment.id] = 1;
            Object.assign(row, { status: "posted", ref: d.payment.id, env: d.payment.env, acct: d.payment.acct, flag: d.flag || "", sub: d.sub || "" });
            break;
          case "match":
            Object.assign(row, { status: "matched", ref: d.ref });
            linked[d.ref] = 1;
            if (d.postTrip) {
              var tr = trips.filter(function (x) { return x.id === d.postTrip.trip; })[0];
              pays.push(tripPayment(tr, d.postTrip.env, d.postTrip.acct, p.amount, String(tr.date || p.date).slice(0, 10), tripItems(tr)));
              tripMarks.push({ table: "trips", row: { id: tr.id, env: d.postTrip.env, budget: "posted", budget_ref: "trip-" + tr.id, posted: new Date().toISOString() } });
              row.trip = tr.id;
            }
            break;
          case "update":
            pays.push({ id: d.ref, amount: d.amount });
            Object.assign(row, { status: "updated", ref: d.ref, was: d.was, env: d.env || "", flag: d.flag || "", sub: d.sub || "" });
            linked[d.ref] = 1;
            break;
          case "move":
            Object.assign(row, { status: d.payday ? "move-ok" : "move", from_acct: d.from || "", to_acct: d.to || "" });
            break;
          case "ignored":
            row.why = d.why || "";
            break;
          case "review":
            Object.assign(row, { reason: d.reason, number: d.number || "", key: d.key || "", what: d.what || p.merchant || p.biller || "", acct: d.acct || "" });
            break;
        }
        seen.push(r);
        if (d.status === "waiting" && r.status === "waiting") return;
        others.push({ date: row.date, status: row.status, amount: row.amount });
        smsRows.push(row);
      });
      var writes = pays.map(function (x) { return { table: "payments", row: x }; }).concat(smsRows.map(function (x) { return { table: "sms", row: x }; }));
      if (writes.length) S.hub.putMany(writes);
      if (tripMarks.length && S.household) S.household.putMany(tripMarks);
    } finally {
      S.processing = false;
    }
  }

  /** Messages that need a look: something to choose, a move to log, or text that could not be read. */
  function smsWaiting() {
    return S.data.sms.filter(function (r) { return r.status === "review" || r.status === "unread" || r.status === "move"; });
  }

  function smsBanner() {
    var n = smsWaiting().length;
    if (!n) return null;
    return h("a", { class: "banner", href: "#/inbox", id: "sms-banner", "data-tone": "warn" },
      h("span", { class: "banner-title" }, n === 1 ? "1 bank message needs you" : n + " bank messages need you"),
      h("span", { class: "banner-text" }, "Choose an envelope, link a card, or log a move."));
  }

  function smsHead(r) {
    return [BANK_NAMES[r.bank] || r.bank || "Bank", r.date ? Calc.dayLabel(r.date) : "", r.merchant].filter(String).join(", ");
  }

  function rawText(r) {
    return h("details", { class: "sms-raw" }, h("summary", null, "Message"), h("pre", null, Sms.clean(r.text)));
  }

  /* after you link a number or teach a merchant, the messages waiting on it are read again */
  function rereadWhere(test) {
    var rows = S.data.sms.filter(function (r) { return r.status === "review" && test(r); }).map(function (r) { return { table: "sms", row: { id: r.id, status: "" } }; });
    if (rows.length) S.hub.putMany(rows);
  }

  function smsCard(r) {
    var box = h("div", { class: "card-pad sms", "data-sms": r.id });
    var msg = errorLine();
    var head = h("div", { class: "sms-head" }, h("span", { class: "row-title" }, smsHead(r)), Calc.num(r.amount) ? h("span", { class: "amt" + (r.reason === "money-in" ? " in" : "") }, money(r.amount)) : null);
    box.appendChild(head);

    if (r.status === "unread") {
      box.appendChild(h("p", { class: "note" }, "This message could not be read."));
      box.appendChild(rawText(r));
      box.appendChild(h("div", { class: "btn-row" },
        h("a", { class: "btn", href: "#/add", style: "text-decoration:none" }, "Add payment"),
        h("button", { class: "btn btn-quiet", type: "button", onclick: function () { S.hub.put("sms", { id: r.id, status: "ignored", why: "dismissed" }); render(); } }, "Dismiss")));
      return box;
    }

    if (r.status === "move") {
      box.appendChild(h("p", { class: "note" }, "Between your accounts: " + (r.from_acct ? acctName(r.from_acct) : "another account") + " to " + (r.to_acct ? acctName(r.to_acct) : "another account") + ". If it changed what the money is for, log it as a move."));
      box.appendChild(rawText(r));
      var q = "?amount=" + Calc.num(r.amount) + "&date=" + r.date + "&sms=" + r.id + (r.from_acct ? "&from_acct=" + r.from_acct : "") + (r.to_acct ? "&to_acct=" + r.to_acct : "");
      box.appendChild(h("div", { class: "btn-row" },
        h("a", { class: "btn btn-primary", href: "#/move" + q, style: "text-decoration:none" }, "Log as a move"),
        h("button", { class: "btn", type: "button", onclick: function () { S.hub.put("sms", { id: r.id, status: "move-ok" }); render(); } }, "Nothing to log")));
      return box;
    }

    if (r.reason === "link" || r.reason === "link-bank") {
      var label = r.reason === "link" ? "Which account is " + (BANK_NAMES[r.bank] || "") + " " + r.number + "?" : "Which account sends these " + (BANK_NAMES[r.bank] || r.bank) + " messages?";
      var opts = acctOptions(true, "Choose").concat([{ value: "*ignore", label: "Not in the books (ignore it)" }]);
      var sel = select(opts, "", { "aria-label": label, class: "select sms-link" });
      box.appendChild(h("p", { class: "note" }, label));
      box.appendChild(sel);
      box.appendChild(rawText(r));
      box.appendChild(msg);
      box.appendChild(h("div", { class: "btn-row" }, h("button", { class: "btn btn-primary", type: "button", onclick: function () {
        if (!sel.value) { msg.textContent = "Choose an account."; return; }
        var token = r.reason === "link" ? r.number : r.bank;
        if (sel.value === "*ignore") {
          S.hub.put("settings", { id: "sms_ignore", value: smsIgnore().concat([token]).join(" ") });
        } else {
          var a = S.model.index.acct[sel.value];
          var list = String(a.sms || "").split(/\s+/).filter(String);
          if (list.indexOf(token) < 0) list.push(token);
          S.hub.put("accounts", { id: a.id, sms: list.join(" ") });
        }
        rereadWhere(function (x) { return x.reason === r.reason && (x.number === r.number && x.bank === r.bank); });
        render();
      } }, "Save")));
      return box;
    }

    if (r.reason === "closed") {
      box.appendChild(h("p", { class: "note" }, Calc.monthLabel(Calc.monthOf(r.date)) + " is closed, so this was not logged."));
      box.appendChild(rawText(r));
      box.appendChild(h("div", { class: "btn-row" }, h("button", { class: "btn", type: "button", onclick: function () { S.hub.put("sms", { id: r.id, status: "ignored", why: "closed" }); render(); } }, "Dismiss")));
      return box;
    }

    /* spend or money in: choose the envelope, and remember the merchant */
    var held = activeEnvs().filter(function (e) { return e.home_acct === r.acct && e.kind !== "remaining"; });
    var envSel = select(envOptions(true, "Choose an envelope"), held.length === 1 ? held[0].id : "", { "aria-label": "Envelope", class: "select sms-env" });
    var remember = h("input", { type: "checkbox", checked: !!r.key, class: "sms-remember" });
    box.appendChild(h("p", { class: "note" }, (r.reason === "money-in" ? "Money in" : "Paid") + (r.acct ? " from " + acctName(r.acct) : "") + (held.length > 1 ? ". " + acctName(r.acct) + " holds " + held.map(function (e) { return e.name; }).join(", ") + "." : ".")));
    box.appendChild(field("Envelope", envSel));
    if (r.key) box.appendChild(h("label", { class: "check-line" }, remember, h("span", null, "Next time, put \"" + (r.what || r.merchant) + "\" here by itself")));
    box.appendChild(rawText(r));
    box.appendChild(msg);
    box.appendChild(h("div", { class: "btn-row" },
      h("button", { class: "btn btn-primary", type: "button", onclick: function () {
        if (!envSel.value) { msg.textContent = "Choose an envelope."; return; }
        var amt = Calc.num(r.amount);
        var pay = { id: "sms-" + r.id, date: r.date, env: envSel.value, acct: r.acct || "", amount: r.reason === "money-in" ? -amt : amt, label: "", note: r.what || r.merchant || "", kind: r.reason === "money-in" ? "income" : "spend", source: "sms" };
        var w = [{ table: "payments", row: pay }, { table: "sms", row: { id: r.id, status: "posted", ref: pay.id, env: envSel.value } }];
        if (r.key && remember.checked) w.push({ table: "memory", row: { id: Sms.memoryId(r.key), key: r.key, env: envSel.value } });
        S.hub.putMany(w);
        if (r.key && remember.checked) rereadWhere(function (x) { return x.key === r.key && x.id !== r.id; });
        Kit.toast("Logged " + money(amt) + " in " + envName(envSel.value));
        render();
      } }, "Log it"),
      h("button", { class: "btn btn-quiet", type: "button", onclick: function () { S.hub.put("sms", { id: r.id, status: "ignored", why: "dismissed" }); render(); } }, "Ignore")));
    return box;
  }

  function smsDoneLine(r) {
    var what;
    var undo = null;
    var extra = null;
    if (r.status === "posted") {
      what = "Logged in " + envName(r.env);
      undo = function () {
        S.hub.remove("payments", r.ref);
        S.hub.put("sms", { id: r.id, status: "review", reason: Calc.num(r.amount) && /refund|transfer_in|topup/.test(r.kind) ? "money-in" : "spend", key: r.key || (r.acct && r.merchant ? Sms.memoryKey("merchant", r.acct, r.merchant) : ""), what: r.merchant });
        render();
      };
    } else if (r.status === "matched") what = r.trip ? "Matched her Household trip, now in Budget" : "Already in your books";
    else if (r.status === "updated") what = (r.sub ? "Subscription" : "Bill") + (Calc.r2(Calc.num(r.was)) === Calc.r2(Calc.num(r.amount)) ? " confirmed by the bank" : " corrected: " + money(r.amount) + " (it had posted at " + money(r.was) + ")");
    else if (r.status === "move-ok") what = "Between your accounts";
    else if (r.status === "duplicate") what = "Same message twice";
    else if (r.status === "waiting") {
      what = "Waiting up to 12 hours for her Household trip";
      extra = h("button", { class: "btn btn-quiet", type: "button", onclick: function () { S.hub.put("sms", { id: r.id, status: "", force: "yes" }); } }, "Log now");
    } else what = { salary: "Salary: payday takes care of it", untracked: "Card outside the books", notice: "Notice, nothing to log", dismissed: "Dismissed", closed: "Month closed" }[r.why] || "Ignored";
    if (r.flag === "price" && r.sub) {
      var sub = (S.data.subs || []).filter(function (s) { return s.id === r.sub; })[0];
      if (sub && Calc.r2(Calc.num(sub.amount)) !== Calc.r2(Calc.num(r.amount))) {
        what += ". The list says " + money(sub.amount);
        extra = h("button", { class: "btn btn-quiet", type: "button", onclick: function () { S.hub.put("subs", { id: sub.id, amount: Calc.num(r.amount) }); Kit.toast(sub.name + " is now " + money(r.amount)); render(); } }, "Update the list");
      }
    }
    return h("div", { class: "row", "data-sms": r.id },
      h("div", { class: "row-main" }, h("span", { class: "row-title" }, smsHead(r)), h("span", { class: "row-sub" }, what)),
      amountText(r.amount, "muted"),
      extra,
      undo ? Kit.confirmButton("Undo", "Tap again", undo, "btn btn-quiet") : null);
  }

  function viewInbox(main) {
    main.appendChild(back("Back", "/"));
    main.appendChild(h("div", null, title("Bank messages", "Your bank SMS, read and logged. What could not be decided waits here.")));
    var waiting = smsWaiting().sort(function (a, b) { return String(a.ts) < String(b.ts) ? -1 : 1; });
    if (!waiting.length) main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "Nothing needs you.")));
    waiting.forEach(function (r) { main.appendChild(section(null, smsCard(r))); });
    var done = S.data.sms.filter(function (r) { return r.status && r.status !== "review" && r.status !== "unread" && r.status !== "move"; })
      .sort(function (a, b) { return String(b.ts) < String(a.ts) ? -1 : 1; })
      .slice(0, 50);
    if (done.length) main.appendChild(section("Recent", h("div", { class: "list", id: "sms-done" }, done.map(smsDoneLine))));
    var ign = h("input", { class: "field-input", type: "text", id: "sms-ignore", value: smsIgnore().join(" "), placeholder: "Like 9876" });
    main.appendChild(section("Cards outside the books", h("div", null, field("Numbers to ignore", ign, "Messages for these cards or accounts are never logged."),
      h("button", { class: "btn", type: "button", onclick: function () { S.hub.put("settings", { id: "sms_ignore", value: ign.value.trim() }); Kit.toast("Saved"); } }, "Save"))));
  }

  /* ---------------------------------------------------------------- */
  /*  routing                                                          */
  /* ---------------------------------------------------------------- */

  /* screens with inputs are not redrawn when a sync lands, so typing is never lost */
  var FORMS = { add: 1, move: 1, payday: 1, "payday-acct": 1, plan: 1, month: 1, "edit-env": 1, "edit-acct": 1, reserves: 1, import: 1, env: 1, acct: 1, setup: 1, trips: 1, inbox: 1, sub: 1 };

  function parseRoute() {
    var raw = (location.hash || "#/").slice(1);
    var q = {};
    var qs = raw.indexOf("?");
    if (qs >= 0) {
      raw.slice(qs + 1).split("&").forEach(function (kvp) {
        var p = kvp.split("=");
        q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });
      raw = raw.slice(0, qs);
    }
    var parts = raw.split("/").filter(String);
    return { name: parts[0] || "", args: parts.slice(1), query: q };
  }

  var current = null;
  function render() {
    var r = parseRoute();
    current = r;
    var main = S.main;
    Kit.clear(main);
    var a = r.args;
    switch (r.name) {
      case "": viewMonth(main); break;
      case "env": viewEnv(main, a[0]); break;
      case "add": viewAdd(main, a[0], r.query); break;
      case "move": viewMove(main, a[0], r.query); break;
      case "accounts": viewAccounts(main); break;
      case "acct": viewAccount(main, a[0]); break;
      case "payday": viewPayday(main, a[0]); break;
      case "payday-acct": viewPaydayAcct(main, a[0], a[1]); break;
      case "plan": viewPlan(main); break;
      case "month": viewMonthBudget(main, a[0]); break;
      case "more": viewMore(main); break;
      case "setup": viewSetup(main); break;
      case "edit-env": viewEditEnv(main, a[0]); break;
      case "edit-acct": viewEditAcct(main, a[0]); break;
      case "reserves": viewReserves(main); break;
      case "history": a[0] ? viewHistoryMonth(main, a[0]) : viewHistory(main); break;
      case "import": viewImport(main); break;
      case "trips": viewTrips(main); break;
      case "inbox": viewInbox(main); break;
      case "subs": viewSubs(main, a[0]); break;
      case "sub": viewSub(main, a[0], r.query); break;
      default: viewMissing(main);
    }
    paintTabs(r.name);
    window.scrollTo(0, 0);
  }

  var tabEls = {};
  function tabbar() {
    var bar = h("nav", { class: "tabbar", "aria-label": "Main" });
    var inner = h("div", { class: "tabbar-inner" });
    [["", "Month", "month"], ["accounts", "Accounts", "accounts"], ["add", "Add", "add"], ["plan", "Plan", "plan"], ["more", "More", "more"]].forEach(function (t) {
      var el;
      if (t[0] === "add") el = h("a", { class: "tab-add", href: "#/add", "aria-label": "Add payment" }, icon("add"));
      else el = h("a", { class: "tab", href: "#/" + t[0] }, icon(t[2]), h("span", null, t[1]));
      tabEls[t[0]] = el;
      inner.appendChild(el);
    });
    bar.appendChild(inner);
    return bar;
  }

  function paintTabs(name) {
    var owner = { "": "", env: "", accounts: "accounts", acct: "accounts", plan: "plan", month: "plan", more: "more", setup: "more", "edit-env": "more", "edit-acct": "more", reserves: "more", history: "more", import: "more", payday: "", "payday-acct": "", trips: "", inbox: "", subs: "", sub: "" }[name];
    Object.keys(tabEls).forEach(function (k) {
      if (k === "add") return;
      if (k === owner) tabEls[k].setAttribute("aria-current", "page");
      else tabEls[k].removeAttribute("aria-current");
    });
  }

  Kit.start({
    app: "budget",
    title: "Budget",
    render: function (main, hub) {
      S.hub = hub;
      S.main = main;
      refresh();
      document.body.appendChild(tabbar());
      var lastState = hub.state;
      hub.on(function () {
        /* bills only post once this device has caught up with the others */
        if (lastState === "syncing" && hub.state === "idle") S.syncedOnce = true;
        lastState = hub.state;
        refresh();
        postDueBills();
        postOwnTrips();
        processSms();
        shareEnvelopes();
        if (!current || !FORMS[current.name]) render();
      });
      startHousehold();
      window.addEventListener("hashchange", render);
      render();
    },
    onWho: function () {
      startHousehold();
      if (!current || !FORMS[current.name]) render();
    },
  });

  /* Household's trips wait here for review, on keys that open both apps */
  function startHousehold() {
    if (S.household || !Kit.canUse("household")) return;
    S.household = new Hub("household");
    var last = S.household.state;
    S.household.on(function () {
      if (last === "syncing" && S.household.state === "idle") S.householdSynced = true;
      last = S.household.state;
      postOwnTrips();
      processSms();
      shareEnvelopes();
      if (!current || !FORMS[current.name]) render();
    });
    S.household.start();
  }
})();
