// Gate 3G — Interactive Dashboard
// 完整整合 SQLite 氣象資料、全台 GeoJSON、即時指標列、搜尋篩選與雙向連動導覽

// 1. 初始化地圖
const TAIWAN_CENTER = [23.7, 121.0];
const TAIWAN_DEFAULT_ZOOM = 7;

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
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
).addTo(map);

// 圖層群組
const markersLayer = L.layerGroup().addTo(map);
let geojsonLayer = null;

// 儲存參照以供雙向連動
const markerRefs = {};
const geojsonFeatureRefs = {};
let activeCountyName = null;

// 台灣 22 縣市中心座標
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

let globalWeatherMap = {};

// 天氣圖示對照輔助函式
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

// 建立氣象 Popup 卡片 HTML
function buildPopupContent(locName, forecasts) {
    if (!forecasts || forecasts.length === 0) {
        return `
        <div class="weather-popup">
            <div class="popup-header">
                <h3>${locName}</h3>
            </div>
            <div class="weather-desc">查無此縣市之資料庫預報紀錄</div>
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
            <span>來源：SQLite weather.db (${current.fetched_at})</span>
        </div>
    </div>
    `;
}

// 計算並呈現頂部 KPI 指標
function updateKpiMetrics(weatherMap) {
    let maxTemp = -999, maxTempLoc = "";
    let minTemp = 999, minTempLoc = "";
    let maxPop = -1, maxPopLoc = "";
    let lastFetched = "";

    Object.keys(weatherMap).forEach((loc) => {
        const list = weatherMap[loc];
        if (list && list.length > 0) {
            const first = list[0];
            if (first.fetched_at) lastFetched = first.fetched_at;

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

    const maxTempEl = document.getElementById("kpi-max-temp");
    const maxLocEl = document.getElementById("kpi-max-loc");
    if (maxTempEl && maxLocEl) {
        maxTempEl.textContent = `${maxTemp}°C`;
        maxLocEl.textContent = `${maxTempLoc} (最高溫)`;
    }

    const minTempEl = document.getElementById("kpi-min-temp");
    const minLocEl = document.getElementById("kpi-min-loc");
    if (minTempEl && minLocEl) {
        minTempEl.textContent = `${minTemp}°C`;
        minLocEl.textContent = `${minTempLoc} (最低溫)`;
    }

    const popEl = document.getElementById("kpi-max-pop");
    const popLocEl = document.getElementById("kpi-pop-loc");
    if (popEl && popLocEl) {
        popEl.textContent = `${maxPop}%`;
        popLocEl.textContent = `${maxPopLoc} (降雨機率最高)`;
    }

    const timeEl = document.getElementById("data-timestamp");
    if (timeEl && lastFetched) {
        timeEl.textContent = `SQLite 資料庫時間：${lastFetched.replace("T", " ")}`;
    }
}

// 聚焦指定縣市（雙向連動：地圖 flyTo + 開啟 Popup + 高亮側邊欄）
function focusCounty(countyName) {
    const loc = taiwanLocations.find((l) => l.name === countyName);
    if (!loc) return;

    activeCountyName = countyName;

    // 更新側邊欄 active 卡片
    document.querySelectorAll(".county-card").forEach((card) => {
        if (card.dataset.name === countyName) {
            card.classList.add("active");
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
            card.classList.remove("active");
        }
    });

    // 平滑移動地圖視野
    map.flyTo([loc.lat, loc.lng], 9, {
        duration: 1.0
    });

    // 開啟 Marker Popup
    const marker = markerRefs[countyName];
    if (marker) {
        setTimeout(() => {
            marker.openPopup();
        }, 300);
    }

    // 高亮 GeoJSON 多邊形
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

// 渲染側邊欄縣市卡片清單
function renderCountyList() {
    const searchInput = document.getElementById("search-input");
    const sortSelect = document.getElementById("sort-select");
    const countyListEl = document.getElementById("county-list");
    if (!countyListEl) return;

    const query = (searchInput?.value || "").trim().toLowerCase();
    const sortMode = sortSelect?.value || "default";

    // 過濾
    let filtered = taiwanLocations.filter((loc) => {
        return loc.name.toLowerCase().includes(query);
    });

    // 排序
    if (sortMode === "temp-desc") {
        filtered.sort((a, b) => {
            const tempA = globalWeatherMap[a.name]?.[0]?.max_temp ?? -999;
            const tempB = globalWeatherMap[b.name]?.[0]?.max_temp ?? -999;
            return tempB - tempA;
        });
    } else if (sortMode === "temp-asc") {
        filtered.sort((a, b) => {
            const tempA = globalWeatherMap[a.name]?.[0]?.min_temp ?? 999;
            const tempB = globalWeatherMap[b.name]?.[0]?.min_temp ?? 999;
            return tempA - tempB;
        });
    } else if (sortMode === "pop-desc") {
        filtered.sort((a, b) => {
            const popA = globalWeatherMap[a.name]?.[0]?.pop ?? -1;
            const popB = globalWeatherMap[b.name]?.[0]?.pop ?? -1;
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
        const forecasts = globalWeatherMap[loc.name] || [];
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

    // 綁定點擊事件
    document.querySelectorAll(".county-card").forEach((card) => {
        card.addEventListener("click", () => {
            const countyName = card.dataset.name;
            focusCounty(countyName);
        });
    });
}

// 建立氣象站點 Markers
function initWeatherMarkers(weatherMap) {
    markersLayer.clearLayers();

    taiwanLocations.forEach((loc) => {
        const forecasts = weatherMap[loc.name] || [];
        const marker = L.marker([loc.lat, loc.lng], { title: loc.name }).addTo(markersLayer);
        markerRefs[loc.name] = marker;

        const popupHtml = buildPopupContent(loc.name, forecasts);
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

// 初始化儀表板資料與事件
function initDashboard() {
    // 綁定搜尋框
    const searchInput = document.getElementById("search-input");
    const searchClear = document.getElementById("search-clear");
    const sortSelect = document.getElementById("sort-select");
    const btnResetView = document.getElementById("btn-reset-view");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            if (searchClear) {
                searchClear.style.display = searchInput.value ? "block" : "none";
            }
            renderCountyList();
        });
    }

    if (searchClear) {
        searchClear.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            searchClear.style.display = "none";
            renderCountyList();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            renderCountyList();
        });
    }

    if (btnResetView) {
        btnResetView.addEventListener("click", () => {
            activeCountyName = null;
            document.querySelectorAll(".county-card").forEach((c) => c.classList.remove("active"));
            map.closePopup();
            if (geojsonLayer) geojsonLayer.resetStyle();
            map.flyTo(TAIWAN_CENTER, TAIWAN_DEFAULT_ZOOM, { duration: 0.8 });
        });
    }

    // 1. 取得 SQLite 氣象資料
    fetch("/api/weather")
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((result) => {
            globalWeatherMap = result.data || {};
            updateKpiMetrics(globalWeatherMap);
            initWeatherMarkers(globalWeatherMap);
            renderCountyList();
        })
        .catch((err) => {
            console.error("載入氣象資料失敗:", err);
            const countyListEl = document.getElementById("county-list");
            if (countyListEl) {
                countyListEl.innerHTML = `<div class="empty-state"><p style="color:red;">資料庫連線失敗，請確認後端運行狀態</p></div>`;
            }
        });

    // 2. 取得台灣縣市邊界 GeoJSON
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
                        opacity: 0.8,
                        dashArray: "3",
                        fillColor: "#3b82f6",
                        fillOpacity: 0.12
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
                                    fillOpacity: 0.28
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
                            focusCounty(countyName);
                        }
                    });
                }
            }).addTo(map);

            // 右上角圖層控制面板
            L.control.layers(
                { "OpenStreetMap": osmLayer },
                {
                    "🗺️ 行政區界 (Taiwan GeoJSON)": geojsonLayer,
                    "📍 氣象站點 (Weather Markers)": markersLayer
                },
                { collapsed: false, position: "topright" }
            ).addTo(map);
        })
        .catch((err) => {
            console.error("載入 GeoJSON 失敗:", err);
        });
}

// 頁面載入後啟動儀表板
document.addEventListener("DOMContentLoaded", initDashboard);
