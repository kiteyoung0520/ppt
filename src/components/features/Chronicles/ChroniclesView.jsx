import React from 'react';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';

const ChroniclesView = () => {
  const { stats } = useGame();
  const unlockedArr = Array.isArray(stats.unlockedPlants) ? stats.unlockedPlants : [];
  
  // Progress Milestones
  const totalPlants = NATIVE_PLANT_DB.length;
  const unlockedCount = unlockedArr.length;
  const progressPercent = Math.round((unlockedCount / totalPlants) * 100);

  // Group plants by region for the scroll
  const regions = [...new Set(NATIVE_PLANT_DB.map(p => p.region))];

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* ── Scroll Header ────────────────────────────────────────── */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white font-chn drop-shadow-lg mb-2">📜 福爾摩沙：傳奇長卷</h2>
        <div className="flex items-center justify-center gap-4">
           <div className="h-[2px] w-12 bg-gradient-to-l from-emerald-500 to-transparent"></div>
           <span className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em]">
             Progress: {unlockedCount} / {totalPlants} 解鎖
           </span>
           <div className="h-[2px] w-12 bg-gradient-to-r from-emerald-500 to-transparent"></div>
        </div>
      </div>

      {/* ── The Grand Scroll Canvas ──────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-x-auto no-scrollbar py-4">
        <div className="inline-flex h-full min-w-full gap-8 px-8">
          
          {/* Milestone 1: The Coastal Entry */}
          <ScrollSection 
            title="熱帶海岸" 
            isActive={unlockedCount >= 2} 
            description="當第一枚種子在砂礫中發芽，這份古卷便開啟了與大海的連結。"
            color="from-cyan-900/40 to-blue-900/40"
            plants={NATIVE_PLANT_DB.filter(p => p.region === '墾丁海岸')}
            unlockedNames={unlockedArr}
          />

          {/* Milestone 2: Lowland Woods */}
          <ScrollSection 
            title="低海拔林地" 
            isActive={unlockedCount >= 5} 
            description="茂密的綠意湧入卷軸，古老的肖楠與櫻花開始在畫中低喃。"
            color="from-emerald-900/40 to-teal-900/40"
            plants={NATIVE_PLANT_DB.filter(p => p.region === '低海拔山區' || p.region === '城市公園')}
            unlockedNames={unlockedArr}
          />

          {/* Milestone 3: Misty Heights */}
          <ScrollSection 
            title="雲霧之巔" 
            isActive={unlockedCount >= 9} 
            description="唯有攀登至最高處，方能見證百合與紅檜在雲海中的壯麗身影。"
            color="from-indigo-900/40 to-purple-900/40"
            plants={NATIVE_PLANT_DB.filter(p => p.region === '中央山脈' || p.region === '阿里山深處')}
            unlockedNames={unlockedArr}
          />

          {/* Final: Complete Formosa */}
          <div className={`
            shrink-0 w-80 rounded-[3rem] p-8 border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-1000
            ${unlockedCount >= totalPlants 
              ? 'bg-amber-400 border-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-105' 
              : 'bg-black/20 border-white/5 opacity-50'}
          `}>
             <div className="text-6xl mb-6">{unlockedCount >= totalPlants ? '🏆' : '🔒'}</div>
             <h3 className={`text-xl font-black font-chn ${unlockedCount >= totalPlants ? 'text-stone-900' : 'text-white'}`}>
                終極守護之光
             </h3>
             <p className={`text-xs mt-4 leading-relaxed ${unlockedCount >= totalPlants ? 'text-stone-800 font-bold' : 'text-stone-500'}`}>
                收集 11 種守護靈，觸發語林聖光，覺醒福爾摩沙終極長卷。
             </p>
          </div>
        </div>
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────── */}
      <div className="mt-8 px-4 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
         <div 
           className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-1000"
           style={{ width: `${progressPercent}%` }}
         ></div>
      </div>
    </div>
  );
};

const ScrollSection = ({ title, isActive, description, color, plants, unlockedNames }) => {
  return (
    <div className={`
      shrink-0 w-80 sm:w-96 rounded-[3rem] p-8 border border-white/10 flex flex-col relative transition-all duration-700 overflow-hidden
      bg-gradient-to-br ${isActive ? color : 'from-stone-900/80 to-stone-900/80'}
      ${!isActive && 'grayscale opacity-40'}
    `}>
      {/* Visual Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      
      <div className="relative mb-auto">
        <div className="text-[10px] font-black tracking-widest text-emerald-400 uppercase mb-2">Region Fragment</div>
        <h3 className="text-3xl font-black text-white font-chn mb-4">{title}</h3>
        <p className="text-xs text-emerald-100/70 leading-relaxed font-chn">
          {description}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
         {plants.map(p => (
           <div 
             key={p.name} 
             className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all shadow-md ${
               unlockedNames.includes(p.name) || p.rarity === 'Starter'
               ? 'bg-white/20 border border-white/20' 
               : 'bg-black/30 border border-white/5 grayscale opacity-30 text-transparent'
             }`}
             title={p.name}
           >
             {unlockedNames.includes(p.name) || p.rarity === 'Starter' ? p.emoji : '?'}
           </div>
         ))}
      </div>

      {!isActive && (
        <div className="mt-6 flex items-center gap-2">
           <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px]">🔒</div>
           <span className="text-[10px] text-stone-500 font-bold uppercase">Unlock more plants in this region</span>
        </div>
      )}
    </div>
  );
};

export default ChroniclesView;
