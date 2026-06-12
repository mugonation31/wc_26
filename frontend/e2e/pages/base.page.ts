import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage
 *
 * Provides shared navigation, assertion helpers, and waiting utilities
 * that all page objects extend.  Never put selectors in test specs —
 * always go through a page object.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /** Navigate to the app root and wait for Angular to bootstrap. */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    // Wait for Angular's app-root to be present
    await this.page.locator('app-root').waitFor({ state: 'attached' });
    // Wait for Firebase Auth loading to complete — the header-auth div is only
    // rendered when authService.loading() === false (via *ngIf).
    await this.page.locator('.header-auth').waitFor({ state: 'attached', timeout: 10_000 });
  }

  // ---------------------------------------------------------------------------
  // Common assertions
  // ---------------------------------------------------------------------------

  /** Assert the page title matches the expected string. */
  async expectTitle(expected: string): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }

  /** Assert a locator is visible. */
  async expectVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  /** Assert a locator is NOT visible (hidden or absent). */
  async expectHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
  }

  /** Assert a locator contains text. */
  async expectText(locator: Locator, text: string | RegExp): Promise<void> {
    await expect(locator).toContainText(text);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Take a named screenshot for visual reference (stored in test-results/).
   * Does not assert anything — purely informational.
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  }
}
