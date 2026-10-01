# Gate 3E — Database → GIS

## Goal

將 Gate 2 SQLite 中的真實 Weather Data 接入 GIS 前端地圖，杜絕任何 hard-code 氣象資料。

## Current Status

`GATE 3E = PASS`

## Run

```bash
pip install -r requirements.txt
python app.py
```

瀏覽器開啟：

```text
http://127.0.0.1:5000
```

## PASS Checklist

- [x] GIS Weather Data 由後端 SQLite Database (`data/weather.db`) 提供（透過 `/api/weather`）
- [x] 原始碼中無 hard-code 氣象資料
- [x] 點擊地圖各 Marker 可正確呈現該縣市來自資料庫的氣象資訊（包含天氣現象、溫度區間、降雨機率、多時段預報）
- [x] 若資料庫內容更新，GIS 可即時反映最新資料

全部通過後：

`GATE 3E = PASS`

下一步：

`Gate 3F — Taiwan GeoJSON`
