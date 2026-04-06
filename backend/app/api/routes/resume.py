from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.resume import ResumeCreate, ResumeResponse, ResumeUpdate
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("", response_model=ResumeResponse, status_code=201)
async def create_resume(
    payload: ResumeCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ResumeResponse:
    return await ResumeService(session).create_resume(payload=payload, user=current_user)


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ResumeResponse:
    return await ResumeService(session).get_resume(resume_id=resume_id, user=current_user)


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: str,
    payload: ResumeUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ResumeResponse:
    return await ResumeService(session).update_resume(
        resume_id=resume_id,
        payload=payload,
        user=current_user,
    )


@router.post("/upload", response_model=ResumeResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ResumeResponse:
    # Read the file content mock
    content = await file.read()
    
    # Mock extracted resume payload (To be integrated with actual parsing logic later)
    mock_payload = ResumeCreate(
        title=f"Imported from {file.filename}",
        status="draft",
        personal_info={"full_name": current_user.full_name, "email": current_user.email, "links": []},
        experience=[],
        education=[],
        skills=["Extracted", "From", "PDF"],
        tools=[],
        projects=[]
    )
    
    return await ResumeService(session).create_resume(payload=mock_payload, user=current_user)

