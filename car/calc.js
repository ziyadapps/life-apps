/*
 * Car: the figures. No screen code here, so Budget and Today can load this
 * file too and show the same numbers.
 *
 * Tables in the car sheet:
 *   settings  id, value
 *   fuel      date, odo, litres, cost, price, full (yes/no), note, budget, budget_ref
 *   services  date, odo, place, cost, items (ids separated by spaces), note, budget, budget_ref
 *   odo       date, odo (a reading on its own)
 *   envelopes, bank  written by Budget (its car envelopes, and fill-ups it heard of from the bank)
 *
 * The maintenance plan is the owner's manual for the Corolla with the
 * M20A-FKS engine (GCC), pages 241 to 245.
 */
(function (root) {
  "use strict";

  var Calc = root.Calc || (typeof require === "function" ? require("../budget/calc.js") : null);

  var DEFAULTS = {
    price: 2.18, // 91 octane, SAR a litre
    sticker: 20.3, // SASO label, km a litre
    tank: 47,
    mode: "dust",
  };

  /* ---------------------------------------------------------------- */
  /*  the plan                                                         */
  /* ---------------------------------------------------------------- */

  /*
   * kind: replace (costs money), check (part of a service), service (the free one)
   * base: part of every regular service, so its cost is the service's own cost
   * quick: a look that does not need a service of its own
   * dust / dusty: what changes on the "Normal + dust checks" and "Dusty" schedules
   */
  var ITEMS = [
    { id: "free", name: "Free 1,000 km service", kind: "service", once: 1000 },
    { id: "oil", name: "Engine oil and oil filter", kind: "replace", base: true, km: 10000, months: 12, dusty: { km: 5000, months: 6 } },
    { id: "injector", name: "Fuel injector cleaner, added to the tank", kind: "replace", base: true, km: 10000 },
    { id: "basic", name: "Tires and pressure, lights and wipers, battery, brake fluid level", kind: "check", base: true, km: 10000, months: 6 },
    { id: "brakes", name: "Brake pads, discs and pedal", kind: "check", km: 10000, months: 6, dust: { km: 5000, months: 3, quick: true } },
    { id: "airchk", name: "Air filter check", kind: "check", km: 20000, months: 24, dust: { km: 2500, months: 3, quick: true } },
    { id: "ac", name: "A/C filter", kind: "replace", km: 20000, dust: { km: 15000 } },
    { id: "chk20", name: "Drive belts, exhaust, brake lines, steering, drive shaft boots, ball joints, suspension", kind: "check", km: 20000, months: 12 },
    { id: "air", name: "Air filter", kind: "replace", km: 40000, months: 48 },
    { id: "bfluid", name: "Brake fluid", kind: "replace", km: 40000, months: 24 },
    { id: "cool", name: "Cooling system, fuel cap and lines", kind: "check", km: 40000, months: 24, after: { km: 80000, months: 48, km2: 20000, months2: 12 } },
    { id: "chk40", name: "Charcoal canister, CVT fluid", kind: "check", km: 40000, months: 24 },
    { id: "ffilter", name: "Fuel filter", kind: "replace", km: 80000, months: 96 },
    { id: "plugs", name: "Spark plugs", kind: "replace", km: 100000 },
    { id: "coolant", name: "Engine coolant", kind: "replace", first: 160000, km: 80000 },
    { id: "booster", name: "Brake booster vacuum pump", kind: "check", km: 200000 },
  ];

  var MODES = [
    { id: "normal", name: "Normal" },
    { id: "dust", name: "Normal + dust checks" },
    { id: "dusty", name: "Dusty" },
  ];

  /** One item as it applies on a schedule: { id, name, kind, km, months, quick, ... } */
  function itemFor(item, mode) {
    var out = {};
    Object.keys(item).forEach(function (k) {
      if (k !== "dust" && k !== "dusty") out[k] = item[k];
    });
    if ((mode === "dust" || mode === "dusty") && item.dust) Object.assign(out, item.dust);
    if (mode === "dusty" && item.dusty) Object.assign(out, item.dusty);
    return out;
  }

  function plan(mode) {
    return ITEMS.map(function (i) {
      return itemFor(i, mode || DEFAULTS.mode);
    });
  }

  /** The km between regular services: the oil change. */
  function serviceGap(mode) {
    return itemFor(ITEMS[1], mode).km;
  }

  /* ---------------------------------------------------------------- */
  /*  small helpers                                                    */
  /* ---------------------------------------------------------------- */

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function r1(n) {
    return Math.round(n * 10) / 10;
  }

  function r2(n) {
    return Calc.r2(n);
  }

  function addDays(date, n) {
    var p = String(date).split("-").map(Number);
    return Calc.ymd(new Date(p[0], p[1] - 1, p[2] + Math.round(n), 12));
  }

  function addMonthsDate(date, n) {
    var p = String(date).split("-").map(Number);
    var d = new Date(p[0], p[1] - 1 + n, 1, 12);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(p[2], last));
    return Calc.ymd(d);
  }

  function monthsBetween(a, b) {
    return Calc.daysBetween(a, b) / 30.44;
  }

  function settingsOf(rows) {
    var s = {};
    (rows || []).forEach(function (r) {
      if (!r.del) s[r.id] = r.value;
    });
    return s;
  }

  function setting(s, k) {
    var v = s[k];
    if (v === undefined || v === null || v === "") return DEFAULTS[k];
    return v;
  }

  function live(rows) {
    return (rows || []).filter(function (r) {
      return !r.del;
    });
  }

  function itemsOf(row) {
    return String(row.items || "").split(/[\s,]+/).filter(String);
  }

  /* ---------------------------------------------------------------- */
  /*  the odometer                                                     */
  /* ---------------------------------------------------------------- */

  /** Every reading we have: fill-ups, services and readings on their own. Oldest first. */
  function readings(data) {
    var out = [];
    ["fuel", "services", "odo"].forEach(function (t) {
      live(data[t]).forEach(function (r) {
        if (num(r.odo) > 0 && r.date) out.push({ date: String(r.date).slice(0, 10), odo: num(r.odo), from: t, id: r.id });
      });
    });
    return out.sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : a.odo - b.odo;
    });
  }

  function latest(data) {
    var rs = readings(data);
    var best = null;
    rs.forEach(function (r) {
      if (!best || r.odo > best.odo || (r.odo === best.odo && r.date > best.date)) best = r;
    });
    return best;
  }

  /**
   * Km a day, from the last two months of readings (or all of them while the
   * car is new). Null until there are a few days between two readings.
   */
  function kmPerDay(data, today) {
    var rs = readings(data);
    if (rs.length < 2) return null;
    var last = latest(data);
    var from = addDays(last.date, -60);
    var early = rs.filter(function (r) { return r.date >= from && r.odo < last.odo; })[0];
    var span = early ? Calc.daysBetween(early.date, last.date) : 0;
    if (!early || span < 7) {
      early = rs.filter(function (r) { return r.odo < last.odo; })[0];
      span = early ? Calc.daysBetween(early.date, last.date) : 0;
    }
    if (!early || span < 3) return null;
    return (last.odo - early.odo) / span;
  }

  /** The odometer today: the last reading, plus the usual km since. */
  function odoNow(data, today) {
    var last = latest(data);
    if (!last) return { odo: 0, estimated: false, date: "" };
    var rate = kmPerDay(data, today);
    var days = Math.max(0, Calc.daysBetween(last.date, today));
    if (!rate || !days) return { odo: last.odo, estimated: false, date: last.date };
    return { odo: Math.round(last.odo + rate * days), estimated: true, date: last.date, reading: last.odo };
  }

  /* ---------------------------------------------------------------- */
  /*  fuel                                                             */
  /* ---------------------------------------------------------------- */

  /**
   * Each fill-up with what it tells: km since the one before, price a litre,
   * and, from one full tank to the next, km a litre and cost a km.
   * Newest first.
   */
  function fills(data) {
    var rows = live(data.fuel).slice().sort(function (a, b) {
      return num(a.odo) - num(b.odo) || (String(a.date) < String(b.date) ? -1 : 1);
    });
    var out = [];
    var lastFull = null;
    var since = { litres: 0, cost: 0 };
    rows.forEach(function (r, i) {
      var litres = num(r.litres);
      var cost = num(r.cost);
      var f = {
        id: r.id,
        date: String(r.date).slice(0, 10),
        odo: num(r.odo),
        litres: litres,
        cost: cost,
        price: litres ? r2(cost / litres) : num(r.price),
        full: r.full !== "no",
        km: i ? num(r.odo) - num(rows[i - 1].odo) : null,
        kmPerL: null,
        perKm: null,
        segKm: null,
        row: r,
      };
      since.litres += litres;
      since.cost += cost;
      if (f.full) {
        if (lastFull && f.odo > lastFull.odo) {
          f.segKm = f.odo - lastFull.odo;
          f.segLitres = since.litres;
          f.segCost = since.cost;
          f.kmPerL = since.litres ? r1(f.segKm / since.litres) : null;
          f.perKm = f.segKm ? since.cost / f.segKm : null;
        }
        lastFull = f;
        since = { litres: 0, cost: 0 };
      }
      out.push(f);
    });
    return out.reverse();
  }

  /** Km a litre and cost a km over recent full-to-full stretches (about the last 3 months). */
  function economy(data, today) {
    var fs = fills(data).filter(function (f) { return f.kmPerL; });
    if (!fs.length) return null;
    var from = addDays(today, -92);
    var recent = fs.filter(function (f) { return f.date >= from; });
    if (!recent.length) recent = fs.slice(0, 3);
    var km = 0, litres = 0, cost = 0;
    recent.forEach(function (f) {
      km += f.segKm;
      litres += f.segLitres;
      cost += f.segCost;
    });
    return { kmPerL: r1(km / litres), perKm: cost / km, km: km, litres: litres, stretches: recent.length };
  }

  function fuelSpent(data, from, to) {
    return r2(live(data.fuel).reduce(function (s, r) {
      var d = String(r.date).slice(0, 10);
      return d >= from && d <= to ? s + num(r.cost) : s;
    }, 0));
  }

  /** Litres for a cost at a price, to one decimal. */
  function litresFor(cost, price) {
    var p = num(price);
    return p > 0 ? r1(num(cost) / p) : 0;
  }

  /**
   * What fuel will cost over a number of days, at your usual km a day and
   * km a litre. Uses the sticker's figure until two full tanks have shown
   * the real one.
   */
  function fuelFor(data, days, today) {
    var s = settingsOf(data.settings);
    var rate = kmPerDay(data, today);
    var eco = economy(data, today);
    var kmPerL = eco ? eco.kmPerL : num(setting(s, "sticker"));
    var price = num(setting(s, "price"));
    if (!rate || !kmPerL) return null;
    var km = rate * days;
    var litres = km / kmPerL;
    return { amount: Math.ceil(litres * price / 10) * 10, km: Math.round(km), litres: r1(litres), kmPerL: kmPerL, price: price, fromSticker: !eco, rate: rate };
  }

  /* ---------------------------------------------------------------- */
  /*  maintenance                                                      */
  /* ---------------------------------------------------------------- */

  /** When each item was last done: { id: { odo, date } }, from the service log. */
  function lastDone(data) {
    var out = {};
    live(data.services).forEach(function (r) {
      itemsOf(r).forEach(function (id) {
        var o = { odo: num(r.odo), date: String(r.date).slice(0, 10) };
        if (!out[id] || o.odo > out[id].odo || (o.odo === out[id].odo && o.date > out[id].date)) out[id] = o;
      });
    });
    return out;
  }

  /** The interval for an item done at this km and date (the cooling system checks get closer after 80,000 km). */
  function interval(item, atKm, atDate, start) {
    var a = item.after;
    if (a && (atKm >= a.km || (start && monthsBetween(start, atDate) >= a.months - 0.5))) return { km: a.km2, months: a.months2 };
    return { km: item.km, months: item.months };
  }

  /**
   * When one item is next due: { km, date } (either may be missing), or null
   * when it never comes again (the free service, once done).
   */
  function dueOf(item, done, start) {
    if (item.once) return done ? null : { km: item.once, date: null };
    if (!done && item.first) return { km: item.first, date: null };
    var from = done || { odo: 0, date: start };
    var iv = interval(item, from.odo, from.date, start);
    return {
      km: iv.km ? from.odo + iv.km : null,
      date: iv.months && from.date ? addMonthsDate(from.date, iv.months) : null,
    };
  }

  /** The day a km is reached at your usual pace. */
  function dateForKm(km, now, rate, today) {
    if (!rate) return null;
    var days = (km - now) / rate;
    return addDays(today, Math.max(0, days));
  }

  function startOf(data) {
    var s = settingsOf(data.settings);
    if (s.delivered) return String(s.delivered).slice(0, 10);
    var rs = readings(data);
    return rs.length ? rs[0].date : null;
  }

  /**
   * Every item with its next due point, soonest first:
   * { item, km, date (by the calendar), kmDate (when the km comes), when (the earlier), left (km), days, status }
   * status: overdue, soon (within 1,000 km or 30 days), later
   */
  function schedule(data, today) {
    var s = settingsOf(data.settings);
    var mode = setting(s, "mode");
    var start = startOf(data);
    var done = lastDone(data);
    var now = odoNow(data, today);
    var rate = kmPerDay(data, today);
    var out = [];
    plan(mode).forEach(function (item) {
      var d = dueOf(item, done[item.id], start);
      if (!d) return;
      var kmDate = d.km ? dateForKm(d.km, now.odo, rate, today) : null;
      var when = [d.date, kmDate].filter(Boolean).sort()[0] || null;
      var left = d.km ? d.km - now.odo : null;
      var days = when ? Calc.daysBetween(today, when) : null;
      var status = (left !== null && left <= 0) || (d.date && d.date <= today) ? "overdue" : (left !== null && left <= 1000) || (days !== null && days <= 30) ? "soon" : "later";
      out.push({ item: item, km: d.km, date: d.date, kmDate: kmDate, when: when, left: left, days: days, status: status, last: done[item.id] || null });
    });
    return out.sort(function (a, b) {
      var wa = a.when || "9999", wb = b.when || "9999";
      if (wa !== wb) return wa < wb ? -1 : 1;
      return (a.km || 1e9) - (b.km || 1e9);
    });
  }

  /** What one item costs: the service's own price for the regular items, your estimate for the rest. */
  function itemCost(item, costs) {
    if (item.kind === "check" || item.kind === "service") return 0;
    if (item.base) return 0;
    var v = costs["cost_" + item.id];
    return v === undefined || v === null || v === "" ? null : num(v);
  }

  /**
   * The price of a regular service (oil and the checks with it): what you
   * paid last time for one with nothing extra replaced, else your estimate.
   */
  function baseCost(data) {
    var s = settingsOf(data.settings);
    var extras = ITEMS.filter(function (i) { return i.kind === "replace" && !i.base; }).map(function (i) { return i.id; });
    var plain = live(data.services)
      .filter(function (r) {
        var ids = itemsOf(r);
        return ids.indexOf("oil") >= 0 && num(r.cost) > 0 && !ids.some(function (id) { return extras.indexOf(id) >= 0; });
      })
      .sort(function (a, b) { return num(b.odo) - num(a.odo); })[0];
    if (plain) return { amount: num(plain.cost), learned: true, date: String(plain.date).slice(0, 10) };
    var v = s.cost_base;
    return v === undefined || v === "" || v === null ? { amount: null, learned: false } : { amount: num(v), learned: false };
  }

  /**
   * The services coming up in the next year, each with what it covers and
   * what it should cost. A service happens when something (not a quick
   * check) falls due; anything else due before about halfway to the next
   * one is done at the same time.
   */
  function visits(data, today, horizonDays) {
    var s = settingsOf(data.settings);
    var mode = setting(s, "mode");
    var items = plan(mode);
    var start = startOf(data);
    var rate = kmPerDay(data, today);
    var now = odoNow(data, today).odo;
    var gap = serviceGap(mode);
    var base = baseCost(data);
    var done = {};
    var ld = lastDone(data);
    Object.keys(ld).forEach(function (k) { done[k] = ld[k]; });
    var horizon = addDays(today, horizonDays || 365);
    var out = [];
    for (var guard = 0; guard < 60; guard++) {
      var next = null;
      items.forEach(function (item) {
        if (item.quick) return;
        var d = dueOf(item, done[item.id], start);
        if (!d) return;
        var kd = d.km ? dateForKm(d.km, now, rate, today) : null;
        var when = [d.date, kd].filter(Boolean).sort()[0];
        if (!when && d.km && !rate) when = null;
        var key = when || "9999-" + String(d.km).padStart(9, "0");
        if (!next || key < next.key) next = { key: key, when: when, km: d.km, date: d.date, kd: kd };
      });
      if (!next) break;
      var vDate = next.when ? (next.when < today ? today : next.when) : null;
      if (vDate && vDate > horizon) break;
      var vKm;
      if (vDate && rate) vKm = Math.round(Math.max(now, now + rate * Calc.daysBetween(today, vDate)));
      else vKm = Math.max(now, next.km || now);
      /* due by km: the service is at that km, not at a km worked out from a rounded date */
      if (next.km && next.kd && next.kd === next.when && next.when >= today) vKm = Math.max(now, next.km);
      var reachKm = vKm + gap / 2;
      var reachDate = vDate && rate ? addDays(vDate, gap / 2 / rate) : null;
      var covers = [];
      items.forEach(function (item) {
        var d = dueOf(item, done[item.id], start);
        if (!d) return;
        var byKm = d.km && d.km <= reachKm;
        var byDate = d.date && ((reachDate && d.date <= reachDate) || (vDate && d.date <= vDate));
        if (item.once && !(d.km <= vKm + 1)) return;
        if (byKm || byDate) covers.push(item);
      });
      var cost = 0;
      var unknown = [];
      var hasOil = covers.some(function (i) { return i.id === "oil"; });
      if (hasOil) {
        if (base.amount === null) unknown.push("service");
        else cost += base.amount;
      }
      covers.forEach(function (i) {
        var c = itemCost(i, s);
        if (c === null) unknown.push(i.id);
        else cost += c;
        done[i.id] = { odo: vKm, date: vDate || today };
      });
      out.push({ date: vDate, km: vKm, items: covers, cost: r2(cost), unknown: unknown, free: cost === 0 && covers.some(function (i) { return i.id === "free"; }) });
      if (!vDate) break;
    }
    return out;
  }

  /**
   * What to put aside for maintenance: the next year's services spread over
   * twelve months, and what falls due between two dates.
   */
  function maintenanceFor(data, today, from, to) {
    var vs = visits(data, today, 365);
    var year = vs.filter(function (v) { return v.date; });
    var total = year.reduce(function (s, v) { return s + v.cost; }, 0);
    var inRange = from && to ? year.filter(function (v) { return v.date >= from && v.date <= to; }) : [];
    var unknown = {};
    year.forEach(function (v) { v.unknown.forEach(function (u) { unknown[u] = 1; }); });
    return {
      monthly: Math.ceil(total / 12 / 10) * 10,
      year: r2(total),
      due: r2(inRange.reduce(function (s, v) { return s + v.cost; }, 0)),
      dueVisits: inRange,
      visits: vs,
      unknown: Object.keys(unknown),
      dated: year.length === vs.length,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  financing and dates                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Where the financing stands: { monthly, count, paid, left, next, last,
   * balloon, balloonDate, remaining (instalments + balloon), monthsToBalloon, toSave }
   */
  function finance(data, today) {
    var s = settingsOf(data.settings);
    var monthly = num(s.fin_monthly);
    var first = s.fin_first ? String(s.fin_first).slice(0, 10) : "";
    var count = Math.round(num(s.fin_count));
    if (!monthly || !first || !count) return null;
    var last = s.fin_last ? String(s.fin_last).slice(0, 10) : addMonthsDate(first, count - 1);
    var dates = [];
    for (var i = 0; i < count; i++) dates.push(i === count - 1 ? last : addMonthsDate(first, i));
    var paid = dates.filter(function (d) { return d <= today; }).length;
    var balloon = num(s.fin_balloon);
    var balloonDate = s.fin_balloon_date ? String(s.fin_balloon_date).slice(0, 10) : last;
    var balloonPaid = balloon && balloonDate <= today && s.fin_balloon_paid === "yes";
    var months = Math.max(0, Math.round(monthsBetween(today, balloonDate)));
    return {
      monthly: monthly,
      count: count,
      paid: paid,
      left: count - paid,
      next: dates[paid] || null,
      last: last,
      balloon: balloon,
      balloonDate: balloonDate,
      balloonDays: Calc.daysBetween(today, balloonDate),
      remaining: r2((count - paid) * monthly + (balloonPaid ? 0 : balloon)),
      monthsToBalloon: months,
      toSave: months ? Math.ceil(balloon / months / 10) * 10 : balloon,
    };
  }

  var DATES = [
    { id: "ins_end", name: "Insurance ends", note: "The bank renews it. Check the new policy is issued.", warn: 30 },
    { id: "reg_end", name: "Registration (Istimara) expires", note: "Renew in Absher.", warn: 60 },
    { id: "insp_due", name: "Periodic inspection (Fahas) due", note: "Three years after the first licence, then every year.", warn: 60 },
    { id: "warranty_end", name: "Warranty ends", note: "", warn: 60 },
  ];

  /** The dates you gave, soonest first: { id, name, note, date, days, soon } */
  function dates(data, today) {
    var s = settingsOf(data.settings);
    return DATES.filter(function (d) { return s[d.id]; })
      .map(function (d) {
        var date = String(s[d.id]).slice(0, 10);
        var days = Calc.daysBetween(today, date);
        return { id: d.id, name: d.name, note: d.note, date: date, days: days, soon: days <= d.warn };
      })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  /* ---------------------------------------------------------------- */
  /*  what needs you                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Short lines for Today and the car's own home screen:
   * [{ text, sub, tone, href }]
   */
  function alerts(data, today) {
    var out = [];
    var sch = schedule(data, today);
    var vs = visits(data, today, 60);
    var v = vs[0];
    if (v) {
      var now = odoNow(data, today).odo;
      var left = v.km - now;
      var days = v.date ? Calc.daysBetween(today, v.date) : null;
      if ((days !== null && days <= 14) || left <= 1000) {
        out.push({
          text: (v.free ? "Free service" : "Service") + (left <= 0 || (days !== null && days <= 0) ? " due now" : " due in " + Math.max(0, Math.round(left / 100) * 100).toLocaleString("en-US") + " km"),
          sub: v.items.filter(function (i) { return i.kind !== "check"; }).map(function (i) { return i.name; }).join(", ") || "Checks",
          tone: left <= 0 ? "bad" : "warn",
          href: "#/service/new",
        });
      }
    }
    /* a quick check the next service will do anyway is left to it */
    var atService = function (x) {
      return vs.some(function (s) { return s.date && x.when && s.date <= x.when && s.items.some(function (i) { return i.id === x.item.id; }); });
    };
    sch.filter(function (x) { return x.item.quick && x.status !== "later" && !atService(x); }).forEach(function (x) {
      out.push({ text: x.item.name + (x.status === "overdue" ? " due" : " soon"), sub: "A quick look, at a fill-up or any stop", tone: "warn", href: "#/plan" });
    });
    dates(data, today).forEach(function (d) {
      if (d.soon) out.push({ text: d.name + " " + (d.days < 0 ? Calc.dayLabel(d.date) : d.days === 0 ? "today" : "in " + d.days + " days"), sub: d.note, tone: d.days <= 7 ? "bad" : "warn", href: "#/money" });
    });
    var f = finance(data, today);
    if (f && f.balloon && f.balloonDays >= 0 && f.balloonDays <= 180) {
      out.push({ text: "Final payment of " + Calc.money(f.balloon, { whole: true }) + " in " + f.balloonDays + " days", sub: "Pay it, or arrange to refinance it with the bank", tone: "warn", href: "#/money" });
    }
    var waiting = live(data.bank).filter(function (b) { return !b.done; }).length;
    if (waiting) out.push({ text: waiting === 1 ? "1 fill-up from the bank needs its odometer" : waiting + " fill-ups from the bank need their odometer", sub: "Budget logged the payment. Add the km and litres here.", tone: "warn", href: "#/fuel" });
    return out;
  }

  var CarCalc = {
    DEFAULTS: DEFAULTS,
    ITEMS: ITEMS,
    MODES: MODES,
    plan: plan,
    itemFor: itemFor,
    serviceGap: serviceGap,
    settingsOf: settingsOf,
    setting: setting,
    addDays: addDays,
    addMonthsDate: addMonthsDate,
    itemsOf: itemsOf,
    readings: readings,
    latest: latest,
    kmPerDay: kmPerDay,
    odoNow: odoNow,
    fills: fills,
    economy: economy,
    fuelSpent: fuelSpent,
    litresFor: litresFor,
    fuelFor: fuelFor,
    lastDone: lastDone,
    dueOf: dueOf,
    schedule: schedule,
    baseCost: baseCost,
    itemCost: itemCost,
    visits: visits,
    maintenanceFor: maintenanceFor,
    finance: finance,
    dates: dates,
    DATES: DATES,
    alerts: alerts,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = CarCalc;
  else root.CarCalc = CarCalc;
})(typeof window !== "undefined" ? window : this);
