from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.jd_apply import JdApplyRequest, JdApplyResponse
from app.services.jd_apply_service import JdApplyService
from app.services.pdf_parser_service import extract_text_from_pdf

router = APIRouter(prefix="/jd-apply", tags=["jd-apply"])


@router.post("/parse-jd")
async def parse_jd_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Extract plain text from a JD uploaded as PDF or .txt file."""
    content = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(content)
    else:
        # Plain text / .txt / .docx fallback — decode as UTF-8
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1", errors="replace")

    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract text from the uploaded file.",
        )
    return {"text": text.strip()}


@router.post("/process", response_model=JdApplyResponse)
async def process_jd_apply(
    payload: JdApplyRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> JdApplyResponse:
    """Analyze a resume against multiple job descriptions and generate tailored versions."""
    return await JdApplyService(session).process(payload=payload, user=current_user)
