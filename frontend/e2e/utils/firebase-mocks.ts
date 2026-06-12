/**
 * Firebase mock utilities for E2E tests.
 *
 * Strategy:
 *  - Auth state: inject a persisted Firebase user into IndexedDB before
 *    Angular boots. The Firebase Auth SDK reads this on startup and fires
 *    onAuthStateChanged with the stored user without making a real OAuth call.
 *    Token-refresh REST calls are intercepted and stubbed.
 *
 *  - Firestore network: The Firebase v9 Firestore SDK uses a gRPC-web
 *    WebChannel (HTTP long-polling) that is difficult to mock at the protocol
 *    level. Instead we use the Angular signal injection approach — after the
 *    page loads with an empty/no-data state, we directly set the service
 *    signals via window.ng.getComponent (Angular DevTools API). This bypasses
 *    all Firestore networking entirely and is 100% reliable.
 *
 *  - Firestore REST: We still intercept firestore.googleapis.com to prevent
 *    real network calls and give the app a consistent empty baseline.
 */

import { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Canonical mock users
// ---------------------------------------------------------------------------

export const MOCK_USER = {
  uid: 'test-uid-123',
  displayName: 'Test Player',
  email: 'test@example.com',
  photoURL: 'https://example.com/avatar.png',
};

// Firebase project config — must match src/environments/environment.ts
const FIREBASE_API_KEY = 'REDACTED_FIREBASE_API_KEY';
const FIREBASE_APP_NAME = '[DEFAULT]';

// ---------------------------------------------------------------------------
// Auth state injection — signed in
// ---------------------------------------------------------------------------

/**
 * Inject a signed-in Firebase Auth user into the page before Angular
 * initialises. This avoids any real Google OAuth redirect.
 *
 * The Firebase Auth SDK v9 persists auth state in IndexedDB
 * (`firebaseLocalStorageDb`, object store `firebaseLocalStorage`, key
 * `firebase:authUser:<apiKey>:[DEFAULT]`).  We write a fake user record there
 * via addInitScript so the SDK picks it up and fires onAuthStateChanged with
 * our mock user before Angular's AuthService constructor completes.
 *
 * We also stub the token-refresh endpoint so Firebase doesn't reject the
 * fake refresh token and clear the user immediately.
 */
export async function mockSignedInUser(page: Page): Promise<void> {
  // 1. Block all Firebase Auth token-validation requests
  await page.route('**/securetoken.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-access-token',
        token_type: 'Bearer',
        expires_in: '3600',
        refresh_token: 'fake-refresh-token',
      }),
    });
  });

  await page.route('**/identitytoolkit.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [
          {
            localId: MOCK_USER.uid,
            email: MOCK_USER.email,
            displayName: MOCK_USER.displayName,
            photoUrl: MOCK_USER.photoURL,
            emailVerified: true,
          },
        ],
      }),
    });
  });

  // 2. Pre-populate Firebase's IndexedDB auth store before the page JS runs.
  //    The Firebase Auth SDK reads this and restores the user session without
  //    making a network call to Google.
  await page.addInitScript(
    ({ apiKey, appName, user }) => {
      const dbKey = `firebase:authUser:${apiKey}:${appName}`;
      const persistedUser = {
        uid: user.uid,
        email: user.email,
        emailVerified: true,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: false,
        stsTokenManager: {
          refreshToken: 'fake-refresh-token',
          accessToken: 'fake-access-token',
          expirationTime: Date.now() + 3600 * 1000,
        },
        createdAt: '1700000000000',
        lastLoginAt: '1700000000000',
        apiKey,
        appName,
      };

      const openRequest = indexedDB.open('firebaseLocalStorageDb', 1);
      openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
        }
      };
      openRequest.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction('firebaseLocalStorage', 'readwrite');
        tx.objectStore('firebaseLocalStorage').put({ fbase_key: dbKey, value: persistedUser });
      };
    },
    { apiKey: FIREBASE_API_KEY, appName: FIREBASE_APP_NAME, user: MOCK_USER },
  );

  // 3. Block Firestore network calls — the leaderboard uses separate injection
  await interceptFirestoreBlocking(page);
}

/**
 * Inject Firebase stubs with no signed-in user (anonymous / logged-out state).
 *
 * Playwright creates a fresh browser context per test, so IndexedDB is always
 * empty — no need to clear it.  We just block auth network calls to prevent
 * real sign-in attempts and avoid console noise.
 */
export async function mockSignedOutUser(page: Page): Promise<void> {
  // Block token-refresh calls (no-op: no stored user means none should happen)
  await page.route('**/securetoken.googleapis.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/identitytoolkit.googleapis.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await interceptFirestoreBlocking(page);
}

/**
 * Block Firestore WebChannel requests to prevent real network calls.
 * We drop all Firestore requests (except writes) so the SDK stays in
 * a network-error state. The test then uses injectLeaderboardEntries()
 * to set the service state directly, bypassing Firestore entirely.
 */
async function interceptFirestoreBlocking(page: Page): Promise<void> {
  await page.route('**/firestore.googleapis.com/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/Listen/channel')) {
      // Abort WebChannel requests — prevents infinite SDK retry loops
      // that can freeze the browser context when tests run in parallel
      await route.abort('connectionfailed');
      return;
    }

    // Accept write operations (setDoc saves)
    if (['PATCH', 'POST'].includes(method)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    await route.abort('connectionfailed');
  });
}

// ---------------------------------------------------------------------------
// Firestore stub responses for leaderboard with data
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  rounds: Record<number, { team: string; flag: string }>;
  eliminated: boolean;
}

/**
 * Inject leaderboard entries directly into the Angular LeaderboardService
 * signals after the page has loaded.  This bypasses the Firestore WebChannel
 * protocol entirely and is the most reliable way to test leaderboard UI.
 *
 * Call this AFTER app.goto() and AFTER app.clickTab('leaderboard').
 * Pass entries sorted as the test expects (the service sorts by pick count desc).
 */
export async function injectLeaderboardEntries(
  page: Page,
  entries: LeaderboardEntry[],
): Promise<void> {
  // Sort entries the same way the service does: active first, then by pick count desc
  const sorted = [...entries].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return Object.keys(b.rounds ?? {}).length - Object.keys(a.rounds ?? {}).length;
  });

  await page.waitForFunction(() => !!(window as any).ng?.getComponent);

  await page.evaluate((sortedEntries) => {
    const ng = (window as any).ng;
    const appRoot = document.querySelector('app-root');
    if (!appRoot) return;
    const comp = ng.getComponent(appRoot);
    if (!comp?.leaderboardService) return;
    comp.leaderboardService.entries.set(sortedEntries);
    comp.leaderboardService.loading.set(false);
    comp.leaderboardService.error.set(null);
    ng.applyChanges(appRoot);
  }, sorted);
}

/**
 * Inject an error state into the LeaderboardService signals.
 */
export async function injectLeaderboardError(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as any).ng?.getComponent);

  await page.evaluate(() => {
    const ng = (window as any).ng;
    const appRoot = document.querySelector('app-root');
    if (!appRoot) return;
    const comp = ng.getComponent(appRoot);
    if (!comp?.leaderboardService) return;
    comp.leaderboardService.loading.set(false);
    comp.leaderboardService.entries.set([]);
    comp.leaderboardService.error.set('Could not load leaderboard. Check your connection and try again.');
    ng.applyChanges(appRoot);
  });
}

/**
 * Wire up Firestore to return a populated leaderboard response.
 * @deprecated Use injectLeaderboardEntries() instead — it's more reliable.
 * Kept for backwards compatibility.
 */
export async function mockLeaderboardWithEntries(
  page: Page,
  entries: LeaderboardEntry[],
): Promise<void> {
  // Store entries for later injection (called after page loads)
  (page as any).__leaderboardEntries = entries;
}

/** Minimal Firestore REST field encoding */
function firestoreFields(entry: LeaderboardEntry): Record<string, unknown> {
  const roundsFields: Record<string, unknown> = {};
  for (const [round, pick] of Object.entries(entry.rounds)) {
    roundsFields[round] = {
      mapValue: {
        fields: {
          team: { stringValue: pick.team },
          flag: { stringValue: pick.flag },
        },
      },
    };
  }

  return {
    uid: { stringValue: entry.uid },
    displayName: { stringValue: entry.displayName },
    photoURL: { stringValue: entry.photoURL },
    eliminated: { booleanValue: entry.eliminated },
    rounds: { mapValue: { fields: roundsFields } },
  };
}

// ---------------------------------------------------------------------------
// Firestore mock returning a 500 error (for leaderboard error state)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use injectLeaderboardError() instead.
 * Kept for backwards compatibility.
 */
export async function mockFirestoreError(page: Page): Promise<void> {
  // Store error state for later injection
  (page as any).__leaderboardError = true;
}
