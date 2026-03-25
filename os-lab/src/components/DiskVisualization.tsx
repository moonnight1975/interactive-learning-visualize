"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulationStep } from "@/lib/simulation";

interface DiskVisualizationProps {
    initialHead: number;
    steps: SimulationStep[];
    currentStepIndex: number;
    trackCount?: number;
}

const TRACK_COUNT = 200;
const TOTAL_CELLS = 20; // display grid cells (grouped)
const TRACKS_PER_CELL = TRACK_COUNT / TOTAL_CELLS; // 10 tracks per cell

export function DiskVisualization({
    initialHead,
    steps,
    currentStepIndex,
    trackCount = TRACK_COUNT,
}: DiskVisualizationProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    const visitedTracks = steps
        .slice(0, currentStepIndex)
        .map((s) => s.currentTrack);
    const currentTrack = currentStepIndex >= 0 && steps[currentStepIndex]
        ? steps[currentStepIndex].currentTrack
        : null;
    const prevTrack = currentStepIndex > 0 && steps[currentStepIndex - 1]
        ? steps[currentStepIndex - 1].currentTrack
        : initialHead;
    const headPos = currentTrack !== null ? currentTrack : initialHead;

    // Build seek path
    const seekPath = [initialHead, ...steps.slice(0, currentStepIndex + 1).map(s => s.currentTrack)];

    const getCellStatus = (cellIdx: number) => {
        const start = cellIdx * TRACKS_PER_CELL;
        const end = start + TRACKS_PER_CELL;

        const isHead = headPos >= start && headPos < end;
        const isVisited = visitedTracks.some((t) => t >= start && t < end);
        const isCurrent = currentTrack !== null && currentTrack >= start && currentTrack < end;

        if (isHead && isCurrent) return "head";
        if (isCurrent) return "active";
        if (isHead) return "head";
        if (isVisited) return "visited";
        return "default";
    };

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)]" />
                    DISK ARM VISUALIZATION
                </h2>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/40 border border-orange-500/60" />
                        <span className="text-[var(--text-muted)]">Head</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-green-500/20 border border-green-500/40" />
                        <span className="text-[var(--text-muted)]">Visited</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/20 border border-blue-500/40" />
                        <span className="text-[var(--text-muted)]">Active</span>
                    </span>
                </div>
            </div>

            {/* SVG Seek Graph */}
            <div className="relative mb-5 bg-[rgba(5,8,16,0.6)] rounded-lg border border-[rgba(56,139,253,0.1)] overflow-hidden">
                <div className="px-4 py-2 border-b border-[rgba(56,139,253,0.08)] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">SEEK PATH GRAPH</span>
                    <span className="text-[10px] font-mono text-[var(--accent-blue)]">
                        Head: Track {headPos}
                    </span>
                </div>
                <svg
                    ref={svgRef}
                    viewBox="0 0 600 120"
                    className="w-full"
                    style={{ height: 130 }}
                >
                    {/* Grid lines */}
                    {[0, 50, 100, 150, 199].map((track) => {
                        const x = (track / 199) * 560 + 20;
                        return (
                            <g key={track}>
                                <line
                                    x1={x} y1={10} x2={x} y2={100}
                                    stroke="rgba(56,139,253,0.08)"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                                <text
                                    x={x} y={112}
                                    textAnchor="middle"
                                    fill="rgba(125,133,144,0.7)"
                                    fontSize="8"
                                    fontFamily="'JetBrains Mono', monospace"
                                >
                                    {track}
                                </text>
                            </g>
                        );
                    })}

                    {/* Y-axis step labels */}
                    {seekPath.map((_, i) => {
                        const y = 10 + (i / Math.max(seekPath.length - 1, 1)) * 90;
                        return (
                            <text
                                key={i} x={8} y={y + 4}
                                textAnchor="middle"
                                fill="rgba(125,133,144,0.5)"
                                fontSize="7"
                                fontFamily="'JetBrains Mono', monospace"
                            >
                                {i}
                            </text>
                        );
                    })}

                    {/* Path lines */}
                    {seekPath.length > 1 && seekPath.slice(1).map((track, i) => {
                        const prevTrackVal = seekPath[i];
                        const x1 = (prevTrackVal / 199) * 560 + 20;
                        const y1 = 10 + (i / Math.max(seekPath.length - 1, 1)) * 90;
                        const x2 = (track / 199) * 560 + 20;
                        const y2 = 10 + ((i + 1) / Math.max(seekPath.length - 1, 1)) * 90;
                        return (
                            <motion.line
                                key={i}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={i === seekPath.length - 2 ? "rgba(247,144,0,0.8)" : "rgba(56,139,253,0.5)"}
                                strokeWidth="1.5"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            />
                        );
                    })}

                    {/* Points */}
                    {seekPath.map((track, i) => {
                        const x = (track / 199) * 560 + 20;
                        const y = 10 + (i / Math.max(seekPath.length - 1, 1)) * 90;
                        const isLast = i === seekPath.length - 1;
                        return (
                            <motion.circle
                                key={i}
                                cx={x} cy={y} r={isLast ? 5 : 3}
                                fill={isLast ? "rgba(247,144,0,1)" : i === 0 ? "rgba(188,140,255,0.9)" : "rgba(56,139,253,0.8)"}
                                stroke={isLast ? "rgba(247,144,0,0.4)" : "transparent"}
                                strokeWidth={isLast ? 3 : 0}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                            />
                        );
                    })}
                </svg>
            </div>

            {/* Cell grid */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        Disk Sectors (200 tracks, grouped by 10)
                    </span>
                    <span className="text-[10px] font-mono text-[var(--accent-orange)]">
                        ◆ Track {headPos}
                    </span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: TOTAL_CELLS }, (_, i) => {
                        const status = getCellStatus(i);
                        const trackStart = i * TRACKS_PER_CELL;

                        return (
                            <motion.div
                                key={i}
                                className={`track-cell tooltip ${status}`}
                                data-tooltip={`${trackStart}–${trackStart + TRACKS_PER_CELL - 1}`}
                                animate={
                                    status === "head"
                                        ? { scale: [1, 1.1, 1], boxShadow: ["0 0 0 rgba(247,144,0,0)", "0 0 15px rgba(247,144,0,0.6)", "0 0 8px rgba(247,144,0,0.3)"] }
                                        : { scale: 1 }
                                }
                                transition={{ duration: 0.3 }}
                            >
                                {trackStart}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Current step info */}
            <AnimatePresence>
                {currentStepIndex >= 0 && steps[currentStepIndex] && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-4 p-3 rounded-lg bg-[rgba(56,139,253,0.05)] border border-[rgba(56,139,253,0.15)]"
                    >
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-0.5">From</p>
                                <p className="font-mono font-bold text-[var(--accent-purple)]">
                                    Track {currentStepIndex === 0 ? initialHead : steps[currentStepIndex - 1]?.currentTrack}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-0.5">To</p>
                                <p className="font-mono font-bold text-[var(--accent-orange)]">
                                    Track {steps[currentStepIndex].currentTrack}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-0.5">Distance</p>
                                <p className="font-mono font-bold text-[var(--accent-cyan)]">
                                    {steps[currentStepIndex].seekDistance} tracks
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
