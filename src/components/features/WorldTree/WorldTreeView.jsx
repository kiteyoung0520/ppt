import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { callApi } from '../../../services/api';
import { toast } from '../../ui/Toast';

const WorldTreeView = ({ onSendToSpecimen }) => {
  const { currentLang } = useSettings();
  const { apiKey } = useAuth();
  const { addEssence, setStats } = useGame();
  
  const [wisdomLeaf, setWisdomLeaf] = useState(null);
  const [activeReward, setActiveReward] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const interactWithTree = async () => {
    if (isLoading) return;
    
    // 30% chance for a mystery reward, 70% for a reading quote
    const isReward = Math.random() < 0.3;

    if (isReward) {
      const rewards = [
        { msg: '微風輕拂，世界樹的枝葉散落了閃耀的日光！', type: 'light', amount: 30, icon: '☀️', name: '陽光洗禮' },
        { msg: '一陣清雨拂過，洗滌了心靈，感覺神清氣爽！', type: 'rain', amount: 30, icon: '💧', name: '春雨恩典' },
        { msg: '你感受到深層大地的共鳴，獲取了厚實的養分！', type: 'soil', amount: 30, icon: '🌱', name: '大地脈動' },
      ];
      const r = rewards[Math.floor(Math.random() * rewards.length)];
      addEssence(r.type, r.amount);
      setStats(prev => ({ ...prev, coins: (prev.coins || 0) + 15 }));
      setActiveReward(r);
      setWisdomLeaf(null);
    } else {
      // Fetch Quote
      setIsLoading(true);
      try {
        const res = await callApi('getRandomQuote', {}, apiKey, currentLang.key);
        if (res.status === 'success' && res.data) {
          setWisdomLeaf(res.data);
          setActiveReward(null);
        }
      } catch (err) {
        toast("森林起霧了，無法看清葉片上的字：" + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const closeResult = () => {
    setWisdomLeaf(null);
    setActiveReward(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#020817] text-white relative overflow-hidden font-chn items-center justify-center p-4">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.05)_0%,_transparent_70%)] pointer-events-none"></div>

      {/* Main Tree Interaction Area */}
      <div 
         onClick={interactWithTree}
         className={`relative z-10 flex flex-col items-center justify-center cursor-pointer group transition-all duration-700 ${isLoading ? 'scale-95 opacity-80' : 'hover:scale-105'}`}
      >
        <div className="text-[120px] sm:text-[180px] drop-shadow-[0_0_80px_rgba(16,185,129,0.4)] animate-pulse-slow transition-transform duration-500 group-hover:-translate-y-4">
           🌳
        </div>
        <div className="mt-8 px-8 py-4 rounded-full border border-emerald-500/20 bg-emerald-950/40 text-emerald-400 font-bold tracking-widest uppercase text-sm shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:bg-emerald-900/60 transition-all flex items-center gap-3 active:scale-95">
           {isLoading ? (
              <>
                 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                 <span>與樹靈共鳴中...</span>
              </>
           ) : (
              <>
                 <span>✨</span> 
                 <span>點擊與世界樹共鳴</span>
              </>
           )}
        </div>
        
        <div className="absolute -bottom-16 text-center text-[10px] text-stone-500 font-bold uppercase tracking-[0.3em]">
           Tap to receive Wisdom or Blessing
        </div>
      </div>

      {/* Reward Popup */}
      {activeReward && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fadeIn" onClick={closeResult}>
          <div className="bg-[#0f172a] border border-emerald-500/30 p-10 rounded-[3rem] max-w-[320px] w-full text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
             <div className="text-7xl mb-6 animate-bounce">{activeReward.icon}</div>
             <div className="text-[10px] font-black tracking-widest text-emerald-500 uppercase mb-2">Mystic Blessing</div>
             <h3 className="text-2xl font-black text-white mb-4">{activeReward.name}</h3>
             <p className="text-stone-400 text-sm mb-8 leading-relaxed font-medium px-2">{activeReward.msg}</p>
             <button onClick={closeResult} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-white font-black tracking-widest text-xs uppercase shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95">
               收下這份饋贈
             </button>
          </div>
        </div>
      )}

      {/* Wisdom Leaf (Quote) Popup */}
      {wisdomLeaf && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8 animate-fadeIn">
           <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] p-8 sm:p-14 relative overflow-y-auto max-h-full custom-scroll shadow-[0_0_100px_rgba(0,0,0,1)] animate-slideUp">
              
              <button onClick={closeResult} className="absolute top-6 right-6 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-stone-400 transition-all text-xl">✕</button>
              
              <div className="text-center mb-8">
                 <div className="text-[10px] text-emerald-400 font-black tracking-[0.5em] uppercase mb-2">Wisdom Leaf</div>
                 <div className="text-5xl opacity-20 mx-auto text-emerald-500">❝</div>
              </div>

              <p className="font-eng text-2xl sm:text-4xl font-black text-white italic mb-10 leading-relaxed text-center drop-shadow-md px-2">
                 {wisdomLeaf.eng}
              </p>
              
              <div className="text-center text-stone-500 font-bold tracking-[0.2em] mb-12">— {wisdomLeaf.author} —</div>
              
              <div className="bg-emerald-950/20 border border-emerald-500/10 p-8 rounded-[2.5rem] text-emerald-50 text-[15px] sm:text-lg leading-relaxed mb-10 font-medium">
                 {wisdomLeaf.chn}
              </div>

              {onSendToSpecimen && (
                 <button onClick={() => { onSendToSpecimen(wisdomLeaf.eng); closeResult(); }} className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 rounded-2xl text-white font-black tracking-widest uppercase text-sm shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3">
                    <span className="text-lg">📤</span> 分析並學習這句話
                 </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default WorldTreeView;
