import React, { createContext, useContext, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useAuth } from './AuthContext';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const game = useGameStore();
  const { currentUser, apiKey } = useAuth();

  // Initial stats sync + Migration
  useEffect(() => {
    game.migrateLegacyData(); // Check for old localStorage data
    if (currentUser && apiKey) {
      game.refreshStats(currentUser, apiKey);
    }
  }, [currentUser, apiKey]);

  // Clean up on user logout
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
