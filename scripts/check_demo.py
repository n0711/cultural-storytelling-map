"""Check data and make a real Gemini request before filming. No secrets printed."""
import json
import logging
import os
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
from dotenv import load_dotenv

load_dotenv(BACKEND / ".env", override=True)
# Load demo environment settings before importing the application client.
logging.disable(logging.CRITICAL)
from app.core import ai_client


def main():
    if os.getenv("NARRIFY_AUTO_APPROVE", "false").lower() != "false":
        raise SystemExit("FAIL: autoapproval must be false. Run SetupDemo.bat.")
    db_path = BACKEND / "storymap.db"
    if not db_path.exists():
        raise SystemExit("FAIL: database missing. Run SetupDemo.bat.")
    with sqlite3.connect(db_path) as db:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise SystemExit("FAIL: database integrity check failed.")
        if db.execute("PRAGMA foreign_key_check").fetchall():
            raise SystemExit("FAIL: broken database relationships.")
        count = db.execute("SELECT COUNT(*) FROM stories").fetchone()[0]
    print(f"PASS: database is valid ({count} stories); autoapproval is OFF.")
    manifest = json.loads((BACKEND / "demo" / "manifest.json").read_text(encoding="utf-8"))
    missing = [item["path"] for item in manifest["media"] if not (BACKEND / item["path"]).is_file()]
    if missing:
        raise SystemExit("FAIL: bundled media are missing. Run SetupDemo.bat in a fresh clone.")
    print(f"PASS: all {len(manifest['media'])} bundled media files are present.")
    print("Checking Gemini with a real request. Please wait...")
    result = ai_client.generate_companion_card_ai(
        title="A family meal in Nicosia",
        content="At our family home in Nicosia, we share bread and stories with our neighbours every Sunday.",
        category="food",
    )
    if result is None:
        raise SystemExit("FAIL: Gemini did not respond successfully. Check the private key, internet and API quota, then rerun CheckDemo.bat. Do not film fallback output as Gemini.")
    print("PASS: Gemini returned a real companion card. Ready to rehearse.")
    print("Four older missing media references are documented in backend/demo/manifest.json. Use rehearsal media from the filming checklist.")


if __name__ == "__main__":
    main()
