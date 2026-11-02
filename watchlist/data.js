/*
 * Watchlist: the logic, with no screen code, so Today can load it too.
 *
 * Titles come from TMDB (films, series and anime), with where to watch them
 * in Saudi Arabia (TMDB's streaming data comes from JustWatch). Ratings add
 * IMDb, Rotten Tomatoes and Metacritic from OMDb, and MyAnimeList for anime.
 * Your Emby server is asked through the hub.
 *
 * Tables in the watchlist sheet:
 *   items     one row per title on your list (id "tv-1399" or "movie-27205"):
 *             what you set (status, season, episode, rating, note) and a copy of
 *             what was looked up (title, poster, providers, next episode, scores, emby)
 *   settings  id, value
 */
(function (root) {
  "use strict";

  var STATUSES = [
    { id: "watching", name: "Watching" },
    { id: "want", name: "To watch" },
    { id: "done", name: "Watched" },
  ];

  var REGION = "SA";

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function keyOf(kind, id) {
    return (kind === "tv" ? "tv" : "movie") + "-" + id;
  }

  function parseKey(k) {
    var m = String(k || "").match(/^(tv|movie)-(\d+)$/);
    return m ? { kind: m[1], id: m[2] } : null;
  }

  function json(v, fallback) {
    if (v && typeof v === "object") return v;
    try {
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function yearOf(d) {
    return d ? String(d).slice(0, 4) : "";
  }

  /* ---------------------------------------------------------------- */
  /*  reading TMDB                                                     */
  /* ---------------------------------------------------------------- */

  /** True for Japanese animation, the way people mean "anime". */
  function isAnime(d) {
    var genres = (d.genres || []).map(function (g) { return g.id; }).concat(d.genre_ids || []);
    var animated = genres.indexOf(16) >= 0;
    var jp = d.original_language === "ja" || (d.origin_country || []).indexOf("JP") >= 0;
    return animated && jp;
  }

  /** A search or list result: { key, kind, id, title, year, poster, score, anime } */
  function fromResult(r, kindHint) {
    var kind = r.media_type || kindHint;
    if (kind !== "tv" && kind !== "movie") return null;
    return {
      key: keyOf(kind, r.id),
      kind: kind,
      id: String(r.id),
      title: r.title || r.name || r.original_title || r.original_name || "",
      year: yearOf(r.release_date || r.first_air_date),
      poster: r.poster_path || "",
      score: Math.round(num(r.vote_average) * 10) / 10,
      votes: num(r.vote_count),
      anime: isAnime(r),
      overview: r.overview || "",
    };
  }

  /** Where to watch in one country: { stream: [{id, name, logo}], rent, buy, link } */
  function providersOf(wp, region) {
    var r = ((wp && wp.results) || {})[region || REGION] || {};
    function list(a) {
      return (a || [])
        .slice()
        .sort(function (x, y) { return num(x.display_priority) - num(y.display_priority); })
        .map(function (p) { return { id: p.provider_id, name: p.provider_name, logo: p.logo_path || "" }; });
    }
    var stream = list(r.flatrate).concat(list(r.free)).concat(list(r.ads));
    return { stream: stream, rent: list(r.rent), buy: list(r.buy), link: r.link || "" };
  }

  /**
   * The fields kept on a list item from a TMDB details answer (asked with
   * append_to_response=external_ids,watch/providers).
   */
  function fromDetails(d, kind, region) {
    var tv = kind === "tv";
    var out = {
      kind: kind,
      tmdb: String(d.id),
      imdb: (d.external_ids && d.external_ids.imdb_id) || d.imdb_id || "",
      title: d.title || d.name || "",
      original: d.original_title || d.original_name || "",
      year: yearOf(d.release_date || d.first_air_date),
      poster: d.poster_path || "",
      genres: (d.genres || []).map(function (g) { return g.name; }).join(", "),
      anime: isAnime(d) ? "yes" : "",
      runtime: tv ? num((d.episode_run_time || [])[0]) : num(d.runtime),
      tmdb_score: Math.round(num(d.vote_average) * 10) / 10,
      tmdb_votes: num(d.vote_count),
      providers: JSON.stringify(providersOf(d["watch/providers"], region)),
      overview: d.overview || "",
    };
    if (tv) {
      var seasons = (d.seasons || []).filter(function (s) { return s.season_number > 0; });
      out.seasons = num(d.number_of_seasons) || seasons.length;
      out.episodes_total = num(d.number_of_episodes);
      out.season_eps = JSON.stringify(seasons.map(function (s) { return num(s.episode_count); }));
      out.show_status = d.status || "";
      var last = d.last_episode_to_air;
      var next = d.next_episode_to_air;
      out.last_s = last ? num(last.season_number) : 0;
      out.last_e = last ? num(last.episode_number) : 0;
      out.last_air = last && last.air_date ? last.air_date : "";
      out.next_s = next ? num(next.season_number) : "";
      out.next_e = next ? num(next.episode_number) : "";
      out.next_air = next && next.air_date ? next.air_date : "";
    }
    return out;
  }

  /* ---------------------------------------------------------------- */
  /*  your progress                                                    */
  /* ---------------------------------------------------------------- */

  function label(s, e) {
    return "S" + s + " E" + e;
  }

  /** Episodes in each season: [12, 12, 24] */
  function seasonEps(item) {
    return json(item.season_eps, []).map(num);
  }

  /** The episode after (s, e), or null at the end of what is known. */
  function nextEpisode(item, s, e) {
    var eps = seasonEps(item);
    s = num(s);
    e = num(e);
    if (!s) return eps.length ? { s: 1, e: 1 } : null;
    if (e < (eps[s - 1] || 0)) return { s: s, e: e + 1 };
    if (s < eps.length) return { s: s + 1, e: 1 };
    return null;
  }

  function before(a, b) {
    return a.s < b.s || (a.s === b.s && a.e <= b.e);
  }

  /** How many episodes are out that you have not watched yet. */
  function behind(item) {
    if (item.kind !== "tv" || !num(item.last_s)) return 0;
    var last = { s: num(item.last_s), e: num(item.last_e) };
    var eps = seasonEps(item);
    var n = 0;
    var cur = nextEpisode(item, item.season, item.episode);
    var guard = 0;
    while (cur && before(cur, last) && guard++ < 5000) {
      n++;
      cur = nextEpisode(item, cur.s, cur.e);
    }
    if (!eps.length && num(item.season) < last.s) n = 1;
    return n;
  }

  /** Where you are, in words. */
  function progressText(item) {
    if (item.kind !== "tv") return "";
    if (!num(item.season)) return "Not started";
    return "Up to " + label(item.season, item.episode);
  }

  /* ---------------------------------------------------------------- */
  /*  ratings                                                          */
  /* ---------------------------------------------------------------- */

  /** OMDb's answer to { imdb, rt, mc } */
  function fromOmdb(o) {
    var out = {};
    if (!o || o.Response === "False") return out;
    if (o.imdbRating && o.imdbRating !== "N/A") out.imdb = Number(o.imdbRating);
    (o.Ratings || []).forEach(function (r) {
      if (r.Source === "Rotten Tomatoes") out.rt = parseInt(r.Value, 10);
      if (r.Source === "Metacritic") out.mc = parseInt(r.Value, 10);
    });
    return out;
  }

  /** The best MyAnimeList match for an anime among Jikan's search results. */
  function pickMal(results, title, original, year) {
    var bare = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9぀-ヿ一-鿿]+/g, ""); };
    var names = [bare(title), bare(original)].filter(String);
    var scored = (results || []).map(function (r) {
      var titles = [r.title, r.title_english, r.title_japanese].concat((r.titles || []).map(function (t) { return t.title; })).map(bare);
      var nameHit = titles.some(function (t) { return names.indexOf(t) >= 0; });
      var y = r.year || (r.aired && r.aired.from ? Number(String(r.aired.from).slice(0, 4)) : 0);
      var yearHit = year && y && Math.abs(Number(year) - y) <= 1;
      return { r: r, s: (nameHit ? 2 : 0) + (yearHit ? 1 : 0) };
    }).filter(function (x) { return x.s >= 2 || (x.s >= 1 && results.length === 1); });
    scored.sort(function (a, b) { return b.s - a.s; });
    var best = scored[0] && scored[0].r;
    return best && best.score ? { mal: best.score, mal_id: best.mal_id } : null;
  }

  /** Every score we have for an item: [{ name, value, text }] */
  function scores(item) {
    var s = json(item.scores, {});
    var out = [];
    if (num(item.tmdb_score)) out.push({ name: "TMDB", text: num(item.tmdb_score).toFixed(1) });
    if (s.imdb) out.push({ name: "IMDb", text: Number(s.imdb).toFixed(1) });
    if (s.rt) out.push({ name: "Rotten Tomatoes", text: s.rt + "%" });
    if (s.mc) out.push({ name: "Metacritic", text: String(s.mc) });
    if (s.mal) out.push({ name: "MyAnimeList", text: Number(s.mal).toFixed(2) });
    return out;
  }

  /* ---------------------------------------------------------------- */
  /*  services you pay for                                             */
  /* ---------------------------------------------------------------- */

  function bareService(s) {
    return String(s || "").toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9؀-ۿ]+/g, "");
  }

  /** Subscription names (from Budget) matched to TMDB's providers: their ids. */
  function servicesFromNames(names, providers) {
    var out = [];
    (names || []).forEach(function (n) {
      var b = bareService(n);
      if (!b) return;
      (providers || []).forEach(function (p) {
        var pb = bareService(p.provider_name || p.name);
        var first = pb.slice(0, Math.max(4, Math.min(pb.length, b.length)));
        if (pb === b || pb.indexOf(b) === 0 || b.indexOf(pb) === 0 || (first.length >= 4 && b.indexOf(first) === 0)) {
          if (out.indexOf(String(p.provider_id || p.id)) < 0) out.push(String(p.provider_id || p.id));
        }
      });
    });
    return out;
  }

  function serviceIds(settings) {
    return String((settings && settings.services) || "").split(/[\s,]+/).filter(String);
  }

  /** Streaming places for an item, the ones you pay for first: [{ name, logo, yours }] */
  function whereToWatch(item, settings) {
    var p = json(item.providers, { stream: [], rent: [], buy: [] });
    var mine = serviceIds(settings);
    var mark = function (x) { return { id: x.id, name: x.name, logo: x.logo, yours: mine.indexOf(String(x.id)) >= 0 }; };
    var stream = (p.stream || []).map(mark).sort(function (a, b) { return (b.yours ? 1 : 0) - (a.yours ? 1 : 0); });
    return { stream: stream, rent: (p.rent || []).map(mark), buy: (p.buy || []).map(mark), link: p.link || "" };
  }

  /** One short line: "Netflix (yours) · On Emby" */
  function whereLine(item, settings) {
    var w = whereToWatch(item, settings);
    var bits = [];
    var yours = w.stream.filter(function (x) { return x.yours; });
    if (yours.length) bits.push(yours.map(function (x) { return x.name; }).join(", ") + " (yours)");
    else if (w.stream.length) bits.push(w.stream.slice(0, 2).map(function (x) { return x.name; }).join(", "));
    if (item.emby === "yes") bits.push("On Emby");
    if (!bits.length && (w.rent.length || w.buy.length)) bits.push("Rent or buy");
    return bits.join(" · ");
  }

  /* ---------------------------------------------------------------- */
  /*  what needs you                                                   */
  /* ---------------------------------------------------------------- */

  function addDays(date, n) {
    var p = String(date).split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + n, 12);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /** "Fri 6 Nov" */
  function shortDay(date) {
    var p = String(date).split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], 12);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] + " " + p[2] + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][p[1] - 1];
  }

  /**
   * Lines for the home screen and Today: new episodes of what you are
   * watching, episodes coming this week, and titles you want that have just
   * arrived on Emby. [{ key, text, sub, kind }]
   */
  function alerts(items, today) {
    var out = [];
    var week = addDays(today, 7);
    var lately = addDays(today, -14);
    (items || []).filter(function (i) { return !i.del; }).forEach(function (i) {
      if (i.kind === "tv" && i.status === "watching") {
        var n = behind(i);
        if (n && i.last_air >= lately) {
          var nx = nextEpisode(i, i.season, i.episode);
          out.push({ key: i.id, kind: "new", text: i.title + ": " + (n === 1 ? "a new episode" : n + " new episodes"), sub: (nx ? "Next for you: " + label(nx.s, nx.e) : "") + (i.emby === "yes" ? " · On Emby" : "") });
        }
      }
      if (i.kind === "tv" && (i.status === "watching" || i.status === "want") && i.next_air && i.next_air >= today && i.next_air <= week) {
        out.push({ key: i.id, kind: "soon", text: i.title + ": " + label(i.next_s, i.next_e) + (i.next_air === today ? " today" : " on " + shortDay(i.next_air)), sub: num(i.next_e) === 1 ? "A new season starts" : "" });
      }
      if (i.status === "want" && i.emby === "yes" && i.emby_since && i.emby_since >= addDays(today, -7)) {
        out.push({ key: i.id, kind: "emby", text: i.title + " is on Emby now", sub: i.emby_info || "" });
      }
    });
    return out;
  }

  /** Items in a list, ordered for it. */
  function listOf(items, status) {
    return (items || [])
      .filter(function (i) { return !i.del && i.status === status; })
      .sort(function (a, b) {
        if (status === "watching") return behind(b) - behind(a) || String(b.touched || b.added || "").localeCompare(String(a.touched || a.added || ""));
        if (status === "done") return String(b.finished || "").localeCompare(String(a.finished || ""));
        return String(b.added || "").localeCompare(String(a.added || ""));
      });
  }

  var WatchData = {
    STATUSES: STATUSES,
    REGION: REGION,
    keyOf: keyOf,
    parseKey: parseKey,
    json: json,
    isAnime: isAnime,
    fromResult: fromResult,
    providersOf: providersOf,
    fromDetails: fromDetails,
    label: label,
    seasonEps: seasonEps,
    nextEpisode: nextEpisode,
    behind: behind,
    progressText: progressText,
    fromOmdb: fromOmdb,
    pickMal: pickMal,
    scores: scores,
    servicesFromNames: servicesFromNames,
    serviceIds: serviceIds,
    whereToWatch: whereToWatch,
    whereLine: whereLine,
    alerts: alerts,
    listOf: listOf,
    addDays: addDays,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = WatchData;
  else root.WatchData = WatchData;
})(typeof window !== "undefined" ? window : this);
