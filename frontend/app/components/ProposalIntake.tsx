"use client";

import { useState } from "react";
import { exportDocument } from "@/lib/api-client";

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
};

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
  const [result, setResult] = useState<ProposalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      setFields(await res.json());
      setStep("review");
    } catch {
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
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName || undefined,
          website_url: websiteUrl || undefined,
        }),
      });
      const data = await res.json();
      setCompanyContext(data.company_context || "");
      setResearchIndustry(data.industry || "");
      setResearchServiceOffered(data.service_offered || "");
      if (data.business_name && !companyName) {
        setCompanyName(data.business_name);
      }
    } catch {
      setError("Company research failed — you can skip this and continue.");
    } finally {
      setResearching(false);
    }
  };

  const updateField = (key: keyof ExtractedFields, value: string) => {
    if (fields) setFields({ ...fields, [key]: value });
  };

  const handleGenerate = async () => {
    if (!fields) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      setError("Something went wrong generating the proposal.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "intake") {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-semibold text-white mb-2">
          AI Business Proposal Generator
        </h1>
        <p className="text-gray-400 mb-8">
          Upload a document or paste requirements to extract proposal details
        </p>
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
          <div className="flex gap-3 mt-6">
            <button
              onClick={() =>
                exportDocument("pdf", fields!.business_name, result)
              }
              className="flex-1 border border-gray-600 text-gray-300 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              Download PDF
            </button>
            <button
              onClick={() =>
                exportDocument("docx", fields!.business_name, result)
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
            {Object.entries(result).map(([section, text]) => (
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
