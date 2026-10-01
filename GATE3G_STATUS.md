# Gate 3G — Interactive Dashboard

## Goal

完成可互動的 Taiwan Weather GIS Dashboard，整合頂部氣象指標、左側搜尋篩選縣市列表與右側 Leaflet 地圖雙向聯動。

## Current Status

`GATE 3G = PASS`
`GATE 3 = PASS`

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

- [x] Dashboard 可在 localhost 正常操作
- [x] 頂部氣象指標列（最高溫、最低溫、最高降雨機率、涵蓋測站）動態自 SQLite 計算並呈現
- [x] 左側搜尋框可即時過濾 22 縣市卡片清單
- [x] 排序選單支援依氣溫與降雨機率即時排序
- [x] 點擊左側任一縣市卡片，地圖平滑飛移聚焦（flyTo）並自動開啟該縣市的氣象 Popup
- [x] 點擊地圖上的行政區邊界或站點 Marker，側邊欄同步滾動反白選取該縣市
- [x] 右上角可切換「行政區界」與「氣象站點」圖層
- [x] 支援「🔄 重設全台視野」按鈕回到台灣全島視野

全部通過後：

`GATE 3G = PASS`
`GATE 3 = PASS`

下一步：

`Gate 4 — GitHub`
