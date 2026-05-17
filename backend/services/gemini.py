"""Servicio Gemini para descripciones, lead scoring y bot conversacional."""
import httpx
import json
from typing import Optional, Dict, List, Any

from core.config import settings


async def _generate(prompt: str, json_mode: bool = True, max_tokens: int = 4000) -> Optional[Dict]:
    if not settings.GEMINI_API_KEY:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    cfg = {"temperature": 0.2, "maxOutputTokens": max_tokens}
    if json_mode:
        cfg["responseMimeType"] = "application/json"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": cfg,
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text) if json_mode else {"text": text}
    except Exception as e:
        print(f"[gemini] error: {e}")
        return None


async def generate_with_tools(
    contents: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
    system_instruction: Optional[str] = None,
    max_tokens: int = 2000,
) -> Optional[Dict[str, Any]]:
    """Llamada a Gemini con function calling habilitado.

    Args:
      contents: lista de mensajes en formato Gemini, ej:
        [{"role": "user", "parts": [{"text": "..."}]}]
      tools: lista de function_declarations, ej:
        [{"name": "buscar_propiedades", "description": "...", "parameters": {...}}]
      system_instruction: prompt de sistema separado (no se concatena con user).

    Returns el primer "part" de la respuesta. Puede ser:
      {"text": "..."} si Gemini responde con texto.
      {"functionCall": {"name": "...", "args": {...}}} si decide llamar tool.
    """
    if not settings.GEMINI_API_KEY:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload: Dict[str, Any] = {
        "contents": contents,
        "tools": [{"function_declarations": tools}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": max_tokens},
        "toolConfig": {"functionCallingConfig": {"mode": "AUTO"}},
    }
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            parts = data["candidates"][0]["content"]["parts"]
            return parts[0] if parts else None
    except Exception as e:
        print(f"[gemini.tools] error: {e}")
        return None


async def describir_propiedad(p: Dict) -> Optional[str]:
    prompt = (
        "Sos un copywriter inmobiliario. Generame una descripcion comercial atractiva "
        "(120-180 palabras, en castellano rioplatense, sin emojis) para esta propiedad:\n"
        f"{json.dumps(p, ensure_ascii=False)}\n"
        'Devolveme JSON: {"descripcion": "..."}'
    )
    r = await _generate(prompt, json_mode=True)
    return r.get("descripcion") if r else None


async def clasificar_temperatura(notas: str, dias_sin_contacto: int) -> Optional[str]:
    """Devuelve 'caliente' | 'tibio' | 'frio'."""
    prompt = (
        "Sos un analista de leads inmobiliarios. Clasifica al lead segun sus notas y "
        f"sus dias sin contacto ({dias_sin_contacto} dias). Respuesta solo una de: "
        '"caliente", "tibio", "frio". '
        f"Notas: {notas}\n"
        'Devolveme JSON: {"temperatura": "..."}'
    )
    r = await _generate(prompt, json_mode=True)
    return r.get("temperatura") if r else None
