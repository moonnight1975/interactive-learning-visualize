"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
    BarChart3,
    Search,
    FileText,
    Layers,
    Target,
    Activity,
    Radar,
} from "lucide-react";
import {
    type ParsedFile,
    analyzePatternFrequency,
    analyzeBlockHotspots,
} from "@/lib/fileParser";
import {
    type PatternSearchConfig,
    type SimulationStep,
    highlightMatches,
} from "@/lib/simulation";

interface FileAnalysisPanelProps {
    parsedFile: ParsedFile;
    searchConfig: PatternSearchConfig;
    steps: SimulationStep[];
    currentStepIndex: number;
}

export function FileAnalysisPanel({
    parsedFile,
    searchConfig,
    steps,
    currentStepIndex,
}: FileAnalysisPanelProps) {
    const patterns = useMemo(
        () =>
            searchConfig.terms.length > 0
                ? searchConfig.terms
                : parsedFile.recommendedPatterns.slice(0, 5),
        [parsedFile.recommendedPatterns, searchConfig.terms]
    );

    const patternFreq = useMemo(
        () => analyzePatternFrequency(parsedFile.blocks, patterns, searchConfig),
        [parsedFile.blocks, patterns, searchConfig]
    );

    const hotspots = useMemo(
        () => analyzeBlockHotspots(parsedFile.blocks, patterns, searchConfig).slice(0, 3),
        [parsedFile.blocks, patterns, searchConfig]
    );

    const hotspotByBlock = useMemo(
        () => new Map(hotspots.map((hotspot) => [hotspot.blockIndex, hotspot])),
        [hotspots]
    );

    const maxCount = Math.max(...patternFreq.map((pattern) => pattern.count), 1);
    const currentStep = steps[currentStepIndex];
    const currentBlock = currentStep
        ? parsedFile.blocks.find((block) => block.trackNum === currentStep.currentTrack) ?? null
        : null;

    const highlightedContent = useMemo(() => {
        if (!currentBlock) return [];
        return highlightMatches(
            currentBlock.content,
            currentStep?.matchResult?.occurrences ?? []
        );
    }, [currentBlock, currentStep?.matchResult?.occurrences]);

    const totalHits = patternFreq.reduce((total, pattern) => total + pattern.count, 0);
    const matchedBlocks = hotspots.length;
    const dominantPattern = [...patternFreq].sort((a, b) => b.count - a.count)[0];

    return (
        <div className="glass-card p-5 space-y-5">
            <div className="flex items-center gap-2">
                <FileText size={14} className="text-[var(--accent-blue)]" />
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                    FILE ANALYSIS
                </h2>
                <span className="ml-auto text-[9px] font-mono text-[var(--text-muted)] bg-[rgba(56,139,253,0.06)] px-2 py-0.5 rounded border border-[rgba(56,139,253,0.12)]">
                    {parsedFile.name}
                </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Total Hits", value: totalHits, color: "text-[var(--accent-orange)]" },
                    { label: "Hot Blocks", value: matchedBlocks, color: "text-[var(--accent-green)]" },
                    {
                        label: "Track Span",
                        value: `${parsedFile.ioProfile.trackStart}-${parsedFile.ioProfile.trackEnd}`,
                        color: "text-[var(--accent-cyan)]",
                    },
                    {
                        label: "Dominant Pattern",
                        value: dominantPattern?.word ?? "-",
                        color: "text-[var(--accent-purple)]",
                    },
                ].map((metric) => (
                    <div
                        key={metric.label}
                        className="rounded-lg p-3 bg-[rgba(8,13,26,0.65)] border border-[rgba(56,139,253,0.1)]"
                    >
                        <p className="text-[8px] font-mono text-[var(--text-muted)] uppercase mb-1">
                            {metric.label}
                        </p>
                        <p className={`font-mono font-bold text-sm ${metric.color}`}>{metric.value}</p>
                    </div>
                ))}
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        <Layers size={11} className="text-[var(--accent-cyan)]" />
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                            Active Block Content
                        </span>
                    </div>
                    {currentStep && (
                        <span className="text-[9px] font-mono text-[var(--accent-blue)]">
                            Track {currentStep.currentTrack}
                            {currentBlock && ` | Lines ${currentBlock.lineStart + 1}-${currentBlock.lineEnd + 1}`}
                        </span>
                    )}
                </div>

                <div className="terminal rounded-lg p-3 min-h-[80px] relative overflow-hidden">
                    {currentStep && currentBlock ? (
                        <motion.p
                            key={currentStep.stepIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[11px] font-mono text-[var(--text-secondary)] leading-5 break-words"
                        >
                            {highlightedContent.map((segment, index) =>
                                segment.highlight ? (
                                    <mark key={`${segment.pattern ?? "match"}-${index}`} className="pattern-highlight">
                                        {segment.text}
                                    </mark>
                                ) : (
                                    <span key={`plain-${index}`}>{segment.text}</span>
                                )
                            )}
                        </motion.p>
                    ) : (
                        <p className="text-[11px] font-mono text-[var(--text-muted)] italic">
                            {steps.length > 0
                                ? "Waiting for simulation step..."
                                : "Start simulation to view real block content"}
                        </p>
                    )}
                </div>

                {currentStep && currentBlock && (
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                        {[
                            { label: "Lines", value: `${currentBlock.lineStart + 1}-${currentBlock.lineEnd + 1}` },
                            { label: "Chars", value: currentBlock.charCount },
                            { label: "Hits", value: currentStep.matchResult?.matches.length ?? 0 },
                            { label: "Comparisons", value: currentStep.matchResult?.comparisons ?? 0 },
                        ].map(({ label, value }) => (
                            <div key={label} className="text-[9px] font-mono">
                                <span className="text-[var(--text-muted)]">{label}: </span>
                                <span className="text-[var(--accent-cyan)] font-bold">{value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <Search size={11} className="text-[var(--accent-orange)]" />
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        Pattern Frequency Across Blocks
                    </span>
                </div>

                <div className="space-y-2">
                    {patternFreq.map(({ word, count, blocks }) => {
                        const pct = count > 0 ? (count / maxCount) * 100 : 0;
                        const isPrimary = word === searchConfig.terms[0];

                        return (
                            <div key={word}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        {isPrimary && <Target size={9} className="text-[var(--accent-orange)]" />}
                                        <span
                                            className={`text-[10px] font-mono ${
                                                isPrimary ? "text-[var(--accent-orange)] font-bold" : "text-[var(--text-secondary)]"
                                            }`}
                                        >
                                            {word}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
                                        </span>
                                        <span
                                            className={`text-[10px] font-mono font-bold ${
                                                isPrimary ? "text-[var(--accent-orange)]" : "text-[var(--accent-blue)]"
                                            }`}
                                        >
                                            x{count}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-[rgba(56,139,253,0.08)] overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{
                                            background: isPrimary
                                                ? "linear-gradient(90deg, #f79000, #ffd700)"
                                                : "linear-gradient(90deg, #388bfd, #79c0ff)",
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                {blocks.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {blocks.map((blockIndex) => (
                                            <span
                                                key={`${word}-${blockIndex}`}
                                                className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                                                    isPrimary
                                                        ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                                                        : "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                                                }`}
                                            >
                                                B{blockIndex}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <Radar size={11} className="text-[var(--accent-green)]" />
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        Hotspot Blocks
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {hotspots.length > 0 ? (
                        hotspots.map((hotspot) => (
                            <div
                                key={hotspot.blockIndex}
                                className="rounded-lg border border-[rgba(63,185,80,0.18)] bg-[rgba(63,185,80,0.05)] p-3"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-mono text-green-300 font-bold">
                                        Block {hotspot.blockIndex}
                                    </span>
                                    <span className="text-[9px] font-mono text-[var(--text-muted)]">
                                        Track {hotspot.trackNum}
                                    </span>
                                </div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)]">
                                    Lines {hotspot.lineStart + 1}-{hotspot.lineEnd + 1}
                                </p>
                                <p className="text-[10px] font-mono text-[var(--accent-orange)] mt-2">
                                    {hotspot.totalHits} total hit{hotspot.totalHits === 1 ? "" : "s"}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {hotspot.matchedPatterns.map((pattern) => (
                                        <span
                                            key={`${hotspot.blockIndex}-${pattern}`}
                                            className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-300"
                                        >
                                            {pattern}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">
                            No hotspot blocks yet. Try loading a recommended watchlist or relaxing the detection profile.
                        </p>
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <BarChart3 size={11} className="text-[var(--accent-green)]" />
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        Block Summary
                    </span>
                </div>

                <div className="space-y-1 max-h-[200px] overflow-y-auto terminal-scroll">
                    {parsedFile.blocks.map((block) => {
                        const step = steps.find((item) => item.currentTrack === block.trackNum);
                        const isVisited = step !== undefined && steps.indexOf(step) <= currentStepIndex;
                        const isCurrent = currentStep && currentStep.currentTrack === block.trackNum;
                        const hotspot = hotspotByBlock.get(block.blockIndex);

                        return (
                            <motion.div
                                key={block.blockIndex}
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: block.blockIndex * 0.03 }}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                                    isCurrent
                                        ? "border-orange-400/50 bg-orange-500/10"
                                        : isVisited
                                            ? "border-green-500/20 bg-green-500/10 opacity-90"
                                            : "border-[rgba(56,139,253,0.08)] bg-transparent opacity-70"
                                }`}
                            >
                                <span
                                    className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold ${
                                        isCurrent
                                            ? "bg-orange-500/20 text-orange-300"
                                            : isVisited
                                                ? "bg-green-500/15 text-green-300"
                                                : "bg-[rgba(56,139,253,0.08)] text-[var(--text-muted)]"
                                    }`}
                                >
                                    {block.blockIndex}
                                </span>
                                <span className="text-[var(--text-muted)]">T{block.trackNum}</span>
                                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                                    <Activity size={8} />
                                    L{block.lineStart + 1}-{block.lineEnd + 1}
                                </span>
                                <span className="ml-auto text-[var(--text-muted)]">{block.charCount}c</span>
                                {hotspot && (
                                    <span className="px-1 py-0.5 rounded text-[8px] bg-orange-500/15 text-orange-300 border border-orange-500/20">
                                        {hotspot.totalHits} hits
                                    </span>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
