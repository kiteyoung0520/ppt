const API_URL = "https://script.google.com/macros/s/AKfycbz4B6pMZAS4rBuVWsT5UMOgfuhvSmbw2z-6niF-hQATZE6oZk5hKeu0PUImgRTmTUdj/exec";

export const TARGET_LANGS = {
    'en': { name: 'English', promptName: 'English', speechCode: 'en-US' },
    'ja': { name: '日語', promptName: 'Japanese', speechCode: 'ja-JP' },
    'ko': { name: '韓語', promptName: 'Korean', speechCode: 'ko-KR' }
};

export async function callApi(action, params, apiKey = null, targetLangKey = 'en') {
  try {
    const payload = { 
        action, 
        targetLang: TARGET_LANGS[targetLangKey]?.promptName || 'English', 
        ...params 
    };
    if (apiKey) {
        payload.apiKey = apiKey;
    }
    
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.status === 'error') throw new Error(json.message);
    return json;
  } catch (e) { 
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
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      console.log(`[AI] Attempting ${modelName}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Model ${modelName} returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasYielded = false;

      while (true) {
        // We could also put a timeout on reader.read() if we want to be super safe
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
                hasYielded = true;
                yield chunk;
              }
            } catch (e) {
              console.warn("Parse error on SSE chunk:", dataStr);
            }
          }
        }
      }

      if (hasYielded) return;
      else throw new Error("No content yielded");

    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      console.warn(`[AI] ${modelName} failed${isTimeout ? ' (Timeout)' : ''}: ${err.message}`);
      lastError = err;
      continue; 
    }
  }

  throw lastError || new Error("All AI models failed to respond.");
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

