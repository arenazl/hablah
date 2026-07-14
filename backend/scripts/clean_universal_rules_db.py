import asyncio
import os
import sys
import json
import dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
dotenv.load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))

from core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    print("[!] Restoring app_config from json catalog to DB...")
    
    json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "catalogo", "app_config.json"))
    with open(json_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
        
    rules_val = None
    for item in catalog:
        if item.get("config_key") == "universal_conversation_rules":
            rules_val = item.get("config_value")
            break
            
    if not rules_val:
        print("[-] Error: universal_conversation_rules not found in catalog json!")
        return
        
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("UPDATE app_config SET config_value = :val WHERE config_key = 'universal_conversation_rules'"),
            {"val": rules_val}
        )
        await session.commit()
        print("[+] DB updated successfully from catalog!")

if __name__ == "__main__":
    asyncio.run(main())
