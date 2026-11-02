/*
 * العائلة: the family tree, shared with the family.
 *
 * The tree is walked around one person at a time: his father and grandfather
 * above, his brothers beside him, his children below; tap anyone to move to
 * him. Everyone with a key can browse. Family members' keys send their
 * changes to the tree's keeper, whose key (full) edits and approves.
 * Women's names are hidden until someone taps to show them.
 * The logic lives in tree.js; this file draws the screens. Arabic, in the
 * way the family speaks.
 */
(function () {
  "use strict";

  var h = Kit.h;
  var T = window.FTree;
  var ME_KEY = "lifeapps.family.me";
  var RECENT_KEY = "lifeapps.family.recent";
  var SKIP_KEY = "lifeapps.family.skip";
  var BIG_KEY = "lifeapps.family.big";
  var WOMEN_KEY = "lifeapps.family.women";

  var S = { hub: null, main: null, ix: null, sig: "", keep: {} };

  /* ---------------------------------------------------------------- */
  /*  data                                                             */
  /* ---------------------------------------------------------------- */

  function owner() {
    return Kit.who().mode !== "suggest";
  }

  function rows(t) {
    return S.hub.all(t);
  }

  function ix() {
    var sig = S.hub.rev + "|" + S.hub.cursor + "|" + Object.keys(S.hub.tables.people || {}).length + "|" + Object.keys(S.hub.tables.marriages || {}).length;
    if (!S.ix || sig !== S.sig) {
      S.ix = T.build(rows("people"), rows("marriages"));
      S.sig = sig;
    }
    return S.ix;
  }

  function person(id) {
    return ix().p[id] || null;
  }

  function setting(id) {
    var r = S.hub.get("settings", id);
    return r ? r.value : "";
  }

  /** Who the family sends their changes to, by the name the keeper chose. */
  function keeper() {
    return setting("keeper") || "صاحب الشجرة";
  }

  function familyName() {
    var f = rows("families").filter(function (x) { return x.id === "main"; })[0];
    return f ? f.name : "";
  }

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
    return null;
  }

  /* women's names show only after a tap, and hide again when the app is closed */
  function womenShown() {
    try {
      return sessionStorage.getItem(WOMEN_KEY) === "yes";
    } catch (e) {
      return !!S.women;
    }
  }

  function setWomen(on) {
    S.women = on;
    try {
      sessionStorage.setItem(WOMEN_KEY, on ? "yes" : "no");
    } catch (e) {}
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

  /* ---------------------------------------------------------------- */
  /*  names                                                            */
  /* ---------------------------------------------------------------- */

  function isF(p) {
    return p && p.gender === "f";
  }

  function hidden(p) {
    return isF(p) && !womenShown();
  }

  /** The name to show: a woman's own name only when names are shown. */
  function shown(id) {
    var p = person(id);
    if (!p) return "";
    return hidden(p) ? "بنت" : p.name;
  }

  /** The chain, with a hidden woman as "بنت سليمان بن عبدالله". */
  function chainText(id, count) {
    var p = person(id);
    if (!p) return "";
    if (!hidden(p)) return T.nameChain(ix(), id, count);
    if (!p.father || !person(p.father)) return "بنت";
    return "بنت " + T.nameChain(ix(), p.father, count ? count - 1 : undefined);
  }

  function wifeText(m) {
    if (!m) return "";
    if (m.b && person(m.b)) return womenShown() ? T.nameChain(ix(), m.b, 3) : "زوجته من الأسرة";
    if (!womenShown()) return "زوجته" + (m.family ? " من " + m.family : "");
    return (m.name || "زوجته") + (m.family ? "، من " + m.family : "");
  }

  function rel(id) {
    var me = meId();
    if (!me) return null;
    if (me === id) return { term: "أنت" };
    return T.relate(ix(), me, id);
  }

  function goneWord(p) {
    return isF(p) ? "الله يرحمها" : "الله يرحمه";
  }

  /* ---------------------------------------------------------------- */
  /*  small pieces                                                     */
  /* ---------------------------------------------------------------- */

  function back(path, label) {
    return h("a", { class: "back", href: "#" + (path || "/") }, "‹ " + (label || "رجوع"));
  }

  function title(text, lead) {
    return [h("h1", { class: "page-title" }, text), lead ? h("p", { class: "lead" }, lead) : null];
  }

  function section(name, kids, attrs) {
    return h("section", Object.assign({ class: "section" }, attrs || {}), name ? h("h2", { class: "section-title" }, name) : null, kids);
  }

  function field(label, input, hint) {
    return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input, hint ? h("span", { class: "hint" }, hint) : null);
  }

  function group(label, kids) {
    return h("div", { class: "field", role: "group", "aria-label": label }, h("span", { class: "field-label" }, label), kids);
  }

  function input(value, attrs) {
    return h("input", Object.assign({ class: "field-input", type: "text", autocomplete: "off", value: value === undefined || value === null ? "" : String(value) }, attrs || {}));
  }

  function textarea(value, attrs) {
    var t = h("textarea", Object.assign({ class: "field-input", rows: 3 }, attrs || {}));
    t.value = value || "";
    return t;
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

  function msgLine() {
    return h("p", { class: "form-error", role: "alert" });
  }

  /** A person as a row in a list: the name with his line, and what he is to me. */
  function personRow(id, opts) {
    opts = opts || {};
    var p = person(id);
    if (!p) return null;
    var r = rel(id);
    var sub = [opts.sub || "", r ? r.term : "", p.alive === "no" ? goneWord(p) : ""].filter(String).join(" · ");
    var main = h("div", { class: "row-main" }, h("span", { class: "row-title" }, chainText(id, opts.names || 4)), sub ? h("span", { class: "row-sub" }, sub) : null);
    if (opts.onPick) return h("button", { type: "button", class: "prow", "data-person": id, onclick: function () { opts.onPick(id); } }, main);
    return h("a", { class: "prow", "data-person": id, href: "#/f/" + id }, main);
  }

  function list(ids, opts) {
    var el = h("div", { class: "list" });
    if (!ids.length) el.appendChild(h("div", { class: "empty" }, (opts && opts.empty) || "ما فيه أحد"));
    ids.forEach(function (id) { el.appendChild(personRow(id, opts)); });
    return el;
  }

  /** A search box with its results; onPick makes each result a choice. */
  function searchBox(opts) {
    opts = opts || {};
    var box = h("input", { class: "field-input search-input", type: "search", placeholder: opts.placeholder || "اكتب الاسم ثم اسم أبوه ثم جده", autocomplete: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "search", id: opts.id || null, "aria-label": "بحث" });
    var results = h("div", { class: "results" });
    var timer = null;
    function paint() {
      Kit.clear(results);
      var q = box.value.trim();
      if (!q) {
        if (opts.onEmpty) opts.onEmpty(results);
        return;
      }
      var ids = T.search(ix(), q, 300, rows("families"));
      ids = ids.filter(function (id) { return !hidden(person(id)) && (!opts.filter || opts.filter(id)); });
      var total = ids.length;
      results.appendChild(list(ids.slice(0, 40), { onPick: opts.onPick, empty: "ما لقينا أحد. جرّب الاسم ثم اسم أبوه." }));
      if (total > 40) results.appendChild(h("p", { class: "hint" }, "أول 40 من " + total + ". زد اسم الأب عشان يضيق البحث."));
    }
    box.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(paint, 90);
    });
    setTimeout(paint, 0);
    return { el: h("div", { class: "search" }, box, results), box: box };
  }

  /** Choose a person: what is chosen now, and a search to change it. */
  function picker(label, value, filter, key) {
    var state = { value: value || "" };
    var shownEl = h("div", { class: "picked" });
    var area = h("div");
    function paint() {
      Kit.clear(shownEl);
      Kit.clear(area);
      shownEl.appendChild(h("span", { class: "row-title" }, state.value && person(state.value) ? chainText(state.value, 4) : "ما حدد"));
      shownEl.appendChild(h("button", { type: "button", class: "btn btn-quiet", "data-pick": key, onclick: function () {
        Kit.clear(area);
        var s = searchBox({ filter: filter, onPick: function (id) { state.value = id; paint(); } });
        area.appendChild(s.el);
        s.box.focus();
      } }, "اختر"));
      if (state.value) shownEl.appendChild(h("button", { type: "button", class: "btn btn-quiet", onclick: function () { state.value = ""; paint(); } }, "شيل"));
    }
    paint();
    return { el: group(label, [shownEl, area]), get: function () { return state.value; } };
  }

  /* ---------------------------------------------------------------- */
  /*  the tree around a person                                         */
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

  function kidsWord(id) {
    var x = ix();
    var k = x.kids[id] || [];
    if (!k.length) return "";
    var sons = k.filter(function (c) { return !isF(x.p[c]); }).length;
    var girls = k.length - sons;
    return [sons ? sons + (sons === 1 ? " ولد" : " عيال") : "", girls ? girls + (girls === 1 ? " بنت" : " بنات") : ""].filter(String).join(" و ");
  }

  /** A person as a card in the tree. */
  function card(id, kind) {
    var p = person(id);
    var r = kind === "focus" ? rel(id) : null;
    var sub = kind === "focus" ? (r ? r.term : "") : kidsWord(id);
    return h("a", { class: "card " + (kind || "") + (isF(p) ? " f" : "") + (p.alive === "no" ? " gone" : ""), href: "#/f/" + id, "data-card": id, "aria-current": kind === "focus" ? "true" : null },
      h("span", { class: "card-name" }, shown(id)),
      sub ? h("span", { class: "card-sub" }, sub) : null,
      kind === "focus" && p.alive === "no" ? h("span", { class: "card-sub" }, goneWord(p)) : null);
  }

  function viewFocus(main, id) {
    var x = ix();
    if (!rows("people").length) return viewEmpty(main);
    var me = meId();
    id = id && person(id) ? id : me || topRoot();
    if (!id) return viewEmpty(main);
    var p = person(id);
    remember(id);

    if (!me) main.appendChild(h("a", { class: "ask", href: "#/me" }, "من أنت في الشجرة؟ اختر اسمك عشان تشوف قرابة كل واحد منك"));

    var tree = h("div", { class: "ft" });
    /* the whole line up to the top, small, to climb fast */
    var up = T.chain(x, id).slice(1).reverse();
    if (up.length > 2) {
      var strip = h("div", { class: "ft-line-up" });
      up.slice(0, -2).forEach(function (a) { strip.appendChild(h("a", { href: "#/f/" + a }, x.p[a].name)); });
      tree.appendChild(strip);
    }
    /* grandfather and father */
    up.slice(-2).forEach(function (a) {
      tree.appendChild(card(a, "anc"));
      tree.appendChild(h("div", { class: "vline" }));
    });
    /* him among his brothers and sisters */
    var sibs = p.father && x.kids[p.father] ? x.kids[p.father] : [id];
    var row = h("div", { class: "ft-sibs" + (sibs.length > 1 ? " many" : "") });
    sibs.forEach(function (s) { row.appendChild(card(s, s === id ? "focus" : "sib")); });
    tree.appendChild(row);
    /* his children */
    var kids = x.kids[id] || [];
    if (kids.length) {
      tree.appendChild(h("div", { class: "vline" }));
      var kl = h("div", { class: "ft-kids" });
      kids.forEach(function (k) { kl.appendChild(card(k, "kid")); });
      tree.appendChild(kl);
    }
    main.appendChild(tree);
    setTimeout(function () {
      var f = row.querySelector(".focus");
      if (f && row.scrollWidth > row.clientWidth) row.scrollLeft = f.offsetLeft - (row.clientWidth - f.offsetWidth) / 2;
    }, 0);

    main.appendChild(details(id));
  }

  /** Under the tree: everything about him. */
  function details(id) {
    var x = ix();
    var p = person(id);
    var box = h("div", { class: "details" });
    var full = chainText(id);
    box.appendChild(h("h1", { class: "page-title" }, shown(id) + (p.alive === "no" ? " " + goneWord(p) : "")));
    if (p.known && !hidden(p)) box.appendChild(h("p", { class: "known" }, p.known));
    box.appendChild(h("p", { class: "chain" }, full + (familyName() && (p.family || "main") === "main" ? " " + familyName() : "")));
    box.appendChild(h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn", id: "share", onclick: function () { shareLine(id); } }, "انسخ النسب"),
      h("a", { class: "btn", href: "#/b/" + id }, "فرعه كامل"),
      meId() && meId() !== id ? h("a", { class: "btn", href: "#/rel?b=" + id }, "وش يقرب لي؟") : null));

    var r = rel(id);
    if (r && r.via && r.a > 0 && r.b > 0 && r.by !== "marriage") {
      box.appendChild(h("p", { class: "meet" }, "يلتقي معك في " + ancestorWord(r.a) + ": ", h("a", { href: "#/f/" + r.via }, T.nameChain(x, r.via, 2))));
    }

    var facts = h("div", { class: "list facts" });
    function fact(label, value) {
      if (value) facts.appendChild(h("div", { class: "fact" }, h("span", { class: "fact-label" }, label), h("span", { class: "fact-value" }, value)));
    }
    var lv = T.level(x, id);
    fact("الجيل", lv !== null && lv > 0 ? String(lv) : lv !== null ? "من أجداد الأسرة" : "");
    fact("مواليد", T.yearText(p.born));
    fact("توفي", T.yearText(p.died));
    fact("ساكن في", p.place);
    var motherM = x.marriages[p.mother];
    if (motherM) fact("أمه", wifeText(motherM));
    else if (p.mother && person(p.mother)) fact("أمه", womenShown() ? T.nameChain(x, p.mother, 3) : "من الأسرة");
    var wives = x.wives[id] || [];
    if (wives.length) fact(wives.length > 1 ? "زوجاته" : "زوجته", wives.map(wifeText).join("، "));
    if (isF(p)) {
      var husbands = (x.spouses[id] || []).map(function (s) { return T.nameChain(x, s.id, 3); });
      if (husbands.length) fact("زوجها", husbands.join("، "));
    }
    if (facts.children.length) box.appendChild(facts);
    if (p.about && !hidden(p)) box.appendChild(section("معلومات عنه", h("p", { class: "about" }, p.about)));

    /* stories and things people know */
    if (!hidden(p)) {
      var notes = rows("notes").filter(function (n) { return n.person === id; }).sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : 1; });
      var nl = h("div", { class: "notes" });
      notes.forEach(function (n) {
        nl.appendChild(h("div", { class: "note-card" }, h("p", null, n.text), h("span", { class: "hint" }, [n.by, n.date].filter(String).join(" · "))));
      });
      var ta = textarea("", { id: "note-text", placeholder: "تعرف عنه شي؟ وش كان يشتغل، وين سكن، سالفة عنه…" });
      var nmsg = msgLine();
      box.appendChild(section("سوالف ومعلومات عنه", [nl, ta, nmsg, h("button", { type: "button", class: "btn", id: "note-add", onclick: function () {
        var text = ta.value.trim();
        if (!text) { nmsg.textContent = "اكتب المعلومة."; return; }
        if (owner()) {
          S.hub.put("notes", { person: id, text: text, by: keeper(), date: today() });
          Kit.toast("انضافت");
        } else {
          suggest({ kind: "note", target: id, changes: { text: text } });
          Kit.toast("وصلت لـ" + keeper());
        }
        render();
      } }, owner() ? "أضف" : "أرسل لـ" + keeper())]));
    }

    var pend = rows("suggestions").filter(function (s) { return s.status === "pending" && (s.target === id || T.parseChanges(s).father === id); });
    if (pend.length) box.appendChild(h("a", { class: "banner", href: owner() ? "#/inbox" : "#/mine" }, pend.length === 1 ? "فيه تعديل عنه ينتظر الاعتماد" : pend.length + " تعديلات عنه تنتظر الاعتماد"));

    var female = isF(p);
    box.appendChild(h("div", { class: "btn-row actions" },
      h("a", { class: "btn btn-primary", href: "#/edit/" + id }, owner() ? "عدّل" : "عدّل وأرسل لـ" + keeper()),
      female ? null : h("a", { class: "btn", href: "#/edit/new?father=" + id + "&gender=m" }, "أضف ولد"),
      female ? null : h("a", { class: "btn", href: "#/edit/new?father=" + id + "&gender=f" }, "أضف بنت"),
      female ? null : h("a", { class: "btn", href: "#/wives/" + id }, "زوجاته")));
    return box;
  }

  function ancestorWord(a) {
    return ["", "أبوك", "جدك", "جد أبوك", "أبو جدك"][a] || "جدك البعيد";
  }

  function shareLine(id) {
    var text = chainText(id) + (familyName() ? "\n" + "من أسرة " + familyName() : "");
    if (navigator.share) {
      navigator.share({ text: text }).catch(function () {});
      return;
    }
    var done = function () { Kit.toast("انسخ النسب"); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { Kit.toast("تم نسخ النسب"); }, done);
    else done();
  }

  function viewEmpty(main) {
    main.appendChild(h("div", { class: "empty-state" },
      h("p", null, owner() ? "الشجرة فاضية. أدخل نسختك من التطبيق القديم." : "جاري تحميل الشجرة…"),
      owner() ? h("a", { class: "btn btn-primary", href: "#/data" }, "إدخال النسخة") : null));
  }

  /* ---------------------------------------------------------------- */
  /*  a whole branch, as a picture                                     */
  /* ---------------------------------------------------------------- */

  function viewBranch(main, id) {
    var x = ix();
    var p = person(id);
    if (!p) return viewFocus(main);
    main.appendChild(back("/f/" + id));
    main.appendChild(h("h1", { class: "page-title" }, "فرع " + shown(id)));
    var depth = S.keep.depth || 3;
    var zoom = S.keep.zoom || 1;
    var bar = h("div", { class: "btn-row" });
    [2, 3, 4].forEach(function (d) {
      bar.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": d === depth ? "true" : "false", onclick: function () { S.keep.depth = d; render(); } }, d + " أجيال"));
    });
    bar.appendChild(h("button", { type: "button", class: "chip", "aria-label": "تصغير", onclick: function () { S.keep.zoom = Math.max(0.4, zoom - 0.2); render(); } }, "−"));
    bar.appendChild(h("button", { type: "button", class: "chip", "aria-label": "تكبير", onclick: function () { S.keep.zoom = Math.min(1.4, zoom + 0.2); render(); } }, "+"));
    main.appendChild(bar);
    main.appendChild(h("p", { class: "hint" }, T.descendants(x, id) + " في ذريته. اضغط أي اسم تروح له."));
    function node(pid, d) {
      var kids = d < depth ? x.kids[pid] || [] : [];
      var more = d >= depth && (x.kids[pid] || []).length;
      var li = h("li", null, h("a", { class: "bnode" + (isF(x.p[pid]) ? " f" : "") + (pid === meId() ? " me" : ""), href: "#/f/" + pid }, shown(pid), more ? h("small", null, String(T.descendants(x, pid))) : null));
      if (kids.length) {
        var ul = h("ul");
        kids.forEach(function (k) { ul.appendChild(node(k, d + 1)); });
        li.appendChild(ul);
      }
      return li;
    }
    var chart = h("div", { class: "branch", style: "zoom:" + zoom }, h("ul", null, node(id, 0)));
    var wrap = h("div", { class: "branch-wrap" }, chart);
    main.appendChild(wrap);
    /* start with the head of the branch in view, or me if I am in it */
    setTimeout(function () {
      var target = chart.querySelector(".bnode.me") || chart.querySelector(".bnode");
      if (!target) return;
      if (target.classList.contains("me")) target.scrollIntoView({ block: "center", inline: "nearest" });
    }, 0);
  }

  /* ---------------------------------------------------------------- */
  /*  search, me, relation                                             */
  /* ---------------------------------------------------------------- */

  function viewSearch(main) {
    main.appendChild(h("div", null, title("بحث")));
    var s = searchBox({
      id: "search",
      onEmpty: function (el) {
        var recent = (store(RECENT_KEY) || []).filter(function (id) { return person(id) && !hidden(person(id)); });
        if (recent.length) el.appendChild(section("آخر من شفت", list(recent.slice(0, 8))));
        el.appendChild(h("p", { class: "hint" }, "مثال: محمد عبدالله، يطلع لك محمد اللي أبوه عبدالله بس."));
      },
    });
    main.appendChild(s.el);
    setTimeout(function () { s.box.focus(); }, 50);
  }

  function viewMe(main) {
    main.appendChild(back("/"));
    main.appendChild(h("div", null, title("من أنت في الشجرة؟", "دوّر اسمك واختاره. ينحفظ في هذا الجوال بس.")));
    var s = searchBox({ id: "me-search", onPick: function (id) {
      store(ME_KEY, id);
      Kit.toast("هلا " + person(id).name);
      location.hash = "#/f/" + id;
    } });
    main.appendChild(s.el);
    setTimeout(function () { s.box.focus(); }, 50);
  }

  /* "عمك" said about someone else: "عم فلان"; "عمتك": "عمة فلان" */
  function aboutSomeone(term, who) {
    if (term === "أنت") return "نفسه";
    return term.replace(/(عم|زوج)تك(?=\s|$)/g, "$1ة " + who).replace(/ك(?=\s|$)/g, " " + who);
  }

  function viewRel(main, query) {
    var x = ix();
    main.appendChild(h("div", null, title("وش يقرب لي؟", "اختر اثنين وتشوف وش يقرب كل واحد للثاني، وين يلتقون.")));
    var a = query.a && person(query.a) ? query.a : meId();
    var b = query.b && person(query.b) ? query.b : "";
    function slot(label, value, key) {
      var area = h("div");
      var el = h("div", { class: "picked" }, h("span", { class: "row-title" }, value ? chainText(value, 4) : "ما اخترت"),
        h("button", { type: "button", class: "btn btn-quiet", "data-slot": key, onclick: function () {
          Kit.clear(area);
          var s = searchBox({ onPick: function (pid) {
            var q = { a: a, b: b };
            q[key] = pid;
            location.hash = "#/rel?a=" + (q.a || "") + "&b=" + (q.b || "");
          } });
          area.appendChild(s.el);
          s.box.focus();
        } }, value ? "غيّر" : "اختر"));
      return group(label, [el, area]);
    }
    main.appendChild(slot(a === meId() ? "أنت" : "الأول", a, "a"));
    main.appendChild(slot("الثاني", b, "b"));
    if (!a || !b) return;
    var r = T.relate(x, a, b);
    var r2 = T.relate(x, b, a);
    if (!r) {
      main.appendChild(h("div", { class: "rel-card" }, "ما يظهر بينهم رابط في الشجرة للحين."));
      return;
    }
    var mine = a === meId();
    main.appendChild(h("div", { class: "rel-card", id: "rel-result" },
      h("p", { class: "rel-big" }, shown(b) + " " + (mine ? r.term : aboutSomeone(r.term, shown(a)))),
      r2 ? h("p", null, (mine ? "وأنت " + r2.term.replace(/ك(?=\s|$)/g, "ه").replace(/^أنت$/, "نفسه") : shown(a) + " " + aboutSomeone(r2.term, shown(b)))) : null,
      r.via && r.a > 0 && r.b > 0 && r.by !== "marriage" ? h("p", { class: "hint" }, "يلتقون في " + T.nameChain(x, r.via, 3)) : null,
      r.by === "marriage" ? h("p", { class: "hint" }, "عن طريق الزواج") : null));
    if (r.via && r.by !== "marriage" && r.a > 0 && r.b > 0) {
      var cols = h("div", { class: "rel-cols" });
      [T.chain(x, a).slice(0, r.a + 1).reverse(), T.chain(x, b).slice(0, r.b + 1).reverse()].forEach(function (c) {
        var col = h("div", { class: "rel-col" });
        c.forEach(function (pid) { col.appendChild(h("a", { href: "#/f/" + pid, class: "rel-step" + (isF(x.p[pid]) ? " f" : "") }, shown(pid))); });
        cols.appendChild(col);
      });
      main.appendChild(section("من الجد المشترك لكل واحد", cols));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  help link the poster names                                       */
  /* ---------------------------------------------------------------- */

  function viewHelp(main) {
    var x = ix();
    main.appendChild(back("/more"));
    main.appendChild(h("div", null, title("ساعدنا نربط الأسماء", "هذي أسماء من الشجرة المطبوعة ما ندري مين أبوهم. إذا تعرف، اختر أبوه. وإذا ما تعرف اضغط ما أعرفه.")));
    var skip = store(SKIP_KEY) || {};
    var mineSug = {};
    rows("suggestions").forEach(function (s) {
      if (s.status === "pending" && s.kind === "edit" && T.parseChanges(s).father) mineSug[s.target] = 1;
    });
    var queue = T.helpQueue(x, Object.assign({}, skip, mineSug)).filter(function (id) { return !hidden(person(id)); });
    if (!queue.length) {
      main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "خلصت كل الأسماء. الله يعطيك العافية.")));
      if (Object.keys(skip).length) main.appendChild(h("button", { type: "button", class: "btn", onclick: function () { store(SKIP_KEY, {}); render(); } }, "رجّع اللي قلت ما أعرفه"));
      return;
    }
    var id = queue[0];
    var p = person(id);
    var g = Number(p.gen);
    var leftInLevel = queue.filter(function (q) { return Number(person(q).gen) === g; }).length;
    var near = T.neighbours(x, id, 6).filter(function (n) { return x.p[n].father && !hidden(x.p[n]); }).slice(0, 3);
    var box = h("div", { class: "help-card", "data-person": id },
      h("span", { class: "hint" }, "الجيل " + g + " · باقي " + leftInLevel + " في هذا الجيل"),
      h("p", { class: "help-name" }, shown(id)),
      near.length ? h("p", { class: "hint" }, "مكتوب قريب منه في الشجرة المطبوعة: " + near.map(function (n) { return T.nameChain(x, n, 2); }).join("، ")) : null);
    main.appendChild(box);
    function choose(fid) {
      if (owner()) {
        S.hub.put("people", { id: id, father: fid });
        Kit.toast(shown(id) + (isF(p) ? " بنت " : " ولد ") + x.p[fid].name);
      } else {
        suggest({ kind: "edit", target: id, changes: { father: fid }, note: "من ساعدنا نربط الأسماء" });
        Kit.toast("وصلت لـ" + keeper() + ". الله يعطيك العافية");
      }
      render();
    }
    var cl = h("div", { class: "cands" });
    main.appendChild(h("p", { class: "section-title" }, "مين أبوه؟"));
    T.fatherCandidates(x, id, 4).forEach(function (c) {
      cl.appendChild(h("button", { type: "button", class: "cand", "data-cand": c.id, onclick: function () { choose(c.id); } }, T.nameChain(x, c.id, 3)));
    });
    main.appendChild(cl);
    var more = h("div");
    main.appendChild(h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn", id: "help-other", onclick: function () {
        Kit.clear(more);
        var s = searchBox({ placeholder: "دوّر أبوه", filter: function (pid) { return !isF(person(pid)) && pid !== id; }, onPick: choose });
        more.appendChild(s.el);
        s.box.focus();
      } }, "أبوه غيرهم"),
      h("button", { type: "button", class: "btn btn-quiet", id: "help-skip", onclick: function () {
        skip[id] = 1;
        store(SKIP_KEY, skip);
        render();
      } }, "ما أعرفه")));
    main.appendChild(more);
  }

  /* ---------------------------------------------------------------- */
  /*  changes from the family                                          */
  /* ---------------------------------------------------------------- */

  function suggest(s) {
    S.hub.put("suggestions", { kind: s.kind, target: s.target || "", changes: JSON.stringify(s.changes || {}), note: s.note || "", status: "pending", by: Kit.who().name || "", created: new Date().toISOString(), reply: "", decided: "" });
  }

  var FIELD_NAMES = { name: "الاسم", known: "الكنية", gender: "ولد أو بنت", alive: "حي", born: "مواليد", died: "توفي", place: "ساكن في", about: "معلومات عنه", father: "أبوه", mother: "أمه", order: "ترتيبه بين إخوانه", text: "المعلومة", a: "الزوج", b: "الزوجة", family: "من أسرة" };
  var KIND_NAMES = { edit: "تعديل", add: "إضافة", note: "معلومة", marriage: "زواج" };

  function valueText(k, v) {
    if (k === "father" || k === "a" || k === "b") return v && person(v) ? chainText(v, 4) : v ? "(غير موجود)" : "ما حدد";
    if (k === "mother") {
      var m = ix().marriages[v];
      return m ? wifeText(m) : v && person(v) ? chainText(v, 3) : "ما ندري";
    }
    if (k === "gender") return v === "f" ? "بنت" : "ولد";
    if (k === "alive") return v === "no" ? "الله يرحمه" : "حي";
    if (k === "born" || k === "died") return v ? T.yearText(v) : "(فاضي)";
    return v === "" || v === undefined || v === null ? "(فاضي)" : String(v);
  }

  function suggestionCard(s, forOwner) {
    var x = ix();
    var c = T.parseChanges(s);
    var target = s.target && person(s.target);
    var what = target ? chainText(target.id, 4) : s.kind === "add" ? (c.gender === "f" ? "بنت" : c.name) + (c.father && person(c.father) ? (c.gender === "f" ? " " : " ولد ") + T.nameChain(x, c.father, 3) : "") : "";
    var box = h("div", { class: "card-pad sug", "data-sug": s.id },
      h("div", { class: "sug-head" }, h("span", { class: "row-title" }, (KIND_NAMES[s.kind] || s.kind) + (what ? ": " + what : "")), h("span", { class: "hint" }, [s.by, String(s.created || "").slice(0, 10)].filter(String).join(" · "))));
    var diffs = s.kind === "edit" ? T.diff(x, s) : Object.keys(c).filter(function (k) { return c[k] !== "" && !(k === "alive" && c[k] === "yes"); }).map(function (k) { return { field: k, from: "", to: c[k] }; });
    var tb = h("div", { class: "diff" });
    diffs.forEach(function (d) {
      var womanField = (d.field === "name" || d.field === "known") && ((target && isF(target)) || c.gender === "f") && !womenShown();
      tb.appendChild(h("div", { class: "diff-row" + (s.kind === "edit" ? "" : " two-col") }, h("span", { class: "diff-field" }, FIELD_NAMES[d.field] || d.field),
        s.kind === "edit" ? h("span", { class: "diff-from" }, womanField ? "…" : valueText(d.field, d.from)) : null,
        h("span", { class: "diff-to" }, womanField ? "(اضغط إظهار البنات)" : valueText(d.field, d.to))));
    });
    if (!diffs.length) tb.appendChild(h("p", { class: "hint" }, "ما يغير شي."));
    box.appendChild(tb);
    if (s.note) box.appendChild(h("p", { class: "sug-note" }, s.note));
    if (target) box.appendChild(h("a", { class: "hint", href: "#/f/" + target.id }, "افتح مكانه في الشجرة"));
    if (s.status !== "pending") {
      box.appendChild(h("p", { class: "status status-" + s.status }, { accepted: "انعتمد", rejected: "ما انعتمد", withdrawn: "انسحب" }[s.status] + (s.reply ? ": " + s.reply : "")));
      return box;
    }
    if (forOwner) {
      var reply = input("", { placeholder: "رد (إذا تبي)", class: "field-input sug-reply" });
      box.appendChild(reply);
      box.appendChild(h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn btn-primary sug-accept", onclick: function () {
          var writes = T.accept(x, s, newId, today());
          writes.forEach(function (w) {
            if (w.table === "people" && s.kind === "add") Object.assign(w.row, { added: today(), added_by: s.by || "" });
            if (w.table === "suggestions") w.row.reply = reply.value.trim();
          });
          S.hub.putMany(writes);
          Kit.toast("انعتمد");
          render();
        } }, "اعتمد"),
        Kit.confirmButton("لا تعتمد", "اضغط مرة ثانية", function () {
          S.hub.put("suggestions", { id: s.id, status: "rejected", reply: reply.value.trim(), decided: new Date().toISOString() });
          render();
        }, "btn btn-quiet")));
    } else {
      box.appendChild(h("div", { class: "btn-row" }, Kit.confirmButton("اسحبه", "اضغط مرة ثانية", function () {
        S.hub.put("suggestions", { id: s.id, status: "withdrawn" });
        render();
      }, "btn btn-quiet")));
    }
    return box;
  }

  function viewInbox(main) {
    main.appendChild(back("/more"));
    main.appendChild(h("div", null, title("تعديلات العائلة", "اللي أرسلوها أفراد العائلة. ما يتغير شي لين تعتمده.")));
    var all = rows("suggestions").sort(function (a, b) { return String(a.created) < String(b.created) ? -1 : 1; });
    var pending = all.filter(function (s) { return s.status === "pending"; });
    if (!pending.length) main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "ما فيه جديد.")));
    pending.forEach(function (s) { main.appendChild(section(null, suggestionCard(s, true))); });
    var done = all.filter(function (s) { return s.status !== "pending"; }).reverse().slice(0, 30);
    if (done.length) main.appendChild(section("السابقة", done.map(function (s) { return suggestionCard(s, true); })));
  }

  function viewMine(main) {
    main.appendChild(back("/more"));
    main.appendChild(h("div", null, title("اللي أرسلته", "تعديلاتك ومعلوماتك، ووش صار فيها.")));
    var mine = rows("suggestions").filter(function (s) { return s.by === Kit.who().name; }).sort(function (a, b) { return String(b.created) < String(a.created) ? -1 : 1; });
    if (!mine.length) main.appendChild(h("div", { class: "list" }, h("div", { class: "empty" }, "ما أرسلت شي للحين. افتح أي واحد في الشجرة واضغط عدّل.")));
    mine.forEach(function (s) { main.appendChild(section(null, suggestionCard(s, false))); });
  }

  /* ---------------------------------------------------------------- */
  /*  edit or add a person                                             */
  /* ---------------------------------------------------------------- */

  function viewEdit(main, id, query) {
    var isNew = id === "new";
    var x = ix();
    var p = isNew ? { gender: query.gender === "f" ? "f" : "m", father: query.father || "", alive: "yes", family: "main" } : person(id);
    if (!p) return main.appendChild(h("p", { class: "empty" }, "غير موجود."));
    main.appendChild(back(isNew ? (p.father ? "/f/" + p.father : "/") : "/f/" + id));
    var heading = isNew ? (p.gender === "f" ? "إضافة بنت" : "إضافة ولد") + (p.father && person(p.father) ? " لـ" + person(p.father).name : "") : "تعديل " + shown(id);
    main.appendChild(h("div", null, title(heading, owner() ? null : "يوصل لـ" + keeper() + "، وما يتغير شي لين يعتمده.")));
    var showName = !(isF(p) && !womenShown() && !isNew);
    var name = input(showName ? p.name : "", { id: "e-name", placeholder: showName ? "" : "مخفي، اضغط إظهار البنات" , disabled: !showName });
    var known = input(p.known, { id: "e-known", placeholder: "أبو فلان، أو اللقب" });
    var gender = chips("ولد أو بنت", [{ value: "m", label: "ولد" }, { value: "f", label: "بنت" }], p.gender || "m", { id: "e-gender" });
    var alive = chips("حاله", [{ value: "yes", label: "حي" }, { value: "no", label: "الله يرحمه" }], p.alive || "yes", { id: "e-alive" });
    var born = input(p.born, { id: "e-born", inputmode: "numeric", placeholder: "مثل 1395 أو 1975" });
    var died = input(p.died, { id: "e-died", inputmode: "numeric" });
    var place = input(p.place, { id: "e-place", placeholder: "بريدة، الشقة…" });
    var order = input(p.order, { id: "e-order", inputmode: "numeric", placeholder: "1 للأكبر" });
    var about = textarea(p.about, { id: "e-about" });
    var father = picker("أبوه", p.father, function (pid) { return !isF(person(pid)) && pid !== id && T.chain(x, pid).indexOf(id) < 0; }, "father");
    /* the mother: one of the father's wives */
    var motherSel = h("select", { class: "select", id: "e-mother" });
    function paintMothers(fid) {
      Kit.clear(motherSel);
      motherSel.appendChild(h("option", { value: "" }, "ما ندري"));
      (x.wives[fid] || []).forEach(function (m) {
        var o = h("option", { value: m.id }, wifeText(m));
        if (m.id === p.mother) o.selected = true;
        motherSel.appendChild(o);
      });
    }
    paintMothers(p.father);
    var note = textarea("", { id: "e-note", rows: 2, placeholder: "من وين المعلومة؟ مثلا: أبوي يقول…" });

    if (showName || isNew) main.appendChild(field("الاسم", name));
    main.appendChild(field("الكنية", known));
    main.appendChild(group("ولد أو بنت", gender.el));
    main.appendChild(group("حاله", alive.el));
    main.appendChild(father.el);
    main.appendChild(field("أمه", motherSel, (x.wives[p.father] || []).length ? null : "تنضاف زوجات الأب من صفحته، بعدها تقدر تختار أمه."));
    main.appendChild(h("div", { class: "two" }, field("مواليد", born), field("توفي", died)));
    main.appendChild(h("div", { class: "two" }, field("ساكن في", place), field("ترتيبه بين إخوانه", order)));
    main.appendChild(field("معلومات عنه", about));
    if (!owner()) main.appendChild(field("ملاحظة لـ" + keeper(), note));
    var msg = msgLine();
    main.appendChild(msg);
    main.appendChild(h("button", { type: "button", class: "btn btn-primary btn-wide", id: "e-save", onclick: function () {
      var nm = showName ? name.value.trim() : p.name;
      if (!nm) { msg.textContent = "اكتب الاسم."; return; }
      var digitsOnly = function (v) { return String(v || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).trim(); };
      var ord = digitsOnly(order.value);
      var row = { name: nm, known: known.value.trim(), gender: gender.get(), alive: alive.get(), born: digitsOnly(born.value), died: digitsOnly(died.value), place: place.value.trim(), order: ord && isFinite(Number(ord)) ? Number(ord) : "", about: about.value.trim(), father: father.get(), mother: father.get() === p.father ? motherSel.value : "" };
      if (owner()) {
        if (isNew) {
          row.id = newId();
          var fg = row.father && person(row.father) && person(row.father).gen !== "" ? Number(person(row.father).gen) : NaN;
          row.gen = isFinite(fg) ? fg + 1 : "";
          row.family = "main";
          row.added = today();
          row.added_by = keeper();
        } else row.id = id;
        S.hub.put("people", row);
        Kit.toast(isNew ? "انضاف" : "انحفظ");
        location.hash = "#/f/" + row.id;
      } else {
        var changes = {};
        Object.keys(row).forEach(function (k) {
          var before = isNew ? "" : p[k] === undefined || p[k] === null ? "" : p[k];
          if (String(row[k]) !== String(before)) changes[k] = row[k];
        });
        if (isNew && changes.alive === "yes") delete changes.alive;
        if (!Object.keys(changes).length) { msg.textContent = "ما تغير شي."; return; }
        suggest({ kind: isNew ? "add" : "edit", target: isNew ? "" : id, changes: changes, note: note.value.trim() });
        Kit.toast("وصل لـ" + keeper());
        location.hash = isNew ? "#/mine" : "#/f/" + id;
      }
    } }, owner() ? "احفظ" : "أرسل لـ" + keeper()));
    if (!isNew && owner()) {
      var kids = x.kids[id] || [];
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:14px" }, kids.length
        ? h("p", { class: "hint" }, "عشان تحذفه انقل عياله أول (" + kids.length + ").")
        : Kit.confirmButton("احذفه من الشجرة", "اضغط مرة ثانية للحذف", function () {
          S.hub.remove("people", id);
          Kit.toast("انحذف");
          location.hash = p.father ? "#/f/" + p.father : "#/";
        }, "btn btn-quiet")));
    }
  }

  /** A man's wives: from the family (linked), or a name and her family. */
  function viewWives(main, id) {
    var x = ix();
    var p = person(id);
    if (!p || isF(p)) return viewFocus(main, id);
    main.appendChild(back("/f/" + id));
    main.appendChild(h("div", null, title("زوجات " + p.name, owner() ? null : "يوصل لـ" + keeper() + ".")));
    var wives = x.wives[id] || [];
    var wl = h("div", { class: "list", id: "wives" });
    if (!wives.length) wl.appendChild(h("div", { class: "empty" }, "ما فيه زوجات مسجلة."));
    wives.forEach(function (m) {
      wl.appendChild(h("div", { class: "row" }, h("span", { class: "row-title" }, wifeText(m)),
        owner() ? Kit.confirmButton("شيل", "اضغط مرة ثانية", function () { S.hub.remove("marriages", m.id); render(); }, "btn btn-quiet") : null));
    });
    main.appendChild(wl);
    function save(change) {
      if (owner()) {
        S.hub.put("marriages", Object.assign({ a: id, b: "", name: "", family: "", note: "" }, change));
        Kit.toast("انحفظ");
      } else {
        suggest({ kind: "marriage", target: id, changes: Object.assign({ a: id }, change) });
        Kit.toast("وصل لـ" + keeper());
      }
      render();
    }
    /* from another family: her name and family, nothing more */
    var nm = input("", { id: "w-name", placeholder: "مثل: حصة بنت صالح" });
    var fam = input("", { id: "w-family", placeholder: "مثل: السعيد" });
    var msg = msgLine();
    main.appendChild(section("زوجة من أسرة ثانية", [field("اسمها", nm), field("أسرتها", fam), msg,
      h("button", { type: "button", class: "btn btn-primary", id: "w-add", onclick: function () {
        if (!nm.value.trim()) { msg.textContent = "اكتب اسمها."; return; }
        save({ name: nm.value.trim(), family: fam.value.trim() });
      } }, owner() ? "أضف" : "أرسل")]));
    /* from the family: link her */
    if (womenShown()) {
      var s = searchBox({ placeholder: "دوّر اسمها في الشجرة", filter: function (pid) { return isF(person(pid)); }, onPick: function (pid) { save({ b: pid }); } });
      main.appendChild(section("زوجة من الأسرة", s.el));
    } else {
      main.appendChild(section("زوجة من الأسرة", h("p", { class: "hint" }, "اضغط إظهار البنات فوق عشان تدوّرها.")));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  more: new, check, data, settings                                 */
  /* ---------------------------------------------------------------- */

  function viewMore(main) {
    main.appendChild(h("div", null, title("المزيد")));
    var pending = rows("suggestions").filter(function (x) { return x.status === "pending"; });
    var items = [["#/help", "ساعدنا نربط الأسماء", "أسماء من الشجرة المطبوعة ما ندري مين أبوهم"], ["#/new", "جديد في الشجرة", "مواليد، إضافات، معلومات"]];
    if (owner()) items.push(["#/inbox", "تعديلات العائلة", pending.length ? pending.length + " تنتظرك" : "ما فيه جديد"]);
    else items.push(["#/mine", "اللي أرسلته", "تعديلاتك ووش صار فيها"]);
    if (owner()) items.push(["#/check", "الفحص", "مطابقة الأعداد مع الشجرة المطبوعة"]);
    if (owner()) items.push(["#/data", "البيانات", "الإدخال والنسخة"]);
    items.push(["#/settings", "الإعدادات", owner() && !setting("keeper") ? "اكتب اسمك اللي يظهر للعائلة" : "أنا، حجم الخط، هذا الجوال"]);
    var el = h("div", { class: "list" });
    items.forEach(function (i) {
      el.appendChild(h("a", { class: "prow" + (i[0] === "#/inbox" && pending.length ? " alert" : ""), href: i[0] }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, i[1]), h("span", { class: "row-sub" }, i[2]))));
    });
    main.appendChild(el);
  }

  function viewNew(main) {
    main.appendChild(back("/more"));
    main.appendChild(h("div", null, title("جديد في الشجرة", "آخر 90 يوم.")));
    var since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    var items = [];
    rows("people").forEach(function (p) {
      if (p.added && p.added >= since) items.push({ date: p.added, el: personRow(p.id, { sub: "انضاف" + (p.added_by ? " من " + p.added_by : "") }) });
    });
    rows("notes").forEach(function (n) {
      if (n.date >= since && person(n.person) && !hidden(person(n.person))) items.push({ date: n.date, el: personRow(n.person, { sub: "معلومة جديدة من " + (n.by || "") }) });
    });
    items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var el = h("div", { class: "list" });
    if (!items.length) el.appendChild(h("div", { class: "empty" }, "ما فيه جديد."));
    items.forEach(function (i) { el.appendChild(i.el); });
    main.appendChild(el);
  }

  function viewCheck(main) {
    var x = ix();
    main.appendChild(back("/more"));
    main.appendChild(h("div", null, title("الفحص", "كل رقم لازم يطابق الشجرة المطبوعة، وكل واحد لازم يكون جيل واحد تحت أبوه.")));
    var tb = h("table", { class: "census" });
    tb.appendChild(h("tr", null, h("th", null, "الجيل"), h("th", null, "المطبوعة"), h("th", null, "من الملصق"), h("th", null, "الكل"), h("th", null, "مربوط")));
    T.census(x).forEach(function (r) {
      var bad = r.poster && r.onPoster !== r.poster;
      tb.appendChild(h("tr", { class: bad ? "bad" : null }, h("td", null, String(r.gen)), h("td", null, r.poster ? String(r.poster) : "-"), h("td", null, String(r.onPoster)), h("td", null, String(r.all)), h("td", null, String(r.linked))));
    });
    main.appendChild(section("الأعداد", tb));
    var problems = T.check(x);
    var why = { level: function (p) { return "جيله " + p.gen + " في المطبوعة، وأبوه في الجيل " + p.fatherLevel; }, mother: function () { return "أبوه مسجل بنت"; }, loop: function () { return "الرابط يدور على نفسه"; } };
    var el = h("div", { class: "list", id: "problems" });
    if (!problems.length) el.appendChild(h("div", { class: "empty" }, "كل الروابط سليمة."));
    problems.forEach(function (p) { el.appendChild(personRow(p.id, { sub: why[p.kind](p) })); });
    main.appendChild(section("روابط تحتاج نظرة (" + problems.length + ")", el));
  }

  function viewData(main) {
    var x = ix();
    main.appendChild(back("/more"));
    main.appendChild(h("div", null, title("البيانات", "الشجرة محفوظة في جدول قوقل خاص فيها، وتنحفظ نسخة كل ليلة.")));
    var stats = h("div", { class: "list facts" });
    [["الأسماء", Object.keys(x.p).length], ["المربوطين بآبائهم", Object.keys(x.p).filter(function (id) { return x.p[id].father && x.p[x.p[id].father]; }).length], ["الزواجات", rows("marriages").length], ["المعلومات", rows("notes").length]].forEach(function (r) {
      stats.appendChild(h("div", { class: "fact" }, h("span", { class: "fact-label" }, r[0]), h("span", { class: "fact-value" }, String(r[1]))));
    });
    main.appendChild(stats);
    var file = h("input", { type: "file", accept: ".json,application/json", id: "import-file" });
    var paste = textarea("", { rows: 3, id: "import-text", placeholder: "أو الصق محتوى الملف هنا" });
    var msg = msgLine();
    main.appendChild(section("إدخال نسخة التطبيق القديم", [file, paste, msg, h("button", { type: "button", class: "btn btn-primary", id: "import-go", onclick: function () {
      var run = function (text) {
        var d;
        try { d = T.fromBackup(text); } catch (e) { msg.textContent = "الملف ما يصلح: " + e.message; return; }
        if (rows("people").length && !S.keep.confirmImport) {
          S.keep.confirmImport = true;
          msg.textContent = "في الشجرة " + rows("people").length + " اسم. اضغط مرة ثانية عشان تدخل النسخة فوقها.";
          return;
        }
        var writes = [];
        d.families.forEach(function (r) { writes.push({ table: "families", row: r }); });
        d.people.forEach(function (r) { writes.push({ table: "people", row: r }); });
        d.marriages.forEach(function (r) { writes.push({ table: "marriages", row: r }); });
        S.hub.putMany(writes);
        if (d.me && !meId()) store(ME_KEY, d.me);
        Kit.toast("دخل " + d.people.length + " اسم");
        location.hash = "#/check";
      };
      if (file.files && file.files[0]) {
        var fr = new FileReader();
        fr.onload = function () { run(String(fr.result)); };
        fr.readAsText(file.files[0]);
      } else if (paste.value.trim()) run(paste.value.trim());
      else msg.textContent = "اختر الملف أو الصقه.";
    } }, "إدخال")]));
    main.appendChild(section("نسخة للحفظ", [h("p", { class: "hint" }, "ملف بنفس شكل التطبيق القديم، تحفظه وين ما تبي."),
      h("button", { type: "button", class: "btn", id: "export", onclick: function () {
        var data = T.toBackup({ people: rows("people"), families: rows("families"), marriages: rows("marriages"), notes: rows("notes") }, meId());
        var blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
        var a = h("a", { href: URL.createObjectURL(blob), download: "family-" + today() + ".json" });
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      } }, "نزّل النسخة")]));
  }

  function viewSettings(main) {
    main.appendChild(back("/more"));
    main.appendChild(h("div", null, title("الإعدادات")));
    var me = meId();
    main.appendChild(section("أنا", [me ? personRow(me, { names: 4 }) : h("p", { class: "hint" }, "ما اخترت نفسك للحين."), h("a", { class: "btn", href: "#/me" }, me ? "غيّر" : "اختر نفسك")]));
    var big = chips("حجم الخط", [{ value: "", label: "عادي" }, { value: "big", label: "كبير" }], store(BIG_KEY) || "", { id: "size" });
    big.el.addEventListener("click", function () {
      store(BIG_KEY, big.get());
      document.documentElement.classList.toggle("big", big.get() === "big");
    });
    main.appendChild(section("حجم الخط", big.el));
    if (owner()) {
      var kn = input(setting("keeper"), { id: "keeper", placeholder: "اسمك" });
      main.appendChild(section("اسمك عند العائلة", [field("تظهر لهم: أرسل لـ…", kn), h("button", { type: "button", class: "btn", onclick: function () {
        S.hub.put("settings", { id: "keeper", value: kn.value.trim() });
        Kit.toast("انحفظ");
      } }, "احفظ")]));
    }
    main.appendChild(section("هذا الجوال", [h("p", { class: "hint" }, "المفتاح: " + (Kit.who().name || "") + (owner() ? " (صاحب الشجرة)" : "")),
      Kit.confirmButton("اقفل هذا الجوال", "اضغط مرة ثانية للقفل", function () { Kit.lockDevice(S.hub); })]));
  }

  /* ---------------------------------------------------------------- */
  /*  frame: the women's names button and the tabs                     */
  /* ---------------------------------------------------------------- */

  var womenBtn = null;
  function paintWomenBtn() {
    if (!womenBtn) return;
    womenBtn.textContent = womenShown() ? "إخفاء البنات" : "إظهار البنات";
    womenBtn.setAttribute("aria-pressed", womenShown() ? "true" : "false");
  }

  var tabEls = {};
  function tabbar() {
    var bar = h("nav", { class: "tabbar", "aria-label": "التنقل" });
    var inner = h("div", { class: "tabbar-inner" });
    [["", "الشجرة"], ["s", "بحث"], ["rel", "وش يقرب لي"], ["more", "المزيد"]].forEach(function (t) {
      var el = h("a", { class: "tab", href: "#/" + t[0], "data-tab": t[0] }, t[1]);
      tabEls[t[0]] = el;
      inner.appendChild(el);
    });
    bar.appendChild(inner);
    return bar;
  }

  function paintTabs(name) {
    var owner_ = { "": "", f: "", b: "", edit: "", wives: "", me: "", s: "s", rel: "rel" }[name];
    if (owner_ === undefined) owner_ = "more";
    Object.keys(tabEls).forEach(function (k) {
      if (k === owner_) tabEls[k].setAttribute("aria-current", "page");
      else tabEls[k].removeAttribute("aria-current");
    });
    // what is waiting for the keeper, on the tab he opens to find it
    var waiting = owner() ? rows("suggestions").filter(function (x) { return x.status === "pending"; }).length : 0;
    if (tabEls.more) {
      tabEls.more.textContent = "المزيد";
      if (waiting) tabEls.more.appendChild(h("span", { class: "tab-count" }, String(waiting)));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  routing                                                          */
  /* ---------------------------------------------------------------- */

  var FORMS = { edit: 1, wives: 1, me: 1, data: 1, inbox: 1, settings: 1, s: 1 };
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
    route = next;
    var main = S.main;
    Kit.clear(main);
    switch (route.name) {
      case "f": viewFocus(main, route.arg); break;
      case "b": viewBranch(main, route.arg); break;
      case "s": viewSearch(main); break;
      case "me": viewMe(main); break;
      case "rel": viewRel(main, route.query); break;
      case "help": viewHelp(main); break;
      case "edit": viewEdit(main, route.arg, route.query); break;
      case "wives": viewWives(main, route.arg); break;
      case "inbox": owner() ? viewInbox(main) : viewMine(main); break;
      case "mine": viewMine(main); break;
      case "more": viewMore(main); break;
      case "new": viewNew(main); break;
      case "check": viewCheck(main); break;
      case "data": owner() ? viewData(main) : viewMore(main); break;
      case "settings": viewSettings(main); break;
      default: viewFocus(main);
    }
    paintTabs(route.name);
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
      if (store(BIG_KEY) === "big") document.documentElement.classList.add("big");
      var header = document.querySelector(".app-header");
      womenBtn = h("button", { type: "button", class: "women-btn", id: "women", onclick: function () {
        setWomen(!womenShown());
        paintWomenBtn();
        render();
      } });
      paintWomenBtn();
      if (header) header.insertBefore(womenBtn, header.lastChild);
      document.body.appendChild(tabbar());
      hub.on(onData);
      window.addEventListener("hashchange", render);
      render();
    },
    onWho: function () {
      render();
    },
  });
})();
