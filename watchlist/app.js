/*
 * Watchlist: the screens.
 *
 * Your list lives in the sheet like every other app. Everything else is
 * looked up as you go: TMDB for titles, seasons and where to watch, OMDb and
 * MyAnimeList for more ratings, and your Emby server through the hub. Items
 * on your list keep a copy of what was looked up, refreshed about once a day,
 * so the list opens instantly and works offline.
 */
(function () {
  "use strict";

  var h = Kit.h;
  var W = window.WatchData;
  var TABLES = ["items", "settings"];
  var S = { hub: null, data: null, main: null, set: {}, mem: {}, emby: { state: "", msg: "" } };
  var IMG = "https://image.tmdb.org/t/p/";

  /* ---------------------------------------------------------------- */
  /*  data                                                             */
  /* ---------------------------------------------------------------- */

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function refresh() {
    var d = {};
    TABLES.forEach(function (t) {
      d[t] = S.hub.all(t);
    });
    S.data = d;
    S.set = {};
    d.settings.forEach(function (r) {
      S.set[r.id] = r.value;
    });
  }

  function item(key) {
    return S.hub.get("items", key);
  }

  function hoursSince(iso) {
    return iso ? (Date.now() - Date.parse(iso)) / 3600000 : 1e9;
  }

  function dayText(d) {
    if (!d) return "";
    var p = String(d).split("-").map(Number);
    var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][p[1] - 1];
    var n = Math.round((new Date(p[0], p[1] - 1, p[2], 12) - new Date(today() + "T12:00:00")) / 86400000);
    var base = p[2] + " " + m + (String(p[0]) !== today().slice(0, 4) ? " " + p[0] : "");
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    if (n > 1 && n < 7) return new Date(p[0], p[1] - 1, p[2], 12).toLocaleDateString("en-GB", { weekday: "long" }) + ", " + base;
    return base;
  }

  /* ---------------------------------------------------------------- */
  /*  looking things up                                                */
  /* ---------------------------------------------------------------- */

  function lang() {
    return S.set.lang === "ar" ? "ar-SA" : "en-US";
  }

  /** TMDB: a v4 read token (long) goes in the header, a v3 key (32 letters) in the address. */
  function tmdb(path, params) {
    var token = String(S.set.tmdb || "").trim();
    if (!token) return Promise.reject(new Error("Add your TMDB key in Settings to look things up."));
    var q = new URLSearchParams(params || {});
    var headers = { accept: "application/json" };
    if (/^[a-f0-9]{32}$/i.test(token)) q.set("api_key", token);
    else headers.Authorization = "Bearer " + token;
    var url = "https://api.themoviedb.org/3" + path + "?" + q.toString();
    if (S.mem[url] && Date.now() - S.mem[url].at < 600000) return Promise.resolve(S.mem[url].data);
    return fetch(url, { headers: headers }).then(function (r) {
      if (r.status === 401) throw new Error("TMDB did not accept the key. Check it in Settings.");
      if (!r.ok) throw new Error("TMDB answered " + r.status + ".");
      return r.json();
    }).then(function (data) {
      S.mem[url] = { at: Date.now(), data: data };
      return data;
    }, function (e) {
      if (/TMDB/.test(e.message)) throw e;
      throw new Error("Cannot reach TMDB right now.");
    });
  }

  function details(kind, id) {
    return tmdb("/" + kind + "/" + id, { language: lang(), append_to_response: "external_ids,watch/providers" });
  }

  function omdb(imdb) {
    var key = String(S.set.omdb || "").trim();
    if (!key || !imdb) return Promise.resolve({});
    return fetch("https://www.omdbapi.com/?i=" + encodeURIComponent(imdb) + "&apikey=" + encodeURIComponent(key))
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(W.fromOmdb, function () { return {}; });
  }

  function mal(title, original, year) {
    return fetch("https://api.jikan.moe/v4/anime?limit=5&q=" + encodeURIComponent(original || title))
      .then(function (r) { return r.ok ? r.json() : { data: [] }; })
      .then(function (j) { return W.pickMal(j.data || [], title, original, year) || {}; }, function () { return {}; });
  }

  function embyCall(body) {
    var c = Hub.config();
    var req = { action: "emby" };
    Object.keys(body).forEach(function (k) { req[k] = body[k]; });
    return Hub.call(c, req);
  }

  /** More ratings for one title: { imdb, rt, mc, mal } merged into what we had. */
  function moreScores(row) {
    var jobs = [omdb(row.imdb)];
    if (row.anime === "yes") jobs.push(mal(row.title, row.original, row.year));
    return Promise.all(jobs).then(function (parts) {
      var s = W.json(row.scores, {});
      parts.forEach(function (p) {
        Object.keys(p).forEach(function (k) { s[k] = p[k]; });
      });
      s.at = new Date().toISOString();
      return s;
    });
  }

  function embyInfo(f) {
    if (!f) return "";
    if (f.seasons) return f.seasons + (f.seasons === 1 ? " season, " : " seasons, ") + f.episodes + " episodes";
    return "";
  }

  /** Asks Emby about some list items and writes what it says. */
  function checkEmby(rows) {
    if (!rows.length) return Promise.resolve();
    var ask = rows.slice(0, 30).map(function (r) {
      return { key: r.id, kind: r.kind, tmdb: r.tmdb, imdb: r.imdb, title: r.title, year: r.year };
    });
    return embyCall({ op: "find", items: ask }).then(function (res) {
      S.emby = { state: "ok", msg: "" };
      var now = new Date().toISOString();
      var writes = rows.slice(0, 30).map(function (r) {
        var f = res.found[r.id];
        var row = { id: r.id, emby: f ? "yes" : "no", emby_info: embyInfo(f), emby_checked: now };
        if (f && r.emby !== "yes") row.emby_since = today();
        return { table: "items", row: row };
      });
      S.hub.putMany(writes);
      if (rows.length > 30) return checkEmby(rows.slice(30));
    }, function (e) {
      S.emby = { state: "error", msg: e.message };
    });
  }

  /**
   * Keeps the list's copies fresh: details and where to watch about once a
   * day, more ratings once a week, Emby every few hours. A few at a time.
   */
  function refreshList() {
    if (S.refreshing || !S.synced) return;
    var rows = S.hub.all("items");
    var stale = rows.filter(function (r) { return r.status !== "done" ? hoursSince(r.refreshed) > 20 : hoursSince(r.refreshed) > 24 * 14; }).slice(0, 12);
    var embyDue = rows.filter(function (r) { return hoursSince(r.emby_checked) > 6 && (r.status !== "done" || hoursSince(r.emby_checked) > 24 * 7); });
    if (!stale.length && !embyDue.length) return;
    S.refreshing = true;
    var work = Promise.resolve();
    if (S.set.tmdb) {
      stale.forEach(function (r) {
        work = work.then(function () {
          var p = W.parseKey(r.id);
          return details(p.kind, p.id).then(function (d) {
            var row = W.fromDetails(d, p.kind, W.REGION);
            row.id = r.id;
            row.refreshed = new Date().toISOString();
            var sc = W.json(r.scores, {});
            var later = hoursSince(sc.at) > 24 * 7 ? moreScores(Object.assign({}, r, row)) : Promise.resolve(null);
            return later.then(function (s) {
              if (s) row.scores = JSON.stringify(s);
              S.hub.put("items", row);
            });
          }).catch(function () {});
        });
      });
    }
    work.then(function () {
      if (S.emby.state === "error" && /not set up/.test(S.emby.msg)) return;
      return checkEmby(embyDue);
    }).then(function () {
      S.refreshing = false;
    }, function () {
      S.refreshing = false;
    });
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

  function section(name, kids, attrs) {
    return h("section", Object.assign({ class: "section" }, attrs || {}), name ? h("h2", { class: "section-title" }, name) : null, kids);
  }

  function field(label, input, hint) {
    var single = input && /^(INPUT|SELECT|TEXTAREA)$/.test(input.tagName);
    return h(single ? "label" : "div", single ? { class: "field" } : { class: "field", role: "group", "aria-label": label },
      h("span", { class: "field-label" }, label), input, hint ? h("span", { class: "note" }, hint) : null);
  }

  function select(options, value, attrs) {
    var el = h("select", Object.assign({ class: "select" }, attrs || {}));
    options.forEach(function (o) {
      var opt = h("option", { value: o.value }, o.label);
      if (String(o.value) === String(value)) opt.selected = true;
      el.appendChild(opt);
    });
    return el;
  }

  function toggle(options, value, attrs, onChange) {
    var wrap = h("div", Object.assign({ class: "toggle", role: "group" }, attrs || {}));
    options.forEach(function (o) {
      wrap.appendChild(h("button", { type: "button", "data-value": o.value, "aria-pressed": String(o.value === value), onclick: function () { onChange(o.value); } }, o.label));
    });
    return wrap;
  }

  function poster(path, cls) {
    return path
      ? h("img", { class: cls || "poster", src: IMG + "w185" + path, alt: "", loading: "lazy" })
      : h("span", { class: (cls || "poster") + " poster-empty", "aria-hidden": "true" });
  }

  function kindTag(r) {
    return r.anime === "yes" || r.anime === true ? "Anime" : r.kind === "tv" ? "Series" : "Film";
  }

  function message(text) {
    return h("p", { class: "empty" }, text);
  }

  var ICONS = {
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M10 9.5v5l4-2.5z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/></svg>',
    discover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/></svg>',
  };

  function icon(name) {
    var span = h("span", { "aria-hidden": "true" });
    span.innerHTML = ICONS[name];
    return span.firstChild;
  }

  /* ---------------------------------------------------------------- */
  /*  my list                                                          */
  /* ---------------------------------------------------------------- */

  function itemRow(r) {
    var bits = [];
    if (r.kind === "tv") {
      var n = W.behind(r);
      if (r.status === "watching") bits.push(n ? n + (n === 1 ? " new episode" : " episodes to watch") : W.progressText(r));
      if (r.next_air && r.next_air >= today()) bits.push(W.label(r.next_s, r.next_e) + " " + dayText(r.next_air));
    }
    var where = W.whereLine(r, S.set);
    if (where) bits.push(where);
    var rating = Number(r.rating) ? h("span", { class: "my-rating", "aria-label": "Your rating " + r.rating }, "★ " + r.rating) : null;
    return h("a", { class: "title-row", href: "#/t/" + r.kind + "/" + r.tmdb, "data-key": r.id },
      poster(r.poster, "thumb"),
      h("div", { class: "row-main" },
        h("span", { class: "row-title" }, r.title, r.year ? h("span", { class: "year" }, " " + r.year) : null, h("span", { class: "tag" }, kindTag(r))),
        bits.length ? h("span", { class: "row-sub" }, bits.join(" · ")) : null),
      rating);
  }

  function viewList(main, status) {
    var t = today();
    var alerts = W.alerts(S.data.items, t);
    var tabs = toggle(W.STATUSES.map(function (s) { return { value: s.id, label: s.name + " " + W.listOf(S.data.items, s.id).length }; }), status, { id: "status-tabs", "aria-label": "List" }, function (v) {
      go(v === "watching" ? "/" : "/" + v);
    });
    main.appendChild(tabs);
    if (status === "watching" && alerts.length) {
      var al = h("div", { class: "list", id: "alerts", style: "margin-top:12px" });
      alerts.forEach(function (a) {
        var p = W.parseKey(a.key);
        al.appendChild(h("a", { class: "row-link", href: "#/t/" + p.kind + "/" + p.id, "data-alert": a.kind },
          h("div", { class: "row-main" }, h("span", { class: "row-title" }, a.text), a.sub ? h("span", { class: "row-sub" }, a.sub) : null)));
      });
      main.appendChild(section("New for you", al));
    }
    var rows = W.listOf(S.data.items, status);
    var list = h("div", { class: "list", id: "items", style: "margin-top:12px" });
    if (!rows.length) {
      list.appendChild(h("div", { class: "empty" }, status === "done" ? "Nothing watched yet." : "Nothing here yet. Find something in Search or Discover."));
    }
    rows.forEach(function (r) {
      list.appendChild(itemRow(r));
    });
    main.appendChild(list);
    if (!S.set.tmdb) main.appendChild(h("p", { class: "note" }, h("a", { href: "#/settings" }, "Add your TMDB key"), " to search and to keep the list up to date."));
  }

  /* ---------------------------------------------------------------- */
  /*  search and discover                                              */
  /* ---------------------------------------------------------------- */

  function resultRow(r) {
    var mine = item(r.key);
    return h("a", { class: "title-row", href: "#/t/" + r.kind + "/" + r.id, "data-key": r.key },
      poster(r.poster, "thumb"),
      h("div", { class: "row-main" },
        h("span", { class: "row-title" }, r.title, r.year ? h("span", { class: "year" }, " " + r.year) : null, h("span", { class: "tag" }, kindTag(r))),
        h("span", { class: "row-sub" }, [r.score ? "TMDB " + r.score.toFixed(1) : "", mine ? (W.STATUSES.filter(function (s) { return s.id === mine.status; })[0] || {}).name + ", on your list" : ""].filter(String).join(" · "))));
  }

  function viewSearch(main, query) {
    main.appendChild(h("div", null, title("Search")));
    var input = h("input", { class: "field-input", type: "search", id: "q", placeholder: "Film, series or anime", value: query.q || "", autocomplete: "off" });
    var out = h("div", { class: "list", id: "results", style: "margin-top:12px" });
    var timer = null;
    var seq = 0;
    function run() {
      var q = input.value.trim();
      history.replaceState(null, "", "#/search" + (q ? "?q=" + encodeURIComponent(q) : ""));
      Kit.clear(out);
      if (q.length < 2) return;
      var n = ++seq;
      out.appendChild(h("div", { class: "empty" }, "Looking…"));
      tmdb("/search/multi", { query: q, language: lang(), include_adult: "false" }).then(function (res) {
        if (n !== seq) return;
        Kit.clear(out);
        var rows = (res.results || []).map(function (r) { return W.fromResult(r); }).filter(Boolean);
        if (!rows.length) out.appendChild(h("div", { class: "empty" }, "Nothing found."));
        rows.forEach(function (r) { out.appendChild(resultRow(r)); });
      }, function (e) {
        if (n !== seq) return;
        Kit.clear(out).appendChild(h("div", { class: "empty" }, e.message));
      });
    }
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(run, 350);
    });
    main.appendChild(input);
    main.appendChild(out);
    if (input.value) run();
    setTimeout(function () { input.focus(); }, 50);
  }

  function shelf(name, id, load) {
    var row = h("div", { class: "shelf", id: id }, h("span", { class: "shelf-wait" }, "Loading…"));
    load().then(function (items) {
      Kit.clear(row);
      if (!items.length) row.appendChild(h("span", { class: "shelf-wait" }, "Nothing right now."));
      items.forEach(function (r) {
        var mine = r.key && item(r.key);
        row.appendChild(h(r.id ? "a" : "div", { class: "shelf-item", href: r.id ? "#/t/" + r.kind + "/" + r.id : null, "data-key": r.key || null },
          poster(r.poster, "shelf-poster"),
          h("span", { class: "shelf-title" }, r.title),
          h("span", { class: "shelf-sub" }, [r.year, r.extra || (r.score ? "★ " + r.score.toFixed(1) : ""), mine ? "on list" : ""].filter(String).join(" · "))));
      });
    }, function (e) {
      Kit.clear(row).appendChild(h("span", { class: "shelf-wait" }, e.message));
    });
    return section(name, row);
  }

  function results(res, kind) {
    return (res.results || []).map(function (r) { return W.fromResult(r, kind); }).filter(Boolean);
  }

  /** The newest on Emby, matched to TMDB for posters where Emby knows the TMDB id. */
  function embyLatest(kind) {
    return embyCall({ op: "latest", kind: kind, limit: 20 }).then(function (res) {
      S.emby = { state: "ok", msg: "" };
      return Promise.all(res.items.map(function (e) {
        var base = { title: e.name, year: e.year, kind: kind, extra: e.seasons ? e.seasons + (e.seasons === 1 ? " season" : " seasons") : "" };
        if (!e.tmdb || !S.set.tmdb) return base;
        return tmdb("/" + kind + "/" + e.tmdb, { language: lang() }).then(function (d) {
          var r = W.fromResult(d, kind);
          r.extra = base.extra;
          return r;
        }, function () { return base; });
      }));
    }, function (e) {
      S.emby = { state: "error", msg: e.message };
      throw e;
    });
  }

  function viewDiscover(main) {
    main.appendChild(h("div", null, title("Discover")));
    var mine = W.serviceIds(S.set);
    main.appendChild(shelf("New on Emby: series", "shelf-emby-tv", function () { return embyLatest("tv"); }));
    main.appendChild(shelf("New on Emby: films", "shelf-emby-movie", function () { return embyLatest("movie"); }));
    if (mine.length) {
      var p = { watch_region: W.REGION, with_watch_providers: mine.join("|"), with_watch_monetization_types: "flatrate", sort_by: "popularity.desc", language: lang() };
      main.appendChild(shelf("Popular on your services: series", "shelf-yours-tv", function () { return tmdb("/discover/tv", p).then(function (r) { return results(r, "tv"); }); }));
      main.appendChild(shelf("Popular on your services: films", "shelf-yours-movie", function () { return tmdb("/discover/movie", p).then(function (r) { return results(r, "movie"); }); }));
    }
    main.appendChild(shelf("Trending this week", "shelf-trending", function () { return tmdb("/trending/all/week", { language: lang() }).then(function (r) { return results(r); }); }));
    main.appendChild(shelf("Anime: popular now", "shelf-anime", function () {
      return tmdb("/discover/tv", { with_genres: "16", with_original_language: "ja", sort_by: "popularity.desc", language: lang() }).then(function (r) { return results(r, "tv"); });
    }));
    main.appendChild(shelf("Top rated films", "shelf-top", function () { return tmdb("/movie/top_rated", { language: lang() }).then(function (r) { return results(r, "movie"); }); }));
  }

  /* ---------------------------------------------------------------- */
  /*  one title                                                        */
  /* ---------------------------------------------------------------- */

  function providerChips(list) {
    var el = h("div", { class: "providers" });
    list.forEach(function (p) {
      el.appendChild(h("span", { class: "provider" + (p.yours ? " yours" : "") }, p.logo ? h("img", { src: IMG + "w45" + p.logo, alt: "" }) : null, p.name, p.yours ? h("span", { class: "tag" }, "yours") : null));
    });
    return el;
  }

  function viewTitle(main, kind, id) {
    var key = W.keyOf(kind, id);
    main.appendChild(back("Back", "/"));
    var holder = h("div", { id: "title" });
    main.appendChild(holder);
    var saved = item(key);
    var shown = saved;
    function paint(row) {
      shown = row;
      Kit.clear(holder);
      paintTitle(holder, row, key);
    }
    if (saved) paint(saved);
    else holder.appendChild(message("Looking…"));
    if (!S.set.tmdb) {
      if (!saved) Kit.clear(holder).appendChild(message("Add your TMDB key in Settings to look things up."));
      return;
    }
    details(kind, id).then(function (d) {
      if (current.key !== key) return;
      var row = W.fromDetails(d, kind, W.REGION);
      row.id = key;
      var now = item(key);
      if (now) {
        /* the copy on your list is brought up to date while you look */
        row.refreshed = new Date().toISOString();
        S.hub.put("items", row);
        paint(item(key));
      } else {
        paint(Object.assign({ id: key, status: "" }, row));
        /* Emby and more ratings for something not on the list yet */
        var extra = Object.assign({ id: key }, row);
        moreScores(extra).then(function (s) {
          if (current.key !== key || item(key)) return;
          shown.scores = JSON.stringify(s);
          paint(shown);
        });
        embyCall({ op: "find", items: [{ key: key, kind: kind, tmdb: row.tmdb, imdb: row.imdb, title: row.title, year: row.year }] }).then(function (res) {
          if (current.key !== key || item(key)) return;
          var f = res.found[key];
          shown.emby = f ? "yes" : "no";
          shown.emby_info = embyInfo(f);
          paint(shown);
        }, function (e) {
          S.emby = { state: "error", msg: e.message };
        });
      }
    }, function (e) {
      if (!saved) Kit.clear(holder).appendChild(message(e.message));
    });
  }

  function paintTitle(holder, r, key) {
    var onList = !!item(key);
    var meta = [r.year, kindTag(r)];
    if (r.kind === "tv" && r.seasons) meta.push(r.seasons + (Number(r.seasons) === 1 ? " season" : " seasons"));
    if (r.runtime) meta.push(r.runtime + " min");
    holder.appendChild(h("div", { class: "title-head" },
      poster(r.poster, "poster-big"),
      h("div", null, h("h1", { class: "page-title", style: "margin-top:0" }, r.title), r.original && r.original !== r.title ? h("p", { class: "note", style: "margin:0" }, r.original) : null,
        h("p", { class: "note" }, meta.filter(String).join(" · ")), r.genres ? h("p", { class: "note", style: "margin:0" }, r.genres) : null)));
    var sc = W.scores(r);
    if (sc.length) {
      var se = h("div", { class: "scores", id: "scores" });
      sc.forEach(function (s) { se.appendChild(h("span", { class: "score" }, h("b", null, s.text), h("span", null, s.name))); });
      holder.appendChild(se);
    }
    if (r.overview) holder.appendChild(h("p", { class: "overview" }, r.overview));

    /* where to watch */
    var w = W.whereToWatch(r, S.set);
    var where = h("div", { id: "where" });
    if (r.emby === "yes") where.appendChild(h("p", { class: "emby yes" }, "On Emby" + (r.emby_info ? ": " + r.emby_info : "")));
    else if (r.emby === "no") where.appendChild(h("p", { class: "emby" }, "Not on Emby"));
    if (w.stream.length) where.appendChild(h("div", null, h("span", { class: "field-label" }, "Stream"), providerChips(w.stream)));
    var rb = w.rent.concat(w.buy.filter(function (b) { return !w.rent.some(function (x) { return x.id === b.id; }); }));
    if (rb.length) where.appendChild(h("div", null, h("span", { class: "field-label" }, "Rent or buy"), providerChips(rb)));
    if (!w.stream.length && !rb.length && r.emby !== "yes") where.appendChild(h("p", { class: "note" }, "Not streaming in Saudi Arabia right now."));
    holder.appendChild(section("Where to watch", where));

    if (r.kind === "tv" && (r.next_air || r.last_air)) {
      var ep = h("div", { class: "list" });
      if (r.last_air) ep.appendChild(h("div", { class: "kv" }, h("span", null, "Latest"), h("span", null, W.label(r.last_s, r.last_e) + ", " + dayText(r.last_air))));
      if (r.next_air) ep.appendChild(h("div", { class: "kv", id: "next-ep" }, h("span", null, "Next"), h("span", null, W.label(r.next_s, r.next_e) + ", " + dayText(r.next_air))));
      else if (r.show_status) ep.appendChild(h("div", { class: "kv" }, h("span", null, "Status"), h("span", null, r.show_status)));
      holder.appendChild(section("Episodes", ep));
    }

    holder.appendChild(section("Your list", onList ? mineBlock(item(key)) : addBlock(r, key), { id: "mine" }));
  }

  function addBlock(r, key) {
    return h("div", { class: "btn-row" }, W.STATUSES.map(function (s) {
      return h("button", { type: "button", class: s.id === "want" ? "btn btn-primary" : "btn", "data-add": s.id, onclick: function () {
        var row = {};
        Object.keys(r).forEach(function (k) { if (k !== "status") row[k] = r[k]; });
        row.id = key;
        row.status = s.id;
        row.added = new Date().toISOString();
        row.refreshed = new Date().toISOString();
        if (s.id === "done") row.finished = today();
        if (s.id === "watching" && r.kind === "tv") { row.season = 1; row.episode = 0; }
        if (!r.scores) row.scores = "";
        /* already known to be on Emby (or not): that is not news later */
        if (r.emby) row.emby_checked = new Date().toISOString();
        S.hub.put("items", row);
        Kit.toast("Added to " + s.name);
        render();
        if (!r.scores) moreScores(row).then(function (sc) { S.hub.put("items", { id: key, scores: JSON.stringify(sc) }); });
        if (!r.emby) checkEmby([item(key)]);
      } }, s.name);
    }));
  }

  function setProgress(r, s, e) {
    var row = { id: r.id, season: s, episode: e, touched: new Date().toISOString() };
    if (r.status === "want") row.status = "watching";
    var after = Object.assign({}, r, row);
    var ended = /ended|canceled/i.test(r.show_status || "");
    if (ended && !W.nextEpisode(after, s, e) && W.behind(after) === 0) {
      row.status = "done";
      row.finished = today();
      Kit.toast("Finished " + r.title + ". Moved to Watched");
    }
    S.hub.put("items", row);
  }

  function mineBlock(r) {
    var box = h("div", null);
    box.appendChild(toggle(W.STATUSES.map(function (s) { return { value: s.id, label: s.name }; }), r.status, { id: "status", "aria-label": "Status" }, function (v) {
      var row = { id: r.id, status: v, touched: new Date().toISOString() };
      if (v === "done" && !r.finished) row.finished = today();
      if (v === "watching" && r.kind === "tv" && !Number(r.season)) { row.season = 1; row.episode = 0; }
      S.hub.put("items", row);
      render();
    }));

    if (r.kind === "tv") {
      var eps = W.seasonEps(r);
      var s = Number(r.season) || 1;
      var seasonSel = select((eps.length ? eps : [0]).map(function (n, i) { return { value: i + 1, label: "Season " + (i + 1) }; }), s, { id: "p-season", "aria-label": "Season" });
      var epSel = select([{ value: 0, label: "Not started" }].concat(Array.from({ length: eps[s - 1] || Math.max(Number(r.episode) || 0, 1) }, function (_, i) { return { value: i + 1, label: "Episode " + (i + 1) }; })), Number(r.episode) || 0, { id: "p-episode", "aria-label": "Episode" });
      seasonSel.addEventListener("change", function () { setProgress(r, Number(seasonSel.value), 0); render(); });
      epSel.addEventListener("change", function () { setProgress(r, Number(seasonSel.value), Number(epSel.value)); render(); });
      var nx = W.nextEpisode(r, r.season, r.episode);
      var n = W.behind(r);
      box.appendChild(h("div", { class: "progress" },
        h("p", { class: "progress-text", id: "progress" }, W.progressText(r) + (n ? ". " + n + (n === 1 ? " episode" : " episodes") + " out that you have not seen" : "")),
        h("div", { class: "two" }, seasonSel, epSel),
        nx ? h("button", { type: "button", class: "btn btn-primary btn-wide", id: "plus-one", style: "margin-top:10px", onclick: function () {
          setProgress(r, nx.s, nx.e);
          Kit.toast("Watched " + W.label(nx.s, nx.e));
          render();
        } }, "Watched " + W.label(nx.s, nx.e)) : null));
    }

    var stars = h("div", { class: "rating", id: "rating", role: "group", "aria-label": "Your rating" });
    for (var i = 1; i <= 10; i++) {
      (function (v) {
        stars.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": String(Number(r.rating) === v), onclick: function () {
          S.hub.put("items", { id: r.id, rating: Number(r.rating) === v ? "" : v });
          render();
        } }, String(v)));
      })(i);
    }
    box.appendChild(field("Your rating", stars));
    var note = h("textarea", { class: "field-input", id: "note", rows: "3", placeholder: "What you thought, who recommended it…" }, r.note || "");
    note.addEventListener("blur", function () {
      if (note.value.trim() !== String(r.note || "")) {
        S.hub.put("items", { id: r.id, note: note.value.trim() });
        Kit.toast("Note saved");
      }
    });
    box.appendChild(field("Note", note));
    box.appendChild(h("div", { class: "btn-row", style: "margin-top:8px" }, Kit.confirmButton("Remove from list", "Tap again to remove", function () {
      S.hub.remove("items", r.id);
      Kit.toast("Removed");
      render();
    })));
    return box;
  }

  /* ---------------------------------------------------------------- */
  /*  settings                                                         */
  /* ---------------------------------------------------------------- */

  /** Subscription names from Budget's copy on this device, if Budget is used here. */
  function budgetSubs() {
    try {
      var raw = JSON.parse(localStorage.getItem("lifeapps.data.budget") || "{}");
      var subs = (raw.tables && raw.tables.subs) || {};
      return Object.keys(subs).map(function (k) { return subs[k]; }).filter(function (s) { return !s.del && s.active !== "no"; }).map(function (s) { return s.name; });
    } catch (e) {
      return [];
    }
  }

  function viewSettings(main) {
    main.appendChild(h("div", null, title("Settings")));
    var tmdbIn = h("input", { class: "field-input", type: "text", id: "s-tmdb", value: S.set.tmdb || "", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "API Read Access Token" });
    var omdbIn = h("input", { class: "field-input", type: "text", id: "s-omdb", value: S.set.omdb || "", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: "Optional" });
    var langSel = select([{ value: "en", label: "English" }, { value: "ar", label: "Arabic where TMDB has it" }], S.set.lang || "en", { id: "s-lang" });
    main.appendChild(section("Keys", h("div", null,
      field("TMDB", tmdbIn, "From themoviedb.org: Settings, API. Titles, seasons, where to watch."),
      field("OMDb", omdbIn, "From omdbapi.com. Adds IMDb, Rotten Tomatoes and Metacritic."),
      field("Titles and descriptions in", langSel),
      h("div", { class: "btn-row" }, h("button", { type: "button", class: "btn btn-primary", id: "s-save", onclick: function () {
        var writes = [];
        [["tmdb", tmdbIn.value.trim()], ["omdb", omdbIn.value.trim()], ["lang", langSel.value]].forEach(function (x) {
          if (String(S.set[x[0]] || "") !== x[1]) writes.push({ table: "settings", row: { id: x[0], value: x[1] } });
        });
        S.hub.putMany(writes);
        S.mem = {};
        if (writes.some(function (w) { return w.row.id === "lang"; })) S.hub.putMany(S.hub.all("items").map(function (r) { return { table: "items", row: { id: r.id, refreshed: "" } }; }));
        Kit.toast(writes.length ? "Saved" : "Nothing changed");
        render();
      } }, "Save keys")))));

    /* services */
    var svc = h("div", { id: "services" }, h("p", { class: "note" }, S.set.tmdb ? "Loading the services in Saudi Arabia…" : "Add the TMDB key first."));
    main.appendChild(section("Your streaming services", svc));
    if (S.set.tmdb) {
      Promise.all([tmdb("/watch/providers/tv", { watch_region: W.REGION }), tmdb("/watch/providers/movie", { watch_region: W.REGION })]).then(function (res) {
        var all = {};
        res.forEach(function (r) { (r.results || []).forEach(function (p) { if (!all[p.provider_id] || p.display_priority < all[p.provider_id].display_priority) all[p.provider_id] = p; }); });
        var list = Object.keys(all).map(function (k) { return all[k]; }).sort(function (a, b) { return (a.display_priorities && a.display_priorities[W.REGION] || a.display_priority) - (b.display_priorities && b.display_priorities[W.REGION] || b.display_priority); }).slice(0, 40);
        var chosen = W.serviceIds(S.set);
        var fromBudget = !S.set.services && budgetSubs().length ? W.servicesFromNames(budgetSubs(), list) : [];
        if (fromBudget.length) chosen = fromBudget;
        Kit.clear(svc);
        if (fromBudget.length) svc.appendChild(h("p", { class: "note" }, "Ticked from your subscriptions in Budget. Save to keep them."));
        var boxes = h("div", { class: "list" });
        list.forEach(function (p) {
          var cb = h("input", { type: "checkbox", "data-provider": String(p.provider_id) });
          cb.checked = chosen.indexOf(String(p.provider_id)) >= 0;
          boxes.appendChild(h("label", { class: "check-line" }, cb, p.logo_path ? h("img", { src: IMG + "w45" + p.logo_path, alt: "", class: "logo" }) : null, h("span", null, p.provider_name)));
        });
        svc.appendChild(boxes);
        svc.appendChild(h("div", { class: "btn-row", style: "margin-top:10px" }, h("button", { type: "button", class: "btn btn-primary", id: "svc-save", onclick: function () {
          var ids = Array.prototype.slice.call(boxes.querySelectorAll("input:checked")).map(function (x) { return x.getAttribute("data-provider"); });
          S.hub.put("settings", { id: "services", value: ids.join(",") });
          Kit.toast(ids.length ? ids.length + (ids.length === 1 ? " service saved" : " services saved") : "Services cleared");
        } }, "Save services")));
      }, function (e) {
        Kit.clear(svc).appendChild(h("p", { class: "note" }, e.message));
      });
    }

    /* emby */
    var st = h("p", { class: "note", id: "emby-status" }, S.emby.state === "ok" ? "Connected." : S.emby.msg || "The login is kept in the hub, not here. In the hub sheet: Life apps, Emby login for Watchlist.");
    main.appendChild(section("Emby", h("div", null, st, h("button", { type: "button", class: "btn", id: "emby-check", onclick: function () {
      st.textContent = "Checking…";
      embyCall({ op: "status" }).then(function (res) {
        S.emby = { state: "ok", msg: "" };
        st.textContent = "Connected to " + (res.server || "Emby") + (res.version ? " (" + res.version + ")" : "") + ".";
      }, function (e) {
        S.emby = { state: "error", msg: e.message };
        st.textContent = e.message;
      });
    } }, "Check Emby"))));

    main.appendChild(section("This device", h("div", null, h("p", { class: "note" }, "Key: " + (Kit.who().name || "")), Kit.confirmButton(Kit.t("lockDevice"), Kit.t("tapToLock"), function () { Kit.lockDevice(S.hub); }))));
    main.appendChild(h("p", { class: "note attribution" }, "This app uses the TMDB API but is not endorsed or certified by TMDB. Where to watch: JustWatch, through TMDB. Ratings: OMDb and MyAnimeList (Jikan)."));
  }

  function viewMissing(main) {
    main.appendChild(back("List", "/"));
    main.appendChild(message("That is not here."));
  }

  /* ---------------------------------------------------------------- */
  /*  frame                                                            */
  /* ---------------------------------------------------------------- */

  var tabEls = {};
  function tabbar() {
    var bar = h("nav", { class: "tabbar", "aria-label": "Main" });
    var inner = h("div", { class: "tabbar-inner" });
    [["", "List", "list"], ["search", "Search", "search"], ["discover", "Discover", "discover"], ["settings", "Settings", "more"]].forEach(function (t) {
      var el = h("a", { class: "tab", href: "#/" + t[0] }, icon(t[2]), h("span", null, t[1]));
      tabEls[t[0]] = el;
      inner.appendChild(el);
    });
    bar.appendChild(inner);
    return bar;
  }

  function paintTabs(name) {
    var owner = { "": "", want: "", done: "", t: "", search: "search", discover: "discover", settings: "settings" }[name];
    Object.keys(tabEls).forEach(function (k) {
      if (k === owner) tabEls[k].setAttribute("aria-current", "page");
      else tabEls[k].removeAttribute("aria-current");
    });
  }

  var current = { name: "", key: "" };
  /* screens that redraw by themselves would lose what you are typing or the lookups in flight */
  var STILL = { search: 1, settings: 1, discover: 1, t: 1 };

  function parseRoute() {
    var raw = (location.hash || "#/").slice(1);
    var q = raw.indexOf("?");
    var path = q >= 0 ? raw.slice(0, q) : raw;
    var query = {};
    if (q >= 0) new URLSearchParams(raw.slice(q + 1)).forEach(function (v, k) { query[k] = v; });
    var parts = path.replace(/^\//, "").split("/").filter(String);
    return { name: parts[0] || "", args: parts.slice(1), query: query };
  }

  function render() {
    refresh();
    var r = parseRoute();
    var same = current.raw === location.hash;
    current = { name: r.name, raw: location.hash, key: r.name === "t" && r.args[1] ? W.keyOf(r.args[0], r.args[1]) : "" };
    var y = window.scrollY;
    var main = Kit.clear(S.main);
    switch (r.name) {
      case "": viewList(main, "watching"); break;
      case "want": viewList(main, "want"); break;
      case "done": viewList(main, "done"); break;
      case "search": viewSearch(main, r.query); break;
      case "discover": viewDiscover(main); break;
      case "t":
        if (/^(tv|movie)$/.test(r.args[0]) && /^\d+$/.test(r.args[1] || "")) viewTitle(main, r.args[0], r.args[1]);
        else viewMissing(main);
        break;
      case "settings": viewSettings(main); break;
      default: viewMissing(main);
    }
    paintTabs(r.name);
    window.scrollTo(0, same ? y : 0);
  }

  Kit.start({
    app: "watchlist",
    title: "Watchlist",
    render: function (main, hub) {
      S.hub = hub;
      S.main = main;
      refresh();
      document.body.appendChild(tabbar());
      var last = hub.state;
      hub.on(function () {
        if (last === "syncing" && hub.state === "idle") {
          S.synced = true;
          refreshList();
        }
        last = hub.state;
        if (!STILL[current.name]) render();
      });
      window.addEventListener("hashchange", render);
      render();
    },
  });
})();
