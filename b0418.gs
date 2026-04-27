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
      case 'syncStats': 
      case 'updateUserStats': 
        return handleUpdateUserStats(payload);
      case 'getRandomQuote': return handleGetRandomQuote(payload);
      case 'register': return handleApply(payload);
      case 'getLeaderboard': return handleGetLeaderboard();
      case 'getAnnouncements': return handleGetAnnouncements();
      case 'saveArticle': return handleSaveArticle(payload);
      case 'getSavedArticles': return handleGetSavedArticles(payload);
      case 'activateAccount': return handleActivateAccount(payload);
      case 'sendFeedback': return handleSendFeedback(payload);
      default: return errorResponse("未知的 API Action: " + action);
    }
  } catch (err) {
    return errorResponse("伺服器解析錯誤：" + err.message);
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput("Formosa LinguaGarden API is running.");
}

/**
 * 🛠️ 管理員選單：自動在打開試算表時載入
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🌿 語林管理')
    .addItem('✨ 為選中列續約 30 天', 'adminExtendMembership')
    .addItem('🔑 重設選中列密碼為 1234', 'adminResetPassword')
    .addSeparator()
    .addItem('📩 查看意見回饋看板', 'adminViewFeedback')
    .addToUi();
}

function adminViewFeedback() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Feedback") || ss.insertSheet("Feedback");
  ss.setActiveSheet(sheet);
}

function adminExtendMembership() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  var range = sheet.getActiveRange();
  var row = range.getRow();
  
  if (row <= 1) {
    SpreadsheetApp.getUi().alert("❌ 請先選中一個園丁的資料列！");
    return;
  }

  var expiryCell = sheet.getRange(row, 6); // 第 6 欄是到期日
  var currentExpiry = expiryCell.getValue();
  var baseDate = (currentExpiry && currentExpiry instanceof Date) ? currentExpiry : new Date();
  
  var newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + 30);
  
  expiryCell.setValue(newExpiry);
  expiryCell.setBackground("#d1fae5"); // 標註為已續約顏色
  
  SpreadsheetApp.getUi().alert("✅ 續約成功！\n園丁：" + sheet.getRange(row, 1).getValue() + "\n新到期日：" + Utilities.formatDate(newExpiry, "GMT+8", "yyyy-MM-dd"));
}

function adminResetPassword() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert('確認', '確定要將此園丁密碼重設為 1234 嗎？', ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    var row = sheet.getActiveRange().getRow();
    sheet.getRange(row, 2).setValue("1234");
    ui.alert("✅ 密碼已重設。");
  }
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
          lastStudyDate: extra.lastStudyDate || null,
          settings: extra.settings || {},
          expedition: extra.expedition || { currentNode: 0, diceRemaining: 5, revivedNodes: [0], plantedTrees: {} }
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
      lastStudyDate: stats.lastStudyDate,
      settings: stats.settings || {},
      expedition: stats.expedition || { currentNode: 0, diceRemaining: 5, revivedNodes: [0], plantedTrees: {} }
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
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get("FLG_LEADERBOARD_V1");
  if (cachedData) {
    return ContentService.createTextOutput(cachedData).setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UserStats");
  if (!sheet) return successResponse([]);
  
  // 效能優化：只讀取有資料的範圍
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return successResponse([]);
  
  var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  var list = data.map(function(r){
    var extra = {};
    try { extra = JSON.parse(r[10] || "{}"); } catch(e) {}
    
    var totalEssence = (extra.essence?.light || 0) + (extra.essence?.rain || 0) + (extra.essence?.soil || 0);
    var plantCount = String(r[5] || "").split(",").filter(function(p){ return p !== "" }).length;

    return { 
      name: r[0], 
      streak: Number(extra.streak || 0),
      essence: totalEssence,
      plants: plantCount,
      exp: Number(r[6] || 0)
    };
  });

  // 伺服器端預排序，減輕手機負擔
  // 預設按連勝排序，前端可再二次排序
  list.sort(function(a, b) { return b.streak - a.streak; });

  // 分片讀取：只取前 50 名，大幅減少流量
  var shardedList = list.slice(0, 50);
  
  var finalResponse = JSON.stringify({status: 'success', data: shardedList});
  
  // 存入快取 (300 秒 = 5 分鐘)
  try {
    cache.put("FLG_LEADERBOARD_V1", finalResponse, 300);
  } catch(e) {}

  return ContentService.createTextOutput(finalResponse).setMimeType(ContentService.MimeType.JSON);
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

function handleSendFeedback(payload) {
  var auth = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (auth.error) return errorResponse(auth.error);
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Feedback") || ss.insertSheet("Feedback");
  
  // 如果是新表，建立標題
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["時間", "園丁ID", "類別", "回饋內容", "處理狀態", "備註"]);
    sheet.getRange(1, 1, 1, 6).setBackground("#f3f4f6").setFontWeight("bold");
  }
  
  sheet.appendRow([new Date(), payload.userId, payload.type || "一般", payload.content, "待處理", ""]);
  return successResponse({ success: true });
}

function successResponse(d) { return ContentService.createTextOutput(JSON.stringify({status: 'success', data: d})).setMimeType(ContentService.MimeType.JSON); }
function errorResponse(m) { return ContentService.createTextOutput(JSON.stringify({status: 'error', message: m})).setMimeType(ContentService.MimeType.JSON); }
