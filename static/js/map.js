// Gate 3G — Dual Mode Weather GIS Dashboard
// 模式 A：即時物理觀測 (CWA O-A0001-001) 全台 840+ 測站點位與彩色熱度圖 (Heatmap)
// 模式 B：36 小時預報 (CWA F-C0032-001) 全台 22 縣市綜合預報與邊界連動

// 1. 初始化地圖與中心設定
const TAIWAN_CENTER = [23.7, 121.0];
const TAIWAN_DEFAULT_ZOOM = 7.5;

const map = L.map("map", {
    zoomControl: true,
    minZoom: 6,
    maxZoom: 18
}).setView(TAIWAN_CENTER, TAIWAN_DEFAULT_ZOOM);

// 基礎底圖：OpenStreetMap
const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | 資料來源：交通部中央氣象署 (CWA)'
    }
).addTo(map);

// 圖層群組定義
const forecastMarkersLayer = L.layerGroup();
const obsMarkersLayer = L.layerGroup();
let obsHeatLayer = null;
let geojsonLayer = null;
let layerControl = null;

// 當前模式：'obs' (模式 A：即時觀測熱度圖) 或 'forecast' (模式 B：36h 縣市預報)
let currentMode = "obs";

// 快取資料
let cachedWeatherData = null;
let cachedObservationsData = null;

// 參照參引
const countyMarkerRefs = {};
const stationMarkerRefs = {};
const geojsonFeatureRefs = {};
let activeCountyName = null;
let activeStationId = null;

// 台灣 22 縣市中心座標（供模式 B 預報標記使用）
const taiwanLocations = [
    { name: "基隆市", lat: 25.1276, lng: 121.7392 },
    { name: "臺北市", lat: 25.0375, lng: 121.5637 },
    { name: "新北市", lat: 25.0169, lng: 121.4628 },
    { name: "桃園市", lat: 24.9936, lng: 121.3010 },
    { name: "新竹市", lat: 24.8138, lng: 120.9675 },
    { name: "新竹縣", lat: 24.8387, lng: 121.0177 },
    { name: "苗栗縣", lat: 24.5602, lng: 120.8214 },
    { name: "臺中市", lat: 24.1477, lng: 120.6736 },
    { name: "彰化縣", lat: 24.0518, lng: 120.5161 },
    { name: "南投縣", lat: 23.9609, lng: 120.9719 },
    { name: "雲林縣", lat: 23.7092, lng: 120.4313 },
    { name: "嘉義市", lat: 23.4800, lng: 120.4491 },
    { name: "嘉義縣", lat: 23.4518, lng: 120.2559 },
    { name: "臺南市", lat: 22.9997, lng: 120.2270 },
    { name: "高雄市", lat: 22.6273, lng: 120.3014 },
    { name: "屏東縣", lat: 22.5519, lng: 120.5487 },
    { name: "宜蘭縣", lat: 24.7021, lng: 121.7378 },
    { name: "花蓮縣", lat: 23.9872, lng: 121.6016 },
    { name: "臺東縣", lat: 22.7583, lng: 121.1444 },
    { name: "澎湖縣", lat: 23.5711, lng: 119.5793 },
    { name: "金門縣", lat: 24.4492, lng: 118.3766 },
    { name: "連江縣", lat: 26.1505, lng: 119.9499 }
];

// ================= 輔助視覺與顏色對照函式 =================

function getWeatherIcon(weather) {
    if (!weather) return "⛅";
    if (weather.includes("雷")) return "⛈️";
    if (weather.includes("雨")) return "🌧️";
    if (weather.includes("晴")) {
        if (weather.includes("雲") || weather.includes("陰")) return "⛅";
        return "☀️";
    }
    if (weather.includes("陰") || weather.includes("多雲")) return "☁️";
    return "🌤️";
}

function getStationTempColor(temp) {
    if (temp === null || temp === undefined || isNaN(temp)) return "#94a3b8";
    if (temp < 10) return "#1e40af"; // 高山寒冷 深藍
    if (temp < 15) return "#0284c7"; // 涼冷 藍
    if (temp < 20) return "#0d9488"; // 舒適 藍綠
    if (temp < 24) return "#16a34a"; // 溫和 綠
    if (temp < 27) return "#ca8a04"; // 偏暖 暖黃
    if (temp < 30) return "#ea580c"; // 炎熱 亮橘
    return "#dc2626"; // 酷熱 熾紅
}

function getStationTempBg(temp) {
    if (temp === null || temp === undefined || isNaN(temp)) return "#f1f5f9";
    if (temp < 10) return "#dbeafe";
    if (temp < 15) return "#e0f2fe";
    if (temp < 20) return "#ccfbf1";
    if (temp < 24) return "#dcfce7";
    if (temp < 27) return "#fef9c3";
    if (temp < 30) return "#ffedd5";
    return "#fee2e2";
}

// 彈出 Toast 訊息
function showSyncToast(message, isSuccess = true) {
    let toast = document.getElementById("sync-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "sync-toast";
        toast.style.position = "fixed";
        toast.style.bottom = "24px";
        toast.style.right = "24px";
        toast.style.padding = "12px 20px";
        toast.style.borderRadius = "8px";
        toast.style.boxShadow = "0 4px 14px rgba(0,0,0,0.2)";
        toast.style.fontWeight = "600";
        toast.style.fontSize = "14px";
        toast.style.zIndex = "9999";
        toast.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        document.body.appendChild(toast);
    }
    toast.style.background = isSuccess ? "#10b981" : "#ef4444";
    toast.style.color = "#ffffff";
    toast.textContent = (isSuccess ? "✅ " : "⚠️ ") + message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
    }, 4500);
}

// ================= HTML Popup 建立函式 =================

// 模式 B：建立 22 縣市 36h 預報卡片
function buildForecastPopupContent(locName, forecasts) {
    if (!forecasts || forecasts.length === 0) {
        return `
        <div class="weather-popup">
            <div class="popup-header">
                <h3>${locName}</h3>
            </div>
            <div class="weather-desc">查無此縣市之預報紀錄</div>
        </div>
        `;
    }

    const current = forecasts[0];
    const icon = getWeatherIcon(current.weather);

    let periodRows = "";
    forecasts.forEach((f, idx) => {
        const pIcon = getWeatherIcon(f.weather);
        const start = f.start_time.split(" ")[1]?.substring(0, 5) || f.start_time;
        const end = f.end_time.split(" ")[1]?.substring(0, 5) || f.end_time;
        const isCurrent = idx === 0 ? "current-period" : "";
        periodRows += `
        <div class="forecast-period ${isCurrent}">
            <div class="period-time">${start} ~ ${end}</div>
            <div class="period-wx">${pIcon} ${f.weather}</div>
            <div class="period-temp">${f.min_temp}° - ${f.max_temp}°C</div>
            <div class="period-pop">💧 ${f.pop !== null ? f.pop + "%" : "-"}</div>
        </div>
        `;
    });

    return `
    <div class="weather-popup">
        <div class="popup-header">
            <h3>${locName}</h3>
            <span class="weather-badge">${icon} ${current.weather}</span>
        </div>
        <div class="current-weather">
            <div class="temp-range">🌡️ ${current.min_temp}°C ~ ${current.max_temp}°C</div>
            <div class="pop-info">💧 降雨機率：${current.pop !== null ? current.pop + "%" : "無"}</div>
        </div>
        <div class="forecast-timeline">
            <div class="timeline-title">未來 36 小時預報時段</div>
            ${periodRows}
        </div>
        <div class="data-source">
            <span>資料來源：CWA F-C0032-001 (${current.fetched_at || "即時"})</span>
        </div>
    </div>
    `;
}

// 模式 A：建立 840+ 測站即時物理量 Popup
function buildStationPopupContent(s) {
    const tempColor = getStationTempColor(s.temp);
    const tempText = s.temp !== null ? `${s.temp}°C` : "--";
    const humText = s.humidity !== null ? `${s.humidity}%` : "--";
    const rainText = s.rainfall_1h !== null ? `${s.rainfall_1h} mm` : "--";
    const windSpeedText = s.wind_speed !== null ? `${s.wind_speed} m/s` : "--";
    const windDirText = s.wind_dir !== null ? `${s.wind_dir}°` : "--";
    const altText = s.altitude !== null ? `${s.altitude} m` : "--";
    const obsTime = s.observed_at ? s.observed_at.replace("T", " ").substring(0, 19) : "--";

    return `
    <div class="weather-popup" style="min-width: 250px;">
        <div class="obs-popup-header">
            <h3 class="obs-station-title">${s.name} <small style="font-size:12px;color:#64748b;font-weight:normal;">${s.county || ""}${s.town ? " · " + s.town : ""}</small></h3>
            <span class="obs-station-id">${s.id}</span>
        </div>
        <div class="obs-temp-highlight">
            <div>
                <div style="font-size:11px;color:#64748b;font-weight:600;">實測氣溫</div>
                <div class="obs-temp-val" style="color:${tempColor};">${tempText}</div>
            </div>
            <div style="text-align:right;">
                <span style="font-size:12px;color:#64748b;font-weight:600;">⛰️ 海拔 ${altText}</span>
            </div>
        </div>
        <div class="obs-metrics-grid">
            <div class="obs-metric-item">💧 相對濕度：<strong>${humText}</strong></div>
            <div class="obs-metric-item">🌧️ 過去1h雨量：<strong>${rainText}</strong></div>
            <div class="obs-metric-item">💨 風速：<strong>${windSpeedText}</strong></div>
            <div class="obs-metric-item">🧭 風向：<strong>${windDirText}</strong></div>
        </div>
        <div class="data-source">
            <span>觀測時間：${obsTime} (CWA O-A0001-001)</span>
        </div>
    </div>
    `;
}

// ================= KPI 指標列更新函式 =================

function updateKpiForObservations(stations) {
    if (!stations || stations.length === 0) return;

    let maxT = -999, maxStation = null;
    let minT = 999, minStation = null;
    let sumT = 0, countT = 0;

    stations.forEach((s) => {
        if (s.temp !== null && s.temp > -50) {
            if (s.temp > maxT) {
                maxT = s.temp;
                maxStation = s;
            }
            if (s.temp < minT) {
                minT = s.temp;
                minStation = s;
            }
            sumT += s.temp;
            countT++;
        }
    });

    const avgT = countT > 0 ? (sumT / countT).toFixed(1) : "--";

    // 1. 最高溫
    const maxTempEl = document.getElementById("kpi-max-temp");
    const maxLocEl = document.getElementById("kpi-max-loc");
    const maxLabel = document.querySelector("#metric-max-temp .metric-label");
    if (maxLabel) maxLabel.textContent = "全台測站最高溫";
    if (maxTempEl && maxStation) {
        maxTempEl.textContent = `${maxT}°C`;
        maxLocEl.textContent = `${maxStation.name} (${maxStation.county || ""})`;
    }

    // 2. 最低溫
    const minTempEl = document.getElementById("kpi-min-temp");
    const minLocEl = document.getElementById("kpi-min-loc");
    const minLabel = document.querySelector("#metric-min-temp .metric-label");
    if (minLabel) minLabel.textContent = "全台測站最低溫";
    if (minTempEl && minStation) {
        minTempEl.textContent = `${minT}°C`;
        minLocEl.textContent = `${minStation.name} (${minStation.county || ""})`;
    }

    // 3. 平均氣溫
    const popEl = document.getElementById("kpi-max-pop");
    const popLocEl = document.getElementById("kpi-pop-loc");
    const popLabel = document.querySelector("#metric-pop .metric-label");
    if (popLabel) popLabel.textContent = "全台即時平均溫";
    if (popEl) {
        popEl.textContent = `${avgT}°C`;
        popLocEl.textContent = `統計全台 ${countT} 個有效測站`;
    }

    // 4. 測站涵蓋度
    const stationCountEl = document.getElementById("kpi-station-count");
    const stationLabel = document.querySelector("#metric-stations .metric-label");
    const stationSub = document.querySelector("#metric-stations .metric-sub");
    if (stationLabel) stationLabel.textContent = "即時觀測測站數";
    if (stationCountEl) {
        stationCountEl.textContent = `${stations.length} 站`;
    }
    if (stationSub) {
        stationSub.textContent = "CWA 自動氣象觀測站 (O-A0001-001)";
    }
}

function updateKpiForForecast(weatherMap) {
    let maxTemp = -999, maxTempLoc = "";
    let minTemp = 999, minTempLoc = "";
    let maxPop = -1, maxPopLoc = "";

    Object.keys(weatherMap).forEach((loc) => {
        const list = weatherMap[loc];
        if (list && list.length > 0) {
            const first = list[0];
            if (first.max_temp > maxTemp) {
                maxTemp = first.max_temp;
                maxTempLoc = loc;
            }
            if (first.min_temp < minTemp) {
                minTemp = first.min_temp;
                minTempLoc = loc;
            }
            if (first.pop !== null && first.pop > maxPop) {
                maxPop = first.pop;
                maxPopLoc = loc;
            }
        }
    });

    const maxLabel = document.querySelector("#metric-max-temp .metric-label");
    if (maxLabel) maxLabel.textContent = "全台最高溫";
    const maxTempEl = document.getElementById("kpi-max-temp");
    const maxLocEl = document.getElementById("kpi-max-loc");
    if (maxTempEl && maxLocEl) {
        maxTempEl.textContent = `${maxTemp}°C`;
        maxLocEl.textContent = `${maxTempLoc} (最高溫)`;
    }

    const minLabel = document.querySelector("#metric-min-temp .metric-label");
    if (minLabel) minLabel.textContent = "全台最低溫";
    const minTempEl = document.getElementById("kpi-min-temp");
    const minLocEl = document.getElementById("kpi-min-loc");
    if (minTempEl && minLocEl) {
        minTempEl.textContent = `${minTemp}°C`;
        minLocEl.textContent = `${minTempLoc} (最低溫)`;
    }

    const popLabel = document.querySelector("#metric-pop .metric-label");
    if (popLabel) popLabel.textContent = "最高降雨機率";
    const popEl = document.getElementById("kpi-max-pop");
    const popLocEl = document.getElementById("kpi-pop-loc");
    if (popEl && popLocEl) {
        popEl.textContent = `${maxPop}%`;
        popLocEl.textContent = `${maxPopLoc} (降雨機率最高)`;
    }

    const stationLabel = document.querySelector("#metric-stations .metric-label");
    const stationCountEl = document.getElementById("kpi-station-count");
    const stationSub = document.querySelector("#metric-stations .metric-sub");
    if (stationLabel) stationLabel.textContent = "測站涵蓋度";
    if (stationCountEl) {
        stationCountEl.textContent = "22 / 22";
    }
    if (stationSub) {
        stationSub.textContent = "66 筆預報 (未來 36 小時)";
    }
}

// ================= 聚焦與互動連動函式 =================

function focusCounty(countyName) {
    const loc = taiwanLocations.find((l) => l.name === countyName);
    if (!loc) return;

    activeCountyName = countyName;

    // 側邊欄高亮卡片
    document.querySelectorAll(".county-card").forEach((card) => {
        if (card.dataset.name === countyName) {
            card.classList.add("active");
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
            card.classList.remove("active");
        }
    });

    // 平滑移動地圖
    map.flyTo([loc.lat, loc.lng], 9, { duration: 1.0 });

    const marker = countyMarkerRefs[countyName];
    if (marker) {
        setTimeout(() => {
            marker.openPopup();
        }, 300);
    }

    const layer = geojsonFeatureRefs[countyName];
    if (layer && geojsonLayer) {
        geojsonLayer.resetStyle();
        layer.setStyle({
            weight: 3.5,
            color: "#1d4ed8",
            dashArray: "",
            fillColor: "#2563eb",
            fillOpacity: 0.35
        });
        layer.bringToFront();
    }
}

function focusStation(s) {
    activeStationId = s.id;

    // 側邊欄高亮卡片
    document.querySelectorAll(".county-card").forEach((card) => {
        if (card.dataset.id === s.id) {
            card.classList.add("active");
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
            card.classList.remove("active");
        }
    });

    // 平滑縮放至測站 (Zoom 13)
    map.flyTo([s.lat, s.lon], 13, { duration: 1.0 });

    const marker = stationMarkerRefs[s.id];
    if (marker) {
        setTimeout(() => {
            marker.openPopup();
        }, 300);
    }
}

// ================= 側邊欄渲染函式 =================

function renderSidebar() {
    if (currentMode === "obs") {
        renderObservationStationList();
    } else {
        renderForecastCountyList();
    }
}

// 模式 A：渲染 840+ 測站列表（支援名稱、縣市、鄉鎮篩選與排序）
function renderObservationStationList() {
    const searchInput = document.getElementById("search-input");
    const sortSelect = document.getElementById("sort-select");
    const countyListEl = document.getElementById("county-list");
    if (!countyListEl) return;

    if (!cachedObservationsData || cachedObservationsData.length === 0) {
        countyListEl.innerHTML = `
            <div class="empty-state">
                <div class="spinner"></div>
                <p>正在載入全台 800+ 測站即時觀測數據...</p>
            </div>
        `;
        return;
    }

    const query = (searchInput?.value || "").trim().toLowerCase();
    const sortMode = sortSelect?.value || "default";

    // 1. 搜尋過濾 (測站名稱、縣市、鄉鎮、測站代碼)
    let filtered = cachedObservationsData.filter((s) => {
        if (!query) return true;
        const nameMatch = s.name && s.name.toLowerCase().includes(query);
        const countyMatch = s.county && s.county.toLowerCase().includes(query);
        const townMatch = s.town && s.town.toLowerCase().includes(query);
        const idMatch = s.id && s.id.toLowerCase().includes(query);
        return nameMatch || countyMatch || townMatch || idMatch;
    });

    // 2. 排序
    if (sortMode === "temp-asc") {
        filtered.sort((a, b) => (a.temp ?? 999) - (b.temp ?? 999));
    } else if (sortMode === "pop-desc") {
        // 在觀測模式下，降雨排序依據時雨量，再依濕度
        filtered.sort((a, b) => {
            const rainDiff = (b.rainfall_1h ?? -1) - (a.rainfall_1h ?? -1);
            if (rainDiff !== 0) return rainDiff;
            return (b.humidity ?? -1) - (a.humidity ?? -1);
        });
    } else {
        // default 或 temp-desc：氣溫由高到低
        filtered.sort((a, b) => (b.temp ?? -999) - (a.temp ?? -999));
    }

    if (filtered.length === 0) {
        countyListEl.innerHTML = `
            <div class="empty-state">
                <p>找不到符合「${query}」的測站或行政區</p>
            </div>
        `;
        return;
    }

    // 限制渲染前 150 筆卡片以確保極致流暢度，並顯示筆數提示
    const renderLimit = 150;
    const renderItems = filtered.slice(0, renderLimit);
    const countNote = filtered.length > renderLimit 
        ? `<div style="padding:6px 12px;font-size:11px;color:#64748b;background:#f8fafc;border-radius:6px;margin-bottom:8px;font-weight:600;">顯示前 ${renderLimit} 筆 / 共找到 ${filtered.length} 個測站</div>`
        : `<div style="padding:6px 12px;font-size:11px;color:#64748b;background:#f8fafc;border-radius:6px;margin-bottom:8px;font-weight:600;">共 ${filtered.length} 個觀測站</div>`;

    const cardsHtml = renderItems.map((s) => {
        const tempColor = getStationTempColor(s.temp);
        const tempBg = getStationTempBg(s.temp);
        const tempText = s.temp !== null ? `${s.temp}°C` : "--";
        const isActive = activeStationId === s.id ? "active" : "";

        return `
        <div class="county-card ${isActive}" data-id="${s.id}">
            <div class="card-header-row">
                <span class="card-county-name">${s.name} <small style="font-size:11px;color:#64748b;font-weight:normal;">${s.county || ""}${s.town ? " · " + s.town : ""}</small></span>
                <span class="card-wx-badge" style="background:${tempBg};color:${tempColor};font-weight:700;">🌡️ ${tempText}</span>
            </div>
            <div class="card-info-row">
                <span style="font-size:12px;color:#475569;">💧 濕度 ${s.humidity !== null ? s.humidity + "%" : "--"}</span>
                <span style="font-size:12px;color:#0284c7;">🌧️ ${s.rainfall_1h > 0 ? s.rainfall_1h + "mm" : "無雨"}</span>
                <span style="font-size:11px;color:#64748b;">⛰️ ${s.altitude !== null ? s.altitude + "m" : "--"}</span>
            </div>
        </div>
        `;
    }).join("");

    countyListEl.innerHTML = countNote + cardsHtml;

    // 綁定點擊事件
    countyListEl.querySelectorAll(".county-card").forEach((card) => {
        card.addEventListener("click", () => {
            const sid = card.dataset.id;
            const targetStation = cachedObservationsData.find((s) => s.id === sid);
            if (targetStation) {
                focusStation(targetStation);
            }
        });
    });
}

// 模式 B：渲染 22 縣市卡片清單
function renderForecastCountyList() {
    const searchInput = document.getElementById("search-input");
    const sortSelect = document.getElementById("sort-select");
    const countyListEl = document.getElementById("county-list");
    if (!countyListEl) return;

    if (!cachedWeatherData) {
        countyListEl.innerHTML = `
            <div class="empty-state">
                <div class="spinner"></div>
                <p>正在載入 22 縣市預報資料...</p>
            </div>
        `;
        return;
    }

    const query = (searchInput?.value || "").trim().toLowerCase();
    const sortMode = sortSelect?.value || "default";

    let filtered = taiwanLocations.filter((loc) => {
        return loc.name.toLowerCase().includes(query);
    });

    if (sortMode === "temp-desc") {
        filtered.sort((a, b) => {
            const tempA = cachedWeatherData[a.name]?.[0]?.max_temp ?? -999;
            const tempB = cachedWeatherData[b.name]?.[0]?.max_temp ?? -999;
            return tempB - tempA;
        });
    } else if (sortMode === "temp-asc") {
        filtered.sort((a, b) => {
            const tempA = cachedWeatherData[a.name]?.[0]?.min_temp ?? 999;
            const tempB = cachedWeatherData[b.name]?.[0]?.min_temp ?? 999;
            return tempA - tempB;
        });
    } else if (sortMode === "pop-desc") {
        filtered.sort((a, b) => {
            const popA = cachedWeatherData[a.name]?.[0]?.pop ?? -1;
            const popB = cachedWeatherData[b.name]?.[0]?.pop ?? -1;
            return popB - popA;
        });
    }

    if (filtered.length === 0) {
        countyListEl.innerHTML = `
            <div class="empty-state">
                <p>找不到符合「${query}」的縣市</p>
            </div>
        `;
        return;
    }

    countyListEl.innerHTML = filtered.map((loc) => {
        const forecasts = cachedWeatherData[loc.name] || [];
        const cur = forecasts[0] || {};
        const icon = getWeatherIcon(cur.weather);
        const tempText = cur.min_temp !== undefined ? `${cur.min_temp}° - ${cur.max_temp}°C` : "--";
        const popVal = cur.pop !== null && cur.pop !== undefined ? cur.pop : 0;
        const isActive = activeCountyName === loc.name ? "active" : "";

        return `
        <div class="county-card ${isActive}" data-name="${loc.name}">
            <div class="card-header-row">
                <span class="card-county-name">${loc.name}</span>
                <span class="card-wx-badge">${icon} ${cur.weather || "無資料"}</span>
            </div>
            <div class="card-info-row">
                <span class="card-temp">🌡️ ${tempText}</span>
                <span class="card-pop">💧 降雨機率 ${popVal}%</span>
            </div>
            <div class="pop-bar-bg">
                <div class="pop-bar-fill" style="width: ${popVal}%;"></div>
            </div>
        </div>
        `;
    }).join("");

    countyListEl.querySelectorAll(".county-card").forEach((card) => {
        card.addEventListener("click", () => {
            const countyName = card.dataset.name;
            focusCounty(countyName);
        });
    });
}

// ================= 圖層初始化函式 =================

// 模式 A：渲染 840+ 測站 CircleMarker 與 Leaflet.heat 熱度圖
function initObservationsLayers(stations) {
    obsMarkersLayer.clearLayers();
    Object.keys(stationMarkerRefs).forEach((k) => delete stationMarkerRefs[k]);

    const heatPoints = [];

    stations.forEach((s) => {
        if (!s.lat || !s.lon) return;

        // 計算熱度點 (氣溫介於 8°C ~ 32°C 之間正規化)
        if (s.temp !== null && s.temp > -50) {
            const intensity = Math.max(0.12, Math.min(1.0, (s.temp - 8) / 24));
            heatPoints.push([s.lat, s.lon, intensity]);
        }

        // 圓形測站 Marker
        const color = getStationTempColor(s.temp);
        const marker = L.circleMarker([s.lat, s.lon], {
            radius: 5,
            fillColor: color,
            color: "#ffffff",
            weight: 1,
            opacity: 0.9,
            fillOpacity: 0.85
        });

        const popupHtml = buildStationPopupContent(s);
        marker.bindPopup(popupHtml, { maxWidth: 300 });

        const tipText = `${s.name} (${s.county || ""}) ${s.temp !== null ? s.temp + "°C" : "--"}`;
        marker.bindTooltip(tipText, { direction: "top" });

        marker.on("click", () => {
            focusStation(s);
        });

        stationMarkerRefs[s.id] = marker;
        marker.addTo(obsMarkersLayer);
    });

    // 建立或更新 Leaflet Heatmap Layer
    if (obsHeatLayer) {
        map.removeLayer(obsHeatLayer);
    }

    if (typeof L.heatLayer === "function") {
        obsHeatLayer = L.heatLayer(heatPoints, {
            radius: 28,
            blur: 18,
            maxZoom: 12,
            max: 1.0,
            gradient: {
                0.0: "#2563eb",  // 低溫藍
                0.25: "#06b6d4", // 青綠
                0.5: "#10b981",  // 翠綠
                0.7: "#eab308",  // 暖黃
                0.85: "#f97316", // 橘紅
                1.0: "#dc2626"   // 熾熱深紅
            }
        });
    }
}

// 模式 B：渲染 22 縣市預報 Marker
function initForecastMarkers(weatherMap) {
    forecastMarkersLayer.clearLayers();
    Object.keys(countyMarkerRefs).forEach((k) => delete countyMarkerRefs[k]);

    taiwanLocations.forEach((loc) => {
        const forecasts = weatherMap[loc.name] || [];
        const marker = L.marker([loc.lat, loc.lng], { title: loc.name }).addTo(forecastMarkersLayer);
        countyMarkerRefs[loc.name] = marker;

        const popupHtml = buildForecastPopupContent(loc.name, forecasts);
        marker.bindPopup(popupHtml);

        if (forecasts.length > 0) {
            const cur = forecasts[0];
            const icon = getWeatherIcon(cur.weather);
            marker.bindTooltip(`${loc.name} ${icon} ${cur.min_temp}°~${cur.max_temp}°C`, {
                direction: "top"
            });
        } else {
            marker.bindTooltip(loc.name, { direction: "top" });
        }

        marker.on("click", () => {
            focusCounty(loc.name);
        });
    });
}

// 更新 Leaflet 控制面板（右上角）
function updateLayerControl() {
    if (layerControl) {
        map.removeControl(layerControl);
    }

    const overlays = {};
    if (geojsonLayer) {
        overlays["🗺️ 行政區界 (Taiwan GeoJSON)"] = geojsonLayer;
    }

    if (currentMode === "obs") {
        if (obsHeatLayer) {
            overlays["🔥 實測溫度熱度圖 (Heatmap)"] = obsHeatLayer;
        }
        overlays["📍 觀測測站點位 (840+ Stations)"] = obsMarkersLayer;
    } else {
        overlays["📍 22 縣市預報 (Forecast Markers)"] = forecastMarkersLayer;
    }

    layerControl = L.control.layers(
        { "OpenStreetMap": osmLayer },
        overlays,
        { collapsed: false, position: "topright" }
    ).addTo(map);
}

// ================= 資料載入函式 =================

// 載入模式 A：測站即時物理觀測
function loadObservationsData(isRefresh = false) {
    const btnSyncCwa = document.getElementById("btn-sync-cwa");
    const syncIcon = btnSyncCwa ? btnSyncCwa.querySelector(".sync-icon") : null;
    const syncText = btnSyncCwa ? btnSyncCwa.querySelector(".sync-text") : null;
    const timestampEl = document.getElementById("data-timestamp");

    if (isRefresh && btnSyncCwa) {
        btnSyncCwa.disabled = true;
        if (syncIcon) syncIcon.classList.add("spinning");
        if (syncText) syncText.textContent = "連線 CWA API (O-A0001-001)...";
    }

    const endpoint = isRefresh ? "/api/refresh_observations" : "/api/observations";

    return fetch(endpoint)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((result) => {
            cachedObservationsData = result.data || [];
            initObservationsLayers(cachedObservationsData);

            if (currentMode === "obs") {
                // 將圖層加入地圖
                if (obsHeatLayer && !map.hasLayer(obsHeatLayer)) {
                    obsHeatLayer.addTo(map);
                }
                if (!map.hasLayer(obsMarkersLayer)) {
                    obsMarkersLayer.addTo(map);
                }
                updateKpiForObservations(cachedObservationsData);
                renderSidebar();
                updateLayerControl();
            }

            if (timestampEl) {
                const obsTime = result.latest_observed_at
                    ? result.latest_observed_at.replace("T", " ").substring(0, 19)
                    : new Date().toLocaleTimeString();
                timestampEl.textContent = `資料來源：CWA O-A0001-001 (${obsTime})`;
            }

            if (isRefresh) {
                showSyncToast(result.sync_message || `成功同步全台 ${cachedObservationsData.length} 個測站即時觀測數據！`, result.sync_success !== false);
            }
        })
        .catch((err) => {
            console.error("載入測站觀測資料失敗:", err);
            if (isRefresh) {
                showSyncToast("連線 CWA API (O-A0001-001) 失敗，請確認網路或 API Key", false);
            }
        })
        .finally(() => {
            if (isRefresh && btnSyncCwa) {
                btnSyncCwa.disabled = false;
                if (syncIcon) syncIcon.classList.remove("spinning");
                if (syncText) syncText.textContent = "連線 CWA API 即時同步";
            }
        });
}

// 載入模式 B：22 縣市 36h 預報
function loadForecastData(isRefresh = false) {
    const btnSyncCwa = document.getElementById("btn-sync-cwa");
    const syncIcon = btnSyncCwa ? btnSyncCwa.querySelector(".sync-icon") : null;
    const syncText = btnSyncCwa ? btnSyncCwa.querySelector(".sync-text") : null;
    const timestampEl = document.getElementById("data-timestamp");

    if (isRefresh && btnSyncCwa) {
        btnSyncCwa.disabled = true;
        if (syncIcon) syncIcon.classList.add("spinning");
        if (syncText) syncText.textContent = "連線 CWA API (F-C0032-001)...";
    }

    const endpoint = isRefresh ? "/api/refresh" : "/api/weather";

    return fetch(endpoint)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((result) => {
            cachedWeatherData = result.data || {};
            initForecastMarkers(cachedWeatherData);

            if (currentMode === "forecast") {
                if (!map.hasLayer(forecastMarkersLayer)) {
                    forecastMarkersLayer.addTo(map);
                }
                updateKpiForForecast(cachedWeatherData);
                renderSidebar();
                updateLayerControl();
            }

            if (timestampEl && currentMode === "forecast") {
                const timeStr = result.latest_fetched_at ? result.latest_fetched_at.replace("T", " ") : new Date().toLocaleTimeString();
                const srcStr = result.source === "cwa_live" ? "CWA API 即時連線" : "SQLite 快取";
                timestampEl.textContent = `資料來源：${srcStr} (${timeStr})`;
            }

            if (isRefresh) {
                showSyncToast(result.sync_message || "成功取得中央氣象署最新 36 小時預報！", result.sync_success !== false);
            }
        })
        .catch((err) => {
            console.error("載入預報資料失敗:", err);
            if (isRefresh) {
                showSyncToast("連線 CWA API 預報失敗，請確認網路或 API Key", false);
            }
        })
        .finally(() => {
            if (isRefresh && btnSyncCwa) {
                btnSyncCwa.disabled = false;
                if (syncIcon) syncIcon.classList.remove("spinning");
                if (syncText) syncText.textContent = "連線 CWA API 即時同步";
            }
        });
}

// ================= 雙模式切換核心邏輯 =================

function switchMode(newMode) {
    if (currentMode === newMode) return;
    currentMode = newMode;

    const btnModeObs = document.getElementById("btn-mode-obs");
    const btnModeForecast = document.getElementById("btn-mode-forecast");
    const searchInput = document.getElementById("search-input");
    const heatLegend = document.getElementById("heatmap-legend");

    map.closePopup();

    if (newMode === "obs") {
        // 切換至模式 A：即時觀測熱度圖
        if (btnModeObs) btnModeObs.classList.add("active");
        if (btnModeForecast) btnModeForecast.classList.remove("active");

        // 移除預報圖層
        if (map.hasLayer(forecastMarkersLayer)) {
            map.removeLayer(forecastMarkersLayer);
        }

        // 加入觀測圖層
        if (obsHeatLayer && !map.hasLayer(obsHeatLayer)) {
            obsHeatLayer.addTo(map);
        }
        if (!map.hasLayer(obsMarkersLayer)) {
            obsMarkersLayer.addTo(map);
        }

        // 顯示熱度圖圖例
        if (heatLegend) heatLegend.style.display = "block";

        if (searchInput) {
            searchInput.placeholder = "搜尋測站或行政區（如：玉山、板橋、淡水）...";
            searchInput.value = "";
        }

        if (cachedObservationsData && cachedObservationsData.length > 0) {
            updateKpiForObservations(cachedObservationsData);
            renderSidebar();
            updateLayerControl();
        } else {
            loadObservationsData(false);
        }
    } else {
        // 切換至模式 B：36h 縣市預報
        if (btnModeForecast) btnModeForecast.classList.add("active");
        if (btnModeObs) btnModeObs.classList.remove("active");

        // 移除觀測圖層
        if (obsHeatLayer && map.hasLayer(obsHeatLayer)) {
            map.removeLayer(obsHeatLayer);
        }
        if (map.hasLayer(obsMarkersLayer)) {
            map.removeLayer(obsMarkersLayer);
        }

        // 加入預報圖層
        if (!map.hasLayer(forecastMarkersLayer)) {
            forecastMarkersLayer.addTo(map);
        }

        // 隱藏熱度圖圖例
        if (heatLegend) heatLegend.style.display = "none";

        if (searchInput) {
            searchInput.placeholder = "搜尋縣市（如：臺中、高雄）...";
            searchInput.value = "";
        }

        if (cachedWeatherData) {
            updateKpiForForecast(cachedWeatherData);
            renderSidebar();
            updateLayerControl();
        } else {
            loadForecastData(false);
        }
    }
}

// ================= 儀表板入口初始化函式 =================

function initDashboard() {
    // 建立地圖浮動熱度圖圖例 (Heatmap Legend)
    const mapWrapper = document.querySelector(".map-wrapper");
    if (mapWrapper && !document.getElementById("heatmap-legend")) {
        const legendDiv = document.createElement("div");
        legendDiv.id = "heatmap-legend";
        legendDiv.className = "heatmap-legend";
        legendDiv.innerHTML = `
            <div class="heatmap-legend-title">🔥 實測溫度熱度圖 (CWA O-A0001-001)</div>
            <div class="heatmap-gradient-bar"></div>
            <div class="heatmap-labels">
                <span>≤ 10°C (低溫)</span>
                <span>18°C</span>
                <span>24°C</span>
                <span>≥ 32°C (高溫)</span>
            </div>
        `;
        mapWrapper.appendChild(legendDiv);
    }

    // 模式切換按鈕綁定
    const btnModeObs = document.getElementById("btn-mode-obs");
    const btnModeForecast = document.getElementById("btn-mode-forecast");

    if (btnModeObs) {
        btnModeObs.addEventListener("click", () => switchMode("obs"));
    }
    if (btnModeForecast) {
        btnModeForecast.addEventListener("click", () => switchMode("forecast"));
    }

    // 搜尋與控制項綁定
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear");
    const sortSelect = document.getElementById("sort-select");
    const btnResetView = document.getElementById("btn-reset-view");
    const btnSyncCwa = document.getElementById("btn-sync-cwa");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            if (searchClear) {
                searchClear.style.display = searchInput.value ? "block" : "none";
            }
            renderSidebar();
        });
    }

    if (searchClear) {
        searchClear.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            searchClear.style.display = "none";
            renderSidebar();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            renderSidebar();
        });
    }

    if (btnResetView) {
        btnResetView.addEventListener("click", () => {
            activeCountyName = null;
            activeStationId = null;
            document.querySelectorAll(".county-card").forEach((c) => c.classList.remove("active"));
            map.closePopup();
            if (geojsonLayer) geojsonLayer.resetStyle();
            map.flyTo(TAIWAN_CENTER, TAIWAN_DEFAULT_ZOOM, { duration: 0.8 });
        });
    }

    if (btnSyncCwa) {
        btnSyncCwa.addEventListener("click", () => {
            if (currentMode === "obs") {
                loadObservationsData(true);
            } else {
                loadForecastData(true);
            }
        });
    }

    // 載入台灣縣市邊界 GeoJSON (雙模式皆使用之空間參考邊界)
    fetch("/static/data/taiwan_counties.geojson")
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((geoData) => {
            geojsonLayer = L.geoJSON(geoData, {
                style: function () {
                    return {
                        color: "#2563eb",
                        weight: 1.5,
                        opacity: 0.75,
                        dashArray: "3",
                        fillColor: "#3b82f6",
                        fillOpacity: currentMode === "obs" ? 0.05 : 0.12
                    };
                },
                onEachFeature: function (feature, layer) {
                    const countyName = feature.properties.COUNTYNAME || feature.properties.name;
                    geojsonFeatureRefs[countyName] = layer;

                    layer.bindTooltip(countyName, {
                        sticky: true,
                        className: "county-hover-tooltip"
                    });

                    layer.on({
                        mouseover: function (e) {
                            if (activeCountyName !== countyName) {
                                const l = e.target;
                                l.setStyle({
                                    weight: 2.5,
                                    color: "#1d4ed8",
                                    dashArray: "",
                                    fillColor: "#2563eb",
                                    fillOpacity: 0.25
                                });
                                l.bringToFront();
                            }
                        },
                        mouseout: function (e) {
                            if (activeCountyName !== countyName) {
                                geojsonLayer.resetStyle(e.target);
                            }
                        },
                        click: function () {
                            if (currentMode === "forecast") {
                                focusCounty(countyName);
                            }
                        }
                    });
                }
            }).addTo(map);

            updateLayerControl();
        })
        .catch((err) => {
            console.error("載入 GeoJSON 失敗:", err);
        });

    // 預設啟動：先並行載入 Mode A (即時觀測) 與 Mode B (36h 預報)
    loadObservationsData(false);
    loadForecastData(false);
}

// 頁面載入完成後啟動
document.addEventListener("DOMContentLoaded", initDashboard);
