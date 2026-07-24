from pathlib import Path
from fastapi import UploadFile
from pypdf import PdfReader
from app.core.config import settings
from app.services.pdf_service import extract_text_from_pdf
from app.services.docx_service import extract_text_from_docx


class FileInputError(ValueError):
    pass


async def save_upload_with_limit(upload: UploadFile, destination: str) -> int:
    """Write an upload in bounded chunks so oversized files are rejected safely."""
    bytes_written = 0
    try:
        with open(destination, "wb") as target:
            while chunk := await upload.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.max_upload_bytes:
                    raise FileInputError(
                        f"Uploaded file exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit."
                    )
                target.write(chunk)
    finally:
        await upload.close()
    return bytes_written


def validate_document_limits(file_path: str, filename: str) -> None:
    if Path(filename).suffix.lower() != ".pdf":
        return
    try:
        page_count = len(PdfReader(file_path).pages)
    except Exception as exc:
        raise FileInputError("The uploaded PDF could not be read.") from exc
    if page_count > settings.max_pdf_pages:
        raise FileInputError(
            f"PDF has {page_count} pages; the limit is {settings.max_pdf_pages}."
        )

def extract_text_from_upload(file_path: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        extracted = extract_text_from_pdf(file_path)
    elif ext == ".docx":
        extracted = extract_text_from_docx(file_path)
    else:
        raise FileInputError(f"Unsupported file type: {ext}")

    if len(extracted) > settings.max_extracted_text_chars:
        raise FileInputError(
            "Extracted document text exceeds the configured processing limit."
        )
    return extracted
