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
) {
  const res = await fetch(`/api/export-${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ business_name: businessName, proposal }),
  });
  if (!res.ok) throw new Error("Export failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proposal.${kind}`;
  a.click();
  URL.revokeObjectURL(url);
}
