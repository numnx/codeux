import { useState, useCallback } from "preact/hooks";
import { useActionFeedback } from "./use-action-feedback.js";
import {
    cancelSprintRun,
    cancelTaskDispatch,
    claimAttentionItem,
    forceCancelSprintRun,
    forceCancelTaskDispatch,
    orchestrateSprint,
    pauseSprintRun,
    resolveAttentionItem,
    rerunTask,
    retryTaskDispatch,
} from "../../lib/api/dashboard-api.js";
import type { RerunTaskOptions } from "../../lib/api/dashboard-api.js";

export function useLiveSessionActions(
    refreshRuntimeStatus: () => Promise<void>,
    refreshGitStatus: () => Promise<void>
) {
    const [rerunningIds, setRerunningIds] = useState<Set<string>>(new Set());
    const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());
    const { feedback, setFeedback, clearFeedback } = useActionFeedback();
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        variant?: "destructive" | "neutral";
        confirmText?: string;
        onConfirm: () => void;
    } | null>(null);

    const handleRerun = useCallback(async (taskId: string, options?: RerunTaskOptions) => {
        setRerunningIds(prev => new Set(prev).add(taskId));
        try {
            await rerunTask(taskId, options);
            await refreshRuntimeStatus();
            await refreshGitStatus();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to rerun task.";
            setFeedback("error", message);
        } finally {
            setRerunningIds(prev => { const next = new Set(prev); next.delete(taskId); return next; });
        }
    }, [refreshRuntimeStatus, refreshGitStatus, setFeedback]);

    const runControlAction = useCallback(async (actionId: string, operation: () => Promise<void>) => {
        setPendingActionIds(prev => new Set(prev).add(actionId));
        try {
            await operation();
            await new Promise((resolve) => setTimeout(resolve, 150));
            await refreshRuntimeStatus();
            await refreshGitStatus();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to execute runtime control.";
            setFeedback("error", message);
        } finally {
            setPendingActionIds(prev => { const next = new Set(prev); next.delete(actionId); return next; });
        }
    }, [refreshRuntimeStatus, refreshGitStatus, setFeedback]);

    const handleOrchestrateSprint = useCallback(async (projectId: string, sprintId: string) => {
        await runControlAction(`sprint-start:${sprintId}`, async () => {
            await orchestrateSprint(projectId, sprintId);
        });
    }, [runControlAction]);

    const handlePauseSprintRun = useCallback(async (sprintRunId: string) => {
        await runControlAction(`sprint-pause:${sprintRunId}`, async () => {
            await pauseSprintRun(sprintRunId);
        });
    }, [runControlAction]);

    const handleCancelSprintRun = useCallback(async (sprintRunId: string) => {
        await runControlAction(`sprint-cancel:${sprintRunId}`, async () => {
            await cancelSprintRun(sprintRunId);
        });
    }, [runControlAction]);

    const handleCancelTaskDispatch = useCallback(async (dispatchId: string) => {
        await runControlAction(`dispatch-cancel:${dispatchId}`, async () => {
            await cancelTaskDispatch(dispatchId);
        });
    }, [runControlAction]);

    const handleForceCancelSprintRun = useCallback(async (sprintRunId: string) => {
        await runControlAction(`sprint-force-cancel:${sprintRunId}`, async () => {
            await forceCancelSprintRun(sprintRunId);
        });
    }, [runControlAction]);

    const handleForceCancelTaskDispatch = useCallback(async (dispatchId: string) => {
        await runControlAction(`dispatch-force-cancel:${dispatchId}`, async () => {
            await forceCancelTaskDispatch(dispatchId);
        });
    }, [runControlAction]);

    const handleRetryTaskDispatch = useCallback(async (dispatchId: string) => {
        await runControlAction(`dispatch-retry:${dispatchId}`, async () => {
            await retryTaskDispatch(dispatchId);
        });
    }, [runControlAction]);

    const handleClaimAttentionItem = useCallback(async (projectId: string, attentionItemId: string) => {
        setConfirmAction({
            title: "Claim Attention Item",
            message: "Claim this attention item for the assigned project worker?",
            confirmText: "Claim",
            onConfirm: () => {
                void runControlAction(`attention-claim:${attentionItemId}`, async () => {
                    await claimAttentionItem(projectId, attentionItemId, {
                        claimReason: "dashboard_claimed",
                    });
                });
                setConfirmAction(null);
            },
        });
    }, [runControlAction, setConfirmAction]);

    const handleResolveAttentionItem = useCallback(async (projectId: string, attentionItemId: string) => {
        setConfirmAction({
            title: "Resolve Attention Item",
            message: "Resolve this attention item and remove it from the active queue?",
            confirmText: "Resolve",
            onConfirm: () => {
                void runControlAction(`attention-resolve:${attentionItemId}`, async () => {
                    await resolveAttentionItem(projectId, attentionItemId, {
                        status: "resolved",
                        reason: "dashboard_resolved",
                    });
                });
                setConfirmAction(null);
            },
        });
    }, [runControlAction, setConfirmAction]);

    const handleDismissAttentionItem = useCallback(async (projectId: string, attentionItemId: string) => {
        setConfirmAction({
            title: "Dismiss Attention Item",
            message: "Dismiss this attention item from the active queue?",
            confirmText: "Dismiss",
            onConfirm: () => {
                void runControlAction(`attention-dismiss:${attentionItemId}`, async () => {
                    await resolveAttentionItem(projectId, attentionItemId, {
                        status: "dismissed",
                        reason: "dashboard_dismissed",
                    });
                });
                setConfirmAction(null);
            },
        });
    }, [runControlAction, setConfirmAction]);

    return {
        rerunningIds,
        pendingActionIds,
        feedback,
        clearFeedback,
        confirmAction,
        setConfirmAction,
        handleRerun,
        runControlAction,
        handleOrchestrateSprint,
        handlePauseSprintRun,
        handleCancelSprintRun,
        handleForceCancelSprintRun,
        handleCancelTaskDispatch,
        handleForceCancelTaskDispatch,
        handleRetryTaskDispatch,
        handleClaimAttentionItem,
        handleResolveAttentionItem,
        handleDismissAttentionItem,
    };
}
