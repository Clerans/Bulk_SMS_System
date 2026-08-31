import sys
import os

# Ensure root and backend directory paths are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(parent_dir, "backend")

for path in [parent_dir, backend_dir, current_dir]:
    if os.path.exists(path) and path not in sys.path:
        sys.path.insert(0, path)

try:
    from app.main import app
except Exception:
    from backend.app.main import app  # type: ignore
