from sqlalchemy import Column, Integer, String, Text
from pgvector.sqlalchemy import Vector
from app.db.session import Base
from app.core.config import settings

class PastProposal(Base):
    __tablename__ = "past_proposals"

    id = Column(Integer, primary_key=True)
    business_name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    service_offered = Column(String, nullable=False)
    content = Column(Text, nullable=False)          # the full past proposal text
    embedding = Column(Vector(settings.embedding_dim), nullable=False)