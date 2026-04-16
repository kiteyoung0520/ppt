import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { useAuth } from '../../../context/AuthContext';
import { callApi } from '../../../services/api';
import { toast } from '../../ui/Toast';
import PlantCard3D from '../../ui/PlantCard3D';

const GreenhouseModal = ({ isOpen, onClose }) => {
  const { stats, setStats } = useGame();
  const { currentUser, apiKey } = useAuth();
  
  const [gachaResult, setGachaResult] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleGacha = async () => {
    if (stats.coins < 100) {
      return toast("🌞 陽光幣不足！去育苗室或世界樹學習賺取把！");
    }

    setIsRolling(true);
    setGachaResult(null);

    // Simulated network/animation delay
    setTimeout(async () => {
      const pool = NATIVE_PLANT_DB.filter(p => p.rarity !== 'Starter');
      const rand = Math.random();
      let targetRarity = 'N';
      if (rand > 0.55 && rand <= 0.85) targetRarity = 'R';
      else if (rand > 0.85 && rand <= 0.97) targetRarity = 'SR';
      else if (rand > 0.97) targetRarity = 'SSR';

      const availableForRarity = pool.filter(p => p.rarity === targetRarity);
      const picked = availableForRarity[Math.floor(Math.random() * availableForRarity.length)];

      const currentUnlocked = Array.isArray(stats.unlockedPlants) ? stats.unlockedPlants : 
                (typeof stats.unlockedPlants === 'string' && stats.unlockedPlants !== '' ? stats.unlockedPlants.split(',') : []);

      let newUnlocked = [...currentUnlocked];
      let isDuplicate = newUnlocked.includes(picked.name);
      
      let newExp = stats.exp || 0;
      if (!isDuplicate) {
        newUnlocked.push(picked.name);
      } else {
        newExp += 50; // Duplicate compensation
      }

      const newCoins = stats.coins - 100;

      // 重要：只需更新本地 State，GameProvider 的守護程序會自動幫你備份到雲端對應欄位
      setStats({
        coins: newCoins,
        exp: newExp,
        unlockedPlants: newUnlocked
      });

      setGachaResult({
        plant: picked,
        isDuplicate
      });

      setIsRolling(false);
    }, 1500);
  };

  const currentUnlockedArr = Array.isArray(stats.unlockedPlants) ? stats.unlockedPlants : 
    (typeof stats.unlockedPlants === 'string' && stats.unlockedPlants !== '' ? stats.unlockedPlants.split(',') : []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🌸 溫室標本圖鑑與扭蛋機" maxWidth="max-w-[700px]">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left: Gacha Machine */}
        <div className="w-full md:w-1/3 bg-orange-50 border border-orange-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center">
           <div className="text-6xl mb-4 animate-shake">🎰</div>
           <h3 className="font-bold text-orange-800 mb-2 font-chn">祈願轉蛋機</h3>
           <p className="text-sm font-bold text-orange-600/80 mb-6">花費 100 🌞 抽取臺灣特有種植物</p>
           
           <button 
             onClick={handleGacha}
             disabled={isRolling || stats.coins < 100}
             className="w-full py-3 bg-gradient-to-b from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 font-bold text-white rounded-2xl shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
           >
             {isRolling ? '轉動中...' : '🎲 抽取 ( 100 🌞 )'}
           </button>

           {gachaResult && !isRolling && (
             <div className="mt-8 flex flex-col items-center animate-popup-fade">
                <div className="relative group">
                  {/* Outer Glow for rarity awareness */}
                  <div className={`absolute -inset-2 rounded-[2.5rem] blur-xl opacity-40 transition-all duration-1000 ${
                    gachaResult.plant.rarity === 'SSR' ? 'bg-orange-400 opacity-60' : 
                    gachaResult.plant.rarity === 'SR' ? 'bg-purple-400' : 'bg-transparent'
                  }`} />
                  
                  <PlantCard3D 
                    plant={gachaResult.plant} 
                    stats={{ exp: 0 }} 
                    isLocked={false} 
                  />
                </div>

                <div className="mt-6 text-center">
                  {gachaResult.isDuplicate ? (
                    <div className="bg-orange-100 text-orange-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                      Duplicate → +50 EXP 🌱
                    </div>
                  ) : (
                    <div className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter animate-bounce">
                      New Discovery! 🎉
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-stone-400 font-bold">點擊卡片查看詳情</p>
                </div>
             </div>
           )}
        </div>

        {/* Right: Plant Collection */}
        <div className="w-full md:w-2/3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-stone-800 font-chn items-center flex gap-2">
               <span className="text-xl">🌿</span> 我的圖鑑收藏
             </h3>
             <span className="text-xs font-bold bg-stone-100 text-stone-500 px-3 py-1 rounded-full border border-stone-200">
               進度：{currentUnlockedArr.length} / {NATIVE_PLANT_DB.length}
             </span>
          </div>

          <div className="bg-stone-100/50 rounded-2xl border border-stone-200 p-4 grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto custom-scroll">
            {NATIVE_PLANT_DB.map((p, idx) => {
              const isUnlocked = currentUnlockedArr.includes(p.name) || p.rarity === 'Starter';
              
              const rarityBadgeStyle = 
                p.rarity === 'SSR' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                p.rarity === 'SR' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                p.rarity === 'R' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                'bg-stone-200 text-stone-600 border-stone-300';

              return (
                <div 
                  key={idx} 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isUnlocked ? 'bg-white border-emerald-200 shadow-sm hover:scale-105' : 'bg-stone-100/50 border-stone-200 opacity-60 grayscale'}`}
                >
                  <div className="text-3xl mb-1">{isUnlocked ? p.emoji : '❓'}</div>
                  <div className="text-xs font-bold text-center text-stone-700 truncate w-full">{isUnlocked ? p.name : '未知種子'}</div>
                  <div className={`text-[9px] font-bold mt-1 px-1.5 rounded-sm border ${isUnlocked ? rarityBadgeStyle : 'bg-stone-200 text-transparent border-transparent'}`}>
                    {p.rarity}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default GreenhouseModal;
