# Gate 5 — Vercel Auto Deployment

## Goal

將專案連接至 Vercel，完成由 GitHub 推送自動觸發 Build 與 Deployment 的 Public Website，確保線上環境可正常瀏覽互動式台灣氣象 GIS 儀表板。

## Current Status

`GATE 5 = PASS`
`OVERALL PROJECT = COMPLETE`

## Deployment Details

- **GitHub Repository**: `https://github.com/kelp11211/AIoT_L3_CWA_HW1`
- **Vercel Production URL**: `https://a-io-t-l3-cwa-hw-1-py6zzivu5-kelp11211.vercel.app/`
- **Vercel Project URL**: `https://a-io-t-l3-cwa-hw-1-pi.vercel.app/`
- **Vercel Config**: `vercel.json`
- **Framework Preset**: Other / Python (`@vercel/python`)
- **Serverless Data Strategy**: 於 Serverless 環境自動在 `/tmp` 目錄初始化 SQLite (`weather.db`) 並讀取 Committed CWA JSON

## PASS Checklist

- [x] GitHub Repository 已連接 Vercel
- [x] Vercel 已成功建立 Build & Deployment
- [x] 取得公開瀏覽的 Public URL (`https://a-io-t-l3-cwa-hw-1-py6zzivu5-kelp11211.vercel.app/`)
- [x] Public Website 可正常開啟 (HTTP 200)
- [x] Taiwan GIS Map 與 OpenStreetMap 圖磚正常顯示
- [x] 台灣 22 縣市 GeoJSON 邊界多邊形正常呈現
- [x] SQLite 氣象資料正常提供（`/api/weather` 回傳 22 縣市真實預報）
- [x] 互動功能正常（搜尋、排序、卡片點擊 flyTo、雙向 Popup 開啟）

全部通過後：

`GATE 5 = PASS`
`OVERALL PROJECT = COMPLETE`
