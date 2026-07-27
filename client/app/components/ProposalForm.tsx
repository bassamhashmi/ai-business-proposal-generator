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
      <h1 className="text-3xl font-semibold text-white mb-2">
        AI Business Proposal Generator
      </h1>
      <p className="text-gray-400 mb-8">
        Fill in the details below to generate a professional proposal
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {FIELDS.map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-300 mb-1.5 capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <input
              name={key}
              placeholder={`Enter ${key.replace(/_/g, " ")}`}
              value={form[key]}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Proposal"}
        </button>
      </form>

      {error && (
        <p className="mt-6 text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {result && (
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
      )}
    </div>
  );
}
