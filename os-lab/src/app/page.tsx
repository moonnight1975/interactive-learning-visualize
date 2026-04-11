"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";

const modes = [
    {
        title: "AOA Mode",
        subtitle: "Algorithm Analysis",
        description: "Visualize Naive, KMP, Rabin-Karp, and Boyer-Moore algorithms with step-by-step execution, complexity analysis, and comparison profiling.",
        href: "/aoa",
        gradient: "from-blue-500/20 to-cyan-500/20",
        border: "border-blue-500/30",
        icon: "🔍",
        tag: "O(n) vs O(n×m)",
        tagColor: "text-blue-400",
    },
    {
        title: "AOA + OS Mode",
        subtitle: "Integrated System",
        description: "Explore the full interaction between Disk Scheduling (FCFS/SSTF/SCAN) and advanced pattern detection with real disk block analysis.",
        href: "/combined",
        gradient: "from-purple-500/20 to-pink-500/20",
        border: "border-purple-500/30",
        icon: "⚡",
        featured: true,
        tag: "MAIN SHOWCASE",
        tagColor: "text-purple-400",
    },
    {
        title: "OS I/O Lab",
        subtitle: "Physics Simulation",
        description: "Full I/O simulation with rotational latency, seek time physics, HDD/SSD/NVMe comparison, page fault simulation, and throughput analysis.",
        href: "/os",
        gradient: "from-green-500/20 to-emerald-500/20",
        border: "border-green-500/30",
        icon: "💿",
        tag: "PHYSICS ENGINE",
        tagColor: "text-green-400",
    },
];

const stats = [
    { label: "Algorithms", value: "7+", desc: "FCFS, SSTF, SCAN, Naive, KMP, Rabin-Karp, Boyer-Moore" },
    { label: "Metrics", value: "15+", desc: "Seek time, rotation delay, throughput, page faults..." },
    { label: "Storage Types", value: "3", desc: "HDD (7200 RPM), SSD (SATA), NVMe (PCIe 4.0)" },
];

export default function ModeSelection() {
    const [showIntro, setShowIntro] = useState(true);
    const countRef = useRef<HTMLSpanElement>(null);
    const introRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        const counter = { val: 0 };

        const tl = gsap.timeline({
            onComplete: () => {
                setShowIntro(false);
            }
        });

        tl.fromTo(textRef.current,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }
        )
            .to(counter, {
                val: 50,
                duration: 2.5, // Take 2.5 seconds to count to 50
                ease: "power2.inOut",
                onUpdate: () => {
                    if (countRef.current) {
                        countRef.current.textContent = Math.floor(counter.val).toString();
                    }
                }
            }, "<")
            .to(introRef.current, {
                opacity: 0,
                y: -20,
                duration: 0.8,
                ease: "power2.inOut",
                delay: 0.4
            });

        return () => { tl.kill(); };
    }, []);

    return (
        <>
            <AnimatePresence>
                {showIntro && (
                    <motion.div
                        ref={introRef}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050510]"
                        exit={{ opacity: 0 }}
                    >
                        <h1 ref={textRef} className="text-5xl sm:text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-500 tracking-widest uppercase">
                            NGILP
                        </h1>
                        <p className="text-xs sm:text-sm font-mono text-gray-600 mt-3 tracking-[0.3em] uppercase">
                            Next Generation Interactive Learning Platform
                        </p>
                        <div className="absolute bottom-12 sm:bottom-16 text-gray-500 font-mono text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600">
                            <span ref={countRef}>0</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!showIntro && (
                <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center px-4 py-8 sm:p-6 bg-grid-white/[0.02]">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[320px] h-[320px] sm:w-[600px] sm:h-[600px] bg-blue-500/10 rounded-full blur-[100px]" />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-10 sm:mb-12 relative z-10"
                    >
                        <div className="inline-block mb-4 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-mono text-blue-400">
                            I/O SIMULATION & OPTIMIZATION LAB
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-400 tracking-tight mb-4">
                            Choose Learning Mode
                        </h1>
                        <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
                            Active, empirically guided discovery. Break systems virtually, observe performance bottlenecks,
                            and learn optimal solutions through quantifiable data.
                        </p>
                    </motion.div>

                    {/* Stats bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mb-10 relative z-10"
                    >
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center group cursor-default">
                                <p className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                                    {stat.value}
                                </p>
                                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mt-1">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl w-full relative z-10"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        {modes.map((mode, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.1 + 0.3 }}
                            >
                                <Link href={mode.href} className="block h-full">
                                    <div className={`h-full relative overflow-hidden rounded-2xl border ${mode.border} bg-[#0a0f1c] p-6 sm:p-8 flex flex-col backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="text-3xl sm:text-4xl mb-4 p-3 sm:p-4 rounded-xl bg-white/5 w-fit border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                                {mode.icon}
                                            </div>

                                            <div className="mt-auto">
                                                {mode.tag && (
                                                    <div className={`text-[10px] font-bold tracking-wider ${mode.tagColor} mb-2 uppercase`}>
                                                        {mode.tag}
                                                    </div>
                                                )}
                                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
                                                    {mode.title}
                                                </h2>
                                                <h3 className="text-sm font-mono text-gray-400 mb-4">
                                                    {mode.subtitle}
                                                </h3>
                                                <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-grow">
                                                    {mode.description}
                                                </p>

                                                <div className="flex items-center text-blue-400 text-sm font-semibold group-hover:gap-3 gap-2 transition-all">
                                                    Launch Module <span className="group-hover:translate-x-1 transition-transform">→</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Architecture badge */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-10 text-center relative z-10"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                            <span className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider">
                                Next.js · TypeScript · FastAPI · WebSockets · Zustand · Canvas 2D
                            </span>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}
