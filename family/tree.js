/*
 * Family tree: the logic, with no screens, so it can be tested on its own.
 *
 * Tables in the "Life apps: family" sheet:
 *   people       name, gen, father, mother, family, gender (m/f), alive (yes/no), born, died,
 *                known (kunya or nickname), place, about, flagged, x, y, order
 *                gen  = the level printed on the poster (kept as printed)
 *                x, y = where the name sits on the poster, for "who is near" hints
 *   families     name, primary, note
 *   marriages    a, b, note                       (a husband and wife, any families)
 *   notes        person, text, by, date           (what people know about someone)
 *   suggestions  by, kind (edit, add, note, marriage), target, changes (JSON), note,
 *                status (pending, accepted, rejected, withdrawn), reply, decided, created
 */
(function (root) {
  "use strict";

  /* how many names each printed level holds on the poster: any count must match */
  var POSTER = { 3: 16, 4: 34, 5: 57, 6: 237, 7: 831, 8: 268, 9: 122 };

  /* ---------------------------------------------------------------- */
  /*  words                                                            */
  /* ---------------------------------------------------------------- */

  /** أإآ to ا, ة to ه, ى to ي, marks out, lower case, single spaces. */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[ً-ْٰـ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  var LINK_WORDS = { "بن": 1, "بنت": 1, "ابن": 1, "بن.": 1, "ال": 0 };

  function num(v) {
    var n = Number(v);
    return v === "" || v === null || v === undefined || !isFinite(n) ? null : n;
  }

  /* ---------------------------------------------------------------- */
  /*  the index                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Everything the screens ask often, worked out once: people by id,
   * children, the chain up to the root, levels, descendant counts.
   */
  function build(people, marriages) {
    var p = {};
    var kids = {};
    (people || []).forEach(function (r) {
      if (!r || r.del || !r.id) return;
      p[r.id] = r;
    });
    Object.keys(p).forEach(function (id) {
      var f = p[id].father;
      if (f && p[f] && f !== id) (kids[f] = kids[f] || []).push(id);
    });
    Object.keys(kids).forEach(function (f) {
      kids[f].sort(function (a, b) {
        var oa = num(p[a].order);
        var ob = num(p[b].order);
        if (oa !== null && ob !== null && oa !== ob) return oa - ob;
        if (oa !== null && ob === null) return -1;
        if (ob !== null && oa === null) return 1;
        if ((p[a].gender === "f") !== (p[b].gender === "f")) return p[a].gender === "f" ? 1 : -1;
        return String(p[a].name).localeCompare(String(p[b].name), "ar");
      });
    });
    var spouses = {};
    (marriages || []).forEach(function (m) {
      if (!m || m.del || !p[m.a] || !p[m.b]) return;
      (spouses[m.a] = spouses[m.a] || []).push({ id: m.b, marriage: m.id });
      (spouses[m.b] = spouses[m.b] || []).push({ id: m.a, marriage: m.id });
    });
    var ix = { p: p, kids: kids, spouses: spouses, _chain: {}, _lvl: {}, _count: {}, _norm: {} };
    ix.roots = Object.keys(p).filter(function (id) {
      return !p[id].father || !p[p[id].father];
    });
    return ix;
  }

  /** The person, his father, his grandfather ... up to the top. Safe against loops. */
  function chain(ix, id) {
    if (ix._chain[id]) return ix._chain[id];
    var out = [];
    var seen = {};
    var cur = id;
    while (cur && ix.p[cur] && !seen[cur] && out.length < 80) {
      seen[cur] = 1;
      out.push(cur);
      cur = ix.p[cur].father;
    }
    ix._chain[id] = out;
    return out;
  }

  function hasLoop(ix, id) {
    var c = chain(ix, id);
    var top = ix.p[c[c.length - 1]];
    return !!(top && top.father && ix.p[top.father] && c.indexOf(top.father) >= 0);
  }

  /**
   * The level: as printed, or counted from the nearest ancestor that has
   * one, or for the founders above level 1, counted back from a descendant.
   * Unknown (null) for a name not linked to anyone yet.
   */
  function level(ix, id) {
    if (id in ix._lvl) return ix._lvl[id];
    var c = chain(ix, id);
    var out = null;
    for (var i = 0; i < c.length; i++) {
      var g = num(ix.p[c[i]].gen);
      if (g !== null) {
        out = g + i;
        break;
      }
    }
    if (out === null) {
      /* someone above level 1 (or in a family with no printed levels): from below */
      var queue = [[id, 0]];
      var seen = {};
      while (queue.length && out === null) {
        var q = queue.shift();
        if (seen[q[0]]) continue;
        seen[q[0]] = 1;
        var gg = num(ix.p[q[0]].gen);
        if (gg !== null && q[1] > 0) {
          out = gg - q[1];
          break;
        }
        (ix.kids[q[0]] || []).forEach(function (k) {
          if (q[1] < 12) queue.push([k, q[1] + 1]);
        });
      }
    }
    if (out === null && ((ix.kids[id] || []).length || ix.p[id].father || ix.spouses[id])) {
      /* a family with no printed levels: counted from its first known man */
      out = c.length;
    }
    ix._lvl[id] = out;
    return out;
  }

  /** Everyone below a person. */
  function descendants(ix, id) {
    if (id in ix._count) return ix._count[id];
    ix._count[id] = 0; /* loop guard */
    var n = 0;
    (ix.kids[id] || []).forEach(function (k) {
      n += 1 + descendants(ix, k);
    });
    ix._count[id] = n;
    return n;
  }

  /** "محمد بن صالح بن عبدالله", with بنت for a woman's own link. */
  function nameChain(ix, id, count) {
    var c = chain(ix, id);
    if (count) c = c.slice(0, count);
    return c
      .map(function (pid, i) {
        var n = ix.p[pid].name || "";
        if (i === 0) return n;
        return (i === 1 && ix.p[id].gender === "f" ? "بنت " : "بن ") + n;
      })
      .join(" ");
  }

  function isFemale(person) {
    return person && person.gender === "f";
  }

  /* ---------------------------------------------------------------- */
  /*  search                                                           */
  /* ---------------------------------------------------------------- */

  function chainNorm(ix, id) {
    if (!ix._norm[id]) {
      ix._norm[id] = chain(ix, id).map(function (pid) {
        return norm(ix.p[pid].name);
      });
    }
    return ix._norm[id];
  }

  /**
   * Search starts at the person's own name and goes up his line, word by
   * word: "محمد عبدالله" finds Mohammed whose father is Abdullah, not every
   * one of the hundreds who share the family's grandfathers. The last word
   * may be unfinished. "بن" and "بنت" are skipped. The family name at the
   * end is allowed ("محمد العائلة").
   */
  function search(ix, query, limit, families) {
    var words = norm(query).split(" ").filter(function (w) {
      return w && !LINK_WORDS[w];
    });
    if (!words.length) return [];
    var famIds = {};
    if (families && words.length > 1) {
      var last = words[words.length - 1];
      (families || []).forEach(function (f) {
        var fn = norm(f.name);
        if (fn === last || fn === "ال" + last || "ال" + fn === last) famIds[f.id] = 1;
      });
    }
    var out = [];
    Object.keys(ix.p).forEach(function (id) {
      var person = ix.p[id];
      var w = words;
      if (Object.keys(famIds).length && famIds[person.family || "main"]) w = words.slice(0, -1);
      var names = chainNorm(ix, id);
      var score = 0;
      var ok = w.length <= names.length;
      for (var i = 0; ok && i < w.length; i++) {
        var isLast = i === w.length - 1;
        if (names[i] === w[i]) score += 2;
        else if (isLast && names[i].indexOf(w[i]) === 0) score += 1;
        else if (isLast && names[i].replace(/^ال/, "").indexOf(w[i].replace(/^ال/, "")) === 0) score += 1;
        else ok = false;
      }
      if (!ok && w.length === 1 && person.known && norm(person.known).indexOf(w[0]) >= 0) {
        ok = true;
        score = 1;
      }
      if (ok) out.push({ id: id, score: score, lvl: level(ix, id) });
    });
    out.sort(function (a, b) {
      return b.score - a.score || (a.lvl === null ? 99 : a.lvl) - (b.lvl === null ? 99 : b.lvl) || String(ix.p[a.id].name).localeCompare(String(ix.p[b.id].name), "ar");
    });
    return out.slice(0, limit || 60).map(function (x) { return x.id; });
  }

  /* ---------------------------------------------------------------- */
  /*  kinship                                                          */
  /* ---------------------------------------------------------------- */

  function word(female, m, f) {
    return female ? f : m;
  }

  /**
   * What x is to me, in Arabic, with where the two lines meet.
   * a = generations from me up to the shared grandfather, b = from x.
   */
  function termFor(a, b, female) {
    if (a === 0 && b === 0) return "أنت";
    if (a === 0) {
      if (b === 1) return word(female, "ابنك", "بنتك");
      if (b === 2) return word(female, "حفيدك", "حفيدتك");
      if (b === 3) return word(female, "ابن حفيدك", "بنت حفيدك");
      return "من ذريتك";
    }
    if (b === 0) {
      if (a === 1) return "أبوك";
      if (a === 2) return "جدك";
      if (a === 3) return "جد أبيك";
      if (a === 4) return "جد جدك";
      return "من أجدادك";
    }
    var base;
    if (a === 1) base = ["أخيك", word(female, "أخوك", "أختك")];
    else if (a === 2) base = ["عمك", word(female, "عمك", "عمتك")];
    else if (a === 3) base = ["عم أبيك", word(female, "عم أبيك", "عمة أبيك")];
    else if (a === 4) base = ["عم جدك", word(female, "عم جدك", "عمة جدك")];
    else base = null;
    if (!base) return word(female, "ابن عم بعيد", "بنت عم بعيدة");
    if (b === 1) return base[1];
    var own = word(female, "ابن ", "بنت ");
    if (b === 2) return own + base[0];
    if (b === 3) return own + "ابن " + base[0];
    return "من ذرية " + base[0];
  }

  /**
   * How x is related to me: { term, a, b, via (the shared grandfather's id),
   * by ("marriage" when it goes through a husband or wife) } or null.
   */
  /* after زوجة: أبوك becomes أبيك, أخوك becomes أخيك */
  function genitive(term) {
    return term.replace(/^أبوك$/, "أبيك").replace(/^أخوك$/, "أخيك");
  }

  function relate(ix, meId, xId) {
    if (!ix.p[meId] || !ix.p[xId]) return null;
    /* a mother is recorded on the child, when known */
    if (ix.p[meId].mother === xId) return { term: "أمك", a: 1, b: 0, via: xId, by: "mother" };
    if (ix.p[xId].mother === meId) return { term: word(isFemale(ix.p[xId]), "ابنك", "بنتك"), a: 0, b: 1, via: meId, by: "mother" };
    var direct = relateLines(ix, meId, xId);
    if (direct) return direct;
    var xFemale = isFemale(ix.p[xId]);
    /* x's husband or wife is related to me: زوجة عمك, زوج أختك, زوجتك */
    var viaX = null;
    (ix.spouses[xId] || []).some(function (s) {
      var r = relateLines(ix, meId, s.id);
      if (!r) return false;
      var term = r.term === "أنت" ? word(xFemale, "زوجك", "زوجتك") : word(xFemale, "زوج ", "زوجة ") + genitive(r.term);
      viaX = { term: term, a: r.a, b: r.b, via: r.via, by: "marriage", spouse: s.id };
      return true;
    });
    if (viaX) return viaX;
    /* I married into the family: x is related to my husband or wife */
    var viaMe = null;
    (ix.spouses[meId] || []).some(function (s) {
      var r = relateLines(ix, s.id, xId);
      if (!r) return false;
      var husband = !isFemale(ix.p[s.id]);
      var spouseWord = husband ? "زوجك" : "زوجتك";
      var term;
      if (r.a === 0 && husband) term = termFor(0, r.b, xFemale); /* his children are hers too, as far as the tree knows */
      else if (r.term === "أنت") term = spouseWord;
      else if (/ك$/.test(r.term)) term = r.term.replace(/ك$/, " " + spouseWord);
      else term = r.term + " (من جهة " + spouseWord + ")";
      viaMe = { term: term, a: r.a, b: r.b, via: r.via, by: "marriage", spouse: s.id };
      return true;
    });
    return viaMe;
  }

  function relateLines(ix, meId, xId) {
    var A = chain(ix, meId);
    var B = chain(ix, xId);
    var at = {};
    A.forEach(function (id, i) { at[id] = i; });
    for (var b = 0; b < B.length; b++) {
      if (B[b] in at) {
        var a = at[B[b]];
        return { term: termFor(a, b, isFemale(ix.p[xId])), a: a, b: b, via: B[b] };
      }
    }
    return null;
  }

  /* ---------------------------------------------------------------- */
  /*  checking the links                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Links that cannot be right: a printed level that is not one below the
   * father's, a father who is a woman, a loop. These are the ones to look at;
   * every relation below a wrong link is wrong too.
   */
  function check(ix) {
    var out = [];
    Object.keys(ix.p).forEach(function (id) {
      var person = ix.p[id];
      var f = person.father && ix.p[person.father];
      if (!f) return;
      if (hasLoop(ix, id)) {
        out.push({ id: id, kind: "loop" });
        return;
      }
      if (isFemale(f)) out.push({ id: id, kind: "mother" });
      var g = num(person.gen);
      var fl = level(ix, f.id);
      if (g !== null && fl !== null && g !== fl + 1) out.push({ id: id, kind: "level", gen: g, fatherLevel: fl });
    });
    return out.sort(function (x, y) {
      return (num(ix.p[x.id].gen) || 99) - (num(ix.p[y.id].gen) || 99);
    });
  }

  /** Names per printed level in the main family, next to the poster's count. */
  function census(ix) {
    var by = {};
    Object.keys(ix.p).forEach(function (id) {
      var person = ix.p[id];
      var g = num(person.gen);
      if (g === null || (person.family && person.family !== "main")) return;
      var row = (by[g] = by[g] || { gen: g, all: 0, linked: 0, onPoster: 0, poster: POSTER[g] || null });
      row.all++;
      if (num(person.x) !== null) row.onPoster++;
      if (person.father && ix.p[person.father]) row.linked++;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.gen - b.gen; });
  }

  /* ---------------------------------------------------------------- */
  /*  linking                                                          */
  /* ---------------------------------------------------------------- */

  /** People at a printed level who have no father yet. */
  function unlinked(ix, gen) {
    return Object.keys(ix.p).filter(function (id) {
      var person = ix.p[id];
      return num(person.gen) === gen && !(person.father && ix.p[person.father]);
    }).sort(function (a, b) {
      return (num(ix.p[a].x) || 0) - (num(ix.p[b].x) || 0);
    });
  }

  /**
   * Who could be someone's father: the men one level up, nearest on the
   * poster first. Nearness is only a hint; the poster's branches cannot be read.
   */
  function fatherCandidates(ix, childId, limit) {
    var child = ix.p[childId];
    var lv = level(ix, childId);
    var g = num(child.gen);
    var want = g !== null ? g - 1 : lv !== null ? lv - 1 : null;
    var cx = num(child.x);
    var cy = num(child.y);
    var list = Object.keys(ix.p)
      .filter(function (id) {
        if (id === childId || isFemale(ix.p[id])) return false;
        if (chain(ix, id).indexOf(childId) >= 0) return false;
        return want === null || level(ix, id) === want;
      })
      .map(function (id) {
        var x = num(ix.p[id].x);
        var y = num(ix.p[id].y);
        var d = cx !== null && x !== null ? Math.round(Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2))) : null;
        return { id: id, distance: d };
      })
      .sort(function (a, b) {
        if (a.distance === null && b.distance === null) return String(ix.p[a.id].name).localeCompare(String(ix.p[b.id].name), "ar");
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    return list.slice(0, limit || 12);
  }

  /* ---------------------------------------------------------------- */
  /*  bringing in the old app's backup                                 */
  /* ---------------------------------------------------------------- */

  /**
   * The old app's JSON backup as rows for the sheet:
   * { people, families, marriages, notes, me, problems }.
   */
  function fromBackup(json) {
    var d = typeof json === "string" ? JSON.parse(json) : json;
    if (!d || !Array.isArray(d.people)) throw new Error("This is not a family register backup.");
    var problems = [];
    var ids = {};
    var people = d.people.map(function (r) {
      if (ids[r.id]) problems.push("duplicate id " + r.id);
      ids[r.id] = 1;
      return {
        id: String(r.id),
        name: String(r.name || "").trim(),
        gen: num(r.gen) === null ? "" : num(r.gen),
        father: r.fatherId || "",
        family: r.familyId || "main",
        gender: r.gender === "f" ? "f" : "m",
        alive: r.alive === false ? "no" : "yes",
        born: r.born || "",
        died: r.died || "",
        known: r.known || "",
        place: r.place || "",
        about: r.note || "",
        flagged: r.flagged ? "yes" : "",
        x: num(r.x) === null ? "" : num(r.x),
        y: num(r.y) === null ? "" : num(r.y),
      };
    });
    people.forEach(function (r) {
      if (r.father && !ids[r.father]) {
        problems.push(r.name + " (" + r.id + "): father " + r.father + " is missing");
        r.father = "";
      }
    });
    var families = (d.families || []).map(function (f) {
      return { id: String(f.id), name: f.name || "", primary: f.primary ? "yes" : "", note: f.note || "" };
    });
    var marriages = (d.links || []).filter(function (l) {
      return ids[l.aId] && ids[l.bId];
    }).map(function (l) {
      return { id: String(l.id), a: l.aId, b: l.bId, note: l.note || "" };
    });
    return { people: people, families: families, marriages: marriages, me: d.meId && ids[d.meId] ? d.meId : "", problems: problems };
  }

  /** The tables as a backup file in the same shape the old app used, so nothing is locked in. */
  function toBackup(tables, meId) {
    return {
      lang: "ar",
      meId: meId || "",
      backupAt: new Date().toISOString(),
      families: (tables.families || []).map(function (f) { return { id: f.id, name: f.name, primary: f.primary === "yes", note: f.note || "" }; }),
      links: (tables.marriages || []).map(function (m) { return { id: m.id, aId: m.a, bId: m.b, note: m.note || "" }; }),
      people: (tables.people || []).map(function (r) {
        return { id: r.id, name: r.name, gen: num(r.gen), fatherId: r.father || null, familyId: r.family || "main", gender: r.gender || "m", alive: r.alive !== "no", born: r.born || "", died: r.died || "", known: r.known || "", place: r.place || "", note: r.about || "", flagged: r.flagged === "yes", x: num(r.x), y: num(r.y) };
      }),
      notes: (tables.notes || []).map(function (n) { return { id: n.id, person: n.person, text: n.text, by: n.by, date: n.date }; }),
    };
  }

  /* ---------------------------------------------------------------- */
  /*  suggestions                                                      */
  /* ---------------------------------------------------------------- */

  var EDITABLE = ["name", "known", "gender", "alive", "born", "died", "place", "about", "father", "mother", "family", "gen", "order"];

  function parseChanges(s) {
    try {
      var c = typeof s.changes === "string" ? JSON.parse(s.changes || "{}") : s.changes || {};
      return c && typeof c === "object" ? c : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * What accepting a suggestion writes: [{ table, row }]. `newId` makes the
   * id for an added person or note. `today` dates a note.
   */
  function accept(ix, s, newId, today) {
    var c = parseChanges(s);
    var out = [];
    if (s.kind === "edit" && ix.p[s.target]) {
      var row = { id: s.target };
      EDITABLE.forEach(function (k) {
        if (k in c) row[k] = c[k];
      });
      out.push({ table: "people", row: row });
    } else if (s.kind === "add") {
      var person = { id: newId(), name: String(c.name || "").trim(), gender: c.gender === "f" ? "f" : "m", father: c.father || "", family: c.family || "main", alive: c.alive === "no" ? "no" : "yes", born: c.born || "", died: c.died || "", known: c.known || "", place: c.place || "", about: c.about || "", gen: "" };
      if (person.father && ix.p[person.father]) {
        var fg = num(ix.p[person.father].gen);
        if (fg !== null) person.gen = fg + 1;
      }
      out.push({ table: "people", row: person });
      /* someone added as a husband or wife comes with the marriage */
      if (c.spouse && ix.p[c.spouse]) {
        var him = person.gender === "f" ? c.spouse : person.id;
        out.push({ table: "marriages", row: { id: newId(), a: him, b: him === person.id ? c.spouse : person.id, note: "" } });
      }
    } else if (s.kind === "note" && ix.p[s.target]) {
      out.push({ table: "notes", row: { id: newId(), person: s.target, text: String(c.text || "").trim(), by: s.by || "", date: today || "" } });
    } else if (s.kind === "marriage" && ix.p[c.a] && ix.p[c.b]) {
      out.push({ table: "marriages", row: { id: newId(), a: c.a, b: c.b, note: c.note || "" } });
    }
    out.push({ table: "suggestions", row: { id: s.id, status: "accepted", decided: new Date().toISOString() } });
    return out;
  }

  /** Field by field, what a suggestion changes: [{ field, from, to }]. */
  function diff(ix, s) {
    var c = parseChanges(s);
    var before = s.kind === "edit" ? ix.p[s.target] || {} : {};
    return Object.keys(c).filter(function (k) {
      return String(before[k] === undefined ? "" : before[k]) !== String(c[k] === undefined ? "" : c[k]);
    }).map(function (k) {
      return { field: k, from: before[k] === undefined ? "" : before[k], to: c[k] };
    });
  }

  var FTree = {
    POSTER: POSTER,
    norm: norm,
    build: build,
    chain: chain,
    level: level,
    descendants: descendants,
    nameChain: nameChain,
    search: search,
    termFor: termFor,
    relate: relate,
    check: check,
    census: census,
    unlinked: unlinked,
    fatherCandidates: fatherCandidates,
    fromBackup: fromBackup,
    toBackup: toBackup,
    parseChanges: parseChanges,
    accept: accept,
    diff: diff,
    hasLoop: hasLoop,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = FTree;
  else root.FTree = FTree;
})(typeof window !== "undefined" ? window : this);
