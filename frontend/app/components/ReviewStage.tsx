"use client";

import { useState } from "react";
import {
  exportDocument,
  type GeneratedProposalContent,
} from "@/lib/api-client";

interface ReviewStageProps {
  draftId: string;
  generatedContent: GeneratedProposalContent | null;
  businessName: string;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}

export default function ReviewStage({
  draftId,
  generatedContent,
  businessName,
  onSave,
}: ReviewStageProps) {
  const [qualityIssues, setQualityIssues] = useState<
    { severity: string; section: string; message: string }[]
  >([]);
  const [checkCompleted, setCheckCompleted] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");

  const handleQualityCheck = async () => {
    if (!generatedContent) {
      setQualityIssues([
        {
          severity: "error",
          section: "system",
          message: "No proposal content found. Go back to Draft and generate content first.",
        },
      ]);
      setCheckCompleted(true);
      return;
    }

    setRunningCheck(true);
    try {
      const proposal = {
        executive_summary: generatedContent.executive_summary,
        scope_of_work: generatedContent.scope_of_work,
        timeline: generatedContent.timeline,
        pricing_overview: generatedContent.pricing_overview,
        next_steps: generatedContent.next_steps,
      };
      const res = await fetch(`/api/proposals/${draftId}/quality-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = Array.isArray(errorData.detail)
          ? errorData.detail.map((e: { msg: string }) => e.msg).join(", ")
          : errorData.detail || "Couldn't run quality checks";
        setQualityIssues([
          {
            severity: "error",
            section: "system",
            message: errorMessage,
          },
        ]);
        return;
      }
      const data = await res.json();
      setQualityIssues(data.issues || []);
    } finally {
      setRunningCheck(false);
      setCheckCompleted(true);
    }
  };

  const handleExport = async () => {
    if (!generatedContent) return;

    setExporting(true);
    try {
      await exportDocument(
        exportFormat,
        businessName,
        generatedContent,
        draftId,
        generatedContent.version_id,
      );
      await onSave({
        status: "completed",
      });
    } finally {
      setExporting(false);
    }
  };

  const hasBlockingIssues = qualityIssues.some(
    (issue) => issue.severity === "error",
  );

  const previewSections = generatedContent
    ? [
        { key: "executive_summary", label: "Executive Summary" },
        { key: "scope_of_work", label: "Scope of Work" },
        { key: "timeline", label: "Timeline" },
        { key: "pricing_overview", label: "Pricing Overview" },
        { key: "next_steps", label: "Next Steps" },
      ]
    : [];

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-semibold text-white mb-2">
        Review & Export
      </h2>
      <p className="text-gray-400 mb-8">
        Review your proposal for quality issues and export when ready.
      </p>

      <div className="space-y-6">
        {/* Quality Check Section */}
        <div className="border border-gray-700 rounded-lg p-6 bg-gray-800">
          <h3 className="font-semibold text-white mb-4">Quality Check</h3>
          <button
            onClick={handleQualityCheck}
            disabled={runningCheck || !generatedContent}
            className="px-4 py-2 border border-amber-600 text-amber-200 rounded-lg font-medium hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runningCheck ? "Running checks..." : "Run Quality Checks"}
          </button>

          {!generatedContent && (
            <p className="mt-4 text-red-400 text-sm">
              No proposal content found. Return to the Draft stage to generate
              content first.
            </p>
          )}

          {qualityIssues.length > 0 && (
            <div className="mt-4 space-y-2">
              {qualityIssues.map((issue, index) => (
                <div
                  key={`${issue.section}-${index}`}
                  className={`p-3 rounded border ${
                    issue.severity === "error"
                      ? "bg-red-900/20 border-red-800 text-red-400"
                      : "bg-amber-900/20 border-amber-800 text-amber-400"
                  }`}
                >
                  <p className="font-medium">
                    {issue.section.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm">{issue.message}</p>
                </div>
              ))}
            </div>
          )}

          {checkCompleted &&
            qualityIssues.length === 0 &&
            generatedContent && (
              <p className="mt-4 text-green-400 text-sm">
                No quality issues detected.
              </p>
            )}
        </div>

        {/* Export Section */}
        <div className="border border-gray-700 rounded-lg p-6 bg-gray-800">
          <h3 className="font-semibold text-white mb-4">Export Proposal</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Export format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="pdf"
                    checked={exportFormat === "pdf"}
                    onChange={(e) =>
                      setExportFormat(e.target.value as "pdf" | "docx")
                    }
                    className="text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">PDF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="docx"
                    checked={exportFormat === "docx"}
                    onChange={(e) =>
                      setExportFormat(e.target.value as "pdf" | "docx")
                    }
                    className="text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">DOCX</span>
                </label>
              </div>
            </div>

            <div className="p-3 bg-gray-900 rounded border border-gray-700">
              <p className="text-sm text-gray-400">
                Filename:{" "}
                <span className="text-white font-medium">
                  {businessName.replace(/\s+/g, "_").toLowerCase()}_proposal.
                  {exportFormat}
                </span>
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || hasBlockingIssues || !generatedContent}
              className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting
                ? "Exporting..."
                : hasBlockingIssues
                  ? "Fix blocking issues before export"
                  : !generatedContent
                    ? "Generate proposal content before export"
                    : `Export as ${exportFormat.toUpperCase()}`}
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="border border-gray-700 rounded-lg p-6 bg-gray-800">
          <h3 className="font-semibold text-white mb-4">Preview</h3>
          <div className="space-y-4">
            {previewSections.map((section) => (
              <div
                key={section.key}
                className="border border-gray-700 rounded p-4 bg-gray-900"
              >
                <h4 className="font-medium text-white mb-2">{section.label}</h4>
                <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                  {
                    generatedContent![
                      section.key as keyof GeneratedProposalContent
                    ] as string
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
