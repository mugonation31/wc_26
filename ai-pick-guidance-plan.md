# AI Pick Guidance — Future Plan

## What it is

An "AI brain" that gives users contextual pick recommendations as they move through the competition. Rather than static labels, it reasons about the full picture each round and explains its suggestions.

## Why Claude API

- Reasons across multiple variables at once: upcoming fixtures, team form, teams already used, leaderboard position, rounds remaining
- Explains *why* a pick is good in natural language ("Argentina face a bottom-half side who've conceded 8 in 3 games — ideal banker")
- Adapts as the tournament progresses — early advice differs from late ("preserve your strongest picks" vs "use Brazil now")
- No training or fine-tuning needed — prompt engineering handles the domain knowledge
- Model: `claude-sonnet-4-6` (fast + smart enough for multi-variable reasoning)

## Cost estimate

~1,000 tokens per guidance request at ~$3/MTok input = fractions of a cent per user per round. Negligible at small scale.

## Architecture

```
Firebase Callable Function: getPickGuidance(uid, roundNumber)
  → fetch user's used teams from Firestore (cannot reuse a team)
  → fetch upcoming round fixtures + team form from football-data.org
  → call Claude API with:
      - fixtures + recent form data
      - teams already burned by this user
      - user's current position / elimination status
  → return ranked picks + reasoning text
```

Frontend surface: **Strategy tab** — show top 3 AI-recommended picks for the current round, each with a short reasoning blurb and a quality label (BANKER / NAILED ON / CONFIDENT).

## What needs to be done

1. Sign up for Anthropic API access at console.anthropic.com
2. Add `ANTHROPIC_API_KEY` as a Firebase secret: `firebase functions:secrets:set ANTHROPIC_API_KEY`
3. Add `@anthropic-ai/sdk` to `backend/functions/`
4. Write `getPickGuidance` callable Cloud Function (new export in `backend/functions/src/index.ts`)
5. Add `PickGuidanceService` to frontend that calls the function
6. Build out the Strategy tab panel to display recommendations

## Dependencies

- Anthropic API key (paid, usage-based)
- `football-data.org` API key (already in place for results processing)
- Firebase Blaze plan (already required for Cloud Functions)
