# Household v2

About 15 minutes, plus her phone. The hub script does not change: new tables (products, purchases, trips, envelopes, barcodes...) make themselves the first time they are used.

---

## 1. Upload the files

Unzip `life-apps-household-v2.zip`, then on **github.com/ziyadapps/life-apps**: **Add file**, **Upload files**, drag everything inside the **life-apps** folder, **Commit changes**. Wait for the green tick under **Actions**, then about 10 minutes more (GitHub lets phones keep the old files that long).

## 2. Open each app twice

On your iPhone, open **Budget**, **Household** and **Today** from the home screen, close each one, then open it again. The first open fetches the new version; the second runs it.

## 3. Share the two envelopes (Budget)

In **Budget**: **More**, **Envelopes and accounts**, tap **Groceries**:

| Field | Set to |
|---|---|
| Show in Household | **Yes** |
| Arabic name for Household | `المقاضي` (or what she calls it) |

**Save envelope**. Do the same for **Baby Allowance** (Arabic name as you like, e.g. `مصروف حصة`).

Only envelopes set to **Yes** reach Household: their name, what is left, and what was spent this month. Nothing else in your budget is shared. Any envelope you set to Yes later shows up by itself.

The figures update whenever Budget is open on your phone.

## 4. Which envelope each list pays from (Household)

In **Household**: **Lists and settings** at the bottom.

- **Groceries** already shows **Groceries** (same name, so it picks itself).
- Set **Pharmacy** to **Baby Allowance**.

This is only the starting choice: she can pick the other envelope when she finishes a trip.

## 5. Her key and her phone

If you have not made her key yet: in the **Life apps hub** sheet, **Life apps** menu, **New key...**

| Question | Answer |
|---|---|
| Name | her name, as you want it to appear ("from ...") |
| Apps | `household` |
| What may it do? | **Yes** (full) |

Her setup link is these three parts joined with no spaces:

```
https://ziyadapps.github.io/life-apps/household/#hub=HUB_ADDRESS&key=HER_KEY
```

On her phone:

1. Open the link in **Safari**.
2. **Before** pressing anything, **Share**, **Add to Home Screen**, **Add**.
3. Open **البيت** from the home screen and press **فتح**.

It opens in Arabic if her phone is in Arabic. Her key never opens Budget: she sees the two envelopes' figures in Household and nothing else.

---

## How it works

### Envelopes

The top of the list shows each shared envelope: what is left, and how much a day that leaves until payday. Tap one for what was spent this month, what is waiting for Budget, and the recent purchases.

What she spends counts against the figure straight away, before it reaches Budget, so she never sees money that is already spent.

If payday has passed and the new month is not opened in Budget yet, it says so.

### Adding

1. **+ Add to ...** at the bottom opens the search with the keyboard up.
2. The catalogue already has about 260 everyday items in English and Arabic (fruit and veg, dairy, baby, pharmacy, cleaning...). Type a few letters of the item, or a brand: `pampers` or `بامبرز` finds Diapers.
3. Not there? **Add "..."** makes it, in a guessed section.
4. Once added, it turns into **− 1 +** and a unit, right there.
5. Before you type, **Running out** shows what is about to finish (see below), with **Add all**.

### Shopping

1. **Start shopping**, pick the store. The envelope's balance shows at the top, and turns red if the basket goes over it.
2. Tap each item as you pick it up: choose the **brand** and **size** (remembered from last time), type the **price**, tick **On offer** if it is a promotion, **Got it**.
3. **Not here** if the store does not have it: it stays on the list, marked "not at Panda".
4. **Finish shopping**: the receipt total, and which envelope paid. **Save trip**.

You can also tick items on the list as usual and add the price afterwards (**Add price**).

### "I paid"

For a quick purchase without a list: amount, envelope, store (optional), what it was. **Save**.

### Into Budget

- **Your** trips and "I paid" go into Budget by themselves the next time Budget opens.
- **Hers** wait under **Budget > Shopping trips** (and a banner on the Month screen). Check the amount, envelope and date, then **Post to Budget** or **Leave out**. If a payment with the same amount is already in that envelope within 3 days, it warns you first.
- Both have **Undo**. An undone trip waits for review, even one of yours.

### Prices

- Each item shows its last price and store, and **"usually 11% less at Danube"** when another store is cheaper for the same brand and size.
- **Prices** (bottom of the list), then tap an item: **Store by store** compares the same brand and size only. Across brands it compares per kg, litre or piece. Offer prices are shown but never decide which store is cheaper.

### Running out

From what you bought and how much (an 800 g tin counts twice a 400 g one), Household works out how long things last. After two purchases it can say "runs out in 2 days", and the item page shows "Lasts about 9 days".

### Barcodes

**Scan** (on the Add screen and while shopping) opens the camera. The first time a barcode is seen, pick the item, brand and size once. After that, scanning adds it (or, while shopping, opens its price). If the camera does not start, type the number under the barcode.

This is the part to try and decide on: if it is slower than typing for you, ignore the button.

### Lists and settings

Lists (names, hide, envelope), sections in the order you walk your store, stores (Farm is added), language, lock.

---

## For her (paste into WhatsApp if you like)

```
هذا رابط تطبيق البيت 🛒
١. افتحي الرابط في سفاري
٢. قبل أي شي اضغطي زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"
٣. افتحي البيت من الشاشة الرئيسية واضغطي فتح

• فوق تشوفين كم باقي في المقاضي ومصروف حصة، وكم باليوم لين الراتب
• زر "أضف" تحت: اكتبي الغرض أو الماركة، وكل شي موجود تقريبا
• في المحل: "ابدأ التسوق" واختاري المحل، اضغطي على كل غرض واختاري الماركة والحجم واكتبي السعر
• إذا الغرض مو موجود اضغطي "غير موجود" ويبقى في القائمة
• في الأخير اكتبي إجمالي الفاتورة واختاري من أي ظرف دفعتي
• شراء سريع بدون قائمة: زر "دفعت"
```

Delete the message once her phone is set up, since it holds her key.

---

## If something goes wrong

- **Still the old look**: wait 10 minutes after the upload, then close and open the app twice.
- **No envelopes at the top**: open Budget once (it shares them), then tap the status at the top of Household to sync.
- **An item is in the wrong section**: tap it, change **Category**, Save.
- **The camera does not open**: Settings app, Safari, Camera, Allow. Or type the barcode number.
- Anything else: a screenshot, please.
