from app.db.session import engine, Base
from app.db.models import PastProposal  # noqa: ensures model is registered

def init_db():
    Base.metadata.create_all(bind=engine)