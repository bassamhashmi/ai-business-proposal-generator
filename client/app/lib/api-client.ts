export type GeneratedProposalContent = {
  executive_summary: string;
  scope_of_work: string;
  timeline: string;
  pricing_overview: string;
  next_steps: string;
  proposal_id?: string;
  version_id?: string;
};

export type ProposalVersion = {
  id: string;
  version_number: number;
  label: string;
  content: Record<string, string>;
  created_at: string;
};

export type ProposalDraft = {
  id: string;
  status: string;
  business_name?: string;
  input_data?: Record<string, unknown>;
  ai_brief?: Record<string, unknown>;
  versions?: ProposalVersion[];
  created_at?: string;
  updated_at?: string;
};

const PROPOSAL_SECTIONS = [
  "executive_summary",
  "scope_of_work",
  "timeline",
  "pricing_overview",
  "next_steps",
] as const;

function isGeneratedContent(
  value: unknown,
): value is GeneratedProposalContent {
  if (!value || typeof value !== "object") return false;
  return PROPOSAL_SECTIONS.every(
    (key) => typeof (value as Record<string, unknown>)[key] === "string",
  );
}

export function getGeneratedContent(
  draft: ProposalDraft,
): GeneratedProposalContent | null {
  const fromInput = draft.input_data?.generated_content;
  if (isGeneratedContent(fromInput)) {
    return fromInput;
  }

  const versions = draft.versions ?? [];
  if (versions.length === 0) return null;

  const latest = [...versions].sort(
    (a, b) => b.version_number - a.version_number,
  )[0];
  if (!isGeneratedContent(latest.content)) return null;

  return {
    ...latest.content,
    version_id: latest.id,
  };
}

export async function getProposalDraft(proposalId: string) {
  const res = await fetch(`/api/proposals/${proposalId}`);
  if (!res.ok) throw new Error("Failed to fetch proposal draft");
  return (await res.json()) as ProposalDraft;
}

export async function createProposalDraft(payload: Record<string, unknown>) {
  const res = await fetch("/api/proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create proposal draft");
  return (await res.json()) as ProposalDraft;
}

export async function updateProposalDraft(
  proposalId: string,
  payload: Record<string, unknown>,
) {
  const res = await fetch(`/api/proposals/${proposalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save proposal draft");
  return (await res.json()) as ProposalDraft;
}

export async function generateProposal(formData: Record<string, string>) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error("Failed to generate proposal");
  return res.json();
}

export async function exportDocument(
  kind: "pdf" | "docx",
  businessName: string,
  proposal: Record<string, string>,
  proposalId?: string,
  versionId?: string,
) {
  const res = await fetch(`/api/export-${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      business_name: businessName,
      proposal,
      proposal_id: proposalId,
      version_id: versionId,
    }),
  });
  if (!res.ok) throw new Error("Export failed");

  // Get filename from Content-Disposition header if available
  const contentDisposition = res.headers.get("Content-Disposition");
  let filename = `${businessName.replace(/\s+/g, "_").toLowerCase()}_proposal.${kind}`;

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
    );
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, "");
    }
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
