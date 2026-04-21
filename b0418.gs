/**
 * 🌿 語林之境 (LinguaGarden) - 核心穩定 + 安全加固版
 * 檔案：b0418.gs
 * 
 * 此次更新：
 * 1. 植入 FLG_SECURE_2024_PRO_V1 安全令牌檢查
 * 2. 修復所有因傳輸導致的語法符號缺失 (引號、冒號、逗號)
 * 3. 優化登入、統計同步、單字本與自動審核系統
 */

// 🔒 安全與配置定數 (必須與前端一致)
const SECURITY_HANDSHAKE_TOKEN = "FLG_SECURE_2024_PRO_V1";

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);

    // 🛡️ 安全握手驗證
    if (payload.securityToken !== SECURITY_HANDSHAKE_TOKEN) {
      return errorResponse("🚨 偵測到未經授權的連線請求！系統已阻斷存取。");
    }

    var action = payload.action;

    switch (action) {
      case 'login': return handleLogin(payload);
      case 'getUserStats': return handleGetUserStats(payload);
      case 'updateUserStats': return handleUpdateUserStats(payload);
      case 'getRandomQuote': return handleGetRandomQuote(payload);
      case 'register': return handleApply(payload);
      case 'getLeaderboard':
        return handleGetLeaderboard();
      case 'getAnnouncements':
        return handleGetAnnouncements();
      case 'syncStats':
        return handleSyncStats(payload);
      case 'getSavedArticles': return handleGetSavedArticles(payload);
      case 'activateAccount': return handleActivateAccount(payload);
      default: return errorResponse("未知的 API Action: " + action);
    }
  } catch (err) {
    return errorResponse("伺服器解析錯誤：" + err.message);
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput("Formosa LinguaGarden API is running.");
}

// ─────────────────────────────────────────────────────────────────
// 1. 登入與基礎驗證
// ─────────────────────────────────────────────────────────────────
function handleLogin(payload) {
  var userId = payload.userId;
  var password = payload.password;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return errorResponse("系統未設定 Users 表單");

  var finder = sheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (finder) {
    var row = finder.getRow();
    var rowData = sheet.getRange(row, 1, 1, 6).getValues()[0]; 
    if (rowData[1] == password) {
      var apiKey = rowData[2]; 
      if (!apiKey) return successResponse({ needsActivation: true, userId: userId });
      
      // 檢查到期日
      var expiryDate = rowData[5];
      if (expiryDate) {
        var now = new Date();
        if (now > new Date(expiryDate)) {
          return errorResponse("⚠️ 您的會籍已到期 (" + Utilities.formatDate(new Date(expiryDate), "GMT+8", "yyyy-MM-dd") + ")\n\n請聯繫管理員續約。");
        }
      }
      
      // 獲取玩家基礎數據
      var stats = fetchUserStatsInternal(userId).stats;
      return successResponse({ apiKey: apiKey, userId: userId, stats: stats });
    } else {
      return errorResponse("密碼錯誤");
    }
  }
  return errorResponse("帳號不存在或尚未通過審核。");
}

function verifyUserAndGetRow(userId, apiKey) {
  if (!userId || !apiKey) return { error: "權限不足" };
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  var finder = sheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (finder) {
    var row = finder.getRow();
    var rowData = sheet.getRange(row, 1, 1, 3).getValues()[0];
    if (rowData[2] == apiKey) return { rowIndex: row, data: rowData };
  }
  return { error: "無效的令牌" };
}

// ─────────────────────────────────────────────────────────────────
// 2. 審核系統：申請與激活
// ─────────────────────────────────────────────────────────────────
function handleApply(payload) {
  var userId = payload.userId;
  var password = payload.password;
  var email = payload.email;
  if (!userId || !password || !email) return errorResponse("請填寫完整資訊");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userSheet = ss.getSheetByName("Users");
  if (userSheet && userSheet.createTextFinder(userId).matchEntireCell(true).findNext()) {
    return errorResponse("園丁名稱已被佔用");
  }

  var license = "LG-" + Math.floor(Math.random()*9000+1000) + "-" + Math.floor(Math.random()*9000+1000);
  if (userSheet) userSheet.appendRow([userId, password, "", new Date(), "", "", email]);
  
  var lSheet = ss.getSheetByName("Licenses") || ss.insertSheet("Licenses");
  lSheet.appendRow([userId, license]);
  
  // 初始化數據
  updateUserStatsInternal(userId, { coins: 100, currentPlant: "黃花風鈴木", plantStage: 0, unlockedPlants: ["黃花風鈴木"], exp: 0, streak: 1, essence: {light:0, rain:0, soil:0} }, []);
  
  try {
    MailApp.sendEmail(email, "✨ [語林之境] 申請成功", "您的啟動金鑰為：" + license);
  } catch(e) {}

  return successResponse({ msg: "申請成功！請查看郵件獲取金鑰。" });
}

function handleActivateAccount(payload) {
  var userId = payload.userId;
  var licenseKey = payload.licenseKey;
  var userApiKey = payload.userApiKey;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lSheet = ss.getSheetByName("Licenses");
  var lFinder = lSheet.createTextFinder(licenseKey).matchEntireCell(true).findNext();
  if (!lFinder || lSheet.getRange(lFinder.getRow(), 1).getValue() != userId) {
    return errorResponse("金鑰無效");
  }
  
  var userSheet = ss.getSheetByName("Users");
  var f = userSheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (f) {
    var row = f.getRow();
    var expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    userSheet.getRange(row, 3).setValue(userApiKey);
    userSheet.getRange(row, 6).setValue(expiry);
    return successResponse({ apiKey: userApiKey, userId: userId });
  }
  return errorResponse("帳號不存在");
}

// ─────────────────────────────────────────────────────────────────
// 3. 統計數據與收藏
// ─────────────────────────────────────────────────────────────────
function fetchUserStatsInternal(userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sSheet = ss.getSheetByName("UserStats");
  var stats = { coins: 0, currentPlant: "黃花風鈴木", plantStage: 0, unlockedPlants: [], exp: 0, essence: {light:0, rain:0, soil:0}, streak: 0 };
  if (sSheet) {
    var f = sSheet.createTextFinder(userId).matchEntireCell(true).findNext();
    if (f) {
      var vals = sSheet.getRange(f.getRow(), 1, 1, 11).getValues()[0];
      try {
        var extra = JSON.parse(vals[10] || "{}");
        stats = {
          coins: Number(vals[1] || 0),
          currentPlant: vals[2] || "黃花風鈴木",
          plantStage: Number(vals[3] || 0),
          unlockedPlants: String(vals[5]).split(","),
          essence: extra.essence || {light:0, rain:0, soil:0},
          streak: extra.streak || 0,
          lastStudyDate: extra.lastStudyDate || null
        };
      } catch(e) {}
    }
  }
  return { stats: stats };
}

function handleGetUserStats(payload) {
  var auth = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (auth.error) return errorResponse(auth.error);
  
  var internal = fetchUserStatsInternal(payload.userId);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var savedWords = [];
  var wSheet = ss.getSheetByName("WordBank");
  if (wSheet) {
    wSheet.createTextFinder(payload.userId).matchEntireCell(true).findAll().forEach(function(r){
      var v = wSheet.getRange(r.getRow(), 1, 1, 9).getValues()[0];
      savedWords.push({ word: v[1], pronunciation: v[2], meaning: v[3], exampleSentence: v[4], exampleTranslation: v[5], id: v[7] });
    });
  }
  return successResponse({ stats: internal.stats, savedWords: savedWords });
}

function handleUpdateUserStats(payload) {
  var auth = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (auth.error) return errorResponse(auth.error);
  updateUserStatsInternal(payload.userId, payload.stats, payload.savedWords);
  return successResponse({ updated: true });
}

function updateUserStatsInternal(uid, stats, words) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sSheet = ss.getSheetByName("UserStats") || ss.insertSheet("UserStats");
  var f = sSheet.createTextFinder(uid).matchEntireCell(true).findNext();
  if (stats) {
    var extra = JSON.stringify({ 
      essence: stats.essence, 
      streak: stats.streak,
      lastStudyDate: stats.lastStudyDate 
    });
    var row = [uid, stats.coins, stats.currentPlant, stats.plantStage, 0, stats.unlockedPlants.join(","), stats.exp, "", "", "", extra];
    if (f) sSheet.getRange(f.getRow(), 1, 1, 11).setValues([row]);
    else sSheet.appendRow(row);
  }
}

function handleSaveArticle(payload) {
  var auth = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (auth.error) return errorResponse(auth.error);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("ArticleBank") || ss.insertSheet("ArticleBank");
  sheet.appendRow([payload.userId, payload.title, payload.content, payload.langKey, new Date(), payload.id]);
  return successResponse({ success: true });
}

function handleGetSavedArticles(payload) {
  var auth = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (auth.error) return errorResponse(auth.error);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ArticleBank");
  var list = [];
  if (sheet) {
    sheet.createTextFinder(payload.userId).matchEntireCell(true).findAll().forEach(function(r){
      var v = sheet.getRange(r.getRow(), 1, 1, 6).getValues()[0];
      list.push({ title: v[1], content: v[2], langKey: v[3] });
    });
  }
  return successResponse(list);
}

function handleGetLeaderboard() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UserStats");
  if (!sheet) return successResponse([]);
  var data = sheet.getDataRange().getValues();
  var list = data.slice(1).map(function(r){
    var extra = {};
    try { extra = JSON.parse(r[10] || "{}"); } catch(e) {}
    
    // 計算精華總量
    var totalEssence = (extra.essence?.light || 0) + (extra.essence?.rain || 0) + (extra.essence?.soil || 0);
    // 計算解鎖植物數量
    var plantCount = String(r[5] || "").split(",").filter(function(p){ return p !== "" }).length;

    return { 
      name: r[0], 
      streak: extra.streak || 0,
      essence: totalEssence,
      plants: plantCount,
      exp: Number(r[6] || 0)
    };
  });
  return successResponse(list);
}

function handleGetRandomQuote() {
  return successResponse({ eng: "The best way to predict the future is to create it.", chn: "預測未來最好的方法就是創造它。", author: "Peter Drucker" });
}

/**
 * 📢 取得系統公告
 */
function handleGetAnnouncements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Announcements');
    if (!sheet) return successResponse([]);
    
    const rows = sheet.getDataRange().getValues();
    const data = [];
    
    // 從第 2 列開始讀取 (跳過標題)
    for (let i = 1; i < rows.length; i++) {
      const [date, type, title, content, active] = rows[i];
      if (active === true || String(active).toUpperCase() === 'TRUE') {
        data.push({
          date: date instanceof Date ? Utilities.formatDate(date, "GMT+8", "yyyy/MM/dd") : date,
          type: type || "一般",
          title,
          content: String(content || "").replace(/\n/g, '<br/>'),
        });
      }
    }
    
    // 排序：最新的公告排前面
    data.reverse();
    return successResponse(data.slice(0, 5));
  } catch (e) {
    return errorResponse(e.toString());
  }
}

function successResponse(d) { return ContentService.createTextOutput(JSON.stringify({status: 'success', data: d})).setMimeType(ContentService.MimeType.JSON); }
function errorResponse(m) { return ContentService.createTextOutput(JSON.stringify({status: 'error', message: m})).setMimeType(ContentService.MimeType.JSON); }
