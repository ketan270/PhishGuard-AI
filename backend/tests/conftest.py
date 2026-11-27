import os
import sys
import tempfile
from pathlib import Path

# Isolated database file for tests (never touches data/local_db.json)
os.environ["PHISHGUARD_DB_FILE"] = str(Path(tempfile.mkdtemp()) / "test_db.json")
os.environ.pop("MONGO_URI", None)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
