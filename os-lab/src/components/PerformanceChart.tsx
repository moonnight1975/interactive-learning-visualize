"use client";

import { useMemo } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { SimulationStep } from "@/lib/simulation";
import { BarChart2 } from "lucide-react";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface PerformanceChartProps {
    steps: SimulationStep[];
    currentStepIndex: number;
}

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: "rgba(125,133,144,0.8)",
                font: { family: "'JetBrains Mono', monospace", size: 10 },
                boxWidth: 12,
                padding: 16,
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
        },
    },
    scales: {
        x: {
            grid: { color: "rgba(56,139,253,0.06)" },
            ticks: {
                color: "rgba(125,133,144,0.7)",
                font: { family: "'JetBrains Mono', monospace", size: 9 },
            },
        },
        y: {
            grid: { color: "rgba(56,139,253,0.06)" },
            ticks: {
                color: "rgba(125,133,144,0.7)",
                font: { family: "'JetBrains Mono', monospace", size: 9 },
            },
        },
    },
};

export function PerformanceChart({ steps, currentStepIndex }: PerformanceChartProps) {
    const visibleSteps = steps.slice(0, currentStepIndex + 1);

    const seekData = useMemo(() => ({
        labels: visibleSteps.map((s, i) => `#${i + 1} T${s.currentTrack}`),
        datasets: [
            {
                label: "Seek Distance",
                data: visibleSteps.map((s) => s.seekDistance),
                borderColor: "rgba(56,139,253,0.9)",
                backgroundColor: "rgba(56,139,253,0.1)",
                fill: true,
                tension: 0.3,
                pointBackgroundColor: "rgba(56,139,253,1)",
                pointRadius: 4,
                pointHoverRadius: 6,
            },
            {
                label: "Cumulative Seek",
                data: visibleSteps.map((s) => s.cumulativeSeekTime),
                borderColor: "rgba(188,140,255,0.8)",
                backgroundColor: "rgba(188,140,255,0.05)",
                fill: false,
                tension: 0.3,
                borderDash: [4, 4],
                pointBackgroundColor: "rgba(188,140,255,1)",
                pointRadius: 3,
                pointHoverRadius: 5,
            },
        ],
    }), [visibleSteps]);

    const compareData = useMemo(() => ({
        labels: visibleSteps.map((s, i) => `#${i + 1} T${s.currentTrack}`),
        datasets: [
            {
                label: "Naive Comparisons",
                data: visibleSteps.map((s) => s.matchResult?.comparisons ?? 0),
                backgroundColor: "rgba(56,139,253,0.6)",
                borderColor: "rgba(56,139,253,1)",
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: "KMP Comparisons",
                data: visibleSteps.map((s) => s.matchResult?.comparisons ?? 0),
                backgroundColor: "rgba(188,140,255,0.6)",
                borderColor: "rgba(188,140,255,1)",
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    }), [visibleSteps]);

    if (visibleSteps.length === 0) {
        return (
        <div className="glass-card p-4 sm:p-5 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
                <BarChart2 size={32} className="text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-xs font-mono text-[var(--text-muted)]">Charts appear after simulation starts</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-4 sm:p-5 space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <BarChart2 size={14} className="text-[var(--accent-blue)]" />
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                    PERFORMANCE ANALYTICS
                </h2>
            </div>

            {/* Seek time chart */}
            <div>
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    Seek Distance per Request
                </p>
                <div className="overflow-x-auto pb-1">
                    <div className="min-w-[32rem]" style={{ height: 160 }}>
                        <Line data={seekData} options={chartDefaults as Parameters<typeof Line>[0]["options"]} />
                    </div>
                </div>
            </div>

            {/* Comparisons chart */}
            <div>
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide mb-3">
                    String Comparisons per Block
                </p>
                <div className="overflow-x-auto pb-1">
                    <div className="min-w-[32rem]" style={{ height: 140 }}>
                        <Bar data={compareData} options={chartDefaults as Parameters<typeof Bar>[0]["options"]} />
                    </div>
                </div>
            </div>
        </div>
    );
}
