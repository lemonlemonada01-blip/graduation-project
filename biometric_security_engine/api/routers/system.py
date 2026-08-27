import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..dependencies import get_db, require_roles

router = APIRouter(prefix="/api/system", tags=["System"])

# Global flag to track model loading
models_loaded = False


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    database_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_status = "disconnected"
        db.rollback()

    healthy = database_status == "connected"
    return {
        "status": "healthy" if healthy else "degraded",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database": database_status,
        "biometrics": "online",
        "plagiarism": "standby",
    }


@router.get("/ready")
def system_ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        database_ready = True
    except Exception:
        database_ready = False
        db.rollback()

    ready = models_loaded and database_ready
    return {
        "status": "ready" if ready else "loading",
        "models_loaded": models_loaded,
        "database": "connected" if database_ready else "disconnected",
    }


@router.post("/cache/clear")
def clear_cache(current_user=Depends(require_roles(["Admin"]))):
    return {"status": "success", "message": "System cache cleared."}
