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
  
  // Adventure Events State
  const [activeEvent, setActiveEvent] = useState(null); // { type: 'challenge' | 'blessing', content: ... }
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
    triggerAdventure();
  };

  const fetchWisdomLeaf = async () => {
    setIsLeafLoading(true);
    try {
      const res = await callApi('getRandomQuote', {}, apiKey, currentLang.key);
      if (res.status === 'success' && res.data) {
        setWisdomLeaf(res.data);
      }
    } catch (err) {
      toast("世界樹葉片飄落失敗：" + err.message);
    } finally {
      setIsLeafLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative p-2 sm:p-4 overflow-hidden">
      
      {/* ── Adventure Map HUD ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-white font-chn flex items-center gap-2 drop-shadow-md">
            🌍 語林之境：守護者長卷
            {isRegionComplete && (
              <span className="text-xs bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full animate-bounce shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                榮譽守護者 🏆
              </span>
            )}
          </h2>
          <p className="text-emerald-100/60 text-xs font-medium tracking-widest uppercase">
            Explore the regions and awaken the guardian spirits
          </p>
        </div>
        
        {/* Region Switcher */}
        <div className="flex gap-1 bg-black/20 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {regions.map(r => (
            <button
              key={r}
              onClick={() => handleRegionChange(r)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                activeRegion === r ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-100/40 hover:text-white'
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
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm rounded-[2.5rem] animate-fadeIn">
            <div className="bg-stone-900 border-2 border-emerald-500/50 p-8 rounded-[3rem] max-w-md w-full shadow-2xl text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse"></div>
               
               <div className="text-4xl mb-4">
                  {activeEvent.type === 'challenge' ? '🛡️' : '✨'}
               </div>
               
               <h3 className="text-xl font-bold text-white mb-2">
                  {activeEvent.type === 'challenge' ? '守護靈的試煉' : '森林的饋贈'}
               </h3>
               
               <p className="text-emerald-100/80 text-sm mb-6 leading-relaxed">
                  {activeEvent.type === 'challenge' ? activeEvent.q : activeEvent.msg}
               </p>

               {activeEvent.type === 'challenge' && !answerResult && (
                 <div className="flex flex-col gap-2">
                    {activeEvent.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(opt)}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                 </div>
               )}

               {(activeEvent.type === 'blessing' || answerResult) && (
                 <button
                   onClick={() => setActiveEvent(null)}
                   className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest mt-4"
                 >
                    繼續冒險
                 </button>
               )}
            </div>
          </div>
        )}
        
        {/* ── Left Side: Region Grid (Board) ────────────────────────── */}
        <div className="lg:w-1/2 flex flex-col gap-4 overflow-y-auto no-scrollbar">
           <div className="grid grid-cols-2 xs:grid-cols-3 gap-4">
              {regionPlants.map(p => {
                const isUnlocked = unlockedArr.includes(p.name) || p.rarity === 'Starter';
                return (
                  <button
                    key={p.name}
                    onClick={() => isUnlocked && setSelectedPlant(p)}
                    className={`
                      relative group aspect-square rounded-[2rem] border-2 transition-all p-4
                      flex flex-col items-center justify-center gap-2
                      ${isUnlocked 
                        ? 'bg-white/10 border-emerald-400/30 hover:bg-white/20 active:scale-95' 
                        : 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed'}
                    `}
                  >
                    <div className={`text-4xl transition-transform ${isUnlocked ? 'group-hover:scale-125' : 'grayscale'}`}>
                       {isUnlocked ? p.emoji : '🔒'}
                    </div>
                    <div className="text-[10px] font-black text-white uppercase tracking-widest">
                       {isUnlocked ? p.name : '未解鎖'}
                    </div>
                    {isUnlocked && (
                      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                    )}
                  </button>
                );
              })}
           </div>

           {/* Wisdom Leaf Button */}
           <button
             onClick={fetchWisdomLeaf}
             disabled={isLeafLoading}
             className="w-full py-4 mt-auto rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
           >
              {isLeafLoading ? '🍃 祈願中...' : '🍃 摘取世界樹之葉 (隨機智慧)'}
           </button>
        </div>

        {/* ── Right Side: Lore & Story (Lore Ancient Scroll) ─────────── */}
        <div className="lg:w-1/2 flex flex-col min-h-0">
          <div className="flex-1 bg-stone-900/40 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 flex flex-col relative overflow-hidden backdrop-blur-md">
            
            {/* Ancient Scroll Background Mask */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)] pointer-events-none"></div>

            {selectedPlant ? (
              <div className="relative animate-fadeIn">
                <div className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Guardians of {activeRegion}</div>
                <div className="flex items-center gap-4 mb-6">
                   <div className="text-6xl">{selectedPlant.emoji}</div>
                   <div>
                      <h3 className="text-3xl font-black text-white font-chn drop-shadow-md">{selectedPlant.name}</h3>
                      <div className="text-xs font-bold text-orange-300/80 mt-1 italic">{selectedPlant.trait}</div>
                   </div>
                </div>
                
                <div className="h-[1px] w-full bg-gradient-to-r from-white/20 to-transparent mb-6"></div>
                
                <p className="text-emerald-50 text-base font-medium leading-relaxed font-chn whitespace-pre-wrap">
                   {selectedPlant.story}
                </p>

                <div className="mt-8 bg-emerald-400/5 border border-emerald-400/20 rounded-2xl p-4">
                   <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">能力加備 (Passive)</div>
                   <div className="text-xs text-white/70">{selectedPlant.description}</div>
                </div>
              </div>
            ) : wisdomLeaf ? (
              <div className="relative animate-popup-fade flex flex-col h-full">
                <div className="text-violet-400 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Wisdom from World Tree</div>
                <div className="text-[40px] text-violet-400 opacity-30 leading-none">❝</div>
                <div className="font-eng text-xl sm:text-2xl text-white font-black leading-loose whitespace-pre-wrap mb-4">
                  {wisdomLeaf.eng}
                </div>
                <div className="text-sm font-eng text-stone-400 italic mb-6">
                  — {wisdomLeaf.author} —
                </div>
                <div className="border-t border-dashed border-white/10 pt-6 font-chn leading-relaxed text-lg text-emerald-100/80 whitespace-pre-wrap flex-1 scrollbar-thin overflow-y-auto">
                  {wisdomLeaf.chn}
                </div>
                
                {onSendToSpecimen && (
                  <button
                    onClick={() => onSendToSpecimen(wisdomLeaf.eng)}
                    className="mt-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    📤 傳送至標本室分析
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                 <div className="text-6xl mb-6">🧭</div>
                 <h4 className="text-emerald-100 font-black uppercase tracking-widest text-[11px]">Select a Guardian or Shake the Tree</h4>
                 <p className="text-stone-400 text-xs mt-2 px-10">
                   點擊解鎖的守護靈來閱讀其古老傳說，或者摘取智慧葉片獲得靈感。
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldTreeView;
