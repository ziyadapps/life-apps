/*
 * Family: the family tree, shared with the family. Everyone with a key can
 * browse; family members' keys send suggestions, and the owner's key (full)
 * edits and accepts them. The logic lives in tree.js; this file draws the
 * screens. Arabic only.
 */
(function () {
  "use strict";

  var h = Kit.h;
  var T = window.FTree;
  var ME_KEY = "lifeapps.family.me";
  var RECENT_KEY = "lifeapps.family.recent";
  var TABLES = ["people", "families", "marriages", "notes", "suggestions"];

  var S = { hub: null, main: null, ix: null, sig: "", open: {}, keep: {} };

  /* ---------------------------------------------------------------- */
  /*  data                                                             */
  /* ---------------------------------------------------------------- */

  function owner() {
    return Kit.who().mode !== "suggest";
  }

  function rows(t) {
    return S.hub.all(t);
  }

  /** The index, rebuilt only when the data changed. */
  function ix() {
    var sig = S.hub.rev + "|" + S.hub.cursor + "|" + Object.keys(S.hub.tables.people || {}).length;
    if (!S.ix || sig !== S.sig) {
      S.ix = T.build(rows("people"), rows("marriages"));
      S.sig = sig;
    }
    return S.ix;
  }

  function person(id) {
    return ix().p[id] || null;
  }

  function families() {
    return rows("families");
  }

  function familyName(id) {
    var f = families().filter(function (x) { return x.id === (id || "main"); })[0];
    return f ? f.name : "";
  }

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
    return null;
  }

  function meId() {
    var id = store(ME_KEY);
    return id && person(id) ? id : "";
  }

  function remember(id) {
    var list = (store(RECENT_KEY) || []).filter(function (x) { return x !== id; });
    list.unshift(id);
    store(RECENT_KEY, list.slice(0, 10));
  }

  function newId() {
    return "p_" + Hub.newId().slice(0, 10);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function digits(n) {
    return String(n);
  }

  /* ---------------------------------------------------------------- */
  /*  pieces                                                           */
  /* ---------------------------------------------------------------- */

  function back(path, label) {
    return h("a", { class: "back", href: "#" + (path || "/") }, "‹ " + (label || "رجوع"));
  }

  function title(text, lead) {
    return [h("h1", { class: "page-title" }, text), lead ? h("p", { class: "note" }, lead) : null];
  }

  function section(name, kids, attrs) {
    return h("section", Object.assign({ class: "section" }, attrs || {}), name ? h("h2", { class: "section-title" }, name) : null, kids);
  }

  function field(label, input, hint) {
    return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input, hint ? h("span", { class: "note" }, hint) : null);
  }

  function group(label, kids) {
    return h("div", { class: "field", role: "group", "aria-label": label }, h("span", { class: "field-label" }, label), kids);
  }

  function input(value, attrs) {
    return h("input", Object.assign({ class: "field-input", type: "text", autocomplete: "off", value: value === undefined || value === null ? "" : String(value) }, attrs || {}));
  }

  function chips(label, options, value, attrs) {
    var state = { value: value || "" };
    var wrap = h("div", Object.assign({ class: "chips", role: "group", "aria-label": label }, attrs || {}));
    function paint() {
      Kit.clear(wrap);
      options.forEach(function (o) {
        wrap.appendChild(h("button", { type: "button", class: "chip", "data-value": o.value, "aria-pressed": state.value === o.value ? "true" : "false", onclick: function () { state.value = o.value; paint(); } }, o.label));
      });
    }
    paint();
    return { el: wrap, get: function () { return state.value; } };
  }

  function levelText(id) {
    var p = person(id);
    var g = p && p.gen !== "" && p.gen !== null && p.gen !== undefined ? Number(p.gen) : null;
    var l = T.level(ix(), id);
    if (l === null) return "";
    if (l < 1) return "من أجداد الأسرة";
    return "الجيل " + digits(l) + (g === null ? " (محسوب)" : "");
  }

  /** A person as a row: name with father and grandfather, how they are related to me, the level. */
  function personRow(id, opts) {
    opts = opts || {};
    var p = person(id);
    if (!p) return null;
    var me = meId();
    var rel = me && id !== me ? T.relate(ix(), me, id) : null;
    var sub = [opts.sub || "", rel ? rel.term : id === me ? "أنت" : "", opts.noLevel ? "" : levelText(id)].filter(String).join(" · ");
    var attrs = { class: "row-link person" + (p.alive === "no" ? " gone" : ""), "data-person": id };
    var main = h("div", { class: "row-main" }, h("span", { class: "row-title" }, T.nameChain(ix(), id, opts.names || 4)), sub ? h("span", { class: "row-sub" }, sub) : null);
    if (opts.onPick) {
      attrs.type = "button";
      attrs.onclick = function () { opts.onPick(id); };
      return h("button", attrs, main);
    }
    attrs.href = "#/p/" + id;
    return h("a", attrs, main, opts.right || null);
  }

  function list(ids, opts) {
    var el = h("div", { class: "list" });
    if (!ids.length) el.appendChild(h("div", { class: "empty" }, (opts && opts.empty) || "لا أحد"));
    ids.forEach(function (id) { el.appendChild(personRow(id, opts)); });
    return el;
  }

  /**
   * A search box with results under it. onPick, when given, makes each
   * result a choice instead of a link. filter limits who is offered.
   */
  function searchBox(opts) {
    opts = opts || {};
    var box = h("input", { class: "field-input search-input", type: "search", placeholder: opts.placeholder || "ابحث: الاسم ثم اسم الأب ثم الجد", autocomplete: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "search", id: opts.id || null, "aria-label": "بحث" });
    var results = h("div", { class: "results" });
    var timer = null;
    function paint() {
      Kit.clear(results);
      var q = box.value.trim();
      if (!q) {
        if (opts.onEmpty) opts.onEmpty(results);
        return;
      }
      var ids = T.search(ix(), q, 200, families());
      if (opts.filter) ids = ids.filter(opts.filter);
      var total = ids.length;
      ids = ids.slice(0, 40);
      results.appendChild(list(ids, { onPick: opts.onPick, empty: "لا نتائج. جرّب الاسم ثم اسم الأب." }));
      if (total > ids.length) results.appendChild(h("p", { class: "note" }, "أول " + ids.length + " من " + total + ". أضف اسم الأب لتضييق البحث."));
    }
    box.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(paint, 90);
    });
    setTimeout(paint, 0);
    return { el: h("div", { class: "search" }, box, results), box: box, paint: paint };
  }

  function msgLine() {
    return h("p", { class: "form-error", role: "alert" });
  }

  /** Which of my grandfathers someone is, counting up from me. */
  function ancestorWord(a) {
    return ["", "أبوك", "جدك", "جد أبيك", "جد جدك"][a] || "جدك " + a + " أجيال فوقك";
  }

  /* "عمك" said about someone else: "عم فلان"; "عمتك": "عمة فلان" */
  function aboutSomeone(term, who) {
    if (term === "أنت") return "نفسه";
    return term
      .replace(/(عم|زوج|حفيد)تك(?=\s|$)/g, "$1ة " + who)
      .replace(/ك(?=\s|$)/g, " " + who);
  }

  /* ---------------------------------------------------------------- */
  /*  home                                                             */
  /* ---------------------------------------------------------------- */

  function viewHome(main) {
    if (!rows("people").length) {
      main.appendChild(h("div", { class: "empty-state" },
        h("p", null, owner() ? "الشجرة فاضية. أدخل نسختك من التطبيق القديم من صفحة البيانات." : "جاري تحميل الشجرة…"),
        owner() ? h("a", { class: "btn btn-primary", href: "#/data" }, "البيانات") : null));
      return;
    }
    var me = meId();
    var s = searchBox({
      id: "home-search",
      onEmpty: function (el) {
        var recent = (store(RECENT_KEY) || []).filter(function (id) { return person(id); });
        if (recent.length) el.appendChild(section("آخر من فتحت", list(recent.slice(0, 8))));
      },
    });
    main.appendChild(s.el);
    if (me) {
      main.appendChild(h("a", { class: "me-card", href: "#/p/" + me }, h("span", { class: "note" }, "أنت"), h("span", { class: "row-title" }, T.nameChain(ix(), me, 4))));
    } else {
      main.appendChild(h("a", { class: "me-card ask", href: "#/me" }, h("span", { class: "row-title" }, "من أنت في الشجرة؟"), h("span", { class: "note" }, "اختر نفسك لتظهر صلة كل شخص بك")));
    }
    var pending = rows("suggestions").filter(function (x) { return x.status === "pending"; });
    var tiles = [
      ["#/tree", "الشجرة", "افتحها فرعا فرعا"],
      ["#/rel", "صلة القرابة", "كيف يقرب شخص لآخر"],
    ];
    if (owner()) {
      tiles.push(["#/inbox", "الاقتراحات", pending.length ? pending.length + " بانتظارك" : "لا جديد"]);
      tiles.push(["#/link", "الربط", "من لم يُربط بأبيه"]);
      tiles.push(["#/check", "الفحص", "مطابقة الروابط مع الشجرة المطبوعة"]);
      tiles.push(["#/data", "البيانات", "الإدخال والنسخ والأعداد"]);
    } else {
      var mine = pending.filter(function (x) { return x.by === Kit.who().name; }).length;
      tiles.push(["#/mine", "اقتراحاتي", mine ? mine + " قيد المراجعة" : "ما أرسلته"]);
    }
    tiles.push(["#/families", "العائلات", "الأسر والزيجات"]);
    tiles.push(["#/settings", "الإعدادات", "أنا، هذا الجهاز"]);
    var grid = h("div", { class: "tiles" });
    tiles.forEach(function (t) {
      grid.appendChild(h("a", { class: "tile" + (t[0] === "#/inbox" && pending.length ? " alert" : ""), href: t[0] }, h("span", { class: "tile-title" }, t[1]), h("span", { class: "tile-sub" }, t[2])));
    });
    main.appendChild(grid);
  }

  function viewMe(main) {
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("من أنت في الشجرة؟", "ابحث عن اسمك واختره. يبقى على هذا الجهاز فقط.")));
    var s = searchBox({ id: "me-search", onPick: function (id) {
      store(ME_KEY, id);
      Kit.toast("أهلا " + person(id).name);
      location.hash = "#/";
    } });
    main.appendChild(s.el);
    setTimeout(function () { s.box.focus(); }, 50);
  }

  /* ---------------------------------------------------------------- */
  /*  a person                                                         */
  /* ---------------------------------------------------------------- */

  function viewPerson(main, id) {
    var x = ix();
    var p = person(id);
    main.appendChild(back("/", "الرئيسية"));
    if (!p) {
      main.appendChild(h("p", { class: "empty" }, "غير موجود. يمكن أنه حُذف."));
      return;
    }
    remember(id);
    var female = p.gender === "f";
    var full = T.nameChain(x, id);
    var short = T.nameChain(x, id, 4);
    var chainEl = h("p", { class: "chain" }, short);
    if (full !== short) {
      chainEl = h("button", { type: "button", class: "chain", "aria-expanded": "false", onclick: function () {
        var open = chainEl.getAttribute("aria-expanded") === "true";
        chainEl.textContent = open ? short + " …" : full;
        chainEl.setAttribute("aria-expanded", open ? "false" : "true");
      } }, short + " …");
    }
    main.appendChild(h("div", { class: "person-head" },
      h("h1", { class: "page-title" }, p.name + (p.alive === "no" ? (female ? " رحمها الله" : " رحمه الله") : "")),
      p.known ? h("p", { class: "known" }, p.known) : null,
      chainEl));

    var me = meId();
    if (me && me !== id) {
      var rel = T.relate(x, me, id);
      if (rel) {
        var via = person(rel.via);
        main.appendChild(h("div", { class: "rel-card" },
          h("span", { class: "rel-term" }, rel.term),
          via && rel.a > 0 && rel.b > 0 ? h("a", { class: "note", href: "#/p/" + via.id }, "يلتقي معك في " + T.nameChain(x, via.id, 2) + "، " + ancestorWord(rel.a)) : null,
          h("a", { class: "note", href: "#/rel?a=" + me + "&b=" + id }, "التفاصيل")));
      } else {
        main.appendChild(h("p", { class: "note" }, "لا يظهر رابط بينك وبينه في الشجرة حتى الآن."));
      }
    }

    var facts = h("div", { class: "list facts" });
    function fact(label, value) {
      if (value) facts.appendChild(h("div", { class: "row" }, h("span", { class: "row-sub" }, label), h("span", { class: "row-title" }, value)));
    }
    fact("الجيل", levelText(id));
    fact("الأسرة", p.family && p.family !== "main" ? familyName(p.family) : "");
    fact("الميلاد", p.born);
    fact("الوفاة", p.died);
    fact("المكان", p.place);
    if (facts.children.length) main.appendChild(facts);
    if (p.about) main.appendChild(section("عنه", h("p", { class: "about" }, p.about)));

    var father = p.father && person(p.father);
    var mother = p.mother && person(p.mother);
    var fam = [];
    if (father) fam.push(personRow(father.id, { sub: "الأب", names: 3, noLevel: true }));
    if (mother) fam.push(personRow(mother.id, { sub: "الأم", names: 3, noLevel: true }));
    (x.spouses[id] || []).forEach(function (s) { fam.push(personRow(s.id, { sub: female ? "الزوج" : "الزوجة", names: 3, noLevel: true })); });
    if (fam.length) main.appendChild(section("الأهل", h("div", { class: "list" }, fam)));

    var siblings = father ? (x.kids[father.id] || []).filter(function (k) { return k !== id; }) : [];
    var bros = siblings.filter(function (k) { return person(k).gender !== "f"; });
    var sis = siblings.filter(function (k) { return person(k).gender === "f"; });
    if (bros.length) main.appendChild(section("الإخوة (" + bros.length + ")", list(bros, { names: 1, noLevel: true })));
    if (sis.length) main.appendChild(section("الأخوات (" + sis.length + ")", list(sis, { names: 1, noLevel: true })));
    var kids = x.kids[id] || [];
    var sons = kids.filter(function (k) { return person(k).gender !== "f"; });
    var daughters = kids.filter(function (k) { return person(k).gender === "f"; });
    if (sons.length) main.appendChild(section("الأبناء (" + sons.length + ")", list(sons, { names: 1, noLevel: true, sub: "" })));
    if (daughters.length) main.appendChild(section("البنات (" + daughters.length + ")", list(daughters, { names: 1, noLevel: true })));
    var d = T.descendants(x, id);
    if (d > kids.length) main.appendChild(h("a", { class: "btn btn-quiet", href: "#/tree/" + id }, "ذريته في الشجرة: " + d));

    /* what people know about him */
    var notes = rows("notes").filter(function (n) { return n.person === id; }).sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : 1; });
    var nl = h("div", { class: "notes" });
    notes.forEach(function (n) {
      nl.appendChild(h("div", { class: "note-card" }, h("p", null, n.text), h("span", { class: "note" }, [n.by, n.date].filter(String).join(" · "))));
    });
    var ta = h("textarea", { class: "field-input", rows: 3, id: "note-text", placeholder: owner() ? "ما تعرفه عنه: من أين، ماذا كان يعمل، قصة…" : "ما تعرفه عنه. يصل لصاحب الشجرة ليضيفه." });
    var nmsg = msgLine();
    main.appendChild(section("ما يُروى عنه", [nl, ta, nmsg, h("button", { type: "button", class: "btn", id: "note-add", onclick: function () {
      var text = ta.value.trim();
      if (!text) { nmsg.textContent = "اكتب المعلومة."; return; }
      if (owner()) {
        S.hub.put("notes", { person: id, text: text, by: Kit.who().name || "", date: today() });
        Kit.toast("أضيفت");
      } else {
        suggest({ kind: "note", target: id, changes: { text: text } });
        Kit.toast("أُرسلت لصاحب الشجرة");
      }
      render();
    } }, owner() ? "أضف" : "أرسل")]));

    var pend = rows("suggestions").filter(function (s) { return s.status === "pending" && (s.target === id || T.parseChanges(s).father === id); });
    if (pend.length) main.appendChild(h("a", { class: "banner", href: owner() ? "#/inbox" : "#/mine" }, pend.length + " اقتراح عنه قيد المراجعة"));

    main.appendChild(h("div", { class: "btn-row actions" },
      h("a", { class: "btn btn-primary", href: "#/edit/" + id }, owner() ? "تعديل" : "اقترح تعديلا"),
      female ? null : h("a", { class: "btn", href: "#/edit/new?father=" + id + "&gender=m" }, owner() ? "أضف ابنا" : "اقترح ابنا"),
      female ? null : h("a", { class: "btn", href: "#/edit/new?father=" + id + "&gender=f" }, owner() ? "أضف بنتا" : "اقترح بنتا"),
      h("a", { class: "btn", href: "#/marry/" + id }, female ? "الزوج" : "زوجة"),
      h("a", { class: "btn btn-quiet", href: "#/tree/" + id }, "في الشجرة"),
      h("a", { class: "btn btn-quiet", href: "#/rel?a=" + id }, "صلته بشخص")));
  }

  /* ---------------------------------------------------------------- */
  /*  suggestions                                                      */
  /* ---------------------------------------------------------------- */

  function suggest(s) {
    S.hub.put("suggestions", { kind: s.kind, target: s.target || "", changes: JSON.stringify(s.changes || {}), note: s.note || "", status: "pending", by: Kit.who().name || "", created: new Date().toISOString(), reply: "", decided: "" });
  }

  var FIELD_NAMES = { name: "الاسم", known: "الكنية أو اللقب", gender: "الجنس", alive: "على قيد الحياة", born: "الميلاد", died: "الوفاة", place: "المكان", about: "عنه", father: "الأب", mother: "الأم", family: "الأسرة", order: "ترتيبه بين إخوته", text: "المعلومة", a: "الزوج", b: "الزوجة", spouse: "الزوج أو الزوجة" };

  function valueText(k, v) {
    if (k === "father" || k === "mother" || k === "a" || k === "b" || k === "spouse") return v && person(v) ? T.nameChain(ix(), v, 4) : v ? "(غير موجود)" : "لا أحد";
    if (k === "gender") return v === "f" ? "أنثى" : "ذكر";
    if (k === "alive") return v === "no" ? "متوفى" : "حي";
    if (k === "family") return familyName(v) || v;
    return v === "" || v === undefined ? "(فارغ)" : String(v);
  }

  var KIND_NAMES = { edit: "تعديل", add: "إضافة شخص", note: "معلومة", marriage: "زواج" };

  function suggestionCard(s, forOwner) {
    var x = ix();
    var c = T.parseChanges(s);
    var target = s.target && person(s.target);
    var head = KIND_NAMES[s.kind] || s.kind;
    var what = target ? T.nameChain(x, target.id, 4) : s.kind === "add" ? c.name + (c.father && person(c.father) ? (c.gender === "f" ? " بنت " : " بن ") + T.nameChain(x, c.father, 3) : "") : "";
    var box = h("div", { class: "card-pad sug", "data-sug": s.id },
      h("div", { class: "sug-head" }, h("span", { class: "row-title" }, head + (what ? ": " + what : "")), h("span", { class: "note" }, [s.by, String(s.created || "").slice(0, 10)].filter(String).join(" · "))));
    var diffs = s.kind === "edit" ? T.diff(x, s) : Object.keys(c).map(function (k) { return { field: k, from: "", to: c[k] }; });
    var tb = h("div", { class: "diff" });
    diffs.forEach(function (d) {
      tb.appendChild(h("div", { class: "diff-row" }, h("span", { class: "diff-field" }, FIELD_NAMES[d.field] || d.field),
        s.kind === "edit" ? h("span", { class: "diff-from" }, valueText(d.field, d.from)) : null,
        h("span", { class: "diff-to" }, valueText(d.field, d.to))));
    });
    if (!diffs.length) tb.appendChild(h("p", { class: "note" }, "لا يغير شيئا."));
    box.appendChild(tb);
    if (s.note) box.appendChild(h("p", { class: "sug-note" }, s.note));
    if (target) box.appendChild(h("a", { class: "note", href: "#/p/" + target.id }, "افتح صفحته"));
    if (s.status !== "pending") {
      box.appendChild(h("p", { class: "note status-" + s.status }, { accepted: "قُبل", rejected: "لم يُقبل", withdrawn: "سُحب" }[s.status] + (s.reply ? ": " + s.reply : "")));
      return box;
    }
    if (forOwner) {
      var reply = input("", { placeholder: "رد (اختياري)", class: "field-input sug-reply" });
      box.appendChild(reply);
      box.appendChild(h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn btn-primary sug-accept", onclick: function () {
          var writes = T.accept(x, s, newId, today());
          writes[writes.length - 1].row.reply = reply.value.trim();
          S.hub.putMany(writes);
          Kit.toast("قُبل الاقتراح");
          render();
        } }, "قبول"),
        Kit.confirmButton("رفض", "اضغط مرة ثانية للرفض", function () {
          S.hub.put("suggestions", { id: s.id, status: "rejected", reply: reply.value.trim(), decided: new Date().toISOString() });
          render();
        }, "btn btn-quiet")));
    } else {
      box.appendChild(h("div", { class: "btn-row" }, Kit.confirmButton("سحب الاقتراح", "اضغط مرة ثانية للسحب", function () {
        S.hub.put("suggestions", { id: s.id, status: "withdrawn" });
        render();
      }, "btn btn-quiet")));
    }
    return box;
  }

  function viewInbox(main) {
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("الاقتراحات", "ما أرسله أفراد العائلة. لا يتغير شيء حتى تقبله.")));
    var all = rows("suggestions").sort(function (a, b) { return String(a.created) < String(b.created) ? -1 : 1; });
    var pending = all.filter(function (s) { return s.status === "pending"; });
    if (!pending.length) main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "لا جديد.")));
    pending.forEach(function (s) { main.appendChild(section(null, suggestionCard(s, true))); });
    var done = all.filter(function (s) { return s.status !== "pending"; }).reverse().slice(0, 30);
    if (done.length) main.appendChild(section("السابقة", done.map(function (s) { return suggestionCard(s, true); })));
  }

  function viewMine(main) {
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("اقتراحاتي", "ما أرسلته لصاحب الشجرة، وما تم فيه.")));
    var mine = rows("suggestions").filter(function (s) { return s.by === Kit.who().name; }).sort(function (a, b) { return String(b.created) < String(a.created) ? -1 : 1; });
    if (!mine.length) main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "لم ترسل شيئا بعد. افتح صفحة أي شخص واقترح.")));
    mine.forEach(function (s) { main.appendChild(section(null, suggestionCard(s, false))); });
  }

  /* ---------------------------------------------------------------- */
  /*  edit or add a person (or suggest it)                             */
  /* ---------------------------------------------------------------- */

  /** A person picker: shows the choice, and a search to change it. */
  function picker(label, value, filter, idAttr) {
    var state = { value: value || "" };
    var shown = h("div", { class: "picked" });
    var area = h("div");
    function paint() {
      Kit.clear(shown);
      Kit.clear(area);
      shown.appendChild(h("span", { class: "row-title" }, state.value && person(state.value) ? T.nameChain(ix(), state.value, 4) : "لا أحد"));
      shown.appendChild(h("button", { type: "button", class: "btn btn-quiet", "data-pick": idAttr, onclick: function () {
        Kit.clear(area);
        var s = searchBox({ filter: filter, onPick: function (id) { state.value = id; paint(); } });
        area.appendChild(s.el);
        s.box.focus();
      } }, "تغيير"));
      if (state.value) shown.appendChild(h("button", { type: "button", class: "btn btn-quiet", onclick: function () { state.value = ""; paint(); } }, "إزالة"));
    }
    paint();
    return { el: group(label, [shown, area]), get: function () { return state.value; } };
  }

  function viewEdit(main, id, query) {
    var isNew = id === "new";
    var p = isNew ? { gender: query.gender === "f" ? "f" : "m", father: query.father || "", alive: "yes", family: query.family || "main" } : person(id);
    if (!p) return main.appendChild(h("p", { class: "empty" }, "غير موجود."));
    var x = ix();
    main.appendChild(back(isNew ? (p.father ? "/p/" + p.father : "/") : "/p/" + id));
    var heading = isNew ? (owner() ? "إضافة شخص" : "اقتراح إضافة") : owner() ? "تعديل" : "اقتراح تعديل";
    main.appendChild(h("div", null, title(heading + (isNew ? "" : ": " + p.name), owner() ? null : "يصل اقتراحك لصاحب الشجرة، ولا يتغير شيء حتى يقبله.")));
    var name = input(p.name, { id: "e-name" });
    var known = input(p.known, { id: "e-known", placeholder: "أبو فلان، أو لقب" });
    var gender = chips("الجنس", [{ value: "m", label: "ذكر" }, { value: "f", label: "أنثى" }], p.gender || "m", { id: "e-gender" });
    var alive = chips("الحال", [{ value: "yes", label: "حي" }, { value: "no", label: "متوفى" }], p.alive || "yes", { id: "e-alive" });
    var born = input(p.born, { id: "e-born", placeholder: "مثل ١٤١٥ أو 1995" });
    var died = input(p.died, { id: "e-died" });
    var place = input(p.place, { id: "e-place" });
    var order = input(p.order, { id: "e-order", inputmode: "numeric", placeholder: "١ للأكبر" });
    var famSel = h("select", { class: "select", id: "e-family" });
    families().forEach(function (f) {
      var o = h("option", { value: f.id }, f.name);
      if (f.id === (p.family || "main")) o.selected = true;
      famSel.appendChild(o);
    });
    var about = h("textarea", { class: "field-input", rows: 3, id: "e-about" });
    about.value = p.about || "";
    var father = picker("الأب", p.father, function (pid) { return person(pid).gender !== "f" && pid !== id && T.chain(x, pid).indexOf(id) < 0; }, "father");
    var mother = picker("الأم", p.mother, function (pid) { return person(pid).gender === "f" && pid !== id; }, "mother");
    var note = h("textarea", { class: "field-input", rows: 2, id: "e-note", placeholder: "من أين المعلومة؟ مثلا: أبوي يقول…" });

    main.appendChild(field("الاسم", name));
    main.appendChild(field("الكنية أو اللقب", known));
    main.appendChild(group("الجنس", gender.el));
    main.appendChild(group("الحال", alive.el));
    main.appendChild(father.el);
    main.appendChild(mother.el);
    main.appendChild(h("div", { class: "two" }, field("الميلاد", born), field("الوفاة", died)));
    main.appendChild(h("div", { class: "two" }, field("المكان", place), field("ترتيبه بين إخوته", order)));
    main.appendChild(field("الأسرة", famSel));
    main.appendChild(field("عنه", about));
    if (!owner()) main.appendChild(field("ملاحظة لصاحب الشجرة", note));
    var msg = msgLine();
    main.appendChild(msg);
    main.appendChild(h("button", { type: "button", class: "btn btn-primary btn-wide", id: "e-save", onclick: function () {
      var nm = name.value.trim();
      if (!nm) { msg.textContent = "اكتب الاسم."; return; }
      var ord = order.value.trim() ? Number(String(order.value).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); })) : "";
      var row = { name: nm, known: known.value.trim(), gender: gender.get(), alive: alive.get(), born: born.value.trim(), died: died.value.trim(), place: place.value.trim(), order: isFinite(ord) ? ord : "", family: famSel.value, about: about.value.trim(), father: father.get(), mother: mother.get() };
      if (owner()) {
        if (isNew) {
          row.id = newId();
          var fg = row.father && person(row.father) && person(row.father).gen !== "" ? Number(person(row.father).gen) : null;
          row.gen = fg !== null && isFinite(fg) ? fg + 1 : "";
        } else row.id = id;
        S.hub.put("people", row);
        Kit.toast(isNew ? "أضيف " + nm : "حُفظ");
        location.hash = "#/p/" + row.id;
      } else {
        var changes = {};
        Object.keys(row).forEach(function (k) {
          var before = isNew ? "" : p[k] === undefined || p[k] === null ? "" : p[k];
          if (String(row[k]) !== String(before)) changes[k] = row[k];
        });
        if (!Object.keys(changes).length) { msg.textContent = "لم يتغير شيء."; return; }
        suggest({ kind: isNew ? "add" : "edit", target: isNew ? "" : id, changes: changes, note: note.value.trim() });
        Kit.toast("أُرسل لصاحب الشجرة");
        location.hash = isNew ? "#/mine" : "#/p/" + id;
      }
    } }, owner() ? "حفظ" : "أرسل الاقتراح"));
    if (!isNew && owner()) {
      var kids = x.kids[id] || [];
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:14px" }, kids.length
        ? h("p", { class: "note" }, "لحذفه انقل أبناءه أولا (" + kids.length + ").")
        : Kit.confirmButton("حذف من الشجرة", "اضغط مرة ثانية للحذف", function () {
          S.hub.remove("people", id);
          Kit.toast("حُذف");
          location.hash = p.father ? "#/p/" + p.father : "#/";
        }, "btn btn-quiet")));
    }
  }

  /** A marriage: pick the spouse from the tree, or add someone from another family. */
  function viewMarry(main, id) {
    var p = person(id);
    if (!p) return main.appendChild(h("p", { class: "empty" }, "غير موجود."));
    var female = p.gender === "f";
    main.appendChild(back("/p/" + id));
    main.appendChild(h("div", null, title((female ? "زوج " : "زوجة ") + p.name, owner() ? null : "يصل اقتراحك لصاحب الشجرة.")));
    var x = ix();
    var current = x.spouses[id] || [];
    if (current.length) main.appendChild(section("المسجل الآن", list(current.map(function (s) { return s.id; }), { names: 3 })));
    var s = searchBox({ placeholder: female ? "ابحث عن الزوج" : "ابحث عن الزوجة", filter: function (pid) { return pid !== id && (person(pid).gender === "f") !== female; }, onPick: function (pid) {
      var pair = female ? { a: pid, b: id } : { a: id, b: pid };
      if (owner()) {
        S.hub.put("marriages", { a: pair.a, b: pair.b, note: "" });
        Kit.toast("سُجل الزواج");
      } else {
        suggest({ kind: "marriage", target: id, changes: pair });
        Kit.toast("أُرسل لصاحب الشجرة");
      }
      location.hash = "#/p/" + id;
    } });
    main.appendChild(section("من الشجرة", s.el));
    /* someone not in the tree yet, from another family */
    var nm = input("", { id: "m-name", placeholder: female ? "اسم الزوج وأبيه" : "اسم الزوجة وأبيها" });
    var famSel = h("select", { class: "select", id: "m-family" });
    families().filter(function (f) { return f.id !== "main"; }).forEach(function (f) { famSel.appendChild(h("option", { value: f.id }, f.name)); });
    famSel.appendChild(h("option", { value: "main" }, familyName("main") || "الأسرة"));
    var newFam = input("", { id: "m-newfam", placeholder: "أو اسم أسرة جديدة" });
    var msg = msgLine();
    main.appendChild(section("ليس في الشجرة", [field("الاسم", nm), field("الأسرة", famSel), field("أسرة جديدة", newFam), msg,
      h("button", { type: "button", class: "btn", id: "m-add", onclick: function () {
        var name = nm.value.trim();
        if (!name) { msg.textContent = "اكتب الاسم."; return; }
        var famId = famSel.value;
        var famName = newFam.value.trim();
        if (owner()) {
          var writes = [];
          if (famName) {
            famId = "f_" + Hub.newId().slice(0, 7);
            writes.push({ table: "families", row: { id: famId, name: famName, primary: "", note: "" } });
          }
          var pid = newId();
          writes.push({ table: "people", row: { id: pid, name: name, gender: female ? "m" : "f", family: famId, alive: "yes", gen: "", father: "" } });
          writes.push({ table: "marriages", row: { a: female ? pid : id, b: female ? id : pid, note: "" } });
          S.hub.putMany(writes);
          Kit.toast("أضيف وسُجل الزواج");
        } else {
          suggest({ kind: "add", changes: { name: name, gender: female ? "m" : "f", family: famName ? "" : famId, spouse: id }, note: famName ? "أسرة جديدة: " + famName : "" });
          Kit.toast("أُرسل لصاحب الشجرة");
        }
        location.hash = "#/p/" + id;
      } }, owner() ? "أضف وسجل الزواج" : "أرسل الاقتراح")]));
  }

  /* ---------------------------------------------------------------- */
  /*  the tree, branch by branch                                       */
  /* ---------------------------------------------------------------- */

  function topRoot() {
    var x = ix();
    var best = null;
    x.roots.forEach(function (r) {
      if ((x.p[r].family || "main") !== "main") return;
      var n = T.descendants(x, r);
      if (!best || n > best.n) best = { id: r, n: n };
    });
    return best ? best.id : null;
  }

  function viewTree(main, id) {
    var x = ix();
    var start = id && person(id) ? id : topRoot();
    main.appendChild(back(id ? "/p/" + id : "/"));
    if (!start) {
      main.appendChild(h("p", { class: "empty" }, "لا توجد شجرة بعد."));
      return;
    }
    main.appendChild(h("h1", { class: "page-title" }, id ? "ذرية " + person(id).name : "الشجرة"));
    /* above: the line up to the top, to climb */
    var up = T.chain(x, start).slice(1).reverse();
    if (up.length) {
      var crumbs = h("div", { class: "crumbs" });
      up.forEach(function (a) { crumbs.appendChild(h("a", { href: "#/tree/" + a }, x.p[a].name)); });
      main.appendChild(crumbs);
    }
    var me = meId();
    var tools = h("div", { class: "btn-row" },
      me && T.chain(x, me).indexOf(start) >= 0 ? h("button", { type: "button", class: "btn", id: "to-me", onclick: function () {
        T.chain(x, me).forEach(function (a) { S.open[a] = true; });
        paint();
        var el = document.querySelector('[data-node="' + me + '"]');
        if (el) el.scrollIntoView({ block: "center" });
      } }, "إلى فرعي") : null,
      h("button", { type: "button", class: "btn btn-quiet", onclick: function () { S.open = {}; S.open[start] = true; paint(); } }, "طي الكل"));
    main.appendChild(tools);
    var box = h("div", { class: "tree", role: "tree" });
    main.appendChild(box);
    if (!Object.keys(S.open).length) {
      S.open[start] = true;
      /* the first two levels open */
      (x.kids[start] || []).forEach(function (k) { if ((x.kids[k] || []).length <= 6) S.open[k] = true; });
    }
    S.open[start] = true;
    function node(pid, depth) {
      var p = x.p[pid];
      var kids = x.kids[pid] || [];
      var isOpen = !!S.open[pid];
      var count = T.descendants(x, pid);
      var row = h("div", { class: "node" + (pid === me ? " me" : "") + (p.gender === "f" ? " f" : ""), "data-node": pid, role: "treeitem", "aria-expanded": kids.length ? String(isOpen) : null, style: "padding-inline-start:" + Math.min(depth, 12) * 14 + "px" },
        kids.length ? h("button", { type: "button", class: "twist", "aria-label": isOpen ? "طي" : "فتح", onclick: function () { S.open[pid] = !isOpen; paint(); } }, isOpen ? "▾" : "◂") : h("span", { class: "twist none" }),
        h("a", { class: "node-name", href: "#/p/" + pid }, p.name),
        count ? h("span", { class: "node-count" }, digits(count)) : null);
      var frag = [row];
      if (isOpen) kids.forEach(function (k) { frag = frag.concat(node(k, depth + 1)); });
      return frag;
    }
    function paint() {
      Kit.clear(box);
      node(start, 0).forEach(function (el) { box.appendChild(el); });
    }
    paint();
  }

  /* ---------------------------------------------------------------- */
  /*  how two people are related                                       */
  /* ---------------------------------------------------------------- */

  function viewRel(main, query) {
    var x = ix();
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("صلة القرابة", "اختر شخصين لترى كيف يقرب أحدهما للآخر، وأين يلتقيان.")));
    var a = query.a && person(query.a) ? query.a : meId();
    var b = query.b && person(query.b) ? query.b : "";
    function slot(label, value, key) {
      var area = h("div");
      var shown = h("div", { class: "picked" }, h("span", { class: "row-title" }, value ? T.nameChain(x, value, 4) : "لم يُختر"),
        h("button", { type: "button", class: "btn btn-quiet", "data-slot": key, onclick: function () {
          Kit.clear(area);
          var s = searchBox({ onPick: function (id) {
            var q = { a: a, b: b };
            q[key] = id;
            location.hash = "#/rel?a=" + (q.a || "") + "&b=" + (q.b || "");
          } });
          area.appendChild(s.el);
          s.box.focus();
        } }, "اختر"));
      return group(label, [shown, area]);
    }
    main.appendChild(slot("الأول", a, "a"));
    main.appendChild(slot("الثاني", b, "b"));
    if (!a || !b) return;
    var r = T.relate(x, a, b);
    var r2 = T.relate(x, b, a);
    var pa = person(a);
    var pb = person(b);
    if (!r) {
      main.appendChild(h("p", { class: "rel-card" }, "لا يظهر رابط بينهما في الشجرة حتى الآن."));
      return;
    }
    main.appendChild(h("div", { class: "rel-card big", id: "rel-result" },
      h("p", null, h("strong", null, pb.name), (pb.gender === "f" ? " هي " : " هو ") + aboutSomeone(r.term, pa.name)),
      r2 ? h("p", null, h("strong", null, pa.name), (pa.gender === "f" ? " هي " : " هو ") + aboutSomeone(r2.term, pb.name)) : null,
      r.via && r.a > 0 && r.b > 0 ? h("p", { class: "note" }, "يلتقيان في " + T.nameChain(x, r.via, 3) + (r.by === "marriage" ? "، عن طريق الزواج" : "")) : null));
    if (r.via && r.by !== "marriage") {
      var ca = T.chain(x, a).slice(0, r.a + 1).reverse();
      var cb = T.chain(x, b).slice(0, r.b + 1).reverse();
      var cols = h("div", { class: "rel-cols" });
      [ca, cb].forEach(function (c) {
        var col = h("div", { class: "rel-col" });
        c.forEach(function (id) { col.appendChild(h("a", { href: "#/p/" + id, class: "rel-step" }, x.p[id].name)); });
        cols.appendChild(col);
      });
      main.appendChild(section("الخطان من الجد المشترك", cols));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  linking, checking, families, data                                */
  /* ---------------------------------------------------------------- */

  function viewLink(main, gen) {
    var x = ix();
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("الربط", "من في الشجرة المطبوعة ولم يُربط بأبيه بعد. الأقرب على الملصق أولا، والقرب تلميح فقط.")));
    var levels = [3, 4, 5, 6, 7, 8, 9];
    var g = Number(gen) || levels.filter(function (l) { return T.unlinked(x, l).length; })[0] || 6;
    var bar = h("div", { class: "chips" });
    levels.forEach(function (l) {
      var n = T.unlinked(x, l).length;
      bar.appendChild(h("a", { class: "chip", href: "#/link/" + l, "aria-pressed": l === g ? "true" : "false" }, "الجيل " + l + (n ? " (" + n + ")" : " ✓")));
    });
    main.appendChild(bar);
    var ids = T.unlinked(x, g);
    if (!ids.length) {
      main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "كل الجيل " + g + " مربوط.")));
      return;
    }
    var el = h("div", { class: "list", id: "unlinked" });
    ids.slice(0, 60).forEach(function (id) {
      var p = x.p[id];
      var row = h("div", { class: "link-row", "data-person": id });
      var opened = S.keep.link === id;
      row.appendChild(h("button", { type: "button", class: "link-head", "aria-expanded": String(opened), onclick: function () { S.keep.link = opened ? null : id; render(); } },
        h("span", { class: "row-title" }, p.name), h("span", { class: "row-sub" }, p.gender === "f" ? "بنت" : "ابن")));
      if (opened) {
        var cands = T.fatherCandidates(x, id, 8);
        var cl = h("div", { class: "cands" });
        cands.forEach(function (c) {
          cl.appendChild(h("button", { type: "button", class: "cand", "data-cand": c.id, onclick: function () {
            S.hub.put("people", { id: id, father: c.id });
            S.keep.link = null;
            Kit.toast(p.name + (p.gender === "f" ? " بنت " : " بن ") + x.p[c.id].name);
            render();
          } }, h("span", null, T.nameChain(x, c.id, 3)), c.distance !== null ? h("span", { class: "note" }, "على بعد " + c.distance) : null));
        });
        var more = h("div");
        cl.appendChild(h("button", { type: "button", class: "btn btn-quiet", onclick: function () {
          var s = searchBox({ filter: function (pid) { return person(pid).gender !== "f" && pid !== id; }, onPick: function (fid) {
            S.hub.put("people", { id: id, father: fid });
            S.keep.link = null;
            render();
          } });
          Kit.clear(more);
          more.appendChild(s.el);
          s.box.focus();
        } }, "ابحث عن غيرهم"));
        cl.appendChild(more);
        row.appendChild(cl);
      }
      el.appendChild(row);
    });
    main.appendChild(el);
    if (ids.length > 60) main.appendChild(h("p", { class: "note" }, "أول ٦٠ من " + ids.length + "."));
  }

  function viewCheck(main) {
    var x = ix();
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("الفحص", "كل رقم يجب أن يطابق الشجرة المطبوعة، وكل رابط يجب أن يكون جيلا واحدا تحت الأب.")));
    var tb = h("table", { class: "census" });
    tb.appendChild(h("tr", null, h("th", null, "الجيل"), h("th", null, "المطبوعة"), h("th", null, "من الملصق"), h("th", null, "الكل"), h("th", null, "مربوط")));
    T.census(x).forEach(function (r) {
      var bad = r.poster && r.onPoster !== r.poster;
      tb.appendChild(h("tr", { class: bad ? "bad" : null }, h("td", null, digits(r.gen)), h("td", null, r.poster ? digits(r.poster) : "-"), h("td", null, digits(r.onPoster)), h("td", null, digits(r.all)), h("td", null, digits(r.linked))));
    });
    main.appendChild(section("الأعداد", tb));
    var problems = T.check(x);
    var why = { level: function (p) { return "جيله " + p.gen + " في المطبوعة، وأبوه في الجيل " + p.fatherLevel; }, mother: function () { return "أبوه مسجل أنثى"; }, loop: function () { return "الرابط يدور على نفسه"; } };
    var el = h("div", { class: "list", id: "problems" });
    if (!problems.length) el.appendChild(h("div", { class: "empty" }, "كل الروابط سليمة."));
    problems.forEach(function (p) { el.appendChild(personRow(p.id, { sub: why[p.kind](p) })); });
    main.appendChild(section("روابط تحتاج نظرة (" + problems.length + ")", el));
  }

  function viewFamilies(main) {
    var x = ix();
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("العائلات")));
    var counts = {};
    Object.keys(x.p).forEach(function (id) { var f = x.p[id].family || "main"; counts[f] = (counts[f] || 0) + 1; });
    var el = h("div", { class: "list" });
    families().forEach(function (f) {
      var nameIn = input(f.name, { "aria-label": "اسم الأسرة" });
      if (owner()) nameIn.addEventListener("change", function () { S.hub.put("families", { id: f.id, name: nameIn.value.trim() }); Kit.toast("حُفظ"); });
      el.appendChild(h("div", { class: "row" }, owner() ? nameIn : h("span", { class: "row-title" }, f.name), h("span", { class: "row-sub" }, digits(counts[f.id] || 0) + " شخص")));
    });
    main.appendChild(el);
    if (owner()) {
      var nf = input("", { placeholder: "أسرة جديدة", id: "fam-new" });
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:8px" }, nf, h("button", { type: "button", class: "btn", onclick: function () {
        if (!nf.value.trim()) return;
        S.hub.put("families", { id: "f_" + Hub.newId().slice(0, 7), name: nf.value.trim(), primary: "", note: "" });
        render();
      } }, "إضافة")));
    }
    var ml = h("div", { class: "list" });
    rows("marriages").forEach(function (m) {
      if (!x.p[m.a] || !x.p[m.b]) return;
      ml.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" },
        h("a", { class: "row-title", href: "#/p/" + m.a }, T.nameChain(x, m.a, 3)),
        h("a", { class: "row-sub", href: "#/p/" + m.b }, "و " + T.nameChain(x, m.b, 3) + (x.p[m.b].family && x.p[m.b].family !== "main" ? " (" + familyName(x.p[m.b].family) + ")" : ""))),
        owner() ? Kit.confirmButton("حذف", "اضغط مرة ثانية", function () { S.hub.remove("marriages", m.id); render(); }, "btn btn-quiet") : null));
    });
    main.appendChild(section("الزيجات", ml));
  }

  function viewData(main) {
    var x = ix();
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("البيانات", "الشجرة محفوظة في جدول قوقل الخاص بها، مع نسخة احتياطية كل ليلة.")));
    var stats = h("div", { class: "list facts" });
    [["الأشخاص", Object.keys(x.p).length], ["المربوطون بآبائهم", Object.keys(x.p).filter(function (id) { return x.p[id].father && x.p[x.p[id].father]; }).length], ["الزيجات", rows("marriages").length], ["المعلومات", rows("notes").length], ["الاقتراحات", rows("suggestions").length]].forEach(function (r) {
      stats.appendChild(h("div", { class: "row" }, h("span", { class: "row-sub" }, r[0]), h("span", { class: "row-title" }, digits(r[1]))));
    });
    main.appendChild(stats);

    /* bring in the old app's backup, once */
    var file = h("input", { type: "file", accept: ".json,application/json", id: "import-file" });
    var paste = h("textarea", { class: "field-input", rows: 3, id: "import-text", placeholder: "أو الصق محتوى ملف النسخة هنا" });
    var msg = msgLine();
    var go = h("button", { type: "button", class: "btn btn-primary", id: "import-go", onclick: function () {
      var run = function (text) {
        var d;
        try { d = T.fromBackup(text); } catch (e) { msg.textContent = "الملف غير صالح: " + e.message; return; }
        if (rows("people").length && !window.confirmImport) {
          window.confirmImport = true;
          msg.textContent = "في الشجرة " + rows("people").length + " شخص. اضغط مرة ثانية لإدخال النسخة فوقها (الأشخاص بنفس الرقم يُستبدلون).";
          return;
        }
        var writes = [];
        d.families.forEach(function (r) { writes.push({ table: "families", row: r }); });
        d.people.forEach(function (r) { writes.push({ table: "people", row: r }); });
        d.marriages.forEach(function (r) { writes.push({ table: "marriages", row: r }); });
        S.hub.putMany(writes);
        if (d.me && !meId()) store(ME_KEY, d.me);
        Kit.toast("أُدخل " + d.people.length + " شخص");
        msg.textContent = d.problems.length ? "ملاحظات: " + d.problems.join("، ") : "";
        location.hash = "#/check";
      };
      if (file.files && file.files[0]) {
        var r = new FileReader();
        r.onload = function () { run(String(r.result)); };
        r.readAsText(file.files[0]);
      } else if (paste.value.trim()) run(paste.value.trim());
      else msg.textContent = "اختر الملف أو الصقه.";
    } }, "إدخال");
    main.appendChild(section("إدخال نسخة التطبيق القديم", [file, paste, msg, go]));

    main.appendChild(section("نسخة للحفظ", [h("p", { class: "note" }, "ملف بنفس شكل التطبيق القديم، لتحفظه أينما تريد."),
      h("button", { type: "button", class: "btn", id: "export", onclick: function () {
        var data = T.toBackup({ people: rows("people"), families: families(), marriages: rows("marriages"), notes: rows("notes") }, meId());
        var blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
        var a = h("a", { href: URL.createObjectURL(blob), download: "family-" + today() + ".json" });
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      } }, "تنزيل النسخة")]));
  }

  function viewSettings(main) {
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("الإعدادات")));
    var me = meId();
    main.appendChild(section("أنا", [me ? personRow(me, { names: 4 }) : h("p", { class: "note" }, "لم تختر نفسك بعد."), h("a", { class: "btn", href: "#/me" }, me ? "تغيير" : "اختر نفسك")]));
    main.appendChild(section("هذا الجهاز", [h("p", { class: "note" }, "المفتاح: " + (Kit.who().name || "") + (owner() ? " (صاحب الشجرة)" : " (يقترح فقط)")),
      Kit.confirmButton("قفل هذا الجهاز", "اضغط مرة ثانية للقفل", function () { Kit.lockDevice(S.hub); })]));
  }

  /* ---------------------------------------------------------------- */
  /*  routing                                                          */
  /* ---------------------------------------------------------------- */

  var FORMS = { edit: 1, marry: 1, me: 1, data: 1, families: 1, inbox: 1 };
  var route = { name: "" };

  function parseRoute() {
    var raw = (location.hash || "#/").slice(1);
    var q = {};
    var at = raw.indexOf("?");
    if (at >= 0) {
      raw.slice(at + 1).split("&").forEach(function (kv) {
        var p = kv.split("=");
        if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });
      raw = raw.slice(0, at);
    }
    var parts = raw.split("/").filter(String);
    return { name: parts[0] || "", arg: parts[1], query: q };
  }

  function render() {
    var next = parseRoute();
    var changed = next.name !== route.name || next.arg !== route.arg;
    if (next.name === "tree" && changed) S.open = {};
    route = next;
    var main = S.main;
    Kit.clear(main);
    switch (route.name) {
      case "p": viewPerson(main, route.arg); break;
      case "me": viewMe(main); break;
      case "tree": viewTree(main, route.arg); break;
      case "rel": viewRel(main, route.query); break;
      case "edit": viewEdit(main, route.arg, route.query); break;
      case "marry": viewMarry(main, route.arg); break;
      case "inbox": owner() ? viewInbox(main) : viewMine(main); break;
      case "mine": viewMine(main); break;
      case "link": owner() ? viewLink(main, route.arg) : viewHome(main); break;
      case "check": viewCheck(main); break;
      case "families": viewFamilies(main); break;
      case "data": owner() ? viewData(main) : viewSettings(main); break;
      case "settings": viewSettings(main); break;
      default: viewHome(main);
    }
    if (changed) window.scrollTo(0, 0);
  }

  function onData() {
    if (FORMS[route.name]) return;
    var a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
    render();
  }

  Kit.start({
    app: "family",
    title: "العائلة",
    languages: ["ar"],
    suggestKeys: true,
    render: function (main, hub) {
      S.hub = hub;
      S.main = main;
      hub.on(onData);
      window.addEventListener("hashchange", render);
      render();
    },
    onWho: function () {
      render();
    },
  });
})();
