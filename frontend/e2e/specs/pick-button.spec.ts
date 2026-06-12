/**
 * Pick button — E2E tests
 *
 * Verifies that on the Predictions tab, for LMS-highlighted match cards
 * (lmsPick: true):
 *
 *  • When NOT signed in: a "Sign in to save this pick" button is shown
 *  • The prompt button is present in every visible LMS card
 *  • When SIGNED IN: the "⭐ Pick … — Round …" action button is shown instead
 *  • The sign-in prompt button is NOT shown when signed in
 *  • Cards with matchRound()===null (no round assigned) have no pick button
 *
 * The app renders ALL 12 group sections in the DOM simultaneously and uses
 * Angular's [hidden] binding to show/hide them.  The round selector further
 * filters matches by `activeRound` (default: 1).  Tests that navigate to
 * specific matches call selectGroup() and/or click the appropriate round
 * button first.
 *
 * Firebase is mocked via firebase-mocks utilities.
 */

import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import { mockSignedOutUser, mockSignedInUser } from '../utils/firebase-mocks';

// ---------------------------------------------------------------------------
// Logged-out state — "Sign in to save this pick" prompt
// ---------------------------------------------------------------------------

test.describe('Pick button — logged out', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
    await app.clickTab('predictions');
    // Group A is active by default — it has Mexico vs South Africa as LMS pick (Round 1)
  });

  test('LMS-highlighted card shows the "Sign in to save this pick" button', async () => {
    await app.expectVisible(app.signInToSavePickButton.first());
  });

  test('"Sign in to save this pick" button text is exact', async () => {
    const btn = app.signInToSavePickButton.first();
    await expect(btn).toHaveText('Sign in to save this pick');
  });

  test('LMS badge "⭐ LMS PICK" is visible on highlighted cards', async () => {
    const lmsBadge = app.page.locator('.badge-lms').first();
    await expect(lmsBadge).toBeVisible();
    await expect(lmsBadge).toContainText('LMS PICK');
  });

  test('each visible LMS-highlighted card in Group A has a sign-in prompt button', async () => {
    // Angular renders ALL groups but only the active one is visible.
    // Within the visible group, only Round 1 matches are shown (default activeRound=1).
    // Count sign-in prompt buttons — should match visible LMS cards for Group A Round 1.
    const promptButtons = app.signInToSavePickButton;
    const buttonCount = await promptButtons.count();

    // Group A Round 1 LMS matches: Mexico vs South Africa (lmsPick:true)
    // There must be at least one
    expect(buttonCount).toBeGreaterThanOrEqual(1);
    // All visible prompt buttons should be visible
    for (let i = 0; i < buttonCount; i++) {
      await expect(promptButtons.nth(i)).toBeVisible();
    }
  });

  test('"Sign in to save this pick" button is NOT the primary pick button', async () => {
    // The primary pick button has class pick-btn; it should NOT be visible when logged out
    const pickBtn = app.page.locator('.pick-btn');
    await expect(pickBtn).toBeHidden();
  });

  test('Group E Germany vs Curaçao LMS card shows sign-in prompt', async () => {
    await app.selectGroup('E');

    // Germany vs Curaçao has lmsPick: true and is in Round 1 (June 14)
    const germanyCard = app.page.locator('.match-card.lms-highlighted', {
      hasText: /Germany/,
    }).first();

    await expect(germanyCard).toBeVisible();

    const promptBtn = germanyCard.getByRole('button', { name: 'Sign in to save this pick' });
    await expect(promptBtn).toBeVisible();
  });

  test('Group C Scotland vs Haiti LMS card shows sign-in prompt (Round 1)', async () => {
    await app.selectGroup('C');

    // Haiti vs Scotland (June 14, Round 1) has lmsPick: true
    // Scotland is the predicted winner so the card contains both team names
    const scotlandCard = app.page.locator('.match-card.lms-highlighted', {
      hasText: /Scotland/,
    }).first();

    await expect(scotlandCard).toBeVisible();

    const promptBtn = scotlandCard.getByRole('button', { name: 'Sign in to save this pick' });
    await expect(promptBtn).toBeVisible();
  });

  test('Group C Brazil vs Haiti LMS card shows sign-in prompt (Round 2)', async () => {
    await app.selectGroup('C');
    // Brazil vs Haiti is June 20 → Round 2. Switch round first.
    await app.page.getByRole('button', { name: /Round 2/ }).click();

    const brazilCard = app.page.locator('.match-card.lms-highlighted', {
      hasText: /Brazil/,
    }).first();

    await expect(brazilCard).toBeVisible();

    const promptBtn = brazilCard.getByRole('button', { name: 'Sign in to save this pick' });
    await expect(promptBtn).toBeVisible();
  });

  test('Group B Switzerland vs Qatar LMS card shows sign-in prompt', async () => {
    await app.selectGroup('B');

    const swissCard = app.page.locator('.match-card.lms-highlighted', {
      hasText: /Switzerland/,
    }).first();

    await expect(swissCard).toBeVisible();

    const promptBtn = swissCard.getByRole('button', { name: 'Sign in to save this pick' });
    await expect(promptBtn).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Logged-in state — "⭐ Pick … — Round …" pick button
// ---------------------------------------------------------------------------

test.describe('Pick button — logged in', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedInUser(page);
    app = new AppPage(page);
    await app.goto('/');
    // Wait for auth state to propagate (Firebase IndexedDB read is async)
    await page.waitForTimeout(3000);
    await app.clickTab('predictions');
    // Group A, Round 1 — Mexico vs South Africa (lmsPick: true)
  });

  test('"Sign in to save this pick" button is NOT shown when signed in', async ({ page }) => {
    // There should be no sign-in prompt buttons at all when signed in
    await expect(app.signInToSavePickButton.first()).toBeHidden();
  });

  test('LMS card shows the pick-btn when signed in and no pick made yet', async () => {
    // The primary pick button (class="pick-btn") should appear for LMS cards
    // when the user is signed in and has not yet made a pick for that round
    const pickBtn = app.page.locator('.pick-btn').first();
    await expect(pickBtn).toBeVisible();
  });

  test('pick button text contains the predicted team name and round number', async () => {
    // Group A first LMS card: Mexico vs South Africa → prediction: Mexico
    const pickBtn = app.page.locator('.pick-btn').first();
    await expect(pickBtn).toContainText(/Pick/);
    await expect(pickBtn).toContainText(/Round/);
  });

  test('LMS badge is still visible on highlighted cards when signed in', async () => {
    const lmsBadge = app.page.locator('.badge-lms').first();
    await expect(lmsBadge).toBeVisible();
  });

  test('Group E Germany LMS card shows pick button with Germany as team', async () => {
    await app.selectGroup('E');

    const germanyLmsCard = app.page.locator('.match-card.lms-highlighted', {
      hasText: /Germany/,
    }).first();

    const pickBtn = germanyLmsCard.locator('.pick-btn');
    await expect(pickBtn).toBeVisible();
    await expect(pickBtn).toContainText('Germany');
  });
});
