from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.supabase_auth import router as supabase_auth_router
from app.api.catalog import router as catalog_router
from app.api.comparisons import router as comparisons_router
from app.api.health import router as health_router
from app.api.prices import router as prices_router
from app.api.shopping_lists import router as shopping_lists_router
from app.core.config import get_settings
from app.db.init_db import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="API inicial do PreçoMobi.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(supabase_auth_router, prefix=settings.api_prefix)
app.include_router(catalog_router, prefix=settings.api_prefix)
app.include_router(prices_router, prefix=settings.api_prefix)
app.include_router(shopping_lists_router, prefix=settings.api_prefix)
app.include_router(comparisons_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "PreçoMobi API",
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }


@app.get(settings.api_prefix + "/features")
def features():
    return {"demo_mode": settings.demo_mode, "region": "Serra/ES — Laranjeiras" if settings.demo_mode else None}


from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException

FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    # Replace the informational root with the frontend only when a build exists.
    app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", None) == "/" and "GET" in getattr(r, "methods", set()))]

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == settings.api_prefix.strip("/") or path.startswith(settings.api_prefix.strip("/") + "/"):
            raise HTTPException(404, "Endpoint não encontrado")
        candidate = (FRONTEND_DIST / path).resolve()
        if FRONTEND_DIST.resolve() in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
