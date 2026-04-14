import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { callApi } from '../../../services/api';
import { toast } from '../../ui/Toast';

const WorldTreeView = ({ onSendToSpecimen }) => {
  const { currentLang } = useSettings();
  const { apiKey } = useAuth();
  
  const [content, setContent] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  const scrollRef = useRef(null);

  const handleGenerate = async () => {
    if (isFetching) return;
    setContent(null);
    setHasStarted(true);
    setIsFetching(true);
    
    try {
      const res = await callApi('getRandomQuote', {}, apiKey, currentLang.key);
      if (res.status === 'success' && res.data) {
        setContent(res.data);
      } else {
        throw new Error(res.message || "未能獲取智慧小語");
      }
    } catch (err) {
      toast("串接失敗：" + err.message);
      setHasStarted(false);
    } finally {
      setIsFetching(false);
    }
  };

  const renderContent = () => {
    if (!content) return null;

    return (
      <div className="flex flex-col gap-6 items-center text-center justify-center min-h-[50%] animate-popup-fade px-4 py-8">
        <div className="text-[40px] text-emerald-200 opacity-50 mb-2 leading-none">❝</div>
        <div className="font-eng leading-loose text-2xl text-emerald-950 font-bold whitespace-pre-wrap">
          {content.eng}
        </div>
        <div className="text-sm font-eng text-stone-400 italic mb-4">
          — {content.author} —
        </div>
        <div className="border-t-2 border-dashed border-stone-300 pt-6 mt-2 font-chn leading-relaxed text-lg text-stone-700 whitespace-pre-wrap w-full">
          {content.chn}
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-col h-full w-full relative">
      {!hasStarted ? (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-popup-fade">
          <div className="text-[64px] mb-4">🌍</div>
          <h2 className="text-2xl font-bold text-emerald-800 font-chn mb-2">探索世界樹</h2>
          <p className="text-stone-500 font-chn text-sm text-center max-w-sm mb-8">
             世界樹會隨機為您摘取一篇來自全球各地的奇聞軼事。
             文章將會直接以「上方 {currentLang.name}、下方繁體中文」的方式為您呈現。
          </p>
          <button 
            onClick={handleGenerate}
            className="w-full max-w-xs py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-[0_5px_15px_-3px_rgba(5,150,105,0.4)] transition-transform active:scale-95"
          >
             🌿 搖動世界樹
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden p-2 sm:p-4 animate-fadeIn">
          <div className="flex justify-between items-center mb-4 shrink-0 px-2">
            <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
              🌍 世界樹的落葉 
              {isFetching && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full animate-pulse border border-orange-200">獲取中...</span>}
            </h2>
            <div className="flex items-center gap-2">
              {!isFetching && content?.eng && onSendToSpecimen && (
                <button
                  onClick={() => {
                    onSendToSpecimen(content.eng);
                  }}
                  className="text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1 rounded-full transition flex items-center gap-1"
                  title="傳送外文內容到標本室"
                >
                  📤 傳至標本室
                </button>
              )}
              <button 
                onClick={() => { setContent(null); setHasStarted(false); }}
                className="text-sm font-bold text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded-full transition"
              >
                返回
              </button>
            </div>
          </div>
          
          <div 
             ref={scrollRef} 
             className="flex-1 bg-white/70 backdrop-blur-sm rounded-2xl shadow-inner border border-stone-200 p-4 sm:p-6 overflow-y-auto custom-scroll"
          >
             {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldTreeView;
