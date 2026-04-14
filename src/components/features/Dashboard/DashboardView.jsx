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
    <div className="w-full min-h-[100dvh] bg-forest-gradient relative flex items-center justify-center p-0 lg:p-6 overflow-hidden">
      <GreenhouseModal isOpen={isGreenhouseOpen} onClose={() => setIsGreenhouseOpen(false)} />

      <div className={`
        relative w-full flex flex-col premium-glass
        max-w-none lg:max-w-7xl
        h-[100dvh] lg:h-[90dvh]
        p-0 overflow-hidden lg:rounded-[2.5rem]
      `}>

        {/* ── Premium Top HUD ─────────────────────────────────────── */}
        <div className="shrink-0 flex items-center px-6 pt-4 pb-3 border-b border-white/10 gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Forest Guardian</span>
                <span className="text-sm font-black text-white truncate drop-shadow-md">
                   {currentUser}
                </span>
             </div>
            
            <div className="flex items-center gap-2 ml-4">
              {/* Streak Orb */}
              <div className="essence-orb bg-orange-500/20 border-orange-400/50 text-orange-400 group" title="學習連勝">
                 <span className="text-xs font-bold z-10">{streak}</span>
                 <div className="absolute inset-0 bg-orange-400/20 blur-md rounded-full animate-pulse-slow"></div>
              </div>

              {/* Coins Orb */}
              <button
                onClick={() => setIsGreenhouseOpen(true)}
                className="essence-orb bg-amber-500/20 border-amber-400/50 text-amber-400 hover:scale-110 active:scale-95 transition-all"
                title="太陽金幣 / 溫室"
              >
                <span className="text-[10px] font-bold z-10">{stats.coins}</span>
                <div className="absolute inset-0 bg-amber-400/10 blur-sm rounded-full"></div>
              </button>

              <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

              {/* Essence HUD */}
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full shadow-inner">
                 <div className="flex items-center gap-1.5" title="日光精華">
                    <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]"></div>
                    <span className="text-[11px] font-black text-orange-200">{stats.essence?.light || 0}</span>
                 </div>
                 <div className="flex items-center gap-1.5" title="雨露精華">
                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                    <span className="text-[11px] font-black text-blue-200">{stats.essence?.rain || 0}</span>
                 </div>
                 <div className="flex items-center gap-1.5" title="土壤精華">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                    <span className="text-[11px] font-black text-emerald-100">{stats.essence?.soil || 0}</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <LangSwitcher />
             <button
               onClick={() => { if(window.confirm('確定要離開語林之境嗎？')) logout(); }}
               className="w-8 h-8 flex items-center justify-center bg-red-400/20 hover:bg-red-400/40 border border-red-400/30 text-red-100 rounded-full transition active:scale-95"
               title="登出"
             >
                🚪
             </button>
          </div>
        </div>

        {/* ── Organic Tab Bar ────────────────────────────────────────── */}
        <div className="shrink-0 flex px-2 pt-1 border-b border-white/5 overflow-x-auto no-scrollbar bg-black/10">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`
                flex-1 flex flex-col items-center justify-center py-3 px-2 min-w-[70px]
                transition-all relative
                ${activeTab === t.id
                  ? 'text-emerald-400 font-bold'
                  : 'text-white/40 hover:text-white/70'}
              `}
            >
              <span className={`text-xl mb-1 ${activeTab === t.id ? 'animate-float' : ''}`}>{t.label}</span>
              <span className="text-[10px] uppercase tracking-tighter">{t.name}</span>
              {activeTab === t.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-emerald-400 rounded-t-full shadow-[0_0_12px_rgba(52,211,153,0.8)]"></div>
              )}
              {t.badge > 0 && (
                <span className="absolute top-2 right-4 w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border border-white/20">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Immersive Content Area ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scroll bg-gradient-to-b from-transparent to-black/20">
          <div className="h-full">
            {activeTab === 'topic' && <NurseryView onStartReading={handleStartReading} />}
            {activeTab === 'explore' && <WorldTreeView onSendToSpecimen={handleSendToSpecimen} />}
            {activeTab === 'speak' && <EchoValleyView />}
            {activeTab === 'vocab' && <VocabBookView />}
            {activeTab === 'paste' && <SpecimenRoomView key={specimenText} initialText={specimenText} />}
            {activeTab === 'translate' && <TranslatorView />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
