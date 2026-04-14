import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { toast } from '../../ui/Toast';

const NurseryView = ({ onStartReading }) => {
  const { currentLang } = useSettings();
  const { stats } = useGame();
  
  const currentPlantInfo = NATIVE_PLANT_DB.find(p => p.name === (stats?.currentPlant || '黃花風鈴木')) || NATIVE_PLANT_DB[0];
  
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('B1'); // A1, A2, B1, B2, C1

  const handleStart = () => {
    if (!topic.trim()) {
      return toast('請給予幼苗一個生長主題！');
    }
    
    // Construct the prompt for the streaming phase
    const prompt = `Write an engaging and educational short article about "${topic}" in ${currentLang.promptName}. 
The difficulty CEFR level should be ${level}. 
Output ONLY the article text. Do not use Markdown headings or formatting. Pure text separated by standard paragraphs.`;

    // Trigger Dashboard to render ReadingRoom
    onStartReading('🌱 育苗室', prompt);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 animate-popup-fade">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-stone-800 font-chn mb-2">種下一顆語文的種子</h2>
        <p className="text-stone-500 font-chn text-sm">輸入任何您感興趣的主題，一秒內即刻生成屬於您的專屬文章。</p>
      </div>

      <div className="w-full max-w-md bg-white/60 p-6 rounded-3xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] border border-stone-200">
        <div className="mb-4">
           <label className="block text-xs font-bold text-stone-500 mb-1 ml-1">文章主題 (Topic)</label>
           <input 
             type="text" 
             value={topic}
             onChange={e => setTopic(e.target.value)}
             placeholder="例：台灣夜市小吃、太空旅行..." 
             className="w-full p-4 rounded-2xl border-none ring-2 ring-transparent bg-white shadow-sm focus:ring-emerald-400 focus:outline-none transition-all text-stone-700" 
           />
        </div>

        <div className="mb-6">
           <label className="block text-xs font-bold text-stone-500 mb-1 ml-1">難度等級 (Level)</label>
           <div className="flex justify-between bg-stone-100 p-1.5 rounded-full">
             {['A1', 'A2', 'B1', 'B2', 'C1'].map(lvl => (
               <button
                 key={lvl}
                 onClick={() => setLevel(lvl)}
                 className={`flex-1 py-1.5 rounded-full text-sm font-bold transition-all ${level === lvl ? 'bg-emerald-500 text-white shadow-md' : 'text-stone-400 hover:text-stone-600'}`}
               >
                 {lvl}
               </button>
             ))}
           </div>
        </div>

        <button 
          onClick={handleStart}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-[0_5px_15px_-3px_rgba(5,150,105,0.4)] transition-transform active:scale-95 flex justify-center items-center gap-2 mb-4"
        >
           <span>🪄 開始培育文章</span>
        </button>

        {/* Current Guardian Trait */}
        <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-3 flex items-center gap-3 animate-fadeIn">
          <div className="text-2xl">{currentPlantInfo.emoji}</div>
          <div>
            <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">目前守護靈：{currentPlantInfo.trait}</div>
            <div className="text-xs text-stone-600 leading-tight">{currentPlantInfo.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseryView;
