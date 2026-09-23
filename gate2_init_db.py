import sqlite3
from pathlib import Path


DB_PATH = Path("data/weather.db")


def init_database():
    # 確保 data/ 目錄存在
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)

    try:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS weather_forecast (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                location TEXT NOT NULL,

                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,

                weather TEXT NOT NULL,

                pop INTEGER,

                min_temp INTEGER NOT NULL,
                max_temp INTEGER NOT NULL,

                fetched_at TEXT NOT NULL,

                UNIQUE(location, start_time, end_time)
            )
        """)

        conn.commit()

        print(f"Database created: {DB_PATH}")
        print("Table created: weather_forecast")
        print("Gate 2A = PASS")

    finally:
        conn.close()


if __name__ == "__main__":
    init_database()
