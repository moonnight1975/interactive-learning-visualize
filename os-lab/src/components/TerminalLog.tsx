"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";

export interface LogEntry {
    id: number;
    timestamp: string;
    type: "info" | "success" | "warn" | "error" | "system";
    message: string;
}

interface TerminalLogProps {
    logs: LogEntry[];
}

const TYPE_COLORS: Record<LogEntry["type"], string> = {
    info: "text-[var(--accent-blue)]",
    success: "text-[var(--accent-green)]",
    warn: "text-[var(--accent-orange)]",
    error: "text-red-400",
    system: "text-[var(--accent-purple)]",
};

const TYPE_PREFIXES: Record<LogEntry["type"], string> = {
    info: "[INFO]",
    success: "[OK]  ",
    warn: "[WARN]",
    error: "[ERR] ",
    system: "[SYS] ",
};

export function TerminalLog({ logs }: TerminalLogProps) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <Terminal size={14} className="text-[var(--accent-green)]" />
                    SYSTEM LOG
                </h2>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {logs.length} entries
                </span>
            </div>

            <div className="terminal p-3 h-[240px] overflow-y-auto terminal-scroll">
                {logs.length === 0 && (
                    <p className="text-[var(--text-muted)] text-xs font-mono">
                        ▋ Awaiting simulation input...
                    </p>
                )}
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="log-entry"
                        >
                            <span className="text-[var(--text-muted)] mr-2">{log.timestamp}</span>
                            <span className={`${TYPE_COLORS[log.type]} mr-2 font-bold`}>
                                {TYPE_PREFIXES[log.type]}
                            </span>
                            <span className="text-[var(--text-secondary)]">{log.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={endRef} />
            </div>
        </div>
    );
}
