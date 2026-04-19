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

let sessionWinner = null; // 動態記錄本次對話中反應最快且成功的模型

// ⚡️ 全新官方指定模型接力清單 (保持繁忙自動切換補位)
const MODEL_PRIORITY = [
  "gemini-3.1-flash-lite-preview", // 1. 首選：最新 3.1 Flash Lite 預覽版
  "gemini-3-flash-preview",      // 2. 二順位：3 系列 Flash 預覽版
  "gemini-2.5-flash",             // 3. 三順位：2.5 Flash
  "gemini-flash-latest",          // 4. 最後防線：穩定版備援
];

export async function* streamGeminiChat(prompt, apiKey) {
  // 金鑰守衛：避免因未設定 Key 而產生無意義的串流錯誤
  if (!apiKey || apiKey.length < 10) {
    throw new Error("⚠️ 尚未設定 Gemini API Key，請聯絡管理員或重新登入。");
  }

  let lastError = null;
  
  // 動態排序：如果已經有 sessionWinner (上一次成功的模型)，排在最前面
  const currentOrder = sessionWinner 
    ? [sessionWinner, ...MODEL_PRIORITY.filter(m => m !== sessionWinner)]
    : MODEL_PRIORITY;

  for (const modelName of currentOrder) {
    const controller = new AbortController();
    // 實驗型號 (3.x / 2.5) 給 6 秒快速逾時，穩定型號給 12 秒
    const isExperimental = modelName.startsWith("gemini-3") || modelName.includes("2.5");
    const timeoutId = setTimeout(() => controller.abort(), isExperimental ? 6000 : 12000);

    try {
      console.log(`[智慧調度] 嘗試連接 ${modelName}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 強力修復：不論任何 HTTP 錯誤 (400, 401, 404, 429, 500+)，全部觸發秒切換
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[自動切換] ${modelName} 回報錯誤 (${response.status})，即將嘗試下一個模型...`);
        
        // 解析錯誤訊息以判斷類型
        let parsedErrMsg = errorText;
        try {
          parsedErrMsg = JSON.parse(errorText)?.error?.message || errorText;
        } catch(e) {}
        
        lastError = new Error(`連線失敗 (${response.status}): ${parsedErrMsg}`);
        
        // 🚨 金鑰被停用 (Leaked)：不浪費時間，立刻告知使用者
        if (response.status === 403 && parsedErrMsg.toLowerCase().includes("leaked")) {
          throw new Error("🚨 您的 API Key 已被 Google 停用 (外洩)！請至「👤守護者檔案」更換新金鑰。");
        }
        // 🚨 金鑰無效：同上
        if (response.status === 400 && (parsedErrMsg.toLowerCase().includes("api key") || parsedErrMsg.toLowerCase().includes("invalid"))) {
          throw new Error("🚨 您設定的 API Key 無效！請至「👤守護者檔案」檢查並更新您的金鑰。");
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
                if (!hasYielded) {
                  // 這是第一個 Byte，表示這個模型目前反應最快且可用
                  if (sessionWinner !== modelName) {
                    console.log(`[智慧動態優化] 已鎖定目前最快模型: ${modelName}`);
                    sessionWinner = modelName;
                  }
                }
                hasYielded = true;
                yield chunk;
              }
              
              if (parsed.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error("內容被安全過濾器攔截");
              }
            } catch (e) {
              if (e.message.includes("安全過濾")) throw e;
            }
          }
        }
      }

      if (hasYielded) return;
      else throw new Error("無內容輸出");

    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.message.includes("安全過濾")) throw err;
      if (modelName === sessionWinner) sessionWinner = null;
      console.warn(`[AI 失敗] ${modelName}: ${err.message}`);
      continue; 
    }
  }

  throw lastError || new Error("語林之靈目前繁忙，正努力恢復中，請稍候再試。");
}

/**
 * Safely extracts and parses JSON from a string that might contain 
 * redundant text or markdown formatting.
 */
export function safeParseJSON(rawStr) {
  if (!rawStr) return null;
  
  // Try direct parse first
  try {
    return JSON.parse(rawStr.trim());
  } catch (e) {
    // If it fails, try to find the content between the first { and the last }
    try {
      const match = rawStr.match(/\{[\s\S]*\}/);
      if (match) {
        // Clean up markdown markers if present
        let cleaned = match[0].replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
    } catch (innerError) {
      console.error("Robust parse failed:", innerError);
      throw new Error("無法解析 AI 產生的 JSON 格式");
    }
  }
  throw new Error("無法解析 AI 產生的 JSON 格式（未找到有效的 JSON 物件）");
}

