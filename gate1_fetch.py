import json
import os
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

DATASET_ID = "F-C0032-001"
API_URL = f"https://opendata.cwa.gov.tw/api/v1/rest/datastore/{DATASET_ID}"
RAW_DIR = Path("data/raw")


def require_api_key() -> str:
    load_dotenv()
    api_key = os.getenv("CWA_API_KEY", "").strip()

    if not api_key:
        raise RuntimeError(
            "找不到 CWA_API_KEY。請建立 .env，並設定 CWA_API_KEY=<你的中央氣象署授權碼>。"
        )

    return api_key


def fetch_raw_json(api_key: str) -> dict:
    # Gate 1 第一階段只取得真實 response。
    # 依 README 規則，在實際取得 response 前不預先假設 JSON schema。
    params = {
        "Authorization": api_key,
        "format": "JSON",
    }
    try:
        response = requests.get(
            API_URL,
            params=params,
            timeout=30,
        )
    except requests.exceptions.SSLError:
        import urllib3
        urllib3.disable_warnings()
        response = requests.get(
            API_URL,
            params=params,
            timeout=30,
            verify=False,
        )

    print(f"HTTP status: {response.status_code}")
    response.raise_for_status()

    data = response.json()
    return data


def save_raw_response(data: dict) -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = RAW_DIR / f"{DATASET_ID}_{timestamp}.json"

    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return output_path


def inspect_top_level(data: dict) -> None:
    print("\n=== Gate 1 / Raw JSON inspection ===")
    print(f"Python type: {type(data).__name__}")

    if isinstance(data, dict):
        print("Top-level keys:", list(data.keys()))
    else:
        print("Response is not a JSON object.")

    print(
        "\n下一步：依這份真實 response 確認 JSON schema，"
        "再實作 Location / Forecast Time / Weather / MinT / MaxT / PoP 解析。"
    )


def main() -> None:
    api_key = require_api_key()
    data = fetch_raw_json(api_key)
    output_path = save_raw_response(data)
    inspect_top_level(data)

    print(f"\nRaw response saved to: {output_path}")
    print("GATE 1 STATUS: IN PROGRESS (尚未完成欄位解析與驗證)")


if __name__ == "__main__":
    main()
