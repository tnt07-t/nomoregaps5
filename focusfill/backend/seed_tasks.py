"""
Seed 12 default tasks on startup (only if the tasks table is empty).
"""
from sqlalchemy.orm import Session
import models


SEED_TASKS = [
    # daily_limit: max suggestions per day | weekly_limit: max per week
    {"title": "Prep Agenda",              "category": "Career",     "source_type": "system", "min_duration": 10, "max_duration": 20, "effort_level": "low",    "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "career",     "repeatable": True, "daily_limit": 1, "weekly_limit": 3},
    {"title": "Reply to Emails",          "category": "Career",     "source_type": "system", "min_duration": 10, "max_duration": 30, "effort_level": "low",    "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "career",     "repeatable": True, "daily_limit": 1, "weekly_limit": 5},
    {"title": "Tidy Desk / Quick Reset",  "category": "Life Admin", "source_type": "system", "min_duration": 10, "max_duration": 15, "effort_level": "low",    "location_requirement": "home",     "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "life_admin", "repeatable": True, "daily_limit": 1, "weekly_limit": 3},
    {"title": "Do Laundry",               "category": "Life Admin", "source_type": "system", "min_duration": 60, "max_duration": 90, "effort_level": "low",    "location_requirement": "home",     "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "life_admin", "repeatable": True, "daily_limit": 1, "weekly_limit": 1},
    {"title": "Prep Ingredients",         "category": "Life Admin", "source_type": "system", "min_duration": 15, "max_duration": 30, "effort_level": "medium", "location_requirement": "home",     "mobility_requirement": "stationary", "setup_cost": "medium", "goal_tag": "life_admin", "repeatable": True, "daily_limit": 1, "weekly_limit": 4},
    {"title": "Apply to One Job",         "category": "Career",     "source_type": "system", "min_duration": 25, "max_duration": 45, "effort_level": "medium", "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "medium", "goal_tag": "career",     "repeatable": True, "daily_limit": 2, "weekly_limit": 7},
    {"title": "Language Practice",        "category": "Learning",   "source_type": "system", "min_duration": 15, "max_duration": 30, "effort_level": "low",    "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "learning",   "repeatable": True, "daily_limit": 2, "weekly_limit": 12},
    {"title": "Podcast", "category": "Career",     "source_type": "system", "min_duration": 15, "max_duration": 30, "effort_level": "low",    "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "career",     "repeatable": True, "daily_limit": 1, "weekly_limit": 5},
    {"title": "Stretching / Mobility",    "category": "Health",     "source_type": "system", "min_duration": 10, "max_duration": 20, "effort_level": "low",    "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "health",     "repeatable": True, "daily_limit": 2, "weekly_limit": 10},
    {"title": "Read Articles / Newsletter","category": "Learning",  "source_type": "system", "min_duration": 15, "max_duration": 30, "effort_level": "low",    "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "learning",   "repeatable": True, "daily_limit": 2, "weekly_limit": 10},
]


def seed_tasks(db: Session) -> None:
    """Seed tasks if the table is empty."""
    count = db.query(models.Task).count()
    if count > 0:
        return
    for task_data in SEED_TASKS:
        task = models.Task(**task_data)
        db.add(task)
    db.commit()
    print(f"[seed_tasks] Seeded {len(SEED_TASKS)} default tasks.")
