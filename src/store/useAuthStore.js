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
          if (res.data.needsActivation) {
            return { success: true, needsActivation: true, userId: res.data.userId };
          }
          set({ 
            currentUser: userId, 
            apiKey: res.data.apiKey 
          });
          return { success: true, stats: res.data.stats };
        }
        throw new Error(res.message);
      },

      apply: async (userId, password, email) => {
        const res = await callApi('register', { userId, password, email });
        if (res.status === 'success') {
          return res;
        }
        throw new Error(res.message);
      },

      activate: async (userId, licenseKey, userApiKey) => {
        const res = await callApi('activateAccount', { userId, licenseKey, userApiKey });
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
        // 沒有使用者資料，直接放行，不執行驗證
        if (!currentUser || !apiKey) {
          set({ isVerifying: false });
          return;
        }

        set({ isVerifying: true });
        try {
          const res = await callApi('getUserStats', { userId: currentUser }, apiKey);
          // 只有在後端明確回報「金鑰無效」或「帳號不存在」時才登出
          // 其他錯誤（伺服器異常、網路超時）一律保留登入狀態
          if (res.status === 'error') {
            const msg = res.message || '';
            if (msg.includes('金鑰') || msg.includes('無效') || msg.includes('不存在')) {
              console.warn('AuthStore: 憑證無效，執行安全登出');
              logout();
            }
          }
        } catch (e) {
          // 網路錯誤 → 保留登入，不踢人
          console.warn('AuthStore: 驗證連線失敗，保留登入狀態', e.message);
        } finally {
          set({ isVerifying: false });
        }
      },

      logout: () => {
        set({ currentUser: null, apiKey: null });
      },

      updateApiKey: (newKey) => {
        set({ apiKey: newKey });
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
