"use client";

import { motion } from "framer-motion";
import { TrendingUp, Clock, Search, HardDrive, Zap, BarChart2 } from "lucide-react";

interface MetricsProps {
    totalSeekTime: number;
    totalBlocks: number;
    completedBlocks: number;
    totalComparisons: number;
    executionMs: number;
    matchCount: number;
    isComplete: boolean;
}

function MetricCard({
    icon: Icon,
    label,
    value,
    unit,
    color,
    delay = 0,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | number;
    unit?: string;
    color: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="metric-card"
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
}: MetricsProps) {
    const avgSeekPerBlock =
        completedBlocks > 0 ? (totalSeekTime / completedBlocks).toFixed(1) : "-";
    const progress = totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0;

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                    PERFORMANCE DASHBOARD
                </h2>
                {isComplete && (
                    <span className="status-badge bg-green-500/10 text-green-400 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        COMPLETE
                    </span>
                )}
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

            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <MetricCard
                    icon={TrendingUp}
                    label="Total Seek Time"
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
                <MetricCard
                    icon={Search}
                    label="Comparisons"
                    value={totalComparisons}
                    unit="ops"
                    color="#bc8cff"
                    delay={0.1}
                />
                <MetricCard
                    icon={BarChart2}
                    label="Avg Seek / Block"
                    value={avgSeekPerBlock}
                    unit="tracks"
                    color="#79c0ff"
                    delay={0.15}
                />
                <MetricCard
                    icon={Zap}
                    label="Pattern Hits"
                    value={matchCount}
                    unit="hits"
                    color="#f79000"
                    delay={0.2}
                />
                <MetricCard
                    icon={Clock}
                    label="Exec Time"
                    value={executionMs > 0 ? executionMs.toFixed(2) : "-"}
                    unit="ms"
                    color="#f0e68c"
                    delay={0.25}
                />
            </div>
        </div>
    );
}
