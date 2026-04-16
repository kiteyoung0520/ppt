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
    var row = finder.getRow();
    var rowData = sheet.getRange(row, 1, 1, 6).getValues()[0]; // 讀到 F 欄
    if (rowData[1] == password) {
      var apiKey = rowData[2]; 
      if (!apiKey) return successResponse({ needsActivation: true, userId: userId });
      
      // 💡 檢查到期日 (F 欄)
      var expiryDate = rowData[5];
      if (expiryDate) {
        var now = new Date();
        if (now > new Date(expiryDate)) {
          return errorResponse("⚠️ 您的會籍已到期 (" + Utilities.formatDate(new Date(expiryDate), "GMT+8", "yyyy-MM-dd") + ")\n\n" +
                               "【續約贊助方案】\n" +
                               "💸 贊助 100 元 (含嘉義文教 50 元、嘉義分苑起厝 50 元)\n" +
                               "📩 贊助方式：請洽嘉義分苑或 kiteyoung@gmail.com");
        }
      }
      
      // 修復：登入時直接抓取並回傳金幣等資料，防止歸零
      var stats = { coins: 0, currentPlant: '黃花風鈴木', plantStage: 0, unlockedPlants: [], exp: 0, essence: {light:0, rain:0, soil:0}, streak: 0 };
      var sSheet = ss.getSheetByName("UserStats");
      if (sSheet) {
        var f = sSheet.createTextFinder(userId).matchEntireCell(true).findNext();
        if (f) {
          var r = f.getRow();
          var vals = sSheet.getRange(r, 1, 1, 11).getValues()[0];
          var rawB = vals[1];
          if (typeof rawB === 'string' && rawB.startsWith('{')) {
            try {
              var oldJson = JSON.parse(rawB);
              stats.coins = Number(oldJson.coins || 0);
              stats.currentPlant = oldJson.currentPlant || '黃花風鈴木';
              stats.plantStage = Number(oldJson.plantStage || 0);
              stats.exp = Number(oldJson.exp || 0);
              stats.unlockedPlants = oldJson.unlockedPlants || [];
              stats.essence = oldJson.essence || {light:0, rain:0, soil:0};
              stats.streak = oldJson.streak || 0;
            } catch(e) {}
          } else {
            stats.coins = Number(vals[1] || 0);
            stats.currentPlant = vals[2] || '黃花風鈴木';
            stats.plantStage = Number(vals[3] || 0);
            stats.exp = Number(vals[6] || 0);
            try {
              var extra = JSON.parse(vals[10] || "{}");
              stats.essence = extra.essence || {light:0, rain:0, soil:0};
              stats.streak = extra.streak || 0;
            } catch(e) {}
          }
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
  var userSheet = ss.getSheetByName("Users");
  if (userSheet && userSheet.createTextFinder(userId).matchEntireCell(true).findNext()) {
    return errorResponse("園丁名稱已被佔用");
  }

  // 💡 [全自動化路徑] 直接生成金鑰與開通帳號
  var license = "LG-" + Math.floor(Math.random()*9000+1000) + "-" + Math.floor(Math.random()*9000+1000);
  
  // 1. 寫入 Users (A:UserID, B:Pass, C:ApiKey, D:RegDate, E:Devices, F:Expiry, G:Email)
  if (userSheet) userSheet.appendRow([userId, password, "", new Date(), "", "", email]);
  
  // 2. 寫入 Licenses (A:UserID, B:LicenseKey)
  var lSheet = ss.getSheetByName("Licenses") || ss.insertSheet("Licenses");
  lSheet.appendRow([userId, license]);
  
  // 3. 寫入 UserStats (初始化資產)
  var statsSheet = ss.getSheetByName("UserStats");
  if (statsSheet) {
    var extraJson = JSON.stringify({ essence: {light:0, rain:0, soil:0}, streak: 1, lastStudyDate: new Date().toDateString() });
    statsSheet.appendRow([userId, 100, "黃花風鈴木", 0, 0, '["黃花風鈴木"]', 0, "[]", "[]", "{}", extraJson]);
  }
  
  // 4. 寫入 Applications 記錄 (狀態直接設為 Auto-Approved)
  var appSheet = ss.getSheetByName("Applications") || ss.insertSheet("Applications");
  appSheet.appendRow([userId, password, email, new Date(), "Auto-Approved", license, "✅ 已自動發送"]);

  // 5. 立即發送 Email
  try {
    var subject = "✨ [語林之境] 您的入園申請已自動核准！";
    var body = "親愛的 " + userId + "：\n\n您的入園申請已自動通過！\n🔑 您的啟動金鑰：" + license + "\n\n請回到登入頁面進行激活。";
    MailApp.sendEmail(email, subject, body);
  } catch(e) {
    console.error("Auto-Email failed: " + e.message);
  }

  return successResponse({ msg: "申請成功！請查看您的電子信箱獲取啟動金鑰。" });
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
  
  // 💡 設定會籍到期日：今天 + 30 天
  var expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  
  userSheet.getRange(row, 3).setValue(userApiKey); 
  userSheet.getRange(row, 6).setValue(expiryDate); // 寫入 F 欄
  
  return successResponse({ apiKey: userApiKey, userId: userId, expiryDate: expiryDate });
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
      
      // 1. 寫入 Users (A:UserID, B:Pass, C:ApiKey, D:RegDate, E:Devices, F:Expiry, G:Email)
      var userSheet = ss.getSheetByName("Users");
      if (userSheet) userSheet.appendRow([userId, password, "", new Date(), "", "", email]);
      
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
        var subject = "🌿 [語林之境] 您的園丁會籍即將到期（剩餘 5 天）";
        var body = "親愛的 " + userId + "：\n\n您的語林之境 30 天探索權限即將在 5 天後到期。\n" +
                   "為了維持 AI 育苗室與精華系統的運作，邀請您參與贊助續約：\n\n" +
                   "💎 贊助金額：100 元\n" +
                   "   (嘉義文教 50 元、嘉義分苑起厝 50 元)\n" +
                   "📩 贊助方式：請洽嘉義分苑 或 聯繫 kiteyoung@gmail.com\n\n" +
                   "完成後，管理員將為您延長會籍，讓我們繼續在語林中探索 AI 的奧秘！";
        
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
      var rawB = vals[1];
      // 聰明讀取機制：檢查 B 欄是否為舊版的 JSON 格式
      if (typeof rawB === 'string' && rawB.startsWith('{')) {
        try {
          var oldJson = JSON.parse(rawB);
          stats.coins = Number(oldJson.coins || 0);
          stats.currentPlant = oldJson.currentPlant || '黃花風鈴木';
          stats.plantStage = Number(oldJson.plantStage || 0);
          stats.exp = Number(oldJson.exp || 0);
          stats.unlockedPlants = oldJson.unlockedPlants || [];
          stats.essence = oldJson.essence || {light:0, rain:0, soil:0};
          stats.streak = oldJson.streak || 0;
          stats.lastStudyDate = oldJson.lastStudyDate || null;
        } catch(e) { console.error("Old JSON parse failed"); }
      } else {
        // 新版欄位制 (B: Coins, C: Plant, D: Stage, F: Unlocked, G: Exp, K: Extra)
        stats.coins = Number(vals[1] || 0);
        stats.currentPlant = vals[2] || '黃花風鈴木';
        stats.plantStage = Number(vals[3] || 0);
        try {
          var rawUnlocked = vals[5];
          if (rawUnlocked && rawUnlocked.startsWith('[')) {
            stats.unlockedPlants = JSON.parse(rawUnlocked);
          } else {
            stats.unlockedPlants = rawUnlocked ? String(rawUnlocked).split(',') : [];
          }
        } catch(e) { stats.unlockedPlants = []; }
        stats.exp = Number(vals[6] || 0);
        try {
          var extra = JSON.parse(vals[10] || "{}");
          stats.essence = extra.essence || {light:0, rain:0, soil:0};
          stats.streak = extra.streak || 0;
          stats.lastStudyDate = extra.lastStudyDate || null;
        } catch(e) {}
      }
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

/**
 * 💡 每日檢查會籍是否到期
 * 建議在 GAS 編輯器設定「時間驅動計時器 (每日)」
 */
function dailyExpiryCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userSheet = ss.getSheetByName("Users");
  if (!userSheet) return;
  
  var data = userSheet.getDataRange().getValues();
  var now = new Date();
  
  // 計算「5天後」的整點日期（方便比對）
  var fiveDaysLater = new Date();
  fiveDaysLater.setDate(now.getDate() + 5);
  var checkStr = Utilities.formatDate(fiveDaysLater, "GMT+8", "yyyyMMdd");
  
  for (var i = 1; i < data.length; i++) {
    var userId = data[i][0];
    var expiryDate = data[i][5];
    var email = data[i][6]; // G 欄獲取 Email
    
    if (expiryDate instanceof Date && email) {
      var expiryStr = Utilities.formatDate(expiryDate, "GMT+8", "yyyyMMdd");
      
      // 💡 正好剩 5 天時寄信
      if (expiryStr === checkStr) {
        try {
          var subject = "🔔 [語林之境] 會籍到期提醒 (剩餘 5 天)";
          var body = "親愛的培育者 " + userId + "：\n\n" +
                     "您的語林之境會籍即將於 " + Utilities.formatDate(expiryDate, "GMT+8", "yyyy-MM-dd") + " 到期。\n\n" +
                     "為了讓您的守護靈能持續成長，我們誠摯邀請您參與贊助方案：\n" +
                     "💸 贊助 100 元 (含嘉義文教 50 元、嘉義分苑起厝 50 元)\n" +
                     "📩 贊助方式：請洽嘉義分苑或 kiteyoung@gmail.com\n\n" +
                     "感謝您對語林的守護！🌿✨";
          
          MailApp.sendEmail(email, subject, body);
          Logger.log("已寄送提醒信給: " + userId);
        } catch(e) {
          Logger.log("寄信失敗 (" + userId + "): " + e.message);
        }
      }
    }
  }
}
