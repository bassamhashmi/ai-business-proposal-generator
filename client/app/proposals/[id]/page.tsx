"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import WorkspaceStepper from "@/components/WorkspaceStepper";
import AutosaveIndicator from "@/components/AutosaveIndicator";
import RecoverableError from "@/components/RecoverableError";
import OpportunityStage from "@/components/OpportunityStage";
import BriefStage from "@/components/BriefStage";
import StrategyStage from "@/components/StrategyStage";
import DraftStage from "@/components/DraftStage";
import ReviewStage from "@/components/ReviewStage";
import {
  getGeneratedContent,
  getProposalDraft,
  updateProposalDraft,
} from "@/lib/api-client";

type StageId = "opportunity" | "brief" | "strategy" | "draft" | "review";

const STAGES: StageId[] = [
  "opportunity",
  "brief",
  "strategy",
  "draft",
  "review",
];

import type { ProposalDraft } from "@/lib/api-client";

export default function ProposalWorkspace() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;

  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
  const [activeStage, setActiveStage] = useState<StageId | undefined>(
    undefined,
  );

  const inputDataRef = useRef<Record<string, unknown> | undefined>(
    draft?.input_data,
  );

  useEffect(() => {
    inputDataRef.current = draft?.input_data;
  }, [draft?.input_data]);

  // Load draft function
  const loadDraft = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await getProposalDraft(draftId);
      setDraft(data);
    } catch {
      setErrorMessage("Failed to load proposal draft. Please try again.");
      setRetryAction(() => loadDraft);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  // Determine the progress stage from draft status (how far the workflow has advanced)
  const getProgressStage = useCallback((): StageId => {
    if (!draft) return "opportunity";

    const statusToStage: Record<string, StageId> = {
      draft: "opportunity",
      brief_ready: "brief",
      strategy_ready: "strategy",
      outline_ready: "strategy",
      ready_for_generation: "strategy",
      generating: "draft",
      generated: "draft",
      ready_for_review: "review",
      completed: "review",
    };

    return statusToStage[draft.status] || "opportunity";
  }, [draft]);

  // Determine unlocked stages based on progress stage
  const getUnlockedStages = useCallback((): StageId[] => {
    const progressStage = getProgressStage();
    const progressIndex = STAGES.indexOf(progressStage);
    return STAGES.slice(0, progressIndex + 1);
  }, [getProgressStage]);

  // Derive progress, active, and unlocked stages from draft
  const progressStage = getProgressStage();
  const unlockedStages = getUnlockedStages();

  // Compute the actual stage to render.
  // - If the user has navigated via stepper/continue (activeStage set) AND
  //   that stage is still unlocked, show it (allows going back)
  // - Otherwise fall back to the progress stage (workflow advancement)
  const viewStage: StageId =
    activeStage !== undefined && unlockedStages.includes(activeStage)
      ? activeStage
      : progressStage;

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Autosave with debounce (exposed for use in stage components)
  const autosave = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!draftId) return;

      setSaveState("saving");
      setErrorMessage("");

      const payload = { ...updates };
      if (updates.input_data && inputDataRef.current) {
        payload.input_data = {
          ...inputDataRef.current,
          ...(updates.input_data as Record<string, unknown>),
        };
      }

      try {
        const updated = await updateProposalDraft(draftId, payload);
        setSaveState("saved");

        // Clear saved state after 2 seconds
        setTimeout(() => setSaveState("idle"), 2000);

        setDraft(updated);
      } catch {
        setSaveState("error");
        setErrorMessage("Failed to save changes. Please try again.");
      }
    },
    [draftId],
  );

  const handleStageClick = (stage: StageId) => {
    if (unlockedStages.includes(stage)) {
      setActiveStage(stage);
    }
  };

  const nextStageFrom = (stage: StageId): StageId | null => {
    const idx = STAGES.indexOf(stage);
    if (idx < 0 || idx >= STAGES.length - 1) return null;
    return STAGES[idx + 1];
  };

  const handleRetry = () => {
    if (retryAction) {
      retryAction();
      setErrorMessage("");
      setRetryAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading workspace...</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Proposal not found</p>
          <button
            onClick={() => router.push("/")}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Return to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header with stepper */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {draft.business_name || "Untitled Proposal"}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Draft ID: {draft.id}</p>
          </div>
          <AutosaveIndicator saveState={saveState} />
        </div>
        <WorkspaceStepper
          currentStage={viewStage}
          progressStage={progressStage}
          unlockedStages={unlockedStages}
          onStageClick={handleStageClick}
        />
      </div>

      {/* Error banner */}
      {errorMessage && retryAction && (
        <div className="max-w-6xl mx-auto px-8 py-4">
          <RecoverableError
            message={errorMessage}
            onRetry={handleRetry}
            onDismiss={() => {
              setErrorMessage("");
              setRetryAction(null);
            }}
          />
        </div>
      )}

      {/* Stage content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {viewStage === "opportunity" && (
          <OpportunityStage
            key={`opp-${draftId}`}
            draftId={draftId}
            initialBusinessName={draft.business_name}
            initialData={draft.input_data as Record<string, string> | undefined}
            onSave={autosave}
            onAdvance={() => {
              const next = nextStageFrom("opportunity");
              if (next) setActiveStage(next);
            }}
          />
        )}
        {viewStage === "brief" && (
          <BriefStage
            key={`brief-${draftId}-${
              draft.ai_brief ? "populated" : "empty"
            }-${draft.updated_at || draft.created_at || "0"}`}
            draftId={draftId}
            initialBrief={draft.ai_brief as unknown}
            onSave={autosave}
            onAdvance={() => {
              const next = nextStageFrom("brief");
              if (next) setActiveStage(next);
            }}
          />
        )}
        {viewStage === "strategy" && (
          <StrategyStage
            key={`strat-${draftId}-${
              draft.input_data?.strategy ? "s" : ""
            }${draft.input_data?.outline ? "o" : ""}-${
              draft.updated_at || draft.created_at || "0"
            }`}
            draftId={draftId}
            initialStrategy={draft.input_data?.strategy as unknown}
            initialOutline={draft.input_data?.outline as unknown}
            onSave={autosave}
            onAdvance={() => {
              const next = nextStageFrom("strategy");
              if (next) setActiveStage(next);
            }}
          />
        )}
        {viewStage === "draft" && (
          <DraftStage
            key={`draft-${draftId}-${
              getGeneratedContent(draft) ? "populated" : "empty"
            }-${draft.updated_at || draft.created_at || "0"}`}
            draftId={draftId}
            initialDraft={getGeneratedContent(draft)}
            businessName={draft.business_name}
            aiBrief={draft.ai_brief}
            strategy={draft.input_data?.strategy}
            onSave={autosave}
            onAdvance={() => {
              const next = nextStageFrom("draft");
              if (next) setActiveStage(next);
            }}
          />
        )}
        {viewStage === "review" && (
          <ReviewStage
            key={`review-${draftId}`}
            draftId={draftId}
            generatedContent={getGeneratedContent(draft)}
            businessName={draft.business_name || "Proposal"}
            onSave={autosave}
          />
        )}
      </div>
    </div>
  );
}
