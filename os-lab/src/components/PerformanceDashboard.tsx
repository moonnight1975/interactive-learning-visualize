"use client";

import { motion } from "framer-motion";
import {
    TrendingUp,
    Clock,
    Search,
    HardDrive,
    Zap,
    BarChart2,
    RotateCw,
    Gauge,
    AlertTriangle,
    Database,
} from "lucide-react";

interface MetricsProps {
    totalSeekTime: number;
    totalBlocks: number;
    completedBlocks: number;
    totalComparisons: number;
    executionMs: number;
    matchCount: number;
    isComplete: boolean;
    // NGILP extended timing metrics
    totalTimeMs?: number;
    avgAccessTimeMs?: number;
    avgRotationalLatencyMs?: number;
    avgThroughputMbps?: number;
    storageType?: string;
    rpm?: number;
    // Page fault metrics
    pageFaultCount?: number;
    pageHitCount?: number;
    pageFaultRate?: number;
    totalPageFaultPenaltyMs?: number;
}

function MetricCard({
    icon: Icon,
    label,
    value,
    unit,
    color,
    delay = 0,
    subtitle,
    highlight,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | number;
    unit?: string;
    color: string;
    delay?: number;
    subtitle?: string;
    highlight?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`metric-card ${highlight ? "animate-border-glow" : ""}`}
        >
            <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}
            >
                <span style={{ color }}>
                    <Icon size={16} />
                </span>
            </div>
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
                <motion.span
                    className="text-lg sm:text-xl font-bold font-mono"
                    style={{ color }}
                    key={String(value)}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                >
                    {value}
                </motion.span>
                {unit && <span className="text-[10px] sm:text-xs font-mono text-[var(--text-muted)]">{unit}</span>}
            </div>
            {subtitle && (
                <p className="text-[8px] font-mono text-[var(--text-muted)] mt-1 leading-tight">{subtitle}</p>
            )}
        </motion.div>
    );
}

export function PerformanceDashboard({
    totalSeekTime,
    totalBlocks,
    completedBlocks,
    totalComparisons,
    executionMs,
    matchCount,
    isComplete,
    totalTimeMs = 0,
    avgAccessTimeMs = 0,
    avgRotationalLatencyMs = 0,
    avgThroughputMbps = 0,
    storageType = "HDD",
    rpm = 7200,
    pageFaultCount = 0,
    pageHitCount = 0,
    pageFaultRate = 0,
    totalPageFaultPenaltyMs = 0,
}: MetricsProps) {
    const avgSeekPerBlock =
        completedBlocks > 0 ? (totalSeekTime / completedBlocks).toFixed(1) : "-";
    const progress = totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0;
    const hasTimingData = totalTimeMs > 0;
    const hasPageFaults = pageFaultCount > 0 || pageHitCount > 0;

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                    PERFORMANCE DASHBOARD
                </h2>
                <div className="flex items-center gap-2">
                    {storageType && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold ${
                            storageType === "SSD"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : storageType === "NVME"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                            {storageType} {storageType === "HDD" ? `${rpm} RPM` : ""}
                        </span>
                    )}
                    {isComplete && (
                        <span className="status-badge bg-green-500/10 text-green-400 border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            COMPLETE
                        </span>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[10px] font-mono text-[var(--text-muted)] mb-1.5">
                    <span>Progress: {completedBlocks}/{totalBlocks} blocks</span>
                    <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[rgba(56,139,253,0.1)] overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        style={{
                            background: "linear-gradient(90deg, #388bfd, #79c0ff, #3fb950)",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Metric cards — primary row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <MetricCard
                    icon={TrendingUp}
                    label="Total Seek Distance"
                    value={totalSeekTime}
                    unit="tracks"
                    color="#388bfd"
                    delay={0}
                />
                <MetricCard
                    icon={HardDrive}
                    label="Blocks Accessed"
                    value={completedBlocks}
                    unit={`/ ${totalBlocks}`}
                    color="#3fb950"
                    delay={0.05}
                />
                {totalComparisons > 0 ? (
                    <MetricCard
                        icon={Search}
                        label="Comparisons"
                        value={totalComparisons}
                        unit="ops"
                        color="#bc8cff"
                        delay={0.1}
                    />
                ) : (
                    <MetricCard
                        icon={BarChart2}
                        label="Avg Seek / Block"
                        value={avgSeekPerBlock}
                        unit="tracks"
                        color="#79c0ff"
                        delay={0.1}
                    />
                )}
            </div>

            {/* ── NGILP: Timing metrics row ─────────────────────────────────── */}
            {hasTimingData && (
                <>
                    <div className="mt-4 mb-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-[rgba(56,139,253,0.1)]" />
                        <span className="text-[9px] font-mono text-[var(--accent-cyan)] uppercase tracking-wider">
                            I/O Timing Analysis
                        </span>
                        <div className="h-px flex-1 bg-[rgba(56,139,253,0.1)]" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricCard
                            icon={Clock}
                            label="Total I/O Time"
                            value={totalTimeMs.toFixed(2)}
                            unit="ms"
                            color="#f79000"
                            delay={0.15}
                            subtitle="Seek + Rotation + Transfer"
                            highlight
                        />
                        <MetricCard
                            icon={RotateCw}
                            label="Avg Rotation Delay"
                            value={avgRotationalLatencyMs.toFixed(2)}
                            unit="ms"
                            color="#bc8cff"
                            delay={0.2}
                            subtitle={storageType === "HDD" ? `½ rev at ${rpm} RPM` : "N/A (solid state)"}
                        />
                        <MetricCard
                            icon={Gauge}
                            label="Avg Throughput"
                            value={avgThroughputMbps.toFixed(1)}
                            unit="MB/s"
                            color="#3fb950"
                            delay={0.25}
                        />
                        <MetricCard
                            icon={Zap}
                            label="Avg Access Time"
                            value={avgAccessTimeMs.toFixed(2)}
                            unit="ms"
                            color="#79c0ff"
                            delay={0.3}
                            subtitle="Per I/O operation"
                        />
                    </div>
                </>
            )}

            {/* ── Page Fault metrics ────────────────────────────────────────── */}
            {hasPageFaults && (
                <>
                    <div className="mt-4 mb-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-[rgba(255,68,68,0.1)]" />
                        <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
                            Virtual Memory — Page Faults
                        </span>
                        <div className="h-px flex-1 bg-[rgba(255,68,68,0.1)]" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricCard
                            icon={AlertTriangle}
                            label="Page Faults"
                            value={pageFaultCount}
                            unit="faults"
                            color="#ff4444"
                            delay={0.35}
                        />
                        <MetricCard
                            icon={Database}
                            label="Page Hits"
                            value={pageHitCount}
                            unit="hits"
                            color="#3fb950"
                            delay={0.4}
                        />
                        <MetricCard
                            icon={Gauge}
                            label="Fault Rate"
                            value={(pageFaultRate * 100).toFixed(1)}
                            unit="%"
                            color={pageFaultRate > 0.5 ? "#ff4444" : "#f79000"}
                            delay={0.45}
                        />
                        <MetricCard
                            icon={Clock}
                            label="Fault Penalty"
                            value={totalPageFaultPenaltyMs.toFixed(1)}
                            unit="ms"
                            color="#ff4444"
                            delay={0.5}
                            subtitle="Disk I/O for page loads"
                        />
                    </div>
                </>
            )}

            {/* ── Performance insight (if complete) ────────────────────────── */}
            {isComplete && hasTimingData && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 rounded-lg p-3 bg-[rgba(63,185,80,0.04)] border border-[rgba(63,185,80,0.15)]"
                >
                    <p className="text-[9px] font-mono text-green-400 uppercase mb-1 font-bold">
                        Performance Summary
                    </p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
                        Processed {totalBlocks} I/O requests in {totalTimeMs.toFixed(2)}ms 
                        total ({avgAccessTimeMs.toFixed(2)}ms avg per access).
                        {storageType === "HDD" 
                            ? ` Rotational latency at ${rpm} RPM accounts for ~${((avgRotationalLatencyMs / Math.max(avgAccessTimeMs, 0.01)) * 100).toFixed(0)}% of each access.`
                            : ` ${storageType} eliminates mechanical latency entirely.`
                        }
                        {hasPageFaults 
                            ? ` ${pageFaultCount} page faults added ${totalPageFaultPenaltyMs.toFixed(1)}ms overhead.`
                            : ""
                        }
                    </p>
                </motion.div>
            )}
        </div>
    );
}
