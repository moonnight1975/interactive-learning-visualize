"use client";

import { motion } from "framer-motion";
import {
    BarChart3,
    Cpu,
    Gauge,
    HardDrive,
    Loader2,
    Sparkles,
    Timer,
    TrendingUp,
} from "lucide-react";
import type { CompareResponse, StorageCompareResponse, AlgorithmComparisonResult } from "@/lib/compareTypes";
import type { OSAlgorithm, StorageType } from "@/lib/simulationStore";
import { OSComparisonChart } from "@/components/OSComparisonChart";

interface OptimizationProfilerProps {
    requestCount: number;
    selectedAlgorithm: OSAlgorithm;
    storageType: StorageType;
    rpm: number;
    compareData: CompareResponse | null;
    compareLoading: boolean;
    compareError: string | null;
    storageData: StorageCompareResponse | null;
    storageLoading: boolean;
    storageError: string | null;
    onRunAlgorithmProfile: () => void;
    onRunStorageBenchmark: () => void;
}

function formatMs(value: number) {
    return `${value.toFixed(2)} ms`;
}

function formatThroughput(value: number) {
    return `${value.toFixed(1)} MB/s`;
}

function ResultStat({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-lg border border-white/8 bg-white/4 px-3 py-2">
            <p className="text-[8px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                {label}
            </p>
            <p className="mt-1 text-[11px] font-mono font-semibold text-[var(--text-primary)]">
                {value}
            </p>
        </div>
    );
}

function AlgorithmCard({
    result,
}: {
    result: AlgorithmComparisonResult;
}) {
    const accentClass = result.is_winner
        ? "border-green-500/30 bg-green-500/8"
        : "border-white/8 bg-white/3";

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 ${accentClass}`}
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                        Algorithm
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                        {result.algorithm}
                    </h3>
                </div>
                <span
                    className={`rounded-md px-2 py-1 text-[9px] font-mono font-bold ${
                        result.is_winner
                            ? "border border-green-500/30 bg-green-500/12 text-green-300"
                            : "border border-white/10 bg-white/5 text-[var(--text-muted)]"
                    }`}
                >
                    {result.is_winner ? "BEST FIT" : `${result.performance_delta_pct.toFixed(1)}% OFF WORST`}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <ResultStat label="Total Seek" value={`${result.total_seek_time} tracks`} />
                <ResultStat label="Avg Seek" value={`${result.avg_seek_per_op.toFixed(1)} / op`} />
                <ResultStat label="Total Time" value={formatMs(result.total_time_ms)} />
                <ResultStat label="Throughput" value={formatThroughput(result.avg_throughput_mbps)} />
            </div>
        </motion.div>
    );
}

export function OptimizationProfiler({
    requestCount,
    selectedAlgorithm,
    storageType,
    rpm,
    compareData,
    compareLoading,
    compareError,
    storageData,
    storageLoading,
    storageError,
    onRunAlgorithmProfile,
    onRunStorageBenchmark,
}: OptimizationProfilerProps) {
    const sortedCompareResults = compareData
        ? [...compareData.results].sort((left, right) => {
              if (left.is_winner === right.is_winner) {
                  return left.total_seek_time - right.total_seek_time;
              }
              return left.is_winner ? -1 : 1;
          })
        : [];
    const topPerformanceDelta = sortedCompareResults[0]?.performance_delta_pct ?? 0;

    const storageCards = storageData
        ? [
              {
                  label: `HDD ${rpm} RPM`,
                  result: storageData.hdd,
                  badge: "Mechanical",
                  badgeClass: "border-blue-500/25 bg-blue-500/10 text-blue-300",
              },
              {
                  label: "SSD",
                  result: storageData.ssd,
                  badge: `${storageData.speedup_ssd_over_hdd.toFixed(1)}x faster`,
                  badgeClass: "border-green-500/25 bg-green-500/10 text-green-300",
              },
              {
                  label: "NVMe",
                  result: storageData.nvme,
                  badge: `${storageData.speedup_nvme_over_hdd.toFixed(1)}x faster`,
                  badgeClass: "border-purple-500/25 bg-purple-500/10 text-purple-300",
              },
          ]
        : [];

    return (
        <div className="glass-card p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide text-[var(--text-primary)]">
                        <Sparkles size={14} className="text-[var(--accent-orange)]" />
                        OPTIMIZATION PROFILER
                    </h2>
                    <p className="mt-1 text-[10px] font-mono leading-relaxed text-[var(--text-muted)]">
                        Turn the current workload into a benchmark lab: compare scheduling strategies,
                        quantify deltas, and surface why storage media changes the outcome.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-mono text-[var(--text-muted)]">
                        {requestCount} requests
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-mono text-[var(--text-muted)]">
                        {storageType === "HDD" ? `HDD @ ${rpm} RPM` : storageType}
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-mono text-[var(--text-muted)]">
                        Focus: {selectedAlgorithm}
                    </span>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <button
                    onClick={onRunAlgorithmProfile}
                    disabled={compareLoading || storageLoading || requestCount === 0}
                    className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 font-mono text-[11px] font-bold text-cyan-300 transition-all hover:bg-cyan-500/16 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {compareLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                    PROFILE ALL ALGORITHMS
                </button>
                <button
                    onClick={onRunStorageBenchmark}
                    disabled={compareLoading || storageLoading || requestCount === 0}
                    className="flex items-center justify-center gap-2 rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3 font-mono text-[11px] font-bold text-green-300 transition-all hover:bg-green-500/16 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {storageLoading ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
                    BENCHMARK HDD / SSD / NVME
                </button>
            </div>

            {(compareError || storageError) && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-[10px] font-mono text-red-300">
                    {compareError && <p>Algorithm profiler: {compareError}</p>}
                    {storageError && <p>Storage benchmark: {storageError}</p>}
                </div>
            )}

            {!compareData && !storageData && !compareLoading && !storageLoading && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/3 px-4 py-5 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                        No benchmark run yet
                    </p>
                    <p className="mt-2 text-[11px] font-mono leading-relaxed text-[var(--text-secondary)]">
                        Use the current workload to quantify scheduling efficiency and compare mechanical
                        versus solid-state access behavior.
                    </p>
                </div>
            )}

            {compareData && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-[var(--accent-cyan)]" />
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent-cyan)]">
                            Algorithm Profile
                        </p>
                    </div>

                    <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/6 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[9px] font-mono uppercase tracking-wider text-cyan-300">
                                    Winning Strategy
                                </p>
                                <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                                    {compareData.winner}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/8 px-3 py-2 text-[10px] font-mono text-green-300">
                                <TrendingUp size={13} />
                                {topPerformanceDelta.toFixed(1)}% better than worst case
                            </div>
                        </div>
                        <p className="mt-3 text-[11px] font-mono leading-relaxed text-[var(--text-secondary)]">
                            {compareData.performance_summary}
                        </p>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                        {sortedCompareResults.map((result) => (
                            <AlgorithmCard key={result.algorithm} result={result} />
                        ))}
                    </div>
                    
                    <OSComparisonChart compareData={compareData} />
                </section>
            )}

            {storageData && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-[var(--accent-green)]" />
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent-green)]">
                            Storage Benchmark
                        </p>
                    </div>

                    <div className="rounded-xl border border-green-500/15 bg-green-500/6 p-4">
                        <p className="text-[9px] font-mono uppercase tracking-wider text-green-300">
                            Why This Workload Behaves Differently
                        </p>
                        <p className="mt-2 text-[11px] font-mono leading-relaxed text-[var(--text-secondary)]">
                            {storageData.summary}
                        </p>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                        {storageCards.map((card) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-white/8 bg-white/3 p-4"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                                            Storage Class
                                        </p>
                                        <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                                            {card.label}
                                        </h3>
                                    </div>
                                    <span className={`rounded-md border px-2 py-1 text-[9px] font-mono font-bold ${card.badgeClass}`}>
                                        {card.badge}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <ResultStat label="Total Time" value={formatMs(card.result.total_time_ms)} />
                                    <ResultStat label="Avg Access" value={formatMs(card.result.avg_access_time_ms)} />
                                    <ResultStat label="Throughput" value={formatThroughput(card.result.avg_throughput_mbps)} />
                                    <ResultStat label="Seek Total" value={`${card.result.total_seek_time} tracks`} />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="rounded-xl border border-purple-500/15 bg-purple-500/6 p-4">
                        <div className="flex items-center gap-2">
                            <Timer size={13} className="text-purple-300" />
                            <p className="text-[9px] font-mono uppercase tracking-wider text-purple-300">
                                Architectural Takeaway
                            </p>
                        </div>
                        <p className="mt-2 text-[11px] font-mono leading-relaxed text-[var(--text-secondary)]">
                            HDD performance is dominated by head travel and rotational wait. SSD and NVMe collapse
                            that mechanical overhead, so the same workload becomes a controller-and-throughput problem
                            instead of a physics problem.
                        </p>
                    </div>
                </section>
            )}

            {(compareLoading || storageLoading) && (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-[10px] font-mono text-[var(--text-muted)]">
                    <Loader2 size={13} className="animate-spin" />
                    Running benchmark against the FastAPI engine...
                </div>
            )}

            {(compareData || storageData) && (
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                            Current Storage Mode
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-mono font-semibold text-[var(--text-primary)]">
                            <HardDrive size={13} className="text-[var(--accent-blue)]" />
                            {storageType === "HDD" ? `HDD @ ${rpm} RPM` : storageType}
                        </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                            Active Benchmark Focus
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-mono font-semibold text-[var(--text-primary)]">
                            <Cpu size={13} className="text-[var(--accent-cyan)]" />
                            {selectedAlgorithm}
                        </p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                            Current Workload Size
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-mono font-semibold text-[var(--text-primary)]">
                            <Gauge size={13} className="text-[var(--accent-green)]" />
                            {requestCount} queued I/O requests
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
