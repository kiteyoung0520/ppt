import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { callApi } from '../../../services/api';
import { toast } from '../../ui/Toast';

// ── World Tree growth tiers based on unlocked plant count ──────────
const TREE_TIERS = [
  { min: 0,  emoji: '🌱', label: '幼苗之芽', glow: 'rgba(52,211,153,0.15)', aura: 'from-emerald-900/20', size: 'text-[80px]',  desc: '語林的種子剛剛萌芽...' },
  { min: 2,  emoji: '🌿', label: '綠意初現', glow: 'rgba(52,211,153,0.25)', aura: 'from-teal-800/30',    size: 'text-[100px]', desc: '枝葉開始向光伸展' },
  { min: 4,  emoji: '🌳', label: '茁壯大樹', glow: 'rgba(52,211,153,0.35)', aura: 'from-emerald-700/30', size: 'text-[120px]', desc: '根深葉茂，吸引神靈聚集' },
  { min: 6,  emoji: '🌲', label: '古老森林', glow: 'rgba(16,185,129,0.45)', aura: 'from-emerald-600/40', size: 'text-[140px]', desc: '千年古林，充滿神秘能量' },
  { min: 9,  emoji: '🌲', label: '神木覺醒', glow: 'rgba(16,185,129,0.6)',  aura: 'from-amber-800/30',   size: 'text-[160px]', desc: '神木已覺醒，福爾摩沙的守護之光' },
  { min: 11, emoji: '🌟', label: '語林聖樹', glow: 'rgba(251,191,36,0.7)',  aura: 'from-amber-500/40',   size: 'text-[180px]', desc: '✨ 傳說達成！語林守護者• 福爾摩沙之章' },
];

const Firefly = ({ style }) => (
  <div 
    className="firefly animate-firefly-pulse absolute"
    style={{
      ...style,
      '--dur': `${2 + Math.random() * 3}s`,
    }}
  >
    <div 
      className="animate-firefly-move w-full h-full"
      style={{ '--move-dur': `${8 + Math.random() * 8}s` }}
    />
  </div>
);

const WorldTreeView = ({ onSendToSpecimen }) => {
  const { currentLang } = useSettings();
  const { apiKey } = useAuth();
  const { stats, addEssence, setStats } = useGame();
  
  const [wisdomLeaf, setWisdomLeaf] = useState(null);
  const [activeReward, setActiveReward] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate fixed firefly positions 
  const [fireflies] = useState(() => Array.from({ length: 14 }).map((_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
  })));

  // Calculate tree tier
  const unlockedCount = Array.isArray(stats?.unlockedPlants) ? stats.unlockedPlants.length : 0;
  const tier = [...TREE_TIERS].reverse().find(t => unlockedCount >= t.min) || TREE_TIERS[0];
  const isMaxTier = unlockedCount >= 11;

  const interactWithTree = async () => {
    if (isLoading) return;
    
    const isReward = Math.random() < 0.3;

    if (isReward) {
      const rewards = [
        { msg: '微風輕拂，世界樹的枝葉散落了閃耀的日光！', type: 'light', amount: 30, icon: '☀️', name: '陽光洗禮' },
        { msg: '一陣清雨拂過，洗滌了心靈，感覺神清氣爽！', type: 'rain', amount: 30, icon: '💧', name: '春雨恩典' },
        { msg: '你感受到深層大地的共鳴，獲取了厚實的養分！', type: 'soil', amount: 30, icon: '🌱', name: '大地脈動' },
      ];
      // Max tier gets bonus rewards
      const r = rewards[Math.floor(Math.random() * rewards.length)];
      const bonus = isMaxTier ? 2 : 1;
      addEssence(r.type, r.amount * bonus);
      setStats({ coins: (stats?.coins || 0) + (isMaxTier ? 30 : 15) });
      setActiveReward({ ...r, amount: r.amount * bonus, isMaxBonus: isMaxTier });
      setWisdomLeaf(null);
    } else {
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
      
      {/* Dynamic Background Aura based on tier */}
      <div className={`absolute inset-0 bg-gradient-to-b ${tier.aura} to-transparent pointer-events-none transition-all duration-2000`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.05)_0%,_transparent_70%)] pointer-events-none" />

      {/* Breathing Background Glow */}
      <div 
        className="absolute w-[300px] h-[300px] rounded-full breathing-glow transition-all duration-1000"
        style={{ 
          background: tier.glow.replace('0.7', '0.2').replace('0.6', '0.15').replace('0.45', '0.1'),
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0
        }} 
      />

      {/* Fireflies Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {fireflies.map((f, i) => (
          <Firefly key={i} style={{ top: f.top, left: f.left, animationDelay: f.delay }} />
        ))}
      </div>

      {/* Tree Tier Badge */}
      <div className="absolute top-4 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none z-20">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-full border border-white/10 backdrop-blur-sm">
          <div className="flex gap-1">
            {TREE_TIERS.slice(0,5).map((t, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${unlockedCount > i*2 ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-white/10'}`} />
            ))}
          </div>
          <span className={`text-xs font-black tracking-widest ${isMaxTier ? 'text-amber-400' : 'text-emerald-400'}`}>
            {tier.label}
          </span>
          <span className="text-[10px] text-white/30 font-bold">{unlockedCount}/11</span>
        </div>
        {isMaxTier && (
          <div className="text-[10px] text-amber-400/80 font-black uppercase tracking-widest animate-pulse">
            ✦ 傳說等級達成 ✦
          </div>
        )}
      </div>

      {/* Main Tree Interaction Area */}
      <div 
        onClick={interactWithTree}
        className={`relative z-10 flex flex-col items-center justify-center cursor-pointer group transition-all duration-700 ${isLoading ? 'scale-95 opacity-80' : 'hover:scale-105'}`}
      >
        {/* Tree Emoji - changes with tier */}
        <div
          className={`${tier.size} drop-shadow-[0_0_80px_rgba(16,185,129,0.4)] transition-all duration-1000 group-hover:-translate-y-4 ${isMaxTier ? 'animate-bounce' : 'animate-pulse-slow'}`}
          style={{ filter: `drop-shadow(0 0 30px ${tier.glow})` }}
        >
          {tier.emoji}
        </div>

        {/* Tier description */}
        <div className="text-center mt-6 mb-3">
          <p className="text-xs text-emerald-400/60 font-chn">{tier.desc}</p>
        </div>

        {/* Commune Button */}
        <div className={`px-8 py-4 rounded-full border bg-emerald-950/40 font-bold tracking-widest uppercase text-sm shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:bg-emerald-900/60 transition-all flex items-center gap-3 active:scale-95 ${isMaxTier ? 'border-amber-500/40 text-amber-400' : 'border-emerald-500/20 text-emerald-400'}`}>
          {isLoading ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>與樹靈共鳴中...</span>
            </>
          ) : (
            <>
              <span>{isMaxTier ? '🌟' : '✨'}</span>
              <span>{isMaxTier ? '召喚聖樹祝福' : '點擊與世界樹共鳴'}</span>
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
            <div className="text-[10px] font-black tracking-widest text-emerald-500 uppercase mb-2">{activeReward.isMaxBonus ? '✦ 聖樹傳說祝福 ✦' : 'Mystic Blessing'}</div>
            <h3 className="text-2xl font-black text-white mb-2">{activeReward.name}</h3>
            {activeReward.isMaxBonus && <div className="text-amber-400 text-xs font-bold mb-2">⚡ 神木加倍加乘！</div>}
            <p className="text-stone-400 text-sm mb-4 leading-relaxed font-medium px-2">{activeReward.msg}</p>
            <div className="text-2xl font-black text-emerald-400 mb-6">+{activeReward.amount} 精華</div>
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
