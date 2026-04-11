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
import { BarChart3 } from "lucide-react";
import type { CompareResponse } from "@/lib/compareTypes";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface OSComparisonChartProps {
    compareData: CompareResponse | null;
}

export function OSComparisonChart({ compareData }: OSComparisonChartProps) {
    const chartData = useMemo(() => {
        if (!compareData) return null;

        // Sort dynamically so FCFS, SSTF, SCAN appear consistently if present
        const sortedResults = [...compareData.results].sort((a, b) => {
            const order: Record<string, number> = { FCFS: 1, SSTF: 2, SCAN: 3, "C-SCAN": 4, LOOK: 5, "C-LOOK": 6 };
            return (order[a.algorithm] || 99) - (order[b.algorithm] || 99);
        });

        return {
            labels: ["Total Seek Time (tracks)"],
            datasets: sortedResults.map((res) => {
                let bgColor = "rgba(56,139,253,0.7)"; // Blue for FCFS
                let borderColor = "rgba(56,139,253,1)";
                
                if (res.algorithm === "SSTF") {
                    bgColor = "rgba(63,185,80,0.7)"; // Green for SSTF
                    borderColor = "rgba(63,185,80,1)";
                } else if (res.algorithm === "SCAN") {
                    bgColor = "rgba(188,140,255,0.7)"; // Purple for SCAN
                    borderColor = "rgba(188,140,255,1)";
                } else if (res.algorithm === "C-SCAN") {
                    bgColor = "rgba(210,105,30,0.7)"; // Chocolate orange for C-SCAN
                    borderColor = "rgba(210,105,30,1)";
                } else if (res.algorithm === "LOOK") {
                    bgColor = "rgba(255,215,0,0.7)"; // Gold/Yellow for LOOK
                    borderColor = "rgba(255,215,0,1)";
                } else if (res.algorithm === "C-LOOK") {
                    bgColor = "rgba(220,20,60,0.7)"; // Crimson red for C-LOOK
                    borderColor = "rgba(220,20,60,1)";
                }

                return {
                    label: res.algorithm,
                    data: [res.total_seek_time],
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                };
            }),
        };
    }, [compareData]);

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

    if (!compareData || !chartData) return null;

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-[var(--accent-blue)]" />
                <h3 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                    ALGORITHM COMPARISON GRAPH
                </h3>
            </div>
            
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wide mb-3">
                Total Seek Time Baseline (Lower is Better)
            </p>
            
            <div className="overflow-x-auto">
                <div className="min-w-[28rem]" style={{ height: 220 }}>
                    <Bar data={chartData} options={chartOptions as any} />
                </div>
            </div>
        </div>
    );
}
