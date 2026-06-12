import { Injectable, signal } from '@angular/core';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  loading = signal(true);

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
      this.loading.set(false);
    });
  }

  async signIn() {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async signOut() {
    await signOut(auth);
  }
}
