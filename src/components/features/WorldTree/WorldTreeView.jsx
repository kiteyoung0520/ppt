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
    <div className="flex flex-col h-full w-full bg-[#020817] text-white relative overflow-hidden">
      
      {/* ── Top Region Bar (Shrinkable) ─────────────────────────── */}
      <div className="shrink-0 p-3 sm:p-6 bg-black/40 border-b border-white/5 z-20">
        <div className="flex items-center justify-between mb-3">
           <h2 className="text-xl font-black font-chn text-emerald-400">🌍 {activeRegion}</h2>
           <div className="flex gap-1">
              {regions.map(r => (
                <div key={r} className={`w-1 h-1 rounded-full ${activeRegion === r ? 'bg-emerald-400' : 'bg-white/10'}`}></div>
              ))}
           </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {regions.map(r => (
            <button
              key={r}
              onClick={() => handleRegionChange(r)}
              className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black whitespace-nowrap transition-all border ${
                activeRegion === r ? 'bg-emerald-500 border-emerald-400 shadow-lg' : 'bg-white/5 border-white/5 text-stone-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative flex flex-col min-h-0">
        
        {/* ── Adventure Event Overlay ────────────────────────────── */}
        {activeEvent && !selectedPlant && !wisdomLeaf && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fadeIn">
            <div className="bg-stone-900 border border-emerald-500/30 p-8 rounded-[3rem] max-w-sm w-full shadow-2xl text-center">
               <div className="text-5xl mb-4">{activeEvent.type === 'challenge' ? '🛡️' : '✨'}</div>
               <h3 className="text-xl font-bold mb-2">{activeEvent.type === 'challenge' ? '試煉' : '饋贈'}</h3>
               <p className="text-white/60 text-sm mb-8 leading-relaxed">{activeEvent.type === 'challenge' ? activeEvent.q : activeEvent.msg}</p>
               {activeEvent.type === 'challenge' && !answerResult && (
                 <div className="flex flex-col gap-2">
                    {activeEvent.options.map(opt => (
                      <button key={opt} onClick={() => handleAnswer(opt)} className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-bold">{opt}</button>
                    ))}
                 </div>
               )}
               {(activeEvent.type === 'blessing' || answerResult) && (
                 <button onClick={() => setActiveEvent(null)} className="w-full py-4 rounded-full bg-emerald-600 font-black text-xs uppercase tracking-widest mt-2">繼續探險</button>
               )}
            </div>
          </div>
        )}
        
        {/* ── Main Interactive Content ─────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
           
           {/* Card Slider (Mobile) / Grid (Desktop) */}
           <div className={`
              flex-1 flex flex-col p-4 sm:p-8 min-h-0
              ${mobileLoreView ? 'hidden lg:flex' : 'flex'}
           `}>
              <div className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center gap-6 px-4 touch-pan-x lg:grid lg:grid-cols-3 lg:overflow-y-auto lg:px-0">
                {regionPlants.map(p => {
                  const isUnlocked = unlockedArr.includes(p.name) || p.rarity === 'Starter';
                  return (
                    <div
                      key={p.name}
                      onClick={() => isUnlocked && handlePlantClick(p)}
                      className={`
                        shrink-0 w-64 h-80 sm:w-80 sm:h-96 rounded-[2.5rem] border-2 flex flex-col items-center justify-center gap-6 relative transition-transform active:scale-95 lg:w-full lg:h-auto lg:aspect-square
                        ${isUnlocked ? 'bg-white/5 border-emerald-400/30' : 'bg-black/40 border-white/5 opacity-40 grayscale'}
                      `}
                    >
                      <div className="text-7xl drop-shadow-2xl">{isUnlocked ? p.emoji : '🔒'}</div>
                      <div className="text-center">
                         <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{p.rarity}</div>
                         <h3 className="text-xl font-black">{isUnlocked ? p.name : 'Unknown'}</h3>
                      </div>
                      <div className="absolute bottom-6 text-[8px] font-bold text-white/20 uppercase tracking-[0.3em] lg:hidden">Touch to view lore</div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={fetchWisdomLeaf}
                disabled={isLeafLoading}
                className="mt-6 w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                {isLeafLoading ? 'Loading Wisdom...' : '🍃 摘取智慧之葉'}
              </button>
           </div>

           {/* Story Display (Full-screen Mobile) */}
           <div className={`
              flex-1 flex flex-col min-h-0 p-4 sm:p-8
              ${mobileLoreView ? 'flex' : 'hidden lg:flex'}
           `}>
              <div className="flex-1 bg-stone-900 border border-white/10 rounded-[2.5rem] p-6 sm:p-10 flex flex-col relative overflow-hidden">
                <button 
                  onClick={() => setMobileLoreView(false)}
                  className="lg:hidden absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white z-30"
                >
                  ✕
                </button>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {selectedPlant ? (
                    <div className="animate-fadeIn">
                       <div className="flex items-center gap-4 mb-6">
                         <div className="text-5xl">{selectedPlant.emoji}</div>
                         <div>
                            <h3 className="text-2xl font-black">{selectedPlant.name}</h3>
                            <div className="text-xs text-orange-400 mt-1 italic">{selectedPlant.trait}</div>
                         </div>
                       </div>
                       <div className="h-[1px] bg-white/10 mb-6"></div>
                       <p className="text-white/80 text-[15px] leading-relaxed font-chn">
                          {selectedPlant.story}
                       </p>
                       <div className="mt-8 bg-emerald-500/10 border border-emerald-400/30 p-4 rounded-2xl">
                          <div className="text-[9px] font-black text-emerald-400 mb-1 tracking-widest uppercase">Guardian Trait</div>
                          <div className="text-xs text-white/70">{selectedPlant.description}</div>
                       </div>
                    </div>
                  ) : wisdomLeaf ? (
                    <div className="text-center py-8">
                       <div className="text-4xl mb-6 text-indigo-400 italic">“</div>
                       <p className="text-xl font-bold mb-4">{wisdomLeaf.eng}</p>
                       <p className="text-stone-500 text-xs mb-8">— {wisdomLeaf.author}</p>
                       <div className="bg-white/5 p-6 rounded-2xl text-emerald-100 text-sm">
                          {wisdomLeaf.chn}
                       </div>
                       {onSendToSpecimen && (
                         <button onClick={() => onSendToSpecimen(wisdomLeaf.eng)} className="mt-8 py-3 px-8 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest">📤 Analyze</button>
                       )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center opacity-20">
                       <p className="text-xs uppercase font-black tracking-widest">Select a Guardian</p>
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WorldTreeView;
