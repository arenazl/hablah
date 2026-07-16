import os
import sys
import json
import asyncio
import httpx
from sqlalchemy import select

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from core.config import settings
from core.database import AsyncSessionLocal
from models.template import Topic
from services import motor_engine

SEG_TO_TOPIC_SEG = {"mini": "mini", "junior": "junior", "teen": "teen", "adult": "adultos"}
LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]

_CRITIC_PROMPT = (
    "You are an expert prompt engineer and pedagogical linter.\n"
    "Analyze the following system prompt for an interactive AI language coach.\n"
    "Identify any:\n"
    "1. \"contradiction\": Direct contradictions (e.g. telling the bot to speak Spanish in one place and English in another, or contradictory correction/scaffolding rules).\n"
    "2. \"language_clash\": Clashing guidelines for L1/L2 (e.g., instructing '100% Spanish' but also asking for complex English dialogue in target phrases).\n"
    "3. \"structure_error\": Unclosed or misplaced XML tags, multiple tags of the same type.\n"
    "4. \"redundancy\": Identical instructions or concepts repeated across different sections.\n\n"
    "Return ONLY a JSON list of objects matching the schema (no markdown wrapper, no other text):\n"
    "[\n"
    "  {\n"
    "    \"category\": \"contradiction\" | \"language_clash\" | \"structure_error\" | \"redundancy\",\n"
    "    \"description\": \"Short explanation of the issue\",\n"
    "    \"rule_a\": \"Rule/instruction fragment A\",\n"
    "    \"rule_b\": \"Rule/instruction fragment B (if applicable)\"\n"
    "  }\n"
    "]\n"
    "If no issues are found, return an empty JSON list: []"
)

async def pick_topics() -> dict:
    out = {}
    async with AsyncSessionLocal() as db:
        for seg_slug, topic_seg in SEG_TO_TOPIC_SEG.items():
            ts = (await db.execute(select(Topic).where(
                Topic.segmento == topic_seg, Topic.is_active == True))).scalars().all()
            pick = next((t for t in ts if (t.keywords or t.generated_vocab or t.pinned_vocabulary)), None)
            if pick is None:
                raise SystemExit(f"No topic found for segment {topic_seg!r}")
            out[seg_slug] = pick.id
    return out

async def analyze_prompt(sem, client, age, level, prompt_text):
    async with sem:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        body = {
            "contents": [
                {"parts": [{"text": f"{_CRITIC_PROMPT}\n\n--- SYSTEM PROMPT TO ANALYZE ({age} - {level}) ---\n{prompt_text}"}]}
            ]
        }
        for attempt in range(3):
            try:
                r = await client.post(url, json=body, timeout=60.0)
                if r.status_code == 200:
                    data = r.json()
                    res_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    # Clean up code blocks if model returned them
                    if res_text.startswith("```"):
                        lines = res_text.split("\n")
                        if lines[0].startswith("```json"):
                            res_text = "\n".join(lines[1:-1])
                        else:
                            res_text = "\n".join(lines[1:-1])
                    return age, level, json.loads(res_text)
            except Exception as e:
                await asyncio.sleep(2 + attempt * 2)
        return age, level, [{"category": "error", "description": f"Failed to analyze: {sys.exc_info()[1]}"}]

async def main():
    if not settings.GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY is not configured in settings/.env")
        sys.exit(1)
        
    print("Picking active topics...")
    topics = await pick_topics()
    
    print("Generating prompts for all 28 combinations and analyzing...")
    sem = asyncio.Semaphore(4)
    tasks = []
    
    async with httpx.AsyncClient() as client:
        for age_slug in SEG_TO_TOPIC_SEG:
            topic_id = topics[age_slug]
            for level in LEVELS:
                try:
                    res = await motor_engine.resolve_v2(age_slug, level, topic_id)
                    prompt_text = res["prompt"]
                    tasks.append(analyze_prompt(sem, client, age_slug, level, prompt_text))
                except Exception as e:
                    print(f"Error composing prompt for {age_slug} {level}: {e}")
        
        results = await asyncio.gather(*tasks)
    
    total_clashes = 0
    clash_by_combo = {}
    
    print("\n--- RESULTS ---")
    for age, level, clashes in results:
        combo = f"{age} - {level}"
        valid_clashes = [c for c in clashes if c.get("category") in ["contradiction", "language_clash", "structure_error"]]
        
        if valid_clashes:
            clash_by_combo[combo] = valid_clashes
            total_clashes += len(valid_clashes)
            print(f"[FAIL] {combo}: Found {len(valid_clashes)} issues.")
            for c in valid_clashes:
                print(f"  - [{c['category'].upper()}]: {c['description']}")
                if c.get("rule_a"):
                    print(f"    Rule A: {c['rule_a']}")
                if c.get("rule_b"):
                    print(f"    Rule B: {c['rule_b']}")
        else:
            print(f"[PASS] {combo}: No issues detected.")
            
    print("\n--- SUMMARY ---")
    if total_clashes > 0:
        print(f"FAILED: Found {total_clashes} contradictions/clashes in the prompts.")
        sys.exit(1)
    else:
        print("PASSED: All prompts are clean, coherent, and consistent across all age groups and levels!")
        sys.exit(0)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
