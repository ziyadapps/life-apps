/*
 * Today: one screen for what needs you now, across every app.
 *
 * It keeps its own copy of the Budget and Household data (read only, apart
 * from ticking list items) and works it out with the same calc.js Budget
 * uses, so the figures always agree with the Budget app.
 */
(function () {
  "use strict";

  var h = Kit.h;
  var BUDGET_TABLES = ["envelopes", "accounts", "splits", "months", "budgets", "payments", "moves", "reserves", "reserve_moves", "planned", "settings"];
  var S = { budget: null, household: null, main: null };

  function today() {
    return Calc.ymd(new Date());
  }

  function addDays(date, n) {
    var d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + n);
    return Calc.ymd(d);
  }

  function weekday(date) {
    return new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" });
  }

  function money(n) {
    return Calc.money(n);
  }

  function budgetData() {
    var d = {};
    BUDGET_TABLES.forEach(function (t) {
      d[t] = S.budget.all(t);
    });
    return d;
  }

  function card(title, kids, href) {
    return h(
      href ? "a" : "section",
      { class: "card", href: href || null },
      h("h2", { class: "card-title" }, title),
      kids
    );
  }

  function line(left, right, sub, tone) {
    return h(
      "div",
      { class: "line", "data-tone": tone || null },
      h("div", { class: "line-main" }, h("span", { class: "line-title" }, left), sub ? h("span", { class: "line-sub" }, sub) : null),
      right !== null && right !== undefined ? h("span", { class: "line-value" }, right) : null
    );
  }

  /* ---------------------------------------------------------------- */
  /*  money                                                            */
  /* ---------------------------------------------------------------- */

  function moneyCards(main) {
    var data = budgetData();
    if (!data.envelopes.length) return;
    var t0 = today();
    var model = Calc.build(data, t0);
    var M = model.current;
    var mo = model.byMonth[M];
    var r = Calc.range(M);
    var nextPay = addDays(r.end, 1);
    var days = Calc.daysBetween(t0, nextPay);
    var monthRow = data.months.filter(function (m) { return m.id === M; })[0];
    var funded = monthRow && (monthRow.status === "open" || monthRow.status === "closed");

    main.appendChild(
      h("div", { class: "today-head" },
        h("h2", { class: "today-date" }, weekday(t0) + " " + Calc.dayLabel(t0)),
        h("span", { class: "today-sub" }, days === 0 ? "Payday is today" : "Payday in " + days + (days === 1 ? " day" : " days") + ", " + weekday(nextPay) + " " + Calc.dayLabel(nextPay)))
    );

    var openOld = data.months.filter(function (m) { return m.status === "open" && m.id < M; });
    if (openOld.length || !funded) {
      main.appendChild(
        h("a", { class: "card card-alert", href: "../budget/#/payday" },
          h("h2", { class: "card-title" }, "It's payday"),
          h("p", { class: "card-text" }, openOld.length ? "Close " + Calc.monthLabel(openOld[0].id) + " and open " + Calc.monthLabel(M) + " in Budget." : "Open " + Calc.monthLabel(M) + " in Budget."))
      );
    }

    /* allowance today */
    var daily = model.index.envs.filter(function (e) { return e.active !== "no" && Calc.num(e.daily_cap) > 0; });
    daily.forEach(function (e) {
      var spent = data.payments
        .filter(function (p) {
          var pe = Calc.findEnv(model.index, p.env);
          return pe && pe.id === e.id && Calc.dateOf(p) === t0 && p.kind !== "opening";
        })
        .reduce(function (s, p) { return s + Calc.num(p.amount); }, 0);
      var left = Calc.r2(Calc.num(e.daily_cap) - spent);
      var monthLeft = mo && mo.env[e.id] ? mo.env[e.id].left : 0;
      main.appendChild(
        card(e.name + " today", [
          h("span", { class: "big" + (left < 0 ? " neg" : "") }, money(left)),
          h("p", { class: "card-text" }, "left of " + money(e.daily_cap) + ". " + money(monthLeft) + " left this month."),
        ], "../budget/#/env/" + e.id)
      );
    });

    /* bills due in the next 7 days, not paid yet */
    var horizon = addDays(t0, 7);
    var due = [];
    [M, Calc.addMonths(M, 1)].forEach(function (m) {
      var row = data.months.filter(function (x) { return x.id === m; })[0];
      var b = {};
      if (row && row.status !== "draft") data.budgets.forEach(function (x) { if (x.month === m) b[x.env] = Calc.num(x.amount); });
      else b = Calc.planFor(data, m).budgets;
      model.index.envs.forEach(function (e) {
        if (e.kind !== "bill" || e.active === "no") return;
        var date = Calc.billDate(m, e);
        if (!date || date < t0 || date > horizon || !Calc.num(b[e.id])) return;
        var paid = data.payments.some(function (p) {
          var pe = Calc.findEnv(model.index, p.env);
          return pe && pe.id === e.id && Calc.monthOf(Calc.dateOf(p)) === m;
        });
        if (!paid) due.push({ name: e.name, date: date, amount: b[e.id], payday: e.on_payday === "yes" });
      });
    });
    due.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var billList = h("div", { class: "lines" });
    if (!due.length) billList.appendChild(h("p", { class: "card-text" }, "Nothing due in the next 7 days."));
    due.forEach(function (d) {
      billList.appendChild(line(d.name, money(d.amount), (d.date === t0 ? "Today" : weekday(d.date) + " " + Calc.dayLabel(d.date)) + (d.payday ? ", on payday" : "")));
    });
    var total = due.reduce(function (s, d) { return s + d.amount; }, 0);
    main.appendChild(card("Bills this week" + (due.length ? ", " + money(total) : ""), billList, "../budget/"));

    /* funds with a date coming up, and planned money this month */
    var soon = [];
    model.index.envs.forEach(function (e) {
      if (e.kind !== "fund" || !e.target_date || !Calc.num(e.target)) return;
      var daysTo = Calc.daysBetween(t0, e.target_date);
      if (daysTo < 0 || daysTo > 60) return;
      var have = mo && mo.env[e.id] ? mo.env[e.id].left : 0;
      var need = Calc.r2(Calc.num(e.target) - have);
      soon.push(line(e.name, need > 0 ? money(need) + " to go" : "Ready", "Due " + Calc.dayLabel(e.target_date) + ", " + money(have) + " of " + money(e.target), need > 0 ? "warn" : "good"));
    });
    data.planned.forEach(function (p) {
      if (p.status !== "planned" || p.month !== M) return;
      soon.push(line(p.name, money(p.amount), (p.dir === "in" ? "Expected in " : "Expected out ") + Calc.monthLabel(M)));
    });
    if (soon.length) main.appendChild(card("Coming up", h("div", { class: "lines" }, soon), "../budget/#/reserves"));
  }

  /* ---------------------------------------------------------------- */
  /*  lists                                                            */
  /* ---------------------------------------------------------------- */

  function listCard(main) {
    if (!S.household) return;
    var lists = S.household.all("lists").filter(function (l) { return l.active !== "no"; }).sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); });
    if (!lists.length) return;
    var items = S.household.all("items").filter(function (i) { return !i.done; });
    var wrap = h("div", { class: "lines" });
    var any = false;
    lists.forEach(function (l) {
      var open = items.filter(function (i) { return i.list === l.id; });
      if (!open.length) return;
      any = true;
      var names = open.slice(0, 4).map(function (i) { return i.name; }).join(", ") + (open.length > 4 ? ", and " + (open.length - 4) + " more" : "");
      wrap.appendChild(line(l.name || l.name_ar, String(open.length), names));
    });
    if (!any) wrap.appendChild(h("p", { class: "card-text" }, "All lists are done."));
    main.appendChild(card("Lists", wrap, "../household/"));
  }

  /* trips finished in Household that Budget has not had yet */
  function tripsCard(main) {
    if (!S.household) return;
    var waiting = S.household.all("trips").filter(function (t) { return t.status === "done" && !t.budget && t.auto !== "yes"; });
    if (!waiting.length) return;
    var stores = {};
    S.household.all("stores").forEach(function (s) { stores[s.id] = s.name || s.name_ar; });
    var wrap = h("div", { class: "lines" });
    waiting.forEach(function (t) {
      wrap.appendChild(line((stores[t.store] || (t.kind === "paid" ? "Quick purchase" : "Shop")) + ", " + Calc.dayLabel(String(t.date).slice(0, 10)), money(t.total), t.by ? "by " + t.by : null));
    });
    main.appendChild(card(waiting.length === 1 ? "1 shopping trip to review" : waiting.length + " shopping trips to review", wrap, "../budget/#/trips"));
  }

  /* ---------------------------------------------------------------- */
  /*  page                                                             */
  /* ---------------------------------------------------------------- */

  function render() {
    var main = S.main;
    Kit.clear(main);
    if (!S.budget.all("envelopes").length && !(S.household && S.household.all("lists").length)) {
      main.appendChild(h("p", { class: "empty" }, "Waiting for your apps to sync…"));
      return;
    }
    moneyCards(main);
    tripsCard(main);
    listCard(main);
    main.appendChild(h("p", { class: "note", style: "margin-top:18px" }, "Subscriptions and the car log will show here once they are built."));
  }

  Kit.start({
    app: "budget",
    title: "Today",
    render: function (main, hub) {
      S.budget = hub;
      S.main = main;
      hub.on(render);
      if (Kit.canUse("household") || !Kit.who().apps) {
        S.household = new Hub("household");
        S.household.on(render);
        S.household.start();
      }
      render();
      /* a new day, or a return to the app, redraws */
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") render();
      });
    },
    onWho: function () {
      if (!S.household && Kit.canUse("household")) {
        S.household = new Hub("household");
        S.household.on(render);
        S.household.start();
      }
      render();
    },
  });
})();
