from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── User ────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    timezone: Optional[str] = "America/New_York"


class UserCreate(UserBase):
    google_id: Optional[str] = None


class UserOut(UserBase):
    id: int
    google_id: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── UserPreference ───────────────────────────────────────────────────────────

class UserPreferenceBase(BaseModel):
    transition_buffer_minutes: Optional[int] = 10
    min_gap_minutes: Optional[int] = 15
    max_gap_minutes: Optional[int] = 90
    enable_podcasts: Optional[bool] = False
    work_start_hour: Optional[int] = 8
    work_end_hour: Optional[int] = 22
    energy_mode: Optional[str] = "productive"


class UserPreferenceCreate(UserPreferenceBase):
    user_id: int


class UserPreferenceUpdate(UserPreferenceBase):
    pass


class UserPreferenceOut(UserPreferenceBase):
    id: int
    user_id: int

    model_config = {"from_attributes": True}


# ─── GoalTask ─────────────────────────────────────────────────────────────────

class GoalTaskBase(BaseModel):
    title: str
    estimated_minutes: Optional[int] = 25
    effort_level: Optional[str] = "medium"
    preferred_time_of_day: Optional[str] = "any"
    location_requirement: Optional[str] = "anywhere"
    mobility_requirement: Optional[str] = "stationary"


class GoalTaskCreate(GoalTaskBase):
    goal_id: int
    user_id: int


class GoalTaskUpdate(GoalTaskBase):
    pass


class GoalTaskOut(GoalTaskBase):
    id: int
    goal_id: int
    user_id: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Goal ─────────────────────────────────────────────────────────────────────

class GoalBase(BaseModel):
    title: str
    category: str
    weekly_target_minutes: Optional[int] = 60
    priority_order: Optional[int] = 0
    is_active: Optional[bool] = True


class GoalCreate(GoalBase):
    user_id: int
    tasks: Optional[List[GoalTaskBase]] = []


class GoalUpdate(GoalBase):
    pass


class GoalOut(GoalBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    tasks: List[GoalTaskOut] = []

    model_config = {"from_attributes": True}


class GoalReorderItem(BaseModel):
    goal_id: int
    priority_order: int


class GoalReorderRequest(BaseModel):
    goals: List[GoalReorderItem]


# ─── CalendarEvent ────────────────────────────────────────────────────────────

class CalendarEventBase(BaseModel):
    gcal_event_id: Optional[str] = None
    title: str
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = "work"


class CalendarEventCreate(CalendarEventBase):
    user_id: int


class CalendarEventOut(CalendarEventBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── TimeBlock ────────────────────────────────────────────────────────────────

class TimeBlockOut(BaseModel):
    id: int
    user_id: int
    date: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    prev_event_id: Optional[int] = None
    next_event_id: Optional[int] = None
    is_mobile: bool
    is_home: bool
    low_setup_only: bool

    model_config = {"from_attributes": True}


# ─── Task ─────────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: int
    title: str
    category: str
    source_type: str
    min_duration: int
    max_duration: int
    effort_level: str
    location_requirement: str
    mobility_requirement: str
    setup_cost: str
    goal_tag: Optional[str] = None
    repeatable: bool

    model_config = {"from_attributes": True}


# ─── Suggestion ───────────────────────────────────────────────────────────────

class SuggestionOut(BaseModel):
    id: int
    user_id: int
    task_id: int
    time_block_id: int
    score: float
    reason: Optional[str] = None
    status: str
    gcal_event_id: Optional[str] = None
    created_at: Optional[datetime] = None
    task: Optional[TaskOut] = None
    time_block: Optional[TimeBlockOut] = None

    model_config = {"from_attributes": True}


# ─── FeedbackEvent ────────────────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    user_id: int
    suggestion_id: int
    action: str  # accepted, rejected


class FeedbackOut(BaseModel):
    id: int
    user_id: int
    suggestion_id: int
    action: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserWithPreferences(BaseModel):
    user: UserOut
    preferences: Optional[UserPreferenceOut] = None

    model_config = {"from_attributes": True}
