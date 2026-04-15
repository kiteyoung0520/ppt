import React, { useState, useEffect, useCallback } from 'react';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { toast } from '../../ui/Toast';

// ── Quiz question bank (10 plants × 2 questions each) ───────────────
const QUIZ_BANK = [
  { plant: '馬鞍藤', q: 'Which plant is known as the "coastal warrior" of Taiwan, anchoring sandy beaches with its vines?', options: ['馬鞍藤 Beach Morning Glory', '台灣百合 Taiwan Lily', '水筆仔 Mangrove', '愛玉子 Aiyu'], answer: 0 },
  { plant: '馬鞍藤', q: 'The scientific name "pes-caprae" of 馬鞍藤 means what in Latin?', options: ['Sea walker', 'Goat\'s foot', 'Sand runner', 'Wind rider'], answer: 1 },
  { plant: '紫金牛', q: 'Where does the 紫金牛 (Ardisia crenata) primarily grow in Taiwan?', options: ['On exposed mountain peaks', 'In the shade under the forest canopy', 'Along river banks', 'In coastal tidal zones'], answer: 1 },
  { plant: '紫金牛', q: 'Which feature makes 紫金牛 easily recognizable in winter forests?', options: ['Its massive trunk', 'Its bright red berries', 'Its enormous leaves', 'Its white flowers'], answer: 1 },
  { plant: '台灣欒樹', q: 'Why is the 台灣欒樹 (Taiwan Flame Tree) nicknamed the "four-season tree"?', options: ['It blooms four times a year', 'Its appearance changes dramatically through all four seasons', 'It lives for four centuries', 'It has four types of leaves'], answer: 1 },
  { plant: '山櫻花', q: 'To which indigenous group is the 山櫻花 (Taiwan Cherry) especially significant as a spring herald?', options: ['Paiwan', 'Amis', 'Atayal', 'Bunun'], answer: 2 },
  { plant: '台灣百合', q: 'What makes the 台灣百合 (Taiwan Lily) remarkable compared to other lilies?', options: ['It grows only on mountain cliffs and rocky slopes', 'It blooms in winter', 'It has blue petals', 'It is the world\'s largest lily'], answer: 0 },
  { plant: '水筆仔', q: 'What is the extraordinary reproductive method of 水筆仔 (Mangrove)?', options: ['It disperses spores underwater', 'Its seeds germinate while still attached to the parent tree (viviparous)', 'It reproduces only by cloning', 'Its seeds travel by wind'], answer: 1 },
  { plant: '水筆仔', q: 'Why are mangrove forests like those of 水筆仔 called "nurseries of the sea"?', options: ['They host seabird nesting colonies', 'They provide shelter and breeding grounds for marine life', 'They cultivate salt for human use', 'They grow fastest near ocean water'], answer: 1 },
  { plant: '愛玉子', q: 'What is unique about 愛玉子 (Aiyu Fig) that makes it found nowhere else naturally?', options: ['It requires volcanic soil', 'It is endemic only to Taiwan', 'It only grows above 3000m altitude', 'It needs tropical rainforest conditions'], answer: 1 },
  { plant: '牛樟', q: 'Why is Taiwan\'s 牛樟 (Cow Camphor) considered critically endangered?', options: ['It cannot reproduce in modern climate', 'It was heavily logged illegally for the rare mushroom growing on it', 'Climate change destroyed its habitat', 'It was eaten by invasive insects'], answer: 1 },
  { plant: '台灣肖楠', q: 'Which historical period saw 台灣肖楠 designated as one of Taiwan\'s five sacred trees?', options: ['Dutch Colonial Period', 'Qing Dynasty Period', 'Japanese Colonial Period', 'Republic of China Period'], answer: 1 },
  { plant: '紅檜', q: 'Approximately how old can the oldest 紅檜 (Red Cypress) trees in Taiwan be?', options: ['500 years', '1000 years', 'Over 2000 years', '200 years'], answer: 2 },
  { plant: '紅檜', q: 'Which famous mountain area is known for its 紅檜 and other cypress forests in Taiwan?', options: ['Jade Mountain (玉山)', 'Alishan (阿里山)', 'Taroko Gorge', 'Sun Moon Lake (日月潭)'], answer: 1 },
];

const TOTAL_QUESTIONS = 10;

const ForestTrialView = () => {
  const { stats, addEssence, setStats } = useGame();

  const unlockedArr = Array.isArray(stats?.unlockedPlants) ? stats.unlockedPlants : [];
  const totalPlants = NATIVE_PLANT_DB.filter(p => p.rarity !== 'Starter').length;
  const isMaxUnlocked = unlockedArr.length >= totalPlants;

  const [phase, setPhase] = useState('lobby'); // lobby | quiz | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const generateQuiz = useCallback(() => {
    // Available questions based on unlocked plants
    const available = QUIZ_BANK.filter(q => unlockedArr.includes(q.plant));
    if (available.length === 0) return null;
    // Shuffle and take up to TOTAL_QUESTIONS
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(TOTAL_QUESTIONS, shuffled.length));
  }, [unlockedArr]);

  const startQuiz = () => {
    const qs = generateQuiz();
    if (!qs) return toast('先收集守護靈才能開啟語林試鍊！');
    setQuestions(qs);
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setAnswers([]);
    setShowFeedback(false);
    setPhase('quiz');
  };

  const handleAnswer = (idx) => {
    if (showFeedback) return;
    setSelected(idx);
    setShowFeedback(true);
    const isCorrect = idx === questions[current].answer;
    if (isCorrect) setScore(s => s + 1);
    setAnswers(prev => [...prev, { q: questions[current].q, chosen: idx, correct: questions[current].answer, isCorrect }]);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      // Grant rewards
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

  if (phase === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-white font-chn animate-fadeIn">
        <div className="w-full max-w-sm bg-[#0f172a] border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl" style={{ boxShadow: '0 0 60px rgba(251,191,36,0.1)' }}>
          <div className="text-7xl mb-4">⚔️</div>
          <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase mb-2">Forest Trial</div>
          <h2 className="text-2xl font-black text-white mb-3">語林試鍊</h2>
          <p className="text-stone-400 text-sm leading-relaxed mb-6">
            考驗您對臺灣特有種守護靈的英文生態知識。<br />
            每收集一種守護靈，就解鎖更多題目！
          </p>

          {/* Unlock status */}
          <div className="flex items-center justify-center gap-3 py-4 border-y border-white/5 mb-6">
            <div className="text-left">
              <div className="text-xs text-stone-400 font-bold">已解鎖守護靈</div>
              <div className="text-2xl font-black text-emerald-400">{unlockedArr.length} / {totalPlants}</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-left">
              <div className="text-xs text-stone-400 font-bold">可用題目</div>
              <div className="text-2xl font-black text-amber-400">{Math.min(QUIZ_BANK.filter(q => unlockedArr.includes(q.plant)).length, TOTAL_QUESTIONS)}</div>
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
            onClick={startQuiz}
            disabled={unlockedArr.length === 0}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-stone-900 font-black rounded-2xl shadow-lg transition-all active:scale-95 text-base"
          >
            {unlockedArr.length === 0 ? '🔒 先收集守護靈解鎖試鍊' : '⚔️ 開始語林試鍊'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = questions[current];
    const progress = ((current) / questions.length) * 100;
    return (
      <div className="flex flex-col h-full p-4 text-white font-chn animate-fadeIn max-w-lg mx-auto w-full">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-stone-400 font-bold mb-2">
            <span>第 {current + 1} / {questions.length} 題</span>
            <span className="text-emerald-400">{score} 答對</span>
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
          <p className="text-base font-bold text-white font-eng leading-relaxed">{q.q}</p>
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
                className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] font-eng text-sm ${style}`}
              >
                <span className="font-black text-xs opacity-60 mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
                {opt}
              </button>
            );
          })}
        </div>

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
                  <p className="text-stone-400 font-eng mb-1">{a.q}</p>
                  <p className="text-emerald-400 font-bold">✅ {questions[answers.indexOf(a)]?.options[a.correct]}</p>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setPhase('lobby')} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-95">
            返回語林試鍊大廳
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ForestTrialView;
