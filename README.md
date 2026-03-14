# NoMoreGaps

> Turn calendar white space into focused work. NoMoreGaps reads your Google Calendar, detects fragmented free time, and suggests context-aware tasks as dashed "tentative" blocks. Accept one — it writes back to your calendar in sage green. The system learns from your feedback and re-ranks tasks on every sync using an LLM.

---

## Features

- **Google Calendar sync** — reads your real events, detects free gaps (≥15 min, 8AM–10PM)
- **Smart suggestions** — deterministic scoring formula + LLM priority boosts per sync
- **Accept / Reject flow** — accepted tasks write back to GCal; siblings auto-rejected
- **Goal tracking** — set goals, LLM generates subtasks, sidebar shows Now/Next/Planned per goal
- **Weekly + daily limits** — prevents over-suggesting the same task
- **Anti-repetition** — title + category fatigue penalties diversify suggestions across time blocks
- **Onboarding** — 4-step flow collecting goals, preferences, and work style
- **Full OAuth 2.0** — Google sign-in with automatic token refresh

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| Drag & Drop | dnd-kit |
| Port | 3000 |

### Backend
| | |
|---|---|
| Framework | FastAPI (Python 3.11) |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite (local) / PostgreSQL (production) |
| Auth | Google OAuth 2.0 + python-jose JWT |
| LLM | Anthropic API (Claude Sonnet + Haiku) |
| Calendar | Google Calendar API v3 |
| Port | 8000 |

### Infrastructure
| | |
|---|---|
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Database (prod) | Supabase (PostgreSQL) |

---

## LLM Usage

| Function | Model | Trigger | Output |
|---|---|---|---|
| `generate_tasks_for_goal()` | claude-sonnet-4-20250514 | Goal create/update | 4 tasks with daily limits |
| `reprioritize_tasks()` | claude-haiku-4-5-20251001 | Every GCal sync | `{task_id: boost}` (-0.3 → +0.3) |
| `generate_explanation()` | claude-haiku-4-5-20251001 | On demand | 1-sentence reason string |

---

## Scoring Formula

```
total_score = 30×duration_fit + 25×context_match + 20×user_goal_match
            + 15×event_relevance + 10×low_setup_bonus + 10×historical_acceptance
            - 20×mobility_mismatch - 25×location_mismatch
            + priority_boost × 30   ← set by LLM on each sync
```

---

## Local Development

### Prerequisites
- Python 3.11 (`/opt/homebrew/bin/python3.11` on macOS)
- Node.js 18+
- Google OAuth credentials
- Anthropic API key

### Backend

```bash
cd focusfill/backend
/opt/homebrew/bin/python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd focusfill/frontend
npm install
# create .env with: VITE_API_BASE=http://localhost:8000
npm run dev   # http://localhost:3000
```

### Backend `.env`

```env
USE_MOCK_DATA=false
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
ANTHROPIC_API_KEY=your_anthropic_api_key
FRONTEND_URL=http://localhost:3000
SECRET_KEY=your_secret_key_here
# DATABASE_URL=postgresql://...  (omit for local SQLite)
```

---

## Production Deployment

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `focusfill/frontend`
3. Add environment variable:
   ```
   VITE_API_BASE=https://<your-render-service>.onrender.com
   ```
4. Deploy — `vercel.json` handles SPA routing fallback automatically

### Backend → Render

1. New **Web Service** on [render.com](https://render.com)
2. Set **Root Directory** to `focusfill/backend`
3. Set **Runtime** to Python, **Build Command**:
   ```
   pip install -r requirements.txt
   ```
4. Set **Start Command**:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Add environment variables:

   | Key | Value |
   |---|---|
   | `USE_MOCK_DATA` | `false` |
   | `DATABASE_URL` | Supabase session pooler URI |
   | `GOOGLE_CLIENT_ID` | from Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
   | `GOOGLE_REDIRECT_URI` | `https://<render-domain>/auth/google/callback` |
   | `ANTHROPIC_API_KEY` | from console.anthropic.com |
   | `SECRET_KEY` | any long random string |
   | `FRONTEND_URLS` | `https://<vercel-domain>.vercel.app` |

### Database → Supabase

1. Create project on [supabase.com](https://supabase.com)
2. Go to **Connect** → **Connection String** → set Method to **Session pooler**
3. Copy the URI (starts with `postgresql://postgres.<ref>:...@aws-...pooler.supabase.com:5432/postgres`)
4. Use as `DATABASE_URL` in Render
5. Tables are auto-created on first startup via `database._migrate()`

### Google OAuth Setup

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback` (local)
   - `https://<render-domain>/auth/google/callback` (production)
4. Enable **Google Calendar API** in the project

---

## Project Structure

```
focusfill/
├── backend/
│   ├── main.py               # FastAPI app, CORS, router registration
│   ├── database.py           # SQLAlchemy engine, migrations
│   ├── models.py             # ORM models
│   ├── schemas.py            # Pydantic schemas
│   ├── seed_tasks.py         # 12 default system tasks
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py           # Google OAuth + JWT
│   │   ├── events.py         # GCal sync
│   │   ├── suggestions.py    # Generate + fetch suggestions
│   │   ├── feedback.py       # Accept/reject + GCal write-back
│   │   ├── goals.py          # Goal CRUD + LLM task gen
│   │   └── preferences.py    # User preferences
│   └── services/
│       ├── calendar_service.py   # GCal API wrapper
│       ├── gap_detector.py       # Free time detection
│       ├── llm_service.py        # Anthropic API calls
│       └── suggestion_engine.py  # Scoring + ranking
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── pages/            # Landing, Onboarding, Dashboard, Goals
    │   ├── components/       # Calendar, WeekView, Suggestion/EventBlocks
    │   ├── hooks/            # useAuth, useCalendar
    │   └── utils/api.js      # Typed API helpers
    ├── vercel.json           # SPA fallback rewrite
    └── tailwind.config.js
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/auth/google` | Start Google OAuth flow |
| GET | `/auth/me?user_id=N` | Get user + preferences |
| POST | `/events/sync?user_id=N` | Fetch + store GCal events, run LLM reprioritization |
| GET | `/events/?user_id=N` | Get stored events for current week |
| POST | `/suggestions/generate?user_id=N` | Detect gaps, score tasks, store top-3 per block |
| GET | `/suggestions/?user_id=N` | Get pending + accepted suggestions for week |
| POST | `/feedback/` | Accept or reject a suggestion |
| GET/POST/PUT | `/goals/` | Goal CRUD (POST triggers LLM task generation) |
| GET/PUT | `/preferences/` | User preferences |
