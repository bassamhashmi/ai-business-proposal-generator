import re
from app.schemas.proposal_output import ProposalOutput


def check_proposal_quality(proposal: ProposalOutput) -> list[dict[str, str]]:
    issues: list[dict[str, str]] = []
    for section, content in proposal.model_dump().items():
        if not content.strip():
            issues.append({"severity": "error", "section": section, "message": "This section is empty."})
        if re.search(r"\[(?:insert|todo|placeholder)|<[^>]+>", content, re.I):
            issues.append({"severity": "error", "section": section, "message": "Contains an unresolved placeholder."})
    if not proposal.pricing_overview.strip():
        issues.append({"severity": "warning", "section": "pricing_overview", "message": "Commercial terms need review."})
    if not proposal.timeline.strip():
        issues.append({"severity": "warning", "section": "timeline", "message": "Timeline needs review."})
    return issues
