"use client";

import { useMemo } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { motion } from "framer-motion";
import { TrendingDown, Award, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";
import { DualSimResult } from "@/lib/simulation";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ComparisonResultsProps {
    dual: DualSimResult;
    isComplete: boolean;
    fcfsStep: number;
    sstfStep: number;
    totalSteps: number;
}

export function ComparisonResults({
    dual,
    isComplete,
    fcfsStep,
    sstfStep,
    totalSteps,
}: ComparisonResultsProps) {
    const { fcfsTotal, sstfTotal, improvement, winner } = dual;

    const chartData = useMemo(
        () => ({
            labels: ["Total Seek Time (tracks)"],
            datasets: [
                {
                    label: "FCFS",
                    data: [fcfsTotal],
                    backgroundColor: "rgba(56,139,253,0.7)",
                    borderColor: "rgba(56,139,253,1)",
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: "SSTF",
                    data: [sstfTotal],
                    backgroundColor: "rgba(63,185,80,0.7)",
                    borderColor: "rgba(63,185,80,1)",
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                },
            ],
        }),
        [fcfsTotal, sstfTotal]
    );

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: "rgba(125,133,144,0.9)",
                    font: { family: "'JetBrains Mono', monospace", size: 11 },
                    boxWidth: 14,
                },
            },
            tooltip: {
                backgroundColor: "rgba(13,21,38,0.95)",
                borderColor: "rgba(56,139,253,0.3)",
                borderWidth: 1,
                titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 10 },
                titleColor: "#79c0ff",
                bodyColor: "#7d8590",
                callbacks: {
                    label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
                        ` ${ctx.dataset.label}: ${ctx.parsed.y} tracks`,
                },
            },
        },
        scales: {
            x: {
                grid: { color: "rgba(56,139,253,0.06)" },
                ticks: { color: "rgba(125,133,144,0.7)", font: { family: "'JetBrains Mono', monospace", size: 10 } },
            },
            y: {
                grid: { color: "rgba(56,139,253,0.06)" },
                ticks: { color: "rgba(125,133,144,0.7)", font: { family: "'JetBrains Mono', monospace", size: 10 } },
                beginAtZero: true,
            },
        },
    };

    const improvementPositive = improvement > 0;
    const improvementColor = improvementPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]";
    const improvementBg = improvementPositive
        ? "bg-[rgba(63,185,80,0.06)] border-[rgba(63,185,80,0.2)]"
        : "bg-[rgba(255,68,68,0.06)] border-[rgba(255,68,68,0.2)]";

    return (
        <div className="space-y-4">
            {/* ── Improvement Banner ─────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-xl border p-4 ${improvementBg}`}
            >
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${improvementPositive ? "bg-green-500/15" : "bg-red-500/15"
                                }`}
                        >
                            <TrendingDown size={20} className={improvementColor} />
                        </div>
                        <div>
                            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                                SSTF vs FCFS Improvement
                            </p>
                            <p className={`text-2xl font-bold font-mono ${improvementColor}`}>
                                {improvement >= 0 ? "+" : ""}
                                {improvement.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:gap-4">
                        <div className="text-center">
                            <p className="text-[9px] font-mono text-[var(--text-muted)]">FCFS</p>
                            <p className="font-mono font-bold text-[var(--accent-blue)]">{fcfsTotal}</p>
                            <p className="text-[8px] font-mono text-[var(--text-muted)]">tracks</p>
                        </div>
                        <div className="text-center text-[var(--text-muted)] self-center font-mono text-lg">→</div>
                        <div className="text-center">
                            <p className="text-[9px] font-mono text-[var(--text-muted)]">SSTF</p>
                            <p className="font-mono font-bold text-[var(--accent-green)]">{sstfTotal}</p>
                            <p className="text-[8px] font-mono text-[var(--text-muted)]">tracks</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-mono text-[var(--text-muted)]">SAVED</p>
                            <p className={`font-mono font-bold ${improvementColor}`}>
                                {Math.abs(fcfsTotal - sstfTotal)}
                            </p>
                            <p className="text-[8px] font-mono text-[var(--text-muted)]">tracks</p>
                        </div>
                    </div>

                    <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-xs border ${winner === "sstf"
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : winner === "fcfs"
                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                            }`}
                    >
                        <Award size={13} />
                        {winner === "sstf" ? "SSTF WINS" : winner === "fcfs" ? "FCFS WINS" : "TIE"}
                    </div>
                </div>

                {/* Progress bar comparison */}
                {fcfsTotal > 0 && (
                    <div className="mt-4 space-y-2">
                        <div>
                            <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1">
                                <span>FCFS</span><span>{fcfsTotal} tracks</span>
                            </div>
                            <div className="h-2 rounded bg-[rgba(56,139,253,0.1)]">
                                <motion.div
                                    className="h-full rounded bg-[var(--accent-blue)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.6 }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1">
                                <span>SSTF</span><span>{sstfTotal} tracks</span>
                            </div>
                            <div className="h-2 rounded bg-[rgba(63,185,80,0.1)]">
                                <motion.div
                                    className="h-full rounded bg-[var(--accent-green)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(sstfTotal / fcfsTotal) * 100}%` }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* ── Comparison Table ──────────────────────────────────────── */}
            <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[rgba(56,139,253,0.1)] flex items-center gap-2">
                    <BarChart3 size={13} className="text-[var(--accent-blue)]" />
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)] tracking-wide">
                        PERFORMANCE COMPARISON TABLE
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[38rem] text-xs font-mono">
                        <thead>
                            <tr className="border-b border-[rgba(56,139,253,0.08)]">
                                <th className="text-left px-4 py-2.5 text-[var(--text-muted)] font-normal">Metric</th>
                                <th className="text-center px-4 py-2.5 text-[var(--accent-blue)] font-bold">FCFS</th>
                                <th className="text-center px-4 py-2.5 text-[var(--accent-green)] font-bold">SSTF</th>
                                <th className="text-center px-4 py-2.5 text-[var(--text-muted)] font-normal">Δ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                {
                                    label: "Total Seek Time",
                                    fcfs: `${dual.fcfsTotal} tracks`,
                                    sstf: `${dual.sstfTotal} tracks`,
                                    delta: `${Math.abs(dual.fcfsTotal - dual.sstfTotal)} saved`,
                                    positive: dual.sstfTotal < dual.fcfsTotal,
                                },
                                {
                                    label: "Requests Processed",
                                    fcfs: dual.fcfs.steps.length,
                                    sstf: dual.sstf.steps.length,
                                    delta: "—",
                                    positive: null,
                                },
                                {
                                    label: "Avg Seek / Block",
                                    fcfs: dual.fcfs.steps.length > 0
                                        ? (dual.fcfsTotal / dual.fcfs.steps.length).toFixed(1)
                                        : "—",
                                    sstf: dual.sstf.steps.length > 0
                                        ? (dual.sstfTotal / dual.sstf.steps.length).toFixed(1)
                                        : "—",
                                    delta: dual.fcfs.steps.length > 0 && dual.sstf.steps.length > 0
                                        ? `${Math.abs(
                                            dual.fcfsTotal / dual.fcfs.steps.length -
                                            dual.sstfTotal / dual.sstf.steps.length
                                        ).toFixed(1)} diff`
                                        : "—",
                                    positive: dual.sstfTotal < dual.fcfsTotal,
                                },
                                {
                                    label: "Improvement",
                                    fcfs: "baseline",
                                    sstf: `${improvement >= 0 ? "+" : ""}${improvement.toFixed(1)}%`,
                                    delta: improvement >= 0 ? "✓ Better" : "✗ Worse",
                                    positive: improvement > 0,
                                },
                            ].map((row, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-[rgba(56,139,253,0.05)] hover:bg-[rgba(56,139,253,0.03)] transition-colors"
                                >
                                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.label}</td>
                                    <td className="px-4 py-2.5 text-center text-[var(--accent-blue)]">{row.fcfs}</td>
                                    <td className="px-4 py-2.5 text-center text-[var(--accent-green)]">{row.sstf}</td>
                                    <td
                                        className={`px-4 py-2.5 text-center ${row.positive === true
                                                ? "text-green-400"
                                                : row.positive === false
                                                    ? "text-red-400"
                                                    : "text-[var(--text-muted)]"
                                            }`}
                                    >
                                        {row.delta}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Bar Chart ────────────────────────────────────────────── */}
            <div className="glass-card p-4">
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    Total Seek Time — FCFS vs SSTF
                </p>
                <div className="overflow-x-auto">
                    <div className="min-w-[28rem]" style={{ height: 180 }}>
                        <Bar data={chartData} options={chartOptions as Parameters<typeof Bar>[0]["options"]} />
                    </div>
                </div>
            </div>

            {/* ── Educational Insight Panel ─────────────────────────── */}
            <div className="glass-card p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Lightbulb size={14} className="text-[var(--accent-yellow)]" />
                    <h3 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                        EDUCATIONAL INSIGHTS
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Why SSTF wins */}
                    <div className="rounded-lg p-3 bg-[rgba(63,185,80,0.05)] border border-[rgba(63,185,80,0.15)]">
                        <div className="flex items-center gap-1.5 mb-2">
                            <TrendingDown size={11} className="text-green-400" />
                            <span className="text-[10px] font-mono font-bold text-green-400 uppercase">
                                Why SSTF Reduces Seek Time
                            </span>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] leading-4">
                            SSTF always picks the nearest pending track, minimizing each individual movement.
                            This greedy selection eliminates unnecessary long-distance jumps that FCFS makes
                            when processing requests in arrival order regardless of position.
                        </p>
                    </div>

                    {/* When SSTF wins */}
                    <div className="rounded-lg p-3 bg-[rgba(56,139,253,0.05)] border border-[rgba(56,139,253,0.15)]">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Award size={11} className="text-[var(--accent-blue)]" />
                            <span className="text-[10px] font-mono font-bold text-[var(--accent-blue)] uppercase">
                                When SSTF Performs Better
                            </span>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] leading-4">
                            SSTF excels when requests are spatially clustered and arrive in an order that
                            causes FCFS to zigzag across the disk. The gain is most dramatic when the
                            request set has high seek variance (like this simulation).
                        </p>
                    </div>

                    {/* SSTF starvation warning */}
                    <div className="rounded-lg p-3 bg-[rgba(255,68,68,0.05)] border border-[rgba(255,68,68,0.15)]">
                        <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle size={11} className="text-red-400" />
                            <span className="text-[10px] font-mono font-bold text-red-400 uppercase">
                                SSTF Limitation: Starvation
                            </span>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] leading-4">
                            SSTF can cause <span className="text-red-400 font-bold">indefinite postponement</span>.
                            Requests far from the current cluster keep getting skipped as closer requests
                            continuously arrive, potentially starving distant tracks. SCAN/C-SCAN algorithms
                            fix this with bounded wait time.
                        </p>
                    </div>
                </div>

                {/* Formula */}
                <div className="rounded-lg p-3 bg-[rgba(240,230,140,0.04)] border border-[rgba(240,230,140,0.12)]">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">Improvement Formula</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-[var(--text-secondary)]">Improvement%</span>
                        <span className="font-mono text-[var(--text-muted)]">=</span>
                        <span className="font-mono text-xs bg-[rgba(240,230,140,0.08)] px-2 py-0.5 rounded border border-[rgba(240,230,140,0.15)] text-[var(--accent-yellow)]">
                            ( FCFS − SSTF ) ÷ FCFS × 100
                        </span>
                        <span className="font-mono text-[var(--text-muted)]">=</span>
                        <span className={`font-mono text-sm font-bold ${improvementColor}`}>
                            ( {fcfsTotal} − {sstfTotal} ) ÷ {fcfsTotal} × 100 = {improvement.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
