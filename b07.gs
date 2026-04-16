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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return errorResponse("系統未設定 Users 表單");

  var finder = sheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (finder) {
    var rowData = sheet.getRange(finder.getRow(), 1, 1, 3).getValues()[0];
    if (rowData[1] == password) {
      var apiKey = rowData[2]; 
      if (!apiKey) return successResponse({ needsActivation: true, userId: userId });
      
      // 修復：登入時直接抓取並回傳金幣等資料，防止歸零
      var stats = { coins: 0, essence: { light: 0, rain: 0, soil: 0 }, unlockedPlants: [], streak: 0 };
      var sSheet = ss.getSheetByName("UserStats");
      if (sSheet) {
        var f = sSheet.createTextFinder(userId).matchEntireCell(true).findNext();
        if (f) {
           try {
             stats = JSON.parse(sSheet.getRange(f.getRow(), 2).getValue() || "{}");
           } catch(e) {}
        }
      }
      
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

  // 改為去 Licenses 分頁找金鑰
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lSheet = ss.getSheetByName("Licenses");
  var lFinder = lSheet.createTextFinder(licenseKey).matchEntireCell(true).findNext();
  if (!lFinder || lSheet.getRange(lFinder.getRow(), 1).getValue() != userId) {
    return errorResponse("啟動金鑰不正確或不屬於此帳號");
  }
  
  var userSheet = ss.getSheetByName("Users");
  var finder = userSheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (!finder) return errorResponse("帳號異常");
  
  var row = finder.getRow();
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
      
      // 1. 寫入 Users (A:UserID, B:Pass, C:ApiKey, D:RegDate, E:Devices, F:Expiry)
      var userSheet = ss.getSheetByName("Users");
      if (userSheet) userSheet.appendRow([userId, password, "", new Date(), "", ""]);
      
      // 2. 寫入 Licenses (A:UserID, B:LicenseKey)
      var lSheet = ss.getSheetByName("Licenses") || ss.insertSheet("Licenses");
      lSheet.appendRow([userId, license]);
      
      // 3. 寫入 UserStats (配合多欄位結構)
      // B:Coins, C:Plant, D:Stage, F:Unlocked, G:Exp, K:ExtraJson
      var statsSheet = ss.getSheetByName("UserStats");
      if (statsSheet) {
        var extraJson = JSON.stringify({ essence: {light:0, rain:0, soil:0}, streak: 1, lastStudyDate: new Date().toDateString() });
        statsSheet.appendRow([userId, 100, "黃花風鈴木", 0, 0, '["黃花風鈴木"]', 0, "[]", "[]", "{}", extraJson]);
      }

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

// ─────────────────────────────────────────────────────────────────
// 4. 其他功能 (排行榜、文章、小語、強制授權)
// ─────────────────────────────────────────────────────────────────

function handleGetUserStats(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stats = { coins: 0, currentPlant: '黃花風鈴木', plantStage: 0, unlockedPlants: [], exp: 0, essence: {light:0, rain:0, soil:0}, streak: 0 }, savedWords = [];
  
  var sSheet = ss.getSheetByName("UserStats");
  if (sSheet) {
    var f = sSheet.createTextFinder(payload.userId).matchEntireCell(true).findNext();
    if (f) {
      var r = f.getRow();
      var vals = sSheet.getRange(r, 1, 1, 11).getValues()[0];
      // 依照截圖映射欄位
      stats.coins = Number(vals[1] || 0);
      stats.currentPlant = vals[2] || '黃花風鈴木';
      stats.plantStage = Number(vals[3] || 0);
      try {
        // F欄是 UnlockedPlants，可能是 ["A","B"] 格式或 A,B 格式
        var rawUnlocked = vals[5];
        if (rawUnlocked && rawUnlocked.startsWith('[')) {
          stats.unlockedPlants = JSON.parse(rawUnlocked);
        } else {
          stats.unlockedPlants = rawUnlocked ? String(rawUnlocked).split(',') : [];
        }
      } catch(e) { stats.unlockedPlants = []; }
      
      stats.exp = Number(vals[6] || 0);
      
      // K 欄 (Index 10) 存放精華與連勝資料 (JSON)
      try {
        var extra = JSON.parse(vals[10] || "{}");
        stats.essence = extra.essence || {light:0, rain:0, soil:0};
        stats.streak = extra.streak || 0;
        stats.lastStudyDate = extra.lastStudyDate || null;
      } catch(e) {}
    }
  }

  var wSheet = ss.getSheetByName("WordBank");
  if (wSheet) {
    wSheet.createTextFinder(payload.userId).matchEntireCell(true).findAll().forEach(function(r){
      var v = wSheet.getRange(r.getRow(), 1, 1, 9).getValues()[0];
      // A:UserID, B:Word, C:IPA, D:Definition, E:Context, F:ContextChn, G:Date, H:ID, I:Metadata
      savedWords.push({ 
        word: v[1], 
        pronunciation: v[2], 
        meaning: v[3], 
        exampleSentence: v[4], 
        exampleTranslation: v[5], 
        addedAt: new Date(v[6] || Date.now()).getTime(), 
        id: v[7], 
        ...JSON.parse(v[8]||"{}") 
      });
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
    var s = payload.stats;
    // 組合成額外資料 (Essence, Streak) 存入 K 欄
    var extraJson = JSON.stringify({ essence: s.essence, streak: s.streak, lastStudyDate: s.lastStudyDate });
    var unlockedJson = JSON.stringify(s.unlockedPlants || []);
    
    // 準備寫入橫列 (A-K)
    var rowData = [payload.userId, s.coins, s.currentPlant, s.plantStage, 0, unlockedJson, s.exp || 0, "[]", "[]", "{}", extraJson];
    
    if (f) {
      // 只更新 B, C, D, F, G, K 欄以防覆蓋其他手動欄位
      var r = f.getRow();
      sSheet.getRange(r, 2).setValue(s.coins);
      sSheet.getRange(r, 3).setValue(s.currentPlant);
      sSheet.getRange(r, 4).setValue(s.plantStage);
      sSheet.getRange(r, 6).setValue(unlockedJson);
      sSheet.getRange(r, 7).setValue(s.exp || 0);
      sSheet.getRange(r, 11).setValue(extraJson);
    } else {
      sSheet.appendRow(rowData);
    }
  }

  if (payload.savedWords) {
    var wSheet = ss.getSheetByName("WordBank") || ss.insertSheet("WordBank");
    var existingIds = {};
    wSheet.createTextFinder(payload.userId).matchEntireCell(true).findAll().forEach(function(r){ existingIds[wSheet.getRange(r.getRow(), 8).getValue()] = r.getRow(); });
    payload.savedWords.forEach(function(w){
      var id = w.id || (w.word + "_" + w.addedAt);
      // A:UserID, B:Word, C:IPA, D:Definition, E:Context, F:ContextChn, G:Date, H:ID, I:Metadata
      var metaData = JSON.stringify({reviewCount: w.reviewCount, intervalDays: w.intervalDays, nextReview: w.nextReview, langKey: w.langKey});
      var row = [payload.userId, w.word, w.pronunciation, w.meaning, w.exampleSentence, w.exampleTranslation, new Date(w.addedAt||Date.now()), id, metaData];
      
      if (existingIds[id]) {
        wSheet.getRange(existingIds[id], 1, 1, 9).setValues([row]);
      } else {
        wSheet.appendRow(row);
      }
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
