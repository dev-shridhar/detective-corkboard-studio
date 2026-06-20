from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import auth, boards, nodes, edges


def create_application() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance."""
    application = FastAPI(
        title=settings.APP_NAME,
        description="Backend API for Detective Corkboard Studio",
        version=settings.APP_VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # CORS — allow frontend origin
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API routers
    application.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    application.include_router(boards.router, prefix="/api/v1/boards", tags=["boards"])
    application.include_router(nodes.router, prefix="/api/v1/boards", tags=["nodes"])
    application.include_router(edges.router, prefix="/api/v1/boards", tags=["edges"])

    return application


app = create_application()


@app.get("/", tags=["health"])
async def health_check() -> dict:
    """Root health check endpoint."""
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
