from app.db.session import SessionLocal
from app.db.models import PastProposal
from app.services.embedding_service import embed_text
from app.db.init_db import init_db

SAMPLE_PROPOSALS = [
    {
        "business_name": "Riverside Bakery",
        "industry": "Food & Beverage",
        "service_offered": "Online ordering system",
        "content": (
            "We proposed a custom online ordering platform for Riverside Bakery, "
            "enabling customers to browse daily inventory, place pickup orders, and pay online. "
            "The engagement included a 6-week build, POS integration, and staff training, "
            "priced at a fixed fee with a 3-month post-launch support window."
        ),
    },
    {
        "business_name": "Clearwater Consulting",
        "industry": "Professional Services",
        "service_offered": "CRM implementation",
        "content": (
            "For Clearwater Consulting, we implemented a lightweight CRM to replace their "
            "spreadsheet-based client tracking, including pipeline stages, automated follow-up "
            "reminders, and reporting dashboards. Delivered over 8 weeks with milestone-based billing."
        ),
    },
    {
        "business_name": "Bright Path Tutoring",
        "industry": "Education",
        "service_offered": "Scheduling and payments platform",
        "content": (
            "Bright Path Tutoring needed a self-serve booking system for parents to schedule "
            "sessions and pay tutors automatically. We built a scheduling engine with conflict "
            "detection and Stripe-based payments, delivered in 5 weeks with a tiered pricing model "
            "based on tutor volume."
        ),
    },
]

def seed():
    init_db()
    db = SessionLocal()
    try:
        if db.query(PastProposal).count() > 0:
            print("Already seeded, skipping.")
            return
        for item in SAMPLE_PROPOSALS:
            embedding = embed_text(item["content"])
            db.add(PastProposal(**item, embedding=embedding))
        db.commit()
        print(f"Seeded {len(SAMPLE_PROPOSALS)} past proposals.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()