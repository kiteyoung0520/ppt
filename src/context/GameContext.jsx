import React, { createContext, useContext, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useAuth } from './AuthContext';
import { callApi } from '../services/api';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const game = useGameStore();
  const { currentUser, apiKey } = useAuth();

  // 1. 初始載入與遷移
  useEffect(() => {
    game.migrateLegacyData();
    if (currentUser && apiKey) {
      game.refreshStats(currentUser, apiKey);
    }
  }, [currentUser, apiKey]);

  // 2. 自動同步守護程序 (Auto-Sync to Cloud)
  // 當金幣、精華、連勝或單字變動時，延遲 3 秒後自動存檔
  useEffect(() => {
    if (!currentUser || !apiKey) return;
    
    const syncTimeout = setTimeout(async () => {
      try {
        await callApi('updateUserStats', {
          userId: currentUser,
          stats: {
            ...game.stats,
            streak: game.streak,
            lastStudyDate: game.lastStudyDate
          },
          savedWords: game.savedWords
        }, apiKey);
        console.log("☁️ 語林雲端備份成功 (含連勝紀錄)！");
      } catch (e) {
        console.warn("☁️ 備份延遲：", e.message);
      }
    }, 3000);

    return () => clearTimeout(syncTimeout);
  }, [game.stats, game.savedWords, game.streak, currentUser, apiKey]);

  // 3. 登出清理
  useEffect(() => {
    if (!currentUser) {
      game.resetGameStore();
    }
  }, [currentUser]);

  return (
    <GameContext.Provider value={game}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);
export { NATIVE_PLANT_DB } from '../store/useGameStore'; // Re-export if needed
