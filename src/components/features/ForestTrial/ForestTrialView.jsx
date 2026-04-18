import React, { useState, useCallback } from 'react';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { streamGeminiChat, safeParseJSON } from '../../../services/api';
import { toast } from '../../ui/Toast';

// ── Fallback static quiz bank (English only, used if AI generation fails) ──
const FALLBACK_QUIZ = [
  { plant: '馬鞍藤', q: 'Which plant anchors Taiwan\'s sandy beaches with its vines?', options: ['馬鞍藤 Beach Morning Glory', '台灣百合 Taiwan Lily', '水筆仔 Mangrove', '愛玉子 Aiyu'], answer: 0 },
  { plant: '紫金牛', q: 'Where does 紫金牛 (Ardisia crenata) primarily grow?', options: ['Mountain peaks', 'Under forest canopy', 'River banks', 'Coastal zones'], answer: 1 },
  { plant: '台灣欒樹', q: 'Why is 台灣欒樹 nicknamed the "four-season tree"?', options: ['Blooms four times a year', 'Appearance changes through all four seasons', 'Lives for four centuries', 'Has four leaf types'], answer: 1 },
  { plant: '山櫻花', q: 'To which indigenous group is 山櫻花 especially significant?', options: ['Paiwan', 'Amis', 'Atayal', 'Bunun'], answer: 2 },
  { plant: '台灣百合', q: 'What makes 台灣百合 remarkable?', options: ['Grows on mountain cliffs', 'Blooms in winter', 'Has blue petals', 'World\'s largest lily'], answer: 0 },
  { plant: '水筆仔', q: 'What is the extraordinary reproductive method of 水筆仔?', options: ['Spores underwater', 'Seeds germinate on parent tree (viviparous)', 'Cloning only', 'Seeds travel by wind'], answer: 1 },
  { plant: '愛玉子', q: 'What is unique about 愛玉子?', options: ['Needs volcanic soil', 'Endemic only to Taiwan', 'Only above 3000m', 'Needs rainforest'], answer: 1 },
  { plant: '牛樟', q: 'Why is 牛樟 critically endangered?', options: ['Cannot reproduce', 'Heavily logged illegally', 'Climate destroyed habitat', 'Eaten by insects'], answer: 1 },
];

const TOTAL_QUESTIONS = 8;

// ── Loading Screen ────────────────────────────────────────────────────────
const GeneratingScreen = ({ langName }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-white font-chn animate-fadeIn">
    <div className="w-full max-w-sm bg-[#0f172a] border border-amber-500/30 rounded-3xl p-10 text-center shadow-2xl">
      <div className="flex justify-center gap-2 mb-6">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-3 h-3 rounded-full bg-amber-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <p className="text-amber-400 font-black text-sm uppercase tracking-widest mb-2">AI 正在生成題目</p>
      <p className="text-stone-400 text-xs leading-relaxed">
        正在為您量身打造<span className="text-white font-bold mx-1">{langName}</span>語林試鍊題目...<br />
        請稍候片刻
      </p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────
const ForestTrialView = () => {
  const { stats, addEssence, setStats } = useGame();
  const { currentLang } = useSettings();
  const { apiKey } = useAuth();

  const unlockedArr = Array.isArray(stats?.unlockedPlants) ? stats.unlockedPlants : [];
  const totalPlants = NATIVE_PLANT_DB.filter(p => p.rarity !== 'Starter').length;
  const isMaxUnlocked = unlockedArr.length >= totalPlants;

  const [phase, setPhase] = useState('lobby'); // lobby | generating | quiz | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [generationError, setGenerationError] = useState(false);

  // ── Plant info for context ────────────────────────────────────────────
  const unlockedPlantInfos = NATIVE_PLANT_DB.filter(p => unlockedArr.includes(p.name));

  const generateQuestionsWithAI = useCallback(async () => {
    setPhase('generating');
    setGenerationError(false);

    const plantList = unlockedPlantInfos
      .map(p => `- ${p.name} (${p.engName || p.name}): ${p.desc || ''}`)
      .join('\n');

    const prompt = `You are creating a multiple-choice ecology quiz about Taiwan's native plants.

TARGET LANGUAGE: ${currentLang.promptName}
CRITICAL: ALL questions AND ALL answer options MUST be written entirely in ${currentLang.promptName}. Do NOT use any other language.

Available plants to make questions about:
${plantList}

Generate exactly ${Math.min(TOTAL_QUESTIONS, unlockedPlantInfos.length)} quiz questions. Each question must:
1. Be about one of the plants listed above
2. Test knowledge about ecology, appearance, cultural significance, or unique traits
3. Have exactly 4 answer options (A, B, C, D)
4. Have exactly one correct answer

Respond ONLY with a valid JSON array (no markdown, no explanation):
[
  {
    "plant": "植物中文名稱 (exact Chinese name from the list)",
    "q": "Question text in ${currentLang.promptName}",
    "options": [
      "Option A in ${currentLang.promptName}",
      "Option B in ${currentLang.promptName}",
      "Option C in ${currentLang.promptName}",
      "Option D in ${currentLang.promptName}"
    ],
    "answer": 0,
    "explanation": "Brief explanation of the correct answer in ${currentLang.promptName}"
  }
]

The "answer" field is the 0-based index of the correct option. Mix up which index is correct — do not always use 0.`;

    try {
      const stream = streamGeminiChat(prompt, apiKey);
      let raw = '';
      for await (const chunk of stream) raw += chunk;

      const parsed = safeParseJSON(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid format');

      // Validate structure
      const valid = parsed.filter(q =>
        q.plant && q.q && Array.isArray(q.options) && q.options.length === 4 &&
        typeof q.answer === 'number'
      );

      if (valid.length === 0) throw new Error('No valid questions');

      setQuestions(valid.slice(0, TOTAL_QUESTIONS));
      setCurrent(0);
      setScore(0);
      setSelected(null);
      setAnswers([]);
      setShowFeedback(false);
      setPhase('quiz');

    } catch (err) {
      console.warn('AI quiz generation failed, falling back:', err);
      setGenerationError(true);
      // Fallback: use static questions for unlocked plants
      const available = FALLBACK_QUIZ.filter(q => unlockedArr.includes(q.plant));
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      const qs = shuffled.slice(0, Math.min(TOTAL_QUESTIONS, shuffled.length));
      if (qs.length === 0) {
        toast('題目生成失敗，請確認守護靈已解鎖');
        setPhase('lobby');
        return;
      }
      setQuestions(qs);
      setCurrent(0);
      setScore(0);
      setSelected(null);
      setAnswers([]);
      setShowFeedback(false);
      setPhase('quiz');
    }
  }, [unlockedPlantInfos, currentLang, apiKey, unlockedArr]);

  const handleAnswer = (idx) => {
    if (showFeedback) return;
    setSelected(idx);
    setShowFeedback(true);
    const isCorrect = idx === questions[current].answer;
    if (isCorrect) setScore(s => s + 1);
    setAnswers(prev => [...prev, {
      q: questions[current].q,
      chosen: idx,
      correct: questions[current].answer,
      isCorrect,
      explanation: questions[current].explanation || '',
      options: questions[current].options,
    }]);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      const finalScore = answers.filter(a => a.isCorrect).length + (selected === questions[current].answer ? 1 : 0);
      const coins = finalScore * 20;
      const essence = finalScore * 8;
      addEssence('soil', essence);
      setStats({ coins: (stats?.coins || 0) + coins });
      setPhase('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowFeedback(false);
    }
  };

  // ── Lobby ─────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-white font-chn animate-fadeIn">
        <div className="w-full max-w-sm bg-[#0f172a] border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl" style={{ boxShadow: '0 0 60px rgba(251,191,36,0.1)' }}>
          <div className="text-7xl mb-4">⚔️</div>
          <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase mb-2">Forest Trial</div>
          <h2 className="text-2xl font-black text-white mb-3">語林試鍊</h2>
          <p className="text-stone-400 text-sm leading-relaxed mb-2">
            考驗您對臺灣特有種守護靈的生態知識。<br />
            每收集一種守護靈，就解鎖更多題目！
          </p>

          {/* Language badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-400/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-amber-300 text-xs font-black">🌐 題目語言：</span>
            <span className="text-white font-black text-sm">{currentLang.name}</span>
          </div>

          {/* Unlock status */}
          <div className="flex items-center justify-center gap-3 py-4 border-y border-white/5 mb-6">
            <div className="text-left">
              <div className="text-xs text-stone-400 font-bold">已解鎖守護靈</div>
              <div className="text-2xl font-black text-emerald-400">{unlockedArr.length} / {totalPlants}</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-left">
              <div className="text-xs text-stone-400 font-bold">可出題植物</div>
              <div className="text-2xl font-black text-amber-400">{Math.min(unlockedPlantInfos.length, TOTAL_QUESTIONS)}</div>
            </div>
          </div>

          {/* Rewards preview */}
          <div className="bg-emerald-950/40 border border-emerald-500/10 rounded-2xl p-4 mb-6 text-sm text-stone-400">
            <div className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">🎁 通關獎勵</div>
            每題答對：<span className="text-amber-400 font-bold">+20 金幣</span> + <span className="text-emerald-400 font-bold">+8 土壤精華</span>
          </div>

          {isMaxUnlocked && (
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 mb-4 text-amber-300 text-xs font-bold">
              🌟 傳說守護者！所有守護靈已解鎖，完整題庫開放！
            </div>
          )}

          <button
            onClick={generateQuestionsWithAI}
            disabled={unlockedArr.length === 0}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-stone-900 font-black rounded-2xl shadow-lg transition-all active:scale-95 text-base"
          >
            {unlockedArr.length === 0 ? '🔒 先收集守護靈解鎖試鍊' : `⚔️ 開始 ${currentLang.name} 語林試鍊`}
          </button>

          {generationError && (
            <p className="text-red-400 text-xs mt-3">⚠️ AI 生成失敗，已使用備用題庫（英文）</p>
          )}
        </div>
      </div>
    );
  }

  // ── Generating Screen ─────────────────────────────────────────────────
  if (phase === 'generating') {
    return <GeneratingScreen langName={currentLang.name} />;
  }

  // ── Quiz Screen ───────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = questions[current];
    const progress = (current / questions.length) * 100;
    return (
      <div className="flex flex-col h-full p-4 text-white font-chn animate-fadeIn max-w-lg mx-auto w-full">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-stone-400 font-bold mb-2">
            <span>第 {current + 1} / {questions.length} 題</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-300 text-[10px] font-bold bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-full">{currentLang.name}</span>
              <span className="text-emerald-400">{score} 答對</span>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Plant badge */}
        <div className="flex items-center gap-2 mb-4">
          {NATIVE_PLANT_DB.find(p => p.name === q.plant) && (
            <>
              <span className="text-lg">{NATIVE_PLANT_DB.find(p => p.name === q.plant)?.emoji}</span>
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-400/20 px-2 py-1 rounded-full">{q.plant}</span>
            </>
          )}
        </div>

        {/* Question */}
        <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 mb-4 flex-shrink-0">
          <p className="text-base font-bold text-white leading-relaxed">{q.q}</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3 flex-1">
          {q.options.map((opt, i) => {
            let style = 'bg-white/5 border-white/10 text-stone-200 hover:bg-white/10 hover:border-white/20';
            if (showFeedback) {
              if (i === q.answer) style = 'bg-emerald-900/50 border-emerald-400/60 text-emerald-300 font-black';
              else if (i === selected && i !== q.answer) style = 'bg-red-900/40 border-red-400/50 text-red-300';
              else style = 'bg-white/3 border-white/5 text-stone-500 opacity-50';
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showFeedback}
                className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] text-sm ${style}`}
              >
                <span className="font-black text-xs opacity-60 mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Explanation after answer */}
        {showFeedback && q.explanation && (
          <div className="mt-3 bg-stone-800/60 border border-stone-700 rounded-2xl px-4 py-3 text-xs text-stone-300 leading-relaxed animate-slideUp">
            💡 {q.explanation}
          </div>
        )}

        {/* Next button */}
        {showFeedback && (
          <button
            onClick={handleNext}
            className="mt-4 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-95 animate-slideUp"
          >
            {current + 1 >= questions.length ? '🏆 查看結果' : '下一題 →'}
          </button>
        )}
      </div>
    );
  }

  // ── Result Screen ─────────────────────────────────────────────────────
  if (phase === 'result') {
    const correct = answers.filter(a => a.isCorrect).length;
    const pct = Math.round((correct / questions.length) * 100);
    const grade = pct >= 90 ? { label: '語林大師', emoji: '🌟', color: 'text-amber-400' }
      : pct >= 70 ? { label: '守護學者', emoji: '🌿', color: 'text-emerald-400' }
      : pct >= 50 ? { label: '語言旅者', emoji: '🌱', color: 'text-blue-400' }
      : { label: '初探者', emoji: '🌾', color: 'text-stone-400' };

    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-white font-chn animate-fadeIn overflow-y-auto custom-scroll">
        <div className="w-full max-w-sm">
          {/* Score Card */}
          <div className="bg-[#0f172a] border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl mb-4">
            <div className="text-6xl mb-4">{grade.emoji}</div>
            <div className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">{currentLang.name} 語林試鍊</div>
            <div className={`text-xl font-black mb-1 ${grade.color}`}>{grade.label}</div>
            <div className="text-5xl font-black text-white mb-1">{correct}<span className="text-stone-500 text-2xl"> / {questions.length}</span></div>
            <div className="text-stone-400 text-sm mb-6">答對率 {pct}%</div>
            <div className="flex gap-4 justify-center">
              <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl px-4 py-3 text-center">
                <div className="text-xl font-black text-amber-400">+{correct * 20}</div>
                <div className="text-xs text-stone-500 font-bold">🌞 金幣</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl px-4 py-3 text-center">
                <div className="text-xl font-black text-emerald-400">+{correct * 8}</div>
                <div className="text-xs text-stone-500 font-bold">🌱 土壤精華</div>
              </div>
            </div>
          </div>

          {/* Mistake Review */}
          {answers.filter(a => !a.isCorrect).length > 0 && (
            <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-4 mb-4">
              <div className="text-xs font-black text-red-400 uppercase tracking-widest mb-3">📌 需要加強</div>
              {answers.filter(a => !a.isCorrect).map((a, i) => (
                <div key={i} className="mb-3 text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <p className="text-stone-400 mb-1">{a.q}</p>
                  <p className="text-emerald-400 font-bold">✅ {a.options?.[a.correct]}</p>
                  {a.explanation && <p className="text-stone-500 mt-1 italic">💡 {a.explanation}</p>}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setPhase('lobby')}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-2xl transition-all active:scale-95 mb-3"
          >
            返回語林試鍊大廳
          </button>
          <button
            onClick={generateQuestionsWithAI}
            className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-black rounded-2xl transition-all active:scale-95 text-sm"
          >
            ⚔️ 再來一場 {currentLang.name} 試鍊
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ForestTrialView;
