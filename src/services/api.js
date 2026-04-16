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

const MODEL_PRIORITY = [
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-flash-latest"
];

export async function* streamGeminiChat(prompt, apiKey) {
  let lastError = null;

  for (const modelName of MODEL_PRIORITY) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s safety timeout

    try {
      console.log(`[AI] 通訊中: ${modelName}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 如果模型繁忙 (429)、伺服器錯誤 (500+)、或權限不足 (401/403)，立即切換下一個模型
      if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
        console.warn(`[AI] ${modelName} 無權限、繁忙或錯誤 (${response.status})，秒切換至下一個模型...`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
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
              // Handle safety filters or other non-content responses
              const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) {
                hasYielded = true;
                yield chunk;
              }
              
              // Handle blocked content
              if (parsed.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error("內容被安全過濾器攔截");
              }
            } catch (e) {
              if (e.message.includes("安全過濾")) throw e;
              // Ignore parse errors on partial chunks
            }
          }
        }
      }

      if (hasYielded) return; // 成功獲取內容，結束循環
      else throw new Error("無內容輸出");

    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const isTimeout = err.name === 'AbortError';
      
      // 如果是內容過濾，就不切換了，直接報錯
      if (err.message.includes("安全過濾")) {
        throw err;
      }

      console.warn(`[AI] ${modelName} 失敗: ${err.message}${isTimeout ? ' (超時)' : ''}`);
      // 繼續下一個模型
      continue; 
    }
  }

  throw lastError || new Error("語林之靈目前繁忙，所有模型均未回應，請稍後再試。");
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

