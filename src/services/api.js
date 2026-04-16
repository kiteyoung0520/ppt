const API_URL = "https://script.google.com/macros/s/AKfycbz4B6pMZAS4rBuVWsT5UMOgfuhvSmbw2z-6niF-hQATZE6oZk5hKeu0PUImgRTmTUdj/exec";

export const TARGET_LANGS = {
  'en': { name: 'English', promptName: 'English', speechCode: 'en-US' },
  'ja': { name: '日語', promptName: 'Japanese', speechCode: 'ja-JP' },
  'ko': { name: '韓語', promptName: 'Korean', speechCode: 'ko-KR' }
};

// Simple persistent cache for non-critical GET-like actions
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

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

const MODEL_PRIORITY = [
  "gemini-3.1-flash-lite",           // 首選：極速之王 (TTFT 領先 2.5 倍)
  "gemini-3.1-flash-lite-preview",   // 預覽版備援
  "gemini-3-flash",                 // 次選：148 tokens/sec 平衡型
  "gemini-3-pro",                   // 進階：深度推理穩定版
  "gemini-2.0-flash-exp",           // 2.0 實驗版備援
  "gemini-1.5-flash-8b",            // 1.5 極速備援
  "gemini-1.5-flash-latest"         // 最終底線
];

export async function* streamGeminiChat(prompt, apiKey) {
  let lastError = null;
  
  // 動態排序：如果已經有 sessionWinner (上一次成功的模型)，排在最前面
  const currentOrder = sessionWinner 
    ? [sessionWinner, ...MODEL_PRIORITY.filter(m => m !== sessionWinner)]
    : MODEL_PRIORITY;

  for (const modelName of currentOrder) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        // 如果是內容安全攔截 (通常回報 400)，我們依然嘗試換個模型試試看
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

