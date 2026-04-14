import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { SettingsProvider } from './context/SettingsContext';
import AuthView from './components/features/Auth/AuthView';
import DashboardView from './components/features/Dashboard/DashboardView';
import Toast from './components/ui/Toast';

const MainApp = () => {
  const { currentUser, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="w-full h-full text-stone-800">
      <Toast />
      {!currentUser ? (
        <AuthView />
      ) : (
        <DashboardView />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <SettingsProvider>
          <MainApp />
        </SettingsProvider>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
