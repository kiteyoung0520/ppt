import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { useSettings } from '../../../context/SettingsContext';
import { toast } from '../../ui/Toast';
import { callApi } from '../../../services/api';

const ProfileSettingsView = () => {
  const { currentUser, apiKey, updateApiKey } = useAuth();
  const { stats, streak, savedWords } = useGame();
  const { speechRate, setSpeechRate } = useSettings();

  const [inputKey, setInputKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  
  // 🌿 Fix 1: 意見回饋狀態
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackType, setFeedbackType] = useState('建議');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  React.useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoadingAnnouncements(true);
      try {
        const res = await callApi('getAnnouncements', {});
        if (res.status === 'success') setAnnouncements(res.data);
      } catch (e) {
        console.error("Failed to fetch announcements:", e);
      } finally {
        setLoadingAnnouncements(false);
      }
    };
    fetchAnnouncements();
  }, []);

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

  const handleSendFeedback = async () => {
    if (!feedbackContent.trim()) {
      toast('請輸入回饋內容');
      return;
    }
    setIsSendingFeedback(true);
    try {
      const res = await callApi('sendFeedback', { 
        userId: currentUser, 
        apiKey,
        type: feedbackType,
        content: feedbackContent 
      }, apiKey);
      if (res.status === 'success') {
        toast('✨ 您的意見已送達語林守護者！');
        setFeedbackContent('');
        setShowFeedbackForm(false);
      }
    } catch (e) {
      toast('傳送失敗：' + e.message);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 rounded-2xl overflow-y-auto custom-scroll shadow-inner border border-stone-200 p-4 sm:p-8 animate-fadeIn">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        
        {/* Section 0: System Announcement Board */}
        {announcements.length > 0 && (
          <div className="bg-white border-2 border-stone-200 rounded-3xl overflow-hidden shadow-sm animate-popup-fade">
            <div className="bg-stone-50 px-6 py-3 border-b-2 border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <span className="font-black text-stone-800 text-sm uppercase tracking-widest">系統佈告欄</span>
              </div>
              {loadingAnnouncements && <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
            </div>
            
            <div className="divide-y divide-stone-100">
              {announcements.map((ann, idx) => (
                <div key={idx} className="group">
                  <button 
                    onClick={() => setExpandedId(expandedId === idx ? null : idx)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-50/80 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm
                        ${ann.type.includes('重要') || ann.type.includes('緊急') || ann.type.includes('Hot')
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        {ann.type}
                      </span>
                      <h4 className="font-bold text-stone-700 text-sm sm:text-base group-hover:text-emerald-700 transition">{ann.title}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-stone-300 font-mono hidden sm:inline">{ann.date}</span>
                      <span className={`text-stone-300 transition-transform duration-300 ${expandedId === idx ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </button>
                  
                  {expandedId === idx && (
                    <div className="px-6 pb-6 pt-1 animate-slideUp text-sm text-stone-500 font-chn leading-relaxed border-t border-stone-50 bg-stone-50/30">
                      <div className="text-[10px] text-stone-300 mb-3 block sm:hidden">{ann.date}</div>
                      <div dangerouslySetInnerHTML={{ __html: ann.content }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

          <div className="flex flex-col gap-4">
            <label className="text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Gemini API Key</label>
            
            {!isEditingKey ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <span className="font-mono text-stone-600 text-sm truncate">
                    {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••'}
                  </span>
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="text-stone-400 hover:text-emerald-500 transition px-2 text-xl"
                    title={showKey ? "隱藏" : "顯示"}
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <button 
                  onClick={() => setIsEditingKey(true)}
                  className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-6 py-4 sm:py-3 rounded-2xl font-black text-sm transition active:scale-95 shadow-sm border border-emerald-200"
                >
                  ✏️ 修改設定
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-slideUp">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="請輸入新的 Gemini API Key..."
                  className="w-full bg-white border-2 border-emerald-400 rounded-2xl p-4 text-stone-700 font-mono focus:outline-none focus:ring-8 focus:ring-emerald-400/10 shadow-lg text-sm sm:text-base"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setIsEditingKey(false); setInputKey(apiKey); setShowKey(false); }}
                    className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-2xl transition active:scale-95 text-sm"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveKey}
                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl transition active:scale-95 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 text-sm"
                  >
                    💾 儲存並套用
                  </button>
                </div>
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

        {/* Section 4: Gardener's Mailbox */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200 mb-8">
          <div className="flex items-center justify-between mb-6 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📩</span>
              <h3 className="font-black text-stone-800 text-lg uppercase tracking-wider">語林信箱</h3>
            </div>
            {!showFeedbackForm && (
              <button 
                onClick={() => setShowFeedbackForm(true)}
                className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition"
              >
                寫信給管理員
              </button>
            )}
          </div>

          {!showFeedbackForm ? (
            <div className="text-center py-4">
              <p className="text-sm text-stone-400 font-chn leading-relaxed">
                對程式有任何建議或發現錯誤嗎？<br/>
                您的回饋是語林之境成長的養分。
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-slideUp">
              <div className="flex gap-2">
                {['建議', '錯誤', '問題', '其他'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFeedbackType(type)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition ${feedbackType === type ? 'bg-emerald-500 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              
              <textarea
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder="請描述您的想法或遇到的問題..."
                rows="4"
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-4 text-stone-700 font-chn focus:outline-none focus:ring-8 focus:ring-emerald-400/10 focus:border-emerald-400 transition text-sm leading-relaxed"
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFeedbackForm(false)}
                  disabled={isSendingFeedback}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-2xl transition active:scale-95 text-sm"
                >
                  取消
                </button>
                <button 
                  onClick={handleSendFeedback}
                  disabled={isSendingFeedback}
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {isSendingFeedback ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : '📮 送出回饋'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProfileSettingsView;
