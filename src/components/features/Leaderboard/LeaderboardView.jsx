import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { callApi } from '../../../services/api';
import { toast } from '../../ui/Toast';

const LeaderboardView = () => {
  const { apiKey } = useAuth();
  const { addEssence } = useGame();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState('streak'); // 'streak', 'essence', 'plants'
  const [cheered, setCheered] = useState(new Set());

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await callApi('getLeaderboard', {}, apiKey);
      if (res.status === 'success') {
        setData(res.data);
      }
    } catch (e) {
      toast("❌ 無法載入排行榜：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getSortedData = () => {
    if (!data || data.length === 0) return [];
    const sorted = [...data];
    if (activeTab === 'streak') sorted.sort((a, b) => b.streak - a.streak);
    if (activeTab === 'essence') sorted.sort((a, b) => b.essence - a.essence);
    if (activeTab === 'plants') sorted.sort((a, b) => b.plants - a.plants);
    return sorted.slice(0, 20);
  };

  const handleCheer = (name) => {
    if (cheered.has(name)) return;
    setCheered(prev => new Set(prev).add(name));
    addEssence('light', 2);
    toast(`✨ 你為 ${name} 送出了祝福！獲得 +2 日光精華`);
  };

  const tabs = [
    { key: 'streak',  label: '恆心榜', icon: '🔥', desc: '連勝天數' },
    { key: 'essence', label: '博學榜', icon: '✨', desc: '累積精華' },
    { key: 'plants',  label: '博物榜', icon: '🌳', desc: '植物數量' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-emerald-400 font-black text-sm animate-pulse tracking-widest">正在前往語林之巔...</p>
      </div>
    );
  }

  const list = getSortedData();

  return (
    <div className="flex flex-col h-full bg-stone-900/40 rounded-3xl overflow-hidden border border-white/10 backdrop-blur-md animate-fadeIn">
      {/* Header */}
      <div className="shrink-0 p-6 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🏆</div>
            <div>
              <h2 className="text-xl font-black text-white">語林英雄榜</h2>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Heroes of LinguaGarden</p>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/30 p-1 rounded-2xl gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${
                activeTab === tab.key ? 'bg-emerald-500 shadow-lg scale-105' : 'hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className={`text-[10px] font-black ${activeTab === tab.key ? 'text-white' : 'text-stone-500'}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scroll flex flex-col gap-2">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 gap-3 grayscale">
            <span className="text-6xl">🌫️</span>
            <p className="text-white font-black text-sm">目前還沒有尋語者登榜</p>
          </div>
        ) : list.map((player, idx) => {
          const isTop3 = idx < 3;
          const medals = ['🥇', '🥈', '🥉'];
          const colors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
          
          return (
            <div 
              key={idx} 
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${
                isTop3 ? 'bg-white/10 border-white/20 scale-[1.02] shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              {/* Rank */}
              <div className="shrink-0 w-8 flex justify-center font-black text-lg italic">
                {isTop3 ? (
                  <span className="drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">{medals[idx]}</span>
                ) : (
                  <span className="text-stone-600 group-hover:text-white transition-colors">{idx + 1}</span>
                )}
              </div>

              {/* Avatar placeholder */}
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gradient-to-br ${isTop3 ? 'from-emerald-400 to-teal-500 shadow-md' : 'from-stone-700 to-stone-800 opacity-50'}`}>
                {idx === 0 ? '👑' : '🌳'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className={`font-black truncate ${isTop3 ? 'text-white text-base' : 'text-stone-300 text-sm'}`}>{player.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                   <span className="text-[10px] font-bold text-stone-500">{tabs.find(t => t.key === activeTab).desc}:</span>
                   <span className={`text-xs font-black ${isTop3 ? 'text-emerald-400' : 'text-emerald-500/70'}`}>
                     {activeTab === 'streak' && `${player.streak} 天`}
                     {activeTab === 'essence' && `${player.essence} 點`}
                     {activeTab === 'plants' && `${player.plants} 種`}
                   </span>
                </div>
              </div>

              {/* Interaction: Cheer */}
              <button 
                onClick={() => handleCheer(player.name)}
                disabled={cheered.has(player.name)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  cheered.has(player.name) 
                    ? 'bg-emerald-500/20 text-emerald-500 scale-90' 
                    : 'bg-white/5 hover:bg-emerald-500/20 text-stone-500 hover:text-emerald-400 active:scale-95'
                }`}
                title="送出甘露祝福"
              >
                {cheered.has(player.name) ? '💧' : '🙏'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="shrink-0 p-4 bg-black/40 text-center">
        <p className="text-[10px] text-stone-500 font-bold font-chn">提示：每為一位玩家送出祝福，你將獲得少量日光精華回饋。</p>
      </div>
    </div>
  );
};

export default LeaderboardView;
