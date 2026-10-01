import sqlite3
from pathlib import Path
from flask import Flask, jsonify, render_template

app = Flask(__name__)
DB_PATH = Path("data/weather.db")


def ensure_db():
    if not DB_PATH.exists():
        raw_json = Path("data/raw/F-C0032-001_20260923_110644.json")
        if raw_json.exists():
            from gate2_etl import load_json, extract_and_transform, load_to_sqlite
            data = load_json(raw_json)
            rows = extract_and_transform(data)
            load_to_sqlite(rows)


def get_db_connection():
    ensure_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/weather")
def get_weather():
    ensure_db()
    if not DB_PATH.exists():
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

        # 依縣市組織預報資料（每個縣市包含 3 個時段）
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


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)

