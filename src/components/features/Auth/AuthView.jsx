import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import GlassPanel from '../../ui/GlassPanel';
import { toast } from '../../ui/Toast';
import Fireflies from '../../ui/Fireflies';

const AuthView = () => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);

  // Form states
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  const handleLogin = async () => {
    if (!userId || !password) return toast("請輸入園丁帳號與密碼！", 3000);
    setLoading(true);
    try {
      await login(userId, password);
      toast(`🌿 歡迎回到植物園, ${userId}`);
    } catch (e) {
      toast("❌ " + e.message);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!userId || !password || !apiKey || !licenseKey) return toast("請填寫所有欄位！", 3000);
    
    const pwdRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!pwdRegex.test(password)) {
      return toast("❌ 密碼格式不符！請設定至少 8 碼，且必須同時包含英文字母與數字。");
    }

    setLoading(true);
    try {
      await register(userId, password, apiKey, licenseKey);
      toast("✨ 園區開通成功！請直接登入。");
      setTab('login');
      // Keep credentials populated for quick login
    } catch (e) {
      toast("❌ " + e.message);
    }
    setLoading(false);
  };

  return (
  return (
    <div className="fixed inset-0 bg-stone-900 bg-opacity-95 z-50 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-hidden">
      <Fireflies count={18} />
      
      {/* Breathing Center Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full breathing-glow blur-[60px] pointer-events-none" />
      <GlassPanel className="p-6 sm:p-8 max-w-sm w-full">
        <div className="flex justify-center mb-6 border-b border-stone-200">
          <button 
            onClick={() => setTab('login')} 
            className={`w-1/2 pb-2 font-bold transition ${tab === 'login' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-stone-400 hover:text-orange-600 border-b-2 border-transparent'}`}
          >
            入園登入
          </button>
          <button 
            onClick={() => setTab('register')} 
            className={`w-1/2 pb-2 font-bold transition ${tab === 'register' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-stone-400 hover:text-orange-600 border-b-2 border-transparent'}`}
          >
            領取溫室
          </button>
        </div>

        {tab === 'login' && (
          <div className="text-center animate-fadeIn">
            <h1 className="text-2xl font-bold text-stone-800 mb-2">🌿 歡迎回到植物園</h1>
            <p className="text-stone-500 text-xs mb-6 font-bold">請輸入園丁證件以同步溫室</p>
            <input 
              type="text" 
              value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white/90 text-stone-800" 
              placeholder="園丁名稱 (帳號)" 
            />
            <input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl mb-6 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white/90 text-stone-800" 
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

        {tab === 'register' && (
          <div className="text-center animate-fadeIn">
            <h1 className="text-2xl font-bold text-stone-800 mb-2">✨ 開通專屬溫室</h1>
            <p className="text-[11px] text-stone-500 mb-4 text-left leading-tight border-l-2 border-orange-400 pl-2">請輸入您的產品啟動金鑰，並綁定專屬的 AI 種子 (API Key)。</p>
            <input 
              type="text" 
              value={licenseKey} onChange={e => setLicenseKey(e.target.value)}
              className="w-full px-4 py-3 border-2 border-amber-300 bg-amber-50 rounded-xl mb-4 text-sm font-bold text-amber-800 focus:ring-2 focus:ring-amber-500 outline-none placeholder-amber-700/50" 
              placeholder="🔑 貼上產品啟動金鑰 (License)" 
            />
            <input 
              type="text" 
              value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 bg-white/90 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none text-stone-800" 
              placeholder="自訂園丁名稱" 
            />
            <input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 bg-white/90 rounded-xl mb-1 text-sm focus:ring-2 focus:ring-orange-400 outline-none text-stone-800" 
              placeholder="設定密碼 (至少8碼英數混合)" 
            />
            <input 
              type="password" 
              value={apiKey} onChange={e => setApiKey(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 bg-white/90 rounded-xl mt-3 mb-1 text-sm focus:ring-2 focus:ring-orange-400 outline-none text-stone-800" 
              placeholder="貼上您的 Gemini API Key" 
            />
            <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="block text-[10px] text-orange-500 hover:text-orange-700 hover:underline mb-5 text-right font-bold transition">👉 免費申請 AI 金鑰</a>
            <button 
              onClick={handleRegister} disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md transition transform active:scale-95 border border-orange-600 disabled:opacity-75 disabled:active:scale-100"
            >
              {loading ? '驗證開通中...' : '📝 註冊並領取溫室'}
            </button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default AuthView;
