import json
import os
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# Add project root to sys.path so app.py and helper modules can be imported
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app, fetch_weather_data, fetch_live_cwa_data, api_weather, api_refresh


class handler(BaseHTTPRequestHandler):
    """Vercel Serverless Function native HTTP Handler"""

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)

        is_refresh = (
            "refresh" in parsed.path.lower()
            or query.get("action", [""])[0].lower() == "refresh"
            or query.get("refresh", [""])[0].lower() in ["1", "true", "yes"]
        )

        try:
            with app.app_context():
                if is_refresh:
                    success, msg = fetch_live_cwa_data()
                    resp = fetch_weather_data()
                    result = resp.get_json() if hasattr(resp, "get_json") else resp[0].get_json()
                    result["sync_success"] = success
                    result["sync_message"] = msg
                    result["source"] = "cwa_live" if success else "sqlite_cache"
                else:
                    resp = fetch_weather_data()
                    result = resp.get_json() if hasattr(resp, "get_json") else resp[0].get_json()

            status_code = 200
        except Exception as e:
            result = {
                "status": "error",
                "message": f"Serverless Function execution error: {str(e)}"
            }
            status_code = 500

        response_body = json.dumps(result, ensure_ascii=False).encode("utf-8")

        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Content-Length", str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def do_POST(self):
        return self.do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()


# Compatibility for WSGI-based Vercel adapters
app = app
