import React from 'react';

// Per-feature help content
export const FEATURE_HELP = {
  topic: {
    title: '🌱 育苗室',
    subtitle: 'AI Nursery — 閱讀培育',
    color: 'from-emerald-900/80 to-teal-900/60',
    border: 'border-emerald-500/30',
    steps: [
      { icon: '✏️', title: '輸入主題', desc: '在文字框輸入任何感興趣的主題，例如「台灣夜市」、「火星」、「科技創新」' },
      { icon: '📊', title: '選擇難度', desc: 'A1（入門）→ C1（高級），建議從 B1 開始，每週提升半個等級' },
      { icon: '🪄', title: '生成文章', desc: 'AI 在 10 秒內生成一篇量身定制的雙語文章' },
      { icon: '💡', title: '點亮生詞', desc: '點擊文章中不認識的單字，直接加入單字本儲存' },
      { icon: '🌿', title: '守護靈故事', desc: '切換到「守護靈故事」分頁，收集守護靈後可閱讀獨家英文生態探索文章' },
    ],
    tip: '💡 每篇文章閱讀可獲得 +20 日光精華。難度越高，獎勵越多！'
  },
  speak: {
    title: '🦜 迴音谷',
    subtitle: 'AI Coach — 口說練習',
    color: 'from-violet-900/80 to-indigo-900/60',
    border: 'border-violet-500/30',
    steps: [
      { icon: '🎭', title: '選擇情境', desc: '從 18 個真實情境中選擇，例如咖啡廳點餐、英文面試、海關問答' },
      { icon: '🎙️', title: '點擊麥克風', desc: '說出您的回應，語音自動轉文字送出給 AI' },
      { icon: '💡', title: '教練建議', desc: '若您的句子有文法錯誤，AI 會立即在您的訊息下方顯示黃色「Coach Tip」，並附上 🔊 朗讀按鈕' },
      { icon: '🆘', title: '緊急求救', desc: '看不懂對方說什麼？點擊右上角紅色「🆘 求救」，教練立即解析並給提示' },
      { icon: '📊', title: '退出查看報告', desc: '點擊「退出」時，自動生成本場對話的課後體檢報告，並獲得雨露精華獎勵' },
    ],
    tip: '🎯 點擊建議回覆（藍框選項）→ 錄音評分功能，可獲得逐字發音分析！'
  },
  explore: {
    title: '🌳 世界樹',
    subtitle: 'World Tree — 每日精華獲取',
    color: 'from-teal-900/80 to-emerald-900/60',
    border: 'border-teal-500/30',
    steps: [
      { icon: '✨', title: '每日點擊', desc: '進入後點擊世界樹，觸發每日共鳴儀式' },
      { icon: '📜', title: '智慧小語（70%）', desc: '從 Google Sheets 隨機抽取一則名言，點選「分析並學習」可送入標本室深度解析' },
      { icon: '🎁', title: '神秘嘉獎（30%）', desc: '隨機獲得日光/雨露/大地精華 +30 及金幣 +15' },
      { icon: '🌿', title: '世界樹成長', desc: '收集越多守護靈植物，世界樹就越雄偉。集滿11種達到「語林聖樹」傳說等級！' },
    ],
    tip: '🌟 達到「神木覺醒」等級後，點擊獎勵會自動翻倍！'
  },
  vocab: {
    title: '📚 靈氣單字本',
    subtitle: 'SRS Vocab — 科學記憶複習',
    color: 'from-blue-900/80 to-cyan-900/60',
    border: 'border-blue-500/30',
    steps: [
      { icon: '📥', title: '從文章加入單字', desc: '在育苗室或標本室閱讀時，點擊生詞即可加入單字本' },
      { icon: '🃏', title: '翻面練習', desc: '看到單字 → 想想意思 → 翻面確認。點「記得」或「忘了」記錄結果' },
      { icon: '⏰', title: 'SRS 間隔系統', desc: '記得的單字下次複習間距拉長（1→3→7→14→30天），忘了的立刻重練' },
      { icon: '🔮', title: '靈氣淬鍊', desc: '完成複習可消耗精華強化「靈氣等級」，提升記憶鞏固效果' },
    ],
    tip: '📅 建議每天複習所有「今日到期」的單字，保持學習曲線最優化！'
  },
  paste: {
    title: '🔬 標本室',
    subtitle: 'Specimen — 文本深度分析',
    color: 'from-rose-900/80 to-pink-900/60',
    border: 'border-rose-500/30',
    steps: [
      { icon: '📋', title: '貼入文字', desc: '複製任何英文文章、電影台詞、社群貼文貼到輸入框' },
      { icon: '🤖', title: 'AI 解剖分析', desc: 'AI 自動分析詞彙難度、語法結構，標出值得學習的關鍵字' },
      { icon: '💡', title: '點選詞彙', desc: '點擊任何高亮單字，查看翻譯 + 發音 + 例句' },
      { icon: '📚', title: '送入單字本', desc: '找到有趣的單字？一鍵加入靈氣單字本！' },
    ],
    tip: '🔗 從世界樹的「智慧小語」點擊「分析此句」，可直接跳轉到標本室！'
  },
  translate: {
    title: '🕊️ 隨身口譯',
    subtitle: 'Translator — 即時雙向翻譯',
    color: 'from-sky-900/80 to-blue-900/60',
    border: 'border-sky-500/30',
    steps: [
      { icon: '🌐', title: '語言切換', desc: '選擇「中→英」或「英→中」（或其他語言組合）翻譯方向' },
      { icon: '🎙️', title: '語音輸入', desc: '按麥克風直接說話，語音轉文字後自動翻譯' },
      { icon: '⌨️', title: '文字輸入', desc: '也可以直接在輸入框打字，點送出翻譯' },
      { icon: '🔊', title: '朗讀翻譯結果', desc: '點擊譯文旁的 🔊 按鈕，聆聽正確發音' },
    ],
    tip: '🚀 此功能讓您在旅遊時直接用於溝通，或在育苗室遇到難詞時快速查詢！'
  },
  chronicles: {
    title: '📜 福爾摩沙長卷',
    subtitle: 'Chronicles — 圖鑑收集進度',
    color: 'from-stone-800/80 to-stone-900/60',
    border: 'border-stone-500/30',
    steps: [
      { icon: '🗺️', title: '查看圖鑑', desc: '長卷記錄您所有已收集的臺灣特有種守護靈植物' },
      { icon: '🌿', title: '收集守護靈', desc: '前往「溫室扭蛋機」，用金幣扭蛋召喚守護靈' },
      { icon: '🌟', title: '里程碑獎勵', desc: '每達到一個收集里程碑（2、5、8、11種），解鎖特殊稱號與獎勵' },
      { icon: '📖', title: '守護靈傳說', desc: '點擊已解鎖的守護靈，閱讀牠的語林故事傳說' },
    ],
    tip: '🎯 集滿11種守護靈，世界樹升至「語林聖樹」傳說等級，並解鎖語林試鍊全題庫！'
  },
  trial: {
    title: '⚔️ 語林試鍊',
    subtitle: 'Forest Trial — 生態知識問答',
    color: 'from-red-900/80 to-orange-900/60',
    border: 'border-red-500/30',
    steps: [
      { icon: '🔓', title: '解鎖題目', desc: '收集守護靈後，每種守護靈解鎖 1-2 道對應的英文生態知識題' },
      { icon: '📝', title: '作答', desc: '閱讀英文題目，從4個選項中選出正確答案' },
      { icon: '✅', title: '即時回饋', desc: '選完立即顯示正確答案，若答錯會標出正確選項' },
      { icon: '🏆', title: '完賽獎勵', desc: '每題答對 +20 金幣 + +8 土壤精華，完成全場後查看錯題整理' },
    ],
    tip: '📚 每完成一種守護靈的生態故事閱讀，回來試鍊時對應題目的正確率會大幅提升！'
  },
};

const FeatureHelpModal = ({ featureKey, onClose }) => {
  const help = FEATURE_HELP[featureKey];
  if (!help) return null;

  return (
    <div
      className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full sm:max-w-md bg-gradient-to-b ${help.color} border ${help.border} rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[88dvh] custom-scroll animate-slideUp`}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-black text-white">{help.title}</h2>
            <p className="text-xs text-white/40 font-bold">{help.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3 p-5">
          <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">📖 操作步驟</div>
          {help.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5">
              <div className="shrink-0 w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-base">
                {step.icon}
              </div>
              <div>
                <div className="font-black text-white text-sm mb-0.5">{step.title}</div>
                <div className="text-white/60 text-xs leading-relaxed font-chn">{step.desc}</div>
              </div>
            </div>
          ))}

          {/* Pro Tip */}
          <div className="mt-2 bg-white/5 border border-white/15 rounded-2xl p-4">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">✦ 進階技巧</div>
            <p className="text-white/70 text-xs leading-relaxed font-chn">{help.tip}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition active:scale-95 text-sm mt-1"
          >
            了解了，開始使用！
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureHelpModal;
