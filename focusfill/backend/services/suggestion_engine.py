"""
Suggestion engine — deterministic scoring and task matching.

Scoring formula:
  total_score = 30*duration_fit + 25*context_match + 20*user_goal_match
              + 15*event_relevance + 10*low_setup_bonus
              + 10*historical_acceptance_bonus
              - 20*mobility_mismatch - 25*location_mismatch

Each component is 0.0 to 1.0 before multiplying (except penalty terms which
reduce the final score).
"""
from __future__ import annotations
from typing import Any


# ─── Public API ──────────────────────────────────────────────────────────────

def score_task_for_block(task, gap: dict, user_goals: list, feedback_history: list) -> float:
    """
    Score a Task (ORM object or dict) against a gap dict.
    Returns a float score (higher is better).
    """
    duration_fit               = _duration_fit(task, gap)
    context_match              = _context_match(task, gap)
    user_goal_match            = _user_goal_match(task, user_goals)
    event_relevance            = _event_relevance(task, gap)
    low_setup_bonus            = _low_setup_bonus(task, gap)
    historical_acceptance      = _historical_acceptance(task, feedback_history)
    mobility_mismatch_penalty  = _mobility_mismatch(task, gap)
    location_mismatch_penalty  = _location_mismatch(task, gap)

    score = (
        30 * duration_fit
        + 25 * context_match
        + 20 * user_goal_match
        + 15 * event_relevance
        + 10 * low_setup_bonus
        + 10 * historical_acceptance
        - 20 * mobility_mismatch_penalty
        - 25 * location_mismatch_penalty
    )
    return score


def get_top_suggestions(gaps: list, tasks: list, user_goals: list,
                         feedback_history: list, top_n: int = 3,
                         daily_usage: dict | None = None,
                         weekly_usage: dict | None = None) -> list:
    """
    For each gap, score all tasks and return the top-N (task, gap, score, reason) tuples.
    Enforces daily_limit and weekly_limit.

    daily_usage:  {task_id: count} of times suggested/accepted today.
    weekly_usage: {task_id: count} of times suggested/accepted this week.
    session_usage tracks assignments within this single generation pass.
    """
    if daily_usage is None:
        daily_usage = {}
    if weekly_usage is None:
        weekly_usage = {}

    # Count how many times we assign each task in this generation pass
    session_usage: dict = {}

    results = []
    for gap in gaps:
        scored = []
        for task in tasks:
            task_id      = _attr(task, "id")
            daily_limit  = _attr(task, "daily_limit", None)
            weekly_limit = _attr(task, "weekly_limit", None)
            p_boost      = _attr(task, "priority_boost", 0.0) or 0.0

            if daily_limit is not None:
                used = daily_usage.get(task_id, 0) + session_usage.get(task_id, 0)
                if used >= daily_limit:
                    continue

            if weekly_limit is not None:
                used_week = weekly_usage.get(task_id, 0) + session_usage.get(task_id, 0)
                if used_week >= weekly_limit:
                    continue

            s = score_task_for_block(task, gap, user_goals, feedback_history)
            s += p_boost * 30  # scale boost into scoring range
            scored.append((task, gap, s))

        scored.sort(key=lambda x: x[2], reverse=True)
        for task, g, score in scored[:top_n]:
            task_id = _attr(task, "id")
            session_usage[task_id] = session_usage.get(task_id, 0) + 1
            reason = get_rule_based_reason(task, g)
            results.append({"task": task, "gap": g, "score": score, "reason": reason})
    return results


def get_rule_based_reason(task, gap: dict) -> str:
    """Generate a human-readable reason string without LLM."""
    task_title    = _attr(task, "title", "This task")
    task_category = _attr(task, "category", "")
    min_dur       = _attr(task, "min_duration", 15)
    max_dur       = _attr(task, "max_duration", 60)
    gap_dur       = gap.get("duration_minutes", 30)
    next_title    = gap.get("next_event_title") or ""
    prev_title    = gap.get("prev_event_title") or ""
    is_home       = gap.get("is_home", False)
    low_setup     = gap.get("low_setup_only", False)

    parts = []

    # Duration fit comment
    if gap_dur >= min_dur and gap_dur <= max_dur + 15:
        parts.append(f"You have a {gap_dur}-minute window — just right for this task.")
    elif gap_dur > max_dur + 15:
        parts.append(f"You have a {gap_dur}-minute window — plenty of time for this.")
    else:
        parts.append(f"Quick {gap_dur}-minute gap detected.")

    # Event relevance comment
    next_lower = next_title.lower()
    prev_lower = prev_title.lower()
    if any(kw in next_lower for kw in ("midterm", "exam", "test", "quiz")):
        parts.append(f"Reviewing notes now will help you prepare for your upcoming {next_title}.")
    elif any(kw in next_lower for kw in ("meeting", "standup", "1:1", "review")):
        parts.append(f"Use this time to prep an agenda before your {next_title}.")
    elif any(kw in prev_lower for kw in ("gym", "workout", "run", "yoga")):
        parts.append("After your workout, stretching or light tasks work well.")
    elif "career" in task_category.lower() or "job" in task_title.lower():
        parts.append("Advance your career goals with this short burst of focused effort.")
    elif "learning" in task_category.lower():
        parts.append("Small learning sessions compound over time — keep the streak going.")
    elif "health" in task_category.lower():
        parts.append("Take care of your body between sessions.")

    # Setup cost / location
    if low_setup and _attr(task, "setup_cost", "low") == "low":
        parts.append("No setup needed — you can start immediately.")
    elif is_home and _attr(task, "location_requirement", "anywhere") == "home":
        parts.append("Best done at home, and you likely are.")

    return " ".join(parts) if parts else f"A good fit for your {gap_dur}-minute break."


# ─── Scoring components ───────────────────────────────────────────────────────

def _duration_fit(task, gap: dict) -> float:
    """How well the gap duration fits the task's min/max range."""
    gap_dur = gap.get("duration_minutes", 0)
    min_dur = _attr(task, "min_duration", 15)
    max_dur = _attr(task, "max_duration", 60)

    if gap_dur < min_dur:
        # Below minimum — partial credit if within 5 minutes
        shortfall = min_dur - gap_dur
        return max(0.0, 1.0 - shortfall / max(min_dur, 1))
    elif gap_dur <= max_dur:
        return 1.0
    else:
        # Above max — slight penalty; still usable
        overage = gap_dur - max_dur
        return max(0.5, 1.0 - overage / max(max_dur, 1) * 0.5)


def _context_match(task, gap: dict) -> float:
    """
    Does the task fit the time-of-day context?
    Scores based on hour of gap vs task preferred_time_of_day.
    """
    start_time = gap.get("start_time")
    if start_time is None:
        return 0.5
    hour = start_time.hour

    preferred = _attr(task, "effort_level", "medium")
    # Map effort level to preferred hour ranges
    # Also consider gap context: late evening = low effort preferred
    if hour < 10:
        # Morning — high effort tasks good
        if preferred in ("low", "medium"):
            return 0.8
        return 1.0
    elif hour < 14:
        # Mid-morning/noon — medium effort
        if preferred == "medium":
            return 1.0
        return 0.8
    elif hour < 18:
        # Afternoon — any effort
        return 0.9
    else:
        # Evening — low effort preferred
        if preferred == "low":
            return 1.0
        elif preferred == "medium":
            return 0.6
        return 0.3


def _user_goal_match(task, user_goals: list) -> float:
    """Does the task category match any of the user's active goals?"""
    if not user_goals:
        return 0.5  # neutral when no goals set
    task_category = (_attr(task, "category", "") or "").lower()
    task_goal_tag = (_attr(task, "goal_tag", "") or "").lower()
    for goal in user_goals:
        goal_cat = (getattr(goal, "category", None) or goal.get("category", "")).lower()
        goal_title = (getattr(goal, "title", None) or goal.get("title", "")).lower()
        if goal_cat and (goal_cat in task_category or task_category in goal_cat):
            return 1.0
        if goal_title and (goal_title in task_goal_tag or task_goal_tag in goal_title):
            return 0.8
    return 0.2


def _event_relevance(task, gap: dict) -> float:
    """Boost tasks that are relevant to adjacent events."""
    next_title = (gap.get("next_event_title") or "").lower()
    prev_title = (gap.get("prev_event_title") or "").lower()
    task_title = (_attr(task, "title", "") or "").lower()
    task_category = (_attr(task, "category", "") or "").lower()

    # Exam/test → boost review notes
    if any(kw in next_title for kw in ("midterm", "exam", "test", "quiz")):
        if any(kw in task_title for kw in ("review", "notes", "study", "read", "learn")):
            return 1.0
        if "learning" in task_category:
            return 0.7

    # Meeting/standup → boost agenda prep / emails
    if any(kw in next_title for kw in ("meeting", "standup", "1:1", "review", "prep")):
        if any(kw in task_title for kw in ("agenda", "prep", "email", "reply")):
            return 1.0
        if "career" in task_category:
            return 0.6

    # After gym → boost health tasks
    if any(kw in prev_title for kw in ("gym", "workout", "run", "yoga", "fitness")):
        if "health" in task_category or "stretch" in task_title:
            return 1.0

    # Chess club → boost chess puzzle
    if any(kw in next_title for kw in ("chess",)):
        if "chess" in task_title:
            return 1.0

    # Career fair → boost job-related tasks
    if any(kw in next_title for kw in ("career fair", "interview", "networking")):
        if any(kw in task_title for kw in ("job", "apply", "resume", "agenda")):
            return 1.0

    return 0.3  # default low relevance


def _low_setup_bonus(task, gap: dict) -> float:
    """Bonus for low-setup tasks when gap is short or low_setup_only."""
    low_setup_only = gap.get("low_setup_only", False)
    task_setup = (_attr(task, "setup_cost", "low") or "low").lower()
    if low_setup_only and task_setup == "low":
        return 1.0
    if low_setup_only and task_setup == "medium":
        return 0.3
    if not low_setup_only and task_setup == "low":
        return 0.8
    return 0.5


def _historical_acceptance(task, feedback_history: list) -> float:
    """Estimate acceptance rate for this task from past feedback."""
    if not feedback_history:
        return 0.5
    task_id = _attr(task, "id", None)
    if task_id is None:
        return 0.5
    task_feedbacks = [f for f in feedback_history if _get_fb_task_id(f) == task_id]
    if not task_feedbacks:
        return 0.5
    accepted = sum(1 for f in task_feedbacks if _get_fb_action(f) == "accepted")
    return accepted / len(task_feedbacks)


def _mobility_mismatch(task, gap: dict) -> float:
    """Penalty if task requires stationary but gap is mobile."""
    is_mobile = gap.get("is_mobile", False)
    task_mobility = (_attr(task, "mobility_requirement", "stationary") or "stationary").lower()
    if is_mobile and task_mobility == "stationary":
        return 1.0
    return 0.0


def _location_mismatch(task, gap: dict) -> float:
    """Penalty if task requires home but gap is not at home (or vice versa)."""
    is_home = gap.get("is_home", False)
    task_location = (_attr(task, "location_requirement", "anywhere") or "anywhere").lower()
    if task_location == "home" and not is_home:
        return 1.0
    return 0.0


# ─── Utility helpers ─────────────────────────────────────────────────────────

def _attr(obj, field: str, default=None):
    """Get attribute from ORM object or dict."""
    if obj is None:
        return default
    if hasattr(obj, field):
        return getattr(obj, field)
    if isinstance(obj, dict):
        return obj.get(field, default)
    return default


def _get_fb_task_id(fb):
    """Extract task_id from FeedbackEvent ORM or dict via suggestion relationship."""
    # FeedbackEvent → suggestion → task_id
    suggestion = getattr(fb, "suggestion", None)
    if suggestion:
        return getattr(suggestion, "task_id", None)
    if isinstance(fb, dict):
        return fb.get("task_id")
    return None


def _get_fb_action(fb):
    if hasattr(fb, "action"):
        return fb.action
    if isinstance(fb, dict):
        return fb.get("action")
    return None
