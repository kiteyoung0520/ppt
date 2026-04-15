import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { streamGeminiChat, safeParseJSON } from '../../../services/api';
import { toast } from '../../ui/Toast';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── Situation Data ──────────────────────────────────────────────────
const CATEGORIZED_SITUATIONS = [
  {
    category: "🛒 日常生活與消費 (Daily Life)",
    items: [
      { id: 'cafe', label: '☕ 咖啡廳點餐', prompt: 'You are a barista at a coffee shop taking my order. Ask me what I want to drink.' },
      { id: 'restaurant', label: '🍝 餐廳換菜與客訴', prompt: 'You are a restaurant server. The customer has a complaint about the dish. Handle it politely.' },
      { id: 'shopping', label: '👗 服飾店詢問尺寸', prompt: 'You are a clothing store clerk assisting a customer with sizing and fitting.' },
      { id: 'supermarket', label: '🗺️ 超市尋找商品', prompt: 'You are a supermarket employee helping a customer locate specific items.' },
      { id: 'transport', label: '🚕 預約計程車/問路', prompt: 'You are a helpful local resident being asked for directions to the train station.' }
    ]
  },
  {
    category: "✈️ 旅遊與休閒 (Travel & Leisure)",
    items: [
      { id: 'hotel', label: '🏨 飯店辦理入住', prompt: 'You are a hotel receptionist. A guest is trying to check in.' },
      { id: 'hotel_issue', label: '🛏️ 反映飯店設施損毀', prompt: 'You are a hotel receptionist. The customer is reporting a broken air conditioner.' },
      { id: 'airport', label: '🛂 機場辦理登機', prompt: 'You are an airline check-in agent at the airport.' },
      { id: 'customs', label: '👮 海關入出境問答', prompt: 'You are an immigration officer asking the purpose and duration of visit.' },
      { id: 'tourism', label: '🏛️ 購買博物館門票', prompt: 'You are a ticket seller at a popular museum.' }
    ]
  },
  {
    category: "💼 職場與專業溝通 (Business & Career)",
    items: [
      { id: 'interview', label: '👤 英文面試自我介紹', prompt: 'You are an HR manager conducting a job interview. Start by asking the candidate to introduce themselves.' },
      { id: 'meeting', label: '📊 會議發表與打斷', prompt: 'You are leading a meeting presenting sales data. The user will politely interrupt and ask a question.' },
      { id: 'networking', label: '🤝 商務酒會閒談', prompt: 'You are an industry professional at a networking event engaging in small talk.' }
    ]
  },
  {
    category: "❤️ 社交與情感表達 (Socializing & Feelings)",
    items: [
      { id: 'dating', label: '👋 初次見面破冰', prompt: 'You are a friendly stranger who just met the user at a language exchange meetup. Find common topics.' },
      { id: 'invitation', label: '🍿 委婉拒絕邀約', prompt: 'You are a friend excitedly inviting the user to a movie tonight. The user needs to find an excuse to decline politely.' },
      { id: 'comfort', label: '🤕 給予安慰與鼓勵', prompt: 'You are a friend who just had a terrible day and feeling depressed. The user is trying to comfort you.' }
    ]
  },
  {
    category: "🎭 特殊任務與角色扮演 (Roleplay & Tasks)",
    items: [
      { id: 'emergency', label: '🚑 診所描述病情', prompt: 'You are a doctor at an English-speaking clinic. Ask the user about their symptoms.' },
      { id: 'debate', label: '🤖 生死辯論：AI取代人類', prompt: 'You are debating strongly whether AI will completely replace humans. You believe AI WILL replace humans.' },
      { id: 'guide', label: '📸 換你當導遊', prompt: 'You are a tourist visiting Taiwan. The user is a local trying to introduce night market food to you.' }
    ]
  }
];

// ── Pronunciation Score Ring ────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? '優秀' : score >= 60 ? '良好' : '加油';

  return (
    <div className="flex flex-col items-center">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius}
          fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="36" y="34" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{score}</text>
        <text x="36" y="47" textAnchor="middle" fontSize="9" fill="#6b7280">{label}</text>
      </svg>
    </div>
  );
};

// ── Word-Level Pronunciation Badge ──────────────────────────────────
const WordBadge = ({ word, status, tip }) => {
  const [showTip, setShowTip] = useState(false);
  const colors = {
    correct:   'bg-emerald-100 text-emerald-800 border-emerald-300',
    partial:   'bg-amber-100   text-amber-800   border-amber-300',
    incorrect: 'bg-red-100     text-red-800     border-red-300',
  };
  const icons = { correct: '✓', partial: '△', incorrect: '✗' };

  return (
    <div className="relative inline-block m-1">
      <button
        onClick={() => tip && setShowTip(v => !v)}
        className={`px-2 py-1 rounded-lg border text-sm font-bold font-eng transition-all ${colors[status] || colors.partial} ${tip ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
      >
        <span className="mr-1 text-xs opacity-70">{icons[status]}</span>{word}
      </button>
      {showTip && tip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-stone-800 text-white text-xs rounded-xl p-3 w-48 z-50 font-chn shadow-xl leading-relaxed text-left">
          💡 {tip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      )}
    </div>
  );
};

// ── Pronunciation Feedback Panel ────────────────────────────────────
const PronunciationPanel = ({ result, targetPhrase, onResend, onRetry, onDismiss }) => (
  <div className="bg-white border-2 border-stone-200 rounded-2xl p-4 shadow-md animate-popup-fade">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-bold text-stone-700 font-chn">🔊 發音精準度分析</span>
      <button onClick={onDismiss} className="text-stone-300 hover:text-stone-500 text-lg leading-none">✕</button>
    </div>

    <div className="flex gap-4 items-start mb-4">
      <ScoreRing score={result.score} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-stone-500 mb-1 font-chn">你說道：</div>
        <div className="text-xs font-mono text-stone-600 bg-stone-50 rounded-lg p-2 mb-2 italic">"{result.recognized}"</div>
        <div className="text-xs text-stone-400 font-chn">{result.overallComment}</div>
      </div>
    </div>

    {/* Word-by-word analysis */}
    {result.wordAnalysis && result.wordAnalysis.length > 0 && (
      <div className="mb-3">
        <div className="text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider">逐字評估（點擊有顏色的字查看建議）</div>
        <div className="flex flex-wrap">
          {result.wordAnalysis.map((w, i) => (
            <WordBadge key={i} word={w.word} status={w.status} tip={w.tip} />
          ))}
        </div>
      </div>
    )}

    {/* Improvement tips */}
    {result.improvementTips && result.improvementTips.length > 0 && (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
        <div className="text-xs font-bold text-amber-600 mb-1">📌 改進建議</div>
        <ul className="text-xs text-stone-600 font-chn space-y-1">
          {result.improvementTips.map((tip, i) => <li key={i}>• {tip}</li>)}
        </ul>
      </div>
    )}

    {/* Actions */}
    <div className="flex gap-2">
      <button onClick={onRetry} className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-xs rounded-xl transition">
        🔄 再練一次
      </button>
      <button onClick={onResend} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition">
        ✅ 送出此句繼續
      </button>
    </div>
  </div>
);

// ── Main Echo Valley View ───────────────────────────────────────────
const EchoValleyView = () => {
  const { currentLang, speechRate } = useSettings();
  const { apiKey } = useAuth();
  const { recordActivity, addEssence } = useGame();

  const [activeSituation, setActiveSituation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Pronunciation practice state
  const [practiceTarget, setPracticeTarget] = useState(null); // { reply, pinyin, translation }
  const [isPronouncing, setIsPronouncing] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState(null);

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pronunciationResult]);

  const initRecognition = (langCode) => {
    if (!SpeechRecognition) {
      toast("❌ 您的瀏覽器不支援語音辨識！請使用 Chrome 或 Edge。");
      return null;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = langCode || currentLang.speechCode;
    return rec;
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = currentLang.speechCode;
      u.rate = speechRate || 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  const handleStartSituation = (sit) => {
    setActiveSituation(sit);
    setMessages([]);
    setPracticeTarget(null);
    setPronunciationResult(null);
    recordActivity(); // Reward starting a task
    sendToGemini('Hello!', sit.prompt);
  };

  const sendToGemini = async (userText, overrideSysPrompt = null) => {
    setIsThinking(true);
    const contextHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'NPC'}: ${m.text}`).join('\n');
    const sysPrompt = overrideSysPrompt || activeSituation.prompt;

    const prompt = `
System Context: ${sysPrompt}
You are conversing with the user in ${currentLang.promptName}.
Conversation history:
${contextHistory}
User just said: "${userText}"

Reply in character. Respond ONLY in pure JSON (no markdown):
{
  "grammar_coach": {
    "has_error": true,
    "correction": "The corrected or more natural version of what the user just said in ${currentLang.promptName}",
    "explanation": "Brief explanation of the mistake or why your correction is more natural (in Traditional Chinese 繁體中文). If the user's sentence was perfect or it's just 'Hello', set has_error to false and leave this empty."
  },
  "npc_reply": "Your conversational reply in ${currentLang.promptName}",
  "translation": "Traditional Chinese (繁體中文) translation of your reply",
  "suggested_replies": [
    { "reply": "Natural response option in ${currentLang.promptName}", "phonetic": "IPA for English, or pronunciation guide for others", "translation": "繁體中文意思" },
    { "reply": "Another option", "phonetic": "...", "translation": "..." },
    { "reply": "Third option", "phonetic": "...", "translation": "..." }
  ]
}

Rules for English: Use valid IPA symbols in "phonetic" (e.g., /ˈæp.əl/).
Rules for Chinese: Respond ONLY in Traditional Chinese.
CRITICAL: The "reply" MUST BE IN ${currentLang.promptName}.`;

    try {
      const stream = streamGeminiChat(prompt, apiKey);
      let rawText = '';
      for await (const chunk of stream) rawText += chunk;
      
      const parsed = safeParseJSON(rawText);

      // Attach grammar coach feedback to the last user message
      if (parsed.grammar_coach && parsed.grammar_coach.has_error) {
        setMessages(prev => {
          const newArr = [...prev];
          for (let i = newArr.length - 1; i >= 0; i--) {
            if (newArr[i].role === 'user') {
              newArr[i].coach = parsed.grammar_coach;
              break;
            }
          }
          return newArr;
        });
      }

      setMessages(prev => [...prev, {
        role: 'npc',
        text: parsed.npc_reply,
        translation: parsed.translation,
        suggested: parsed.suggested_replies || []
      }]);
      speakText(parsed.npc_reply);
    } catch (e) {
      toast("AI 解析錯誤：" + e.message);
    } finally {
      setIsThinking(false);
    }
  };

  // ── Pronunciation Analysis via Gemini ─────────────────────────────
  const analyzePronunciation = async (targetPhrase, recognizedText) => {
    setIsPronouncing(true);
    try {
      const prompt = `You are an expert ${currentLang.promptName} pronunciation coach using AI analysis similar to ELSA Speak.

The student was asked to say: "${targetPhrase}"
The speech recognition system heard: "${recognizedText}"

Analyze pronunciation accuracy word by word. Respond ONLY in strict JSON (no markdown):
{
  "score": 85,
  "recognized": "${recognizedText}",
  "wordAnalysis": [
    {"word": "each", "status": "correct", "tip": ""},
    {"word": "specific", "status": "partial", "tip": "繁體中文具體建議，例如：重音應在第二音節 spe-CI-fic"},
    {"word": "word", "status": "incorrect", "tip": "繁體中文改進說明"}
  ],
  "overallComment": "整體評語（繁體中文，1句話）",
  "improvementTips": [
    "具體改進建議1（繁體中文）",
    "具體改進建議2（繁體中文）"
  ]
}

Rules:
- status must be: "correct", "partial", or "incorrect" 
- Only add "tip" for partial/incorrect words; leave empty string for correct
- Score 0-100: 90+ perfect, 70-89 good, 50-69 needs work, <50 significant errors
- Consider that speech recognition may not capture tone/stress perfectly; be educational not harsh
- All Chinese text MUST be Traditional Chinese (繁體中文)`;

      const stream = streamGeminiChat(prompt, apiKey);
      let rawText = '';
      for await (const chunk of stream) rawText += chunk;
      
      const result = safeParseJSON(rawText);
      setPronunciationResult(result);
      addEssence('rain', 15);
    } catch (e) {
      toast('發音分析失敗：' + e.message);
      commitSuggestion(practiceTarget);
    } finally {
      setIsPronouncing(false);
    }
  };

  // ── Enter Practice Mode (click on a suggestion) ───────────────────
  const handlePracticeMode = (suggestion) => {
    setPracticeTarget(suggestion);
    setPronunciationResult(null);
    speakText(suggestion.reply); // Let user hear it first
  };

  // ── Record pronunciation attempt ──────────────────────────────────
  const handleRecordPronunciation = () => {
    if (!practiceTarget) return;
    const rec = initRecognition();
    if (!rec) return;

    rec.onstart = () => setIsPronouncing(true);
    rec.onresult = async (e) => {
      const recognized = e.results[0][0].transcript;
      await analyzePronunciation(practiceTarget.reply, recognized);
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech') toast(`語音辨識錯誤: ${e.error}`);
      setIsPronouncing(false);
    };
    rec.onend = () => {};
    rec.start();
  };

  // ── After analysis: confirm send ─────────────────────────────────
  const commitSuggestion = (sug) => {
    setPracticeTarget(null);
    setPronunciationResult(null);
    setMessages(prev => [...prev, { role: 'user', text: sug.reply }]);
    sendToGemini(sug.reply);
  };

  // ── Free mic (no target phrase) ───────────────────────────────────
  const toggleRecording = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const rec = initRecognition();
    if (!rec) return;

    rec.onstart = () => setIsRecording(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setMessages(prev => [...prev, { role: 'user', text: transcript }]);
      sendToGemini(transcript);
    };
    rec.onerror = (e) => { toast(`語音辨識錯誤: ${e.error}`); setIsRecording(false); };
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
  };

  // ── Situation selector ────────────────────────────────────────────
  if (!activeSituation) {
    return (
      <div className="flex flex-col h-full bg-stone-50 rounded-2xl overflow-hidden shadow-inner border border-stone-200 animate-popup-fade">
        <div className="p-5 bg-emerald-600 shadow-md shrink-0 text-center">
          <div className="text-[40px] mb-1 leading-none">🦜</div>
          <h2 className="text-lg font-bold text-white font-chn">任務型迴音谷</h2>
          <p className="text-emerald-100 text-xs mt-1">含 AI 即時發音精準度分析</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scroll pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {CATEGORIZED_SITUATIONS.map((cg, cIdx) => (
              <div key={cIdx} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-stone-100 px-4 py-2 border-b border-stone-200 font-bold text-stone-700 text-sm">{cg.category}</div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cg.items.map(sit => (
                    <button key={sit.id} onClick={() => handleStartSituation(sit)}
                      className="text-left bg-white border border-stone-200 hover:border-emerald-400 hover:bg-emerald-50 p-3 rounded-xl transition shadow-sm hover:shadow active:scale-95 group flex items-center justify-between">
                      <span className="text-stone-700 font-bold text-sm group-hover:text-emerald-700">{sit.label}</span>
                      <span className="text-stone-300 group-hover:text-emerald-400">›</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50 rounded-2xl overflow-hidden shadow-inner border border-stone-200">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-3 flex justify-between items-center shadow-md shrink-0">
        <div>
          <div className="font-bold text-sm">{activeSituation.label}</div>
          <div className="text-emerald-200 text-xs">含 AI 即時發音評分</div>
        </div>
        <button onClick={() => { setActiveSituation(null); setPracticeTarget(null); setPronunciationResult(null); }}
          className="text-emerald-100 hover:text-white text-xs font-bold bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-full">退出</button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:px-20 custom-scroll flex flex-col gap-4 bg-stone-50/50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-white text-stone-800 rounded-bl-sm border border-stone-200'}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 text-base font-eng">{m.text}</div>
                {m.role === 'npc' && (
                  <button onClick={() => speakText(m.text)} className="shrink-0 text-stone-300 hover:text-emerald-500 text-sm mt-0.5">🔊</button>
                )}
              </div>
              {m.translation && <div className={`text-xs font-chn pt-1 mt-1 border-t ${m.role === 'user' ? 'text-emerald-100 border-emerald-400/50' : 'text-stone-400 border-stone-100'}`}>{m.translation}</div>}
            </div>

            {/* Grammar Coach Feedback */}
            {m.role === 'user' && m.coach && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl max-w-[80%] shadow-sm animate-slideUp text-left self-end">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs">💡</span>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">教練建議 (Coach Tip)</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 mb-2">
                  <p className="text-sm font-bold text-amber-900 font-eng flex-1 leading-snug">
                    {m.coach.correction}
                  </p>
                  <button
                    onClick={() => speakText(m.coach.correction)}
                    className="shrink-0 w-8 h-8 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-full flex items-center justify-center transition active:scale-95"
                    title="聆聽正確發音"
                  >
                    🔊
                  </button>
                </div>
                <div className="text-[11px] text-amber-700/80 font-chn leading-relaxed">
                  {m.coach.explanation}
                </div>
              </div>
            )}

            {/* Suggested replies — last NPC message only */}
            {m.role === 'npc' && m.suggested?.length > 0 && idx === messages.length - 1 && (
              <div className="mt-3 bg-stone-100 border border-stone-200 p-3 rounded-xl w-full max-w-[95%] ml-2">
                <div className="text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                  <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[9px]">🎯 AI 建議</span>
                  點擊練習發音後送出
                </div>
                <div className="flex flex-col gap-2">
                  {m.suggested.map((sug, sIdx) => (
                    <div key={sIdx} className={`bg-white border rounded-xl overflow-hidden transition ${practiceTarget?.reply === sug.reply ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-emerald-200 hover:border-emerald-300'}`}>
                      <div className="p-2.5">
                        <div className="text-emerald-800 font-eng font-bold text-sm leading-snug">{sug.reply}</div>
                        <div className="text-[10px] text-stone-500 mt-1">
                          <span className="text-orange-500">{sug.phonetic}</span> • {sug.translation}
                        </div>
                      </div>
                      <div className="flex border-t border-stone-100">
                        <button onClick={() => speakText(sug.reply)}
                          className="flex-1 py-1.5 text-xs text-stone-500 hover:bg-stone-50 flex items-center justify-center gap-1 transition">
                          🔊 聆聽
                        </button>
                        <div className="w-px bg-stone-100"/>
                        <button onClick={() => handlePracticeMode(sug)}
                          className="flex-1 py-1.5 text-xs text-amber-600 hover:bg-amber-50 font-bold flex items-center justify-center gap-1 transition">
                          🎤 練習發音
                        </button>
                        <div className="w-px bg-stone-100"/>
                        <button onClick={() => commitSuggestion(sug)}
                          className="flex-1 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 font-bold flex items-center justify-center gap-1 transition">
                          ✅ 直接送出
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Thinking dots */}
        {isThinking && (
          <div className="flex items-start">
            <div className="bg-white text-stone-400 p-3 rounded-2xl rounded-bl-sm border border-stone-200 shadow-sm flex items-center gap-1">
              <span className="animate-bounce inline-block w-1.5 h-1.5 bg-stone-300 rounded-full"/>
              <span className="animate-bounce inline-block w-1.5 h-1.5 bg-stone-300 rounded-full" style={{animationDelay:"0.1s"}}/>
              <span className="animate-bounce inline-block w-1.5 h-1.5 bg-stone-400 rounded-full" style={{animationDelay:"0.2s"}}/>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Pronunciation Practice Panel ─── */}
      {practiceTarget && (
        <div className="shrink-0 border-t border-stone-200 bg-white/95 backdrop-blur-md p-3 sm:p-5 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
          {!pronunciationResult ? (
            <div className="flex flex-col gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs text-emerald-600 font-bold mb-1">🎯 請跟著唸出下面這句話：</div>
                <div className="text-emerald-900 font-eng font-bold text-base leading-snug">{practiceTarget.reply}</div>
                <div className="text-xs text-stone-400 mt-1 font-chn">{practiceTarget.phonetic} • {practiceTarget.translation}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => speakText(practiceTarget.reply)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-sm rounded-xl flex items-center justify-center gap-1 transition">
                  🔊 再聽一次
                </button>
                <button
                  onClick={handleRecordPronunciation}
                  disabled={isPronouncing}
                  className={`flex-1 py-2.5 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-95 ${isPronouncing ? 'bg-amber-400 text-white animate-pulse' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'}`}
                >
                  {isPronouncing ? (
                    <><span className="animate-bounce">●</span> 分析中...</>
                  ) : (
                    <><span>🎤</span> 開始錄音評分</>
                  )}
                </button>
                <button onClick={() => { setPracticeTarget(null); setPronunciationResult(null); }}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-400 rounded-xl text-sm transition">✕</button>
              </div>
            </div>
          ) : (
            <PronunciationPanel
              result={pronunciationResult}
              targetPhrase={practiceTarget.reply}
              onRetry={() => { setPronunciationResult(null); }}
              onResend={() => commitSuggestion(practiceTarget)}
              onDismiss={() => { setPracticeTarget(null); setPronunciationResult(null); }}
            />
          )}
        </div>
      )}

      {/* ── Bottom Mic (free speech) ─── */}
      {!practiceTarget && (
        <div className="shrink-0 p-4 bg-white border-t border-stone-200 flex justify-center py-5 relative">
          <div className={`absolute w-14 h-14 bg-emerald-100 rounded-full -translate-y-1 ${isRecording ? 'animate-pulse-ring opacity-100' : 'opacity-0'}`}/>
          <button onClick={toggleRecording}
            className={`relative z-10 w-14 h-14 rounded-full shadow-lg transition-all flex items-center justify-center text-xl active:scale-95 ${isRecording ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            {isRecording ? '🛑' : '🎙️'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EchoValleyView;
