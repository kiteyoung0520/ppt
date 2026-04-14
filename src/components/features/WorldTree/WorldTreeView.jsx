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
    <div className="flex flex-col h-full w-full relative p-2 sm:p-4 overflow-hidden safe-top bg-[#020817]">
      
      {/* ── Adventure Map HUD (Compact Header) ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4 sm:mb-8 shrink-0">
        <div className="flex-1 w-full flex justify-between items-center px-2 sm:px-0">
          <h2 className="text-xl sm:text-2xl font-black text-white font-chn flex items-center gap-2 drop-shadow-md">
            🌍 {activeRegion}
            {isRegionComplete && <span className="text-[10px] bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full">MASTER</span>}
          </h2>
          <div className="flex gap-1 h-6 items-center">
             {regions.map(r => (
               <div key={r} className={`w-1.5 h-1.5 rounded-full ${activeRegion === r ? 'bg-emerald-400' : 'bg-white/10'}`}></div>
             ))}
          </div>
        </div>
        
        {/* Region Switcher: Capsule Scroll */}
        <div className="flex gap-1.5 bg-white/5 p-1 rounded-full border border-white/5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {regions.map(r => (
            <button
              key={r}
              onClick={() => handleRegionChange(r)}
              className={`px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black whitespace-nowrap transition-all ${
                activeRegion === r ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-emerald-100/30 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative">
        
        {/* ── Adventure Event Overlay ────────────────────────────── */}
        {activeEvent && !selectedPlant && !wisdomLeaf && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl rounded-[2rem] animate-fadeIn">
            <div className="bg-stone-900 border border-emerald-500/30 p-8 rounded-[3rem] max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
               <div className="text-5xl mb-6">{activeEvent.type === 'challenge' ? '🛡️' : '✨'}</div>
               <h3 className="text-xl font-black text-white mb-3 tracking-tighter">{activeEvent.type === 'challenge' ? '守護靈的試煉' : '森林的饋贈'}</h3>
               <p className="text-emerald-100/60 text-sm mb-8 leading-relaxed px-4">{activeEvent.type === 'challenge' ? activeEvent.q : activeEvent.msg}</p>

               {activeEvent.type === 'challenge' && !answerResult && (
                 <div className="flex flex-col gap-2">
                    {activeEvent.options.map(opt => (
                      <button key={opt} onClick={() => handleAnswer(opt)} className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-bold active:bg-emerald-500 transition-all">{opt}</button>
                    ))}
                 </div>
               )}

               {(activeEvent.type === 'blessing' || answerResult) && (
                 <button onClick={() => setActiveEvent(null)} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] mt-2">繼續探險</button>
               )}
            </div>
          </div>
        )}
        
        {/* ── Mobile Carousel / Desktop Grid ─────────────────────── */}
        <div className={`
          flex-1 min-h-0 flex flex-col gap-4
          ${mobileLoreView ? 'hidden lg:flex' : 'flex'}
        `}>
           
           {/* Mobile Hand-drawn Carousel Cards */}
           <div className="flex-1 overflow-x-auto no-scrollbar snap-x snap-mandatory flex gap-4 px-8 items-center lg:grid lg:grid-cols-3 lg:snap-none lg:px-0 lg:overflow-y-auto">
              {regionPlants.map(p => {
                const isUnlocked = unlockedArr.includes(p.name) || p.rarity === 'Starter';
                return (
                  <div
                    key={p.name}
                    onClick={() => isUnlocked && handlePlantClick(p)}
                    className={`
                      shrink-0 w-64 h-[24rem] sm:w-72 sm:h-[28rem] snap-center rounded-[3rem] border-2 transition-all p-8
                      flex flex-col items-center justify-center gap-6 relative overflow-hidden group active:scale-95
                      lg:w-full lg:h-auto lg:aspect-square lg:p-4 lg:rounded-3xl
                      ${isUnlocked 
                        ? 'bg-gradient-to-b from-white/10 to-white/5 border-emerald-400/30' 
                        : 'bg-black/40 border-white/5 opacity-50 grayscale'}
                    `}
                  >
                     {/* Card Pattern */}
                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                     <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

                     <div className={`text-7xl sm:text-8xl transition-all duration-700 ${isUnlocked ? 'group-hover:scale-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'opacity-40'}`}>
                        {isUnlocked ? p.emoji : '🔒'}
                     </div>

                     <div className="text-center">
                        <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${isUnlocked ? 'text-emerald-400' : 'text-stone-600'}`}>
                           {p.rarity} Guardian
                        </div>
                        <h3 className={`text-2xl font-black font-chn ${isUnlocked ? 'text-white' : 'text-stone-700'}`}>
                           {isUnlocked ? p.name : '神秘之影'}
                        </h3>
                     </div>

                     {isUnlocked && (
                       <div className="mt-4 flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 px-4 py-2 rounded-full">
                          <span className="text-[10px] font-black text-emerald-300">靈氣覺醒</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                       </div>
                     )}

                     <div className="absolute bottom-6 text-[9px] font-bold text-white/20 uppercase tracking-widest lg:hidden">
                        點擊查看故事
                     </div>
                  </div>
                );
              })}
           </div>

           <button
             onClick={fetchWisdomLeaf}
             disabled={isLeafLoading}
             className="w-full py-4 shrink-0 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 transition-all active:scale-95"
           >
              {isLeafLoading ? '🍃 ...' : '🍃 摘取智慧之葉'}
           </button>
        </div>

        {/* ── Right Side: Lore (Genshin Style Details) ──────────────── */}
        <div className={`
          flex-1 min-h-0 lg:w-1/2
          ${mobileLoreView ? 'flex' : 'hidden lg:flex'}
        `}>
          <div className="flex-1 bg-gradient-to-b from-stone-900 to-black border border-white/10 rounded-[3rem] p-8 flex flex-col relative overflow-hidden shadow-2xl">
            
            <button 
              onClick={() => setMobileLoreView(false)}
              className="lg:hidden absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white z-20"
            >
              ✕
            </button>

            <div className="flex-1 overflow-y-auto pr-2 custom-scroll">
              {selectedPlant ? (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-6 mb-8">
                     <div className="text-6xl sm:text-7xl drop-shadow-2xl">{selectedPlant.emoji}</div>
                     <div>
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-1">Record No. 712</div>
                        <h3 className="text-2xl sm:text-4xl font-black text-white font-chn">{selectedPlant.name}</h3>
                        <div className="text-xs font-bold text-orange-400/80 mt-2 italic flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                           {selectedPlant.trait}
                        </div>
                     </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-6 sm:p-8 border border-white/5">
                    <p className="text-emerald-50/90 text-sm sm:text-lg leading-relaxed font-chn whitespace-pre-wrap">
                       {selectedPlant.story}
                    </p>
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-4">
                     <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-2xl p-5">
                        <div className="text-[10px] font-black text-emerald-400 uppercase mb-2 tracking-widest">守護特質 (Trait)</div>
                        <div className="text-xs sm:text-sm text-white/80 leading-relaxed font-chn">{selectedPlant.description}</div>
                     </div>
                  </div>
                </div>
              ) : wisdomLeaf ? (
                <div className="animate-popup-fade flex flex-col h-full items-center justify-center text-center">
                  <div className="text-[60px] text-violet-500/30 font-serif leading-none mb-4">“</div>
                  <div className="font-eng text-xl sm:text-4xl text-white font-black leading-tight mb-6 italic px-4">
                    {wisdomLeaf.eng}
                  </div>
                  <div className="text-xs font-bold text-stone-500 mb-8 tracking-[0.3em]">— {wisdomLeaf.author} —</div>
                  <div className="bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/5 font-chn text-base sm:text-xl text-emerald-100/80 w-full">
                    {wisdomLeaf.chn}
                  </div>
                  {onSendToSpecimen && (
                    <button onClick={() => onSendToSpecimen(wisdomLeaf.eng)} className="mt-8 py-4 px-10 bg-violet-600 text-white font-black text-[10px] rounded-full tracking-[0.2em] uppercase shadow-lg shadow-violet-500/20 active:scale-95 transition-all">傳送至標本室</button>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                   <div className="text-8xl mb-8">🎴</div>
                   <div className="text-xs uppercase font-black tracking-[0.5em]">Card Details</div>
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
