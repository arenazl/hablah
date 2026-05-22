"""API REST de Voice Rooms.

POST /api/rooms                     - host crea sala (requiere auth)
GET  /api/rooms/{token}             - publico, info basica de la sala
POST /api/rooms/{token}/join        - publico, invitado entra con nombre
POST /api/rooms/{token}/close       - host cierra (requiere auth + ser host)
"""
import json
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from core.database import get_db
from core.security import get_current_user
from models.rooms import VoiceRoom
from models.template import Topic, Template
from models.user import User


router = APIRouter()


# ─── Schemas ────────────────────────────────────────────────────────
class RoomCreate(BaseModel):
    topic_id: Optional[int] = None
    free_topic: Optional[str] = Field(None, max_length=300)
    template_id: Optional[int] = None


class RoomParticipant(BaseModel):
    pid: str
    name: str
    is_host: bool


class RoomInfo(BaseModel):
    token: str
    host_name: str
    topic_title: Optional[str]
    free_topic: Optional[str]
    template_name: Optional[str]
    status: str
    participants: list[RoomParticipant]


class RoomCreateResponse(BaseModel):
    token: str
    host_pid: str


class RoomJoinRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)


class RoomJoinResponse(BaseModel):
    token: str
    guest_pid: str
    name: str
    info: RoomInfo


# ─── Helpers ────────────────────────────────────────────────────────
def _new_token() -> str:
    """Token corto y publico, tipo `r_8af3`."""
    return "r_" + secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:10]


def _new_pid(prefix: str = "p") -> str:
    return f"{prefix}_{secrets.token_urlsafe(6).replace('-', '').replace('_', '')[:8]}"


async def _build_room_info(room: VoiceRoom, db: AsyncSession) -> RoomInfo:
    host = (await db.execute(select(User).where(User.id == room.host_user_id))).scalar_one_or_none()
    host_name = host.nombre if host else "Anfitrion"

    topic_title = None
    if room.topic_id:
        topic = (await db.execute(select(Topic).where(Topic.id == room.topic_id))).scalar_one_or_none()
        if topic:
            topic_title = topic.title

    template_name = None
    if room.template_id:
        tpl = (await db.execute(select(Template).where(Template.id == room.template_id))).scalar_one_or_none()
        if tpl:
            template_name = tpl.name

    participants_raw = room.participants or []
    participants = [
        RoomParticipant(pid=p["pid"], name=p["name"], is_host=p.get("is_host", False))
        for p in participants_raw
    ]

    return RoomInfo(
        token=room.token,
        host_name=host_name,
        topic_title=topic_title,
        free_topic=room.free_topic,
        template_name=template_name,
        status=room.status,
        participants=participants,
    )


# ─── Endpoints ──────────────────────────────────────────────────────
@router.post("", response_model=RoomCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    host: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Host crea una nueva sala publica con un token para compartir."""
    host_pid = _new_pid("host")
    token = _new_token()

    # Aseguramos unicidad del token (extremadamente improbable colisionar)
    while True:
        exists = (await db.execute(select(VoiceRoom).where(VoiceRoom.token == token))).scalar_one_or_none()
        if not exists:
            break
        token = _new_token()

    template_id = payload.template_id or host.active_template_id

    room = VoiceRoom(
        token=token,
        host_user_id=host.id,
        topic_id=payload.topic_id,
        template_id=template_id,
        free_topic=payload.free_topic,
        status="open",
        participants=[{"pid": host_pid, "name": host.nombre, "is_host": True}],
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)

    return RoomCreateResponse(token=token, host_pid=host_pid)


@router.get("/{token}", response_model=RoomInfo)
async def get_room_info(token: str, db: AsyncSession = Depends(get_db)):
    """Info publica de la sala. No requiere auth - el token es el pase."""
    room = (await db.execute(select(VoiceRoom).where(VoiceRoom.token == token))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    return await _build_room_info(room, db)


@router.post("/{token}/join", response_model=RoomJoinResponse)
async def join_room(token: str, payload: RoomJoinRequest, db: AsyncSession = Depends(get_db)):
    """Invitado entra a la sala. Solo con nombre, sin auth."""
    room = (await db.execute(select(VoiceRoom).where(VoiceRoom.token == token))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status != "open":
        raise HTTPException(status_code=410, detail="La sala ya termino")

    guest_pid = _new_pid("guest")
    name = payload.name.strip()[:40]

    # Append al JSON de participants. SQLAlchemy con MySQL JSON: hay que asignar la lista entera.
    current = list(room.participants or [])
    current.append({"pid": guest_pid, "name": name, "is_host": False})
    room.participants = current
    await db.commit()
    await db.refresh(room)

    info = await _build_room_info(room, db)
    return RoomJoinResponse(token=token, guest_pid=guest_pid, name=name, info=info)


@router.post("/{token}/close")
async def close_room(
    token: str,
    host: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Host cierra la sala. Solo el host puede."""
    room = (await db.execute(select(VoiceRoom).where(VoiceRoom.token == token))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.host_user_id != host.id:
        raise HTTPException(status_code=403, detail="Solo el anfitrion puede cerrar la sala")
    room.status = "closed"
    room.closed_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}
