# Gate 3F — Taiwan GeoJSON

## Goal

加入 Taiwan GeoJSON，在地圖上渲染台灣各縣市邊界多邊形，建立地理空間區域視覺化與互動呈現能力。

## Current Status

`GATE 3F = PASS`

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

- [x] Taiwan GeoJSON 成功載入（由 `static/data/taiwan_counties.geojson` 本地提供）
- [x] GeoJSON 行政區邊界多邊形正確呈現在 Leaflet Map 上
- [x] 支援縣市懸停高亮互動與 Tooltip 縣域名稱提示
- [x] 支援圖層切換控制項（Layer Control），可自由切換邊界與氣象站點
- [x] 點擊縣市邊界可平滑縮放定位至該縣市區域

全部通過後：

`GATE 3F = PASS`

下一步：

`Gate 3G — Interactive Dashboard`
