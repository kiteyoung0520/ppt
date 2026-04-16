import React, { useState, useEffect, useRef } from 'react';
import { streamGeminiChat, safeParseJSON } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { toast } from '../../ui/Toast';

// ── Clickable Text Engine ──────────────────────────────────────────
const ClickableText = ({ text, langCode, onWordClick }) => {
  const segmenter = React.useMemo(() => {
    try { return new Intl.Segmenter(langCode, { granularity: 'word' }); }
    catch (e) { return null; }
  }, [langCode]);

  const blocks = text.split(/([^\p{L}\p{N}']+)/u);

  return (
    <>
      {blocks.map((block, idx) => {
        if (!block || /^[^\p{L}\p{N}']+$/u.test(block)) return <span key={idx}>{block}</span>;

        if (segmenter && block.length > 0) {
          const segments = Array.from(segmenter.segment(block));
          if (segments.length > 1 || segments[0].isWordLike) {
            return segments.map((seg, sIdx) => {
              if (seg.isWordLike) {
                return (
                  <span key={`${idx}-${sIdx}`} className="clickable-word" onClick={() => onWordClick(seg.segment)}>
                    {seg.segment}
                  </span>
                );
              }
              return <span key={`${idx}-${sIdx}`}>{seg.segment}</span>;
            });
          }
        }

        return (
          <span key={idx} className="clickable-word" onClick={() => onWordClick(block)}>
            {block}
          </span>
        );
      })}
    </>
  );
};

// ── Word / Sentence Analysis Card ─────────────────────────────────
// `word` can be a single word OR a selected sentence
const WordCard = ({ word, langCode, speechCode, apiKey, articleContent, targetLangKey, onClose }) => {
  const isSentence = word.trim().split(/\s+/).length > 3;
  const { saveWord, addEssence } = useGame();
  const [info, setInfo] = useState(null);
  const [saved, setSaved] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(!isSentence);
  const [loadingDeep, setLoadingDeep] = useState(false);
  const [showDeep, setShowDeep] = useState(false);

  const speakText = (text, code) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = code || speechCode;
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  useEffect(() => {
    speakText(word);
    if (isSentence) {
      setLoadingInfo(false);
      return; // skip word-level lookup for sentences
    }
    const fetchInfo = async () => {
      try {
        const prompt = `Look up the word/phrase "${word}" in ${langCode} context.
Respond ONLY in strict JSON (no markdown):
{"phonetic": "For English: IPA symbols (e.g. /ˈæp.əl/). For others: pronunciation guide.", "partOfSpeech": "noun/verb/adj/etc in Traditional Chinese", "meaning": "Concise Traditional Chinese meaning", "exampleSentence": "a short natural example sentence in ${langCode}", "exampleTranslation": "繁體中文翻譯"}`;
        const stream = streamGeminiChat(prompt, apiKey);
        let full = '';
        for await (const chunk of stream) full += chunk;
        setInfo(safeParseJSON(full));
      } catch (e) {
        setInfo({ pronunciation: '—', partOfSpeech: '—', meaning: '查詢失敗，請稍後再試', exampleSentence: '', exampleTranslation: '' });
      } finally {
        setLoadingInfo(false);
      }
    };
    fetchInfo();
  }, [word]);

  const handleDeepAnalysis = async () => {
    if (deepAnalysis) { setShowDeep(true); return; }
    setShowDeep(true);
    setLoadingDeep(true);
    try {
      const target = isSentence ? `sentence: "${word}"` : `word: "${word}" (found in the provided article)`;
      const prompt = `You are a language teacher. Perform a comprehensive analysis of the following ${langCode} ${target}.
Write your full analysis IN TRADITIONAL CHINESE (繁體中文). Structure it clearly into these three sections:

【文法解析】
Explain the grammatical structure: parts of speech, tense, verb forms, clause type, sentence pattern. Be precise.

【語意解析】
Explain the meaning in context: nuance, connotation, what emotion or idea it expresses, how it differs from similar words.

【用法與搭配】
Provide 2-3 natural usage examples or common collocations in ${langCode}, each with a Traditional Chinese translation. Include any important usage rules or pitfalls.

NOTE: Your entire output MUST BE in TRADITIONAL CHINESE (繁體中文).

Context from article (for reference):
${articleContent.substring(0, 500)}`;
      const stream = streamGeminiChat(prompt, apiKey);
      let result = '';
      for await (const chunk of stream) {
        result += chunk;
        setDeepAnalysis(result);
      }
    } catch (e) {
      setDeepAnalysis('解析失敗：' + e.message);
    } finally {
      setLoadingDeep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-popup-fade" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`p-5 text-white relative shrink-0 ${isSentence ? 'bg-gradient-to-r from-violet-600 to-indigo-500' : 'bg-gradient-to-r from-emerald-600 to-teal-500'}`}>
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center font-bold text-sm">✕</button>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
                {isSentence ? '📝 選取句子分析' : '🔤 單字查詢'}
              </div>
              <div className="font-bold font-eng leading-snug text-lg">{word}</div>
            </div>
            <button onClick={() => speakText(word)} className="shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xl transition active:scale-90" title="朗讀">
              🔊
            </button>
          </div>
          {!isSentence && (
            loadingInfo ? (
              <div className="mt-2 text-emerald-100 text-sm animate-pulse">查詢中...</div>
            ) : info && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-emerald-100 text-sm font-mono">{info.phonetic || info.pronunciation}</span>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{info.partOfSpeech}</span>
              </div>
            )
          )}
        </div>

        {/* Body - scrollable */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto custom-scroll">
          {/* Word-only info */}
          {!isSentence && (
            loadingInfo ? (
              <div className="text-center py-4 text-stone-400 animate-pulse">🔍 AI 查詢單字中...</div>
            ) : info && (
              <>
                <div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">意義</div>
                  <div className="text-stone-800 font-bold text-base font-chn">{info.meaning}</div>
                </div>
                {info.exampleSentence && (
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-100">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">例句</div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-emerald-800 font-eng text-sm font-bold">{info.exampleSentence}</div>
                        <div className="text-stone-500 text-xs mt-1 font-chn">{info.exampleTranslation}</div>
                      </div>
                      <button onClick={() => speakText(info.exampleSentence)} className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-sm transition active:scale-90" title="朗讀例句">🔊</button>
                    </div>
                  </div>
                )}
                {/* Save Word Button */}
                <button
                  onClick={() => {
                    saveWord({
                      word: word,
                      pronunciation: info.phonetic || info.pronunciation,
                      meaning: info.meaning,
                      langKey: targetLangKey,
                      exampleSentence: info.exampleSentence,
                      exampleTranslation: info.exampleTranslation
                    });
                    setSaved(true);
                    toast('已加入單字本！');
                  }}
                  disabled={saved}
                  className={`w-full py-2.5 rounded-xl border-2 font-bold text-xs transition flex items-center justify-center gap-2 ${saved ? 'bg-stone-100 border-stone-200 text-stone-400' : 'bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-50 active:scale-95'}`}
                >
                  {saved ? '✅ 已在單字本' : '⭐ 儲存單字'}
                </button>
              </>
            )
          )}

          {/* Deep Analysis Button */}
          <button
            onClick={handleDeepAnalysis}
            disabled={loadingInfo}
            className={`w-full py-3 border font-bold text-sm rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 ${
              isSentence
                ? 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700'
                : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700'
            }`}
          >
            🔬 {isSentence ? '句子文法・語意・用法解析' : '單字文法・語意・用法解析'}
          </button>

          {showDeep && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-700 font-chn leading-relaxed animate-popup-fade">
              <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${isSentence ? 'text-violet-500' : 'text-orange-500'}`}>
                📖 {isSentence ? '句子深度解析' : '單字深度解析'}
              </div>
              {loadingDeep ? (
                <div className="text-stone-400 animate-pulse">AI 正在進行文法・語意・用法深度解析...</div>
              ) : (
                <div className="whitespace-pre-wrap">{deepAnalysis}</div>
              )}
              {loadingDeep && <span className="inline-block w-2 h-4 bg-orange-300 ml-1 animate-pulse"></span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Reading Room ──────────────────────────────────────────────
// pastedContent: optional pre-filled text (bypasses Gemini streaming)
const ReadingRoom = ({ taskTitle, prompt, pastedContent, targetLangKey, onClose }) => {
  const { userId, apiKey } = useAuth();
  const { recordActivity, addEssence, saveArticle } = useGame();
  const [content, setContent] = useState(pastedContent || '');
  const [isStreaming, setIsStreaming] = useState(!pastedContent);
  const [metaData, setMetaData] = useState(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const scrollRef = useRef(null);

  const getSpeechCode = (key) => ({ ja: 'ja-JP', ko: 'ko-KR', en: 'en-US' }[key] || 'en-US');
  const getLangName = (key) => ({ ja: 'Japanese', ko: 'Korean', en: 'English' }[key] || 'English');
  const speechCode = getSpeechCode(targetLangKey);

  // Phase 1: Stream if prompt provided, skip if pastedContent
  useEffect(() => {
    recordActivity(); // User started a reading session
    if (pastedContent) return; // already set in useState
    let active = true;
    const runStream = async () => {
      try {
        const stream = streamGeminiChat(prompt, apiKey);
        for await (const chunk of stream) {
          if (!active) break;
          setContent(prev => prev + chunk);
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        setIsStreaming(false);
      } catch (err) {
        toast('串流發生錯誤：' + err.message);
        setIsStreaming(false);
      }
    };
    runStream();
    return () => { active = false; };
  }, [prompt, pastedContent, apiKey]);

  // Phase 2: Background metadata (translation + vocab)
  useEffect(() => {
    if (!isStreaming && content && !metaData && !metaLoading) {
      setMetaLoading(true);
      const askMeta = async () => {
        try {
          const reqPrompt = `You are a linguist analyzing an article in ${getLangName(targetLangKey)}.
Goal: Extract key information and vocabulary.
Language Constraints: 
- ALL explanations and translations MUST be in Traditional Chinese (繁體中文).
- Vocabulary "word" MUST be the original ${getLangName(targetLangKey)} text, NOT Chinese.

Output MUST be STRICT JSON with NO markdown:
{
  "translation": "Full Traditional Chinese translation of the article.",
  "vocab": [
    {
      "word": "The original ${getLangName(targetLangKey)} word",
      "phonetic": "For English: IPA symbols (e.g. /ˈæp.əl/). For Japanese: Furigana.",
      "meaning": "Short 1-3 word Traditional Chinese translation"
    }
  ]
}

CRITICAL EXAMPLES:
If evaluating English, your JSON "vocab" MUST look EXACTLY like this:
[
  { "word": "snack", "phonetic": "/snæk/", "meaning": "零食" },
  { "word": "savory", "phonetic": "/ˈseɪ.vər.i/", "meaning": "鹹的" }
]
DO NOT put Chinese Pinyin like "xiǎo chī" in the phonetic field for English!
DO NOT put long explanations like "具有鹽的味道..." in the meaning field!

RULES:
1. ABSOLUTELY NO CHINESE characters in the "word" field!
2. The "meaning" field MUST BE 1-3 words max (direct translation only).
3. For English words, always provide valid IPA in the "phonetic" field. No Chinese Pinyin!
Article Content:
${content}`;
          const metaStream = streamGeminiChat(reqPrompt, apiKey);
          let fullRes = '';
          for await (const chunk of metaStream) fullRes += chunk;
          setMetaData(safeParseJSON(fullRes));
          addEssence('light', 20); // Reward for completing analysis
        } catch (e) {
          console.error('Meta parse error', e);
        } finally {
          setMetaLoading(false);
        }
      };
      askMeta();
    }
  }, [isStreaming, content, metaData, metaLoading, apiKey, targetLangKey]);

  const speakFullArticle = () => {
    if (!content || isStreaming) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(content);
    u.lang = speechCode;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => window.speechSynthesis.cancel();

  // Detect text selection in the reading area
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();
    if (selected && selected.length > 1 && selected.length < 300) {
      setSelectedWord(selected);
      selection.removeAllRanges();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020817] text-stone-100 flex flex-col pt-10 px-4 md:px-20 pb-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(16,185,129,0.05)_0%,_transparent_50%)] pointer-events-none" />
      {/* Word Card Popup */}
      {selectedWord && (
        <WordCard
          word={selectedWord}
          langCode={getLangName(targetLangKey)}
          speechCode={speechCode}
          apiKey={apiKey}
          articleContent={content}
          onClose={() => setSelectedWord(null)}
        />
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4 border-b-2 border-stone-200 pb-3 shrink-0">
        <h2 className="text-xl font-bold font-chn text-emerald-800">{taskTitle}</h2>
        <div className="flex gap-2 items-center">
          {!isStreaming && content && (
            <>
              <button 
                onClick={() => saveArticle(userId, apiKey, { title: taskTitle, content, langKey: targetLangKey })} 
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-sm rounded-full transition flex items-center gap-1" 
                title="收藏文章"
              >
                🔖 收藏
              </button>
              <button onClick={speakFullArticle} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-sm rounded-full transition flex items-center gap-1" title="朗讀全文">
                🔊 朗讀全文
              </button>
              <button onClick={stopSpeaking} className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-600 font-bold text-sm rounded-full transition" title="停止朗讀">
                ⏹
              </button>
            </>
          )}
          <button onClick={onClose} className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 rounded-full font-bold text-sm">
            返回
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-full overflow-y-auto md:overflow-hidden custom-scroll">
        {/* Main Reading Area */}
        <div
          ref={scrollRef}
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
          className="w-full md:flex-[1.5] bg-white/5 backdrop-blur-md rounded-3xl shadow-2xl p-6 shrink-0 md:shrink md:overflow-y-auto custom-scroll text-lg leading-loose font-eng border border-white/10 select-text text-stone-200"
        >
          <div className="text-xs text-stone-500 mb-4 font-chn flex items-center gap-3 border-b border-white/5 pb-2">
            <span className="flex items-center gap-1"><span className="text-emerald-400">💡</span> <strong>點擊單字</strong>查詢</span>
            <span className="text-white/10">｜</span>
            <span className="flex items-center gap-1"><span className="text-violet-400">✍️</span> <strong>選取句子</strong>深度解析</span>
          </div>
          <div className="article-content-wrapper">
            <ClickableText
              text={content}
              langCode={speechCode}
              onWordClick={setSelectedWord}
            />
          </div>
          {isStreaming && <span className="inline-block w-2 h-5 bg-emerald-400 ml-1 animate-pulse"></span>}
        </div>

        {/* Side Panel */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 shrink-0 md:shrink md:overflow-y-auto custom-scroll pr-2 relative">
          {metaLoading && (
            <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl animate-pulse text-sm font-bold border border-orange-200">
              🔍 AI 正在翻譯與整理重點單字...
            </div>
          )}

          {metaData && (
            <div className="animate-popup-fade flex flex-col gap-4">
              {/* Translation */}
              <div>
                <h3 className="font-bold text-stone-400 mb-2 font-chn border-l-4 border-emerald-500 pl-2 flex items-center justify-between">
                  全文翻譯（繁體中文）
                  <button
                    onClick={() => {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(metaData.translation);
                      u.lang = 'zh-TW';
                      u.rate = 1.0;
                      window.speechSynthesis.speak(u);
                    }}
                    className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold transition ml-2"
                  >
                    🔊 朗讀
                  </button>
                </h3>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-sm leading-relaxed text-stone-300 font-chn">
                  {metaData.translation}
                </div>
              </div>

              {/* Vocabulary */}
              <div>
                <h3 className="font-bold text-stone-400 mb-2 font-chn border-l-4 border-orange-500 pl-2">重點單字</h3>
                <div className="grid grid-cols-1 gap-3">
                  {metaData.vocab?.map((v, i) => (
                    <div
                      key={i}
                      className="bg-white/5 p-3 rounded-xl border border-white/10 shadow-sm flex flex-col cursor-pointer hover:border-emerald-500/40 hover:bg-white/10 transition group"
                      onClick={() => setSelectedWord(v.word)}
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1">
                        <span className="font-bold text-orange-400 text-lg group-hover:text-emerald-400 transition">{v.word}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-500 bg-black/20 px-2 py-0.5 rounded">{v.phonetic}</span>
                          <button
                            onClick={e => { e.stopPropagation(); const u = new SpeechSynthesisUtterance(v.word); u.lang = speechCode; u.rate = 0.85; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }}
                            className="text-emerald-400 hover:text-emerald-300 text-sm"
                            title="朗讀"
                          >🔊</button>
                        </div>
                      </div>
                      <span className="text-stone-400 text-sm font-chn">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingRoom;
