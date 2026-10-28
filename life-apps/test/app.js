/*
 * Hub test: the smallest possible app, used to prove the hub works before
 * anything real depends on it. Add lines, delete them, go offline and come
 * back, and check that everything lands in the "items" tab of the test sheet.
 */
Kit.start({
  app: "test",
  title: "Hub test",
  render: function (main, hub) {
    var h = Kit.h;

    var count = h("span", { class: "figure-value" });
    var countLabel = h("span", { class: "figure-label" });
    var list = h("ul", { class: "list", id: "items" });
    var checks = h("ul", { class: "list", id: "checks", hidden: true });

    function sourceText(r) {
      if (r.source === "shortcut") return "from a shortcut";
      if (r.source === "app") return "from the app";
      return r.source || "";
    }

    function paint() {
      var rows = hub.all("items").sort(function (a, b) {
        return (a.added || a.ts) < (b.added || b.ts) ? 1 : -1;
      });
      count.textContent = String(rows.length);
      countLabel.textContent = rows.length === 1 ? "line in the test sheet" : "lines in the test sheet";
      Kit.clear(list);
      if (!rows.length) {
        list.appendChild(h("li", { class: "empty" }, "Nothing here yet. Type something below and press Add."));
        return;
      }
      rows.forEach(function (r) {
        var pending = hub.isPending("items", r.id);
        list.appendChild(
          h(
            "li",
            { class: "row", "data-pending": pending ? "yes" : null },
            h(
              "div",
              { class: "row-main" },
              h("span", { class: "row-title" }, r.name || "(no text)"),
              h(
                "span",
                { class: "row-sub" },
                (pending ? "waiting to send, " : "") + Kit.ago(r.added || r.ts) + ", " + sourceText(r)
              )
            ),
            h(
              "button",
              {
                class: "btn btn-quiet",
                type: "button",
                "aria-label": "Delete " + (r.name || "line"),
                onclick: function () {
                  hub.remove("items", r.id);
                },
              },
              "Delete"
            )
          )
        );
      });
    }

    function runCheck(btn) {
      btn.disabled = true;
      btn.textContent = "Checking";
      var config = Hub.config();
      Promise.all([Hub.call(config, { action: "ping" }), Hub.call(config, { action: "health" })])
        .then(function (res) {
          var ping = res[0];
          var health = res[1];
          var items = [
            { name: "Hub version", pass: true, detail: ping.version },
            { name: "This device's key", pass: true, detail: ping.key + " (" + ping.mode + ")" },
          ].concat(health.checks);
          Kit.clear(checks);
          items.forEach(function (c) {
            checks.appendChild(
              h(
                "li",
                { class: "row check", "data-pass": c.pass ? "yes" : "no" },
                h("span", { class: "check-mark", "aria-label": c.pass ? "OK" : "Needs fixing" }, c.pass ? "✓" : "!"),
                h(
                  "div",
                  { class: "row-main" },
                  h("span", { class: "row-title" }, c.name),
                  c.detail ? h("span", { class: "row-sub" }, c.detail) : null
                )
              )
            );
          });
          checks.hidden = false;
        })
        .catch(function (err) {
          Kit.toast(err.kind === "offline" ? "Cannot reach the hub right now." : err.message);
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = "Check the hub";
        });
    }

    var checkBtn = h(
      "button",
      {
        class: "btn",
        type: "button",
        onclick: function () {
          runCheck(checkBtn);
        },
      },
      "Check the hub"
    );

    var input = h("input", {
      class: "field-input",
      id: "new-item",
      type: "text",
      placeholder: "Type a test line",
      "aria-label": "Test line",
      autocomplete: "off",
      enterkeyhint: "done",
    });

    var composer = h(
      "form",
      {
        class: "composer",
        onsubmit: function (e) {
          e.preventDefault();
          var name = input.value.trim();
          if (!name) return;
          hub.put("items", { name: name, added: new Date().toISOString(), source: "app" });
          input.value = "";
          input.focus();
        },
      },
      h("div", { class: "composer-inner" }, input, h("button", { class: "btn btn-primary", type: "submit" }, "Add"))
    );

    main.appendChild(h("div", { class: "figure" }, count, countLabel));
    main.appendChild(h("section", { class: "section" }, h("h2", { class: "section-title" }, "Lines"), list));
    main.appendChild(
      h(
        "section",
        { class: "section" },
        h("h2", { class: "section-title" }, "Hub"),
        h("div", { class: "btn-row" }, checkBtn),
        h("div", { style: "margin-top:12px" }, checks)
      )
    );
    main.appendChild(
      h(
        "section",
        { class: "section" },
        h("h2", { class: "section-title" }, "This device"),
        h(
          "div",
          { class: "btn-row" },
          Kit.confirmButton("Lock this device", "Tap again to lock", function () {
            Kit.lockDevice(hub);
          })
        )
      )
    );
    document.body.appendChild(composer);

    hub.on(paint);
    paint();
  },
});
