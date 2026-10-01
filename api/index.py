import sys
from pathlib import Path
from flask import request

# Add project root to sys.path so app.py and helper modules can be imported
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app, api_weather, api_refresh

@app.route("/api/weather")
@app.route("/weather")
def vercel_weather():
    return api_weather()

@app.route("/api/refresh", methods=["GET", "POST"])
@app.route("/refresh", methods=["GET", "POST"])
def vercel_refresh():
    return api_refresh()

@app.route("/api/index.py", defaults={"path": ""})
@app.route("/api/index.py/<path:path>")
@app.route("/api/index", defaults={"path": ""})
@app.route("/api/index/<path:path>")
@app.route("/api", defaults={"path": ""})
@app.route("/api/<path:path>")
def vercel_api_dispatch(path=""):
    action = request.args.get("action", "").lower()
    req_uri = (request.environ.get("REQUEST_URI", "") or request.environ.get("RAW_URI", "") or request.path).lower()

    if action == "refresh" or "refresh" in req_uri or "refresh" in path.lower():
        return api_refresh()

    # Default API response is always the weather dataset JSON
    return api_weather()
