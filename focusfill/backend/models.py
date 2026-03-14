from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    timezone = Column(String, default="America/New_York")
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    goals = relationship("Goal", back_populates="user")
    calendar_events = relationship("CalendarEvent", back_populates="user")
    time_blocks = relationship("TimeBlock", back_populates="user")
    suggestions = relationship("Suggestion", back_populates="user")
    feedback_events = relationship("FeedbackEvent", back_populates="user")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    transition_buffer_minutes = Column(Integer, default=10)
    min_gap_minutes = Column(Integer, default=15)
    max_gap_minutes = Column(Integer, default=90)
    enable_podcasts = Column(Boolean, default=False)
    work_start_hour = Column(Integer, default=8)
    work_end_hour = Column(Integer, default=22)
    energy_mode = Column(String, default="productive")

    user = relationship("User", back_populates="preferences")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Career, Learning, Health, LifeAdmin
    weekly_target_minutes = Column(Integer, default=60)
    priority_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="goals")
    tasks = relationship("GoalTask", back_populates="goal", cascade="all, delete-orphan")


class GoalTask(Base):
    __tablename__ = "goal_tasks"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    estimated_minutes = Column(Integer, default=25)
    effort_level = Column(String, default="medium")  # low, medium, high
    preferred_time_of_day = Column(String, default="any")  # any, morning, afternoon, evening
    location_requirement = Column(String, default="anywhere")  # anywhere, home, office
    mobility_requirement = Column(String, default="stationary")  # stationary, mobile
    created_at = Column(DateTime, server_default=func.now())

    goal = relationship("Goal", back_populates="tasks")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gcal_event_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    event_type = Column(String, default="work")  # work, personal, focus, commute
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="calendar_events")


class TimeBlock(Base):
    __tablename__ = "time_blocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    prev_event_id = Column(Integer, ForeignKey("calendar_events.id"), nullable=True)
    next_event_id = Column(Integer, ForeignKey("calendar_events.id"), nullable=True)
    is_mobile = Column(Boolean, default=False)
    is_home = Column(Boolean, default=False)
    low_setup_only = Column(Boolean, default=False)

    user = relationship("User", back_populates="time_blocks")
    suggestions = relationship("Suggestion", back_populates="time_block")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    source_type = Column(String, default="system")  # system, user
    min_duration = Column(Integer, default=15)
    max_duration = Column(Integer, default=60)
    effort_level = Column(String, default="medium")
    location_requirement = Column(String, default="anywhere")
    mobility_requirement = Column(String, default="stationary")
    setup_cost = Column(String, default="low")
    goal_tag = Column(String, nullable=True)
    repeatable = Column(Boolean, default=True)
    metadata_json = Column(Text, nullable=True)

    suggestions = relationship("Suggestion", back_populates="task")


class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    time_block_id = Column(Integer, ForeignKey("time_blocks.id"), nullable=False)
    score = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, accepted, rejected
    gcal_event_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="suggestions")
    task = relationship("Task", back_populates="suggestions")
    time_block = relationship("TimeBlock", back_populates="suggestions")
    feedback_events = relationship("FeedbackEvent", back_populates="suggestion")


class FeedbackEvent(Base):
    __tablename__ = "feedback_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    suggestion_id = Column(Integer, ForeignKey("suggestions.id"), nullable=False)
    action = Column(String, nullable=False)  # accepted, rejected
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="feedback_events")
    suggestion = relationship("Suggestion", back_populates="feedback_events")
