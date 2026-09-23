import argparse
import json
from pathlib import Path

REQUIRED_ELEMENTS = {"Wx", "PoP", "MinT", "MaxT"}


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
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

    # 以 Wx 的 time[] 作為預報時段基準，
    # 再用 startTime / endTime 到其他元素尋找同一時段的資料。
    rows = []

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


def validate_and_parse(data: dict) -> list[dict]:
    print("=== Gate 1 Validation ===")

    if data.get("success") != "true":
        raise ValueError(
            f"CWA response success != true: {data.get('success')!r}"
        )

    print("[PASS] CWA response success = true")

    resource_id = data.get("result", {}).get("resource_id")
    if resource_id != "F-C0032-001":
        raise ValueError(
            f"Unexpected resource_id: {resource_id!r}"
        )

    print(f"[PASS] Dataset = {resource_id}")

    records = data.get("records")
    if not isinstance(records, dict):
        raise ValueError("records 不存在或格式錯誤")

    locations = records.get("location")
    if not isinstance(locations, list) or not locations:
        raise ValueError("records.location 不存在或沒有資料")

    print(f"[PASS] Location count = {len(locations)}")

    parsed_rows = []

    for location in locations:
        location_name = location.get("locationName")
        if not location_name:
            raise ValueError("發現缺少 locationName 的資料")

        rows = parse_location(location)
        parsed_rows.extend(rows)

        print(
            f"[PASS] {location_name}: "
            f"Wx / PoP / MinT / MaxT, {len(rows)} forecast periods"
        )

    if not parsed_rows:
        raise ValueError("沒有成功解析任何 forecast row")

    print()
    print("=== Sample Parsed Record ===")
    sample = parsed_rows[0]

    print(f"Location      : {sample['location']}")
    print(f"Forecast Time : {sample['start_time']} ~ {sample['end_time']}")
    print(f"Weather       : {sample['weather']}")
    print(f"PoP           : {sample['pop']} %")
    print(f"MinT          : {sample['min_temp']} C")
    print(f"MaxT          : {sample['max_temp']} C")

    print()
    print(f"Total parsed forecast rows: {len(parsed_rows)}")
    print()
    print("GATE 1 = PASS")

    return parsed_rows


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate and parse CWA F-C0032-001 raw JSON."
    )

    parser.add_argument(
        "json_file",
        type=Path,
        help="Path to the raw CWA JSON file",
    )

    args = parser.parse_args()

    data = load_json(args.json_file)
    validate_and_parse(data)


if __name__ == "__main__":
    main()
