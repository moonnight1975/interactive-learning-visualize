/**
 * DiskHeadVisualizer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PURE RENDER COMPONENT — zero business logic, zero WebSocket awareness.
 *
 * Props:
 *   steps[]            — all buffered WsSimulationStep records
 *   currentStepIndex   — which step is "now"
 *   totalSeekDistance  — cumulative seek for the current step
 *   trackCount         — disk size (default 200)
 *
 * Visualization:
 *   • SVG seek-path graph    — animated with CSS transitions, not JS timers
 *   • Disk sector cell grid  — 20 grouped cells, highlights current head
 *   • Step metadata row      — From / To / Distance
 *
 * Fully testable with React Testing Library — just render with props.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { WsSimulationStep } from "@/lib/wsClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiskHeadVisualizerProps {
    steps: WsSimulationStep[];
    currentStepIndex: number;
    totalSeekDistance: number;
    trackCount?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_CELLS = 20;
const SVG_W = 560;
const SVG_H = 100;
const SVG_PAD_X = 20;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function trackToX(track: number, maxTrack: number): number {
    return (track / maxTrack) * SVG_W + SVG_PAD_X;
}

function stepToY(stepIdx: number, total: number): number {
    return 10 + (stepIdx / Math.max(total - 1, 1)) * (SVG_H - 10);
}

type CellStatus = "head" | "active" | "visited" | "default";

function getCellStatus(
    cellIdx: number,
    tracksPerCell: number,
    headPos: number,
    currentTrack: number | null,
    visitedTracks: number[]
): CellStatus {
    const start = cellIdx * tracksPerCell;
    const end = start + tracksPerCell;

    const isHead = headPos >= start && headPos < end;
    const isCurrent = currentTrack !== null && currentTrack >= start && currentTrack < end;
    const isVisited = visitedTracks.some((t) => t >= start && t < end);

    if (isHead && isCurrent) return "head";
    if (isCurrent) return "head";
    if (isHead) return "head";
    if (isVisited) return "visited";
    return "default";
}

const CELL_CLASS: Record<CellStatus, string> = {
    head: "track-cell head",
    active: "track-cell head",
    visited: "track-cell visited",
    default: "track-cell",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DiskHeadVisualizer({
    steps,
    currentStepIndex,
    totalSeekDistance,
    trackCount = 200,
}: DiskHeadVisualizerProps) {
    const maxTrack = trackCount - 1;
    const tracksPerCell = trackCount / TOTAL_CELLS;

    // Derive all display values from props alone — pure function of inputs
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] ?? null : null;
    const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] ?? null : null;

    const headPos = currentStep?.head_position ?? steps[0]?.head_position ?? 0;
    const currentTrack = currentStep?.head_position ?? null;

    const visitedTracks = steps.slice(0, Math.max(currentStepIndex, 0)).map((s) => s.head_position);

    // Build seek path [initial, ...steps up to current]
    const initialHead = steps.length > 0 ? steps[0].head_position : 0;
    const seekPath: number[] = currentStepIndex >= 0
        ? [initialHead, ...steps.slice(0, currentStepIndex + 1).map((s) => s.head_position)]
        : [initialHead];

    const totalPathNodes = seekPath.length;

    return (
        <div className="glass-card p-4 sm:p-5" data-testid="disk-head-visualizer">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)]" />
                    DISK ARM VISUALIZATION
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/40 border border-orange-500/60" />
                        <span className="text-[var(--text-muted)]">Head</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-green-500/20 border border-green-500/40" />
                        <span className="text-[var(--text-muted)]">Visited</span>
                    </span>
                    <span className="ml-4 text-[var(--accent-cyan)] font-bold">
                        Total seek: {totalSeekDistance}
                    </span>
                </div>
            </div>

            {/* ── SVG Seek Path Graph ── */}
            <div className="relative mb-5 bg-[rgba(5,8,16,0.6)] rounded-lg border border-[rgba(56,139,253,0.1)] overflow-hidden">
                <div className="px-4 py-2 border-b border-[rgba(56,139,253,0.08)] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">SEEK PATH GRAPH</span>
                    <span className="text-[10px] font-mono text-[var(--accent-blue)]">
                        Head: Track {headPos}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[32rem]">
                        <svg
                            viewBox={`0 0 600 120`}
                            className="w-full"
                            style={{ height: 130 }}
                            aria-label="Disk seek path visualization"
                            role="img"
                        >
                            {/* Grid lines at key track positions */}
                            {[0, 50, 100, 150, maxTrack].map((track) => {
                                const x = trackToX(track, maxTrack);
                                return (
                                    <g key={track}>
                                        <line
                                            x1={x} y1={10} x2={x} y2={SVG_H}
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
                            {seekPath.map((_, i) => (
                                <text
                                    key={i}
                                    x={8} y={stepToY(i, totalPathNodes) + 4}
                                    textAnchor="middle"
                                    fill="rgba(125,133,144,0.5)"
                                    fontSize="7"
                                    fontFamily="'JetBrains Mono', monospace"
                                >
                                    {i}
                                </text>
                            ))}

                            {/* Seek-path lines — CSS transition via style prop */}
                            {seekPath.length > 1 && seekPath.slice(1).map((track, i) => {
                                const x1 = trackToX(seekPath[i], maxTrack);
                                const y1 = stepToY(i, totalPathNodes);
                                const x2 = trackToX(track, maxTrack);
                                const y2 = stepToY(i + 1, totalPathNodes);
                                const isLatest = i === seekPath.length - 2;
                                return (
                                    <line
                                        key={i}
                                        x1={x1} y1={y1} x2={x2} y2={y2}
                                        stroke={isLatest ? "rgba(247,144,0,0.85)" : "rgba(56,139,253,0.5)"}
                                        strokeWidth={isLatest ? 2 : 1.5}
                                        style={{ transition: "stroke 0.25s ease, stroke-width 0.25s ease" }}
                                    />
                                );
                            })}

                            {/* Points on path */}
                            {seekPath.map((track, i) => {
                                const x = trackToX(track, maxTrack);
                                const y = stepToY(i, totalPathNodes);
                                const isLast = i === seekPath.length - 1;
                                const isFirst = i === 0;
                                return (
                                    <circle
                                        key={i}
                                        cx={x} cy={y}
                                        r={isLast ? 5 : 3}
                                        fill={
                                            isLast
                                                ? "rgba(247,144,0,1)"
                                                : isFirst
                                                ? "rgba(188,140,255,0.9)"
                                                : "rgba(56,139,253,0.8)"
                                        }
                                        stroke={isLast ? "rgba(247,144,0,0.4)" : "transparent"}
                                        strokeWidth={isLast ? 3 : 0}
                                        style={{
                                            // CSS transition — NO JS timers
                                            transition: "cx 0.3s ease, cy 0.3s ease, r 0.2s ease",
                                        }}
                                    />
                                );
                            })}
                        </svg>
                    </div>
                </div>
            </div>

            {/* ── Sector Cell Grid ── */}
            <div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
                        Disk Sectors ({trackCount} tracks, grouped by {tracksPerCell})
                    </span>
                    <span className="text-[10px] font-mono text-[var(--accent-orange)]">
                        ◆ Track {headPos}
                    </span>
                </div>
                <div
                    className="grid grid-cols-5 sm:grid-cols-10 gap-1 justify-items-center"
                    data-testid="sector-grid"
                >
                    {Array.from({ length: TOTAL_CELLS }, (_, i) => {
                        const status = getCellStatus(
                            i,
                            tracksPerCell,
                            headPos,
                            currentTrack,
                            visitedTracks
                        );
                        const trackStart = i * tracksPerCell;

                        return (
                            <motion.div
                                key={i}
                                className={`${CELL_CLASS[status]} tooltip`}
                                data-tooltip={`${trackStart}–${trackStart + tracksPerCell - 1}`}
                                data-testid={`sector-cell-${i}`}
                                animate={
                                    status === "head"
                                        ? {
                                              scale: [1, 1.1, 1],
                                              boxShadow: [
                                                  "0 0 0 rgba(247,144,0,0)",
                                                  "0 0 15px rgba(247,144,0,0.6)",
                                                  "0 0 8px rgba(247,144,0,0.3)",
                                              ],
                                          }
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

            {/* ── Step Metadata ── */}
            <AnimatePresence>
                {currentStep && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-4 p-3 rounded-lg bg-[rgba(56,139,253,0.05)] border border-[rgba(56,139,253,0.15)]"
                        data-testid="step-metadata"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-0.5">From</p>
                                <p className="font-mono font-bold text-[var(--accent-purple)]">
                                    Track {prevStep?.head_position ?? currentStep.head_position}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-0.5">To</p>
                                <p className="font-mono font-bold text-[var(--accent-orange)]">
                                    Track {currentStep.head_position}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-0.5">Distance</p>
                                <p className="font-mono font-bold text-[var(--accent-cyan)]">
                                    {currentStep.seek_distance_this_step} tracks
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
