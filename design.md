# Design — Taiwan Weather GIS Dashboard

## 1. Purpose

AIoT L3 CWA HW1 採五 Gate 架構：

```text
CWA API → Database → Local Taiwan GIS → GitHub → Vercel
```

核心要求是使用可追溯的 CWA 真實 Open Data，逐 Gate 建置與驗證。

## 2. System Architecture

```text
CWA Open Data
   ↓ REST API
Real JSON
   ↓
ETL / Normalize
   ↓
SQLite (Local)
   ↓
Backend JSON API
   ↓
HTML / CSS / JavaScript
   ↓
Leaflet + OpenStreetMap + Taiwan GeoJSON
   ↓
Taiwan Weather GIS Dashboard
   ↓
GitHub
   ↓
Vercel Auto Deployment
```

## 3. Gate 1 — Data Acquisition

選定 CWA Weather Forecast Dataset 與 endpoint，`CWA_API_KEY` 僅由 environment variable 取得。先取得真實 response，再依實際 JSON schema 實作 parser。

最低驗收欄位：Location、Forecast Start/End、Weather、MinT、MaxT；PoP 視 Dataset 實際提供情況加入。

**PASS:** HTTP request、JSON parsing 與必要欄位驗證全部成功。

## 4. Gate 2 — Data Engineering

流程：

```text
Extract CWA → Transform/Normalize → Validate → Load SQLite
```

建議資料表 `weather_forecasts`：

| Field | Type | Purpose |
|---|---|---|
| id | INTEGER | Primary key |
| location_name | TEXT | 地區 |
| latitude | REAL | 緯度 |
| longitude | REAL | 經度 |
| forecast_start | TEXT | 預報開始 |
| forecast_end | TEXT | 預報結束 |
| weather | TEXT | 天氣現象 |
| min_temp | REAL | 最低溫 |
| max_temp | REAL | 最高溫 |
| rain_probability | REAL | 降雨機率，可空 |
| source | TEXT | CWA |
| fetched_at | TEXT | 擷取時間 |

需有 duplicate strategy，並以 SQL 查詢驗證。

## 5. Gate 3 — GIS Application

本機先完成：

```text
Taiwan Map → Marker → Popup → Multiple Locations
→ Database Integration → GeoJSON → Dashboard
```

GIS 採 Leaflet + OpenStreetMap；行政區視覺化採 Taiwan GeoJSON。氣象資料不可 hard-code，必須由 Gate 2 Database 提供。

## 6. Gate 4 — Source Control

GitHub 保存 source、README、design 與 workflow，但不得保存真正 API Key。

`.gitignore`：

```gitignore
.env
.venv/
venv/
__pycache__/
*.pyc
```

## 7. Gate 5 — Deployment

GitHub 連接 Vercel，自動 build/deploy。部署 secrets 使用 Vercel Environment Variables。

Local SQLite 是教學與本機資料層；若 production 需要持續寫入，另選 Cloud Database，不把 Vercel ephemeral filesystem 當永久資料庫。

## 8. Integrity & Error Handling

禁止 mock/fake weather data。畫面資料必須可追溯：

```text
GIS → Backend → Database → ETL → CWA API
```

需處理 missing key、CWA API failure、invalid JSON、database failure、missing location data。

## 9. Development Contract

```text
BUILD → RUN → TEST → VERIFY → PASS → NEXT
```

Gate FAIL 不得跳級。Antigravity 每次只實作目前 Gate。

## 10. Definition of Done

```text
PASS Gate 1 CWA API
 ↓
PASS Gate 2 Database
 ↓
PASS Gate 3 Local Taiwan GIS
 ↓
PASS Gate 4 GitHub
 ↓
PASS Gate 5 Vercel
 ↓
COMPLETE
```
