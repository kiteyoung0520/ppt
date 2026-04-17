import React, { createContext, useContext, useState, useEffect } from 'react';
import { TARGET_LANGS } from '../services/api';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [targetLangKey, setTargetLangKey] = useState(() => localStorage.getItem('lg_lang') || 'en');
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('lg_rate')) || 1.0);
  
  // Persist settings
  useEffect(() => {
    localStorage.setItem('lg_lang', targetLangKey);
    localStorage.setItem('lg_rate', speechRate);
  }, [targetLangKey, speechRate]);

  const currentLang = TARGET_LANGS[targetLangKey];

  return (
    <SettingsContext.Provider value={{
      targetLangKey,
      setTargetLangKey,
      speechRate,
      setSpeechRate,
      currentLang
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
