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

      silentVerify: async () => {
        const { currentUser, apiKey, logout } = get();
        if (!currentUser || !apiKey) return;

        set({ isVerifying: true });
        try {
          const res = await callApi('getUserStats', { userId: currentUser }, apiKey);
          if (res.status !== 'success') {
            logout();
          }
        } catch (e) {
          console.error("AuthStore: Silent verification failed", e);
          // Optionally logout on fatal errors
        } finally {
          set({ isVerifying: false });
        }
      },

      logout: () => {
        set({ currentUser: null, apiKey: null });
      }
    }),
    {
      name: 'flg-auth-storage'
    }
  )
);
