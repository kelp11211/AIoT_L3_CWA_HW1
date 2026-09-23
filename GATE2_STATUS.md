# Gate 2 — Database (SQLite & ETL)

## Database Details

- Database Engine: SQLite3
- File Path: `data/weather.db`
- Table Name: `weather_forecast`

## Current Status

`GATE 2 = PASS`

## Completed

- [x] 建立資料庫結構 (`gate2_init_db.py` / `weather_forecast` table)
- [x] 定義 Primary Key 與 Unique Constraint: `UNIQUE(location, start_time, end_time)`
- [x] 實作 ETL 流程 (`gate2_etl.py`)
- [x] 從 Gate 1 raw JSON 擷取並轉換預報資料 (共 22 個縣市，66 筆預報紀錄)
- [x] 實作避免重複寫入策略 (Upsert / `ON CONFLICT DO UPDATE`)
- [x] 執行 SQL 查詢驗證真實資料與無重複資料 (`gate2_verify.py`)
- [x] 驗證 Total rows = 66, Location count = 22, Duplicates = 0

## Verification Result

```text
=== Gate 2 SQL Verification ===
Total rows: 66
Location count: 22

=== 臺中市 Forecast ===
臺中市 | 2026-09-23 12:00:00 ~ 2026-09-23 18:00:00 | 晴時多雲 | PoP=0% | MinT=30C | MaxT=33C | Fetched=2026-09-23T11:27:04
臺中市 | 2026-09-23 18:00:00 ~ 2026-09-24 06:00:00 | 晴時多雲 | PoP=0% | MinT=26C | MaxT=30C | Fetched=2026-09-23T11:27:04
臺中市 | 2026-09-24 06:00:00 ~ 2026-09-24 18:00:00 | 晴時多雲 | PoP=10% | MinT=26C | MaxT=33C | Fetched=2026-09-23T11:27:04

=== Duplicate Check ===
PASS: 無重複資料

GATE 2 = PASS
```
