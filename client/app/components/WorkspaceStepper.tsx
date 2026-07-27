"use client";

import React from "react";

const STAGES = [
  { id: "opportunity", label: "Opportunity" },
  { id: "brief", label: "AI Brief" },
  { id: "strategy", label: "Strategy" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review & Export" },
] as const;

type StageId = typeof STAGES[number]["id"];

interface WorkspaceStepperProps {
  currentStage: StageId;
  unlockedStages: StageId[];
  onStageClick: (stage: StageId) => void;
}

export default function WorkspaceStepper({
  currentStage,
  unlockedStages,
  onStageClick,
}: WorkspaceStepperProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="w-full border-b border-gray-700 bg-gray-900/50 px-8 py-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          {STAGES.map((stage, index) => {
            const isUnlocked = unlockedStages.includes(stage.id);
            const isCurrent = stage.id === currentStage;
            const isCompleted = index < currentIndex;

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => isUnlocked && onStageClick(stage.id)}
                  disabled={!isUnlocked}
                  className={`flex flex-col items-center gap-1 transition-all ${
                    isUnlocked
                      ? "cursor-pointer hover:text-white"
                      : "cursor-not-allowed opacity-40"
                  } ${isCurrent ? "text-white" : "text-gray-400"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                      isCurrent
                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                        : isCompleted
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : "border-gray-600 bg-gray-800 text-gray-400"
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  <span className="text-xs font-medium">{stage.label}</span>
                </button>
                {index < STAGES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      index < currentIndex
                        ? "bg-green-500"
                        : "bg-gray-700"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
