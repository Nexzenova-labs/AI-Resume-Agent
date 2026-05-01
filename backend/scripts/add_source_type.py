"""Add source_type column to resumes table."""
import asyncio
import sys
import os

# ── allow running from project root ────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.db.session import engine as async_engine


async def main() -> None:
    async with async_engine.begin() as conn:
        # Add column if it doesn't already exist
        await conn.execute(
            text(
                """
                ALTER TABLE resumes
                ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) NOT NULL DEFAULT 'uploaded';
                """
            )
        )
    print("✅  source_type column added (or already exists).")


if __name__ == "__main__":
    asyncio.run(main())
