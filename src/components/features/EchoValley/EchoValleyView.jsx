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
    category: "💬 自由對話與專屬教練 (Free Talk & Coach)",
    items: [
      { id: 'free_coach', label: '🌱 專屬外語教練', isFreeTalk: true }
    ]
  },
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
      { id: 'interview', label: '👤 外語面試自我介紹', prompt: 'You are an HR manager conducting a job interview. Start by asking the candidate to introduce themselves.' },
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
      { id: 'emergency', label: '🚑 診所描述病情', prompt: 'You are a doctor at a local clinic. Ask the user about their symptoms.' },
      { id: 'debate', label: '🤖 生死辯論：AI取代人類', prompt: 'You are debating strongly whether AI will completely replace humans. You believe AI WILL replace humans.' },
      { id: 'guide', label: '📸 換你當導遊', prompt: 'You are a tourist visiting Taiwan. The user is a local trying to introduce night market food to you.' }
    ]
  }
];

// ── Free Talk Topics ────────────────────────────────────────────────
const FREE_TALK_TOPICS = [
  { id: 'travel',  emoji: '🌍', label: '旅行體驗', desc: '聊旅遊、景點、文化差異', hint: 'travel experiences, destinations, and cultural differences' },
  { id: 'food',    emoji: '🍜', label: '美食探索', desc: '討論食物、餐廳、各國料理', hint: 'food, restaurants, cooking and different cuisines' },
  { id: 'work',    emoji: '💼', label: '工作學習', desc: '分享職場、學習、職涯目標', hint: 'work, career goals, study plans, and personal growth' },
  { id: 'hobbies', emoji: '🎮', label: '興趣嗜好', desc: '電影、音樂、遊戲、動漫', hint: 'hobbies like movies, music, games, anime, or books' },
  { id: 'daily',   emoji: '☀️', label: '生活日常', desc: '今天發生的事、心情分享', hint: 'everyday life, feelings, mood, and what happened recently' },
  { id: 'free',    emoji: '✨', label: '完全自由', desc: '什麼都可以聊！', hint: 'any topic the user wants — completely open ended' },
];

const buildCoachPrompt = (lang, topicHint) =>
  `You are a warm, encouraging, and patient ${lang} language coach. Today's conversation topic: ${topicHint}.

RULES:
1. Always reply in ${lang} only. Never reply in Chinese yourself.
2. If the user writes Traditional Chinese (中文), gently acknowledge it and immediately show the ${lang} equivalent: "💡 In ${lang}: [phrase]"
3. Correct grammar or vocabulary mistakes kindly: "✏️ More naturally: [correction]"
4. After corrections, ask a follow-up question related to the topic to keep the conversation going.
5. Celebrate when the user uses a good phrase. Keep replies concise — 2-4 sentences max.`;

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
  const [practiceTarget, setPracticeTarget] = useState(null);
  const [isPronouncing, setIsPronouncing] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState(null);

  // SOS Coach state (Proposal 2)
  const [sosMode, setSosMode] = useState(false);
  const [sosHelp, setSosHelp] = useState(null);
  const [isSosLoading, setIsSosLoading] = useState(false);

  // Post-Session Report state (Proposal 3)
  const [sessionReport, setSessionReport] = useState(null); // null = not shown
  const sessionStartRef = useRef(null);
  const sessionMistakesRef = useRef([]);
  const sessionPronounceCountRef = useRef(0);

  // Free Talk Coach state
  const [topicSelectMode, setTopicSelectMode] = useState(false);
  const [pendingSituation, setPendingSituation] = useState(null);
  const [fluencyStats, setFluencyStats] = useState({ messages: 0, totalChars: 0, chineseChars: 0 });

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const prevLangRef = useRef(currentLang.speechCode);

  // Detect language switch mid-conversation and notify user
  useEffect(() => {
    if (prevLangRef.current !== currentLang.speechCode) {
      prevLangRef.current = currentLang.speechCode;
      if (activeSituation) {
        toast(`語言已切換為 ${currentLang.name}，當前對話建議「退出」後重新開始。`);
      }
    }
  }, [currentLang]);

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
    if (sit.isFreeTalk) {
      setPendingSituation(sit);
      setTopicSelectMode(true);
      return;
    }
    beginSession(sit, sit.prompt, 'Hello!');
  };

  const beginSession = (sit, sysPrompt, openingMsg) => {
    setActiveSituation(sit);
    setMessages([]);
    setPracticeTarget(null);
    setPronunciationResult(null);
    setSosMode(false);
    setSosHelp(null);
    setSessionReport(null);
    setFluencyStats({ messages: 0, totalChars: 0, chineseChars: 0 });
    sessionStartRef.current = Date.now();
    sessionMistakesRef.current = [];
    sessionPronounceCountRef.current = 0;
    recordActivity();
    sendToGemini(openingMsg, sysPrompt);
  };

  const startFreeTalkSession = (topic) => {
    setTopicSelectMode(false);
    const coachPrompt = buildCoachPrompt(currentLang.promptName, topic.hint);
    const enrichedSit = {
      ...pendingSituation,
      prompt: coachPrompt,
      topicLabel: topic.label,
      topicEmoji: topic.emoji,
    };
    beginSession(enrichedSit, coachPrompt, '你好！我想開始練習。');
  };

  const trackFluency = (text) => {
    if (!activeSituation || activeSituation.id !== 'free_coach') return;
    const clean = text.trim().replace(/\s/g, '');
    if (!clean.length) return;
    const chinese = (clean.match(/[\u4e00-\u9fff]/g) || []).length;
    setFluencyStats(prev => ({
      messages: prev.messages + 1,
      totalChars: prev.totalChars + clean.length,
      chineseChars: prev.chineseChars + chinese,
    }));
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
    trackFluency(sug.reply);
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
      trackFluency(transcript);
      sendToGemini(transcript);
    };
    rec.onerror = (e) => { toast(`語音辨識錯誤: ${e.error}`); setIsRecording(false); };
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
  };

  // ─── SOS Coach Request (Proposal 2) ─────────────────────────────
  const handleSosRequest = async () => {
    const lastNpc = [...messages].reverse().find(m => m.role === 'npc');
    if (!lastNpc) return;
    setIsSosLoading(true);
    setSosMode(true);
    setSosHelp(null);
    try {
      const p = `You are a supportive ${currentLang.promptName} language coach. 
The NPC just said: "${lastNpc.text}"
The student does not understand how to respond.

Respond ONLY in strict JSON (no markdown):
{
  "breakdown": "Brief explanation of what the NPC said and any key vocabulary, written in Traditional Chinese (繁體中文)",
  "hint": "A gentle Chinese hint about what the student could try to say next, without giving the exact English answer",
  "example": "A natural example sentence in ${currentLang.promptName} the student could use",
  "example_chn": "The Chinese translation of the example sentence"
}`;
      const stream = streamGeminiChat(p, apiKey);
      let raw = '';
      for await (const chunk of stream) raw += chunk;
      setSosHelp(safeParseJSON(raw));
    } catch (e) {
      toast('教練求救失敗：' + e.message);
      setSosMode(false);
    } finally {
      setIsSosLoading(false);
    }
  };

  // ─── Exit Session → Generate Report (Proposal 3) ─────────────────
  const handleExitSession = async () => {
    const userMessages = messages.filter(m => m.role === 'user');
    const mistakes = messages.filter(m => m.role === 'user' && m.coach);
    const durationSecs = sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : 0;
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const essenceEarned = Math.max(10, Math.min(userMessages.length * 5, 80));
    addEssence('rain', essenceEarned);
    const fluencyScore = fluencyStats.totalChars > 0
      ? Math.round(((fluencyStats.totalChars - fluencyStats.chineseChars) / fluencyStats.totalChars) * 100)
      : null;
    setSessionReport({
      situationLabel: activeSituation.label,
      isFreeTalk: activeSituation.id === 'free_coach',
      topicLabel: activeSituation.topicLabel || null,
      topicEmoji: activeSituation.topicEmoji || null,
      messageCount: userMessages.length,
      errorCount: mistakes.length,
      duration: `${mins}分${secs}秒`,
      essenceEarned,
      fluencyScore,
      mistakes: mistakes.slice(-3).map(m => ({ said: m.text, correction: m.coach.correction, explanation: m.coach.explanation }))
    });
  };

  // ── Situation selector ────────────────────────────────────────────
  if (!activeSituation && !sessionReport) {
    return (
      <div className="flex flex-col h-full bg-stone-50 rounded-2xl overflow-hidden shadow-inner border border-stone-200 animate-popup-fade relative">
        <div className="p-5 bg-emerald-600 shadow-md shrink-0 text-center">
          <div className="text-[40px] mb-1 leading-none">🦜</div>
          <h2 className="text-lg font-bold text-white font-chn">任務型迂音谷</h2>
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
                      className={`text-left border p-3 rounded-xl transition shadow-sm hover:shadow active:scale-95 group flex items-center justify-between ${
                        sit.isFreeTalk
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 hover:border-emerald-500 hover:from-emerald-100 hover:to-teal-100'
                          : 'bg-white border-stone-200 hover:border-emerald-400 hover:bg-emerald-50'
                      }`}>
                      <span className={`font-bold text-sm ${ sit.isFreeTalk ? 'text-emerald-700 group-hover:text-emerald-900' : 'text-stone-700 group-hover:text-emerald-700' }`}>{sit.label}</span>
                      <span className={sit.isFreeTalk ? 'text-emerald-400' : 'text-stone-300 group-hover:text-emerald-400'}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Topic Selector Overlay ── */}
        {topicSelectMode && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setTopicSelectMode(false); setPendingSituation(null); }}>
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 mb-2 animate-slideUp" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="text-3xl mb-1">🌱</div>
                <h3 className="font-black text-stone-800 text-base">選擇練習主題</h3>
                <p className="text-xs text-stone-400 mt-0.5">教練會圍繞這個主題引導對話，中外文混用都可以</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {FREE_TALK_TOPICS.map(topic => (
                  <button key={topic.id} onClick={() => startFreeTalkSession(topic)}
                    className="text-left p-3 bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-400 rounded-2xl transition active:scale-95 group">
                    <div className="text-2xl mb-1">{topic.emoji}</div>
                    <div className="font-black text-stone-800 text-sm group-hover:text-emerald-700">{topic.label}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">{topic.desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setTopicSelectMode(false); setPendingSituation(null); }}
                className="w-full py-2.5 text-stone-400 hover:text-stone-600 text-sm transition">取消</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Session Report Screen (Proposal 3) ───────────────────────────
  if (sessionReport) {
    return (
      <div className="flex flex-col h-full bg-stone-50 rounded-2xl overflow-hidden shadow-inner border border-stone-200 items-center justify-center p-6 animate-fadeIn">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-stone-200 p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-[10px] font-black text-emerald-600 tracking-widest uppercase mb-1">Post-Session Report</div>
          <h2 className="text-xl font-black text-stone-800 mb-6 font-chn">{sessionReport.situationLabel} · 課後報告</h2>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <div className="text-2xl font-black text-emerald-700">{sessionReport.messageCount}</div>
              <div className="text-[10px] text-stone-500 font-bold uppercase">發言次數</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <div className="text-2xl font-black text-amber-700">{sessionReport.errorCount}</div>
              <div className="text-[10px] text-stone-500 font-bold uppercase">教練糾正</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
              <div className="text-2xl font-black text-blue-700">{sessionReport.duration}</div>
              <div className="text-[10px] text-stone-500 font-bold uppercase">練習時長</div>
            </div>
          </div>

          {/* Fluency Score — Free Talk only */}
          {sessionReport.isFreeTalk && sessionReport.fluencyScore !== null && (
            <div className="mb-6">
              <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">📊 本次流利度指數</div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500">外語比例</span>
                  <span className="text-2xl font-black text-emerald-700">{sessionReport.fluencyScore}%</span>
                </div>
                <div className="h-3 bg-white/60 rounded-full overflow-hidden border border-emerald-200">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      sessionReport.fluencyScore >= 80 ? 'bg-emerald-500' :
                      sessionReport.fluencyScore >= 50 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${sessionReport.fluencyScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-2 font-chn">
                  {sessionReport.fluencyScore >= 80 ? '🌟 太棒了！外語比例十分高，繼續保持！' :
                   sessionReport.fluencyScore >= 50 ? '🌱 良好進展！試著減少中文使用，讓外語比例再提升。' :
                   '💡 多用外語表達！如果卡住了請不要愿意直接用中文，嘗試用外語描述看看。'}
                </p>
              </div>
            </div>
          )}

          {/* Mistakes Review */}
          {sessionReport.mistakes.length > 0 && (
            <div className="text-left mb-6">
              <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">📌 本次常見錯誤</div>
              <div className="flex flex-col gap-2">
                {sessionReport.mistakes.map((mk, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                    <div className="text-xs text-stone-400 font-chn mb-1">你說了：<span className="text-stone-600 italic font-eng">"{mk.said}"</span></div>
                    <div className="text-sm font-bold text-emerald-800 font-eng">✅ {mk.correction}</div>
                    <div className="text-[11px] text-stone-500 font-chn mt-1">{mk.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Essence Reward */}
          <div className="bg-blue-50 border border-blue-300 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="text-3xl">💧</div>
            <div className="text-left">
              <div className="text-base font-black text-blue-800">+{sessionReport.essenceEarned} 雨露精華</div>
              <div className="text-[11px] text-blue-600 font-chn">語言肌肉因今天的練習而更強壯了！</div>
            </div>
          </div>

          <button
            onClick={() => { setActiveSituation(null); setSessionReport(null); }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition active:scale-95 shadow-lg"
          >
            🌱 返回任務選擇
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50 rounded-2xl overflow-hidden shadow-inner border border-stone-200 relative">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-3 flex justify-between items-center shadow-md shrink-0">
        <div>
          <div className="font-bold text-sm">
            {activeSituation.label}
            {activeSituation.topicLabel && (
              <span className="ml-2 text-emerald-300 font-normal text-xs">{activeSituation.topicEmoji}{activeSituation.topicLabel}</span>
            )}
          </div>
          {activeSituation.id === 'free_coach' ? (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="relative h-1.5 w-20 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${fluencyStats.totalChars > 0 ? Math.round(((fluencyStats.totalChars - fluencyStats.chineseChars) / fluencyStats.totalChars) * 100) : 0}%` }}
                />
              </div>
              <span className="text-emerald-200 text-[10px] font-bold">
                流利度 {fluencyStats.totalChars > 0 ? Math.round(((fluencyStats.totalChars - fluencyStats.chineseChars) / fluencyStats.totalChars) * 100) : 0}%
              </span>
            </div>
          ) : (
            <div className="text-emerald-200 text-xs">含 AI 即時發音評分</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* SOS Button */}
          <button
            onClick={handleSosRequest}
            disabled={isSosLoading || isThinking || messages.filter(m => m.role === 'npc').length === 0}
            className="text-xs font-bold bg-red-500/80 hover:bg-red-400 disabled:opacity-30 text-white px-2.5 py-1 rounded-full flex items-center gap-1 transition active:scale-95"
            title="向教練求救"
          >
            {isSosLoading ? '🔄' : '🆘'} 求救
          </button>
          <button onClick={handleExitSession}
            className="text-emerald-100 hover:text-white text-xs font-bold bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-full">退出</button>
        </div>
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

      {/* ── SOS Coach Overlay (Proposal 2) ─── */}
      {sosMode && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setSosMode(false); setSosHelp(null); }}>
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 mb-2 animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🆘</span>
                <span className="font-black text-stone-800 text-sm">教練緊急支援中...</span>
              </div>
              <button onClick={() => { setSosMode(false); setSosHelp(null); }} className="text-stone-300 hover:text-stone-500 text-xl">✕</button>
            </div>

            {isSosLoading ? (
              <div className="py-8 flex flex-col items-center gap-3 text-stone-400">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}} />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}} />
                </div>
                <span className="text-sm font-chn">教練正在分析，請稍候...</span>
              </div>
            ) : sosHelp && (
              <div className="flex flex-col gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">📖 對方說了什麼？</div>
                  <div className="text-sm text-stone-700 font-chn leading-relaxed">{sosHelp.breakdown}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">💡 教練提示</div>
                  <div className="text-sm text-stone-700 font-chn leading-relaxed">{sosHelp.hint}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">✍️ 可以這樣說</div>
                    <div className="text-sm font-bold text-emerald-900 font-eng">{sosHelp.example}</div>
                    <div className="text-xs text-stone-400 mt-1">{sosHelp.example_chn}</div>
                  </div>
                  <button onClick={() => speakText(sosHelp.example)} className="shrink-0 w-10 h-10 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center transition">🔊</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EchoValleyView;
