import React, { useState } from 'react';
import { streamGeminiChat } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { toast } from '../../ui/Toast';
import ReadingRoom from '../ReadingRoom/ReadingRoom';

const SpecimenRoomView = ({ initialText = '' }) => {
  const { apiKey } = useAuth();
  const { targetLangKey } = useSettings();

  const [pasteValue, setPasteValue] = useState(initialText);
  const [submittedText, setSubmittedText] = useState(initialText || null);

  // If initialText changes (sent from WorldTree), update
  React.useEffect(() => {
    if (initialText) {
      setPasteValue(initialText);
      setSubmittedText(initialText);
    }
  }, [initialText]);

  const handleSubmit = () => {
    const trimmed = pasteValue.trim();
    if (!trimmed || trimmed.length < 10) {
      toast('請貼上至少10個字元的文章！');
      return;
    }
    setSubmittedText(trimmed);
  };

  // ReadingRoom with pasted content (no streaming)
  if (submittedText) {
    return (
      <ReadingRoom
        taskTitle="🔬 標本室深度分析"
        pastedContent={submittedText}
        targetLangKey={targetLangKey}
        onClose={() => {
          setSubmittedText(null);
          setPasteValue('');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full p-2 animate-popup-fade">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔬</div>
        <h2 className="text-2xl font-bold text-stone-800 font-chn">標本室</h2>
        <p className="text-stone-500 text-sm mt-1 font-chn">
          貼上任何外文文章，進行點字查詢、句子文法・語意・用法深度解析
        </p>
      </div>

      {/* Paste Area */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <textarea
          value={pasteValue}
          onChange={e => setPasteValue(e.target.value)}
          placeholder={`在此貼上外文文章（英文、日文、韓文均可）...\n\nExample: The cherry blossoms in Japan bloom beautifully every spring, drawing millions of tourists from around the world.`}
          className="flex-1 w-full bg-white border-2 border-stone-200 focus:border-emerald-400 rounded-2xl p-5 text-base font-eng leading-relaxed resize-none outline-none transition custom-scroll text-stone-700 shadow-sm min-h-[250px]"
        />

        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-stone-400 font-chn">
            {pasteValue.length > 0 ? `已輸入 ${pasteValue.length} 個字元` : '支援英文、日文、韓文文章'}
          </div>
          <div className="flex gap-2">
            {pasteValue.length > 0 && (
              <button
                onClick={() => setPasteValue('')}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-sm rounded-2xl transition active:scale-95"
              >
                清除
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={pasteValue.trim().length < 10}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold text-sm rounded-2xl shadow-sm transition active:scale-95"
            >
              🔬 開始深度學習
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 shrink-0">
        <div className="text-xs font-bold text-amber-600 mb-2">💡 標本室功能提示</div>
        <ul className="text-xs text-stone-500 font-chn space-y-1">
          <li>• <strong>點擊單字</strong>：顯示音標、詞性、中文意義與例句</li>
          <li>• <strong>選取句子</strong>：AI 進行文法・語意・用法三合一深度解析</li>
          <li>• <strong>🔊 朗讀全文</strong>：一鍵聆聽文章發音</li>
          <li>• <strong>全文翻譯</strong>：AI 自動提供繁體中文對照翻譯</li>
        </ul>
      </div>
    </div>
  );
};

export default SpecimenRoomView;
