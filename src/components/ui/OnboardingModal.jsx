import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useGame } from '../../context/GameContext';

const LANG_OPTIONS = [
  { key: 'en', flag: '🇺🇸', label: 'English', sub: '英語（最多學習者）' },
  { key: 'ja', flag: '🇯🇵', label: '日本語', sub: '日文' },
  { key: 'ko', flag: '🇰🇷', label: '한국어', sub: '韓文' },
];

const STEPS = [
  {
    id: 'welcome',
    content: ({ selectedLang, setSelectedLang }) => (
      <div className="flex flex-col items-center text-center">
        <div className="text-7xl mb-6 animate-pulse drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">🌳</div>
        <div className="text-[10px] font-black text-emerald-400 tracking-[0.4em] uppercase mb-3">Formosa LinguaGarden</div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 font-chn">歡迎來到語林之境</h1>
        <p className="text-stone-400 text-sm leading-relaxed mb-8 font-chn max-w-xs">
          這是一座用語言澆灌的神秘森林，每一個字彙都是一顆種子。選擇您今天想學習的語言，開始旅程吧！
        </p>
        <div className="w-full flex flex-col gap-3">
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSelectedLang(opt.key)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                selectedLang === opt.key
                  ? 'bg-emerald-900/60 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <span className="text-3xl">{opt.flag}</span>
              <div className="text-left">
                <div className="font-black text-white text-base">{opt.label}</div>
                <div className="text-stone-400 text-xs font-bold">{opt.sub}</div>
              </div>
              {selectedLang === opt.key && (
                <div className="ml-auto w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center text-stone-900 text-xs font-black">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'loop',
    content: () => (
      <div className="flex flex-col items-center text-center">
        <div className="text-6xl mb-4">🔄</div>
        <h2 className="text-2xl font-black text-white mb-2 font-chn">語林學習循環</h2>
        <p className="text-stone-400 text-sm mb-8 font-chn">每個功能環環相扣，共同讓您的語感自然成長</p>
        <div className="w-full flex flex-col gap-3 text-left">
          {[
            { icon: '🌱', color: 'bg-emerald-900/50 border-emerald-500/30', title: '育苗室', desc: 'AI 為您生成閱讀文章 → 點亮生詞 → 送入單字本', tag: '閱讀 · 輸入' },
            { icon: '🦜', color: 'bg-violet-900/50 border-violet-500/30', title: '迴音谷', desc: 'AI 情境角色扮演 → 文法即時糾正 → 發音評分', tag: '口說 · 輸出' },
            { icon: '🌳', color: 'bg-teal-900/50 border-teal-500/30', title: '世界樹', desc: '每日點擊 → 智慧小語或神秘嘉獎 → 精華收集', tag: '每日習慣' },
            { icon: '📚', color: 'bg-blue-900/50 border-blue-500/30', title: '單字本', desc: 'SRS 科學間隔複習 → 精華淬鍊 → 強化記憶', tag: '複習 · 記憶' },
          ].map(item => (
            <div key={item.title} className={`flex items-start gap-3 p-4 rounded-2xl border ${item.color}`}>
              <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-white text-sm">{item.title}</span>
                  <span className="text-[9px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-bold uppercase">{item.tag}</span>
                </div>
                <p className="text-stone-400 text-xs leading-relaxed font-chn">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'gift',
    content: () => (
      <div className="flex flex-col items-center text-center">
        <div className="text-7xl mb-6 animate-bounce">🎁</div>
        <div className="text-[10px] font-black text-amber-400 tracking-[0.4em] uppercase mb-2">Opening Gift · 開林禮包</div>
        <h2 className="text-2xl font-black text-white mb-2 font-chn">世界樹送你的禮物</h2>
        <p className="text-stone-400 text-sm mb-8 font-chn leading-relaxed">
          語林之境的守護者，這份精華是你旅程的第一步。<br/>帶著它，去點亮屬於你的語言花園！
        </p>
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: '☀️', color: 'bg-orange-900/50 border-orange-400/30 text-orange-300', label: '日光精華', value: '+50', desc: '育苗室 / 世界樹獲取' },
            { icon: '💧', color: 'bg-blue-900/50 border-blue-400/30 text-blue-300', label: '雨露精華', value: '+50', desc: '迴音谷對話、翻譯獲取' },
            { icon: '🌱', color: 'bg-emerald-900/50 border-emerald-400/30 text-emerald-300', label: '土壤精華', value: '+50', desc: '單字本複習、試鍊獲取' },
            { icon: '🌞', color: 'bg-amber-900/50 border-amber-400/30 text-amber-300', label: '太陽金幣', value: '+100', desc: '用於扭蛋機召喚守護靈' },
          ].map(item => (
            <div key={item.label} className={`flex flex-col items-center p-4 rounded-2xl border ${item.color}`}>
              <span className="text-3xl mb-2">{item.icon}</span>
              <div className="text-2xl font-black">{item.value}</div>
              <div className="text-xs font-black mt-1">{item.label}</div>
              <div className="text-[9px] opacity-60 mt-1 font-bold text-center leading-tight">{item.desc}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-emerald-400/70 font-chn font-bold">
          ✨ 完成每日學習，精華會不斷增長！
        </div>
      </div>
    )
  }
];

const OnboardingModal = ({ onComplete }) => {
  const { setTargetLangKey } = useSettings();
  const { addEssence, setStats, stats } = useGame();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState('en');

  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => {
    if (step === 0) {
      setTargetLangKey(selectedLang);
    }
    if (isLastStep) {
      // Grant opening gifts
      addEssence('light', 50);
      addEssence('rain', 50);
      addEssence('soil', 50);
      setStats({ coins: (stats?.coins || 0) + 100 });
      localStorage.setItem('flg-onboarded', 'true');
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const StepContent = STEPS[step].content;

  return (
    <div className="fixed inset-0 z-[200] bg-[#020817] flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.08)_0%,_transparent_70%)] pointer-events-none" />
      
      <div className="relative w-full max-w-sm flex flex-col py-6">
        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-emerald-400' : 'w-2 h-2 bg-white/20'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          <StepContent selectedLang={selectedLang} setSelectedLang={setSelectedLang} />
        </div>

        {/* Action Button */}
        <button
          onClick={handleNext}
          className={`mt-8 w-full py-4 font-black rounded-2xl text-base transition-all active:scale-95 shadow-xl ${
            isLastStep
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-900 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          }`}
        >
          {step === 0 && '確認語言，繼續 →'}
          {step === 1 && '了解了！繼續 →'}
          {step === 2 && '🌟 開始我的語林旅程！'}
        </button>

        {/* Skip */}
        {step < STEPS.length - 1 && (
          <button
            onClick={() => {
              localStorage.setItem('flg-onboarded', 'true');
              onComplete();
            }}
            className="mt-3 text-center text-stone-600 text-xs hover:text-stone-400 transition font-bold"
          >
            跳過導引
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
