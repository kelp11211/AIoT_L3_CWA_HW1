import json
import sqlite3
from datetime import datetime
from pathlib import Path

OBS_DATASET_ID = "O-A0001-001"
OBS_API_URL = f"https://opendata.cwa.gov.tw/api/v1/rest/datastore/{OBS_DATASET_ID}"


def extract_and_transform_observations(data: dict) -> list[dict]:
    """清洗並轉換中央氣象署 O-A0001-001 自動氣象站 800+ 測站即時觀測資料"""
    if data.get("success") != "true":
        raise ValueError(f"CWA response success != true: {data.get('success')!r}")

    stations = data.get("records", {}).get("Station", [])
    if not isinstance(stations, list) or not stations:
        raise ValueError("records.Station 不存在或沒有測站資料")

    fetched_at = datetime.now().isoformat(timespec="seconds")
    transformed = []

    for s in stations:
        station_id = s.get("StationId")
        station_name = s.get("StationName")
        if not station_id or not station_name:
            continue

        geo = s.get("GeoInfo", {})
        coords = geo.get("Coordinates", [])
        wgs84 = next((c for c in coords if c.get("CoordinateName") == "WGS84"), None)
        if not wgs84 and coords:
            wgs84 = coords[0]

        if not wgs84:
            continue

        try:
            lat = float(wgs84.get("StationLatitude"))
            lon = float(wgs84.get("StationLongitude"))
            # 台灣經緯度合理範圍
            if not (20.0 <= lat <= 27.5 and 117.0 <= lon <= 123.5):
                continue
        except (ValueError, TypeError):
            continue

        # 海拔
        alt_str = geo.get("StationAltitude")
        try:
            altitude = float(alt_str) if alt_str not in [None, "", "-99", "-999"] else None
        except (ValueError, TypeError):
            altitude = None

        we = s.get("WeatherElement", {})

        # 即時氣溫
        temp_str = we.get("AirTemperature", "-99")
        try:
            temp = float(temp_str)
            if temp < -50 or temp > 60:
                continue
        except (ValueError, TypeError):
            continue

        # 相對濕度
        humid_str = we.get("RelativeHumidity")
        try:
            humidity = float(humid_str) if humid_str not in [None, "", "-99", "-999"] else None
        except (ValueError, TypeError):
            humidity = None

        # 風速
        wind_str = we.get("WindSpeed")
        try:
            wind_speed = float(wind_str) if wind_str not in [None, "", "-99", "-999"] else None
        except (ValueError, TypeError):
            wind_speed = None

        # 風向
        wind_dir_str = we.get("WindDirection")
        try:
            wind_dir = float(wind_dir_str) if wind_dir_str not in [None, "", "-99", "-999"] else None
        except (ValueError, TypeError):
            wind_dir = None

        # 過去 1 小時累積雨量
        rain_str = we.get("Now", {}).get("Precipitation") if isinstance(we.get("Now"), dict) else None
        try:
            rain = float(rain_str) if rain_str not in [None, "", "-99", "-999"] else None
        except (ValueError, TypeError):
            rain = None

        # 觀測時間
        obs_time = s.get("ObsTime", {}).get("DateTime", fetched_at)

        transformed.append({
            "station_id": station_id,
            "station_name": station_name,
            "county": geo.get("CountyName") or "",
            "town": geo.get("TownName") or "",
            "lat": lat,
            "lon": lon,
            "altitude": altitude,
            "temperature": temp,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "wind_dir": wind_dir,
            "rainfall_1h": rain,
            "observed_at": obs_time,
            "fetched_at": fetched_at,
        })

    return transformed


def ensure_obs_database(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS station_observations (
            station_id TEXT PRIMARY KEY,
            station_name TEXT NOT NULL,
            county TEXT,
            town TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            altitude REAL,
            temperature REAL NOT NULL,
            humidity REAL,
            wind_speed REAL,
            wind_dir REAL,
            rainfall_1h REAL,
            observed_at TEXT NOT NULL,
            fetched_at TEXT NOT NULL
        )
    """)
    conn.commit()


def load_observations_to_sqlite(rows: list[dict], db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        ensure_obs_database(conn)
        sql = """
            INSERT INTO station_observations (
                station_id,
                station_name,
                county,
                town,
                lat,
                lon,
                altitude,
                temperature,
                humidity,
                wind_speed,
                wind_dir,
                rainfall_1h,
                observed_at,
                fetched_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(station_id)
            DO UPDATE SET
                station_name = excluded.station_name,
                county = excluded.county,
                town = excluded.town,
                lat = excluded.lat,
                lon = excluded.lon,
                altitude = excluded.altitude,
                temperature = excluded.temperature,
                humidity = excluded.humidity,
                wind_speed = excluded.wind_speed,
                wind_dir = excluded.wind_dir,
                rainfall_1h = excluded.rainfall_1h,
                observed_at = excluded.observed_at,
                fetched_at = excluded.fetched_at
        """
        for r in rows:
            conn.execute(sql, (
                r["station_id"],
                r["station_name"],
                r["county"],
                r["town"],
                r["lat"],
                r["lon"],
                r["altitude"],
                r["temperature"],
                r["humidity"],
                r["wind_speed"],
                r["wind_dir"],
                r["rainfall_1h"],
                r["observed_at"],
                r["fetched_at"],
            ))
        conn.commit()
    finally:
        conn.close()
