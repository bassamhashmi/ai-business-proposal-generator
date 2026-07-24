# AI Proposal Generator - Server Architecture

## Overview

The server is a FastAPI-based AI backend that generates business proposals using LLMs, semantic search, and structured extraction. It processes client requirements, researches companies, extracts key details, and generates professional proposals with RAG (Retrieval-Augmented Generation).

---

## Architecture Layers

### 1. API Layer (`app/api/routes/`)
RESTful endpoints that handle incoming requests from the Next.js frontend.

**Endpoints:**
- **`POST /api/v1/research-company`** - Researches a company by name or website URL
  - Uses web search tools or website scraping
  - Returns company context, business name, industry, and services offered
  
- **`POST /api/v1/extract-request`** - Extracts structured fields from client requirements
  - Accepts PDF/DOCX files or free text
  - Uses research data as optional hints
  - Returns: industry, service offered, pain points, budget, timeline
  
- **`POST /api/v1/generate-proposal`** - Generates a complete business proposal
  - Uses RAG with past proposal examples
  - Returns: executive summary, scope of work, timeline, pricing, next steps
  
- **`POST /api/v1/export-pdf`** / **`POST /api/v1/export-docx`** - Exports proposals as documents
  - Generates formatted PDF or DOCX files
  - Uses Jinja2 templates for PDF, python-docx for DOCX

---

### 2. Service Layer (`app/services/`)

**Core Services:**

- **`agent_service.py`** - AI agent for company research
  - Uses tool-calling LLM to search web for company information
  - Scrapes and summarizes website content
  - Extracts structured data (industry, services) when clearly available
  
- **`extraction_service.py`** - Information extraction from requirements
  - Uses structured LLM generation to extract fields
  - Accepts research hints but prefers source text
  - Validates output against Pydantic schema
  
- **`proposal_service.py`** - Proposal generation with RAG
  - Retrieves similar past proposals using semantic search
  - Uses examples as style/structure reference
  - Generates new content tailored to current client
  
- **`retrieval_service.py`** - Semantic similarity search
  - Finds relevant proposal chunks using cosine similarity
  - Supports RAG by providing context to LLM
  
- **`embedding_service.py`** - Text embeddings
  - Uses SentenceTransformer for vector embeddings
  - Cached model loading for performance
  - Normalized vectors for cosine similarity
  
- **`document_service.py`** - Document generation
  - PDF generation via WeasyPrint + Jinja2 templates
  - DOCX generation via python-docx
  
- **`file_input_service.py`** - File processing
  - PDF text extraction
  - DOCX text extraction
  
- **`website_service.py`** - Web scraping
  - Fetches and extracts text from websites
  - Handles errors gracefully

---

### 3. LLM Layer (`app/llm/`)

**Abstraction:**
- **`base.py`** - Abstract interface for LLM providers
  - `generate_structured()` - JSON schema-constrained generation
  - `chat_with_tools()` - Tool-calling capabilities
  
- **`factory.py`** - Provider factory
  - Currently supports Ollama (local LLMs)
  - Extensible for other providers (OpenAI, Anthropic, etc.)

**Provider:**
- **`ollama_provider.py`** - Ollama implementation
  - Structured output via JSON mode
  - Tool calling for web search

---

### 4. Prompts Layer (`app/prompts/`)

System and user prompts for each AI task:

- **`research_prompts.py`** - Company research instructions
  - Website summarization with structured extraction
  - Tool-calling agent for web research
  
- **`extraction_prompts.py`** - Field extraction instructions
  - Strict extraction from source text
  - Conditional use of research hints
  
- **`proposal_prompts.py`** - Proposal generation instructions
  - RAG-based generation with examples
  - Style guidance from past proposals

---

### 5. Database Layer (`app/db/`)

**Models:**
- **`ProposalChunk`** - Stores embedded text chunks from past proposals
  - Vector embeddings for semantic search
  - Links to parent proposal metadata

**Operations:**
- **`seed.py`** - Populates database with example proposals
- **`init_db.py`** - Database initialization
- **`session.py`** - Database session management

---

### 6. Schemas Layer (`app/schemas/`)

Pydantic models for request/response validation:

- **`research_output.py`** - Research results (business_name, summary, industry, service_offered)
- **`extraction_output.py`** - Extracted fields (industry, service_offered, pain_points, budget, timeline)
- **`proposal_request.py`** - Proposal generation input
- **`proposal_output.py`** - Generated proposal structure
- **`export_request.py`** - Document export parameters

---

### 7. Tools Layer (`app/tools/`)

**Tool Definitions:**
- **`tool_definitions.py`** - Tool schemas for LLM function calling
- **`web_search_tool.py`** - Web search implementation

Used by the research agent to gather company information.

---

## Data Flow

### Complete User Journey:

```
1. User enters company name/website → Research
   ├─ Frontend: POST /api/research
   ├─ Backend: agent_service.research_company() or研究research_by_website()
   ├─ LLM: Web search OR website scraping + structured extraction
   └─ Returns: company_context, business_name, industry, service_offered

2. User uploads requirements/pastes text → Extraction
   ├─ Frontend: POST /api/extract (with research data)
   ├─ Backend: extraction_service.extract_fields()
   ├─ LLM: Structured extraction with research hints
   └─ Returns: industry, service_offered, pain_points, budget, timeline

3. User reviews/edits fields → Proposal Generation
   ├─ Frontend: POST /api/generate
   ├─ Backend: proposal_service.generate_proposal()
   ├─ RAG: retrieval_service finds similar past proposals
   ├─ LLM: Generates new proposal using examples as style guide
   └─ Returns: executive_summary, scope_of_work, timeline, pricing, next_steps

4. User exports proposal → Document Generation
   ├─ Frontend: POST /api/export-pdf or /export-docx
   ├─ Backend: document_service.generate_pdf() or generate_docx()
   └─ Returns: Binary file (PDF/DOCX)
```

---

## Key AI/ML Components

### Structured Generation
- All LLM outputs are constrained by JSON schemas
- Ensures type safety and validation
- Enables reliable downstream processing

### Retrieval-Augmented Generation (RAG)
- Past proposals are chunked and embedded
- Semantic search finds relevant examples
- LLM uses examples for style/structure guidance
- Improves consistency and quality

### Tool Calling
- Research agent can call web search
- Enables dynamic information gathering
- Autonomous research with multiple iterations

### Embeddings
- SentenceTransformer for text vectors
- Cosine similarity for semantic search
- Normalized vectors for stable comparisons

---

## Technology Stack

- **Framework:** FastAPI
- **LLM:** Ollama (local models)
- **Embeddings:** SentenceTransformer
- **Database:** PostgreSQL with pgvector (for vector similarity)
- **Document Generation:** WeasyPrint (PDF), python-docx (DOCX)
- **Templating:** Jinja2
- **ORM:** SQLAlchemy

---

## Configuration

Environment variables (via `.env`):
- `LLM_PROVIDER` - LLM backend (ollama)
- `OLLAMA_MODEL` - Model name
- `OLLAMA_BASE_URL` - Ollama server URL
- `EMBEDDING_MODEL` - SentenceTransformer model
- `DATABASE_URL` - PostgreSQL connection
- `NEXT_PUBLIC_API_URL` - Frontend URL for CORS

---

## Error Handling

- Custom exceptions for each service (`ExtractionError`, `ProposalGenerationError`)
- Retry logic for LLM failures (1 retry by default)
- Graceful degradation when research fails
- HTTP 502 errors for upstream AI failures
