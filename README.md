# 迎賓｜活動報到與司儀系統

網站：[開啟迎賓系統](https://t166-happy.github.io/guest-welcome/)

由 **t166-happy 的 GitHub Pages** 提供網站，**t166 學校帳號的 Google 試算表** 儲存資料。日常使用不需要 GPT 或 Codex。

## 開始使用

1. 首次開啟網站，輸入 Apps Script `/exec` 部署網址及資料庫「設定」工作表的工作人員代碼。
2. 「活動設定」可新增活動、設定日期、主辦單位與職稱介紹順序。
3. 「首頁主視覺圖片」可選 JPG、PNG、WebP 圖片，預覽後按「儲存活動設定」。可移除圖片恢復原本插畫。
4. 入口人員與司儀各自開啟網站，選擇相同活動；名單在頁面開啟時每 5 秒自動更新。
5. 名單預設依職稱排序。司儀可拖曳或用上下箭頭調整介紹順序，並標記「已介紹」。手動模式的新貴賓加入尾端。
6. 點「恢復職稱排序」回到活動設定的優先順序，可匯出 CSV 名單。

## 管理位置

- [Google 試算表資料庫](https://docs.google.com/spreadsheets/d/1jG7EhXMYiqR9RBset_G9irKdOvrkGAgv3Ej-6OYu924/edit)
- [Google Apps Script 後端](https://script.google.com/home/projects/19eRN5Blce3o2w6950WogBxw5FJfaDx8znusSDIMfwZ7IZe9gDpqWTNp5/edit)

工作人員代碼是存取憑證，僅分享給負責人員，請勿放到 GitHub、公開網址或公開試算表。試算表保持私人。

## 維護與發布

- `index.html` 是整合了 React 與樣式的完整靜態網站，不需要伺服器或 GPT。
- GitHub Pages：`main` 分支、`/(root)`。
- `backend/Code.gs` 是 Apps Script 後端原始碼。初次執行 `setup()` 建立設定與工作人員代碼；重跑會保留代碼。
- 更新後端後，Apps Script「管理部署作業」選擇新版本，保留 `/exec` 網址。
- 網站的「資料庫連線設定」可更新部署網址；代碼僅保存在目前瀏覽器工作階段。
- 所有持有工作人員代碼的人員，目前具相同操作權限。
- Apps Script 有配額與執行限制；適用一般活動規模，現場請確認網路及同步狀態。

圖片會先自動縮成 JPEG，再分段存入試算表。原始圖檔上限 10 MB；建議使用直式或中央主體清晰的圖片。
