import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * AppPage — Page Object for the WC26 Last Man Standing single-page app.
 *
 * All selectors live here.  Test specs only call methods on this object.
 *
 * Selector strategy (in priority order):
 *  1. getByRole()  — most resilient, semantically meaningful
 *  2. getByText()  — for unique visible text that won't change often
 *  3. CSS class    — used only when no semantic selector exists, documented inline
 *
 * Note: the app template does not use data-testid attributes. Where a CSS
 * class is used, a comment explains why and suggests adding data-testid if
 * the selector proves brittle.
 */
export class AppPage extends BasePage {
  // ---------------------------------------------------------------------------
  // Header elements
  // ---------------------------------------------------------------------------

  /** The main page heading "WC 2026 · Final One Standing" */
  readonly heading: Locator;

  /** Sign-in button in the header (shown when logged out) */
  readonly headerSignInButton: Locator;

  /** User display name shown when signed in */
  readonly userNameLabel: Locator;

  /** Sign-out button shown when signed in */
  readonly signOutButton: Locator;

  // ---------------------------------------------------------------------------
  // Tab navigation buttons
  // ---------------------------------------------------------------------------

  /** "How to Play" tab (active by default) */
  readonly rulesTab: Locator;

  /** "Predictions" tab */
  readonly predictionsTab: Locator;

  /** "Strategy" tab */
  readonly strategyTab: Locator;

  /** "My Picks" tab */
  readonly myPicksTab: Locator;

  /** "Leaderboard" tab */
  readonly leaderboardTab: Locator;

  // ---------------------------------------------------------------------------
  // Tab content sections
  // ---------------------------------------------------------------------------

  /**
   * Rules (How to Play) content section.
   * Uses CSS class because the element has no ARIA role.
   * TODO: add data-testid="tab-rules" to the <div class="content"> if selector breaks.
   */
  readonly rulesContent: Locator;

  /**
   * Predictions content section.
   * TODO: add data-testid="tab-predictions"
   */
  readonly predictionsContent: Locator;

  /**
   * Strategy content section.
   * TODO: add data-testid="tab-strategy"
   */
  readonly strategyContent: Locator;

  /**
   * My Picks content section.
   * TODO: add data-testid="tab-picks"
   */
  readonly myPicksContent: Locator;

  /**
   * Leaderboard content section.
   * TODO: add data-testid="tab-leaderboard"
   */
  readonly leaderboardContent: Locator;

  // ---------------------------------------------------------------------------
  // Group selector (inside Predictions tab)
  // ---------------------------------------------------------------------------

  /** Group A button */
  readonly groupAButton: Locator;
  readonly groupBButton: Locator;
  readonly groupCButton: Locator;
  readonly groupDButton: Locator;
  readonly groupEButton: Locator;
  readonly groupFButton: Locator;

  // ---------------------------------------------------------------------------
  // Group header labels (visible after selecting a group)
  // ---------------------------------------------------------------------------

  /** The coloured "GROUP X" label inside the group header */
  groupLabel(groupId: string): Locator {
    return this.page.locator('.group-label', { hasText: `GROUP ${groupId}` });
  }

  // ---------------------------------------------------------------------------
  // Match cards
  // ---------------------------------------------------------------------------

  /**
   * All match cards currently rendered (may span multiple groups, but only
   * the active group's cards are visible because Angular uses [hidden]).
   * The visible match cards are those NOT inside a [hidden] container.
   */
  get visibleMatchCards(): Locator {
    // Match cards inside a container that is NOT hidden
    return this.page
      .locator('[ng-reflect-hidden="false"] .match-card, .matches-container .match-card')
      .filter({ has: this.page.locator(':visible') });
  }

  /**
   * Match cards that have the LMS highlight border (lmsPick: true).
   * CSS class used because there is no semantic role for "LMS highlighted".
   * TODO: add data-testid="lms-pick-card" in the template if selector breaks.
   */
  get lmsHighlightedCards(): Locator {
    return this.page.locator('.match-card.lms-highlighted');
  }

  /** The "Sign in to save this pick" button inside an LMS card (shown when logged out) */
  get signInToSavePickButton(): Locator {
    // Using getByRole + name for resilience
    return this.page.getByRole('button', { name: 'Sign in to save this pick' });
  }

  /** The "⭐ Pick … — Round …" button inside an LMS card (shown when logged in) */
  pickButtonInCard(cardLocator: Locator): Locator {
    return cardLocator.locator('.pick-btn');
  }

  // ---------------------------------------------------------------------------
  // Auth prompt in My Picks tab
  // ---------------------------------------------------------------------------

  /** The auth prompt container shown on My Picks tab when not signed in */
  readonly authPrompt: Locator;

  /** "Sign in with Google" large button inside the My Picks auth prompt */
  readonly signInWithGoogleButton: Locator;

  /** "Sign in to track your picks" heading inside the auth prompt */
  readonly authPromptHeading: Locator;

  // ---------------------------------------------------------------------------
  // Leaderboard elements
  // ---------------------------------------------------------------------------

  /** Loading indicator */
  readonly leaderboardLoading: Locator;

  /** "No players yet" empty state message */
  readonly leaderboardEmpty: Locator;

  /** Error message */
  readonly leaderboardError: Locator;

  /** Leaderboard table (shown when entries exist) */
  readonly leaderboardTable: Locator;

  /** All leaderboard player rows */
  get leaderboardRows(): Locator {
    return this.page.locator('.lb-row');
  }

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  constructor(page: Page) {
    super(page);

    // Header
    this.heading = page.getByRole('heading', { name: 'WC 2026 · Final One Standing' });
    this.headerSignInButton = page.locator('.header-auth').getByRole('button', { name: /Sign in/ });
    this.userNameLabel = page.locator('.user-name');
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });

    // Tabs — using getByRole('button') + name because they ARE buttons
    this.rulesTab = page.getByRole('button', { name: /How to Play/ });
    this.predictionsTab = page.getByRole('button', { name: /Predictions/ });
    this.strategyTab = page.getByRole('button', { name: /Strategy/ });
    this.myPicksTab = page.getByRole('button', { name: /My Picks/ });
    this.leaderboardTab = page.getByRole('button', { name: /Leaderboard/ });

    // Content sections — identified by unique heading text inside each section.
    // This is more resilient than relying on the .content CSS class alone.
    this.rulesContent = page.locator('.content', {
      has: page.getByRole('heading', { name: /How Final One Standing Works/ }),
    });
    this.predictionsContent = page.locator('.content', {
      has: page.getByRole('heading', { name: /Group Stage Predictions/ }),
    });
    this.strategyContent = page.locator('.content', {
      has: page.getByRole('heading', { name: /LMS Strategy Guide/ }),
    });
    this.myPicksContent = page.locator('.content', {
      has: page.locator('.auth-prompt, .my-picks-grid'),
    });
    this.leaderboardContent = page.locator('.content', {
      has: page.getByRole('heading', { name: /Leaderboard/ }),
    });

    // Group selector buttons — using text content "Group\nX"
    // The buttons contain two child spans: "Group" label + letter ID.
    // getByRole('button', { name: /Group A/ }) matches the accessible name.
    this.groupAButton = page.getByRole('button', { name: /Group[\s\S]*A/ }).first();
    this.groupBButton = page.getByRole('button', { name: /Group[\s\S]*B/ }).first();
    this.groupCButton = page.getByRole('button', { name: /Group[\s\S]*C/ }).first();
    this.groupDButton = page.getByRole('button', { name: /Group[\s\S]*D/ }).first();
    this.groupEButton = page.getByRole('button', { name: /Group[\s\S]*E/ }).first();
    this.groupFButton = page.getByRole('button', { name: /Group[\s\S]*F/ }).first();

    // Auth prompt
    this.authPrompt = page.locator('.auth-prompt');
    this.signInWithGoogleButton = page.getByRole('button', { name: /Sign in with Google/ });
    this.authPromptHeading = page.getByRole('heading', {
      name: /Sign in to track your picks/,
    });

    // Leaderboard
    this.leaderboardLoading = page.locator('.lb-loading');
    this.leaderboardEmpty = page.locator('.lb-empty');
    this.leaderboardError = page.locator('.lb-error');
    this.leaderboardTable = page.locator('.lb-table');
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Click a tab and wait for its content section to become visible. */
  async clickTab(
    tab: 'rules' | 'predictions' | 'strategy' | 'picks' | 'leaderboard',
  ): Promise<void> {
    const tabMap = {
      rules: this.rulesTab,
      predictions: this.predictionsTab,
      strategy: this.strategyTab,
      picks: this.myPicksTab,
      leaderboard: this.leaderboardTab,
    };
    await tabMap[tab].click();
  }

  /** Click a group selector button. */
  async selectGroup(groupId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'): Promise<void> {
    const buttonMap = {
      A: this.groupAButton,
      B: this.groupBButton,
      C: this.groupCButton,
      D: this.groupDButton,
      E: this.groupEButton,
      F: this.groupFButton,
    };
    await buttonMap[groupId].click();
  }

  // ---------------------------------------------------------------------------
  // Assertion helpers
  // ---------------------------------------------------------------------------

  /**
   * Assert the active tab button has the 'active' CSS class.
   * The app uses [class.active]="activeTab==='...'" binding.
   */
  async expectTabActive(
    tab: 'rules' | 'predictions' | 'strategy' | 'picks' | 'leaderboard',
  ): Promise<void> {
    const tabMap = {
      rules: this.rulesTab,
      predictions: this.predictionsTab,
      strategy: this.strategyTab,
      picks: this.myPicksTab,
      leaderboard: this.leaderboardTab,
    };
    await expect(tabMap[tab]).toHaveClass(/active/);
  }

  /**
   * Assert the active group button has the 'active' CSS class.
   */
  async expectGroupActive(groupId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'): Promise<void> {
    const buttonMap = {
      A: this.groupAButton,
      B: this.groupBButton,
      C: this.groupCButton,
      D: this.groupDButton,
      E: this.groupEButton,
      F: this.groupFButton,
    };
    await expect(buttonMap[groupId]).toHaveClass(/active/);
  }

  /**
   * Assert that the group header for the given group ID is visible.
   * Uses the .group-label text as the anchor.
   */
  async expectGroupHeaderVisible(groupId: string): Promise<void> {
    await expect(this.groupLabel(groupId)).toBeVisible();
  }
}
