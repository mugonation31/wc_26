/**
 * Tab navigation — E2E tests
 *
 * Verifies that clicking each tab in the nav bar:
 *  • Marks that tab as active (CSS class)
 *  • Shows the correct content section
 *  • Hides the previously active content section
 *
 * Firebase is mocked (no signed-in user needed for these navigation tests).
 */

import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import { mockSignedOutUser } from '../utils/firebase-mocks';

test.describe('Tab navigation', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
  });

  // -------------------------------------------------------------------------
  // Default state
  // -------------------------------------------------------------------------

  test('renders the app header with the correct title', async () => {
    await expect(app.page).toHaveTitle('WC 2026 · Final One Standing');
    await expect(app.heading).toBeVisible();
  });

  test('shows the How-to-Play tab as active on first load', async () => {
    await app.expectTabActive('rules');
  });

  test('shows the rules content section on first load', async () => {
    await app.expectVisible(app.rulesContent);
  });

  test('hides all other content sections on first load', async () => {
    await app.expectHidden(app.predictionsContent);
    await app.expectHidden(app.strategyContent);
    await app.expectHidden(app.myPicksContent);
    await app.expectHidden(app.leaderboardContent);
  });

  // -------------------------------------------------------------------------
  // Predictions tab
  // -------------------------------------------------------------------------

  test('clicking Predictions tab activates it and shows predictions content', async () => {
    await app.clickTab('predictions');

    await app.expectTabActive('predictions');
    await app.expectVisible(app.predictionsContent);
    await app.expectHidden(app.rulesContent);
  });

  test('Predictions tab content shows the group selector', async () => {
    await app.clickTab('predictions');

    // Group selector should have buttons A through F
    await app.expectVisible(app.groupAButton);
    await app.expectVisible(app.groupFButton);
  });

  // -------------------------------------------------------------------------
  // Strategy tab
  // -------------------------------------------------------------------------

  test('clicking Strategy tab activates it and shows strategy content', async () => {
    await app.clickTab('strategy');

    await app.expectTabActive('strategy');
    await app.expectVisible(app.strategyContent);
    await app.expectHidden(app.rulesContent);
  });

  test('Strategy tab shows the LMS Strategy Guide heading', async () => {
    await app.clickTab('strategy');

    await app.expectText(app.strategyContent, 'LMS Strategy Guide');
  });

  // -------------------------------------------------------------------------
  // My Picks tab
  // -------------------------------------------------------------------------

  test('clicking My Picks tab activates it and shows picks content', async () => {
    await app.clickTab('picks');

    await app.expectTabActive('picks');
    await app.expectVisible(app.myPicksContent);
    await app.expectHidden(app.rulesContent);
  });

  // -------------------------------------------------------------------------
  // Leaderboard tab
  // -------------------------------------------------------------------------

  test('clicking Leaderboard tab activates it and shows leaderboard content', async () => {
    await app.clickTab('leaderboard');

    await app.expectTabActive('leaderboard');
    await app.expectVisible(app.leaderboardContent);
    await app.expectHidden(app.rulesContent);
  });

  // -------------------------------------------------------------------------
  // Round-trip navigation
  // -------------------------------------------------------------------------

  test('can navigate across all five tabs sequentially without errors', async () => {
    const tabs: Array<'rules' | 'predictions' | 'strategy' | 'picks' | 'leaderboard'> = [
      'predictions',
      'strategy',
      'picks',
      'leaderboard',
      'rules',
    ];

    for (const tab of tabs) {
      await app.clickTab(tab);
      await app.expectTabActive(tab);
    }

    // End back on rules — it should be the only visible content section
    await app.expectVisible(app.rulesContent);
    await app.expectHidden(app.predictionsContent);
  });

  test('only one content section is visible at a time', async () => {
    await app.clickTab('strategy');

    // Counts the number of .content elements that are visible in the DOM
    // Angular uses *ngIf so only one should be rendered at all.
    const visibleContentSections = await app.page.locator('.content:visible').count();
    expect(visibleContentSections).toBe(1);
  });
});
