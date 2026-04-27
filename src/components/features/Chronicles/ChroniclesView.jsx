import React, { useState, useEffect, useRef } from 'react';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { FORMOSA_MAP_NODES } from '../../../store/useGameStore';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { callGemini } from '../../../services/api';
import { toast } from '../../ui/Toast';

const ChroniclesView = () => {
  const { stats, rollDice, earnDice, completeStage1, completeStage3, plantTreeInNode, addEssence } = useGame();
  const { apiKey } = useAuth();
  const { currentLang } = useSettings();

  const DEFAULT_EXPEDITION = { currentNode: 0, diceRemaining: 5, nodeProgress: { 0: { stage: 3, aura: 0 } }, plantedTrees: {} };
  const DEFAULT_ESSENCE = { light: 0, rain: 0, soil: 0 };

  const expedition = stats?.expedition || DEFAULT_EXPEDITION;
  const nodeProgress = expedition.nodeProgress || 
    (expedition.revivedNodes ? Object.fromEntries(expedition.revivedNodes.map(i => [i, { stage: 3, aura: 0 }])) : { 0: { stage: 3, aura: 0 } });
  const essence = stats?.essence || DEFAULT_ESSENCE;
  const unlockedPlants = Array.isArray(stats?.unlockedPlants) ? stats.unlockedPlants : [];

  const getStage = (idx) => nodeProgress[idx]?.stage ?? 0;
  const getAura = (idx) => nodeProgress[idx]?.aura ?? 0;
  
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showEvent, setShowEvent] = useState(null);

  // 🎯 歷史翻譯狀態
  const [historyTranslation, setHistoryTranslation] = useState(null);
  const [transLoading, setTransLoading] = useState(false);

  // 🎯 挑戰系統狀態
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [challengeResult, setChallengeResult] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0, currentQ: 0 });
  const [challengeNode, setChallengeNode] = useState(null);
  const [challengePassed, setChallengePassed] = useState(false);

  const scrollRef = useRef(null);

  // 🤖 翻譯歷史沿革 (自動調度最新模型)
  useEffect(() => {
    if (selectedNode !== null && getStage(selectedNode) === 3 && FORMOSA_MAP_NODES[selectedNode]?.history) {
      const node = FORMOSA_MAP_NODES[selectedNode];
      
      const translateHistory = async () => {
        if (!apiKey) {
          setHistoryTranslation("請在設定中填寫您的 Gemini API Key 以開啟雙語對照。");
          return;
        }

        setTransLoading(true);
        setHistoryTranslation("📜 正在連線至靈力導譯系統...");

        try {
          const langName = currentLang?.name || 'English';
          const prompt = `You are an expert translator. Translate this Traditional Chinese historical text about "${node.name}" into ${langName}. 
          Provide only the plain translation text. No conversational filler.
          
          TEXT: ${node.history}`;
          
          const result = await callGemini(prompt, apiKey, { temperature: 0.3 });
          setHistoryTranslation(result);
        } catch (error) {
          console.error('History translation error:', error);
          setHistoryTranslation(`連線失敗: ${error.message}。請確認網路環境或 API Key 是否正確。`);
        } finally {
          setTransLoading(false);
        }
      };

      const timer = setTimeout(translateHistory, 400);
      return () => clearTimeout(timer);
    } else {
      setHistoryTranslation(null);
      setTransLoading(false);
    }
  }, [selectedNode, apiKey, currentLang]);

  // Auto-scroll to current node
  useEffect(() => {
    if (scrollRef.current) {
      const nodeEl = document.getElementById(`node-${expedition.currentNode}`);
      if (nodeEl) {
        nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [expedition.currentNode]);

  const handleRoll = () => {
    if (expedition.diceRemaining <= 0 || isRolling) return;
    setIsRolling(true);
    setLastRoll(null);
    setTimeout(() => {
      const roll = rollDice();
      setLastRoll(roll);
      setIsRolling(false);
      const newNodeIdx = (expedition.currentNode + roll) % FORMOSA_MAP_NODES.length;
      const landedNode = FORMOSA_MAP_NODES[newNodeIdx];
      const landedStage = getStage(newNodeIdx);
      if (landedNode.type === 'chance' || landedNode.type === 'fate') {
        setTimeout(() => triggerRandomEvent(landedNode), 800);
      } else if ((landedNode.type === 'revival' || landedNode.type === 'final') && landedStage === 0) {
        setTimeout(() => startChallenge(landedNode, 'stage1'), 800);
      } else if ((landedNode.type === 'revival' || landedNode.type === 'final') && landedStage === 2) {
        setTimeout(() => startChallenge(landedNode, 'stage3'), 800);
      } else {
        setTimeout(() => setSelectedNode(newNodeIdx), 800);
      }
    }, 800);
  };

  const startChallenge = async (node, mode = 'stage1') => {
    if (!apiKey) { toast('請先在設定中填寫 Gemini API Key'); return; }
    setChallengeLoading(true);
    setChallengeNode({ ...node, mode });
    setChallengePassed(false);
    setScore({ correct: 0, total: 0, currentQ: 0 });
    setSelectedAnswer(null);
    setChallengeResult(null);
    const qCount = mode === 'stage3' ? 5 : 3;
    const prompt = `You are a quiz teacher for a Taiwan language learning game. Create ${qCount} questions about the Taiwan landmark "${node.name}" in ${node.region}. Each must have: a question about local vocabulary or culture, 4 options (only 1 correct), answer index (0-3), and a brief Chinese explanation. Return ONLY this JSON array: [{"q":"question","opts":["A","B","C","D"],"ans":0,"exp":"explanation"}]`;
    try {
      const result = await callGemini(prompt, apiKey, { temperature: 0.9 });
      const jsonStr = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].q) {
        setChallenge(parsed);
      } else {
        throw new Error('Invalid JSON structure');
      }
    } catch (e) {
      console.warn('Challenge generation fell back to default:', e.message);
      setChallenge(FALLBACK_QUESTIONS(node.name));
    } finally {
      setChallengeLoading(false);
    }
  };

  const handleAnswer = (optIdx) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(optIdx);
    const isCorrect = optIdx === challenge[score.currentQ].ans;
    setChallengeResult(isCorrect ? 'correct' : 'wrong');
    setScore(s => ({ ...s, correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    if (isCorrect) addEssence('light', 20);
  };

  const handleNextQuestion = () => {
    const nextQ = score.currentQ + 1;
    if (nextQ >= challenge.length) {
      const finalCorrect = score.correct + (challengeResult === 'correct' ? 1 : 0);
      const mode = challengeNode?.mode;
      const passThreshold = mode === 'stage3' ? 4 : 2;
      const passed = finalCorrect >= passThreshold;
      setChallengePassed(passed);
      const nodeIdx = FORMOSA_MAP_NODES.findIndex(n => n.name === challengeNode?.name);
      if (passed) {
        if (mode === 'stage1') {
          completeStage1(nodeIdx);
          toast(`Stage 1 unlocked! Keep learning to fill the aura.`);
          earnDice(1);
        } else if (mode === 'stage3') {
          const ok = completeStage3(nodeIdx);
          if (ok) { toast(`${challengeNode?.name} fully revived!`); earnDice(3); }
          else { toast('Not enough essence for the revival ritual!'); }
        }
      } else {
        toast(`${finalCorrect}/${challenge.length} correct. Keep trying! +1 dice`);
        earnDice(1);
      }
      setScore(s => ({ ...s, currentQ: -1, correct: finalCorrect }));
    } else {
      setScore(s => ({ ...s, currentQ: nextQ }));
      setSelectedAnswer(null);
      setChallengeResult(null);
    }
  };

  const closeChallenge = () => {
    if (challengePassed) {
      const nodeIdx = FORMOSA_MAP_NODES.findIndex(n => n.name === challengeNode?.name);
      if (nodeIdx >= 0) setSelectedNode(nodeIdx);
    }
    setChallenge(null); setChallengeNode(null);
    setSelectedAnswer(null); setChallengeResult(null);
    setChallengePassed(false);
  };

  const triggerRandomEvent = (node) => {
    const isChance = node.type === 'chance';
    const events = isChance ? CHANCE_EVENTS : FATE_EVENTS;
    const event = events[Math.floor(Math.random() * events.length)];
    
    setShowEvent({ ...event, nodeName: node.name });
    
    // Apply effect
    if (event.effect.dice) earnDice(event.effect.dice);
    if (event.effect.essence) {
      Object.entries(event.effect.essence).forEach(([type, amt]) => addEssence(type, amt));
    }
  };

  const handleRevive = (nodeIdx) => {
    const success = completeStage3(nodeIdx);
    if (success) {
      toast(`${FORMOSA_MAP_NODES[nodeIdx].name} fully revived!`);
      setSelectedNode(null);
    } else {
      toast('Not enough essence!');
    }
  };

  const handlePlant = (nodeIdx, plantName) => {
    const success = plantTreeInNode(nodeIdx, plantName);
    if (success) {
      toast(`🌳 已將 ${plantName} 派駐守護此地。`);
      setSelectedNode(null);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-[#f4f1ea] rounded-3xl border-4 border-[#8b7355] shadow-2xl animate-fadeIn">
      
      {/* ── Header ── */}
      <div className="bg-gradient-to-b from-[#8b7355] to-[#6d5a43] p-4 text-white shadow-md z-20 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black font-chn tracking-wider">福爾摩沙遠征</h2>
          <p className="text-[10px] opacity-70">復興這座美麗島嶼的所有風景</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-black/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            🎲 {expedition.diceRemaining}
          </div>
        </div>
      </div>

      {/* ── Vertical Scroll Map ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar relative p-8 pb-32">
        {/* Winding Path SVG (Conceptual) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-[#8b7355]/20 border-l-2 border-dashed border-[#8b7355]/40"></div>

        <div className="flex flex-col gap-24 relative z-10">
          {FORMOSA_MAP_NODES.map((node, idx) => {
            const isCurrent = expedition.currentNode === idx;
            const stage = getStage(idx);
            const aura = getAura(idx);
            const plantedTree = expedition.plantedTrees?.[idx] || expedition.plantedTrees?.[String(idx)];
            const auraReq = node.auraRequired || 0;
            const auraPercent = auraReq > 0 ? Math.round((aura / auraReq) * 100) : 0;
            const nodeEmoji = stage === 3 ? node.emoji : stage === 2 ? '✨' : stage === 1 ? '🌫️' : '☁️';
            const circleStyle = stage === 3 ? 'bg-white border-[#8b7355]'
              : stage === 2 ? 'bg-amber-50 border-amber-500'
              : stage === 1 ? 'bg-stone-100 border-stone-400'
              : 'bg-stone-200 border-stone-300 grayscale opacity-50';
            return (
              <div key={idx} id={`node-${idx}`}
                className={`relative flex items-center ${idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse'} transition-all duration-500`}>
                <div className="relative flex-shrink-0">
                  <button onClick={() => setSelectedNode(idx)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl shadow-xl border-4 transition-all ${circleStyle} ${isCurrent ? 'scale-125 border-emerald-500 bg-white ring-8 ring-emerald-500/20' : ''}`}>
                    {nodeEmoji}
                  </button>
                  {plantedTree && stage === 3 && (
                    <div className="absolute -top-2 -right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-md border-2 border-emerald-500">
                      {NATIVE_PLANT_DB.find(p => p.name === plantedTree)?.emoji || '🌿'}
                    </div>
                  )}
                </div>
                <div className={`mx-4 flex-1 min-w-0 ${idx % 2 === 0 ? 'text-left' : 'text-right'}`}>
                  <h4 className={`font-black font-chn text-sm ${stage >= 1 ? 'text-[#5d4037]' : 'text-stone-300'}`}>
                    {stage >= 1 ? node.name : '未知領域'}
                  </h4>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter mb-1">
                    {stage === 3 ? '✅ Revived' : stage === 2 ? '⚡ Aura Full' : stage === 1 ? `🌫️ Aura ${auraPercent}%` : '🔒 Unexplored'}
                  </p>
                  {(stage === 1 || stage === 2) && auraReq > 0 && (
                    <div className={`h-1.5 rounded-full overflow-hidden w-20 ${idx % 2 !== 0 ? 'ml-auto' : ''}`} style={{background:'#e5e7eb'}}>
                      <div className={`h-full rounded-full transition-all duration-500 ${stage === 2 ? 'bg-amber-500' : 'bg-emerald-400'}`}
                        style={{width:`${auraPercent}%`}} />
                    </div>
                  )}
                </div>
                {isCurrent && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-bounce">📍</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dice Control Panel ── */}
      <div className="absolute bottom-6 left-0 w-full px-8 z-30 pointer-events-none">
        <div className="max-w-xs mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border-2 border-[#8b7355] flex items-center justify-between pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-stone-400 uppercase">Last Roll</span>
            <span className="text-2xl font-black text-[#8b7355]">{lastRoll || '-'}</span>
          </div>
          
          <button
            onClick={handleRoll}
            disabled={isRolling || expedition.diceRemaining <= 0}
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all active:scale-90 shadow-lg border-b-4
              ${isRolling ? 'bg-stone-100 border-stone-300' : 'bg-emerald-500 border-emerald-700 text-white hover:bg-emerald-400'}
              ${expedition.diceRemaining <= 0 ? 'grayscale opacity-50' : ''}
            `}
          >
            {isRolling ? '⏳' : '🎲'}
          </button>

          <div className="text-right">
            <span className="text-[10px] font-black text-stone-400 uppercase">Dice</span>
            <div className="text-xl font-black text-emerald-600">{expedition.diceRemaining}</div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      
      {selectedNode !== null && FORMOSA_MAP_NODES[selectedNode] && (() => {
        const sNode = FORMOSA_MAP_NODES[selectedNode];
        const sStage = getStage(selectedNode);
        const sAura = getAura(selectedNode);
        const auraReq = sNode.auraRequired || 0;
        const auraPercent = auraReq > 0 ? Math.round((sAura / auraReq) * 100) : 100;
        return (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-popup-fade">
              <div className={`p-6 text-white text-center ${sStage === 3 ? 'bg-[#8b7355]' : sStage === 2 ? 'bg-amber-600' : 'bg-stone-500'}`}>
                <div className="text-5xl mb-2">{sStage >= 1 ? sNode.emoji : '☁️'}</div>
                <h3 className="text-2xl font-black font-chn">{sStage >= 1 ? sNode.name : 'Unknown Region'}</h3>
                <p className="text-xs opacity-80 mt-1">{sNode.region} • {sStage === 3 ? '✅ Fully Revived' : sStage === 2 ? '⚡ Aura Full — Ready for Final Trial' : sStage === 1 ? `🌫️ Aura ${auraPercent}%` : '🔒 Unexplored'}</p>
              </div>
                <div className="p-6">
                <p className="text-sm text-stone-600 font-chn leading-relaxed mb-4 text-center">{sNode.description}</p>
                {(sStage === 1 || sStage === 2) && auraReq > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-stone-400 mb-1"><span>靈氣進度</span><span>{sAura}/{auraReq}</span></div>
                    <div className="h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                      <div className={`h-full rounded-full transition-all duration-700 ${sStage === 2 ? 'bg-amber-500' : 'bg-emerald-400'}`} style={{width:`${auraPercent}%`}} />
                    </div>
                    <p className="text-xs text-stone-400 mt-2 text-center">{sStage === 1 ? '在其他模式學習來累積靈氣' : '靈氣已滿！擲骰子到達此地開始終極試煉'}</p>
                  </div>
                )}
                {sStage === 2 && Object.keys(sNode.finalCost || {}).length > 0 && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-4">
                    <h5 className="text-xs font-black text-amber-700 uppercase mb-3 text-center tracking-widest">試煉所需精華</h5>
                    <div className="flex justify-around">
                      {Object.entries(sNode.finalCost).map(([type, amt]) => (
                        <div key={type} className="flex flex-col items-center">
                          <span className="text-xl">{type === 'light' ? '☀️' : type === 'rain' ? '💧' : '🌱'}</span>
                          <span className={`text-sm font-black ${(essence[type]||0) >= amt ? 'text-emerald-600' : 'text-red-400'}`}>{essence[type]||0}/{amt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sStage === 3 && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                      <span className="text-emerald-700 font-bold text-sm">✅ 完全復興</span>
                    </div>

                    {/* 📜 歷史沿革區塊 */}
                    {sNode.history && (
                      <div className="bg-[#fdf6e3] p-4 rounded-2xl border border-[#eee8d5] shadow-inner relative overflow-hidden flex flex-col gap-3">
                        <div className="absolute -right-2 -bottom-2 opacity-10 text-4xl">📜</div>
                        
                        <div>
                          <h5 className="text-[10px] font-black text-[#8b7355] uppercase mb-1.5 flex items-center gap-1 tracking-widest">
                            <span className="w-1 h-1 bg-[#8b7355] rounded-full"></span>
                            中文介紹
                          </h5>
                          <p className="text-xs text-[#5d4037] font-chn leading-relaxed">
                            {sNode.history}
                          </p>
                        </div>

                        <div className="border-t border-[#8b7355]/10 pt-3">
                          <h5 className="text-[10px] font-black text-emerald-600 uppercase mb-1.5 flex items-center gap-1 tracking-widest">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                            {currentLang?.name || '外文對照'}
                          </h5>
                          {transLoading ? (
                            <div className="flex gap-1 py-1">
                              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                          ) : (
                            <p className="text-xs text-stone-600 leading-relaxed font-medium">
                              {historyTranslation || '無法取得翻譯。'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {unlockedPlants.length > 0 && (
                      <div className="border-t pt-3">
                        <h5 className="text-xs font-black text-stone-400 uppercase mb-3 tracking-widest">守護靈派駐</h5>
                        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                          {unlockedPlants.map(pName => {
                            const pData = NATIVE_PLANT_DB.find(p => p.name === pName);
                            const isPlanted = expedition.plantedTrees?.[selectedNode] === pName || expedition.plantedTrees?.[String(selectedNode)] === pName;
                            return (
                              <button key={pName} onClick={() => handlePlant(selectedNode, pName)}
                                className={`shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all p-1 ${isPlanted ? 'bg-emerald-100 border-emerald-500' : 'bg-stone-50 border-stone-200 hover:border-emerald-300'}`}>
                                <span className="text-2xl">{pData?.emoji}</span>
                                <span className="text-[8px] text-stone-400 font-bold">{pName.slice(0,3)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {sStage === 0 && (
                  <div className="bg-stone-50 rounded-2xl p-4 text-center border border-stone-100">
                    <p className="text-stone-400 text-sm">擲骰子到達此地開始喚醒過程</p>
                  </div>
                )}
                <button onClick={() => setSelectedNode(null)} className="w-full mt-4 py-3 text-stone-400 font-bold text-sm">關閉視窗</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Random Event Modal */}
      {showEvent && (
        <div className="absolute inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] border-t-8 border-emerald-500 animate-popup-fade">
            <div className="text-6xl mb-6">{showEvent.type === 'chance' ? '🍀' : '⚖️'}</div>
            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">
              {showEvent.type} @ {showEvent.nodeName}
            </div>
            <h3 className="text-2xl font-black text-stone-800 mb-4">{showEvent.title}</h3>
            <p className="text-sm text-stone-500 leading-relaxed mb-8 font-chn">
              {showEvent.content}
            </p>
            
            <div className="bg-stone-50 rounded-2xl p-4 mb-8">
              <span className="text-xs font-bold text-stone-400 uppercase">獲得獎勵 / 效果</span>
              <div className="text-emerald-600 font-black mt-1">
                {showEvent.effect.dice && `🎲 +${showEvent.effect.dice} 骰子`}
                {showEvent.effect.essence && Object.entries(showEvent.effect.essence).map(([k,v]) => ` ${k === 'light' ? '☀️' : k === 'rain' ? '💧' : '🌱'} +${v}`)}
              </div>
            </div>

            <button
              onClick={() => setShowEvent(null)}
              className="w-full py-4 bg-[#0f172a] text-white font-black rounded-2xl shadow-xl active:scale-95 transition"
            >
              接受命運
            </button>
          </div>
        </div>
      )}

      {/* 🎯 AI 挑戰加載中 */}
      {challengeLoading && (
        <div className="absolute inset-0 z-50 bg-[#0f172a]/95 flex flex-col items-center justify-center gap-6 animate-fadeIn">
          <div className="text-6xl animate-bounce">{challengeNode?.emoji}</div>
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-white font-black text-lg">{challengeNode?.name}</p>
            <p className="text-emerald-400 text-sm mt-1">守護者正在出題中...</p>
          </div>
        </div>
      )}

      {/* 🎯 AI 挑戰題目模態 */}
      {challenge && !challengeLoading && (
        <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-popup-fade">
            
            {/* 標題列 */}
            <div className="bg-gradient-to-r from-[#8b7355] to-[#5d4037] p-5 text-white">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black uppercase tracking-widest opacity-70">守護者試煉</span>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  {score.currentQ >= 0 ? `${score.currentQ + 1} / ${challenge.length}` : '完成'}
                </span>
              </div>
              <h3 className="text-lg font-black">{challengeNode?.emoji} {challengeNode?.name}</h3>
              {/* 分數寬度條 */}
              <div className="flex gap-1.5 mt-3">
                {challenge.map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                    i < score.currentQ ? 'bg-emerald-400' :
                    i === score.currentQ && score.currentQ >= 0 ? 'bg-white' : 'bg-white/20'
                  }`}/>
                ))}
              </div>
            </div>

            <div className="p-5">
              {score.currentQ >= 0 ? (
                // 題目視圖
                <>
                  <p className="text-stone-800 font-bold text-base leading-relaxed mb-5 font-chn">
                    {challenge[score.currentQ]?.q}
                  </p>
                  <div className="flex flex-col gap-2.5 mb-4">
                    {challenge[score.currentQ]?.opts?.map((opt, i) => {
                      let btnStyle = 'bg-stone-50 border-2 border-stone-200 text-stone-700 hover:border-emerald-400';
                      if (selectedAnswer !== null) {
                        if (i === challenge[score.currentQ].ans) btnStyle = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-black';
                        else if (i === selectedAnswer && i !== challenge[score.currentQ].ans) btnStyle = 'bg-red-50 border-2 border-red-400 text-red-700';
                        else btnStyle = 'bg-stone-50 border-2 border-stone-100 text-stone-400 opacity-60';
                      }
                      return (
                        <button key={i} onClick={() => handleAnswer(i)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-98 ${btnStyle}`}>
                          <span className="font-black mr-2 text-stone-400">{['A','B','C','D'][i]}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {selectedAnswer !== null && (
                    <div className={`rounded-xl p-3 mb-4 text-sm font-chn ${
                      challengeResult === 'correct' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <span className="font-black">{challengeResult === 'correct' ? '✅ 正確！' : '❌ 答錯了'}</span>
                      <span className="ml-2">{challenge[score.currentQ]?.exp}</span>
                    </div>
                  )}
                  {selectedAnswer !== null && (
                    <button onClick={handleNextQuestion}
                      className="w-full py-3.5 bg-[#5d4037] hover:bg-[#4e342e] text-white font-black rounded-xl transition active:scale-95 text-sm">
                      {score.currentQ + 1 >= challenge.length ? '查看結果' : '下一題 →'}
                    </button>
                  )}
                </>
              ) : (
                // 結果視圖
                <div className="text-center py-4">
                  <div className="text-6xl mb-4">{score.correct >= 2 ? '🏆' : '🌱'}</div>
                  <h4 className="text-2xl font-black text-stone-800 mb-2">
                    {score.correct >= 2 ? '挑戰通過！' : '繼續努力！'}
                  </h4>
                  <p className="text-stone-500 text-sm mb-6 font-chn">
                    {score.correct >= 2
                      ? `答對 ${score.correct}/3 題！${challengeNode?.name}等待您復興。獲得 2 顆骰子 🎲`
                      : `答對 ${score.correct}/3 題，繼續學習就能通過！獲得 1 顆骰子 🎲`
                    }
                  </p>
                  <div className="flex gap-2 justify-center mb-6">
                    {Array.from({length: challenge.length}).map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full ${i < score.correct ? 'bg-emerald-500' : 'bg-stone-200'}`}/>
                    ))}
                  </div>
                  <button onClick={closeChallenge}
                    className={`w-full py-4 text-white font-black rounded-xl transition active:scale-95 ${
                      score.correct >= 2 ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-[#8b7355] hover:bg-[#6d5a43]'
                    }`}>
                    {score.correct >= 2 ? '前往復興 →' : '關閉視窗'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const CHANCE_EVENTS = [
  { type: 'chance', title: '山靈的餽贈', content: '你在霧中偶遇了古老的山靈，他被你的求知欲感動，贈與你額外的行動力。', effect: { dice: 2 } },
  { type: 'chance', title: '清晨的甘露', content: '昨夜的一場小雨讓森林煥然一新，你收集到了純淨的雨露精華。', effect: { essence: { rain: 50 } } },
  { type: 'chance', title: '暖陽普照', content: '雲層散去，和煦的陽光灑在長卷上，你的日光能量獲得了提升。', effect: { essence: { light: 50 } } }
];

const FATE_EVENTS = [
  { type: 'fate', title: '迷失之霧', content: '一場濃霧遮住了路標，你被迫多繞了一些路，但也發現了肥沃的土壤。', effect: { essence: { soil: 30 } } },
  { type: 'fate', title: '古道的考驗', content: '路徑變得崎嶇不平，你需要消耗更多體力前進，但也磨練了意志。', effect: { dice: 1 } },
  { type: 'fate', title: '守護者的共鳴', content: '你聽到了大地的低語，體內的各種精華開始產生共鳴。', effect: { essence: { light: 20, rain: 20, soil: 20 } } }
];

const FALLBACK_QUESTIONS = (locationName) => [
  { q: `「${locationName}」所在的台灣，英文名稱是什麼？`, opts: ['Taiwan', 'Thailand', 'Tahiti', 'Tainan'], ans: 0, exp: 'Taiwan 是台灣最通用的英文名稱，源自葡萄牙語 Formosa。' },
  { q: `在台灣景點旅遊時，「入口」的英文是哪個？`, opts: ['Exit', 'Entrance', 'Restroom', 'Parking'], ans: 1, exp: 'Entrance 是入口，Exit 是出口，兩者常見於各大景點指示牌。' },
  { q: `台灣被葡萄牙人譽為哪個美麗的稱號？`, opts: ['Pearl of Asia', 'Beautiful Island', 'Isle of Gold', 'Jade Island'], ans: 1, exp: '葡萄牙語 Ilha Formosa 意為 Beautiful Island（美麗之島），這也是台灣的古名 Formosa 的由來。' }
];

export default ChroniclesView;
