/**
 * Security Utility for LinguaGarden
 * Provides simple obfuscation for local storage to prevent plain-text snooping.
 */

// A simple reversible obfuscation (Base64 + XOR logic)
// Note: Client-side "encryption" is mainly to prevent simple XSS data collection 
// and casual snooping. Real security depends on Backend tokenization.
const SECRET_SALT = 'lingua_garden_formosa_2024';

export const obfuscate = (str) => {
  if (!str) return str;
  try {
    const text = typeof str === 'string' ? str : JSON.stringify(str);
    // 1. Simple XOR with salt
    let xorResult = "";
    for (let i = 0; i < text.length; i++) {
        xorResult += String.fromCharCode(text.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
    }
    // 2. Convert to Base64 to make it safe for storage strings
    return btoa(unescape(encodeURIComponent(xorResult)));
  } catch (e) {
    console.error("Obfuscation error:", e);
    return str;
  }
};

export const deobfuscate = (str) => {
  if (!str) return str;
  try {
    // 1. Decode Base64
    const decoded = decodeURIComponent(escape(atob(str)));
    // 2. Reverse XOR
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
    }
    // 3. Try parse as JSON if it looks like one
    if (result.startsWith('{') || result.startsWith('[')) {
        return JSON.parse(result);
    }
    return result;
  } catch (e) {
    // If it's not obfuscated (old data), return as is
    return str;
  }
};
