import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import engine
from sqlalchemy import text

async def alter_db():
    print("Altering database for template and layout columns...")
    columns = [
        ("template", "VARCHAR(50)", "'modern-impact'"),
        ("layout", "JSONB", "'[]'::jsonb"),
    ]
    for col, dtype, def_val in columns:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(f"ALTER TABLE resumes ADD COLUMN IF NOT EXISTS {col} {dtype} DEFAULT {def_val};"))
            print(f"Successfully added {col} column.")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print(f"Column {col} already exists.")
            else:
                print(f"Error for {col}: {e}")

if __name__ == "__main__":
    asyncio.run(alter_db())
