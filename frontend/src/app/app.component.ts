import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { PicksService, UserPicks } from './services/picks.service';
import { LeaderboardService } from './services/leaderboard.service';

interface Match {
  homeTeam: string; homeFlag: string;
  awayTeam: string; awayFlag: string;
  date: string; time: string; venue: string;
  prediction: string;
  confidence: 'elite' | 'high' | 'medium' | 'risky';
  confidenceScore: number;
  reasoning: string;
  lmsPick: boolean; lmsNote: string;
}

interface Group {
  id: string; color: string;
  teams: Array<{ name: string; flag: string }>;
  matches: Match[];
  groupWinner: string; groupRunnerUp: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="app">

  <!-- HEADER -->
  <header class="header">
    <div class="header-bg"></div>
    <div class="header-content">
      <div class="header-left">
        <div class="header-trophy">🏆</div>
        <div>
          <h1 class="header-title">WC 2026 · Final One Standing</h1>
          <p class="header-sub">Final One Standing — Complete Prediction Guide</p>
        </div>
      </div>
      <div class="header-right">
        <div class="wh-badge">
          <span class="wh-text">Mugov Dev Solutions</span>
          <span class="prize-badge">£250K Prize Pot</span>
        </div>
      </div>
      <div class="header-auth" *ngIf="!authService.loading()">
        <button *ngIf="!authService.user()" class="sign-in-btn" (click)="authService.signIn()">
          <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:middle;margin-right:6px"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in
        </button>
        <div *ngIf="authService.user()" class="user-info">
          <img class="user-avatar" [src]="authService.user()!.photoURL || ''" [alt]="authService.user()!.displayName || ''" (error)="hideImg($event)">
          <span class="user-name">{{ authService.user()!.displayName }}</span>
          <button class="sign-out-btn" (click)="authService.signOut()">Sign out</button>
        </div>
      </div>
    </div>
  </header>

  <!-- TABS -->
  <nav class="tabs">
    <button class="tab-btn" [class.active]="activeTab==='rules'" (click)="activeTab='rules'">
      <span class="tab-icon">📋</span> How to Play
    </button>
    <button class="tab-btn" [class.active]="activeTab==='predictions'" (click)="activeTab='predictions'">
      <span class="tab-icon">⚽</span> Predictions
    </button>
    <button class="tab-btn" [class.active]="activeTab==='strategy'" (click)="activeTab='strategy'">
      <span class="tab-icon">🎯</span> Strategy
    </button>
    <button class="tab-btn" [class.active]="activeTab==='picks'" (click)="onPicksTab()">
      <span class="tab-icon">📌</span> My Picks
    </button>
    <button class="tab-btn" [class.active]="activeTab==='leaderboard'" (click)="onLeaderboardTab()">
      <span class="tab-icon">🏅</span> Leaderboard
    </button>
  </nav>

  <!-- ═══════════════════════════════════════ HOW TO PLAY ═══════════════════════════════════════ -->
  <div class="content" *ngIf="activeTab==='rules'">
    <div class="section-title">
      <h2>📋 How Final One Standing Works</h2>
      <p>Final One Standing — World Cup 2026 prediction game. Pick wisely, survive the longest, win the pot.</p>
    </div>

    <div class="rules-grid">
      <div class="rule-card" *ngFor="let r of rules">
        <div class="rule-icon">{{ r.icon }}</div>
        <h3>{{ r.title }}</h3>
        <p>{{ r.text }}</p>
      </div>
    </div>

    <div class="section-title" style="margin-top:40px">
      <h2>📅 The 8 Rounds</h2>
      <p>WC2026 runs 8 rounds from Group Stage to the Final — make one pick each round.</p>
    </div>

    <div class="rounds-grid">
      <div class="round-card" *ngFor="let r of rounds; let i=index">
        <div class="round-number">Round {{ r.number }}</div>
        <div class="round-name">{{ r.name }}</div>
        <div class="round-dates">{{ r.dates }}</div>
        <div class="round-tip">💡 {{ r.tip }}</div>
      </div>
    </div>

    <div class="alert-box">
      <div class="alert-icon">⏰</div>
      <div>
        <strong>Submission Deadline Rule</strong>
        <p>Your pick must be submitted BEFORE your chosen team's match kicks off. Missing the deadline in a round counts as a pass — but Final One Standing may auto-eliminate you. Always submit early!</p>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════ PREDICTIONS ═══════════════════════════════════════ -->
  <div class="content" *ngIf="activeTab==='predictions'">
    <div class="section-title">
      <h2>⚽ Group Stage Predictions</h2>
      <p>Full fixture predictions for Groups A–F from your wall chart, with LMS pick recommendations and deadlines.</p>
    </div>

    <!-- Round selector -->
    <div class="round-selector">
      <button class="round-btn" *ngFor="let r of gsRounds"
              [class.active]="activeRound === r.num"
              (click)="activeRound = r.num">
        <span class="round-btn-num">{{ r.label }}</span>
        <span class="round-btn-dates">{{ r.dates }}</span>
      </button>
    </div>

    <!-- Group selector -->
    <div class="group-selector">
      <button
        *ngFor="let g of groups"
        class="group-btn"
        [class.active]="activeGroup===g.id"
        [style.--gcolor]="g.color"
        (click)="activeGroup=g.id">
        <span class="group-btn-label">Group</span>
        <span class="group-btn-id">{{ g.id }}</span>
      </button>
    </div>

    <!-- Group content -->
    <div *ngFor="let g of groups" [hidden]="activeGroup!==g.id">

      <!-- Group header -->
      <div class="group-header" [style.border-color]="g.color">
        <div class="group-title-row">
          <div class="group-label" [style.background]="g.color">GROUP {{ g.id }}</div>
          <div class="group-teams-chips">
            <span class="team-chip" *ngFor="let t of g.teams">{{ t.flag }} {{ t.name }}</span>
          </div>
        </div>
        <div class="group-outlook">
          <div class="outlook-item">
            <span class="outlook-label">Predicted Winner</span>
            <span class="outlook-value">{{ g.groupWinner }}</span>
          </div>
          <div class="outlook-divider"></div>
          <div class="outlook-item">
            <span class="outlook-label">Predicted Runner-up</span>
            <span class="outlook-value">{{ g.groupRunnerUp }}</span>
          </div>
        </div>
      </div>

      <!-- Matches -->
      <div class="matches-container">
        <div class="match-card" *ngFor="let m of getRoundMatches(g); let i=index" [class.lms-highlighted]="m.lmsPick">

          <div class="match-top-bar">
            <span class="match-num">Match {{ i + 1 }}</span>
            <div class="match-badges">
              <span *ngIf="m.lmsPick" class="badge badge-lms">⭐ LMS PICK</span>
              <span class="badge" [ngClass]="confBadgeClass(m.confidence)">{{ confLabel(m.confidence) }}</span>
            </div>
          </div>

          <div class="match-teams-row">
            <div class="match-team home-team">
              <span class="team-flag">{{ m.homeFlag }}</span>
              <span class="team-name" [class.predicted-winner]="m.prediction===m.homeTeam">{{ m.homeTeam }}</span>
              <span *ngIf="m.prediction===m.homeTeam" class="winner-arrow">◀ WIN</span>
            </div>
            <div class="vs-block">
              <div class="vs-text">VS</div>
            </div>
            <div class="match-team away-team">
              <span *ngIf="m.prediction===m.awayTeam" class="winner-arrow winner-arrow-right">WIN ▶</span>
              <span class="team-name" [class.predicted-winner]="m.prediction===m.awayTeam">{{ m.awayTeam }}</span>
              <span class="team-flag">{{ m.awayFlag }}</span>
            </div>
          </div>

          <div class="prediction-bar-row">
            <div class="pred-label">🎯 Prediction: <strong>{{ m.prediction }} WIN</strong></div>
            <div class="conf-bar-wrap">
              <div class="conf-bar">
                <div class="conf-fill" [style.width.%]="m.confidenceScore" [ngClass]="confFillClass(m.confidence)"></div>
              </div>
              <span class="conf-pct">{{ m.confidenceScore }}%</span>
            </div>
          </div>

          <div class="match-meta-row">
            <span class="meta-item">📅 {{ m.date }}</span>
            <span class="meta-item">🕐 {{ m.time }} local</span>
            <span class="meta-item">🏟️ {{ m.venue }}</span>
          </div>

          <div class="deadline-row">
            <span class="deadline-icon">⏰</span>
            <span class="deadline-label">Submission Deadline:</span>
            <span class="deadline-value">Before {{ m.time }} on {{ m.date }}</span>
          </div>

          <div class="reasoning-row">
            <div class="reasoning-text">💡 {{ m.reasoning }}</div>
          </div>

          <div class="lms-note-row" *ngIf="m.lmsNote">
            <span class="lms-note-icon">🎯</span>
            <span class="lms-note-text">{{ m.lmsNote }}</span>
          </div>

          <div class="pick-action-row">
            <ng-container *ngIf="authService.user(); else loginPrompt">
              <button *ngIf="!hasPickForRound(matchRound(m.date))"
                      class="pick-btn" [disabled]="picksService.saving()"
                      (click)="onPick(m)">
                ⭐ Pick {{ m.prediction }} — Round {{ matchRound(m.date) }}
              </button>
              <div *ngIf="hasPickForRound(matchRound(m.date)) && getRoundPick(matchRound(m.date))?.team === m.prediction"
                   class="pick-confirmed">
                ✅ Your Round {{ matchRound(m.date) }} pick
              </div>
              <div *ngIf="hasPickForRound(matchRound(m.date)) && getRoundPick(matchRound(m.date))?.team !== m.prediction"
                   class="pick-used">
                🔒 Round {{ matchRound(m.date) }} taken: {{ getRoundPick(matchRound(m.date))?.flag }} {{ getRoundPick(matchRound(m.date))?.team }}
              </div>
            </ng-container>
            <ng-template #loginPrompt>
              <button class="sign-in-prompt-btn" (click)="authService.signIn()">Sign in to save this pick</button>
            </ng-template>
          </div>
          <div *ngIf="saveError()" class="save-error">⚠️ {{ saveError() }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════ STRATEGY ═══════════════════════════════════════ -->
  <div class="content" *ngIf="activeTab==='strategy'">
    <div class="section-title">
      <h2>🎯 LMS Strategy Guide</h2>
      <p>Smart picks win £250,000. Here's how to survive all 12 rounds.</p>
    </div>

    <div class="strategy-grid">

      <div class="strategy-card elite-card">
        <div class="sc-header">
          <span class="sc-icon">🔥</span>
          <h3>Elite Picks — Save for Late Rounds</h3>
        </div>
        <p class="sc-desc">These teams are near-certain to win. Save them for knockout rounds when safe options dry up.</p>
        <div class="pick-list">
          <div class="pick-row" *ngFor="let p of elitePicks">
            <span class="pick-flag">{{ p.flag }}</span>
            <div class="pick-info">
              <span class="pick-team">{{ p.team }}</span>
              <span class="pick-reason">{{ p.reason }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="strategy-card safe-card">
        <div class="sc-header">
          <span class="sc-icon">✅</span>
          <h3>Safe Early Picks — Use in Group Stage</h3>
        </div>
        <p class="sc-desc">Comfortable wins vs weak opposition — burn these early rounds without wasting elite teams.</p>
        <div class="pick-list">
          <div class="pick-row" *ngFor="let p of safePicks">
            <span class="pick-flag">{{ p.flag }}</span>
            <div class="pick-info">
              <span class="pick-team">{{ p.match }}</span>
              <span class="pick-reason">{{ p.reason }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="strategy-card danger-card">
        <div class="sc-header">
          <span class="sc-icon">⚠️</span>
          <h3>Avoid These Traps</h3>
        </div>
        <p class="sc-desc">High upset risk or dead-rubber rotation — don't throw your run away on these.</p>
        <div class="pick-list">
          <div class="pick-row" *ngFor="let p of dangerPicks">
            <span class="pick-flag">{{ p.icon }}</span>
            <div class="pick-info">
              <span class="pick-team">{{ p.match }}</span>
              <span class="pick-reason">{{ p.reason }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="strategy-card reset-card">
        <div class="sc-header">
          <span class="sc-icon">🔄</span>
          <h3>When To Use Your 2 Resets</h3>
        </div>
        <ul class="reset-rules">
          <li *ngFor="let r of resetRules">{{ r }}</li>
        </ul>
      </div>

    </div>

    <!-- Recommended pick timeline -->
    <div class="section-title" style="margin-top:40px">
      <h2>🗓️ Recommended Pick Sequence</h2>
      <p>A round-by-round roadmap to maximise your survival chances.</p>
    </div>

    <div class="timeline">
      <div class="tl-item" *ngFor="let t of timeline">
        <div class="tl-round">R{{ t.round }}</div>
        <div class="tl-connector"></div>
        <div class="tl-content">
          <div class="tl-pick">{{ t.pick }}</div>
          <div class="tl-why">{{ t.why }}</div>
        </div>
      </div>
    </div>

  </div>

  <!-- ═══════════════════════════════════════ MY PICKS ═══════════════════════════════════════ -->
  <div class="content" *ngIf="activeTab==='picks'">
    <div *ngIf="!authService.user()" class="auth-prompt">
      <div class="auth-prompt-icon">🔐</div>
      <h2>Sign in to track your picks</h2>
      <p>Sign in with Google to save your picks and appear on the leaderboard.</p>
      <button class="sign-in-btn large" (click)="authService.signIn()">Sign in with Google</button>
    </div>

    <ng-container *ngIf="authService.user()">
      <div class="section-title">
        <h2>📌 My Picks</h2>
        <p>Your round-by-round selection for Final One Standing.</p>
      </div>
      <div class="my-picks-grid">
        <div class="my-pick-card" *ngFor="let r of rounds">
          <div class="pick-round-num">Round {{ r.number }}</div>
          <div class="pick-round-name">{{ r.name }}</div>
          <div class="pick-round-dates">{{ r.dates }}</div>
          <ng-container *ngIf="getRoundPick(r.number)">
            <div class="pick-choice">
              <span class="pick-team-flag">{{ getRoundPick(r.number)!.flag }}</span>
              <span class="pick-team-name">{{ getRoundPick(r.number)!.team }}</span>
            </div>
            <div class="pick-status-badge">🕐 Pending result</div>
          </ng-container>
          <div *ngIf="!getRoundPick(r.number)" class="pick-empty">No pick yet</div>
        </div>
      </div>
    </ng-container>
  </div>

  <!-- ═══════════════════════════════════════ LEADERBOARD ═══════════════════════════════════════ -->
  <div class="content" *ngIf="activeTab==='leaderboard'">
    <div class="section-title">
      <h2>🏅 Leaderboard</h2>
      <p>All players sorted by picks made. Last one standing wins £250K.</p>
    </div>
    <div *ngIf="leaderboardService.loading()" class="lb-loading">Loading leaderboard…</div>
    <div *ngIf="leaderboardService.error()" class="lb-error">⚠️ {{ leaderboardService.error() }}</div>
    <div *ngIf="!leaderboardService.loading() && !leaderboardService.error() && leaderboardService.entries().length === 0" class="lb-empty">
      No players yet — be the first to make picks!
    </div>
    <div class="lb-table" *ngIf="!leaderboardService.loading() && leaderboardService.entries().length > 0">
      <div class="lb-header-row">
        <span class="lb-col-rank">#</span>
        <span class="lb-col-player">Player</span>
        <span class="lb-col-rounds">Picks</span>
        <span class="lb-col-status">Status</span>
      </div>
      <div class="lb-row"
           *ngFor="let entry of leaderboardService.entries(); let i=index"
           [class.lb-row-me]="entry.uid === authService.user()?.uid"
           [class.lb-row-out]="entry.eliminated">
        <span class="lb-col-rank">{{ i + 1 }}</span>
        <span class="lb-col-player">
          <img class="lb-avatar" [src]="entry.photoURL" [alt]="entry.displayName" (error)="hideImg($event)">
          {{ entry.displayName }}
        </span>
        <span class="lb-col-rounds">{{ roundCount(entry) }}/8</span>
        <span class="lb-col-status">
          <span *ngIf="!entry.eliminated" class="status-alive">🟢 Active</span>
          <span *ngIf="entry.eliminated" class="status-out">❌ Eliminated</span>
        </span>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer class="footer">
    <p>🏆 WC2026 Final One Standing Predictor &nbsp;|&nbsp; Mugov Dev Solutions &nbsp;|&nbsp; Data sourced from: ESPN, CBS Sports, William Hill, Opta</p>
    <p>Always gamble responsibly. 18+ only. T&Cs apply. Predictions are for guidance only — not guaranteed outcomes.</p>
  </footer>

</div>
  `,
  styles: [`
    .app { min-height: 100vh; display: flex; flex-direction: column; }

    /* HEADER */
    .header {
      position: relative;
      background: linear-gradient(135deg, #0d1526 0%, #1a0a2e 50%, #0d1526 100%);
      border-bottom: 3px solid #FFD700;
      overflow: hidden;
    }
    .header-bg {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at 20% 50%, rgba(220,20,60,0.15) 0%, transparent 60%),
                  radial-gradient(ellipse at 80% 50%, rgba(255,215,0,0.1) 0%, transparent 60%);
      pointer-events: none;
    }
    .header-content {
      position: relative;
      max-width: 1200px; margin: 0 auto;
      padding: 24px 24px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
    }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .header-trophy { font-size: 56px; line-height: 1; filter: drop-shadow(0 0 20px rgba(255,215,0,0.6)); }
    .header-title {
      font-family: 'Bebas Neue', 'Impact', sans-serif;
      font-size: clamp(28px, 5vw, 52px);
      letter-spacing: 2px;
      color: #fff;
      line-height: 1;
      text-shadow: 0 2px 20px rgba(255,215,0,0.3);
    }
    .header-sub {
      color: rgba(255,255,255,0.65);
      font-size: 14px; margin-top: 4px;
    }
    .wh-badge { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .wh-text {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 22px; letter-spacing: 2px;
      background: linear-gradient(90deg, #FFD700, #FFA500);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .prize-badge {
      background: linear-gradient(90deg, #22c55e, #16a34a);
      color: #fff; font-size: 13px; font-weight: 700;
      padding: 4px 12px; border-radius: 20px;
      white-space: nowrap;
    }

    /* TABS */
    .tabs {
      background: #131929;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex; justify-content: center; gap: 4px;
      padding: 8px 16px; flex-wrap: wrap;
    }
    .tab-btn {
      background: transparent; border: 1px solid transparent;
      color: rgba(255,255,255,0.55); cursor: pointer;
      padding: 10px 28px; border-radius: 8px;
      font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;
      display: flex; align-items: center; gap: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover { color: #fff; border-color: rgba(255,215,0,0.3); }
    .tab-btn.active {
      background: linear-gradient(135deg, #DC143C, #a0102e);
      color: #fff; border-color: #DC143C;
      box-shadow: 0 4px 20px rgba(220,20,60,0.4);
    }
    .tab-icon { font-size: 18px; }

    /* CONTENT */
    .content {
      max-width: 1200px; margin: 0 auto;
      padding: 32px 24px; width: 100%;
      flex: 1;
    }

    /* SECTION TITLE */
    .section-title { margin-bottom: 28px; }
    .section-title h2 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: clamp(22px, 4vw, 36px);
      letter-spacing: 1px; color: #FFD700;
    }
    .section-title p { color: rgba(255,255,255,0.6); margin-top: 6px; font-size: 15px; }

    /* RULES GRID */
    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px; margin-bottom: 16px;
    }
    .rule-card {
      background: #1e2a44;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 24px;
      transition: transform 0.2s;
    }
    .rule-card:hover { transform: translateY(-2px); }
    .rule-card.highlight { border-color: #FFD700; background: rgba(255,215,0,0.05); }
    .rule-icon { font-size: 32px; margin-bottom: 12px; }
    .rule-card h3 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .rule-card p { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.6; }

    /* ROUNDS GRID */
    .rounds-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px; margin-bottom: 24px;
    }
    .round-card {
      background: #1e2a44;
      border: 1px solid rgba(255,255,255,0.08);
      border-left: 4px solid #DC143C;
      border-radius: 8px; padding: 16px;
    }
    .round-number {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px; color: #DC143C; letter-spacing: 1px;
    }
    .round-name { font-size: 13px; font-weight: 700; color: #fff; margin: 4px 0; }
    .round-dates { font-size: 12px; color: #FFD700; margin-bottom: 8px; }
    .round-tip { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.5; }

    /* ALERT BOX */
    .alert-box {
      display: flex; gap: 16px; align-items: flex-start;
      background: rgba(255,215,0,0.08);
      border: 1px solid rgba(255,215,0,0.3);
      border-radius: 12px; padding: 20px;
      margin-top: 24px;
    }
    .alert-icon { font-size: 28px; flex-shrink: 0; }
    .alert-box strong { color: #FFD700; font-size: 15px; display: block; margin-bottom: 6px; }
    .alert-box p { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; }

    /* ROUND SELECTOR */
    .round-selector {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;
    }
    .round-btn {
      background: rgba(255,255,255,0.04);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 10px; cursor: pointer;
      padding: 10px 24px; min-width: 110px;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      transition: all 0.2s; color: rgba(255,255,255,0.6);
    }
    .round-btn:hover { border-color: #FFD700; color: #FFD700; }
    .round-btn.active {
      background: rgba(255,215,0,0.1);
      border-color: #FFD700; color: #FFD700;
    }
    .round-btn-num {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px; letter-spacing: 1px;
    }
    .round-btn-dates { font-size: 11px; opacity: 0.75; }

    /* GROUP SELECTOR */
    .group-selector {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px;
    }
    .group-btn {
      background: rgba(255,255,255,0.04);
      border: 2px solid rgba(255,255,255,0.12);
      border-radius: 10px; cursor: pointer;
      padding: 10px 20px; min-width: 80px;
      display: flex; flex-direction: column; align-items: center;
      transition: all 0.2s;
    }
    .group-btn:hover { border-color: var(--gcolor); color: var(--gcolor); }
    .group-btn.active {
      background: var(--gcolor);
      border-color: var(--gcolor);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .group-btn-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
    .group-btn.active .group-btn-label { color: rgba(255,255,255,0.8); }
    .group-btn-id {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 28px; line-height: 1; color: #fff;
    }

    /* GROUP HEADER */
    .group-header {
      background: #1e2a44;
      border: 1px solid rgba(255,255,255,0.08);
      border-left: 5px solid #FFD700;
      border-radius: 12px; padding: 20px;
      margin-bottom: 20px;
    }
    .group-title-row {
      display: flex; align-items: center; gap: 16px;
      flex-wrap: wrap; margin-bottom: 16px;
    }
    .group-label {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 22px; letter-spacing: 2px;
      color: #fff; padding: 6px 16px;
      border-radius: 6px;
    }
    .group-teams-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .team-chip {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 4px 12px;
      font-size: 13px; font-weight: 600; color: #fff;
    }
    .group-outlook {
      display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
    }
    .outlook-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.1); }
    .outlook-label { font-size: 11px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 1px; display: block; }
    .outlook-value { font-size: 16px; font-weight: 700; color: #FFD700; }

    /* MATCHES */
    .matches-container { display: flex; flex-direction: column; gap: 16px; }
    .match-card {
      background: #1e2a44;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 20px;
      transition: transform 0.15s;
    }
    .match-card:hover { transform: translateY(-2px); }
    .match-card.lms-highlighted {
      border-color: #FFD700;
      background: linear-gradient(135deg, #1e2a44, #2a2210);
      box-shadow: 0 0 0 1px #FFD700, 0 8px 32px rgba(255,215,0,0.1);
    }

    .match-top-bar {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
    }
    .match-num { font-size: 12px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; }
    .match-badges { display: flex; gap: 8px; flex-wrap: wrap; }

    .badge {
      font-size: 11px; font-weight: 700; padding: 3px 10px;
      border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase;
    }
    .badge-lms { background: #FFD700; color: #0a0e1a; }
    .badge-elite { background: linear-gradient(90deg, #22c55e, #16a34a); color: #fff; }
    .badge-high { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.4); }
    .badge-medium { background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }
    .badge-risky { background: rgba(220,20,60,0.2); color: #f87171; border: 1px solid rgba(220,20,60,0.4); }

    .match-teams-row {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 16px;
    }
    .match-team {
      flex: 1; display: flex; align-items: center; gap: 10px;
    }
    .home-team { justify-content: flex-start; }
    .away-team { justify-content: flex-end; }
    .team-flag { font-size: 28px; flex-shrink: 0; }
    .team-name {
      font-size: clamp(14px, 2.5vw, 18px);
      font-weight: 700; color: rgba(255,255,255,0.7);
      transition: color 0.2s;
    }
    .team-name.predicted-winner { color: #fff; }
    .winner-arrow { font-size: 11px; color: #22c55e; font-weight: 800; white-space: nowrap; }
    .winner-arrow-right { margin-right: 4px; }
    .vs-block {
      flex-shrink: 0;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 8px 12px;
    }
    .vs-text {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 18px; color: rgba(255,255,255,0.4); letter-spacing: 2px;
    }

    .prediction-bar-row {
      display: flex; align-items: center; gap: 12px;
      flex-wrap: wrap; margin-bottom: 12px;
    }
    .pred-label { font-size: 14px; color: rgba(255,255,255,0.7); white-space: nowrap; }
    .pred-label strong { color: #fff; }
    .conf-bar-wrap { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 120px; }
    .conf-bar {
      flex: 1; height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 3px; overflow: hidden;
    }
    .conf-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
    .conf-fill.conf-elite, .conf-fill.conf-high { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .conf-fill.conf-medium { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .conf-fill.conf-risky { background: linear-gradient(90deg, #ef4444, #dc2626); }
    .conf-pct { font-size: 13px; font-weight: 700; color: #22c55e; white-space: nowrap; }

    .match-meta-row {
      display: flex; gap: 16px; flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .meta-item { font-size: 13px; color: rgba(255,255,255,0.5); }

    .deadline-row {
      display: flex; align-items: center; gap: 8px;
      background: rgba(220,20,60,0.08);
      border: 1px solid rgba(220,20,60,0.2);
      border-radius: 8px; padding: 10px 14px;
      margin-bottom: 12px; flex-wrap: wrap;
    }
    .deadline-icon { font-size: 16px; }
    .deadline-label { font-size: 12px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 0.5px; }
    .deadline-value { font-size: 13px; color: #fff; font-weight: 600; }

    .reasoning-row { margin-bottom: 10px; }
    .reasoning-text { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; }

    .lms-note-row {
      display: flex; gap: 8px; align-items: flex-start;
      background: rgba(255,215,0,0.06);
      border: 1px solid rgba(255,215,0,0.2);
      border-radius: 8px; padding: 10px 14px;
    }
    .lms-note-icon { font-size: 14px; flex-shrink: 0; }
    .lms-note-text { font-size: 13px; color: rgba(255,215,0,0.9); font-weight: 500; line-height: 1.5; }

    /* STRATEGY */
    .strategy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .strategy-card {
      border-radius: 12px; padding: 24px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .elite-card { background: linear-gradient(135deg, #1e2a44, #1a2210); border-color: #22c55e; }
    .safe-card { background: linear-gradient(135deg, #1e2a44, #1a2035); border-color: #3b82f6; }
    .danger-card { background: linear-gradient(135deg, #1e2a44, #2a1010); border-color: #ef4444; }
    .reset-card { background: linear-gradient(135deg, #1e2a44, #1a1535); border-color: #a855f7; }
    .sc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .sc-icon { font-size: 24px; }
    .strategy-card h3 { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.3; }
    .sc-desc { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 16px; line-height: 1.5; }

    .pick-list { display: flex; flex-direction: column; gap: 10px; }
    .pick-row { display: flex; gap: 10px; align-items: flex-start; }
    .pick-flag { font-size: 20px; flex-shrink: 0; }
    .pick-info { display: flex; flex-direction: column; gap: 2px; }
    .pick-team { font-size: 14px; font-weight: 700; color: #fff; }
    .pick-reason { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.4; }

    .reset-rules { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .reset-rules li {
      font-size: 14px; color: rgba(255,255,255,0.7);
      padding-left: 20px; position: relative; line-height: 1.5;
    }
    .reset-rules li::before {
      content: '→'; position: absolute; left: 0;
      color: #a855f7; font-weight: 700;
    }

    /* TIMELINE */
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .tl-item {
      display: flex; align-items: stretch; gap: 0;
    }
    .tl-round {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 18px; width: 48px; flex-shrink: 0;
      color: #FFD700; padding: 16px 0 16px 0;
      display: flex; align-items: flex-start; justify-content: center;
    }
    .tl-connector {
      width: 2px; background: rgba(255,215,0,0.2);
      flex-shrink: 0; margin: 0 16px;
    }
    .tl-content {
      flex: 1; padding: 16px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .tl-item:last-child .tl-content { border-bottom: none; }
    .tl-pick { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .tl-why { font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.5; }

    /* FOOTER */
    .footer {
      background: #0d1526;
      border-top: 1px solid rgba(255,255,255,0.07);
      text-align: center; padding: 24px 16px;
    }
    .footer p { font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 4px; }

    /* AUTH */
    .header-auth { display: flex; align-items: center; }
    .sign-in-btn {
      background: #fff; color: #333;
      border: none; border-radius: 8px;
      padding: 9px 16px; font-size: 14px; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      transition: opacity 0.15s; white-space: nowrap;
    }
    .sign-in-btn:hover { opacity: 0.85; }
    .sign-in-btn.large { font-size: 16px; padding: 14px 28px; margin-top: 16px; }
    .user-info { display: flex; align-items: center; gap: 10px; }
    .user-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,215,0,0.5); object-fit: cover; }
    .user-name { font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sign-out-btn {
      background: transparent; border: 1px solid rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.6); font-size: 12px; cursor: pointer;
      padding: 5px 12px; border-radius: 6px; transition: all 0.15s;
    }
    .sign-out-btn:hover { border-color: #f87171; color: #f87171; }

    /* PICK ACTION ROW */
    .pick-action-row {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,215,0,0.15);
    }
    .pick-btn {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: #0a0e1a; border: none; border-radius: 8px;
      padding: 10px 20px; font-size: 14px; font-weight: 700;
      cursor: pointer; width: 100%; transition: opacity 0.15s;
    }
    .pick-btn:hover:not(:disabled) { opacity: 0.85; }
    .pick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .save-error { color: #ff6b6b; font-size: 13px; margin-top: 6px; }
    .pick-confirmed {
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
      color: #22c55e; border-radius: 8px; padding: 10px 16px;
      font-size: 14px; font-weight: 700; text-align: center;
    }
    .pick-used {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.55); border-radius: 8px; padding: 10px 16px;
      font-size: 13px; text-align: center;
    }
    .sign-in-prompt-btn {
      background: transparent; border: 1px dashed rgba(255,215,0,0.3);
      color: rgba(255,215,0,0.7); font-size: 13px; cursor: pointer;
      padding: 8px 16px; border-radius: 8px; width: 100%; transition: all 0.15s;
    }
    .sign-in-prompt-btn:hover { border-color: #FFD700; color: #FFD700; }

    /* MY PICKS */
    .auth-prompt {
      text-align: center; padding: 60px 20px;
    }
    .auth-prompt-icon { font-size: 48px; margin-bottom: 16px; }
    .auth-prompt h2 { color: #fff; font-size: 22px; margin-bottom: 8px; }
    .auth-prompt p { color: rgba(255,255,255,0.6); font-size: 15px; }
    .my-picks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .my-pick-card {
      background: #1e2a44; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 16px;
    }
    .pick-round-num {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px; color: #DC143C; letter-spacing: 1px;
    }
    .pick-round-name { font-size: 12px; font-weight: 700; color: #fff; margin: 4px 0 2px; }
    .pick-round-dates { font-size: 11px; color: #FFD700; margin-bottom: 12px; }
    .pick-choice { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .pick-team-flag { font-size: 22px; }
    .pick-team-name { font-size: 15px; font-weight: 700; color: #fff; }
    .pick-status-badge {
      font-size: 11px; color: rgba(255,255,255,0.5);
      background: rgba(255,255,255,0.05); border-radius: 4px; padding: 3px 8px; display: inline-block;
    }
    .pick-empty { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 8px; font-style: italic; }

    /* LEADERBOARD */
    .lb-loading, .lb-empty, .lb-error { color: rgba(255,255,255,0.5); text-align: center; padding: 40px; font-size: 15px; }
    .lb-error { color: #f87171; }
    .lb-table { border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .lb-header-row {
      display: grid; grid-template-columns: 48px 1fr 80px 100px;
      background: rgba(255,255,255,0.05); padding: 12px 16px;
      font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.4);
      text-transform: uppercase; letter-spacing: 1px;
    }
    .lb-row {
      display: grid; grid-template-columns: 48px 1fr 80px 100px;
      padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06);
      align-items: center; transition: background 0.15s;
    }
    .lb-row:hover { background: rgba(255,255,255,0.03); }
    .lb-row-me { background: rgba(255,215,0,0.06) !important; }
    .lb-row-out { opacity: 0.5; }
    .lb-col-rank { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: rgba(255,255,255,0.4); }
    .lb-col-player { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #fff; }
    .lb-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.15); }
    .lb-col-rounds { font-size: 14px; font-weight: 700; color: #FFD700; }
    .lb-col-status { font-size: 12px; }
    .status-alive { color: #22c55e; }
    .status-out { color: #f87171; }

    @media (max-width: 600px) {
      .header-content { padding: 16px; }
      .header-right { display: none; }
      .content { padding: 20px 16px; }
      .match-teams-row { gap: 6px; }
      .team-flag { font-size: 22px; }
      .winner-arrow { display: none; }
      .lb-header-row, .lb-row { grid-template-columns: 36px 1fr 60px 80px; }
    }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
  picksService = inject(PicksService);
  leaderboardService = inject(LeaderboardService);

  activeTab = 'rules';
  activeGroup = 'A';
  activeRound = 1;

  gsRounds = [
    { num: 1, label: 'Round 1', dates: 'June 11–17' },
    { num: 2, label: 'Round 2', dates: 'June 18–23' },
    { num: 3, label: 'Round 3', dates: 'June 24–27' },
  ];

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.picksService.setCurrentUid(user.uid);
        this.picksService.loadPicks(user.uid);
      } else {
        this.picksService.setCurrentUid(null);
        this.picksService.clearPicks();
      }
    });
  }

  matchRound(dateStr: string): number | null {
    const day = parseInt(dateStr.split(' ')[0], 10);
    if (isNaN(day)) return null;
    if (day >= 11 && day <= 17) return 1;
    if (day >= 18 && day <= 23) return 2;
    if (day >= 24 && day <= 27) return 3;
    return null;
  }

  hasPickForRound(round: number | null): boolean {
    if (round === null) return false;
    return !!this.picksService.userPicks()?.rounds?.[round];
  }

  getRoundPick(round: number | null) {
    if (round === null) return null;
    return this.picksService.userPicks()?.rounds?.[round] ?? null;
  }

  saveError = signal<string | null>(null);

  async onPick(match: Match) {
    const user = this.authService.user();
    if (!user) return;
    const round = this.matchRound(match.date);
    if (round === null) return;
    const flag = match.prediction === match.homeTeam ? match.homeFlag : match.awayFlag;
    this.saveError.set(null);
    try {
      await this.picksService.savePick(
        user.uid,
        user.displayName ?? 'Anonymous',
        user.photoURL ?? '',
        round,
        match.prediction,
        flag,
      );
    } catch {
      this.saveError.set('Pick failed — please try again.');
    }
  }

  onPicksTab() { this.activeTab = 'picks'; }

  onLeaderboardTab() {
    this.activeTab = 'leaderboard';
    this.leaderboardService.load();
  }

  roundCount(entry: UserPicks): number {
    return Object.keys(entry.rounds ?? {}).length;
  }

  hideImg(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  confLabel(c: string): string {
    const m: Record<string, string> = { elite: '💎 BANKER', high: '🎯 NAILED ON', medium: '✅ CONFIDENT', risky: '⛔ SWERVE' };
    return m[c] ?? c;
  }

  getRoundMatches(g: Group): Match[] {
    return g.matches.filter(m => this.matchRound(m.date) === this.activeRound);
  }

  confBadgeClass(c: string): string {
    return 'badge-' + c;
  }

  confFillClass(c: string): string {
    return 'conf-' + c;
  }

  rules = [
    { icon: '1️⃣', title: 'Pick One Team Per Round', text: 'Select ONE team to WIN their match each round. A draw counts as a loss — your team must win outright.' },
    { icon: '🚫', title: 'No Repeats', text: 'Once a team is used, they are locked out for the rest of the competition. Every team can only be picked once.' },
    { icon: '💀', title: 'One Strike & You\'re Out', text: 'Pick a team that loses or draws and you are immediately eliminated. No second chances — unless you have a reset.' },
    { icon: '🔄', title: '2 Resets Available', text: 'WC2026 edition gives you TWO resets. A reset wipes your used team list, giving you every team back. Use them wisely!', extra: 'highlight' },
    { icon: '🏆', title: '£250,000 Prize Pot', text: 'Compete for a quarter-million pounds. Last survivor takes all. If everyone goes out in the same round, the pot is split equally.' },
    { icon: '⏰', title: 'Submit Before Kickoff', text: 'Your pick must be submitted before your chosen match kicks off. Late submissions are rejected — always pick in advance!' },
  ];

  rounds = [
    { number: 1, name: 'Group Stage — Matchday 1', dates: 'June 11–16, 2026', tip: 'Use an easy pick — Germany vs Curaçao or Canada vs Qatar are the safest bets in the tournament.' },
    { number: 2, name: 'Group Stage — Matchday 2', dates: 'June 18–21, 2026', tip: 'More data from MD1. Avoid teams in tense must-win situations — upsets more likely.' },
    { number: 3, name: 'Group Stage — Matchday 3', dates: 'June 24–26, 2026', tip: 'DANGER ZONE — teams already qualified may rotate squads. Check team news religiously before picking!' },
    { number: 4, name: 'Round of 32', dates: 'Late June / Early July 2026', tip: 'Group winners vs 3rd-place teams. Strong mismatches available — good time for elite picks.' },
    { number: 5, name: 'Round of 16', dates: 'July 2026', tip: 'Competition tightens significantly. Consider using a reset if your remaining team pool is thin.' },
    { number: 6, name: 'Quarter-Finals', dates: 'July 2026', tip: 'Save your elite teams (France, Spain, Brazil, Argentina) for this stage and beyond.' },
    { number: 7, name: 'Semi-Finals', dates: 'July 2026', tip: 'Only 4 teams remain. Pick the biggest favourite — no room for gambles at this stage.' },
    { number: 8, name: 'Final', dates: 'July 19, 2026', tip: 'Last pick. Win or lose everything. Use your most trusted remaining team.' },
  ];

  elitePicks = [
    { flag: '🇩🇪', team: 'Germany', reason: 'Musiala, Wirtz, Havertz — best attacking depth in the tournament' },
    { flag: '🇧🇷', team: 'Brazil', reason: 'Ancelotti\'s side are tournament favourites; outstanding squad depth' },
    { flag: '🇫🇷', team: 'France', reason: 'Mbappé era — probably their best chance in a generation' },
    { flag: '🇪🇸', team: 'Spain', reason: 'Defending Euros champions, +450 WC favourites, elite possession football' },
    { flag: '🇦🇷', team: 'Argentina', reason: 'Reigning world champions — Messi in his final tournament' },
    { flag: '🇳🇱', team: 'Netherlands', reason: 'Van Dijk, Gakpo, Depay — strong and consistent European pedigree' },
  ];

  safePicks = [
    { flag: '🇩🇪', match: 'Germany vs Curaçao (June 14)', reason: 'Population 150k vs 4-time world champions. Pick of the tournament for LMS Round 1.' },
    { flag: '🇧🇷', match: 'Brazil vs Haiti (June 20)', reason: 'Brazil should win by 4+. Safest Group C pick without burning an elite team later.' },
    { flag: '🇨🇦', match: 'Canada vs Qatar (June 18)', reason: 'Qatar failed to score a goal in their home World Cup 2022. Host Canada will run riot.' },
    { flag: '🇨🇭', match: 'Switzerland vs Qatar (June 13)', reason: 'Switzerland are clinical and organised; Qatar are severely outclassed.' },
    { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', match: 'Scotland vs Haiti (June 14)', reason: 'Haiti are the weakest team in Group C — Scotland PL-quality players should dominate.' },
    { flag: '🇪🇨', match: 'Ecuador vs Curaçao (June 20)', reason: 'Near-certain 3+ goal win. Perfect Round 2 pick if you used Germany in Round 1.' },
  ];

  dangerPicks = [
    { icon: '⚠️', match: 'ANY Matchday 3 match (June 24–26)', reason: 'Teams already through may rotate 6-7 starters. Check team news or you risk elimination on a rotated XI.' },
    { icon: '⚠️', match: 'Turkey vs USA (June 25)', reason: 'Genuinely 50/50 — US at home but Turkey are underrated. Do not waste a pick here.' },
    { icon: '⚠️', match: 'Netherlands vs Japan (June 14)', reason: 'Japan beat Germany in Qatar 2022. They will cause problems — pick Sweden vs Tunisia instead.' },
    { icon: '⚠️', match: 'Scotland vs Morocco (June 19)', reason: 'Morocco reached the 2022 semi-finals. This could easily end in a draw or Morocco win.' },
    { icon: '⚠️', match: 'Australia vs Turkey (June 14)', reason: 'Too competitive for LMS. Both teams are motivated — margin for error is tiny.' },
  ];

  resetRules = [
    'Never use a reset in the Group Stage — safe picks are still plentiful',
    'Save your first reset for the Round of 16 if your remaining team pool is dangerously thin',
    'Save your second reset as an emergency if you\'re forced to pick a risky team in the knockouts',
    'Never waste a reset when you still have 3+ safe options available to pick from',
    'After a reset, your entire previously-used team list is wiped — you get ALL teams back',
  ];

  timeline = [
    { round: 1, pick: '🇩🇪 Germany WIN vs Curaçao (June 14, 8pm)', why: 'The single safest pick in the whole tournament. Bank it immediately — don\'t overthink.' },
    { round: 2, pick: '🇧🇷 Brazil WIN vs Haiti (June 20, 1:30pm)', why: 'Brazil cruise; Haiti have no chance. Save your elites and still collect an easy win.' },
    { round: 3, pick: '⚠️ Check team news first! Try 🇲🇦 Morocco vs Haiti or 🇨🇭 Switzerland', why: 'Matchday 3 — rotation risk everywhere. Avoid any team that\'s already qualified.' },
    { round: 4, pick: '🇳🇱 Netherlands or 🇨🇦 Canada (Round of 32)', why: 'Strong European/host picks vs 3rd-place teams. Save Spain/France/Argentina for later.' },
    { round: 5, pick: '🔄 Use First Reset if team pool is thin (Round of 16)', why: 'You get ALL teams back. Now you can pick Germany, Brazil again — don\'t be afraid to use it.' },
    { round: 6, pick: '🇫🇷 France or 🇪🇸 Spain (Quarter-Finals)', why: 'These are the tournament favourites at this stage — most reliable picks in knockouts.' },
    { round: 7, pick: '🇦🇷 Argentina or 🇧🇷 Brazil (Semi-Finals)', why: 'South American powerhouses — save them if you want, or use the favourite here.' },
    { round: 8, pick: '🏆 Last team standing — pick whoever is the clear final favourite', why: 'Everything on the line. Use your most trusted remaining elite team.' },
  ];

  groups: Group[] = [
    {
      id: 'A', color: '#FF6B35',
      teams: [
        { name: 'Mexico', flag: '🇲🇽' },
        { name: 'South Africa', flag: '🇿🇦' },
        { name: 'South Korea', flag: '🇰🇷' },
        { name: 'Czech Republic', flag: '🇨🇿' },
      ],
      groupWinner: '🇲🇽 Mexico', groupRunnerUp: '🇰🇷 South Korea',
      matches: [
        {
          homeTeam: 'Mexico', homeFlag: '🇲🇽',
          awayTeam: 'South Africa', awayFlag: '🇿🇦',
          date: '11 June', time: '8:00pm', venue: 'Mexico City Stadium',
          prediction: 'Mexico', confidence: 'high', confidenceScore: 78,
          reasoning: 'Mexico on home turf with a packed stadium behind them. South Africa are back at their first World Cup since 2010 with limited squad depth. El Tri have the home advantage despite missing Edson Alvarez — the crowd factor alone is worth a goal.',
          lmsPick: true, lmsNote: 'Good Round 1 pick — solid home win, saves your elite teams for later rounds.'
        },
        {
          homeTeam: 'South Korea', homeFlag: '🇰🇷',
          awayTeam: 'Czech Republic', awayFlag: '🇨🇿',
          date: '12 June', time: '3:00am', venue: 'Guadalajara Stadium',
          prediction: 'South Korea', confidence: 'medium', confidenceScore: 58,
          reasoning: 'South Korea have quality built around their European-based players and a well-organised system. Czech Republic are solid but lack a cutting edge at this level. Expect a tight game — South Korea edge it but it\'s not a comfortable pick.',
          lmsPick: false, lmsNote: 'Too close for LMS — find a safer match this round.'
        },
        {
          homeTeam: 'Czech Republic', homeFlag: '🇨🇿',
          awayTeam: 'South Africa', awayFlag: '🇿🇦',
          date: '18 June', time: '5:00pm', venue: 'Atlanta Stadium',
          prediction: 'Czech Republic', confidence: 'medium', confidenceScore: 63,
          reasoning: 'Czech Republic need points to stay alive. South Africa have attacking pace but lack quality against organised European defences. Patrik Schick and Co should have enough to grind out the win.',
          lmsPick: false, lmsNote: 'Passable backup pick but medium confidence — there are safer options available.'
        },
        {
          homeTeam: 'Mexico', homeFlag: '🇲🇽',
          awayTeam: 'South Korea', awayFlag: '🇰🇷',
          date: '19 June', time: '2:00am', venue: 'Guadalajara Stadium',
          prediction: 'Mexico', confidence: 'high', confidenceScore: 70,
          reasoning: 'Mexico again in a North American venue — home support advantage. South Korea are dangerous but inconsistent in big games. Mexico are driven by knockout qualification pressure in front of their own fans.',
          lmsPick: false, lmsNote: 'You already used Mexico in R1 — cannot reuse until reset!'
        },
        {
          homeTeam: 'Czech Republic', homeFlag: '🇨🇿',
          awayTeam: 'Mexico', awayFlag: '🇲🇽',
          date: '25 June', time: '2:00am', venue: 'Mexico City Stadium',
          prediction: 'Mexico', confidence: 'medium', confidenceScore: 62,
          reasoning: 'Dead rubber alert — if Mexico already qualified they WILL rotate. Monitor team news obsessively before placing this pick. Czech Republic will be desperate if they need a result. High rotation risk makes this unpredictable.',
          lmsPick: false, lmsNote: 'BEWARE dead rubber — check qualification status before picking!'
        },
        {
          homeTeam: 'South Africa', homeFlag: '🇿🇦',
          awayTeam: 'South Korea', awayFlag: '🇰🇷',
          date: '25 June', time: '2:00am', venue: 'Monterrey Stadium',
          prediction: 'South Korea', confidence: 'medium', confidenceScore: 61,
          reasoning: 'South Korea have the quality edge but this may be a dead rubber for both sides. South Korea will still push for group position but rotation is possible if they\'re already through.',
          lmsPick: false, lmsNote: 'Medium risk — could be a useful pick if your pool is running low.'
        },
      ]
    },
    {
      id: 'B', color: '#4ECDC4',
      teams: [
        { name: 'Canada', flag: '🇨🇦' },
        { name: 'Bosnia & Herz.', flag: '🇧🇦' },
        { name: 'Qatar', flag: '🇶🇦' },
        { name: 'Switzerland', flag: '🇨🇭' },
      ],
      groupWinner: '🇨🇭 Switzerland', groupRunnerUp: '🇨🇦 Canada',
      matches: [
        {
          homeTeam: 'Canada', homeFlag: '🇨🇦',
          awayTeam: 'Bosnia & Herz.', awayFlag: '🇧🇦',
          date: '12 June', time: '8:00pm', venue: 'Toronto Stadium',
          prediction: 'Canada', confidence: 'high', confidenceScore: 72,
          reasoning: 'Canada on home soil in Toronto — electric atmosphere expected. Alphonso Davies (Bayern Munich), Jonathan David and a talented young generation. Bosnia are competitive but lack World Cup experience at this level.',
          lmsPick: false, lmsNote: 'Decent pick, but Switzerland vs Qatar (June 13) is safer — use that first.'
        },
        {
          homeTeam: 'Qatar', homeFlag: '🇶🇦',
          awayTeam: 'Switzerland', awayFlag: '🇨🇭',
          date: '13 June', time: '8:00pm', venue: 'SF Bay Area Stadium',
          prediction: 'Switzerland', confidence: 'high', confidenceScore: 81,
          reasoning: 'Qatar failed to score a single goal during Qatar 2022 — the worst host nation performance ever. Switzerland are one of Europe\'s most consistent tournament sides, organised, experienced and clinical. Near-certain win.',
          lmsPick: true, lmsNote: 'Excellent Round 1 pick — Switzerland vs Qatar is one of the safest in the whole tournament!'
        },
        {
          homeTeam: 'Switzerland', homeFlag: '🇨🇭',
          awayTeam: 'Bosnia & Herz.', awayFlag: '🇧🇦',
          date: '18 June', time: '8:00pm', venue: 'Los Angeles Stadium',
          prediction: 'Switzerland', confidence: 'high', confidenceScore: 74,
          reasoning: 'Switzerland continue their dominance. Bosnia have some attacking quality but Switzerland are too organised defensively — Xhaka and Co should control this match comfortably.',
          lmsPick: false, lmsNote: 'You likely used Switzerland vs Qatar already — can\'t reuse until reset!'
        },
        {
          homeTeam: 'Canada', homeFlag: '🇨🇦',
          awayTeam: 'Qatar', awayFlag: '🇶🇦',
          date: '18 June', time: '11:00pm', venue: 'BC Place, Vancouver',
          prediction: 'Canada', confidence: 'elite', confidenceScore: 88,
          reasoning: 'Canada vs Qatar on home turf in Vancouver is one of the safest picks in the tournament. Qatar are severely outclassed — Canada have one of their best generations of talent and the full backing of a home crowd. Expect a convincing win.',
          lmsPick: true, lmsNote: 'One of the safest picks in all of WC2026 — perfect if you need a Round 2 banker!'
        },
        {
          homeTeam: 'Switzerland', homeFlag: '🇨🇭',
          awayTeam: 'Canada', awayFlag: '🇨🇦',
          date: '24 June', time: '8:00pm', venue: 'BC Place, Vancouver',
          prediction: 'Switzerland', confidence: 'medium', confidenceScore: 56,
          reasoning: 'Group decider — both likely already through. Canada have home advantage; Switzerland have European pedigree and experience. This is too close to call and rotation makes it worse. Avoid for LMS.',
          lmsPick: false, lmsNote: 'AVOID — group decider with rotation risk on both sides.'
        },
        {
          homeTeam: 'Bosnia & Herz.', homeFlag: '🇧🇦',
          awayTeam: 'Qatar', awayFlag: '🇶🇦',
          date: '24 June', time: '8:00pm', venue: 'Seattle Stadium',
          prediction: 'Bosnia & Herz.', confidence: 'high', confidenceScore: 74,
          reasoning: 'Bosnia should win this comfortably — Qatar have been outclassed throughout the tournament. Good alternative if you haven\'t used Bosnia yet and need a safe Round 3 pick.',
          lmsPick: false, lmsNote: 'Decent backup if you haven\'t burned Bosnia yet — Qatar can\'t win this.'
        },
      ]
    },
    {
      id: 'C', color: '#FFD700',
      teams: [
        { name: 'Brazil', flag: '🇧🇷' },
        { name: 'Morocco', flag: '🇲🇦' },
        { name: 'Haiti', flag: '🇭🇹' },
        { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
      ],
      groupWinner: '🇧🇷 Brazil', groupRunnerUp: '🇲🇦 Morocco',
      matches: [
        {
          homeTeam: 'Brazil', homeFlag: '🇧🇷',
          awayTeam: 'Morocco', awayFlag: '🇲🇦',
          date: '13 June', time: '10:00pm', venue: 'NY/NJ Stadium',
          prediction: 'Brazil', confidence: 'high', confidenceScore: 71,
          reasoning: 'Brazil are the pre-tournament favourites, but Morocco are no pushover — they reached the semi-finals in Qatar 2022 with their compact, disciplined defence. Ancelotti\'s Brazil should have the quality edge, but this isn\'t a banker pick.',
          lmsPick: false, lmsNote: 'Save Brazil for their match vs Haiti — far easier and Brazil still win both.'
        },
        {
          homeTeam: 'Haiti', homeFlag: '🇭🇹',
          awayTeam: 'Scotland', awayFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
          date: '14 June', time: '2:00am', venue: 'Boston Stadium',
          prediction: 'Scotland', confidence: 'high', confidenceScore: 76,
          reasoning: 'Scotland are physically robust and well-organised with genuine Premier League quality throughout. Haiti are the genuine underdogs here — limited professional league depth. Scotland should win this comfortably without overexerting.',
          lmsPick: true, lmsNote: 'Good early LMS pick — saves bigger teams and should be a comfortable Scotland win.'
        },
        {
          homeTeam: 'Scotland', homeFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
          awayTeam: 'Morocco', awayFlag: '🇲🇦',
          date: '19 June', time: '10:00pm', venue: 'Boston Stadium',
          prediction: 'Morocco', confidence: 'medium', confidenceScore: 60,
          reasoning: 'Morocco are Africa\'s strongest side — compact, physical and dangerous on the counter-attack. Scotland will be hard to break down but Morocco\'s quality should edge a tight game. Not comfortable for LMS.',
          lmsPick: false, lmsNote: 'Risky for LMS — Scotland could hold Morocco. Avoid unless you have no other option.'
        },
        {
          homeTeam: 'Brazil', homeFlag: '🇧🇷',
          awayTeam: 'Haiti', awayFlag: '🇭🇹',
          date: '20 June', time: '1:30pm', venue: 'Philadelphia Stadium',
          prediction: 'Brazil', confidence: 'elite', confidenceScore: 95,
          reasoning: 'This is THE safest pick of Group C and one of the best in the whole tournament. Brazil are world-class with a £1B+ squad; Haiti have never won a World Cup match. Ancelotti\'s side should win 4-5-0. A waste not to use this for LMS.',
          lmsPick: true, lmsNote: '🔥 ONE OF THE BEST LMS PICKS IN WC2026 — use in Round 2 and bank the round!'
        },
        {
          homeTeam: 'Scotland', homeFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
          awayTeam: 'Brazil', awayFlag: '🇧🇷',
          date: '24 June', time: '10:00pm', venue: 'Miami Stadium',
          prediction: 'Brazil', confidence: 'elite', confidenceScore: 91,
          reasoning: 'Brazil vs Scotland — Brazil are massive favourites. Scotland will be well-organised but Brazil\'s attacking quality (Vinicius, Rodrygo, Endrick) is simply on another level. Even with rotation, Brazil should win.',
          lmsPick: false, lmsNote: 'Don\'t waste Brazil on this — pick them vs Haiti (Round 2) where it\'s even safer!'
        },
        {
          homeTeam: 'Morocco', homeFlag: '🇲🇦',
          awayTeam: 'Haiti', awayFlag: '🇭🇹',
          date: '24 June', time: '10:00pm', venue: 'Atlanta Stadium',
          prediction: 'Morocco', confidence: 'high', confidenceScore: 83,
          reasoning: 'Morocco have Champions League-quality players throughout their squad and should comfortably dispatch Haiti. A great alternative pick if you want to save Brazil for later rounds.',
          lmsPick: false, lmsNote: 'Solid pick if you want to save Brazil — Morocco should win 2-3 goals to nil.'
        },
      ]
    },
    {
      id: 'D', color: '#E63946',
      teams: [
        { name: 'USA', flag: '🇺🇸' },
        { name: 'Paraguay', flag: '🇵🇾' },
        { name: 'Australia', flag: '🇦🇺' },
        { name: 'Turkey', flag: '🇹🇷' },
      ],
      groupWinner: '🇺🇸 USA', groupRunnerUp: '🇹🇷 Turkey',
      matches: [
        {
          homeTeam: 'USA', homeFlag: '🇺🇸',
          awayTeam: 'Paraguay', awayFlag: '🇵🇾',
          date: '13 June', time: '2:00am', venue: 'LA Stadium',
          prediction: 'USA', confidence: 'high', confidenceScore: 71,
          reasoning: 'USA on home soil with Christian Pulisic, Tyler Adams, Weston McKennie and a strong European-based squad. The home crowd factor in LA is massive. Paraguay are dangerous but this is the USMNT\'s defining tournament — they will be up for it.',
          lmsPick: true, lmsNote: 'Host nation pick — good value for an early round. Pulisic and Co should deliver.'
        },
        {
          homeTeam: 'Australia', homeFlag: '🇦🇺',
          awayTeam: 'Turkey', awayFlag: '🇹🇷',
          date: '14 June', time: '2:00am', venue: 'BC Place, Vancouver',
          prediction: 'Turkey', confidence: 'medium', confidenceScore: 58,
          reasoning: 'Turkey have Hakan Calhanoglu (one of Europe\'s best midfielders) and Arda Güler (Real Madrid) — genuine quality. Australia are scrappy and organised but Turkey\'s technical superiority should edge this.',
          lmsPick: false, lmsNote: 'Too risky for LMS — Australia are competitive. Pick a different match this round.'
        },
        {
          homeTeam: 'USA', homeFlag: '🇺🇸',
          awayTeam: 'Australia', awayFlag: '🇦🇺',
          date: '19 June', time: '6:00pm', venue: 'Seattle Stadium',
          prediction: 'USA', confidence: 'high', confidenceScore: 69,
          reasoning: 'USA have the home advantage edge in Seattle. Australia\'s Socceroos are well-organised and punched above their weight in Qatar 2022 (reaching Round of 16). But the USA\'s depth should be decisive on home turf.',
          lmsPick: false, lmsNote: 'You likely used USA vs Paraguay in R1 already — can\'t reuse!'
        },
        {
          homeTeam: 'Turkey', homeFlag: '🇹🇷',
          awayTeam: 'Paraguay', awayFlag: '🇵🇾',
          date: '20 June', time: '4:00am', venue: 'SF Bay Area Stadium',
          prediction: 'Turkey', confidence: 'medium', confidenceScore: 63,
          reasoning: 'Turkey have the higher FIFA ranking and more individual quality. Paraguay are tough Copa América campaigners but Turkey\'s midfield quality led by Calhanoglu and Güler should create enough chances.',
          lmsPick: false, lmsNote: 'Medium risk — Turkey are decent but not elite. Check alternatives before committing.'
        },
        {
          homeTeam: 'Turkey', homeFlag: '🇹🇷',
          awayTeam: 'USA', awayFlag: '🇺🇸',
          date: '25 June', time: '3:00am', venue: 'LA Stadium',
          prediction: 'USA', confidence: 'medium', confidenceScore: 58,
          reasoning: 'This could be the group decider. USA at home gives them the edge but Turkey are genuinely dangerous — Güler and Calhanoglu can unlock any defence. Genuinely 50-50. Do not pick either team for LMS.',
          lmsPick: false, lmsNote: 'AVOID — this is genuinely 50/50. Do not waste a pick here!'
        },
        {
          homeTeam: 'Paraguay', homeFlag: '🇵🇾',
          awayTeam: 'Australia', awayFlag: '🇦🇺',
          date: '25 June', time: '3:00am', venue: 'SF Bay Area Stadium',
          prediction: 'Paraguay', confidence: 'medium', confidenceScore: 54,
          reasoning: 'Likely a dead rubber with both teams eliminated. Paraguay have Copa América quality; Australia are scrappy. Very unpredictable when both teams have nothing to play for. Avoid entirely.',
          lmsPick: false, lmsNote: 'AVOID — dead rubber, both teams possibly eliminated. Too unpredictable.'
        },
      ]
    },
    {
      id: 'E', color: '#2D9CDB',
      teams: [
        { name: 'Germany', flag: '🇩🇪' },
        { name: 'Curaçao', flag: '🇨🇼' },
        { name: 'Ivory Coast', flag: '🇨🇮' },
        { name: 'Ecuador', flag: '🇪🇨' },
      ],
      groupWinner: '🇩🇪 Germany', groupRunnerUp: '🇪🇨 Ecuador',
      matches: [
        {
          homeTeam: 'Germany', homeFlag: '🇩🇪',
          awayTeam: 'Curaçao', awayFlag: '🇨🇼',
          date: '14 June', time: '8:00pm', venue: 'Houston Stadium',
          prediction: 'Germany', confidence: 'elite', confidenceScore: 97,
          reasoning: 'Germany vs Curaçao is THE single safest pick in the entire 2026 World Cup. Curaçao has a population of 150,000; Germany have 4 World Cup titles and one of the deepest squads in football. Kai Havertz, Jamal Musiala, Florian Wirtz and Leroy Sané will destroy this opposition. Expected 5-0 or heavier.',
          lmsPick: true, lmsNote: '🔥 THE SINGLE SAFEST LMS PICK IN WC2026 — use this as your ROUND 1 banker!'
        },
        {
          homeTeam: 'Ivory Coast', homeFlag: '🇨🇮',
          awayTeam: 'Ecuador', awayFlag: '🇪🇨',
          date: '15 June', time: '12:00am', venue: 'Philadelphia Stadium',
          prediction: 'Ecuador', confidence: 'medium', confidenceScore: 57,
          reasoning: 'Ivory Coast have genuine quality (Haller, Kessié, Zaha) but Ecuador have Copa América pedigree and a physically imposing squad. This is a competitive 50-50 game — Ecuador slight edge based on recent South American form.',
          lmsPick: false, lmsNote: 'Too close for LMS — avoid this round.'
        },
        {
          homeTeam: 'Ivory Coast', homeFlag: '🇨🇮',
          awayTeam: 'Germany', awayFlag: '🇩🇪',
          date: '19 June', time: '9:00pm', venue: 'Toronto Stadium',
          prediction: 'Germany', confidence: 'high', confidenceScore: 80,
          reasoning: 'Germany are dominant in Group E and should handle Ivory Coast with quality to spare. The Ivorians will be competitive and have AFCON-winning quality but Germany\'s technical superiority and squad depth should be decisive.',
          lmsPick: false, lmsNote: 'Save Germany — you already used them vs Curaçao. Can\'t reuse until reset!'
        },
        {
          homeTeam: 'Ecuador', homeFlag: '🇪🇨',
          awayTeam: 'Curaçao', awayFlag: '🇨🇼',
          date: '20 June', time: '8:00pm', venue: 'Kansas City Stadium',
          prediction: 'Ecuador', confidence: 'elite', confidenceScore: 93,
          reasoning: 'Ecuador vs Curaçao — a full South American FIFA nation vs minnows from the Dutch Caribbean. Ecuador should win by 3+ goals. Perfect Round 2 pick if you used Germany in Round 1 against Curaçao.',
          lmsPick: true, lmsNote: 'Excellent Round 2 banker — if you opened with Germany vs Curaçao, follow up with Ecuador vs Curaçao!'
        },
        {
          homeTeam: 'Curaçao', homeFlag: '🇨🇼',
          awayTeam: 'Ivory Coast', awayFlag: '🇨🇮',
          date: '25 June', time: '9:00pm', venue: 'Philadelphia Stadium',
          prediction: 'Ivory Coast', confidence: 'high', confidenceScore: 81,
          reasoning: 'Ivory Coast have too much quality for Curaçao. The Ivorians will need points to advance and should dispatch the minnows comfortably. Good Round 3 pick if Ivory Coast haven\'t been used.',
          lmsPick: false, lmsNote: 'Decent backup Round 3 pick if you haven\'t used Ivory Coast yet.'
        },
        {
          homeTeam: 'Ecuador', homeFlag: '🇪🇨',
          awayTeam: 'Germany', awayFlag: '🇩🇪',
          date: '25 June', time: '8:00pm', venue: 'NY/NJ Stadium',
          prediction: 'Germany', confidence: 'high', confidenceScore: 76,
          reasoning: 'Germany should be already qualified and will still field a strong side for group position. Ecuador will push hard but Germany are a class above. However rotation risk is real — check team news before picking.',
          lmsPick: false, lmsNote: 'Rotation risk — Germany may rest starters. Check team news carefully.'
        },
      ]
    },
    {
      id: 'F', color: '#9B59B6',
      teams: [
        { name: 'Netherlands', flag: '🇳🇱' },
        { name: 'Japan', flag: '🇯🇵' },
        { name: 'Sweden', flag: '🇸🇪' },
        { name: 'Tunisia', flag: '🇹🇳' },
      ],
      groupWinner: '🇳🇱 Netherlands', groupRunnerUp: '🇯🇵 Japan',
      matches: [
        {
          homeTeam: 'Netherlands', homeFlag: '🇳🇱',
          awayTeam: 'Japan', awayFlag: '🇯🇵',
          date: '14 June', time: '9:00pm', venue: 'Dallas Stadium',
          prediction: 'Netherlands', confidence: 'high', confidenceScore: 68,
          reasoning: 'Netherlands have a strong squad built around Van Dijk, Gakpo and the Liverpool/Premier League contingent. BUT Japan topped a group containing Germany in Qatar 2022 — they are not to be underestimated. Netherlands edge it but not a comfortable LMS pick.',
          lmsPick: false, lmsNote: 'Avoid — Japan are dangerous and capable of an upset. Pick Sweden vs Tunisia instead.'
        },
        {
          homeTeam: 'Sweden', homeFlag: '🇸🇪',
          awayTeam: 'Tunisia', awayFlag: '🇹🇳',
          date: '15 June', time: '9:00am', venue: 'Monterrey Stadium',
          prediction: 'Sweden', confidence: 'high', confidenceScore: 75,
          reasoning: 'Sweden are a competitive Scandinavian side with physicality and organisation. Tunisia have pace and defensive quality but Sweden\'s European pedigree should be enough. Solid and comfortable if not spectacular.',
          lmsPick: true, lmsNote: 'Good early LMS pick — Sweden vs Tunisia is the safer Group F option. Pick this over Netherlands vs Japan!'
        },
        {
          homeTeam: 'Netherlands', homeFlag: '🇳🇱',
          awayTeam: 'Sweden', awayFlag: '🇸🇪',
          date: '20 June', time: '6:00pm', venue: 'Houston Stadium',
          prediction: 'Netherlands', confidence: 'high', confidenceScore: 72,
          reasoning: 'Netherlands are the superior side with better individual quality. Sweden will make it competitive and physical but the Dutch attacking trio should ultimately prove too much.',
          lmsPick: false, lmsNote: 'Decent pick — but save Netherlands for knockouts if possible. Sweden is already burned.'
        },
        {
          homeTeam: 'Tunisia', homeFlag: '🇹🇳',
          awayTeam: 'Japan', awayFlag: '🇯🇵',
          date: '21 June', time: '9:00am', venue: 'Monterrey Stadium',
          prediction: 'Japan', confidence: 'medium', confidenceScore: 62,
          reasoning: 'Japan have evolved into a serious footballing nation with Bundesliga and Premier League quality throughout. Their attacking variety and pressing style should be enough against Tunisia\'s defensive setup.',
          lmsPick: false, lmsNote: 'Medium confidence — Tunisia could make this difficult. Not recommended for LMS.'
        },
        {
          homeTeam: 'Japan', homeFlag: '🇯🇵',
          awayTeam: 'Sweden', awayFlag: '🇸🇪',
          date: '26 June', time: '12:00am', venue: 'Dallas Stadium',
          prediction: 'Japan', confidence: 'medium', confidenceScore: 56,
          reasoning: 'Japan have been steadily improving and can upset European opposition. Sweden will fight hard — genuinely competitive. Both teams may already be through or eliminated, adding rotation risk.',
          lmsPick: false, lmsNote: 'AVOID — too close to call, high rotation risk for both sides.'
        },
        {
          homeTeam: 'Tunisia', homeFlag: '🇹🇳',
          awayTeam: 'Netherlands', awayFlag: '🇳🇱',
          date: '26 June', time: '12:00am', venue: 'Kansas City Stadium',
          prediction: 'Netherlands', confidence: 'high', confidenceScore: 78,
          reasoning: 'Netherlands should win this comfortably. Tunisia are unlikely to threaten a Dutch side playing for group leadership. Check Dutch team news — if already qualified, they may rest Van Dijk and others.',
          lmsPick: false, lmsNote: 'Decent if Netherlands not yet used — but check rotation risk first.'
        },
      ]
    },
    {
      id: 'G', color: '#E74C3C',
      teams: [
        { name: 'Belgium', flag: '🇧🇪' },
        { name: 'Egypt', flag: '🇪🇬' },
        { name: 'Iran', flag: '🇮🇷' },
        { name: 'New Zealand', flag: '🇳🇿' },
      ],
      groupWinner: '🇧🇪 Belgium', groupRunnerUp: '🇪🇬 Egypt',
      matches: [
        {
          homeTeam: 'Belgium', homeFlag: '🇧🇪',
          awayTeam: 'Egypt', awayFlag: '🇪🇬',
          date: '15 June', time: '6:00pm', venue: 'Lumen Field, Seattle',
          prediction: 'Belgium', confidence: 'high', confidenceScore: 74,
          reasoning: 'Belgium\'s golden generation is fading but still potent — De Bruyne, Lukaku and Doku give them real quality. Egypt rely heavily on Mo Salah at Liverpool but their squad depth is limited. Belgium should control this and win.',
          lmsPick: true, lmsNote: 'Solid Round 1 pick — Belgium have enough quality to see off Egypt comfortably.'
        },
        {
          homeTeam: 'Iran', homeFlag: '🇮🇷',
          awayTeam: 'New Zealand', awayFlag: '🇳🇿',
          date: '15 June', time: '9:00pm', venue: 'SoFi Stadium, Inglewood',
          prediction: 'Iran', confidence: 'high', confidenceScore: 78,
          reasoning: 'Iran are Asia\'s most experienced side with strong defensive organisation and World Cup pedigree. New Zealand qualified via the OFC playoff and are massive underdogs — this is Iran\'s most winnable game of the group.',
          lmsPick: true, lmsNote: 'Very safe Round 1 alternative — Iran vs New Zealand is one of Group G\'s safest picks.'
        },
        {
          homeTeam: 'Belgium', homeFlag: '🇧🇪',
          awayTeam: 'Iran', awayFlag: '🇮🇷',
          date: '21 June', time: '9:00pm', venue: 'SoFi Stadium, Inglewood',
          prediction: 'Belgium', confidence: 'high', confidenceScore: 72,
          reasoning: 'Belgium have too much quality for Iran across the pitch. Iran will defend deep and look to frustrate, but De Bruyne\'s creativity and Lukaku\'s finishing should be enough to break them down.',
          lmsPick: false, lmsNote: 'Good Round 2 pick if you haven\'t used Belgium yet — Iran defend well but Belgium should edge it.'
        },
        {
          homeTeam: 'New Zealand', homeFlag: '🇳🇿',
          awayTeam: 'Egypt', awayFlag: '🇪🇬',
          date: '21 June', time: '6:00pm', venue: 'BC Place, Vancouver',
          prediction: 'Egypt', confidence: 'medium', confidenceScore: 63,
          reasoning: 'Egypt should have enough quality through Mo Salah and their Premier League-based players to beat New Zealand. However New Zealand are organised and scrappy — Egypt need to show up. Medium confidence.',
          lmsPick: false, lmsNote: 'Decent backup if Egypt not yet used — but NZ will make it hard. Check alternatives first.'
        },
        {
          homeTeam: 'Egypt', homeFlag: '🇪🇬',
          awayTeam: 'Iran', awayFlag: '🇮🇷',
          date: '26 June', time: '9:00pm', venue: 'Lumen Field, Seattle',
          prediction: 'Egypt', confidence: 'medium', confidenceScore: 57,
          reasoning: 'Genuinely competitive game — both teams will likely need points to qualify. Iran are organised and hard to break down. Egypt have the Salah factor but this is tight. Rotation risk too if either team is already through.',
          lmsPick: false, lmsNote: 'AVOID — too close and potential dead rubber. Check qualification status first.'
        },
        {
          homeTeam: 'New Zealand', homeFlag: '🇳🇿',
          awayTeam: 'Belgium', awayFlag: '🇧🇪',
          date: '26 June', time: '6:00pm', venue: 'BC Place, Vancouver',
          prediction: 'Belgium', confidence: 'high', confidenceScore: 81,
          reasoning: 'Belgium should win this comfortably even with rotation. New Zealand are severely outclassed and will likely be eliminated before this match. This is the safest Round 3 pick in Group G.',
          lmsPick: false, lmsNote: 'Good Round 3 pick — but check Belgium rotation risk if already qualified.'
        },
      ]
    },
    {
      id: 'H', color: '#F39C12',
      teams: [
        { name: 'Spain', flag: '🇪🇸' },
        { name: 'Cape Verde', flag: '🇨🇻' },
        { name: 'Saudi Arabia', flag: '🇸🇦' },
        { name: 'Uruguay', flag: '🇺🇾' },
      ],
      groupWinner: '🇪🇸 Spain', groupRunnerUp: '🇺🇾 Uruguay',
      matches: [
        {
          homeTeam: 'Spain', homeFlag: '🇪🇸',
          awayTeam: 'Cape Verde', awayFlag: '🇨🇻',
          date: '15 June', time: '3:00pm', venue: 'Mercedes-Benz Stadium, Atlanta',
          prediction: 'Spain', confidence: 'elite', confidenceScore: 96,
          reasoning: 'Spain are defending European Champions — Yamal, Pedri, Morata, Olmo, Carvajal. Cape Verde are a tiny Atlantic island nation competing in their first World Cup. Spain should win 4-0 or heavier without breaking sweat. This is one of the tournament\'s safest picks.',
          lmsPick: true, lmsNote: '🔥 BANKER — Spain vs Cape Verde is the safest Group H pick. One of the best in WC2026.'
        },
        {
          homeTeam: 'Saudi Arabia', homeFlag: '🇸🇦',
          awayTeam: 'Uruguay', awayFlag: '🇺🇾',
          date: '15 June', time: '6:00pm', venue: 'Hard Rock Stadium, Miami',
          prediction: 'Uruguay', confidence: 'medium', confidenceScore: 62,
          reasoning: 'Uruguay have Darwin Núñez (Liverpool) and Fede Valverde (Real Madrid) — genuine quality. Saudi Arabia shocked Argentina in 2022 and can never be written off. Uruguay should win but this is not a comfortable LMS pick.',
          lmsPick: false, lmsNote: 'Too risky for Round 1 — Saudi Arabia pulled off the biggest WC shock in 2022. Pick Spain instead.'
        },
        {
          homeTeam: 'Spain', homeFlag: '🇪🇸',
          awayTeam: 'Saudi Arabia', awayFlag: '🇸🇦',
          date: '21 June', time: '9:00pm', venue: 'Mercedes-Benz Stadium, Atlanta',
          prediction: 'Spain', confidence: 'high', confidenceScore: 83,
          reasoning: 'Spain have the technical superiority and squad depth to dismantle Saudi Arabia. The 2022 upset over Argentina was special — Spain are a different beast. Expect Spain to dominate possession and create numerous chances.',
          lmsPick: false, lmsNote: 'Very good Round 2 pick — Spain vs Saudi Arabia if you haven\'t used Spain yet.'
        },
        {
          homeTeam: 'Uruguay', homeFlag: '🇺🇾',
          awayTeam: 'Cape Verde', awayFlag: '🇨🇻',
          date: '21 June', time: '6:00pm', venue: 'Hard Rock Stadium, Miami',
          prediction: 'Uruguay', confidence: 'high', confidenceScore: 86,
          reasoning: 'Uruguay should cruise here. Cape Verde are competitive for an island nation but have no answer for Darwin Núñez and the South American quality Uruguay possess. Safe pick if Spain have already been used.',
          lmsPick: true, lmsNote: 'Excellent Round 2 alternative — Uruguay vs Cape Verde is the safe pick if Spain already used.'
        },
        {
          homeTeam: 'Cape Verde', homeFlag: '🇨🇻',
          awayTeam: 'Saudi Arabia', awayFlag: '🇸🇦',
          date: '26 June', time: '6:00pm', venue: 'NRG Stadium, Houston',
          prediction: 'Saudi Arabia', confidence: 'medium', confidenceScore: 62,
          reasoning: 'Saudi Arabia should be strong enough to beat Cape Verde — both teams likely needing a result. The Saudis have Premier League and La Liga quality. Cape Verde will fight hard but lack the depth.',
          lmsPick: false, lmsNote: 'Decent backup Round 3 pick — Saudi Arabia vs Cape Verde is manageable.'
        },
        {
          homeTeam: 'Uruguay', homeFlag: '🇺🇾',
          awayTeam: 'Spain', awayFlag: '🇪🇸',
          date: '26 June', time: '9:00pm', venue: 'Estadio Akron, Zapopan',
          prediction: 'Spain', confidence: 'medium', confidenceScore: 60,
          reasoning: 'This could be the group decider. Both teams are strong and rotation risk is real if both already qualified. Uruguay have the firepower to hurt Spain on the counter. Too competitive and uncertain for LMS.',
          lmsPick: false, lmsNote: 'AVOID — group decider between two quality sides. High rotation risk too.'
        },
      ]
    },
    {
      id: 'I', color: '#27AE60',
      teams: [
        { name: 'France', flag: '🇫🇷' },
        { name: 'Senegal', flag: '🇸🇳' },
        { name: 'Iraq', flag: '🇮🇶' },
        { name: 'Norway', flag: '🇳🇴' },
      ],
      groupWinner: '🇫🇷 France', groupRunnerUp: '🇳🇴 Norway',
      matches: [
        {
          homeTeam: 'France', homeFlag: '🇫🇷',
          awayTeam: 'Senegal', awayFlag: '🇸🇳',
          date: '16 June', time: '9:00pm', venue: 'MetLife Stadium, East Rutherford',
          prediction: 'France', confidence: 'high', confidenceScore: 72,
          reasoning: 'France are tournament favourites with Mbappé, Griezmann, Camavinga and Tchouaméni. Senegal are Africa\'s strongest side with Mané, Koulibaly and Champions League quality throughout — this is a real game. France have the edge but not by a comfortable margin.',
          lmsPick: false, lmsNote: 'Good pick but Senegal are dangerous — France vs Iraq (Round 2) is far safer.'
        },
        {
          homeTeam: 'Iraq', homeFlag: '🇮🇶',
          awayTeam: 'Norway', awayFlag: '🇳🇴',
          date: '16 June', time: '6:00pm', venue: 'Gillette Stadium, Foxborough',
          prediction: 'Norway', confidence: 'high', confidenceScore: 76,
          reasoning: 'Norway have Erling Haaland — the best striker in the world — and a decent squad built around European regulars. Iraq qualified via Asia and are significant underdogs. Norway should win this, though Haaland alone doesn\'t guarantee easy football.',
          lmsPick: true, lmsNote: 'Good Round 1 pick — Norway vs Iraq, Haaland should do the damage.'
        },
        {
          homeTeam: 'France', homeFlag: '🇫🇷',
          awayTeam: 'Iraq', awayFlag: '🇮🇶',
          date: '22 June', time: '9:00pm', venue: 'Lincoln Financial Field, Philadelphia',
          prediction: 'France', confidence: 'elite', confidenceScore: 96,
          reasoning: 'France vs Iraq is the safest pick in Group I and one of the best in the entire tournament. Iraq have qualified via a weak Asian path and have no answer for Mbappé, Griezmann and French technical quality. Expected 4-0 minimum.',
          lmsPick: true, lmsNote: '🔥 BANKER — France vs Iraq is an elite pick. Save France for this match, not vs Senegal!'
        },
        {
          homeTeam: 'Norway', homeFlag: '🇳🇴',
          awayTeam: 'Senegal', awayFlag: '🇸🇳',
          date: '22 June', time: '6:00pm', venue: 'MetLife Stadium, East Rutherford',
          prediction: 'Norway', confidence: 'medium', confidenceScore: 59,
          reasoning: 'Norway have the individual quality with Haaland but Senegal are well-organised, physical and dangerous in wide areas. This is genuinely competitive — Senegal reached the AFCON final and have Champions League players. Not a comfortable pick.',
          lmsPick: false, lmsNote: 'Risky — Senegal can match Norway. Avoid unless your pool is running low.'
        },
        {
          homeTeam: 'Norway', homeFlag: '🇳🇴',
          awayTeam: 'France', awayFlag: '🇫🇷',
          date: '26 June', time: '9:00pm', venue: 'Gillette Stadium, Foxborough',
          prediction: 'France', confidence: 'medium', confidenceScore: 61,
          reasoning: 'France should win but Haaland makes Norway dangerous in any game. If France are already qualified, rotation is a real risk. Tight game possible — too uncertain for LMS.',
          lmsPick: false, lmsNote: 'AVOID — Haaland and rotation risk make this unpredictable. Find a safer pick.'
        },
        {
          homeTeam: 'Senegal', homeFlag: '🇸🇳',
          awayTeam: 'Iraq', awayFlag: '🇮🇶',
          date: '26 June', time: '6:00pm', venue: 'BMO Field, Toronto',
          prediction: 'Senegal', confidence: 'high', confidenceScore: 79,
          reasoning: 'Senegal have too much quality for Iraq — Mané, Diatta and defensive organisation that Iraq can\'t breach. Good safe pick for Round 3 if Senegal haven\'t been used yet.',
          lmsPick: false, lmsNote: 'Solid Round 3 backup if Senegal not yet used — Iraq are significantly outclassed.'
        },
      ]
    },
    {
      id: 'J', color: '#8E44AD',
      teams: [
        { name: 'Argentina', flag: '🇦🇷' },
        { name: 'Algeria', flag: '🇩🇿' },
        { name: 'Austria', flag: '🇦🇹' },
        { name: 'Jordan', flag: '🇯🇴' },
      ],
      groupWinner: '🇦🇷 Argentina', groupRunnerUp: '🇩🇿 Algeria',
      matches: [
        {
          homeTeam: 'Argentina', homeFlag: '🇦🇷',
          awayTeam: 'Algeria', awayFlag: '🇩🇿',
          date: '16 June', time: '6:00pm', venue: 'Arrowhead Stadium, Kansas City',
          prediction: 'Argentina', confidence: 'high', confidenceScore: 74,
          reasoning: 'Argentina are reigning world champions with Messi, Di María, De Paul and Martínez. Algeria have Riyad Mahrez and qualified strongly through CAF. Reigning champions should take this but Algeria are no pushovers.',
          lmsPick: false, lmsNote: 'Good pick but save Argentina for vs Jordan — that\'s the banker in this group.'
        },
        {
          homeTeam: 'Austria', homeFlag: '🇦🇹',
          awayTeam: 'Jordan', awayFlag: '🇯🇴',
          date: '16 June', time: '3:00pm', venue: 'Levi\'s Stadium, Santa Clara',
          prediction: 'Austria', confidence: 'high', confidenceScore: 81,
          reasoning: 'Austria have Alaba (Real Madrid), Sabitzer (Manchester United) and a well-organised European squad. Jordan are at their first ever World Cup — a remarkable achievement but severely outclassed at this level.',
          lmsPick: true, lmsNote: 'Excellent Round 1 pick — Austria vs Jordan, Jordan are first-time WC qualifiers with very limited quality.'
        },
        {
          homeTeam: 'Argentina', homeFlag: '🇦🇷',
          awayTeam: 'Austria', awayFlag: '🇦🇹',
          date: '22 June', time: '9:00pm', venue: 'AT&T Stadium, Arlington',
          prediction: 'Argentina', confidence: 'high', confidenceScore: 73,
          reasoning: 'Argentina vs Austria is a competitive European vs South American clash. Austria are well-drilled and will make it difficult. Argentina have the individual quality edge with Messi and Martínez but expect a tight game.',
          lmsPick: false, lmsNote: 'Decent pick but not comfortable. Argentina vs Jordan (Round 3) is your banker in this group.'
        },
        {
          homeTeam: 'Jordan', homeFlag: '🇯🇴',
          awayTeam: 'Algeria', awayFlag: '🇩🇿',
          date: '22 June', time: '6:00pm', venue: 'Levi\'s Stadium, Santa Clara',
          prediction: 'Algeria', confidence: 'high', confidenceScore: 76,
          reasoning: 'Algeria should have too much quality for Jordan. Mahrez and the CAF-experienced squad should control this match. Jordan will defend and hope, but Algeria\'s pace and technical quality should prevail.',
          lmsPick: false, lmsNote: 'Solid if Algeria not yet used — Jordan can\'t score enough to threaten Algeria.'
        },
        {
          homeTeam: 'Algeria', homeFlag: '🇩🇿',
          awayTeam: 'Austria', awayFlag: '🇦🇹',
          date: '27 June', time: '6:00pm', venue: 'Arrowhead Stadium, Kansas City',
          prediction: 'Austria', confidence: 'medium', confidenceScore: 58,
          reasoning: 'Very competitive — both teams fighting for second place likely. Austria have the European consistency edge but Algeria have dangerous pace. Genuinely too close to call for LMS.',
          lmsPick: false, lmsNote: 'AVOID — too close to call, qualification decider between evenly matched sides.'
        },
        {
          homeTeam: 'Jordan', homeFlag: '🇯🇴',
          awayTeam: 'Argentina', awayFlag: '🇦🇷',
          date: '27 June', time: '9:00pm', venue: 'AT&T Stadium, Arlington',
          prediction: 'Argentina', confidence: 'elite', confidenceScore: 97,
          reasoning: 'Argentina vs Jordan is THE safest pick in Group J and one of the safest in the tournament. Jordan at their first ever World Cup with no players at top European clubs vs the reigning world champions. Expect a 5-0 or heavier win for Argentina.',
          lmsPick: true, lmsNote: '🔥 BANKER — Argentina vs Jordan is elite. Save Argentina for this exact match!'
        },
      ]
    },
    {
      id: 'K', color: '#C0392B',
      teams: [
        { name: 'Portugal', flag: '🇵🇹' },
        { name: 'DR Congo', flag: '🇨🇩' },
        { name: 'Uzbekistan', flag: '🇺🇿' },
        { name: 'Colombia', flag: '🇨🇴' },
      ],
      groupWinner: '🇵🇹 Portugal', groupRunnerUp: '🇨🇴 Colombia',
      matches: [
        {
          homeTeam: 'Portugal', homeFlag: '🇵🇹',
          awayTeam: 'DR Congo', awayFlag: '🇨🇩',
          date: '17 June', time: '9:00pm', venue: 'NRG Stadium, Houston',
          prediction: 'Portugal', confidence: 'high', confidenceScore: 80,
          reasoning: 'Portugal have Ronaldo, Bruno Fernandes, Rafael Leão and Bernardo Silva — a squad full of Champions League and Premier League quality. DR Congo have pace and physicality but lack technical refinement. Portugal should control this.',
          lmsPick: true, lmsNote: 'Good Round 1 pick — Portugal have clear quality over DR Congo.'
        },
        {
          homeTeam: 'Uzbekistan', homeFlag: '🇺🇿',
          awayTeam: 'Colombia', awayFlag: '🇨🇴',
          date: '17 June', time: '6:00pm', venue: 'Estadio Azteca, Mexico City',
          prediction: 'Colombia', confidence: 'high', confidenceScore: 82,
          reasoning: 'Colombia are a genuine South American force — James Rodríguez, Luis Díaz (Liverpool), Falcao\'s heir Borré. Uzbekistan are making inroads in Asian football but this is a huge quality gap. Colombia should win comfortably.',
          lmsPick: true, lmsNote: 'Excellent Round 1 pick — Colombia vs Uzbekistan is one of the safest in Group K.'
        },
        {
          homeTeam: 'Portugal', homeFlag: '🇵🇹',
          awayTeam: 'Uzbekistan', awayFlag: '🇺🇿',
          date: '23 June', time: '9:00pm', venue: 'NRG Stadium, Houston',
          prediction: 'Portugal', confidence: 'elite', confidenceScore: 94,
          reasoning: 'Portugal vs Uzbekistan is one of the safest picks in the entire WC2026. Uzbekistan are playing their first World Cup; Portugal have a squad worth over £1 billion. Bruno, Leão and Ronaldo should destroy this opposition. Expected 4-0+.',
          lmsPick: true, lmsNote: '🔥 BANKER — Portugal vs Uzbekistan is elite certainty. One of Group K\'s best LMS picks.'
        },
        {
          homeTeam: 'Colombia', homeFlag: '🇨🇴',
          awayTeam: 'DR Congo', awayFlag: '🇨🇩',
          date: '23 June', time: '6:00pm', venue: 'Estadio Akron, Zapopan',
          prediction: 'Colombia', confidence: 'high', confidenceScore: 73,
          reasoning: 'Colombia have the technical quality and tactical discipline to handle DR Congo. DR Congo are physical and can spring surprises but Colombia\'s Premier League contingent should have enough to take the win.',
          lmsPick: false, lmsNote: 'Solid Round 2 pick — Colombia vs DR Congo if Portugal already used.'
        },
        {
          homeTeam: 'Colombia', homeFlag: '🇨🇴',
          awayTeam: 'Portugal', awayFlag: '🇵🇹',
          date: '27 June', time: '9:00pm', venue: 'Hard Rock Stadium, Miami',
          prediction: 'Portugal', confidence: 'medium', confidenceScore: 59,
          reasoning: 'Group decider — both teams are strong and this will be competitive. Colombia beat Argentina in Copa América 2024. Portugal will be cautious. High rotation risk if either already qualified. Too uncertain for LMS.',
          lmsPick: false, lmsNote: 'AVOID — group decider, rotation risk, and Colombia can genuinely beat Portugal.'
        },
        {
          homeTeam: 'DR Congo', homeFlag: '🇨🇩',
          awayTeam: 'Uzbekistan', awayFlag: '🇺🇿',
          date: '27 June', time: '6:00pm', venue: 'Mercedes-Benz Stadium, Atlanta',
          prediction: 'DR Congo', confidence: 'medium', confidenceScore: 65,
          reasoning: 'DR Congo should have enough physicality and pace to beat Uzbekistan in a dead rubber. Both teams likely eliminated but DR Congo\'s African pedigree should give them the edge.',
          lmsPick: false, lmsNote: 'Possible backup Round 3 pick — DR Congo vs Uzbekistan if no other options.'
        },
      ]
    },
    {
      id: 'L', color: '#1ABC9C',
      teams: [
        { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        { name: 'Croatia', flag: '🇭🇷' },
        { name: 'Ghana', flag: '🇬🇭' },
        { name: 'Panama', flag: '🇵🇦' },
      ],
      groupWinner: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 England', groupRunnerUp: '🇭🇷 Croatia',
      matches: [
        {
          homeTeam: 'England', homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
          awayTeam: 'Croatia', awayFlag: '🇭🇷',
          date: '17 June', time: '9:00pm', venue: 'AT&T Stadium, Arlington',
          prediction: 'England', confidence: 'high', confidenceScore: 69,
          reasoning: 'England have Bellingham (Real Madrid), Saka (Arsenal), Foden (Man City) — a genuinely world-class attacking setup. Croatia have Modric, still brilliant at 40, but their squad is ageing. England should edge this but Croatia always show up at tournaments.',
          lmsPick: false, lmsNote: 'Decent pick but Croatia are dangerous — England vs Panama (Round 3) is your banker here.'
        },
        {
          homeTeam: 'Ghana', homeFlag: '🇬🇭',
          awayTeam: 'Panama', awayFlag: '🇵🇦',
          date: '17 June', time: '6:00pm', venue: 'BMO Field, Toronto',
          prediction: 'Ghana', confidence: 'high', confidenceScore: 71,
          reasoning: 'Ghana have Premier League quality with Mohammed Kudus (West Ham), Thomas Partey (Arsenal) and Jordan Ayew. Panama are a CONCACAF qualifier with limited international pedigree. Ghana should win this comfortably.',
          lmsPick: true, lmsNote: 'Good Round 1 pick — Ghana vs Panama, Panama are the weakest team in Group L.'
        },
        {
          homeTeam: 'England', homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
          awayTeam: 'Ghana', awayFlag: '🇬🇭',
          date: '23 June', time: '9:00pm', venue: 'Gillette Stadium, Foxborough',
          prediction: 'England', confidence: 'high', confidenceScore: 77,
          reasoning: 'England have significantly more firepower than Ghana. Kudus and Partey give Ghana a chance but England\'s depth — Bellingham, Saka, Foden, Salah (if eligible), Palmer — is too much for Ghana to handle over 90 minutes.',
          lmsPick: false, lmsNote: 'Solid Round 2 pick — England vs Ghana if you haven\'t used England yet.'
        },
        {
          homeTeam: 'Panama', homeFlag: '🇵🇦',
          awayTeam: 'Croatia', awayFlag: '🇭🇷',
          date: '23 June', time: '6:00pm', venue: 'BMO Field, Toronto',
          prediction: 'Croatia', confidence: 'high', confidenceScore: 76,
          reasoning: 'Croatia will be too experienced and technically superior for Panama. Modric, Kovačić and Gvardiol provide world-class quality. Panama will work hard but Croatia should win this with relative comfort.',
          lmsPick: false, lmsNote: 'Good Round 2 backup — Croatia vs Panama if England already used.'
        },
        {
          homeTeam: 'Panama', homeFlag: '🇵🇦',
          awayTeam: 'England', awayFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
          date: '27 June', time: '9:00pm', venue: 'MetLife Stadium, East Rutherford',
          prediction: 'England', confidence: 'elite', confidenceScore: 95,
          reasoning: 'England vs Panama is THE safest pick in Group L. Panama are CONCACAF qualifiers with no realistic chance against a full-strength England side featuring Bellingham, Saka, Foden and Kane. Expected 4-0 or heavier.',
          lmsPick: true, lmsNote: '🔥 BANKER — England vs Panama is elite certainty. Save England for this exact Round 3 match!'
        },
        {
          homeTeam: 'Croatia', homeFlag: '🇭🇷',
          awayTeam: 'Ghana', awayFlag: '🇬🇭',
          date: '27 June', time: '6:00pm', venue: 'Lincoln Financial Field, Philadelphia',
          prediction: 'Croatia', confidence: 'medium', confidenceScore: 63,
          reasoning: 'Croatia should edge this but Ghana are physical and motivated. If Croatia are already through they may rotate Modric and Kovačić. Decent pick but check team news before pulling the trigger.',
          lmsPick: false, lmsNote: 'Decent Round 3 backup — Croatia vs Ghana with rotation caveat.'
        },
      ]
    },
  ];
}
