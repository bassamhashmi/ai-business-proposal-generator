import shutil
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.services.file_input_service import extract_text_from_upload
from app.services.extraction_service import extract_fields, ExtractionError
from app.llm.factory import get_llm_provider

router = APIRouter()

@router.post("/extract-request")
async def extract_request_route(
    company_name: str = Form(...),
    free_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    source_text = ""

    if file is not None:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in (".pdf", ".docx"):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        try:
            source_text = extract_text_from_upload(tmp_path, file.filename)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    elif free_text:
        source_text = free_text
    else:
        raise HTTPException(status_code=400, detail="Provide either free_text or a file.")

    if not source_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the provided input.")

    llm = get_llm_provider()
    try:
        extracted = await extract_fields(company_name, source_text, llm)
    except ExtractionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    result = extracted.model_dump()
    result["business_name"] = company_name
    return result