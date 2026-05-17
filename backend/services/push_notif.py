"""Servicio de Web Push notifications usando VAPID."""
import os
import json
import asyncio
from typing import Optional
from datetime import datetime

from pywebpush import webpush, WebPushException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.push_subscription import PushSubscription


def _vapid_claims() -> dict:
    return {"sub": os.getenv("VAPID_CONTACT_EMAIL", "mailto:admin@agentflow.local")}


def _private_key_pem() -> Optional[str]:
    """Devuelve la clave privada VAPID en formato PEM si esta disponible.
    pywebpush acepta la private key como el b64url del integer privado (32 bytes)."""
    return os.getenv("VAPID_PRIVATE_KEY")


def _send_one(sub: PushSubscription, payload: dict) -> bool:
    """Envia una push a UN endpoint. Devuelve True si OK, False si fallo (gone, expired, etc)."""
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=_private_key_pem(),
            vapid_claims=_vapid_claims(),
        )
        return True
    except WebPushException as e:
        status = getattr(e.response, "status_code", None)
        print(f"[push] error {status} a sub {sub.id}: {e}")
        # 410 Gone / 404 = subscription expirada, marcar para eliminar
        if status in (404, 410):
            return False
        return False
    except Exception as e:
        print(f"[push] error inesperado a sub {sub.id}: {e}")
        return False


async def notify_user(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: str,
    url: str = "/inbox",
    tag: Optional[str] = None,
):
    """Envia una notificacion a todas las suscripciones del usuario.
    Si alguna falla con 404/410, la elimina."""
    if not _private_key_pem():
        print("[push] VAPID_PRIVATE_KEY no configurada, skip")
        return

    r = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
    subs = r.scalars().all()
    if not subs:
        print(f"[push] user {user_id} sin suscripciones, skip")
        return

    payload = {
        "title": title,
        "body": body,
        "url": url,
        "tag": tag or f"agentflow-{int(datetime.utcnow().timestamp())}",
    }

    expired_ids = []
    for sub in subs:
        # Ejecutar en thread pool porque pywebpush es sync
        ok = await asyncio.get_event_loop().run_in_executor(None, _send_one, sub, payload)
        if not ok:
            expired_ids.append(sub.id)
        else:
            sub.last_used_at = datetime.utcnow()

    # Limpiar suscripciones expiradas
    if expired_ids:
        for sub in subs:
            if sub.id in expired_ids:
                await db.delete(sub)
        print(f"[push] eliminadas {len(expired_ids)} subs expiradas del user {user_id}")
