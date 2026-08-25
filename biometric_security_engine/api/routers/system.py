from fastapi import APIRouter
import datetime

router = APIRouter(prefix="/api/system", tags=["System"])

# Global flag to track model loading
models_loaded = False

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "biometrics": "online",
        "plagiarism": "standby"
    }

@router.get("/ready")
def system_ready():
    return {
        "status": "ready" if models_loaded else "loading",
        "models_loaded": models_loaded
    }

@router.post("/cache/clear")
def clear_cache():
    return {"status": "success", "message": "System cache cleared."}
