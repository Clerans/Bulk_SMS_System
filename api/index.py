import sys
import os

# Add backend directory to sys.path for runtime execution
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")

if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from backend.app.main import app
except ImportError:
    from app.main import app  # type: ignore

