from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from io import BytesIO
from app.schemas.export_request import ExportRequest
from app.services.document_service import generate_pdf, generate_docx

router = APIRouter()

def safe_filename(business_name: str, ext: str) -> str:
    cleaned = "".join(c if c.isalnum() or c in " -_" else "" for c in business_name).strip().replace(" ", "_")
    return f"proposal-{cleaned or 'client'}.{ext}"

@router.post("/export-pdf")
async def export_pdf(req: ExportRequest):
    pdf_bytes = generate_pdf(req.proposal, req.business_name)
    filename = safe_filename(req.business_name, "pdf")
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/export-docx")
async def export_docx(req: ExportRequest):
    docx_bytes = generate_docx(req.proposal, req.business_name)
    filename = safe_filename(req.business_name, "docx")
    return StreamingResponse(
        BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )