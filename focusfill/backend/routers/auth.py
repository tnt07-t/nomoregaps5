import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/auth", tags=["auth"])

USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "true").lower() == "true"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")


def _frontend_url() -> str:
    single = (os.getenv("FRONTEND_URL") or "").strip()
    if single:
        return single.rstrip("/")

    multi = (os.getenv("FRONTEND_URLS") or "").strip()
    if multi:
        for candidate in multi.split(","):
            cleaned = candidate.strip().rstrip("/")
            if cleaned:
                return cleaned

    return "http://localhost:3000"


@router.get("/google")
def google_oauth_start():
    """Redirect to Google OAuth consent screen."""
    if USE_MOCK_DATA:
        raise HTTPException(status_code=400, detail="Mock mode enabled. Use /auth/mock-login instead.")

    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uris": [GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/calendar",
        ],
        redirect_uri=GOOGLE_REDIRECT_URI,
    )

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    return RedirectResponse(url=authorization_url)


@router.get("/google/callback")
def google_oauth_callback(
    code: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback."""
    frontend_url = _frontend_url()

    if error:
        return RedirectResponse(url=f"{frontend_url}?error={error}")

    if not code:
        return RedirectResponse(url=f"{frontend_url}?error=no_code")

    try:
        from google_auth_oauthlib.flow import Flow
        from googleapiclient.discovery import build

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uris": [GOOGLE_REDIRECT_URI],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/calendar",
            ],
            redirect_uri=GOOGLE_REDIRECT_URI,
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        service = build("oauth2", "v2", credentials=credentials)
        user_info = service.userinfo().get().execute()

        google_id = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name", email)
        picture = user_info.get("picture")

        # Upsert user
        user = db.query(models.User).filter(models.User.google_id == google_id).first()
        if not user:
            user = db.query(models.User).filter(models.User.email == email).first()

        if user:
            user.google_id = google_id
            user.name = name
            user.picture = picture
            user.access_token = credentials.token
            user.refresh_token = credentials.refresh_token or user.refresh_token
        else:
            user = models.User(
                google_id=google_id,
                email=email,
                name=name,
                picture=picture,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
            )
            db.add(user)

        db.commit()
        db.refresh(user)

        # Create default preferences if not exist
        if not user.preferences:
            pref = models.UserPreference(user_id=user.id)
            db.add(pref)
            db.commit()

        return RedirectResponse(url=f"{frontend_url}/auth/callback?user_id={user.id}")

    except Exception as e:
        return RedirectResponse(url=f"{frontend_url}?error=oauth_failed&detail={str(e)[:100]}")


@router.post("/mock-login")
def mock_login(db: Session = Depends(get_db)):
    """Create or return demo user for dev/mock mode."""
    demo_email = "demo@nomoregaps.app"

    user = db.query(models.User).filter(models.User.email == demo_email).first()
    if not user:
        user = models.User(
            email=demo_email,
            name="Demo User",
            picture=None,
            google_id=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.preferences:
        pref = models.UserPreference(user_id=user.id)
        db.add(pref)
        db.commit()
        db.refresh(user)

    return {"user_id": user.id, "name": user.name, "email": user.email}


@router.get("/me")
def get_me(user_id: int = Query(...), db: Session = Depends(get_db)):
    """Return user + preferences."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pref = user.preferences
    pref_out = schemas.UserPreferenceOut.model_validate(pref) if pref else None

    return schemas.UserWithPreferences(
        user=schemas.UserOut.model_validate(user),
        preferences=pref_out,
    )
