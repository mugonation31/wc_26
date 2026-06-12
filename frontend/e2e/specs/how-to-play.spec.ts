/**
 * How to Play tab — E2E tests
 *
 * Verifies that:
 *  1. The How to Play tab is the active default tab on first load
 *  2. The "How Final One Standing Works" heading is visible
 *  3. Rule cards render (6 game rules)
 *  4. "The 8 Rounds" section heading is visible
 *  5. 8 round cards are rendered (one per tournament round)
 *  6. The Submission Deadline Rule alert box is visible
 *  7. Correct round names and number labels appear
 *
 * Firebase is mocked (no signed-in user needed for these static content tests).
 */

import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import { mockSignedOutUser } from '../utils/firebase-mocks';

test.describe('How to Play tab', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
    // How to Play is the default tab — no need to click it
  });

  // -------------------------------------------------------------------------
  // Default state
  // -------------------------------------------------------------------------

  test('How to Play tab is active by default', async () => {
    await app.expectTabActive('rules');
  });

  test('shows the "How Final One Standing Works" heading', async () => {
    await app.expectVisible(app.rulesContent);
    await expect(
      app.page.getByRole('heading', { name: /How Final One Standing Works/ })
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Rule cards
  // -------------------------------------------------------------------------

  test('shows 6 rule cards', async () => {
    const ruleCards = app.page.locator('.rule-card');
    await expect(ruleCards).toHaveCount(6);
  });

  test('rule card titles include all core rules', async () => {
    // Scope each check to within .rules-grid to avoid matching other page elements
    const rulesGrid = app.page.locator('.rules-grid');
    await expect(rulesGrid.getByText('Pick One Team Per Round')).toBeVisible();
    await expect(rulesGrid.getByText('No Repeats')).toBeVisible();
    await expect(rulesGrid.getByText(/One Strike/)).toBeVisible();
    await expect(rulesGrid.getByText(/Resets Available/)).toBeVisible();
    await expect(rulesGrid.getByText(/£250,000 Prize Pot/)).toBeVisible();
    await expect(rulesGrid.getByText(/Submit Before Kickoff/)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // The 8 Rounds section
  // -------------------------------------------------------------------------

  test('shows "The 8 Rounds" section heading', async () => {
    await expect(app.page.getByRole('heading', { name: /The 8 Rounds/ })).toBeVisible();
  });

  test('shows 8 round cards', async () => {
    const roundCards = app.page.locator('.round-card');
    await expect(roundCards).toHaveCount(8);
  });

  test('first round card shows "Round 1" and Group Stage name', async () => {
    const firstCard = app.page.locator('.round-card').first();
    await expect(firstCard.locator('.round-number')).toContainText('Round 1');
    await expect(firstCard.locator('.round-name')).toContainText('Group Stage');
  });

  test('last round card shows "Round 8" and Final name', async () => {
    const lastCard = app.page.locator('.round-card').last();
    await expect(lastCard.locator('.round-number')).toContainText('Round 8');
    await expect(lastCard.locator('.round-name')).toContainText('Final');
  });

  test('round dates are shown on round cards', async () => {
    // Round 1 should show June 11–16 dates
    const firstCard = app.page.locator('.round-card').first();
    await expect(firstCard.locator('.round-dates')).toContainText('June');
  });

  test('round tips are shown on round cards', async () => {
    // Each card has a tip starting with 💡
    const firstCard = app.page.locator('.round-card').first();
    await expect(firstCard.locator('.round-tip')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Submission Deadline Rule alert
  // -------------------------------------------------------------------------

  test('Submission Deadline Rule alert box is visible', async () => {
    const alertBox = app.page.locator('.alert-box');
    await expect(alertBox).toBeVisible();
  });

  test('alert box contains "Submission Deadline Rule" heading', async () => {
    await expect(app.page.locator('.alert-box').getByText('Submission Deadline Rule')).toBeVisible();
  });

  test('alert box mentions "auto-eliminate"', async () => {
    const alertBox = app.page.locator('.alert-box');
    await expect(alertBox).toContainText('auto-eliminate');
  });

  test('alert box warns to "Always submit early"', async () => {
    const alertBox = app.page.locator('.alert-box');
    await expect(alertBox).toContainText('Always submit early');
  });

  // -------------------------------------------------------------------------
  // Page title
  // -------------------------------------------------------------------------

  test('page title is "WC 2026 · Final One Standing"', async () => {
    await expect(app.page).toHaveTitle('WC 2026 · Final One Standing');
  });
});
