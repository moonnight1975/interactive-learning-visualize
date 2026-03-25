"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SimulationStep } from "@/lib/simulation";
import { CheckCircle, Clock, Loader2, Circle } from "lucide-react";

interface RequestQueueProps {
    steps: SimulationStep[];
    currentStepIndex: number;
    initialHead: number;
}

export function RequestQueue({ steps, currentStepIndex, initialHead }: RequestQueueProps) {
    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-orange)]" />
                    I/O REQUEST QUEUE
                </h2>
                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[rgba(56,139,253,0.06)] px-2 py-0.5 rounded border border-[rgba(56,139,253,0.1)]">
                    FCFS ORDER
                </span>
            </div>

            {/* Head origin */}
            <div className="flex flex-wrap items-start sm:items-center gap-3 mb-2 p-2.5 rounded-lg bg-[rgba(247,144,0,0.06)] border border-[rgba(247,144,0,0.15)]">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[9px] font-mono font-bold text-orange-400">
                    H
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Initial Head</p>
                    <p className="text-sm font-mono font-bold text-[var(--accent-orange)]">Track {initialHead}</p>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Origin</span>
            </div>

            {/* Request list */}
            <div className="space-y-1.5 max-h-[300px] sm:max-h-[340px] overflow-y-auto pr-1 terminal-scroll">
                <AnimatePresence>
                    {steps.map((step, idx) => {
                        const status =
                            idx < currentStepIndex
                                ? "done"
                                : idx === currentStepIndex
                                    ? "processing"
                                    : "pending";

                        return (
                            <motion.div
                                key={step.request.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className={`queue-item ${status}`}
                            >
                                {/* Status icon */}
                                <div className="flex-shrink-0">
                                    {status === "done" ? (
                                        <CheckCircle size={14} className="text-green-400" />
                                    ) : status === "processing" ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Loader2 size={14} className="text-orange-400" />
                                        </motion.div>
                                    ) : (
                                        <Circle size={14} className="text-[var(--text-muted)]" />
                                    )}
                                </div>

                                {/* Queue position */}
                                <span className="w-5 text-center text-[10px] font-mono text-[var(--text-muted)]">
                                    {idx + 1}
                                </span>

                                {/* Track number */}
                                <div className="min-w-0 flex-1">
                                    <span className="font-mono font-bold text-sm">
                                        Track <span className={
                                            status === "done" ? "text-green-400" :
                                                status === "processing" ? "text-orange-400" :
                                                    "text-[var(--text-secondary)]"
                                        }>{step.currentTrack}</span>
                                    </span>
                                </div>

                                {/* Seek distance */}
                                {status !== "pending" && (
                                    <div className="ml-auto flex items-center gap-1">
                                        <Clock size={10} className="text-[var(--text-muted)]" />
                                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                            +{step.seekDistance}
                                        </span>
                                    </div>
                                )}

                                {/* Match indicator */}
                                {status === "done" && step.matchResult && (
                                    <span
                                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${step.matchResult.found
                                                ? "bg-green-500/15 text-green-400 border border-green-500/20"
                                                : "bg-[rgba(56,139,253,0.06)] text-[var(--text-muted)] border border-[rgba(56,139,253,0.1)]"
                                            }`}
                                    >
                                        {step.matchResult.found ? `${step.matchResult.matches.length} HIT${step.matchResult.matches.length === 1 ? "" : "S"}` : "NONE"}
                                    </span>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {steps.length === 0 && (
                <div className="py-8 text-center">
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                        Configure parameters and start simulation
                    </p>
                </div>
            )}
        </div>
    );
}
