/*
 * Bank SMS: reading them, and deciding what each one means for the books.
 * No screens here, so it can be tested on real messages.
 *
 * A message arrives in the "sms" table (text, sender, and the hub's ts as
 * the time it arrived). read() turns its text into facts; decide() says what
 * to do with it, given the accounts, envelopes, what the app has learned
 * about merchants, the subscriptions list, payments and Household trips.
 *
 * Accounts are found by the numbers in the message: each account lists, in
 * its "sms" field, the last 4 digits of its account and cards, and for a
 * wallet whose messages carry no number, the wallet's name (barq).
 */
(function (root) {
  "use strict";

  var Calc = root.Calc || (typeof require === "function" ? require("./calc.js") : null);

  /* ---------------------------------------------------------------- */
  /*  text                                                             */
  /* ---------------------------------------------------------------- */

  var MARKS = new RegExp("[" + [0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069, 0x061c].map(function (c) { return String.fromCharCode(c); }).join("") + "]", "g");

  /** Arabic digits to Latin, direction marks out, spaces tidied, line breaks kept. */
  function clean(text) {
    return String(text || "")
      .replace(MARKS, "")
      .replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
      .replace(/[۰-۹]/g, function (d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); })
      .replace(/٫/g, ".")
      .replace(/\r/g, "")
      .replace(/[ \t ]+/g, " ")
      .split("\n")
      .map(function (l) { return l.trim(); })
      .filter(String)
      .join("\n");
  }

  /** Lower case, Arabic letter forms unified, only letters and digits. */
  function bare(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[ً-ْـ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  var BANKS = [
    ["rajhi", /rajhi|الراجحي/i],
    ["snb", /snb|ahli|الاهلي|الأهلي/i],
    ["alinma", /alinma|الانماء|الإنماء/i],
    ["sab", /^sab$|sabb|saudi awwal|الاول|الأول/i],
    ["stc", /stc/i],
    ["urpay", /urpay/i],
    ["barq", /barq|برق/i],
    ["anb", /anb|العربي/i],
  ];

  function bankOf(sender) {
    var s = String(sender || "").trim();
    for (var i = 0; i < BANKS.length; i++) if (BANKS[i][1].test(s)) return BANKS[i][0];
    return "";
  }

  /** When the sender did not come through, the way a message is written says which bank it is. */
  function guessBank(t) {
    if (/بـ:\s*SAR|الحساب:\s*\d{4}|^شراء-POS/m.test(t)) return "anb";
    if (/حوالة بين حساباتك|سداد فاتورة|بطاقة فيزا\s*:\s*سداد|عبر:\d{4};مدى/.test(t)) return "rajhi";
    if (/إلى:\s*urpay|عبر:\d{4};\s*(فيزا|مدى);|بطاقة:\d{4};Apple Pay;/.test(t)) return "urpay";
    if (/mada\(Apple Pay\)|\(سريع\)|للأول/.test(t)) return "sab";
    if (/من\d{4};(مدى|فيزا)|لحسابك/.test(t)) return "stc";
    if (/البطاقة:\s*\*\*\d{4}\s*,|لدى[^\n]*\n?\s*\d{4}-\d{2}-\d{2}|رصيد[\d.]+\n?لدى/.test(t)) return "barq";
    if (/مدى-\s*ApplePay|حوالة واردة محلية/.test(t)) return "alinma";
    if (/رواتب|حوالة صادرة محلية|حساب\s*\*\d{4}|مدى-ابل \*\d{4}/.test(t)) return "snb";
    return "";
  }

  /* ---------------------------------------------------------------- */
  /*  reading one message                                              */
  /* ---------------------------------------------------------------- */

  var NUM = "([0-9][0-9,]*(?:\\.[0-9]+)?)";
  var CUR = "(?:SAR|SR|ر\\.?\\s?س|ريال)";

  function toNumber(s) {
    return Math.round(Number(String(s).replace(/,/g, "")) * 100) / 100;
  }

  /** The amount: the first sum of money in the message that is not the balance. */
  function amountOf(t) {
    var found = [];
    var re1 = new RegExp(CUR + "\\s*:?\\s*" + NUM, "g");
    var re2 = new RegExp(NUM + "\\s*" + CUR, "g");
    var m;
    while ((m = re1.exec(t))) found.push({ at: m.index, v: m[1] });
    while ((m = re2.exec(t))) found.push({ at: m.index, v: m[1] });
    found.sort(function (a, b) { return a.at - b.at; });
    for (var i = 0; i < found.length; i++) {
      var before = t.slice(Math.max(0, found[i].at - 10), found[i].at);
      if (/رصيد/.test(before)) continue;
      return toNumber(found[i].v);
    }
    return null;
  }

  function balanceOf(t) {
    var m = t.match(new RegExp("رصيد\\s*:?\\s*" + CUR + "?\\s*" + NUM));
    return m ? toNumber(m[1]) : null;
  }

  /*
   * Numbers: the last 4 digits right after a word that says what they are.
   * "to" words: ل*1234, لـ1234, الى:1234, إلى: 1234. Everything else is
   * where the money came from: بطاقة *1234, عبر:1234, من1234, حساب*1234 ...
   */
  function numbersOf(t) {
    var out = { from: [], to: [] };
    /* a label only counts as a whole word: the ل at the end of ابل is not "to" */
    var re = /(^|[^\p{L}])(بطاقة|البطاقة|عبر|من|حساب|الحساب|آيبان|ايبان|mada|Mada|مدى|ابل|باي|الى|إلى|لـ|ل)[ \t]*[:\-،,]?[ \t]*ـ?[ \t]*\**[ \t]*(\d{4})(?!\d)/gu;
    var m;
    while ((m = re.exec(t))) {
      var to = /^(الى|إلى|لـ|ل)$/.test(m[2]);
      var list = to ? out.to : out.from;
      if (list.indexOf(m[3]) < 0) list.push(m[3]);
    }
    return out;
  }

  /* where the money went: the line that starts with لدى, لـ, ل or من followed by a name */
  function merchantOf(t) {
    var lines = t.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^(?:لدى|لـ|ل|من)\s*:?\s*\**\s*\.*\s*(.+)$/);
      if (!m) continue;
      var v = m[1].trim();
      if (/^\d/.test(v) || /^(مدى|فيزا|apple|ابل)/i.test(v)) continue;
      v = v.replace(/\s*(مدى|فيزا)[\s\S]*$/, "").replace(/^\.+/, "").trim();
      if (/[A-Za-z؀-ۿ]/.test(v)) return v;
    }
    /* all on one line: "... لدى durat 2026-10-24" */
    var one = t.replace(/\n/g, " ").match(/(?:لدى|لـ|من)\s*:?\s*\**\.*\s*([A-Za-z][A-Za-z0-9 .&'-]*?)\s*(?=\d{1,4}[-\/:]|في\s|$)/);
    return one ? one[1].trim() : "";
  }

  function billerOf(t) {
    var m = t.match(/الخدمة\s*:?\s*([^\n]+)/);
    return m ? m[1].replace(/الفاتورة.*$/, "").trim() : "";
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function validDate(y, m, d) {
    if (y < 100) y += 2000;
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2020 || y > 2099) return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) return null;
    return y + "-" + pad(m) + "-" + pad(d);
  }

  /*
   * The date. Banks write it many ways (2026-10-24, 24-10-2026, 30-09-26,
   * 25/10/26, and Al Rajhi also 26/10/25 for 25 Oct 2026), so every
   * reading that makes sense is tried and the one closest to the day the
   * message arrived wins.
   */
  function dateOf(t, arrived) {
    var re = /(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})/g;
    var m;
    var options = [];
    while ((m = re.exec(t))) {
      var a = Number(m[1]);
      var b = Number(m[2]);
      var c = Number(m[3]);
      if (m[1].length === 4) options.push(validDate(a, b, c));
      else if (m[3].length === 4) options.push(validDate(c, b, a));
      else {
        options.push(validDate(c, b, a));
        options.push(validDate(a, b, c));
      }
    }
    options = options.filter(Boolean);
    if (!options.length) return arrived || "";
    if (!arrived) return options[0];
    options.sort(function (x, y) {
      return Math.abs(Calc.daysBetween(x, arrived)) - Math.abs(Calc.daysBetween(y, arrived));
    });
    return options[0];
  }

  function typeOf(t) {
    if (/تم دخولك|رمز التحقق|رمز الدخول لمرة|كلمة المرور|تمت (ا|إ)ضافة المستفيد|OTP/i.test(t)) return "ignore";
    if (/رواتب|راتب/.test(t)) return "salary";
    if (/حوالة بين حساباتك/.test(t)) return "own_transfer";
    if (/سداد فاتورة/.test(t)) return "bill";
    if (/بطاقة\s*(فيزا|ائتمانية|ماستركارد)?\s*:?\s*سداد/.test(t)) return "card_payment";
    if (/حوالة\s*(داخلية|محلية|دولية)?\s*صادرة/.test(t)) return "transfer_out";
    if (/حوالة\s*(داخلية|محلية)?\s*واردة|(ا|إ)يداع حوالة/.test(t)) return "transfer_in";
    if (/(ا|إ)ضافة\s*(ال)?(ا|أ)موال/.test(t)) return "topup";
    if (/استرداد|مرتجع|refund/i.test(t)) return "refund";
    if (/سحب/.test(t)) return "withdrawal";
    if (/شراء|دفع/.test(t)) return /انترنت|إنترنت|internet|online/i.test(t) ? "online" : "purchase";
    return "unknown";
  }

  /** The facts in one message. `arrived` is the day it reached the hub (YYYY-MM-DD). */
  function read(text, sender, arrived) {
    var t = clean(text);
    var bank = bankOf(sender) || guessBank(t);
    var type = typeOf(t);
    var nums = numbersOf(t);
    var time = (t.match(/(\d{1,2}):(\d{2})/) || [])[0] || "";
    var out = {
      bank: bank,
      type: type,
      amount: amountOf(t),
      balance: balanceOf(t),
      date: dateOf(t, arrived),
      time: time,
      from: nums.from,
      to: nums.to,
      merchant: type === "bill" ? "" : merchantOf(t),
      biller: type === "bill" ? billerOf(t) : "",
      text: t,
    };
    /* an incoming transfer's "account" is the one it arrived in; a card repayment's card is where it went */
    if (type === "transfer_in" && !out.to.length && out.from.length) {
      var acctNum = (t.match(/حساب\s*\**\s*(\d{4})/) || [])[1];
      if (acctNum) {
        out.to = [acctNum];
        out.from = out.from.filter(function (n) { return n !== acctNum; });
      }
    }
    if (type === "card_payment" && !out.to.length) {
      out.to = out.from;
      out.from = [];
    }
    return out;
  }

  /* ---------------------------------------------------------------- */
  /*  accounts                                                         */
  /* ---------------------------------------------------------------- */

  function tokens(a) {
    return bare(a.sms || "").split(" ").filter(String);
  }

  function accountByNumber(accounts, n) {
    return accounts.filter(function (a) { return tokens(a).indexOf(n) >= 0; })[0] || null;
  }

  /* a wallet whose messages have no number: the account that lists the wallet's name */
  function accountByName(accounts, name) {
    var b = bare(name);
    if (!b) return null;
    var hits = accounts.filter(function (a) {
      return tokens(a).some(function (tk) { return !/^\d+$/.test(tk) && (b === tk || b.indexOf(tk + " ") === 0 || b.split(" ")[0] === tk); });
    });
    return hits.length === 1 ? hits[0] : null;
  }

  var WALLETS = /^(barq|urpay|stc ?bank|stc ?pay|برق)\b/i;

  /* ---------------------------------------------------------------- */
  /*  deciding                                                         */
  /* ---------------------------------------------------------------- */

  function near(a, b, days) {
    return a && b && Math.abs(Calc.daysBetween(String(a).slice(0, 10), String(b).slice(0, 10))) <= days;
  }

  function same(a, b) {
    return Math.abs(Number(a) - Number(b)) < 0.01;
  }

  function isPayday(date) {
    return Calc.range(Calc.monthOf(date)).start === date;
  }

  var BILLERS = [
    [/مياه|water/i, "water"],
    [/كهرباء|electric/i, "electricity"],
    [/الاتصالات|stc/i, "stc"],
    [/موبايلي|mobily/i, "mobily"],
    [/زين|zain/i, "zain"],
    [/جوي|jawwy|jawway/i, "jawway"],
  ];

  function billerEnv(biller, envs) {
    for (var i = 0; i < BILLERS.length; i++) {
      if (!BILLERS[i][0].test(biller)) continue;
      var word = BILLERS[i][1];
      var e = envs.filter(function (x) { return bare(x.name).indexOf(word) >= 0 || bare(x.id) === word; })[0];
      if (e) return e;
    }
    return null;
  }

  /** What the app has learned: a merchant on an account, a biller, or a transfer number, to an envelope. */
  function memoryKey(kind, acct, name) {
    if (kind === "biller") return "biller|" + bare(name);
    if (kind === "to") return "to|" + name;
    return (acct || "") + "|" + bare(name);
  }

  /**
   * What one message means.
   * ctx: { accounts, envs, ignore (numbers not tracked), memory ({ key: env or "sub:<id>" }),
   *        subs, payments, trips, others (other messages already read), closed(month), now (ISO) }
   * Returns { status, ... } where status is one of:
   *   ignored   nothing to do (logins, salary, a card outside the books)
   *   move      between your own accounts; on payday nothing to log
   *   post      a new payment: { payment }
   *   match     already in the books: { ref }, maybe with { postTrip }
   *   update    a bill or subscription posted by itself, now with the real amount: { ref, amount }
   *   waiting   held a while for a Household trip to match it
   *   review    needs you: { reason, ... }
   *   unread    could not read it
   */
  function decide(sms, p, ctx) {
    var accounts = ctx.accounts || [];
    var envs = ctx.envs || [];
    var ignore = ctx.ignore || [];
    var memory = ctx.memory || {};
    var amount = p.amount;
    var date = p.date;
    var month = date ? Calc.monthOf(date) : "";

    if (p.type === "ignore") return { status: "ignored", why: "notice" };
    if (p.type === "salary") return { status: "ignored", why: "salary" };
    if (p.type === "unknown" || !(amount > 0) || !date) return { status: "unread" };

    var fromNum = p.from[0] || "";
    var toNum = p.to[0] || "";
    var srcIgnored = fromNum && ignore.indexOf(fromNum) >= 0;
    var dstIgnored = toNum && ignore.indexOf(toNum) >= 0;
    var src = fromNum ? accountByNumber(accounts, fromNum) : null;
    var dst = toNum ? accountByNumber(accounts, toNum) : null;
    /* messages from a wallet with no number belong to that wallet */
    var walletAcct = accountByName(accounts, p.bank);
    if (!src && !fromNum && (p.type === "purchase" || p.type === "online" || p.type === "refund" || p.type === "withdrawal")) src = walletAcct;
    if (!dst && !toNum && (p.type === "topup" || p.type === "transfer_in")) dst = walletAcct;
    if (!dst && p.type === "transfer_out" && !toNum && walletAcct) dst = null;
    /* SNB's own account is not in its transfer messages: one account at the sending bank */
    if (!src && !fromNum && p.type === "transfer_out") src = walletAcct;

    function link(num) {
      return { status: "review", reason: "link", number: num };
    }

    function moveOrReview(from, to) {
      return { status: "move", from: from ? from.id : "", to: to ? to.id : "", payday: isPayday(date) };
    }

    if (ctx.closed && ctx.closed(month)) return { status: "review", reason: "closed" };

    switch (p.type) {
      case "own_transfer":
        if (fromNum && !src && !srcIgnored) return link(fromNum);
        if (toNum && !dst && !dstIgnored) return link(toNum);
        return moveOrReview(src, dst);

      case "card_payment":
        if (dstIgnored) return { status: "ignored", why: "untracked" };
        if (!dst) return link(toNum);
        return moveOrReview(null, dst);

      case "topup": {
        if (fromNum && !src && !srcIgnored) return link(fromNum);
        if (src || srcIgnored) return moveOrReview(src, dst);
        /* no number for where it came from: a matching payment out of another of your accounts the same day */
        var pair = (ctx.others || []).filter(function (o) {
          return o.date === date && (o.status === "move" || o.status === "move-ok") && (same(o.amount, amount) || (o.amount > amount && o.amount - amount <= 1));
        })[0];
        if (pair) return moveOrReview(null, dst);
        return { status: "review", reason: "money-in", acct: dst ? dst.id : "" };
      }

      case "transfer_in": {
        if (toNum && !dst && !dstIgnored) return link(toNum);
        if (src) return moveOrReview(src, dst);
        var twin = (ctx.others || []).filter(function (o) {
          return o.date === date && (o.status === "move" || o.status === "move-ok") && o.amount >= amount && o.amount - amount <= 1;
        })[0];
        if (twin) return moveOrReview(null, dst);
        return { status: "review", reason: "money-in", acct: dst ? dst.id : "" };
      }

      case "transfer_out": {
        if (!src && fromNum && !srcIgnored) return link(fromNum);
        if (dst) return moveOrReview(src, dst);
        var known = memory[memoryKey("to", "", toNum)];
        if (known && envs.some(function (e) { return e.id === known; })) {
          return { status: "post", payment: payment(sms, src, known, amount, date, "Transfer to " + toNum, "spend") };
        }
        return { status: "review", reason: "spend", acct: src ? src.id : "", key: memoryKey("to", "", toNum), what: "Transfer to " + toNum };
      }

      case "bill": {
        if (fromNum && !src && !srcIgnored) return link(fromNum);
        var be = memory[memoryKey("biller", "", p.biller)];
        var e = be ? envs.filter(function (x) { return x.id === be; })[0] : billerEnv(p.biller, envs);
        if (!e) return { status: "review", reason: "spend", acct: src ? src.id : "", key: memoryKey("biller", "", p.biller), what: p.biller };
        if (e.kind === "bill") {
          var bid = Calc.billId(month, e.id);
          var existing = (ctx.payments || []).filter(function (x) { return x.id === bid && !x.del; })[0];
          if (existing) return { status: "update", ref: bid, amount: amount, was: Number(existing.amount), env: e.id };
          return { status: "post", payment: Object.assign(payment(sms, src, e.id, amount, date, p.biller, "bill"), { id: bid }) };
        }
        return { status: "post", payment: payment(sms, src, e.id, amount, date, p.biller, "spend") };
      }

      case "purchase":
      case "online":
      case "withdrawal":
      case "refund": {
        if (srcIgnored) return { status: "ignored", why: "untracked" };
        if (!src) return fromNum ? link(fromNum) : { status: "review", reason: "link-bank", bank: p.bank };
        /* paying a wallet of yours with a card is a move, not spending */
        if (p.type !== "refund" && WALLETS.test(p.merchant)) {
          return moveOrReview(src, accountByName(accounts, p.merchant.split(" ")[0]));
        }
        var dir = p.type === "refund" ? "income" : "spend";
        var held = envs.filter(function (x) { return x.home_acct === src.id && x.kind !== "remaining" && x.active !== "no"; });
        var heldIds = held.map(function (x) { return x.id; });

        /* a subscription on the list */
        if (dir === "spend") {
          var sub = matchSub(p.merchant, ctx.subs || [], memory);
          if (sub) {
            /* the whole envelope was paid in one go this month, before the list existed */
            var bulk = Calc.billId(month, sub.env);
            if ((ctx.payments || []).some(function (x) { return x.id === bulk && !x.del; })) return { status: "match", ref: bulk, sub: sub.id };
            var sid = "sub-" + month + "-" + sub.id;
            var sp = (ctx.payments || []).filter(function (x) { return x.id === sid && !x.del; })[0];
            var flag = same(sub.amount, amount) ? "" : "price";
            if (sp) return { status: "update", ref: sid, amount: amount, was: Number(sp.amount), env: sub.env, sub: sub.id, flag: flag };
            return { status: "post", payment: Object.assign(payment(sms, src, sub.env, amount, date, sub.name, "spend"), { id: sid, sub: sub.id }), sub: sub.id, flag: flag };
          }
        }

        /* already in the books: logged by hand or posted from Household */
        var linked = ctx.linked || {};
        var found = (ctx.payments || []).filter(function (x) {
          if (x.del || linked[x.id] || x.source === "sms") return false;
          var inAcct = x.acct === src.id || heldIds.indexOf(x.env) >= 0;
          return inAcct && same(Math.abs(Number(x.amount)), amount) && near(Calc.dateOf(x), date, 2);
        })[0];
        if (found) return { status: "match", ref: found.id };

        /* a Household trip paid with this account's card */
        var trip = (ctx.trips || []).filter(function (tr) {
          return tr.status === "done" && tr.budget !== "skipped" && same(tr.total, amount) && near(tr.date, date, 1) && (heldIds.indexOf(tr.env) >= 0 || !tr.env);
        })[0];
        if (trip) {
          if (trip.budget === "posted") return { status: "match", ref: trip.budget_ref };
          var tenv = trip.env && heldIds.indexOf(trip.env) >= 0 ? trip.env : heldIds.length === 1 ? heldIds[0] : "";
          if (tenv) return { status: "match", ref: "trip-" + trip.id, postTrip: { trip: trip.id, env: tenv, acct: src.id } };
        }

        /* learned before */
        var mem = memory[memoryKey("merchant", src.id, p.merchant)];
        if (mem && envs.some(function (x) { return x.id === mem; })) {
          return { status: "post", payment: payment(sms, src, mem, dir === "income" ? -amount : amount, date, p.merchant, dir) };
        }

        /* the envelopes shared with Household wait a while for her trip */
        var household = held.filter(function (x) { return x.household === "yes"; });
        if (household.length && dir === "spend" && !sms.force && ctx.now && hoursSince(sms.ts, ctx.now) < 12) return { status: "waiting" };

        if (held.length === 1 && p.type !== "withdrawal") {
          return { status: "post", payment: payment(sms, src, held[0].id, dir === "income" ? -amount : amount, date, p.merchant, dir) };
        }
        return { status: "review", reason: dir === "income" ? "money-in" : "spend", acct: src.id, key: memoryKey("merchant", src.id, p.merchant), what: p.merchant || (p.type === "withdrawal" ? "Cash" : "") };
      }
    }
    return { status: "unread" };
  }

  function hoursSince(ts, now) {
    if (!ts) return 0;
    return (Date.parse(now) - Date.parse(ts)) / 3600000;
  }

  function matchSub(merchant, subs, memory) {
    var b = bare(merchant);
    if (!b) return null;
    var viaMemory = memory["sub|" + b];
    var list = subs.filter(function (s) { return s.active !== "no" && !s.del; });
    if (viaMemory) {
      var m = list.filter(function (s) { return s.id === viaMemory; })[0];
      if (m) return m;
    }
    return list.filter(function (s) {
      var words = bare(s.merchant || s.name);
      return words && (b.indexOf(words) >= 0 || words.indexOf(b) >= 0);
    })[0] || null;
  }

  function payment(sms, acct, env, amount, date, note, kind) {
    return {
      id: "sms-" + sms.id,
      date: date,
      env: env,
      acct: acct ? acct.id : "",
      amount: amount,
      label: "",
      note: note || "",
      kind: kind === "income" ? "income" : kind === "bill" ? "bill" : "spend",
      source: "sms",
    };
  }

  /** A row id for a memory key (row ids are letters, digits, - and _ only). */
  function memoryId(key) {
    var h = 0x811c9dc5;
    var str = String(key);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return "m" + h.toString(36) + "-" + str.length;
  }

  var Sms = {
    memoryId: memoryId,
    clean: clean,
    bare: bare,
    bankOf: bankOf,
    guessBank: guessBank,
    read: read,
    decide: decide,
    memoryKey: memoryKey,
    accountByNumber: accountByNumber,
    accountByName: accountByName,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Sms;
  else root.Sms = Sms;
})(typeof window !== "undefined" ? window : this);
