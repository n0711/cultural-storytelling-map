# Narrify Android preview

The Android app launches Narrify's map-first `/app` experience through Google's Android Browser Helper (Trusted Web Activity). The mobile UI and server are shared with the hosted project in `hosted/`. Authentication remains in the browser's own session; the Android package has no password store, injected identity headers or JavaScript credential bridge.

The preview package is `tech.pelaos.narrify.debug`; the future release package is `tech.pelaos.narrify`. Minimum Android API 24. The pinned build uses JDK 17, Gradle 8.13, Android Gradle Plugin 8.13.2, compile/target API 36 and Android Browser Helper 2.7.4.

Run `gradle -p mobile/android :app:assembleDebug` with Android SDK tooling installed, or use the **Android preview APK** GitHub Actions workflow. The artifact contains the test APK and its public signing-certificate fingerprint. It never contains a keystore. Test builds use the runner's generated debug key; a later build may need uninstalling an older preview if its signing key differs. Release signing, Play Console distribution and store billing are separate, unfinished setup steps.

For full-screen verification, the deployed site's `/.well-known/assetlinks.json` must list the exact package and SHA-256 certificate fingerprint of the installed APK. Without matching verification, Android Browser Helper opens a Custom Tab with browser controls. External sign-in origins keep their browser controls. A browser supporting Trusted Web Activity is required for the full-screen experience.

No location, camera, microphone or notification runtime permission is declared. The story location picker chooses an approximate public place; it does not read the device GPS. Offline reading is limited to the three public previews provided by the app's service worker. Authenticated records, submissions and paid story bodies are never added to the offline cache.

Sources: [Chrome quick start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start), [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper/tree/android-browser-helper-2.7.4), [AGP compatibility](https://developer.android.com/build/releases/agp-8-13-0-release-notes).
