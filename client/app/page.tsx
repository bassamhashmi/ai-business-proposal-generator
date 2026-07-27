"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProposalDraft } from "@/lib/api-client";

export default function Home() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const draft = await createProposalDraft({
        business_name: companyName,
        status: "draft",
      });
      router.push(`/proposals/${draft.id}`);
    } catch {
      setError("Failed to create proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <h1 className="text-3xl font-semibold text-white mb-2">
          AI Proposal Generator
        </h1>
        <p className="text-gray-400 mb-8">Create a new proposal workspace</p>

        <form onSubmit={handleCreateProposal} className="space-y-5">
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

          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Proposal"}
          </button>
        </form>

        {error && (
          <p className="mt-6 text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
