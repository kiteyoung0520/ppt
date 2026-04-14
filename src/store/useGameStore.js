import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { callApi } from '../services/api';

const SRS_INTERVALS = [1, 3, 7, 14, 30, 60];

export const NATIVE_PLANT_DB = [
  { name: "黃花風鈴木", rarity: "Starter", emoji: "🌼", costToMax: 500, trait: "黃金光環", description: "增加初期獲得日光精華的速度 +20%", bonusType: "light_boost" },
  { name: "馬鞍藤", rarity: "N", emoji: "🌱", costToMax: 100, trait: "海濱韌性", description: "在極端環境下也能生長，減少雨露消耗 10%", bonusType: "rain_save" },
  { name: "紫金牛", rarity: "N", emoji: "🌿", costToMax: 100, trait: "林下之眼", description: "單字本複習獲得土壤精華 +5", bonusType: "soil_boost" },
  { name: "台灣欒樹", rarity: "R", emoji: "🌳", costToMax: 300, trait: "四季變幻", description: "隨著季節更迭，隨機獲得一種精華補給", bonusType: "random_essence" },
  { name: "山櫻花", rarity: "R", emoji: "🌸", costToMax: 300, trait: "春之報喜", description: "閱讀室分析完成後回饋更多金幣", bonusType: "coin_boost" },
  { name: "台灣百合", rarity: "R", emoji: "💮", costToMax: 300, trait: "高山記憶", description: "提升 SRS 記憶演算法的精準度", bonusType: "srs_buff" },
  { name: "水筆仔", rarity: "SR", emoji: "🎋", costToMax: 500, trait: "濕地守護", description: "自動修復一次學習漏接，保留連勝", bonusType: "streak_shield" },
  { name: "愛玉子", rarity: "SR", emoji: "🍃", costToMax: 500, trait: "凝膠記憶", description: "暫時鎖定單字本，防止記憶衰退", bonusType: "vocab_lock" },
  { name: "牛樟", rarity: "SSR", emoji: "🪵", costToMax: 1000, trait: "森林王者", description: "全屬性精華獲取速度提升 15%", bonusType: "all_boost" },
  { name: "台灣肖楠", rarity: "SSR", emoji: "🌲", costToMax: 1000, trait: "神木之光", description: "即使不學習，每日也會自動產生微量精華", bonusType: "passive_gain" },
  { name: "紅檜", rarity: "SSR", emoji: "🌲", costToMax: 1000, trait: "千年智慧", description: "解鎖高級 AI 模型使用權權（模擬）", bonusType: "ai_unlock" }
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
        expiryDate: null,
        // New Essence System
        essence: {
          light: 0,  // From ReadingRoom
          rain: 0,   // From Translator/EchoValley
          soil: 0    // From VocabBook
        }
      },
      streak: 0,
      lastStudyDate: null,
      savedWords: [], 

      // --- Actions: Essence ---
      addEssence: (type, amount) => {
        set((state) => ({
          stats: {
            ...state.stats,
            essence: {
              ...state.stats.essence,
              [type]: state.stats.essence[type] + amount
            }
          }
        }));
      },

      // --- Actions: Growth ---
      evolvePlant: (cost) => {
        const { stats } = get();
        // Now requires both coins and light essence to reflect the "Guardian" logic
        if (stats.coins >= cost && stats.essence.light >= (cost / 10)) {
          set((state) => ({
            stats: {
              ...state.stats,
              coins: state.stats.coins - cost,
              essence: { ...state.stats.essence, light: state.stats.essence.light - (cost / 10) },
              plantStage: state.stats.plantStage + 1
            }
          }));
          return true;
        }
        return false;
      },

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

      // --- Actions: Streak (Keep logic same) ---
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

      // --- Actions: Vocabulary ---
      saveWord: (wordData) => {
        const { savedWords, recordActivity, addEssence } = get();
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
        addEssence('soil', 5); // Learning new word adds soil essence
        recordActivity();
      },

      updateWordReview: (word, langKey, remembered) => {
        const { savedWords, addEssence } = get();
        const updated = savedWords.map(w => {
          if (w.word !== word || w.langKey !== langKey) return w;
          
          const curIdx = Math.max(SRS_INTERVALS.indexOf(w.intervalDays), 0);
          const nextIdx = remembered ? Math.min(curIdx + 1, SRS_INTERVALS.length - 1) : 0;
          const newInterval = SRS_INTERVALS[nextIdx];
          
          if (remembered) addEssence('soil', 10); // Reviewing correctly adds more soil

          return {
            ...w,
            reviewCount: w.reviewCount + 1,
            intervalDays: newInterval,
            nextReview: Date.now() + (remembered ? newInterval * 86400000 : 0)
          };
        });
        set({ savedWords: updated });
      },

      removeWord: (word, langKey) => {
        set({ 
          savedWords: get().savedWords.filter(w => !(w.word === word && w.langKey === langKey)) 
        });
      },

      resetGameStore: () => set({
        stats: { coins: 0, exp: 0, plantStage: 0, currentPlant: '黃花風鈴木', unlockedPlants: [], expiryDate: null, essence: {light:0, rain:0, soil:0} },
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
