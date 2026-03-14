"""
Seed default system tasks on startup.
Runs as an idempotent upsert.
"""
from sqlalchemy.orm import Session

import models


SEED_TASKS = [
    # Career
    {"title": "Prep Agenda", "category": "Career", "source_type": "system", "min_duration": 10, "max_duration": 20, "effort_level": "low", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "career", "repeatable": True, "daily_limit": 1, "weekly_limit": 3},
    {"title": "Reply to Emails", "category": "Career", "source_type": "system", "min_duration": 10, "max_duration": 25, "effort_level": "low", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "career", "repeatable": True, "daily_limit": 1, "weekly_limit": 5},
    {"title": "Review Priority List", "category": "Life Admin", "source_type": "system", "min_duration": 10, "max_duration": 25, "effort_level": "low", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "life_admin", "repeatable": True, "daily_limit": 1, "weekly_limit": 5},
    {"title": "Draft One Follow-up", "category": "Career", "source_type": "system", "min_duration": 15, "max_duration": 30, "effort_level": "medium", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "career", "repeatable": True, "daily_limit": 1, "weekly_limit": 4},
    # Learning
    {"title": "Skill Drill Practice", "category": "Learning", "source_type": "system", "min_duration": 20, "max_duration": 40, "effort_level": "medium", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "learning", "repeatable": True, "daily_limit": 2, "weekly_limit": 8},
    {"title": "Read One Deep-dive Article", "category": "Learning", "source_type": "system", "min_duration": 20, "max_duration": 35, "effort_level": "low", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "learning", "repeatable": True, "daily_limit": 1, "weekly_limit": 5},
    {"title": "Work on Project Milestone", "category": "Learning", "source_type": "system", "min_duration": 30, "max_duration": 60, "effort_level": "high", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "medium", "goal_tag": "learning", "repeatable": True, "daily_limit": 1, "weekly_limit": 4},
    # Health
    {"title": "Walk and Reset", "category": "Health", "source_type": "system", "min_duration": 15, "max_duration": 30, "effort_level": "low", "location_requirement": "anywhere", "mobility_requirement": "mobile", "setup_cost": "low", "goal_tag": "health", "repeatable": True, "daily_limit": 2, "weekly_limit": 7},
    {"title": "Mobility Stretch Session", "category": "Health", "source_type": "system", "min_duration": 10, "max_duration": 20, "effort_level": "low", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "health", "repeatable": True, "daily_limit": 2, "weekly_limit": 6},
    {"title": "Hydration and Breathing Reset", "category": "Health", "source_type": "system", "min_duration": 5, "max_duration": 12, "effort_level": "low", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "health", "repeatable": True, "daily_limit": 2, "weekly_limit": 10},
    # Life admin
    {"title": "Plan Meals and Grocery List", "category": "Life Admin", "source_type": "system", "min_duration": 15, "max_duration": 30, "effort_level": "low", "location_requirement": "home", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "life_admin", "repeatable": True, "daily_limit": 1, "weekly_limit": 2},
    {"title": "Do Laundry", "category": "Life Admin", "source_type": "system", "min_duration": 60, "max_duration": 90, "effort_level": "low", "location_requirement": "home", "mobility_requirement": "stationary", "setup_cost": "low", "goal_tag": "life_admin", "repeatable": True, "daily_limit": 1, "weekly_limit": 1},
]


def seed_tasks(db: Session) -> None:
    """Ensure system task library is present and up to date."""
    existing_system = (
        db.query(models.Task)
        .filter(models.Task.source_type == "system")
        .all()
    )
    index = {(t.title.strip().lower(), t.source_type): t for t in existing_system}

    added = 0
    updated = 0
    for task_data in SEED_TASKS:
        key = (task_data["title"].strip().lower(), task_data["source_type"])
        existing = index.get(key)
        if not existing:
            db.add(models.Task(**task_data))
            added += 1
            continue

        for field, value in task_data.items():
            setattr(existing, field, value)
        updated += 1

    db.commit()
    print(f"[seed_tasks] System tasks upserted (added={added}, updated={updated}).")
