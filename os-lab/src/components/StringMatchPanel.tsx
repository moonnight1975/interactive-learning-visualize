"use client";

import { motion } from "framer-motion";
import {
    type PatternSearchConfig,
    type SimulationStep,
    highlightMatches,
    compareAlgorithms,
} from "@/lib/simulation";
import { Search, Zap, Activity, CheckCircle2, XCircle, Radar } from "lucide-react";

interface StringMatchPanelProps {
    step: SimulationStep | null;
    searchConfig: PatternSearchConfig;
}

export function StringMatchPanel({ step, searchConfig }: StringMatchPanelProps) {
    if (!step) {
        return (
            <div className="glass-card p-4 sm:p-5 flex flex-col items-center justify-center min-h-[220px] sm:min-h-[240px]">
                <Search size={32} className="text-[var(--text-muted)] mb-3" />
                <p className="text-sm font-mono text-[var(--text-muted)] text-center">
                    File-backed string matching results will appear here
                </p>
                <p className="text-xs font-mono text-[var(--text-muted)] mt-1 opacity-60">
                    Start the simulation to analyze the current block
                </p>
            </div>
        );
    }

    const blockData = step.request.blockData ?? "";
    const comparison = compareAlgorithms(searchConfig, blockData);
    const matchResult = step.matchResult ?? comparison.kmp;
    const segments = highlightMatches(blockData, matchResult.occurrences);
    const hasPatterns = searchConfig.terms.length > 0;

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-purple)]" />
                    STRING MATCHING ENGINE
                </h2>
                <div className="flex items-center gap-2">
                    {matchResult.found ? (
                        <span className="status-badge bg-green-500/10 text-green-400 border border-green-500/20">
                            <CheckCircle2 size={10} />
                            HITS FOUND
                        </span>
                    ) : (
                        <span className="status-badge bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle size={10} />
                            NO HITS
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                <div className="bg-[rgba(188,140,255,0.06)] border border-[rgba(188,140,255,0.15)] rounded-lg p-3">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">Patterns</p>
                    <p className="font-mono font-bold text-[var(--accent-purple)] text-sm">
                        {searchConfig.terms.length || 0}
                    </p>
                </div>
                <div className="bg-[rgba(56,139,253,0.06)] border border-[rgba(56,139,253,0.15)] rounded-lg p-3">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">Block</p>
                    <p className="font-mono font-bold text-[var(--accent-cyan)] text-sm">Track {step.currentTrack}</p>
                </div>
                <div className="bg-[rgba(63,185,80,0.06)] border border-[rgba(63,185,80,0.15)] rounded-lg p-3">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">Total Hits</p>
                    <p className="font-mono font-bold text-[var(--accent-green)] text-sm">{matchResult.matches.length}</p>
                </div>
                <div className="bg-[rgba(247,144,0,0.06)] border border-[rgba(247,144,0,0.15)] rounded-lg p-3">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">Matched Terms</p>
                    <p className="font-mono font-bold text-[var(--accent-orange)] text-sm">
                        {matchResult.matchedPatterns.length}
                    </p>
                </div>
            </div>

            <div className="mb-4 rounded-lg border border-[rgba(56,139,253,0.1)] bg-[rgba(8,13,26,0.7)] p-3">
                <div className="flex items-center gap-2 mb-2">
                    <Radar size={12} className="text-[var(--accent-cyan)]" />
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        Search Profile
                    </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {searchConfig.terms.length > 0 ? (
                        searchConfig.terms.map((term) => (
                            <span
                                key={term}
                                className="text-[9px] font-mono px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300"
                            >
                                {term}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            No search terms configured
                        </span>
                    )}
                </div>
                <p className="text-[9px] font-mono text-[var(--text-muted)]">
                    {searchConfig.wholeWord ? "Whole-word" : "Substring"} matching |{" "}
                    {searchConfig.caseSensitive ? "Case-sensitive" : "Case-insensitive"}
                </p>
            </div>

            <div className="mb-4">
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide mb-2">
                    Block Data Content
                </p>
                <div className="terminal p-3 leading-5 sm:leading-6 text-[11px] sm:text-xs rounded-lg text-[var(--text-secondary)] break-words">
                    {segments.map((segment, index) =>
                        segment.highlight ? (
                            <motion.span
                                key={`${segment.pattern ?? "match"}-${index}`}
                                className="pattern-highlight"
                                initial={{ opacity: 0, backgroundColor: "rgba(247,144,0,0)" }}
                                animate={{ opacity: 1, backgroundColor: "rgba(247,144,0,0.35)" }}
                                transition={{ duration: 0.25, delay: index * 0.03 }}
                                title={segment.pattern}
                            >
                                {segment.text}
                            </motion.span>
                        ) : (
                            <span key={`plain-${index}`}>{segment.text}</span>
                        )
                    )}
                </div>
            </div>

            {hasPatterns && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                            Pattern Breakdown
                        </p>
                        {searchConfig.terms.length > 1 && (
                            <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                Multi-pattern scan
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {matchResult.patternBreakdown.map((entry) => (
                            <div
                                key={entry.pattern}
                                className="rounded-lg border border-[rgba(56,139,253,0.1)] bg-[rgba(8,13,26,0.7)] p-3"
                            >
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-1">
                                    <span className="text-[10px] font-mono text-[var(--text-primary)]">
                                        {entry.pattern}
                                    </span>
                                    <span className="text-[10px] font-mono text-[var(--accent-orange)]">
                                        {entry.count} hit{entry.count === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[9px] font-mono text-[var(--text-muted)]">
                                    <span>{entry.comparisons} comparisons</span>
                                    <span>
                                        {entry.matches.length > 0
                                            ? `Offsets: ${entry.matches.slice(0, 4).join(", ")}`
                                            : "No matches"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {hasPatterns && searchConfig.terms[0] && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[rgba(8,13,26,0.7)] border border-[rgba(56,139,253,0.1)] rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Activity size={12} className="text-[var(--accent-blue)]" />
                                <span className="text-[10px] font-mono font-bold text-[var(--accent-blue)] uppercase">
                                    Naive
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Comparisons:</span>
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        {comparison.naive.comparisons}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Matches:</span>
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        {comparison.naive.matches.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Time:</span>
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        {comparison.naive.executionTimeMs.toFixed(3)}ms
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[rgba(8,13,26,0.7)] border border-[rgba(188,140,255,0.15)] rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Zap size={12} className="text-[var(--accent-purple)]" />
                                <span className="text-[10px] font-mono font-bold text-[var(--accent-purple)] uppercase">
                                    KMP
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Comparisons:</span>
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        {comparison.kmp.comparisons}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Matches:</span>
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        {comparison.kmp.matches.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Time:</span>
                                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        {comparison.kmp.executionTimeMs.toFixed(3)}ms
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-[rgba(56,139,253,0.04)] border border-[rgba(56,139,253,0.08)]">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-1">
                            <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                Primary term benchmark: {searchConfig.terms[0]}
                            </span>
                            <span className="text-[9px] font-mono text-[var(--accent-green)]">
                                {comparison.naive.comparisons > 0
                                    ? `${((1 - comparison.kmp.comparisons / comparison.naive.comparisons) * 100).toFixed(1)}% fewer comparisons`
                                    : "Equal"}
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[rgba(56,139,253,0.1)] overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${Math.min(
                                        100,
                                        (comparison.kmp.comparisons / Math.max(comparison.naive.comparisons, 1)) * 100
                                    )}%`,
                                }}
                                transition={{ duration: 0.5 }}
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                            />
                        </div>
                        {searchConfig.terms.length > 1 && (
                            <p className="text-[8px] font-mono text-[var(--text-muted)] mt-1">
                                Algorithm comparison uses the primary term while the simulator still scans the full watchlist.
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
