# TimeFiller — Build Log

> Read this before every build phase. Update after every phase.

---

## Current Status
**Phase:** 1 — Onboarding Flow ✅ COMPLETE
**Last updated:** 2026-03-14
**Backend:** Running on http://localhost:8000
**Frontend:** Running on http://localhost:3000

---

## Phase Log

### Phase 1 — Onboarding Flow (2026-03-14)
**Goal:** Build landing page, auth flow, preference setup, goal wizard.

#### Files Created
**Backend (focusfill/backend/)**
- `main.py` — FastAPI app, CORS, router includes, startup hook
- `database.py` — SQLite + SQLAlchemy engine, `create_tables()`
- `models.py` — 9 models: User, UserPreference, Goal, GoalTask, CalendarEvent, TimeBlock, Task, Suggestion, FeedbackEvent
- `schemas.py` — Pydantic v2 schemas for all models
- `routers/auth.py` — `/auth/mock-login`, `/auth/google`, `/auth/google/callback`, `/auth/me`
- `routers/preferences.py` — GET/PUT `/preferences/`
- `routers/goals.py` — full CRUD + reorder: `/goals/`, `/goals/{id}`, `/goals/{id}/tasks`, `/goals/reorder`
- `routers/events.py` — stub
- `routers/suggestions.py` — stub
- `routers/feedback.py` — stub
- `requirements.txt`, `.env.example`, `start.sh`

**Frontend (focusfill/frontend/)**
- `package.json`, `vite.config.js`, `tailwind.config.js` (v3), `postcss.config.js`, `index.html`
- `src/main.jsx`, `src/index.css`
- `src/App.jsx` — React Router, routes: `/`, `/auth/callback`, `/onboarding/preferences`, `/onboarding/goals`, `/dashboard`
- `src/components/StepIndicator.jsx` — dot progress bar
- `src/components/BrandHeader.jsx` — pencil icon + brand
- `src/pages/LandingPage.jsx` — login page (matches screenshots)
- `src/pages/AuthCallback.jsx` — reads ?user_id, saves localStorage
- `src/pages/OnboardingPreferences.jsx` — buffer/gap/hours/podcasts settings
- `src/pages/OnboardingGoals.jsx` — goal wizard with drag-to-reorder
- `src/pages/Dashboard.jsx` — stub
- `src/hooks/useAuth.js`
- `src/utils/api.js`

#### Build Results
- ✅ Python 3.11 venv created at `focusfill/backend/venv/`
- ✅ All backend deps installed (requirements.txt)
- ✅ `python -c "from main import app"` passes with no errors
- ✅ `npm install` passes (25 packages, 2 moderate vulns — non-blocking)
- ✅ `npm run build` passes — 47 modules, 0 errors, 0 type errors
- ✅ `.env` created from `.env.example` (USE_MOCK_DATA=true)
- ✅ LIVE TEST: `POST /auth/mock-login` → `{user_id:1, name:"Demo User"}`
- ✅ LIVE TEST: `GET /auth/me?user_id=1` → user + preferences returned
- ✅ LIVE TEST: `PUT /preferences/?user_id=1` → upsert works
- ✅ LIVE TEST: `POST /goals/` with nested tasks → created correctly
- ✅ LIVE TEST: `GET /goals/?user_id=1` → returns goals with tasks array

#### Known Issues / Warnings
- ⚠️ `postcss.config.js` module type warning (not CJS/ESM declared) — cosmetic, does not break build
- ⚠️ 2 moderate npm audit vulns (vite dev deps) — non-blocking for hackathon
- ⚠️ `@dnd-kit` drag-to-reorder in OnboardingGoals.jsx — works in dev; needs touch-action CSS on mobile

---

---

### Phase 1b — Onboarding Redesign (2026-03-14)
**Goal:** Rebuild all 4 onboarding steps to match PDF mockups exactly.

#### Files Created / Updated
- `src/App.jsx` — routes updated: `/onboarding/buffer`, `/onboarding/audio`, `/onboarding/goals`, `/onboarding/preview`; legacy redirect for `/onboarding/preferences`
- `src/components/StepDots.jsx` — NEW: top-right dot progress indicator
- `src/pages/OnboardingBuffer.jsx` — NEW: Step 1 "Set the pace" (5/10 min radio cards)
- `src/pages/OnboardingAudio.jsx` — NEW: Step 2 "Audio Journeys" (toggle + Spotify CTA)
- `src/pages/OnboardingGoals.jsx` — REWRITTEN: Step 3 two-column goal builder (list + editor)
- `src/pages/OnboardingPreview.jsx` — NEW: Step 4 "Your week, curated" (mini calendar grid)

#### Build Results
- ✅ `npm run build` passes — 46 modules, 0 errors
- ✅ Bundle size reduced: 193 kB (was 245 kB, removed @dnd-kit from Goals)
- ⚠️ postcss.config.js module warning still present — cosmetic only

---

## Phase 2 — Calendar View + Event Rendering (PLANNED)
**Goal:** Build the main dashboard week view with real/mock Google Calendar events.

**TODO:**
- [ ] Implement `routers/events.py` fully (Google Calendar sync + mock fallback)
- [ ] Implement `services/calendar_service.py` (Google API client + mock data)
- [ ] Build `WeekView` React component (Mon–Sun, time axis 8am–10pm)
- [ ] Build `EventBlock` component (solid colored blocks by event type)
- [ ] Implement `useCalendar` hook (sync + fetch)
- [ ] Wire Dashboard.jsx to show real week view

**Risks:**
- Google OAuth scope needs `calendar.readonly` + `calendar.events` — test early
- Time zone handling must use user's detected timezone from Google

---

## Phase 3 — Gap Detection + Suggestion Engine (PLANNED)
**Goal:** Detect free time blocks, run scoring formula, surface suggestions as dashed blocks.

**TODO:**
- [ ] Implement `services/gap_detector.py` — find gaps ≥ min_gap_minutes within work hours
- [ ] Implement `services/suggestion_engine.py` — scoring formula + task matching
- [ ] Seed 12 default tasks in DB on startup
- [ ] Implement `routers/suggestions.py` fully — generate + retrieve
- [ ] Build `SuggestionBlock` component (dashed border, animated)
- [ ] Build `SuggestionCard` side panel (reason, accept/reject)
- [ ] Implement `useSuggestions` hook

**Scoring formula:**
```
total_score = 30*duration_fit + 25*context_match + 20*user_goal_match
            + 15*event_relevance + 10*low_setup_bonus + 10*historical_acceptance_bonus
            - 20*mobility_mismatch - 25*location_mismatch
```

---

## Phase 4 — LLM Integration (PLANNED)
**Goal:** Claude generates suggestion reason strings; rule-based fallback always present.

**TODO:**
- [ ] Implement `services/llm_service.py` — Anthropic API call + cache per event
- [ ] Wrap in try/except; fallback = rule-based reason string
- [ ] Wire into suggestion generation pipeline

---

## Phase 5 — Accept/Reject + GCal Write-back (PLANNED)
**TODO:**
- [ ] Implement `routers/feedback.py` fully
- [ ] On accept: write event to Google Calendar (mock = log ID)
- [ ] On accept: change SuggestionBlock to solid EventBlock
- [ ] On reject: hide block, store FeedbackEvent

---

## Phase 6 — Polish (STRETCH)
- [ ] Mode selector (Productive / Low Energy / Passive) — re-generates suggestions
- [ ] Progress bars for weekly goal minutes
- [ ] Spotify integration

---

## Environment

```bash
# Backend
cd focusfill/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend
cd focusfill/frontend
npm run dev   # port 3000
```

**Env vars needed (focusfill/backend/.env):**
- `USE_MOCK_DATA=true` (default)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (for real OAuth)
- `ANTHROPIC_API_KEY` (for LLM phase)
- `FRONTEND_URL=http://localhost:3000`
- `SECRET_KEY` (any random string)

---

## Error Registry

| Date | Phase | Error | Status | Fix |
|------|-------|-------|--------|-----|
| 2026-03-14 | 1 | postcss.config.js module type warning | ⚠️ non-blocking | add "type":"module" to package.json if needed |
