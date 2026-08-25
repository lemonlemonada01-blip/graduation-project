from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import jwt
from ..config import settings

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # We can implement global route protection here if needed.
        # Currently handled by Depends(get_current_user) on specific routes.
        response = await call_next(request)
        return response
