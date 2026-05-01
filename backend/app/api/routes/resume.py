from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.resume import ResumeCreate, ResumeResponse, ResumeUpdate
from app.services.resume_service import ResumeService
from app.services.pdf_parser_service import extract_text_from_pdf, parse_resume_from_text

router = APIRouter(prefix="/resume", tags=["resume"])


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ResumeResponse]:
    """Return all resumes that belong to the current user, newest first."""
    return await ResumeService(session).list_resumes(user=current_user)


@router.post("", response_model=ResumeResponse, status_code=201)
async def create_resume(
    payload: ResumeCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ResumeResponse:
    """Create a new resume from the builder form."""
    # Ensure builder-created resumes are tagged correctly
    if payload.source_type == "uploaded":
        payload.source_type = "builder"
    return await ResumeService(session).create_resume(payload=payload, user=current_user)


# NOTE: /upload must be declared BEFORE /{resume_id} so FastAPI doesn't
# treat the literal string "upload" as a dynamic resume_id parameter.
@router.post("/upload", response_model=ResumeResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ResumeResponse:
    """Parse a PDF resume and store it as a new resume record."""
    file_bytes = await file.read()

    raw_text = extract_text_from_pdf(file_bytes)
    parsed = parse_resume_from_text(raw_text)

    payload = ResumeCreate(
        title=f"Uploaded: {file.filename}",
        status="draft",
        source_type="uploaded",
        personal_info={
            "full_name": parsed.full_name or current_user.full_name,
            "email": parsed.email or current_user.email,
            "phone": parsed.phone,
            "location": parsed.location,
            "summary": parsed.summary,
            "links": parsed.links,
        },
        experience=parsed.experience,
        education=parsed.education,
        skills=parsed.skills,
        tools=parsed.tools,
        projects=parsed.projects,
    )

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
    """Update any fields of a resume, including rename (title only)."""
    return await ResumeService(session).update_resume(
        resume_id=resume_id,
        payload=payload,
        user=current_user,
    )


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: str,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Permanently delete a resume."""
    await ResumeService(session).delete_resume(
        resume_id=resume_id,
        user=current_user,
    )
