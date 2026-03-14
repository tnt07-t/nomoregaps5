import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import create_tables
from routers import auth, preferences, goals, events, suggestions, feedback

app = FastAPI(
    title="TimeFiller API",
    description="AI-powered dead-time optimizer — reclaim your day.",
    version="0.1.0",
)

# ─── CORS ────────────────────────────────────────────────────────────────────

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(preferences.router)
app.include_router(goals.router)
app.include_router(events.router)
app.include_router(suggestions.router)
app.include_router(feedback.router)

# ─── Startup ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    create_tables()


@app.get("/")
def health():
    return {"status": "ok", "app": "TimeFiller API", "version": "0.1.0"}


@app.get("/health")
def healthcheck():
    return {"status": "healthy"}
