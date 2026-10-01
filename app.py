import os
import sqlite3
import tempfile
from pathlib import Path
from flask import Flask, jsonify, render_template, send_from_directory

BASE_DIR = Path(__file__).resolve().parent

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
    static_url_path="/static"
)


def get_db_path() -> Path:
    # Vercel 或 Serverless 唯讀環境下使用 /tmp 目錄
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return Path(tempfile.gettempdir()) / "weather.db"
    return BASE_DIR / "data" / "weather.db"


def ensure_db():
    db_path = get_db_path()
    if not db_path.exists():
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
            ORDER BY location, start_time
        """)
        rows = cursor.fetchall()

        data = {}
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

        return jsonify({
            "status": "success",
            "source": "sqlite",
            "location_count": len(data),
            "total_records": len(rows),
            "data": data
        })
    finally:
        conn.close()


@app.route("/api/weather")
def api_weather():
    return fetch_weather_data()


# 涵蓋所有 Vercel 路由或前綴變異（相容直接訪問、rewrites、/api/index 等）
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    # 若請求為 API
    if path == "api/weather" or path.endswith("/api/weather"):
        return fetch_weather_data()

    # 若請求為靜態檔案
    if path.startswith("static/"):
        filename = path[len("static/"):]
        return send_from_directory(str(BASE_DIR / "static"), filename)

    # 預設回傳前端儀表板 HTML
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
