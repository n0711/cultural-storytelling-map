"""Install the preview on an emulator and require the real public map UI.

Only emulator serials are accepted. No account, payment, device-GPS request,
asset-link verification bypass, or physical-phone operation is performed.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET


PACKAGE = "tech.pelaos.narrify.debug"
BROWSER = "com.android.chrome"
PROJECT = Path(__file__).resolve().parent
APK = PROJECT / "app/build/outputs/apk/debug/app-debug.apk"
REPORT = PROJECT / "app/build/reports/launch-smoke"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", required=True, help="An emulator-NNNN adb serial")
    args = parser.parse_args()
    if not re.fullmatch(r"emulator-[0-9]+", args.serial):
        parser.error("This smoke check only accepts an Android emulator, never a phone.")
    if not APK.is_file():
        parser.error("Build :app:assembleDebug before running the smoke check.")

    REPORT.mkdir(parents=True, exist_ok=True)
    summary = {
        "status": "failed",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "serial": args.serial,
        "package": PACKAGE,
        "apk_sha256": hashlib.sha256(APK.read_bytes()).hexdigest(),
        "scope": "Emulated anonymous launch to the real public map UI",
        "not_tested": ["physical phone", "sign-in", "contributions", "payments",
                       "offline mode", "full-screen asset-link association"],
    }

    def adb(*command, check=True, timeout=30):
        return subprocess.run(["adb", "-s", args.serial, *command], check=check,
                              capture_output=True, text=True, timeout=timeout)

    def save_text(name, *command):
        try:
            result = adb(*command, check=False, timeout=15)
            (REPORT / name).write_text(result.stdout + result.stderr, encoding="utf-8")
        except (OSError, subprocess.SubprocessError) as exc:
            (REPORT / name).write_text(str(exc), encoding="utf-8")

    error = None
    try:
        if adb("shell", "getprop", "ro.kernel.qemu").stdout.strip() != "1":
            raise RuntimeError("Selected adb target does not identify as an emulator.")
        summary["android_api"] = adb("shell", "getprop", "ro.build.version.sdk").stdout.strip()
        if "package:" not in adb("shell", "pm", "path", BROWSER).stdout:
            raise RuntimeError("The Google APIs emulator image must include Chrome.")

        # This is a fresh rootable Google APIs emulator, not the user's device.
        # Skip Chrome's first-run UI only; Narrify authentication and DAL stay intact.
        adb("root")
        adb("wait-for-device")
        if adb("shell", "id", "-u").stdout.strip() != "0":
            raise RuntimeError("Use a rootable Google APIs emulator image for this CI check.")
        flags = REPORT / "chrome-command-line"
        flags.write_text("_ --disable-fre --no-first-run --no-default-browser-check\n", encoding="utf-8")
        adb("push", str(flags), "/data/local/tmp/chrome-command-line")
        adb("shell", "chmod", "644", "/data/local/tmp/chrome-command-line")
        adb("shell", "am", "force-stop", BROWSER)
        adb("install", "-r", str(APK), timeout=90)
        adb("logcat", "-c")
        launch = adb("shell", "am", "start", "-W", "-n",
                     PACKAGE + "/com.google.androidbrowserhelper.trusted.LauncherActivity")
        (REPORT / "launch.txt").write_text(launch.stdout + launch.stderr, encoding="utf-8")
        if "Status: ok" not in launch.stdout:
            raise RuntimeError("Android did not report a successful launcher start.")

        deadline = time.monotonic() + 90
        labels = set()
        while time.monotonic() < deadline:
            if "Process: " + PACKAGE in adb("logcat", "-b", "crash", "-d").stdout:
                raise RuntimeError("The Narrify launcher crashed; inspect crash-logcat.txt.")
            dumped = adb("shell", "uiautomator", "dump", "/sdcard/narrify-window.xml",
                         check=False, timeout=20)
            if dumped.returncode == 0:
                adb("pull", "/sdcard/narrify-window.xml", str(REPORT / "window.xml"))
                root = ET.parse(REPORT / "window.xml").getroot()
                labels = {value for node in root.iter("node")
                          for attr in ("text", "content-desc")
                          if (value := node.get(attr))}
                combined = "\n".join(labels)
                if ({"Explore", "Stories", "Share", "Account"} <= labels
                        and "Interactive map of community stories in Cyprus" in combined
                        and "Opening the map" not in combined
                        and "The map is unavailable" not in combined):
                    summary["visible_landmarks"] = ["Explore", "Stories", "Share", "Account",
                                                    "Interactive map of community stories in Cyprus"]
                    break
            time.sleep(2)
        else:
            raise RuntimeError("The installed APK did not show the public map UI within 90 seconds.")

        crash = adb("logcat", "-b", "crash", "-d").stdout
        if "Process: " + PACKAGE in crash:
            raise RuntimeError("The Narrify launcher crashed; inspect crash-logcat.txt.")
        summary["status"] = "passed"
    except (OSError, RuntimeError, subprocess.SubprocessError, ET.ParseError) as exc:
        error = str(exc)
        summary["error"] = error
    finally:
        save_text("activity.txt", "shell", "dumpsys", "activity", "activities")
        save_text("browser.txt", "shell", "dumpsys", "package", BROWSER)
        save_text("crash-logcat.txt", "logcat", "-b", "crash", "-d")
        save_text("logcat.txt", "logcat", "-d", "-t", "500")
        try:
            screenshot = subprocess.run(["adb", "-s", args.serial, "exec-out", "screencap", "-p"],
                                        check=True, capture_output=True, timeout=15)
            (REPORT / "screen.png").write_bytes(screenshot.stdout)
        except (OSError, subprocess.SubprocessError):
            pass
        (REPORT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    if error:
        raise SystemExit(error)
    print("PASS: installed preview opened the public Narrify map on the emulator.")


if __name__ == "__main__":
    main()
