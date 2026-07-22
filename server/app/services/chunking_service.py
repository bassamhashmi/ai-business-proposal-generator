def chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
    """Word-based chunking with overlap. chunk_size and overlap are in words."""
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap  # step forward, but overlap with previous chunk

    return chunks