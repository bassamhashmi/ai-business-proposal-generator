from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.session import Base
from app.core.config import settings

class PastProposal(Base):
    __tablename__ = "past_proposals"

    id = Column(Integer, primary_key=True)
    business_name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    service_offered = Column(String, nullable=False)
    source_file = Column(String, nullable=False)

    chunks = relationship("ProposalChunk", back_populates="proposal", cascade="all, delete-orphan")


class ProposalChunk(Base):
    __tablename__ = "proposal_chunks"

    id = Column(Integer, primary_key=True)
    proposal_id = Column(Integer, ForeignKey("past_proposals.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(settings.embedding_dim), nullable=False)

    proposal = relationship("PastProposal", back_populates="chunks")