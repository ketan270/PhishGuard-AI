"""
Database layer (Synopsis Section 2.2 - Database Layer).

* If the MONGO_URI environment variable is set (e.g. a local MongoDB or a
  MongoDB Atlas connection string) the app uses real MongoDB via PyMongo.
* Otherwise it falls back to an embedded, Mongo-compatible store (mongomock)
  that is persisted to data/local_db.json, so the project runs out-of-the-box
  for demos without installing MongoDB and keeps data across restarts.
"""
from __future__ import annotations

import logging
import os
import threading
from pathlib import Path

from bson import json_util

log = logging.getLogger("phishguard.db")
DB_NAME = os.getenv("MONGO_DB", "phishguard")
LOCAL_FILE = Path(os.getenv("PHISHGUARD_DB_FILE") or Path(__file__).resolve().parent / "data" / "local_db.json")


class _PersistentCollection:
    """Thin proxy around a mongomock collection that snapshots to disk after writes."""

    WRITE_METHODS = {"insert_one", "insert_many", "update_one", "update_many", "replace_one",
                     "delete_one", "delete_many", "find_one_and_update", "find_one_and_delete"}

    def __init__(self, coll, store: "_LocalStore"):
        self._coll = coll
        self._store = store

    def __getattr__(self, item):
        attr = getattr(self._coll, item)
        if item in self.WRITE_METHODS:
            def wrapper(*a, **kw):
                res = attr(*a, **kw)
                self._store.save()
                return res
            return wrapper
        return attr


class _LocalStore:
    def __init__(self):
        import mongomock
        self.client = mongomock.MongoClient()
        self.db = self.client[DB_NAME]
        self._lock = threading.Lock()
        self.load()

    def load(self):
        if not LOCAL_FILE.exists():
            return
        try:
            data = json_util.loads(LOCAL_FILE.read_text())
            for name, docs in data.items():
                if docs:
                    self.db[name].insert_many(docs)
            log.info("Loaded local database from %s", LOCAL_FILE)
        except Exception as e:  # corrupt file should not crash the app
            log.error("Could not load local DB (%s); starting empty.", e)

    def save(self):
        with self._lock:
            LOCAL_FILE.parent.mkdir(parents=True, exist_ok=True)
            snapshot = {name: list(self.db[name].find({})) for name in self.db.list_collection_names()}
            tmp = LOCAL_FILE.with_suffix(".tmp")
            tmp.write_text(json_util.dumps(snapshot))
            tmp.replace(LOCAL_FILE)

    def collection(self, name):
        return _PersistentCollection(self.db[name], self)


def _connect():
    uri = os.getenv("MONGO_URI")
    if uri:
        from pymongo import MongoClient
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=4000)
            client.admin.command("ping")
            db = client[DB_NAME]
            log.info("Connected to MongoDB")
            return "mongodb", db["users"], db["analyses"]
        except Exception as e:
            log.error("MongoDB connection failed (%s) - falling back to local store.", e)
    store = _LocalStore()
    return "local (mongomock + JSON file)", store.collection("users"), store.collection("analyses")


DB_BACKEND, users_collection, analysis_collection = _connect()
try:
    users_collection.create_index("email", unique=True)
    analysis_collection.create_index([("user_id", 1), ("timestamp", -1)])
except Exception:
    pass


def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc
