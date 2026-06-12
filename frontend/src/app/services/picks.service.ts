import { Injectable, signal } from '@angular/core';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface RoundPick {
  team: string;
  flag: string;
  pickedAt?: any;
  status?: 'won' | 'drew' | 'lost';
}

export interface UserPicks {
  uid: string;
  displayName: string;
  photoURL: string;
  rounds: Record<number, RoundPick>;
  eliminated: boolean;
}

@Injectable({ providedIn: 'root' })
export class PicksService {
  userPicks = signal<UserPicks | null>(null);
  saving = signal(false);

  async loadPicks(uid: string) {
    const snap = await getDoc(doc(db, 'picks', uid));
    if (this.currentUid() === uid) {
      this.userPicks.set(snap.exists() ? (snap.data() as UserPicks) : null);
    }
  }

  currentUid = signal<string | null>(null);

  setCurrentUid(uid: string | null) { this.currentUid.set(uid); }

  async savePick(uid: string, displayName: string, photoURL: string, round: number, team: string, flag: string) {
    const current = this.userPicks() ?? { uid, displayName, photoURL, rounds: {}, eliminated: false };
    if (current.rounds[round]) throw new Error(`Round ${round} pick already locked in`);
    this.saving.set(true);
    const updated: UserPicks = {
      ...current,
      uid,
      displayName,
      photoURL,
      rounds: { ...current.rounds, [round]: { team, flag, pickedAt: serverTimestamp() } },
    };
    try {
      await setDoc(doc(db, 'picks', uid), updated);
      this.userPicks.set({ ...updated, rounds: { ...updated.rounds, [round]: { team, flag } } });
    } catch (err) {
      throw err;
    } finally {
      this.saving.set(false);
    }
  }

  clearPicks() {
    this.userPicks.set(null);
  }
}
