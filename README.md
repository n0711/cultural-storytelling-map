# Narrify — cultural storytelling map

React/Leaflet frontend, FastAPI/SQLite backend, and server-side Gemini features.

**For the Windows demo: follow [the short setup instructions](docs/WINDOWS_DEMO.md), then [the 115-second filming checklist](docs/DEMO_FILMING_CHECKLIST.md).**

## Hosted launch edition

The hosted map is at https://narrify-cultural-map.fitslug32.chatgpt.site. The new [hosted edition](hosted/README.md) contains the launch source, payment activation instructions and verification limits.

It presents eleven curated approved stories with three free previews and an introductory **€1.99/month EUR** membership. Checkout is **closed pending Stripe merchant configuration and live payment verification**. Institutional pilots have separate scope/pricing; a future government pitch does not automatically change existing subscriptions. The Windows demo below is preserved.

## Start the Windows demo

Install Git, Python **3.13** (including its launcher), and Node.js **24 LTS**. Open PowerShell:

```powershell
git clone https://github.com/n0711/cultural-storytelling-map.git narrify-demo
cd narrify-demo
.\SetupDemo.bat
.\RunDemo.bat
```

Setup asks for the private Gemini key if it is not already in `backend/.env`. Paste it and press Enter; it will not be displayed. Alternatively copy the private `.env` file supplied by Charalampos into `backend/.env` before setup. Never upload it to GitHub. Wait for **Setup complete** before starting the app. Keep both app windows open and visit <http://127.0.0.1:3000>.

Before recording, double-click `CheckDemo.bat`. It makes an actual Gemini request; a configuration badge alone is not a successful API test. Internet is required for Gemini and map tiles.

## Accounts and stored stories

Setup initializes an empty database with **16 stories: 13 approved and 3 rejected**, plus 6 translations, 3 comments and 2 likes. All existing story fields, authors' display names and relationships are preserved. Private account emails and old password hashes are replaced with local demo credentials. Double-click `ShowAdminLogin.bat` to display and verify this installation's admin email/password. Log out first or use a private browser window to sign in as admin. All local demo logins are also stored in `backend/.demo-accounts.json`.

All **8 available uploaded files** are bundled under `backend/demo/uploads/`. Four pre-existing missing image/audio references remain listed in `backend/demo/manifest.json`; those missing files cannot be restored from this checkout. The checklist explains how to create a clearly labelled multimedia rehearsal story without altering the existing records.

**Autoapproval is OFF.** New stories remain pending until an admin approves them. Rejected stories remain in the database and the admin's Flagged tab; they are not public map markers. Setup never replaces a populated database. Use a fresh clone for the exact supplied snapshot. Runtime database, media uploads, API keys and generated passwords stay local and are gitignored. Keep your local backend/storymap.db, backend/uploads, backend/.env and backend/.demo-accounts.json when moving the same running installation to another folder.

## Features covered by the demo

- Registration, login, logout and public access to approved stories.
- Map markers, location selection, category filtering, keyword search and list browsing.
- Text, photo, audio and optional anonymous attribution.
- Gemini companion cards, Greek/Turkish translation, approximate location labels and moderation assistance.
- Human approval, rejection and restoration.
- Likes, comments, nested replies and authorised comment removal.
- SQLite persistence across refreshes/restarts.

The optional Replicate video endpoint is not connected to the current frontend and is not part of the filmed feature list. Gemini output varies between requests; the same version/data do not imply identical generated wording.

## Updating an existing checkout

For filming, a **new `narrify-demo` folder is recommended**. This update removes the old database from Git tracking, so before the **first pull** of this release, stop the app and back up `backend/storymap.db`, `backend/uploads`, `backend/.env`, and any `.demo-accounts.json` outside the repository. Do not discard uncommitted work to force a pull. A populated database is preserved by setup; an incompatible schema produces a clear stop instead of deleting tables. Existing older databases may require an explicit migration; a fresh clone needs none.

## Verification

From the repository root after setup:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_demo*.py" -v
cd ..
.\backend\.venv\Scripts\python.exe scripts/check_demo.py
cd frontend
npm run build
```

The data tests use temporary folders and check the snapshot, media, repeat-run preservation, schema mismatch, and tamper detection. `npm ci` uses the committed lockfile; Windows setup installs the tested pinned Python dependencies from `backend/requirements-demo.lock.txt`. The current Create React App toolchain has known dependency audit findings; the demo is intended to run locally, not as a production deployment.
