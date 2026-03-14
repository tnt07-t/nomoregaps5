# NoMoreGaps

> Your calendar has more free time than you think — it's just fragmented. NoMoreGaps connects to Google Calendar, finds every hidden gap in your week, and fills it with the right task at the right moment. Powered by Claude AI, it learns your goals, work style, and habits to deliver hyper-personalized suggestions that actually fit your life. Accept a suggestion and it lands in your calendar automatically.

---

## Features

- **AI-Powered Personalization** — Claude re-ranks every suggestion on each sync based on your goals, past behavior, energy preferences, and context. No two users see the same recommendations.
- **Google Calendar Integration** — reads your real schedule, detects free gaps (≥15 min, 8AM–10PM), and writes accepted tasks back as calendar events in real time
- **Goal-Aware Suggestions** — set your goals during onboarding; Claude generates tailored subtasks and the sidebar tracks Now / Next / Planned progress per goal throughout your week
- **Smart Onboarding** — 4-step flow captures your work style, location flexibility, energy levels, and goals so suggestions are relevant from day one
- **Accept / Reject Learning Loop** — every interaction teaches the system; accepted and rejected tasks shape future scoring so recommendations improve over time
- **Anti-Repetition Engine** — title + category fatigue penalties and novelty bonuses ensure suggestions stay fresh and diverse across adjacent time blocks
- **Live Calendar Write-back** — accepted tasks appear in Google Calendar instantly (sage green), with full OAuth token refresh handled automatically
- **Daily & Weekly Limits** — prevents burnout by capping how often any task can be suggested, enforced per user across the full week

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
