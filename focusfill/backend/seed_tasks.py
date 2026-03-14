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
    {"title": "Exercise/Stretch",    "category": "Health",     "source_type": "system", "min_duration": 10, "max_duration": 20, "effort_level": "low",    "location_requirement": "anywhere", "mobility_requirement": "stationary", "setup_cost": "low",    "goal_tag": "health",     "repeatable": True, "daily_limit": 2, "weekly_limit": 1},
]


def seed_tasks(db: Session) -> None:
    """Seed common tasks for users."""
    count = db.query(models.Task).count()
    for task_data in SEED_TASKS:
        task = models.Task(**task_data)
        db.add(task)
    db.commit()
    print(f"[seed_tasks] Seeded {len(SEED_TASKS)} default tasks.")
