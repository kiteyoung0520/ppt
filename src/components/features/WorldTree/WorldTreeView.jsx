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
    <div className="flex flex-col h-full w-full bg-[#020817] text-white relative overflow-hidden font-chn">
      
      {/* ── 頂部地區導航 (固定高度) ────────────────────────── */}
      <div className="shrink-0 p-4 bg-black/60 border-b border-white/5 z-20">
        <div className="flex items-center justify-between mb-2">
           <div className="flex flex-col">
              <h2 className="text-lg font-black text-emerald-400 tracking-tighter">探索：{activeRegion}</h2>
              <span className="text-[7px] text-orange-400 font-bold uppercase tracking-widest">System Link v1.2 ● Online</span>
           </div>
           <span className="text-[9px] bg-white/5 px-2 py-1 rounded-full text-stone-500 font-bold uppercase tracking-widest leading-none">
             Region Explore
           </span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {regions.map(r => (
            <button
              key={r}
              onClick={() => handleRegionChange(r)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all border ${
                activeRegion === r ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-stone-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── 主互動區塊 ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        
        {/* 手機版：橫向滑動牌卡 (確保有固定最小高度，防止坍塌) */}
        <div className={`
          flex-1 flex flex-col p-4 sm:p-8 min-h-0
          ${mobileLoreView ? 'hidden lg:flex' : 'flex'}
        `}>
          <div className="text-[10px] font-black text-emerald-400/50 uppercase tracking-[0.4em] mb-4 text-center lg:text-left">
             Select A Guardian Spirit
          </div>
          
          {/* 卡片橫向滑動容器 - 強制指定高度並開啟手機滑動優化 */}
          <div 
            className="flex-1 flex items-center gap-6 overflow-x-auto snap-x snap-mandatory px-4 py-4 no-scrollbar lg:grid lg:grid-cols-3 lg:overflow-y-auto lg:px-0"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x'
            }}
          >
            {regionPlants.map(p => {
              const isUnlocked = unlockedArr.includes(p.name) || p.rarity === 'Starter';
              return (
                <div
                  key={p.name}
                  onClick={() => isUnlocked && handlePlantClick(p)}
                  className={`
                    shrink-0 w-64 h-80 sm:w-80 sm:h-[400px] snap-center rounded-[3rem] border-2 flex flex-col items-center justify-center gap-6 relative transition-all active:scale-95 shadow-2xl
                    lg:w-full lg:h-auto lg:aspect-square
                    ${isUnlocked 
                      ? 'bg-gradient-to-br from-stone-900 to-black border-emerald-500/30' 
                      : 'bg-black opacity-30 border-white/5 grayscale'}
                  `}
                >
                  {isUnlocked && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.1)_0%,_transparent_70%)] pointer-events-none"></div>
                  )}
                  
                  <div className={`text-7xl sm:text-8xl drop-shadow-2xl transition-transform ${isUnlocked ? 'group-hover:scale-110' : ''}`}>
                    {isUnlocked ? p.emoji : '🔒'}
                  </div>

                  <div className="text-center px-4">
                     <div className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${isUnlocked ? 'text-emerald-400' : 'text-stone-700'}`}>
                        {p.rarity} Guardian
                     </div>
                     <h3 className={`text-xl sm:text-2xl font-black ${isUnlocked ? 'text-white' : 'text-stone-800'}`}>
                        {isUnlocked ? p.name : '神秘之影'}
                     </h3>
                  </div>

                  {isUnlocked && (
                     <div className="absolute bottom-10 flex flex-col items-center group">
                        <div className="text-[8px] font-bold text-emerald-400/40 uppercase tracking-widest animate-pulse">View Lore</div>
                        <div className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-transparent mt-2 rounded-full"></div>
                     </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 摘葉按鈕 (固定在底部，不隨內容滑動) */}
          <button
            onClick={fetchWisdomLeaf}
            disabled={isLeafLoading}
            className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_10px_40px_rgba(5,150,105,0.3)] flex items-center justify-center gap-3 transition-all active:scale-95 shrink-0"
          >
            {isLeafLoading ? '🍃 ...' : '🍃 摘取智慧之葉'}
          </button>
        </div>

        {/* ── 手機全屏故事層 (選中植物後浮現) ────────────────────── */}
        {mobileLoreView && (
          <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col lg:relative lg:bg-transparent lg:z-10 lg:w-1/2 lg:flex animate-slideUp">
             
             {/* 故事層標題與返回鈕 */}
             <div className="shrink-0 p-6 flex items-center justify-between border-b border-white/5 bg-black/40">
                <div className="flex items-center gap-3">
                   <span className="text-2xl">{selectedPlant?.emoji || wisdomLeaf?.emoji || '📖'}</span>
                   <div>
                      <h3 className="text-lg font-black text-white">{selectedPlant?.name || '手扎內容'}</h3>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Chronicle Details</p>
                   </div>
                </div>
                <button 
                  onClick={() => setMobileLoreView(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-white active:scale-90"
                >
                  ✕
                </button>
             </div>

             {/* 滾動的故事內容塊 */}
             <div className="flex-1 overflow-y-auto p-6 sm:p-10 scroll-smooth custom-scroll bg-gradient-to-b from-stone-900/50 to-black">
                {selectedPlant ? (
                  <div className="animate-fadeIn max-w-2xl mx-auto">
                     <div className="text-orange-400 text-xs font-bold italic mb-6 border-l-2 border-orange-400 pl-4">
                        {selectedPlant.trait}
                     </div>
                     <p className="text-emerald-50/90 text-[16px] sm:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedPlant.story}
                     </p>
                     
                     <div className="mt-10 p-6 bg-emerald-500/5 border border-emerald-400/20 rounded-[2.5rem]">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Guardian Benefit</div>
                        <div className="text-sm text-white/70 leading-relaxed">{selectedPlant.description}</div>
                     </div>
                  </div>
                ) : wisdomLeaf ? (
                  <div className="animate-fadeIn text-center max-w-xl mx-auto py-8">
                     <div className="text-6xl mb-8 opacity-20">❝</div>
                     <p className="font-eng text-xl sm:text-3xl font-black text-white italic mb-6 leading-tight">
                        {wisdomLeaf.eng}
                     </p>
                     <div className="text-xs text-stone-500 font-bold tracking-[0.2em] mb-10">— {wisdomLeaf.author} —</div>
                     <div className="bg-white/5 border border-white/10 p-6 sm:p-10 rounded-[3rem] text-emerald-100 text-[15px] sm:text-lg leading-relaxed shadow-xl">
                        {wisdomLeaf.chn}
                     </div>
                     {onSendToSpecimen && (
                       <button onClick={() => onSendToSpecimen(wisdomLeaf.eng)} className="mt-10 py-4 px-10 bg-indigo-600 text-white font-black text-[10px] rounded-full uppercase tracking-widest active:scale-95 shadow-2xl">📤 分析此手扎</button>
                     )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center opacity-20 px-10">
                    <p className="text-xs font-black uppercase tracking-[0.5em]">Scroll to awakening</p>
                  </div>
                )}
                
                {/* 底部預留空間確保滑動到底部 */}
                <div className="h-20"></div>
             </div>
          </div>
        )}

      </div>

      {/* ── 隨機挑戰彈窗 (最高層級) ─────────────────────────── */}
      {activeEvent && !selectedPlant && !wisdomLeaf && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fadeIn">
          <div className="bg-stone-900 border border-white/10 p-8 rounded-[3rem] max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
             <div className="text-5xl mb-4">{activeEvent.type === 'challenge' ? '🛡️' : '✨'}</div>
             <h3 className="text-xl font-black mb-2 tracking-tighter">{activeEvent.type === 'challenge' ? '守護者的試煉' : '森林的饋贈'}</h3>
             <p className="text-white/60 text-sm mb-8 leading-relaxed px-4">{activeEvent.type === 'challenge' ? activeEvent.q : activeEvent.msg}</p>
             
             {activeEvent.type === 'challenge' && !answerResult && (
               <div className="flex flex-col gap-2">
                  {activeEvent.options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(opt)} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-bold active:bg-emerald-500 transition-all">{opt}</button>
                  ))}
               </div>
             )}
             
             {(activeEvent.type === 'blessing' || answerResult) && (
               <button onClick={() => setActiveEvent(null)} className="w-full py-4 rounded-full bg-emerald-600 font-black text-xs uppercase tracking-widest mt-2 shadow-xl">繼續探索</button>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldTreeView;
