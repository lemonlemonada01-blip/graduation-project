from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import time
from typing import Dict, Tuple

class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window
        self.clients: Dict[str, Tuple[int, float]] = {}

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        req_count, start_time = self.clients.get(client_ip, (0, current_time))
        
        if current_time - start_time > self.window:
            req_count = 1
            start_time = current_time
        else:
            req_count += 1
            
        if req_count > self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )
            
        self.clients[client_ip] = (req_count, start_time)
        response = await call_next(request)
        return response
