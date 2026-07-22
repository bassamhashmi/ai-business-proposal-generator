import json
from pathlib import Path
from app.db.session import SessionLocal
from app.db.models import PastProposal, ProposalChunk
from app.services.embedding_service import embed_text
from app.services.pdf_service import extract_text_from_pdf
from app.services.chunking_service import chunk_text
from app.db.init_db import init_db

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "past_proposals"

def seed():
    init_db()
    db = SessionLocal()
    try:
        if db.query(PastProposal).count() > 0:
            print("Already seeded, skipping. Delete rows manually to re-seed.")
            return

        manifest = json.loads((DATA_DIR / "manifest.json").read_text())

        for entry in manifest:
            pdf_path = DATA_DIR / entry["file"]
            if not pdf_path.exists():
                print(f"Skipping missing file: {entry['file']}")
                continue

            full_text = extract_text_from_pdf(str(pdf_path))
            if not full_text:
                print(f"No extractable text in {entry['file']}, skipping.")
                continue

            proposal = PastProposal(
                business_name=entry["business_name"],
                industry=entry["industry"],
                service_offered=entry["service_offered"],
                source_file=entry["file"],
            )
            db.add(proposal)
            db.flush()  # assigns proposal.id without committing yet

            chunks = chunk_text(full_text)
            for i, chunk in enumerate(chunks):
                embedding = embed_text(chunk)
                db.add(ProposalChunk(
                    proposal_id=proposal.id,
                    chunk_index=i,
                    chunk_text=chunk,
                    embedding=embedding,
                ))

            print(f"Seeded '{entry['business_name']}' — {len(chunks)} chunks from {entry['file']}")

        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    seed()