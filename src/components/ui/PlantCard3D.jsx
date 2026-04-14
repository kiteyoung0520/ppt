import React, { useState } from 'react';

const RARITY_STYLES = {
  'Starter': 'from-stone-100 to-stone-200 border-stone-300 text-stone-700',
  'N': 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
  'R': 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
  'SR': 'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
  'SSR': 'from-amber-50 to-orange-100 border-orange-300 text-orange-800 shadow-[0_0_20px_rgba(251,191,36,0.3)]',
};

const PlantCard3D = ({ plant, stats, isLocked = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const rarityStyle = RARITY_STYLES[plant.rarity] || RARITY_STYLES['N'];

  const progress = stats ? Math.min((stats.exp / plant.costToMax) * 100, 100) : 0;

  return (
    <div 
      className={`relative w-48 h-64 perspective-1000 cursor-pointer group select-none`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`
        relative w-full h-full transition-transform duration-500 transform-style-3d
        ${isFlipped ? 'rotate-y-180' : ''}
      `}>
        
        {/* --- FRONT SIDE --- */}
        <div className={`
          absolute inset-0 backface-hidden rounded-2xl border-2 p-4 flex flex-col items-center justify-between
          bg-gradient-to-br ${rarityStyle}
        `}>
          <div className="w-full flex justify-between items-center px-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {plant.rarity}
            </span>
            <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-stone-300' : 'bg-green-500 animate-pulse'}`} />
          </div>

          <div className={`text-6xl my-4 transition-transform duration-300 group-hover:scale-110 ${isLocked ? 'grayscale opacity-50' : ''}`}>
            {plant.emoji}
          </div>

          <div className="text-center">
            <h3 className="font-bold text-lg leading-tight">{plant.name}</h3>
            {isLocked ? (
              <p className="text-[10px] mt-1 opacity-50">尚未解鎖</p>
            ) : (
              <div className="mt-2 w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* --- BACK SIDE --- */}
        <div className={`
          absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 p-4 flex flex-col
          bg-stone-800 text-stone-100 border-stone-600
        `}>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-400 mb-2">🌿 植物誌</h4>
            <p className="text-[10px] leading-relaxed opacity-90 italic">
              「{plant.name}是台灣原生特有種，象徵著寶島堅毅的生命力...」
            </p>
            
            <div className="mt-4 space-y-2">
              <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                <p className="text-[9px] font-bold text-emerald-400 uppercase">特殊加成</p>
                <p className="text-[10px]">每次學習額外獲得 +1 陽光幣</p>
              </div>
            </div>
          </div>
          
          <div className="text-[9px] text-center opacity-40 border-t border-white/10 pt-2">
            點擊翻回正面
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlantCard3D;
