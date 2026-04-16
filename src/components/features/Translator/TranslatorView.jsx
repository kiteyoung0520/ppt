import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { useAuth } from '../../../context/AuthContext';
import { useGame } from '../../../context/GameContext';
import { streamGeminiChat } from '../../../services/api';
import { toast } from '../../ui/Toast';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const TranslatorView = () => {
  const { currentLang, speechRate } = useSettings();
  const { apiKey } = useAuth();
  const { recordActivity, addEssence } = useGame();
  
  // Directions: 'native' (Chinese -> Target), 'target' (Target -> Chinese)
  const [activeDirection, setActiveDirection] = useState(null); 
  
  const [transcript, setTranscript] = useState('');
  const [translationText, setTranslationText] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const recognitionRef = useRef(null);

  const initRecognition = (dir) => {
    if (!SpeechRecognition) {
      toast("❌ 您的瀏覽器不支援語音辨識！");
      return null;
    }
    if (!currentLang || !currentLang.speechCode) {
      toast("⏳ 正在讀取語言設定，請稍後...");
      return null;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = dir === 'native' ? 'zh-TW' : currentLang.speechCode;
    return rec;
  };

  const executeTranslationStream = async (textToTranslate, dir) => {
    if (!textToTranslate.trim()) return;
    
    setIsTranslating(true);
    setTranslationText('');
    recordActivity(); // Reward usage
    
    const prompt = dir === 'native' 
      ? `Translate the following Traditional Chinese to ${currentLang.promptName}. ONLY output the translation without any explanation: "${textToTranslate}"`
      : `Translate the following ${currentLang.promptName} to Traditional Chinese. ONLY output the translation without any explanation: "${textToTranslate}"`;

    let fullResult = '';
    
    try {
      const stream = streamGeminiChat(prompt, apiKey);
      for await (const chunk of stream) {
        fullResult += chunk;
        setTranslationText(prev => prev + chunk);
      }
      
      if (fullResult) {
        speakTranslation(fullResult, dir);
        addEssence('rain', 10);
      }
    } catch (e) {
      toast("口譯錯誤: " + e.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const speakTranslation = (text, dir) => {
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = dir === 'native' ? currentLang.speechCode : 'zh-TW';
      u.rate = speechRate || 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  const manuallyRetranslate = () => {
    if (transcript && activeDirection) {
      executeTranslationStream(transcript, activeDirection);
    }
  };

  const handleMicClick = (dir) => {
    if (isRecording && activeDirection === dir) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }
    
    setTranscript('');
    setTranslationText('');
    setActiveDirection(dir);
    
    const rec = initRecognition(dir);
    if (!rec) return;

    let finalStr = '';

    rec.onstart = () => setIsRecording(true);
    
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalStr += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(finalStr + interim);
    };
    
    rec.onerror = (e) => {
      if (e.error !== 'no-speech') toast(`辨識錯誤: ${e.error}`);
      setIsRecording(false);
    };
    
    rec.onend = () => {
      setIsRecording(false);
      if (finalStr.trim()) {
        setTranscript(finalStr); // Ensure the textarea gets the final text
        executeTranslationStream(finalStr, dir); // Auto-translate the first time
      } else {
        setActiveDirection(null); // Reset if nothing was spoken
      }
    };
    
    recognitionRef.current = rec;
    
    // Prime speech synthesis to unlock audio on mobile
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(u);
    }
    
    rec.start();
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Visualizer and Status */}
      <div className="flex-1 w-full flex flex-col p-4 animate-fadeIn overflow-y-auto custom-scroll">
        {(transcript || translationText || isRecording) ? (
          <div className="flex gap-4 flex-col h-full">
            
            {/* Input / Transcript Block */}
            <div className={`w-full bg-white rounded-3xl p-5 shadow-sm border-2 transition-all flex flex-col ${activeDirection === 'native' ? 'border-blue-200' : 'border-emerald-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded ${activeDirection === 'native' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {activeDirection === 'native' ? '中文輸入' : currentLang.name + '輸入'}
                </span>
                
                {/* Retranslate Button */}
                {!isRecording && transcript && (
                  <button 
                    onClick={manuallyRetranslate}
                    disabled={isTranslating}
                    className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    🔄 重新翻譯
                  </button>
                )}
              </div>
              
              <textarea 
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={isRecording ? '聆聽中...' : '在這裡輸入或點擊麥克風說話...'}
                className="w-full bg-transparent resize-none outline-none font-eng text-xl sm:text-2xl text-stone-700 min-h-[100px] leading-relaxed custom-scroll"
                disabled={isRecording}
              />
            </div>
            
            {/* Output / Translation Block */}
            {(isTranslating || translationText) && (
              <div className={`w-full bg-stone-800 rounded-3xl p-5 shadow-inner border-2 border-stone-700 flex-1 flex flex-col items-start transition-all ${translationText ? 'animate-popup-fade' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold px-2 py-1 rounded bg-stone-700 text-stone-300">
                    AI 極速口譯
                  </span>
                  {translationText && !isTranslating && (
                    <button 
                      onClick={() => speakTranslation(translationText, activeDirection)}
                      className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-xl shadow-lg transition active:scale-95"
                      title="朗讀結果"
                    >
                      🔊
                    </button>
                  )}
                </div>
                <div className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl leading-snug w-full h-full overflow-y-auto custom-scroll">
                  {translationText}
                  {isTranslating && <span className="inline-block w-3 h-8 bg-orange-400 ml-2 animate-pulse translate-y-1"></span>}
                </div>
              </div>
            )}
            
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center animate-popup-fade mb-10">
             <div className="text-[64px] mb-4">🕊️</div>
             <h2 className="text-2xl font-bold text-stone-800 font-chn mb-2">極速雙向口譯機</h2>
             <p className="text-stone-500 font-chn text-sm mb-6 max-w-sm px-4 leading-relaxed">
               按下麥克風說話，系統將為您自動翻譯朗讀。<br/><br/>
               <span className="text-stone-700 bg-stone-100 border border-stone-200 px-2 py-1 rounded font-bold">💡 新功能：您可以點擊辨識結果進行編輯，然後按下「重新翻譯」。</span>
             </p>
          </div>
        )}
      </div>

      {/* Controller Buttons - Thinner profile */}
      <div className="shrink-0 bg-white/80 backdrop-blur-md border-t border-stone-200 p-4">
        <div className="flex justify-center gap-12 w-full max-w-md mx-auto">
           {/* Native Mic (Taiwan) */}
           <div className="flex flex-col items-center gap-2">
             <div className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all ${isRecording && activeDirection === 'native' ? 'scale-110' : ''}`}>
                {isRecording && activeDirection === 'native' && <div className="absolute w-20 h-20 bg-blue-100 rounded-full animate-pulse-ring"></div>}
                <button 
                  onClick={() => handleMicClick('native')}
                  className={`relative z-10 w-14 h-14 rounded-full shadow-md text-xl border-4 transition-colors ${
                    isRecording && activeDirection === 'native' 
                      ? 'bg-blue-600 border-blue-400 animate-pulse text-white' 
                      : 'bg-white border-blue-100 text-blue-500 hover:bg-blue-50'
                  }`}
                >
                  {isRecording && activeDirection === 'native' ? '🛑' : '說中文'}
                </button>
             </div>
           </div>

           {/* Target Mic (Foreign) */}
           <div className="flex flex-col items-center gap-2">
             <div className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all ${isRecording && activeDirection === 'target' ? 'scale-110' : ''}`}>
                {isRecording && activeDirection === 'target' && <div className="absolute w-20 h-20 bg-emerald-100 rounded-full animate-pulse-ring animation-delay-500"></div>}
                <button 
                  onClick={() => handleMicClick('target')}
                  className={`relative z-10 w-14 h-14 rounded-full shadow-md text-xl border-4 transition-colors ${
                    isRecording && activeDirection === 'target' 
                      ? 'bg-emerald-600 border-emerald-400 animate-pulse text-white' 
                      : 'bg-white border-emerald-100 text-emerald-500 hover:bg-emerald-50'
                  }`}
                >
                  {isRecording && activeDirection === 'target' ? '🛑' : `說${currentLang.name.substring(0, 1)}文`}
                </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TranslatorView;
