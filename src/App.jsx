import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Download, Palette, Type, LayoutTemplate, RotateCcw, Loader2, Image as ImageIcon } from 'lucide-react';

const THEMES = {
  zen: {
    id: 'zen',
    name: '禪意琥珀',
    bg: 'bg-slate-900',
    textHighlight: 'text-amber-400',
    textNormal: 'text-white',
    textMuted: 'text-slate-100',
    glow1: 'bg-amber-200',
    glow2: 'bg-emerald-300',
    glow1Color: '#fde68a', // 新增確切色碼，防止 html2canvas 解析變數失敗
    glow2Color: '#6ee7b7',
    particle: 'bg-white/40',
    dot: 'bg-amber-400'
  },
  ocean: {
    id: 'ocean',
    name: '深海幽光',
    bg: 'bg-slate-950',
    textHighlight: 'text-cyan-400',
    textNormal: 'text-white',
    textMuted: 'text-slate-200',
    glow1: 'bg-blue-500',
    glow2: 'bg-teal-400',
    glow1Color: '#3b82f6',
    glow2Color: '#2dd4bf',
    particle: 'bg-cyan-100/40',
    dot: 'bg-cyan-400'
  },
  sunset: {
    id: 'sunset',
    name: '暮霞落日',
    bg: 'bg-stone-950',
    textHighlight: 'text-rose-400',
    textNormal: 'text-white',
    textMuted: 'text-rose-50',
    glow1: 'bg-orange-500',
    glow2: 'bg-rose-500',
    glow1Color: '#f97316',
    glow2Color: '#f43f5e',
    particle: 'bg-orange-100/40',
    dot: 'bg-rose-400'
  }
};

export default function PosterGenerator() {
  // Form State
  const [number, setNumber] = useState('273');
  const [title, setTitle] = useState('一心慈悲能澤萬物');
  const [content, setContent] = useState('風吹過了擁有慈悲心的人，\n將慈悲的力量，吹拂到下一個人，\n再吹到樹木、田野，\n草木也盡染了慈悲的光輝。');
  const [activeTheme, setActiveTheme] = useState('zen');
  const [fontStyle, setFontStyle] = useState('font-serif'); // 新增：字體風格狀態
  
  // App State
  const [renderKey, setRenderKey] = useState(0); // Used to restart animations
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  
  const posterRef = useRef(null);

  // Memoize particles so they don't jump around when typing
  const particles = useMemo(() => {
    return [...Array(15)].map(() => ({
      width: Math.random() * 6 + 2 + 'px',
      height: Math.random() * 6 + 2 + 'px',
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      animationDuration: Math.random() * 5 + 5 + 's',
      animationDelay: Math.random() * 5 + 's',
    }));
  }, []);

  const handleRestartAnimation = () => {
    setRenderKey(prev => prev + 1);
  };

  // 新增：快速產生高畫質 PNG 靜態圖片
  const downloadPNG = async () => {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const canvas = await window.html2canvas(posterRef.current, {
        scale: 2, // 使用 2 倍縮放，讓圖片更清晰
        useCORS: true,
        backgroundColor: null,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `poster-${activeTheme}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error(error);
      alert('圖片產生失敗，請稍後再試。');
    }
  };

  // Helper to dynamically load scripts
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const generateGIF = async () => {
    setIsGenerating(true);
    setGenProgress(0);
    try {
      // 1. Load required libraries for browser-based GIF encoding
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js');

      // 2. Restart animation so we capture from the beginning
      setRenderKey(prev => prev + 1);
      // Wait for React to render the new key
      await new Promise(r => setTimeout(r, 100));

      const poster = posterRef.current;
      const frames = [];
      const numFrames = 20; // 2 seconds at 10 fps
      const captureInterval = 100; // ms

      // 3. Capture frames
      for (let i = 0; i < numFrames; i++) {
        const canvas = await window.html2canvas(poster, {
          scale: 1, // Keep scale 1 to keep GIF file size manageable
          useCORS: true,
          backgroundColor: null,
          logging: false
        });
        // Use high-quality JPEG for frames to speed up gifshot processing
        frames.push(canvas.toDataURL('image/jpeg', 0.9));
        
        // Update progress (first 50% is capturing)
        setGenProgress(Math.round((i / numFrames) * 50));
        
        // Wait a bit before capturing next frame to let CSS animation progress
        await new Promise(r => setTimeout(r, captureInterval));
      }

      // 4. Encode GIF
      window.gifshot.createGIF({
        images: frames,
        gifWidth: poster.offsetWidth,
        gifHeight: poster.offsetHeight,
        interval: captureInterval / 1000,
        numWorkers: 2,
        progressCallback: (captureProgress) => {
          // Update progress (latter 50% is encoding)
          setGenProgress(50 + Math.round(captureProgress * 50));
        }
      }, (obj) => {
        if (!obj.error) {
          // Trigger download
          const link = document.createElement('a');
          link.download = `poster-${activeTheme}.gif`;
          link.href = obj.image;
          link.click();
        } else {
          alert('GIF 產生失敗，請稍後再試。');
        }
        setIsGenerating(false);
      });

    } catch (error) {
      console.error(error);
      alert('載入套件或產生影像時發生錯誤');
      setIsGenerating(false);
    }
  };

  const theme = THEMES[activeTheme];
  const contentLines = content.split('\n');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between sticky top-0 z-50 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
            <LayoutTemplate size={18} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-wide">互動海報生成器</h1>
        </div>
        
        {/* 新增了按鈕群組 */}
        <div className="flex items-center gap-3">
          <button
            onClick={downloadPNG}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm"
          >
            <ImageIcon size={18} />
            <span className="hidden sm:inline">下載靜態 PNG</span>
          </button>
          
          <button
            onClick={generateGIF}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
              isGenerating 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>處理中 {genProgress}%</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span className="hidden sm:inline">下載為 GIF</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row h-full">
        
        {/* Left Panel - Controls */}
        <div className="w-full md:w-[400px] bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-73px)] overflow-y-auto">
          <div className="p-6 space-y-8">
            
            {/* Theme Selection */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                <Palette size={16} /> 視覺風格
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {Object.values(THEMES).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTheme(t.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                      activeTheme === t.id 
                        ? 'border-indigo-600 bg-indigo-50/50' 
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <span className={`font-medium ${activeTheme === t.id ? 'text-indigo-700' : 'text-slate-600'}`}>
                      {t.name}
                    </span>
                    <div className="flex gap-1.5">
                      <div className={`w-4 h-4 rounded-full ${t.bg.split(' ')[0]}`}></div>
                      <div className={`w-4 h-4 rounded-full ${t.glow1}`}></div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Font Selection (新增字體選擇區塊) */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                <Type size={16} /> 字體風格
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setFontStyle('font-serif')}
                  className={`flex-1 py-2 rounded-lg border-2 font-serif transition-all ${
                    fontStyle === 'font-serif' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  優雅明體
                </button>
                <button
                  onClick={() => setFontStyle('font-sans')}
                  className={`flex-1 py-2 rounded-lg border-2 font-sans transition-all ${
                    fontStyle === 'font-sans' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  現代黑體
                </button>
              </div>
            </section>

            {/* Content Editing */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                <Type size={16} /> 文案內容
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">標題數字</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium"
                    placeholder="例如: 273"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">主標題</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold text-slate-800"
                    placeholder="輸入標題"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">內文 (支援多行)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm leading-relaxed resize-none"
                    placeholder="輸入內文..."
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-slate-100/50 p-8 flex flex-col items-center justify-center relative overflow-hidden h-[calc(100vh-73px)]">
          
          <div className="mb-6 flex w-full max-w-[400px] justify-between items-center px-2">
            <span className="text-sm font-medium text-slate-400">即時預覽</span>
            <button 
              onClick={handleRestartAnimation}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <RotateCcw size={14} /> 重播動畫
            </button>
          </div>

          {/* The Poster Wrapper */}
          <div 
            className="relative shadow-2xl rounded-2xl overflow-hidden"
            style={{ width: '400px', height: '600px' }} // Fixed aspect ratio for consistent GIF
          >
            {/* The Actual Poster Element to capture */}
            <div 
              key={renderKey} // Changing key restarts all CSS animations inside
              ref={posterRef}
              // 將原本寫死的 font-serif 替換為動態變數 fontStyle
              className={`w-full h-full flex items-center justify-center ${theme.bg} overflow-hidden ${fontStyle}`}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 opacity-40">
                <div 
                  className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full animate-pulse`}
                  style={{ boxShadow: `0 0 120px 80px ${theme.glow1Color}`, background: 'transparent' }}
                ></div>
                <div 
                  className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full animate-pulse delay-700`}
                  style={{ boxShadow: `0 0 150px 100px ${theme.glow2Color}`, background: 'transparent' }}
                ></div>
                {/* 增加 data-html2canvas-ignore="true" 讓套件忽略此層，以防高斯模糊導致繪圖崩潰 */}
                <div data-html2canvas-ignore="true" className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] ${theme.glow1} rounded-full blur-[100px] animate-pulse`}></div>
                <div data-html2canvas-ignore="true" className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] ${theme.glow2} rounded-full blur-[120px] animate-pulse delay-700`}></div>
              </div>

              <div className="relative z-10 w-[85%] max-w-[340px] p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl text-center">
                
                {/* 標題數字 */}
                <div className={`${theme.textHighlight} text-xs tracking-[0.5em] mb-4 opacity-80 uppercase`}>
                  {number.split('').join(' ')}
                </div>

                {/* 主標題 */}
                <h1 className={`text-3xl font-bold ${theme.textNormal} mb-6 tracking-widest leading-tight`}>
                  {title}
                </h1>

                {/* 內文 */}
                <div className={`space-y-4 ${theme.textMuted} text-base leading-relaxed font-light`}>
                  {contentLines.map((line, index) => {
                    const isLast = index === contentLines.length - 1;
                    return (
                      <p 
                        key={index} 
                        className={`animate-fade-in ${isLast ? theme.textHighlight + ' font-normal' : ''}`}
                        style={{ animationDelay: `${index * 0.4}s` }}
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>

                {/* 裝飾線條 - 修改為實心帶透明度以避開 html2canvas 的漸層臭蟲 */}
                <div className="mt-8 flex justify-center items-center space-x-3 opacity-70">
                  <div className={`h-[2px] w-12 rounded-full ${theme.dot} opacity-40`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></div>
                  <div className={`h-[2px] w-12 rounded-full ${theme.dot} opacity-40`}></div>
                </div>
              </div>

              {/* 漂浮粒子特效 */}
              {particles.map((styleProps, i) => (
                <div
                  key={i}
                  className={`absolute ${theme.particle} rounded-full animate-float`}
                  style={styleProps}
                ></div>
              ))}
            </div>
          </div>
          
          {isGenerating && (
             <div className="mt-6 text-sm text-slate-500 bg-slate-200/50 px-4 py-2 rounded-lg flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                正在捕捉動畫幀與轉碼... 這可能會使畫面稍微卡頓，請稍候。
             </div>
          )}

        </div>
      </main>

      {/* Global Styles for Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        .animate-float {
          animation: float linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 1.5s ease-out forwards;
          opacity: 0; /* Ensures element is hidden before animation starts */
        }
        .delay-700 { animation-delay: 0.7s; }
      `}</style>
    </div>
  );
}
