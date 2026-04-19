/**
 * 🌿 語林之境 (LinguaGarden) - 後端安全性更新補丁
 * 
 * 指標：請將此 doPost 邏輯複製並貼入您 Google Apps Script 編輯器的 b07.gs 檔案中。
 * 它可以保護您的後端 API 不被未經授權的外部工具直接呼叫。
 */

function doPost(e) {
  // 🔒 必須與前端 src/services/api.js 中的 SECURITY_HANDSHAKE_TOKEN 保持完全一致
  const SECURITY_TOKEN = "FLG_SECURE_2024_PRO_V1"; 
  
  var result = {
    status: "error",
    message: "未知的錯誤"
  };

  try {
    // 1. 檢查請求內容是否存在
    if (!e || !e.postData || !e.postData.contents) {
       throw new Error("無效的請求內容");
    }

    var requestData = JSON.parse(e.postData.contents);
    
    // 2. 🛡️ 安全握手驗證 (本階段核心加固)
    if (requestData.securityToken !== SECURITY_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "🚨 警告：偵測到未經授權的非法存取請求！伺服器已自動阻斷。"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. 原有的 Action 判斷邏輯
    var action = requestData.action;
    
    // --- 以下請保留您原本的 switch (action) 或 if (action) 邏輯 ---
    // 例如：
    // if (action === 'login') { ... }
    // else if (action === 'saveArticle') { ... }
    
    // [這裡請手動整合您原本的功能代碼]
    
    // 測試用回覆段（若您是初次整合，可以先保留用於測試連通性）
    if (action === "ping") {
       result = { status: "success", data: "Pong! 安全握手驗證通過。" };
    }

  } catch (err) {
    result = { status: "error", message: err.toString() };
  }

  // 4. 回傳結果
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
