# Gate 5 — Vercel Auto Deployment

## Goal

將專案連接至 Vercel，完成由 GitHub 推送自動觸發 Build 與 Deployment 的 Public Website，確保線上環境可正常瀏覽互動式台灣氣象 GIS 儀表板。

## Current Status

`GATE 5 = IN PROGRESS`

## Run / Deployment

- **GitHub Repository**: `https://github.com/kelp11211/AIoT_L3_CWA_HW1`
- **Vercel Config**: `vercel.json`
- **Framework Preset**: Other / Python (`@vercel/python`)
- **Serverless Data Strategy**: 於 Serverless 環境自動在 `/tmp` 目錄初始化 SQLite (`weather.db`) 並讀取 Committed CWA JSON

## PASS Checklist

- [ ] GitHub Repository 已連接 Vercel
- [ ] Vercel 已成功建立 Build & Deployment
- [ ] 取得公開瀏覽的 Public URL
- [ ] Public Website 可正常開啟 (HTTP 200)
- [ ] Taiwan GIS Map 與 OpenStreetMap 圖磚正常顯示
- [ ] 台灣 22 縣市 GeoJSON 邊界多邊形正常呈現
- [ ] SQLite 氣象資料正常提供（`/api/weather` 回傳 22 縣市真實預報）
- [ ] 互動功能正常（搜尋、排序、卡片點擊 flyTo、雙向 Popup 開啟）

全部通過後：

`GATE 5 = PASS`
`OVERALL PROJECT = COMPLETE`
