import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from flask import request
from app import app, fetch_weather_data, fetch_live_cwa_data

@app.route("/api/weather", methods=["GET"])
@app.route("/", methods=["GET"])
def weather_handler():
    if request.args.get("refresh") in ["1", "true", "yes"]:
        fetch_live_cwa_data()
    return fetch_weather_data()
