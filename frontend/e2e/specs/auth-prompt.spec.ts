/**
 * Auth prompt — E2E tests
 *
 * Verifies that:
 *  • My Picks tab shows a "Sign in" CTA when the user is not logged in
 *  • The auth prompt heading and button text are correct
 *  • My Picks tab shows the picks grid (not the auth prompt) when signed in
 *  • Header shows sign-in button when logged out
 *  • Header shows user name and sign-out button when logged in
 *
 * Firebase Auth is fully mocked — no real Google OAuth occurs.
 */

import { test, expect } from '@playwright/test';
import { AppPage } from '../pages/app.page';
import { mockSignedOutUser, mockSignedInUser, MOCK_USER } from '../utils/firebase-mocks';

// ---------------------------------------------------------------------------
// Logged-out state
// ---------------------------------------------------------------------------

test.describe('Auth prompt — logged out', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedOutUser(page);
    app = new AppPage(page);
    await app.goto('/');
  });

  test('header shows "Sign in" button when user is not logged in', async () => {
    await app.expectVisible(app.headerSignInButton);
  });

  test('header does NOT show a user name when logged out', async () => {
    await app.expectHidden(app.userNameLabel);
  });

  test('header does NOT show the sign-out button when logged out', async () => {
    await app.expectHidden(app.signOutButton);
  });

  test('My Picks tab shows auth prompt when not signed in', async () => {
    await app.clickTab('picks');

    await app.expectVisible(app.authPrompt);
  });

  test('auth prompt has the correct heading text', async () => {
    await app.clickTab('picks');

    await app.expectVisible(app.authPromptHeading);
    await app.expectText(app.authPromptHeading, 'Sign in to track your picks');
  });

  test('auth prompt has a "Sign in with Google" button', async () => {
    await app.clickTab('picks');

    await app.expectVisible(app.signInWithGoogleButton);
  });

  test('auth prompt does NOT show the picks grid', async () => {
    await app.clickTab('picks');

    const picksGrid = app.page.locator('.my-picks-grid');
    await expect(picksGrid).toBeHidden();
  });

  test('auth prompt shows the lock icon', async () => {
    await app.clickTab('picks');

    // The icon is rendered as a text node inside .auth-prompt-icon
    const iconLocator = app.page.locator('.auth-prompt-icon');
    await expect(iconLocator).toBeVisible();
  });

  test('auth prompt body text mentions "Sign in with Google"', async () => {
    await app.clickTab('picks');

    const bodyText = app.page.locator('.auth-prompt p');
    await expect(bodyText).toContainText('Sign in with Google');
  });
});

// ---------------------------------------------------------------------------
// Logged-in state
// ---------------------------------------------------------------------------

test.describe('Auth prompt — logged in', () => {
  let app: AppPage;

  test.beforeEach(async ({ page }) => {
    await mockSignedInUser(page);
    app = new AppPage(page);
    await app.goto('/');
  });

  test('header shows user display name when signed in', async () => {
    // The Angular app reads authService.user() signal which is driven by
    // onAuthStateChanged; our mock injects the user before page load.
    await app.expectVisible(app.userNameLabel);
    await app.expectText(app.userNameLabel, MOCK_USER.displayName);
  });

  test('header shows sign-out button when signed in', async () => {
    await app.expectVisible(app.signOutButton);
  });

  test('header does NOT show the sign-in button when signed in', async () => {
    await app.expectHidden(app.headerSignInButton);
  });

  test('My Picks tab shows the picks grid when signed in', async () => {
    await app.clickTab('picks');

    const picksGrid = app.page.locator('.my-picks-grid');
    await expect(picksGrid).toBeVisible();
  });

  test('auth prompt is NOT shown when signed in', async () => {
    await app.clickTab('picks');

    await app.expectHidden(app.authPrompt);
  });

  test('picks grid shows 8 round cards (one per round)', async () => {
    await app.clickTab('picks');

    // The app renders a card for each of the 8 rounds
    const pickCards = app.page.locator('.my-pick-card');
    await expect(pickCards).toHaveCount(8);
  });

  test('each round card shows "No pick yet" when no picks have been made', async () => {
    await app.clickTab('picks');

    const emptyLabels = app.page.locator('.pick-empty');
    // All 8 rounds should show "No pick yet"
    await expect(emptyLabels).toHaveCount(8);
  });
});
