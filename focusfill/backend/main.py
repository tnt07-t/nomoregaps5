import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import create_tables, SessionLocal
from routers import auth, preferences, goals, events, suggestions, feedback
from seed_tasks import seed_tasks

app = FastAPI(
    title="NoMoreGaps API",
    description="AI-powered dead-time optimizer — reclaim your day.",
    version="0.1.0",
)

# ─── CORS ────────────────────────────────────────────────────────────────────

def _frontend_origins() -> list[str]:
    origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }

    single = (os.getenv("FRONTEND_URL") or "").strip()
    if single:
        origins.add(single.rstrip("/"))

    multi = (os.getenv("FRONTEND_URLS") or "").strip()
    if multi:
        for origin in multi.split(","):
            cleaned = origin.strip().rstrip("/")
            if cleaned:
                origins.add(cleaned)

    return sorted(origins)


FRONTEND_ORIGINS = _frontend_origins()
FRONTEND_ORIGIN_REGEX = (os.getenv("FRONTEND_ORIGIN_REGEX") or "").strip() or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=FRONTEND_ORIGIN_REGEX,
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
    db = SessionLocal()
    try:
        seed_tasks(db)
    finally:
        db.close()


@app.get("/")
def health():
    return {"status": "ok", "app": "NoMoreGaps API", "version": "0.1.0"}


@app.get("/health")
def healthcheck():
    return {"status": "healthy"}
