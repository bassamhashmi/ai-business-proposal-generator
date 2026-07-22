from pypdf import PdfReader

def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages_text = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages_text).strip()