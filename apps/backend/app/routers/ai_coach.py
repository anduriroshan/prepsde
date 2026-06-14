import logging
from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1 import AsyncClient

from app.dependencies import get_current_user, get_db
from app.models.ai_coach import CoachRequest, CoachResponse
from app.services.ai_coach import (
    prescreen_reflection,
    check_gemini_quota,
    record_gemini_call,
    call_gemini,
    hardcoded_lazy_response,
    hardcoded_surface_response,
    hardcoded_quota_exceeded_response,
    PreScreenResult,
)
from app.repositories import reflections as reflections_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/coach", response_model=CoachResponse)
async def coach(
    body: CoachRequest,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        # Step 1: Pre-screen — too_short check first
        prescreen_result, prescreen_message = prescreen_reflection(body.content)

        if prescreen_result == PreScreenResult.TOO_SHORT:
            return hardcoded_lazy_response()

        # Step 2: no_keywords check
        if prescreen_result == PreScreenResult.NO_KEYWORDS:
            return hardcoded_surface_response("no_keywords")

        # Step 3: Check Gemini quota
        quota_available = await check_gemini_quota(uid, db)
        if not quota_available:
            return hardcoded_quota_exceeded_response()

        # Step 4: Call Gemini; on ANY failure return hardcoded_surface_response
        try:
            coach_response = await call_gemini(body.content, body.rating, uid)
        except Exception as e:
            logger.error(f"Gemini failed for uid={uid}, returning surface response: {e}")
            return hardcoded_surface_response("passed")

        # Step 5: On success only — write back to reflection doc and update quota
        try:
            await reflections_repo.update_reflection(db, body.reflectionId, {
                "aiVerdict": coach_response.verdict,
                "aiMessage": coach_response.feedback,
                "microLesson": {
                    "title": coach_response.lessonTitle,
                    "content": coach_response.lessonContent,
                },
                "prescreenResult": "passed",
                "geminiCalled": True,
            })
        except Exception as e:
            logger.error(f"Failed to update reflection {body.reflectionId} with AI verdict: {e}")
            # Do not fail the request if reflection update fails

        try:
            await record_gemini_call(uid, db)
        except Exception as e:
            logger.error(f"Failed to record Gemini call for uid={uid}: {e}")
            # Do not fail the request if quota update fails

        return coach_response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in AI coach for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="AI coach evaluation failed")
