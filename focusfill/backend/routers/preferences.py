from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.get("/", response_model=schemas.UserPreferenceOut)
def get_preferences(user_id: int = Query(...), db: Session = Depends(get_db)):
    """Get user preferences."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pref = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == user_id
    ).first()

    if not pref:
        pref = models.UserPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return schemas.UserPreferenceOut.model_validate(pref)


@router.put("/", response_model=schemas.UserPreferenceOut)
def update_preferences(
    body: schemas.UserPreferenceUpdate,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Upsert user preferences."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pref = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == user_id
    ).first()

    if pref:
        update_data = body.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pref, key, value)
    else:
        pref = models.UserPreference(user_id=user_id, **body.model_dump(exclude_unset=True))
        db.add(pref)

    db.commit()
    db.refresh(pref)
    return schemas.UserPreferenceOut.model_validate(pref)
