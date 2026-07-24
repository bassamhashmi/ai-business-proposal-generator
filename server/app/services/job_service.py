import logging
from datetime import datetime, timezone
from sqlalchemy import func
from app.core.logging import log_event
from app.db.models import GenerationRun, Job, Proposal, ProposalVersion, ResearchResult
from app.db.session import SessionLocal
from app.llm.factory import get_llm_provider
from app.schemas.proposal_request import ProposalRequest
from app.services.agent_service import research_by_website, research_company
from app.services.extraction_service import extract_fields
from app.services.proposal_service import generate_proposal

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _set_job_state(job: Job, *, status: str | None = None, stage: str, **fields) -> None:
    if status:
        job.status = status
    job.stage = stage
    for name, value in fields.items():
        setattr(job, name, value)


def _fail_job(job: Job, exc: Exception) -> None:
    _set_job_state(
        job,
        status="failed",
        stage="failed",
        error_type=type(exc).__name__,
        error_message="The background task failed. Check server logs using the request ID.",
        completed_at=_now(),
    )


async def run_research_job(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job or job.status == "cancelled":
            return
        _set_job_state(job, status="running", stage="researching", started_at=_now())
        db.commit()

        llm = get_llm_provider()
        website_url = job.input_data.get("website_url")
        company_name = job.input_data.get("company_name")
        if website_url:
            result = await research_by_website(website_url, llm)
        else:
            summary = await research_company(company_name, llm)
            result = {"business_name": company_name, "company_context": summary}

        if job.status == "cancelled":
            return
        db.add(ResearchResult(
            proposal_id=job.proposal_id,
            source_url=website_url,
            source_name=result.get("business_name") or company_name,
            summary=result.get("company_context") or "No research summary was returned.",
            structured_data={
                "industry": result.get("industry"),
                "service_offered": result.get("service_offered"),
            },
        ))
        _set_job_state(job, status="completed", stage="completed", result_data=result, completed_at=_now())
        db.commit()
        log_event(logger, "background_job_completed", job_id=job_id, job_type=job.job_type)
    except Exception as exc:
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            _fail_job(job, exc)
            db.commit()
        log_event(logger, "background_job_failed", job_id=job_id, job_type="research", error_type=type(exc).__name__)
    finally:
        db.close()


async def run_extraction_job(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job or job.status == "cancelled":
            return
        _set_job_state(job, status="running", stage="extracting_details", started_at=_now())
        db.commit()

        payload = job.input_data
        extracted = await extract_fields(
            payload["company_name"],
            payload["source_text"],
            get_llm_provider(),
            company_context=payload.get("company_context", ""),
            research_industry=payload.get("research_industry"),
            research_service_offered=payload.get("research_service_offered"),
        )
        result = {**extracted.model_dump(), "business_name": payload["company_name"]}
        proposal = db.get(Proposal, job.proposal_id)
        if proposal:
            proposal.ai_brief = result
            proposal.status = "brief_ready"
        _set_job_state(job, status="completed", stage="completed", result_data=result, completed_at=_now())
        db.commit()
        log_event(logger, "background_job_completed", job_id=job_id, job_type=job.job_type)
    except Exception as exc:
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            _fail_job(job, exc)
            db.commit()
        log_event(logger, "background_job_failed", job_id=job_id, job_type="extraction", error_type=type(exc).__name__)
    finally:
        db.close()


async def run_generation_job(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if not job or job.status == "cancelled":
            return
        _set_job_state(job, status="running", stage="retrieving_examples", started_at=_now())
        proposal = db.get(Proposal, job.proposal_id)
        if not proposal:
            raise ValueError("Proposal not found for generation job.")
        proposal.status = "generating"
        request = ProposalRequest(proposal_id=proposal.id, **job.input_data)
        llm = get_llm_provider()
        run = GenerationRun(
            proposal_id=proposal.id,
            status="running",
            job_reference=job.id,
            model_name=getattr(llm, "model", None),
            prompt_version="proposal_prompts:v1",
            request_payload=job.input_data,
        )
        db.add(run)
        db.commit()

        _set_job_state(job, stage="writing_proposal")
        db.commit()
        result = await generate_proposal(request, llm, db)
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
        db.add(version)
        db.flush()
        run.status = "completed"
        run.result_payload = content
        run.completed_at = _now()
        proposal.status = "generated"
        _set_job_state(
            job,
            status="completed",
            stage="completed",
            result_data={**content, "proposal_id": proposal.id, "version_id": version.id},
            completed_at=_now(),
        )
        db.commit()
        log_event(logger, "background_job_completed", job_id=job_id, job_type=job.job_type)
    except Exception as exc:
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            _fail_job(job, exc)
            proposal = db.get(Proposal, job.proposal_id)
            if proposal:
                proposal.status = "generation_failed"
            db.commit()
        log_event(logger, "background_job_failed", job_id=job_id, job_type="generation", error_type=type(exc).__name__)
    finally:
        db.close()
