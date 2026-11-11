# KCC Technical on a Fire tablet (or any Android tablet)

Two ways. Try A first; it needs nothing built.

## A. Silk browser (no build)
1. On the tablet open the app's web address in Silk.
2. Menu → Add to Home Screen. It opens full screen like an app.
Limit: when the site is on https, the browser blocks the vMix, ProPresenter and booth-bridge tiles (they use plain http on your network).

## B. Installed app (APK) — makes those tiles work
This wraps the same app with Capacitor, allowing plain-http calls to your church network.
You need, on a Windows/Mac/Linux computer: Node.js LTS, Java 17, and Android Studio (for the Android SDK).

    cd android-wrapper
    npm install
    npm run setup      # copies the app into www/, creates the android/ project
    npm run apk        # builds android/app/build/outputs/apk/debug/app-debug.apk

Install on the tablet:
1. Fire tablet: Settings → Device Options → turn on ADB / allow apps from unknown sources.
2. Copy app-debug.apk to the tablet (USB or `adb install app-debug.apk`) and open it.

Notes
- The app keeps the screen on while open. Plug the tablet in at the booth.
- The app signs in through Firebase over the internet like the website does. Add `localhost` to Firebase Auth authorized domains if it is not there (it normally is).
- Camera scanning works because the app runs from `localhost`, which Android treats as secure.
- Re-run `npm run sync` (then `npm run apk`) whenever the web app changes.
- Not tested here: this scaffold could not be built in the sandbox (no Android SDK). If a step fails, send me the error text.
- Amazon Appstore: needs a release-signed build and a developer account; do this only when you are ready to publish.
