import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import engine
from sqlalchemy import text

async def alter_db():
    print("Altering database...")
    columns = [
        ("experience", "JSONB", "'[]'::jsonb"),
        ("education", "JSONB", "'[]'::jsonb"),
        ("skills", "JSONB", "'[]'::jsonb"),
        ("tools", "JSONB", "'[]'::jsonb"),
        ("projects", "JSONB", "'[]'::jsonb")
    ]
    for col, dtype, def_val in columns:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(f"ALTER TABLE resumes ADD COLUMN {col} {dtype} DEFAULT {def_val};"))
            print(f"Successfully added {col} column.")
        except Exception as e:
            print(f"Error for {col}: {e}")

if __name__ == "__main__":
    asyncio.run(alter_db())
