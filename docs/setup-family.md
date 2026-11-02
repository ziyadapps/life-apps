# Family (العائلة)

About 25 minutes: the hub script first, then the app on your laptop, then each family member's phone.

This zip also carries the bank messages update. If you have not done `setup-sms.md` yet, follow it too: the uploads below cover both.

---

## 1. Upload the files

Unzip `life-apps-family.zip`, then on **github.com/ziyadapps/life-apps**: **Add file**, **Upload files**, drag everything inside the **life-apps** folder, **Commit changes**. Wait for the green tick, then about 10 minutes.

Nothing about your family is in these files. The names live only in your Google Sheet; you bring them in from inside the app (part 4).

## 2. Update the hub script

Family members get a new kind of key: it reads the family app and sends changes for you to approve, nothing else. The hub needs to know it.

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
2. **المزيد**, **البيانات**, choose your latest backup file from the old app (the `.json` from its بيانات tab), **إدخال**.
3. It opens **الفحص**. Every level from 3 to 9 must show the poster's number in both of the first two columns (16, 34, 57, 237, 831, 268, 122). Three people you added by hand show only in the **الكل** column (levels 6 and 9).
4. **المزيد**, **الإعدادات**, **اسمك عند العائلة**: type the name the family should see, **احفظ**. Their buttons then say "أرسل لـ" and that name. Until you do, they say "صاحب الشجرة".

Your old offline file is no longer needed, but keep it somewhere as a record.

## 5. Your iPhone

In Safari open `ziyadapps.github.io/life-apps/family/`, **Share**, **Add to Home Screen**, open it from the home screen and unlock with your **iPhone** key. The tree arrives with the first sync.

## 6. Each family member

For each person (your father, your mother, each brother):

1. **Life apps** menu, **New family member key...**, type their name as it should appear next to what they send (أبوي، أمي، سلمان...). Copy the key.
2. Their link is these three parts joined with no spaces:

```
https://ziyadapps.github.io/life-apps/family/#hub=HUB_ADDRESS&key=THEIR_KEY
```

3. Easiest is to set it up on their phone yourself: open the link in **Safari**, **before** pressing anything tap **Share**, **Add to Home Screen**, **Add**. Open **العائلة** from the home screen, press **فتح**.
4. On first open it asks **من أنت في الشجرة؟**: search their name and pick it. From then on the tree opens on them, and every name says what that person is to them.
5. If the text is small for your parents: **المزيد**, **الإعدادات**, **حجم الخط**, **كبير**.

A family key opens the family app only, never Budget or the others. To stop a key, type **no** in its **active** cell on the Keys tab.

Message to send with the link, if you send it instead:

```
هذا رابط شجرة العائلة 🌳
١. افتحه في سفاري
٢. قبل أي شي اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"
٣. افتح العائلة من الشاشة الرئيسية واضغط فتح، ثم اختر اسمك

تشوف الشجرة من عندك، وتبحث عن أي أحد وتعرف وش يقرب لك. وإذا عندك معلومة أو تصحيح اكتبه ويوصلني
```

Delete the message once their phone is set up, since it holds their key.

---

## How it works

Four tabs at the bottom: **الشجرة**, **بحث**, **وش يقرب لي**, **المزيد**.

### The tree

- **الشجرة** opens on you: your grandfather and father above, your brothers beside you (scroll sideways when there are many), your children below. Tap any card and the tree moves to that person, so you walk it up and down.
- Under the cards: the full name chain (**انسخ النسب** copies it), what that person is to you and where your lines meet, then born, died, lives in, mother, wives, and what people know about him (**سوالف ومعلومات عنه**).
- **فرعه كامل** draws that person's whole branch on its side: him on the right, each generation a column to the left. **2 / 3 / 4 أجيال** and **+ / −** for size. It opens scrolled to you if you are in it.
- **إظهار البنات** at the top shows women's names; until then they show as **بنت**, and search and **ساعدنا** leave them out. It hides again next time the app opens.
- Wives from another family are just a name and a family (نورة بنت صالح، الصالح). A wife from inside the family is linked to her own place in the tree.

### Everyone

- **بحث**: the name, then the father, then the grandfather (`محمد عبدالله`). It starts at the person's own name, so the shared grandfathers do not flood the results. The family name at the end is fine.
- **وش يقرب لي**: any two people, what each is to the other, in Najdi (ولد عمك، عم أبوك، زوجة أبوك...), and the grandfather where they meet.
- **ساعدنا نربط الأسماء** (in **المزيد**): one name from the poster with no father yet, the names beside it on the poster, and the likely fathers one level up. Pick one, **أبوه غيرهم**, or **ما أعرفه** to skip. This is how your father's memory fills in the poster.
- **جديد في الشجرة**: births, additions and new stories from the last 90 days.

### Family members

Everything they change goes to you: a correction, a kunya, a missing son or daughter, a wife, a story, a father in ساعدنا. Nothing changes until you approve it. **اللي أرسلته** shows them what happened to each, with your reply.

### You

- **تعديلات العائلة**: each one shows what changes, from what to what, and their note. **اعتمد** applies it; **لا تعتمد** with an optional reply. The **المزيد** tab shows how many are waiting.
- You edit directly: **عدّل**, **أضف ولد**, **أضف بنت**, **زوجاته**, stories, and fathers in ساعدنا.
- **الفحص**: the counts against the poster, and every link that cannot be right. It lists only problems; today there are none.
- **البيانات**: the counts, and **نزّل النسخة**, a backup file in the same shape as the old app.

Still to come, when you want them: a whole-tree ring view, and the printed book for your father.

---

## If something goes wrong

- **A family member sees "هذا مفتاح للاختصارات فقط"**: the hub script is still the old one (part 2), or their key was made with **New key...** instead of **New family member key...**.
- **The check shows a level in red**: something did not come in. Send a screenshot before going further.
- Anything else: a screenshot, please.
