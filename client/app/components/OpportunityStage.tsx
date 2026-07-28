"use client";

import { useState, useEffect, useRef } from "react";

interface OpportunityStageProps {
  draftId: string;
  initialData?: {
    business_name?: string;
    website_url?: string;
    deadline?: string;
    company_context?: string;
  };
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onAdvance: () => void;
}

export default function OpportunityStage({
  draftId,
  initialData,
  onSave,
  onAdvance,
}: OpportunityStageProps) {
  const [companyName, setCompanyName] = useState(
    initialData?.business_name || "",
  );
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.website_url || "");
  const [deadline, setDeadline] = useState(initialData?.deadline || "");
  const [file, setFile] = useState<File | null>(null);
  const [companyContext, setCompanyContext] = useState(
    initialData?.company_context || "",
  );
  const [researching, setResearching] = useState(false);
  const [researchStatus, setResearchStatus] = useState("");
  const [error, setError] = useState("");

  const onSaveRef = useRef(onSave);
  const lastSavedRef = useRef({
    business_name: companyName,
    website_url: websiteUrl,
    deadline: deadline,
    company_context: companyContext,
  });

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Autosave field changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasAnyValue =
        companyName || websiteUrl || deadline || companyContext;
      const changed =
        lastSavedRef.current.business_name !== companyName ||
        lastSavedRef.current.website_url !== websiteUrl ||
        lastSavedRef.current.deadline !== deadline ||
        lastSavedRef.current.company_context !== companyContext;

      if (hasAnyValue && changed) {
        lastSavedRef.current = {
          business_name: companyName,
          website_url: websiteUrl,
          deadline: deadline,
          company_context: companyContext,
        };
        onSaveRef.current({
          business_name: companyName,
          website_url: websiteUrl || undefined,
          deadline: deadline || undefined,
          company_context: companyContext || undefined,
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [companyName, websiteUrl, deadline, companyContext]);

  const handleResearch = async () => {
    if (!companyName && !websiteUrl) return;
    setResearching(true);
    setResearchStatus("Researching company...");
    setError("");

    try {
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

      const job = await res.json();
      setResearchStatus("Reading company website...");

      // Poll for job completion
      while (true) {
        const jobRes = await fetch(`/api/jobs/${job.id}`);
        const jobData = await jobRes.json();

        if (jobData.status === "completed") {
          const data = jobData.result_data || {};
          const finalCompanyContext = data.company_context || companyContext;
          const finalBusinessName = data.business_name || companyName;
          setCompanyContext(finalCompanyContext);
          if (data.business_name && !companyName) {
            setCompanyName(data.business_name);
          }
          setResearchStatus("");
          setResearching(false);
          lastSavedRef.current = {
            business_name: finalBusinessName,
            website_url: websiteUrl,
            deadline: deadline,
            company_context: finalCompanyContext,
          };
          await onSaveRef.current({
            company_context: finalCompanyContext,
            business_name: finalBusinessName,
          });
          break;
        }

        if (jobData.status === "failed" || jobData.status === "cancelled") {
          throw new Error(jobData.error_message || "Research failed");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {
      setResearchStatus("");
      setResearching(false);
      setError("Company research failed — you can skip this and continue.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    lastSavedRef.current = {
      business_name: companyName,
      website_url: websiteUrl,
      deadline: deadline,
      company_context: companyContext,
    };
    await onSaveRef.current({
      business_name: companyName,
      website_url: websiteUrl || undefined,
      deadline: deadline || undefined,
      company_context: companyContext || undefined,
    });

    // Kick off extraction
    const formData = new FormData();
    formData.append("proposal_id", draftId);
    formData.append("company_name", companyName);
    if (companyContext) formData.append("company_context", companyContext);
    if (file) {
      formData.append("file", file);
    }

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Extraction failed");

      const job = await res.json();
      setResearchStatus("Extracting proposal details...");

      // Poll for job completion
      while (true) {
        const jobRes = await fetch(`/api/jobs/${job.id}`);
        const jobData = await jobRes.json();

        if (jobData.status === "completed") {
          setResearchStatus("");
          // Save the extraction result (AI brief) to the draft
          // and advance the stage at the same time so BriefStage
          // mounts with ai_brief already populated
          const savePayload: Record<string, unknown> = {
            status: "brief_ready",
          };
          if (jobData.result_data) {
            savePayload.ai_brief = jobData.result_data;
          }
          await onSaveRef.current(savePayload);
          onAdvance();
          break;
        }

        if (jobData.status === "failed" || jobData.status === "cancelled") {
          throw new Error(jobData.error_message || "Extraction failed");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {
      setResearchStatus("");
      setError("Failed to extract details. Please try again.");
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold text-white mb-2">Opportunity</h2>
      <p className="text-gray-400 mb-8">
        Enter the opportunity details. The AI will research the company and
        extract key information.
      </p>

      {researchStatus && (
        <div className="mb-6 flex items-center gap-2 text-blue-300">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">{researchStatus}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Company name *
          </label>
          <input
            placeholder="Enter company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            <button
              type="button"
              onClick={handleResearch}
              disabled={(!companyName && !websiteUrl) || researching}
              className="px-4 py-2.5 border border-blue-500 text-blue-200 rounded-lg font-medium hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {researching ? "Researching..." : "Research"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Company context
          </label>
          <textarea
            placeholder="Additional context about the company or opportunity..."
            value={companyContext}
            onChange={(e) => setCompanyContext(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 h-32 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Source documents (RFP, requirements, etc.)
          </label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-white hover:file:bg-gray-600"
            />
            <p className="text-gray-500 text-sm mt-2">
              Upload PDF or DOCX files containing requirements
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!companyName.trim() || researching}
          className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {researching ? "Processing..." : "Continue to AI Brief"}
        </button>
      </form>

      {error && (
        <div className="mt-6 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
