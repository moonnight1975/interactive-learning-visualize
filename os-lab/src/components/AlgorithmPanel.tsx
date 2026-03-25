"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SimulationStep } from "@/lib/simulation";
import { CheckCircle, Loader2, Circle, Clock } from "lucide-react";

interface AlgorithmPanelProps {
    label: "FCFS" | "SSTF";
    color: "blue" | "green";
    steps: SimulationStep[];
    currentStepIndex: number;
    initialHead: number;
    totalSeekTime: number;
    avgSeek: string;
}

const COLOR_MAP = {
    blue: {
        dot: "bg-[var(--accent-blue)]",
        text: "text-[var(--accent-blue)]",
        textCyan: "text-[var(--accent-cyan)]",
        border: "border-[rgba(56,139,253,0.3)]",
        bg: "bg-[rgba(56,139,253,0.08)]",
        pathStroke: "rgba(56,139,253,0.8)",
        pathStrokeLast: "rgba(56,139,253,1)",
        pointFill: "rgba(56,139,253,1)",
        headFill: "rgba(121,192,255,1)",
        headGlow: "0 0 12px rgba(56,139,253,0.8)",
        trackHead: "bg-blue-500/30 border-blue-400/60 text-blue-300",
        trackVisited: "bg-blue-500/10 border-blue-500/20 text-blue-500/70",
        trackActive: "bg-blue-500/20 border-blue-400/50 text-blue-300",
        badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
        queueProcessing: "border-blue-400 bg-blue-500/08",
        queueDone: "border-blue-500/20 bg-blue-500/05",
    },
    green: {
        dot: "bg-[var(--accent-green)]",
        text: "text-[var(--accent-green)]",
        textCyan: "text-green-300",
        border: "border-[rgba(63,185,80,0.3)]",
        bg: "bg-[rgba(63,185,80,0.06)]",
        pathStroke: "rgba(63,185,80,0.8)",
        pathStrokeLast: "rgba(63,185,80,1)",
        pointFill: "rgba(63,185,80,1)",
        headFill: "rgba(63,185,80,1)",
        headGlow: "0 0 12px rgba(63,185,80,0.8)",
        trackHead: "bg-green-500/30 border-green-400/60 text-green-300",
        trackVisited: "bg-green-500/10 border-green-500/20 text-green-500/70",
        trackActive: "bg-green-500/20 border-green-400/50 text-green-300",
        badge: "bg-green-500/10 text-green-300 border-green-500/20",
        queueProcessing: "border-green-400 bg-green-500/08",
        queueDone: "border-green-500/20 bg-green-500/05",
    },
};

const TOTAL_CELLS = 20;
const TRACKS_PER_CELL = 10;

export function AlgorithmPanel({
    label,
    color,
    steps,
    currentStepIndex,
    initialHead,
    totalSeekTime,
    avgSeek,
}: AlgorithmPanelProps) {
    const c = COLOR_MAP[color];

    const visitedTracks = steps.slice(0, currentStepIndex).map((s) => s.currentTrack);
    const currentTrack = steps[currentStepIndex]?.currentTrack ?? null;
    const headPos = currentTrack !== null ? currentTrack : initialHead;
    const seekPath = [initialHead, ...steps.slice(0, currentStepIndex + 1).map((s) => s.currentTrack)];

    const getCellStatus = (cellIdx: number) => {
        const start = cellIdx * TRACKS_PER_CELL;
        const end = start + TRACKS_PER_CELL;
        const isHead = headPos >= start && headPos < end;
        const isVisited = visitedTracks.some((t) => t >= start && t < end);
        const isCurrent = currentTrack !== null && currentTrack >= start && currentTrack < end;
        if (isHead || isCurrent) return "head";
        if (isVisited) return "visited";
        return "default";
    };

    return (
        <div className={`flex flex-col gap-3 rounded-xl border ${c.border} ${c.bg} p-3 sm:p-4`}>
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className={`font-display font-bold text-base tracking-widest ${c.text}`}>
                        {label}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {label === "FCFS" ? "First Come First Serve" : "Shortest Seek Time First"}
                    </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${c.badge}`}>
                    Head: {headPos}
                </span>
            </div>

            {/* SVG Seek path */}
            <div className="bg-[rgba(5,8,16,0.7)] rounded-lg border border-[rgba(56,139,253,0.08)] overflow-hidden">
                <div className="px-3 py-1.5 border-b border-[rgba(56,139,253,0.06)] flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <span className="text-[9px] font-mono text-[var(--text-muted)]">SEEK PATH</span>
                    <span className={`text-[9px] font-mono ${c.text}`}>Seek: {totalSeekTime}</span>
                </div>
                <div className="overflow-x-auto">
                    <div className="min-w-[28rem]">
                        <svg viewBox="0 0 500 90" className="w-full" style={{ height: 100 }}>
                            {/* Grid lines */}
                            {[0, 50, 100, 150, 199].map((t) => {
                                const x = (t / 199) * 460 + 20;
                                return (
                                    <g key={t}>
                                        <line x1={x} y1={8} x2={x} y2={78} stroke="rgba(56,139,253,0.06)" strokeWidth="1" strokeDasharray="3,3" />
                                        <text x={x} y={88} textAnchor="middle" fill="rgba(125,133,144,0.5)" fontSize="7" fontFamily="'JetBrains Mono', monospace">{t}</text>
                                    </g>
                                );
                            })}
                            {/* Path lines */}
                            {seekPath.length > 1 && seekPath.slice(1).map((track, i) => {
                                const x1 = (seekPath[i] / 199) * 460 + 20;
                                const y1 = 8 + (i / Math.max(seekPath.length - 1, 1)) * 70;
                                const x2 = (track / 199) * 460 + 20;
                                const y2 = 8 + ((i + 1) / Math.max(seekPath.length - 1, 1)) * 70;
                                const isLast = i === seekPath.length - 2;
                                return (
                                    <motion.line
                                        key={i}
                                        x1={x1} y1={y1} x2={x2} y2={y2}
                                        stroke={isLast ? c.pathStrokeLast : c.pathStroke}
                                        strokeWidth={isLast ? 2 : 1.5}
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                );
                            })}
                            {/* Points */}
                            {seekPath.map((track, i) => {
                                const x = (track / 199) * 460 + 20;
                                const y = 8 + (i / Math.max(seekPath.length - 1, 1)) * 70;
                                const isLast = i === seekPath.length - 1;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx={x} cy={y}
                                        r={isLast ? 5 : i === 0 ? 4 : 3}
                                        fill={isLast ? c.headFill : i === 0 ? "rgba(188,140,255,0.9)" : c.pointFill}
                                        stroke={isLast ? c.headFill : "transparent"}
                                        strokeOpacity={0.3}
                                        strokeWidth={isLast ? 3 : 0}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.04 }}
                                    />
                                );
                            })}
                        </svg>
                    </div>
                </div>
            </div>

            {/* Track grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 justify-items-center">
                {Array.from({ length: TOTAL_CELLS }, (_, i) => {
                    const status = getCellStatus(i);
                    const cls =
                        status === "head" ? c.trackHead :
                            status === "visited" ? c.trackVisited :
                                "bg-[rgba(8,13,26,0.5)] border-[rgba(56,139,253,0.08)] text-[var(--text-muted)]";
                    return (
                        <motion.div
                            key={i}
                            className={`flex items-center justify-center w-full aspect-square rounded text-[9px] font-mono font-semibold border transition-all duration-300 ${cls}`}
                            animate={status === "head" ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            {i * TRACKS_PER_CELL}
                        </motion.div>
                    );
                })}
            </div>

            {/* Step info */}
            <AnimatePresence>
                {currentStepIndex >= 0 && steps[currentStepIndex] && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center"
                    >
                        <div className={`rounded-lg p-2 border ${c.border} ${c.bg}`}>
                            <p className="text-[8px] font-mono text-[var(--text-muted)] mb-0.5">FROM</p>
                            <p className={`font-mono font-bold text-xs text-[var(--accent-purple)]`}>
                                {currentStepIndex === 0 ? initialHead : steps[currentStepIndex - 1]?.currentTrack}
                            </p>
                        </div>
                        <div className={`rounded-lg p-2 border ${c.border} ${c.bg}`}>
                            <p className="text-[8px] font-mono text-[var(--text-muted)] mb-0.5">TO</p>
                            <p className={`font-mono font-bold text-xs ${c.text}`}>
                                {steps[currentStepIndex].currentTrack}
                            </p>
                        </div>
                        <div className={`rounded-lg p-2 border ${c.border} ${c.bg}`}>
                            <p className="text-[8px] font-mono text-[var(--text-muted)] mb-0.5">DIST</p>
                            <p className={`font-mono font-bold text-xs ${c.textCyan}`}>
                                {steps[currentStepIndex].seekDistance}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Queue (compact) */}
            <div className="space-y-1 max-h-[160px] sm:max-h-[180px] overflow-y-auto terminal-scroll">
                {steps.map((step, idx) => {
                    const status =
                        idx < currentStepIndex ? "done" :
                            idx === currentStepIndex ? "processing" : "pending";
                    return (
                        <motion.div
                            key={step.request.id}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className={`flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] sm:text-[11px] font-mono transition-all ${status === "processing" ? `${c.queueProcessing} border-current` :
                                    status === "done" ? `${c.queueDone} opacity-70` :
                                        "bg-transparent border-[rgba(56,139,253,0.08)] opacity-50"
                                }`}
                        >
                            {status === "done" ? (
                                <CheckCircle size={11} className={c.text} />
                            ) : status === "processing" ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                    <Loader2 size={11} className={c.text} />
                                </motion.div>
                            ) : (
                                <Circle size={11} className="text-[var(--text-muted)]" />
                            )}
                            <span className="text-[var(--text-muted)] w-4 text-center">{idx + 1}</span>
                            <span className={status !== "pending" ? c.text : "text-[var(--text-secondary)]"}>
                                T{step.currentTrack}
                            </span>
                            {status !== "pending" && (
                                <>
                                    <span className="text-[var(--text-muted)] ml-auto flex items-center gap-0.5">
                                        <Clock size={9} />
                                        {step.seekDistance}
                                    </span>
                                </>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer metrics */}
            <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${c.border}`}>
                <div>
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Total Seek</p>
                    <p className={`font-mono font-bold text-lg ${c.text}`}>{totalSeekTime}</p>
                    <p className="text-[8px] font-mono text-[var(--text-muted)]">tracks</p>
                </div>
                <div>
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Avg / Block</p>
                    <p className={`font-mono font-bold text-lg ${c.textCyan}`}>{avgSeek}</p>
                    <p className="text-[8px] font-mono text-[var(--text-muted)]">tracks</p>
                </div>
            </div>
        </div>
    );
}
