import React from 'react';

const ESSENCE_DATA = [
  {
    icon: '☀️',
    name: '日光精華',
    eng: 'Solar Essence',
    color: 'from-orange-900/60 to-amber-900/40',
    border: 'border-orange-400/30',
    text: 'text-orange-300',
    dot: 'bg-orange-400',
    howToEarn: [
      { icon: '🌱', src: '育苗室：閱讀 AI 文章（每篇 +20）' },
      { icon: '🌳', src: '世界樹：神秘嘉獎（30% 機率 +30）' },
      { icon: '🕊️', src: '隨身口譯：翻譯練習（每次 +5）' },
    ],
    usage: [
      '溫室扭蛋機：召喚守護靈植物',
      '育苗室：解鎖高難度文章功能（未來）',
    ]
  },
  {
    icon: '💧',
    name: '雨露精華',
    eng: 'Rain Essence',
    color: 'from-blue-900/60 to-cyan-900/40',
    border: 'border-blue-400/30',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
    howToEarn: [
      { icon: '🦜', src: '迴音谷：完成對話任務（每場 +10-80）' },
      { icon: '🕊️', src: '隨身口譯：雙向翻譯練習' },
      { icon: '🌳', src: '世界樹：春雨恩典嘉獎（隨機）' },
    ],
    usage: [
      '溫室扭蛋機：召喚守護靈植物',
      '迴音谷：進階情境解鎖（即將推出）',
    ]
  },
  {
    icon: '🌱',
    name: '土壤精華',
    eng: 'Soil Essence',
    color: 'from-emerald-900/60 to-teal-900/40',
    border: 'border-emerald-400/30',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    howToEarn: [
      { icon: '📚', src: '單字本：完成 SRS 複習（每次 +3）' },
      { icon: '⚔️', src: '語林試鍊：答對生態知識題（每題 +8）' },
      { icon: '🔬', src: '標本室：分析文章詞彙' },
    ],
    usage: [
      '溫室扭蛋機：召喚守護靈植物',
      '單字本：強化靈氣淬鍊效果（即將推出）',
    ]
  },
  {
    icon: '🌞',
    name: '太陽金幣',
    eng: 'Sun Coins',
    color: 'from-amber-900/60 to-yellow-900/40',
    border: 'border-amber-400/30',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    howToEarn: [
      { icon: '📖', src: '所有學習活動均可獲得' },
      { icon: '🌳', src: '世界樹：神秘嘉獎 (+15)' },
      { icon: '⚔️', src: '語林試鍊：答對題目（每題 +20）' },
    ],
    usage: [
      '溫室扭蛋機：每次扭蛋花費 100 金幣',
      '育苗室守護靈進化',
    ]
  },
];

const EssenceGuideModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-y-auto max-h-[90dvh] custom-scroll animate-slideUp"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#0f172a] border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
        <div>
          <div className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">語林知識庫</div>
          <h2 className="text-base font-black text-white">🌟 精華系統指南</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-stone-400 hover:text-white transition text-lg"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 pb-6">
        <p className="text-stone-500 text-xs font-bold font-chn leading-relaxed px-1">
          精華是語林之境的核心資源。透過不同的學習活動賺取精華，用於召喚守護靈或強化您的語林力量！
        </p>

        {ESSENCE_DATA.map(e => (
          <div key={e.name} className={`rounded-2xl border bg-gradient-to-br ${e.color} ${e.border} overflow-hidden`}>
            {/* Card Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <span className="text-3xl">{e.icon}</span>
              <div>
                <div className={`font-black text-sm ${e.text}`}>{e.name}</div>
                <div className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">{e.eng}</div>
              </div>
              <div className={`ml-auto w-2.5 h-2.5 rounded-full ${e.dot} shadow-[0_0_8px_rgba(255,255,255,0.4)]`} />
            </div>

            {/* Earn */}
            <div className="px-4 pt-3 pb-2">
              <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">📥 如何獲取</div>
              {e.howToEarn.map((h, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="text-sm shrink-0">{h.icon}</span>
                  <span className="text-xs text-stone-300 font-chn leading-snug">{h.src}</span>
                </div>
              ))}
            </div>

            {/* Usage */}
            <div className="px-4 pt-2 pb-3">
              <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">📤 用途</div>
              {e.usage.map((u, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="text-emerald-400 text-xs shrink-0">›</span>
                  <span className="text-xs text-stone-300 font-chn leading-snug">{u}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="text-center text-[10px] text-stone-600 font-bold pt-2">
          點擊任意空白處關閉此視窗
        </div>
      </div>
    </div>
  </div>
);

export default EssenceGuideModal;
