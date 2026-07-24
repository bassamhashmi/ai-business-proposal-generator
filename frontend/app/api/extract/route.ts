import { NextRequest, NextResponse } from "next/server";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const incoming = await req.formData();

  const forward = new FormData();
  forward.append("company_name", incoming.get("company_name") as string);

  const proposalId = incoming.get("proposal_id");
  if (proposalId) forward.append("proposal_id", proposalId as string);

  const companyContext = incoming.get("company_context");
  if (companyContext)
    forward.append("company_context", companyContext as string);

  const researchIndustry = incoming.get("research_industry");
  if (researchIndustry)
    forward.append("research_industry", researchIndustry as string);

  const researchServiceOffered = incoming.get("research_service_offered");
  if (researchServiceOffered)
    forward.append(
      "research_service_offered",
      researchServiceOffered as string,
    );

  const freeText = incoming.get("free_text");
  if (freeText) forward.append("free_text", freeText as string);

  const file = incoming.get("file");
  if (file instanceof File) forward.append("file", file);

  const response = await fetch(`${AI_SERVER_URL}/api/v1/extract-request`, {
    method: "POST",
    body: forward, // do NOT set Content-Type manually — fetch sets the multipart boundary itself
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.detail || "Extraction failed" },
      { status: response.status },
    );
  }

  return NextResponse.json(await response.json());
}
