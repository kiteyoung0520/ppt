import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useGame, NATIVE_PLANT_DB } from '../../../context/GameContext';
import { toast } from '../../ui/Toast';

// ── Plant-specific unlocked articles ────────────────────────────────
const PLANT_ARTICLES = {
  '馬鞍藤': {
    topic: 'Taiwan\'s Coastal Warrior: The Beach Morning Glory',
    prompt: 'Write an educational B1-level English article about the Beach Morning Glory (Ipomoea pes-caprae), known in Taiwan as "Ma-An Vine" (馬鞍藤). Explain its role in protecting Taiwan\'s coastal ecosystems, its unique saddle-shaped leaves, and why it is considered a pioneer plant. Include vocabulary like "coastal erosion", "pioneer species", and "endemic".',
    emoji: '🌱', desc: '海岸生態系守護者的英文故事'
  },
  '紫金牛': {
    topic: 'Secrets of the Forest Floor: Ardisia crenata',
    prompt: 'Write an educational B1-level English article about Ardisia crenata (紫金牛), a shade-loving plant found in Taiwan\'s lowland forests. Describe its bright red berries, its habitat under the forest canopy, and its traditional uses in Taiwan. Include vocabulary like "understory", "canopy", and "biodiversity".',
    emoji: '🌿', desc: '低海拔森林秘密的英文揭秘'
  },
  '台灣欒樹': {
    topic: 'Taiwan\'s Four-Season Tree: The Chinese Flame Tree',
    prompt: 'Write an engaging B2-level English article about the Taiwan Flame Tree (Koelreuteria henryi, 台灣欒樹). Describe how it transforms through four dramatic seasonal changes — green leaves, golden flowers, red seed pods, and bare branches. Connect it to Taiwan\'s cultural identity and urban landscapes.',
    emoji: '🌳', desc: '台灣四季彩色樹的英文探索'
  },
  '山櫻花': {
    topic: 'The Pink Messenger: Taiwan\'s Cherry Blossom',
    prompt: 'Write a beautiful B1-level English article about Taiwan\'s wild cherry blossoms (Prunus campanulata, 山櫻花). Compare Taiwan\'s cherry blossoms with Japan\'s Sakura, describe their significance for indigenous Atayal culture, and the best mountain viewing spots. Use vocabulary like "blossom", "herald", and "indigenous culture".',
    emoji: '🌸', desc: '台灣山櫻花文化的英文詩篇'
  },
  '台灣百合': {
    topic: 'The Lily of the Peaks: Taiwan\'s National Flower Candidate',
    prompt: 'Write an inspiring B2-level English article about the Taiwan Lily (Lilium formosanum, 台灣百合). Describe how it grows on sheer mountain cliffs, its symbolism of purity and resilience in Taiwanese culture, the threats it faces from over-collection, and conservation efforts. Include "habitat", "symbolic", and "conservation".',
    emoji: '💮', desc: '高山百合精神的英文傳說'
  },
  '水筆仔': {
    topic: 'Walking Trees: Taiwan\'s Mangrove Marvels',
    prompt: 'Write a fascinating B1-level English article about Taiwan\'s mangroves (Kandelia obovata, 水筆仔). Explain the ingenious "viviparous" reproduction — seeds that germinate while still on the parent tree. Describe the Tamsui Mangrove Reserve and why mangroves are called "the nurseries of the sea". Include "tidal zone", "viviparous", and "biodiversity hotspot".',
    emoji: '🎋', desc: '胎生奇蹟紅樹林的英文科學'
  },
  '愛玉子': {
    topic: 'Taiwan\'s Magical Jelly: The Story of Aiyu',
    prompt: 'Write a captivating B1-level English article about Aiyu jelly (愛玉子, Ficus pumila var. awkeotsang), a plant endemic only to Taiwan. Explain the extraordinary process of hand-washing the seeds to create cooling jelly, its role in traditional Taiwanese street food culture, and why it cannot be naturally found anywhere else in the world.',
    emoji: '🍃', desc: '全球唯一愛玉子的英文傳奇'
  },
  '牛樟': {
    topic: 'The Forest King: Taiwan\'s Sacred Cow Camphor',
    prompt: 'Write a sophisticated C1-level English article about Taiwan\'s Cow Camphor tree (Cinnamomum kanehirae, 牛樟). Discuss its status as one of Taiwan\'s most precious and endangered trees, the illegal logging crisis that wiped out much of its population, the mythical medicinal properties of the Agrocybe chaxingu mushroom that grows on it, and current conservation and legal farming efforts.',
    emoji: '🪵', desc: '瀕危森林王者的英文史詩'
  },
  '台灣肖楠': {
    topic: 'Wisdom in Wood: Taiwan\'s Incense Cedar',
    prompt: 'Write a reflective B2-level English article about Taiwan\'s Incense Cedar (Calocedrus macrolepis var. formosana, 台灣肖楠). Describe how it was one of the five sacred trees of Taiwan\'s Qing Dynasty, its unique aromatic scent, its importance in traditional woodworking and craftsmanship, and the slow but steady conservation programs protecting it today.',
    emoji: '🌲', desc: '台灣五木之一的英文傳承'
  },
  '紅檜': {
    topic: 'Ancient Giants: Taiwan\'s Sacred Red Cypress',
    prompt: 'Write a majestic C1-level English article about Taiwan\'s Red Cypress (Chamaecyparis formosensis, 紅檜). Discuss how some trees are over 2,300 years old, the devastating logging that occurred during the Japanese colonial era at Alishan, the ecological and spiritual significance of these trees to Taiwan\'s indigenous peoples, and the ongoing fight for their preservation in the 21st century.',
    emoji: '🌲', desc: '千年紅檜精神的英文頌歌'
  },
};

const NurseryView = ({ onStartReading }) => {
  const { currentLang } = useSettings();
  const { stats } = useGame();
  
  const currentPlantInfo = NATIVE_PLANT_DB.find(p => p.name === (stats?.currentPlant || '黃花風鈴木')) || NATIVE_PLANT_DB[0];
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('B1');
  const [activeTab, setActiveTab] = useState('free'); // 'free' | 'plant'

  const unlockedArr = Array.isArray(stats?.unlockedPlants) ? stats.unlockedPlants : [];
  const unlockedArticles = Object.entries(PLANT_ARTICLES).filter(([plantName]) =>
    unlockedArr.includes(plantName)
  );

  const handleStart = () => {
    if (!topic.trim()) return toast('請給予幼苗一個生長主題！');
    const prompt = `Write an engaging and educational short article about "${topic}" in ${currentLang.promptName}. 
The difficulty CEFR level should be ${level}. 
Output ONLY the article text. Do not use Markdown headings or formatting. Pure text separated by standard paragraphs.`;
    onStartReading('🌱 育苗室', prompt);
  };

  const handlePlantArticle = (plantName, article) => {
    onStartReading(`${article.emoji} ${plantName}·生態探索`, article.prompt);
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
              <div className="flex justify-between bg-white/40 p-1.5 rounded-full border border-white/20">
                {['A1', 'A2', 'B1', 'B2', 'C1'].map(lvl => (
                  <button key={lvl} onClick={() => setLevel(lvl)}
                    className={`flex-1 py-1.5 rounded-full text-sm font-black transition-all ${level === lvl ? 'bg-emerald-600 text-white shadow-lg' : 'text-stone-600 hover:text-stone-900'}`}>
                    {lvl}
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
                每種守護靈都將解鎖一篇獨特的英文生態探索故事。
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
              <p className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-2">
                ✦ 已解鎖 {unlockedArticles.length} / {Object.keys(PLANT_ARTICLES).length} 篇守護靈生態故事
              </p>
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
                        <span className="text-[10px] bg-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-full font-bold uppercase">守護靈傳說</span>
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
