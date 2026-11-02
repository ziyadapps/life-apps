# Watchlist

About 20 minutes: the hub script, your Emby login in the hub, two free keys, then the app.

---

## 1. Upload the files

Unzip `life-apps-watchlist.zip`, then on **github.com/ziyadapps/life-apps**: **Add file**, **Upload files**, drag everything inside the **life-apps** folder, **Commit changes**. Wait for the green tick, then about 10 minutes. Open **Today** twice (close it in between).

## 2. Update the hub script

The hub now talks to Emby for the Watchlist, so it needs the new script and one new permission.

1. **Life apps hub** sheet, **Extensions**, **Apps Script**.
2. Select everything in **Code.gs**, delete it, paste the new `hub/Code.gs`. **Save**.
3. **Deploy**, **Manage deployments**, the pencil, **Version**: **New version**, **Deploy**.
4. Check: open the hub address in a browser. It should say `"version":"2026-11-02a"`.
5. Reload the hub sheet.

## 3. The Watchlist's sheet and your Emby login

1. **Life apps** menu, **Add an app...**, type `watchlist`, OK.
2. **Life apps** menu, **Emby login for Watchlist...**. Google asks for permission the first time, because the hub now connects to a server outside Google: **Continue**, choose your account, **Advanced**, **Go to Life apps hub**, **Allow**. Then run **Emby login for Watchlist...** again.
3. Type the server address from your provider (like `https://050.example.mx`; add `:port` only if it is not 443), the username, the password.
4. It should say **Signed in to ...**.

The login is kept in the hub script's own settings. It is not in any sheet, not on your phone, and not in the app's code. To change it, run the menu item again.

## 4. Two free keys

**TMDB** (titles, seasons, where to watch):

1. Make an account at **themoviedb.org** and confirm the email.
2. Your picture, **Settings**, **API**, **Create** (or **Request an API key**): **Developer**, accept the terms, type **Personal**, and describe it as a personal watchlist app (any website address will do, like your GitHub page).
3. Copy the **API Read Access Token** (the long one).

**OMDb** (IMDb, Rotten Tomatoes and Metacritic scores): **omdbapi.com**, **API Key**, **FREE**, your email. The key comes by email; click the link in it to turn it on.

## 5. The app

1. In Safari open `ziyadapps.github.io/life-apps/watchlist/`, **Share**, **Add to Home Screen**, open **Watchlist**, unlock with your **iPhone** key.
2. **Settings**: paste both keys, **Save keys**.
3. **Your streaming services**: the ones in your Budget subscriptions are ticked already. Tick any others, **Save services**.
4. **Check Emby**: it should say **Connected to ...**.

---

## How it works

### Finding things

- **Search**: any film, series or anime.
- **Discover**: what is new on your Emby, what is popular on your services, trending this week, popular anime, top rated films.

### A title

- **Ratings** from TMDB, IMDb, Rotten Tomatoes, Metacritic, and MyAnimeList for anime.
- **Where to watch in Saudi Arabia**: the services streaming it (yours marked and first), where to rent or buy, and whether it is on your Emby (with how many seasons and episodes).
- For series: the latest episode and the next one with its date.
- **Your list**: Watching, To watch or Watched; for series, the season and episode you are up to (**Watched S2 E3** moves you on one); your rating out of 10 and a note.

### Your list

Three tabs: Watching, To watch, Watched. **New for you** at the top lists new episodes of what you are watching, episodes coming this week, and anything you want that has just arrived on Emby. Today shows the same.

Each title on your list is refreshed about once a day (seasons, episodes, where to watch) and checked against Emby every few hours, so a show that moves to another service or lands on Emby updates by itself. A series that has ended moves to Watched when you reach its last episode.

### Where the data comes from

TMDB and its streaming data (JustWatch) cover services in Saudi Arabia. They do not know your Emby; the hub asks it. Data can lag a day or two behind the services themselves.
