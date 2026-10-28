/*
 * Budget v2: the arithmetic. No screens, no storage, so it can be tested on
 * its own and every screen shows the same numbers.
 *
 * Months run from payday to the day before the next payday. A month is
 * named after the month it ends in: 25 Oct to 25 Nov 2026 is "2026-11".
 * Payday is the day in PAYDAYS below, moved a day earlier when it falls on
 * a Friday and a day later when it falls on a Saturday.
 *
 * Every amount moves as a line with two sides: an envelope (what the money
 * is for) and an account (where it sits). Envelope balances and account
 * balances are two ways of adding up the same lines, so the two totals must
 * always agree. That agreement is the books-balance check.
 */
(function (root) {
  "use strict";

  var KINDS = ["spending", "bill", "fund", "remaining"];

  /* ---------------------------------------------------------------- */
  /*  dates and months                                                 */
  /* ---------------------------------------------------------------- */

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function ymd(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function noon(s) {
    var p = String(s).split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
  }

  /*
   * The pay day of the month, from the payday in a given calendar month on.
   * Add a line here when an employer changes; months before it keep the old
   * day, so history never moves.
   */
  var PAYDAYS = [
    { from: "2000-01", day: 25 },
    { from: "2026-11", day: 27 }, // new employer: first paid on 26 Nov 2026 (the 27th is a Friday)
  ];

  function paydayOf(y, m) {
    var key = y + "-" + pad(m);
    var day = 25;
    PAYDAYS.forEach(function (r) {
      if (key >= r.from) day = r.day;
    });
    var w = new Date(y, m - 1, day, 12).getDay();
    return w === 5 ? day - 1 : w === 6 ? day + 1 : day;
  }

  function paydate(y, m) {
    return ymd(new Date(y, m - 1, paydayOf(y, m), 12));
  }

  /** The month a date falls in: "2026-10-25" -> "2026-11". */
  function monthOf(date) {
    var d = noon(date);
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    if (d.getDate() >= paydayOf(y, m)) {
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return y + "-" + pad(m);
  }

  function addMonths(month, n) {
    var p = month.split("-").map(Number);
    var y = p[0];
    var m = p[1] + n;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    return y + "-" + pad(m);
  }

  /** First and last day of a month: "2026-11" -> 2026-10-25 to 2026-11-24. */
  function range(month) {
    var p = month.split("-").map(Number);
    var py = p[0];
    var pm = p[1] - 1;
    if (pm < 1) {
      pm = 12;
      py -= 1;
    }
    var end = noon(paydate(p[0], p[1]));
    end.setDate(end.getDate() - 1);
    return { start: paydate(py, pm), end: ymd(end) };
  }

  /** When a bill falls due in a month: on payday, or on its day of the month. */
  function billDate(month, env) {
    if (env.on_payday === "yes") return range(month).start;
    return num(env.due_day) ? dueDate(month, env.due_day) : null;
  }

  /** The date a bill with this due day falls on inside a month. */
  function dueDate(month, day) {
    var r = range(month);
    var startDay = Number(r.start.slice(8));
    var y = Number(r.start.slice(0, 4));
    var m = Number(r.start.slice(5, 7));
    if (Number(day) < startDay) {
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    var last = new Date(y, m, 0).getDate();
    var s = y + "-" + pad(m) + "-" + pad(Math.min(Number(day), last));
    return s < r.start ? r.start : s > r.end ? r.end : s;
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /** "2026-11" -> "November 2026" style label, short: "Nov 2026" */
  function monthLabel(month) {
    var p = month.split("-").map(Number);
    return MONTHS[p[1] - 1] + " " + p[0];
  }

  function dayLabel(date) {
    var p = String(date).split("-").map(Number);
    return p[2] + " " + MONTHS[p[1] - 1];
  }

  function daysBetween(a, b) {
    return Math.round((noon(b) - noon(a)) / 86400000);
  }

  /* ---------------------------------------------------------------- */
  /*  money                                                            */
  /* ---------------------------------------------------------------- */

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  /** Rounds to the halala, so sums of floats do not show 0.0000001 gaps. */
  function r2(n) {
    var v = Math.round(n * 100) / 100;
    return v === 0 ? 0 : v; // never show -0
  }

  function money(n, opts) {
    var v = r2(num(n));
    var s = Math.abs(v).toLocaleString("en-US", {
      minimumFractionDigits: opts && opts.whole ? 0 : 2,
      maximumFractionDigits: opts && opts.whole ? 0 : 2,
    });
    return (v < 0 ? "-" : "") + s;
  }

  /* ---------------------------------------------------------------- */
  /*  reading the tables                                               */
  /* ---------------------------------------------------------------- */

  function byOrder(a, b) {
    return num(a.order) - num(b.order) || String(a.name || a.id).localeCompare(String(b.name || b.id));
  }

  function settingsOf(rows) {
    var s = {};
    (rows || []).forEach(function (r) {
      s[r.id] = r.value;
    });
    return s;
  }

  /**
   * Builds lookups once: envelopes by id and by name, each envelope's home
   * account and fixed splits, accounts by id.
   */
  function index(data) {
    var envs = (data.envelopes || []).slice().sort(byOrder);
    var accts = (data.accounts || []).slice().sort(byOrder);
    var env = {};
    var envByName = {};
    envs.forEach(function (e) {
      env[e.id] = e;
      envByName[String(e.name || "").trim().toLowerCase()] = e;
    });
    var acct = {};
    accts.forEach(function (a) {
      acct[a.id] = a;
    });
    var remaining = envs.filter(function (e) {
      return e.kind === "remaining";
    })[0];
    var splits = {};
    (data.splits || []).forEach(function (s) {
      if (!s.env || !s.acct || !num(s.amount)) return;
      (splits[s.env] = splits[s.env] || []).push(s);
    });
    return {
      envs: envs,
      accts: accts,
      env: env,
      acct: acct,
      envByName: envByName,
      remaining: remaining ? remaining.id : null,
      splits: splits,
      settings: settingsOf(data.settings),
    };
  }

  /** An envelope by id or, for shortcuts that send words, by name. */
  function findEnv(ix, ref) {
    if (!ref) return null;
    if (ix.env[ref]) return ix.env[ref];
    return ix.envByName[String(ref).trim().toLowerCase()] || null;
  }

  function homeOf(ix, envId) {
    var e = ix.env[envId];
    return e && e.home_acct && ix.acct[e.home_acct] ? e.home_acct : null;
  }

  /** The date of a payment: its own date, or the day the hub received it. */
  function dateOf(row) {
    if (row.date) return String(row.date).slice(0, 10);
    if (row.ts) return ymd(new Date(row.ts));
    return ymd(new Date());
  }

  /** How one envelope's month budget is spread over accounts. */
  function spread(ix, envId, amount) {
    var out = [];
    var home = homeOf(ix, envId);
    var fixed = 0;
    (ix.splits[envId] || []).forEach(function (s) {
      if (s.acct === home || !ix.acct[s.acct]) return;
      out.push({ acct: s.acct, amount: num(s.amount) });
      fixed += num(s.amount);
    });
    out.push({ acct: home, amount: num(amount) - fixed });
    return out;
  }

  /* ---------------------------------------------------------------- */
  /*  the ledger                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Works out every month from the first month of the books up to today's
   * month (or the latest dated row, if later).
   *
   * data: { envelopes, accounts, splits, months, budgets, payments, moves,
   *         reserves, reserve_moves, settings }   (rows as the hub gives them)
   * today: "YYYY-MM-DD"
   */
  function build(data, today) {
    var ix = index(data);
    today = today || ymd(new Date());
    var issues = [];
    var monthRows = {};
    (data.months || []).forEach(function (m) {
      monthRows[m.id] = m;
    });
    var budgets = {};
    (data.budgets || []).forEach(function (b) {
      (budgets[b.month] = budgets[b.month] || {})[b.env] = num(b.amount);
    });

    var start = ix.settings.start_month;
    if (!start) {
      var firstOpen = Object.keys(monthRows)
        .filter(function (k) {
          return monthRows[k].status === "open" || monthRows[k].status === "closed";
        })
        .sort()[0];
      start = firstOpen || monthOf(today);
    }
    var last = monthOf(today);

    /* every row that counts, tagged with its month */
    var lines = [];
    function line(month, date, env, acct, amount, kind, ref) {
      if (!amount) return;
      lines.push({ month: month, date: date, env: env, acct: acct, amount: amount, kind: kind, ref: ref });
    }

    (data.payments || []).forEach(function (p) {
      var date = dateOf(p);
      var month = monthOf(date);
      if (month < start) return;
      if (month > last) last = month;
      var amt = num(p.amount);
      /* a brought-forward line sets one side only: an envelope or an account */
      if (p.kind === "opening") {
        line(month, date, p.env && ix.env[p.env] ? p.env : null, p.acct && ix.acct[p.acct] ? p.acct : null, -amt, "opening", p);
        return;
      }
      var e = findEnv(ix, p.env);
      if (!e) {
        issues.push({ kind: "unknown-envelope", id: p.id, env: p.env });
        e = ix.env[ix.remaining] || null;
      }
      var envId = e ? e.id : null;
      var acct = p.acct && ix.acct[p.acct] ? p.acct : homeOf(ix, envId);
      if (p.acct && !ix.acct[p.acct]) issues.push({ kind: "unknown-account", id: p.id, acct: p.acct });
      line(month, date, envId, acct, -amt, "payment", p);
    });

    (data.moves || []).forEach(function (mv) {
      var date = dateOf(mv);
      var month = monthOf(date);
      if (month < start) return;
      if (month > last) last = month;
      var a = num(mv.amount);
      var fromAcct = mv.from_acct || (mv.from_env ? homeOf(ix, mv.from_env) : null);
      var toAcct = mv.to_acct || (mv.to_env ? homeOf(ix, mv.to_env) : null);
      line(month, date, mv.from_env || null, fromAcct || null, -a, "move", mv);
      line(month, date, mv.to_env || null, toAcct || null, a, "move", mv);
    });

    (data.reserve_moves || []).forEach(function (rm) {
      if (!rm.acct) return;
      var date = dateOf(rm);
      var month = monthOf(date);
      if (month < start) return;
      var a = num(rm.amount);
      line(month, date, ix.remaining, rm.acct, rm.dir === "out" ? a : -a, "reserve", rm);
    });

    var months = [];
    for (var m = start; m <= last; m = addMonths(m, 1)) months.push(m);

    var byMonth = {};
    var envCarry = {};
    var acctCarry = {};
    months.forEach(function (month) {
      var row = monthRows[month] || {};
      var funded = row.status === "open" || row.status === "closed";
      var b = budgets[month] || {};
      var salary = funded ? num(row.salary) : 0;

      var envOut = {};
      ix.envs.forEach(function (e) {
        envOut[e.id] = { carry: r2(envCarry[e.id] || 0), budget: 0, moved: 0, spent: 0, received: 0, opening: 0 };
      });
      var acctOut = {};
      ix.accts.forEach(function (a) {
        acctOut[a.id] = { carry: r2(acctCarry[a.id] || 0), funding: 0, moved: 0, spent: 0, received: 0, opening: 0 };
      });

      /* payday: each envelope's budget lands in its accounts */
      var others = 0;
      if (funded) {
        ix.envs.forEach(function (e) {
          if (e.kind === "remaining") return;
          var amt = num(b[e.id]);
          others += amt;
          envOut[e.id].budget = amt;
          spread(ix, e.id, amt).forEach(function (s) {
            if (s.acct && acctOut[s.acct]) acctOut[s.acct].funding += s.amount;
          });
        });
        if (ix.remaining) {
          var rem = salary - others;
          envOut[ix.remaining].budget = rem;
          spread(ix, ix.remaining, rem).forEach(function (s) {
            if (s.acct && acctOut[s.acct]) acctOut[s.acct].funding += s.amount;
          });
        }
      }

      lines
        .filter(function (l) {
          return l.month === month;
        })
        .forEach(function (l) {
          if (l.env && envOut[l.env]) {
            var eo = envOut[l.env];
            if (l.kind === "opening") eo.opening += l.amount;
            else if (l.kind === "move") eo.moved += l.amount;
            else if (l.amount < 0) eo.spent -= l.amount;
            else eo.received += l.amount;
          }
          if (l.acct && acctOut[l.acct]) {
            var ao = acctOut[l.acct];
            if (l.kind === "opening") ao.opening += l.amount;
            else if (l.kind === "move" || l.kind === "reserve") ao.moved += l.amount;
            else if (l.amount < 0) ao.spent -= l.amount;
            else ao.received += l.amount;
          }
          if (l.env && !envOut[l.env]) issues.push({ kind: "unknown-envelope", env: l.env });
          if (!l.acct && l.kind !== "opening") issues.push({ kind: "no-account", env: l.env, ref: l.ref && l.ref.id });
        });

      var totalEnv = 0;
      var totalAcct = 0;
      Object.keys(envOut).forEach(function (id) {
        var o = envOut[id];
        o.left = r2(o.carry + o.opening + o.budget + o.moved + o.received - o.spent);
        totalEnv += o.left;
      });
      Object.keys(acctOut).forEach(function (id) {
        var o = acctOut[id];
        o.funding = r2(o.funding);
        o.left = r2(o.carry + o.opening + o.funding + o.moved + o.received - o.spent);
        totalAcct += o.left;
      });

      /* into next month: bills hand what is left to Remaining; the rest keep theirs */
      envCarry = {};
      var toRemaining = 0;
      ix.envs.forEach(function (e) {
        if (e.kind === "bill") toRemaining += envOut[e.id].left;
        else envCarry[e.id] = envOut[e.id].left;
      });
      if (ix.remaining) envCarry[ix.remaining] = (envCarry[ix.remaining] || 0) + toRemaining;
      acctCarry = {};
      Object.keys(acctOut).forEach(function (id) {
        acctCarry[id] = acctOut[id].left;
      });

      byMonth[month] = {
        month: month,
        range: range(month),
        status: row.status || "none",
        funded: funded,
        salary: salary,
        env: envOut,
        acct: acctOut,
        totals: { envelopes: r2(totalEnv), accounts: r2(totalAcct), gap: r2(totalAcct - totalEnv) },
      };
    });

    return {
      start: start,
      today: today,
      current: monthOf(today),
      months: months,
      byMonth: byMonth,
      index: ix,
      issues: issues,
      reserves: reserveBalances(data),
    };
  }

  function reserveBalances(data) {
    return (data.reserves || [])
      .slice()
      .sort(byOrder)
      .map(function (r) {
        var bal = num(r.opening);
        (data.reserve_moves || []).forEach(function (m) {
          if (m.reserve !== r.id) return;
          bal += m.dir === "in" ? num(m.amount) : -num(m.amount);
        });
        return { id: r.id, name: r.name, balance: r2(bal) };
      });
  }

  /* ---------------------------------------------------------------- */
  /*  what a month's budget should be                                  */
  /* ---------------------------------------------------------------- */

  /**
   * The budget a new month starts from: its draft if one was prepared,
   * otherwise the standard month. Bills past their end month get nothing.
   */
  function planFor(data, month) {
    var ix = index(data);
    var draft = {};
    var hasDraft = false;
    (data.budgets || []).forEach(function (b) {
      if (b.month === month) {
        draft[b.env] = num(b.amount);
        hasDraft = true;
      }
    });
    var row = (data.months || []).filter(function (m) {
      return m.id === month;
    })[0];
    var out = {};
    ix.envs.forEach(function (e) {
      if (e.kind === "remaining" || e.active === "no") return;
      if (hasDraft && draft[e.id] !== undefined) out[e.id] = draft[e.id];
      else out[e.id] = e.ends_on && month > e.ends_on ? 0 : num(e.standard);
    });
    var salary = row && row.salary !== null && row.salary !== "" && row.salary !== undefined
      ? num(row.salary)
      : num(ix.settings.standard_salary);
    return { budgets: out, salary: salary, fromDraft: hasDraft };
  }

  /* ---------------------------------------------------------------- */
  /*  bills that should post themselves                                */
  /* ---------------------------------------------------------------- */

  /** The id every device uses for one bill's automatic payment, so it can never post twice. */
  function billId(month, envId) {
    return "bill-" + month + "-" + envId;
  }

  /**
   * Bills whose due day has come, in months that have been opened, with
   * nothing paid from them yet. A bill payment you deleted is not posted again.
   *
   * existing: function(id) -> row or null, deleted rows included
   */
  function duePosts(data, today, existing) {
    var ix = index(data);
    var start = ix.settings.start_month || "";
    var out = [];
    (data.months || []).forEach(function (mrow) {
      /* closed months too: a bill that fell due before the month was closed still happened */
      if (mrow.status !== "open" && mrow.status !== "closed") return;
      if (mrow.id < start) return;
      var month = mrow.id;
      var b = {};
      (data.budgets || []).forEach(function (x) {
        if (x.month === month) b[x.env] = num(x.amount);
      });
      ix.envs.forEach(function (e) {
        if (e.kind !== "bill") return;
        var amount = num(b[e.id]);
        if (!amount) return;
        var date = billDate(month, e);
        if (!date || date > today) return;
        var id = billId(month, e.id);
        if (existing(id)) return;
        var paid = (data.payments || []).some(function (p) {
          var pe = findEnv(ix, p.env);
          return pe && pe.id === e.id && monthOf(dateOf(p)) === month;
        });
        if (paid) return;
        out.push({ id: id, date: date, env: e.id, acct: homeOf(ix, e.id) || "", amount: amount, label: "Bill", note: "", kind: "bill", source: "auto" });
      });
    });
    return out;
  }

  /* ---------------------------------------------------------------- */
  /*  payday                                                           */
  /* ---------------------------------------------------------------- */

  /** What each account should receive for a month, grouped by bank. */
  function transferSheet(data, month, budgetsFor, salary) {
    var ix = index(data);
    var per = {};
    var others = 0;
    ix.envs.forEach(function (e) {
      if (e.kind === "remaining") return;
      var amt = num(budgetsFor[e.id]);
      others += amt;
      spread(ix, e.id, amt).forEach(function (s) {
        if (s.acct) per[s.acct] = (per[s.acct] || 0) + s.amount;
      });
    });
    if (ix.remaining) {
      spread(ix, ix.remaining, num(salary) - others).forEach(function (s) {
        if (s.acct) per[s.acct] = (per[s.acct] || 0) + s.amount;
      });
    }
    var salaryAcct = ix.settings.salary_acct || homeOf(ix, ix.remaining);
    var banks = {};
    ix.accts.forEach(function (a) {
      var amt = r2(per[a.id] || 0);
      if (!amt || a.id === salaryAcct) return;
      var bank = a.bank || a.name;
      (banks[bank] = banks[bank] || []).push({ acct: a.id, name: a.name, amount: amt });
    });
    return {
      salaryAcct: salaryAcct,
      keep: r2(per[salaryAcct] || 0),
      banks: Object.keys(banks).map(function (k) {
        return {
          bank: k,
          rows: banks[k],
          total: r2(banks[k].reduce(function (s, r) { return s + r.amount; }, 0)),
        };
      }),
    };
  }

  var Calc = {
    KINDS: KINDS,
    ymd: ymd,
    monthOf: monthOf,
    addMonths: addMonths,
    range: range,
    dueDate: dueDate,
    billDate: billDate,
    monthLabel: monthLabel,
    dayLabel: dayLabel,
    daysBetween: daysBetween,
    num: num,
    r2: r2,
    money: money,
    index: index,
    findEnv: findEnv,
    homeOf: homeOf,
    dateOf: dateOf,
    spread: spread,
    build: build,
    planFor: planFor,
    billId: billId,
    duePosts: duePosts,
    transferSheet: transferSheet,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Calc;
  else root.Calc = Calc;
})(typeof window !== "undefined" ? window : this);
