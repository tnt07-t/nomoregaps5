import json
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db, SessionLocal
import models
import schemas
from services.llm_service import generate_tasks_for_goal

router = APIRouter(prefix="/goals", tags=["goals"])


def _safe_json_loads(raw: Optional[str]) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _find_user_task_by_goal_task_id(db: Session, user_id: int, goal_task_id: int) -> Optional[models.Task]:
    candidates = db.query(models.Task).filter(models.Task.source_type == "user").all()
    for t in candidates:
        meta = _safe_json_loads(t.metadata_json)
        if meta.get("user_id") == user_id and meta.get("goal_task_id") == goal_task_id:
            return t
    return None


def _upsert_user_task_from_goal_task(
    db: Session,
    goal: models.Goal,
    goal_task: models.GoalTask,
    llm_generated: Optional[bool] = None,
) -> None:
    task = _find_user_task_by_goal_task_id(db, goal.user_id, goal_task.id)
    llm_value = llm_generated if llm_generated is not None else False

    est = goal_task.estimated_minutes or 25
    daily_limit = goal_task.daily_limit if goal_task.daily_limit is not None else 2
    weekly_limit = goal_task.weekly_limit if goal_task.weekly_limit is not None else max(5, daily_limit * 5)
    task_title_lower = (goal_task.title or "").lower()
    effort_level = goal_task.effort_level or "medium"
    location_requirement = goal_task.location_requirement or "anywhere"
    mobility_requirement = goal_task.mobility_requirement or "stationary"
    if "laundry" in task_title_lower:
        daily_limit = 1
        weekly_limit = 1
        est = max(est, 60)
        effort_level = "low"
        location_requirement = "home"
        mobility_requirement = "stationary"

    if not task:
        task = models.Task(
            title=goal_task.title,
            category=goal.category,
            source_type="user",
            min_duration=max(5, est - 5),
            max_duration=max(10, est + 10),
            effort_level=effort_level,
            location_requirement=location_requirement,
            mobility_requirement=mobility_requirement,
            setup_cost="low" if effort_level == "low" else "medium",
            goal_tag=goal.title,
            repeatable=True,
            daily_limit=daily_limit,
            weekly_limit=weekly_limit,
            llm_generated=llm_value,
        )
        db.add(task)
    else:
        task.title = goal_task.title
        task.category = goal.category
        task.min_duration = max(5, est - 5)
        task.max_duration = max(10, est + 10)
        task.effort_level = effort_level
        task.location_requirement = location_requirement
        task.mobility_requirement = mobility_requirement
        task.setup_cost = "low" if effort_level == "low" else "medium"
        task.goal_tag = goal.title
        task.daily_limit = daily_limit
        task.weekly_limit = weekly_limit
        task.llm_generated = task.llm_generated if llm_generated is None else llm_generated

    task.metadata_json = json.dumps(
        {
            "user_id": goal.user_id,
            "goal_id": goal.id,
            "goal_task_id": goal_task.id,
            "llm_generated": task.llm_generated,
        }
    )


def _sync_goal_tasks_to_user_library(db: Session, goal: models.Goal) -> None:
    for gt in goal.tasks:
        _upsert_user_task_from_goal_task(db, goal, gt, llm_generated=None)
    db.commit()


def _generate_and_save_tasks(goal_id: int) -> None:
    """Background task: call LLM to generate tasks for a goal and save as GoalTask records."""
    db = SessionLocal()
    try:
        goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
        if not goal:
            return

        # Get existing task titles to avoid duplicates
        existing_titles = [t.title for t in goal.tasks]

        weekly_hours = goal.weekly_target_minutes / 60.0
        generated = generate_tasks_for_goal(
            goal_title=goal.title,
            goal_category=goal.category,
            weekly_target_hours=weekly_hours,
            existing_task_titles=existing_titles,
        )

        added = 0
        seen = {title.strip().lower() for title in existing_titles}
        for t in generated:
            title = (t.get("title") or "").strip()
            if not title or title.lower() in seen:
                continue
            seen.add(title.lower())

            goal_task = models.GoalTask(
                goal_id=goal.id,
                user_id=goal.user_id,
                title=title,
                estimated_minutes=t.get("estimated_minutes", 25),
                effort_level=t.get("effort_level", "medium"),
                location_requirement=t.get("location_requirement", "anywhere"),
                mobility_requirement=t.get("mobility_requirement", "stationary"),
                daily_limit=t.get("daily_limit", 2),
                weekly_limit=t.get("weekly_limit", max(5, int(t.get("daily_limit", 2)) * 5)),
            )
            db.add(goal_task)
            db.flush()
            _upsert_user_task_from_goal_task(db, goal, goal_task, llm_generated=True)
            added += 1
        db.commit()
        print(f"[goals] Generated {added} LLM tasks for goal {goal_id}")
    except Exception as exc:
        print(f"[goals] LLM task generation failed for goal {goal_id}: {exc}")
    finally:
        db.close()


@router.get("/", response_model=List[schemas.GoalOut])
def get_goals(user_id: int = Query(...), db: Session = Depends(get_db)):
    """Return all goals with their tasks for a user."""
    goals = (
        db.query(models.Goal)
        .filter(models.Goal.user_id == user_id, models.Goal.is_active == True)
        .order_by(models.Goal.priority_order)
        .all()
    )
    return [schemas.GoalOut.model_validate(g) for g in goals]


@router.post("/", response_model=schemas.GoalOut)
def create_goal(body: schemas.GoalCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Create a new goal with optional tasks."""
    user = db.query(models.User).filter(models.User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Determine priority order (append at end)
    max_order = (
        db.query(models.Goal)
        .filter(models.Goal.user_id == body.user_id)
        .count()
    )

    goal = models.Goal(
        user_id=body.user_id,
        title=body.title,
        category=body.category,
        weekly_target_minutes=body.weekly_target_minutes,
        priority_order=body.priority_order if body.priority_order is not None else max_order,
        is_active=body.is_active if body.is_active is not None else True,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    # Add tasks if provided
    if body.tasks:
        for task_data in body.tasks:
            task = models.GoalTask(
                goal_id=goal.id,
                user_id=body.user_id,
                title=task_data.title,
                estimated_minutes=task_data.estimated_minutes,
                effort_level=task_data.effort_level,
                preferred_time_of_day=task_data.preferred_time_of_day,
                location_requirement=task_data.location_requirement,
                mobility_requirement=task_data.mobility_requirement,
            )
            db.add(task)
        db.commit()
        db.refresh(goal)

    # Sync manually-entered onboarding subtasks into the suggestion task library.
    _sync_goal_tasks_to_user_library(db, goal)

    # Always trigger one initial LLM generation after goal create.
    # This keeps calls scoped to goal create/update, while incorporating manual subtasks
    # as context (existing titles) to avoid duplicates.
    background_tasks.add_task(_generate_and_save_tasks, goal.id)

    return schemas.GoalOut.model_validate(goal)


@router.put("/{goal_id}", response_model=schemas.GoalOut)
def update_goal(goal_id: int, body: schemas.GoalUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Update a goal."""
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(goal, key, value)

    db.commit()
    db.refresh(goal)

    _sync_goal_tasks_to_user_library(db, goal)

    # Regenerate LLM tasks when goal title/category/target changes
    if any(k in update_data for k in ("title", "category", "weekly_target_minutes")):
        background_tasks.add_task(_generate_and_save_tasks, goal.id)

    return schemas.GoalOut.model_validate(goal)


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    """Soft-delete a goal (mark inactive)."""
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.is_active = False
    db.commit()
    return {"success": True, "goal_id": goal_id}


@router.post("/{goal_id}/tasks", response_model=schemas.GoalTaskOut)
def add_task_to_goal(
    goal_id: int,
    body: schemas.GoalTaskBase,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Add a task to an existing goal."""
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    task = models.GoalTask(
        goal_id=goal_id,
        user_id=user_id,
        title=body.title,
        estimated_minutes=body.estimated_minutes,
        effort_level=body.effort_level,
        preferred_time_of_day=body.preferred_time_of_day,
        location_requirement=body.location_requirement,
        mobility_requirement=body.mobility_requirement,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    _upsert_user_task_from_goal_task(db, goal, task, llm_generated=False)
    db.commit()
    return schemas.GoalTaskOut.model_validate(task)


@router.put("/{goal_id}/tasks/{task_id}", response_model=schemas.GoalTaskOut)
def update_task(
    goal_id: int,
    task_id: int,
    body: schemas.GoalTaskUpdate,
    db: Session = Depends(get_db),
):
    """Update a goal task."""
    task = db.query(models.GoalTask).filter(
        models.GoalTask.id == task_id,
        models.GoalTask.goal_id == goal_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if goal:
        _upsert_user_task_from_goal_task(db, goal, task, llm_generated=False)
        db.commit()
    return schemas.GoalTaskOut.model_validate(task)


@router.delete("/{goal_id}/tasks/{task_id}")
def delete_task(goal_id: int, task_id: int, db: Session = Depends(get_db)):
    """Delete a goal task."""
    task = db.query(models.GoalTask).filter(
        models.GoalTask.id == task_id,
        models.GoalTask.goal_id == goal_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = task.user_id
    db.delete(task)
    db.commit()

    mapped = _find_user_task_by_goal_task_id(db, user_id, task_id)
    if mapped:
        db.delete(mapped)
        db.commit()

    return {"success": True, "task_id": task_id}


@router.put("/reorder", response_model=List[schemas.GoalOut])
def reorder_goals(body: schemas.GoalReorderRequest, db: Session = Depends(get_db)):
    """Update priority_order for multiple goals."""
    updated = []
    for item in body.goals:
        goal = db.query(models.Goal).filter(models.Goal.id == item.goal_id).first()
        if goal:
            goal.priority_order = item.priority_order
            updated.append(goal)

    db.commit()
    for g in updated:
        db.refresh(g)

    return [schemas.GoalOut.model_validate(g) for g in updated]
