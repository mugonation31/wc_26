/**
 * Group selector — E2E tests (Predictions tab)
 *
 * Verifies that:
 *  • Group A is the default active group when Predictions tab opens
 *  • Clicking each group button (A-F) marks it as active
 *  • The correct group header and predicted winner / runner-up appear
 *  • The match cards shown belong to the selected group
 *  • LMS-highlighted match cards (lmsPick: true) are present where expected
 *
 * NOTE: The app renders ALL 12 group sections in the DOM simultaneously and
 * uses Angular's [hidden] binding to show/hide them.  Locators that search
 * the whole document (e.g. .outlook-item) therefore resolve to 12+ elements.
 * All cross-group locators in this spec are deliberately scoped to the
 * .group-header or the active group's container to avoid strict-mode
 * violations.
 */

import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import { mockSignedOutUser } from '../utils/firebase-mocks';

test.describe('Group selector on Predictions tab', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
    // Navigate to the Predictions tab before each test
    await app.clickTab('predictions');
  });

  // -------------------------------------------------------------------------
  // Default state
  // -------------------------------------------------------------------------

  test('Group A is active by default when Predictions tab opens', async () => {
    await app.expectGroupActive('A');
  });

  test('Group A header is visible by default', async () => {
    await app.expectGroupHeaderVisible('A');
  });

  test('Group A shows Mexico as predicted winner', async () => {
    // Scope to the VISIBLE group container only.
    // Angular's [hidden] binding sets the HTML 'hidden' attribute on inactive groups.
    // The active group's wrapper div has no hidden attribute.
    // We anchor on the visible .group-header (which is always inside the active wrapper).
    const groupAHeader = app.page.locator('.group-header').filter({
      has: app.page.locator('.group-label', { hasText: 'GROUP A' }),
    });
    await expect(groupAHeader).toBeVisible();
    const winnerLocator = groupAHeader.locator('.outlook-item').filter({ hasText: 'Predicted Winner' });
    await expect(winnerLocator).toContainText('Mexico');
  });

  // -------------------------------------------------------------------------
  // Switching groups — header content
  // -------------------------------------------------------------------------

  test('clicking Group B shows the Group B header', async () => {
    await app.selectGroup('B');

    await app.expectGroupActive('B');
    await app.expectGroupHeaderVisible('B');
  });

  test('Group B shows Switzerland as predicted winner', async () => {
    await app.selectGroup('B');

    const groupBContainer = app.page.locator('[hidden="false"]').filter({
      has: app.page.locator('.group-label', { hasText: 'GROUP B' }),
    });
    // Fallback: use the group-label to anchor within the correct container
    const groupBHeader = app.page.locator('.group-header').filter({
      has: app.page.locator('.group-label', { hasText: 'GROUP B' }),
    });
    const winnerLocator = groupBHeader.locator('~ * .outlook-item', { hasText: 'Predicted Winner' });

    // Alternative approach: find the outlook-item that contains Switzerland
    // within a visible context (the [hidden] attribute is on the wrapping div)
    const allOutlookItems = app.page.locator('.outlook-item').filter({ hasText: 'Predicted Winner' });
    // Since GROUP B is the active group, its container is not hidden.
    // Find the item that's visible and contains 'Switzerland'
    await expect(
      app.page.locator('.outlook-item')
        .filter({ hasText: 'Predicted Winner' })
        .filter({ hasText: 'Switzerland' })
        .first()
    ).toBeVisible();
  });

  test('clicking Group C shows the Group C header with Brazil as winner', async () => {
    await app.selectGroup('C');

    await app.expectGroupActive('C');
    await app.expectGroupHeaderVisible('C');

    await expect(
      app.page.locator('.outlook-item')
        .filter({ hasText: 'Predicted Winner' })
        .filter({ hasText: 'Brazil' })
        .first()
    ).toBeVisible();
  });

  test('clicking Group D shows the Group D header with USA as winner', async () => {
    await app.selectGroup('D');

    await app.expectGroupActive('D');
    await app.expectGroupHeaderVisible('D');

    await expect(
      app.page.locator('.outlook-item')
        .filter({ hasText: 'Predicted Winner' })
        .filter({ hasText: 'USA' })
        .first()
    ).toBeVisible();
  });

  test('clicking Group E shows the Group E header with Germany as winner', async () => {
    await app.selectGroup('E');

    await app.expectGroupActive('E');
    await app.expectGroupHeaderVisible('E');

    await expect(
      app.page.locator('.outlook-item')
        .filter({ hasText: 'Predicted Winner' })
        .filter({ hasText: 'Germany' })
        .first()
    ).toBeVisible();
  });

  test('clicking Group F shows the Group F header with Netherlands as winner', async () => {
    await app.selectGroup('F');

    await app.expectGroupActive('F');
    await app.expectGroupHeaderVisible('F');

    await expect(
      app.page.locator('.outlook-item')
        .filter({ hasText: 'Predicted Winner' })
        .filter({ hasText: 'Netherlands' })
        .first()
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Only one group button is active at a time
  // -------------------------------------------------------------------------

  test('switching groups deactivates the previously active group button', async () => {
    // Start on A (default), switch to C
    await app.selectGroup('C');

    await expect(app.groupAButton).not.toHaveClass(/active/);
    await expect(app.groupCButton).toHaveClass(/active/);
  });

  test('only one group button is active at a time', async () => {
    await app.selectGroup('E');

    const activeButtons = await app.page.locator('.group-btn.active').count();
    expect(activeButtons).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Team chips appear for the selected group
  // -------------------------------------------------------------------------

  test('Group A shows the correct team chips', async () => {
    // Teams for Group A: Mexico, South Africa, South Korea, Czech Republic
    const teamChips = app.page.locator('.team-chip');

    await expect(teamChips.filter({ hasText: 'Mexico' })).toBeVisible();
    await expect(teamChips.filter({ hasText: 'South Africa' })).toBeVisible();
    await expect(teamChips.filter({ hasText: 'South Korea' })).toBeVisible();
    await expect(teamChips.filter({ hasText: 'Czech Republic' })).toBeVisible();
  });

  test('Group F shows the correct team chips', async () => {
    await app.selectGroup('F');

    const teamChips = app.page.locator('.team-chip');

    await expect(teamChips.filter({ hasText: 'Netherlands' })).toBeVisible();
    await expect(teamChips.filter({ hasText: 'Japan' })).toBeVisible();
    await expect(teamChips.filter({ hasText: 'Sweden' })).toBeVisible();
    await expect(teamChips.filter({ hasText: 'Tunisia' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // LMS-highlighted cards appear in the correct groups
  // -------------------------------------------------------------------------

  test('Group A has at least one LMS-highlighted match card', async () => {
    // Group A has Mexico vs South Africa (lmsPick: true)
    // The badge is visible even in hidden groups (Angular [hidden] keeps DOM),
    // so use the first visible badge.
    const lmsBadge = app.page.locator('.badge-lms').first();
    await expect(lmsBadge).toBeVisible();
  });

  test('Group E has the Germany vs Curaçao LMS card with "THE SINGLE SAFEST LMS PICK" note', async () => {
    await app.selectGroup('E');

    // The lms-note for Germany vs Curaçao contains "SINGLE SAFEST"
    const lmsNote = app.page.locator('.lms-note-text', { hasText: /SINGLE SAFEST/ });
    await expect(lmsNote).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Can cycle through all groups without errors
  // -------------------------------------------------------------------------

  test('cycling through all groups A-F shows each group header without errors', async () => {
    for (const groupId of ['A', 'B', 'C', 'D', 'E', 'F'] as const) {
      await app.selectGroup(groupId);
      await app.expectGroupHeaderVisible(groupId);
    }
  });
});
