import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path


DB_PATH = Path("data/weather.db")
REQUIRED_ELEMENTS = {"Wx", "PoP", "MinT", "MaxT"}


def load_json(json_path: Path) -> dict:
    with json_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def parse_location(location: dict) -> list[dict]:
    location_name = location["locationName"]

    elements = {
        element["elementName"]: element
        for element in location["weatherElement"]
    }

    missing = REQUIRED_ELEMENTS - set(elements)
    if missing:
        raise ValueError(
            f"{location_name} 缺少必要 weatherElement: {sorted(missing)}"
        )

    rows = []

    # 以 Wx 的預報時段為基準，再用 startTime / endTime
    # 對應 PoP、MinT、MaxT 的同一時段。
    for wx_time in elements["Wx"]["time"]:
        start_time = wx_time["startTime"]
        end_time = wx_time["endTime"]

        row = {
            "location": location_name,
            "start_time": start_time,
            "end_time": end_time,
            "weather": wx_time["parameter"]["parameterName"],
        }

        for element_name, output_name in [
            ("PoP", "pop"),
            ("MinT", "min_temp"),
            ("MaxT", "max_temp"),
        ]:
            matched = next(
                (
                    item
                    for item in elements[element_name]["time"]
                    if item["startTime"] == start_time
                    and item["endTime"] == end_time
                ),
                None,
            )

            if matched is None:
                raise ValueError(
                    f"{location_name} {start_time} ~ {end_time} "
                    f"找不到 {element_name} 對應時段"
                )

            row[output_name] = matched["parameter"]["parameterName"]

        rows.append(row)

    return rows


def extract_and_transform(data: dict) -> list[dict]:
    if data.get("success") != "true":
        raise ValueError(
            f"CWA response success != true: {data.get('success')!r}"
        )

    resource_id = data.get("result", {}).get("resource_id")
    if resource_id != "F-C0032-001":
        raise ValueError(
            f"Unexpected resource_id: {resource_id!r}"
        )

    locations = data.get("records", {}).get("location")
    if not isinstance(locations, list) or not locations:
        raise ValueError("records.location 不存在或沒有資料")

    fetched_at = datetime.now().isoformat(timespec="seconds")

    transformed_rows = []

    for location in locations:
        rows = parse_location(location)

        for row in rows:
            transformed_rows.append({
                "location": row["location"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "weather": row["weather"],
                "pop": int(row["pop"]),
                "min_temp": int(row["min_temp"]),
                "max_temp": int(row["max_temp"]),
                "fetched_at": fetched_at,
            })

    return transformed_rows


def ensure_database(conn: sqlite3.Connection) -> None:
    conn.execute("""
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


def load_to_sqlite(rows: list[dict]) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)

    try:
        ensure_database(conn)

        sql = """
            INSERT INTO weather_forecast (
                location,
                start_time,
                end_time,
                weather,
                pop,
                min_temp,
                max_temp,
                fetched_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)

            ON CONFLICT(location, start_time, end_time)
            DO UPDATE SET
                weather = excluded.weather,
                pop = excluded.pop,
                min_temp = excluded.min_temp,
                max_temp = excluded.max_temp,
                fetched_at = excluded.fetched_at
        """

        for row in rows:
            conn.execute(
                sql,
                (
                    row["location"],
                    row["start_time"],
                    row["end_time"],
                    row["weather"],
                    row["pop"],
                    row["min_temp"],
                    row["max_temp"],
                    row["fetched_at"],
                ),
            )

        conn.commit()

    finally:
        conn.close()


def verify_database() -> None:
    conn = sqlite3.connect(DB_PATH)

    try:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*)
            FROM weather_forecast
        """)

        total_rows = cursor.fetchone()[0]

        print()
        print("=== Database Verification ===")
        print(f"Database: {DB_PATH}")
        print(f"Database rows: {total_rows}")

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

        taichung_rows = cursor.fetchall()

        print()
        print("=== Sample SQL SELECT: 臺中市 ===")

        for row in taichung_rows:
            print(
                f"{row[0]} | "
                f"{row[1]} ~ {row[2]} | "
                f"{row[3]} | "
                f"PoP={row[4]}% | "
                f"MinT={row[5]}C | "
                f"MaxT={row[6]}C | "
                f"fetched_at={row[7]}"
            )

    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gate 2 ETL: CWA JSON -> SQLite"
    )

    parser.add_argument(
        "json_file",
        type=Path,
        help="Gate 1 產生的 raw CWA JSON 檔案"
    )

    args = parser.parse_args()

    if not args.json_file.exists():
        raise FileNotFoundError(
            f"找不到 JSON 檔案: {args.json_file}"
        )

    print("=== Gate 2 ETL ===")
    print(f"Input JSON: {args.json_file}")

    data = load_json(args.json_file)

    rows = extract_and_transform(data)

    print(f"Extracted / transformed rows: {len(rows)}")

    load_to_sqlite(rows)

    print(f"Loaded rows: {len(rows)}")

    verify_database()

    print()
    print("Gate 2 ETL = PASS")


if __name__ == "__main__":
    main()
