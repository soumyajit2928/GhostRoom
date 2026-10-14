# Ghost Room

A private, anonymous chat room. Static site (vanilla HTML/CSS/JS) + Firebase Realtime Database. Hostable on GitHub Pages.

## How it works
- **Create a room** → you get a link like `…/#room=abc123xyz`. Share it; anyone with the link can join.
- **Temporary identity**: each tab gets a random name (`Ghost-4F2A`) and a session-only anonymous sign-in. Close the tab and it's gone.
- **Host controls**: the creator can **End session**, which deletes the room and every message for everyone. Only the host's account can do this (enforced by the database rules).
- **Images** are compressed in the browser (JPEG, max 800px) and stored inside the message. Firebase Storage is not used because it now requires the paid Blaze plan.

## Privacy model (read this)
Rooms are **unlisted, not end-to-end encrypted**. Anyone with the link can read the room, and the owner of the Firebase project can see stored data. Don't share secrets you wouldn't share on an unlisted page. If the host never ends a session, the data stays until you delete `rooms/<id>` in the Firebase console.

## Setup (about 5 minutes)
1. Create a project at console.firebase.google.com.
2. **Build → Realtime Database → Create database.** Open the **Rules** tab and paste `database.rules.json`, then Publish.
3. **Build → Authentication → Sign-in method → enable Anonymous.**
4. **Project settings → Your apps → Web app.** Copy the config into `firebase-config.js` (include `databaseURL`).
5. **Authentication → Settings → Authorized domains:** add `localhost` and your GitHub Pages domain (`yourname.github.io`).

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy
Push to a GitHub repo → Settings → Pages → Deploy from branch (`main`, root).
