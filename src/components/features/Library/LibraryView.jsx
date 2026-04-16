import React, { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';

const LibraryView = ({ onOpenArticle }) => {
  const { userId, apiKey } = useAuth();
  const { savedArticles, fetchSavedArticles } = useGame();

  useEffect(() => {
    fetchSavedArticles(userId, apiKey);
  }, []);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getLangBadge = (lang) => {
    const map = { en: '🇺🇸 EN', ja: '🇯🇵 日', ko: '🇰🇷 韓' };
    return map[lang] || lang;
  };

  return (
    <div className="flex flex-col h-full bg-stone-900/40 rounded-3xl overflow-hidden border border-white/10 backdrop-blur-md animate-fadeIn p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🔖</div>
        <div>
          <h2 className="text-xl font-black text-white">語林轉錄庫</h2>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Saved Articles & Archives</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll pr-2">
        {savedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-30 gap-3 grayscale">
            <span className="text-6xl">📖</span>
            <p className="text-white font-black text-sm">轉錄庫目前是空的</p>
            <p className="text-white/50 text-xs text-center font-chn italic">在育苗室閱讀完文章後，點擊「收藏」按鈕即可將文章永久儲存於此。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
            {savedArticles.map((art) => (
              <button
                key={art.id}
                onClick={() => onOpenArticle(art.title, art.content, art.langKey)}
                className="group relative flex flex-col text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 rounded-2xl p-5 transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-tighter">
                    {getLangBadge(art.langKey)}
                  </span>
                  <span className="text-stone-500 text-[10px] font-bold">{formatDate(art.date)}</span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1 mb-2">
                  {art.title}
                </h3>
                <p className="text-white/50 text-xs leading-relaxed line-clamp-3 font-chn">
                  {art.content}
                </p>
                <div className="mt-4 flex items-center text-amber-500 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  點擊開啟沉浸式閱讀 ›
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;
