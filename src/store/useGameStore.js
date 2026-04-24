import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { callApi } from '../services/api';

const SRS_INTERVALS = [1, 3, 7, 14, 30, 60];

export const NATIVE_PLANT_DB = [
  { 
    name: "黃花風鈴木", rarity: "Starter", emoji: "🌼", costToMax: 500, 
    trait: "黃金光環", description: "增加初期獲得日光精華的速度 +20%", bonusType: "light_boost",
    region: "城市公園", story: "相傳它是從太陽遺落的碎片中誕生，在春天綻放時能點亮旅人的迷途，引導尋語者找到第一枚語言碎片。"
  },
  { 
    name: "馬鞍藤", rarity: "N", emoji: "🌱", costToMax: 100, 
    trait: "海濱韌性", description: "減少雨露消耗 10%", bonusType: "rain_save",
    region: "墾丁海岸", story: "生長在波濤拍打的砂礫中，它是大海與陸地的信使，守護著所有漂洋過海而來的語言種子。"
  },
  { 
    name: "紫金牛", rarity: "N", emoji: "🌿", costToMax: 100, 
    trait: "林下之眼", description: "單字本複習獲得土壤精華 +5", bonusType: "soil_boost",
    region: "低海拔山區", story: "靜靜棲息在神木腳下，擁有看穿記憶迷霧的能力，是尋語者在夜間複習時最可靠的陪伴。"
  },
  { 
    name: "台灣欒樹", rarity: "R", emoji: "🌳", costToMax: 300, 
    trait: "四季變幻", description: "隨機獲得精華補給", bonusType: "random_essence",
    region: "中海拔森林", story: "被譽為「彩色樹」，它經歷過台灣四季的洗禮，每一片葉子的轉色都記錄著一段被遺忘的歷史節點。"
  },
  { 
    name: "山櫻花", rarity: "R", emoji: "🌸", costToMax: 300, 
    trait: "春之報喜", description: "閱讀分析回饋更多金幣", bonusType: "coin_boost",
    region: "霧中森林", story: "泰雅族眼中的報春使者，當紅花綻放，代表語林的氣息再次甦醒，呼喚遠方的冒險者歸家。"
  },
  { 
    name: "台灣百合", rarity: "R", emoji: "💮", costToMax: 300, 
    trait: "高山記憶", description: "提升 SRS 記憶精準度", bonusType: "srs_buff",
    region: "中央山脈", story: "在高山巔峰傲視風霜，象徵著尋語者對真理的無畏追求，唯有心靈純潔者能聽見它的花開聲。"
  },
  { 
    name: "水筆仔", rarity: "SR", emoji: "🎋", costToMax: 500, 
    trait: "濕地守護", description: "保留連勝進度", bonusType: "streak_shield",
    region: "淡水紅樹林", story: "它以獨特的胎生方式守護下一代，如同老故事透過口述傳承，是語林中最強韌的防線。"
  },
  { 
    name: "愛玉子", rarity: "SR", emoji: "🍃", costToMax: 500, 
    trait: "凝膠記憶", description: "防止記憶衰退、鎖定進度", bonusType: "vocab_lock",
    region: "高海拔原始林", story: "這是台灣特有的神奇靈草，它能將散亂的知識凝結為永恆的晶體，讓您的語感永不消散。"
  },
  { 
    name: "牛樟", rarity: "SSR", emoji: "🪵", costToMax: 1000, 
    trait: "森林王者", description: "全屬性精華獲取速度 +15%", bonusType: "all_boost",
    region: "阿里山深處", story: "語林的守護君王。它的氣息能驅散一切失語之霧，解鎖它代表您已成為真正的「語林守護者」。"
  },
  { 
    name: "台灣肖楠", rarity: "SSR", emoji: "🌲", costToMax: 1000, 
    trait: "神木之光", description: "每日自動產生微量精華", bonusType: "passive_gain",
    region: "原始檜木林", story: "台灣五木之一，即便在寂靜的深夜，它依然在深層土壤中低聲吟誦著古老的咒語。"
  },
  { 
    name: "紅檜", rarity: "SSR", emoji: "🌲", costToMax: 1000, 
    trait: "千年智慧", description: "解鎖高級 AI 權限", bonusType: "ai_unlock",
    region: "塔塔加區域", story: "它是語林的活字典，見證了千年的文明興衰。能與紅檜對話的人，將獲得穿越語言界限的智慧。"
  }
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
      savedArticles: [],

      // --- Actions: Essence ---
      addEssence: (type, amount) => {
        set((state) => {
          const currentEssence = state.stats?.essence || { light: 0, rain: 0, soil: 0 };
          return {
            stats: {
              ...state.stats,
              essence: {
                ...currentEssence,
                [type]: (currentEssence[type] || 0) + amount
              }
            }
          };
        });
      },

      // --- Actions: Growth ---
      evolvePlant: (cost) => {
        const { stats } = get();
        const light = stats?.essence?.light || 0;
        if (stats.coins >= cost && light >= (cost / 10)) {
          set((state) => {
            const currentEssence = state.stats?.essence || { light: 0, rain: 0, soil: 0 };
            return {
              stats: {
                ...state.stats,
                coins: state.stats.coins - cost,
                essence: { ...currentEssence, light: Math.max(0, currentEssence.light - (cost / 10)) },
                plantStage: state.stats.plantStage + 1
              }
            };
          });
          return true;
        }
        return false;
      },

      unlockPlant: (plantName, cost) => {
        const { stats } = get();
        const soil = stats?.essence?.soil || 0;
        const rain = stats?.essence?.rain || 0;
        const light = stats?.essence?.light || 0;
        const totalEssence = soil + rain + light;
        
        if (totalEssence >= cost) {
           set((state) => {
              const currentUnlocks = Array.isArray(state.stats.unlockedPlants) ? state.stats.unlockedPlants : [];
              if (currentUnlocks.includes(plantName)) return state;

              // Deduct essence proportionally or just from highest (simple logic: take from what's available)
              let remainingCost = cost;
              let newSoil = soil, newRain = rain, newLight = light;
              
              if (newSoil >= remainingCost) { newSoil -= remainingCost; remainingCost = 0; }
              else { remainingCost -= newSoil; newSoil = 0; }
              
              if (remainingCost > 0 && newRain >= remainingCost) { newRain -= remainingCost; remainingCost = 0; }
              else if (remainingCost > 0) { remainingCost -= newRain; newRain = 0; }

              if (remainingCost > 0 && newLight >= remainingCost) { newLight -= remainingCost; remainingCost = 0; }

              return {
                 stats: {
                    ...state.stats,
                    unlockedPlants: [...currentUnlocks, plantName],
                    essence: { soil: newSoil, rain: newRain, light: newLight }
                 }
              };
           });
           return true;
        }
        return false;
      },


      // --- Actions: Migration ---
      migrateLegacyData: () => {
        const { stats } = get();
        // Self-heal: If essence is missing, add it
        if (!stats.essence) {
          console.log("Store: Initializing missing essence field...");
          set({
            stats: {
              ...stats,
              essence: { light: 0, rain: 0, soil: 0 }
            }
          });
        }

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
      setStats: (newStats) => set((state) => {
        const updatedStats = { ...state.stats, ...newStats };
        // Ensure essence is NEVER lost during generic setStats
        if (newStats.essence) {
           updatedStats.essence = { ...(state.stats.essence || {}), ...newStats.essence };
        }
        return { stats: updatedStats };
      }),

      refreshStats: async (userId, apiKey) => {
        if (!userId || !apiKey) return;
        try {
          const res = await callApi('getUserStats', { userId }, apiKey);
          if (res.status === 'success' && res.data) {
            // 重要修復：正確拆解後端回傳的 stats 與 savedWords
            const cloudStats = res.data.stats || {};
            const cloudWords = Array.isArray(res.data.savedWords) ? res.data.savedWords : [];
            
            set((state) => ({ 
              stats: { ...state.stats, ...cloudStats },
              streak: cloudStats.streak ?? state.streak,
              lastStudyDate: cloudStats.lastStudyDate ?? state.lastStudyDate,
              savedWords: cloudWords.length > 0 ? cloudWords : state.savedWords
            }));

            // 🌿 將雲端設定寫回 localStorage，讓 SettingsContext 下次載入時自動恢復
            if (cloudStats.settings) {
              if (cloudStats.settings.targetLangKey) {
                localStorage.setItem('flg-targetLang', cloudStats.settings.targetLangKey);
              }
              if (cloudStats.settings.speechRate) {
                localStorage.setItem('flg-speechRate', String(cloudStats.settings.speechRate));
              }
            }
            
            console.log("Store: 雲端數據同步完成", cloudStats);
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
      
      // --- Actions: Articles ---
      saveArticle: async (userId, apiKey, article) => {
        const { savedArticles } = get();
        if (savedArticles.find(a => a.id === article.id || (a.title === article.title && a.content === article.content))) {
          toast("已收藏過這篇文章囉！");
          return;
        }
        
        try {
          const res = await callApi('saveArticle', { 
            userId, 
            title: article.title, 
            content: article.content, 
            langKey: article.langKey,
            id: article.id
          }, apiKey);
          
          if (res.status === 'success') {
            const newArt = { ...article, id: res.data.id, date: new Date() };
            set({ savedArticles: [newArt, ...savedArticles] });
            toast("✨ 文章已成功加入轉錄庫！");
          }
        } catch (e) {
          console.error("Store: Failed to save article:", e);
          toast("❌ 儲存文章失敗");
        }
      },

      fetchSavedArticles: async (userId, apiKey) => {
        if (!userId) return;
        try {
          const res = await callApi('getSavedArticles', { userId }, apiKey);
          if (res.status === 'success') {
            set({ savedArticles: res.data });
          }
        } catch (e) {
          console.error("Store: Failed to fetch articles:", e);
        }
      },

      resetGameStore: () => set({
        stats: { coins: 0, exp: 0, plantStage: 0, currentPlant: '黃花風鈴木', unlockedPlants: [], expiryDate: null, essence: {light:0, rain:0, soil:0} },
        streak: 0,
        lastStudyDate: null,
        savedWords: [],
        savedArticles: []
      })
    }),
    {
      name: 'flg-game-storage', // key in localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
