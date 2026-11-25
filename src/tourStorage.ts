import { Platform } from 'react-native';

export const tourStorageKey = 'gcc360.completed-tours.v1';

// The web store is intentionally separate from the auth session. On mobile,
// SecureStore gives the same per-device persistence as the session store.
export const tourStorage = Platform.OS === 'web'
  ? {
      async get() { return window.localStorage.getItem(tourStorageKey); },
      async set(value: string) { window.localStorage.setItem(tourStorageKey, value); },
    }
  : {
      async get() {
        const SecureStore = await import('expo-secure-store');
        return SecureStore.getItemAsync(tourStorageKey);
      },
      async set(value: string) {
        const SecureStore = await import('expo-secure-store');
        return SecureStore.setItemAsync(tourStorageKey, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      },
    };

export async function hasCompletedTour(userId: string) {
  const raw = await tourStorage.get();
  if (!raw) return false;
  try { return Boolean(JSON.parse(raw)[userId]); } catch { return false; }
}

export async function completeTour(userId: string) {
  const raw = await tourStorage.get();
  let completed: Record<string, boolean> = {};
  try { completed = raw ? JSON.parse(raw) : {}; } catch { /* reset malformed local data */ }
  completed[userId] = true;
  await tourStorage.set(JSON.stringify(completed));
}
