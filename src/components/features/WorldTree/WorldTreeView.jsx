import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { callApi } from '../../../services/api';
import { toast } from '../../ui/Toast';

const WorldTreeView = ({ onSendToSpecimen }) => {
  const { currentLang } = useSettings();
  const { apiKey } = useAuth();
  const { stats, addEssence, setStats } = useGame();
  
  const [activeRegion, setActiveRegion] = useState('城市公園');
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [wisdomLeaf, setWisdomLeaf] = useState(null);
  const [isLeafLoading, setIsLeafLoading] = useState(false);
  
  // Mobile UI Logic: Determine if we should show the Lore full-screen
  const [mobileLoreView, setMobileLoreView] = useState(false);

  // Adventure Events State
  const [activeEvent, setActiveEvent] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);

  const regions = [...new Set(NATIVE_PLANT_DB.map(p => p.region))];
  const unlockedArr = Array.isArray(stats.unlockedPlants) ? stats.unlockedPlants : [];
  
  const regionPlants = NATIVE_PLANT_DB.filter(p => p.region === activeRegion);
  const isRegionComplete = regionPlants.every(p => unlockedArr.includes(p.name) || p.rarity === 'Starter');

  // Trigger Adventure Event
  const triggerAdventure = () => {
    const dice = Math.random();
    if (dice > 0.7) { // 30% chance to trigger an event on region switch
      const isChallenge = Math.random() > 0.4; // 60% challenge, 40% blessing
      
      if (isChallenge) {
        // Simple language puzzle (Mock dynamic challenge)
        const challenges = [
          { q: `「${activeRegion}」的守護靈問：'Ephemeral' 的中文是什麼？`, a: '瞬息萬變', options: ['堅定不移', '瞬息萬變', '色彩鮮艷'] },
          { q: `語林微風吹下句子：'The _____ of nature is vast.'`, a: 'beauty', options: ['beauty', 'beautifully', 'beautify'] },
          { q: `在日文中，描述『極致森林』的語境常用？`, a: '神祕的', options: ['吵鬧的', '神祕的', '昂貴的'] }
        ];
        const picked = challenges[Math.floor(Math.random() * challenges.length)];
        setActiveEvent({ type: 'challenge', ...picked });
      } else {
        const rewards = [
          { msg: '山間的泉水流過，獲得大量的【雨露精華】！', type: 'rain', amount: 50 },
          { msg: '太陽照耀著圖卷，獲得大量的【日光精華】！', type: 'light', amount: 50 },
          { msg: '深層土壤被喚醒，獲得大量的【土壤精華】！', type: 'soil', amount: 50 }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        setActiveEvent({ type: 'blessing', ...reward });
        addEssence(reward.type, reward.amount);
      }
    }
  };

  const handleAnswer = (option) => {
    if (option === activeEvent.a) {
      setAnswerResult('correct');
      addEssence('soil', 30);
      setStats(prev => ({ ...prev, coins: (prev.coins || 0) + 10 }));
      toast("✨ 考驗通過！獲得土壤精華 +30, 陽光幣 +10");
    } else {
      setAnswerResult('wrong');
      toast("🍃 考驗失敗，靈氣消散了...");
    }
  };

  const handleRegionChange = (r) => {
    setActiveRegion(r);
    setSelectedPlant(null);
    setAnswerResult(null);
    setActiveEvent(null);
    setMobileLoreView(false); // Reset view on region change
    triggerAdventure();
  };

  const handlePlantClick = (p) => {
    setSelectedPlant(p);
    setWisdomLeaf(null);
    setMobileLoreView(true); // Switch to Lore view on mobile
  };

  const fetchWisdomLeaf = async () => {
    setIsLeafLoading(true);
    try {
      const res = await callApi('getRandomQuote', {}, apiKey, currentLang.key);
      if (res.status === 'success' && res.data) {
        setWisdomLeaf(res.data);
        setMobileLoreView(true);
      }
    } catch (err) {
      toast("世界樹葉片飄落失敗：" + err.message);
    } finally {
      setIsLeafLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative p-2 sm:p-4 overflow-hidden safe-top">
      
      {/* ── Adventure Map HUD (Compact on Landscape) ──────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mb-3 sm:mb-6 shrink-0">
        <div className="flex-1 w-full flex justify-between items-center sm:block">
          <h2 className="text-lg sm:text-2xl font-black text-white font-chn drop-shadow-md">
            🌍 {isRegionComplete && '🏆 '}語林之境
          </h2>
          <div className="sm:hidden">
            {isRegionComplete && <span className="text-[10px] bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full font-black">Region Master</span>}
          </div>
          <p className="hidden sm:block text-emerald-100/60 text-xs font-medium tracking-widest uppercase">
            {activeRegion} Guardian Scroll
          </p>
        </div>
        
        {/* Region Switcher (Scrollable on small screens) */}
        <div className="flex gap-1 bg-black/30 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {regions.map(r => (
            <button
              key={r}
              onClick={() => handleRegionChange(r)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black whitespace-nowrap transition-all ${
                activeRegion === r ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-100/40 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0 relative">
        
        {/* ── Adventure Event Overlay ────────────────────────────── */}
        {activeEvent && !selectedPlant && !wisdomLeaf && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-[1.5rem] sm:rounded-[2.5rem] animate-fadeIn">
            <div className="bg-stone-900 border-2 border-emerald-500/50 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] max-w-md w-full shadow-2xl text-center relative overflow-hidden">
               <div className="text-4xl mb-4">{activeEvent.type === 'challenge' ? '🛡️' : '✨'}</div>
               <h3 className="text-xl font-bold text-white mb-2">{activeEvent.type === 'challenge' ? '守護靈的試煉' : '森林的饋贈'}</h3>
               <p className="text-emerald-100/80 text-sm mb-6 leading-relaxed">{activeEvent.type === 'challenge' ? activeEvent.q : activeEvent.msg}</p>

               {activeEvent.type === 'challenge' && !answerResult && (
                 <div className="flex flex-col gap-2">
                    {activeEvent.options.map(opt => (
                      <button key={opt} onClick={() => handleAnswer(opt)} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all">{opt}</button>
                    ))}
                 </div>
               )}

               {(activeEvent.type === 'blessing' || answerResult) && (
                 <button onClick={() => setActiveEvent(null)} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest mt-4">繼續冒險</button>
               )}
            </div>
          </div>
        )}
        
        {/* ── Left Side: Region Grid (Hidden on Lore view in Portrait) ────────────────────────── */}
        <div className={`
          flex-1 lg:w-1/2 flex flex-col gap-4 min-h-0
          ${mobileLoreView ? 'hidden lg:flex' : 'flex'}
        `}>
           <div className="flex-1 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 overflow-y-auto no-scrollbar py-2">
              {regionPlants.map(p => {
                const isUnlocked = unlockedArr.includes(p.name) || p.rarity === 'Starter';
                return (
                  <button
                    key={p.name}
                    onClick={() => isUnlocked && handlePlantClick(p)}
                    className={`
                      relative aspect-square rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all p-3 sm:p-4
                      flex flex-col items-center justify-center gap-1 sm:gap-2
                      ${isUnlocked 
                        ? 'bg-white/10 border-emerald-400/30 hover:bg-white/20 active:scale-95' 
                        : 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed'}
                    `}
                  >
                    <div className={`text-2xl sm:text-4xl transition-transform ${isUnlocked ? 'group-hover:scale-110' : 'grayscale'}`}>
                       {isUnlocked ? p.emoji : '🔒'}
                    </div>
                    <div className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-tighter truncate w-full text-center">
                       {isUnlocked ? p.name : '遺失'}
                    </div>
                  </button>
                );
              })}
           </div>

           <button
             onClick={fetchWisdomLeaf}
             disabled={isLeafLoading}
             className="w-full py-3 sm:py-4 mt-auto rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
           >
              {isLeafLoading ? '🍃 祈願中...' : '🍃 摘取世界樹之葉'}
           </button>
        </div>

        {/* ── Right Side: Lore (Full-screen on PortraitLore) ─────────── */}
        <div className={`
          flex-1 lg:w-1/2 min-h-0
          ${mobileLoreView ? 'flex' : 'hidden lg:flex'}
        `}>
          <div className="flex-1 bg-stone-900/60 border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col relative overflow-hidden backdrop-blur-md">
            
            {/* Back button for mobile */}
            <button 
              onClick={() => setMobileLoreView(false)}
              className="lg:hidden absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white z-20"
            >
              ✕
            </button>

            <div className="flex-1 overflow-y-auto custom-scroll pr-2">
              {selectedPlant ? (
                <div className="relative animate-fadeIn">
                  <div className="text-emerald-400 font-black text-[9px] uppercase tracking-[0.3em] mb-3">Ancient Scroll</div>
                  <div className="flex items-center gap-4 mb-4 sm:mb-6">
                     <div className="text-5xl sm:text-6xl">{selectedPlant.emoji}</div>
                     <div>
                        <h3 className="text-xl sm:text-3xl font-black text-white font-chn">{selectedPlant.name}</h3>
                        <div className="text-[10px] sm:text-xs font-bold text-orange-300/80 mt-1 italic">{selectedPlant.trait}</div>
                     </div>
                  </div>
                  <div className="h-[1px] w-full bg-gradient-to-r from-white/20 to-transparent mb-4 sm:mb-6"></div>
                  <p className="text-emerald-50 text-sm sm:text-base leading-relaxed font-chn">
                     {selectedPlant.story}
                  </p>
                  <div className="mt-6 sm:mt-8 bg-emerald-400/10 border border-emerald-400/30 rounded-2xl p-4">
                     <div className="text-[8px] sm:text-[10px] font-black text-emerald-400 uppercase mb-1">能力加備 (Passive)</div>
                     <div className="text-[11px] sm:text-xs text-white/80">{selectedPlant.description}</div>
                  </div>
                </div>
              ) : wisdomLeaf ? (
                <div className="relative animate-popup-fade flex flex-col min-h-full">
                  <div className="text-violet-400 font-black text-[9px] uppercase tracking-[0.3em] mb-4">Island Wisdom</div>
                  <div className="text-[40px] text-violet-400 opacity-20 leading-none">❝</div>
                  <div className="font-eng text-lg sm:text-2xl text-white font-bold leading-relaxed mb-4">
                    {wisdomLeaf.eng}
                  </div>
                  <div className="text-[10px] font-eng text-stone-500 italic mb-4">— {wisdomLeaf.author} —</div>
                  <div className="border-t border-dashed border-white/10 pt-4 font-chn text-base sm:text-lg text-emerald-100/90 whitespace-pre-wrap">
                    {wisdomLeaf.chn}
                  </div>
                  {onSendToSpecimen && (
                    <button onClick={() => onSendToSpecimen(wisdomLeaf.eng)} className="mt-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95">📤 分析內容</button>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-4">
                   <div className="text-5xl mb-4">🧭</div>
                   <h4 className="text-emerald-100 font-black uppercase text-[10px]">Explore the Formosa Map</h4>
                   <p className="text-stone-400 text-[10px] mt-2">點擊解鎖的守護靈，觀看其在古卷中的傳說故事。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldTreeView;
