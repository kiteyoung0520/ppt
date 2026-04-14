import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const auth = useAuthStore();
  
  // Perform silent verification on mount
  useEffect(() => {
    auth.silentVerify();
  }, []);

  // Map Zustand store to context-compatible object
  const value = {
    currentUser: auth.currentUser,
    apiKey: auth.apiKey,
    loading: auth.isVerifying,
    login: auth.login,
    logout: auth.logout,
    // Add any others if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
