import React, { useState, useEffect, useRef } from 'react';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { FORMOSA_MAP_NODES } from '../../../store/useGameStore';
import { toast } from '../../ui/Toast';

const ChroniclesView = () => {
  const { stats, rollDice, earnDice, reviveNode, plantTreeInNode, addEssence } = useGame();
  const { expedition, essence, unlockedPlants } = stats;
  
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showEvent, setShowEvent] = useState(null); // { type, title, content, effect }

  const scrollRef = useRef(null);

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
    
    // Dice Animation delay
    setTimeout(() => {
      const roll = rollDice();
      setLastRoll(roll);
      setIsRolling(false);
      
      // Trigger Random Event if landing on Chance/Fate
      const landedNode = FORMOSA_MAP_NODES[(expedition.currentNode + roll) % FORMOSA_MAP_NODES.length];
      if (landedNode.type === 'chance' || landedNode.type === 'fate') {
        setTimeout(() => triggerRandomEvent(landedNode), 1000);
      }
    }, 800);
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
    const success = reviveNode(nodeIdx);
    if (success) {
      toast(`✨ ${FORMOSA_MAP_NODES[nodeIdx].name} 已恢復往日光彩！`);
      setSelectedNode(null);
    } else {
      toast("❌ 精華能量不足，請繼續學習累積。");
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
            const isRevived = expedition.revivedNodes.includes(idx);
            const plantedTree = expedition.plantedTrees[idx];

            return (
              <div 
                key={idx} 
                id={`node-${idx}`}
                className={`relative flex items-center ${idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse'} transition-all duration-500`}
              >
                {/* Node Circle */}
                <button
                  onClick={() => setSelectedNode(idx)}
                  className={`
                    w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl shadow-xl border-4 transition-all
                    ${isCurrent ? 'scale-125 border-emerald-500 bg-white ring-8 ring-emerald-500/20' : ''}
                    ${isRevived ? 'bg-white border-[#8b7355]' : 'bg-stone-300 border-stone-400 grayscale'}
                  `}
                >
                  {isRevived ? node.emoji : '☁️'}
                  
                  {/* Plant Icon overlay */}
                  {plantedTree && (
                    <div className="absolute -top-2 -right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-md border border-emerald-500 animate-bounce">
                      {NATIVE_PLANT_DB.find(p => p.name === plantedTree)?.emoji}
                    </div>
                  )}
                </button>

                {/* Node Label */}
                <div className={`mx-4 ${idx % 2 === 0 ? 'text-left' : 'text-right'}`}>
                  <h4 className={`font-black font-chn ${isRevived ? 'text-[#5d4037]' : 'text-stone-400'}`}>
                    {isRevived ? node.name : '未知領域'}
                  </h4>
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tighter">
                    {node.region} • {node.type}
                  </p>
                </div>

                {/* Current Indicator */}
                {isCurrent && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
                    📍
                  </div>
                )}
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
      
      {/* Node Details Modal */}
      {selectedNode !== null && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-popup-fade">
            <div className="bg-[#8b7355] p-6 text-white text-center">
              <div className="text-5xl mb-2">{FORMOSA_MAP_NODES[selectedNode].emoji}</div>
              <h3 className="text-2xl font-black font-chn">{FORMOSA_MAP_NODES[selectedNode].name}</h3>
              <p className="text-xs opacity-80 mt-1">{FORMOSA_MAP_NODES[selectedNode].region}</p>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-stone-600 font-chn leading-relaxed mb-6 text-center">
                {FORMOSA_MAP_NODES[selectedNode].description}
              </p>

              {!expedition.revivedNodes.includes(selectedNode) ? (
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                  <h5 className="text-xs font-black text-stone-400 uppercase mb-3 text-center tracking-widest">復興所需精華</h5>
                  <div className="flex justify-around mb-6">
                    {Object.entries(FORMOSA_MAP_NODES[selectedNode].cost || {}).map(([type, amt]) => (
                      <div key={type} className="flex flex-col items-center">
                        <span className="text-xl">{type === 'light' ? '☀️' : type === 'rain' ? '💧' : '🌱'}</span>
                        <span className={`text-sm font-black ${essence[type] >= amt ? 'text-emerald-600' : 'text-red-400'}`}>
                          {essence[type]} / {amt}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleRevive(selectedNode)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-xl transition active:scale-95"
                  >
                    ✨ 啟動復興儀式
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                    <span className="text-emerald-700 font-bold text-sm">✅ 此地已成功復興</span>
                  </div>
                  
                  {/* Planting Section */}
                  <div className="border-t pt-4">
                    <h5 className="text-xs font-black text-stone-400 uppercase mb-3 tracking-widest">守護靈派駐</h5>
                    <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                      {unlockedPlants.map(pName => {
                        const pData = NATIVE_PLANT_DB.find(p => p.name === pName);
                        const isPlanted = expedition.plantedTrees[selectedNode] === pName;
                        return (
                          <button
                            key={pName}
                            onClick={() => handlePlant(selectedNode, pName)}
                            className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all
                              ${isPlanted ? 'bg-emerald-100 border-emerald-500' : 'bg-stone-50 border-stone-200 hover:border-emerald-300'}
                            `}
                          >
                            {pData?.emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setSelectedNode(null)}
                className="w-full mt-4 py-3 text-stone-400 font-bold text-sm"
              >
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}

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

export default ChroniclesView;
