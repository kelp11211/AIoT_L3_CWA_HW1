import json
import os
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory
import requests

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent

# 載入 .env 環境變數
load_dotenv(BASE_DIR / ".env")

from flask_cors import CORS

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
    static_url_path="/static"
)
CORS(app)

CWA_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001"


def get_db_path() -> Path:
    # Vercel 或 Serverless 唯讀環境下使用 /tmp 目錄
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return Path(tempfile.gettempdir()) / "weather.db"
    return BASE_DIR / "data" / "weather.db"


def fetch_live_cwa_data() -> tuple[bool, str]:
    """使用 requests 呼叫中央氣象署 CWA API 取得即時 36 小時天氣預報，並更新寫入 SQLite"""
    # 確保讀取最新 .env
    load_dotenv(BASE_DIR / ".env", override=True)
    api_key = os.getenv("CWA_API_KEY", "").strip()

    if not api_key or api_key == "YOUR_CWA_API_KEY":
        return False, "未設定有效的 CWA_API_KEY，請在 .env 中填寫中央氣象署授權碼"

    params = {
        "Authorization": api_key,
        "format": "JSON",
    }

    try:
        try:
            resp = requests.get(CWA_API_URL, params=params, timeout=30)
        except requests.exceptions.SSLError:
            import urllib3
            urllib3.disable_warnings()
            resp = requests.get(CWA_API_URL, params=params, timeout=30, verify=False)

        resp.raise_for_status()
        data = resp.json()

        # 儲存一份即時 raw response 供稽核與紀錄
        try:
            raw_dir = BASE_DIR / "data" / "raw"
            raw_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            (raw_dir / f"F-C0032-001_{timestamp}.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception:
            pass

        # 透過 Gate 2 ETL 模組進行資料清洗並寫入 SQLite
        import gate2_etl
        gate2_etl.DB_PATH = get_db_path()
        rows = gate2_etl.extract_and_transform(data)
        gate2_etl.load_to_sqlite(rows)

        return True, f"成功連線 CWA API 取得 {len(rows)} 筆即時預報資料"
    except requests.exceptions.RequestException as e:
        return False, f"CWA API 網路連線錯誤: {str(e)}"
    except Exception as e:
        return False, f"氣象資料解析或寫入失敗: {str(e)}"


def ensure_db():
    db_path = get_db_path()
    if not db_path.exists():
        # 若資料庫不存在，優先呼叫 CWA API 即時撈取
        success, msg = fetch_live_cwa_data()
        if not success:
            # 若 API 呼叫不成功，回退使用本地 raw 備份檔案
            raw_json = BASE_DIR / "data" / "raw" / "F-C0032-001_20260923_110644.json"
            if raw_json.exists():
                import gate2_etl
                gate2_etl.DB_PATH = db_path
                data = gate2_etl.load_json(raw_json)
                rows = gate2_etl.extract_and_transform(data)
                gate2_etl.load_to_sqlite(rows)


def get_db_connection():
    ensure_db()
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_weather_data():
    ensure_db()
    db_path = get_db_path()
    if not db_path.exists():
        return jsonify({"status": "error", "message": "Database not found"}), 404

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                location,
                start_time,
                end_time,
                weather,
                pop,
                min_temp,
                max_temp,
                fetched_at
            FROM weather_forecast
            WHERE fetched_at = (SELECT MAX(fetched_at) FROM weather_forecast)
            ORDER BY location, start_time
        """)
        rows = cursor.fetchall()

        data = {}
        latest_fetched_at = None
        for r in rows:
            loc = r["location"]
            if loc not in data:
                data[loc] = []
            data[loc].append({
                "start_time": r["start_time"],
                "end_time": r["end_time"],
                "weather": r["weather"],
                "pop": r["pop"],
                "min_temp": r["min_temp"],
                "max_temp": r["max_temp"],
                "fetched_at": r["fetched_at"]
            })
            if not latest_fetched_at or r["fetched_at"] > latest_fetched_at:
                latest_fetched_at = r["fetched_at"]

        return jsonify({
            "status": "success",
            "source": "sqlite",
            "latest_fetched_at": latest_fetched_at,
            "location_count": len(data),
            "total_records": len(rows),
            "data": data
        })
    finally:
        conn.close()


@app.route("/api/weather")
def api_weather():
    # 支援 ?refresh=1 或 ?refresh=true 強制即時向 CWA API 更新
    if request.args.get("refresh") in ["1", "true", "yes"]:
        fetch_live_cwa_data()
    return fetch_weather_data()


@app.route("/api/refresh", methods=["GET", "POST"])
def api_refresh():
    """主動觸發 requests 連線 CWA API 取得即時資料並更新資料庫"""
    success, message = fetch_live_cwa_data()
    resp = fetch_weather_data()
    result = resp.get_json() if hasattr(resp, "get_json") else resp[0].get_json()
    result["sync_success"] = success
    result["sync_message"] = message
    result["source"] = "cwa_live" if success else "sqlite_cache"
    return jsonify(result)


# 涵蓋所有 Vercel 路由或前綴變異（相容直接訪問、rewrites、/api/index 等）
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    # 若請求為 API
    if path == "api/weather" or path.endswith("/api/weather"):
        return api_weather()

    if path == "api/refresh" or path.endswith("/api/refresh"):
        return api_refresh()

    # 若請求為靜態檔案
    if path.startswith("static/"):
        filename = path[len("static/"):]
        return send_from_directory(str(BASE_DIR / "static"), filename)

    # 預設回傳前端儀表板 HTML
    return render_template("index.html")


if __name__ == "__main__":
    # 本地啟動時自動同步一次最新 CWA 即時氣象
    print("Connecting to CWA API to fetch real-time weather...")
    ok, status_msg = fetch_live_cwa_data()
    print(f"CWA API Sync Status: {status_msg}")
    app.run(debug=True, use_reloader=False)
