import type { FunctionComponent } from "preact";
import { memo } from "preact/compat";
import { useMemo, useLayoutEffect, useRef, useId, useState, useEffect } from "preact/hooks";
import gsap from "gsap";
import { useReducedMotion } from "../hooks/use-reduced-motion.js";
import { Bot, CheckCircle2, ChevronDown, XCircle } from "lucide-preact";
import { renderMarkdown } from "../../lib/markdown.js";
import { formatTime } from "../../lib/time.js";
import { MARKDOWN_PROSE_CLASS } from "./ui/MarkdownEditorField.js";
import { useExecutionTimeline } from "../../hooks/ExecutionTimelineContext.js";
import { ATTENTION_OWNER_LABELS, ATTENTION_SEVERITY_TONE, ATTENTION_TYPE_LABELS, ATTENTION_STATUS_TONE, shortenRuntimeId } from "./live-session/ExecutionRuntimePanel.js";
import { BorderTrace } from "./ui/BorderTrace.js";
import { WaveFluid } from "./ui/WaveFluid.js";

type AttentionLedgerProps = {
    collapsible?: boolean;
    defaultOpen?: boolean;
};

export const AttentionLedger: FunctionComponent<AttentionLedgerProps> = memo(({
    collapsible = false,
    defaultOpen = true,
}) => {
    const {
        execution: snapshot,
        onClaimAttentionItem,
        onResolveAttentionItem,
        onDismissAttentionItem,
        pendingActionIds,
    } = useExecutionTimeline();

    const [open, setOpen] = useState(defaultOpen);
    const contentId = useId();
    const workersByEndpointId = useMemo(() => {
        if (!snapshot) return new Map<string, string>();
        const overflow = snapshot.overflowAssignedWorkers || [];
        const pairs = [
            snapshot.primaryAssignedWorker,
            ...overflow,
        ].filter(Boolean).map((worker) => [worker!.workerEndpointId || "", worker!.workerDisplayName] as const);
        return new Map(pairs);
    }, [snapshot?.overflowAssignedWorkers, snapshot?.primaryAssignedWorker, snapshot]);

    const listRef = useRef<HTMLDivElement>(null);
    const prevCountRef = useRef<number>(0);
    const reducedMotion = useReducedMotion();
    const attentionItems = snapshot?.attentionItems || [];

    const { openCount, claimedCount } = useMemo(() => {
        return {
            openCount: attentionItems.filter((item) => item.status === "open").length,
            claimedCount: attentionItems.filter((item) => item.status === "claimed").length,
        };
    }, [attentionItems, attentionItems.length]);

    const visibleAttentionItems = useMemo(() => {
        return attentionItems.slice(0, 8);
    }, [attentionItems, attentionItems.length]);

    // Local state to keep exiting items in DOM
    const [displayItems, setDisplayItems] = useState<(typeof visibleAttentionItems[0] & { _isExiting?: boolean })[]>(visibleAttentionItems);
    const prevItemsRef = useRef(visibleAttentionItems);
    const scrollStateRef = useRef({ scrollTop: 0, scrollHeight: 0 });

    useLayoutEffect(() => {
        if (!listRef.current || reducedMotion) {
            setDisplayItems(visibleAttentionItems);
            prevItemsRef.current = visibleAttentionItems;
            return;
        }

        const prevItems = prevItemsRef.current;
        const currentItems = visibleAttentionItems;

        // Save scroll state before DOM updates
        scrollStateRef.current = {
            scrollTop: listRef.current.scrollTop,
            scrollHeight: listRef.current.scrollHeight
        };

        const currentIds = new Set(currentItems.map(i => i.id));
        const prevIds = new Set(prevItems.map(i => i.id));

        const enteringIds = new Set([...currentIds].filter(id => !prevIds.has(id)));
        const exitingIds = new Set([...prevIds].filter(id => !currentIds.has(id)));

        // Find state changes for flashing
        const changedIds = new Set();
        currentItems.forEach(item => {
            const prevItem = prevItems.find(p => p.id === item.id);
            if (prevItem && prevItem.status !== item.status) {
                changedIds.add(item.id);
            }
        });

        // Compute merged items to keep exiting ones in DOM temporarily
        const mergedItems: (typeof visibleAttentionItems[0] & { _isExiting?: boolean })[] = [...currentItems];
        exitingIds.forEach(id => {
            const exitingItem = prevItems.find(p => p.id === id);
            if (exitingItem) {
                // Insert exiting item at its previous position, or at the end
                const prevIndex = prevItems.findIndex(p => p.id === id);
                mergedItems.splice(prevIndex, 0, { ...exitingItem, _isExiting: true });
            }
        });

        setDisplayItems(mergedItems);

        // Use a slight timeout to let DOM render the merged items before animating
        requestAnimationFrame(() => {
            if (!listRef.current) return;

            // Scroll anchoring logic is handled by GSAP organically pushing content.
            // If the user has scrolled down, we should animate the scrollTop
            // but since GSAP height animation starts at 0 and grows, it organically pushes items down.
            // A more precise approach if scrolled is to adjust scrollTop incrementally.

            const initialScrollTop = scrollStateRef.current.scrollTop;
            const isScrolled = initialScrollTop > 0;

            const elements = Array.from(listRef.current.children);

            elements.forEach((el) => {
                const id = el.getAttribute('data-item-id');
                if (!id) return;

                if (enteringIds.has(id) && !el.hasAttribute('data-entered')) {
                    el.setAttribute('data-entered', 'true');
                    const targetHeight = (el as HTMLElement).offsetHeight;

                    let prevHeight = 0;
                    gsap.fromTo(el,
                        { height: 0, opacity: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' },
                        {
                            height: targetHeight, opacity: 1, marginTop: '', paddingTop: '', paddingBottom: '', duration: 0.3, ease: "power2.out", clearProps: "height,overflow,marginTop,paddingTop,paddingBottom",
                            onUpdate: function() {
                                if (isScrolled && listRef.current) {
                                    // Get current animated height
                                    const currentHeight = gsap.getProperty(el, "height") as number;
                                    const diff = currentHeight - prevHeight;
                                    listRef.current.scrollTop += diff;
                                    prevHeight = currentHeight;
                                }
                            }
                        }
                    );
                } else if (exitingIds.has(id) && !el.hasAttribute('data-exiting')) {
                    el.setAttribute('data-exiting', 'true');
                    gsap.to(el, {
                        height: 0, opacity: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden',
                        duration: 0.3, ease: "power2.in",
                        onComplete: () => {
                            setDisplayItems(prev => prev.filter(item => item.id !== id || !item._isExiting));
                        }
                    });
                } else if (changedIds.has(id)) {
                    gsap.fromTo(el,
                        { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                        { backgroundColor: "", duration: 0.5, clearProps: "backgroundColor" }
                    );
                }
            });
        });

        prevItemsRef.current = currentItems;
    }, [visibleAttentionItems, reducedMotion]);

    if (!snapshot) return null;

    const canAutoClaim = Boolean(snapshot.primaryAssignedWorker || (snapshot.overflowAssignedWorkers && snapshot.overflowAssignedWorkers.length > 0));

    const header = (
        <>
            <div className="flex items-center gap-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Attention Queue</span>
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em]">
                    <span className="rounded-full border border-status-amber/20 bg-status-amber/10 px-2 py-1 text-status-amber">
                        open {openCount}
                    </span>
                    <span className="rounded-full border border-signal-500/20 bg-signal-500/10 px-2 py-1 text-signal-500">
                        claimed {claimedCount}
                    </span>
                </div>
            </div>
            {collapsible && (
                <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${open ? "rotate-0" : "-rotate-90"}`}
                    strokeWidth={2}
                />
            )}
        </>
    );

    return (
        <div className="group relative overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-white/70 shadow-[0_2px_20px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.06] dark:bg-void-800/60 dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
            <WaveFluid accentHex="#00E0A0" />
            <BorderTrace accentHex="#00E0A0" />

            {collapsible ? (
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={contentId}
                    onClick={() => setOpen(!open)}
                    className="relative z-10 flex w-full items-center justify-between gap-4 p-5 transition-colors duration-200 hover:bg-black/[0.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 focus-visible:ring-offset-2 dark:hover:bg-white/[0.01] dark:focus-visible:ring-offset-void-800"
                >
                    {header}
                </button>
            ) : (
                <div className="relative z-10 flex items-center justify-between gap-4 p-5">
                    {header}
                </div>
            )}

            <div className={`${collapsible ? `collapsible-section ${open ? "open" : ""}` : ""}`}>
                <div id={contentId} className={`${collapsible ? "collapsible-content" : ""}`}>
                    <div className="relative z-10 px-5 pb-5 pt-0">
                        {attentionItems.length === 0 ? (
                            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-600">
                                No active blockers are waiting in the project attention queue.
                            </p>
                        ) : (
                            <div ref={listRef} className="max-h-80 space-y-2 overflow-y-auto pr-1 dashboard-scrollbar">
                                {displayItems.map((item) => {
                                    const assignedWorkerLabel = item.assignedWorkerEndpointId
                                        ? workersByEndpointId.get(item.assignedWorkerEndpointId) || item.assignedWorkerEndpointId
                                        : item.ownerType === "worker"
                                            ? "Unassigned"
                                            : ATTENTION_OWNER_LABELS[item.ownerType] || item.ownerType;
                                    const canClaim = (
                                        Boolean(snapshot.projectId)
                                        && item.ownerType === "worker"
                                        && item.status === "open"
                                        && (Boolean(item.assignedWorkerEndpointId) || canAutoClaim)
                                    );
                                    const claimActionId = `attention-claim:${item.id}`;
                                    const resolveActionId = `attention-resolve:${item.id}`;
                                    const dismissActionId = `attention-dismiss:${item.id}`;

                                    return (
                                        <div
                                            key={item.id}
                                            data-item-id={item.id}
                                            className="rounded-xl border border-black/[0.04] bg-black/[0.015] p-3 dark:border-white/[0.04] dark:bg-white/[0.015]"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                            {item.title}
                                                        </span>
                                                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
                                                            ATTENTION_SEVERITY_TONE[item.severity] || ATTENTION_SEVERITY_TONE.medium
                                                        }`}>
                                                            {item.severity}
                                                        </span>
                                                        <span className="rounded-full border border-black/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
                                                            {ATTENTION_TYPE_LABELS[item.attentionType] || item.attentionType.replace(/_/g, " ")}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                                                        <span className={ATTENTION_STATUS_TONE[item.status] || "text-slate-400"}>
                                                            {item.status}
                                                        </span>
                                                        <span>·</span>
                                                        <span>{ATTENTION_OWNER_LABELS[item.ownerType] || item.ownerType}</span>
                                                        <span>·</span>
                                                        <span>{assignedWorkerLabel}</span>
                                                        {shortenRuntimeId(item.taskId) && (
                                                            <>
                                                                <span>·</span>
                                                                <span>task {shortenRuntimeId(item.taskId)}</span>
                                                            </>
                                                        )}
                                                        {shortenRuntimeId(item.dispatchId) && (
                                                            <>
                                                                <span>·</span>
                                                                <span>dispatch {shortenRuntimeId(item.dispatchId)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right text-[10px] font-mono text-slate-400">
                                                    {formatTime(item.updatedAt)}
                                                </div>
                                            </div>

                                            <div
                                                className={`mt-3 line-clamp-3 text-[11px] leading-relaxed prose-p:my-0 ${MARKDOWN_PROSE_CLASS}`}
                                                dangerouslySetInnerHTML={{ __html: renderMarkdown(item.summaryMarkdown || "No summary provided.") }}
                                            />

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {canClaim && snapshot.projectId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onClaimAttentionItem(snapshot.projectId!, item.id)}
                                                        disabled={pendingActionIds.has(claimActionId)}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/20 bg-signal-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-signal-500 transition-colors hover:bg-signal-500/15 disabled:opacity-50"
                                                    >
                                                        <Bot className="h-3 w-3" strokeWidth={2} />
                                                        {pendingActionIds.has(claimActionId) ? "Claiming" : "Claim"}
                                                    </button>
                                                )}
                                                {snapshot.projectId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onResolveAttentionItem(snapshot.projectId!, item.id)}
                                                        disabled={pendingActionIds.has(resolveActionId)}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-status-green/20 bg-status-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-status-green transition-colors hover:bg-status-green/15 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                                                        {pendingActionIds.has(resolveActionId) ? "Resolving" : "Resolve"}
                                                    </button>
                                                )}
                                                {snapshot.projectId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onDismissAttentionItem(snapshot.projectId!, item.id)}
                                                        disabled={pendingActionIds.has(dismissActionId)}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:bg-black/[0.05] disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                                                    >
                                                        <XCircle className="h-3 w-3" strokeWidth={2} />
                                                        {pendingActionIds.has(dismissActionId) ? "Dismissing" : "Dismiss"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
