# Phase 2: Household lists and Today

About 20 minutes on the laptop, then a few minutes per phone. The hub script does not change.

---

## 1. Give the lists their own sheet

In the **Life apps hub** sheet: **Life apps** menu, **Add an app...**, type `household`, OK.

## 2. Name the keys after people

Items show who added them, using the key's name. Your keys are named after devices, so in the hub sheet's **Keys** tab:

- In the **name** column, change `iPhone` to `Ziyad` and `Laptop` to `Ziyad`.
- Only change the name cells. Never touch the **hash** column.

Your phones pick up the new name the next time each app opens.

## 3. Make her key

**Life apps** menu, **New key...**:

| Question | Answer |
|---|---|
| Name | her name, as you want it to appear ("from ...") |
| Apps | `household` |
| What may it do? | **Yes** (full) |

Copy the key into your note. Her key opens the household lists and nothing else: not Budget, not Today.

## 4. Upload the files

Unzip `life-apps-phase2.zip`, then on **github.com/ziyadapps/life-apps**: **Add file**, **Upload files**, drag everything inside the **life-apps** folder, **Commit changes**. Wait for the green tick under **Actions**.

Check: **ziyadapps.github.io/life-apps/** now lists **Today** and **Household / البيت** above Budget.

## 5. Your iPhone

In Safari, for each of these two addresses: open it, **Share**, **Add to Home Screen**, then open it from the home screen and unlock with the hub address and your **iPhone** key.

- `ziyadapps.github.io/life-apps/household/`
- `ziyadapps.github.io/life-apps/today/`

The first time Household opens, it makes three lists: **Groceries / المقاضي**, **Pharmacy / الصيدلية**, **Home / البيت**. Rename, add or hide lists under **Lists and settings** at the bottom of the list.

Open Budget twice afterwards too, so it picks up this update.

## 6. Her phone

Make her setup link by joining three parts with no spaces:

```
https://ziyadapps.github.io/life-apps/household/#hub=HUB_ADDRESS&key=HER_KEY
```

Replace `HUB_ADDRESS` with the hub address (ends in `/exec`) and `HER_KEY` with her key.

The simplest way is to set it up on her phone yourself:

1. Open the link in **Safari** on her phone.
2. **Before** pressing anything, tap **Share**, **Add to Home Screen**, **Add**.
3. Open **البيت** from the home screen. The two boxes are usually filled already; if they are empty, paste the address and key from the link.
4. Press **فتح**.

It opens in Arabic if her phone is set to Arabic. She can switch between **English** and **العربية** under **القوائم والإعدادات** (Lists and settings).

If you would rather send it to her, here is a message to paste into WhatsApp under the link:

```
هذا رابط قائمة البيت المشتركة 🛒
١. افتحي الرابط في سفاري
٢. قبل أي شي اضغطي زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"
٣. افتحي تطبيق البيت من الشاشة الرئيسية واضغطي فتح
أي شي تضيفينه يوصلني على طول، وأي شي أضيفه يوصلك
```

Delete the message once her phone is set up, since it holds her key.

## 7. Optional: "Hey Siri, add to the list"

The same pattern as Add Test Line, with your **Shortcuts** key:

1. New shortcut named **Add to list**.
2. **Ask for Input**, Text, prompt `What should I add?`
3. **Get Contents of URL**: the hub address, Method **POST**, Request Body **JSON**:

| Type | Key | Value |
|---|---|---|
| Text | key | your Shortcuts key |
| Text | action | `add` |
| Text | app | `household` |
| Text | table | `items` |
| Dictionary | row | (below) |

   Inside **row**: `list` = `groceries`, `name` = the **Ask for Input** variable, `by` = `Siri`. Household gives it a section and a unit the next time it opens.

4. **Show Content**.

---

## How the lists work

See `setup-household-v2.md`: Household was rebuilt with a catalogue, brands and sizes, prices per store, envelope balances from Budget, and trips into Budget.

## Today

One screen with:

- the day and how many days to payday, and a payday reminder on the day itself
- your allowance left today
- bills due in the next 7 days that have not been paid, with the total
- funds with a date coming up, and planned money for this month
- what is open on each list

Tap a card to open the app it comes from (in Safari on the iPhone, since each home-screen app is separate).

## If something goes wrong

- **Her phone says "هذا المفتاح لا يسمح باستخدام البيت"** (key not allowed): her key's apps cell must say `household`. Check the Keys tab.
- **Items say "from iPhone"**: rename the key in the Keys tab (part 2), then close and reopen the app.
- **The lists do not appear on a new phone**: tap the status at the top to sync; lists appear once the phone has heard from the sheet.
- Anything else: a screenshot, please.
