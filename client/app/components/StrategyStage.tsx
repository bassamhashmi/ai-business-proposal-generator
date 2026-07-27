"use client";

import { useState } from "react";

type Strategy = {
  template: string;
  tone: string;
  differentiators: string;
  case_studies: string;
  standard_terms: string;
  pricing_notes: string;
};

type Outline = {
  title: string;
  sections: { heading: string; purpose: string }[];
};

interface StrategyStageProps {
  draftId: string;
  initialStrategy?: unknown;
  initialOutline?: unknown;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onAdvance: () => void;
}

export default function StrategyStage({
  draftId,
  initialStrategy,
  initialOutline,
  onSave,
  onAdvance,
}: StrategyStageProps) {
  const [strategy, setStrategy] = useState<Strategy>(
    (initialStrategy as Strategy) || {
      template: "Business proposal",
      tone: "Confident and consultative",
      differentiators: "",
      case_studies: "",
      standard_terms: "",
      pricing_notes: "",
    },
  );
  const [outline, setOutline] = useState<Outline | null>(
    (initialOutline as Outline) || null,
  );
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outlineStatus, setOutlineStatus] = useState("");
  const [error, setError] = useState("");

  const handleGenerateOutline = async () => {
    setGeneratingOutline(true);
    setOutlineStatus("Generating proposal outline...");
    setError("");

    try {
      const res = await fetch(`/api/proposals/${draftId}/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(strategy),
      });

      if (!res.ok) throw new Error("Failed to generate outline");

      const job = await res.json();
      setOutlineStatus("Planning structure...");

      // Poll for job completion
      while (true) {
        const jobRes = await fetch(`/api/jobs/${job.id}`);
        const jobData = await jobRes.json();

        if (jobData.status === "completed") {
          const generatedOutline = jobData.result_data as Outline;
          setOutline(generatedOutline);
          setOutlineStatus("");
          setGeneratingOutline(false);
          await onSave({
            strategy,
            outline: generatedOutline,
            status: "outline_ready",
          });
          break;
        }

        if (jobData.status === "failed" || jobData.status === "cancelled") {
          throw new Error(jobData.error_message || "Outline generation failed");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {
      setOutlineStatus("");
      setGeneratingOutline(false);
      setError("Failed to generate outline. Please try again.");
    }
  };

  const handleContinue = async () => {
    if (!outline) {
      setError("Please generate and review the outline before continuing.");
      return;
    }

    await onSave({
      strategy,
      outline,
      status: "generating",
    });
    onAdvance();
  };

  const updateStrategy = (key: keyof Strategy, value: string) => {
    setStrategy({ ...strategy, [key]: value });
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-semibold text-white mb-2">Strategy</h2>
      <p className="text-gray-400 mb-8">
        Configure your proposal strategy and generate an outline before
        drafting.
      </p>

      {outlineStatus && (
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
          <span className="text-sm">{outlineStatus}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="border border-gray-700 rounded-lg p-6 bg-gray-800">
          <h3 className="font-semibold text-white mb-4">Proposal Strategy</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Template
              </label>
              <select
                value={strategy.template}
                onChange={(e) => updateStrategy("template", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Business proposal">Business proposal</option>
                <option value="Technical proposal">Technical proposal</option>
                <option value="Project proposal">Project proposal</option>
                <option value="Services proposal">Services proposal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Tone
              </label>
              <select
                value={strategy.tone}
                onChange={(e) => updateStrategy("tone", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Confident and consultative">
                  Confident and consultative
                </option>
                <option value="Professional and formal">
                  Professional and formal
                </option>
                <option value="Friendly and approachable">
                  Friendly and approachable
                </option>
                <option value="Technical and detailed">
                  Technical and detailed
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Differentiators
              </label>
              <textarea
                placeholder="What makes your offering unique?"
                value={strategy.differentiators}
                onChange={(e) =>
                  updateStrategy("differentiators", e.target.value)
                }
                className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Approved case studies
              </label>
              <textarea
                placeholder="References to relevant case studies or past successes..."
                value={strategy.case_studies}
                onChange={(e) => updateStrategy("case_studies", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Standard terms
              </label>
              <textarea
                placeholder="Standard contract terms, conditions, or legal considerations..."
                value={strategy.standard_terms}
                onChange={(e) =>
                  updateStrategy("standard_terms", e.target.value)
                }
                className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Pricing notes
              </label>
              <textarea
                placeholder="Pricing model, payment terms, or commercial considerations..."
                value={strategy.pricing_notes}
                onChange={(e) =>
                  updateStrategy("pricing_notes", e.target.value)
                }
                className="w-full px-4 py-2.5 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 h-24 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateOutline}
            disabled={generatingOutline}
            className="mt-6 w-full border border-blue-500 text-blue-200 px-4 py-3 rounded-lg font-medium hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingOutline ? "Generating..." : "Generate Proposal Outline"}
          </button>
        </div>

        {outline && (
          <div className="border border-gray-700 rounded-lg p-6 bg-gray-800">
            <h3 className="font-semibold text-white mb-4">Proposal Outline</h3>
            <p className="text-lg text-white mb-4">{outline.title}</p>
            <ol className="list-decimal pl-6 space-y-3">
              {outline.sections.map((section) => (
                <li key={section.heading}>
                  <span className="text-white font-medium">
                    {section.heading}
                  </span>
                  <span className="text-gray-400 ml-2">
                    — {section.purpose}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!outline}
        className="mt-6 w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue to Draft
      </button>
    </div>
  );
}
