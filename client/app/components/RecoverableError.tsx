"use client";

import React from "react";

interface RecoverableErrorProps {
  message: string;
  onRetry: () => void;
  onDismiss?: () => void;
}

export default function RecoverableError({
  message,
  onRetry,
  onDismiss,
}: RecoverableErrorProps) {
  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-red-400 text-sm">{message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onRetry}
          className="text-sm text-red-300 hover:text-red-200 underline"
        >
          Retry
        </button>
        {onDismiss && (
          <>
            <span className="text-red-600">|</span>
            <button
              onClick={onDismiss}
              className="text-sm text-red-300 hover:text-red-200 underline"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
