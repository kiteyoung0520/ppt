import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { useSettings } from '../../../context/SettingsContext';
import { toast } from '../../ui/Toast';

const ProfileSettingsView = () => {
    const { currentUser, apiKey, apply } = useAuth(); // We'll re-use 'apply' logic or similar to update, but AuthStore handles persistence
    const { stats, setStats } = useGame();
    const { speechRate, setSpeechRate } = useSettings();
    
    // AuthStore doesn't have a direct 'updateApiKey' but we can modify the store directly if needed
    // However, we'll implement a clean local state and then commit
    const [newName, setNewName] = useState(stats.username || currentUser);
    const [newKey, setNewKey] = useState(apiKey || '');
    const [localRate, setLocalRate] = useState(speechRate);

    const handleSave = () => {
        // 1. Update GameStats (Username)
        setStats({ username: newName });
        
        // 2. Update Settings (Speech Rate)
        setSpeechRate(localRate);
        
        // 3. Update Auth (API Key) - Need to handle this carefully
        // For now, we update the localStorage directly and alert user to refresh or we could expose an action in useAuthStore
        localStorage.setItem('flg-auth-storage', JSON.stringify({
           state: { currentUser, apiKey: newKey, deviceId: localStorage.getItem('lg_dev_id') }
        }));
        
        toast("✨ 林間設定已保存！備妥金鑰，靈魂引擎即將重啟。");
        setTimeout(() => window.location.reload(), 1500); // Reload to ensure all contexts pick up the new key
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-xl animate-popup-fade mt-4">
            <div className="text-center mb-8">
                <div className="text-5xl mb-3">⚙️</div>
                <h2 className="text-2xl font-black text-white font-chn">林間設定</h2>
                <p className="text-stone-400 text-sm mt-1 font-chn">微調您的守護靈偏好與核心數據</p>
            </div>

            <div className="space-y-8">
                {/* Gardener Profile */}
                <div className="space-y-4">
                    <label className="text-xs font-black text-emerald-400 uppercase tracking-widest pl-2">👤 園丁代號</label>
                    <input 
                        type="text" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-black/20 border-2 border-white/5 focus:border-emerald-500 rounded-2xl p-4 text-white font-bold transition outline-none"
                    />
                </div>

                {/* API Key Recover */}
                <div className="space-y-4">
                    <label className="text-xs font-black text-blue-400 uppercase tracking-widest pl-2">🔑 Gemini API Key (靈魂金鑰)</label>
                    <input 
                        type="password" 
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="在此貼上您的金鑰..."
                        className="w-full bg-black/20 border-2 border-white/5 focus:border-blue-500 rounded-2xl p-4 text-white font-mono text-sm transition outline-none"
                    />
                    <p className="text-[10px] text-stone-500 italic pl-2 leading-relaxed">
                        注意：更換金鑰後系統將自動重啟以確保連線安全。
                    </p>
                </div>

                {/* Speech Rate Slider */}
                <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-xs font-black text-orange-400 uppercase tracking-widest">🔊 AI 語播速度</label>
                       <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black tracking-tighter">{localRate.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="1.5" 
                        step="0.1"
                        value={localRate}
                        onChange={(e) => setLocalRate(parseFloat(e.target.value))}
                        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-[10px] text-stone-500 font-bold px-1">
                        <span>慢 (0.5x)</span>
                        <span>正常</span>
                        <span>快 (1.5x)</span>
                    </div>
                </div>

                <button 
                   onClick={handleSave}
                   className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-900/40 transition-all active:scale-95 text-lg"
                >
                    💾 保存設定並重啟內容
                </button>
            </div>
        </div>
    );
};

export default ProfileSettingsView;
