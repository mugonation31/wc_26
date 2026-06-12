import { Injectable, NgZone, inject, signal } from '@angular/core';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
  currentUid = signal<string | null>(null);

  private unsubscribe: (() => void) | null = null;
  private zone = inject(NgZone);

  setCurrentUid(uid: string | null) { this.currentUid.set(uid); }

  startListening(uid: string) {
    this.stopListening();
    this.unsubscribe = onSnapshot(
      doc(db, 'picks', uid),
      (snap) => {
        // Firestore callbacks fire outside Angular's zone — run() ensures
        // the signal write triggers change detection.
        this.zone.run(() => {
          if (this.currentUid() === uid) {
            this.userPicks.set(snap.exists() ? (snap.data() as UserPicks) : null);
          }
        });
      },
      (err) => console.error('Picks listener error:', err)
    );
  }

  stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async savePick(uid: string, displayName: string, photoURL: string, round: number, team: string, flag: string) {
    // Always read fresh data from Firestore before writing to avoid race conditions
    // and prevent overwriting other rounds when the local signal is stale.
    const snap = await getDoc(doc(db, 'picks', uid));
    const current: UserPicks = snap.exists()
      ? (snap.data() as UserPicks)
      : { uid, displayName, photoURL, rounds: {}, eliminated: false };

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
    } catch (err) {
      throw err;
    } finally {
      this.saving.set(false);
    }
    // onSnapshot will update userPicks automatically after the write commits
  }

  clearPicks() {
    this.stopListening();
    this.userPicks.set(null);
  }
}
