# Project Lessons

Lessons learned in this project. Reviewed at the start of relevant sessions.

---

## 2026-06-11 — Cloud Functions + E2E build (Firebase Functions v2 + Playwright)

**What happened:** Firebase Functions v2 secrets (`defineSecret`) must be declared at module level and then explicitly passed in a `secrets: [...]` array on each function that uses them. Omitting the array causes the secret to be `undefined` at runtime even though it was declared.
**Why:** v2 changed secret injection from environment variables (v1) to an explicit per-function opt-in. The reference returned by `defineSecret()` is not a value — it's a lazy accessor. Calling `.value()` on it outside the function handler or without the `secrets` array registration throws.
**Next time:** Pattern for v2 secrets: `const KEY = defineSecret('MY_KEY')` at module top; then `onSchedule({ schedule: '...', secrets: [KEY] }, async () => { KEY.value() ... })`. Both the declaration and the `secrets` array are required. Never call `.value()` at module level — only inside the function handler.
**Tags:** firebase, cloud-functions, secrets, backend

---

## 2026-06-11 — Cloud Functions + E2E build (Playwright Firebase Auth mocking)

**What happened:** Mocking Firebase Auth in Playwright E2E tests without real Google OAuth requires writing a fake user record directly into `firebaseLocalStorageDb` (IndexedDB) via `page.addInitScript` before Angular boots, combined with `page.route` stubs on `securetoken.googleapis.com` and `identitytoolkit.googleapis.com` to prevent the SDK from validating and clearing the fake token.
**Why:** Firebase Auth SDK v9 reads auth state from IndexedDB on startup and fires `onAuthStateChanged` before any network call — if the persisted user is there, Angular's `AuthService` sees a signed-in user immediately. Without the token endpoint stubs, the SDK immediately tries to refresh the fake token and clears the user on failure.
**Next time:** For E2E tests that need a signed-in Firebase user: (1) stub `**/securetoken.googleapis.com/**` and `**/identitytoolkit.googleapis.com/**` to return minimal valid JSON; (2) use `page.addInitScript` to write the fake user object into `firebaseLocalStorageDb` object store `firebaseLocalStorage` with key `firebase:authUser:<apiKey>:[DEFAULT]`; (3) include a valid-looking `stsTokenManager` with a future `expirationTime`. See `e2e/utils/firebase-mocks.ts` for the canonical implementation.
**Tags:** e2e, playwright, firebase, auth

---

## 2026-06-11 — Cloud Functions + E2E build (Firestore WebChannel cannot be mocked via page.route)

**What happened:** The Firebase v9 Firestore SDK uses gRPC-web WebChannel (HTTP long-polling on `firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel`) that cannot be usefully intercepted by `page.route()` — the protocol is binary and the SDK enters an infinite retry loop if the mock response is malformed. The only reliable solution is to abort WebChannel connections and inject service state directly via Angular's DevTools API (`window.ng.getComponent`).
**Why:** `page.route` works for REST/JSON but not for the stateful WebChannel streaming protocol Firestore uses. Aborting with `connectionfailed` silences the SDK retries; then `page.evaluate(() => ng.getComponent(appRoot).leaderboardService.entries.set([...]))` sets signal state directly — no network needed.
**Next time:** For Firestore data in Playwright specs: abort `**/firestore.googleapis.com/**/Listen/channel` with `route.abort('connectionfailed')`; accept PATCH/POST writes with a 200 stub; then after `page.goto`, call `page.evaluate` with `window.ng.getComponent(document.querySelector('app-root')).<service>.signal.set(data)` followed by `ng.applyChanges(appRoot)`. Wait for `window.ng?.getComponent` to exist before evaluating.
**Tags:** e2e, playwright, firebase, firestore

---

## 2026-06-11 — Cloud Functions + E2E build (Angular [hidden] vs *ngIf for E2E group selector)

**What happened:** All 12 group sections are rendered in the DOM simultaneously using `[hidden]="activeGroup !== g.id"` rather than `*ngIf`. This means Playwright can locate elements in non-active groups without requiring a tab switch — but it also means locators without the visibility filter will match hidden elements. Tests that scope locators to `.match-card` without filtering by visible group must account for this.
**Why:** `*ngIf` would destroy and recreate 12 groups on every group switch, which is expensive. `[hidden]` keeps them in the DOM. The trade-off is that Playwright's default `.toBeVisible()` correctly ignores `hidden` elements, but `.locator('.match-card')` returns all 12 groups' cards — you must chain `.filter({ visible: true })` or scope by the visible group container.
**Next time:** When a component renders multiple sections with `[hidden]` (not `*ngIf`), always chain `.filter({ visible: true })` or use `{ hasText: /.../ }` on the active section's container to avoid matching hidden content. For group selectors: `app.selectGroup('E')` then `page.locator('.match-card.lms-highlighted', { hasText: /Germany/ })` scopes correctly.
**Tags:** angular, e2e, playwright, dom

---

## 2026-06-11 — Cloud Functions + E2E build (third-party sports API team name normalization)

**What happened:** football-data.org uses its own canonical team names that differ from common display names (e.g. "Korea Republic" vs "South Korea", "Czechia" vs "Czech Republic", "Côte d'Ivoire" vs "Ivory Coast", "United States" vs "USA"). The Cloud Function `processResults` would silently fail to match any user picks for these teams without a normalization layer.
**Why:** Third-party sports data APIs standardise on FIFA/UEFA official names, which frequently diverge from popular display names used in apps and UI. The mismatch is silent — `getPickResult()` returns `null` and the pick is never scored.
**Next time:** When integrating any sports data API for match result processing, build a `NAME_ALIASES` map before writing any matching logic. For football-data.org specifically, the divergences for WC2026 are documented in `backend/functions/src/index.ts`. Always normalise with case-insensitive comparison and check both `name` and `shortName` fields from the API response.
**Tags:** firebase, cloud-functions, data-normalization, football-data-org

---

## 2026-06-11 — WC26 LMS Firebase initial build (Angular 17 + Firebase Auth + Firestore)

**What happened:** Firebase API key and project config were committed to version control before `.gitignore` was updated to exclude environment files.
**Why:** The environment file was written during project setup, and `.gitignore` was only updated later in the session — after the config already existed on disk and could have been staged.
**Next time:** Create and commit `.gitignore` with `environment*.ts` exclusions as the very first step, before writing any Firebase config. The sequence must be: gitignore → git init/commit → then write secrets.
**Tags:** security, firebase, credentials, git

---

## 2026-06-11 — WC26 LMS Firebase initial build (Angular 17 + Firebase Auth + Firestore)

**What happened:** `savePick()` and the leaderboard load method were missing `try/finally` blocks. When either call threw, the `saving` signal was never set back to `false`, leaving the UI in a frozen loading state with no recovery path.
**Why:** Signal-based loading state is set to `true` before the async call and must be reset to `false` in every exit path — success and error. Without `finally`, errors silently consume the loading state.
**Next time:** Any signal or state flag that represents in-flight async work must follow the pattern: `this.saving.set(true)` → `try { await call() } finally { this.saving.set(false) }`. Apply this to every async method in `PicksService` and `LeaderboardService` before adding new ones.
**Tags:** firebase, signals, async, state-management

---

## 2026-06-11 — WC26 LMS Firebase initial build (Angular 17 + Firebase Auth + Firestore)

**What happened:** `matchRound()` computed the round by comparing a match's date against hardcoded date boundaries using inline arithmetic. Knockout round data added later will have a different date structure, and the function will silently misclassify matches rather than fail loudly.
**Why:** Date arithmetic was used as a proxy for explicit round membership because the data model didn't include a `round` field. This works for the group stage but breaks for any extension of the schedule.
**Next time:** Add a `round` field to the Firestore match document at the data modelling stage. Do not derive round membership from date arithmetic — it is brittle and will need to be replaced as soon as knockout data is seeded. If changing the data model is not immediately possible, add a `TODO` comment noting the fragility and the required data change.
**Tags:** firestore, data-modelling, fragility, knockout-rounds

---

## 2026-06-11 — WC26 LMS Firebase initial build (Angular 17 + Firebase Auth + Firestore)

**What happened:** `loadPicks()` in `PicksService` did not guard against sign-out that occurred while the Firestore fetch was in-flight. If a user signed out during the fetch, the response callback would call `this.picks.set(data)`, overwriting the cleared state and populating the UI with picks for a now-signed-out user.
**Why:** The async Firestore call captured `userId` at call time but did not verify the user was still authenticated when the response arrived.
**Next time:** In `loadPicks()`, after the `await getDocs(...)` resolves, check `this.authService.currentUser()?.uid === userId` before calling `this.picks.set(data)`. If they differ, discard the response silently. Apply the same guard to any service method that reads Firestore data tied to a specific user session.
**Tags:** firebase, auth, race-condition, state-management

---

## 2026-06-11 — WC26 LMS Firebase initial build (Angular 17 + Firebase Auth + Firestore)

**What happened:** The project uses the Firebase JS SDK directly (`firebase/app`, `firebase/auth`, `firebase/firestore`) rather than `@angular/fire`. This avoided a blocking peer dependency conflict where `@angular/fire` 17.x was not yet available for Angular 17 at the time of build.
**Why:** `@angular/fire` lags Angular major version releases. Direct SDK usage has no peer dependency requirements — it works with any Angular version.
**Next time:** When starting a new Angular + Firebase project, check whether `@angular/fire` supports the current Angular major version before adding it. If not (or if the version is new), use the Firebase JS SDK directly. It is not a workaround — it is a fully supported approach and removes one dependency from the upgrade chain.
**Tags:** firebase, angular, dependencies, tooling

---

## 2026-06-11 — WC26 LMS Firebase initial build (Angular 17 + Firebase Auth + Firestore)

**What happened:** `onAuthStateChanged` (Firebase callback-based) was integrated with Angular signals by calling `signal.set()` inside the callback. The `effect()` in the component constructor then reacted to auth state changes to trigger data loads and route guards.
**Why:** RxJS `fromEvent` wrappers or `toObservable` are not needed for Firebase Auth callbacks. A direct `signal.set()` call inside `onAuthStateChanged` works cleanly because the callback runs in a browser context where Angular's zone or signal tracking handles change detection.
**Next time:** For Firebase Auth + Angular signals: wrap `onAuthStateChanged` in `AuthService.init()`, call `this.currentUser.set(user)` directly in the callback, and place `effect(() => { if (this.authService.currentUser()) { ... } })` in component constructors that need to react. No RxJS required.
**Tags:** firebase, angular, signals, auth

---

## 2026-06-11 — WC26 LMS Firebase initial build (Angular 17 + Firebase Auth + Firestore)

**What happened:** The backend folder (`backend/`) — containing Firestore security rules, Cloud Functions scaffold, and `firebase.json` — was scaffolded alongside `frontend/` at project start, even before any backend logic was needed.
**Why:** Firebase projects have deployment concerns (security rules, Cloud Functions, hosting config) that are separate from the Angular app but tightly coupled to it. Setting up the backend folder structure early prevents a chaotic late-session reorganisation and ensures security rules are written before the app goes live.
**Next time:** For any Firebase project, create `backend/` and `frontend/` as sibling directories from the first commit. Scaffold `backend/firestore.rules`, `backend/functions/index.ts`, and `firebase.json` early — even if the functions are empty placeholders. This makes the security boundary visible and prevents rules from being written as an afterthought.
**Tags:** firebase, architecture, project-structure, security-rules

---
