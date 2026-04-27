const API_URL = "https://script.google.com/macros/s/AKfycbz4B6pMZAS4rBuVWsT5UMOgfuhvSmbw2z-6niF-hQATZE6oZk5hKeu0PUImgRTmTUdj/exec";

export const TARGET_LANGS = {
  'en': { name: 'English', promptName: 'English', speechCode: 'en-US' },
  'ja': { name: '日語', promptName: 'Japanese', speechCode: 'ja-JP' },
  'ko': { name: '韓語', promptName: 'Korean', speechCode: 'ko-KR' }
};

// Simple persistent cache for non-critical GET-like actions
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// 🔒 安全握手令牌 (需與 GAS 後端一致)
const SECURITY_HANDSHAKE_TOKEN = "FLG_SECURE_2024_PRO_V1";

export async function callApi(action, params, apiKey = null, targetLangKey = 'en') {
  const cacheKey = `${action}_${JSON.stringify(params)}_${targetLangKey}`;
  
  // Check cache for specific actions (like getting quotes)
  if ((action === 'getRandomQuote' || action === 'getLeaderboard') && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (Date.now() - cached.time < CACHE_TTL) return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const payload = { 
        securityToken: SECURITY_HANDSHAKE_TOKEN, // 🛡️ 安全握手
        action, 
        targetLang: TARGET_LANGS[targetLangKey]?.promptName || 'English', 
        ...params 
    };
    if (apiKey) payload.apiKey = apiKey;
    
    const res = await fetch(API_URL, { 
      method: "POST", 
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const json = await res.json();
    
    if (json.status === 'error') throw new Error(json.message);

    // Save to cache if applicable
    if (action === 'getRandomQuote' || action === 'getLeaderboard') {
      apiCache.set(cacheKey, { data: json, time: Date.now() });
    }

    return json;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error("伺服器回應過慢，請稍後再試");
    console.error("API Error:", e);
    throw e; 
  }
}

let sessionWinner = null;
let discoveredModels = []; // 儲存自動偵測到的可用模型清單

/**
 * 🕵️ 自動偵測並排序目前 API Key 可用的最新模型
 */
async function discoverModels(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const json = await res.json();
    if (!json.models) return [];

    // 過濾出 Gemini 家族，並區分 Flash 與 Pro
    const allGemini = json.models
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.includes('gemini'));

    // 排序邏輯：解析版號 (如 1.5, 2.0, 3.1)，數字越大越優先
    const sorted = allGemini.sort((a, b) => {
      const getVer = (s) => {
        const m = s.match(/(\d+(\.\d+)?)/);
        return m ? parseFloat(m[1]) : 0;
      };
      
      const vA = getVer(a);
      const vB = getVer(b);
      
      if (vB !== vA) return vB - vA; // 版號大的排前面
      
      // 同版號下，Flash 優先 (為了速度)，Pro 墊後
      if (a.includes('flash') && b.includes('pro')) return -1;
      if (a.includes('pro') && b.includes('flash')) return 1;
      return 0;
    });

    // 剔除一些明顯是舊版或 Tuning 的型號
    return sorted.filter(name => !name.includes('tuning') && !name.includes('vision') && !name.includes('1.0'));
  } catch (e) {
    console.error("[自動偵測] 獲取列表失敗:", e);
    return [];
  }
}

export async function* streamGeminiChat(prompt, apiKey) {
  if (!apiKey || apiKey.length < 10) {
    throw new Error("⚠️ 尚未設定 Gemini API Key，請聯絡管理員或重新登入。");
  }

  // 第一次連線時，啟動自動偵測
  if (discoveredModels.length === 0) {
    console.log("[全自動感知] 正在掃描 Google 最新模型清單...");
    discoveredModels = await discoverModels(apiKey);
  }

  // 保底清單 (當 API 偵測失敗或權限不足時使用)
  const FALLBACK_MODELS = [
    "gemini-3.1-flash-lite-preview", 
    "gemini-2.5-flash", 
    "gemini-flash-latest", 
    "gemini-1.5-pro"
  ];

  // 最終組合清單：如果有自動偵測到，優先使用偵測到的；否則使用保底
  const activeList = discoveredModels.length > 0 ? discoveredModels : FALLBACK_MODELS;
  
  // 動態排序：如果有 sessionWinner，排在最前面
  const currentOrder = sessionWinner 
    ? [sessionWinner, ...activeList.filter(m => m !== sessionWinner)]
    : activeList;

  let lastError = null;

  for (const modelName of currentOrder) {
    const controller = new AbortController();
    // 給予適當的逾時：最新/實驗版給 6 秒，穩定版給 12 秒
    const isNew = modelName.includes("3.") || modelName.includes("2.") || modelName.includes("preview");
    const timeoutId = setTimeout(() => controller.abort(), isNew ? 6000 : 12000);

    try {
      console.log(`[全自動調度] 正透過 ${modelName} 傳輸...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = errorText;
        try { errMsg = JSON.parse(errorText)?.error?.message || errorText; } catch(e) {}
        
        console.warn(`[熱切換] ${modelName} 跳轉中 (${response.status}): ${errMsg}`);
        
        if (response.status === 403 && errMsg.toLowerCase().includes("leaked")) {
          throw new Error("🚨 您的 API Key 已被停用 (外洩)！");
        }
        
        if (modelName === sessionWinner) sessionWinner = null;
        continue;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasYielded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            if (!dataStr) continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) {
                if (!hasYielded && sessionWinner !== modelName) {
                    sessionWinner = modelName;
                }
                hasYielded = true;
                yield chunk;
              }
              if (parsed.candidates?.[0]?.finishReason === 'SAFETY') throw new Error("內容被攔截");
            } catch (e) {
              if (e.message.includes("攔截")) throw e;
            }
          }
        }
      }
      if (hasYielded) return;
      else throw new Error("無內容");
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (modelName === sessionWinner) sessionWinner = null;
      continue; 
    }
  }

  throw lastError || new Error("語林之靈目前繁忙，請稍候再試。");
}

/**
 * Safely extracts and parses JSON from a string that might contain 
 * redundant text or markdown formatting.
 */
export function safeParseJSON(rawStr) {
  if (!rawStr) return null;
  
  const trimmed = rawStr.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    try {
      // 🕵️ 更強大的正則：嘗試抓取最外層的 { ... }
      const firstBrace = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        let jsonStr = trimmed.substring(firstBrace, lastBrace + 1);
        // 清理常見的 Markdown 標記
        jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
      }
    } catch (innerError) {
      console.error("Critical Parse Error! Raw output from AI:", rawStr);
      throw new Error("AI 回傳格式異常，無法解析。");
    }
  }
  throw new Error("未偵測到有效的 JSON 數據");
}

// 🤖 智慧型動態模型偵測與調度器
let cachedModelList = null;
let lastModelFetchTime = 0;
const MODEL_CACHE_TTL = 1000 * 60 * 60; // 快取 1 小時

// 自動查詢目前 API Key 可用的最優模型清單
export async function getBestAvailableModels(apiKey) {
  const cleanKey = (apiKey || "").trim();
  const now = Date.now();

  // 如果有快取且未過期，直接回傳
  if (cachedModelList && (now - lastModelFetchTime < MODEL_CACHE_TTL)) {
    return cachedModelList;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    const data = await res.json();
    
    if (!data.models) throw new Error("無法獲取模型清單");

    // 1. 過濾出支援生成內容的模型
    // 2. 排序：版本越高越優先 (2.0 > 1.5)，且 Flash 優先於 Pro (速度優先)
    const sortedModels = data.models
      .filter(m => m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .sort((a, b) => {
        const getScore = (name) => {
          let score = 0;
          if (name.includes('2.0')) score += 1000;
          if (name.includes('1.5')) score += 500;
          if (name.includes('flash')) score += 100;
          if (name.includes('pro')) score += 50;
          if (name.includes('experimental')) score -= 200; // 實驗性模型放後面
          return score;
        };
        return getScore(b) - getScore(a);
      });

    cachedModelList = sortedModels;
    lastModelFetchTime = now;
    console.log("🚀 自動偵測到最優模型排序:", sortedModels);
    return sortedModels;
  } catch (e) {
    console.error("模型自動查詢失敗，使用保險備援清單:", e.message);
    return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  }
}

export async function smartGeminiFetch(apiKey, prompt, options = {}) {
  const cleanKey = (apiKey || "").trim();
  const models = await getBestAvailableModels(cleanKey);
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          ...options 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        
        // 如果是權限或繁忙問題，嘗試下一個模型
        if ([429, 503, 404, 403, 500].includes(status)) {
          console.warn(`SmartDispatcher: 模型 ${model} 無法使用 (${status})，切換至備援...`);
          lastError = errorData?.error?.message || `HTTP ${status}`;
          continue; 
        } else {
          throw new Error(errorData?.error?.message || `HTTP ${status}`);
        }
      }

      const result = await response.json();
      return { 
        success: true, 
        data: result, 
        modelUsed: model 
      };

    } catch (e) {
      console.error(`SmartDispatcher: Error with ${model}:`, e.message);
      lastError = e.message;
      // 網路連線錯誤也會觸發嘗試下一個
    }
  }

  return { 
    success: false, 
    error: lastError || "All AI models failed to respond.",
    modelUsed: 'none'
  };
}
