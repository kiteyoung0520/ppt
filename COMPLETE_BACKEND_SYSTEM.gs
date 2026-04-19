/**
 * 🌿 語林之境 (LinguaGarden) - 完整後端守護系統
 * 版本：V2.0 (Security Hardened)
 * 
 * 使用方式：
 * 1. 在 Google Sheets 建立試算表
 * 2. 建立以下三個工作表： "Users", "Stats", "Articles"
 * 3. 開啟指令碼編輯器，將此代碼完整覆蓋
 * 4. 點擊「部署」->「新部署」->「網頁應用程式 (所有人均可存取)」
 */

// 🔒 安全與配置定數
const SECURITY_TOKEN = "FLG_SECURE_2024_PRO_V1"; 
const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

/**
 * 核心進入點
 */
function doPost(e) {
  var result = { status: "error", message: "未知系統異常" };
  
  try {
    // A. 基礎格式校驗
    if (!e || !e.postData || !e.postData.contents) throw "無效的 POST 請求";
    var payload = JSON.parse(e.postData.contents);
    
    // B. 🛡️ 安全握手驗證 (第一級連鎖防護)
    if (payload.securityToken !== SECURITY_TOKEN) {
      return response({ status: "error", message: "🚨 認證令牌無效，存取被拒絕。" });
    }

    // C. 路由控制 (Action Router)
    var action = payload.action;
    
    switch (action) {
      case "ping":
        result = { status: "success", data: "Pong! 系統連線安全。" };
        break;
        
      case "login":
        result = handleLogin(payload.userId, payload.password);
        break;
        
      case "register":
        result = handleRegister(payload.userId, payload.password, payload.email);
        break;
        
      case "activateAccount":
        result = handleActivate(payload.userId, payload.licenseKey, payload.userApiKey);
        break;
        
      case "getUserStats":
        result = fetchUserStats(payload.userId);
        break;
        
      case "updateUserStats":
        result = updateUserStats(payload.userId, payload.stats, payload.savedWords);
        break;
        
      case "saveArticle":
        result = saveUserArticle(payload.userId, payload.article);
        break;
        
      case "fetchSavedArticles":
        result = fetchUserArticles(payload.userId);
        break;
        
      case "getLeaderboard":
        result = generateLeaderboard();
        break;

      case "getRandomQuote":
        result = fetchRandomQuote();
        break;
        
      default:
        throw "未定義的系統指令: " + action;
    }

  } catch (err) {
    result = { status: "error", message: err.toString() };
  }

  return response(result);
}

/**
 * 通用回傳格式化
 */
function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 核心業務邏輯 (示意架構，需搭配 Sheet 欄位)
// ==========================================

function handleLogin(uid, pwd) {
  var sheet = SPREADSHEET.getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == uid && data[i][1] == pwd) {
      return { 
        status: "success", 
        data: { 
          needsActivation: !data[i][5], // 第六欄為 activated 標記
          apiKey: data[i][4],           // 第五欄為 API Key
          stats: fetchUserStats(uid).data // 同步獲取統計
        } 
      };
    }
  }
  throw "園丁帳號或密碼錯誤";
}

function handleRegister(uid, pwd, email) {
  var sheet = SPREADSHEET.getSheetByName("Users");
  var licKey = "LG-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  // 欄位：ID, PWD, Email, License, GeminiKey, Activated
  sheet.appendRow([uid, pwd, email, licKey, "", false]);
  
  // 實際應用中可在此透過 MailApp.sendEmail 寄送 licKey
  return { status: "success", message: "註冊成功，請獲取啟動金鑰。" };
}

function handleActivate(uid, lic, key) {
  var sheet = SPREADSHEET.getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == uid && data[i][3] == lic) {
      sheet.getRange(i+1, 5).setValue(key);   // 寫入 Gemini Key
      sheet.getRange(i+1, 6).setValue(true);  // 標記已啟動
      return { status: "success", data: { apiKey: key } };
    }
  }
  throw "啟動金鑰無效或帳號不符";
}

function updateUserStats(uid, stats, words) {
  var sheet = SPREADSHEET.getSheetByName("Stats");
  var data = sheet.getDataRange().getValues();
  var row = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == uid) { row = i + 1; break; }
  }
  
  var statsStr = JSON.stringify(stats);
  var wordsStr = JSON.stringify(words);
  
  if (row !== -1) {
    sheet.getRange(row, 2).setValue(statsStr);
    sheet.getRange(row, 3).setValue(wordsStr);
  } else {
    sheet.appendRow([uid, statsStr, wordsStr]);
  }
  return { status: "success" };
}

function fetchUserStats(uid) {
  var sheet = SPREADSHEET.getSheetByName("Stats");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == uid) {
      return { 
        status: "success", 
        data: { 
          stats: JSON.parse(data[i][1]), 
          savedWords: JSON.parse(data[i][2]) 
        } 
      };
    }
  }
  return { status: "success", data: { stats: {}, savedWords: [] } };
}

function saveUserArticle(uid, art) {
  var sheet = SPREADSHEET.getSheetByName("Articles");
  sheet.appendRow([uid, art.title, art.content, art.langKey, new Date()]);
  return { status: "success" };
}

function fetchUserArticles(uid) {
  var sheet = SPREADSHEET.getSheetByName("Articles");
  var data = sheet.getDataRange().getValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == uid) {
      results.push({ id: i, title: data[i][1], content: data[i][2], langKey: data[i][3], date: data[i][4] });
    }
  }
  return { status: "success", data: results };
}

function fetchRandomQuote() {
  // 這裡可串接實際 Quotes 資料表
  return { status: "success", data: { 
    eng: "The roots of education are bitter, but the fruit is sweet.", 
    chn: "教育的根是苦的，但其果實是甜的。", 
    author: "Aristotle" 
  } };
}

function generateLeaderboard() {
  var sheet = SPREADSHEET.getSheetByName("Stats");
  var data = sheet.getDataRange().getValues();
  var ranks = data.slice(1).map(function(r) {
    var s = JSON.parse(r[1]);
    var score = (s.essence?.light || 0) + (s.essence?.rain || 0) + (s.essence?.soil || 0);
    return { name: r[0], score: score };
  }).sort(function(a, b) { return b.score - a.score; }).slice(0, 10);
  
  return { status: "success", data: ranks };
}
