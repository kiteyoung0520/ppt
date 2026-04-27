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

// 🌿 福爾摩沙遠征地圖節點定義 (三階段大富翁棋盤)
// stage: 0=未知 1=知識喚醒(輪廓) 2=靈氣灌注中 3=完全復興
export const FORMOSA_MAP_NODES = [
  { id: 0, name: "起點：台北", region: "北部", type: "start", emoji: "🏛️", auraRequired: 0, finalCost: {}, description: "語林冒險的起點，這裡充滿了尋語者的氣息。" },
  { id: 1, name: "陽明山", region: "北部", type: "chance", emoji: "♨️", auraRequired: 0, finalCost: {}, description: "硫磺與迷霧交織，或許會遇到神祕的靈力事件？" },
  { id: 2, name: "九份山城", region: "北部", type: "revival", emoji: "🏮", auraRequired: 20, finalCost: { light: 100 }, description: "昔日的黃金之城，等待尋語者重新點亮紅燈籠。" },
  { id: 3, name: "竹科綠廊", region: "北部", type: "fate", emoji: "🧪", auraRequired: 0, finalCost: {}, description: "科技與自然的交匯，這裡的能量波動很不穩定。" },
  { id: 4, name: "阿里山", region: "中部", type: "revival", emoji: "🚂", auraRequired: 35, finalCost: { soil: 200 }, description: "神木守護的森林，需要深厚的土地精華才能喚醒。" },
  { id: 5, name: "日月潭", region: "中部", type: "revival", emoji: "🛶", auraRequired: 35, finalCost: { rain: 200 }, description: "湖光山色，這裡是雨露精華最純淨的地方。" },
  { id: 6, name: "安平古堡", region: "南部", type: "revival", emoji: "🏰", auraRequired: 50, finalCost: { light: 150, soil: 150 }, description: "歷史的基石，唯有智慧能重現古都的光輝。" },
  { id: 7, name: "墾丁南灣", region: "南部", type: "revival", emoji: "🏝️", auraRequired: 50, finalCost: { rain: 300 }, description: "熱情的陽光與海洋，需要大量雨露來維持生態平衡。" },
  { id: 8, name: "太魯閣峽谷", region: "東部", type: "revival", emoji: "⛰️", auraRequired: 70, finalCost: { light: 300, rain: 200 }, description: "大理石般的意志，唯有最強大的精華能復興此地。" },
  { id: 9, name: "台東三仙台", region: "東部", type: "final", emoji: "🌉", auraRequired: 100, finalCost: { light: 500, rain: 500, soil: 500 }, description: "傳說中仙人留下的足跡，語林之境的終極復興目標。" }
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
        },
        // 🌿 遠征進度數據（三階段）
        expedition: {
          currentNode: 0,
          diceRemaining: 5,
          // nodeProgress: { [nodeIdx]: { stage: 0|1|2|3, aura: number } }
          nodeProgress: { 0: { stage: 3, aura: 0 } }, // 起點預設完全復興
          plantedTrees: {}
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
        const exp = stats.expedition;
        const needsMigration = !stats.essence || !exp || exp.revivedNodes;
        if (needsMigration) {
          console.log("Store: Migrating to Tri-Stage expedition format...");
          let nodeProgress = { 0: { stage: 3, aura: 0 } };
          if (exp?.revivedNodes) {
            // 舊格式轉換：revivedNodes → nodeProgress stage 3
            exp.revivedNodes.forEach(idx => { nodeProgress[idx] = { stage: 3, aura: 0 }; });
          } else if (exp?.nodeProgress) {
            nodeProgress = exp.nodeProgress;
          }
          set({
            stats: {
              ...stats,
              essence: stats.essence || { light: 0, rain: 0, soil: 0 },
              expedition: {
                currentNode: exp?.currentNode || 0,
                diceRemaining: exp?.diceRemaining ?? 5,
                nodeProgress,
                plantedTrees: exp?.plantedTrees || {}
              },
              unlockedPlants: Array.isArray(stats.unlockedPlants) ? stats.unlockedPlants : []
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
            
            set((state) => {
              // 🌿 智慧型合併邏輯 (Smart Merge)
              // 如果本地的學習日期比雲端更「新」，則保留本地的連勝狀態，避免被舊存檔覆蓋
              const localIsNewer = state.lastStudyDate && (!cloudStats.lastStudyDate || new Date(state.lastStudyDate) > new Date(cloudStats.lastStudyDate));
              
              const finalStreak = localIsNewer ? state.streak : (cloudStats.streak ?? state.streak);
              const finalLastStudy = localIsNewer ? state.lastStudyDate : (cloudStats.lastStudyDate ?? state.lastStudyDate);

              return { 
                stats: { ...state.stats, ...cloudStats },
                streak: finalStreak,
                lastStudyDate: finalLastStudy,
                savedWords: cloudWords.length > 0 ? cloudWords : state.savedWords
              };
            });

            // 🌿 將雲端設定寫回 localStorage
            if (cloudStats.settings) {
              if (cloudStats.settings.targetLangKey) localStorage.setItem('flg-targetLang', cloudStats.settings.targetLangKey);
              if (cloudStats.settings.speechRate) localStorage.setItem('flg-speechRate', String(cloudStats.settings.speechRate));
            }

            // 🌿 關鍵：同步後立即重新校準一次連勝狀態
            get().recordActivity();
            
            console.log("Store: 雲端數據智慧同步完成");
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
        addEssence('soil', 5);
        get().earnDice(1);
        get().addGlobalAura(5); // 🌿 收藏單字 → 靈氣 +5
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
        if (remembered) {
          get().earnDice(1);
          get().addGlobalAura(10); // 🌿 複習成功 → 靈氣 +10
        }
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
            get().earnDice(2);
            get().addGlobalAura(20); // 🌿 學習文章 → 靈氣 +20
            toast("✨ 文章已加入轉錄庫！獲得 2 顆骰子 🎲");
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

      // --- Actions: Expedition (Monopoly Mode) ---
      rollDice: () => {
        const { stats, recordActivity } = get();
        if (stats.expedition.diceRemaining <= 0) return null;

        const roll = Math.floor(Math.random() * 6) + 1;
        const nextNode = (stats.expedition.currentNode + roll) % FORMOSA_MAP_NODES.length;
        
        set((state) => ({
          stats: {
            ...state.stats,
            expedition: {
              ...state.stats.expedition,
              currentNode: nextNode,
              diceRemaining: state.stats.expedition.diceRemaining - 1
            }
          }
        }));

        recordActivity();
        return roll;
      },

      earnDice: (amount) => {
        set((state) => ({
          stats: {
            ...state.stats,
            expedition: {
              ...state.stats.expedition,
              diceRemaining: state.stats.expedition.diceRemaining + amount
            }
          }
        }));
      },

      // 三階段復興系統
      // Stage 1：踩到格位並完成首次 AI 測驗 (3 題 2/3)
      completeStage1: (nodeIdx) => {
        set((state) => {
          const np = { ...state.stats.expedition.nodeProgress };
          np[nodeIdx] = { stage: 1, aura: 0 };
          return { stats: { ...state.stats, expedition: { ...state.stats.expedition, nodeProgress: np } } };
        });
      },

      // Stage 2：學習行為累積靈氣（自動，由學習模組呼叫）
      addGlobalAura: (amount) => {
        set((state) => {
          const np = { ...state.stats.expedition.nodeProgress };
          let changed = false;
          FORMOSA_MAP_NODES.forEach((node, idx) => {
            const p = np[idx];
            if (!p || p.stage !== 1) return;
            const newAura = Math.min((p.aura || 0) + amount, node.auraRequired);
            const newStage = newAura >= node.auraRequired ? 2 : 1;
            if (newAura !== p.aura || newStage !== p.stage) {
              np[idx] = { stage: newStage, aura: newAura };
              changed = true;
            }
          });
          if (!changed) return state;
          return { stats: { ...state.stats, expedition: { ...state.stats.expedition, nodeProgress: np } } };
        });
      },

      // Stage 3：消耗精華 + 完成終極試煉後呼叫
      completeStage3: (nodeIdx) => {
        const node = FORMOSA_MAP_NODES[nodeIdx];
        if (!node) return false;
        const { stats } = get();
        const cost = node.finalCost || {};
        for (const [type, amount] of Object.entries(cost)) {
          if ((stats.essence[type] || 0) < amount) return false;
        }
        set((state) => {
          const newEssence = { ...state.stats.essence };
          for (const [type, amount] of Object.entries(cost)) newEssence[type] -= amount;
          const np = { ...state.stats.expedition.nodeProgress };
          np[nodeIdx] = { stage: 3, aura: node.auraRequired };
          return {
            stats: { ...state.stats, essence: newEssence,
              expedition: { ...state.stats.expedition, nodeProgress: np } }
          };
        });
        return true;
      },

      // 保留舊名稱供向後相容
      reviveNode: (nodeIdx) => get().completeStage3(nodeIdx),

      plantTreeInNode: (nodeIdx, plantName) => {
        const { stats } = get();
        const progress = stats.expedition.nodeProgress?.[nodeIdx];
        if (!progress || progress.stage !== 3) return false;
        set((state) => ({
          stats: { ...state.stats, expedition: { ...state.stats.expedition,
            plantedTrees: { ...state.stats.expedition.plantedTrees, [nodeIdx]: plantName }
          }}
        }));
        return true;
      },

      resetGameStore: () => set({
        stats: { 
          coins: 0, exp: 0, plantStage: 0, currentPlant: '黃花風鈴木', unlockedPlants: [], expiryDate: null, 
          essence: {light:0, rain:0, soil:0},
          expedition: { currentNode: 0, diceRemaining: 5, nodeProgress: { 0: { stage: 3, aura: 0 } }, plantedTrees: {} }
        },
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
