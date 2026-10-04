# CPYIF Mobile App

Two ways to ship the site as an app. Both load the live site (https://www.cpyfcooperative.com), so every website update appears in the app automatically.

## 1. Installable web app (PWA) - already live after deploy
- **Android (Chrome):** open the site, tap the "Install" banner (or menu -> Install app).
- **iPhone (Safari):** Share -> Add to Home Screen.

## 2. Android app for the Play Store (Capacitor)
Requires Android Studio (includes the JDK and Android SDK).

```
cd mobile
npm install
npx cap sync android
npx cap open android
```
In Android Studio: Build -> Generate Signed Bundle / APK (choose "Android App Bundle" for the Play Store, "APK" for direct install).

- App id: `com.cpyif.cooperative` (change in `capacitor.config.json` and `android/app/build.gradle` before publishing if needed).
- To point the app at another URL, edit `server.url` in `capacitor.config.json`, then run `npx cap sync android`.
- Keep the generated signing keystore safe and out of git.
- Google Play requires a developer account (one-time fee) and a privacy policy URL.
