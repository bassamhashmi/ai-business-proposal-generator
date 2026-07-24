from uuid import uuid4
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, func
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


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    business_name = Column(String, nullable=False, default="Untitled proposal")
    website_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft")
    input_data = Column(JSON, nullable=False, default=dict)
    ai_brief = Column(JSON, nullable=True)
    job_reference = Column(String, nullable=True)
    model_versions = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    source_documents = relationship(
        "SourceDocument", back_populates="proposal", cascade="all, delete-orphan"
    )
    research_results = relationship(
        "ResearchResult", back_populates="proposal", cascade="all, delete-orphan"
    )
    generation_runs = relationship(
        "GenerationRun", back_populates="proposal", cascade="all, delete-orphan"
    )
    versions = relationship(
        "ProposalVersion", back_populates="proposal", cascade="all, delete-orphan"
    )
    exports = relationship(
        "ProposalExport", back_populates="proposal", cascade="all, delete-orphan"
    )


class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(Integer, primary_key=True)
    proposal_id = Column(String(36), ForeignKey("proposals.id"), nullable=False, index=True)
    file_name = Column(String, nullable=False)
    media_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    source_type = Column(String, nullable=False, default="upload")
    extraction_status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    proposal = relationship("Proposal", back_populates="source_documents")


class ResearchResult(Base):
    __tablename__ = "research_results"

    id = Column(Integer, primary_key=True)
    proposal_id = Column(String(36), ForeignKey("proposals.id"), nullable=False, index=True)
    source_url = Column(String, nullable=True)
    source_name = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
    structured_data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    proposal = relationship("Proposal", back_populates="research_results")


class GenerationRun(Base):
    __tablename__ = "generation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    proposal_id = Column(String(36), ForeignKey("proposals.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="running")
    job_reference = Column(String, nullable=True)
    model_name = Column(String, nullable=True)
    prompt_version = Column(String, nullable=True)
    request_payload = Column(JSON, nullable=False, default=dict)
    result_payload = Column(JSON, nullable=True)
    error_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    proposal = relationship("Proposal", back_populates="generation_runs")


class ProposalVersion(Base):
    __tablename__ = "proposal_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    proposal_id = Column(String(36), ForeignKey("proposals.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    label = Column(String, nullable=False, default="Generated draft")
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    proposal = relationship("Proposal", back_populates="versions")


class ProposalExport(Base):
    __tablename__ = "proposal_exports"

    id = Column(Integer, primary_key=True)
    proposal_id = Column(String(36), ForeignKey("proposals.id"), nullable=False, index=True)
    format = Column(String, nullable=False)
    version_id = Column(String(36), ForeignKey("proposal_versions.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    proposal = relationship("Proposal", back_populates="exports")
