# Bank messages and subscriptions

About 20 minutes: 10 in Budget, 10 on the iPhone. The hub script does not change.

This update also fixes the account editor in Budget, which broke in the Household update.

---

## 1. Upload the files

Unzip `life-apps-sms.zip`, then on **github.com/ziyadapps/life-apps**: **Add file**, **Upload files**, drag everything inside the **life-apps** folder, **Commit changes**. Wait for the green tick, then about 10 minutes.

Open **Budget** twice (close it in between).

## 2. Tell each account its numbers (Budget)

**More**, **Envelopes and accounts**, tap each account, fill **Numbers in bank messages**, **Save account**:

Type the last 4 digits of the account and of each card on it, with spaces between, like `1234 5678`. For a wallet whose purchase messages carry no number (Barq), type its name: `barq`. Wallets with numbers get their name too: `urpay 1111 2222`, `stc 3333 4444`.

Barq's purchase messages carry no number, so its name stands in. If you miss one, the first message from that card asks you which account it is, and remembers.

## 3. The subscriptions card (Budget)

1. **More**, **Envelopes and accounts**, **Add account**: name `Subscriptions card`, bank `Rajhi`, numbers (the card's last 4 digits). **Add account**.
2. Tap the **Subscriptions** envelope, then **Settings**:
   - **Kind**: **Spending** (what is left rolls on, so money set aside for yearly ones builds up).
   - **Kept in**: **Subscriptions card**.
   - **Save envelope**.

Your payday transfer list then shows the move from Rajhi 3rd to the card, as you already do.

The extra riyals you keep on the card stay outside the books. The bank check for this account will show them as a small difference; that is expected.

## 4. The subscriptions list (Budget)

Open the **Subscriptions** envelope, **Subscriptions list**, **Add a subscription** for each one:

| Field | Example |
|---|---|
| Name | Netflix |
| Amount | 45 |
| Day it charges | 28 |
| How often | Every month (or Every year, and the month it renews) |
| Name in the bank message | Optional. How it shows in the SMS, if different (NETFLIX.COM shows as "NETFLIX") |

At the bottom, **Make ... the standard month** sets the envelope's monthly amount to the list's total (yearly ones count as a twelfth).

This month was already paid in one payment on payday, so nothing posts again. From the December month on, each one posts itself on its own day, and its bank message corrects the amount if it changed.

## 5. The card outside the books

A card you do not track in Budget: The first time its message arrives, Budget asks which account it is: choose **Not in the books**. (Or now: **More**, **Bank messages**, **Numbers to ignore**: its last 4 digits, **Save**.)

## 6. The iPhone: send bank messages to the hub

iPhone automations cannot pick a bank as the sender, so they look for a word in the message. Three automations, the same except the word: `SAR`, `SR` and `ر.س`.

1. **Shortcuts** app, **Automation** tab, **+** (or **New Automation**).
2. **Message**.
3. **Message Contains**: `SAR`. Leave **Sender** empty.
4. **Run Immediately** (and turn off **Notify When Run** if you like). **Next**.
5. **New Blank Automation**, add **Get Contents of URL**:
   - URL: the hub address (ends in `/exec`).
   - Tap **Show More**: Method **POST**, Request Body **JSON**:

| Type | Key | Value |
|---|---|---|
| Text | key | the **Shortcuts** key from your note |
| Text | action | `add` |
| Text | app | `budget` |
| Text | table | `sms` |
| Dictionary | row | (below) |

   Inside **row**:

| Type | Key | Value |
|---|---|---|
| Text | text | tap, choose **Shortcut Input**. If it offers **Content** or **Message**, choose that |
| Text | sender | tap, choose **Shortcut Input**, then **Sender**, if it offers it. If not, leave this line out |

6. **Done**.

Do it again with `SR`, then with `ر.س`. A message caught twice is read once.

**Test:** ask someone to text you `test SAR 1`. Open Budget: **Bank messages** shows it under "could not be read". **Dismiss** it. If it shows an empty message, the **text** value needs **Content** instead of **Shortcut Input** (a screenshot helps).

Messages from before this setup are not read. If your phone was off when one arrived, add that payment by hand.

---

## How it works

Budget reads new messages each time it opens.

| Message | What happens |
|---|---|
| A purchase on a card whose account holds one envelope (UrPay, STC, SAB, ANB, Barq, Alinma) | Logged in that envelope |
| A purchase on Rajhi Main (several envelopes) | Asks once: Dining, Household Extra or Wife allowance. Tick "Next time..." and that merchant goes there by itself |
| Barq or Alinma (her cards) | If she logged the trip in Household with the same amount, that trip goes into Budget (no review needed: the bank confirmed it). If not, it waits up to 12 hours for her trip, then logs itself |
| Something you already logged by hand | Matched, not logged twice |
| Water, Electricity bills | The bill that posted itself takes the real amount |
| A subscription on the list | Corrects its amount; if the price changed, **Update the list** |
| Payday transfers between your accounts, wallet top-ups | Nothing to log |
| A transfer between your accounts on another day | Asks: **Log as a move** (filled in) or **Nothing to log** |
| A transfer to someone  | Asks for the envelope once, then remembers the number |
| Salary, logins, new beneficiary | Ignored |
| Anything it cannot read | Shown with the text, to add by hand |

Everything logged by a message shows under **Recent** in **Bank messages**, with **Undo**. A banner on the Month screen tells you when something needs you.
