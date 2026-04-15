import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { callApi } from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser: null,
      apiKey: null,
      deviceId: null,
      isVerifying: true,
      _hasHydrated: false,

      getDeviceId: () => {
        let devId = get().deviceId;
        if (!devId) {
          devId = 'dev_' + Math.random().toString(36).substring(2, 10);
          set({ deviceId: devId });
        }
        return devId;
      },

      login: async (userId, password) => {
        const deviceId = get().getDeviceId();
        const res = await callApi('login', { userId, password, deviceId });
        if (res.status === 'success') {
          set({ 
            currentUser: userId, 
            apiKey: res.data.apiKey 
          });
          return res;
        }
        throw new Error(res.message);
      },

      register: async (userId, password, apiKey, licenseKey) => {
        const res = await callApi('register', { userId, password, userApiKey: apiKey, licenseKey });
        if (res.status === 'success') {
          return res;
        }
        throw new Error(res.message);
      },

      silentVerify: async () => {
        const { currentUser, apiKey, logout } = get();
        // No user — nothing to verify. Clear loading immediately.
        if (!currentUser || !apiKey) {
          set({ isVerifying: false });
          return;
        }

        set({ isVerifying: true });
        try {
          const res = await callApi('getUserStats', { userId: currentUser }, apiKey);
          if (res.status !== 'success') {
            logout();
          }
        } catch (e) {
          console.error("AuthStore: Silent verification failed", e);
        } finally {
          set({ isVerifying: false });
        }
      },

      logout: () => {
        set({ currentUser: null, apiKey: null });
      }
    }),
    {
      name: 'flg-auth-storage',
      // CRITICAL: never persist isVerifying or _hasHydrated.
      // If persisted, they can start as `false` on reload and cause a flash
      // of the dashboard before silentVerify() has a chance to run.
      partialize: (state) => ({
        currentUser: state.currentUser,
        apiKey: state.apiKey,
        deviceId: state.deviceId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      }
    }
  )
);
