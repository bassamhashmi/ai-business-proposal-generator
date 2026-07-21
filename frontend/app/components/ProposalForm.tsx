"use client";

import { useState } from "react";
import { generateProposal } from "@/lib/api-client";

type ProposalResult = {
  executive_summary: string;
  scope_of_work: string;
  timeline: string;
  pricing_overview: string;
  next_steps: string;
};

const FIELDS = [
  "business_name",
  "industry",
  "service_offered",
  "client_pain_points",
  "budget_range",
  "timeline",
];

export default function ProposalForm() {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f, ""])),
  );
  const [result, setResult] = useState<ProposalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await generateProposal(form);
      setResult(data);
    } catch {
      setError("Something went wrong generating the proposal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">
        AI Business Proposal Generator
      </h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        {FIELDS.map((key) => (
          <input
            key={key}
            name={key}
            placeholder={key.replace(/_/g, " ")}
            value={form[key]}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        ))}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {loading ? "Generating..." : "Generate Proposal"}
        </button>
      </form>

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
