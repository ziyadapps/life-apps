# Budget v2: switching over

About 30 minutes. Parts 1 to 4 on the laptop, in the Chrome profile signed in as ziyad.apps1. Part 5 on the iPhone.

Your old app and its sheet are not touched by any of this. They stay as they are, as a record.

---

## 1. Update the hub (5 minutes)

The hub script has one small improvement for Budget, so paste the new copy:

1. Open the **Life apps hub** sheet, then **Extensions**, **Apps Script**.
2. Select everything in the editor, delete it, and paste in all of `hub/Code.gs` from the new zip. Save.
3. **Deploy**, **Manage deployments**, the pencil icon, Version: **New version**, **Deploy**. The address stays the same.
4. Open the hub address in a browser tab. It should now say `"version":"2026-10-28b"`.

## 2. Give Budget its own sheet

In the **Life apps hub** sheet: **Life apps** menu, then **Add an app...**, type `budget`, then OK.

Check: Drive's **Life apps** folder now has a sheet called **Life apps: budget**. It is empty until part 4.

Your iPhone and Laptop keys already work for Budget, because they were made for all apps (`*`).

## 3. Upload the new files to GitHub

1. Unzip `life-apps-budget.zip`. You get a folder called **life-apps**.
2. Open **github.com/ziyadapps/life-apps**, then **Add file**, **Upload files**.
3. Open the unzipped **life-apps** folder, select **everything inside it** (Ctrl+A) and drag it onto the page. GitHub replaces files that already exist and adds the new `budget` folder.
4. Press **Commit changes**, then wait for the green tick under the **Actions** tab (a minute or two).

Check: **ziyadapps.github.io/life-apps/** now lists **Budget** above Hub test. If not, press Ctrl+Shift+R.

## 4. Bring your books in (on the laptop)

Do this in one sitting, and stop logging in the old app once you have copied its backup.

1. Open the **old** budget app. Wait until its status says **in your sheet**, so the backup holds your latest payments.
2. In the old app: **Setup**, scroll to **Backup**, press **Download**. A file called `budget-backup-2026-...txt` lands in Downloads.
3. Open **ziyadapps.github.io/life-apps/budget/** and unlock it with the hub address and your **Laptop** key.
4. It says **Set up your budget**. Press **Bring in my old books**.
5. Under **Or the downloaded backup file**, choose that file. (Pasting the copied text into the box works too.)
6. Press **Check it**.

You now see a table of every envelope, account and reserve, with what the old app shows next to what Budget v2 works out.

- **"Everything matches the old app"**: press **Bring it in**. The Month screen opens, and the status goes from "waiting" to **In your sheet** within half a minute.
- **Any row in red**: do not bring it in. Send me a screenshot of the page.

From this moment, log everything in Budget v2 only.

## 5. Put it on the iPhone

1. In **Safari**, open **ziyadapps.github.io/life-apps/budget/**, then **Share**, **Add to Home Screen**, **Add**.
2. Open **Budget** from the home screen and unlock it with the hub address and your **iPhone** key. Everything comes down from the sheet.
3. Remove the old Budget icon from the home screen (press and hold it, then **Remove App**). This only removes the shortcut; the old sheet stays.

## 6. Review three things once

These came across from the old app as they were. Check that they are what you want:

1. **Plan, then Standard month.** The standard month came from your latest standing plan, the one you set for January 2027 (for example My Allowance 1,200 and Rent 4,000, salary 18,694.67). December and January keep the figures you already planned for them. Adjust the standard month if a normal month looks different.
2. **Jawway** came across as a **Spending** envelope, because it carried its leftover in the old app. If you would rather treat it as a bill (it posts itself on a due day, and any leftover goes to Remaining), open it from **More**, **Envelopes and accounts**, set Kind to **Bill**, and give it a due day.
3. **Rent** has its 13,000 target but no date. Add the date the rent is due in the same place, so the target shows when it is needed.

---

## How it works day to day

- **The big number** on the Month screen is **Remaining**: money not set aside for anything this month.
- **The + button** adds a payment: amount, envelope, and optionally a label. It comes from the envelope's own account unless you pick another. **Money in** is for refunds and income.
- **Bills post themselves** on their due day at the budgeted amount. If the real bill differs, tap the payment and change the amount; the difference settles against Remaining when the month closes. Delete it if a bill did not happen that month, and it will not post again.
- **Move money** (on an envelope, or under More) covers changing an envelope's purpose and moving between accounts, in one form. When the two accounts differ, it reminds you to make the same transfer in your bank apps.
- **Budget for this month only:** open the envelope and change its figure. **Every month from now on:** Plan, then Standard month. Months already opened keep their figures; months planned ahead keep their own plan.

## Payday, on the 25th

The Month screen shows **It's payday** on payday. Tap it, then:

1. **Check accounts.** Type what each bank app shows. For the account your salary lands in (SNB Main), type the balance *without* the salary. A difference becomes one adjustment, in the envelope you choose (Remaining by default). You can skip accounts.
2. **Close the month.** Bills that fell due are posted first. Leftovers in spending envelopes and Rent carry over; leftovers in bills go to Remaining.
3. **Open the new month.** Type the salary. The budget comes from the plan you prepared for that month, or from the standard month. Change anything for this month only.
4. **Transfers.** What to send to each account, grouped by bank. Tick each one as you send it; the ticks show on both devices.

## Optional: log a payment with Siri

The same pattern as Add Test Line, using your **Shortcuts** key:

1. New shortcut, named **Log payment**.
2. **List** action, with your envelope names exactly as they appear in the app, for example `My Allowance`, `Groceries`, `Fuel`, `Family Dining & Extras`.
3. **Choose from List**.
4. **Ask for Input**, type **Number**, prompt `How much?`
5. **Get Contents of URL**: the hub address, Method **POST**, Request Body **JSON**, with fields:

| Type | Key | Value |
|---|---|---|
| Text | key | your Shortcuts key |
| Text | action | `add` |
| Text | app | `budget` |
| Text | table | `payments` |
| Dictionary | row | (below) |

   Inside **row**:

| Type | Key | Value |
|---|---|---|
| Text | env | the **Chosen Item** variable |
| Number | amount | the **Ask for Input** variable |
| Text | source | `siri` |

6. **Show Content**.

The payment is dated the moment the hub receives it and comes from the envelope's own account. Add a label or a note in the app afterwards if you want one.

## If something goes wrong

- **"That is not the old app's backup text"**: copy or download the backup again from the old app's Setup, Backup.
- **"This app already has books"** on the import screen: books were already brought in. Only clear them if you want to start the import again.
- **"Books out by ..."** on the Month screen: something has an envelope but no account. Send me a screenshot.
- **A payment has no envelope**: a Siri payment used a name that is not an envelope. Tap the banner and choose one.
- Anything else: a screenshot, please. Do not fix the sheet by hand.
