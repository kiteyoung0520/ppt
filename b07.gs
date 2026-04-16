/**
 * Formosa LinguaGarden (b07)
 * Google Apps Script Backend (API)
 * 
 * 部署指引：
 * 1. 於 Google 試算表點選「擴充功能」->「Apps Script」
 * 2. 將此程式碼貼上取代預設內容
 * 3. 點選「部署」->「新增部署」-> 型態選「網頁應用程式」-> 存取權限設為「所有人」
 * 4. 將產生的 Web App URL 複製到前端 api.js 中
 * 
 * 必備試算表標籤頁 (Sheets):
 * 1. "Users" - 欄位: A:UserID, B:Password, C:APIKey, D:RegisterDate, E:Devices, F:ExpiryDate
 * 2. "Applications" - 欄位: A:UserID, B:Password, C:Email, D:Date, E:Status(Pending/Approved), F:LicenseKey
 * 3. "UserStats" - 欄位: A:UserID, B:StatsJSON
 * 4. "WordBank" - 欄位: A:UserID, B:Word, C:IPA, D:Definition, E:Context, F:ContextChn, G:Date, H:ID, I:MetadataJSON
 * 5. "ArticleBank" - 欄位: A:UserID, B:Title, C:Content, D:LangKey, E:Date, F:ID
 * 6. "Quotes" - 欄位: A:ID, B:Author, C:English, D:Chinese
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action;

    // 路由分發
    switch (action) {
      case 'login':
        return handleLogin(payload);
      case 'getUserStats':
        return handleGetUserStats(payload);
      case 'updateUserStats':
        return handleUpdateUserStats(payload);
      case 'getRandomQuote':
        return handleGetRandomQuote(payload);
      case 'register':
        return handleApply(payload); // 註冊改為申請
      case 'getLeaderboard':
        return handleGetLeaderboard(payload);
      case 'saveArticle':
        return handleSaveArticle(payload);
      case 'getSavedArticles':
        return handleGetSavedArticles(payload);
      case 'activateAccount':
        return handleActivateAccount(payload);
      default:
        return errorResponse("未知的 API Action: " + action);
    }
  } catch (err) {
    return errorResponse("伺服器解析錯誤：" + err.message);
  }
}

// ── 給瀏覽器的 CORS 支援 (如果是用 GET 檢查) ──
function doGet(e) {
  return HtmlService.createHtmlOutput("Formosa LinguaGarden API is running.");
}

// ─────────────────────────────────────────────────────────────────
// API 處理函式群
// ─────────────────────────────────────────────────────────────────

/**
 * 處理登入
 * @param {Object} payload 包含 userId, password
 */
function handleLogin(payload) {
  var userId = payload.userId;
  var password = payload.password;
  
  if (!userId || !password) {
    return errorResponse("缺少帳號或密碼");
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return errorResponse("系統未設定 Users 表單");

  var data = sheet.getDataRange().getValues();
  var finder = sheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (finder) {
    var rowIndex = finder.getRow();
    var rowData = sheet.getRange(rowIndex, 1, 1, 3).getValues()[0];
    var storedPass = rowData[1];

    if (storedPass == password) {
      var apiKey = rowData[2]; 
      // 若無 APIKey 表示尚未激活
      if (!apiKey) {
        return successResponse({ needsActivation: true, userId: userId });
      }
      return successResponse({ apiKey: apiKey, userId: userId });
    } else {
      return errorResponse("密碼錯誤");
    }
  }
  
  return errorResponse("帳號不存在，請先進行註冊開通。");
}

/**
 * 處理入園申請 (新版審核制)
 */
function handleApply(payload) {
  var userId = payload.userId;
  var password = payload.password;
  var email = payload.email;

  if (!userId || !password || !email) return errorResponse("請填寫完整資訊");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var appSheet = ss.getSheetByName("Applications");
  if (!appSheet) {
    appSheet = ss.insertSheet("Applications");
    appSheet.appendRow(["UserID", "Password", "Email", "Date", "Status", "LicenseKey"]);
  }

  // 檢查是否重複申請或已存在
  var userSheet = ss.getSheetByName("Users");
  if (userSheet && userSheet.createTextFinder(userId).matchEntireCell(true).findNext()) {
    return errorResponse("園丁名稱已被佔用或已存在");
  }

  appSheet.appendRow([userId, password, email, new Date(), "Pending", ""]);
  
  // 通知管理員
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 
      "[系統通知] 語林之境：收到新的園丁入園申請", 
      "園丁 " + userId + " (" + email + ") 已送出申請。請前往試算表審核並核發金鑰。");
  } catch(e) {}

  return successResponse({ msg: "申請已送出！管理員核准後將寄發金鑰至您的電子郵件。" });
}

/**
 * 處理帳號激活 (第一次登入填入金鑰)
 */
function handleActivateAccount(payload) {
  var userId = payload.userId;
  var licenseKey = payload.licenseKey;
  var userApiKey = payload.userApiKey; // Gemini Key

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userSheet = ss.getSheetByName("Users");
  
  var finder = userSheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (!finder) return errorResponse("帳號不存在");
  
  var rowIndex = finder.getRow();
  var rowData = userSheet.getRange(rowIndex, 1, 1, 6).getValues()[0];
  
  // 比對 LicenseKey (存放在原本 sheet 的 RegisterDate 欄位或是自訂比對)
  // 此處邏輯：核准時會將生成的 LicenseKey 存入 Users 表的暫存位置或直接在前端比對
  // 簡化方案：核准時會將 User 新增到 Users 表但 C 欄為空，D 欄存放生成的 LicenseKey
  if (rowData[3] != licenseKey) return errorResponse("金鑰不正確，請檢查 Email。");

  // 正式寫入 API Key 並標記激活
  userSheet.getRange(rowIndex, 3).setValue(userApiKey); 
  
  return successResponse({ apiKey: userApiKey, userId: userId });
}

/**
 * 自動化核准器 (當管理員在試算表編輯時)
 */
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  
  // 假設 Applications 表第五欄 (E) 是手動手寫 "Approved"
  if (sheet.getName() == "Applications" && range.getColumn() == 5 && e.value == "Approved") {
    var row = range.getRow();
    var data = sheet.getRange(row, 1, 1, 4).getValues()[0];
    var userId = data[0];
    var password = data[1];
    var email = data[2];
    
    // 產生隨機金鑰 (8碼)
    var license = "LG-" + Math.floor(Math.random() * 9000 + 1000) + "-" + Math.floor(Math.random() * 9000 + 1000);
    sheet.getRange(row, 6).setValue(license); // 填入 F 欄
    
    // 加入正式 Users 表 (D 欄暫存金鑰，C 欄為空等待激活)
    var userSheet = e.source.getSheetByName("Users");
    userSheet.appendRow([userId, password, "", license, "[]", ""]);

    // 初始化 UserStats
    var statsSheet = e.source.getSheetByName("UserStats");
    var defaultStats = JSON.stringify({ coins: 100, streak: 1, essence: {light:0, rain:0, soil:0}, unlockedPlants: [] });
    statsSheet.appendRow([userId, defaultStats]);

    // 發送成功的 Email
    var subject = "✨ [語林之境] 恭喜！您的入園申請已核准";
    var body = "親愛的 " + userId + "：\n\n您的入園申請已通過。請回到 App 進行激活。\n\n" +
               "🔑 啟動金鑰：" + license + "\n\n" +
               "步驟：\n1. 使用帳號密碼登入\n2. 系統將要求輸入啟動金鑰與您的 Gemini API Key\n3. 完成綁定後即可開始探索！";
    try {
      MailApp.sendEmail(email, subject, body);
    } catch(err) {}
  }
}

/**
 * 取得使用者狀態 (跨表整合：UserStats + WordBank)
 */
function handleGetUserStats(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userId = payload.userId;

  var stats = {};
  var statsSheet = ss.getSheetByName("UserStats");
  if (statsSheet) {
    var finder = statsSheet.createTextFinder(userId).matchEntireCell(true).findNext();
    if (finder) {
      stats = JSON.parse(statsSheet.getRange(finder.getRow(), 2).getValue() || "{}");
    }
  }

  // 2. 取得單字本 (從 WordBank) - 採搜尋器優化
  var savedWords = [];
  var wordSheet = ss.getSheetByName("WordBank");
  if (wordSheet) {
    var ranges = wordSheet.createTextFinder(userId).matchEntireCell(true).findAll();
    ranges.forEach(function(range) {
      var row = wordSheet.getRange(range.getRow(), 1, 1, 9).getValues()[0];
      var metadata = JSON.parse(row[8] || "{}");
      savedWords.push({
        word: row[1],
        pronunciation: row[2],
        meaning: row[3],
        exampleSentence: row[4],
        exampleTranslation: row[5],
        addedAt: new Date(row[6]).getTime(),
        id: row[7],
        ...metadata
      });
    });
  }

  return successResponse({
    stats: stats,
    savedWords: savedWords
  });
}

/**
 * 更新使用者狀態與單字本 (同步至 UserStats 與 WordBank)
 */
function handleUpdateUserStats(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userId = payload.userId;

  // 1. 更新遊戲數據 (UserStats)
  if (payload.stats) {
    var statsSheet = ss.getSheetByName("UserStats");
    if (!statsSheet) statsSheet = ss.insertSheet("UserStats");
    
    var finder = statsSheet.createTextFinder(userId).matchEntireCell(true).findNext();
    if (finder) {
      statsSheet.getRange(finder.getRow(), 2).setValue(JSON.stringify(payload.stats));
    } else {
      statsSheet.appendRow([userId, JSON.stringify(payload.stats)]);
    }

    // 同步更新排行榜
    try {
      updateLeaderboard(userId, payload.stats, (payload.savedWords || []).length);
    } catch (e) {}
  }

  // 2. 同步單字本 (WordBank) - 採增量同步或全量更新策略
  // 為了效能與資料結構完整性，這裡我們只處理新增的單字，或根據 ID 檢查
  if (payload.savedWords) {
    var wordSheet = ss.getSheetByName("WordBank");
    if (!wordSheet) wordSheet = ss.insertSheet("WordBank");
    
    var wordRanges = wordSheet.createTextFinder(userId).matchEntireCell(true).findAll();
    var existingIds = {};
    wordRanges.forEach(function(range) {
      var r = range.getRow();
      var id = wordSheet.getRange(r, 8).getValue();
      existingIds[id] = r;
    });

    payload.savedWords.forEach(function(w) {
      var wordId = w.id || (w.word + "_" + w.addedAt);
      var metadata = {
        reviewCount: w.reviewCount || 0,
        intervalDays: w.intervalDays || 1,
        nextReview: w.nextReview || Date.now(),
        langKey: w.langKey || 'en'
      };
      
      var row = [
        userId, 
        w.word, 
        w.pronunciation || "", 
        w.meaning || "", 
        w.exampleSentence || "", 
        w.exampleTranslation || "", 
        w.addedAt ? new Date(w.addedAt) : new Date(),
        wordId,
        JSON.stringify(metadata)
      ];

      if (existingIds[wordId]) {
        // 更新現有單字 (例如 SRS 進度)
        wordSheet.getRange(existingIds[wordId], 1, 1, 9).setValues([row]);
      } else {
        // 新增單字
        wordSheet.appendRow(row);
      }
    });
  }

  return successResponse({ updated: true });
}

/**
 * 取得排行榜資料 (前 20 名)
 */
function handleGetLeaderboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leaderboard");
  if (!sheet) return successResponse([]);

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return successResponse([]);

  // 轉換並去識別化
  var players = data.slice(1).map(function(row) {
    var rawName = String(row[0]);
    var maskedName = rawName.length > 2 
      ? rawName.substring(0, 1) + "***" + rawName.substring(rawName.length - 1)
      : rawName + "**";
      
    return {
      name: maskedName,
      streak: parseInt(row[1]) || 0,
      essence: parseInt(row[2]) || 0,
      plants: parseInt(row[3]) || 0,
      vocab: parseInt(row[4]) || 0
    };
  });

  return successResponse(players);
}

/**
 * 內部工具：同步排行榜數據
 */
function updateLeaderboard(userId, stats, vocabCount) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leaderboard");
  if (!sheet) {
    sheet = ss.insertSheet("Leaderboard");
    sheet.appendRow(["userId", "streak", "totalEssence", "plantCount", "vocabCount", "lastUpdate"]);
  }

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      rowIndex = i + 1;
      break;
    }
  }

  var totalEssence = (stats.essence?.light || 0) + (stats.essence?.rain || 0) + (stats.essence?.soil || 0);
  var plantCount = Array.isArray(stats.unlockedPlants) ? stats.unlockedPlants.length : 0;
  var rowValues = [userId, stats.streak || 0, totalEssence, plantCount, vocabCount, new Date()];

  if (rowIndex != -1) {
    sheet.getRange(rowIndex, 1, 1, 6).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * 儲存文章
 */
function handleSaveArticle(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("ArticleBank");
  if (!sheet) {
    sheet = ss.insertSheet("ArticleBank");
    sheet.appendRow(["UserID", "Title", "Content", "LangKey", "Date", "ID"]);
  }

  var articleId = payload.id || "art_" + Date.now();
  sheet.appendRow([
    payload.userId,
    payload.title || "未命名文章",
    payload.content || "",
    payload.langKey || "en",
    new Date(),
    articleId
  ]);

  return successResponse({ id: articleId });
}

/**
 * 取得儲存的文章
 */
function handleGetSavedArticles(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("ArticleBank");
  if (!sheet) return successResponse([]);

  var articles = [];
  var ranges = sheet.createTextFinder(payload.userId).matchEntireCell(true).findAll();
  ranges.forEach(function(range) {
    var row = sheet.getRange(range.getRow(), 1, 1, 6).getValues()[0];
    articles.push({
      userId: row[0],
      title: row[1],
      content: row[2],
      langKey: row[3],
      date: row[4],
      id: row[5]
    });
  });

  return successResponse(articles);
}

/**
 * 取得隨機智慧小語
 * 限定由 "Quotes" 工作表讀取
 */
function handleGetRandomQuote(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Quotes'); 
    
    if (!sheet) {
      return errorResponse("找不到名為 'Quotes' 的工作表");
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return errorResponse("Quotes 工作表中沒有足夠的資料可以抽取");
    }
    
    // 隨機抽選一列 (避開第一行的標題，從 Index 1 開始)
    var randomIndex = Math.floor(Math.random() * (data.length - 1)) + 1;
    var row = data[randomIndex];
    
    var quoteData = {
      author: row[1] ? String(row[1]) : "佚名",
      eng: row[2] ? String(row[2]) : "No English quote found.",
      chn: row[3] ? String(row[3]) : ""
    };
    
    return successResponse(quoteData);

  } catch (e) {
    return errorResponse("讀取智慧小語失敗：" + e.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// 共用工具函式 (Utils)
// ─────────────────────────────────────────────────────────────────

/**
 * 驗證身分並回傳對應的整行資料
 * @returns { error: String } 或是 { rowIndex: Number, data: Array }
 */
function verifyUserAndGetRow(userId, apiKey) {
  if (!userId || !apiKey) return { error: "權限不足 (缺少 userId 或 apiKey)" };
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return { error: "系統未設定 Users 表單" };

  var finder = sheet.createTextFinder(userId).matchEntireCell(true).findNext();
  if (finder) {
    var row = finder.getRow();
    var rowData = sheet.getRange(row, 1, 1, 3).getValues()[0];
    if (rowData[2] == apiKey) {
      return { rowIndex: row, data: rowData };
    }
  }
  return { error: "無效的令牌或帳號不存在" };
}

function successResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}
