import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine

async def alter_table():
    print("Connecting to database...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE resumes ADD COLUMN custom_sections JSONB DEFAULT '[]'::jsonb;"))
            print("Successfully added custom_sections.")
        except Exception as e:
            print(f"Error adding custom_sections: {e}")

from sqlalchemy import text

if __name__ == "__main__":
    asyncio.run(alter_table())
