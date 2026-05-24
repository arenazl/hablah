import sys
import asyncio

# Windows: aiomysql + SSL requiere SelectorEventLoop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api import auth, users, push, templates, topics, sessions, me, alumnos, dashboard, tts, voice, onboarding, kids, rooms, admin_directives


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(me.router, prefix="/api/me", tags=["me"])
app.include_router(push.router, prefix="/api/push", tags=["push"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(topics.router, prefix="/api/topics", tags=["topics"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(alumnos.router, prefix="/api/alumnos", tags=["alumnos"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(tts.router, prefix="/api/tts", tags=["tts"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(kids.router, prefix="/api/kids", tags=["kids"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
app.include_router(admin_directives.router, prefix="/api/admin", tags=["admin"])
