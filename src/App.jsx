import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { SettingsProvider } from './context/SettingsContext';
import AuthView from './components/features/Auth/AuthView';
import DashboardView from './components/features/Dashboard/DashboardView';
import Toast from './components/ui/Toast';
import Fireflies from './components/ui/Fireflies';

const MainApp = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-screen text-white bg-[#020817] flex flex-col items-center justify-center font-chn relative overflow-hidden">
         <Fireflies count={15} />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.1)_0%,_transparent_60%)] pointer-events-none"></div>
         <div className="relative z-10 text-7xl mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse">🌳</div>
         <div className="relative z-10 flex items-center gap-3 text-emerald-400 font-bold uppercase tracking-[0.3em] text-sm mt-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Link Start...</span>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-stone-100 overflow-hidden">
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
