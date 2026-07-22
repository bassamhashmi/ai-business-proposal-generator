from pathlib import Path
from app.services.pdf_service import extract_text_from_pdf
from app.services.docx_service import extract_text_from_docx

def extract_text_from_upload(file_path: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    raise ValueError(f"Unsupported file type: {ext}")