import React, { createContext, useContext, useState, useEffect } from 'react';
import { TARGET_LANGS } from '../services/api';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [targetLangKey, setTargetLangKey] = useState('en');
  const [speechRate, setSpeechRate] = useState(1.0);
  
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
