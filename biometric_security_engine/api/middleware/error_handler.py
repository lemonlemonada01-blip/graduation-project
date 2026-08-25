from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

def add_error_handlers(app: FastAPI):
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Global error handler caught: {exc}")
        return JSONResponse(
            status_code=500,
            content={"message": "An internal server error occurred.", "details": str(exc)},
        )
