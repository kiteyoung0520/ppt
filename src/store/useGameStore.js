import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { callApi } from '../services/api';

const SRS_INTERVALS = [1, 3, 7, 14, 30, 60];

export const NATIVE_PLANT_DB = [
  { name: "黃花風鈴木", rarity: "Starter", emoji: "🌼", costToMax: 500 },
  { name: "馬鞍藤", rarity: "N", emoji: "🌱", costToMax: 100 },
  { name: "紫金牛", rarity: "N", emoji: "🌿", costToMax: 100 },
  { name: "台灣欒樹", rarity: "R", emoji: "🌳", costToMax: 300 },
  { name: "山櫻花", rarity: "R", emoji: "🌸", costToMax: 300 },
  { name: "台灣百合", rarity: "R", emoji: "💮", costToMax: 300 },
  { name: "水筆仔", rarity: "SR", emoji: "🎋", costToMax: 500 },
  { name: "愛玉子", rarity: "SR", emoji: "🍃", costToMax: 500 },
  { name: "牛樟", rarity: "SSR", emoji: "🪵", costToMax: 1000 },
  { name: "台灣肖楠", rarity: "SSR", emoji: "🌲", costToMax: 1000 },
  { name: "姑婆芋", rarity: "N", emoji: "🐘", costToMax: 100 },
  { name: "相思樹", rarity: "N", emoji: "🌳", costToMax: 100 },
  { name: "玉山箭竹", rarity: "N", emoji: "🎋", costToMax: 100 },
  { name: "阿里山龍膽", rarity: "R", emoji: "💠", costToMax: 300 },
  { name: "台東火刺木", rarity: "R", emoji: "🍒", costToMax: 300 },
  { name: "台灣一葉蘭", rarity: "SR", emoji: "🌺", costToMax: 600 },
  { name: "玉山薄雪草", rarity: "SR", emoji: "❄️", costToMax: 600 },
  { name: "台灣水韭", rarity: "SR", emoji: "🌾", costToMax: 600 },
  { name: "紅檜", rarity: "SSR", emoji: "🌲", costToMax: 1000 },
  { name: "玉山圓柏", rarity: "SSR", emoji: "🌳", costToMax: 1000 }
];

export const useGameStore = create(
  persist(
    (set, get) => ({
      // --- States ---
      stats: {
        coins: 0,
        exp: 0,
        plantStage: 0,
        currentPlant: '黃花風鈴木',
        unlockedPlants: [],
        expiryDate: null
      },
      streak: 0,
      lastStudyDate: null,
      savedWords: [], // Each word: { word, pronunciation, meaning, langKey, nextReview, ... }

      // --- Actions: Migration ---
      migrateLegacyData: () => {
        const legacyVocab = localStorage.getItem('flg_vocab');
        const legacyStreak = localStorage.getItem('flg_streak');
        const legacyLastStudy = localStorage.getItem('flg_lastStudy');

        if (legacyVocab || legacyStreak) {
          console.log("Store: Migrating legacy data...");
          try {
            if (legacyVocab) {
              const words = JSON.parse(legacyVocab);
              set({ savedWords: words });
            }
            if (legacyStreak) set({ streak: parseInt(legacyStreak) });
            if (legacyLastStudy) set({ lastStudyDate: legacyLastStudy });

            // Clear legacy keys after migration
            localStorage.removeItem('flg_vocab');
            localStorage.removeItem('flg_streak');
            localStorage.removeItem('flg_lastStudy');
          } catch (e) {
            console.error("Migration failed:", e);
          }
        }
      },

      // --- Actions: Stats ---
      setStats: (newStats) => set((state) => ({ 
        stats: { ...state.stats, ...newStats } 
      })),

      refreshStats: async (userId, apiKey) => {
        if (!userId) return;
        try {
          const res = await callApi('getUserStats', { userId }, apiKey);
          if (res.status === 'success') {
            set({ stats: { ...get().stats, ...res.data } });
          }
        } catch (e) {
          console.error("Store: Failed to refresh stats:", e);
        }
      },

      // --- Actions: Streak ---
      recordActivity: () => {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const { lastStudyDate, streak } = get();

        if (lastStudyDate === today) return;

        const newStreak = lastStudyDate === yesterday ? streak + 1 : 1;
        set({ 
          streak: newStreak, 
          lastStudyDate: today 
        });
      },

      // --- Actions: Vocabulary (SRS) ---
      saveWord: (wordData) => {
        const { savedWords, recordActivity } = get();
        // Prevent duplicate
        if (savedWords.find(w => w.word === wordData.word && w.langKey === wordData.langKey)) return;

        const newWord = {
          word: wordData.word,
          pronunciation: wordData.pronunciation || '',
          meaning: wordData.meaning || '',
          langKey: wordData.langKey || 'en',
          exampleSentence: wordData.exampleSentence || '',
          exampleTranslation: wordData.exampleTranslation || '',
          addedAt: Date.now(),
          reviewCount: 0,
          intervalDays: 1,
          nextReview: Date.now()
        };

        set({ savedWords: [newWord, ...savedWords] });
        recordActivity();
      },

      updateWordReview: (word, langKey, remembered) => {
        const { savedWords } = get();
        const updated = savedWords.map(w => {
          if (w.word !== word || w.langKey !== langKey) return w;
          
          const curIdx = Math.max(SRS_INTERVALS.indexOf(w.intervalDays), 0);
          const nextIdx = remembered ? Math.min(curIdx + 1, SRS_INTERVALS.length - 1) : 0;
          const newInterval = SRS_INTERVALS[nextIdx];
          
          return {
            ...w,
            reviewCount: w.reviewCount + 1,
            intervalDays: newInterval,
            nextReview: Date.now() + (remembered ? newInterval * 86400000 : 0) // Reset to immediate if forgotten
          };
        });
        set({ savedWords: updated });
      },

      removeWord: (word, langKey) => {
        set({ 
          savedWords: get().savedWords.filter(w => !(w.word === word && w.langKey === langKey)) 
        });
      },

      // Reset everything (for logout)
      resetGameStore: () => set({
        stats: { coins: 0, exp: 0, plantStage: 0, currentPlant: '黃花風鈴木', unlockedPlants: [], expiryDate: null },
        streak: 0,
        lastStudyDate: null,
        savedWords: []
      })
    }),
    {
      name: 'flg-game-storage', // key in localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
