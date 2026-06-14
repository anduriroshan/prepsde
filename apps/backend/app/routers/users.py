import logging
from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1 import AsyncClient

from app.dependencies import get_current_user, get_db
from app.models.users import UserOnboard, UserUpdate, UserResponse
from app.repositories import users as users_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/onboard", response_model=UserResponse, status_code=201)
async def onboard_user(
    body: UserOnboard,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        existing = await users_repo.get_user(db, uid)
        if existing:
            raise HTTPException(status_code=409, detail="User already onboarded")

        user_data = {
            "email": body.email,
            "name": body.name,
            "targetRole": body.targetRole,
            "targetCompany": body.targetCompany,
            "startDate": body.startDate,
            "targetDate": body.targetDate,
            "originalDeadline": body.targetDate,
            "focusAreas": body.focusAreas,
        }

        created = await users_repo.create_user(db, uid, user_data)
        return UserResponse(**created)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error onboarding user uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to onboard user")


@router.get("/me", response_model=UserResponse)
async def get_me(
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        user = await users_repo.get_user(db, uid)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        user = await users_repo.get_user(db, uid)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        updates = body.model_dump(exclude_none=True)
        if updates:
            await users_repo.update_user(db, uid, updates)

        updated = await users_repo.get_user(db, uid)
        return UserResponse(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")
