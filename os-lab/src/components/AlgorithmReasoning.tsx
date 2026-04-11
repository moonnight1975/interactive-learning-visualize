/**
 * AlgorithmReasoning.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Side-panel that displays the algorithm's plain-English reasoning for the 
 * current simulation step, read directly from the Zustand store.
 *
 * PURE RENDER — no props needed. Reads from Zustand selectors.
 * Fully testable: wrap in a store-provider and assert text content.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useSimulationStore, selectCurrentStep, selectPlayback } from "@/lib/simulationStore";

// ─── Component ────────────────────────────────────────────────────────────────

export function AlgorithmReasoning() {
    const currentStep = useSimulationStore(selectCurrentStep);
    const { currentStepIndex, totalSteps, isComplete } = useSimulationStore(useShallow(selectPlayback));
    const algorithm = useSimulationStore((s) => s.algorithm);
    const steps = useSimulationStore((s) => s.steps);

    // Build a chronological history of the last N reasons
    const historyWindow = 5;
    const historyStart = Math.max(0, currentStepIndex - historyWindow + 1);
    const historySteps = steps.slice(historyStart, currentStepIndex + 1);

    return (
        <div
            className="glass-card p-4 sm:p-5 flex flex-col gap-4"
            data-testid="algorithm-reasoning-panel"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <Brain size={14} className="text-[var(--accent-purple)]" />
                    ALGORITHM REASONING
                </h2>
                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-full">
                    {algorithm}
                </span>
            </div>

            {/* Progress indicator */}
            {totalSteps > 0 && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-full"
                            animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                    <span className="shrink-0">
                        {currentStepIndex + 1} / {totalSteps}
                        {isComplete && " ✓"}
                    </span>
                </div>
            )}

            {/* Main reasoning display */}
            <AnimatePresence mode="wait">
                {currentStep ? (
                    <motion.div
                        key={currentStep.step_index}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col gap-3"
                        data-testid="current-reasoning"
                    >
                        {/* Step badge */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                                Step {currentStep.step_index}
                            </span>
                            <ChevronRight size={10} className="text-[var(--text-muted)]" />
                            <span className="text-[10px] font-mono text-[var(--accent-orange)]">
                                Track {currentStep.head_position}
                            </span>
                        </div>

                        {/* Decision reason — the core pedagogical display */}
                        <div
                            className="p-3 rounded-lg border border-[var(--accent-purple)]/20 bg-[var(--accent-purple)]/5"
                            data-testid="decision-reason"
                        >
                            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                                {currentStep.algorithm_decision_reason}
                            </p>
                        </div>

                        {/* Quick stats for the step */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/3 rounded-lg p-2.5 border border-white/5">
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">Seek This Step</p>
                                <p className="text-base font-mono font-bold text-[var(--accent-cyan)]">
                                    {currentStep.seek_distance_this_step}
                                    <span className="text-[9px] font-normal text-[var(--text-muted)] ml-1">tracks</span>
                                </p>
                            </div>
                            <div className="bg-white/3 rounded-lg p-2.5 border border-white/5">
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">Cumulative</p>
                                <p className="text-base font-mono font-bold text-[var(--accent-orange)]">
                                    {currentStep.cumulative_seek}
                                    <span className="text-[9px] font-normal text-[var(--text-muted)] ml-1">tracks</span>
                                </p>
                            </div>
                        </div>

                        {/* Queue state */}
                        {currentStep.queue_state.length > 0 && (
                            <div>
                                <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1.5 tracking-wider">
                                    Pending Queue ({currentStep.queue_state.length})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {currentStep.queue_state.slice(0, 12).map((track, i) => (
                                        <span
                                            key={i}
                                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 text-[var(--accent-blue)]"
                                        >
                                            {track}
                                        </span>
                                    ))}
                                    {currentStep.queue_state.length > 12 && (
                                        <span className="text-[10px] font-mono text-[var(--text-muted)] px-1">
                                            +{currentStep.queue_state.length - 12} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-8 text-center gap-3"
                        data-testid="idle-state"
                    >
                        <Brain size={28} className="text-white/10" />
                        <p className="text-[11px] font-mono text-[var(--text-muted)]">
                            Start the simulation to see<br />step-by-step reasoning.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* History feed — last 5 decisions */}
            {historySteps.length > 1 && (
                <div className="border-t border-white/5 pt-3">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Recent Decisions
                    </p>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {[...historySteps].reverse().slice(1).map((step) => (
                            <div
                                key={step.step_index}
                                className="flex items-start gap-2 text-[10px] font-mono opacity-50 hover:opacity-80 transition-opacity"
                            >
                                <span className="shrink-0 text-[var(--accent-orange)] mt-0.5">
                                    #{step.step_index}
                                </span>
                                <span className="text-[var(--text-muted)] leading-relaxed line-clamp-2">
                                    {step.algorithm_decision_reason}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completion badge */}
            <AnimatePresence>
                {isComplete && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center"
                        data-testid="completion-badge"
                    >
                        <p className="text-xs font-mono text-green-400">
                            ✓ Simulation complete — all {totalSteps} requests served
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
