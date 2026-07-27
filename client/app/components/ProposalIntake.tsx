"use client";

import { useState } from "react";
import {
  createProposalDraft,
  exportDocument,
  updateProposalDraft,
} from "@/lib/api-client";

type ExtractedFields = {
  business_name: string;
  industry: string;
  service_offered: string;
  client_pain_points: string;
  budget_range: string;
  timeline: string;
};

type ProposalResult = {
  executive_summary: string;
  scope_of_work: string;
  timeline: string;
  pricing_overview: string;
  next_steps: string;
  proposal_id?: string;
  version_id?: string;
};

type EvidenceField = {
  value: string;
  confidence: "high" | "medium" | "low" | "missing";
  source_reference: string;
  source_excerpt: string;
};

type EvidenceBrief = Record<string, EvidenceField | string[] | string> & {
  business_name: string;
  missing_information: string[];
};

type JobResult = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  stage: string;
  result_data?: Record<string, unknown>;
  error_message?: string;
};

type Strategy = { template: string; tone: string; differentiators: string; case_studies: string; standard_terms: string; pricing_notes: string };
type Outline = { title: string; sections: { heading: string; purpose: string }[] };

export default function ProposalIntake() {
  const [step, setStep] = useState<"intake" | "review">("intake");
  const [companyName, setCompanyName] = useState("");
  const [freeText, setFreeText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companyContext, setCompanyContext] = useState("");
  const [researchIndustry, setResearchIndustry] = useState("");
  const [researchServiceOffered, setResearchServiceOffered] = useState("");
  const [researching, setResearching] = useState(false);
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [brief, setBrief] = useState<EvidenceBrief | null>(null);
  const [acceptMissingCommercialDetails, setAcceptMissingCommercialDetails] = useState(false);
  const [result, setResult] = useState<ProposalResult | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"" | "Saving draft..." | "Draft saved">("");
  const [jobStage, setJobStage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState<Strategy>({ template: "Business proposal", tone: "Confident and consultative", differentiators: "", case_studies: "", standard_terms: "", pricing_notes: "" });
  const [outline, setOutline] = useState<Outline | null>(null);
  const [qualityIssues, setQualityIssues] = useState<{ severity: string; section: string; message: string }[]>([]);

  const createDraft = async () => {
    if (proposalId) return proposalId;
    const draft = await createProposalDraft({
      business_name: companyName || "Untitled proposal",
      website_url: websiteUrl || undefined,
      input_data: {
        company_name: companyName,
        website_url: websiteUrl,
        company_context: companyContext,
      },
    });
    setProposalId(draft.id);
    return draft.id;
  };

  const waitForJob = async (jobId: string) => {
    while (true) {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("Unable to read job status");
      const job = (await res.json()) as JobResult;
      setJobStage(job.stage.replace(/_/g, " "));
      if (job.status === "completed") return job.result_data || {};
      if (job.status === "failed" || job.status === "cancelled") {
        throw new Error(job.error_message || "Background task failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  const toGenerationFields = (value: EvidenceBrief): ExtractedFields => ({
    business_name: value.business_name,
    industry: (value.industry as EvidenceField).value,
    service_offered: (value.service_offered as EvidenceField).value,
    client_pain_points: (value.client_pain_points as EvidenceField).value,
    budget_range: (value.budget_range as EvidenceField).value,
    timeline: (value.timeline as EvidenceField).value,
  });

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("company_name", companyName);
    formData.append("company_context", companyContext);
    if (researchIndustry)
      formData.append("research_industry", researchIndustry);
    if (researchServiceOffered)
      formData.append("research_service_offered", researchServiceOffered);
    if (file) formData.append("file", file);
    else formData.append("free_text", freeText);

    try {
      setSaveState("Saving draft...");
      const draftId = proposalId
        ? proposalId
        : (
            await createProposalDraft({
              business_name: companyName,
              website_url: websiteUrl || undefined,
              input_data: {
                company_name: companyName,
                website_url: websiteUrl,
                company_context: companyContext,
                research_industry: researchIndustry,
                research_service_offered: researchServiceOffered,
                requirements_text: file ? undefined : freeText,
              },
              source_documents: file
                ? [
                    {
                      file_name: file.name,
                      media_type: file.type || undefined,
                      size_bytes: file.size,
                    },
                  ]
                : [],
            })
          ).id;
      setProposalId(draftId);
      formData.append("proposal_id", draftId);
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const job = (await res.json()) as JobResult;
      setJobStage("queued");
      const extracted = (await waitForJob(job.id)) as EvidenceBrief;
      setBrief(extracted);
      setFields(toGenerationFields(extracted));
      await updateProposalDraft(draftId, {
          status: "brief_ready",
          ai_brief: extracted,
      });
      setSaveState("Draft saved");
      setJobStage("");
      setStep("review");
    } catch {
      setSaveState("");
      setJobStage("");
      setError(
        "Couldn't extract fields from that input. Try again or check the file format.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = async () => {
    if (!companyName && !websiteUrl) return;
    setResearching(true);
    try {
      const draftId = await createDraft();
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName || undefined,
          website_url: websiteUrl || undefined,
          proposal_id: draftId,
        }),
      });
      if (!res.ok) throw new Error("Research request failed");
      const job = (await res.json()) as JobResult;
      setJobStage("queued");
      const data = (await waitForJob(job.id)) as Record<string, string>;
      setCompanyContext(data.company_context || "");
      setResearchIndustry(data.industry || "");
      setResearchServiceOffered(data.service_offered || "");
      if (data.business_name && !companyName) {
        setCompanyName(data.business_name);
      }
      setJobStage("");
    } catch {
      setJobStage("");
      setError("Company research failed — you can skip this and continue.");
    } finally {
      setResearching(false);
    }
  };

  const updateField = (key: keyof ExtractedFields, value: string) => {
    if (fields) setFields({ ...fields, [key]: value });
    if (brief && key !== "business_name") {
      const item = brief[key] as EvidenceField;
      setBrief({ ...brief, [key]: { ...item, value, confidence: "high", source_reference: "User review", source_excerpt: "Edited by user" } });
    }
  };

  const handleGenerate = async () => {
    if (!fields) return;
    if ((!fields.budget_range || !fields.timeline) && !acceptMissingCommercialDetails) {
      setError("Confirm that you accept the missing budget or timeline assumptions before generating.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (proposalId) {
        setSaveState("Saving draft...");
        await updateProposalDraft(proposalId, {
          status: "ready_for_generation",
          input_data: { ...fields, strategy, outline },
          ai_brief: brief || fields,
        });
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, strategy, proposal_id: proposalId || undefined }),
      });
      if (!res.ok) throw new Error();
      const job = (await res.json()) as JobResult;
      setJobStage("queued");
      const generated = (await waitForJob(job.id)) as ProposalResult;
      setResult(generated);
      if (generated.proposal_id) setProposalId(generated.proposal_id);
      setSaveState("Draft saved");
      setJobStage("");
    } catch {
      setJobStage("");
      setError("Something went wrong generating the proposal.");
    } finally {
      setLoading(false);
    }
  };

  const handleOutline = async () => {
    if (!proposalId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${proposalId}/outline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(strategy) });
      if (!res.ok) throw new Error();
      const job = (await res.json()) as JobResult;
      setJobStage("queued");
      setOutline((await waitForJob(job.id)) as unknown as Outline);
      setJobStage("");
    } catch {
      setJobStage("");
      setError("Couldn't generate the proposal outline.");
    } finally { setLoading(false); }
  };

  const handleQualityCheck = async () => {
    if (!proposalId || !result) return;
    const proposal = Object.fromEntries(
      Object.entries(result).filter(([key]) => key !== "proposal_id" && key !== "version_id"),
    );
    const res = await fetch(`/api/proposals/${proposalId}/quality-check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proposal) });
    if (!res.ok) { setError("Couldn't run proposal quality checks."); return; }
    const data = await res.json();
    setQualityIssues(data.issues || []);
  };

  const missingInformation = Array.isArray(brief?.missing_information)
    ? brief.missing_information
    : [];

  if (step === "intake") {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-semibold text-white mb-2">
          AI Business Proposal Generator
        </h1>
        <p className="text-gray-400 mb-8">
          Upload a document or paste requirements to extract proposal details
        </p>
        {saveState && <p className="text-sm text-gray-400 mb-4">{saveState}</p>}
        {jobStage && <p className="text-sm text-blue-300 mb-4">Working: {jobStage}...</p>}
        <form onSubmit={handleExtract} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Company name
            </label>
            <input
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>
          <div className="flex gap-2 items-start">
            <input
              placeholder="Company website URL (optional)"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full border p-2 rounded text-sm"
            />
            <button
              type="button"
              onClick={handleResearch}
              disabled={(!companyName && !websiteUrl) || researching}
              className="border px-3 py-2 rounded text-sm"
            >
              {researching ? "Researching..." : "Research Company"}
            </button>
          </div>
          {companyContext && (
            <textarea
              value={companyContext}
              onChange={(e) => setCompanyContext(e.target.value)}
              className="w-full border p-2 rounded h-24 text-sm"
            />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Requirements
            </label>
            <textarea
              placeholder="Paste requirements as free text (or upload a file below instead)"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 h-32 resize-none"
              disabled={!!file}
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-900 text-gray-400">or</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Upload document
            </label>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-white hover:file:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !companyName || (!freeText && !file)}
            className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Extracting..." : "Extract Details"}
          </button>
        </form>
        {error && (
          <p className="mt-6 text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-semibold text-white mb-2">
        Review Extracted Details
      </h1>
      <p className="text-gray-400 mb-8">
        Confirm or correct the extracted information before generating the
        proposal
      </p>
      {saveState && <p className="text-sm text-gray-400 mb-4">{saveState}</p>}
      {jobStage && <p className="text-sm text-blue-300 mb-4">Working: {jobStage}...</p>}
      <div className="space-y-5">
        {fields &&
          (Object.keys(fields) as (keyof ExtractedFields)[]).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5 capitalize">
                {key.replace(/_/g, " ")}
              </label>
              <input
                value={fields[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          ))}
        {missingInformation.length > 0 && (
          <div className="border border-amber-700 rounded-lg p-4 bg-amber-900/20 text-amber-100">
            <p className="font-medium mb-2">Information to confirm</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {missingInformation.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {brief && (
          <div className="space-y-3 text-sm text-gray-400">
            {(Object.entries(brief) as [string, EvidenceField | string[] | string][])
              .filter(([key, item]) => key !== "business_name" && key !== "missing_information" && typeof item === "object" && !Array.isArray(item))
              .map(([key, item]) => {
                const evidence = item as EvidenceField;
                return evidence.source_excerpt ? <p key={key}><span className="text-gray-300 capitalize">{key.replace(/_/g, " ")}:</span> {evidence.confidence} confidence — {evidence.source_excerpt}</p> : null;
              })}
          </div>
        )}
        {(!fields?.budget_range || !fields?.timeline) && (
          <label className="flex gap-2 text-sm text-amber-200">
            <input type="checkbox" checked={acceptMissingCommercialDetails} onChange={(e) => setAcceptMissingCommercialDetails(e.target.checked)} />
            I accept that missing budget or timeline details are assumptions requiring review.
          </label>
        )}
        <div className="border border-gray-700 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-white">Proposal strategy</h2>
          {(Object.keys(strategy) as (keyof Strategy)[]).map((key) => <input key={key} value={strategy[key]} placeholder={key.replace(/_/g, " ")} onChange={(e) => setStrategy({ ...strategy, [key]: e.target.value })} className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-white" />)}
          <button onClick={handleOutline} disabled={loading || !proposalId} className="w-full border border-blue-500 text-blue-200 px-4 py-2 rounded disabled:opacity-50">{loading ? "Planning..." : "Generate proposal outline"}</button>
          {outline && <div className="text-sm text-gray-300"><p className="font-medium text-white mb-2">{outline.title}</p><ol className="list-decimal pl-5 space-y-1">{outline.sections.map((section) => <li key={section.heading}><span className="text-white">{section.heading}</span> — {section.purpose}</li>)}</ol></div>}
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Proposal"}
        </button>
      </div>

      {error && (
        <p className="mt-6 text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {result && (
        <>
          <button onClick={handleQualityCheck} className="mt-6 w-full border border-amber-600 text-amber-200 px-4 py-2 rounded">Run quality checks</button>
          {qualityIssues.length > 0 && <div className="mt-3 border border-amber-700 rounded p-4 text-sm text-amber-100">{qualityIssues.map((issue) => <p key={`${issue.section}-${issue.message}`}>{issue.section.replace(/_/g, " ")}: {issue.message}</p>)}</div>}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() =>
                exportDocument(
                  "pdf",
                  fields!.business_name,
                  result,
                  proposalId || undefined,
                  result.version_id,
                )
              }
              className="flex-1 border border-gray-600 text-gray-300 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              Download PDF
            </button>
            <button
              onClick={() =>
                exportDocument(
                  "docx",
                  fields!.business_name,
                  result,
                  proposalId || undefined,
                  result.version_id,
                )
              }
              className="flex-1 border border-gray-600 text-gray-300 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              Download DOCX
            </button>
          </div>
          <div className="mt-8 space-y-5">
            <h2 className="text-xl font-semibold text-white">
              Generated Proposal
            </h2>
            {Object.entries(result)
              .filter(([section]) => !["proposal_id", "version_id"].includes(section))
              .map(([section, text]) => (
              <div
                key={section}
                className="border border-gray-700 rounded-lg p-5 bg-gray-800 shadow-sm"
              >
                <h3 className="font-semibold text-white mb-3 capitalize">
                  {section.replace(/_/g, " ")}
                </h3>
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {text}
                </p>
              </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
