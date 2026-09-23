import sqlite3
from pathlib import Path


DB_PATH = Path("data/weather.db")


def verify():
    conn = sqlite3.connect(DB_PATH)

    try:
        cursor = conn.cursor()

        print("=== Gate 2 SQL Verification ===")

        # 1. 總筆數
        cursor.execute("""
            SELECT COUNT(*)
            FROM weather_forecast
        """)

        total = cursor.fetchone()[0]
        print(f"Total rows: {total}")

        # 2. 縣市數
        cursor.execute("""
            SELECT COUNT(DISTINCT location)
            FROM weather_forecast
        """)

        location_count = cursor.fetchone()[0]
        print(f"Location count: {location_count}")

        # 3. 查詢臺中市真實資料
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
            WHERE location = '臺中市'
            ORDER BY start_time
        """)

        rows = cursor.fetchall()

        print("\n=== 臺中市 Forecast ===")

        for row in rows:
            print(
                f"{row[0]} | "
                f"{row[1]} ~ {row[2]} | "
                f"{row[3]} | "
                f"PoP={row[4]}% | "
                f"MinT={row[5]}C | "
                f"MaxT={row[6]}C | "
                f"Fetched={row[7]}"
            )

        # 4. 檢查重複資料
        cursor.execute("""
            SELECT
                location,
                start_time,
                end_time,
                COUNT(*) AS count
            FROM weather_forecast
            GROUP BY
                location,
                start_time,
                end_time
            HAVING COUNT(*) > 1
        """)

        duplicates = cursor.fetchall()

        print("\n=== Duplicate Check ===")

        if duplicates:
            print("FAIL: 發現重複資料")
            for row in duplicates:
                print(row)
        else:
            print("PASS: 無重複資料")

        # 5. 最後判定
        if total == 66 and location_count == 22 and not duplicates:
            print("\nGATE 2 = PASS")
        else:
            print("\nGATE 2 = FAIL")

    finally:
        conn.close()


if __name__ == "__main__":
    verify()
