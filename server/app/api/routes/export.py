from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from io import BytesIO
from sqlalchemy.orm import Session
from fastapi import Depends
from app.db.models import Proposal, ProposalExport
from app.db.session import get_db
from app.schemas.export_request import ExportRequest
from app.services.document_service import generate_pdf, generate_docx

router = APIRouter()

def safe_filename(business_name: str, ext: str) -> str:
    cleaned = "".join(c if c.isalnum() or c in " -_" else "" for c in business_name).strip().replace(" ", "_")
    return f"proposal-{cleaned or 'client'}.{ext}"

@router.post("/export-pdf")
async def export_pdf(req: ExportRequest, db: Session = Depends(get_db)):
    pdf_bytes = generate_pdf(req.proposal, req.business_name)
    filename = safe_filename(req.business_name, "pdf")
    if req.proposal_id and db.get(Proposal, req.proposal_id):
        db.add(ProposalExport(proposal_id=req.proposal_id, version_id=req.version_id, format="pdf"))
        db.commit()
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/export-docx")
async def export_docx(req: ExportRequest, db: Session = Depends(get_db)):
    docx_bytes = generate_docx(req.proposal, req.business_name)
    filename = safe_filename(req.business_name, "docx")
    if req.proposal_id and db.get(Proposal, req.proposal_id):
        db.add(ProposalExport(proposal_id=req.proposal_id, version_id=req.version_id, format="docx"))
        db.commit()
    return StreamingResponse(
        BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
