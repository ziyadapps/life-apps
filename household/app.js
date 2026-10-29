/*
 * Household lists: shared lists for the home, in English or Arabic.
 *
 * Tables in the "Life apps: household" sheet:
 *   lists  name, name_ar, order, active
 *   items  list, name, qty, note, by, added, done, done_by
 * An item is open while done is blank; ticking it stamps done with the time
 * and who ticked it. "Clear bought" deletes the ticked ones.
 */
(function () {
  "use strict";

  var h = Kit.h;
  var t = Kit.t;
  var LIST_KEY = "lifeapps.household.list";

  Kit.words({
    en: {
      title: "Household",
      addTo: "Add to {list}",
      add: "Add",
      bought: "Bought",
      clearBought: "Clear bought ({n})",
      tapAgainClear: "Tap again to clear",
      empty: "Nothing on this list. Type below to add something.",
      from: "from {who}",
      you: "you",
      siri: "Siri",
      boughtBy: "bought by {who}",
      markBought: "Mark {name} as bought",
      markOpen: "Put {name} back on the list",
      already: "{name} is already on the list",
      backOn: "{name} is back on the list",
      added: "Added {name}",
      edit: "Edit",
      item: "Item",
      qty: "Quantity",
      note: "Note",
      list: "List",
      save: "Save",
      saved: "Saved",
      deleteItem: "Delete item",
      tapAgainDelete: "Tap again to delete",
      deleted: "Deleted",
      back: "Back",
      lists: "Lists",
      manageLists: "Lists and settings",
      nameEn: "Name in English",
      nameAr: "Name in Arabic",
      addList: "Add list",
      newList: "New list",
      hide: "Hide",
      show: "Show",
      hidden: "hidden",
      device: "This device",
      thisIs: "This phone is \"{name}\".",
      receipt: "Add receipt to Budget",
      receiptLead: "Posts what you paid to an envelope in Budget. It needs a connection.",
      total: "Total paid",
      envelope: "Budget envelope",
      receiptSaved: "Added {amount} to {env} in Budget",
      needsSignal: "That needs a connection. Try again when you are online.",
      typeAmount: "Type the amount paid.",
      notFound: "Not here any more. It may have been deleted on the other phone.",
      giveName: "Type a name.",
    },
    ar: {
      title: "البيت",
      addTo: "أضف إلى {list}",
      add: "إضافة",
      bought: "تم شراؤه",
      clearBought: "مسح ما تم شراؤه ({n})",
      tapAgainClear: "اضغط مرة ثانية للمسح",
      empty: "القائمة فاضية. اكتب تحت لإضافة غرض.",
      from: "من {who}",
      you: "أنت",
      siri: "سيري",
      boughtBy: "اشتراه {who}",
      markBought: "تم شراء {name}",
      markOpen: "إرجاع {name} للقائمة",
      already: "{name} موجود في القائمة",
      backOn: "رجع {name} للقائمة",
      added: "تمت إضافة {name}",
      edit: "تعديل",
      item: "الغرض",
      qty: "الكمية",
      note: "ملاحظة",
      list: "القائمة",
      save: "حفظ",
      saved: "تم الحفظ",
      deleteItem: "حذف الغرض",
      tapAgainDelete: "اضغط مرة ثانية للحذف",
      deleted: "تم الحذف",
      back: "رجوع",
      lists: "القوائم",
      manageLists: "القوائم والإعدادات",
      nameEn: "الاسم بالإنجليزي",
      nameAr: "الاسم بالعربي",
      addList: "إضافة قائمة",
      newList: "قائمة جديدة",
      hide: "إخفاء",
      show: "إظهار",
      hidden: "مخفية",
      device: "هذا الجهاز",
      thisIs: "هذا الجوال باسم \"{name}\".",
      receipt: "إضافة الفاتورة للميزانية",
      receiptLead: "يسجل المبلغ المدفوع في ظرف من الميزانية. يحتاج اتصال.",
      total: "المبلغ المدفوع",
      envelope: "ظرف الميزانية",
      receiptSaved: "تمت إضافة {amount} إلى {env} في الميزانية",
      needsSignal: "يحتاج اتصال. حاول مرة ثانية لما يرجع الاتصال.",
      typeAmount: "اكتب المبلغ المدفوع.",
      notFound: "غير موجود. يمكن انحذف من الجوال الثاني.",
      giveName: "اكتب الاسم.",
    },
  });

  /* the lists every household starts with; fixed ids so two phones never make them twice */
  var STARTER = [
    { id: "groceries", name: "Groceries", name_ar: "المقاضي", order: 1, active: "yes" },
    { id: "pharmacy", name: "Pharmacy", name_ar: "الصيدلية", order: 2, active: "yes" },
    { id: "home", name: "Home", name_ar: "البيت", order: 3, active: "yes" },
  ];

  var S = { hub: null, main: null, syncedOnce: false };

  /* ---------------------------------------------------------------- */
  /*  data                                                             */
  /* ---------------------------------------------------------------- */

  function lists(all) {
    return S.hub
      .all("lists")
      .filter(function (l) {
        return all || l.active !== "no";
      })
      .sort(function (a, b) {
        return Number(a.order || 0) - Number(b.order || 0);
      });
  }

  function listName(l) {
    if (!l) return "";
    return Kit.lang() === "ar" ? l.name_ar || l.name : l.name || l.name_ar;
  }

  function currentList() {
    var all = lists();
    var saved = null;
    try {
      saved = localStorage.getItem(LIST_KEY);
    } catch (e) {}
    return (
      all.filter(function (l) {
        return l.id === saved;
      })[0] || all[0] || null
    );
  }

  function chooseList(id) {
    try {
      localStorage.setItem(LIST_KEY, id);
    } catch (e) {}
  }

  function itemsOf(listId) {
    return S.hub.all("items").filter(function (i) {
      return i.list === listId;
    });
  }

  function me() {
    return Kit.who().name || "";
  }

  function whoText(name) {
    if (!name) return "";
    if (name === me()) return t("you");
    if (/^shortcuts?$/i.test(name) || /^siri$/i.test(name)) return t("siri");
    return name;
  }

  function norm(s) {
    return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  /** Lists appear once on a new household, after this phone has heard from the sheet. */
  function ensureStarterLists() {
    if (!S.syncedOnce) return;
    if (S.hub.all("lists").length || Object.keys(S.hub.tables.lists || {}).length) return;
    S.hub.putMany(
      STARTER.map(function (l) {
        return { table: "lists", row: l };
      })
    );
  }

  /* ---------------------------------------------------------------- */
  /*  the list                                                         */
  /* ---------------------------------------------------------------- */

  function viewList(main) {
    var current = currentList();
    var tabs = h("div", { class: "list-tabs", role: "group", "aria-label": t("lists") });
    lists().forEach(function (l) {
      var open = itemsOf(l.id).filter(function (i) {
        return !i.done;
      }).length;
      tabs.appendChild(
        h(
          "button",
          {
            type: "button",
            class: "list-tab",
            "data-list": l.id,
            "aria-pressed": current && current.id === l.id ? "true" : "false",
            onclick: function () {
              chooseList(l.id);
              render();
            },
          },
          listName(l),
          open ? h("span", { class: "count" }, String(open)) : null
        )
      );
    });
    main.appendChild(tabs);

    if (!current) {
      main.appendChild(h("p", { class: "empty" }, "…"));
      return;
    }

    var items = itemsOf(current.id);
    var open = items
      .filter(function (i) { return !i.done; })
      .sort(function (a, b) { return String(b.added || b.ts) < String(a.added || a.ts) ? -1 : 1; });
    var done = items
      .filter(function (i) { return !!i.done; })
      .sort(function (a, b) { return String(b.done) < String(a.done) ? -1 : 1; });

    var list = h("div", { class: "list", id: "open-items", style: "margin-top:10px" });
    if (!open.length) list.appendChild(h("div", { class: "empty" }, t("empty")));
    open.forEach(function (i) {
      list.appendChild(itemRow(i));
    });
    main.appendChild(list);

    if (done.length) {
      var dl = h("div", { class: "list", id: "done-items" });
      done.forEach(function (i) {
        dl.appendChild(itemRow(i));
      });
      main.appendChild(h("section", { class: "section" }, h("h2", { class: "section-title" }, t("bought")), dl));
      var actions = h("div", { class: "btn-row", style: "margin-top:12px" },
        Kit.confirmButton(t("clearBought", { n: done.length }), t("tapAgainClear"), function () {
          var now = new Date().toISOString();
          S.hub.putMany(done.map(function (i) { return { table: "items", row: { id: i.id, del: now } }; }));
          render();
        })
      );
      if (Kit.canUse("budget")) {
        actions.appendChild(h("a", { class: "btn", href: "#/receipt/" + current.id, style: "text-decoration:none" }, t("receipt")));
      }
      main.appendChild(actions);
    }

    main.appendChild(
      h("div", { class: "foot-links" }, h("a", { class: "btn btn-quiet", href: "#/settings" }, t("manageLists")))
    );

    composer(current);
  }

  function itemRow(i) {
    var bits = [];
    if (i.note) bits.push(i.note);
    /* only other people are named; your own items need no label */
    if (i.done) {
      if (i.done_by && i.done_by !== me()) bits.push(t("boughtBy", { who: whoText(i.done_by) }));
    } else if (i.by && i.by !== me()) bits.push(t("from", { who: whoText(i.by) }));
    var pending = S.hub.isPending("items", i.id);
    return h(
      "div",
      { class: "item", "data-done": i.done ? "yes" : null, "data-pending": pending ? "yes" : null, "data-id": i.id },
      h(
        "button",
        {
          type: "button",
          class: "tick-btn",
          "aria-label": i.done ? t("markOpen", { name: i.name }) : t("markBought", { name: i.name }),
          onclick: function () {
            if (i.done) S.hub.put("items", { id: i.id, done: "", done_by: "" });
            else S.hub.put("items", { id: i.id, done: new Date().toISOString(), done_by: me() });
            render();
          },
        },
        h("span", { "aria-hidden": "true" })
      ),
      h(
        "a",
        { class: "item-main", href: "#/item/" + i.id, "aria-label": t("edit") + ": " + i.name },
        h("span", { class: "item-name" }, i.name),
        bits.length ? h("span", { class: "item-sub" }, bits.join(Kit.lang() === "ar" ? "، " : ", ")) : null
      ),
      i.qty ? h("span", { class: "qty" }, String(i.qty)) : null
    );
  }

  /** The add bar at the bottom, with names used before as suggestions. */
  function composer(current) {
    var old = document.getElementById("composer");
    if (old) old.parentNode.removeChild(old);
    var known = {};
    Object.keys(S.hub.tables.items || {}).forEach(function (id) {
      var i = S.hub.tables.items[id];
      if (i.list === current.id && i.name) known[norm(i.name)] = i.name;
    });
    var dl = h("datalist", { id: "past-items" });
    Object.keys(known)
      .sort()
      .forEach(function (k) {
        dl.appendChild(h("option", { value: known[k] }));
      });
    var input = h("input", {
      class: "field-input",
      id: "new-item",
      type: "text",
      list: "past-items",
      autocomplete: "off",
      enterkeyhint: "done",
      placeholder: t("addTo", { list: listName(current) }),
      "aria-label": t("addTo", { list: listName(current) }),
    });
    var form = h(
      "form",
      {
        class: "composer",
        id: "composer",
        onsubmit: function (e) {
          e.preventDefault();
          var name = input.value.trim().replace(/\s+/g, " ");
          if (!name) return;
          input.value = ""; // before saving: saving redraws the page at once
          var same = itemsOf(current.id).filter(function (i) {
            return norm(i.name) === norm(name);
          })[0];
          if (same && !same.done) {
            Kit.toast(t("already", { name: same.name }));
          } else if (same) {
            S.hub.put("items", { id: same.id, done: "", done_by: "", by: me(), added: new Date().toISOString() });
            Kit.toast(t("backOn", { name: same.name }));
          } else {
            S.hub.put("items", { list: current.id, name: name, qty: "", note: "", by: me(), added: new Date().toISOString(), done: "", done_by: "" });
          }
          render();
          var again = document.getElementById("new-item");
          if (again) again.focus();
        },
      },
      h("div", { class: "composer-inner" }, input, h("button", { class: "btn btn-primary", type: "submit" }, t("add"))),
      dl
    );
    document.body.appendChild(form);
  }

  function removeComposer() {
    var old = document.getElementById("composer");
    if (old) old.parentNode.removeChild(old);
  }

  /* ---------------------------------------------------------------- */
  /*  edit an item                                                     */
  /* ---------------------------------------------------------------- */

  function field(label, input) {
    return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input);
  }

  function viewItem(main, id) {
    removeComposer();
    var i = S.hub.get("items", id);
    main.appendChild(h("a", { class: "back", href: "#/" }, t("back")));
    if (!i) {
      main.appendChild(h("p", { class: "empty" }, t("notFound")));
      return;
    }
    main.appendChild(h("h1", { class: "page-title" }, t("edit")));
    var name = h("input", { class: "field-input", id: "it-name", type: "text", value: i.name || "" });
    var qty = h("input", { class: "field-input", id: "it-qty", type: "text", value: i.qty || "", placeholder: "2, 1 kg, …" });
    var note = h("input", { class: "field-input", id: "it-note", type: "text", value: i.note || "" });
    var sel = h("select", { class: "select", id: "it-list" });
    lists(true).forEach(function (l) {
      var o = h("option", { value: l.id }, listName(l));
      if (l.id === i.list) o.selected = true;
      sel.appendChild(o);
    });
    main.appendChild(field(t("item"), name));
    main.appendChild(h("div", { class: "two", style: "display:grid;grid-template-columns:1fr 1fr;gap:10px" }, field(t("qty"), qty), field(t("list"), sel)));
    main.appendChild(field(t("note"), note));
    var msg = h("p", { class: "form-error", role: "alert" });
    main.appendChild(msg);
    main.appendChild(
      h("button", { class: "btn btn-primary btn-wide", type: "button", onclick: function () {
        var n = name.value.trim();
        if (!n) { msg.textContent = t("giveName"); return; }
        S.hub.put("items", { id: i.id, name: n, qty: qty.value.trim(), note: note.value.trim(), list: sel.value });
        Kit.toast(t("saved"));
        location.hash = "#/";
      } }, t("save"))
    );
    main.appendChild(
      h("div", { class: "btn-row", style: "margin-top:12px" }, Kit.confirmButton(t("deleteItem"), t("tapAgainDelete"), function () {
        S.hub.remove("items", i.id);
        Kit.toast(t("deleted"));
        location.hash = "#/";
      }))
    );
  }

  /* ---------------------------------------------------------------- */
  /*  receipt to Budget                                                */
  /* ---------------------------------------------------------------- */

  function viewReceipt(main, listId) {
    removeComposer();
    var l = lists(true).filter(function (x) { return x.id === listId; })[0];
    main.appendChild(h("a", { class: "back", href: "#/" }, t("back")));
    main.appendChild(h("h1", { class: "page-title" }, t("receipt")));
    main.appendChild(h("p", { class: "note" }, t("receiptLead")));
    var amount = h("input", { class: "field-input", id: "rc-amount", type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "0.00", dir: "ltr" });
    var env = h("input", { class: "field-input", id: "rc-env", type: "text", value: l && l.budget_env ? l.budget_env : l && l.id === "pharmacy" ? "" : "Groceries" });
    main.appendChild(field(t("total"), amount));
    main.appendChild(field(t("envelope"), env));
    var msg = h("p", { class: "form-error", role: "alert" });
    main.appendChild(msg);
    var btn = h("button", { class: "btn btn-primary btn-wide", type: "button", onclick: function () {
      var n = Number(String(amount.value).replace(/,/g, "").replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); }));
      if (!isFinite(n) || n <= 0) { msg.textContent = t("typeAmount"); return; }
      var envName = env.value.trim() || "Groceries";
      btn.disabled = true;
      var d = new Date();
      var date = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      Hub.call(Hub.config(), {
        action: "add",
        app: "budget",
        table: "payments",
        row: { date: date, env: envName, acct: "", amount: Math.round(n * 100) / 100, label: "", note: listName(l) + " (household)", kind: "spend", source: "household" },
      })
        .then(function () {
          if (l && l.budget_env !== envName) S.hub.put("lists", { id: l.id, budget_env: envName });
          Kit.toast(t("receiptSaved", { amount: n.toFixed(2), env: envName }));
          location.hash = "#/";
        })
        .catch(function (err) {
          msg.textContent = err.kind === "offline" ? t("needsSignal") : err.message;
          btn.disabled = false;
        });
    } }, t("receipt"));
    main.appendChild(btn);
  }

  /* ---------------------------------------------------------------- */
  /*  lists and settings                                               */
  /* ---------------------------------------------------------------- */

  function viewSettings(main) {
    removeComposer();
    main.appendChild(h("a", { class: "back", href: "#/" }, t("back")));
    main.appendChild(h("h1", { class: "page-title" }, t("manageLists")));
    var wrap = h("div", { class: "list" });
    lists(true).forEach(function (l) {
      var en = h("input", { class: "field-input", type: "text", value: l.name || "", "aria-label": t("nameEn") + ": " + listName(l), dir: "ltr" });
      var ar = h("input", { class: "field-input", type: "text", value: l.name_ar || "", "aria-label": t("nameAr") + ": " + listName(l), dir: "rtl" });
      function save() {
        if (en.value.trim() === (l.name || "") && ar.value.trim() === (l.name_ar || "")) return;
        S.hub.put("lists", { id: l.id, name: en.value.trim(), name_ar: ar.value.trim() });
        Kit.toast(t("saved"));
      }
      en.addEventListener("change", save);
      ar.addEventListener("change", save);
      wrap.appendChild(
        h("div", { class: "row", style: "flex-wrap:wrap" },
          h("div", { style: "flex:1 1 100%;display:grid;grid-template-columns:1fr 1fr;gap:8px" }, en, ar),
          h("span", { class: "row-sub", style: "flex:1" }, l.active === "no" ? t("hidden") : ""),
          h("button", { class: "btn btn-quiet", type: "button", onclick: function () {
            S.hub.put("lists", { id: l.id, active: l.active === "no" ? "yes" : "no" });
            render();
          } }, l.active === "no" ? t("show") : t("hide"))
        )
      );
    });
    main.appendChild(h("section", { class: "section" }, h("h2", { class: "section-title" }, t("lists")), wrap));
    main.appendChild(
      h("div", { class: "btn-row", style: "margin-top:10px" }, h("button", { class: "btn", type: "button", onclick: function () {
        var n = lists(true).length + 1;
        S.hub.put("lists", { name: Kit.lang() === "ar" ? "" : t("newList"), name_ar: Kit.lang() === "ar" ? t("newList") : "", order: n, active: "yes" });
        render();
      } }, t("addList")))
    );

    main.appendChild(
      h("section", { class: "section" },
        h("h2", { class: "section-title" }, t("language")),
        Kit.langSwitch(["en", "ar"])
      )
    );
    main.appendChild(
      h("section", { class: "section" },
        h("h2", { class: "section-title" }, t("device")),
        me() ? h("p", { class: "note" }, t("thisIs", { name: me() })) : null,
        h("div", { class: "btn-row" }, Kit.confirmButton(t("lockDevice"), t("tapToLock"), function () { Kit.lockDevice(S.hub); }))
      )
    );
  }

  /* ---------------------------------------------------------------- */
  /*  routing                                                          */
  /* ---------------------------------------------------------------- */

  var FORMS = { item: 1, receipt: 1, settings: 1 };
  var route = { name: "" };

  function render() {
    var parts = (location.hash || "#/").slice(2).split("/").filter(String);
    route = { name: parts[0] || "", arg: parts[1] };
    var main = S.main;
    var typing = document.activeElement && document.activeElement.id === "new-item" ? document.activeElement.value : null;
    Kit.clear(main);
    if (route.name === "item") viewItem(main, route.arg);
    else if (route.name === "receipt") viewReceipt(main, route.arg);
    else if (route.name === "settings") viewSettings(main);
    else viewList(main);
    if (typing !== null) {
      var input = document.getElementById("new-item");
      if (input) {
        input.value = typing;
        input.focus();
      }
    }
  }

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
        ensureStarterLists();
        if (!FORMS[route.name]) render();
      });
      window.addEventListener("hashchange", render);
      render();
    },
    onWho: function () {
      render();
    },
  });
})();
