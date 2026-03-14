from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db, SessionLocal
import models
import schemas
from services.llm_service import generate_tasks_for_goal

router = APIRouter(prefix="/goals", tags=["goals"])


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

        for t in generated:
            task = models.GoalTask(
                goal_id=goal.id,
                user_id=goal.user_id,
                title=t["title"],
                estimated_minutes=t.get("estimated_minutes", 25),
                effort_level=t.get("effort_level", "medium"),
                location_requirement=t.get("location_requirement", "anywhere"),
                mobility_requirement=t.get("mobility_requirement", "stationary"),
                daily_limit=t.get("daily_limit", 2),
            )
            db.add(task)
        db.commit()
        print(f"[goals] Generated {len(generated)} LLM tasks for goal {goal_id}")
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

    # Trigger LLM task generation in background (only if no tasks were manually provided)
    if not body.tasks:
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

    db.delete(task)
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
