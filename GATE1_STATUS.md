# Gate 1 — CWA API

## Dataset

- Dataset ID: `F-C0032-001`
- Name: 今明 36 小時天氣預報
- API endpoint:
  `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001`

## Current Status

`GATE 1 = PASS`

## Completed

- [x] 選定真實 CWA Forecast Dataset
- [x] 從環境變數讀取 `CWA_API_KEY`
- [x] 建立真實 HTTP GET request
- [x] 指定 JSON response
- [x] 將真實 raw JSON 保存到 `data/raw/`
- [x] 不在取得真實 response 前預先假設 JSON schema
- [x] 使用有效 `CWA_API_KEY` 實際取得一次真實 response
- [x] 根據實際 response 確認 JSON schema
- [x] 驗證 Location（共 22 個縣市）
- [x] 驗證 Forecast Time（各時段 startTime / endTime）
- [x] 驗證 Weather (`Wx`)
- [x] 驗證 MinT
- [x] 驗證 MaxT
- [x] 驗證 PoP（降雨機率）
- [x] 完成 Gate 1 PASS 判定（共解析 66 筆預報資料）

## Pending

無 (Gate 1 已全數通過，準備進入 Gate 2)

## Run

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

macOS / Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

編輯 `.env`：

```env
CWA_API_KEY=你的中央氣象署授權碼
```

執行：

```bash
python gate1_fetch.py
```

## PASS Rule

必須先取得真實 CWA response，再依實際 JSON schema 完成欄位解析與驗證；
在此之前不得標示 `GATE 1 = PASS`。
