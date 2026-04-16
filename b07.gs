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
 * 2. "UserStats" - 欄位: A:UserID, B:StatsJSON
 * 3. "WordBank" - 欄位: A:UserID, B:Word, C:IPA, D:Definition, E:Context, F:ContextChn, G:Date, H:ID, I:MetadataJSON
 * 4. "ArticleBank" - 欄位: A:UserID, B:Title, C:Content, D:LangKey, E:Date, F:ID
 * 5. "Quotes" - 欄位: A:ID, B:Author, C:English, D:Chinese
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
        return handleRegister(payload);
      case 'getLeaderboard':
        return handleGetLeaderboard(payload);
      case 'saveArticle':
        return handleSaveArticle(payload);
      case 'getSavedArticles':
        return handleGetSavedArticles(payload);
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
  // 假設第一行是標題，跳過第一行
  for (var i = 1; i < data.length; i++) {
    var storedUser = data[i][0];
    var storedPass = data[i][1];

    if (storedUser == userId) {
      if (storedPass == password) {
        var apiKey = data[i][2]; 
        // 確保每個帳號都有 apiKey，若無則生成一個
        if (!apiKey) {
          apiKey = Utilities.getUuid();
          sheet.getRange(i + 1, 3).setValue(apiKey);
        }
        return successResponse({ apiKey: apiKey, userId: userId });
      } else {
        return errorResponse("密碼錯誤");
      }
    }
  }
  
  return errorResponse("帳號不存在，請先進行註冊開通。");
}

/**
 * 處理註冊 (開通)
 * @param {Object} payload 包含 userId, password, userApiKey, licenseKey
 */
function handleRegister(payload) {
  var userId = payload.userId;
  var password = payload.password;
  var userApiKey = payload.userApiKey; // 這是使用者提供的 Gemini API Key
  var licenseKey = payload.licenseKey;

  if (!userId || !password || !userApiKey || !licenseKey) {
    return errorResponse("資料不完整，請填寫所有欄位");
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return errorResponse("系統未設定 Users 表單");

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userId) {
      return errorResponse("此園丁名稱已存在，請換一個名字");
    }
  }

  var defaultStats = JSON.stringify({
    coins: 100,
    streak: 1,
    essence: { light: 0, rain: 0, soil: 0 },
    unlockedPlants: []
  });
  
  // 寫入 Users 表
  sheet.appendRow([userId, password, userApiKey, new Date(), "[]", ""]);
  
  // 初始化 UserStats 表
  var statsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UserStats");
  if (statsSheet) {
    statsSheet.appendRow([userId, defaultStats]);
  }

  return successResponse({ userId: userId, msg: "開通成功！歡迎加入植物園" });
}

/**
 * 取得使用者狀態 (跨表整合：UserStats + WordBank)
 */
function handleGetUserStats(payload) {
  var userRow = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (userRow.error) return errorResponse(userRow.error);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userId = payload.userId;

  // 1. 取得遊戲數據 (從 UserStats)
  var stats = {};
  var statsSheet = ss.getSheetByName("UserStats");
  if (statsSheet) {
    var statsData = statsSheet.getDataRange().getValues();
    for (var i = 1; i < statsData.length; i++) {
      if (statsData[i][0] == userId) {
        stats = JSON.parse(statsData[i][1] || "{}");
        break;
      }
    }
  }

  // 2. 取得單字本 (從 WordBank)
  var savedWords = [];
  var wordSheet = ss.getSheetByName("WordBank");
  if (wordSheet) {
    var wordData = wordSheet.getDataRange().getValues();
    for (var i = 1; i < wordData.length; i++) {
      if (wordData[i][0] == userId) {
        var metadata = JSON.parse(wordData[i][8] || "{}");
        savedWords.push({
          word: wordData[i][1],
          pronunciation: wordData[i][2],
          meaning: wordData[i][3],
          exampleSentence: wordData[i][4],
          exampleTranslation: wordData[i][5],
          addedAt: new Date(wordData[i][6]).getTime(),
          id: wordData[i][7],
          ...metadata // 包含 SRS 進度 (reviewCount, intervalDays, nextReview, langKey)
        });
      }
    }
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
    
    var statsData = statsSheet.getDataRange().getValues();
    var foundStats = false;
    for (var i = 1; i < statsData.length; i++) {
      if (statsData[i][0] == userId) {
        statsSheet.getRange(i + 1, 2).setValue(JSON.stringify(payload.stats));
        foundStats = true;
        break;
      }
    }
    if (!foundStats) statsSheet.appendRow([userId, JSON.stringify(payload.stats)]);

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
    
    var existingWords = wordSheet.getDataRange().getValues();
    var existingIds = {};
    for (var j = 1; j < existingWords.length; j++) {
      if (existingWords[j][0] == userId) existingIds[existingWords[j][7]] = j + 1;
    }

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

  var data = sheet.getDataRange().getValues();
  var articles = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.userId) {
      articles.push({
        userId: data[i][0],
        title: data[i][1],
        content: data[i][2],
        langKey: data[i][3],
        date: data[i][4],
        id: data[i][5]
      });
    }
  }

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

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == userId && data[i][2] == apiKey) {
      return { rowIndex: i + 1, data: data[i] };
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
