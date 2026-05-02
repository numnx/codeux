import type { FunctionComponent } from "preact";
import { useEffect, useRef, useState, useLayoutEffect, useCallback, useMemo } from "preact/hooks";
import gsap from "gsap";
import { Search, X, Layers, Activity, Cpu, Box, ArrowRight } from "lucide-preact";
import { useNavigate } from "@tanstack/react-router";
import { SearchResultRow } from "./SearchResultRow";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";
import { MODAL_MOTION } from "../../lib/motion/modal-motion.js";


export type SearchItem = { id: string; title?: string; name?: string; status?: string; sprint?: string };

export interface SearchResults {
    sprints: SearchItem[];
    tasks: SearchItem[];
    agents: SearchItem[];
    containers: SearchItem[];
}

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    results: SearchResults;
    isLoading?: boolean;
}

export const SearchOverlay: FunctionComponent<SearchOverlayProps> = ({ isOpen, onClose, searchQuery, onSearchChange, results, isLoading = false }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const navigate = useNavigate();

    const CATEGORIES = useMemo(() => [
        { id: 'sprints', title: 'Sprints', icon: Layers, items: results.sprints },
        { id: 'tasks', title: 'Tasks', icon: Activity, items: results.tasks },
        { id: 'agents', title: 'Agents', icon: Cpu, items: results.agents },
        { id: 'containers', title: 'Preview Containers', icon: Box, items: results.containers }
    ], [results]);

    const allItems = useMemo(() => CATEGORIES.flatMap(c => c.items), [CATEGORIES]);
    const reducedMotion = useReducedMotion();

    useLayoutEffect(() => {
        if (!overlayRef.current || !containerRef.current) return;

        gsap.killTweensOf(overlayRef.current);
        gsap.killTweensOf(containerRef.current);

        if (isOpen) {
            gsap.set(overlayRef.current, { display: 'flex' });

            const tl = gsap.timeline();

            tl.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: reducedMotion ? 0 : MODAL_MOTION.overlay.entry, ease: MODAL_MOTION.overlay.entryEase }
            );

            tl.fromTo(containerRef.current,
                { y: reducedMotion ? 0 : -20, opacity: 0 },
                { y: 0, opacity: 1, duration: reducedMotion ? 0 : MODAL_MOTION.overlay.cardEntry, ease: MODAL_MOTION.overlay.cardEntryEase },
                reducedMotion ? 0 : "-=0.2"
            );

            tl.eventCallback("onComplete", () => {
                if (isOpen && inputRef.current) {
                    inputRef.current.focus();
                }
            });
        } else {
            const tl = gsap.timeline({
                onComplete: () => {
                    if (overlayRef.current) {
                        gsap.set(overlayRef.current, { display: 'none' });
                    }
                }
            });

            tl.to(containerRef.current, { y: reducedMotion ? 0 : -20, opacity: 0, duration: reducedMotion ? 0 : MODAL_MOTION.overlay.exit, ease: MODAL_MOTION.overlay.exitEase });
            tl.to(overlayRef.current, { opacity: 0, duration: reducedMotion ? 0 : MODAL_MOTION.overlay.exit, ease: MODAL_MOTION.overlay.exitEase }, reducedMotion ? 0 : "-=0.1");

            setFocusedIndex(-1);
        }
    }, [isOpen, reducedMotion]);

    const handleSelect = useCallback((item: SearchItem, categoryType: string) => {
        let path = '';
        if (categoryType === 'sprints') {
            path = `/sprints/${item.id}`;
        } else if (categoryType === 'tasks') {
            path = `/tasks/${item.id}`;
        } else if (categoryType === 'agents') {
            path = `/agents/${item.id}`;
        } else if (categoryType === 'containers') {
             path = `/browser/${item.id}`;
        }

        if (path) {
            navigate({ to: path as any });
            onClose();
        }
    }, [navigate, onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : allItems.length - 1));
            } else if (e.key === 'Enter' && focusedIndex >= 0) {
                e.preventDefault();
                const item = allItems[focusedIndex];
                const category = CATEGORIES.find(c => c.items.includes(item as any));
                if (item && category) {
                    handleSelect(item as any, category.id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, focusedIndex, allItems, CATEGORIES, handleSelect, onClose]);

    // Track active item ref to ensure it's in view
    const activeItemRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [focusedIndex]);


    let globalItemIndex = 0;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[100] hidden items-start justify-center pt-16 px-4 sm:px-6"
            style={{ display: 'none' }}
        >
            <div
                className="absolute inset-0 bg-void-900/80 dark:bg-void-900/90 backdrop-blur-3xl"
                onClick={onClose}
            />

            <div
                ref={containerRef}
                className="relative w-full max-w-4xl mx-auto flex flex-col bg-white dark:bg-void-800 rounded-2xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10"
            >
                {/* Search Header */}
                <div className="flex items-center px-4 py-4 border-b border-black/5 dark:border-white/5">
                    <Search className="w-5 h-5 text-slate-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search sprints, tasks, agents..."
                        value={searchQuery}
                        onInput={(e) => onSearchChange(e.currentTarget.value)}
                        className="flex-1 bg-transparent border-none outline-none text-lg text-slate-900 dark:text-white placeholder-slate-400"
                    />
                    <button
                        onClick={onClose}
                        className="p-2 ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Results Area */}
                <div className="flex-1 max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                    {searchQuery.trim().length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <Search className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Search SprintOS</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                Find sprints, tasks, agents, and preview environments quickly by typing your query above.
                            </p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-signal-500 animate-spin mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Searching...</h3>
                        </div>
                    ) : allItems.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <Box className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No results found for '{searchQuery}'</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                Try adjusting your search terms.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                            {CATEGORIES.map((category) => (
                                <div key={category.id} className="flex flex-col">
                                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        <category.icon className="w-4 h-4" />
                                        {category.title}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {category.items.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-slate-400">No results found.</div>
                                        ) : (
                                            category.items.map((item) => {
                                                const isFocused = focusedIndex === globalItemIndex;
                                                const currentIndex = globalItemIndex++;

                                                return (
                                                    <SearchResultRow
                                                        key={item.id}
                                                        item={item}
                                                        categoryType={category.id}
                                                        isFocused={isFocused}
                                                        onFocus={() => setFocusedIndex(currentIndex)}
                                                        activeItemRef={isFocused ? activeItemRef : null}
                                                        onSelect={() => handleSelect(item as any, category.id)}
                                                    />
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hints */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-void-800 border border-black/10 dark:border-white/10 shadow-sm font-mono text-[10px]">↑</kbd>
                            <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-void-800 border border-black/10 dark:border-white/10 shadow-sm font-mono text-[10px]">↓</kbd>
                            <span>to navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-void-800 border border-black/10 dark:border-white/10 shadow-sm font-mono text-[10px]">↵</kbd>
                            <span>to select</span>
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-void-800 border border-black/10 dark:border-white/10 shadow-sm font-mono text-[10px]">esc</kbd>
                        <span>to close</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
