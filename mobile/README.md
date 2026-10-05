# CPYIF Mobile Release Setup

The Android and iOS Capacitor apps use the cooperative's live HTTPS site at `https://www.cpyfcooperative.com`. Site content and account services therefore update without shipping a new binary. An internet connection is required for member account data. The PWA remains separately installable from the website.

## App identity and release version

- Display name: **CPYIF Cooperative**
- Android application ID / iOS bundle ID: `com.cpyif.cooperative`
- Initial release: `1.0.0` / Android version code `1`
- Minimum Android: API 24; compile/target: API 36
- The application ID and bundle ID are long-term store identifiers. Do not change them after the first store release.

## Android Play Store bundle

Install Android Studio, JDK 21 and Android SDK Platform 36 / Build Tools 36.0.0. From this directory:

```powershell
npm ci
npm run sync
```

Create a private upload key once in a local, non-synced folder. Keep at least two secure backups of the keystore and its passwords; anyone who can access both can sign updates to the app. Never commit or email the keystore:

```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\CPYIF"
keytool -genkeypair -v -keystore "$env:LOCALAPPDATA\CPYIF\cpyif-upload-key.jks" -keyalg RSA -keysize 4096 -validity 10000 -alias cpyif-upload
```

Set these environment variables to the upload keystore and credentials, then create the Play Store App Bundle:

```powershell
$env:CPYIF_KEYSTORE_PATH = "$env:LOCALAPPDATA\CPYIF\cpyif-upload-key.jks"
$env:CPYIF_KEYSTORE_PASSWORD = "<upload-store-password>"
$env:CPYIF_KEY_ALIAS = "cpyif-upload"
$env:CPYIF_KEY_PASSWORD = "<upload-key-password>"
npm run build:android:bundle
```

The release task deliberately fails when signing credentials are absent. The `.aab` output is `android\app\build\outputs\bundle\release\app-release.aab`. Use Play App Signing when creating the Play Console app. Do not lose the upload key or passwords; Play can reset an upload key, but not the app-signing key managed by Play.

For direct device testing only, run `npm run build:android:debug`. A debug APK is not a Play Store release.

## iOS App Store build

The iOS Xcode project is in `ios/App/App.xcworkspace`. It must be opened and built on a Mac with Xcode; Windows cannot compile, sign, or submit iOS applications.

1. Install Xcode and the current Xcode command-line tools on a Mac.
2. Run `npm ci` and `npm run sync:ios`.
3. Open `ios/App/App.xcworkspace` in Xcode. Set the CPYIF Apple Developer Team and keep the bundle ID `com.cpyif.cooperative`.
4. Enable **Push Notifications** and **Background Modes → Remote notifications** for the app target. Use an App Store provisioning profile with the matching push entitlement.
5. Configure signing, select a real device or **Any iOS Device (arm64)**, then use **Product → Archive**. Validate and upload the archive with Xcode Organizer or Transporter.

An Apple Developer Program account, App Store Connect app record, accepted agreements, signing team, and distribution provisioning are required. None of those can be created from this Windows workstation.

## Push notifications (Android FCM and iOS APNs)

Push sends are delivered only after CPYIF configures Android Firebase Cloud Messaging and the Apple Push Notification service. Until then the member website and app inbox continue to work; the app tells members that push notifications can be enabled, but the server logs that delivery is unconfigured.

1. Create or select CPYIF's Firebase project and register an Android app using exactly `com.cpyif.cooperative`. Download `google-services.json` to `android/app/google-services.json`; this file is git-ignored.
2. Set the Vercel server environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` to a Firebase service-account JSON for that project. Treat it as a production secret; never commit it or include it in a mobile binary.
3. In the Apple Developer account, create an APNs authentication key (`.p8`) and enable **Push Notifications** and **Background Modes → Remote notifications** for the iOS App ID and Xcode target.
4. Set Vercel secrets `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (the `.p8` contents), and `APNS_BUNDLE_ID=com.cpyif.cooperative`. Set `APNS_USE_SANDBOX=true` only for development provisioning; use `false` for store builds.
5. Deploy the web API/schema changes, install the Android Firebase config locally, and run `npm run sync` before building either store binary.

The server stores platform-specific push tokens per member/device, uses them only for cooperative account notices, and removes invalid tokens. Android notices are sent with Firebase Admin; iOS notices are sent directly to APNs. Signing out removes the current device registration.

## Privacy, review and store listing

- Public privacy policy: <https://www.cpyfcooperative.com/privacy>
- Draft app description and store-art checklist: [STORE-LISTING.md](./STORE-LISTING.md)
- Review access must be created in each store's private console fields. Never put a review password or real member data in this repository.
- Capture actual device screenshots from the release candidate. Store listing artwork is not a substitute for app screenshots.
- Review the Play Data safety form and Apple's App Privacy answers against actual server/Firebase configuration before submission. This app handles membership/contact/profile records, financial transactions and optional push tokens.
- Apple's minimum-functionality review is discretionary. Native member navigation and push support add app-specific features, but do not guarantee approval; verify all sign-in, payment-submission, notification and external-link flows on real iOS devices before review.

## Useful commands

```powershell
npm run sync
npm run build:android:debug
npm run build:android:bundle
npm run open:android
npm run open:ios
```

`open:ios` requires macOS with Xcode. Do not distribute the debug APK as the store release.
