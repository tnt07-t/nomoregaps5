# NoMoreGaps — Build Log

> Read this before every build phase. Update after every phase.

---

## Current Status
**Phase:** 5h — Strong Diversification Tuning ✅ COMPLETE
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

### Phase 2 — Calendar View + Suggestion Engine (2026-03-14)
**Goal:** Build calendar grid, gap detection, suggestion engine, feedback loop, and full dashboard.

#### Files Created
**Backend (focusfill/backend/)**
- `services/calendar_service.py` — mock 11-event week + real Google Calendar API wrapper
- `services/gap_detector.py` — detects free gaps (≥15 min, 8AM–10PM, with transition buffers)
- `services/suggestion_engine.py` — deterministic scoring formula, rule-based reason strings
- `seed_tasks.py` — 12 default tasks seeded on startup if table empty
- `routers/events.py` — fully implemented (sync throttled 6h, upsert by gcal_event_id)
- `routers/suggestions.py` — fully implemented (gap detect → time blocks → score → store top-3)
- `routers/feedback.py` — fully implemented (accept/reject, mock gcal write-back)
- `main.py` — updated to call `seed_tasks(db)` on startup

**Frontend (focusfill/frontend/src/)**
- `hooks/useCalendar.js` — sync, generateSuggestions, acceptSuggestion, rejectSuggestion
- `components/calendar/WeekView.jsx` — Mon–Sun grid, time axis 6AM–10PM, now-indicator
- `components/calendar/EventBlock.jsx` — solid colored blocks by event_type
- `components/calendar/SuggestionBlock.jsx` — dashed animated blocks, hover accept/reject
- `components/RightPanel.jsx` — contextual detail panel (empty/suggestion/event states)
- `components/EditSuggestionModal.jsx` — edit title + duration modal
- `components/RescheduleModal.jsx` — pick alternate time slot modal
- `pages/Dashboard.jsx` — complete rewrite: 3-column layout, mini-calendar, goals sidebar,
  week nav, sync button, suggestions toggle, full data flow

#### Build Results
- ✅ `python -c "from main import app"` passes — 0 errors
- ✅ `npm run build` passes — 53 modules, 0 errors
- ✅ Bundle: 218 kB JS / 26 kB CSS
- ✅ LIVE TEST: `POST /events/sync?user_id=1&force=true` → 11 mock events stored
- ✅ LIVE TEST: `GET /events/?user_id=1` → 11 events returned
- ✅ LIVE TEST: `POST /suggestions/generate?user_id=1` → 51 suggestions generated + scored
- ✅ LIVE TEST: `GET /suggestions/?user_id=1` → 51 returned with task + time_block nested
- ✅ LIVE TEST: `POST /feedback/` accept → status=accepted, mock gcal_event_id assigned, reason string generated

#### Known Warnings (non-blocking)
- ⚠️ `datetime.utcnow()` deprecation hint — Python 3.11 venv unaffected
- ⚠️ postcss.config.js module type warning — cosmetic only

#### Google OAuth Status
- ✅ Backend fully implemented in `routers/auth.py`
- ✅ `GET /auth/google` → redirects to Google consent (real mode)
- ✅ `GET /auth/google/callback` → exchanges code, upserts user, redirects to frontend
- 🔧 To activate real OAuth: set `USE_MOCK_DATA=false` + add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to `.env`

---

## Phase 2 (old stub — replaced above) — Calendar View + Event Rendering
**Goal:** Build the main dashboard week view with real/mock Google Calendar events.

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

### Phase 3b — Real OAuth + GCal Write-back + Branding (2026-03-14)
**Goal:** Replace mock auth with real Google OAuth, write accepted tasks back to GCal, rename to NoMoreGaps.

#### Files Updated
- `routers/auth.py` — real Google OAuth `/auth/google` + `/auth/google/callback`; renamed brand to "NoMoreGaps"
- `routers/feedback.py` — real GCal write-back on accept; `creds.refresh(Request())` for expired tokens; user timezone; `colorId: "2"` (sage green)
- `pages/LandingPage.jsx` — removed `|| true` mock bypass; always uses real Google OAuth
- `pages/AuthCallback.jsx` — fetches `/auth/me` + `/goals/` to route new vs returning users; new → `/onboarding/buffer`, returning → `/dashboard`
- `App.jsx` — localStorage key renamed to `nomoregaps_user_id`

#### Known Issues Fixed
- 🐛 `GOOGLE_CLIENT_ID` in `.env` was a full JSON blob → fixed to just the client ID string
- 🐛 Token expiry not handled in feedback.py → added `creds.refresh(Request())`
- 🐛 `AuthCallback.jsx` always redirected to `/onboarding/preferences` (wrong route) → fixed

---

### Phase 4 — LLM Integration + Daily Limits (2026-03-14)
**Goal:** Claude generates personalized tasks per goal; per-task daily suggestion caps.

#### Files Created / Updated
- `services/llm_service.py` — NEW: `generate_tasks_for_goal()` calls `claude-sonnet-4-20250514`; `generate_explanation()` calls `claude-haiku-4-5-20251001`; rule-based fallback by category
- `models.py` — added `daily_limit: Integer` to `GoalTask` and `Task`; added `llm_generated: Boolean` to `Task`
- `seed_tasks.py` — all 12 seed tasks updated with explicit `daily_limit` values (1 for diminishing-return tasks, 2-3 for learning/practice)
- `services/suggestion_engine.py` — `get_top_suggestions()` accepts `daily_usage` dict; enforces per-task daily cap using DB usage + session usage tracking
- `routers/suggestions.py` — computes `daily_usage` from today's pending/accepted suggestions before calling engine
- `routers/goals.py` — `POST /goals/` and `PUT /goals/{goal_id}` trigger `_generate_and_save_tasks()` via FastAPI `BackgroundTasks`; saves Claude's tasks as `GoalTask` records

#### Design Decisions
- LLM called ONLY on goal create/update (not on every suggestion generation) — cost control
- Claude decides `daily_limit` per task based on task type (1 for email/tidying, 2-3 for practice)
- Two-layer limit enforcement: `daily_usage` (from DB) + `session_usage` (within current batch)
- If `ANTHROPIC_API_KEY` missing or invalid → falls back to rule-based tasks silently

---

### Phase 4b — Bug Fixes (2026-03-14)
**Goal:** Fix DB migration crash and suggestion engine name collision bug.

#### Fixes Applied
- `database.py` — `_migrate()` already existed but didn't include `daily_limit`/`llm_generated`; confirmed it runs on `create_tables()` startup hook
- `routers/suggestions.py` — `date` query param was shadowing `datetime.date` import, causing `None.today()` crash → renamed import to `date as date_type`
- **Result:** Backend starts cleanly, suggestions generate correctly

---

### Phase 5 — Suggestion Quality + LLM Re-prioritization (2026-03-14)
**Goal:** Fix accept behavior, prevent task repetition, split large blocks, LLM re-scores tasks on sync.

#### Files Updated
- `database.py` — `_migrate()` now adds `weekly_limit INTEGER` and `priority_boost REAL DEFAULT 0.0` to `tasks`; `weekly_limit INTEGER` to `goal_tasks`
- `models.py` — `Task` gets `weekly_limit` + `priority_boost` columns; `GoalTask` gets `weekly_limit`
- `seed_tasks.py` — all 12 tasks updated with `weekly_limit` (Reply to Emails: 5/wk, Tidy Desk: 3/wk, Chess: 14/wk, etc.)
- `routers/feedback.py` — on accept, all OTHER pending suggestions for the same `time_block_id` are auto-rejected (sibling dismissal)
- `routers/suggestions.py` — large gaps (>90 min) are subdivided into 60-min chunks, each becoming its own TimeBlock with a different task; weekly_usage dict computed from week's pending/accepted suggestions and passed to engine
- `services/suggestion_engine.py` — `get_top_suggestions()` now accepts `weekly_usage` dict; enforces `weekly_limit`; applies `task.priority_boost * 30` to score
- `services/llm_service.py` — added `reprioritize_tasks(user_goals, tasks, feedback_history) → {task_id: float}` using `claude-haiku-4-5-20251001`; returns -0.3 to +0.3 boosts per task
- `routers/events.py` — after each sync, calls `reprioritize_tasks()` and writes `priority_boost` back to Task rows in DB
- `frontend/WeekView.jsx` — deduplicates by `time_block_id` before rendering: shows accepted suggestion if any, else only highest-scored pending one per block (no more overlapping blocks)

#### Design Decisions
- Block subdivision: >90 min gap → 60-min chunks (min chunk = 15 min); each chunk gets independent scoring so different tasks fill each slot
- Weekly limits enforced in addition to daily limits; session_usage tracks assignments within a single generation pass (prevents over-assignment in one run)
- `priority_boost` stored globally on Task table (not per-user) — fine for single-user demo; updated by LLM Haiku on every real sync
- Frontend renders max 1 SuggestionBlock per time_block, not 3 stacked

#### Known Issues Fixed
- 🐛 Accept didn't remove other suggestions for same slot → sibling rejection added to feedback.py
- 🐛 3 suggestions per block all rendered at same pixel position → WeekView now deduplicates per block
- 🐛 Same task ("Reply to Emails") could fill every gap all day → daily + weekly limits enforced
- 🐛 Large 3-hour gap generated 3 identical-position suggestions → subdivision creates distinct sub-blocks

---

### Phase 5c — GCal Auth Reliability (2026-03-14)
**Goal:** Fix silent Google Calendar failures caused by expired/invalid tokens.

#### Files Updated
- `services/calendar_service.py` — stop returning silent empty results on API/auth errors; raise explicit runtime errors
- `routers/events.py` — validate token presence, refresh with refresh_token, return `401` for reconnect-required states, return `502` for non-auth Google API failures

#### Build Results
- ✅ `python -m py_compile routers/events.py services/calendar_service.py` passes
- ✅ `python -c "from main import app"` passes

#### Known Issues Fixed
- 🐛 Expired Google access token looked like "no events" due to silent fallback → now surfaces clear API errors

---

### Phase 5d — Onboarding Goal Tasks + LLM Call Gating (2026-03-14)
**Goal:** Use onboarding goals/subtasks in initial suggestions and keep Claude calls constrained.

#### Files Updated
- `routers/goals.py` — onboarding subtasks now sync into `tasks` as user-scoped task-library entries; create-goal always schedules one initial LLM generation; LLM-generated tasks are also mirrored into `tasks`; goal-task add/update/delete keeps task-library entries in sync
- `routers/suggestions.py` — suggestion generation now uses system tasks + user-owned task-library entries (filtered via task metadata)
- `routers/events.py` — reprioritization now runs only over the same user-visible task set (system + user-owned tasks)

#### Build Results
- ✅ `python -m py_compile routers/goals.py routers/suggestions.py routers/events.py` passes
- ✅ `python -c "from main import app"` passes
- ✅ Manual check: goal create with one onboarding subtask produced one user task entry and one queued background LLM task

#### Design Decisions
- Claude calls remain bounded to:
- Goal create/update via background generation
- Calendar sync when remote fetch actually runs (6h throttle still enforced)
- No Claude calls added to suggestion generation or feedback paths

---

### Phase 5e — Goal Visibility + Laundry Policy (2026-03-14)
**Goal:** Show what each goal is currently working on in calendar view and constrain laundry behavior.

#### Files Updated
- `frontend/src/pages/Dashboard.jsx` — goals sidebar now shows per-goal task context (`Now`, `Next`, or planned onboarding task fallback) so onboarding goals/tasks are visible in calendar view
- `backend/services/suggestion_engine.py` — added laundry guardrails: low-effort only, requires continuous 60+ minute gap, hard cap of 90 minutes per week using weekly minute tracking
- `backend/routers/suggestions.py` — computes and passes `weekly_minutes_usage` into scorer
- `backend/seed_tasks.py` — `Do Laundry` updated to low-effort 60–90 minute task with weekly limit 1
- `backend/database.py` — idempotent startup data fix updates existing laundry rows to 60–90 min, low effort, daily_limit=1, weekly_limit=1

#### Build Results
- ✅ `python -m py_compile services/suggestion_engine.py routers/suggestions.py database.py` passes
- ✅ `npm run build` passes

#### Design Decisions
- Laundry weekly cap implemented as minute-based cap (90 min/week) in scorer, not just count-based limit
- Calendar goal display derives active context from accepted suggestions first; falls back to onboarding task list when nothing is scheduled

---

### Phase 5f — Suggestion Neutrality + Anti-Repetition (2026-03-14)
**Goal:** Stop student-biased "Review Notes" spam and diversify suggestions across gaps.

#### Files Updated
- `backend/seed_tasks.py` — renamed system task `Review Notes` → `Review Priority List` with neutral Life Admin framing
- `backend/database.py` — migration fixups rename legacy `Review Notes`, backfill NULL `daily_limit`/`weekly_limit`, and enforce limits on key repetitive system tasks
- `backend/services/suggestion_engine.py` — added non-student guardrail (skip `review notes` unless learning context), plus repetition penalties based on session and weekly usage
- `backend/routers/goals.py` — user task-library mirroring now assigns default limits when onboarding subtasks omit them

#### Build Results
- ✅ `python -m py_compile services/suggestion_engine.py routers/goals.py database.py seed_tasks.py` passes
- ✅ migration run confirms no `Review Notes` rows and no NULL limit rows in `tasks`

---

### Phase 5g — Fresh Regeneration + De-spam (2026-03-14)
**Goal:** Prevent stale pending suggestions from accumulating and dominating UI.

#### Files Updated
- `backend/routers/suggestions.py` — before each generation run, deletes stale `pending` suggestions in requested date range and regenerates fresh candidates (keeps `accepted` history untouched)

#### Validation
- Before fix: 248 pending suggestions for user 1, top titles heavily repeated
- After regenerate with fix: 45 pending suggestions, diverse top titles, no `Review Notes` domination

---

### Phase 5h — Strong Diversification Tuning (2026-03-14)
**Goal:** Reduce repeated suggestion titles across adjacent blocks and week-wide runs.

#### Files Updated
- `backend/services/suggestion_engine.py` — added deterministic gap ordering, title fatigue penalty, category fatigue penalty, adjacent-title repeat penalty, and novelty bonus for unused tasks

#### Validation
- ✅ `python -m py_compile services/suggestion_engine.py` passes
- ✅ local regenerate shows 45 pending suggestions with 23 unique titles (no single title dominating)

---

## Phase 6 — Remaining / Stretch (PLANNED)
- [ ] Mode selector (Productive / Low Energy / Passive) — re-generates suggestions on change
- [ ] Goals router: trigger LLM task generation on goal create/update (BackgroundTasks)
- [ ] Spotify integration (stretch)

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
| 2026-03-14 | 3b | GOOGLE_CLIENT_ID was full JSON blob in .env | ✅ fixed | replaced with just the client ID string |
| 2026-03-14 | 3b | GCal write-back failed on expired token | ✅ fixed | added creds.refresh(Request()) in feedback.py |
| 2026-03-14 | 3b | AuthCallback always redirected to wrong route | ✅ fixed | checks goals to route new vs returning users |
| 2026-03-14 | 4 | suggestions.py: date.today() shadowed by `date` param | ✅ fixed | renamed import to `date as date_type` |
| 2026-03-14 | 4 | SQLite missing daily_limit/llm_generated columns — app crash on start | ✅ fixed | _migrate() in database.py runs ALTER TABLE safely on startup |
| 2026-03-14 | 5 | Accept didn't hide other suggestions for same time block | ✅ fixed | feedback.py auto-rejects siblings on accept |
| 2026-03-14 | 5 | 3 suggestion blocks stacked at same pixel position | ✅ fixed | WeekView deduplicates per time_block_id |
| 2026-03-14 | 5 | Same task suggested repeatedly filling entire day | ✅ fixed | daily_limit + weekly_limit enforced in engine |
| 2026-03-14 | 5 | Large free blocks not split into varied tasks | ✅ fixed | >90 min gaps subdivided into 60-min chunks in suggestions.py |
| 2026-03-14 | 5c | Expired/invalid Google tokens produced silent empty sync results | ✅ fixed | events router now returns explicit 401/502 and calendar service no longer swallows auth/API errors |
| 2026-03-14 | 5d | Onboarding subtasks were saved but not used by suggestion task pool | ✅ fixed | goal tasks now sync into user task library; suggestions/events filter by user-visible tasks |
| 2026-03-14 | 5e | Goals sidebar did not show current onboarding task context | ✅ fixed | per-goal `Now/Next/Planned` status now shown in dashboard calendar view |
| 2026-03-14 | 5e | Laundry suggestions were too fragmented and unconstrained weekly | ✅ fixed | scorer enforces low-effort + continuous 60+ min + 90 min/week cap |
| 2026-03-14 | 5f | Suggestions were dominated by student-specific `Review Notes` | ✅ fixed | neutral task rename + legacy limit backfill + anti-repetition penalties |
| 2026-03-14 | 5g | Pending suggestions accumulated and caused repeated stale outputs | ✅ fixed | generation now clears in-range pending suggestions before recomputing |
| 2026-03-14 | 5h | Suggestions still felt repetitive across adjacent gaps | ✅ fixed | title/category fatigue + adjacent repeat penalty + novelty bonus in scorer |
