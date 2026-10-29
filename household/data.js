/*
 * Household v2: the logic, with no screens, so it can be tested on its own.
 *
 * Tables in the "Life apps: household" sheet:
 *   lists       name, name_ar, order, active, env       (env: the Budget envelope trips default to)
 *   categories  name, name_ar, order                    (the order you walk a store)
 *   stores      name, name_ar, order, active
 *   products    name, name_ar, category, unit, qty, brand, size
 *               (only products you used; the rest live in catalog.js)
 *   brands      name, name_ar                           (brands you added)
 *   items       list, product, name, qty, unit, brand, size, note, by, added,
 *               done, done_by, price, offer, store, trip, missing
 *   purchases   product, date, store, qty, unit, brand, size, price, offer,
 *               trip, by, item                          (one per thing bought, price 0 if none)
 *   trips       kind (shop, paid), store, list, env, date, by, started, status,
 *               finished, total, items_total, count, note, auto,
 *               budget ("", posted, skipped), budget_ref, posted
 *   envelopes   name, name_ar, order, left, spent, month, month_end, updated
 *               (written by Budget for the envelopes shown in Household)
 *   barcodes    product, brand, size                    (id is the barcode)
 */
(function (root) {
  "use strict";

  var UNITS = [
    { id: "pcs", en: "piece", ar: "حبة", step: 1 },
    { id: "kg", en: "kg", ar: "كيلو", step: 0.5 },
    { id: "g", en: "g", ar: "غرام", step: 100 },
    { id: "L", en: "L", ar: "لتر", step: 1 },
    { id: "ml", en: "ml", ar: "مل", step: 250 },
    { id: "pack", en: "pack", ar: "باكيت", step: 1 },
    { id: "box", en: "box", ar: "علبة", step: 1 },
    { id: "carton", en: "carton", ar: "كرتون", step: 1 },
    { id: "bottle", en: "bottle", ar: "قارورة", step: 1 },
    { id: "bag", en: "bag", ar: "كيس", step: 1 },
    { id: "bundle", en: "bundle", ar: "ربطة", step: 1 },
    { id: "tray", en: "tray", ar: "طبق", step: 1 },
  ];

  /* starter categories, in the order most stores are walked, with words that point to them */
  var CATEGORIES = [
    { id: "produce", name: "Fruit and veg", name_ar: "خضار وفواكه", order: 1, unit: "kg",
      words: "tomato tomatoes cucumber onion potato potatoes lettuce carrot lemon lime banana apple orange grape grapes garlic pepper capsicum coriander parsley mint watermelon melon avocado strawberry zucchini eggplant aubergine mango spinach cabbage broccoli ginger fruit veg vegetable طماط طماطم خيار بصل بطاط بطاطس خس جزر ليمون موز تفاح برتقال عنب ثوم فلفل كزبره بقدونس نعناع حبحب بطيخ شمام افوكادو فراوله كوسه باذنجان مانجو منجا سبانخ ملفوف بروكلي زنجبيل فواكه خضار" },
    { id: "bakery", name: "Bakery", name_ar: "مخبوزات", order: 2, unit: "pack",
      words: "bread toast samoli croissant bun buns tamees pita baguette cake خبز توست صامولي كرواسون تميس شابوره بقصم صمون" },
    { id: "dairy", name: "Dairy and eggs", name_ar: "ألبان وبيض", order: 3, unit: "pcs",
      words: "milk laban yogurt yoghurt cheese labneh butter cream eggs egg ghee حليب لبن زبادي روب جبن جبنه لبنه زبده قشطه بيض سمن" },
    { id: "meat", name: "Meat, chicken and fish", name_ar: "لحوم ودواجن وأسماك", order: 4, unit: "kg",
      words: "chicken meat beef lamb mutton minced mince fish shrimp prawn sausage burger steak liver دجاج لحم غنم حاشي مفروم سمك روبيان نقانق برجر ستيك كبده" },
    { id: "frozen", name: "Frozen", name_ar: "مجمدات", order: 5, unit: "bag",
      words: "frozen-chicken frozen-vegetables frozen icecream ice-cream fries nuggets مجمد مجمده ايسكريم ايس اصابع ناجتس" },
    { id: "pantry", name: "Pantry", name_ar: "مؤن وبقالة", order: 6, unit: "pack",
      words: "tomato-paste صلصه-طماطم zaatar thyme زعتر rice sugar salt flour oil pasta spaghetti macaroni tuna beans foul chickpeas paste spices tea coffee dates honey jam cereal cornflakes ketchup mayonnaise noodles indomie lentils oats vinegar sauce رز ارز سكر ملح طحين دقيق زيت معكرونه مكرونه اسباجيتي تونه فول حمص صلصه بهارات شاي قهوه تمر عسل مربى كورن ماجي كاتشب مايونيز اندومي عدس شوفان خل" },
    { id: "drinks", name: "Drinks", name_ar: "مشروبات", order: 7, unit: "carton",
      words: "water juice soda pepsi cola sprite drink drinks ماء مويه موية عصير بيبسي كولا سفن مشروب مشروبات" },
    { id: "snacks", name: "Snacks and sweets", name_ar: "حلويات وسناكس", order: 8, unit: "pack",
      words: "chips chocolate biscuit biscuits candy sweets nuts popcorn crisps lays شيبس شوكولاته شوكولا شوكلت بسكويت حلاو حلويات مكسرات فشار ليز" },
    { id: "cleaning", name: "Cleaning", name_ar: "منظفات", order: 9, unit: "bottle",
      words: "soap detergent tide dishwashing dish bleach clorox fairy sponge cleaner softener persil garbage trash صابون تايد صحون كلوركس فيري اسفنج منظف منعم بيرسيل زباله نفايات مسحوق" },
    { id: "personal", name: "Personal care", name_ar: "عناية شخصية", order: 10, unit: "pcs",
      words: "shampoo toothpaste toothbrush deodorant razor lotion conditioner shower gel cotton شامبو معجون فرشاه مزيل شفره لوشن بلسم شاور قطن" },
    { id: "baby", name: "Baby", name_ar: "أطفال", order: 11, unit: "pack",
      words: "baby-milk حليب-اطفال حليب-اطفال diaper diapers nappies pampers wipes formula cerelac baby حفاض حفاضات حفايض بامبرز مناديل-مبلله مبلله سيريلاك بيبي رضاعه" },
    { id: "health", name: "Medicine", name_ar: "أدوية", order: 12, unit: "box",
      words: "panadol paracetamol vitamin vitamins medicine plaster bandage syrup بنادول فيتامين فيتامينات دواء ادويه لصقه شراب" },
    { id: "home", name: "Home and other", name_ar: "أدوات منزلية", order: 13, unit: "pcs",
      words: "tissue tissues napkins foil cling batteries bulb cups plates charcoal bags مناديل قصدير نايلون بطاريات لمبه كاسات اطباق فحم اكياس" },
    { id: "other", name: "Other", name_ar: "أخرى", order: 99, unit: "pcs", words: "" },
  ];

  var STORES = [
    { id: "panda", name: "Panda", name_ar: "بنده", order: 1 },
    { id: "othaim", name: "Othaim", name_ar: "العثيم", order: 2 },
    { id: "danube", name: "Danube", name_ar: "الدانوب", order: 3 },
    { id: "tamimi", name: "Tamimi", name_ar: "التميمي", order: 4 },
    { id: "lulu", name: "Lulu", name_ar: "لولو", order: 5 },
    { id: "carrefour", name: "Carrefour", name_ar: "كارفور", order: 6 },
    { id: "farm", name: "Farm", name_ar: "المزرعة", order: 6.5 },
    { id: "nahdi", name: "Nahdi", name_ar: "النهدي", order: 7 },
    { id: "aldawaa", name: "Al-Dawaa", name_ar: "الدواء", order: 8 },
    { id: "other", name: "Other", name_ar: "أخرى", order: 99 },
  ];

  /* ---------------------------------------------------------------- */
  /*  words                                                            */
  /* ---------------------------------------------------------------- */

  /** Lower case, Arabic letters unified (أإآ to ا, ة to ه, ى to ي), marks removed. */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[ً-ْـ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  /** norm(), with "ال" taken off Arabic words, so الخبز finds خبز. */
  function bare(s) {
    return norm(s)
      .split(" ")
      .map(function (w) {
        return w.length > 3 && w.indexOf("ال") === 0 ? w.slice(2) : w;
      })
      .join(" ");
  }

  var WORDS = null;
  function wordIndex() {
    if (WORDS) return WORDS;
    WORDS = [];
    CATEGORIES.forEach(function (c) {
      c.words.split(/\s+/).filter(String).forEach(function (w) {
        WORDS.push({ w: norm(w.replace(/-/g, " ")), cat: c.id });
      });
    });
    WORDS.sort(function (a, b) {
      return b.w.length - a.w.length;
    });
    return WORDS;
  }

  /** The category a name most likely belongs to: the longest known word in it wins. */
  function guessCategory(name) {
    var n = " " + norm(name) + " ";
    var words = wordIndex();
    for (var i = 0; i < words.length; i++) {
      var w = words[i].w;
      /* whole words, or Arabic words with "ال" in front */
      if (n.indexOf(" " + w + " ") >= 0 || n.indexOf(" ال" + w + " ") >= 0 || (w.length >= 4 && n.indexOf(w) >= 0)) {
        return words[i].cat;
      }
    }
    return "other";
  }

  function categoryUnit(catId) {
    var c = CATEGORIES.filter(function (x) {
      return x.id === catId;
    })[0];
    return c ? c.unit : "pcs";
  }

  /** The same name always gives the same product id, so two phones never make two products. */
  function productId(name) {
    var s = bare(name);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return "p" + h.toString(36);
  }

  function unitOf(id) {
    return UNITS.filter(function (u) {
      return u.id === id;
    })[0] || UNITS[0];
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function r2(n) {
    var v = Math.round(n * 100) / 100;
    return v === 0 ? 0 : v;
  }

  /** "2", "1.5", "٢" or "2 kg" as typed into a quantity box. */
  function parseQty(v) {
    var s = String(v === null || v === undefined ? "" : v)
      .replace(/[٠-٩]/g, function (d) {
        return String("٠١٢٣٤٥٦٧٨٩".indexOf(d));
      })
      .replace(/٫/g, ".")
      .replace(",", ".");
    var m = s.match(/\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }

  /* ---------------------------------------------------------------- */
  /*  search                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Products matching what is typed, best first: names that start with it,
   * then names containing it, in English or Arabic; often-bought ones first
   * among equals.
   */
  function search(products, query, counts, brands) {
    var q = bare(query);
    if (!q) return [];
    var out = [];
    products.forEach(function (p) {
      var a = bare(p.name);
      var b = bare(p.name_ar);
      var score = -1;
      if (a === q || b === q) score = 3;
      else if (a.indexOf(q) === 0 || b.indexOf(q) === 0) score = 2;
      else if ((" " + a).indexOf(" " + q) >= 0 || (" " + b).indexOf(" " + q) >= 0) score = 1.5;
      else if (a.indexOf(q) >= 0 || b.indexOf(q) >= 0) score = 1;
      /* "pampers" finds Diapers */
      else if (brands && q.length >= 3 && (p.brands || []).some(function (id) {
        var br = brands[id];
        return br && (bare(br.name).indexOf(q) === 0 || bare(br.name_ar).indexOf(q) === 0);
      })) score = 0.8;
      if (score < 0) return;
      out.push({ p: p, score: score + Math.min((counts && counts[p.id]) || 0, 50) / 100 });
    });
    out.sort(function (x, y) {
      return y.score - x.score || String(x.p.name).localeCompare(String(y.p.name));
    });
    return out.map(function (x) {
      return x.p;
    });
  }

  function exactMatch(products, query) {
    var q = bare(query);
    return products.filter(function (p) {
      return bare(p.name) === q || (p.name_ar && bare(p.name_ar) === q);
    })[0] || null;
  }

  /* ---------------------------------------------------------------- */
  /*  the catalogue and brands                                         */
  /* ---------------------------------------------------------------- */

  /** The starting catalogue as products: [{ id, name, name_ar, category, unit, sizes, brands }]. */
  function catalogProducts(C) {
    if (!C) return [];
    return C.ITEMS.map(function (i) {
      return {
        id: productId(i[1]),
        name: i[1],
        name_ar: i[2],
        category: i[0],
        unit: i[3],
        qty: 1,
        sizes: i[4] ? i[4].split(" ") : [],
        brands: i[5] ? i[5].split(" ") : [],
        _cat: true,
      };
    });
  }

  /**
   * The catalogue with your own products laid over it: a product you have
   * used or changed keeps your names and defaults, and the catalogue's sizes
   * and brands. Rows only in the catalogue are marked _cat until first used.
   */
  function mergeProducts(catalog, sheet) {
    var by = {};
    var out = [];
    catalog.forEach(function (p) {
      by[p.id] = p;
    });
    var seen = {};
    sheet.forEach(function (r) {
      var c = by[r.id];
      var m = Object.assign({}, c || { sizes: [], brands: [] }, r);
      m.sizes = (c && c.sizes) || [];
      m.brands = (c && c.brands) || [];
      delete m._cat;
      seen[r.id] = 1;
      out.push(m);
    });
    catalog.forEach(function (p) {
      if (!seen[p.id]) out.push(p);
    });
    return out;
  }

  /** The row to write when a catalogue product is used for the first time. */
  function productRow(p) {
    return { id: p.id, name: p.name || "", name_ar: p.name_ar || "", category: p.category || "other", unit: p.unit || "pcs", qty: num(p.qty) || 1, brand: p.brand || "", size: p.size || "" };
  }

  /** Every brand by id, the catalogue's and the ones you added: { id: { id, name, name_ar } }. */
  function brandMap(C, sheetBrands) {
    var out = {};
    if (C) {
      Object.keys(C.BRANDS).forEach(function (id) {
        out[id] = { id: id, name: C.BRANDS[id][0], name_ar: C.BRANDS[id][1] };
      });
    }
    (sheetBrands || []).forEach(function (b) {
      out[b.id] = Object.assign({}, out[b.id] || {}, b);
    });
    return out;
  }

  /** The id for a brand typed by hand: a known brand if the name matches one, else a new id. */
  function brandId(name, brands) {
    var q = bare(name);
    if (!q) return "";
    var ids = Object.keys(brands || {});
    for (var i = 0; i < ids.length; i++) {
      var b = brands[ids[i]];
      if (bare(b.name) === q || bare(b.name_ar) === q) return b.id;
    }
    return "b" + productId(name).slice(1);
  }

  /** Brands to offer for a product: the ones bought before, newest first, then the catalogue's. */
  function brandsFor(product, purchases) {
    var out = [];
    purchases
      .filter(function (p) {
        return p.product === product.id && p.brand;
      })
      .sort(function (a, b) {
        return String(b.date) < String(a.date) ? -1 : 1;
      })
      .forEach(function (p) {
        if (out.indexOf(p.brand) < 0) out.push(p.brand);
      });
    (product.brands || []).forEach(function (b) {
      if (out.indexOf(b) < 0) out.push(b);
    });
    return out;
  }

  /* ---------------------------------------------------------------- */
  /*  sizes and measures                                               */
  /* ---------------------------------------------------------------- */

  var SIZE_WORDS = [
    ["kg", "g", 1000, "kg kgs kilo كيلو كجم كغ"],
    ["g", "g", 1, "g gm gr gram grams غرام جرام جم غم غ"],
    ["L", "ml", 1000, "l lt ltr litre liter لتر"],
    ["ml", "ml", 1, "ml مل ملل"],
    ["pcs", "pcs", 1, "pcs pc piece pieces حبه حبات قطعه"],
  ];

  function digits(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/[٠-٩]/g, function (d) {
        return String("٠١٢٣٤٥٦٧٨٩".indexOf(d));
      })
      .replace(/٫/g, ".")
      .replace(/,/g, ".");
  }

  /**
   * A pack size as typed ("800g", "800 غرام", "1.5 L", "60 حبة") read into
   * { amt, base, text }: amt in g, ml or pieces; text the short form ("800g").
   */
  function parseSize(v) {
    var m = digits(v).toLowerCase().match(/(\d+(?:\.\d+)?)\s*([^\s\d.]+)?/);
    if (!m) return null;
    var n = Number(m[1]);
    if (!(n > 0)) return null;
    var word = norm(m[2] || "");
    for (var i = 0; i < SIZE_WORDS.length; i++) {
      if (SIZE_WORDS[i][3].split(" ").indexOf(word) >= 0) {
        var amt = r3(n * SIZE_WORDS[i][2]);
        return { amt: amt, base: SIZE_WORDS[i][1], text: sizeText(amt, SIZE_WORDS[i][1]) };
      }
    }
    return null;
  }

  function r3(n) {
    return Math.round(n * 1000) / 1000;
  }

  function sizeText(amt, base) {
    if (base === "g") return amt >= 1000 && amt % 50 === 0 ? r3(amt / 1000) + "kg" : amt + "g";
    if (base === "ml") return amt >= 1000 && amt % 50 === 0 ? r3(amt / 1000) + "L" : amt + "ml";
    return amt + "pcs";
  }

  /** "800g" for the screen: "800 g" or "800 جم". */
  function sizeLabel(text, lang) {
    var s = parseSize(text);
    if (!s) return text || "";
    var m = s.text.match(/^([\d.]+)(\D+)$/);
    var names = lang === "ar" ? { g: "جم", kg: "كجم", ml: "مل", L: "لتر", pcs: "حبة" } : { g: "g", kg: "kg", ml: "ml", L: "L", pcs: "pcs" };
    return m[1] + " " + names[m[2]];
  }

  /**
   * How much a purchase is, in grams, millilitres or pieces when the size
   * or unit says so, otherwise in its own unit (packs, boxes ...).
   */
  function measure(qty, unit, size) {
    var q = num(qty) || 1;
    var s = parseSize(size);
    if (s) return { amt: r3(q * s.amt), base: s.base };
    if (unit === "kg") return { amt: r3(q * 1000), base: "g" };
    if (unit === "g") return { amt: q, base: "g" };
    if (unit === "L") return { amt: r3(q * 1000), base: "ml" };
    if (unit === "ml") return { amt: q, base: "ml" };
    if (unit === "pcs") return { amt: q, base: "pcs" };
    return { amt: q, base: unit || "pcs" };
  }

  /** Price per kg, per litre, per piece, or per unit. */
  function perMeasure(price, m) {
    if (!m || !(m.amt > 0)) return 0;
    var scale = m.base === "g" || m.base === "ml" ? 1000 : 1;
    return r2((num(price) * scale) / m.amt);
  }

  /** What "per" means for a base: kg, L, piece, or the unit itself. */
  function perUnit(base) {
    return base === "g" ? "kg" : base === "ml" ? "L" : base;
  }

  /* ---------------------------------------------------------------- */
  /*  prices                                                           */
  /* ---------------------------------------------------------------- */

  function variantKey(r) {
    return (r.brand || "") + "|" + (parseSize(r.size) ? parseSize(r.size).text : "");
  }

  /**
   * What a product has cost. Prices on offer are shown but never decide
   * which store is cheaper. Stores are only compared on the same brand and
   * size; across brands, only per kg, litre or piece.
   */
  function priceStats(purchases, productId) {
    var rows = purchases
      .filter(function (p) {
        return p.product === productId && num(p.price) > 0;
      })
      .map(function (p) {
        var m = measure(p.qty, p.unit, p.size);
        return {
          id: p.id,
          date: String(p.date || "").slice(0, 10),
          store: p.store || "",
          qty: num(p.qty) || 1,
          unit: p.unit || "pcs",
          size: p.size || "",
          brand: p.brand || "",
          price: r2(num(p.price)),
          offer: p.offer === "yes",
          base: m.base,
          per: perMeasure(p.price, m),
          variant: variantKey(p),
          by: p.by || "",
        };
      })
      .sort(function (a, b) {
        return a.date < b.date ? 1 : a.date > b.date ? -1 : String(a.id) < String(b.id) ? 1 : -1;
      });
    var last = rows[0] || null;
    var variants = {};
    rows.forEach(function (r) {
      var v = (variants[r.variant] = variants[r.variant] || { key: r.variant, brand: r.brand, size: r.size, base: r.base, last: r, rows: [], stores: {} });
      v.rows.push(r);
      var s = (v.stores[r.store] = v.stores[r.store] || { store: r.store, last: r, normal: null, best: null });
      if (!r.offer && !s.normal) s.normal = r;
      if (!r.offer && (!s.best || r.per < s.best.per)) s.best = r;
    });
    var variantList = Object.keys(variants).map(function (k) {
      var v = variants[k];
      v.storeList = Object.keys(v.stores)
        .map(function (s) {
          return v.stores[s];
        })
        .sort(function (a, b) {
          return (a.normal ? a.normal.per : Infinity) - (b.normal ? b.normal.per : Infinity);
        });
      return v;
    });
    var normal = rows.filter(function (r) {
      return !r.offer && last && r.base === last.base;
    });
    var cheapest = null;
    normal.forEach(function (r) {
      if (!cheapest || r.per < cheapest.per) cheapest = r;
    });
    var change = null;
    if (last) {
      var same = variants[last.variant].rows.filter(function (r) {
        return !r.offer;
      });
      if (same.length > 1) change = r2(same[0].per - same[1].per);
    }
    return {
      rows: rows,
      last: last,
      variants: variantList,
      cheapest: cheapest,
      average: normal.length ? r2(normal.reduce(function (s, r) { return s + r.per; }, 0) / normal.length) : null,
      change: change,
    };
  }

  /**
   * For the brand and size last bought: another store whose latest normal
   * price is at least 5% less than the store it was last bought at.
   */
  function cheaperElsewhere(stats) {
    if (!stats.last) return null;
    var v = stats.variants.filter(function (x) {
      return x.key === stats.last.variant;
    })[0];
    var here = v.stores[stats.last.store] && v.stores[stats.last.store].normal;
    if (!here) return null;
    var best = null;
    v.storeList.forEach(function (s) {
      if (s.store === stats.last.store || !s.normal) return;
      if (s.normal.per <= here.per * 0.95 && (!best || s.normal.per < best.per)) best = s.normal;
    });
    return best ? { store: best.store, pct: Math.round((1 - best.per / here.per) * 100), row: best } : null;
  }

  /* ---------------------------------------------------------------- */
  /*  running out                                                      */
  /* ---------------------------------------------------------------- */

  function daysBetween(a, b) {
    return Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 86400000);
  }

  function addDays(d, n) {
    var t = new Date(Date.parse(d + "T12:00:00") + n * 86400000);
    return t.toISOString().slice(0, 10);
  }

  /**
   * How fast a product is used, from what was bought and how much: an 800g
   * tin counts twice as long as a 400g one. Needs two purchase days.
   * { perDay, base, lasts (days), runOut (date), daysLeft, last (date) }
   */
  function usage(purchases, productId, today) {
    var byBase = {};
    purchases.forEach(function (p) {
      if (p.product !== productId || !p.date) return;
      var m = measure(p.qty, p.unit, p.size);
      var d = String(p.date).slice(0, 10);
      var b = (byBase[m.base] = byBase[m.base] || {});
      b[d] = (b[d] || 0) + m.amt;
    });
    var base = null;
    var most = 0;
    Object.keys(byBase).forEach(function (k) {
      var n = Object.keys(byBase[k]).length;
      if (n > most) {
        most = n;
        base = k;
      }
    });
    if (!base || most < 2) return null;
    var days = byBase[base];
    var dates = Object.keys(days).sort();
    var first = dates[0];
    var last = dates[dates.length - 1];
    var span = daysBetween(first, last);
    if (span <= 0) return null;
    var used = 0;
    for (var i = 0; i < dates.length - 1; i++) used += days[dates[i]];
    var perDay = used / span;
    var lasts = Math.max(1, Math.round(days[last] / perDay));
    var runOut = addDays(last, lasts);
    return { perDay: perDay, base: base, lasts: lasts, runOut: runOut, daysLeft: daysBetween(today, runOut), last: last };
  }

  /** Products not on a list that run out within the next few days, soonest first. */
  function dueSoon(products, purchases, openProductIds, today, within) {
    var limit = within === undefined ? 3 : within;
    var out = [];
    var used = {};
    purchases.forEach(function (p) {
      used[p.product] = 1;
    });
    products.forEach(function (p) {
      if (openProductIds[p.id] || !used[p.id]) return;
      var u = usage(purchases, p.id, today);
      if (u && u.daysLeft <= limit) out.push({ product: p, usage: u });
    });
    return out.sort(function (a, b) {
      return a.usage.daysLeft - b.usage.daysLeft;
    });
  }

  /** How often each product was put on a list (deleted rows count too: they were used). */
  function addCounts(allItems) {
    var c = {};
    allItems.forEach(function (i) {
      if (i.product) c[i.product] = (c[i.product] || 0) + 1;
    });
    return c;
  }

  /* ---------------------------------------------------------------- */
  /*  envelopes shared from Budget                                     */
  /* ---------------------------------------------------------------- */

  /**
   * An envelope as Budget last shared it, with the trips Budget has not
   * counted yet taken off: { left, spent, waiting, waitingCount, daysLeft,
   * perDay, newMonth }.
   */
  function envelopeView(env, trips, today) {
    var waiting = trips.filter(function (t) {
      if (t.env !== env.id || t.status !== "done" || t.budget === "skipped") return false;
      if (!t.budget) return true;
      return !!(t.posted && env.updated && t.posted > env.updated);
    });
    var sum = r2(waiting.reduce(function (s, t) { return s + num(t.total); }, 0));
    var end = String(env.month_end || "").slice(0, 10);
    /* payday has passed, or Budget has not opened this month yet */
    var newMonth = (!!end && today > end) || env.opened === "no";
    var daysLeft = end && !newMonth ? daysBetween(today, end) + 1 : 0;
    var left = r2(num(env.left) - sum);
    return {
      id: env.id,
      left: left,
      spent: r2(num(env.spent) + sum),
      waiting: sum,
      waitingCount: waiting.length,
      daysLeft: daysLeft,
      perDay: daysLeft > 0 ? r2(left / daysLeft) : null,
      newMonth: newMonth,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  bringing old items into the catalogue                            */
  /* ---------------------------------------------------------------- */

  var UNIT_WORDS = [
    ["kg", "kg kgs kilo kilos كيلو كيلوات كغ"],
    ["g", "g gm gram grams غرام جرام غم"],
    ["ml", "ml مل"],
    ["L", "l litre litres liter liters لتر لترات"],
    ["pack", "pack packs packet packets باكيت باكت بكت"],
    ["box", "box boxes can cans علبه علب"],
    ["carton", "carton cartons كرتون كراتين"],
    ["bottle", "bottle bottles قاروره قوارير"],
    ["bag", "bag bags كيس اكياس"],
    ["bundle", "bundle bundles ربطه ربطات"],
    ["tray", "tray trays طبق اطباق"],
    ["pcs", "pc pcs piece pieces حبه حبات"],
  ];

  /** The unit in "2 kg", "٣ حبات" or "1 pack", if there is one. */
  function unitFromText(text) {
    var words = norm(text).replace(/[\d.,]+/g, " ").split(/\s+/).filter(String);
    for (var i = 0; i < UNIT_WORDS.length; i++) {
      var list = UNIT_WORDS[i][1].split(" ");
      for (var j = 0; j < words.length; j++) if (list.indexOf(words[j]) >= 0) return UNIT_WORDS[i][0];
    }
    return null;
  }

  /**
   * Items made before the catalogue, or by a Siri shortcut with only a name,
   * get a product (found by name, or made) and a number for a quantity. A
   * quantity that was not a number moves into the note.
   * Returns the writes to make: [{ table, row }].
   */
  function adopt(items, products) {
    var writes = [];
    var known = {};
    products.forEach(function (p) {
      known[p.id] = p;
    });
    var made = {};
    items.forEach(function (i) {
      if (i.del) return;
      var fix = {};
      var pid = i.product;
      if (!pid || !known[pid]) {
        var found = exactMatch(products, i.name);
        pid = found ? found.id : productId(i.name);
        if (!found && !known[pid] && !made[pid]) {
          var cat = guessCategory(i.name);
          var label = String(i.name || "").trim();
          var arabic = /[\u0600-\u06FF]/.test(label);
          made[pid] = { id: pid, name: arabic ? "" : label, name_ar: arabic ? label : "", category: cat, unit: categoryUnit(cat), qty: 1 };
          writes.push({ table: "products", row: made[pid] });
        }
        fix.product = pid;
      }
      /* a number, or a number kept as text by an older sheet column, is fine as it is */
      var q = i.qty;
      var text = String(q === null || q === undefined ? "" : q).trim();
      var plain = typeof q === "number" ? q > 0 : /^[\d\u0660-\u0669]+([.,\u066B][\d\u0660-\u0669]+)?$/.test(text) && parseQty(text) > 0;
      if (!plain) {
        var parsed = parseQty(text);
        fix.qty = parsed && parsed > 0 ? parsed : 1;
        var u = unitFromText(text);
        if (u && !i.unit) fix.unit = u;
        if (text && (parsed === null || (!u && /[^\d\s.,\u0660-\u0669\u066B]/.test(text)))) fix.note = i.note ? i.note + ", " + text : text;
      }
      if (!i.unit && !fix.unit) fix.unit = (known[pid] && known[pid].unit) || (made[pid] && made[pid].unit) || "pcs";
      if (Object.keys(fix).length) {
        fix.id = i.id;
        writes.push({ table: "items", row: fix });
      }
    });
    return writes;
  }

  var Data = {
    UNITS: UNITS,
    CATEGORIES: CATEGORIES,
    STORES: STORES,
    norm: norm,
    bare: bare,
    guessCategory: guessCategory,
    categoryUnit: categoryUnit,
    productId: productId,
    unitOf: unitOf,
    parseQty: parseQty,
    r2: r2,
    search: search,
    exactMatch: exactMatch,
    priceStats: priceStats,
    cheaperElsewhere: cheaperElsewhere,
    usage: usage,
    dueSoon: dueSoon,
    addCounts: addCounts,
    addDays: addDays,
    catalogProducts: catalogProducts,
    mergeProducts: mergeProducts,
    productRow: productRow,
    brandMap: brandMap,
    brandId: brandId,
    brandsFor: brandsFor,
    parseSize: parseSize,
    sizeLabel: sizeLabel,
    measure: measure,
    perMeasure: perMeasure,
    perUnit: perUnit,
    envelopeView: envelopeView,
    adopt: adopt,
    unitFromText: unitFromText,
    daysBetween: daysBetween,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Data;
  else root.HData = Data;
})(typeof window !== "undefined" ? window : this);
