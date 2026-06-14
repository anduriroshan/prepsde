import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1 import AsyncClient
import httpx

from app.dependencies import get_current_user, get_db
from app.models.integrations import (
    LeetCodeConnectRequest,
    LeetCodeConnectResponse,
    SyncResponse,
    IntegrationStatusResponse,
    VerifiedByDifficulty,
    NewSolveItem,
    VerifiedSolveItem,
    VerifiedSolvesResponse,
)
from app.repositories import leetcode_integrations as lc_repo
from app.repositories import problems as problems_repo
from app.services.leetcode_sync import (
    fetch_accepted_submissions,
    fetch_progress,
    generate_gap_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])

SYNC_COOLDOWN_HOURS = 6


@router.post("/leetcode/connect", response_model=LeetCodeConnectResponse, status_code=201)
async def connect_leetcode(
    body: LeetCodeConnectRequest,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        # 409 if already active
        existing = await lc_repo.get_integration(db, uid)
        if existing and existing.get("isActive"):
            raise HTTPException(
                status_code=409,
                detail="LeetCode already connected. Disconnect first to reconnect.",
            )

        # Fetch submissions with 10s timeout to establish baseline
        try:
            data = await fetch_accepted_submissions(
                body.leetcodeUsername, limit=5000, timeout=10.0
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=503,
                detail="LeetCode API timed out. Please try again.",
            )
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"LeetCode username '{body.leetcodeUsername}' not found.",
                )
            raise HTTPException(
                status_code=503,
                detail=f"LeetCode API error: {e.response.status_code}",
            )
        except Exception as e:
            logger.error(f"LeetCode API error during connect for uid={uid}: {e}")
            raise HTTPException(
                status_code=503,
                detail="LeetCode API unavailable. Please try again later.",
            )

        # Extract all accepted slugs as baseline
        submissions = data.get("submission", data.get("data", []))
        if not isinstance(submissions, list):
            submissions = []

        # Deduplicate by titleSlug, keep earliest timestamp
        slug_map: dict[str, dict] = {}
        for sub in submissions:
            slug = sub.get("titleSlug", "")
            if not slug:
                continue
            ts = int(sub.get("timestamp", 0))
            if slug not in slug_map or ts < slug_map[slug]["ts"]:
                slug_map[slug] = {"ts": ts, "title": sub.get("title", slug)}

        baseline_slugs = list(slug_map.keys())
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # Get user's plan start
        from app.repositories import users as users_repo
        user_data = await users_repo.get_user(db, uid)
        plan_start_unix = 0
        if user_data:
            start_str = user_data.get("startDate", "")
            if start_str:
                try:
                    from datetime import date
                    plan_start = date.fromisoformat(start_str)
                    plan_start_unix = int(
                        datetime(plan_start.year, plan_start.month, plan_start.day,
                                 tzinfo=timezone.utc).timestamp()
                    )
                except ValueError:
                    pass

        # Store baseline
        baseline_data = {
            "uid": uid,
            "capturedAt": now_iso,
            "slugs": baseline_slugs,
            "slugCount": len(baseline_slugs),
        }
        await lc_repo.create_baseline(db, uid, baseline_data)

        # Create or update integration doc
        integration_data = {
            "uid": uid,
            "leetcodeUsername": body.leetcodeUsername,
            "connectedAt": now_iso,
            "planStartUnix": plan_start_unix,
            "baselineCapturedAt": now_iso,
            "baselineSlugCount": len(baseline_slugs),
            "lastSyncAt": None,
            "lastSyncStatus": None,
            "lastSyncErrorMessage": None,
            "verifiedSolvesCount": 0,
            "verifiedEasy": 0,
            "verifiedMedium": 0,
            "verifiedHard": 0,
            "prepsdeProblemsSolved": 0,
            "gapMessage": "",
            "isActive": True,
            "baselineEasy": 0,
            "baselineMedium": 0,
            "baselineHard": 0,
        }
        await lc_repo.create_integration(db, uid, integration_data)

        return LeetCodeConnectResponse(
            leetcodeUsername=body.leetcodeUsername,
            connectedAt=now_iso,
            baselineSlugCount=len(baseline_slugs),
            message=f"Connected successfully. Captured {len(baseline_slugs)} baseline problems.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting LeetCode for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect LeetCode")


@router.post("/leetcode/sync", response_model=SyncResponse)
async def sync_leetcode(
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        integration = await lc_repo.get_integration(db, uid)
        if not integration or not integration.get("isActive"):
            raise HTTPException(status_code=404, detail="No active LeetCode integration found")

        username = integration.get("leetcodeUsername", "")
        plan_start_unix = integration.get("planStartUnix", 0)

        # 6-hour cooldown check
        last_sync_at = integration.get("lastSyncAt")
        if last_sync_at:
            try:
                last_sync_dt = datetime.fromisoformat(last_sync_at.replace("Z", "+00:00"))
                cooldown_until = last_sync_dt + timedelta(hours=SYNC_COOLDOWN_HOURS)
                now_utc = datetime.now(timezone.utc)
                if now_utc < cooldown_until:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Sync available after {cooldown_until.isoformat()}",
                        headers={"Retry-After": cooldown_until.isoformat()},
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        # Get baseline slugs
        baseline = await lc_repo.get_baseline(db, uid)
        baseline_slugs: set[str] = set()
        if baseline:
            baseline_slugs = set(baseline.get("slugs", []))

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # Fetch recent submissions with 5s timeout
        # On ANY API error return HTTP 200 with stale data
        try:
            data = await fetch_accepted_submissions(username, limit=500, timeout=5.0)
        except Exception as e:
            logger.warning(f"LeetCode API error during sync for uid={uid}: {e}")
            # Return stale data
            await lc_repo.update_integration(db, uid, {
                "lastSyncAt": now_iso,
                "lastSyncStatus": "api_error",
                "lastSyncErrorMessage": str(e),
            })
            prepsde_solved = integration.get("prepsdeProblemsSolved", 0)
            verified_count = integration.get("verifiedSolvesCount", 0)
            return SyncResponse(
                lastSyncAt=now_iso,
                lastSyncStatus="api_error",
                verifiedSolvesCount=verified_count,
                verifiedByDifficulty=VerifiedByDifficulty(
                    easy=integration.get("verifiedEasy", 0),
                    medium=integration.get("verifiedMedium", 0),
                    hard=integration.get("verifiedHard", 0),
                ),
                newSolvesThisSync=[],
                prepsdeProblemsSolved=prepsde_solved,
                gapMessage=integration.get("gapMessage", ""),
            )

        submissions = data.get("submission", data.get("data", []))
        if not isinstance(submissions, list):
            submissions = []

        # Deduplicate by titleSlug, keep earliest timestamp
        slug_map: dict[str, dict] = {}
        for sub in submissions:
            slug = sub.get("titleSlug", "")
            if not slug:
                continue
            ts = int(sub.get("timestamp", 0))
            if slug not in slug_map or ts < slug_map[slug]["ts"]:
                slug_map[slug] = {
                    "ts": ts,
                    "title": sub.get("title", slug),
                    "lang": sub.get("lang", ""),
                    "difficulty": sub.get("difficulty", ""),
                }

        # Filter: timestamp > planStartUnix AND slug NOT IN baseline_slugs
        new_solves: list[dict] = []
        for slug, info in slug_map.items():
            if info["ts"] > plan_start_unix and slug not in baseline_slugs:
                new_solves.append({
                    "titleSlug": slug,
                    "title": info["title"],
                    "ts": info["ts"],
                    "lang": info["lang"],
                    "difficulty": info["difficulty"].lower(),
                })

        # Count difficulty
        easy_count = sum(1 for s in new_solves if s["difficulty"] == "easy")
        medium_count = sum(1 for s in new_solves if s["difficulty"] == "medium")
        hard_count = sum(1 for s in new_solves if s["difficulty"] == "hard")

        # Get current user's logged problems to check alreadyInLog
        all_user_problems = await problems_repo.get_all_problems(db, uid)
        logged_problem_names = {p["name"].lower().strip() for p in all_user_problems}

        # Fetch existing verified solves
        existing_verified = await lc_repo.get_verified_solves(db, uid, limit=1000)
        existing_slugs = {v["titleSlug"] for v in existing_verified}

        new_solves_this_sync: list[NewSolveItem] = []

        for solve in new_solves:
            slug = solve["titleSlug"]
            already_in_log = solve["title"].lower().strip() in logged_problem_names
            solve_dt = datetime.fromtimestamp(solve["ts"], tz=timezone.utc).isoformat()

            # Upsert verified solve
            await lc_repo.upsert_verified_solve(db, uid, slug, {
                "titleSlug": slug,
                "title": solve["title"],
                "solvedAt": solve_dt,
                "lcTimestamp": solve["ts"],
                "lang": solve["lang"],
                "matchedProblemId": None,
                "promptedToLog": False,
            })

            if slug not in existing_slugs:
                new_solves_this_sync.append(NewSolveItem(
                    titleSlug=slug,
                    title=solve["title"],
                    solvedAt=solve_dt,
                    lang=solve["lang"],
                    alreadyInLog=already_in_log,
                ))

        total_verified = len(new_solves)
        prepsde_problems_solved = len(all_user_problems)
        gap_message = generate_gap_message(total_verified, prepsde_problems_solved)

        # Update integration doc
        await lc_repo.update_integration(db, uid, {
            "lastSyncAt": now_iso,
            "lastSyncStatus": "success",
            "lastSyncErrorMessage": None,
            "verifiedSolvesCount": total_verified,
            "verifiedEasy": easy_count,
            "verifiedMedium": medium_count,
            "verifiedHard": hard_count,
            "prepsdeProblemsSolved": prepsde_problems_solved,
            "gapMessage": gap_message,
        })

        return SyncResponse(
            lastSyncAt=now_iso,
            lastSyncStatus="success",
            verifiedSolvesCount=total_verified,
            verifiedByDifficulty=VerifiedByDifficulty(
                easy=easy_count,
                medium=medium_count,
                hard=hard_count,
            ),
            newSolvesThisSync=new_solves_this_sync,
            prepsdeProblemsSolved=prepsde_problems_solved,
            gapMessage=gap_message,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing LeetCode for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync LeetCode")


@router.get("/leetcode", response_model=IntegrationStatusResponse)
async def get_integration_status(
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        integration = await lc_repo.get_integration(db, uid)
        if not integration or not integration.get("isActive"):
            return IntegrationStatusResponse(connected=False)

        last_sync_at = integration.get("lastSyncAt")
        next_sync_available_at = None
        if last_sync_at:
            try:
                last_sync_dt = datetime.fromisoformat(last_sync_at.replace("Z", "+00:00"))
                next_sync_available_at = (
                    last_sync_dt + timedelta(hours=SYNC_COOLDOWN_HOURS)
                ).isoformat()
            except Exception:
                pass

        verified_easy = integration.get("verifiedEasy", 0)
        verified_medium = integration.get("verifiedMedium", 0)
        verified_hard = integration.get("verifiedHard", 0)

        return IntegrationStatusResponse(
            connected=True,
            leetcodeUsername=integration.get("leetcodeUsername"),
            connectedAt=integration.get("connectedAt"),
            baselineSlugCount=integration.get("baselineSlugCount"),
            lastSyncAt=last_sync_at,
            lastSyncStatus=integration.get("lastSyncStatus"),
            verifiedSolvesCount=integration.get("verifiedSolvesCount"),
            verifiedByDifficulty=VerifiedByDifficulty(
                easy=verified_easy,
                medium=verified_medium,
                hard=verified_hard,
            ),
            prepsdeProblemsSolved=integration.get("prepsdeProblemsSolved"),
            gapMessage=integration.get("gapMessage"),
            nextSyncAvailableAt=next_sync_available_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching integration status for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch integration status")


@router.get("/leetcode/verified-solves", response_model=VerifiedSolvesResponse)
async def get_verified_solves(
    unlogged_only: bool = False,
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        integration = await lc_repo.get_integration(db, uid)
        if not integration or not integration.get("isActive"):
            raise HTTPException(status_code=404, detail="No active LeetCode integration found")

        all_solves = await lc_repo.get_verified_solves(db, uid, limit=1000)
        total = len(all_solves)

        unlogged_count = sum(
            1 for s in all_solves
            if not s.get("matchedProblemId") and not s.get("promptedToLog")
        )

        if unlogged_only:
            filtered = [
                s for s in all_solves
                if not s.get("matchedProblemId") and not s.get("promptedToLog")
            ]
        else:
            filtered = all_solves

        verified_items = [
            VerifiedSolveItem(
                titleSlug=s["titleSlug"],
                title=s["title"],
                solvedAt=s["solvedAt"],
                lang=s.get("lang", ""),
                matchedProblemId=s.get("matchedProblemId"),
                promptedToLog=s.get("promptedToLog", False),
            )
            for s in filtered
        ]

        return VerifiedSolvesResponse(
            verifiedSolves=verified_items,
            total=total,
            unloggedCount=unlogged_count,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching verified solves for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch verified solves")


@router.delete("/leetcode", status_code=204)
async def disconnect_leetcode(
    uid: str = Depends(get_current_user),
    db: AsyncClient = Depends(get_db),
):
    try:
        integration = await lc_repo.get_integration(db, uid)
        if not integration or not integration.get("isActive"):
            raise HTTPException(status_code=404, detail="No active LeetCode integration found")

        await lc_repo.disconnect_integration(db, uid)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting LeetCode for uid={uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect LeetCode")
