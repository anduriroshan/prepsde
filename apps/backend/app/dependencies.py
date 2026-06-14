from fastapi import Request, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin.auth as firebase_auth
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    token = credentials.credentials
    try:
        decoded = firebase_auth.verify_id_token(token, check_revoked=True)
        uid = decoded["uid"]
        request.state.uid = uid
        return uid
    except firebase_auth.RevokedIdTokenError:
        logger.warning("Revoked token presented")
        raise HTTPException(status_code=401, detail="Token has been revoked")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except firebase_auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def verify_scheduler_token(x_scheduler_token: Optional[str] = Header(None)) -> None:
    if not x_scheduler_token or x_scheduler_token != settings.SCHEDULER_SECRET:
        raise HTTPException(status_code=403, detail="Scheduler token invalid")


async def get_db():
    from app.firebase import get_firestore_client
    db = get_firestore_client()
    try:
        yield db
    finally:
        pass
