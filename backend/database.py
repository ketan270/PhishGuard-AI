import mongomock

# Using mongomock to ensure the project works out of the box without requiring a local MongoDB instance.
client = mongomock.MongoClient()
db = client.get_database('phishguard')

users_collection = db["users"]
analysis_collection = db["analyses"]

def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc
