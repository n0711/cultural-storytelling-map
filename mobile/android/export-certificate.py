"""Verify the built APK and export its public certificate, never a keystore."""
import hashlib
import os
from pathlib import Path
import re
import subprocess

apk = Path(__file__).parent / "app/build/outputs/apk/debug/app-debug.apk"
sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
if not sdk:
    raise SystemExit("Set ANDROID_HOME to the Android SDK directory before exporting the certificate.")
signer_name = "apksigner.bat" if os.name == "nt" else "apksigner"
signer = Path(sdk) / "build-tools/35.0.0" / signer_name
result = subprocess.run([str(signer), "verify", "--print-certs", str(apk)],
                        check=True, capture_output=True, text=True)
match = re.search(r"Signer #1 certificate SHA-256 digest: ([0-9a-fA-F]{64})", result.stdout)
if not match:
    raise SystemExit("Could not read the verified APK certificate: " + result.stdout)
digest = match.group(1).upper()
fingerprint = ":".join(digest[index:index + 2] for index in range(0, 64, 2))
(apk.parent / "certificate-sha256.txt").write_text(fingerprint + "\n")
(apk.parent / "app-debug.apk.sha256").write_text(hashlib.sha256(apk.read_bytes()).hexdigest() + "  app-debug.apk\n")
print("APK_CERT_SHA256=" + fingerprint)
