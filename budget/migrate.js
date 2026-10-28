/*
 * Budget v2: bringing the old books in.
 *
 * Takes the backup text from the old app (Setup, Backup, Copy), works out
 * what the old app shows today, turns everything into v2 tables, and checks
 * that v2 arrives at the same balances. Nothing is sent anywhere here; the
 * import screen decides whether to save the result.
 *
 *   var result = Migrate.run(backupText, "2026-10-28");
 *   result.tables   rows for each v2 table
 *   result.check    one line per envelope and account: old, new, gap
 *   result.ok       true when every gap is under half a halala
 */
(function (root) {
  "use strict";

  var V1 = root.V1 || (typeof require !== "undefined" ? require("./v1-ledger.js") : null);
  var Calc = root.Calc || (typeof require !== "undefined" ? require("./calc.js") : null);

  var GROUPS = { debt: "Committed", bills: "Bills", house: "Living", buffer: "Funds" };

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function slug(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "item";
  }

  function rid() {
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var out = "";
    for (var i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  /** Old machine-made ids (envmt5qiud5, accmukrzr3i) get readable ones. */
  function idMaker(prefix, taken) {
    var used = {};
    Object.keys(taken).forEach(function (k) {
      used[k] = true;
    });
    return function (oldId, name) {
      if (!new RegExp("^" + prefix + "[a-z0-9]{6,}$").test(oldId)) return oldId;
      var base = slug(name);
      var id = base;
      var n = 2;
      while (used[id]) id = base + "-" + n++;
      used[id] = true;
      return id;
    };
  }

  function parse(text) {
    var data;
    try {
      data = JSON.parse(String(text || "").trim());
    } catch (e) {
      throw new Error("That is not the old app's backup text. In the old app open Setup, then Backup, and press Copy.");
    }
    if (!data || !data.settings || !Array.isArray(data.entries)) {
      throw new Error("That text is missing the old app's settings or payments. Copy the whole backup again.");
    }
    return data;
  }

  function run(text, today) {
    var backup = typeof text === "string" ? parse(text) : text;
    var o = backup.settings;
    var dead = {};
    (backup.deleted || []).forEach(function (id) {
      dead[String(id)] = true;
    });
    var entries = backup.entries
      .filter(function (e) {
        return !dead[String(e.id)];
      })
      .map(function (e) {
        var c = {};
        Object.keys(e).forEach(function (k) {
          c[k] = e[k];
        });
        c.env = c.env || "mine";
        c.amount = num(c.amount);
        return c;
      });

    var v1 = V1.compute(o, entries, today);
    var C = v1.R; // the month that is running today

    /* ---- ids ------------------------------------------------------- */
    var envIds = {};
    o.envelopes.forEach(function (e) {
      envIds[e.id] = true;
    });
    var envId = idMaker("env", envIds);
    var envMap = { buffer: "remaining", unassigned: "remaining" };
    o.envelopes.forEach(function (e) {
      envMap[e.id] = envId(e.id, e.name);
    });
    var acctIds = {};
    o.accounts.forEach(function (a) {
      acctIds[a.id] = true;
    });
    var acctId = idMaker("acc", acctIds);
    var acctMap = {};
    o.accounts.forEach(function (a) {
      acctMap[a.id] = acctId(a.id, a.name);
    });
    var A = function (id) {
      return id ? acctMap[id] || id : "";
    };
    var E = function (id) {
      return id ? envMap[id] || id : "";
    };

    /* ---- standard month: the latest standing plan, without one-off figures */
    var planKeys = Object.keys(o.plans || {}).sort();
    var standardOf = function (env) {
      for (var i = planKeys.length - 1; i >= 0; i--) {
        if (o.plans[planKeys[i]][env.id] != null) return num(o.plans[planKeys[i]][env.id]);
      }
      return num(env.budget);
    };
    var salaryKeys = Object.keys(o.salaryPlans || {}).sort();
    var standardSalary = salaryKeys.length ? num(o.salaryPlans[salaryKeys[salaryKeys.length - 1]]) : num(o.salary);

    var t = {
      envelopes: [],
      accounts: [],
      splits: [],
      months: [],
      budgets: [],
      payments: [],
      moves: [],
      reserves: [],
      reserve_moves: [],
      planned: [],
      labels: [],
      settings: [],
    };

    /* ---- accounts and envelopes ----------------------------------- */
    o.accounts.forEach(function (a, i) {
      t.accounts.push({
        id: A(a.id),
        name: a.name,
        bank: a.bank || "",
        type: a.cash ? "cash" : a.savings ? "savings" : "bank",
        order: i + 1,
        active: "yes",
      });
    });

    o.envelopes.forEach(function (e, i) {
      var roll = e.type === "sink" ? true : !!e.roll;
      var kind = roll ? (num(e.commitment) > 0 || e.type === "sink" ? "fund" : "spending") : "bill";
      var home = V1.restAcct(o.accounts, e.id);
      t.envelopes.push({
        id: E(e.id),
        name: String(e.name || "").trim(),
        kind: kind,
        group: GROUPS[e.group] || "Living",
        standard: standardOf(e),
        home_acct: A(home),
        /* the old app's payday was the 25th, so a bill due on the 25th is a payday bill */
        on_payday: kind === "bill" && num(e.dueDay) === 25 ? "yes" : "",
        due_day: kind === "bill" && e.dueDay && num(e.dueDay) !== 25 ? num(e.dueDay) : null,
        daily_cap: e.dailyCap ? num(e.dailyCap) : null,
        target: kind === "fund" && num(e.commitment) ? num(e.commitment) : null,
        target_date: kind === "fund" && e.dueDate ? e.dueDate : "",
        ends_on: e.endsOn || "",
        order: i + 1,
        active: "yes",
      });
    });
    t.envelopes.push({
      id: "remaining",
      name: "Remaining",
      kind: "remaining",
      group: "Funds",
      standard: null,
      home_acct: A(V1.restAcct(o.accounts, "buffer")),
      on_payday: "",
      due_day: null,
      daily_cap: null,
      target: null,
      target_date: "",
      ends_on: "",
      order: 999,
      active: "yes",
    });

    /* fixed amounts that go to an account other than the envelope's home */
    o.accounts.forEach(function (a) {
      (a.funds || []).forEach(function (f) {
        var home = V1.restAcct(o.accounts, f.env);
        if (a.id === home || f.share == null || !num(f.share)) return;
        t.splits.push({ id: E(f.env) + "_" + A(a.id), env: E(f.env), acct: A(a.id), amount: num(f.share) });
      });
    });

    /* ---- months and their budgets --------------------------------- */
    var future = {};
    [o.overrides, o.plans, o.salaryPlans].forEach(function (obj) {
      Object.keys(obj || {}).forEach(function (k) {
        if (k > C) future[k] = true;
      });
    });
    var monthList = v1.cycles.filter(function (c) {
      return c <= C;
    });
    Object.keys(future)
      .sort()
      .forEach(function (k) {
        monthList.push(k);
      });
    monthList.forEach(function (c) {
      var status = c < C ? "closed" : c === C ? "open" : "draft";
      t.months.push({
        id: c,
        month: c,
        status: status,
        salary: v1.salary(c),
        opened: status === "draft" ? "" : "imported",
        closed: status === "closed" ? "imported" : "",
        transfers_done: "",
      });
      o.envelopes.forEach(function (e) {
        t.budgets.push({ id: c + "_" + E(e.id), month: c, env: E(e.id), amount: Calc.r2(v1.budget(e.id, c)) });
      });
    });

    /* ---- payments --------------------------------------------------- */
    entries.forEach(function (e) {
      t.payments.push({
        id: rid(),
        date: e.date,
        env: E(e.env),
        acct: A(e.acct || ""),
        amount: Calc.r2(num(e.amount)),
        label: e.label === "Reconciliation" ? "Adjustment" : e.label || "",
        note: e.note || "",
        kind: e.label === "Reconciliation" ? "adjust" : "spend",
        source: "old app",
        legacy: String(e.id),
      });
    });
    /* bills the old app posted by itself become real payments */
    v1.sched.forEach(function (s) {
      t.payments.push({
        id: Calc.billId(s.cycle, E(s.env)),
        date: s.date,
        env: E(s.env),
        acct: "",
        amount: Calc.r2(num(s.amount)),
        label: "Bill",
        note: "",
        kind: "bill",
        source: "old app",
        legacy: s.id,
      });
    });
    /* what each envelope and account held when this month began */
    var startDate = Calc.range(C).start;
    var carryEnv = {};
    Object.keys(v1.envByCycle[C]).forEach(function (id) {
      var c = v1.envByCycle[C][id].carryIn;
      if (!c) return;
      carryEnv[E(id)] = (carryEnv[E(id)] || 0) + c;
    });
    Object.keys(carryEnv).forEach(function (id) {
      var amt = Calc.r2(carryEnv[id]);
      if (!amt) return;
      t.payments.push({ id: "open-" + C + "-env-" + id, date: startDate, env: id, acct: "", amount: -amt, label: "Brought forward", note: "", kind: "opening", source: "old app", legacy: "" });
    });
    v1.acctByCycle[C].forEach(function (a) {
      var amt = Calc.r2(a.carry);
      if (!amt) return;
      t.payments.push({ id: "open-" + C + "-acct-" + A(a.id), date: startDate, env: "", acct: A(a.id), amount: -amt, label: "Brought forward", note: "", kind: "opening", source: "old app", legacy: "" });
    });

    /* ---- moves ---------------------------------------------------- */
    var problems = [];
    (o.transfers || []).forEach(function (f) {
      if (!f.posted || f.kind === "acct") return; // older moves are already inside that month's budgets
      var date = f.date || V1.cycleRange(f.cycle).start;
      if (V1.cycleOf(date) !== f.cycle) date = V1.cycleRange(f.cycle).start;
      t.moves.push({
        id: rid(),
        date: date,
        from_env: E(f.from),
        from_acct: A(f.fromAcct || V1.restAcct(o.accounts, f.from)),
        to_env: E(f.to),
        to_acct: A(f.toAcct || V1.restAcct(o.accounts, f.to)),
        amount: Calc.r2(num(f.amount)),
        note: f.note || "",
        legacy: String(f.id),
      });
    });
    (o.accountMoves || []).forEach(function (f) {
      var date = f.date || V1.cycleRange(f.cycle).start;
      if (V1.cycleOf(date) !== f.cycle) date = V1.cycleRange(f.cycle).start;
      t.moves.push({
        id: rid(),
        date: date,
        from_env: "",
        from_acct: A(f.from),
        to_env: "",
        to_acct: A(f.to),
        amount: Calc.r2(num(f.amount)),
        note: f.note || "",
        legacy: String(f.id),
      });
    });

    /* ---- reserves: an undo and the move it undid both drop out ----- */
    (o.reserves || []).forEach(function (r, i) {
      t.reserves.push({ id: slug(r.id === "portfolio" ? "portfolio" : r.name), name: r.name, opening: num(r.opening), order: i + 1 });
    });
    var resMap = {};
    (o.reserves || []).forEach(function (r, i) {
      resMap[r.id] = t.reserves[i].id;
    });
    var moves = (o.reserveMoves || []).slice();
    var keep = moves.map(function () {
      return true;
    });
    moves.forEach(function (m, i) {
      if (!/^undo /.test(m.note || "")) return;
      for (var j = i - 1; j >= 0; j--) {
        var p = moves[j];
        if (keep[j] && p.reserve === m.reserve && num(p.amount) === num(m.amount) && p.dir !== m.dir && p.note === m.note.slice(5)) {
          keep[i] = false;
          keep[j] = false;
          break;
        }
      }
    });
    moves.forEach(function (m, i) {
      if (!keep[i]) return;
      t.reserve_moves.push({
        id: rid(),
        date: m.date || V1.cycleRange(m.cycle).start,
        reserve: resMap[m.reserve] || m.reserve,
        acct: A(m.acct || ""),
        amount: num(m.amount),
        dir: m.dir === "out" ? "out" : "in",
        note: m.note || "",
      });
    });

    /* ---- plans, labels, settings ---------------------------------- */
    (o.planned || []).forEach(function (p) {
      var parts = String(p.target || "env:buffer").split(":");
      var target = parts[0] === "res" ? "reserve:" + (resMap[parts[1]] || parts[1]) : "env:" + E(parts[1]);
      t.planned.push({
        id: rid(),
        name: p.name,
        amount: num(p.amount),
        month: p.cycle || "",
        dir: p.kind === "in" ? "in" : "out",
        target: target,
        status: p.status === "done" ? "done" : p.cycle ? "planned" : "idea",
        record: p.status === "done" ? "recorded in the old app" : "",
      });
    });
    (o.labels || []).forEach(function (name, i) {
      if (name === "Reconciliation") return;
      t.labels.push({ id: slug(name), name: name === "Pharmecy" ? "Pharmacy" : name, envs: "", order: i + 1 });
    });
    t.payments.forEach(function (p) {
      if (p.label === "Pharmecy") p.label = "Pharmacy";
    });

    var setting = function (k, v) {
      t.settings.push({ id: k, value: String(v) });
    };
    setting("start_month", C);
    setting("standard_salary", standardSalary);
    setting("salary_acct", A(V1.restAcct(o.accounts, "buffer")));
    setting("imported_on", today);
    setting("payday_bills", "done");

    /* ---- the check ------------------------------------------------- */
    var v2 = Calc.build(t, today);
    var m2 = v2.byMonth[C];
    var check = [];
    var old = v1.envByCycle[C];
    var oldRemaining = (old.buffer ? old.buffer.left : 0) + (old.unassigned ? old.unassigned.left : 0);
    var oldIdOf = {};
    o.envelopes.forEach(function (e) {
      oldIdOf[E(e.id)] = e.id;
    });
    t.envelopes.forEach(function (e) {
      var wasLeft = e.kind === "remaining" ? oldRemaining : old[oldIdOf[e.id]] ? old[oldIdOf[e.id]].left : 0;
      var now = m2.env[e.id] ? m2.env[e.id].left : 0;
      check.push({ kind: "Envelope", id: e.id, name: e.name, old: Calc.r2(wasLeft), now: now, gap: Calc.r2(now - wasLeft) });
    });
    v1.acctByCycle[C].forEach(function (a) {
      var now = m2.acct[A(a.id)] ? m2.acct[A(a.id)].left : 0;
      check.push({ kind: "Account", id: A(a.id), name: a.name, old: Calc.r2(a.left), now: now, gap: Calc.r2(now - a.left) });
    });
    var reservesOld = v1.reserves;
    v2.reserves.forEach(function (r, i) {
      var was = reservesOld[i] ? reservesOld[i].balance : 0;
      check.push({ kind: "Reserve", id: r.id, name: r.name, old: Calc.r2(was), now: r.balance, gap: Calc.r2(r.balance - was) });
    });

    var duplicates = Calc.duePosts(t, today, function (id) {
      return t.payments.some(function (p) { return p.id === id; });
    });

    var ok = check.every(function (c) {
      return Math.abs(c.gap) < 0.005;
    }) && m2.totals.gap === 0 && !duplicates.length && !v2.issues.length;

    return {
      ok: ok,
      month: C,
      today: today,
      tables: t,
      check: check,
      totals: m2.totals,
      issues: v2.issues.concat(problems),
      duplicates: duplicates,
      counts: Object.keys(t).reduce(function (acc, k) {
        acc[k] = t[k].length;
        return acc;
      }, {}),
    };
  }

  var Migrate = { run: run, parse: parse, slug: slug };
  if (typeof module !== "undefined" && module.exports) module.exports = Migrate;
  else root.Migrate = Migrate;
})(typeof window !== "undefined" ? window : this);
