# Life apps

Personal home-screen apps that share one Google Apps Script hub.

| Folder | What it is |
|---|---|
| `hub/` | `Code.gs`, the hub script. It lives inside the "Life apps hub" Google Sheet. No secrets in it. |
| `shared/` | Code every app uses: `hub.js` (offline-first sync), `kit.js` (unlock, status, helpers), `ui.css` (the look), `sw-core.js` (opening with no signal). |
| `budget/` | Budget v2: `calc.js` (all the arithmetic), `app.js` (screens), `migrate.js` and `v1-ledger.js` (one-time import from the old app). |
| `household/` | Household lists, shared with family, in English or Arabic. |
| `today/` | Today: payday, allowance, bills this week and open lists on one screen. Reads Budget and Household. |
| `test/` | Hub test, the smallest app, used to prove the hub works. |
| `docs/` | Setup guides. |

Each app folder holds its own `index.html`, `app.js`, `manifest.json`, `sw.js` and icons, so it installs as its own home-screen app.

Nothing personal lives in this repo: no keys, no figures. All data stays in Google Sheets behind keys made from the hub sheet.
