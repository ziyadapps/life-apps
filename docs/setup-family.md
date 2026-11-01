# Family (العائلة)

About 25 minutes: the hub script first, then the app on your laptop, then each family member's phone.

This zip also carries the bank messages update. If you have not done `setup-sms.md` yet, upload this zip instead and follow both guides.

---

## 1. Upload the files

Unzip `life-apps-family.zip`, then on **github.com/ziyadapps/life-apps**: **Add file**, **Upload files**, drag everything inside the **life-apps** folder, **Commit changes**. Wait for the green tick, then about 10 minutes.

Nothing about your family is in these files. The names live only in your Google Sheet; you bring them in from inside the app (part 4).

## 2. Update the hub script

Family members get a new kind of key: it reads the family app and sends suggestions, nothing else. The hub needs to know it.

1. Open the **Life apps hub** sheet, **Extensions**, **Apps Script**.
2. Select everything in **Code.gs**, delete it, paste the new `hub/Code.gs` from the zip. **Save**.
3. **Deploy**, **Manage deployments**, the pencil icon, **Version**: **New version**, **Deploy**.
4. Check: open the hub address in a browser. It should say `"version":"2026-11-01a"`.
5. Reload the hub sheet. The **Life apps** menu now has **New family member key...**

## 3. Give the family its own sheet

**Life apps** menu, **Add an app...**, type `family`, OK.

It makes a Google Sheet called **Life apps: family** in your Drive. Like the other apps it is backed up every night, and you can download it as Excel from **File**, **Download**.

## 4. Bring in your tree (laptop)

The laptop is easiest, since the backup file is there.

1. Open `ziyadapps.github.io/life-apps/family/` and unlock with your **Laptop** key.
2. **البيانات**, choose your latest backup file from the old app (the `.json` from its بيانات tab), **إدخال**.
3. It opens **الفحص**. Every level from 3 to 9 must show the poster's number in both of the first two columns (16, 34, 57, 237, 831, 268, 122). Three people you added by hand show only in the **الكل** column (levels 6 and 9).

Your old offline file is no longer needed, but keep it somewhere as a record.

## 5. Your iPhone

In Safari open `ziyadapps.github.io/life-apps/family/`, **Share**, **Add to Home Screen**, open it from the home screen and unlock with your **iPhone** key. The tree arrives with the first sync.

## 6. Each family member

For each person (your father, your mother, each brother):

1. **Life apps** menu, **New family member key...**, type their name as it should appear next to their suggestions (أبوي، أمي، سلمان...). Copy the key.
2. Their link is these three parts joined with no spaces:

```
https://ziyadapps.github.io/life-apps/family/#hub=HUB_ADDRESS&key=THEIR_KEY
```

3. Easiest is to set it up on their phone yourself: open the link in **Safari**, **before** pressing anything tap **Share**, **Add to Home Screen**, **Add**. Open **العائلة** from the home screen, press **فتح**.
4. On first open it asks **من أنت في الشجرة؟**: search their name and pick it. From then on every page says how that person is related to them.

A family key opens the family app only, never Budget or the others. To stop a key, type **no** in its **active** cell on the Keys tab.

Message to send with the link, if you send it instead:

```
هذا رابط شجرة العائلة 🌳
١. افتحه في سفاري
٢. قبل أي شي اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"
٣. افتح العائلة من الشاشة الرئيسية واضغط فتح، ثم اختر اسمك

تقدر تبحث عن أي شخص وتشوف صلته فيك، وإذا عندك معلومة أو تصحيح اكتبه في صفحته ويوصلني
```

Delete the message once their phone is set up, since it holds their key.

---

## How it works

### Everyone

- **Search** from the home screen: the name, then the father, then the grandfather (`محمد عبدالله`). It starts at the person's own name, so the family's shared grandfathers do not flood the results. The family name at the end is fine.
- **A person's page**: the full name chain (tap it for all of it), how they are related to you and where your lines meet, father, mother, wives, brothers and sisters listed separately, sons and daughters, and **ما يُروى عنه**: what people know about them.
- **الشجرة**: opens branch by branch from the top, with how many descendants each branch has. **إلى فرعي** opens the path straight to you.
- **صلة القرابة**: any two people, how each is related to the other, the shared grandfather, and the two lines down from him.

### Family members (suggest)

Everything they change is a suggestion: a correction, a kunya, a missing son or daughter, a wife, a story. It reaches you, and nothing changes until you accept it. **اقتراحاتي** shows them what happened to each, with your reply.

### You (owner)

- **الاقتراحات**: each suggestion shows what changes, from what to what, and their note ("أبوي يقول..."). **قبول** applies it; **رفض** with an optional reply.
- You edit directly: **تعديل**, **أضف ابنا**, **أضف بنتا**, a wife (from the tree or someone new from another family), stories.
- **الربط**: by level, the names on the poster with no father yet. Tap a name for the men one level up, nearest on the poster first (a hint only), or search for anyone else.
- **الفحص**: the counts against the poster, and every link that cannot be right (a printed level that is not one below the father's, a father recorded as a woman, a loop). It lists only problems; today there are none.
- **البيانات**: the counts, and **تنزيل النسخة**, a backup file in the same shape as the old app.

### What changed from the old app

- One copy for everyone, in your sheet, instead of a file on the laptop.
- No giant chart to pan around (that was the lag). The tree opens one branch at a time, so it stays fast with all 1,642 people.
- Brothers and sisters are separate lists.
- A mother can be recorded on a person, so أمك shows correctly.
- Stories have their own entries, with who told them and when.

Still to come, when you want them: a whole-tree ring view, and the printed book for your father.

---

## If something goes wrong

- **A family member sees "هذا مفتاح للاختصارات فقط"**: the hub script is still the old one (part 2), or their key was made with **New key...** instead of **New family member key...**.
- **The check shows a level in red**: something did not come in. Send a screenshot before going further.
- Anything else: a screenshot, please.
