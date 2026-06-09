"""Mide cuantos SEGUNDOS de audio genera el coach por turno con el prompt
VIEJO (profesor de jardin, 788d623) vs el ACTUAL (TPR), contra Vertex Live.

Dato contundente: si el viejo genera ~2-3s/turno y el actual ~8s/turno,
queda demostrado que el delay (y probablemente los cuelgues por audio
acumulado) salen del LARGO de las respuestas, no del transporte.

Uso: cd backend && python scripts/compare_prompt_audio.py
"""
from __future__ import annotations
import asyncio, base64, json, subprocess, sys
from pathlib import Path
import websockets

REGION="us-central1"; PROJECT="hablah-prod"
URL=(f"wss://{REGION}-aiplatform.googleapis.com/ws/"
     "google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent")
MODEL=(f"projects/{PROJECT}/locations/{REGION}/publishers/google/models/"
       "gemini-live-2.5-flash-native-audio")
SR=16000; CHUNK=1024
CONTEXT=("Sos Habi, tutor de Timi, un chico de 5 anios, nivel A0, que NO sabe "
         "ingles. El tema de hoy es la comida (helado, pizza). Saluda y arranca "
         "la clase como vos sabes.")
# 2 "respuestas" del chico (audio TTS simple ya cacheado por tune_turntaking)
USER_PCMS=["_tt_turn0.pcm","_tt_turn1.pcm"]


def token()->str:
    return subprocess.check_output(["gcloud.cmd","auth","print-access-token"],text=True).strip()

def extract(text:str)->str:
    m='KIDS_A0_OVERRIDE_RULES = """'
    i=text.index(m)+len(m); j=text.index('"""',i)
    return text[i:j]

async def send(ws,pcm:bytes):
    for k in range(0,len(pcm),CHUNK):
        await ws.send(json.dumps({"realtimeInput":{"audio":{"mimeType":f"audio/pcm;rate={SR}",
            "data":base64.b64encode(pcm[k:k+CHUNK]).decode()}}}))
        await asyncio.sleep(0.02)

def silence(s:float)->bytes: return b"\x00\x00"*int(SR*s)

async def coach_audio_secs(ws,timeout=20.0)->float:
    """Lee hasta turnComplete y devuelve segundos de audio del coach (24kHz)."""
    loop=asyncio.get_event_loop(); dl=loop.time()+timeout; b=0
    while True:
        rem=dl-loop.time()
        if rem<=0: break
        try: raw=await asyncio.wait_for(ws.recv(),timeout=rem)
        except (asyncio.TimeoutError,websockets.ConnectionClosed): break
        sc=(json.loads(raw).get("serverContent") or {})
        for p in (sc.get("modelTurn") or {}).get("parts",[]):
            inl=p.get("inlineData") or {}
            if inl.get("mimeType","").startswith("audio"):
                b+=len(base64.b64decode(inl.get("data","")))
        if sc.get("turnComplete"): break
    return b/2/24000  # bytes -> samples -> segundos a 24kHz

async def run(label:str,override:str,tok:str,pcms:list[bytes]):
    ws=await websockets.connect(URL,max_size=2**24,extra_headers={"Authorization":f"Bearer {tok}"})
    setup={"setup":{"model":MODEL,"generationConfig":{"responseModalities":["AUDIO"],
        "speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Kore"}}}},
        "realtimeInputConfig":{"automaticActivityDetection":{"disabled":False,
            "endOfSpeechSensitivity":"END_SENSITIVITY_HIGH","silenceDurationMs":800}},
        "inputAudioTranscription":{},"outputAudioTranscription":{},
        "systemInstruction":{"parts":[{"text":CONTEXT+"\n\n"+override}]}}}
    await ws.send(json.dumps(setup)); await asyncio.wait_for(ws.recv(),timeout=10)
    await ws.send(json.dumps({"clientContent":{"turns":[{"role":"user","parts":[{"text":"."}]}],"turnComplete":True}}))
    secs=[]
    secs.append(await coach_audio_secs(ws))  # saludo
    for pcm in pcms:
        await send(ws,pcm); await send(ws,silence(1.0))
        secs.append(await coach_audio_secs(ws))
    try: await ws.close()
    except: pass
    print(f"[{label}] audio del coach por turno (s): {[round(x,1) for x in secs]}  |  promedio={sum(secs)/len(secs):.1f}s")
    return secs

async def main():
    tok=token()
    old=extract(subprocess.check_output(["git","show","788d623:backend/services/super_prompt.py"],text=True,encoding="utf-8"))
    new=extract(Path("services/super_prompt.py").read_text(encoding="utf-8"))
    print(f"[prompts] viejo={len(old)} chars | actual={len(new)} chars")
    pcms=[Path(p).read_bytes() for p in USER_PCMS if Path(p).exists()]
    print(f"[audio] {len(pcms)} frases de usuario\n")
    print(">>> PROMPT VIEJO (profesor de jardin):")
    so=await run("VIEJO",old,tok,pcms)
    await asyncio.sleep(1.5)
    print(">>> PROMPT ACTUAL (TPR):")
    sn=await run("ACTUAL",new,tok,pcms)
    print("\n"+"="*60)
    print(f"VIEJO  promedio {sum(so)/len(so):.1f}s/turno")
    print(f"ACTUAL promedio {sum(sn)/len(sn):.1f}s/turno")
    print(f"=> el actual genera {(sum(sn)/len(sn))/(sum(so)/len(so)):.1f}x mas audio por turno")

if __name__=="__main__":
    if sys.platform=="win32": asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
