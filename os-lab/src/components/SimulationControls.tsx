/**
 * SimulationControls.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand-connected playback and scrubber bar.
 * Reads all state from the store — zero prop drilling.
 *
 * Exposes:
 *   • Play / Pause / Reset buttons
 *   • Speed multiplier buttons (0.5×, 1×, 2×, 4×)
 *   • Timeline scrubber — works fully offline on buffered steps
 *   • WS connection status indicator with retry count
 */

"use client";

import { motion } from "framer-motion";
import {
    Play, Pause, RotateCcw, Wifi, WifiOff, Loader2, AlertCircle,
} from "lucide-react";
import {
    useSimulationStore,
    selectPlayback,
    selectConnectionStatus,
} from "@/lib/simulationStore";
import { useSimulation } from "@/hooks/useSimulation";
import { useShallow } from "zustand/react/shallow";

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    idle:       { label: "IDLE",        color: "text-[var(--text-muted)]",  icon: Wifi },
    connecting: { label: "CONNECTING",  color: "text-yellow-400",           icon: Loader2 },
    open:       { label: "LIVE",        color: "text-green-400",            icon: Wifi },
    closed:     { label: "CLOSED",      color: "text-[var(--text-muted)]",  icon: WifiOff },
    error:      { label: "ERROR",       color: "text-red-400",              icon: AlertCircle },
} as const;

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function SimulationControls() {
    const { wsStatus, wsError, retryCount } = useSimulationStore(useShallow(selectConnectionStatus));
    const {
        isPlaying,
        isScrubbing,
        isComplete,
        currentStepIndex,
        totalSteps,
        playbackSpeed,
    } = useSimulationStore(useShallow(selectPlayback));
    const finalMetrics = useSimulationStore((s) => s.finalMetrics);

    const { play, pause, reset, scrubTo, setSpeed } = useSimulation();

    const statusCfg = STATUS_CONFIG[wsStatus] ?? STATUS_CONFIG.idle;
    const StatusIcon = statusCfg.icon;

    const scrubberValue = totalSteps > 0 ? Math.max(0, currentStepIndex) : 0;
    const scrubberMax  = Math.max(0, totalSteps - 1);

    const hasStarted = wsStatus !== "idle" || totalSteps > 0;
    const canScrub   = totalSteps > 1;

    return (
        <div
            className="glass-card p-4 sm:p-5 flex flex-col gap-4"
            data-testid="simulation-controls"
        >
            {/* Header row */}
            <div className="flex items-center justify-between">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                    PLAYBACK CONTROLS
                </h2>

                {/* WS status pill */}
                <div className={`flex items-center gap-1.5 text-[10px] font-mono ${statusCfg.color}`}>
                    <StatusIcon
                        size={11}
                        className={wsStatus === "connecting" ? "animate-spin" : ""}
                    />
                    <span>{statusCfg.label}</span>
                    {wsStatus === "error" && retryCount > 0 && (
                        <span className="opacity-60">({retryCount}/5)</span>
                    )}
                </div>
            </div>

            {/* Error message */}
            {wsError && (
                <p className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {wsError}
                </p>
            )}

            {/* ── Scrubber ── */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)]">
                    <span>TIMELINE</span>
                    <span>
                        {currentStepIndex >= 0 ? currentStepIndex + 1 : 0} / {totalSteps}
                        {isComplete && <span className="ml-1 text-green-400">✓</span>}
                        {isScrubbing && <span className="ml-1 text-yellow-400">SCRUBBING</span>}
                    </span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={scrubberMax}
                    value={scrubberValue}
                    disabled={!canScrub}
                    onChange={(e) => scrubTo(Number(e.target.value))}
                    className="w-full accent-[var(--accent-blue)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Simulation timeline scrubber"
                    data-testid="timeline-scrubber"
                />
                {/* Tick marks for key positions */}
                {canScrub && (
                    <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)] px-0.5">
                        <span>0</span>
                        <span>{Math.floor(scrubberMax / 2)}</span>
                        <span>{scrubberMax}</span>
                    </div>
                )}
            </div>

            {/* ── Main buttons ── */}
            <div className="flex gap-2">
                {/* Play / Pause */}
                {!isPlaying ? (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={play}
                        disabled={isComplete && !hasStarted}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-xs font-bold bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 hover:bg-[var(--accent-blue)]/30 transition-all disabled:opacity-30"
                        data-testid="play-button"
                    >
                        <Play size={13} />
                        {isComplete ? "REPLAY" : hasStarted ? "RESUME" : "PLAY"}
                    </motion.button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={pause}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-xs font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/25 hover:bg-yellow-500/25 transition-all"
                        data-testid="pause-button"
                    >
                        <Pause size={13} />
                        PAUSE
                    </motion.button>
                )}

                {/* Reset */}
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={reset}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                    data-testid="reset-button"
                >
                    <RotateCcw size={13} />
                    RESET
                </motion.button>
            </div>

            {/* ── Speed selector ── */}
            <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                    Playback Speed
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                    {SPEED_OPTIONS.map((mult) => (
                        <button
                            key={mult}
                            onClick={() => setSpeed(mult)}
                            className={`py-1.5 rounded-lg font-mono text-[10px] border transition-all ${
                                playbackSpeed === mult
                                    ? "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border-[var(--accent-purple)]/40"
                                    : "bg-white/3 text-[var(--text-muted)] border-white/8 hover:border-white/15"
                            }`}
                            data-testid={`speed-${mult}x`}
                        >
                            {mult}×
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Final metrics ── */}
            {isComplete && finalMetrics && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5"
                    data-testid="final-metrics"
                >
                    {[
                        { label: "Seek", value: finalMetrics.total_seek_distance },
                        { label: "Requests", value: finalMetrics.request_count },
                        { label: "Avg/req", value: finalMetrics.average_seek_distance.toFixed(1) },
                    ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                            <p className="text-[8px] font-mono text-[var(--text-muted)] uppercase mb-0.5">{label}</p>
                            <p className="text-sm font-mono font-bold text-[var(--text-primary)]">{value}</p>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
