from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, documents, indexes
from .core.config import settings

app = FastAPI(title="RAG Application API")

# Default CORS origins
default_origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:5173",  # Vite dev server
    "https://innov8nxt-factorygpt.com",  # Production domain
    "https://www.innov8nxt-factorygpt.com",  # Production www subdomain
]

# Get additional CORS origins from environment variable
additional_origins = (
    settings.ADDITIONAL_CORS_ORIGINS
    if hasattr(settings, "ADDITIONAL_CORS_ORIGINS")
    else []
)
allowed_origins = default_origins + additional_origins

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(indexes.router, prefix="/api", tags=["indexes"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
