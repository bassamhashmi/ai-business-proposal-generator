import logging
import re
import time
from uuid import uuid4
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import configure_logging, log_event, request_id_context
from app.api.routes.proposals import router as proposals_router
from app.api.routes.extraction import router as extraction_router
from app.api.routes.export import router as export_router
from app.api.routes.research import router as research_router
from app.api.routes.jobs import router as jobs_router
from app.db.init_db import init_db

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Proposal Generator - AI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.next_public_api_url],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proposals_router, prefix="/api/v1")
app.include_router(extraction_router, prefix="/api/v1")
app.include_router(export_router, prefix="/api/v1")
app.include_router(research_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")


@app.on_event("startup")
def initialize_database() -> None:
    init_db()


@app.middleware("http")
async def add_request_context_and_limits(request: Request, call_next):
    supplied_request_id = request.headers.get("X-Request-ID", "")
    request_id = (
        supplied_request_id
        if re.fullmatch(r"[A-Za-z0-9_-]{8,128}", supplied_request_id)
        else str(uuid4())
    )
    token = request_id_context.set(request_id)
    started = time.perf_counter()
    response_status = 500

    try:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.max_request_body_bytes:
            response_status = 413
            return JSONResponse(
                {"detail": "Request body exceeds the configured size limit."}, status_code=413
            )
        response = await call_next(request)
        response_status = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    except ValueError:
        response_status = 400
        return JSONResponse({"detail": "Invalid Content-Length header."}, status_code=400)
    except Exception:
        log_event(
            logger,
            "request_failed",
            method=request.method,
            path=request.url.path,
            error_type="unhandled_exception",
        )
        raise
    finally:
        log_event(
            logger,
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response_status,
            duration_ms=round((time.perf_counter() - started) * 1000),
        )
        request_id_context.reset(token)

@app.get("/health")
def health():
    return {"status": "ok"}
