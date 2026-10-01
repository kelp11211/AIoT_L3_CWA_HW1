import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app import app, api_refresh

@app.route("/api/refresh", methods=["GET", "POST"])
@app.route("/", methods=["GET", "POST"])
def refresh_handler():
    return api_refresh()
