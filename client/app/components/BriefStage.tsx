"use client";

import { useState } from "react";

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

interface BriefStageProps {
  draftId: string;
  initialBrief?: unknown;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onAdvance: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  objectives: "Objectives",
  pain_points: "Pain Points",
  deliverables: "Deliverables",
  decision_criteria: "Decision Criteria",
  budget_range: "Budget",
  timeline: "Timeline",
  stakeholders: "Stakeholders",
  assumptions: "Assumptions",
};

// Map backend field names to client field names
const FIELD_MAPPING: Record<string, string> = {
  client_pain_points: "pain_points",
  required_deliverables: "deliverables",
};

// Normalize backend field names to client field names
const normalizeBrief = (backendBrief: unknown): EvidenceBrief => {
  const data = backendBrief as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  // Apply field mapping
  Object.entries(data).forEach(([key, value]) => {
    const mappedKey = FIELD_MAPPING[key] || key;
    normalized[mappedKey] = value;
  });

  return normalized as EvidenceBrief;
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-500/20 text-green-400 border-green-500",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
  low: "bg-red-500/20 text-red-400 border-red-500",
  missing: "bg-gray-500/20 text-gray-400 border-gray-500",
};

export default function BriefStage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  draftId,
  initialBrief,
  onSave,
  onAdvance,
}: BriefStageProps) {
  const [brief, setBrief] = useState<EvidenceBrief | null>(
    initialBrief ? normalizeBrief(initialBrief) : null,
  );
  const [acceptMissingCommercial, setAcceptMissingCommercial] = useState(false);
  const [error, setError] = useState("");
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const updateField = (key: string, value: string) => {
    if (!brief) return;
    const item = brief[key] as EvidenceField;
    setBrief({
      ...brief,
      [key]: {
        ...item,
        value,
        confidence: "high",
        source_reference: "User review",
        source_excerpt: "Edited by user",
      },
    });
  };

  const toggleExpand = (key: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    if (!brief) return;

    const budgetField = brief.budget_range as EvidenceField;
    const timelineField = brief.timeline as EvidenceField;

    if (
      (!budgetField?.value || !timelineField?.value) &&
      !acceptMissingCommercial
    ) {
      setError(
        "Please confirm that you accept the missing budget or timeline assumptions.",
      );
      return;
    }

    setError("");
    await onSave({
      ai_brief: brief,
      status: "strategy_ready",
    });
    onAdvance();
  };

  const missingInformation = Array.isArray(brief?.missing_information)
    ? brief.missing_information
    : [];

  if (!brief) {
    return (
      <div className="text-gray-400">
        <p>Loading AI brief...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-semibold text-white mb-2">AI Brief</h2>
      <p className="text-gray-400 mb-8">
        Review and edit the extracted information. Each field shows the
        confidence level and source evidence.
      </p>

      {missingInformation.length > 0 && (
        <div className="mb-6 border border-amber-700 rounded-lg p-4 bg-amber-900/20">
          <h3 className="font-medium text-amber-100 mb-2">
            Missing Information
          </h3>
          <p className="text-sm text-amber-200 mb-3">
            The following information could not be extracted. Please provide it
            if possible:
          </p>
          <ul className="list-disc pl-5 text-sm text-amber-100 space-y-1">
            {missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {(
          Object.entries(brief) as [string, EvidenceField | string[] | string][]
        )
          .filter(
            ([key]) => key !== "business_name" && key !== "missing_information",
          )
          .map(([key, item]) => {
            if (Array.isArray(item)) return null;
            if (typeof item === "string" && key === "business_name")
              return null;
            if (typeof item === "object" && !("value" in item)) return null;

            const evidence = item as EvidenceField;
            const label = FIELD_LABELS[key] || key.replace(/_/g, " ");

            return (
              <div
                key={key}
                className="border border-gray-700 rounded-lg p-4 bg-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded border ${CONFIDENCE_COLORS[evidence.confidence]}`}
                    >
                      {evidence.confidence} confidence
                    </span>
                    {evidence.source_excerpt && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(key)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {expandedFields.has(key)
                          ? "Hide source"
                          : "Show source"}
                      </button>
                    )}
                  </div>
                </div>

                <input
                  value={evidence.value}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {expandedFields.has(key) && evidence.source_excerpt && (
                  <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">
                      Source: {evidence.source_reference}
                    </p>
                    <p className="text-sm text-gray-300 italic">
                      &ldquo;{evidence.source_excerpt}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {(!brief.budget_range ||
        !(brief.budget_range as EvidenceField).value ||
        !brief.timeline ||
        !(brief.timeline as EvidenceField).value) && (
        <div className="mt-6 border border-amber-700 rounded-lg p-4 bg-amber-900/20">
          <label className="flex gap-2 text-sm text-amber-200 items-start">
            <input
              type="checkbox"
              checked={acceptMissingCommercial}
              onChange={(e) => setAcceptMissingCommercial(e.target.checked)}
              className="mt-1"
            />
            <span>
              I accept that missing budget or timeline details are assumptions
              requiring review before finalizing the proposal.
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleContinue}
        className="mt-6 w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200"
      >
        Continue to Strategy
      </button>
    </div>
  );
}
