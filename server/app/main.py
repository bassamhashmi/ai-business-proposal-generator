from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes.proposals import router as proposals_router

app = FastAPI(title="AI Proposal Generator - AI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.next_public_api_url],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proposals_router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok"}