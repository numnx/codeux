import type { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useNavigate } from "@tanstack/react-router";
import { Search, Command, X, Hexagon, Layers, ListChecks, MessageCircle, Cpu, BarChart3, Settings, Inbox, Compass, Zap, FolderOpen } from "lucide-preact";
import gsap from "gsap";
import { useFocusTrap } from "../../hooks/use-focus-trap.js";
import { useProjectData } from "../../context/project-data.js";
import { fetchPreviewSessions } from "../../lib/browser-api.js";
import { buildPreviewUrl } from "../../lib/preview-origin.js";

interface CommandOption {
    id: string;
    label: string;
    path: string;
    icon: any;
    color: string;
}

const ALL_ROUTES: CommandOption[] = [
    { id: "home", label: "Overview", path: "/", icon: Hexagon, color: "text-signal-500" },
    { id: "sprints", label: "Sprints", path: "/sprints", icon: Layers, color: "text-ember-500" },
    { id: "projects", label: "Projects", path: "/projects", icon: FolderOpen, color: "text-slate-500" },
    { id: "chat", label: "Chat", path: "/chat", icon: MessageCircle, color: "text-signal-400" },
    { id: "tasks", label: "Tasks", path: "/tasks", icon: ListChecks, color: "text-signal-400" },
    { id: "agents", label: "Agents", path: "/agents", icon: Cpu, color: "text-signal-400" },
    { id: "stats", label: "Stats", path: "/stats", icon: BarChart3, color: "text-amber-500" },
    { id: "config", label: "Config", path: "/config", icon: Settings, color: "text-slate-400 dark:text-slate-400" },
    { id: "memory", label: "Memory", path: "/memory", icon: Inbox, color: "text-ember-400" },
    { id: "browser", label: "Browser", path: "/browser", icon: Compass, color: "text-sky-500" },
    { id: "live", label: "Live", path: "/live", icon: Zap, color: "text-status-red" },
];

export const CommandPalette: FunctionComponent = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const trapRef = useFocusTrap(isOpen, () => setIsOpen(false));
    const { selectedProject } = useProjectData();
    const [dynamicOptions, setDynamicOptions] = useState<CommandOption[]>([]);

    useEffect(() => {
        if (!isOpen || !selectedProject) return;

        let isMounted = true;
        const loadDynamicRoutes = async () => {
            try {
                const sessions = await fetchPreviewSessions(selectedProject.id);
                if (!isMounted) return;

                const sessionOptions: CommandOption[] = sessions.map(session => ({
                    id: `browser-session-${session.id}`,
                    label: `Preview: ${session.sprintName || session.id.slice(0, 8)}`,
                    path: buildPreviewUrl(session.id, session.lastKnownPath),
                    icon: Compass,
                    color: "text-sky-500",
                    isExternal: true
                }));
                setDynamicOptions(sessionOptions);
            } catch (err) {
                // Fail silently for dynamic routes
                if (isMounted) setDynamicOptions([]);
            }
        };
        void loadDynamicRoutes();
        return () => { isMounted = false; };
    }, [isOpen, selectedProject]);

    // Enhance all routes with project context labels if applicable
    const baseOptions = ALL_ROUTES.map(opt => ({
        ...opt,
        label: opt.id === 'sprints' && selectedProject ? `Sprints in ${selectedProject.name}` : opt.label,
    }));

    const combinedOptions = [...baseOptions, ...dynamicOptions];

    const queryLower = query.toLowerCase();
    const filteredOptions = queryLower ? combinedOptions.filter(option =>
        option.label.toLowerCase().includes(queryLower) ||
        option.path.toLowerCase().includes(queryLower) ||
        ((option as any).subLabel && (option as any).subLabel.toLowerCase().includes(queryLower))
    ) : combinedOptions;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        const handleOpenEvent = () => setIsOpen(true);

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("open-command-palette", handleOpenEvent);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("open-command-palette", handleOpenEvent);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
            if (backdropRef.current && containerRef.current) {
                gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
                gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95, y: -20 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "out" });
            }
            // Small delay to ensure render before focus
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        if (listRef.current) {
            const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex]);

    const handleKeyDown = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredOptions[selectedIndex]) {
                handleSelect(filteredOptions[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
            if (isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape")) {
                handleKeyDown(e);
            }
        };

        if (isOpen) {
            window.addEventListener("keydown", handleGlobalKeyDown);
        }
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isOpen, filteredOptions, selectedIndex]);

    const handleSelect = (option: CommandOption) => {
        setIsOpen(false);
        void navigate({ to: option.path });
    };

    if (!isOpen) return null;

    return (
        <div ref={trapRef} className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
            <div ref={backdropRef} className="absolute inset-0 bg-void-900/40 dark:bg-void-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} aria-hidden="true" />

            <div
                ref={containerRef}
                className="relative w-full max-w-xl bg-white dark:bg-void-800 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-label="Command Palette"
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                        onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                        onKeyUp={(e) => {
                            // Also update state on keyup for tests that use typing
                            setQuery((e.target as HTMLInputElement).value);
                        }}
                        placeholder="Search routes or jump to..."
                        className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-base focus:ring-0"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="command-palette-list"
                        aria-activedescendant={filteredOptions[selectedIndex]?.id}
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-medium text-slate-400 bg-black/[0.04] dark:bg-white/[0.04] rounded-md ml-3">
                        ESC
                    </kbd>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="sm:hidden ml-3 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-signal-500/50"
                        aria-label="Close command palette"
                        type="button"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto dashboard-scrollbar py-2" ref={listRef} id="command-palette-list" role="listbox">
                    {filteredOptions.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            No results found for "{query}"
                        </div>
                    ) : (
                        filteredOptions.map((option, index) => {
                            const isSelected = index === selectedIndex;
                            return (
                                <button
                                    key={option.id}
                                    id={option.id}
                                    role="option"
                                    aria-selected={isSelected}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    onMouseMove={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center px-4 py-3 gap-3 text-left transition-colors focus-visible:outline-none ${
                                        isSelected
                                            ? "bg-signal-500/10 dark:bg-signal-500/15"
                                            : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        isSelected ? "bg-white dark:bg-void-900 shadow-sm" : "bg-black/[0.04] dark:bg-white/[0.04]"
                                    }`}>
                                        <option.icon className={`w-4 h-4 ${option.color}`} aria-hidden="true" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-semibold truncate ${
                                            isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                                        }`}>
                                            {option.label}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {option.path}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <ArrowRightIcon className="w-4 h-4 text-signal-500 shrink-0" aria-hidden="true" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper icon
const ArrowRightIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
);
