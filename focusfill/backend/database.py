import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nomoregaps.db")

# Render/Railway often provide postgres://, SQLAlchemy expects postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_kwargs = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from models import (
        User, UserPreference, Goal, GoalTask,
        CalendarEvent, TimeBlock, Task, Suggestion, FeedbackEvent
    )
    Base.metadata.create_all(bind=engine)
    _migrate()


def _migrate():
    """Add new columns to existing tables without dropping data."""
    migrations = [
        "ALTER TABLE tasks ADD COLUMN daily_limit INTEGER",
        "ALTER TABLE tasks ADD COLUMN llm_generated BOOLEAN DEFAULT 0",
        "ALTER TABLE tasks ADD COLUMN weekly_limit INTEGER",
        "ALTER TABLE tasks ADD COLUMN priority_boost REAL DEFAULT 0.0",
        "ALTER TABLE goal_tasks ADD COLUMN daily_limit INTEGER",
        "ALTER TABLE goal_tasks ADD COLUMN weekly_limit INTEGER",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__("sqlalchemy").text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists — safe to ignore

        # Data fixups (idempotent)
        try:
            conn.execute(__import__("sqlalchemy").text(
                """
                UPDATE tasks
                SET min_duration = 60,
                    max_duration = 90,
                    effort_level = 'low',
                    daily_limit = 1,
                    weekly_limit = 1
                WHERE lower(title) LIKE '%laundry%'
                """
            ))
            conn.commit()
        except Exception:
            pass

        # Remove student-specific default wording for generic users.
        try:
            conn.execute(__import__("sqlalchemy").text(
                """
                UPDATE tasks
                SET title = 'Review Priority List',
                    category = 'Life Admin',
                    goal_tag = 'life_admin',
                    min_duration = 10,
                    max_duration = 25,
                    effort_level = 'low',
                    daily_limit = COALESCE(daily_limit, 1),
                    weekly_limit = COALESCE(weekly_limit, 5)
                WHERE source_type = 'system' AND lower(title) = 'review notes'
                """
            ))
            conn.commit()
        except Exception:
            pass

        # Backfill limits for legacy rows created before limit columns existed.
        try:
            conn.execute(__import__("sqlalchemy").text(
                """
                UPDATE tasks
                SET daily_limit = COALESCE(daily_limit, 2),
                    weekly_limit = COALESCE(weekly_limit, 10)
                WHERE daily_limit IS NULL OR weekly_limit IS NULL
                """
            ))
            conn.commit()
        except Exception:
            pass

        # Keep key system tasks bounded even on old databases.
        try:
            conn.execute(__import__("sqlalchemy").text(
                """
                UPDATE tasks
                SET daily_limit = 1,
                    weekly_limit = 5
                WHERE source_type = 'system' AND lower(title) IN ('prep agenda', 'reply to emails')
                """
            ))
            conn.commit()
        except Exception:
            pass
