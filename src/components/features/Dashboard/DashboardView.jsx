import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { useSettings } from '../../../context/SettingsContext';

// Feature Views
import NurseryView from '../Nursery/NurseryView';
import ReadingRoom from '../ReadingRoom/ReadingRoom';
import ChroniclesView from '../Chronicles/ChroniclesView';
import WorldTreeView from '../WorldTree/WorldTreeView';
import GreenhouseModal from '../Greenhouse/GreenhouseModal';
import EchoValleyView from '../EchoValley/EchoValleyView';
import TranslatorView from '../Translator/TranslatorView';
import SpecimenRoomView from '../Specimen/SpecimenRoomView';
import VocabBookView from '../VocabBook/VocabBookView';
import ForestTrialView from '../ForestTrial/ForestTrialView';

// ── Language Switcher ─────────────────────────────────────────────
const LANG_OPTIONS = [
  { key: 'en', label: 'EN', flag: '🇺🇸' },
  { key: 'ja', label: '日', flag: '🇯🇵' },
  { key: 'ko', label: '한', flag: '🇰🇷' },
];

const LangSwitcher = () => {
  const { targetLangKey, setTargetLangKey } = useSettings();
  return (
    <div className="flex items-center gap-0.5 bg-white/10 border border-white/15 rounded-full px-1 py-1 backdrop-blur-sm">
      {LANG_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => setTargetLangKey(opt.key)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all ${
            targetLangKey === opt.key
              ? 'bg-emerald-500 text-white shadow'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          <span>{opt.flag}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
};

// ── Feature Hub: Hero Card ─────────────────────────────────────────
const HeroCard = ({ emoji, title, subtitle, description, badge, gradient, glowColor, onClick }) => (
  <button
    onClick={onClick}
    className={`relative w-full text-left rounded-3xl overflow-hidden p-5 sm:p-7 shadow-xl transition-all duration-300 active:scale-[0.98] group bg-gradient-to-br ${gradient}`}
    style={{ boxShadow: `0 8px 40px -10px ${glowColor}` }}
  >
    <div className="absolute inset-0 opacity-10" style={{
      backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)'
    }} />
    <div className="relative flex items-start justify-between">
      <div className="flex-1">
        <div className="text-4xl sm:text-5xl mb-3 group-hover:scale-110 transition-transform duration-300 inline-block">{emoji}</div>
        <h3 className="text-xl sm:text-2xl font-black text-white mb-1 drop-shadow">{title}</h3>
        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">{subtitle}</p>
        <p className="text-white/85 text-sm leading-relaxed font-chn">{description}</p>
      </div>
      {badge > 0 && (
        <div className="shrink-0 ml-4 flex flex-col items-center bg-white/20 border border-white/30 rounded-2xl px-3 py-2 backdrop-blur-sm">
          <span className="text-2xl font-black text-white">{badge}</span>
          <span className="text-xs text-white/70 font-bold">待複習</span>
        </div>
      )}
    </div>
    <div className="absolute bottom-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-black text-lg group-hover:bg-white/40 transition-all group-hover:translate-x-1">
      ›
    </div>
  </button>
);

// ── Feature Hub: Grid Card ────────────────────────────────────────
const GridCard = ({ emoji, title, subtitle, badge, accent, onClick }) => (
  <button
    onClick={onClick}
    className="relative flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.97] group w-full"
  >
    <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${accent} shadow-lg group-hover:scale-110 transition-transform`}>
      {emoji}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-black text-white text-sm leading-tight">{title}</div>
      <div className="text-stone-400 text-xs font-medium mt-0.5 leading-snug">{subtitle}</div>
    </div>
    {badge > 0 && (
      <div className="shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs font-black text-white">
        {badge}
      </div>
    )}
    <div className="shrink-0 text-stone-500 group-hover:text-white transition-colors text-xl font-bold">›</div>
  </button>
);

// ── Feature Hub Home Screen ────────────────────────────────────────
const FeatureHub = ({ onNavigate, onOpenGreenhouse, stats, streak, savedWords }) => {
  const dueCount = savedWords.filter(w => w.nextReview <= Date.now()).length;
  const greet = () => {
    const h = new Date().getHours();
    if (h < 5)  return '🌙 夜深了還在學習';
    if (h < 12) return '☀️ 早安，開始今日的語言修行';
    if (h < 17) return '🌤 午後好，繼續精進吧';
    return '🌆 晚上好，每天一小步';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting Banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-emerald-400 text-sm font-bold">{greet()}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-white/50 text-xs font-bold">連勝</span>
            <div className="flex gap-1">
              {[...Array(Math.min(streak, 7))].map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.8)]" />
              ))}
            </div>
            <span className="text-orange-400 text-sm font-black">{streak} 天</span>
          </div>
        </div>
        {dueCount > 0 && (
          <button
            onClick={() => onNavigate('vocab')}
            className="bg-orange-500/20 border border-orange-400/40 rounded-2xl px-4 py-2 flex items-center gap-2 active:scale-95 transition"
          >
            <span className="text-base">📚</span>
            <span className="text-orange-300 text-sm font-bold">{dueCount} 個單字待複習</span>
          </button>
        )}
      </div>

      {/* Hero Cards */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-stone-500 font-black uppercase tracking-widest">✦ 核心學習</p>
        <HeroCard
          emoji="🌱"
          title="育苗室"
          subtitle="AI Nursery · Topic Reading"
          description="選擇主題，由 AI 即時生成沉浸式文章，在閱讀中自然習得詞彙。"
          gradient="from-emerald-700 via-teal-600 to-cyan-700"
          glowColor="rgba(16,185,129,0.5)"
          onClick={() => onNavigate('topic')}
        />
        <HeroCard
          emoji="🦜"
          title="迴音谷"
          subtitle="AI Coach · Voice Roleplay"
          description="與 AI 情境對話，獲得即時文法糾正、發音評分與課後體檢報告。"
          gradient="from-violet-700 via-purple-600 to-indigo-700"
          glowColor="rgba(139,92,246,0.5)"
          onClick={() => onNavigate('speak')}
        />
      </div>

      {/* Grid Cards */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-stone-500 font-black uppercase tracking-widest">✦ 工具與探索</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <GridCard emoji="🌳" title="世界樹" subtitle="隨機智慧小語 / 神秘嘉獎" accent="bg-emerald-900/60" onClick={() => onNavigate('explore')} />
          <GridCard emoji="📚" title="靈氣單字本" subtitle="SRS 間隔複習" badge={dueCount} accent="bg-blue-900/60" onClick={() => onNavigate('vocab')} />
          <GridCard emoji="🔬" title="標本室" subtitle="貼上任意文字分析" accent="bg-rose-900/60" onClick={() => onNavigate('paste')} />
          <GridCard emoji="🕊️" title="隨身口譯" subtitle="即時雙向翻譯" accent="bg-sky-900/60" onClick={() => onNavigate('translate')} />
          <GridCard emoji="🌸" title="溫室 · 扭蛋機" subtitle="收集臺灣特有種植物" accent="bg-amber-900/60" onClick={() => onOpenGreenhouse()} />
          <GridCard emoji="📜" title="福爾摩沙長卷" subtitle="解鎖傳奇圖鑑進度" accent="bg-stone-700/60" onClick={() => onNavigate('chronicles')} />
          <GridCard emoji="⚔️" title="語林試鍊" subtitle="守護靈英文知識問答" accent="bg-red-900/60" onClick={() => onNavigate('trial')} />
        </div>
      </div>
    </div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────
const DashboardView = () => {
  const { currentUser, logout } = useAuth();
  const { stats, streak, savedWords } = useGame();
  const { targetLangKey } = useSettings();

  const [activeView, setActiveView] = useState(null);
  const [readingSession, setReadingSession] = useState(null);
  const [isGreenhouseOpen, setIsGreenhouseOpen] = useState(false);
  const [specimenText, setSpecimenText] = useState('');

  const VIEW_LABELS = {
    topic: '🌱 育苗室', explore: '🌳 世界樹', speak: '🦜 迴音谷',
    vocab: '📚 單字本', paste: '🔬 標本室', translate: '🕊️ 隨身口譯', chronicles: '📜 長卷',
    trial: '⚔️ 語林試鍊'
  };

  const handleStartReading = (taskTitle, prompt) => setReadingSession({ title: taskTitle, prompt });
  const handleSendToSpecimen = (text) => { setSpecimenText(text); setActiveView('paste'); };
  const handleNavigate = (view) => setActiveView(view);
  const handleBack = () => setActiveView(null);

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
    <div className="w-full min-h-[100dvh] bg-[#0f172a] relative flex items-center justify-center p-0 lg:p-6 overflow-hidden">
      <GreenhouseModal isOpen={isGreenhouseOpen} onClose={() => setIsGreenhouseOpen(false)} />

      <div className="relative w-full flex flex-col premium-glass max-w-none lg:max-w-7xl h-[100dvh] lg:h-[90dvh] p-0 overflow-hidden lg:rounded-3xl">

        {/* ── Top HUD ─────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center px-3 sm:px-5 py-2.5 border-b border-white/10 gap-2 bg-black/20 backdrop-blur-sm">

          {/* Back / Logo */}
          {activeView ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-emerald-400 hover:text-white font-bold text-base transition mr-1 py-1 px-2 rounded-xl hover:bg-white/10 active:scale-95"
            >
              ‹ <span className="text-sm text-stone-400 ml-1">{VIEW_LABELS[activeView]}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 mr-1">
              <span className="text-xl">🌳</span>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest hidden sm:block">語林之境</span>
            </div>
          )}

          {/* User label */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider leading-none">Guardian</span>
            <span className="text-sm font-black text-white truncate mt-0.5">{currentUser}</span>
          </div>

          {/* Status Orbs */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {/* Streak */}
            <div className="essence-orb w-8 h-8 bg-orange-500/20 border-orange-400/50 text-orange-400" title={`連勝 ${streak} 天`}>
              <span className="text-xs font-bold z-10">{streak}</span>
              <div className="absolute inset-0 bg-orange-400/20 blur-md rounded-full animate-pulse-slow" />
            </div>
            {/* Coins */}
            <button onClick={() => setIsGreenhouseOpen(true)} className="essence-orb w-8 h-8 bg-amber-500/20 border-amber-400/50 text-amber-400" title="金幣/溫室">
              <span className="text-xs font-bold z-10">{stats.coins}</span>
            </button>
            <div className="h-5 w-px bg-white/10" />
            {/* Essence */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full">
              <div className="flex items-center gap-1" title="日光精華">
                <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.8)]" />
                <span className="text-xs font-black text-orange-200">{stats.essence?.light || 0}</span>
              </div>
              <div className="flex items-center gap-1" title="雨露精華">
                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.8)]" />
                <span className="text-xs font-black text-blue-200">{stats.essence?.rain || 0}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1" title="土壤精華">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                <span className="text-xs font-black text-emerald-100">{stats.essence?.soil || 0}</span>
              </div>
            </div>
            <LangSwitcher />
            <button
              onClick={() => { if (window.confirm('確定要離開語林之境嗎？')) logout(); }}
              className="w-8 h-8 flex items-center justify-center bg-red-400/20 border border-red-400/30 text-base rounded-full hover:bg-red-400/30 transition"
              title="登出"
            >
              🚪
            </button>
          </div>
        </div>

        {/* ── Content Area ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          {!activeView ? (
            <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-12">
              <FeatureHub
                onNavigate={handleNavigate}
                onOpenGreenhouse={() => setIsGreenhouseOpen(true)}
                stats={stats}
                streak={streak}
                savedWords={savedWords}
              />
            </div>
          ) : (
            <div className="h-full p-0 sm:p-6">
              <div className="h-full">
                {activeView === 'topic'      && <NurseryView onStartReading={handleStartReading} />}
                {activeView === 'explore'    && <WorldTreeView onSendToSpecimen={handleSendToSpecimen} />}
                {activeView === 'speak'      && <EchoValleyView />}
                {activeView === 'vocab'      && <VocabBookView />}
                {activeView === 'paste'      && <SpecimenRoomView key={specimenText} initialText={specimenText} />}
                {activeView === 'translate'  && <TranslatorView />}
                {activeView === 'chronicles' && <ChroniclesView />}
                {activeView === 'trial'      && <ForestTrialView />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
