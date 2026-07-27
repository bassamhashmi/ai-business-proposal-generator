"use client";

import React from "react";

type SaveState = "idle" | "saving" | "saved" | "error";

interface AutosaveIndicatorProps {
  saveState: SaveState;
  errorMessage?: string;
}

export default function AutosaveIndicator({
  saveState,
  errorMessage,
}: AutosaveIndicatorProps) {
  if (saveState === "idle") return null;

  const styles = {
    saving: "text-blue-300",
    saved: "text-green-400",
    error: "text-red-400",
  };

  const messages = {
    saving: "Saving...",
    saved: "Saved",
    error: errorMessage || "Failed to save",
  };

  return (
    <div className={`text-sm ${styles[saveState]} flex items-center gap-2`}>
      {saveState === "saving" && (
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
      )}
      {saveState === "saved" && (
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {saveState === "error" && (
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span>{messages[saveState]}</span>
    </div>
  );
}
