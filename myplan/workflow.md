# Taiwan Weather GIS Dashboard — Development Workflow

## 1. Purpose

本文件定義 **Taiwan Weather GIS Dashboard** 的實作流程、Gate 驗收順序、失敗處理規則與安全檢查。

專案必須依照下列順序完成：

```text
CWA Open Data
    ↓
REST API / JSON
    ↓
Parse / Clean / Transform
    ↓
SQLite
    ↓
Backend API
    ↓
Taiwan GIS Web
    ↓
GitHub
    ↓
Vercel
    ↓
Public Website
```

核心原則：

> **DO NOT BUILD EVERYTHING AT ONCE.**

每一個 Gate 都必須完整執行：

```text
BUILD → RUN → TEST → VERIFY → PASS → NEXT GATE
```

若目前 Gate 驗證失敗，必須停留在該 Gate 修正，不可跳到下一 Gate。

---

## 2. Gate Overview

| Gate | 主題 | 核心成果 | PASS 條件 |
|---|---|---|---|
| Gate 1 | CWA API | 取得真實 CWA JSON | API 與欄位解析成功 |
| Gate 2 | Database | CWA → ETL → SQLite | SQL 可查到真實資料 |
| Gate 3 | Taiwan GIS Web | Database → Taiwan Map | 地圖可顯示資料庫中的氣象資料 |
| Gate 4 | GitHub | Local → GitHub | 原始碼安全推送且可重新建置 |
| Gate 5 | Vercel | GitHub → Vercel | Public Website 可由 GitHub 自動部署 |

---

# 3. Gate 1 — CWA API

## Goal

從中央氣象署（CWA）Open Data API 取得真實 Forecast Dataset JSON，並確認程式可以正確解析實際資料結構。

## Required Workflow

### Step 1.1 — Prepare API Key

API Key 必須由環境變數讀取：

```env
CWA_API_KEY=YOUR_CWA_API_KEY
```

不得將真正的 API Key 寫死在原始碼中。

### Step 1.2 — Select Forecast Dataset

選擇適合本作業使用的 CWA Forecast Dataset。

在取得真實 API Response 前：

- 不可建立 Mock weather data
- 不可建立 Fake weather data
- 不可自行猜測 JSON schema

### Step 1.3 — Send Real HTTP Request

使用 `CWA_API_KEY` 發送真實 HTTP Request 至 CWA Open Data API。

必須確認：

- Request 成功
- Response 為真實 JSON
- JSON 可以被程式解析

### Step 1.4 — Verify Required Fields

至少確認可取得並解析：

- Location
- Forecast Time
- Weather
- MinT
- MaxT

若選定 Dataset 有提供 PoP，再加入：

- PoP

## Gate 1 Verification

```text
[ ] CWA_API_KEY 由環境變數讀取
[ ] 已成功呼叫真實 CWA API
[ ] 已取得真實 JSON Response
[ ] 已依實際 Response Schema 解析資料
[ ] Location 可正確取得
[ ] Forecast Time 可正確取得
[ ] Weather 可正確取得
[ ] MinT 可正確取得
[ ] MaxT 可正確取得
[ ] 若 Dataset 提供 PoP，已正確解析
[ ] 未使用 Mock/Fake weather data
```

全部通過後：

```text
GATE 1 = PASS
```

若任一項失敗：

```text
GATE 1 = FAIL
STOP → FIX → RUN → TEST → VERIFY
```

不得進入 Gate 2。

---

# 4. Gate 2 — Database

## Goal

將 Gate 1 取得的真實 CWA JSON 進行 ETL，並儲存至本機 SQLite Database。

## Required Workflow

```text
Extract → Transform → Load → SQLite
```

### Step 2.1 — Extract

資料來源只能使用 Gate 1 已驗證成功的真實 CWA JSON。

### Step 2.2 — Transform

將 API Response 整理為適合資料庫使用的結構。

至少保留：

- 地區
- 預報時間
- 天氣
- 最低溫
- 最高溫
- 資料取得時間

若 Gate 1 有使用 PoP，也可一併保存。

### Step 2.3 — Define Duplicate Strategy

必須定義避免重複資料的策略。

此策略的具體實作方式可依資料表設計決定，但必須能防止相同資料在重複 ETL 時無限制新增。

### Step 2.4 — Load into SQLite

將 Transform 後的資料寫入 SQLite。

### Step 2.5 — Verify with SQL

必須以 SQL `SELECT` 驗證資料已真正寫入 Database。

驗證時至少確認：

- 查得到資料
- 資料來自真實 CWA API
- 主要欄位內容合理
- 重複資料策略有效

## Gate 2 Verification

```text
[ ] ETL 使用 Gate 1 的真實 CWA JSON
[ ] 已完成 Extract
[ ] 已完成 Transform
[ ] 已完成 Load
[ ] SQLite 可正常開啟
[ ] Database 保存地區
[ ] Database 保存預報時間
[ ] Database 保存天氣
[ ] Database 保存最低溫
[ ] Database 保存最高溫
[ ] Database 保存資料取得時間
[ ] 已定義避免重複資料策略
[ ] SQL SELECT 可查到真實資料
```

全部通過後：

```text
GATE 2 = PASS
```

若任一項失敗：

```text
GATE 2 = FAIL
STOP → FIX → RUN → TEST → VERIFY
```

不得進入 Gate 3。

---

# 5. Gate 3 — Local Taiwan GIS Web

## Goal

先在 localhost 完成 Taiwan GIS Web，並確保地圖上的 Weather Data 來自 Database，而不是 hard-code。

建議技術：

```text
Leaflet + OpenStreetMap + Taiwan GeoJSON
```

## Required Implementation Order

Gate 3 必須依照以下順序實作：

```text
3A Taiwan Map
 → 3B One Location Marker
 → 3C Weather Popup
 → 3D Taiwan Locations
 → 3E Database → GIS
 → 3F Taiwan GeoJSON
 → 3G Interactive Dashboard
```

---

## 3A — Taiwan Map

### Goal

在 localhost 建立可正常顯示的 Taiwan Map。

### Verify

```text
[ ] Web Application 可在 localhost 開啟
[ ] 地圖元件可正常載入
[ ] Taiwan 區域可正常瀏覽
```

---

## 3B — One Location Marker

### Goal

先完成單一地點 Marker，確認地圖定位與 Marker 呈現流程正常。

### Verify

```text
[ ] 地圖上可顯示至少一個 Location Marker
[ ] Marker 顯示位置合理
```

---

## 3C — Weather Popup

### Goal

在 Marker 上呈現 Weather Popup。

### Verify

```text
[ ] 點選 Marker 可開啟 Popup
[ ] Popup 可顯示氣象資訊
```

---

## 3D — Taiwan Locations

### Goal

將單一地點擴充為台灣多個 Location。

### Verify

```text
[ ] Taiwan 多個地點可呈現在地圖上
[ ] 不同 Location 可被識別
```

---

## 3E — Database → GIS

### Goal

將 Gate 2 SQLite 中的 Weather Data 接入 GIS。

Weather Data 必須來自 Database，不可 hard-code。

### Verify

```text
[ ] GIS Weather Data 由 Database 提供
[ ] 修改 Database Data 後，GIS 可反映對應資料
[ ] 原始碼中沒有以 hard-code 取代 Weather Database Data
```

---

## 3F — Taiwan GeoJSON

### Goal

加入 Taiwan GeoJSON，建立台灣地理區域相關呈現能力。

### Verify

```text
[ ] Taiwan GeoJSON 可正常載入
[ ] GeoJSON 可正確呈現在 Leaflet Map
```

---

## 3G — Interactive Dashboard

### Goal

完成可互動的 Taiwan Weather GIS Dashboard。

### Verify

```text
[ ] Dashboard 可在 localhost 正常操作
[ ] Taiwan Map 可正常互動
[ ] Location 與 Weather Data 可正常呈現
[ ] Weather Data 來源為 Database
[ ] GIS、Database 與 Weather Data 流程已整合
```

## Gate 3 Verification

```text
[ ] 3A Taiwan Map = PASS
[ ] 3B One Location Marker = PASS
[ ] 3C Weather Popup = PASS
[ ] 3D Taiwan Locations = PASS
[ ] 3E Database → GIS = PASS
[ ] 3F Taiwan GeoJSON = PASS
[ ] 3G Interactive Dashboard = PASS
```

全部通過後：

```text
GATE 3 = PASS
```

若任一子階段失敗：

```text
GATE 3 = FAIL
STOP AT CURRENT SUB-GATE
FIX → RUN → TEST → VERIFY
```

不得進入 Gate 4。

---

# 6. Gate 4 — GitHub

## Goal

Gate 3 在 Local Application 完成並驗證後，再整理 Repository 並 Push 到 GitHub。

## Required Workflow

### Step 4.1 — Secret Check

Push 前確認 Repository 中不存在：

- CWA API Key
- password
- token
- 其他 secret

### Step 4.2 — `.env` Check

`.env` 不可被 commit。

`.gitignore` 至少包含：

```gitignore
.env
.venv/
venv/
__pycache__/
*.pyc
```

### Step 4.3 — Documentation Check

確認：

- README 完整
- 設計文件完整
- 執行方式有文件可依循

### Step 4.4 — Rebuild / Re-clone Verification

Repository 必須能重新 clone，並依文件重新執行專案。

### Step 4.5 — Push

完成所有安全與文件檢查後，才可 Push 至 GitHub。

## Gate 4 Verification

```text
[ ] Gate 3 已 PASS
[ ] .env 未被 commit
[ ] Repository 不含 CWA API Key
[ ] Repository 不含 password
[ ] Repository 不含 token
[ ] Repository 不含其他 secret
[ ] .gitignore 已設定必要項目
[ ] README 完整
[ ] 設計文件完整
[ ] 專案可重新 clone
[ ] 可依文件重新執行
[ ] 已安全 Push 至 GitHub
```

全部通過後：

```text
GATE 4 = PASS
```

若發現 Secret 曾被 commit：

```text
SECRET = EXPOSED
ROTATE SECRET
```

不可只刪除檔案或刪除 Git 中目前版本後就視為安全。

若 Gate 4 未通過，不得進入 Gate 5。

---

# 7. Gate 5 — Vercel Auto Deployment

## Goal

將 GitHub Repository 連接 Vercel，並建立由 GitHub Push 觸發的自動 Build / Deploy 流程。

## Required Workflow

```text
Code Change
    ↓
Commit
    ↓
Push
    ↓
GitHub
    ↓
Vercel
    ↓
Auto Build
    ↓
Auto Deploy
```

### Step 5.1 — Connect Repository

將 Gate 4 已驗證的 GitHub Repository 連接 Vercel。

### Step 5.2 — Configure Environment Variables

在 Vercel 設定部署需要的 Environment Variables。

真正的 CWA Key 只能存在：

- Local `.env`
- Deployment Platform Environment Variables

不可寫入 Repository。

### Step 5.3 — Trigger Deployment

由 GitHub Push 觸發 Vercel Build / Deploy。

### Step 5.4 — Verify Public Website

確認公開網站可正常使用。

## SQLite Deployment Limitation

Local SQLite 適合 Gate 2–3 教學用途。

不可假設 Vercel Local Filesystem 是永久性 Production Database。

若線上版本需要持續寫入資料：

```text
Cloud Database = Advanced Deployment Requirement
```

此項目屬進階部署需求，不影響本作業 Gate 2–3 使用 Local SQLite 的設計。

## Gate 5 Verification

```text
[ ] Gate 4 已 PASS
[ ] GitHub Repository 已連接 Vercel
[ ] 必要 Environment Variables 已設定
[ ] CWA API Key 未寫入 Repository
[ ] GitHub Push 可觸發 Vercel Build
[ ] Vercel Build 成功
[ ] Vercel Deploy 成功
[ ] Public Website 可正常開啟
```

全部通過後：

```text
GATE 5 = PASS
```

---

# 8. Security Checkpoint

Security Check 必須貫穿整個 Workflow，而不是只在 Gate 4 執行。

## API Key Rules

```text
Local Development
    → .env

Cloud Deployment
    → Platform Environment Variables

Git Repository
    → NEVER STORE REAL SECRET
```

## Required Security Checklist

```text
[ ] CWA_API_KEY 僅由 Environment Variable 取得
[ ] .env 已加入 .gitignore
[ ] Repository 無 API Key
[ ] Repository 無 Password
[ ] Repository 無 Token
[ ] Repository 無其他 Secret
[ ] Secret 若曾 Commit，已視為 exposed
[ ] Exposed Secret 已 Rotate
```

---

# 9. Failure Handling Rule

任何 Gate 發生錯誤時，遵循：

```text
FAIL
 ↓
STOP
 ↓
IDENTIFY PROBLEM
 ↓
FIX
 ↓
RUN
 ↓
TEST
 ↓
VERIFY
 ↓
PASS ?
 ├─ NO  → FIX AGAIN
 └─ YES → NEXT GATE
```

禁止：

```text
Gate 1 FAIL → directly build Gate 2
Gate 2 FAIL → directly build GIS
Gate 3 FAIL → directly push GitHub
Gate 4 FAIL → directly deploy Vercel
```

---

# 10. Definition of Done

專案只有在五個 Gate 全部 PASS 後才算完成。

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

Final Checklist：

```text
[ ] Gate 1 = PASS
[ ] Gate 2 = PASS
[ ] Gate 3 = PASS
[ ] Gate 4 = PASS
[ ] Gate 5 = PASS
[ ] Security Checklist = PASS
[ ] Public Website 可正常開啟
```

---

# 11. Learning Path

本作業的完整學習路徑：

```text
Data Acquisition
    ↓
Data Engineering
    ↓
GIS Data Application
    ↓
Software Engineering
    ↓
Cloud / CI/CD
```

---

# 12. Workflow Status Template

開發過程可使用下列格式持續更新目前狀態：

```text
Project: Taiwan Weather GIS Dashboard

Gate 1 — CWA API
Status: TODO / IN PROGRESS / PASS / FAIL
Evidence:
- 

Gate 2 — Database
Status: TODO / IN PROGRESS / PASS / FAIL
Evidence:
- 

Gate 3 — Local Taiwan GIS
Status: TODO / IN PROGRESS / PASS / FAIL

3A Taiwan Map: TODO / PASS / FAIL
3B One Location Marker: TODO / PASS / FAIL
3C Weather Popup: TODO / PASS / FAIL
3D Taiwan Locations: TODO / PASS / FAIL
3E Database → GIS: TODO / PASS / FAIL
3F Taiwan GeoJSON: TODO / PASS / FAIL
3G Interactive Dashboard: TODO / PASS / FAIL

Evidence:
- 

Gate 4 — GitHub
Status: TODO / IN PROGRESS / PASS / FAIL
Evidence:
- 

Gate 5 — Vercel
Status: TODO / IN PROGRESS / PASS / FAIL
Evidence:
- 

Overall Status: IN PROGRESS / COMPLETE
```

---

## Final Rule

```text
ONE GATE AT A TIME.

BUILD → RUN → TEST → VERIFY → PASS → NEXT GATE
```

任何 Gate 未 PASS，都不得自行進入下一階段。
