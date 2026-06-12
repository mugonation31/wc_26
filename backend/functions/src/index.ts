import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();

const FOOTBALL_API_KEY = defineSecret('FOOTBALL_DATA_API_KEY');
const WC_API_BASE = 'https://api.football-data.org/v4';

// Maps app team names → aliases used by football-data.org
const NAME_ALIASES: Record<string, string[]> = {
  'South Korea':  ['Korea Republic'],
  'Czech Republic': ['Czechia'],
  'Ivory Coast':  ["Côte d'Ivoire", "Cote d'Ivoire"],
  'Bosnia & Herz.': ['Bosnia and Herzegovina'],
  'DR Congo':     ['Congo DR', 'Democratic Republic of Congo'],
  'Curaçao':      ['Curacao'],
  'USA':          ['United States'],
};

// ── Types ────────────────────────────────────────────────────────────────────

interface FDMatch {
  matchday: number;
  status: string;
  homeTeam: { name: string; shortName: string };
  awayTeam: { name: string; shortName: string };
  score: { fullTime: { home: number | null; away: number | null } };
}

interface RoundPick {
  team: string;
  flag: string;
  pickedAt?: admin.firestore.Timestamp;
  status?: 'won' | 'drew' | 'lost';
}

interface UserPicksDoc {
  uid: string;
  rounds: Record<string, RoundPick>;
  eliminated: boolean;
}

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchFinishedMatches(apiKey: string): Promise<FDMatch[]> {
  const { data } = await axios.get<{ matches: FDMatch[] }>(
    `${WC_API_BASE}/competitions/WC/matches?status=FINISHED`,
    { headers: { 'X-Auth-Token': apiKey } }
  );
  return data.matches;
}

// ── Matching ─────────────────────────────────────────────────────────────────

function nameMatches(fdName: string, appName: string): boolean {
  const aliases = [appName, ...(NAME_ALIASES[appName] ?? [])];
  return aliases.some(a => a.toLowerCase() === fdName.toLowerCase());
}

function getPickResult(match: FDMatch, team: string): 'won' | 'drew' | 'lost' | null {
  const { homeTeam, awayTeam, score } = match;
  const h = score.fullTime.home;
  const a = score.fullTime.away;
  if (h === null || a === null) return null;

  const isHome = nameMatches(homeTeam.name, team) || nameMatches(homeTeam.shortName, team);
  const isAway = nameMatches(awayTeam.name, team) || nameMatches(awayTeam.shortName, team);
  if (!isHome && !isAway) return null;

  if (h === a) return 'drew';
  return (isHome ? h > a : a > h) ? 'won' : 'lost';
}

// ── Core logic ───────────────────────────────────────────────────────────────

async function processMatchResults(apiKey: string): Promise<{ scanned: number; updated: number }> {
  const matches = await fetchFinishedMatches(apiKey);

  // Group-stage matchday 1/2/3 maps directly to LMS round 1/2/3
  const byRound = new Map<number, FDMatch[]>();
  for (const m of matches) {
    if (m.matchday >= 1 && m.matchday <= 3) {
      const list = byRound.get(m.matchday) ?? [];
      list.push(m);
      byRound.set(m.matchday, list);
    }
  }

  const picksSnap = await db.collection('picks').get();
  const batch = db.batch();
  let updated = 0;

  for (const docSnap of picksSnap.docs) {
    const docData = docSnap.data() as UserPicksDoc;
    let changed = false;
    let eliminated = docData.eliminated ?? false;
    // deep-copy rounds so we can mutate safely
    const rounds: Record<string, RoundPick> = JSON.parse(JSON.stringify(docData.rounds ?? {}));

    for (const [roundKey, pick] of Object.entries(rounds)) {
      if (pick.status) continue; // already resolved, skip

      for (const match of byRound.get(Number(roundKey)) ?? []) {
        const result = getPickResult(match, pick.team);
        if (result !== null) {
          rounds[roundKey] = { ...pick, status: result };
          if (result !== 'won') eliminated = true;
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      batch.update(docSnap.ref, { rounds, eliminated });
      updated++;
    }
  }

  await batch.commit();
  return { scanned: picksSnap.size, updated };
}

// ── Exported functions ────────────────────────────────────────────────────────

// Runs nightly at midnight UTC — covers every matchday during the group stage
export const processResults = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'UTC', secrets: [FOOTBALL_API_KEY] },
  async () => {
    await processMatchResults(FOOTBALL_API_KEY.value());
  }
);

// Callable: requires Firebase Auth — admin can trigger manually from the app or console
export const triggerProcessResults = onCall(
  { secrets: [FOOTBALL_API_KEY] },
  async () => processMatchResults(FOOTBALL_API_KEY.value())
);

