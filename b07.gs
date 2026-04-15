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
 * 1. "Users" - 欄位: A: userId (String), B: password (String), C: apiKey (String), D: stats (JSON String), E: savedWords (JSON String)
 * 2. "Quotes" - 欄位: A: ID (Number), B: Author (String), C: English (String), D: Chinese (String)
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
  
  sheet.appendRow([userId, password, userApiKey, defaultStats, "[]"]);
  return successResponse({ userId: userId, msg: "開通成功！歡迎加入植物園" });
}

/**
 * 取得使用者狀態 (包含金幣、精華、單字本)
 * @param {Object} payload 包含 userId, apiKey
 */
function handleGetUserStats(payload) {
  var rowData = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (rowData.error) return errorResponse(rowData.error);

  var statsStr = rowData.data[3] || "{}";
  var savedWordsStr = rowData.data[4] || "[]";

  try {
    return successResponse({
      stats: JSON.parse(statsStr),
      savedWords: JSON.parse(savedWordsStr)
    });
  } catch (e) {
    return errorResponse("資料解析失敗");
  }
}

/**
 * 更新使用者狀態與單字本 (優化版：合併寫入，減少 API 呼叫)
 * @param {Object} payload 包含 userId, apiKey, stats(物件), savedWords(陣列)
 */
function handleUpdateUserStats(payload) {
  var rowData = verifyUserAndGetRow(payload.userId, payload.apiKey);
  if (rowData.error) return errorResponse(rowData.error);

  var rowIndex = rowData.rowIndex;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");

  // 如果同時有 stats 和 savedWords，合併成一次更新以提升反應速度
  if (payload.stats && payload.savedWords) {
    sheet.getRange(rowIndex, 4, 1, 2).setValues([[
      JSON.stringify(payload.stats),
      JSON.stringify(payload.savedWords)
    ]]);
  } else if (payload.stats) {
    sheet.getRange(rowIndex, 4).setValue(JSON.stringify(payload.stats));
  } else if (payload.savedWords) {
    sheet.getRange(rowIndex, 5).setValue(JSON.stringify(payload.savedWords));
  }

  return successResponse({ updated: true });
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
