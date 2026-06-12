import { Injectable, signal } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserPicks } from './picks.service';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  entries = signal<UserPicks[]>([]);
  loading = signal(false);

  error = signal<string | null>(null);

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const snap = await getDocs(collection(db, 'picks'));
      const data = snap.docs.map(d => d.data() as UserPicks);
      data.sort((a, b) => {
        if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
        return Object.keys(b.rounds ?? {}).length - Object.keys(a.rounds ?? {}).length;
      });
      this.entries.set(data);
    } catch (e) {
      this.error.set('Could not load leaderboard. Check your connection and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
