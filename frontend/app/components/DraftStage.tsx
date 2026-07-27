"use client";

import { useState } from "react";

type ProposalResult = {
  executive_summary: string;
  scope_of_work: string;
  timeline: string;
  pricing_overview: string;
  next_steps: string;
  proposal_id?: string;
  version_id?: string;
};

interface DraftStageProps {
  draftId: string;
  initialDraft?: unknown;
  businessName?: string;
  aiBrief?: unknown;
  strategy?: unknown;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onAdvance: () => void;
}

export default function DraftStage({
  draftId,
  initialDraft,
  businessName,
  aiBrief,
  strategy,
  onSave,
  onAdvance,
}: DraftStageProps) {
  const [draft, setDraft] = useState<ProposalResult | null>(
    (initialDraft as ProposalResult) || null,
  );
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [error, setError] = useState("");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState("");
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(
    null,
  );

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationStatus("Generating proposal content...");
    setError("");

    try {
      // Extract required fields from aiBrief
      const brief = aiBrief as Record<string, unknown>;
      const getField = (key: string, fallback: string = ""): string => {
        const field = brief[key] as Record<string, string> | undefined;
        return field?.value || fallback;
      };

      const requestBody = {
        proposal_id: draftId,
        business_name: businessName || "",
        industry: getField("industry", "Technology"),
        service_offered: getField("service_offered", "Software Development"),
        client_pain_points: getField("pain_points", ""),
        budget_range: getField("budget_range", ""),
        timeline: getField("timeline", ""),
        strategy: strategy as Record<string, unknown> | undefined,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) throw new Error("Generation failed");

      const job = await res.json();
      setGenerationStatus("Writing proposal sections...");

      // Poll for job completion
      while (true) {
        const jobRes = await fetch(`/api/jobs/${job.id}`);
        const jobData = await jobRes.json();

        if (jobData.status === "completed") {
          const generated = jobData.result_data as ProposalResult;
          setDraft(generated);
          setGenerationStatus("");
          setGenerating(false);
          await onSave({
            input_data: {
              generated_content: generated,
            },
            status: "generated",
          });
          break;
        }

        if (jobData.status === "failed" || jobData.status === "cancelled") {
          throw new Error(jobData.error_message || "Generation failed");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {
      setGenerationStatus("");
      setGenerating(false);
      setError("Failed to generate proposal. Please try again.");
    }
  };

  const handleEditSection = (section: string) => {
    if (!draft) return;
    setEditingSection(section);
    setSectionContent(draft[section as keyof ProposalResult] as string);
  };

  const handleSaveSection = () => {
    if (!editingSection || !draft) return;
    setDraft({
      ...draft,
      [editingSection]: sectionContent,
    });
    setEditingSection(null);
    setSectionContent("");
  };

  const handleRegenerateSection = async (section: string) => {
    if (!draft) return;
    setRegeneratingSection(section);
    setError("");

    try {
      // Extract required fields from aiBrief
      const brief = aiBrief as Record<string, unknown>;
      const getField = (key: string, fallback: string = ""): string => {
        const field = brief[key] as Record<string, string> | undefined;
        return field?.value || fallback;
      };

      const requestBody = {
        proposal_id: draftId,
        regenerate_section: section,
        business_name: businessName || "",
        industry: getField("industry", "Technology"),
        service_offered: getField("service_offered", "Software Development"),
        client_pain_points: getField("pain_points", ""),
        budget_range: getField("budget_range", ""),
        timeline: getField("timeline", ""),
        strategy: strategy as Record<string, unknown> | undefined,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) throw new Error("Regeneration failed");

      const job = await res.json();

      // Poll for job completion
      while (true) {
        const jobRes = await fetch(`/api/jobs/${job.id}`);
        const jobData = await jobRes.json();

        if (jobData.status === "completed") {
          const updated = jobData.result_data as ProposalResult;
          setDraft(updated);
          setRegeneratingSection(null);
          await onSave({
            input_data: {
              generated_content: updated,
            },
          });
          break;
        }

        if (jobData.status === "failed" || jobData.status === "cancelled") {
          throw new Error(jobData.error_message || "Regeneration failed");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {
      setRegeneratingSection(null);
      setError(`Failed to regenerate ${section.replace(/_/g, " ")}`);
    }
  };

  const handleContinue = async () => {
    if (!draft) return;
    await onSave({
      input_data: {
        generated_content: draft,
      },
      status: "ready_for_review",
    });
    onAdvance();
  };

  if (!draft) {
    return (
      <div className="max-w-4xl">
        <h2 className="text-2xl font-semibold text-white mb-2">Draft</h2>
        <p className="text-gray-400 mb-8">
          Generate your proposal content based on the approved strategy and
          outline.
        </p>

        {generationStatus && (
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
            <span className="text-sm">{generationStatus}</span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "Generating..." : "Generate Proposal"}
        </button>

        {error && (
          <div className="mt-6 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  const sections = [
    { key: "executive_summary", label: "Executive Summary" },
    { key: "scope_of_work", label: "Scope of Work" },
    { key: "timeline", label: "Timeline" },
    { key: "pricing_overview", label: "Pricing Overview" },
    { key: "next_steps", label: "Next Steps" },
  ];

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-semibold text-white mb-2">Draft</h2>
      <p className="text-gray-400 mb-8">
        Review and edit your proposal. You can regenerate individual sections if
        needed.
      </p>

      {generationStatus && (
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
          <span className="text-sm">{generationStatus}</span>
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.key}
            className="border border-gray-700 rounded-lg p-6 bg-gray-800"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-white">{section.label}</h3>
              <div className="flex gap-2">
                {regeneratingSection === section.key ? (
                  <div className="flex items-center gap-2 text-blue-300">
                    <svg
                      className="animate-spin h-3 w-3"
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
                    <span className="text-xs">Regenerating...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegenerateSection(section.key)}
                    disabled={generating || regeneratingSection !== null}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                )}
                <button
                  onClick={() => handleEditSection(section.key)}
                  disabled={regeneratingSection !== null}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  Edit
                </button>
              </div>
            </div>

            {editingSection === section.key ? (
              <div className="space-y-3">
                <textarea
                  value={sectionContent}
                  onChange={(e) => setSectionContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-48 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSection}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingSection(null);
                      setSectionContent("");
                    }}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {draft[section.key as keyof ProposalResult] as string}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-6 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleContinue}
        className="mt-6 w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200"
      >
        Continue to Review
      </button>
    </div>
  );
}
