# Narrify Android preview

The Android app launches Narrify's map-first `/app` experience through Google's Android Browser Helper (Trusted Web Activity). The mobile UI and server are shared with the hosted project in `hosted/`. Authentication remains in the browser's own session; the Android package has no password store, injected identity headers or JavaScript credential bridge.

The preview package is `tech.pelaos.narrify.debug`; the future release package is `tech.pelaos.narrify`. Minimum Android API 24. The pinned build uses JDK 17, Gradle 8.13, Android Gradle Plugin 8.13.2, compile/target API 36 and Android Browser Helper 2.7.4.

## Open on your Windows PC

1. Clone this repository, or pull the latest `main` in your existing clone.
2. Double-click **`Open-Narrify-Android-Studio.bat`** in the repository root. It opens `mobile/android` using an installed Android Studio. You can also select that folder with Android Studio's **Open** action. Use an Android Studio version that supports AGP 8.13; Narwhal 3 Feature Drop (2025.1.3) or later supports this project.
3. Set the project's **Gradle JDK** to JDK 17, matching CI. In SDK Manager, install **Android SDK Platform 36** and **Android SDK Build-Tools 35.0.0**, then let Gradle Sync finish. The committed Wrapper downloads Gradle 8.13 automatically; a separate Gradle installation is unnecessary.
4. Select the **app** configuration and the **debug** variant, choose a connected Android device or an emulator (API 24 or later), and press **Run**. A TWA-capable browser is needed for the browser-backed app.

The launcher checks the standard system and per-user Android Studio directories, then `PATH`. For a custom installation, set `NARRIFY_STUDIO_EXE` to the full path of `studio64.exe` before running it. It only opens the Android project: it does not install software, alter the SDK, or change your permanent environment. Keep Android Studio's generated `local.properties`, `.idea/` and your signing keys out of git.

From a terminal in the repository root, build without opening the IDE:

```powershell
.\mobile\android\gradlew.bat -p mobile/android :app:assembleDebug --no-daemon
```

```sh
./mobile/android/gradlew -p mobile/android :app:assembleDebug --no-daemon
```

The APK is `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. The **Android preview APK** GitHub Actions workflow builds on Linux and Windows with these same Wrapper entry points, validates the Wrapper, and exports each APK with its public signing-certificate fingerprint and checksum. It never exports a keystore. Test builds use each machine's generated debug key; a later build may need uninstalling an older preview if its signing key differs. Release signing, Play Console distribution and store billing are separate, unfinished setup steps.

The Wrapper scripts and JAR come from Gradle's official `v8.13.0` tag. The JAR SHA-256 was checked against Gradle's published checksum: `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f`. The distribution checksum is pinned in `gradle/wrapper/gradle-wrapper.properties`. See the [Gradle 8.13 Wrapper documentation](https://docs.gradle.org/8.13/userguide/gradle_wrapper.html).

For full-screen verification, the deployed site's `/.well-known/assetlinks.json` must list the exact package and SHA-256 certificate fingerprint of the installed APK. A local PC build normally has a different debug certificate from the verified preview below. Without matching verification, Android Browser Helper opens a Custom Tab with browser controls. External sign-in origins keep their browser controls. A browser supporting Trusted Web Activity is required for the full-screen experience. To inspect a local certificate, run the Wrapper's `:app:signingReport` task. Do not upload your debug or release keystore.

No location, camera, microphone or notification runtime permission is declared. The story location picker chooses an approximate public place; it does not read the device GPS. Offline reading is limited to the three public previews provided by the app's service worker. Authenticated records, submissions and paid story bodies are never added to the offline cache.

Sources: [Chrome quick start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start), [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper/tree/android-browser-helper-2.7.4), [AGP compatibility](https://developer.android.com/build/releases/agp-8-13-0-release-notes), [Android Studio compatibility](https://developer.android.com/studio/releases#android_gradle_plugin_and_android_studio_compatibility).

## Verified preview artifact

The build at https://github.com/n0711/cultural-storytelling-map/actions/runs/40463680423 assembled the debug APK and verified its signature with `apksigner`. SHA-256: `42ac71a5dddb15f43bd210e987b262e46e9c8ab7210b5efae681bde365136153`. The hosted asset association records this build's certificate for `tech.pelaos.narrify.debug`. This is a build-and-signature result; no physical installation or authenticated phone workflow has been verified yet.
