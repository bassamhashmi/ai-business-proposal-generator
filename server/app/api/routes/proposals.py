from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from app.db.models import GenerationRun, Job, Proposal, ProposalVersion, ResearchResult, SourceDocument
from app.schemas.job import JobResponse
from app.services.job_service import run_generation_job
from app.services.job_service import run_outline_job
from app.schemas.strategy import ProposalStrategy
from app.schemas.proposal_request import ProposalRequest
from app.schemas.proposal_draft import (
    ProposalCreate,
    ProposalResponse,
    ProposalUpdate,
    ResearchResultCreate,
    ResearchResultResponse,
    SourceDocumentCreate,
    SourceDocumentResponse,
)
from app.services.proposal_service import generate_proposal, ProposalGenerationError
from app.llm.factory import get_llm_provider
from app.db.session import get_db

router = APIRouter()


def get_proposal_or_404(proposal_id: str, db: Session) -> Proposal:
    proposal = (
        db.query(Proposal)
        .options(
            selectinload(Proposal.source_documents),
            selectinload(Proposal.research_results),
            selectinload(Proposal.versions),
        )
        .filter(Proposal.id == proposal_id)
        .first()
    )
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")
    return proposal


@router.post("/proposals", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
def create_proposal(req: ProposalCreate, db: Session = Depends(get_db)):
    proposal = Proposal(
        business_name=req.business_name,
        website_url=req.website_url,
        input_data=req.input_data,
    )
    proposal.source_documents = [SourceDocument(**source.model_dump()) for source in req.source_documents]
    db.add(proposal)
    db.commit()
    return get_proposal_or_404(proposal.id, db)


@router.get("/proposals", response_model=list[ProposalResponse])
def list_proposals(db: Session = Depends(get_db)):
    return (
        db.query(Proposal)
        .options(
            selectinload(Proposal.source_documents),
            selectinload(Proposal.research_results),
            selectinload(Proposal.versions),
        )
        .order_by(Proposal.updated_at.desc())
        .all()
    )


@router.get("/proposals/{proposal_id}", response_model=ProposalResponse)
def get_proposal(proposal_id: str, db: Session = Depends(get_db)):
    return get_proposal_or_404(proposal_id, db)


@router.patch("/proposals/{proposal_id}", response_model=ProposalResponse)
def update_proposal(proposal_id: str, req: ProposalUpdate, db: Session = Depends(get_db)):
    proposal = get_proposal_or_404(proposal_id, db)
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(proposal, field, value)
    db.commit()
    return get_proposal_or_404(proposal_id, db)


@router.post(
    "/proposals/{proposal_id}/sources",
    response_model=SourceDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_source_document(
    proposal_id: str, req: SourceDocumentCreate, db: Session = Depends(get_db)
):
    get_proposal_or_404(proposal_id, db)
    source = SourceDocument(proposal_id=proposal_id, **req.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.post(
    "/proposals/{proposal_id}/research",
    response_model=ResearchResultResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_research_result(
    proposal_id: str, req: ResearchResultCreate, db: Session = Depends(get_db)
):
    get_proposal_or_404(proposal_id, db)
    result = ResearchResult(proposal_id=proposal_id, **req.model_dump())
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@router.post("/proposals/{proposal_id}/outline", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_outline(
    proposal_id: str,
    strategy: ProposalStrategy,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    proposal = get_proposal_or_404(proposal_id, db)
    proposal_fields = {key: value for key, value in proposal.input_data.items() if key in ProposalRequest.model_fields}
    proposal_fields.setdefault("business_name", proposal.business_name)
    try:
        request = ProposalRequest(**proposal_fields)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Complete the proposal brief before planning an outline.") from exc
    job = Job(
        proposal_id=proposal_id,
        job_type="outline",
        input_data={"proposal": request.model_dump(exclude={"proposal_id"}), "strategy": strategy.model_dump()},
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(run_outline_job, job.id)
    return job


@router.post("/generate-proposal")
async def generate_proposal_route(
    req: ProposalRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if req.proposal_id:
        proposal = get_proposal_or_404(req.proposal_id, db)
        proposal.input_data = req.model_dump(exclude={"proposal_id"})
        job = Job(
            proposal_id=proposal.id,
            job_type="generation",
            input_data=req.model_dump(exclude={"proposal_id"}),
        )
        proposal.status = "generation_queued"
        proposal.job_reference = job.id
        db.add(job)
        db.commit()
        db.refresh(job)
        background_tasks.add_task(run_generation_job, job.id)
        return JobResponse.model_validate(job)
    else:
        proposal = Proposal(
            business_name=req.business_name,
            input_data=req.model_dump(exclude={"proposal_id"}),
            status="generating",
        )
        db.add(proposal)
        db.flush()

    llm = get_llm_provider("generation")
    run = GenerationRun(
        proposal_id=proposal.id,
        status="running",
        model_name=getattr(llm, "model", None),
        prompt_version="proposal_prompts:v1",
        request_payload=req.model_dump(exclude={"proposal_id"}),
    )
    proposal.status = "generating"
    db.add(run)
    db.commit()

    try:
        result = await generate_proposal(req, llm, db)
    except ProposalGenerationError as e:
        run.status = "failed"
        run.error_type = type(e).__name__
        run.completed_at = datetime.now(timezone.utc)
        proposal.status = "generation_failed"
        db.commit()
        raise HTTPException(status_code=502, detail=str(e))

    content = result.model_dump()
    version_number = (
        db.query(func.coalesce(func.max(ProposalVersion.version_number), 0))
        .filter(ProposalVersion.proposal_id == proposal.id)
        .scalar()
        + 1
    )
    version = ProposalVersion(
        proposal_id=proposal.id,
        version_number=version_number,
        content=content,
    )
    run.status = "completed"
    run.result_payload = content
    run.completed_at = datetime.now(timezone.utc)
    proposal.status = "generated"
    db.add(version)
    db.commit()

    return {**content, "proposal_id": proposal.id, "version_id": version.id}
