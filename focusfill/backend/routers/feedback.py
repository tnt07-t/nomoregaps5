from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import schemas

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/")
def submit_feedback(body: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    """Stub: Accept or reject a suggestion."""
    return {"status": "stub", "message": "Feedback not yet implemented", "body": body.model_dump()}
