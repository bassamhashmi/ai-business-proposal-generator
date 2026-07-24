# Evaluation fixtures

`cases.json` is a versioned set of representative proposal inputs. Add sanitized
cases whenever an extraction, retrieval, or proposal-quality regression is found.

The initial automated score intentionally checks deterministic properties only:
schema completeness and unresolved placeholders. Run LLM-based scoring separately
with fixed model/prompt versions and retain sampled human review results.
