import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Ensure AI engine root is on sys.path
AI_ENGINE_ROOT = Path(__file__).resolve().parent.parent.parent
if str(AI_ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ENGINE_ROOT))

BIO_ROOT = Path(__file__).resolve().parent.parent
if str(BIO_ROOT) not in sys.path:
    sys.path.insert(0, str(BIO_ROOT))

from .config import settings
from .routers import auth, biometric, system
from .routers import users, teams, meetings, sessions, settings as settings_router, projects, plagiarism, notifications, reports
from .middleware.error_handler import add_error_handlers
from .middleware.rate_limiter import RateLimiterMiddleware
from .database.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    from .database.connection import engine
    Base.metadata.create_all(bind=engine)
    
    # We can also seed initial sessions here if needed
    yield
    # Cleanup

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description="Unified API combining 3D Biometrics, Plagiarism Detection, and RBAC User Management",
        version=settings.app_version,
        lifespan=lifespan
    )
    
    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimiterMiddleware)
    add_error_handlers(app)
    
    # Include routers
    app.include_router(auth.router)
    app.include_router(biometric.router)
    app.include_router(system.router)
    app.include_router(users.router)
    app.include_router(teams.router)
    app.include_router(meetings.router)
    app.include_router(sessions.router)
    app.include_router(settings_router.router)
    app.include_router(projects.router)
    app.include_router(plagiarism.router)
    app.include_router(notifications.router)
    app.include_router(reports.router)
    
    return app

app = create_app()

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
