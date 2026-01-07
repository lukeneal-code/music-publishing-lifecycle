from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.routers import contracts_router, usage_router

app = FastAPI(
    title="AI Service",
    description="AI agents for contract generation and usage matching",
    version="0.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(contracts_router)
app.include_router(usage_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai"}


@app.get("/")
async def root():
    return {"service": "ai", "version": "0.1.0"}
