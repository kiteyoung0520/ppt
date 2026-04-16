/**
 * Formosa LinguaGarden (b07) - 核心完整版
 * 功能：文字搜尋器優化、審核制註冊、自動發信激活系統
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action;

    switch (action) {
      case 'login': return handleLogin(payload);
      case 'getUserStats': return handleGetUserStats(payload);
      case 'updateUserStats': return handleUpdateUserStats(payload);
      case 'getRandomQuote': return handleGetRandomQuote(payload);
      case 'register': return handleApply(payload);
      case 'getLeaderboard': return handleGetLeaderboard(payload);
      case 'saveArticle': return handleSaveArticle(payload);
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
// 1. 登入與基礎驗證 (搜尋器優化版)
// ─────────────────────────────────────────────────────────────────
function handleLogin(payload) {
  var userId = payload.userId;
  var password = payload.password;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return errorResponse("系統未設定 Users 表單");

  var finder = sheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (finder) {
    var rowData = sheet.getRange(finder.getRow(), 1, 1, 3).getValues()[0];
    if (rowData[1] == password) {
      var apiKey = rowData[2]; 
      if (!apiKey) return successResponse({ needsActivation: true, userId: userId });
      return successResponse({ apiKey: apiKey, userId: userId });
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
  var appSheet = ss.getSheetByName("Applications") || ss.insertSheet("Applications");
  
  var userSheet = ss.getSheetByName("Users");
  if (userSheet && userSheet.createTextFinder(userId).matchEntireCell(true).findNext()) {
    return errorResponse("園丁名稱已被佔用");
  }

  appSheet.appendRow([userId, password, email, new Date(), "Pending", ""]);
  
  // 給管理員與申請者的通知
  try {
    var adminEmail = Session.getScriptOwner().getEmail();
    MailApp.sendEmail(adminEmail, "[通知] 新的園丁申請", "園丁 " + userId + " 已送出入園申請。");
    MailApp.sendEmail(email, "🌿 [語林之境] 申請已收到", "親愛的 " + userId + "，我們已收到您的申請，審核通過後會再次寄信給您。");
  } catch(e) {}

  return successResponse({ msg: "審核申請已送出！" });
}

function handleActivateAccount(payload) {
  var userId = payload.userId;
  var licenseKey = payload.licenseKey;
  var userApiKey = payload.userApiKey;
  var userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  var finder = userSheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (!finder) return errorResponse("帳號異常");
  
  var row = finder.getRow();
  var rowData = userSheet.getRange(row, 1, 1, 4).getValues()[0];
  if (rowData[3] != licenseKey) return errorResponse("啟動金鑰不正確");

  userSheet.getRange(row, 3).setValue(userApiKey); 
  return successResponse({ apiKey: userApiKey, userId: userId });
}

// ─────────────────────────────────────────────────────────────────
// 3. 試算表自動化核准 (onEdit)
// ─────────────────────────────────────────────────────────────────

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  if (sheet.getName().toLowerCase() === "applications" && range.getColumn() === 5) {
    var newValue = range.getValue();
    if (newValue === "Approved") {
      var row = range.getRow();
      var data = sheet.getRange(row, 1, 1, 7).getValues()[0];
      if (data[5]) return; // 已有金鑰則不重複跑

      var userId = data[0], password = data[1], email = data[2];
      var license = "LG-" + Math.floor(Math.random()*9000+1000) + "-" + Math.floor(Math.random()*9000+1000);
      sheet.getRange(row, 6).setValue(license);

      var ss = e.source;
      var userSheet = ss.getSheetByName("Users");
      if (userSheet) userSheet.appendRow([userId, password, "", license, "[]", ""]);
      
      var statsSheet = ss.getSheetByName("UserStats");
      if (statsSheet) statsSheet.appendRow([userId, JSON.stringify({ coins: 100, streak: 1, essence: {light:0, rain:0, soil:0}, unlockedPlants: [] })]);

      try {
        var subject = "✨ [語林之境] 您的入園申請已核准";
        var body = "親愛的 " + userId + "：\n\n您的入園申請已通過！\n🔑 啟動金鑰：" + license + "\n\n請回到登入頁面進行激活。";
        MailApp.sendEmail(email, subject, body);
        sheet.getRange(row, 7).setValue("✅ 已寄出");
      } catch(err) {
        sheet.getRange(row, 7).setValue("❌ 發信失敗: " + err.message);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// 4. 其他功能 (排行榜、文章、小語、強制授權)
// ─────────────────────────────────────────────────────────────────

function handleGetUserStats(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stats = {}, savedWords = [];
  var sSheet = ss.getSheetByName("UserStats");
  if (sSheet) {
    var f = sSheet.createTextFinder(payload.userId).matchEntireCell(true).findNext();
    if (f) stats = JSON.parse(sSheet.getRange(f.getRow(), 2).getValue() || "{}");
  }
  var wSheet = ss.getSheetByName("WordBank");
  if (wSheet) {
    wSheet.createTextFinder(payload.userId).matchEntireCell(true).findAll().forEach(function(r){
      var v = wSheet.getRange(r.getRow(), 1, 1, 9).getValues()[0];
      savedWords.push({ word: v[1], pronunciation: v[2], meaning: v[3], exampleSentence: v[4], exampleTranslation: v[5], addedAt: new Date(v[6]).getTime(), id: v[7], ...JSON.parse(v[8]||"{}") });
    });
  }
  return successResponse({ stats: stats, savedWords: savedWords });
}

function handleUpdateUserStats(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (payload.stats) {
    var sSheet = ss.getSheetByName("UserStats") || ss.insertSheet("UserStats");
    var f = sSheet.createTextFinder(payload.userId).matchEntireCell(true).findNext();
    if (f) sSheet.getRange(f.getRow(), 2).setValue(JSON.stringify(payload.stats)); else sSheet.appendRow([payload.userId, JSON.stringify(payload.stats)]);
  }
  if (payload.savedWords) {
    var wSheet = ss.getSheetByName("WordBank") || ss.insertSheet("WordBank");
    var existingIds = {};
    wSheet.createTextFinder(payload.userId).matchEntireCell(true).findAll().forEach(function(r){ existingIds[wSheet.getRange(r.getRow(), 8).getValue()] = r.getRow(); });
    payload.savedWords.forEach(function(w){
      var id = w.id || (w.word + "_" + w.addedAt);
      var row = [payload.userId, w.word, w.pronunciation, w.meaning, w.exampleSentence, w.exampleTranslation, new Date(w.addedAt||Date.now()), id, JSON.stringify({reviewCount: w.reviewCount, intervalDays: w.intervalDays, nextReview: w.nextReview, langKey: w.langKey})];
      if (existingIds[id]) wSheet.getRange(existingIds[id], 1, 1, 9).setValues([row]); else wSheet.appendRow(row);
    });
  }
  return successResponse({ updated: true });
}

function handleGetSavedArticles(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ArticleBank");
  if (!sheet) return successResponse([]);
  var articles = [];
  sheet.createTextFinder(payload.userId).matchEntireCell(true).findAll().forEach(function(r){
    var v = sheet.getRange(r.getRow(), 1, 1, 6).getValues()[0];
    articles.push({ userId: v[0], title: v[1], content: v[2], langKey: v[3], date: v[4], id: v[5] });
  });
  return successResponse(articles);
}

function handleSaveArticle(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ArticleBank") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("ArticleBank");
  sheet.appendRow([payload.userId, payload.title, payload.content, payload.langKey, new Date(), payload.id]);
  return successResponse({ success: true });
}

function handleGetLeaderboard() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leaderboard");
  if (!sheet) return successResponse([]);
  var data = sheet.getDataRange().getValues();
  var p = data.slice(1).map(function(r) {
    var n = String(r[0]);
    return { name: n.substring(0,1) + "***" + n.substring(n.length-1), streak: r[1], essence: r[2], plants: r[3], vocab: r[4] };
  });
  return successResponse(p);
}

function handleGetRandomQuote() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Quotes');
  if (!sheet) return errorResponse("No Quotes sheet");
  var data = sheet.getDataRange().getValues();
  var r = data[Math.floor(Math.random()*(data.length-1))+1];
  return successResponse({ author: r[1], eng: r[2], chn: r[3] });
}

function successResponse(d) { return ContentService.createTextOutput(JSON.stringify({status:'success', data:d})).setMimeType(ContentService.MimeType.JSON); }
function errorResponse(m) { return ContentService.createTextOutput(JSON.stringify({status:'error', message:m})).setMimeType(ContentService.MimeType.JSON); }

function forceAuthorizeEmail() {
  var myEmail = Session.getActiveUser().getEmail();
  MailApp.sendEmail(myEmail, "🔒 權限開通", "發信功能已解鎖！");
  Logger.log("權限已開通");
}
