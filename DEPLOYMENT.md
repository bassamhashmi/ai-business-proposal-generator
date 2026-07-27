# Deployment Readiness Checklist

Before handling production client data:

- Replace FastAPI in-process jobs and the in-memory research cache with Redis and a durable worker.
- Add authentication, tenant isolation, authorization checks, rate limits, and audit logs.
- Store uploads in managed object storage; scan files and define retention/deletion policies.
- Use Alembic migrations instead of `create_all`; configure database backups and restore tests.
- Set `LOG_LLM_RESPONSES=false`; use managed secrets and configure model-provider fallback.
- Deploy client, API/worker, Redis, and Postgres/pgvector as separate services with health checks.
- Run the evaluation fixtures and human quality review before each prompt/model release.
