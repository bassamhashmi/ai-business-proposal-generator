import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.models import Job, Proposal
from app.db.session import get_db
from app.schemas.job import JobResponse
from app.services.file_input_service import (
    FileInputError,
    extract_text_from_upload,
    save_upload_with_limit,
    validate_document_limits,
)
from app.services.extraction_service import extract_fields, ExtractionError
from app.llm.factory import get_llm_provider
from app.services.job_service import run_extraction_job
from app.schemas.extraction_output import brief_to_generation_fields

router = APIRouter()

@router.post("/extract-request")
async def extract_request_route(
    background_tasks: BackgroundTasks,
    company_name: str = Form(...),
    free_text: Optional[str] = Form(None),
    company_context: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    research_industry: Optional[str] = Form(None),
    research_service_offered: Optional[str] = Form(None),
    proposal_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    source_text = ""

    if file is not None:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in (".pdf", ".docx"):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
        try:
            await save_upload_with_limit(file, tmp_path)
            validate_document_limits(tmp_path, file.filename)
            source_text = extract_text_from_upload(tmp_path, file.filename)
        except FileInputError as exc:
            raise HTTPException(status_code=413, detail=str(exc))
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    elif free_text:
        source_text = free_text
    else:
        raise HTTPException(status_code=400, detail="Provide either free_text or a file.")

    if not source_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the provided input.")

    if proposal_id:
        if db.get(Proposal, proposal_id) is None:
            raise HTTPException(status_code=404, detail="Proposal not found.")
        job = Job(
            proposal_id=proposal_id,
            job_type="extraction",
            input_data={
                "company_name": company_name,
                "source_text": source_text,
                "company_context": company_context or "",
                "research_industry": research_industry,
                "research_service_offered": research_service_offered,
            },
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        background_tasks.add_task(run_extraction_job, job.id)
        return JobResponse.model_validate(job)

    llm = get_llm_provider("extraction")
    try:
        extracted = await extract_fields(
            company_name,
            source_text,
            llm,
            company_context=company_context or "",
            research_industry=research_industry,
            research_service_offered=research_service_offered
        )
        print('>>> extracted', extracted)
    except ExtractionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return brief_to_generation_fields(extracted, company_name)
