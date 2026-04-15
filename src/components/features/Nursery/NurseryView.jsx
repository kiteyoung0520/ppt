import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { toast } from '../../ui/Toast';

// ── Plant-specific unlocked articles ────────────────────────────────
// Language label shown in UI hints
const LANG_LABEL = { English: '英文', Japanese: '日文', Korean: '韓文' };

const LENGTH_OPTIONS = [
  { id: 'short', label: '短篇', prompt: 'Short (approx. 100-150 words)' },
  { id: 'medium', label: '中篇', prompt: 'Medium (approx. 250-300 words)' },
  { id: 'long', label: '長篇', prompt: 'Long (approx. 450-500 words)' },
];

const PLANT_ARTICLES = {
  '馬鞍藤': {
    topic: "Taiwan's Coastal Warrior: The Beach Morning Glory",
    getPrompt: (lang) => `You are writing a B1-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: The Beach Morning Glory (Ipomoea pes-caprae), known in Taiwan as "Ma-An Vine" (馬鞍藤). Cover: its role in protecting Taiwan's coastal ecosystems from erosion, its distinctive saddle-shaped leaves, its status as a pioneer species, and why it is endemic to this region.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🌱', desc: '海岸生態系守護者的生態故事'
  },
  '紫金牛': {
    topic: 'Secrets of the Forest Floor: Ardisia crenata',
    getPrompt: (lang) => `You are writing a B1-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: Ardisia crenata (紫金牛), a shade-loving shrub found in Taiwan's lowland forests. Cover: its bright red berries, its life in the understory beneath the forest canopy, its role in biodiversity, and its traditional uses in Taiwan.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🌿', desc: '低海拔森林秘密的生態揭秘'
  },
  '台灣欒樹': {
    topic: "Taiwan's Four-Season Tree: The Chinese Flame Tree",
    getPrompt: (lang) => `You are writing a B2-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: The Taiwan Flame Tree (Koelreuteria henryi, 台灣欒樹). Cover: how its appearance transforms dramatically through all four seasons — green leaves in spring, golden flower clusters in summer, vivid red seed pods in autumn, and bare branches in winter — and its connection to Taiwan's cultural identity and urban landscapes.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🌳', desc: '台灣四季彩色樹的探索'
  },
  '山櫻花': {
    topic: "The Pink Messenger: Taiwan's Cherry Blossom",
    getPrompt: (lang) => `You are writing a B1-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: Taiwan's wild cherry blossoms (Prunus campanulata, 山櫻花). Cover: how they differ from Japan's Sakura, their deep significance in the cultural traditions of the indigenous Atayal people, and the best mountain locations for viewing them.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🌸', desc: '台灣山櫻花文化的詩篇'
  },
  '台灣百合': {
    topic: "The Lily of the Peaks: Taiwan's National Flower Candidate",
    getPrompt: (lang) => `You are writing a B2-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: The Taiwan Lily (Lilium formosanum, 台灣百合). Cover: how it grows on sheer mountain cliffs and rocky slopes, its symbolism of purity and resilience in Taiwanese culture, the threats it faces from over-collection, and current conservation efforts protecting its habitat.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '💮', desc: '高山百合精神的傳說'
  },
  '水筆仔': {
    topic: "Walking Trees: Taiwan's Mangrove Marvels",
    getPrompt: (lang) => `You are writing a B1-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: Taiwan's mangroves (Kandelia obovata, 水筆仔). Cover: their extraordinary viviparous reproduction (seeds that germinate while still attached to the parent tree), life in the tidal zone, the Tamsui Mangrove Reserve, and why mangrove forests are called "nurseries of the sea" for marine biodiversity.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🎋', desc: '胎生奇蹟紅樹林的科學'
  },
  '愛玉子': {
    topic: "Taiwan's Magical Jelly: The Story of Aiyu",
    getPrompt: (lang) => `You are writing a B1-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: Aiyu jelly fig (愛玉子, Ficus pumila var. awkeotsang), a plant endemic only to Taiwan. Cover: the extraordinary hand-washing process of its seeds to create the cooling jelly drink, its central role in traditional Taiwanese street food culture, and why it cannot be found growing naturally anywhere else in the world.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🍃', desc: '全球唯一愛玉子的傳奇'
  },
  '牛樟': {
    topic: "The Forest King: Taiwan's Sacred Cow Camphor",
    getPrompt: (lang) => `You are writing a C1-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: Taiwan's Cow Camphor tree (Cinnamomum kanehirae, 牛樟). Cover: its status as one of Taiwan's most precious and critically endangered trees, the devastating illegal logging crisis driven by demand for the rare medicinal Agrocybe chaxingu mushroom that grows on it, and the complex interplay between conservation law and traditional medicine culture.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🪵', desc: '瀕危森林王者的史詩'
  },
  '台灣肖楠': {
    topic: "Wisdom in Wood: Taiwan's Incense Cedar",
    getPrompt: (lang) => `You are writing a B2-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: Taiwan's Incense Cedar (Calocedrus macrolepis var. formosana, 台灣肖楠). Cover: its historical designation as one of Taiwan's five sacred trees during the Qing Dynasty, its distinctive aromatic scent, its revered role in traditional woodworking and craftsmanship, and the conservation programs slowly restoring its population today.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🌲', desc: '台灣五木之一的傳承'
  },
  '紅檜': {
    topic: "Ancient Giants: Taiwan's Sacred Red Cypress",
    getPrompt: (lang) => `You are writing a C1-level ecology article. The ENTIRE article MUST be written in ${lang} only — do NOT mix in any other language.

Topic: Taiwan's Red Cypress (Chamaecyparis formosensis, 紅檜). Cover: how some trees have survived for over 2,300 years, the devastating scale of logging during the Japanese colonial era at Alishan, the deep ecological and spiritual significance of these ancient trees to Taiwan's indigenous peoples, and the ongoing 21st-century fight for their preservation.

Output ONLY the article body text. No title, no markdown, no bullet points.`,
    emoji: '🌲', desc: '千年紅檜精神的頌歌'
  },
};

const NurseryView = ({ onStartReading }) => {
  const { currentLang } = useSettings();
  const { stats } = useGame();
  
  const currentPlantInfo = NATIVE_PLANT_DB.find(p => p.name === (stats?.currentPlant || '黃花風鈴木')) || NATIVE_PLANT_DB[0];
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('B1');
  const [articleLength, setArticleLength] = useState('medium');
  const [activeTab, setActiveTab] = useState('free'); // 'free' | 'plant'

  const unlockedArr = Array.isArray(stats?.unlockedPlants) ? stats.unlockedPlants : [];
  const unlockedArticles = Object.entries(PLANT_ARTICLES).filter(([plantName]) =>
    unlockedArr.includes(plantName)
  );

  const handleStart = () => {
    if (!topic.trim()) return toast('請給予幼苗一個生長主題！');
    
    const targetLang = currentLang.promptName;
    const lengthObj = LENGTH_OPTIONS.find(l => l.id === articleLength) || LENGTH_OPTIONS[1];
    const prompt = `You are a language teacher. 
TASK: Write an engaging and educational article.
TARGET LANGUAGE: ${targetLang}
TOPIC: "${topic}"
LEVEL: ${level}
LENGTH REQUIREMENT: ${lengthObj.prompt}

STRICT RULE: The ENTIRE article MUST be written in ${targetLang} only. 
Do NOT use Chinese or any other language except for common proper nouns if necessary.
Output ONLY the article text. Do not use Markdown headings or formatting. Pure text separated by standard paragraphs.`;

    onStartReading(`🌱 育苗室 · ${currentLang.name}`, prompt);
  };

  // Dynamically inject current language into plant article prompt
  const handlePlantArticle = (plantName, article) => {
    const lengthObj = LENGTH_OPTIONS.find(l => l.id === articleLength) || LENGTH_OPTIONS[1];
    let prompt = article.getPrompt(currentLang.promptName);
    
    // Inject length requirement before the output rule
    prompt = prompt.replace(
      'Output ONLY the article body text.',
      `LENGTH REQUIREMENT: ${lengthObj.prompt}\n\nOutput ONLY the article body text.`
    );
    
    onStartReading(`${article.emoji} ${plantName}·生態探索`, prompt);
  };

  return (
    <div className="flex flex-col h-full p-4 animate-popup-fade overflow-y-auto custom-scroll">
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 max-w-lg mx-auto w-full">
        <button
          onClick={() => setActiveTab('free')}
          className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'free' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-stone-400 hover:text-white border border-white/10'}`}
        >
          🪄 自由培育
        </button>
        <button
          onClick={() => setActiveTab('plant')}
          className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all relative ${activeTab === 'plant' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-stone-400 hover:text-white border border-white/10'}`}
        >
          🌿 守護靈故事
          {unlockedArticles.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 rounded-full text-[10px] font-black text-white flex items-center justify-center">
              {unlockedArticles.length}
            </span>
          )}
        </button>
      </div>

      {/* Free Article Tab */}
      {activeTab === 'free' && (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white font-chn mb-2">種下一顆語文的種子</h2>
            <p className="text-emerald-100/70 font-chn text-sm max-w-lg leading-relaxed">輸入任何您感興趣的主題，一秒內即刻生成屬於您的專屬文章。</p>
          </div>
          <div className="w-full max-w-md premium-glass p-6 sm:p-8 rounded-[2.5rem] border border-white/20">
            <div className="mb-5">
              <label className="block text-xs font-black text-emerald-400 uppercase tracking-widest mb-2 ml-1">文章主題 (Topic)</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="例：台灣夜市小吃、太空旅行..."
                className="w-full p-4 rounded-2xl border-none ring-2 ring-transparent bg-white shadow-sm focus:ring-emerald-400 focus:outline-none transition-all text-stone-700"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-black text-emerald-400 uppercase tracking-widest mb-2 ml-1">難度等級</label>
              <div className="flex justify-between bg-white/40 p-1.5 rounded-full border border-white/20 mb-4">
                {['A1', 'A2', 'B1', 'B2', 'C1'].map(lvl => (
                  <button key={lvl} onClick={() => setLevel(lvl)}
                    className={`flex-1 py-1.5 rounded-full text-sm font-black transition-all ${level === lvl ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-600 hover:text-stone-900'}`}>
                    {lvl}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-black text-emerald-400 uppercase tracking-widest mb-2 ml-1">文章長度</label>
              <div className="flex justify-between bg-white/40 p-1.5 rounded-full border border-white/20">
                {LENGTH_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setArticleLength(opt.id)}
                    className={`flex-1 py-1.5 rounded-full text-sm font-black transition-all ${articleLength === opt.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-600 hover:text-stone-900'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleStart} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-[0_5px_15px_-3px_rgba(5,150,105,0.4)] transition-all active:scale-95 flex justify-center items-center gap-2 mb-5">
              <span className="text-lg">🪄 開始培育文章</span>
            </button>
            <div className="bg-orange-400/10 border border-orange-400/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="text-3xl">{currentPlantInfo.emoji}</div>
              <div>
                <div className="text-xs font-black text-orange-400 uppercase tracking-wide mb-1">守護靈：{currentPlantInfo.trait}</div>
                <div className="text-xs text-emerald-50 leading-tight">{currentPlantInfo.description}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plant Articles Tab */}
      {activeTab === 'plant' && (
        <div className="flex-1 max-w-2xl mx-auto w-full">
          {unlockedArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-4">
              <div className="text-6xl opacity-30">🔒</div>
              <h3 className="text-white font-black text-lg">尚未解鎖任何守護靈</h3>
              <p className="text-stone-400 text-sm font-chn leading-relaxed max-w-xs">
                前往「溫室·扭蛋機」，召喚臺灣特有種守護靈！<br />
                每種守護靈都將解鎖一篇獨特的{LANG_LABEL[currentLang?.promptName] || currentLang?.name || '外語'}生態探索故事。
              </p>
              <div className="mt-4 flex gap-2 flex-wrap justify-center">
                {Object.entries(PLANT_ARTICLES).map(([name, a]) => (
                  <div key={name} className="px-3 py-1.5 bg-white/5 rounded-full text-stone-500 text-xs font-bold flex items-center gap-1">
                    <span className="opacity-30">🔒</span> {a.emoji} {name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-8">
              <div className="mb-2">
                <label className="block text-xs font-black text-emerald-400 uppercase tracking-widest mb-2 ml-1">文章長度</label>
                <div className="flex justify-between bg-emerald-950/40 p-1.5 rounded-full border border-emerald-500/20 max-w-sm mb-4">
                  {LENGTH_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setArticleLength(opt.id)}
                      className={`flex-1 py-1.5 rounded-full text-sm font-black transition-all ${articleLength === opt.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-400 hover:text-white'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-emerald-400/80 font-black uppercase tracking-widest mb-2">
                  ✦ 已解鎖 {unlockedArticles.length} / {Object.keys(PLANT_ARTICLES).length} 篇守護靈生態故事
                </p>
              </div>
              {unlockedArticles.map(([plantName, article]) => (
                <button
                  key={plantName}
                  onClick={() => handlePlantArticle(plantName, article)}
                  className="w-full text-left bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/20 hover:border-emerald-400/40 rounded-2xl p-5 transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl group-hover:scale-110 transition-transform">{article.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-black text-white text-sm">{plantName}</span>
                        <span className="text-[10px] bg-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-full font-bold uppercase">{currentLang?.name || 'EN'} 守護靈傳說</span>
                      </div>
                      <p className="text-emerald-100/70 text-xs font-chn leading-snug">{article.desc}</p>
                      <p className="text-stone-500 text-[11px] mt-2 font-eng italic truncate">{article.topic}</p>
                    </div>
                    <div className="shrink-0 text-emerald-500 group-hover:text-white text-xl font-bold transition-colors">›</div>
                  </div>
                </button>
              ))}

              {/* Locked articles preview */}
              {Object.entries(PLANT_ARTICLES)
                .filter(([name]) => !unlockedArr.includes(name))
                .map(([name, article]) => (
                  <div key={name} className="w-full text-left bg-white/5 border border-white/5 rounded-2xl p-5 opacity-50">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl opacity-30">🔒</div>
                      <div className="flex-1">
                        <div className="font-black text-stone-500 text-sm mb-1">{name}</div>
                        <p className="text-stone-600 text-xs font-chn">{article.desc}</p>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NurseryView;
