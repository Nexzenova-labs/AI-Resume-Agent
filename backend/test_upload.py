import asyncio
from app.db.session import engine, async_session_maker
from app.repositories.user_repository import UserRepository
from app.services.resume_service import ResumeService
from app.schemas.resume import ResumeCreate

async def test():
    async with async_session_maker() as session:
        user = await UserRepository(session).get_by_email("abhinay20000@yahoo.com")
        if not user:
            print("User not found")
            return
        mock_payload = ResumeCreate(
            title="Imported from script.py",
            status="draft",
            personal_info={"full_name": user.full_name, "email": user.email, "links": []},
            experience=[],
            education=[],
            skills=["Extracted", "From", "PDF"],
            tools=[],
            projects=[]
        )
        try:
            res = await ResumeService(session).create_resume(payload=mock_payload, user=user)
            print("Successfully created! ID:", res.id)
        except Exception as e:
            print("Error:", e)

asyncio.run(test())
