# Gate 3D — Taiwan Locations

## Goal

將單一地點擴充為台灣多個 Location，確認多點標記在地圖上的呈現與辨識。

## Current Status

`GATE 3D = PASS`

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

- [x] Taiwan 多個地點可呈現在地圖上（包含全台 22 縣市 Marker）
- [x] 不同 Location 可被正確識別（標籤與彈跳視窗皆正確標示各縣市名稱與座標）

全部通過後：

`GATE 3D = PASS`

下一步：

`Gate 3E — Database → GIS`
