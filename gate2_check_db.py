import sqlite3
from pathlib import Path


DB_PATH = Path("data/weather.db")


def check_database():
    if not DB_PATH.exists():
        print(f"Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)

    try:
        cursor = conn.cursor()

        print("=== Tables ===")

        cursor.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
        """)

        tables = cursor.fetchall()

        for table in tables:
            print(f"- {table[0]}")

        print("\n=== weather_forecast schema ===")

        cursor.execute("""
            PRAGMA table_info(weather_forecast)
        """)

        columns = cursor.fetchall()

        for column in columns:
            cid, name, data_type, not_null, default_value, pk = column

            print(
                f"{name:12} "
                f"type={data_type:8} "
                f"not_null={not_null} "
                f"primary_key={pk}"
            )

        print("\n=== Row count ===")

        cursor.execute("""
            SELECT COUNT(*)
            FROM weather_forecast
        """)

        row_count = cursor.fetchone()[0]

        print(f"weather_forecast rows: {row_count}")

    finally:
        conn.close()


if __name__ == "__main__":
    check_database()
