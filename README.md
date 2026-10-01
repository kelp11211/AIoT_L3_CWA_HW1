# Taiwan Weather GIS Dashboard
## AIoT L3 — CWA HW1

> **CWA Open Data → Database → Taiwan GIS → GitHub → Vercel**

本作業以中央氣象署（CWA）真實 Open Data 為資料來源，從 API 資料取得開始，經過 ETL 與 SQLite 儲存，再建立本機 Taiwan GIS Web，最後推送 GitHub 並由 Vercel 自動部署。

## 五大 Gate

| Gate | 主題 | 核心成果 | PASS 狀態 |
|---|---|---|:---:|
| 1 | CWA API | 取得真實 CWA JSON | ✅ PASS |
| 2 | Database | CWA → ETL → SQLite | ✅ PASS |
| 3 | Taiwan GIS Web | Database → Taiwan Map | ✅ PASS (3A~3G) |
| 4 | GitHub | Local → GitHub | ✅ PASS |
| 5 | Vercel | GitHub → Vercel | 🔄 IN PROGRESS |

## 核心流程

```text
CWA Government Open Data
        ↓
     REST API
        ↓
       JSON
        ↓
 Parse / Clean / Transform
        ↓
      SQLite
        ↓
   Backend API
        ↓
Taiwan GIS Web
Leaflet + OpenStreetMap + GeoJSON
        ↓
      GitHub
        ↓
      Vercel
        ↓
   Public Website
```

## Gate 1 — CWA API

只處理 CWA 資料取得。選定適合的 Forecast Dataset，從環境變數讀取 `CWA_API_KEY`，發送真實 HTTP request，解析實際 JSON schema，至少驗證 Location、Forecast Time、Weather、MinT、MaxT；若 Dataset 提供，再加入 PoP。

**禁止 Mock/Fake weather data。** 不可在取得真實 response 前猜測 JSON schema。

完成條件：`GATE 1 = PASS`

## Gate 2 — Database

將 Gate 1 的真實 CWA JSON 做 ETL：

```text
Extract → Transform → Load → SQLite
```

Local Database 使用 SQLite。資料表至少保存地區、預報時間、天氣、最低溫、最高溫與資料取得時間。需定義避免重複資料的策略，並用 SQL SELECT 驗證。

完成條件：`GATE 2 = PASS`

## Gate 3 — Local Taiwan GIS Web

先在 localhost 完成 GIS，再處理雲端部署。實作順序：

```text
3A Taiwan Map
 → 3B One Location Marker
 → 3C Weather Popup
 → 3D Taiwan Locations
 → 3E Database → GIS
 → 3F Taiwan GeoJSON
 → 3G Interactive Dashboard
```

GIS 建議採 **Leaflet + OpenStreetMap + Taiwan GeoJSON**。Weather Data 必須來自 Database，不可 hard-code。

完成條件：`GATE 3 = PASS`

## Gate 4 — GitHub

Local Application 通過 Gate 3 後再整理並 Push。

Push 前必須確認：

- `.env` 未被 commit
- Repository 中沒有 CWA API Key、password、token 或其他 secret
- README 與設計文件完整
- 專案可重新 clone 並依文件執行

完成條件：`GATE 4 = PASS`

## Gate 5 — Vercel Auto Deployment

GitHub Repository 連接 Vercel，設定必要 Environment Variables，由 GitHub push 觸發 Vercel build/deploy。

```text
Code Change → Commit → Push → GitHub → Vercel → Auto Build → Auto Deploy
```

注意：Local SQLite 適合 Gate 2–3 教學，但不可假設 Vercel local filesystem 是永久性 Production Database。若線上版需要持續寫入資料，Cloud Database 視為進階部署需求。

完成條件：`GATE 5 = PASS`

## Security

真正的 CWA Key 只能存在 Local `.env` 與部署平台的 Environment Variables。

```env
CWA_API_KEY=YOUR_CWA_API_KEY
```

`.gitignore` 至少包含：

```gitignore
.env
.venv/
venv/
__pycache__/
*.pyc
```

若 Secret 曾被 commit，必須視為 exposed 並 rotate，不能只刪檔案。

## Development Rule

**DO NOT BUILD EVERYTHING AT ONCE.**

每一 Gate 都必須：

```text
BUILD → RUN → TEST → VERIFY → PASS → NEXT GATE
```

Gate FAIL 就停在該 Gate 修正，不得自行跳到下一 Gate。

## Definition of Done

```text
[ PASS ] Gate 1 — CWA API
          ↓
[ PASS ] Gate 2 — Database
          ↓
[ PASS ] Gate 3 — Local Taiwan GIS
          ↓
[ PASS ] Gate 4 — GitHub
          ↓
[ PASS ] Gate 5 — Vercel
          ↓
Taiwan Weather GIS Dashboard COMPLETE
```

## Learning Path

這份 HW1 串起五個重要概念：

**Data Acquisition → Data Engineering → GIS Data Application → Software Engineering → Cloud / CI/CD**

詳細設計與驗收規範見 `design.md`。
