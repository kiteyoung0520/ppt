import React, { createContext, useContext, useState, useEffect } from 'react';
import { TARGET_LANGS } from '../services/api';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [targetLangKey, setTargetLangKey] = useState(() => {
    return localStorage.getItem('flg-targetLang') || 'en';
  });
  
  const [speechRate, setSpeechRate] = useState(() => {
    const saved = localStorage.getItem('flg-speechRate');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [useHighQualityAI, setUseHighQualityAI] = useState(() => {
    return localStorage.getItem('flg-highQualityAI') === 'true';
  });

  // Save changes to localStorage automatically
  useEffect(() => {
    localStorage.setItem('flg-targetLang', targetLangKey);
  }, [targetLangKey]);

  useEffect(() => {
    localStorage.setItem('flg-speechRate', speechRate.toString());
  }, [speechRate]);

  useEffect(() => {
    localStorage.setItem('flg-highQualityAI', useHighQualityAI.toString());
  }, [useHighQualityAI]);

  const currentLang = TARGET_LANGS[targetLangKey];

  return (
    <SettingsContext.Provider value={{
      targetLangKey,
      setTargetLangKey,
      speechRate,
      setSpeechRate,
      useHighQualityAI,
      setUseHighQualityAI,
      currentLang
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
