import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.exception import register_exception_handlers

# Setup logger configuration
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Register exception handlers
register_exception_handlers(app)

# Rate Limiter Setup
from slowapi.errors import RateLimitExceeded
from app.dependencies.rate_limiter import limiter
from fastapi.responses import JSONResponse

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "message": "Too many requests. Please try again later.",
            "data": None,
            "errors": [{"message": "Rate limit exceeded"}]
        }
    )

# Include API Routers
from app.api import auth, users, contacts, groups, templates, campaigns, dashboard, reports, sms
from app.api import settings as settings_router
from app.websocket.routes import router as ws_router

for prefix in [settings.API_V1_STR, "/api"]:
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(contacts.router, prefix=prefix)
    app.include_router(groups.router, prefix=prefix)
    app.include_router(templates.router, prefix=prefix)
    app.include_router(campaigns.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)
    app.include_router(reports.router, prefix=prefix)
    app.include_router(sms.router, prefix=prefix)
    app.include_router(settings_router.router, prefix=prefix)
    app.include_router(ws_router, prefix=prefix)

# CORS Middleware Setup
raw_origins = settings.BACKEND_CORS_ORIGINS if isinstance(settings.BACKEND_CORS_ORIGINS, list) else []
cors_origins: list[str] = [str(o).strip().rstrip("/") for o in raw_origins if o]

# Ensure required production and local development origins are always present
default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "https://bulk-sms-system-nu.vercel.app",
]
for origin in default_origins:
    if origin not in cors_origins:
        cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Custom Middleware for Security Headers (Helmet-equivalent) and Request Logging
@app.middleware("http")
async def add_security_headers_and_log(request: Request, call_next):
    # Allow OPTIONS preflight requests to be processed directly by CORSMiddleware
    if request.method == "OPTIONS":
        return await call_next(request)

    start_time = time.time()
    
    # Helmet-equivalent security headers
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    duration = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.4f}s"
    )
    return response

@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint to verify API operation status.
    """
    return {
        "success": True,
        "message": "System is healthy",
        "data": {
            "status": "ok",
            "project_name": settings.PROJECT_NAME
        },
        "errors": None
    }

from app.websocket.manager import manager as ws_manager

@app.on_event("startup")
async def startup_event():
    gateway_name = getattr(settings, "SMS_GATEWAY", "SMSLENZ")
    logger.info(f"Current Gateway = {gateway_name}")
    print(f"Current Gateway = {gateway_name}")
    await ws_manager.start_redis_listener()

@app.on_event("shutdown")
async def shutdown_event():
    await ws_manager.stop_redis_listener()
