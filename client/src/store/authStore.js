import { create } from 'zustand';

// Access token stays in memory only (safer than localStorage)
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  ready: false, // true after we checked the refresh cookie on page load
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setReady: () => set({ ready: true }),
  clear: () => set({ user: null, accessToken: null }),
}));

// Where each role lands after login
export const HOME_BY_ROLE = {
  admin: '/staff',
  manager: '/staff',
  receptionist: '/staff',
  housekeeping: '/staff',
  guest: '/guest',
};
