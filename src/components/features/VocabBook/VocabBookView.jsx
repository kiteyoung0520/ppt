import React, { useState, useMemo } from 'react';
import { useGame } from '../../../context/GameContext';
import { toast } from '../../ui/Toast';

// ── Progress Bar ──────────────────────────────────────────────────
const ProgressBar = ({ current, total }) => (
  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
    <div
      className="h-2 bg-emerald-500 rounded-full transition-all duration-500"
      style={{ width: `${total > 0 ? (current / total) * 100 : 0}%` }}
    />
  </div>
);

// ── Flashcard ─────────────────────────────────────────────────────
const Flashcard = ({ word, onRemembered, onForgot, onSkip }) => {
  const [flipped, setFlipped] = useState(false);

  const speakWord = () => {
    if ('speechSynthesis' in window) {
      const langMap = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word.word);
      u.lang = langMap[word.langKey] || 'en-US';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  const daysUntilReview = Math.max(0, Math.ceil((word.nextReview - Date.now()) / 86400000));
  const isOverdue = word.nextReview <= Date.now();

  return (
    <div className="w-full flex flex-col gap-4 animate-popup-fade">
      {/* Card */}
      <div
        className={`w-full rounded-3xl shadow-lg border-2 cursor-pointer transition-all select-none ${flipped ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 bg-white'}`}
        onClick={() => { setFlipped(v => !v); if (!flipped) speakWord(); }}
        style={{ minHeight: 200 }}
      >
        {!flipped ? (
          // Front: word
          <div className="p-8 flex flex-col items-center justify-center h-full text-center gap-3 relative overflow-hidden">
            <div className="absolute top-4 space-x-1 animate-pulse-slow">
               <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
               <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
               <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            </div>
            <div className="text-xs text-stone-400 font-chn font-bold tracking-widest uppercase mt-4">注入靈氣以翻開卡片</div>
            <div className="text-4xl font-bold font-eng text-stone-800 leading-tight">{word.word}</div>
            <div className="text-stone-400 text-base font-mono">{word.pronunciation}</div>
            <button
              onClick={e => { e.stopPropagation(); speakWord(); }}
              className="mt-2 w-10 h-10 rounded-full bg-stone-100 hover:bg-emerald-100 flex items-center justify-center text-lg transition"
            >🔊</button>
          </div>
        ) : (
          // Back: meaning + example
          <div className="p-6 flex flex-col gap-3 h-full justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold font-eng text-emerald-800">{word.word}</div>
              <div className="text-stone-400 text-sm font-mono">{word.pronunciation}</div>
            </div>
            <div className="border-t border-stone-200 pt-3">
              <div className="text-xs font-bold text-stone-400 mb-1">意義</div>
              <div className="text-stone-800 font-bold text-base font-chn">{word.meaning}</div>
            </div>
            {word.exampleSentence && (
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <div className="text-xs font-bold text-stone-400 mb-1">例句</div>
                <div className="text-emerald-700 font-eng text-sm font-bold leading-snug">{word.exampleSentence}</div>
                <div className="text-stone-500 text-xs mt-1 font-chn">{word.exampleTranslation}</div>
              </div>
            )}
            <div className="text-xs text-stone-400 text-center font-chn">
              已複習 {word.reviewCount} 次 • 下次複習：{isOverdue ? '今天' : `${daysUntilReview} 天後`}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons — only show after flip */}
      {flipped && (
        <div className="flex gap-3 animate-slideUp">
          <button
            onClick={onForgot}
            className="flex-1 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-2xl transition active:scale-95 flex flex-col items-center gap-0.5"
          >
            <span className="text-xl">😓</span>
            <span className="text-xs">模糊</span>
            <span className="text-[10px] text-red-400">靈氣消散</span>
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-400 font-bold rounded-2xl transition active:scale-95 flex flex-col items-center gap-0.5"
          >
            <span className="text-xl">⏭️</span>
            <span className="text-xs">跳過</span>
          </button>
          <button
            onClick={onRemembered}
            className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-2xl transition active:scale-95 flex flex-col items-center gap-0.5 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-400/10 pointer-events-none hover:animate-pulse"></div>
            <span className="text-xl">🧠</span>
            <span className="text-xs">完全掌握！</span>
            <span className="text-[10px] text-emerald-500 font-black">+10 🌱 土壤精華</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── Word List Tab ─────────────────────────────────────────────────
const WordList = ({ words, onRemove }) => {
  const langFlag = { en: '🇺🇸', ja: '🇯🇵', ko: '🇰🇷' };
  if (words.length === 0) return (
    <div className="text-center text-stone-400 py-10 font-chn">
      <div className="text-4xl mb-3">📭</div>
      單字本是空的，先去閱讀或標本室學習吧！
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      {words.map((w, i) => {
        const isOverdue = w.nextReview <= Date.now();
        const daysLeft = Math.max(0, Math.ceil((w.nextReview - Date.now()) / 86400000));
        return (
          <div key={i} className="bg-white border border-stone-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
            <div className="text-base shrink-0">{langFlag[w.langKey] || '🌐'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold font-eng text-stone-800">{w.word}</span>
                <span className="text-xs text-stone-400 font-mono">{w.pronunciation}</span>
              </div>
              <div className="text-xs text-stone-500 font-chn truncate">{w.meaning}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-stone-100 text-stone-400'}`}>
                {isOverdue ? '待萃取' : `${daysLeft}天後`}
              </div>
              <div className="text-[10px] text-stone-300 mt-1">強度 Lv.{w.reviewCount}</div>
            </div>
            <button onClick={() => onRemove(w.word, w.langKey)} className="shrink-0 text-stone-300 hover:text-red-400 transition text-lg leading-none p-2">🗑</button>
          </div>
        );
      })}
    </div>
  );
};

// ── Main VocabBookView ────────────────────────────────────────────
const VocabBookView = () => {
  const { savedWords, updateWordReview, removeWord } = useGame();
  const [view, setView] = useState('review'); // 'review' | 'list'
  const [reviewIdx, setReviewIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStats, setSessionStats] = useState({ remembered: 0, forgot: 0 });

  // Words due for review (nextReview <= now)
  const dueWords = useMemo(() =>
    savedWords.filter(w => w.nextReview <= Date.now()),
    [savedWords]
  );

  const currentWord = dueWords[reviewIdx];

  const handleRemembered = () => {
    updateWordReview(currentWord.word, currentWord.langKey, true);
    setSessionStats(s => ({ ...s, remembered: s.remembered + 1 }));
    toast(`✨ 完美掌握！獲得 10點 土壤精華 🌱 用於喚醒世界樹。`);
    // Randomly award extra sunlight for motivation
    if(Math.random() > 0.7) toast(`🌟 額外驚喜：獲得 5點 日光精華☀️！`);
    advance();
  };
  
  const handleForgot = () => {
    updateWordReview(currentWord.word, currentWord.langKey, false);
    setSessionStats(s => ({ ...s, forgot: s.forgot + 1 }));
    toast(`💧 沒關係，語言的種子需要更多雨露澆灌。`);
    advance();
  };
  
  const handleSkip = () => advance();
  const advance = () => {
    if (reviewIdx + 1 >= dueWords.length) setSessionDone(true);
    else setReviewIdx(i => i + 1);
  };
  
  const restartSession = () => {
    setReviewIdx(0);
    setSessionDone(false);
    setSessionStats({ remembered: 0, forgot: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-[#fafaf9] rounded-2xl p-4 sm:p-6 shadow-inner">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-black text-stone-800 font-chn flex items-center gap-2">
            🌱 靈氣單字本
            {savedWords.length > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                {savedWords.length} Seeds
              </span>
            )}
          </h2>
          {dueWords.length > 0 && (
            <div className="text-xs text-orange-500 font-bold font-chn mt-1 animate-pulse">
              ⚠️ {dueWords.length} 顆單字種子等待靈氣淬鍊
            </div>
          )}
        </div>
        <div className="flex gap-1 bg-stone-200 rounded-full p-1 shadow-inner">
          <button onClick={() => setView('review')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'review' ? 'bg-white text-emerald-700 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}>
            ⚡ 靈氣淬鍊
          </button>
          <button onClick={() => setView('list')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-emerald-700 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}>
            📋 種子庫
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scroll pr-2">
        {view === 'review' ? (
          <div className="flex flex-col gap-4 h-full">
            {dueWords.length === 0 ? (
              <div className="text-center text-stone-400 py-16 font-chn flex flex-col items-center justify-center h-full">
                <div className="text-6xl mb-6">✨</div>
                <div className="font-black text-stone-700 text-xl mb-2">靈氣淬鍊全部完成！</div>
                <div className="text-sm font-medium">所有的語言種子都已吸飽養分</div>
                {savedWords.length > 0 && (
                  <div className="text-xs font-bold text-emerald-500 mt-6 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                    下一波淬鍊：{Math.min(...savedWords.map(w => w.nextReview)) > Date.now()
                      ? `${Math.ceil((Math.min(...savedWords.map(w => w.nextReview)) - Date.now()) / 86400000)} 天後`
                      : '即將展開'}
                  </div>
                )}
              </div>
            ) : sessionDone ? (
               <div className="flex flex-col items-center justify-center h-full py-10 font-chn animate-popup-fade">
                <div className="text-6xl mb-6 drop-shadow-lg">🏆</div>
                <div className="font-black text-stone-800 text-2xl mb-6">收穫滿滿的回憶！</div>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
                  <div className="bg-emerald-50 rounded-3xl p-6 text-center border-2 border-emerald-100">
                    <div className="text-4xl font-black text-emerald-600 mb-1">{sessionStats.remembered}</div>
                    <div className="text-[10px] font-bold text-emerald-600/60 tracking-widest uppercase">已萃取</div>
                  </div>
                  <div className="bg-red-50 rounded-3xl p-6 text-center border-2 border-red-100">
                    <div className="text-4xl font-black text-red-500 mb-1">{sessionStats.forgot}</div>
                    <div className="text-[10px] font-bold text-red-500/60 tracking-widest uppercase">需重溫</div>
                  </div>
                </div>
                
                <div className="text-stone-500 text-sm font-bold mb-8">
                   您共收集了 <span className="text-emerald-500">{sessionStats.remembered * 10}</span> 點土壤精華！
                </div>

                <button onClick={restartSession}
                  className="w-full max-w-xs py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full shadow-lg active:scale-95 transition-all uppercase tracking-widest text-sm">
                  再次淬鍊
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full max-w-md mx-auto w-full">
                <div className="flex items-center gap-4 mb-6">
                  <ProgressBar current={reviewIdx} total={dueWords.length} />
                  <span className="text-xs font-bold text-stone-400 shrink-0 uppercase tracking-widest">{reviewIdx} / {dueWords.length}</span>
                </div>
                <Flashcard
                  key={`${currentWord.word}-${reviewIdx}`}
                  word={currentWord}
                  onRemembered={handleRemembered}
                  onForgot={handleForgot}
                  onSkip={handleSkip}
                />
              </div>
            )}
          </div>
        ) : (
          <WordList words={savedWords} onRemove={removeWord} />
        )}
      </div>
    </div>
  );
};

export default VocabBookView;
