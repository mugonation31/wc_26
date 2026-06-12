# Firebase Setup — Idiot's Guide

## Step 1 — Create a Project

1. Go to **console.firebase.google.com**
2. Sign in with your Google account
3. Click **"Add project"**
4. Enter a project name (e.g. `wc26-lms`)
5. Turn **off** Google Analytics (not needed)
6. Click **Create project**
7. Wait for it to spin up → click **Continue**

---

## Step 2 — Add a Web App

1. You'll land on the project dashboard
2. Click **"+ Add app"** (top of the page, next to your project name)
3. Choose the **`</>`** icon (Web)
4. Enter a nickname (e.g. `wc26-lms-web`)
5. Leave "Also set up Firebase Hosting" **unticked**
6. Click **Register app**
7. You'll see a `firebaseConfig` block — **copy the whole thing**
8. Click **Continue to console**

Your config looks like this — save it somewhere safe:
```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456...",
  measurementId: "G-XXXXXXX"
};
```

---

## Step 3 — Enable Google Sign-In

1. In the left sidebar click **Authentication**
2. Click the **Sign-in method** tab
3. Click **Google** in the provider list
4. Toggle it **on** (top right of the panel)
5. Your project name will auto-fill
6. Set the **Project support email** to your email address
7. Click **Save**

You should now see Google listed as an enabled provider.

---

## Step 4 — Create Firestore Database

1. In the left sidebar click **Databases & Storage** → **Firestore**
2. Click **Create database**
3. **Select edition** — choose **Standard edition** (already selected by default) → click **Next**
4. **Database ID & location**:
   - Leave **Database ID** as `(default)` — do not change it
   - Set **Location** to `europe-west2 (London)` — closest to UK
   - Click **Next**
5. **Configure** — select **Start in test mode**
   - Think of it like leaving the front door open while builders are working — you lock it before going live
   - Test mode expires after 30 days — update security rules before launch
6. Click **Create**

Wait a few seconds for it to provision — you'll see an empty database ready to go.

---

## Step 5 — Give the Config to Your Dev

Hand over the `firebaseConfig` object from Step 2.  
That's all they need to wire up the app.

---

## Quick Reference — Where to Find Things

| Thing | Where |
|---|---|
| Add/manage apps | Project Overview → top of page |
| Google Auth | Authentication → Sign-in method |
| Firestore data | Databases & Storage → Firestore |
| Realtime Database | Databases & Storage → Realtime Database |
| File storage | Databases & Storage → Storage |
| Project settings | Gear icon (top left) → Project settings |

---

> Test mode Firestore rules expire after 30 days — go to Firestore → Rules to update them before launch.
