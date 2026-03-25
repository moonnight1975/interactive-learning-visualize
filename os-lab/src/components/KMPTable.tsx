"use client";

import { motion } from "framer-motion";
import { buildKMPTable } from "@/lib/simulation";

interface KMPTableProps {
    pattern: string;
}

export function KMPTable({ pattern }: KMPTableProps) {
    if (!pattern || pattern.length === 0) {
        return (
            <div className="glass-card p-4 sm:p-5">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-yellow)]" />
                    KMP FAILURE FUNCTION (LPS TABLE)
                </h2>
                <p className="text-xs font-mono text-[var(--text-muted)]">Enter a keyword to see the LPS table</p>
            </div>
        );
    }

    const lps = buildKMPTable(pattern);

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-yellow)]" />
                    KMP FAILURE FUNCTION (LPS TABLE)
                </h2>
                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[rgba(240,230,140,0.06)] px-2 py-0.5 rounded border border-[rgba(240,230,140,0.1)]">
                    Pattern Length: {pattern.length}
                </span>
            </div>

            <p className="text-[10px] font-mono text-[var(--text-muted)] mb-3">
                LPS[i] = length of longest proper prefix of pattern[0..i] which is also a suffix.
                KMP uses this to skip unnecessary comparisons on mismatch.
            </p>

            <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-center">
                    <thead>
                        <tr>
                            <td className="text-[9px] font-mono text-[var(--text-muted)] px-2 py-1.5 text-left">Index</td>
                            {pattern.split("").map((_, i) => (
                                <td key={i} className="text-[9px] font-mono text-[var(--text-muted)] px-2 py-1.5">
                                    {i}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="text-[9px] font-mono text-[var(--text-muted)] px-2 pb-1.5 text-left">Char</td>
                            {pattern.split("").map((ch, i) => (
                                <motion.td
                                    key={i}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="px-2 pb-1.5"
                                >
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-[rgba(240,230,140,0.12)] border border-[rgba(240,230,140,0.25)] text-[var(--accent-yellow)] font-mono font-bold text-xs">
                                        {ch}
                                    </span>
                                </motion.td>
                            ))}
                        </tr>
                        <tr>
                            <td className="text-[9px] font-mono text-[var(--text-muted)] px-2 pb-2 text-left">LPS</td>
                            {lps.map((val, i) => (
                                <motion.td
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.04 + 0.1 }}
                                    className="px-2 pb-2"
                                >
                                    <span
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded font-mono font-bold text-xs ${val > 0
                                                ? "bg-[rgba(56,139,253,0.2)] border border-[rgba(56,139,253,0.4)] text-[var(--accent-cyan)]"
                                                : "bg-[rgba(8,13,26,0.6)] border border-[rgba(56,139,253,0.1)] text-[var(--text-muted)]"
                                            }`}
                                    >
                                        {val}
                                    </span>
                                </motion.td>
                            ))}
                        </tr>
                    </thead>
                </table>
            </div>

            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-3 opacity-70">
                Highlighted values (blue) indicate non-zero LPS — positions where KMP can skip ahead on mismatch.
            </p>
        </div>
    );
}
