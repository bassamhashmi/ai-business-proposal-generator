from typing import Any
from app.schemas.proposal_output import ProposalOutput
from app.services.quality_service import check_proposal_quality


def score_generation(proposal: ProposalOutput, required_fields: list[str]) -> dict[str, Any]:
    issues = check_proposal_quality(proposal)
    section_values = proposal.model_dump()
    populated_sections = sum(bool(value.strip()) for value in section_values.values())
    return {
        "schema_completeness": populated_sections / len(section_values),
        "quality_issue_count": len(issues),
        "required_input_count": len(required_fields),
        "passed": populated_sections == len(section_values) and not any(
            issue["severity"] == "error" for issue in issues
        ),
    }
