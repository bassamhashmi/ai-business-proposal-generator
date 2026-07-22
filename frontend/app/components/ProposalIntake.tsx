"use client";

import { useState } from "react";

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
        <h1 className="text-2xl font-bold mb-6">
          AI Business Proposal Generator
        </h1>
        <form onSubmit={handleExtract} className="space-y-3">
          <input
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
          <textarea
            placeholder="Paste requirements as free text (or upload a file below instead)"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            className="w-full border p-2 rounded h-32"
            disabled={!!file}
          />
          <div className="text-sm text-gray-500">— or —</div>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            type="submit"
            disabled={loading || !companyName || (!freeText && !file)}
            className="bg-black text-white px-4 py-2 rounded"
          >
            {loading ? "Extracting..." : "Extract Details"}
          </button>
        </form>
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Review Extracted Details</h1>
      <p className="text-sm text-gray-500 mb-4">
        Confirm or correct before generating — extraction won&apos;t always be
        perfect.
      </p>
      <div className="space-y-3">
        {fields &&
          (Object.keys(fields) as (keyof ExtractedFields)[]).map((key) => (
            <div key={key}>
              <label className="text-sm font-medium capitalize block mb-1">
                {key.replace(/_/g, " ")}
              </label>
              <input
                value={fields[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
          ))}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {loading ? "Generating..." : "Generate Proposal"}
        </button>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {result && (
        <div className="mt-6 space-y-4">
          {Object.entries(result).map(([section, text]) => (
            <div key={section} className="border p-4 rounded bg-gray-50">
              <h2 className="font-semibold capitalize mb-2">
                {section.replace(/_/g, " ")}
              </h2>
              <p className="whitespace-pre-wrap">{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
