# STATUS: complete
"""
LLM service — Claude API integration for personalized task generation.

Called ONLY when a user creates or updates a goal.
Output is saved to DB so we never re-call for the same goal state.
Always has a rule-based fallback if the API fails or key is missing.
"""
import os
import json
import re

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


def generate_tasks_for_goal(goal_title: str, goal_category: str,
                             weekly_target_hours: float,
                             existing_task_titles: list[str] | None = None) -> list[dict]:
    """
    Ask Claude to generate 3-4 specific, actionable tasks for a goal.
    Returns list of dicts:
      { title, estimated_minutes, effort_level, daily_limit, location_requirement, mobility_requirement }

    Falls back to rule-based suggestions if API call fails.
    """
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.startswith("your_"):
        return _fallback_tasks(goal_title, goal_category, weekly_target_hours)

    existing = ", ".join(existing_task_titles) if existing_task_titles else "none"

    prompt = f"""You are a productivity assistant for an app that fills calendar gaps with meaningful tasks.

A user has a goal: "{goal_title}"
Category: {goal_category}
Weekly target: {weekly_target_hours:.1f} hours/week
Existing tasks already added: {existing}

Generate exactly 4 NEW specific, actionable tasks they can do in short free time gaps (10–60 min).
Do NOT repeat existing tasks. Make them concrete and specific to this goal.

For each task, determine:
- title: short action phrase (3–7 words, no filler words)
- estimated_minutes: realistic time needed (10–60)
- effort_level: "low", "medium", or "high"
- daily_limit: max times per day this should be suggested (1 = once, 2 = twice, 3 = three times).
  Use 1 for tasks like "reply to emails" or "tidy desk" (diminishing returns).
  Use 2–3 for learning/practice tasks where repetition helps.
- location_requirement: "anywhere", "home", or "office"
- mobility_requirement: "stationary" or "mobile"

Return ONLY a valid JSON array, no explanation, no markdown:
[
  {{"title": "...", "estimated_minutes": 25, "effort_level": "medium", "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"}},
  ...
]"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()

        # Extract JSON array robustly
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON array in response")

        tasks = json.loads(match.group())
        validated = []
        for t in tasks[:4]:
            validated.append({
                "title":                t.get("title", "Practice task")[:80],
                "estimated_minutes":    int(t.get("estimated_minutes", 25)),
                "effort_level":         t.get("effort_level", "medium"),
                "daily_limit":          int(t.get("daily_limit", 2)),
                "location_requirement": t.get("location_requirement", "anywhere"),
                "mobility_requirement": t.get("mobility_requirement", "stationary"),
            })
        return validated

    except Exception as exc:
        print(f"[llm_service] Claude API error: {exc} — using fallback")
        return _fallback_tasks(goal_title, goal_category, weekly_target_hours)


def generate_explanation(task_title: str, gap_duration: int,
                         next_event: str, goal_title: str) -> str:
    """
    Generate a one-sentence reason why a task fits a time gap.
    Used optionally — falls back to rule-based reason if API fails.
    """
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.startswith("your_"):
        return ""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        prompt = (
            f'In one sentence (max 20 words), explain why "{task_title}" is a good use of '
            f'a {gap_duration}-minute gap'
            + (f' before "{next_event}"' if next_event else "")
            + (f' for someone working toward "{goal_title}"' if goal_title else "")
            + ". Be specific and motivating. No fluff."
        )

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",  # cheapest model for short strings
            max_tokens=60,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip().strip('"')

    except Exception:
        return ""


# ─── Rule-based fallback ──────────────────────────────────────────────────────

_FALLBACK_BY_CATEGORY = {
    "Career": [
        {"title": "Update resume bullet points", "estimated_minutes": 25, "effort_level": "medium", "daily_limit": 1, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Research one company",         "estimated_minutes": 20, "effort_level": "low",    "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Draft one outreach message",   "estimated_minutes": 15, "effort_level": "medium", "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Review job posting details",   "estimated_minutes": 10, "effort_level": "low",    "daily_limit": 3, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
    ],
    "Learning": [
        {"title": "Review flashcards",            "estimated_minutes": 15, "effort_level": "low",    "daily_limit": 3, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Watch one tutorial video",     "estimated_minutes": 20, "effort_level": "low",    "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Practice one concept",         "estimated_minutes": 25, "effort_level": "medium", "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Read chapter summary",         "estimated_minutes": 15, "effort_level": "low",    "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
    ],
    "Health": [
        {"title": "5-minute breathing exercise",  "estimated_minutes": 5,  "effort_level": "low",    "daily_limit": 3, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Stretch routine",              "estimated_minutes": 10, "effort_level": "low",    "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Walk around the block",        "estimated_minutes": 15, "effort_level": "low",    "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "mobile"},
        {"title": "Log today's meals",            "estimated_minutes": 5,  "effort_level": "low",    "daily_limit": 1, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
    ],
    "Life Admin": [
        {"title": "Process one inbox item",       "estimated_minutes": 10, "effort_level": "low",    "daily_limit": 2, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Pay one pending bill",         "estimated_minutes": 5,  "effort_level": "low",    "daily_limit": 1, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Schedule one appointment",     "estimated_minutes": 10, "effort_level": "low",    "daily_limit": 1, "location_requirement": "anywhere", "mobility_requirement": "stationary"},
        {"title": "Tidy one area of desk",        "estimated_minutes": 10, "effort_level": "low",    "daily_limit": 1, "location_requirement": "home",     "mobility_requirement": "stationary"},
    ],
}


def _fallback_tasks(goal_title: str, goal_category: str, weekly_hours: float) -> list[dict]:
    base = _FALLBACK_BY_CATEGORY.get(goal_category, _FALLBACK_BY_CATEGORY["Learning"])
    # Personalise titles slightly with goal name
    result = []
    for t in base:
        task = dict(t)
        # Prepend goal context to first task title
        if not result:
            task["title"] = f"{goal_title[:20].strip()}: {task['title']}"
        result.append(task)
    return result
