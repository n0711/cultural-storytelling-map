# Windows: do these steps in order

## 1. Install these three programs once

- [Git for Windows](https://git-scm.com/downloads/win): keep the installer defaults.
- [Python 3.13](https://www.python.org/downloads/windows/): choose Python 3.13, and keep the Python launcher enabled.
- [Node.js 24 LTS](https://nodejs.org/en/download): keep the installer defaults.

Close PowerShell after installing. Open a **new PowerShell window**.

## 2. Download the correct application

Copy and run these lines one at a time. Use a new folder, even if you already have an older copy.

```powershell
cd $env:USERPROFILE
git clone https://github.com/n0711/cultural-storytelling-map.git narrify-demo
cd narrify-demo
.\SetupDemo.bat
```

If `narrify-demo` already exists, use a different new folder name in both commands; do not delete your old copy.

Setup downloads dependencies and restores the supplied stories. When it asks for a **Gemini API key**, paste the key Charalampos gives you privately and press Enter. Nothing appears while pasting; this is normal. Alternatively, before setup, save the private file from Charalampos as `backend/.env` (exact name, not `.env.txt`). Setup then keeps that key and does not ask again.

Wait for **PASS: Gemini returned a real companion card** and **Setup complete**. If setup stops, read the error and send Charalampos a screenshot with no key or password visible. Do not continue filming until it passes.

## 3. Run the app

In the same PowerShell window:

```powershell
.\RunDemo.bat
```

Keep the **two new black windows open**. Wait for the browser to open. If it does not, open **http://127.0.0.1:3000** yourself. Close the two windows to stop the app.

Next time, open the `narrify-demo` folder and double-click **RunDemo.bat**. No reinstall is needed. Do not open it twice; if port 8000 or 3000 is already in use, close the earlier app windows first.

## 4. Get the admin login before filming

In File Explorer, open the application folder (the folder containing `RunDemo.bat`). Double-click **ShowAdminLogin.bat**. It checks this installation's admin account and displays the exact **ADMIN EMAIL** and **ADMIN PASSWORD**. Copy those into the app's login page. Log out of any ordinary account first, or use an InPrivate/Incognito window. You do not need to create an admin account.

If the file is not there yet, click File Explorer's address bar, type `powershell`, press Enter, and run `git pull --ff-only`. Then double-click **ShowAdminLogin.bat**. This avoids the “cannot find path” error caused by running commands from another folder.

Setup must have completed in this copy. If the helper reports a missing login file, run **SetupDemo.bat** and read its final message. It never guesses a password or changes your accounts/stories.

Do not film the account file, terminal setup, or API key. Keep the admin signed in in a **different browser or browser profile** from the contributor; two ordinary tabs share a login.

## 5. Record the demo

Double-click **CheckDemo.bat** once before recording and make sure every check says PASS.

Follow [DEMO_FILMING_CHECKLIST.md](DEMO_FILMING_CHECKLIST.md). Export **MP4, 1920 x 1080, maximum 1 minute 55 seconds**. Cut typing and waiting. Keep the clicks and their actual results visible.

**Critical proof:** submit a story → show it is pending and absent publicly → admin approves → it appears publicly. Autoapproval must remain off.

The whole presentation is four minutes. The video starts at 1:35 and ends at 3:30; closing/sponsor slides finish by 3:45, leaving 15 seconds spare.

All 16 supplied story records are included. Only 13 are public because 3 are rejected. Four old media links were already missing; use the checklist's new photo/audio rehearsal story for those shots. Do not replace or delete existing stories.
