# AI VIDEO MAKER PRO — Capacitor Android APK Build Guide

## 1. Capacitor Project Configuration
- **App Name**: `AI VIDEO MAKER PRO`
- **Package / Application ID**: `com.aivideomakerpro.app`
- **Web Output Directory**: `dist` (`capacitor.config.json`)
- **Android Platform Directory**: `android/`
  - `android/app/src/main/AndroidManifest.xml` (Internet, Network State, Microphone Audio Recording, Android 13+ Media Permissions)
  - `android/app/src/main/java/com/aivideomakerpro/app/MainActivity.java` (Capacitor `BridgeActivity` + runtime `RECORD_AUDIO` check)
  - `android/app/build.gradle` & `android/variables.gradle` (`minSdkVersion 24`, `compileSdkVersion 36`, `targetSdkVersion 36`)
  - `android/gradlew` (Gradle 8.14.3 wrapper)

---

## 2. Environment Dependencies Check (Why APK Is Not Built Inside the Web Container)
This AI Studio Linux runtime includes **Node.js + npm/vite** for web bundling and Express API hosting, so `npm run build` and `npx cap sync android` succeed directly here. However, compiling the native `.apk` binary requires native Android build tools that are **not pre-installed in this container**:
- **Missing Java JDK 21** (`java: not found`) — required by Gradle 8.14.3 & Android Gradle Plugin.
- **Missing Android SDK & Build Tools** (`ANDROID_HOME` / `ANDROID_SDK_ROOT` unset).

Because no `.apk` binary has been compiled yet, the Home Screen **App Download** section honestly displays:
> `APK is not ready yet. Build the Android app first.`

---

## 3. Optional Backend API URL (`VITE_API_BASE_URL`) for AI Features
All basic studio features (Home Screen, Video & Shorts Editor trim/cut/split/merge/filters/subtitles, MP4/WebM export, Photo & Collage Editor, Mic Recording, Audio Editor, Playable 2D Games, and local Projects/History) run locally inside the web app or Android WebView **without `VITE_API_BASE_URL`**.

Server-dependent AI generation features (`/api/studio/*`) require a hosted Express backend (`server.ts` with `GEMINI_API_KEY`). When you deploy a backend later, you can optionally pass its URL via `VITE_API_BASE_URL`:
```bash
# Optional — omit VITE_API_BASE_URL to build standalone/local mode:
VITE_API_BASE_URL=https://YOUR_HOSTED_APP_URL npm run build
npx cap sync android
```

---

## 4. Option A — Build & Download APK via GitHub Actions on Your Android Phone (Easiest)
A ready-to-run workflow is included at `.github/workflows/android-apk.yml`:
1. Push or upload this repository to **GitHub**.
2. Open your repository on your Android phone browser → tap **Actions** → select **Build Android Debug APK (Capacitor)** → tap **Run workflow** (`api_base_url` is optional—leave blank if you don't have a backend URL yet).
3. Wait ~3 minutes for the build to complete, then open **Releases → AI VIDEO MAKER PRO - Android APK** in your GitHub repository and tap **`AI-VIDEO-MAKER-PRO-debug.apk`** to download the `.apk` directly onto your Android phone (no `.zip` extraction needed!).
4. Tap the downloaded `.apk` to install it on your phone (enable *Install unknown apps* if prompted).
5. *(Optional)* To make that APK downloadable from the Home Screen for all users, open **Admin** inside the web app, unlock with your Admin PIN, and upload the compiled `.apk` under **Android APK Distribution**.

---

## 5. Option B — Build Debug / Release APK Locally
### Prerequisites
- **Node.js 22+**
- **Java JDK 21** (`JAVA_HOME` set)
- **Android Studio** / **Android SDK** (`ANDROID_HOME` set, Android SDK Platform 36)

### Commands
```bash
# 1. Install dependencies & build web bundle (VITE_API_BASE_URL is optional)
npm install
npm run build

# 2. Sync dist/ into android/app/src/main/assets/public
npx cap sync android

# 3. Build Debug APK with Gradle
cd android
./gradlew assembleDebug
```
The compiled debug APK will be written to:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Optional: Publish Compiled APK Directly to Home Screen Download
Either upload the compiled `.apk` in **Admin → Android APK Distribution**, or copy it via terminal:
```bash
mkdir -p public/downloads
cp android/app/build/outputs/apk/debug/app-debug.apk public/downloads/ai-video-maker-pro.apk
```
`/api/apk/status` and `/api/apk/download` will automatically validate the real `.apk` package and enable the **Download Android APK** button.
