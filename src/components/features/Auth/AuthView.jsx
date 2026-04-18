import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import GlassPanel from '../../ui/GlassPanel';
import { toast } from '../../ui/Toast';
import Fireflies from '../../ui/Fireflies';

const AuthView = () => {
  const { login, apply, activate } = useAuth();
  const { setStats } = useGame();
  const [tab, setTab] = useState('login'); // 'login', 'apply', 'activate'
  const [loading, setLoading] = useState(false);

  // Form states
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // New for Application
  const [apiKey, setApiKey] = useState(''); // Gemini API Key (Activation)
  const [licenseKey, setLicenseKey] = useState(''); // Issued by admin (Activation)

  const handleLogin = async () => {
    if (!userId || !password) return toast("請輸入園丁帳號與密碼！", 3000);
    setLoading(true);
    try {
      const res = await login(userId, password);
      // useAuthStore login returns an object now
      if (res && res.needsActivation) {
        setTab('activate');
        toast("🛡️ 帳號核准通過！請輸入啟動金鑰以開通溫室。");
      } else {
        // 同步登入時抓到的雲端資產
        if (res.stats) {
          setStats(res.stats);
        }
        toast(`🌿 歡迎回到植物園, ${userId}`);
      }
    } catch (e) {
      toast("❌ " + e.message);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!userId || !password || !email) return toast("請填寫所有欄位！", 3000);
    
    const pwdRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!pwdRegex.test(password)) {
      return toast("❌ 密碼格式不符！請設定至少 8 碼，且必須同時包含英文字母與數字。");
    }

    setLoading(true);
    try {
      await apply(userId, password, email);
      toast("✨ 申請成功！啟動金鑰已寄送至您的信箱，請查收並進行啟動面板輸入。", 6000);
      setTab('login');
    } catch (e) {
      toast("❌ " + e.message);
    }
    setLoading(false);
  };

  const handleActivate = async () => {
    if (!userId || !licenseKey || !apiKey) return toast("請填寫帳號、啟動金鑰與 Gemini API Key！");
    setLoading(true);
    try {
      await activate(userId, licenseKey, apiKey);
      toast("🌟 帳號啟動成功！歡迎進入語林之境。");
    } catch (e) {
      toast("❌ " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-stone-900 bg-opacity-95 z-50 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-hidden">
      <Fireflies count={18} />
      
      {/* Breathing Center Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full breathing-glow blur-[60px] pointer-events-none" />
      <GlassPanel className="p-6 sm:p-8 max-w-sm w-full">
        <div className="flex justify-center mb-6 border-b border-stone-200">
          {tab !== 'activate' ? (
            <>
              <button 
                onClick={() => setTab('login')} 
                className={`w-1/2 pb-2 font-bold transition ${tab === 'login' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-stone-400 hover:text-orange-600 border-b-2 border-transparent'}`}
              >
                入園登入
              </button>
              <button 
                onClick={() => setTab('apply')} 
                className={`w-1/2 pb-2 font-bold transition ${tab === 'apply' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-stone-400 hover:text-orange-600 border-b-2 border-transparent'}`}
              >
                申請入園
              </button>
            </>
          ) : (
            <div className="w-full pb-2 text-center text-orange-600 font-bold border-b-2 border-orange-500 animate-pulse">
              🛡️ 帳號啟動中
            </div>
          )}
        </div>

        {tab === 'login' && (
          <div className="text-center animate-fadeIn">
            <h1 className="text-2xl font-bold text-white mb-2">🌿 歡迎回到植物園</h1>
            <p className="text-stone-400 text-xs mb-6 font-bold">請輸入園丁證件以同步溫室</p>
            <input 
              type="text" 
              value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-emerald-400 outline-none bg-black/40 text-white" 
              placeholder="園丁名稱 (帳號)" 
            />
            <input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 rounded-xl mb-6 text-sm focus:ring-2 focus:ring-emerald-400 outline-none bg-black/40 text-white" 
              placeholder="密碼" 
            />
            <button 
              onClick={handleLogin} disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md transition transform active:scale-95 border border-orange-600 disabled:opacity-75 disabled:active:scale-100"
            >
              {loading ? '身分核實中...' : '🚀 進入園區'}
            </button>
          </div>
        )}

        {tab === 'apply' && (
          <div className="text-center animate-fadeIn">
            <h1 className="text-2xl font-bold text-white mb-2">✨ 提出入園申請</h1>
            <p className="text-[11px] text-stone-400 mb-4 text-left leading-tight border-l-2 border-emerald-400 pl-2">申請後系統將「自動核准」，並立即將啟動金鑰寄送至您的信箱，請確保 Email 填寫正確。</p>
            <input 
              type="text" 
              value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 bg-black/40 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-emerald-400 outline-none text-white" 
              placeholder="想使用的園丁名稱" 
            />
            <input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 bg-black/40 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-emerald-400 outline-none text-white" 
              placeholder="設定登入密碼" 
            />
            <input 
              type="email" 
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 bg-black/40 rounded-xl mb-6 text-sm focus:ring-2 focus:ring-emerald-400 outline-none text-white" 
              placeholder="您的電子郵件 (接收金鑰用)" 
            />
            <button 
              onClick={handleApply} disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md transition transform active:scale-95 border border-orange-600 disabled:opacity-75"
            >
              {loading ? '申請傳送中...' : '📝 送出入園申請'}
            </button>
          </div>
        )}

        {tab === 'activate' && (
          <div className="text-center animate-fadeIn">
            <h1 className="text-2xl font-bold text-white mb-2">🔐 帳號啟動</h1>
            <p className="text-[11px] text-stone-400 mb-4 text-left leading-tight border-l-2 border-emerald-400 pl-2">請輸入帳號、Email 中的啟動金鑰與您的 Gemini API Key 以完成客製化溫室綁定。</p>
            <input 
              type="text" 
              value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 bg-black/40 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-emerald-400 outline-none text-white" 
              placeholder="園丁帳號" 
            />
            <input 
              type="text" 
              value={licenseKey} onChange={e => setLicenseKey(e.target.value)}
              className="w-full px-4 py-3 border-2 border-amber-400/50 bg-amber-400/10 rounded-xl mb-3 text-sm font-bold text-amber-200 outline-none" 
              placeholder="🔑 輸入 Email 收到的啟動金鑰" 
            />
            <input 
              type="password" 
              value={apiKey} onChange={e => setApiKey(e.target.value)}
              className="w-full px-4 py-3 border border-white/10 bg-black/40 rounded-xl mb-1 text-sm focus:ring-2 focus:ring-emerald-400 outline-none text-white" 
              placeholder="貼上您的 Gemini API Key" 
            />
            <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="block text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline mb-5 text-right font-bold transition">👉 免費申請 AI 金鑰</a>
            <button 
              onClick={handleActivate} disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md transition transform active:scale-95 border border-orange-600 disabled:opacity-75"
            >
              {loading ? '正在啟動溫室...' : '🌟 完成啟動並進入'}
            </button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default AuthView;
