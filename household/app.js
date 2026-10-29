/*
 * Household: shared shopping lists with a catalogue, brands and sizes,
 * prices per store, envelope balances shared from Budget, and shopping
 * trips that go to Budget (straight away from your phone, after review
 * from hers). The logic lives in data.js; this file draws the screens.
 */
(function () {
  "use strict";

  var h = Kit.h;
  var t = Kit.t;
  var D = window.HData;
  var C = window.HCatalog;
  var LIST_KEY = "lifeapps.household.list";
  var TRIP_KEY = "lifeapps.household.trip";
  var CATALOG = D.catalogProducts(C);

  Kit.words({
    en: {
      lists: "Lists",
      add: "Add",
      addTo: "Add to {list}",
      search: "Type an item or a brand",
      done: "Done",
      bought: "Bought",
      clearBought: "Clear bought ({n})",
      tapAgainClear: "Tap again to clear",
      empty: "Nothing on this list. Tap Add below.",
      from: "from {who}",
      boughtBy: "bought by {who}",
      siri: "Siri",
      markBought: "Mark {name} as bought",
      markOpen: "Put {name} back on the list",
      onList: "On the list",
      justAdded: "Just added",
      runningOut: "Running out",
      addAll: "Add all ({n})",
      runsOutIn: "runs out in {n} days",
      runsOutToday: "runs out about today",
      ranOut: "ran out about {n} days ago",
      often: "Often bought",
      newItem: "Add \"{name}\"",
      newIn: "New item, in {cat}",
      added: "Added {name}",
      addedN: "Added {n} items",
      removed: "Removed {name}",
      less: "Less",
      more: "More",
      qty: "Quantity",
      unit: "Unit",
      lastPrice: "last {price} at {store}",
      lastPriceNoStore: "last {price}",
      cheaperAt: "usually {pct}% less at {store}",
      notAt: "not at {store}",
      addPrice: "Add price",
      price: "Price",
      store: "Store",
      noStore: "No store",
      brand: "Brand",
      anyBrand: "Any",
      otherBrand: "Other brand",
      size: "Size",
      anySize: "Any",
      otherSize: "Other size",
      sizeHint: "like 800g, 1.5L or 60 pcs",
      offer: "On offer",
      save: "Save",
      saved: "Saved",
      nameEn: "Name in English",
      nameAr: "Name in Arabic",
      category: "Category",
      note: "Note",
      list: "List",
      deleteItem: "Delete from list",
      tapAgainDelete: "Tap again to delete",
      deleted: "Deleted",
      back: "Back",
      notFound: "Not here any more. It may have been deleted on the other phone.",
      giveName: "Type a name.",
      history: "Price history",
      noHistory: "No prices yet. Add one when you buy it.",
      compare: "Store by store",
      compareLead: "Latest normal price for the same brand and size.",
      cheapestPer: "Cheapest per {unit}: {price}, {what}",
      average: "Average {price} per {unit}",
      upBy: "Up {n} per {unit} since last time",
      downBy: "Down {n} per {unit} since last time",
      offerTag: "offer",
      lasts: "Lasts about {n} days. Runs out around {date}.",
      prices: "Prices",
      pricesLead: "Everything with a price. Tap one to compare stores.",
      filter: "Find an item",
      addToList: "Add to {list}",
      startShopping: "Start shopping",
      iPaid: "I paid",
      whichStore: "Which store?",
      shoppingAt: "Shopping at {store}",
      soFar: "{total} so far, {n} of {m} items",
      leftIn: "{env}: {left} left",
      overBy: "{env}: over by {n}",
      tapItem: "Tap an item as you pick it up. Leave the price empty if you do not have it.",
      gotIt: "Got it",
      gotItNoPrice: "Got it, no price",
      notHere: "Not here",
      notFoundHere: "Not found here",
      finish: "Finish shopping",
      finishLead: "Type the total from the receipt. It can differ from the items you priced.",
      itemsTotal: "Items priced: {total}",
      receiptTotal: "Receipt total",
      envelope: "Envelope",
      paidFrom: "Paid from",
      finishTrip: "Save trip",
      tripSaved: "Saved. It goes to Budget.",
      tripSavedReview: "Saved. It waits for review in Budget.",
      continueShopping: "Continue shopping at {store}",
      cancelTrip: "Cancel this trip",
      tapAgainCancel: "Tap again to cancel",
      inThisTrip: "In the basket",
      paidLead: "A quick purchase without a list.",
      amount: "Amount",
      date: "Date",
      paidNote: "What was it? (optional)",
      trips: "Trips",
      tripsLead: "Every purchase and whether it is in Budget yet.",
      noTrips: "No trips yet.",
      stInProgress: "In progress",
      stWaiting: "Waiting for review in Budget",
      stAuto: "Going to Budget",
      stPosted: "In Budget",
      stSkipped: "Not in Budget",
      deleteTrip: "Delete this trip",
      tripInBudget: "This is in Budget already. Undo it there first.",
      nItems: "{n} items",
      quick: "Quick purchase",
      left: "left",
      spentMonth: "Spent this month",
      waitingReview: "Waiting for Budget",
      perDay: "{n} a day for {d} days",
      perDayLabel: "A day, for the {d} days to payday",
      newMonth: "New month not opened yet in Budget.",
      updated: "Updated {when}",
      recent: "Recent",
      settings: "Lists and settings",
      categories: "Categories",
      categoriesLead: "In the order you walk the store.",
      stores: "Stores",
      addList: "Add list",
      addStore: "Add store",
      newList: "New list",
      newStore: "New store",
      hide: "Hide",
      show: "Show",
      hidden: "hidden",
      up: "Move up",
      down: "Move down",
      listEnv: "Envelope for {list}",
      noEnv: "None",
      envHelp: "Envelopes come from Budget. Turn on \"Show in Household\" for an envelope there.",
      device: "This device",
      thisIs: "This phone is \"{name}\".",
      typePrice: "Type a price, like 12.50.",
      typeAmount: "Type the amount, more than 0.",
      chooseEnv: "Choose the envelope it was paid from.",
      updating: "Getting your lists ready…",
      scan: "Scan",
      scanTitle: "Scan a barcode",
      scanLead: "Point the camera at the barcode.",
      scanNoCamera: "The camera is not available. Type the number under the barcode instead.",
      scanType: "Barcode number",
      scanGo: "Find",
      close: "Close",
      newBarcode: "New barcode {code}",
      newBarcodeLead: "Which item is it? Next time it is filled in by itself.",
      linkSave: "Save barcode",
      pick: "Pick the item",
    },
    ar: {
      lists: "القوائم",
      add: "إضافة",
      addTo: "أضف إلى {list}",
      search: "اكتب الغرض أو الماركة",
      done: "تم",
      bought: "تم شراؤه",
      clearBought: "مسح ما تم شراؤه ({n})",
      tapAgainClear: "اضغط مرة ثانية للمسح",
      empty: "القائمة فاضية. اضغط إضافة تحت.",
      from: "من {who}",
      boughtBy: "اشتراه {who}",
      siri: "سيري",
      markBought: "تم شراء {name}",
      markOpen: "إرجاع {name} للقائمة",
      onList: "في القائمة",
      justAdded: "أضيف الآن",
      runningOut: "قارب يخلص",
      addAll: "أضف الكل ({n})",
      runsOutIn: "يخلص بعد {n} يوم",
      runsOutToday: "يخلص تقريبا اليوم",
      ranOut: "خلص تقريبا قبل {n} يوم",
      often: "يتكرر شراؤه",
      newItem: "إضافة \"{name}\"",
      newIn: "غرض جديد، في {cat}",
      added: "تمت إضافة {name}",
      addedN: "تمت إضافة {n} أغراض",
      removed: "تم حذف {name}",
      less: "أقل",
      more: "أكثر",
      qty: "الكمية",
      unit: "الوحدة",
      lastPrice: "آخر سعر {price} في {store}",
      lastPriceNoStore: "آخر سعر {price}",
      cheaperAt: "عادة أرخص {pct}% في {store}",
      notAt: "غير موجود في {store}",
      addPrice: "إضافة السعر",
      price: "السعر",
      store: "المحل",
      noStore: "بدون محل",
      brand: "الماركة",
      anyBrand: "أي ماركة",
      otherBrand: "ماركة أخرى",
      size: "الحجم",
      anySize: "أي حجم",
      otherSize: "حجم آخر",
      sizeHint: "مثل 800 جم أو 1.5 لتر أو 60 حبة",
      offer: "عرض",
      save: "حفظ",
      saved: "تم الحفظ",
      nameEn: "الاسم بالإنجليزي",
      nameAr: "الاسم بالعربي",
      category: "القسم",
      note: "ملاحظة",
      list: "القائمة",
      deleteItem: "حذف من القائمة",
      tapAgainDelete: "اضغط مرة ثانية للحذف",
      deleted: "تم الحذف",
      back: "رجوع",
      notFound: "غير موجود. يمكن انحذف من الجوال الثاني.",
      giveName: "اكتب الاسم.",
      history: "الأسعار السابقة",
      noHistory: "لا توجد أسعار بعد. أضيفي السعر عند الشراء.",
      compare: "مقارنة المحلات",
      compareLead: "آخر سعر عادي لنفس الماركة والحجم.",
      cheapestPer: "الأرخص لكل {unit}: {price}، {what}",
      average: "المتوسط {price} لكل {unit}",
      upBy: "زاد {n} لكل {unit} عن آخر مرة",
      downBy: "نقص {n} لكل {unit} عن آخر مرة",
      offerTag: "عرض",
      lasts: "يكفي تقريبا {n} يوم. يخلص حوالي {date}.",
      prices: "الأسعار",
      pricesLead: "كل غرض له سعر. اضغطي عليه لمقارنة المحلات.",
      filter: "ابحث عن غرض",
      addToList: "أضف إلى {list}",
      startShopping: "ابدأ التسوق",
      iPaid: "دفعت",
      whichStore: "أي محل؟",
      shoppingAt: "التسوق في {store}",
      soFar: "{total} حتى الآن، {n} من {m}",
      leftIn: "{env}: باقي {left}",
      overBy: "{env}: زاد {n}",
      tapItem: "اضغطي على الغرض لما تاخذينه. اتركي السعر فاضي إذا ما تعرفينه.",
      gotIt: "أخذته",
      gotItNoPrice: "أخذته بدون سعر",
      notHere: "غير موجود",
      notFoundHere: "غير موجود هنا",
      finish: "إنهاء التسوق",
      finishLead: "اكتبي إجمالي الفاتورة. ممكن يختلف عن مجموع الأسعار.",
      itemsTotal: "مجموع الأسعار: {total}",
      receiptTotal: "إجمالي الفاتورة",
      envelope: "الظرف",
      paidFrom: "الدفع من",
      finishTrip: "حفظ المشوار",
      tripSaved: "تم الحفظ، ويروح للميزانية.",
      tripSavedReview: "تم الحفظ، وينتظر المراجعة في الميزانية.",
      continueShopping: "كملي التسوق في {store}",
      cancelTrip: "إلغاء هذا المشوار",
      tapAgainCancel: "اضغط مرة ثانية للإلغاء",
      inThisTrip: "في السلة",
      paidLead: "شراء سريع بدون قائمة.",
      amount: "المبلغ",
      date: "التاريخ",
      paidNote: "وش اشتريتي؟ (اختياري)",
      trips: "المشاوير",
      tripsLead: "كل المشتريات وهل دخلت الميزانية.",
      noTrips: "لا توجد مشاوير بعد.",
      stInProgress: "جاري",
      stWaiting: "ينتظر المراجعة في الميزانية",
      stAuto: "في الطريق للميزانية",
      stPosted: "في الميزانية",
      stSkipped: "لم يضف للميزانية",
      deleteTrip: "حذف هذا المشوار",
      tripInBudget: "هذا موجود في الميزانية. تراجع عنه هناك أول.",
      nItems: "{n} أغراض",
      quick: "شراء سريع",
      left: "باقي",
      spentMonth: "المصروف هذا الشهر",
      waitingReview: "بانتظار الميزانية",
      perDay: "{n} باليوم لمدة {d} يوم",
      perDayLabel: "باليوم، لمدة {d} يوم حتى الراتب",
      newMonth: "الشهر الجديد لم يفتح بعد في الميزانية.",
      updated: "آخر تحديث {when}",
      recent: "آخر المشتريات",
      settings: "القوائم والإعدادات",
      categories: "الأقسام",
      categoriesLead: "بترتيب المشي داخل المحل.",
      stores: "المحلات",
      addList: "إضافة قائمة",
      addStore: "إضافة محل",
      newList: "قائمة جديدة",
      newStore: "محل جديد",
      hide: "إخفاء",
      show: "إظهار",
      hidden: "مخفي",
      up: "للأعلى",
      down: "للأسفل",
      listEnv: "ظرف {list}",
      noEnv: "بدون",
      envHelp: "الظروف تجي من الميزانية. فعّل \"إظهار في البيت\" للظرف هناك.",
      device: "هذا الجهاز",
      thisIs: "هذا الجوال باسم \"{name}\".",
      typePrice: "اكتب السعر، مثل 12.50",
      typeAmount: "اكتب المبلغ، أكثر من صفر.",
      chooseEnv: "اختاري الظرف اللي دفعتي منه.",
      updating: "جاري تجهيز القوائم…",
      scan: "مسح",
      scanTitle: "امسحي الباركود",
      scanLead: "وجهي الكاميرا على الباركود.",
      scanNoCamera: "الكاميرا غير متاحة. اكتبي الرقم اللي تحت الباركود.",
      scanType: "رقم الباركود",
      scanGo: "بحث",
      close: "إغلاق",
      newBarcode: "باركود جديد {code}",
      newBarcodeLead: "أي غرض هذا؟ المرة الجاية يتعبى لحاله.",
      linkSave: "حفظ الباركود",
      pick: "اختاري الغرض",
    },
  });

  var STARTER_LISTS = [
    { id: "groceries", name: "Groceries", name_ar: "المقاضي", order: 1, active: "yes", env: "" },
    { id: "pharmacy", name: "Pharmacy", name_ar: "الصيدلية", order: 2, active: "yes", env: "" },
    { id: "home", name: "Home", name_ar: "البيت", order: 3, active: "yes", env: "" },
  ];

  var S = { hub: null, main: null, syncedOnce: false, seeding: false, session: [], expanded: null, query: "", cache: null, link: null };

  /* ---------------------------------------------------------------- */
  /*  reading                                                          */
  /* ---------------------------------------------------------------- */

  function byOrder(a, b) {
    return Number(a.order || 0) - Number(b.order || 0) || String(a.name || "").localeCompare(String(b.name || ""));
  }

  function raw(table) {
    var tb = S.hub.tables[table] || {};
    return Object.keys(tb).map(function (k) {
      return tb[k];
    });
  }

  function rowsOf(table, all) {
    return S.hub.all(table).filter(function (r) {
      return all || r.active !== "no";
    });
  }

  /* worked out once per redraw: the catalogue merged with your products, and every brand */
  function cache() {
    if (!S.cache) {
      var list = D.mergeProducts(CATALOG, S.hub.all("products"));
      var byId = {};
      list.forEach(function (p) {
        byId[p.id] = p;
      });
      S.cache = { products: list, byId: byId, brands: D.brandMap(C, S.hub.all("brands")), purchases: S.hub.all("purchases") };
    }
    return S.cache;
  }

  function lists(all) {
    return rowsOf("lists", all).sort(byOrder);
  }
  function categories() {
    return rowsOf("categories", true).sort(byOrder);
  }
  function stores(all) {
    return rowsOf("stores", all).sort(byOrder);
  }
  function envelopes() {
    return S.hub.all("envelopes").sort(byOrder);
  }
  function products() {
    return cache().products;
  }
  function purchases() {
    return cache().purchases;
  }
  function product(id) {
    return cache().byId[id] || null;
  }
  function find(table, id) {
    return S.hub.get(table, id);
  }

  function nm(row) {
    if (!row) return "";
    return Kit.lang() === "ar" ? row.name_ar || row.name || "" : row.name || row.name_ar || "";
  }

  function itemName(i) {
    var p = product(i.product);
    return p ? nm(p) : i.name || "";
  }

  function storeName(id) {
    var s = find("stores", id);
    return s ? nm(s) : id || "";
  }

  function brandName(id) {
    var b = cache().brands[id];
    return b ? nm(b) : "";
  }

  function envName(id) {
    var e = find("envelopes", id);
    return e ? nm(e) : "";
  }

  function unitName(id, qty) {
    var u = D.unitOf(id);
    if (Kit.lang() === "ar") return u.ar;
    if (qty === 1 || u.id === "kg" || u.id === "g" || u.id === "L" || u.id === "ml") return u.en;
    return u.en + (/(x|s)$/.test(u.en) ? "es" : "s");
  }

  function perName(base) {
    var map = Kit.lang() === "ar" ? { kg: "كيلو", L: "لتر", pcs: "حبة" } : { kg: "kg", L: "litre", pcs: "piece" };
    var unit = D.perUnit(base);
    return map[unit] || unitName(unit, 1);
  }

  function fmtNum(n) {
    return String(Math.round(Number(n) * 1000) / 1000);
  }

  function qtyText(q, unit) {
    var n = Number(q) || 1;
    return fmtNum(n) + " " + unitName(unit, n);
  }

  function money(n) {
    return (Number(n) || 0).toFixed(2);
  }

  function money0(n) {
    var v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function sep() {
    return Kit.lang() === "ar" ? "، " : ", ";
  }

  function me() {
    return Kit.who().name || "";
  }

  function whoText(name) {
    if (!name) return "";
    if (/^shortcuts?$/i.test(name) || /^siri$/i.test(name)) return t("siri");
    return name;
  }

  function localDate(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function today() {
    return localDate(new Date());
  }

  function dayText(ymd) {
    var s = String(ymd || "");
    return s.slice(8, 10) + "/" + s.slice(5, 7);
  }

  function variantText(brand, size) {
    return [brandName(brand), size ? D.sizeLabel(size, Kit.lang()) : ""].filter(String).join(" ");
  }

  function currentList() {
    var all = lists();
    var saved = null;
    try {
      saved = localStorage.getItem(LIST_KEY);
    } catch (e) {}
    return all.filter(function (l) { return l.id === saved; })[0] || all[0] || null;
  }

  function chooseList(id) {
    try {
      localStorage.setItem(LIST_KEY, id);
    } catch (e) {}
  }

  /* the envelope a list's trips go to: the one chosen in settings, or one with the same name */
  function listEnv(list) {
    if (!list) return "";
    if (list.env && find("envelopes", list.env)) return list.env;
    var match = envelopes().filter(function (e) {
      return D.bare(e.name) === D.bare(list.name);
    })[0];
    return match ? match.id : "";
  }

  function openItems(listId) {
    return S.hub.all("items").filter(function (i) {
      return i.list === listId && !i.done;
    });
  }

  function onListItem(listId, productId) {
    return openItems(listId).filter(function (i) {
      return i.product === productId;
    })[0] || null;
  }

  function myTrip() {
    var id = null;
    try {
      id = localStorage.getItem(TRIP_KEY);
    } catch (e) {}
    var trip = id ? find("trips", id) : null;
    return trip && trip.status === "open" ? trip : null;
  }

  function setMyTrip(id) {
    try {
      if (id) localStorage.setItem(TRIP_KEY, id);
      else localStorage.removeItem(TRIP_KEY);
    } catch (e) {}
  }

  function readMoney(v) {
    var s = String(v || "")
      .replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
      .replace(/٫/g, ".")
      .replace(/,/g, "")
      .trim();
    if (!s) return null;
    var n = Number(s);
    return isFinite(n) && n >= 0 ? D.r2(n) : NaN;
  }

  /** "last 6.75 at Panda", for the brand and size last bought. */
  function lastPriceText(productId) {
    var st = D.priceStats(purchases(), productId);
    if (!st.last) return "";
    return st.last.store ? t("lastPrice", { price: money(st.last.price), store: storeName(st.last.store) }) : t("lastPriceNoStore", { price: money(st.last.price) });
  }

  function cheaperText(productId) {
    var c = D.cheaperElsewhere(D.priceStats(purchases(), productId));
    return c ? t("cheaperAt", { pct: c.pct, store: storeName(c.store) }) : "";
  }

  function runOutText(u) {
    if (!u) return "";
    if (u.daysLeft > 0) return t("runsOutIn", { n: u.daysLeft });
    if (u.daysLeft === 0) return t("runsOutToday");
    return t("ranOut", { n: -u.daysLeft });
  }

  /* ---------------------------------------------------------------- */
  /*  writing                                                          */
  /* ---------------------------------------------------------------- */

  /** A catalogue product is written to the sheet the first time it is used. */
  function ensureProduct(p) {
    if (p && p._cat) {
      S.hub.put("products", D.productRow(p));
      S.cache = null;
    }
    return p;
  }

  function purchaseRow(i, extra) {
    return Object.assign(
      {
        id: "pu-" + i.id,
        product: i.product,
        date: i.done ? localDate(new Date(i.done)) : today(),
        store: i.store || "",
        qty: Number(i.qty) || 1,
        unit: i.unit || "pcs",
        brand: i.brand || "",
        size: i.size || "",
        price: Number(i.price) || 0,
        offer: i.offer || "",
        trip: i.trip || "",
        by: i.done_by || me(),
        item: i.id,
      },
      extra || {}
    );
  }

  function tick(i) {
    var now = new Date().toISOString();
    if (i.done) {
      var w = [{ table: "items", row: { id: i.id, done: "", done_by: "" } }];
      if (S.hub.get("purchases", "pu-" + i.id)) w.push({ table: "purchases", row: { id: "pu-" + i.id, del: now } });
      S.hub.putMany(w);
    } else {
      var done = Object.assign({}, i, { done: now, done_by: me(), missing: "" });
      S.hub.putMany([
        { table: "items", row: { id: i.id, done: now, done_by: me(), missing: "" } },
        { table: "purchases", row: purchaseRow(done) },
      ]);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  first run: lists, categories and stores                          */
  /* ---------------------------------------------------------------- */

  function seed() {
    if (!S.syncedOnce || S.seeding) return;
    var writes = [];
    if (!raw("lists").length) STARTER_LISTS.forEach(function (l) { writes.push({ table: "lists", row: l }); });
    if (!raw("categories").length) {
      D.CATEGORIES.forEach(function (c) {
        writes.push({ table: "categories", row: { id: c.id, name: c.name, name_ar: c.name_ar, order: c.order } });
      });
    }
    if (!raw("stores").length) {
      D.STORES.forEach(function (s) {
        writes.push({ table: "stores", row: { id: s.id, name: s.name, name_ar: s.name_ar, order: s.order, active: "yes" } });
      });
    }
    /* items added by a Siri shortcut come with only a name */
    var adopt = D.adopt(S.hub.all("items"), products()).map(function (w) {
      if (w.table === "items" && w.row.product && product(w.row.product) && product(w.row.product)._cat) {
        writes.push({ table: "products", row: D.productRow(product(w.row.product)) });
      }
      return w;
    });
    writes = writes.concat(adopt);
    if (writes.length) {
      S.seeding = true;
      S.cache = null;
      S.hub.putMany(writes);
      S.seeding = false;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  pieces                                                           */
  /* ---------------------------------------------------------------- */

  function back(path) {
    return h("a", { class: "back", href: "#" + (path || "/") }, t("back"));
  }

  function field(label, input) {
    return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input);
  }

  function group(label, kids) {
    return h("div", { class: "field", role: "group", "aria-label": label }, h("span", { class: "field-label" }, label), kids);
  }

  function section(title, kids, attrs) {
    return h("section", Object.assign({ class: "section" }, attrs || {}), title ? h("h2", { class: "section-title" }, title) : null, kids);
  }

  function select(options, value, attrs) {
    var a = Object.assign({}, attrs || {});
    a.class = "select" + (a.class ? " " + a.class : "");
    var el = h("select", a);
    options.forEach(function (o) {
      var opt = h("option", { value: o.value }, o.label);
      if (String(o.value) === String(value === undefined || value === null ? "" : value)) opt.selected = true;
      el.appendChild(opt);
    });
    return el;
  }

  function unitOptions() {
    return D.UNITS.map(function (u) {
      return { value: u.id, label: Kit.lang() === "ar" ? u.ar : u.en };
    });
  }

  function storeOptions(withNone) {
    var out = withNone ? [{ value: "", label: t("noStore") }] : [];
    stores().forEach(function (s) {
      out.push({ value: s.id, label: nm(s) });
    });
    return out;
  }

  /**
   * One-tap choices as buttons in a plain group (never inside a label: on
   * iPhone a tap in a label lands on its first button). Returns the element
   * and a way to read or set the choice.
   */
  function chips(label, options, value, onPick, attrs) {
    var state = { value: value || "" };
    var wrap = h("div", Object.assign({ class: "chips", role: "group", "aria-label": label }, attrs || {}));
    function paint() {
      Kit.clear(wrap);
      options.forEach(function (o) {
        wrap.appendChild(
          h("button", { type: "button", class: "chip", "data-value": o.value, "aria-pressed": state.value === o.value ? "true" : "false", onclick: function () {
            state.value = o.value;
            paint();
            if (onPick) onPick(o.value);
          } }, o.label)
        );
      });
    }
    paint();
    return {
      el: wrap,
      get: function () { return state.value; },
      set: function (v) { state.value = v; paint(); },
    };
  }

  /**
   * − 2 + with a unit picker. Changing it saves straight away; − at the
   * smallest step takes the item off the list.
   */
  function stepper(item, onRemoved) {
    var unit = item.unit || "pcs";
    var step = D.unitOf(unit).step;
    var shown = h("span", { class: "step-qty", "aria-live": "polite" }, fmtNum(item.qty || step));
    function setQty(q) {
      q = Math.max(0, Math.round(q * 1000) / 1000);
      if (q <= 0) {
        S.hub.remove("items", item.id);
        Kit.toast(t("removed", { name: itemName(item) }));
        if (onRemoved) onRemoved();
        return;
      }
      item.qty = q;
      shown.textContent = fmtNum(q);
      S.hub.put("items", { id: item.id, qty: q });
      var p = product(item.product);
      if (p && !p._cat && Number(p.qty) !== q) S.hub.put("products", { id: p.id, qty: q });
    }
    var unitSel = select(unitOptions(), unit, { class: "unit-select", "aria-label": t("unit") });
    unitSel.addEventListener("change", function () {
      unit = unitSel.value;
      step = D.unitOf(unit).step;
      item.unit = unit;
      S.hub.put("items", { id: item.id, unit: unit });
      var p = product(item.product);
      if (p && !p._cat) S.hub.put("products", { id: p.id, unit: unit });
    });
    return h(
      "div",
      { class: "stepper" },
      h("button", { type: "button", class: "step-btn", "aria-label": t("less"), onclick: function () { setQty(Number(item.qty || step) - step); } }, "−"),
      shown,
      h("button", { type: "button", class: "step-btn", "aria-label": t("more"), onclick: function () { setQty(Number(item.qty || 0) + step); } }, "+"),
      unitSel
    );
  }

  /**
   * Brand and size, as chips: the ones bought before and the catalogue's,
   * plus "Other" to type one. Returns { el, read } where read() gives
   * { brand, size } or null when a typed size does not make sense.
   */
  function brandSize(p, brand, size) {
    var brandIds = D.brandsFor(p, purchases()).slice(0, 8);
    if (brand && brandIds.indexOf(brand) < 0) brandIds.unshift(brand);
    var sizes = [];
    purchases().forEach(function (x) {
      var s = x.product === p.id && D.parseSize(x.size);
      if (s && sizes.indexOf(s.text) < 0) sizes.push(s.text);
    });
    (p.sizes || []).forEach(function (s) {
      var z = D.parseSize(s);
      if (z && sizes.indexOf(z.text) < 0) sizes.push(z.text);
    });
    var sz = D.parseSize(size);
    if (sz && sizes.indexOf(sz.text) < 0) sizes.unshift(sz.text);

    var otherBrand = h("input", { class: "field-input", type: "text", placeholder: t("otherBrand"), "aria-label": t("otherBrand"), hidden: true });
    var otherSize = h("input", { class: "field-input", type: "text", placeholder: t("sizeHint"), "aria-label": t("otherSize"), hidden: true, autocomplete: "off" });
    var bOpts = [{ value: "", label: t("anyBrand") }]
      .concat(brandIds.map(function (id) { return { value: id, label: brandName(id) || id }; }))
      .concat([{ value: "*", label: t("otherBrand") }]);
    var sOpts = [{ value: "", label: t("anySize") }]
      .concat(sizes.map(function (s) { return { value: s, label: D.sizeLabel(s, Kit.lang()) }; }))
      .concat([{ value: "*", label: t("otherSize") }]);
    var b = chips(t("brand"), bOpts, brand || "", function (v) {
      otherBrand.hidden = v !== "*";
      if (v === "*") otherBrand.focus();
    }, { "data-kind": "brand" });
    var s = chips(t("size"), sOpts, sz ? sz.text : "", function (v) {
      otherSize.hidden = v !== "*";
      if (v === "*") otherSize.focus();
    }, { "data-kind": "size" });
    return {
      el: h("div", { class: "brand-size" }, group(t("brand"), [b.el, otherBrand]), group(t("size"), [s.el, otherSize])),
      read: function () {
        var out = { brand: b.get(), size: s.get(), newBrand: null };
        if (out.brand === "*") {
          var name = otherBrand.value.trim();
          out.brand = name ? D.brandId(name, cache().brands) : "";
          if (name && !cache().brands[out.brand]) {
            var arabic = /[؀-ۿ]/.test(name);
            out.newBrand = { id: out.brand, name: arabic ? "" : name, name_ar: arabic ? name : "" };
          }
        }
        if (out.size === "*") {
          var z = D.parseSize(otherSize.value);
          if (otherSize.value.trim() && !z) return null;
          out.size = z ? z.text : "";
        }
        return out;
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /*  envelopes from Budget                                            */
  /* ---------------------------------------------------------------- */

  function envView(e) {
    return D.envelopeView(e, S.hub.all("trips"), today());
  }

  function envCards() {
    var envs = envelopes();
    if (!envs.length) return null;
    var row = h("div", { class: "env-cards" });
    envs.forEach(function (e) {
      var v = envView(e);
      row.appendChild(
        h("a", { class: "env-card", href: "#/env/" + e.id, "data-env": e.id, "data-tone": v.left < 0 ? "bad" : null },
          h("span", { class: "env-name" }, nm(e)),
          h("span", { class: "env-left" }, money0(v.left) + " ", h("small", null, t("left"))),
          h("span", { class: "env-sub" }, v.newMonth ? t("newMonth") : v.perDay !== null ? t("perDay", { n: money0(v.perDay), d: v.daysLeft }) : ""))
      );
    });
    return row;
  }

  function tripStatus(tr) {
    if (tr.status === "open") return t("stInProgress");
    if (tr.budget === "posted") return t("stPosted");
    if (tr.budget === "skipped") return t("stSkipped");
    return tr.auto === "yes" ? t("stAuto") : t("stWaiting");
  }

  function tripTitle(tr) {
    var where = tr.store ? storeName(tr.store) : t("quick");
    return where + ", " + dayText(tr.date);
  }

  function tripRow(tr) {
    var bits = [whoText(tr.by)];
    if (tr.kind === "paid" && tr.note) bits.push(tr.note);
    else if (Number(tr.count)) bits.push(t("nItems", { n: tr.count }));
    if (tr.env) bits.push(envName(tr.env));
    bits.push(tripStatus(tr));
    return h("a", { class: "row row-link", href: "#/trip/" + tr.id, "data-trip": tr.id },
      h("div", { class: "row-main" }, h("span", { class: "row-title" }, tripTitle(tr)), h("span", { class: "row-sub" }, bits.filter(String).join(sep()))),
      h("span", { class: "amt" }, Number(tr.total) ? money(tr.total) : ""));
  }

  function viewEnv(main, id) {
    removeBar();
    main.appendChild(back("/"));
    var e = find("envelopes", id);
    if (!e) {
      main.appendChild(h("p", { class: "empty" }, t("notFound")));
      return;
    }
    var v = envView(e);
    main.appendChild(h("h1", { class: "page-title" }, nm(e)));
    main.appendChild(h("div", { class: "env-big", "data-tone": v.left < 0 ? "bad" : null }, h("span", { class: "env-big-num" }, money(v.left)), h("span", { class: "env-big-label" }, t("left"))));
    if (v.newMonth) main.appendChild(h("p", { class: "banner-note" }, t("newMonth")));
    var facts = h("div", { class: "list facts" });
    function fact(label, value) {
      facts.appendChild(h("div", { class: "row" }, h("span", { class: "row-main" }, label), h("span", { class: "amt" }, value)));
    }
    fact(t("spentMonth"), money(v.spent));
    if (v.waiting) fact(t("waitingReview"), money(v.waiting));
    if (v.perDay !== null) fact(t("perDayLabel", { d: v.daysLeft }), money(v.perDay));
    main.appendChild(facts);
    main.appendChild(h("p", { class: "note" }, t("updated", { when: Kit.ago(e.updated) })));
    main.appendChild(h("div", { class: "btn-row", style: "margin:6px 0 4px" }, h("a", { class: "btn btn-primary", href: "#/paid?env=" + e.id, style: "text-decoration:none" }, t("iPaid"))));
    var trips = S.hub.all("trips")
      .filter(function (tr) { return tr.env === e.id && tr.status === "done" && (!e.month_start || String(tr.date) >= e.month_start); })
      .sort(function (a, b) { return String(b.finished || b.date) < String(a.finished || a.date) ? -1 : 1; });
    if (trips.length) main.appendChild(section(t("recent"), h("div", { class: "list" }, trips.map(tripRow))));
  }

  /* ---------------------------------------------------------------- */
  /*  the list                                                         */
  /* ---------------------------------------------------------------- */

  function tabs(current, onPick) {
    var row = h("div", { class: "list-tabs", role: "group", "aria-label": t("lists") });
    lists().forEach(function (l) {
      var open = openItems(l.id).length;
      row.appendChild(
        h("button", { type: "button", class: "list-tab", "data-list": l.id, "aria-pressed": current && current.id === l.id ? "true" : "false", onclick: function () { chooseList(l.id); onPick(); } },
          nm(l),
          open ? h("span", { class: "count" }, String(open)) : null)
      );
    });
    return row;
  }

  function byCategory(items) {
    var groups = {};
    items.forEach(function (i) {
      var p = product(i.product);
      var c = (p && p.category) || "other";
      (groups[c] = groups[c] || []).push(i);
    });
    var cats = categories();
    var order = cats.map(function (c) { return c.id; });
    Object.keys(groups).forEach(function (c) { if (order.indexOf(c) < 0) order.push(c); });
    return order
      .filter(function (c) { return groups[c]; })
      .map(function (c) {
        var cat = cats.filter(function (x) { return x.id === c; })[0];
        return { id: c, name: cat ? nm(cat) : c, items: groups[c].sort(function (a, b) { return itemName(a).localeCompare(itemName(b)); }) };
      });
  }

  function viewList(main) {
    var current = currentList();
    var cards = envCards();
    if (cards) main.appendChild(cards);
    main.appendChild(tabs(current, render));
    if (!current) {
      main.appendChild(h("p", { class: "empty" }, t("updating")));
      return;
    }
    var trip = myTrip();
    if (trip) main.appendChild(h("a", { class: "banner-link", href: "#/shop" }, t("continueShopping", { store: storeName(trip.store) })));

    var open = openItems(current.id);
    var done = S.hub.all("items").filter(function (i) { return i.list === current.id && i.done; })
      .sort(function (a, b) { return String(b.done) < String(a.done) ? -1 : 1; });

    if (!trip) {
      main.appendChild(h("div", { class: "btn-row", style: "margin:10px 0 2px" },
        open.length ? h("a", { class: "btn btn-primary", href: "#/shop", id: "start-shop", style: "text-decoration:none" }, t("startShopping")) : null,
        h("a", { class: "btn", href: "#/paid", id: "i-paid", style: "text-decoration:none" }, t("iPaid"))));
    }

    if (!open.length) main.appendChild(h("div", { class: "list", style: "margin-top:10px" }, h("div", { class: "empty" }, t("empty"))));
    byCategory(open).forEach(function (g) {
      var list = h("div", { class: "list" });
      g.items.forEach(function (i) {
        list.appendChild(itemRow(i));
        if (S.expanded === i.id) list.appendChild(h("div", { class: "expand" }, stepper(i, render)));
      });
      main.appendChild(section(g.name, list, { class: "section cat", "data-cat": g.id }));
    });

    if (done.length) {
      var dl = h("div", { class: "list", id: "done-items" });
      done.forEach(function (i) {
        dl.appendChild(itemRow(i));
        if (S.expanded === i.id) dl.appendChild(h("div", { class: "expand" }, pricePad(i, { save: true })));
      });
      main.appendChild(section(t("bought"), dl));
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:12px" },
        Kit.confirmButton(t("clearBought", { n: done.length }), t("tapAgainClear"), function () {
          var now = new Date().toISOString();
          S.hub.putMany(done.map(function (i) { return { table: "items", row: { id: i.id, del: now } }; }));
          render();
        })));
    }

    main.appendChild(h("div", { class: "foot-links" },
      h("a", { class: "btn btn-quiet", href: "#/prices" }, t("prices")),
      h("a", { class: "btn btn-quiet", href: "#/trips" }, t("trips")),
      h("a", { class: "btn btn-quiet", href: "#/settings" }, t("settings"))));

    addBar(current);
  }

  function itemRow(i) {
    var bits = [];
    var v = variantText(i.brand, i.size);
    if (v) bits.push(v);
    if (i.note) bits.push(i.note);
    if (i.done) {
      if (Number(i.price) > 0) bits.push(money(i.price) + (i.offer === "yes" ? " (" + t("offerTag") + ")" : "") + (i.store ? sep() + storeName(i.store) : ""));
      if (i.done_by && i.done_by !== me()) bits.push(t("boughtBy", { who: whoText(i.done_by) }));
    } else {
      if (i.missing) bits.push(t("notAt", { store: storeName(i.missing) }));
      var lp = lastPriceText(i.product);
      if (lp) bits.push(lp);
      var ch = cheaperText(i.product);
      if (ch) bits.push(ch);
      if (i.by && i.by !== me()) bits.push(t("from", { who: whoText(i.by) }));
    }
    var name = itemName(i);
    var right;
    if (i.done && !(Number(i.price) > 0)) {
      right = h("button", { type: "button", class: "chip-btn", onclick: function () { S.expanded = S.expanded === i.id ? null : i.id; render(); } }, t("addPrice"));
    } else {
      right = h("button", { type: "button", class: "qty", "aria-label": t("qty") + ": " + qtyText(i.qty, i.unit), "aria-expanded": S.expanded === i.id ? "true" : "false", onclick: function () {
        S.expanded = S.expanded === i.id ? null : i.id;
        render();
      } }, qtyText(i.qty, i.unit));
    }
    return h(
      "div",
      { class: "item", "data-done": i.done ? "yes" : null, "data-pending": S.hub.isPending("items", i.id) ? "yes" : null, "data-id": i.id },
      h("button", { type: "button", class: "tick-btn", "aria-label": i.done ? t("markOpen", { name: name }) : t("markBought", { name: name }), onclick: function () {
        tick(i);
        render();
      } }, h("span", { "aria-hidden": "true" })),
      h("a", { class: "item-main", href: "#/item/" + i.id },
        h("span", { class: "item-name" }, name),
        bits.length ? h("span", { class: "item-sub" }, bits.join(sep())) : null),
      right
    );
  }

  /** The Add bar at the bottom. Opening the add screen in the same tap keeps the keyboard up on iPhone. */
  function addBar(current) {
    removeBar();
    var bar = h("div", { class: "composer", id: "composer" },
      h("div", { class: "composer-inner" },
        h("button", { type: "button", class: "btn btn-primary btn-wide add-bar", id: "open-add", onclick: function () {
          history.pushState(null, "", "#/add");
          render();
          var input = document.getElementById("add-search");
          if (input) input.focus();
        } }, "+ " + t("addTo", { list: nm(current) }))));
    document.body.appendChild(bar);
  }

  function removeBar() {
    var old = document.getElementById("composer");
    if (old) old.parentNode.removeChild(old);
  }

  /* ---------------------------------------------------------------- */
  /*  adding                                                           */
  /* ---------------------------------------------------------------- */

  function addProduct(current, p, extra) {
    var existing = onListItem(current.id, p.id);
    if (existing) return existing;
    ensureProduct(p);
    var item = {
      list: current.id,
      product: p.id,
      name: p.name || p.name_ar,
      qty: Number(p.qty) > 0 ? Number(p.qty) : 1,
      unit: p.unit || "pcs",
      brand: (extra && extra.brand) || p.brand || "",
      size: (extra && extra.size) || p.size || "",
      note: "",
      by: me(),
      added: new Date().toISOString(),
      done: "",
      done_by: "",
      price: 0,
      offer: "",
      store: "",
      trip: "",
      missing: "",
    };
    item = S.hub.put("items", item);
    S.session.unshift(item.id);
    Kit.toast(t("added", { name: nm(p) }));
    return item;
  }

  function addNew(current, name) {
    name = String(name || "").trim().replace(/\s+/g, " ");
    if (!name) return null;
    var known = D.exactMatch(products(), name);
    if (known) return addProduct(current, known);
    var cat = D.guessCategory(name);
    var arabic = /[؀-ۿ]/.test(name);
    var p = S.hub.put("products", { id: D.productId(name), name: arabic ? "" : name, name_ar: arabic ? name : "", category: cat, unit: D.categoryUnit(cat), qty: 1, brand: "", size: "" });
    S.cache = null;
    return addProduct(current, product(p.id) || p);
  }

  function openIds() {
    var ids = {};
    S.hub.all("items").forEach(function (i) { if (!i.done) ids[i.product] = 1; });
    return ids;
  }

  function viewAdd(main) {
    var current = currentList();
    removeBar();
    if (!current) return viewList(main);
    var input = h("input", {
      class: "field-input search-input",
      id: "add-search",
      type: "search",
      autocomplete: "off",
      autocorrect: "off",
      spellcheck: "false",
      enterkeyhint: "go",
      placeholder: t("search"),
      "aria-label": t("search"),
      value: S.query,
    });
    var results = h("div", { id: "add-results" });
    main.appendChild(h("div", { class: "add-head" },
      h("div", { class: "add-top" },
        h("h1", { class: "page-title" }, t("addTo", { list: nm(current) })),
        h("div", { class: "btn-row" },
          h("button", { type: "button", class: "btn", id: "add-scan", onclick: function () { scan("add"); } }, t("scan")),
          h("button", { type: "button", class: "btn", id: "add-done", onclick: function () {
            S.query = "";
            S.session = [];
            location.hash = "#/";
          } }, t("done")))),
      h("form", { onsubmit: function (e) {
        e.preventDefault();
        var q = input.value.trim();
        if (!q) return;
        var exact = D.exactMatch(products(), q);
        var first = exact || D.search(products(), q, D.addCounts(raw("items")), cache().brands)[0];
        var starts = first && [first.name, first.name_ar].some(function (n) { return n && D.bare(n).indexOf(D.bare(q)) === 0; });
        if (exact || starts) addProduct(current, first);
        else addNew(current, q);
        input.value = "";
        S.query = "";
        paint();
        input.focus();
      } }, input)));
    main.appendChild(results);

    function row(p, sub) {
      var item = onListItem(current.id, p.id);
      var cat = find("categories", p.category);
      var subText = sub || [cat ? nm(cat) : "", lastPriceText(p.id)].filter(String).join(sep());
      return h("div", { class: "result" + (item ? " on" : ""), "data-product": p.id },
        h("button", { type: "button", class: "result-main", onclick: function () {
          if (!item) {
            addProduct(current, p);
            paint();
          }
        } },
          h("span", { class: "item-name" }, nm(p)),
          h("span", { class: "item-sub" }, item ? t("onList") + (variantText(item.brand, item.size) ? sep() + variantText(item.brand, item.size) : "") : subText)),
        item ? stepper(item, paint) : h("button", { type: "button", class: "add-btn", "aria-label": t("add") + " " + nm(p), onclick: function () {
          addProduct(current, p);
          paint();
        } }, "+"));
    }

    function put(el) {
      if (el) results.appendChild(el);
    }

    function block(title, kids, extra) {
      if (!kids.length) return null;
      return h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", { class: "section-title" }, title), extra || null), h("div", { class: "list" }, kids));
    }

    function paint() {
      S.cache = null;
      Kit.clear(results);
      var q = input.value.trim();
      S.query = q;
      var counts = D.addCounts(raw("items"));
      var all = products();
      if (q) {
        var found = D.search(all, q, counts, cache().brands).slice(0, 30);
        var kids = [];
        if (!D.exactMatch(all, q)) {
          var cat = find("categories", D.guessCategory(q));
          kids.push(h("div", { class: "result new" },
            h("button", { type: "button", class: "result-main", id: "add-new", onclick: function () {
              addNew(current, q);
              input.value = "";
              S.query = "";
              paint();
              input.focus();
            } },
              h("span", { class: "item-name" }, t("newItem", { name: q })),
              h("span", { class: "item-sub" }, t("newIn", { cat: cat ? nm(cat) : "" }))),
            h("span", { class: "add-btn", "aria-hidden": "true" }, "+")));
        }
        found.forEach(function (p) { kids.push(row(p)); });
        results.appendChild(h("div", { class: "list", style: "margin-top:10px" }, kids));
        return;
      }
      var session = S.session.map(function (id) { return find("items", id); }).filter(function (i) { return i && !i.done; });
      put(block(t("justAdded"), session.map(function (i) { return row(product(i.product) || { id: i.product, name: i.name }); })));
      var ids = openIds();
      var due = D.dueSoon(all, purchases(), ids, today());
      put(block(t("runningOut"), due.map(function (d) { return row(d.product, runOutText(d.usage)); }),
        due.length > 1 ? h("button", { type: "button", class: "btn btn-quiet", id: "add-all-due", onclick: function () {
          due.forEach(function (d) {
            var last = purchases().filter(function (x) { return x.product === d.product.id; }).sort(function (a, b) { return String(b.date) < String(a.date) ? -1 : 1; })[0];
            addProduct(current, d.product, last ? { brand: last.brand, size: last.size } : null);
          });
          Kit.toast(t("addedN", { n: due.length }));
          paint();
        } }, t("addAll", { n: due.length })) : null));
      var often = all
        .filter(function (p) { return counts[p.id] && !ids[p.id] && !due.some(function (d) { return d.product.id === p.id; }); })
        .sort(function (a, b) { return counts[b.id] - counts[a.id]; })
        .slice(0, 20);
      put(block(t("often"), often.map(function (p) { return row(p); })));
    }

    input.addEventListener("input", paint);
    S.repaintAdd = paint;
    paint();
  }

  /* ---------------------------------------------------------------- */
  /*  price pad: in shopping mode, and for bought items                 */
  /* ---------------------------------------------------------------- */

  /**
   * Quantity, brand, size, price and offer for one item. In a trip it ticks
   * the item as bought at the trip's store; otherwise it saves the price on
   * an item already bought, with a store picker.
   */
  function pricePad(item, opts) {
    var trip = opts.trip || null;
    var p = product(item.product) || { id: item.product, sizes: [], brands: [] };
    var st = D.priceStats(purchases(), item.product);
    var hints = [];
    if (st.last) hints.push((st.last.store ? t("lastPrice", { price: money(st.last.price), store: storeName(st.last.store) }) : t("lastPriceNoStore", { price: money(st.last.price) })) + (variantText(st.last.brand, st.last.size) ? " (" + variantText(st.last.brand, st.last.size) + ")" : ""));
    var ch = D.cheaperElsewhere(st);
    if (ch) hints.push(t("cheaperAt", { pct: ch.pct, store: storeName(ch.store) }));
    var bs = brandSize(p, item.brand, item.size);
    var priceInput = h("input", { class: "field-input price-input", type: "text", inputmode: "decimal", autocomplete: "off", dir: "ltr", placeholder: "0.00", "aria-label": t("price"), value: Number(item.price) > 0 ? String(item.price) : "" });
    var offer = item.offer === "yes";
    var offerBtn = h("button", { type: "button", class: "chip offer-btn", "aria-pressed": offer ? "true" : "false", onclick: function () {
      offer = !offer;
      offerBtn.setAttribute("aria-pressed", offer ? "true" : "false");
    } }, t("offer"));
    var storeSel = trip ? null : select(storeOptions(true), item.store || (st.last && st.last.store) || "", { "aria-label": t("store") });
    var msg = h("p", { class: "form-error", role: "alert" });

    function save(withPrice) {
      var price = withPrice ? readMoney(priceInput.value) : null;
      if (withPrice && price !== null && isNaN(price)) {
        msg.textContent = t("typePrice");
        return;
      }
      var v = bs.read();
      if (!v) {
        msg.textContent = t("sizeHint");
        return;
      }
      var fresh = find("items", item.id) || item;
      var store = trip ? trip.store : storeSel.value;
      var now = new Date().toISOString();
      var row = { id: item.id, price: price || 0, offer: price && offer ? "yes" : "", store: store, brand: v.brand, size: v.size, missing: "" };
      if (trip) {
        row.trip = trip.id;
        if (!fresh.done) {
          row.done = now;
          row.done_by = me();
        }
      }
      var merged = Object.assign({}, fresh, row);
      var writes = [{ table: "items", row: row }, { table: "purchases", row: purchaseRow(merged) }];
      if (v.newBrand) writes.push({ table: "brands", row: v.newBrand });
      if (p && !p._cat) writes.push({ table: "products", row: { id: p.id, brand: v.brand, size: v.size, unit: fresh.unit || p.unit, qty: Number(fresh.qty) || 1 } });
      else if (p && p._cat) writes.push({ table: "products", row: Object.assign(D.productRow(p), { brand: v.brand, size: v.size }) });
      S.hub.putMany(writes);
      S.cache = null;
      S.expanded = null;
      render();
    }

    return h("div", { class: "pad" },
      hints.length ? h("p", { class: "note" }, hints.join(". ")) : null,
      h("div", { class: "pad-row" }, stepper(item)),
      bs.el,
      h("div", { class: "pad-row" }, priceInput, offerBtn),
      storeSel ? group(t("store"), storeSel) : null,
      msg,
      h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn btn-primary pad-save", onclick: function () { save(true); } }, opts.save ? t("save") : t("gotIt")),
        trip && !opts.save ? h("button", { type: "button", class: "btn pad-noprice", onclick: function () { save(false); } }, t("gotItNoPrice")) : null,
        trip && !opts.save ? h("button", { type: "button", class: "btn btn-quiet pad-missing", onclick: function () {
          S.hub.put("items", { id: item.id, missing: trip.store });
          S.expanded = null;
          render();
        } }, t("notHere")) : null));
  }

  /* ---------------------------------------------------------------- */
  /*  shopping                                                         */
  /* ---------------------------------------------------------------- */

  function tripItems(trip) {
    return S.hub.all("items").filter(function (i) { return i.trip === trip.id; });
  }

  function viewShop(main) {
    removeBar();
    var current = currentList();
    var trip = myTrip();
    main.appendChild(back("/"));
    if (!trip) {
      main.appendChild(h("h1", { class: "page-title" }, t("whichStore")));
      var grid = h("div", { class: "store-grid" });
      stores().forEach(function (s) {
        grid.appendChild(h("button", { type: "button", class: "store-btn", "data-store": s.id, onclick: function () {
          var tr = S.hub.put("trips", { kind: "shop", store: s.id, list: current ? current.id : "", env: listEnv(current), date: today(), by: me(), started: new Date().toISOString(), status: "open", finished: "", total: 0, items_total: 0, count: 0, note: "", auto: "", budget: "", budget_ref: "", posted: "" });
          setMyTrip(tr.id);
          render();
        } }, nm(s)));
      });
      main.appendChild(grid);
      return;
    }
    if (trip.list && (!current || trip.list !== current.id)) {
      chooseList(trip.list);
      current = currentList();
    }
    var listId = trip.list || (current && current.id);
    var inTrip = tripItems(trip);
    var open = openItems(listId);
    var here = open.filter(function (i) { return i.missing !== trip.store; });
    var missing = open.filter(function (i) { return i.missing === trip.store; });
    var total = D.r2(inTrip.reduce(function (s, i) { return s + (Number(i.price) || 0); }, 0));
    var env = find("envelopes", trip.env || listEnv(current));
    var envLine = null;
    if (env) {
      var left = D.r2(envView(env).left - total);
      envLine = h("p", { class: "trip-env", "data-tone": left < 0 ? "bad" : null }, left < 0 ? t("overBy", { env: nm(env), n: money(-left) }) : t("leftIn", { env: nm(env), left: money(left) }));
    }
    main.appendChild(h("div", { class: "trip-head" },
      h("h1", { class: "page-title" }, t("shoppingAt", { store: storeName(trip.store) })),
      h("p", { class: "trip-total" }, t("soFar", { total: money(total), n: inTrip.length, m: inTrip.length + open.length })),
      envLine,
      h("div", { class: "btn-row" },
        h("a", { class: "btn btn-primary", href: "#/finish", style: "text-decoration:none" }, t("finish")),
        h("button", { type: "button", class: "btn", id: "shop-scan", onclick: function () { scan("shop"); } }, t("scan")))));
    main.appendChild(h("p", { class: "note" }, t("tapItem")));

    function shopRows(items, list, opts) {
      items.forEach(function (i) {
        var v = variantText(i.brand, i.size);
        list.appendChild(h("button", { type: "button", class: "shop-row" + (opts && opts.done ? " done" : ""), "data-id": i.id, "aria-expanded": S.expanded === i.id ? "true" : "false", onclick: function () {
          S.expanded = S.expanded === i.id ? null : i.id;
          render();
          var pi = document.querySelector(".pad .price-input");
          if (pi) pi.focus();
        } },
          h("span", { class: "item-name" }, itemName(i), v ? h("span", { class: "item-sub" }, v) : null),
          opts && opts.done ? h("span", { class: "amt" }, Number(i.price) > 0 ? money(i.price) : "-") : h("span", { class: "qty" }, qtyText(i.qty, i.unit))));
        if (S.expanded === i.id) list.appendChild(h("div", { class: "expand" }, pricePad(i, { trip: trip, save: !!(opts && opts.done) })));
      });
    }

    byCategory(here).forEach(function (g) {
      var list = h("div", { class: "list" });
      shopRows(g.items, list);
      main.appendChild(section(g.name, list, { class: "section cat" }));
    });
    if (inTrip.length) {
      var bl = h("div", { class: "list", id: "basket" });
      shopRows(inTrip, bl, { done: true });
      main.appendChild(section(t("inThisTrip"), bl));
    }
    if (missing.length) {
      var ml = h("div", { class: "list", id: "missing" });
      shopRows(missing, ml);
      main.appendChild(section(t("notFoundHere"), ml));
    }
    main.appendChild(h("div", { class: "btn-row", style: "margin-top:16px" }, Kit.confirmButton(t("cancelTrip"), t("tapAgainCancel"), function () {
      S.hub.put("trips", { id: trip.id, status: "cancelled", del: new Date().toISOString() });
      setMyTrip(null);
      location.hash = "#/";
    }, "btn btn-quiet")));
  }

  function envChips(value) {
    var envs = envelopes();
    if (!envs.length) return null;
    return chips(t("paidFrom"), envs.map(function (e) {
      var v = envView(e);
      return { value: e.id, label: nm(e) + " (" + money0(v.left) + ")" };
    }), value, null, { id: "env-chips" });
  }

  function viewFinish(main) {
    removeBar();
    var trip = myTrip();
    main.appendChild(back("/shop"));
    if (!trip) {
      main.appendChild(h("p", { class: "empty" }, t("notFound")));
      return;
    }
    var inTrip = tripItems(trip);
    var sum = D.r2(inTrip.reduce(function (s, i) { return s + (Number(i.price) || 0); }, 0));
    main.appendChild(h("h1", { class: "page-title" }, t("finish")));
    main.appendChild(h("p", { class: "note" }, t("finishLead")));
    main.appendChild(h("p", null, t("itemsTotal", { total: money(sum) })));
    var total = h("input", { class: "field-input price-input", id: "trip-total", type: "text", inputmode: "decimal", dir: "ltr", value: sum ? money(sum) : "" });
    main.appendChild(field(t("receiptTotal"), total));
    var env = envChips(trip.env || listEnv(find("lists", trip.list)));
    if (env) main.appendChild(group(t("paidFrom"), env.el));
    var msg = h("p", { class: "form-error", role: "alert" });
    main.appendChild(msg);
    main.appendChild(h("button", { type: "button", class: "btn btn-primary btn-wide", id: "save-trip", onclick: function () {
      var n = readMoney(total.value);
      if (n === null || isNaN(n) || n <= 0) { msg.textContent = t("typeAmount"); return; }
      if (env && !env.get()) { msg.textContent = t("chooseEnv"); return; }
      var auto = Kit.canUse("budget");
      S.hub.put("trips", { id: trip.id, status: "done", finished: new Date().toISOString(), total: n, items_total: sum, count: inTrip.length, env: env ? env.get() : "", auto: auto ? "yes" : "", budget: "" });
      setMyTrip(null);
      Kit.toast(auto ? t("tripSaved") : t("tripSavedReview"));
      location.hash = "#/";
    } }, t("finishTrip")));
  }

  /** "I paid": a quick purchase without a list. */
  function viewPaid(main, query) {
    removeBar();
    main.appendChild(back(query.env ? "/env/" + query.env : "/"));
    main.appendChild(h("h1", { class: "page-title" }, t("iPaid")));
    main.appendChild(h("p", { class: "note" }, t("paidLead")));
    var amount = h("input", { class: "field-input price-input", id: "paid-amount", type: "text", inputmode: "decimal", dir: "ltr", placeholder: "0.00", autocomplete: "off" });
    main.appendChild(field(t("amount"), amount));
    var env = envChips(query.env || listEnv(currentList()));
    if (env) main.appendChild(group(t("paidFrom"), env.el));
    var store = chips(t("store"), [{ value: "", label: t("noStore") }].concat(stores().map(function (s) { return { value: s.id, label: nm(s) }; })), "", null, { id: "paid-store" });
    main.appendChild(group(t("store"), store.el));
    var note = h("input", { class: "field-input", id: "paid-note", type: "text", autocomplete: "off" });
    main.appendChild(field(t("paidNote"), note));
    var date = h("input", { class: "field-input", id: "paid-date", type: "date", value: today() });
    main.appendChild(field(t("date"), date));
    var msg = h("p", { class: "form-error", role: "alert" });
    main.appendChild(msg);
    main.appendChild(h("button", { type: "button", class: "btn btn-primary btn-wide", id: "save-paid", onclick: function () {
      var n = readMoney(amount.value);
      if (n === null || isNaN(n) || n <= 0) { msg.textContent = t("typeAmount"); return; }
      if (env && !env.get()) { msg.textContent = t("chooseEnv"); return; }
      var auto = Kit.canUse("budget");
      var now = new Date().toISOString();
      S.hub.put("trips", { kind: "paid", store: store.get(), list: "", env: env ? env.get() : "", date: date.value || today(), by: me(), started: now, status: "done", finished: now, total: n, items_total: 0, count: 0, note: note.value.trim(), auto: auto ? "yes" : "", budget: "", budget_ref: "", posted: "" });
      Kit.toast(auto ? t("tripSaved") : t("tripSavedReview"));
      location.hash = query.env ? "#/env/" + query.env : "#/";
    } }, t("save")));
    setTimeout(function () { amount.focus(); }, 50);
  }

  /* ---------------------------------------------------------------- */
  /*  barcodes                                                         */
  /* ---------------------------------------------------------------- */

  var zxing = null;
  function loadScanner() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (zxing) return zxing;
    zxing = new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = "vendor/zxing.min.js";
      s.onload = function () { ok(window.ZXing); };
      s.onerror = function () { zxing = null; fail(new Error("load")); };
      document.head.appendChild(s);
    });
    return zxing;
  }

  /**
   * Opens the camera over the screen and reads one barcode. A box to type
   * the number is always there, for when the camera is not available.
   */
  function scan(where) {
    var reader = null;
    var video = h("video", { class: "scan-video", playsinline: true, muted: true, autoplay: true });
    var status = h("p", { class: "scan-status" }, t("scanLead"));
    var typed = h("input", { class: "field-input", id: "scan-code", type: "text", inputmode: "numeric", autocomplete: "off", dir: "ltr", "aria-label": t("scanType"), placeholder: t("scanType") });
    var overlay = h("div", { class: "scan", id: "scan", role: "dialog", "aria-label": t("scanTitle") },
      h("div", { class: "scan-top" }, h("h2", null, t("scanTitle")), h("button", { type: "button", class: "btn", id: "scan-close", onclick: close }, t("close"))),
      video,
      status,
      h("form", { class: "scan-type", onsubmit: function (e) {
        e.preventDefault();
        var code = typed.value.replace(/\D/g, "");
        if (code) done(code);
      } }, typed, h("button", { type: "submit", class: "btn" }, t("scanGo"))));
    document.body.appendChild(overlay);

    function close() {
      try { if (reader) reader.reset(); } catch (e) {}
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function done(code) {
      close();
      onCode(code, where);
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent = t("scanNoCamera");
      return;
    }
    loadScanner()
      .then(function (Z) {
        if (!overlay.parentNode) return;
        var hints = new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
        reader = new Z.BrowserMultiFormatReader(hints);
        return reader.decodeFromConstraints({ audio: false, video: { facingMode: "environment" } }, video, function (res) {
          if (res) done(res.getText());
        });
      })
      .catch(function () {
        status.textContent = t("scanNoCamera");
      });
  }

  /** A barcode read: known ones fill in the item; new ones are linked to an item once. */
  function onCode(code, where) {
    var bc = find("barcodes", code);
    var p = bc ? product(bc.product) : null;
    if (!p) {
      S.link = { code: code, where: where };
      location.hash = "#/barcode";
      return;
    }
    useScanned(p, bc, where);
  }

  function useScanned(p, bc, where) {
    var current = currentList();
    if (where === "shop") {
      var trip = myTrip();
      var listId = (trip && trip.list) || (current && current.id);
      var item = onListItem(listId, p.id) || addProduct(find("lists", listId) || current, p, bc);
      S.hub.put("items", { id: item.id, brand: bc.brand || item.brand || "", size: bc.size || item.size || "" });
      S.expanded = item.id;
      S.keep = true;
      location.hash = "#/shop";
      render();
      return;
    }
    var it = onListItem(current.id, p.id);
    if (it) S.hub.put("items", { id: it.id, brand: bc.brand || it.brand || "", size: bc.size || it.size || "" });
    else addProduct(current, p, bc);
    if (location.hash !== "#/add") location.hash = "#/add";
    else render();
  }

  function viewBarcode(main) {
    removeBar();
    var link = S.link;
    main.appendChild(back(link && link.where === "shop" ? "/shop" : "/add"));
    if (!link) {
      main.appendChild(h("p", { class: "empty" }, t("notFound")));
      return;
    }
    main.appendChild(h("h1", { class: "page-title" }, t("newBarcode", { code: link.code })));
    main.appendChild(h("p", { class: "note" }, t("newBarcodeLead")));
    var q = h("input", { class: "field-input", id: "link-search", type: "search", autocomplete: "off", placeholder: t("search"), "aria-label": t("pick") });
    var results = h("div", { class: "list", style: "margin-top:8px" });
    var detail = h("div", { id: "link-detail" });
    main.appendChild(q);
    main.appendChild(results);
    main.appendChild(detail);
    function choose(p) {
      Kit.clear(results);
      Kit.clear(detail);
      q.value = nm(p);
      var bs = brandSize(p, p.brand, p.size);
      var msg = h("p", { class: "form-error", role: "alert" });
      detail.appendChild(h("div", { style: "margin-top:12px" }, h("p", { class: "item-name" }, nm(p)), bs.el, msg,
        h("button", { type: "button", class: "btn btn-primary btn-wide", id: "link-save", onclick: function () {
          var v = bs.read();
          if (!v) { msg.textContent = t("sizeHint"); return; }
          ensureProduct(p);
          var w = [{ table: "barcodes", row: { id: link.code, product: p.id, brand: v.brand, size: v.size } }];
          if (v.newBrand) w.push({ table: "brands", row: v.newBrand });
          S.hub.putMany(w);
          S.cache = null;
          S.link = null;
          useScanned(product(p.id) || p, { brand: v.brand, size: v.size }, link.where);
        } }, t("linkSave"))));
    }
    q.addEventListener("input", function () {
      Kit.clear(results);
      Kit.clear(detail);
      var v = q.value.trim();
      if (!v) return;
      var found = D.search(products(), v, D.addCounts(raw("items")), cache().brands).slice(0, 12);
      found.forEach(function (p) {
        results.appendChild(h("button", { type: "button", class: "shop-row", "data-product": p.id, onclick: function () { choose(p); } }, h("span", { class: "item-name" }, nm(p))));
      });
      if (!D.exactMatch(products(), v)) {
        results.appendChild(h("button", { type: "button", class: "shop-row", id: "link-new", onclick: function () {
          var cat = D.guessCategory(v);
          var arabic = /[؀-ۿ]/.test(v);
          var row = S.hub.put("products", { id: D.productId(v), name: arabic ? "" : v, name_ar: arabic ? v : "", category: cat, unit: D.categoryUnit(cat), qty: 1, brand: "", size: "" });
          S.cache = null;
          choose(product(row.id) || row);
        } }, h("span", { class: "item-name" }, t("newItem", { name: v }))));
      }
    });
    setTimeout(function () { q.focus(); }, 50);
  }

  /* ---------------------------------------------------------------- */
  /*  item and product                                                 */
  /* ---------------------------------------------------------------- */

  function historyBlock(productId) {
    var st = D.priceStats(purchases(), productId);
    var u = D.usage(purchases(), productId, today());
    var out = h("div");
    if (u) out.appendChild(h("p", { class: "note usage" }, t("lasts", { n: u.lasts, date: dayText(u.runOut) })));
    if (!st.rows.length) {
      out.appendChild(h("p", { class: "note" }, t("noHistory")));
      return out;
    }
    var lines = [];
    if (st.cheapest) lines.push(t("cheapestPer", { unit: perName(st.cheapest.base), price: money(st.cheapest.per), what: [variantText(st.cheapest.brand, st.cheapest.size), storeName(st.cheapest.store)].filter(String).join(" ") }));
    if (st.average !== null && st.rows.length > 1) lines.push(t("average", { price: money(st.average), unit: perName(st.last.base) }));
    if (st.change) lines.push(st.change > 0 ? t("upBy", { n: money(st.change), unit: perName(st.last.base) }) : t("downBy", { n: money(-st.change), unit: perName(st.last.base) }));
    lines.forEach(function (l) { out.appendChild(h("p", { class: "note", style: "margin:2px 0" }, l)); });

    /* store by store, for each brand and size bought at more than one store */
    var multi = st.variants.filter(function (v) { return v.storeList.length > 1; });
    if (multi.length) {
      var cmp = h("div", { class: "compare" });
      multi.forEach(function (v) {
        var tb = h("tbody");
        v.storeList.forEach(function (s, i) {
          var r = s.normal || s.last;
          tb.appendChild(h("tr", { "data-best": i === 0 && s.normal ? "yes" : null },
            h("td", null, storeName(s.store) || "-"),
            h("td", { class: "num" }, money(r.price) + (s.normal ? "" : " (" + t("offerTag") + ")")),
            h("td", { class: "num muted" }, dayText(r.date))));
        });
        cmp.appendChild(h("div", { class: "compare-block" }, h("p", { class: "compare-title" }, variantText(v.brand, v.size) || "-"), h("table", { class: "price-table" }, tb)));
      });
      out.appendChild(section(t("compare"), [h("p", { class: "note" }, t("compareLead")), cmp]));
    }

    var table = h("table", { class: "price-table" });
    var body = h("tbody");
    st.rows.slice(0, 40).forEach(function (r) {
      body.appendChild(h("tr", { "data-offer": r.offer ? "yes" : null },
        h("td", null, dayText(r.date)),
        h("td", null, storeName(r.store) || "-", h("span", { class: "td-sub" }, [variantText(r.brand, r.size), qtyText(r.qty, r.unit)].filter(String).join(sep()))),
        h("td", { class: "num" }, money(r.price) + (r.offer ? " (" + t("offerTag") + ")" : "")),
        h("td", { class: "num muted" }, money(r.per) + "/" + perName(r.base))));
    });
    table.appendChild(body);
    out.appendChild(section(t("history"), table));
    return out;
  }

  function productFields(p) {
    var en = h("input", { class: "field-input", type: "text", id: "p-name", dir: "ltr", value: p.name || "" });
    var ar = h("input", { class: "field-input", type: "text", id: "p-name-ar", dir: "rtl", value: p.name_ar || "" });
    var cat = select(categories().map(function (c) { return { value: c.id, label: nm(c) }; }), p.category || "other", { id: "p-cat" });
    return {
      el: h("div", null, h("div", { class: "two" }, field(t("nameEn"), en), field(t("nameAr"), ar)), field(t("category"), cat)),
      read: function () {
        return { id: p.id, name: en.value.trim(), name_ar: ar.value.trim(), category: cat.value };
      },
    };
  }

  function viewItem(main, id) {
    removeBar();
    var i = find("items", id);
    main.appendChild(back("/"));
    if (!i) {
      main.appendChild(h("p", { class: "empty" }, t("notFound")));
      return;
    }
    var p = product(i.product) || { id: i.product, name: i.name, name_ar: "", category: "other", sizes: [], brands: [] };
    main.appendChild(h("h1", { class: "page-title" }, itemName(i)));
    var pf = productFields(p);
    main.appendChild(pf.el);
    main.appendChild(group(t("qty"), stepper(i)));
    var bs = brandSize(p, i.brand, i.size);
    main.appendChild(bs.el);
    var note = h("input", { class: "field-input", type: "text", id: "it-note", value: i.note || "" });
    var listSel = select(lists(true).map(function (l) { return { value: l.id, label: nm(l) }; }), i.list, { id: "it-list" });
    main.appendChild(h("div", { class: "two" }, field(t("note"), note), field(t("list"), listSel)));
    var msg = h("p", { class: "form-error", role: "alert" });
    main.appendChild(msg);
    main.appendChild(h("button", { type: "button", class: "btn btn-primary btn-wide", id: "item-save", onclick: function () {
      var pr = pf.read();
      if (!pr.name && !pr.name_ar) { msg.textContent = t("giveName"); return; }
      var v = bs.read();
      if (!v) { msg.textContent = t("sizeHint"); return; }
      var w = [
        { table: "products", row: Object.assign(p._cat ? D.productRow(p) : {}, pr, { brand: v.brand, size: v.size }) },
        { table: "items", row: { id: i.id, note: note.value.trim(), list: listSel.value, name: pr.name || pr.name_ar, brand: v.brand, size: v.size } },
      ];
      if (v.newBrand) w.push({ table: "brands", row: v.newBrand });
      S.hub.putMany(w);
      S.cache = null;
      Kit.toast(t("saved"));
      location.hash = "#/";
    } }, t("save")));
    if (i.done) main.appendChild(section(t("price"), pricePad(i, { save: true })));
    main.appendChild(historyBlock(p.id));
    main.appendChild(h("div", { class: "btn-row", style: "margin-top:14px" }, Kit.confirmButton(t("deleteItem"), t("tapAgainDelete"), function () {
      S.hub.remove("items", i.id);
      Kit.toast(t("deleted"));
      location.hash = "#/";
    })));
  }

  function viewProduct(main, id) {
    removeBar();
    var p = product(id);
    main.appendChild(back("/prices"));
    if (!p) {
      main.appendChild(h("p", { class: "empty" }, t("notFound")));
      return;
    }
    main.appendChild(h("h1", { class: "page-title" }, nm(p)));
    var current = currentList();
    if (current && !onListItem(current.id, p.id)) {
      main.appendChild(h("div", { class: "btn-row", style: "margin:8px 0" }, h("button", { type: "button", class: "btn btn-primary", onclick: function () {
        addProduct(current, p);
        render();
      } }, t("addToList", { list: nm(current) }))));
    }
    main.appendChild(historyBlock(p.id));
    var pf = productFields(p);
    main.appendChild(section("", [pf.el, h("button", { type: "button", class: "btn", onclick: function () {
      S.hub.put("products", Object.assign(p._cat ? D.productRow(p) : {}, pf.read()));
      S.cache = null;
      Kit.toast(t("saved"));
    } }, t("save"))]));
  }

  /* ---------------------------------------------------------------- */
  /*  prices and trips                                                 */
  /* ---------------------------------------------------------------- */

  function viewPrices(main) {
    removeBar();
    main.appendChild(back("/"));
    main.appendChild(h("h1", { class: "page-title" }, t("prices")));
    main.appendChild(h("p", { class: "note" }, t("pricesLead")));
    var q = h("input", { class: "field-input", type: "search", id: "price-filter", placeholder: t("filter"), "aria-label": t("filter") });
    var list = h("div", { class: "list", style: "margin-top:10px" });
    main.appendChild(q);
    main.appendChild(list);
    var all = purchases();
    var priced = {};
    all.forEach(function (r) { if (Number(r.price) > 0) priced[r.product] = 1; });
    var withPrice = products().filter(function (p) { return priced[p.id]; });
    function paint() {
      Kit.clear(list);
      var shown = q.value.trim() ? D.search(withPrice, q.value, {}, cache().brands) : withPrice.slice().sort(function (a, b) { return nm(a).localeCompare(nm(b)); });
      if (!shown.length) list.appendChild(h("div", { class: "empty" }, t("noHistory")));
      shown.forEach(function (p) {
        var st = D.priceStats(all, p.id);
        var sub = [variantText(st.last.brand, st.last.size), storeName(st.last.store), cheaperText(p.id)].filter(String).join(sep());
        list.appendChild(h("a", { class: "row-link item", href: "#/product/" + p.id },
          h("div", { class: "item-main" }, h("span", { class: "item-name" }, nm(p)), h("span", { class: "item-sub" }, sub)),
          h("span", { class: "amt" }, money(st.last.price))));
      });
    }
    q.addEventListener("input", paint);
    paint();
  }

  function viewTrips(main) {
    removeBar();
    main.appendChild(back("/"));
    main.appendChild(h("h1", { class: "page-title" }, t("trips")));
    main.appendChild(h("p", { class: "note" }, t("tripsLead")));
    var trips = S.hub.all("trips").sort(function (a, b) { return String(b.started) < String(a.started) ? -1 : 1; });
    var list = h("div", { class: "list", id: "trips" });
    if (!trips.length) list.appendChild(h("div", { class: "empty" }, t("noTrips")));
    trips.forEach(function (tr) { list.appendChild(tripRow(tr)); });
    main.appendChild(list);
  }

  function viewTrip(main, id) {
    removeBar();
    main.appendChild(back("/trips"));
    var tr = find("trips", id);
    if (!tr) {
      main.appendChild(h("p", { class: "empty" }, t("notFound")));
      return;
    }
    main.appendChild(h("h1", { class: "page-title" }, tripTitle(tr)));
    var facts = h("div", { class: "list facts" });
    function fact(a, b) { facts.appendChild(h("div", { class: "row" }, h("span", { class: "row-main" }, a), h("span", { class: "amt" }, b))); }
    fact(t("amount"), money(tr.total));
    if (tr.env) fact(t("paidFrom"), envName(tr.env));
    fact(t("trips"), tripStatus(tr));
    if (tr.note) fact(t("note"), tr.note);
    main.appendChild(facts);
    var items = raw("items").filter(function (i) { return i.trip === tr.id; });
    if (items.length) {
      var l = h("div", { class: "list" });
      items.forEach(function (i) {
        l.appendChild(h("div", { class: "row" }, h("div", { class: "row-main" }, h("span", { class: "row-title" }, itemName(i)), h("span", { class: "row-sub" }, [variantText(i.brand, i.size), qtyText(i.qty, i.unit)].filter(String).join(sep()))), h("span", { class: "amt" }, Number(i.price) > 0 ? money(i.price) : "-")));
      });
      main.appendChild(section(t("inThisTrip"), l));
    }
    if (tr.status === "done") {
      main.appendChild(h("div", { class: "btn-row", style: "margin-top:14px" },
        tr.budget === "posted" ? h("p", { class: "note" }, t("tripInBudget")) : Kit.confirmButton(t("deleteTrip"), t("tapAgainDelete"), function () {
          S.hub.put("trips", { id: tr.id, del: new Date().toISOString() });
          Kit.toast(t("deleted"));
          location.hash = "#/trips";
        })));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  settings                                                         */
  /* ---------------------------------------------------------------- */

  function nameRow(table, row, extra) {
    var en = h("input", { class: "field-input", type: "text", value: row.name || "", dir: "ltr", "aria-label": t("nameEn") + ": " + nm(row) });
    var ar = h("input", { class: "field-input", type: "text", value: row.name_ar || "", dir: "rtl", "aria-label": t("nameAr") + ": " + nm(row) });
    function save() {
      if (en.value.trim() === (row.name || "") && ar.value.trim() === (row.name_ar || "")) return;
      S.hub.put(table, { id: row.id, name: en.value.trim(), name_ar: ar.value.trim() });
      Kit.toast(t("saved"));
    }
    en.addEventListener("change", save);
    ar.addEventListener("change", save);
    return h("div", { class: "row", style: "flex-wrap:wrap" }, h("div", { class: "two", style: "flex:1 1 100%" }, en, ar), extra || null);
  }

  function move(table, rows, index, delta) {
    var j = index + delta;
    if (j < 0 || j >= rows.length) return;
    var a = rows[index];
    var b = rows[j];
    S.hub.putMany([
      { table: table, row: { id: a.id, order: Number(b.order || j) } },
      { table: table, row: { id: b.id, order: Number(a.order || index) } },
    ]);
    render();
  }

  function viewSettings(main) {
    removeBar();
    main.appendChild(back("/"));
    main.appendChild(h("h1", { class: "page-title" }, t("settings")));

    var envOpts = [{ value: "", label: t("noEnv") }].concat(envelopes().map(function (e) { return { value: e.id, label: nm(e) }; }));
    var ll = h("div", { class: "list" });
    lists(true).forEach(function (l) {
      var env = select(envOpts, listEnv(l), { "aria-label": t("listEnv", { list: nm(l) }), "data-list-env": l.id });
      env.addEventListener("change", function () { S.hub.put("lists", { id: l.id, env: env.value }); Kit.toast(t("saved")); });
      ll.appendChild(nameRow("lists", l, h("div", { style: "flex:1 1 100%;display:flex;gap:8px;align-items:center" },
        envelopes().length ? env : null,
        h("span", { class: "row-sub", style: "flex:1" }, l.active === "no" ? t("hidden") : ""),
        h("button", { class: "btn btn-quiet", type: "button", onclick: function () { S.hub.put("lists", { id: l.id, active: l.active === "no" ? "yes" : "no" }); render(); } }, l.active === "no" ? t("show") : t("hide")))));
    });
    main.appendChild(section(t("lists"), [ll,
      envelopes().length ? null : h("p", { class: "note" }, t("envHelp")),
      h("div", { class: "btn-row", style: "margin-top:8px" }, h("button", { class: "btn", type: "button", onclick: function () {
        S.hub.put("lists", { name: Kit.lang() === "ar" ? "" : t("newList"), name_ar: Kit.lang() === "ar" ? t("newList") : "", order: lists(true).length + 1, active: "yes", env: "" });
        render();
      } }, t("addList")))]));

    var cats = categories();
    var cl = h("div", { class: "list" });
    cats.forEach(function (c, i) {
      cl.appendChild(nameRow("categories", c, h("div", { class: "btn-row", style: "flex:1 1 100%;justify-content:flex-end" },
        h("button", { class: "btn btn-quiet", type: "button", "aria-label": t("up") + ": " + nm(c), disabled: i === 0, onclick: function () { move("categories", cats, i, -1); } }, "↑"),
        h("button", { class: "btn btn-quiet", type: "button", "aria-label": t("down") + ": " + nm(c), disabled: i === cats.length - 1, onclick: function () { move("categories", cats, i, 1); } }, "↓"))));
    });
    main.appendChild(section(t("categories"), [h("p", { class: "note" }, t("categoriesLead")), cl]));

    var sl = h("div", { class: "list" });
    stores(true).forEach(function (s) {
      sl.appendChild(nameRow("stores", s, h("div", { class: "btn-row", style: "flex:1 1 100%;justify-content:flex-end" },
        h("span", { class: "row-sub", style: "flex:1" }, s.active === "no" ? t("hidden") : ""),
        h("button", { class: "btn btn-quiet", type: "button", onclick: function () { S.hub.put("stores", { id: s.id, active: s.active === "no" ? "yes" : "no" }); render(); } }, s.active === "no" ? t("show") : t("hide")))));
    });
    main.appendChild(section(t("stores"), [sl,
      h("div", { class: "btn-row", style: "margin-top:8px" }, h("button", { class: "btn", type: "button", onclick: function () {
        S.hub.put("stores", { name: Kit.lang() === "ar" ? "" : t("newStore"), name_ar: Kit.lang() === "ar" ? t("newStore") : "", order: stores(true).length + 1, active: "yes" });
        render();
      } }, t("addStore")))]));

    main.appendChild(section(t("language"), Kit.langSwitch(["en", "ar"])));
    main.appendChild(section(t("device"), [
      me() ? h("p", { class: "note" }, t("thisIs", { name: me() })) : null,
      h("div", { class: "btn-row" }, Kit.confirmButton(t("lockDevice"), t("tapToLock"), function () { Kit.lockDevice(S.hub); }))]));
  }

  /* ---------------------------------------------------------------- */
  /*  routing                                                          */
  /* ---------------------------------------------------------------- */

  /* screens with typing in them are not redrawn by a sync; the add screen refreshes its results only */
  var FORMS = { item: 1, product: 1, finish: 1, settings: 1, prices: 1, paid: 1, barcode: 1 };
  var route = { name: "" };

  function parseRoute() {
    var rawHash = (location.hash || "#/").slice(1);
    var q = {};
    var qs = rawHash.indexOf("?");
    if (qs >= 0) {
      rawHash.slice(qs + 1).split("&").forEach(function (kv) {
        var p = kv.split("=");
        q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });
      rawHash = rawHash.slice(0, qs);
    }
    var parts = rawHash.split("/").filter(String);
    return { name: parts[0] || "", arg: parts[1], query: q };
  }

  function render() {
    var next = parseRoute();
    if (next.name !== route.name && !S.keep) S.expanded = null;
    S.keep = false;
    route = next;
    S.repaintAdd = null;
    S.cache = null;
    var main = S.main;
    Kit.clear(main);
    switch (route.name) {
      case "add": viewAdd(main); break;
      case "item": viewItem(main, route.arg); break;
      case "product": viewProduct(main, route.arg); break;
      case "shop": viewShop(main); break;
      case "finish": viewFinish(main); break;
      case "paid": viewPaid(main, route.query); break;
      case "env": viewEnv(main, route.arg); break;
      case "prices": viewPrices(main); break;
      case "trips": viewTrips(main); break;
      case "trip": viewTrip(main, route.arg); break;
      case "barcode": viewBarcode(main); break;
      case "settings": viewSettings(main); break;
      default: viewList(main);
    }
  }

  function onData() {
    S.cache = null;
    seed();
    if (route.name === "add" && S.repaintAdd) {
      var active = document.activeElement;
      if (active && active.id === "add-search") S.repaintAdd();
      return;
    }
    if (FORMS[route.name]) return;
    /* a price being typed is never wiped by a sync */
    if (S.expanded && document.activeElement && document.activeElement.tagName === "INPUT") return;
    if (document.getElementById("scan")) return;
    render();
  }

  /* for tests, and for a future Shortcut: hand the app a barcode as if scanned */
  window.HouseholdApp = { code: function (code, where) { onCode(String(code), where || "add"); } };

  Kit.start({
    app: "household",
    title: { en: "Household", ar: "البيت" },
    languages: ["en", "ar"],
    render: function (main, hub) {
      S.hub = hub;
      S.main = main;
      var lastState = hub.state;
      hub.on(function () {
        if (lastState === "syncing" && hub.state === "idle") S.syncedOnce = true;
        lastState = hub.state;
        onData();
      });
      window.addEventListener("hashchange", render);
      window.addEventListener("popstate", render);
      render();
    },
    onWho: function () {
      if (!FORMS[route.name] && route.name !== "add") render();
    },
  });
})();
