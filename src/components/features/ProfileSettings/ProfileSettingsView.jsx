import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { useSettings } from '../../../context/SettingsContext';
import { toast } from '../../ui/Toast';

const ProfileSettingsView = () => {
  const { currentUser, apiKey, updateApiKey } = useAuth();
  const { stats, streak, savedWords } = useGame();
  const { speechRate, setSpeechRate } = useSettings();

  const [inputKey, setInputKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Derived stats
  const totalEssence = (stats?.essence?.light || 0) + (stats?.essence?.rain || 0) + (stats?.essence?.soil || 0);
  const unlockedPlantsCount = Array.isArray(stats?.unlockedPlants) ? stats.unlockedPlants.length : 0;
  const totalPlants = NATIVE_PLANT_DB.length;

  // Title logic based on totalEssence
  let title = "初階尋語者";
  let titleColor = "text-stone-400";
  if (totalEssence >= 1000) { title = "世界樹的共鳴者"; titleColor = "text-emerald-400"; }
  else if (totalEssence >= 500) { title = "森之精靈"; titleColor = "text-teal-400"; }
  else if (totalEssence >= 200) { title = "綠葉行者"; titleColor = "text-green-400"; }

  const handleSaveKey = () => {
    if (!inputKey || inputKey.length < 10) {
      toast('請輸入有效的 Gemini API Key');
      return;
    }
    updateApiKey(inputKey);
    setIsEditingKey(false);
    toast('✅ API Key 已更新，將自動套用至所有 AI 功能！');
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 rounded-2xl overflow-y-auto custom-scroll shadow-inner border border-stone-200 p-4 sm:p-8 animate-fadeIn">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        
        {/* Section 1: Identity Card */}
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-3xl p-6 sm:p-8 shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center text-5xl sm:text-6xl shadow-lg border-4 border-[#0f172a] relative z-10">
            👤
          </div>
          
          <div className="mt-4 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white font-eng tracking-wide">{currentUser}</h2>
            <div className={`text-sm sm:text-base font-bold mt-1 tracking-widest font-chn ${titleColor}`}>
              ✦ {title} ✦
            </div>
          </div>
        </div>

        {/* Section 2: Achievements & Stats */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200">
          <div className="flex items-center gap-2 mb-6 border-b border-stone-100 pb-3">
            <span className="text-xl">📊</span>
            <h3 className="font-black text-stone-800 text-lg uppercase tracking-wider">生態探索紀錄</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1">🔥</span>
              <span className="text-2xl font-black text-orange-600">{streak}</span>
              <span className="text-[11px] text-orange-700/70 font-bold uppercase tracking-wider mt-1">目前連勝天數</span>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1">💧</span>
              <span className="text-2xl font-black text-blue-600">{totalEssence}</span>
              <span className="text-[11px] text-blue-700/70 font-bold uppercase tracking-wider mt-1">累積精華總量</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1">📚</span>
              <span className="text-2xl font-black text-emerald-600">{savedWords.length}</span>
              <span className="text-[11px] text-emerald-700/70 font-bold uppercase tracking-wider mt-1">單字收錄數</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl mb-1">🌸</span>
              <div className="text-2xl font-black text-amber-600 flex items-baseline gap-1">
                {unlockedPlantsCount} <span className="text-xs text-amber-600/50">/ {totalPlants}</span>
              </div>
              <span className="text-[11px] text-amber-700/70 font-bold uppercase tracking-wider mt-1">特有種圖鑑解鎖</span>
            </div>
          </div>
        </div>

        {/* Section 3: API & Preferences */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200">
          <div className="flex items-center gap-2 mb-6 border-b border-stone-100 pb-3">
            <span className="text-xl">⚙️</span>
            <h3 className="font-black text-stone-800 text-lg uppercase tracking-wider">系統核心設定</h3>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Gemini API Key</label>
            
            {!isEditingKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between">
                  <span className="font-mono text-stone-600 truncate">
                    {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••'}
                  </span>
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="text-stone-400 hover:text-emerald-500 transition px-2"
                    title={showKey ? "隱藏" : "顯示"}
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <button 
                  onClick={() => setIsEditingKey(true)}
                  className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-3 rounded-xl font-bold text-sm transition active:scale-95"
                >
                  ✏️ 修改
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-slideUp">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="請輸入新的 Gemini API Key..."
                  className="w-full bg-white border-2 border-emerald-400 rounded-xl p-3 text-stone-700 font-mono focus:outline-none focus:ring-4 focus:ring-emerald-400/20 shadow-sm"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsEditingKey(false); setInputKey(apiKey); setShowKey(false); }}
                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-xl transition"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveKey}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-[0_4px_15px_-3px_rgba(5,150,105,0.4)] transition active:scale-95 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
                  >
                    💾 儲存並套用
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 font-chn mt-1">儲存後將自動套用新的金鑰至所有 AI 串流。</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-stone-100">
            <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-1">語音朗讀速度 (Speech Rate)</label>
            <div className="flex flex-col gap-4 bg-stone-50 border border-stone-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm font-bold text-stone-600">
                <span>極慢</span>
                <span className="text-emerald-600 text-lg font-black">{speechRate.toFixed(1)}x</span>
                <span>極快</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.5" 
                step="0.1" 
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex gap-2 justify-center mt-2">
                <button onClick={() => setSpeechRate(0.8)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex-1 sm:flex-none ${speechRate === 0.8 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-100'}`}>🐢 0.8x</button>
                <button onClick={() => setSpeechRate(1.0)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex-1 sm:flex-none ${speechRate === 1.0 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-100'}`}>🚶 1.0x</button>
                <button onClick={() => setSpeechRate(1.2)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex-1 sm:flex-none ${speechRate === 1.2 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-100'}`}>⚡ 1.2x</button>
              </div>
            </div>
            <p className="text-[11px] text-stone-400 font-chn ml-1 mt-1 leading-relaxed">
              此設定將全域套用於：隨身口譯、閱讀室朗讀、單字發音及迴音谷對話。
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfileSettingsView;
