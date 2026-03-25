"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, SkipForward, RotateCcw, Pause, Settings2, Info, GitCompare, Radar } from "lucide-react";
import { parseSearchTerms } from "@/lib/simulation";

interface ControlPanelProps {
    onStart: (params: {
        head: number;
        tracks: number[];
        query: string;
        autoRun: boolean;
        speed: number;
        comparisonMode: boolean;
        caseSensitive: boolean;
        wholeWord: boolean;
    }) => void;
    onStep: () => void;
    onReset: () => void;
    onTogglePause: () => void;
    isRunning: boolean;
    isPaused: boolean;
    isComplete: boolean;
    canStep: boolean;
    comparisonMode: boolean;
    onToggleComparison: () => void;
    initialTrackInput?: string;
    initialQuery?: string;
    suggestedPatterns?: string[];
    fileMode?: boolean;
    showPatternControls?: boolean;
}

export function ControlPanel({
    onStart,
    onStep,
    onReset,
    onTogglePause,
    isRunning,
    isPaused,
    isComplete,
    canStep,
    comparisonMode,
    onToggleComparison,
    initialTrackInput,
    initialQuery,
    suggestedPatterns = [],
    fileMode = false,
    showPatternControls = true,
}: ControlPanelProps) {
    const [headPosition, setHeadPosition] = useState("53");
    const [trackInput, setTrackInput] = useState("98, 183, 37, 122, 14, 124, 65, 67");
    const [query, setQuery] = useState("kernel");
    const [autoRun, setAutoRun] = useState(true);
    const [speed, setSpeed] = useState(800);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialTrackInput) setTrackInput(initialTrackInput);
    }, [initialTrackInput]);

    useEffect(() => {
        if (initialQuery !== undefined && initialQuery.trim().length > 0) {
            setQuery(initialQuery);
        }
    }, [initialQuery]);

    const parsedTerms = showPatternControls ? parseSearchTerms(query) : [];

    const validate = () => {
        const errs: Record<string, string> = {};
        const head = parseInt(headPosition, 10);
        if (Number.isNaN(head) || head < 0 || head > 199) {
            errs.head = "Must be 0-199";
        }

        const tracks = trackInput
            .split(",")
            .map((value) => parseInt(value.trim(), 10))
            .filter((value) => !Number.isNaN(value));

        if (tracks.length === 0) {
            errs.tracks = "Enter at least one track number";
        } else if (tracks.some((track) => track < 0 || track > 199)) {
            errs.tracks = "Track numbers must be 0-199";
        }

        setErrors(errs);
        return Object.keys(errs).length === 0 ? { head, tracks } : null;
    };

    const handleStart = () => {
        const validated = validate();
        if (!validated) return;

        onStart({
            head: validated.head,
            tracks: validated.tracks,
            query: showPatternControls ? query : "",
            autoRun,
            speed,
            comparisonMode,
            caseSensitive: showPatternControls ? caseSensitive : false,
            wholeWord: showPatternControls ? wholeWord : false,
        });
    };

    const loadPreset = (preset: string) => {
        if (preset === "classic") {
            setHeadPosition("53");
            setTrackInput("98, 183, 37, 122, 14, 124, 65, 67");
            setQuery("kernel");
        } else if (preset === "heavy") {
            setHeadPosition("100");
            setTrackInput("10, 180, 50, 170, 30, 150, 70, 130, 20, 160, 40, 140, 60, 120, 80, 110");
            setQuery("scheduler, queue");
        } else if (preset === "simple") {
            setHeadPosition("0");
            setTrackInput("82, 170, 43, 140, 24, 16, 190");
            setQuery("process");
        }
    };

    const addPattern = (pattern: string) => {
        const currentTerms = parseSearchTerms(query);
        if (currentTerms.some((term) => term.toLowerCase() === pattern.toLowerCase())) {
            return;
        }
        setQuery([...currentTerms, pattern].join(", "));
    };

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-[var(--accent-blue)]" />
                    <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                        SIMULATION PARAMETERS
                    </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    {["classic", "simple", "heavy"].map((preset) => (
                        <button
                            key={preset}
                            onClick={() => loadPreset(preset)}
                            disabled={isRunning && !isPaused}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-[rgba(56,139,253,0.08)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] border border-[rgba(56,139,253,0.1)] hover:border-[rgba(56,139,253,0.3)] transition-all disabled:opacity-30 capitalize"
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={onToggleComparison}
                disabled={isRunning && !isPaused}
                className={`w-full flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-xl border transition-all mb-4 ${
                    comparisonMode
                        ? "bg-gradient-to-r from-blue-500/10 to-green-500/10 border-[rgba(63,185,80,0.35)] shadow-[0_0_18px_rgba(63,185,80,0.08)]"
                        : "bg-[rgba(56,139,253,0.04)] border-[rgba(56,139,253,0.15)] hover:border-[rgba(56,139,253,0.3)]"
                } disabled:opacity-40`}
            >
                <div className="flex items-center gap-2.5">
                    <GitCompare
                        size={16}
                        className={comparisonMode ? "text-green-400" : "text-[var(--accent-blue)]"}
                    />
                    <div className="text-left">
                        <p
                            className={`text-xs font-mono font-bold ${
                                comparisonMode ? "text-green-300" : "text-[var(--text-primary)]"
                            }`}
                        >
                            {comparisonMode ? "COMPARISON MODE ON" : "ENABLE COMPARISON MODE"}
                        </p>
                        <p className="text-[9px] font-mono text-[var(--text-muted)]">
                            {comparisonMode
                                ? "Running FCFS + SSTF side-by-side"
                                : "Compare FCFS vs SSTF algorithms"}
                        </p>
                    </div>
                </div>
                <div
                    className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${
                        comparisonMode ? "bg-green-500" : "bg-[rgba(56,139,253,0.25)]"
                    }`}
                >
                    <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                            comparisonMode ? "left-5" : "left-0.5"
                        }`}
                    />
                </div>
            </button>

            {comparisonMode && (
                <div className="flex flex-col gap-3 sm:flex-row mb-4">
                    <div className="flex-1 flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-blue-300 font-bold">FCFS</span>
                        <span className="text-[var(--text-muted)]">arrival order</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-green-300 font-bold">SSTF</span>
                        <span className="text-[var(--text-muted)]">nearest first</span>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 ${showPatternControls ? "sm:grid-cols-2" : ""} gap-4`}>
                <div>
                    <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 tracking-wide">
                        INITIAL HEAD POSITION <span className="text-[var(--text-muted)]">(0-199)</span>
                    </label>
                    <input
                        type="number"
                        value={headPosition}
                        onChange={(event) => setHeadPosition(event.target.value)}
                        disabled={isRunning && !isPaused}
                        className="os-input"
                        min={0}
                        max={199}
                        placeholder="e.g. 53"
                    />
                    {errors.head && (
                        <p className="text-[10px] text-red-400 mt-1 font-mono">{errors.head}</p>
                    )}
                </div>

                {showPatternControls && (
                    <div>
                        <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 tracking-wide">
                            PATTERN QUERY <span className="text-[var(--text-muted)]">(comma-separated watchlist)</span>
                        </label>
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            disabled={isRunning && !isPaused}
                            className="os-input"
                            placeholder={fileMode ? "e.g. error, timeout, denied" : "e.g. kernel, buffer"}
                        />
                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between mt-1.5">
                            <p className="text-[9px] font-mono text-[var(--text-muted)]">
                                {parsedTerms.length > 0
                                    ? `Scanning ${parsedTerms.length} pattern${parsedTerms.length === 1 ? "" : "s"}`
                                    : "Empty query still runs the disk scheduler"}
                            </p>
                            {parsedTerms.length > 0 && (
                                <div className="flex gap-1 flex-wrap justify-end">
                                    {parsedTerms.slice(0, 3).map((term) => (
                                        <span
                                            key={term}
                                            className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300"
                                        >
                                            {term}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={showPatternControls ? "sm:col-span-2" : undefined}>
                    <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 tracking-wide">
                        TRACK REQUESTS <span className="text-[var(--text-muted)]">(comma-separated, 0-199)</span>
                    </label>
                    <input
                        type="text"
                        value={trackInput}
                        onChange={(event) => setTrackInput(event.target.value)}
                        disabled={isRunning && !isPaused}
                        className="os-input"
                        placeholder="e.g. 98, 183, 37, 122, 14, 124, 65, 67"
                    />
                    {errors.tracks && (
                        <p className="text-[10px] text-red-400 mt-1 font-mono">{errors.tracks}</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 tracking-wide">
                        ANIMATION SPEED <span className="text-[var(--text-muted)]">({speed}ms)</span>
                    </label>
                    <input
                        type="range"
                        min={200}
                        max={2000}
                        step={100}
                        value={speed}
                        onChange={(event) => setSpeed(Number(event.target.value))}
                        className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mt-1">
                        <span>Fast</span>
                        <span>Slow</span>
                    </div>
                </div>

                <div className="flex flex-col justify-center">
                    <label className="block text-xs font-mono text-[var(--text-secondary)] mb-2 tracking-wide">
                        EXECUTION MODE
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        {[
                            { val: true, label: "AUTO-RUN" },
                            { val: false, label: "STEP-BY-STEP" },
                        ].map(({ val, label }) => (
                            <button
                                key={label}
                                onClick={() => setAutoRun(val)}
                                className={`flex-1 text-xs font-mono py-2 px-3 rounded-lg border transition-all ${
                                    autoRun === val
                                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                        : "bg-transparent border-[rgba(56,139,253,0.1)] text-[var(--text-muted)] hover:border-[rgba(56,139,253,0.3)]"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {showPatternControls && (
                <div className="mt-4 p-3 rounded-xl bg-[rgba(56,139,253,0.04)] border border-[rgba(56,139,253,0.1)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Radar size={12} className="text-[var(--accent-cyan)]" />
                        <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wide">
                            Detection Profile
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            {
                                label: "Whole-word",
                                active: wholeWord,
                                onClick: () => setWholeWord((value) => !value),
                            },
                            {
                                label: "Case-sensitive",
                                active: caseSensitive,
                                onClick: () => setCaseSensitive((value) => !value),
                            },
                        ].map((toggle) => (
                            <button
                                key={toggle.label}
                                onClick={toggle.onClick}
                                disabled={isRunning && !isPaused}
                                className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all ${
                                    toggle.active
                                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                        : "bg-transparent text-[var(--text-muted)] border-[rgba(56,139,253,0.1)]"
                                } disabled:opacity-40`}
                            >
                                {toggle.label}
                            </button>
                        ))}
                    </div>

                    {suggestedPatterns.length > 0 && (
                        <div className="mt-3">
                            <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1.5">
                                Quick-add suggested patterns
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {suggestedPatterns.slice(0, 6).map((pattern) => (
                                    <button
                                        key={pattern}
                                        type="button"
                                        onClick={() => addPattern(pattern)}
                                        disabled={isRunning && !isPaused}
                                        className="text-[9px] font-mono px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
                                    >
                                        + {pattern}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-start gap-2 mt-4 p-2.5 rounded-lg bg-[rgba(56,139,253,0.04)] border border-[rgba(56,139,253,0.08)]">
                <Info size={12} className="text-[var(--accent-blue)] flex-shrink-0" />
                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    {!showPatternControls
                        ? fileMode
                            ? "Uploaded files are mapped into disk tracks automatically. Adjust the head position if you want to start the seek from a different cylinder."
                            : "Manual scheduling mode: provide a head position and track queue, then compare FCFS and SSTF if needed."
                        : comparisonMode
                        ? "Both algorithms run on identical file-backed I/O requests. Pattern detection executes against each real block after every seek."
                        : fileMode
                            ? "Uploaded files are split into deterministic disk extents. Use commas to scan several log signatures in one run."
                            : "Synthetic mode still works, but file mode now delivers real block content and multi-pattern detection."}
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row mt-5">
                {!isRunning || isComplete ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStart}
                        className="os-btn os-btn-primary flex-1 justify-center"
                    >
                        <Play size={14} />
                        {isComplete ? "RE-RUN SIMULATION" : "START SIMULATION"}
                    </motion.button>
                ) : (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onTogglePause}
                            className="os-btn os-btn-secondary flex-1 justify-center"
                        >
                            <Pause size={14} />
                            {isPaused ? "RESUME" : "PAUSE"}
                        </motion.button>
                        {!autoRun && canStep && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onStep}
                                className="os-btn os-btn-secondary justify-center"
                            >
                                <SkipForward size={14} />
                                STEP
                            </motion.button>
                        )}
                    </>
                )}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onReset}
                    className="os-btn os-btn-danger justify-center"
                >
                    <RotateCcw size={14} />
                    RESET
                </motion.button>
            </div>
        </div>
    );
}
