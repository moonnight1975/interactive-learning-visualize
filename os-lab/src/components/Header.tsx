"use client";

import { motion } from "framer-motion";
import { Activity, Cpu, HardDrive, Zap, GitCompare, FileSearch, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
    isRunning: boolean;
    isComplete: boolean;
    comparisonMode: boolean;
    fileMode: boolean;
}

export function Header({ isRunning, isComplete, comparisonMode, fileMode }: HeaderProps) {
    return (
        <header className="border-b border-[rgba(56,139,253,0.15)] bg-[rgba(8,13,26,0.9)] backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                {/* Logo and Back Button */}
                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                    <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                        <ChevronLeft size={16} />
                        <span>Modes</span>
                    </Link>
                    <div className="hidden sm:block h-6 w-px bg-white/10 mx-1" />
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="relative">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <HardDrive size={18} className="text-white" />
                            </div>
                            {isRunning && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-[#080d1a] animate-pulse" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-display text-xs sm:text-sm font-bold gradient-text tracking-wider">OS LAB</h1>
                            <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)] font-mono tracking-widest uppercase truncate">
                                Disk & Pattern Simulator
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center badges */}
                <div className="hidden lg:flex flex-wrap items-center justify-center gap-2">
                    <span className="status-badge bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Cpu size={10} />
                        FCFS
                    </span>
                    {comparisonMode ? (
                        <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="status-badge bg-green-500/10 text-green-400 border border-green-500/20"
                        >
                            <GitCompare size={10} />
                            SSTF
                        </motion.span>
                    ) : null}
                    <span className="status-badge bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Zap size={10} />
                        KMP
                    </span>
                    <span className="status-badge bg-green-500/10 text-green-400 border border-green-500/20">
                        <Activity size={10} />
                        NAIVE
                    </span>
                    {fileMode && (
                        <span className="status-badge bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <FileSearch size={10} />
                            FILE I/O
                        </span>
                    )}
                </div>

                {/* Mode + Status */}
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    {comparisonMode && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="hidden md:flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-lg border bg-gradient-to-r from-blue-500/10 to-green-500/10 border-[rgba(63,185,80,0.25)] text-green-300"
                        >
                            <GitCompare size={10} />
                            FCFS vs SSTF
                        </motion.div>
                    )}
                    <motion.div
                        className="flex items-center gap-2"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <span
                            className={`w-2 h-2 rounded-full ${isRunning
                                    ? "bg-orange-400"
                                    : isComplete
                                        ? "bg-green-400"
                                        : "bg-[var(--text-muted)]"
                                }`}
                        />
                        <span className="text-[10px] sm:text-xs font-mono text-[var(--text-secondary)]">
                            {isRunning ? "SIMULATING" : isComplete ? "COMPLETE" : "IDLE"}
                        </span>
                    </motion.div>
                </div>
            </div>
        </header>
    );
}
