from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.ats import router as ats_router
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.interview import router as interview_router
from app.api.routes.resume import router as resume_router
from app.api.routes.scrape import router as scrape_router
from app.api.routes.user import router as user_router
from app.api.routes.jd_apply import router as jd_apply_router
from app.core.config import get_settings

settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        )
        return response

app = FastAPI(
    title="AI Resume Agent API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(health_router, prefix="/api")
app.include_router(ats_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(interview_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(resume_router, prefix="/api")
app.include_router(scrape_router, prefix="/api")
app.include_router(jd_apply_router, prefix="/api")


@app.get("/", tags=["root"])
async def read_root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "environment": settings.environment,
        "status": "ready",
    }
