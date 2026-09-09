from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, analysis

app = FastAPI(title="PhishGuard AI API", version="1.0.0")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, allow all. In prod restrict to frontend domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(analysis.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to PhishGuard AI API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
