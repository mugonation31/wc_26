/**
 * Leaderboard tab — E2E tests
 *
 * Verifies that:
 *  1. The Leaderboard tab loads when clicked
 *  2. "No players yet" is shown when there are no leaderboard entries
 *  3. The leaderboard table renders rows when entries are injected
 *  4. Player rank, name, pick count, and status are displayed
 *  5. An error message is shown when the leaderboard service has an error
 *
 * Leaderboard data is injected directly into Angular's LeaderboardService
 * signals via injectLeaderboardEntries() / injectLeaderboardError(), bypassing
 * the Firestore WebChannel protocol entirely.
 */

import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import {
  mockSignedOutUser,
  mockSignedInUser,
  injectLeaderboardEntries,
  injectLeaderboardError,
  MOCK_USER,
  LeaderboardEntry,
} from '../utils/firebase-mocks';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    uid: 'uid-alice',
    displayName: 'Alice Smith',
    photoURL: '',
    rounds: {
      1: { team: 'Germany', flag: '🇩🇪' },
      2: { team: 'Brazil', flag: '🇧🇷' },
      3: { team: 'Switzerland', flag: '🇨🇭' },
    },
    eliminated: false,
  },
  {
    uid: 'uid-bob',
    displayName: 'Bob Jones',
    photoURL: '',
    rounds: {
      1: { team: 'Canada', flag: '🇨🇦' },
    },
    eliminated: true,
  },
];

// ---------------------------------------------------------------------------
// Empty leaderboard
// ---------------------------------------------------------------------------

test.describe('Leaderboard — empty state', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
    // Click Leaderboard tab to trigger load()
    await app.clickTab('leaderboard');
    // Inject the empty state directly so loading resolves immediately
    await injectLeaderboardEntries(page, []);
  });

  test('Leaderboard tab is reachable and shows the Leaderboard heading', async () => {
    await app.expectVisible(app.leaderboardContent);
    const heading = app.page.getByRole('heading', { name: /Leaderboard/ });
    await expect(heading).toBeVisible();
  });

  test('shows "No players yet" when no entries exist', async () => {
    await app.expectVisible(app.leaderboardEmpty);
    await app.expectText(app.leaderboardEmpty, /No players yet/);
  });

  test('does NOT show the leaderboard table when there are no entries', async () => {
    await app.expectHidden(app.leaderboardTable);
  });

  test('does NOT show a loading spinner after data has loaded', async () => {
    await app.expectHidden(app.leaderboardLoading);
  });

  test('does NOT show an error when Firestore succeeds with empty results', async () => {
    await app.expectHidden(app.leaderboardError);
  });

  test('leaderboard subtitle mentions "Last one standing wins"', async () => {
    const subtitle = app.page.locator('.section-title p').filter({ hasText: /Last one standing/ });
    await expect(subtitle).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Leaderboard with data
// ---------------------------------------------------------------------------

test.describe('Leaderboard — with entries', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
    await app.clickTab('leaderboard');
    // Inject leaderboard data directly into Angular signals
    await injectLeaderboardEntries(page, LEADERBOARD_ENTRIES);
  });

  test('shows the leaderboard table when entries are injected', async () => {
    await app.expectVisible(app.leaderboardTable);
  });

  test('renders a row for each player', async () => {
    await expect(app.leaderboardRows).toHaveCount(LEADERBOARD_ENTRIES.length);
  });

  test('first row shows the player with the most picks (Alice, 3 picks)', async () => {
    // Entries are sorted by pick count desc — Alice has 3, Bob has 1
    const firstRow = app.leaderboardRows.first();
    await expect(firstRow).toContainText('Alice Smith');
  });

  test('second row shows the player with fewer picks (Bob, 1 pick)', async () => {
    const secondRow = app.leaderboardRows.nth(1);
    await expect(secondRow).toContainText('Bob Jones');
  });

  test('pick count column shows the correct number for each player', async () => {
    // Alice: 3 picks → "3/8", Bob: 1 pick → "1/8"
    const firstRow = app.leaderboardRows.first();
    await expect(firstRow.locator('.lb-col-rounds')).toContainText('3/8');

    const secondRow = app.leaderboardRows.nth(1);
    await expect(secondRow.locator('.lb-col-rounds')).toContainText('1/8');
  });

  test('active player shows "Active" status', async () => {
    const firstRow = app.leaderboardRows.first();
    await expect(firstRow.locator('.status-alive')).toBeVisible();
    await expect(firstRow.locator('.status-alive')).toContainText('Active');
  });

  test('eliminated player shows "Eliminated" status', async () => {
    const secondRow = app.leaderboardRows.nth(1);
    await expect(secondRow.locator('.status-out')).toBeVisible();
    await expect(secondRow.locator('.status-out')).toContainText('Eliminated');
  });

  test('leaderboard table header row is visible', async () => {
    const headerRow = app.page.locator('.lb-header-row');
    await expect(headerRow).toBeVisible();
    await expect(headerRow).toContainText('Player');
    await expect(headerRow).toContainText('Picks');
    await expect(headerRow).toContainText('Status');
  });

  test('does NOT show "No players yet" when entries exist', async () => {
    await app.expectHidden(app.leaderboardEmpty);
  });

  test('does NOT show an error when data loads successfully', async () => {
    await app.expectHidden(app.leaderboardError);
  });
});

// ---------------------------------------------------------------------------
// Leaderboard — current user row highlighted
// ---------------------------------------------------------------------------

test.describe('Leaderboard — current user highlighted', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedInUser(page);
    app = new AppPage(page);
    await app.goto('/');
    await page.waitForTimeout(3000); // Wait for auth to settle
    await app.clickTab('leaderboard');

    // Add the current MOCK_USER to the leaderboard data
    const entries: LeaderboardEntry[] = [
      {
        uid: MOCK_USER.uid,
        displayName: MOCK_USER.displayName,
        photoURL: MOCK_USER.photoURL,
        rounds: { 1: { team: 'Germany', flag: '🇩🇪' } },
        eliminated: false,
      },
      ...LEADERBOARD_ENTRIES,
    ];
    await injectLeaderboardEntries(page, entries);
  });

  test('the current user row has the lb-row-me highlight class', async () => {
    const myRow = app.page.locator('.lb-row-me');
    await expect(myRow).toBeVisible();
    await expect(myRow).toContainText(MOCK_USER.displayName);
  });
});

// ---------------------------------------------------------------------------
// Leaderboard — error state
// ---------------------------------------------------------------------------

test.describe('Leaderboard — error state', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
    await app.clickTab('leaderboard');
    // Inject an error state into the leaderboard service
    await injectLeaderboardError(page);
  });

  test('shows an error message when the leaderboard service errors', async () => {
    await app.expectVisible(app.leaderboardError);
    await app.expectText(app.leaderboardError, /Could not load leaderboard/);
  });

  test('does NOT show the leaderboard table when there is an error', async () => {
    await app.expectHidden(app.leaderboardTable);
  });

  test('does NOT show "No players yet" when there is an error', async () => {
    await app.expectHidden(app.leaderboardEmpty);
  });
});
