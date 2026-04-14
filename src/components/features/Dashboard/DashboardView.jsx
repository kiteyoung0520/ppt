import React, { useState } from 'react';
import GlassPanel from '../../ui/GlassPanel';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { useSettings } from '../../../context/SettingsContext';

// Feature Views
import NurseryView from '../Nursery/NurseryView';
import ReadingRoom from '../ReadingRoom/ReadingRoom';
import WorldTreeView from '../WorldTree/WorldTreeView';
import GreenhouseModal from '../Greenhouse/GreenhouseModal';
import EchoValleyView from '../EchoValley/EchoValleyView';
import TranslatorView from '../Translator/TranslatorView';
import SpecimenRoomView from '../Specimen/SpecimenRoomView';
import VocabBookView from '../VocabBook/VocabBookView';

// ── Language Switcher ─────────────────────────────────────────────
const LANG_OPTIONS = [
  { key: 'en', label: 'EN', flag: '🇺🇸' },
  { key: 'ja', label: '日語', flag: '🇯🇵' },
  { key: 'ko', label: '한국어', flag: '🇰🇷' },
];

const LangSwitcher = () => {
  const { targetLangKey, setTargetLangKey } = useSettings();
  return (
    <div className="flex items-center gap-1 bg-white/80 border border-stone-200 rounded-full px-1.5 py-1 shadow-sm backdrop-blur-sm">
      {LANG_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => setTargetLangKey(opt.key)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
            targetLangKey === opt.key
              ? 'bg-emerald-600 text-white shadow'
              : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          <span>{opt.flag}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────
const DashboardView = () => {
  const { currentUser, logout } = useAuth();
  const { stats, streak, savedWords } = useGame();
  const { targetLangKey } = useSettings();

  const [activeTab, setActiveTab] = useState('topic');
  const [readingSession, setReadingSession] = useState(null);
  const [isGreenhouseOpen, setIsGreenhouseOpen] = useState(false);
  // Specimen: holds text sent from WorldTree or user paste
  const [specimenText, setSpecimenText] = useState('');

  const tabs = [
    { id: 'topic',     label: '🌱', name: '育苗室' },
    { id: 'explore',   label: '🌍', name: '世界樹' },
    { id: 'speak',     label: '🦜', name: '迴音谷' },
    { id: 'vocab',     label: '📚', name: '單字本', badge: savedWords.filter(w => w.nextReview <= Date.now()).length },
    { id: 'paste',     label: '🔬', name: '標本室' },
    { id: 'translate', label: '🕊️', name: '隨身口譯' },
  ];

  const handleStartReading = (taskTitle, prompt) => {
    setReadingSession({ title: taskTitle, prompt });
  };

  // Called by WorldTree — switches to paste tab with article text
  const handleSendToSpecimen = (text) => {
    setSpecimenText(text);
    setActiveTab('paste');
  };

  if (readingSession) {
    return (
      <ReadingRoom
        taskTitle={readingSession.title}
        prompt={readingSession.prompt}
        targetLangKey={targetLangKey}
        onClose={() => setReadingSession(null)}
      />
    );
  }

  return (
    // ── Outer shell: full viewport, flex-center, responsive padding ──
    <div className="w-full min-h-[100dvh] flex items-center justify-center p-2 sm:p-4 lg:p-6">
      <GreenhouseModal isOpen={isGreenhouseOpen} onClose={() => setIsGreenhouseOpen(false)} />

      {/* ── Main card: responsive architecture ────────────────────── */}
      <GlassPanel className={`
        relative w-full flex flex-col
        max-w-none lg:max-w-7xl
        h-[100dvh] sm:h-[98dvh] lg:h-[95dvh]
        p-0 overflow-hidden sm:rounded-[2rem]
      `}>

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center px-4 pt-3 pb-2 border-b border-stone-100 gap-3 relative">
          {/* User name + counters */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-24 bg-gradient-to-r from-transparent via-white/50 to-transparent">
            <span className="text-xs font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-full truncate max-w-[100px]">
              {currentUser}
            </span>
            
            {/* Streak Counter */}
            <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full text-xs font-bold text-orange-600 shadow-sm" title="學習連勝天數">
              🔥 <span>{streak}</span>
            </div>

            {/* Coins / Greenhouse */}
            <button
              onClick={() => setIsGreenhouseOpen(true)}
              className="flex items-center gap-1 bg-white hover:bg-amber-50 border border-amber-200 hover:border-orange-300 px-2.5 py-1 rounded-full text-xs font-bold text-amber-600 shadow-sm transition active:scale-95 shrink-0"
              title="溫室扭蛋機"
            >
              <span>🌞 <span>{stats.coins}</span></span>
            </button>

            {/* NEW: Essence Indicators */}
            <div className="flex items-center gap-1 bg-white/50 border border-stone-100 px-2 py-1 rounded-full shadow-inner ml-2">
              <div className="flex items-center gap-0.5 px-1.5" title="日光精華 (來自閱讀分析)">
                <span className="text-[10px]">✨</span>
                <span className="text-[11px] font-bold text-orange-500">{stats.essence?.light || 0}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 border-l border-stone-200" title="雨露精華 (來自口說練習)">
                <span className="text-[10px]">💧</span>
                <span className="text-[11px] font-bold text-blue-500">{stats.essence?.rain || 0}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 border-l border-stone-200" title="土壤精華 (來自單字複習)">
                <span className="text-[10px]">🌿</span>
                <span className="text-[11px] font-bold text-emerald-600">{stats.essence?.soil || 0}</span>
              </div>
            </div>
          </div>

          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              onClick={() => { if(window.confirm('確定要登出嗎？')) logout(); }}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold transition shadow-md active:scale-95 flex items-center gap-1"
            >
               🚪 登出
            </button>
            <LangSwitcher />
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────── */}
        <div className="shrink-0 flex border-b border-stone-100 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 px-3 gap-0.5 min-w-[64px]
                text-[10px] xs:text-[11px] sm:text-xs
                border-b-2 transition-all relative
                ${activeTab === t.id
                  ? 'border-emerald-500 text-emerald-700 font-bold bg-emerald-50/50'
                  : 'border-transparent text-stone-400 hover:text-emerald-600 hover:bg-stone-50'}
              `}
            >
              <span className="text-sm sm:text-lg leading-none">{t.label}</span>
              <span className="leading-none mt-0.5 whitespace-nowrap">{t.name}</span>
              {t.badge > 0 && (
                <span className="absolute top-1 right-2 w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content Area ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scroll pb-10">
          <div className="h-full animate-fadeIn">
            {activeTab === 'topic' && (
              <NurseryView onStartReading={handleStartReading} />
            )}
            {activeTab === 'explore' && (
              <WorldTreeView onSendToSpecimen={handleSendToSpecimen} />
            )}
            {activeTab === 'speak' && (
              <EchoValleyView />
            )}
            {activeTab === 'vocab' && (
              <VocabBookView />
            )}
            {activeTab === 'paste' && (
              <SpecimenRoomView
                key={specimenText}  // re-mount when new text arrives from WorldTree
                initialText={specimenText}
              />
            )}
            {activeTab === 'translate' && (
              <TranslatorView />
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default DashboardView;
