from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.post("/generate")
def generate_suggestions(user_id: int = Query(...), date: str = Query(None), db: Session = Depends(get_db)):
    """Stub: Generate suggestions for a given date."""
    return {"status": "stub", "message": "Suggestion generation not yet implemented", "user_id": user_id}


@router.get("/")
def get_suggestions(user_id: int = Query(...), db: Session = Depends(get_db)):
    """Stub: Get stored suggestions."""
    return {"status": "stub", "suggestions": [], "user_id": user_id}
