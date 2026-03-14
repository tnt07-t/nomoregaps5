from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./nomoregaps.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

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
        "ALTER TABLE goal_tasks ADD COLUMN daily_limit INTEGER",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__("sqlalchemy").text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists — safe to ignore
