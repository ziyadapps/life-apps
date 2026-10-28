# Phase 0: set up the hub

About 40 minutes. Parts 1 to 5 on the laptop, part 6 onward on the iPhone.

**Before you start:** do the laptop parts in a Chrome window signed in **only** as ziyad.apps1@gmail.com. Use a separate Chrome profile for it (click your profile picture at the top right of Chrome, then **Add**). If several Google accounts are signed in at once, Google sheets and scripts open under the wrong one and fail with odd errors.

You will collect three things along the way. Open a new note on the iPhone called **Life apps keys**, lock it, and paste each one in as you get it:

- the hub address (ends in `/exec`)
- three keys: iPhone, Laptop, Shortcuts

---

## 1. Make the hub sheet

1. Go to **sheets.google.com** and make a blank spreadsheet.
2. Name it **Life apps hub**.

## 2. Put the hub script in it

1. In the sheet: **Extensions**, then **Apps Script**. A code editor opens in a new tab.
2. At the top left, click **Untitled project** and rename it **Life apps hub**.
3. Delete everything in the editor and paste in all of `hub/Code.gs` from the zip. Press the save icon.
4. Click the gear icon on the left (**Project Settings**). Under **Time zone**, choose **(GMT+03:00) Riyadh**. Go back to the editor with the `< >` icon.
5. In the toolbar dropdown, choose **setUp** and press **Run**.
6. Google asks for permission and warns the app is not verified, because you wrote it a minute ago. Click **Review permissions**, choose ziyad.apps1, then **Advanced**, **Go to Life apps hub (unsafe)**, **Allow**. You are letting your own script use your own sheets and Drive.
7. Wait for **Execution completed** at the bottom.

Check: go back to the sheet tab and **reload the page**. You should see tabs **Apps, Keys, Inbox, Log**, and a new **Life apps** menu next to Help. In Google Drive there are now two folders: **Life apps** (holding a sheet called "Life apps: test") and **Life apps backups**.

## 3. Make your three keys

In the sheet: **Life apps** menu, then **New key...** If Google asks for permission again, allow it and choose New key once more.

Make these three:

| Name | Apps | What may it do? |
|---|---|---|
| iPhone | `*` | **Yes** (full) |
| Laptop | `*` | **Yes** (full) |
| Shortcuts | `*` | **No** (add only) |

After each one, a box shows the key. **Copy it into your note straight away.** It is shown once only; the Keys tab keeps just a fingerprint of it. If you lose one, make a new key and turn the old one off (see "Turning a key off" below).

## 4. Publish the hub

1. Back in the Apps Script tab: **Deploy**, then **New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Description: `Phase 0`. Execute as: **Me**. Who has access: **Anyone**.
4. Press **Deploy** and copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`. Put it in your note.

Check: paste that address into a new browser tab. You should see:
`{"ok":true,"hub":"Life apps","version":"2026-10-28a"}`

**About "Anyone":** it only means Google does not ask for a login at the door. Every request still needs one of your keys, and without one the hub answers "Unknown key." The key is the lock.

## 5. Put the apps on GitHub

1. Unzip `life-apps-phase0.zip` on the laptop. You get a folder called **life-apps**.
2. Open **github.com/ziyadapps/life-apps**. (No repo yet? Click **New**, name it `life-apps`, choose **Public**, tick **Add a README file**, **Create repository**.)
3. Click **Add file**, then **Upload files**.
4. Open the unzipped **life-apps** folder and drag **everything inside it** onto the page: the folders `docs`, `hub`, `shared`, `test`, and the files `index.html` and `README.md`. Drag the folders themselves; GitHub keeps what is inside them. (There is also a hidden file `.nojekyll`. If you can see it, include it; if not, it does no harm to leave it.)
5. At the bottom, press **Commit changes**.
6. Go to the repo's **Settings**, then **Pages** on the left. Under **Build and deployment**: Source **Deploy from a branch**, Branch **main**, folder **/ (root)**. Press **Save**.
7. Wait one or two minutes, then open **https://ziyadapps.github.io/life-apps/**. You should see a page called Life apps listing **Hub test**.

The repo is public, and that is fine: it holds no keys and no figures. Your data stays in your sheets.

## 6. Try it on the laptop

1. Open **https://ziyadapps.github.io/life-apps/test/**
2. Paste the hub address and the **Laptop** key. Press **Unlock**.
3. Type a line at the bottom and press **Add**. The top right should say **In your sheet** within a couple of seconds.
4. Open the **Life apps: test** sheet in Drive. A tab called **items** has appeared with your line in it.
5. In the app, press **Check the hub**. Every line should have a tick.

## 7. Put it on the iPhone

1. Open **Safari** (it has to be Safari) and go to **https://ziyadapps.github.io/life-apps/test/**
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open **Hub test** from the home screen, not from Safari. Paste the hub address and the **iPhone** key from your note, then **Unlock**.
4. You should see the line you added on the laptop. Add one from the phone, then tap the status at the top right on the laptop: the phone's line appears there too.

Each home-screen app keeps its own storage on the iPhone, so every new app asks to be unlocked once. On the laptop, one unlock covers all apps.

## 8. The offline test

1. Turn on **Airplane Mode**.
2. Close Hub test completely (swipe it away), then open it from the home screen. It should open normally, with your lines.
3. Add a line. The status says **Offline, 1 waiting** and the line has a small dot.
4. Close the app again. Turn Airplane Mode off.
5. Open the app. Within a few seconds the status says **In your sheet**, and the line is in the sheet.

## 9. The Siri shortcut test

On the iPhone, open the **Shortcuts** app and tap **+**.

1. Name the shortcut **Add test line** (tap the name at the top).
2. Add the action **Ask for Input**. Type: Text. Prompt: `What should I add?`
3. Add the action **Get Contents of URL**.
   - URL: paste the hub address.
   - Tap the arrow to show more. Method: **POST**. Request Body: **JSON**.
   - Add these fields with **Add new field**:

| Type | Key | Value |
|---|---|---|
| Text | key | the **Shortcuts** key from your note |
| Text | action | `add` |
| Text | app | `test` |
| Text | table | `items` |
| Dictionary | row | (fill in below) |

   - Inside **row**, add two fields:

| Type | Key | Value |
|---|---|---|
| Text | name | tap the field and choose the **Provided Input** variable |
| Text | source | `shortcut` |

4. Add the action **Show Result** (it shows the hub's answer).
5. Tap **Done**.

Now say **"Hey Siri, Add test line"**, answer with any words, and you should see a result starting with `{"ok":true`. Open Hub test: the line is there, marked "from a shortcut".

The Shortcuts key can only add rows. Even if someone copied it out of the shortcut, they could not read anything with it.

## The gate

Phase 0 is done when all of these are true. Send me a message when they are, or tell me which one is not.

- [ ] The hub address shows `"version":"2026-10-28a"` in a browser
- [ ] Check the hub shows every tick
- [ ] A line added on the laptop shows on the iPhone, and the other way round
- [ ] The app opens in Airplane Mode, and a line added offline reaches the sheet afterwards
- [ ] The Siri shortcut adds a line that shows in the app
- [ ] Tomorrow morning, **Life apps backups** in Drive has `test` and `hub` copies dated today

---

## Day to day

- **Status at the top right.** "In your sheet" means everything has gone up. "2 waiting" or "Offline" means changes are safe on the device and will go up by themselves. Tap it to sync now.
- **Turning a key off** (a lost phone, say): in the hub sheet's **Keys** tab, type `no` in that key's **active** cell. It stops working at once. Make a new key for the new device.
- **Lock this device** in the app removes the key and the app's copy from that device. The sheet is untouched.
- **Editing the sheet by hand** is fine for values. Do not rename tabs or column names, and never change an id. To delete a row, type the date in its `del` cell rather than removing the row, so your devices hear about it.

## When I send you a new hub script

1. Paste the new `Code.gs` over the old one and save.
2. **Deploy**, **Manage deployments**, the pencil icon, Version: **New version**, **Deploy**. The address stays the same.
3. Open the hub address in a browser and check the version number changed.

## When I send you new app files

Upload them to the repo the same way (Add file, Upload files; GitHub replaces files with the same name). Apps keep a copy of themselves for offline use, so the update shows the **second** time you open the app.

## If something goes wrong

- **"Unknown key."** The key was mistyped or belongs to another hub. Paste it again from your note.
- **"This key has been turned off."** Its active cell in the Keys tab says no.
- **"The hub answered with something that is not JSON."** The address is wrong, or the deployment's access is not **Anyone**. Check part 4.
- **"Cannot reach the hub."** No signal, or Google is slow. Your changes are kept and go up later.
- **"Sync problem"** at the top: tap it to see the reason.
- **The script runs forever when started from the editor.** A box may be waiting in the **sheet** tab. Switch to it and click OK.
- Anything else: send me a screenshot. Do not fix the sheet by hand if it looks scrambled; Version history (File, Version history) and the nightly copies can restore it.
