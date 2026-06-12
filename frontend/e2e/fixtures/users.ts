/**
 * Shared user fixtures for E2E tests.
 *
 * Import MOCK_USER directly from firebase-mocks for auth scenarios.
 * This file is for any additional fixture data used across specs.
 */

export const MOCK_LEADERBOARD_PLAYER_ACTIVE = {
  uid: 'uid-player-active',
  displayName: 'Active Player',
  photoURL: '',
  rounds: {
    1: { team: 'Germany', flag: '🇩🇪' },
    2: { team: 'Brazil', flag: '🇧🇷' },
  },
  eliminated: false,
};

export const MOCK_LEADERBOARD_PLAYER_ELIMINATED = {
  uid: 'uid-player-eliminated',
  displayName: 'Eliminated Player',
  photoURL: '',
  rounds: {
    1: { team: 'Turkey', flag: '🇹🇷' },
  },
  eliminated: true,
};
