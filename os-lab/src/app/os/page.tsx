/**
 * os/page.tsx  — NGILP Disk Scheduling Mode
 * ─────────────────────────────────────────────────────────────────────────────
 * UPGRADED with:
 *  ✅ DiskPlatter 2D Canvas visualization (rotational latency)
 *  ✅ Storage type selector (HDD / SSD / NVMe)
 *  ✅ RPM configuration
 *  ✅ Page fault simulation toggle
 *  ✅ Enhanced timing metrics in PerformanceDashboard
 *  ✅ Zero simulation logic in the frontend
 *  ✅ All cross-component state via Zustand only
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { TerminalLog, type LogEntry } from "@/components/TerminalLog";
import { FileUpload } from "@/components/FileUpload";
import { DiskHeadVisualizer } from "@/components/DiskHeadVisualizer";
import { DiskPlatter } from "@/components/DiskPlatter";
import { AlgorithmReasoning } from "@/components/AlgorithmReasoning";
import { OptimizationProfiler } from "@/components/OptimizationProfiler";
import { SimulationControls } from "@/components/SimulationControls";
import { PerformanceDashboard } from "@/components/PerformanceDashboard";
import {
    useSimulationStore,
    selectCurrentStep,
    selectPlayback,
    selectConnectionStatus,
    selectTimingMetrics,
    type OSAlgorithm,
    type StorageType,
} from "@/lib/simulationStore";
import { useSimulation } from "@/hooks/useSimulation";
import { useCompare, useStorageCompare } from "@/hooks/useCompare";
import type { ParsedFile } from "@/lib/fileParser";

// ─── Log helpers ──────────────────────────────────────────────────────────────

let logId = 0;
function makeLog(type: LogEntry["type"], message: string): LogEntry {
    return {
        id: logId++,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type,
        message,
    };
}

// ─── Config constants ─────────────────────────────────────────────────────────

const ALGORITHMS: { value: OSAlgorithm; label: string; desc: string }[] = [
    { value: "FCFS", label: "FCFS",  desc: "First Come, First Served" },
    { value: "SSTF", label: "SSTF",  desc: "Shortest Seek Time First" },
    { value: "SCAN", label: "SCAN",  desc: "Elevator Algorithm" },
    { value: "C-SCAN", label: "C-SCAN", desc: "Circular SCAN" },
    { value: "LOOK", label: "LOOK",  desc: "Look-ahead Elevator" },
    { value: "C-LOOK", label: "C-LOOK", desc: "Circular LOOK" },
];

const STORAGE_TYPES: { value: StorageType; label: string; desc: string; color: string }[] = [
    { value: "HDD",  label: "HDD",  desc: "7200 RPM Magnetic", color: "blue" },
    { value: "SSD",  label: "SSD",  desc: "SATA Solid State",  color: "green" },
    { value: "NVME", label: "NVMe", desc: "PCIe 4.0 Flash",    color: "purple" },
];

const RPM_OPTIONS = [5400, 7200, 10000, 15000];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function OSMode() {
    // ── Local UI state (not simulation state) ────────────────────────────────
    const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        setLogs([
            makeLog("system", "NGILP I/O Simulation Engine — Physics-Accurate Model"),
            makeLog("info",   "Rotational latency + seek time model active."),
            makeLog("info",   "Configure storage type, algorithm, and tracks to begin."),
        ]);
    }, []);
    const [headInput, setHeadInput] = useState("53");
    const [tracksInput, setTracksInput] = useState("98, 183, 37, 122, 14, 124, 65, 67");
    const [headError, setHeadError] = useState("");
    const [tracksError, setTracksError] = useState("");
    const [directionParam, setDirectionParam] = useState<"UP" | "DOWN">("UP");
    const visualizerRef = useRef<HTMLDivElement>(null);

    // ── Zustand store reads ──────────────────────────────────────────────────
    const algorithm      = useSimulationStore((s) => s.algorithm);
    const steps          = useSimulationStore((s) => s.steps);
    const currentStep    = useSimulationStore(selectCurrentStep);
    const { currentStepIndex, isPlaying, isComplete } = useSimulationStore(useShallow(selectPlayback));
    const { wsStatus }   = useSimulationStore(useShallow(selectConnectionStatus));
    const diskConfig     = useSimulationStore((s) => s.diskConfig);
    const finalMetrics   = useSimulationStore((s) => s.finalMetrics);
    const timing         = useSimulationStore(useShallow(selectTimingMetrics));

    // ── Zustand store writes ─────────────────────────────────────────────────
    const setAlgorithm   = useSimulationStore((s) => s.setAlgorithm);
    const setInitialHead = useSimulationStore((s) => s.setInitialHead);
    const setRequests    = useSimulationStore((s) => s.setRequests);
    const setParams      = useSimulationStore((s) => s.setParams);
    const setDiskConfig  = useSimulationStore((s) => s.setDiskConfig);
    const resetSim       = useSimulationStore((s) => s.resetSimulation);

    // ── Simulation hook ─────────────────────────────────────────────────────
    const { play, reset } = useSimulation();
    const {
        data: compareData,
        loading: compareLoading,
        error: compareError,
        run: runCompare,
        reset: resetComparisonProfile,
    } = useCompare();
    const {
        data: storageCompareData,
        loading: storageCompareLoading,
        error: storageCompareError,
        run: runStorageCompare,
        reset: resetStorageProfile,
    } = useStorageCompare();

    const addLog = useCallback((type: LogEntry["type"], msg: string) => {
        setLogs((prev) => [...prev.slice(-120), makeLog(type, msg)]);
    }, []);

    const validateWorkload = useCallback(() => {
        const parsedHead = parseInt(headInput, 10);
        const nextHeadError =
            isNaN(parsedHead) || parsedHead < 0 || parsedHead > 199 ? "Must be 0–199" : "";
        setHeadError(nextHeadError);

        const parsedTracks = tracksInput
            .split(",")
            .map((value) => parseInt(value.trim(), 10))
            .filter((value) => !isNaN(value));

        let nextTracksError = "";
        if (parsedTracks.length === 0) {
            nextTracksError = "Enter at least one track (0–199)";
        } else if (parsedTracks.some((track) => track < 0 || track > 199)) {
            nextTracksError = "All tracks must be 0–199";
        }
        setTracksError(nextTracksError);

        if (nextHeadError || nextTracksError) {
            return null;
        }

        return {
            head: parsedHead,
            tracks: parsedTracks,
        };
    }, [headInput, tracksInput]);

    useEffect(() => {
        if (compareData) {
            addLog("success", `Algorithm profiler winner: ${compareData.winner}. ${compareData.performance_summary}`);
        }
    }, [compareData, addLog]);

    useEffect(() => {
        if (storageCompareData) {
            addLog("success", storageCompareData.summary);
        }
    }, [storageCompareData, addLog]);

    useEffect(() => {
        if (compareError) {
            addLog("error", `Algorithm profiler failed: ${compareError}`);
        }
    }, [compareError, addLog]);

    useEffect(() => {
        if (storageCompareError) {
            addLog("error", `Storage benchmark failed: ${storageCompareError}`);
        }
    }, [storageCompareError, addLog]);

    // ── File upload ──────────────────────────────────────────────────────────
    const handleFileParsed = useCallback((parsed: ParsedFile) => {
        setParsedFile(parsed);
        const trackList = parsed.suggestedTracks.slice(0, 20);
        setTracksInput(trackList.join(", "));
        addLog("system", `File "${parsed.name}" loaded — ${trackList.length} tracks mapped`);
    }, [addLog]);

    const handleFileClear = useCallback(() => {
        setParsedFile(null);
        addLog("system", "File cleared");
    }, [addLog]);

    // ── Validate & commit config to Zustand, then play ────────────────────────
    const handleStart = useCallback(() => {
        const workload = validateWorkload();
        if (!workload) {
            return;
        }

        setInitialHead(workload.head);
        setRequests(workload.tracks);
        setParams({ direction: directionParam });

        addLog("system", `Starting ${algorithm} [${diskConfig.storageType}] — head: ${workload.head}, tracks: [${workload.tracks.join(", ")}]`);
        if (diskConfig.storageType === "HDD") {
            addLog("info", `Physics: ${diskConfig.rpm} RPM, ${diskConfig.sectorsPerTrack} sectors/track`);
        } else {
            addLog("info", `${diskConfig.storageType}: Near-instant access (no mechanical latency)`);
        }
        if (diskConfig.enablePageFaults) {
            addLog("info", `Page fault simulation ON (${diskConfig.memoryPages} page frames)`);
        }

        play();
        
        // Auto-scroll to visualizer on mobile
        if (window.innerWidth < 1280) {
            setTimeout(() => {
                visualizerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 150);
        }
    }, [validateWorkload, directionParam, algorithm, diskConfig, setInitialHead, setRequests, setParams, play, addLog]);

    const handleRunAlgorithmProfile = useCallback(() => {
        const workload = validateWorkload();
        if (!workload) {
            addLog("error", "Profiler requires a valid head position and at least one track request.");
            return;
        }

        addLog(
            "system",
            `Profiling all scheduling algorithms on ${diskConfig.storageType}${diskConfig.storageType === "HDD" ? ` @ ${diskConfig.rpm} RPM` : ""}.`
        );

        void runCompare({
            requests: workload.tracks,
            algorithms: ["FCFS", "SSTF", "SCAN", "C-SCAN", "LOOK", "C-LOOK"],
            head_start: workload.head,
            max_track: 199,
            direction: directionParam,
            rpm: diskConfig.rpm,
            storage_type: diskConfig.storageType,
        });
    }, [validateWorkload, addLog, diskConfig.storageType, diskConfig.rpm, directionParam, runCompare]);

    const handleRunStorageBenchmark = useCallback(() => {
        const workload = validateWorkload();
        if (!workload) {
            addLog("error", "Storage benchmark requires a valid head position and at least one track request.");
            return;
        }

        addLog(
            "system",
            `Benchmarking ${algorithm} across HDD, SSD, and NVMe using ${workload.tracks.length} queued requests.`
        );

        void runStorageCompare({
            requests: workload.tracks,
            algorithm,
            head_start: workload.head,
            max_track: 199,
            direction: directionParam,
            rpm: diskConfig.rpm,
        });
    }, [validateWorkload, addLog, algorithm, directionParam, diskConfig.rpm, runStorageCompare]);

    const handleReset = useCallback(() => {
        resetSim();
        reset();
        resetComparisonProfile();
        resetStorageProfile();
        logId = 0;
        setLogs([makeLog("system", "Simulation reset — ready for new run")]);
    }, [reset, resetSim, resetComparisonProfile, resetStorageProfile]);

    // ── Derived display values ────────────────────────────────────────────────
    const totalSeekDistance = currentStep?.cumulative_seek ?? 0;
    const isIdle = wsStatus === "idle" && steps.length === 0;
    const headPos = currentStep?.head_position ?? (parseInt(headInput, 10) || 53);
    const workloadPreviewCount = tracksInput
        .split(",")
        .map((value) => parseInt(value.trim(), 10))
        .filter((value) => !isNaN(value)).length;

    return (
        <div className="min-h-screen grid-bg">
            <Header
                isRunning={isPlaying}
                isComplete={isComplete}
                comparisonMode={false}
                fileMode={!!parsedFile}
            />

            <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
                {/* Page title */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="font-display text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-2 tracking-wider">
                        I/O SIMULATION LAB
                    </h1>
                    <p className="text-sm font-mono text-[var(--text-secondary)]">
                        Physics Engine · Rotational Latency · {diskConfig.storageType} Model · WebSocket Streaming
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {/* ── Left column: config + controls ── */}
                    <div className="xl:col-span-1 flex flex-col gap-5">
                        <FileUpload
                            onFileParsed={handleFileParsed}
                            onClear={handleFileClear}
                            parsedFile={parsedFile}
                            showSearchSuggestions={false}
                        />

                        {/* Config card */}
                        <div className="glass-card p-5 flex flex-col gap-4">
                            <h2 className="font-mono text-sm font-semibold text-[var(--accent-green)] tracking-wide">
                                SIMULATION CONFIG
                            </h2>

                            {/* Algorithm picker */}
                            <div>
                                <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-2 tracking-wider">
                                    Algorithm
                                </label>
                                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                    {ALGORITHMS.map(({ value, label, desc }) => (
                                        <button
                                            key={value}
                                            onClick={() => setAlgorithm(value)}
                                            disabled={isPlaying}
                                            title={desc}
                                            className={`py-2 rounded-lg font-mono text-[10px] border transition-all disabled:opacity-40 ${
                                                algorithm === value
                                                    ? "bg-green-500/15 text-green-300 border-green-500/35"
                                                    : "bg-white/3 text-[var(--text-muted)] border-white/8 hover:border-white/20"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Storage Type Selector (NGILP) ──── */}
                            <div>
                                <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-2 tracking-wider">
                                    Storage Type
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                                    {STORAGE_TYPES.map(({ value, label, desc, color }) => (
                                        <button
                                            key={value}
                                            onClick={() => setDiskConfig({ storageType: value })}
                                            disabled={isPlaying}
                                            title={desc}
                                            className={`py-2 rounded-lg font-mono text-[10px] border transition-all disabled:opacity-40 ${
                                                diskConfig.storageType === value
                                                    ? color === "blue"
                                                        ? "bg-blue-500/15 text-blue-300 border-blue-500/35"
                                                        : color === "green"
                                                        ? "bg-green-500/15 text-green-300 border-green-500/35"
                                                        : "bg-purple-500/15 text-purple-300 border-purple-500/35"
                                                    : "bg-white/3 text-[var(--text-muted)] border-white/8 hover:border-white/20"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[8px] font-mono text-[var(--text-muted)] mt-1">
                                    {STORAGE_TYPES.find((s) => s.value === diskConfig.storageType)?.desc}
                                </p>
                            </div>

                            {/* ── RPM Selector (HDD only) ──── */}
                            <AnimatePresence>
                                {diskConfig.storageType === "HDD" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-2 tracking-wider">
                                            Disk RPM
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
                                            {RPM_OPTIONS.map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={() => setDiskConfig({ rpm: r })}
                                                    disabled={isPlaying}
                                                    className={`py-1.5 rounded-lg font-mono text-[9px] border transition-all disabled:opacity-40 ${
                                                        diskConfig.rpm === r
                                                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/35"
                                                            : "bg-white/3 text-[var(--text-muted)] border-white/8 hover:border-white/20"
                                                    }`}
                                                >
                                                    {r.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Direction (SCAN only) */}
                            <AnimatePresence>
                                {algorithm === "SCAN" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-2 tracking-wider">
                                            Initial Direction
                                        </label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {(["UP", "DOWN"] as const).map((d) => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDirectionParam(d)}
                                                    disabled={isPlaying}
                                                    className={`py-2 rounded-lg font-mono text-[10px] border transition-all disabled:opacity-40 ${
                                                        directionParam === d
                                                            ? "bg-purple-500/15 text-purple-300 border-purple-500/35"
                                                            : "bg-white/3 text-[var(--text-muted)] border-white/8 hover:border-white/20"
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Page Fault Toggle (NGILP) ──── */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,68,68,0.04)] border border-[rgba(255,68,68,0.12)]">
                                <button
                                    onClick={() => setDiskConfig({ enablePageFaults: !diskConfig.enablePageFaults })}
                                    disabled={isPlaying}
                                    className={`relative w-10 h-5 rounded-full transition-all disabled:opacity-40 ${
                                        diskConfig.enablePageFaults
                                            ? "bg-red-500/30 border border-red-500/50"
                                            : "bg-white/10 border border-white/15"
                                    }`}
                                >
                                    <motion.div
                                        className={`absolute top-0.5 w-4 h-4 rounded-full ${
                                            diskConfig.enablePageFaults ? "bg-red-400" : "bg-gray-500"
                                        }`}
                                        animate={{ left: diskConfig.enablePageFaults ? 22 : 2 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                </button>
                                <div>
                                    <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                                        Page Fault Simulation
                                    </p>
                                    <p className="text-[8px] font-mono text-[var(--text-muted)]">
                                        LRU replacement, {diskConfig.memoryPages} page frames
                                    </p>
                                </div>
                            </div>

                            {/* Head position */}
                            <div>
                                <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1.5 tracking-wider">
                                    Initial Head (0–199)
                                </label>
                                <input
                                    type="number"
                                    value={headInput}
                                    onChange={(e) => setHeadInput(e.target.value)}
                                    disabled={isPlaying}
                                    min={0} max={199}
                                    className="os-input"
                                    placeholder="53"
                                />
                                {headError && (
                                    <p className="text-[10px] text-red-400 mt-1 font-mono">{headError}</p>
                                )}
                            </div>

                            {/* Track requests */}
                            <div>
                                <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1.5 tracking-wider">
                                    Track Requests (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={tracksInput}
                                    onChange={(e) => setTracksInput(e.target.value)}
                                    disabled={isPlaying}
                                    className="os-input"
                                    placeholder="98, 183, 37, 122, 14, 124, 65, 67"
                                />
                                {tracksError && (
                                    <p className="text-[10px] text-red-400 mt-1 font-mono">{tracksError}</p>
                                )}
                            </div>

                            {/* Start button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleStart}
                                disabled={isPlaying}
                                className="mt-1 w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/25 transition-all disabled:opacity-40"
                            >
                                {isPlaying ? "RUNNING…" : isComplete ? "RE-RUN" : "START SIMULATION"}
                            </motion.button>

                            {/* Reset */}
                            <button
                                onClick={handleReset}
                                className="w-full py-2 rounded-xl font-mono text-xs text-red-400/70 border border-red-500/15 hover:bg-red-500/10 transition-all"
                            >
                                RESET
                            </button>
                        </div>

                        {/* Playback controls + scrubber */}
                        <SimulationControls />

                        <TerminalLog logs={logs} />
                    </div>

                    {/* ── Right columns: visualization ── */}
                    <div ref={visualizerRef} className="xl:col-span-2 flex flex-col gap-5 pt-4 xl:pt-0 border-t xl:border-t-0 border-white/5 scroll-mt-20">
                        {isIdle ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-white/8 rounded-2xl glass-card"
                            >
                                <div className="text-center px-6">
                                    <div className="text-5xl mb-4">💿</div>
                                    <h3 className="font-mono text-lg text-[var(--text-secondary)] mb-2">
                                        READY TO SIMULATE
                                    </h3>
                                    <p className="text-[11px] font-mono text-[var(--text-muted)] max-w-md mx-auto">
                                        Configure algorithm, storage type, and tracks on the left.
                                        The physics engine calculates seek time + rotational latency
                                        for a realistic I/O timing model.
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-mono text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-500/40" /> HDD
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500/40" /> SSD
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-purple-500/40" /> NVMe
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key="running"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    className="flex flex-col gap-5"
                                >
                                    {/* Disk Platter Visualization (NGILP) */}
                                    <DiskPlatter
                                        rpm={diskConfig.rpm}
                                        sectorsPerTrack={diskConfig.sectorsPerTrack}
                                        targetSector={timing.targetSector}
                                        rotationAngle={timing.rotationAngle}
                                        headPosition={headPos}
                                        maxTrack={199}
                                        isPlaying={isPlaying}
                                        seekTimeMs={timing.seekTimeMs}
                                        rotationalLatencyMs={timing.rotationalLatencyMs}
                                        storageType={diskConfig.storageType}
                                    />

                                    {/* Existing head visualizer */}
                                    <DiskHeadVisualizer
                                        steps={steps}
                                        currentStepIndex={currentStepIndex}
                                        totalSeekDistance={totalSeekDistance}
                                    />

                                    {/* Enhanced Performance Dashboard */}
                                    <PerformanceDashboard
                                        totalSeekTime={totalSeekDistance}
                                        totalBlocks={steps.length}
                                        completedBlocks={Math.max(0, currentStepIndex + 1)}
                                        totalComparisons={0}
                                        executionMs={0}
                                        matchCount={0}
                                        isComplete={isComplete}
                                        totalTimeMs={finalMetrics?.total_time_ms ?? timing.cumulativeTimeMs}
                                        avgAccessTimeMs={finalMetrics?.avg_access_time_ms ?? timing.totalAccessTimeMs}
                                        avgRotationalLatencyMs={finalMetrics?.avg_rotational_latency_ms ?? timing.rotationalLatencyMs}
                                        avgThroughputMbps={finalMetrics?.avg_throughput_mbps ?? timing.throughputMbps}
                                        storageType={diskConfig.storageType}
                                        rpm={diskConfig.rpm}
                                        pageFaultCount={finalMetrics?.page_fault_count ?? 0}
                                        pageHitCount={finalMetrics?.page_hit_count ?? 0}
                                        pageFaultRate={finalMetrics?.page_fault_rate ?? 0}
                                        totalPageFaultPenaltyMs={finalMetrics?.total_page_fault_penalty_ms ?? 0}
                                    />

                                    <OptimizationProfiler
                                        requestCount={workloadPreviewCount}
                                        selectedAlgorithm={algorithm}
                                        storageType={diskConfig.storageType}
                                        rpm={diskConfig.rpm}
                                        compareData={compareData}
                                        compareLoading={compareLoading}
                                        compareError={compareError}
                                        storageData={storageCompareData}
                                        storageLoading={storageCompareLoading}
                                        storageError={storageCompareError}
                                        onRunAlgorithmProfile={handleRunAlgorithmProfile}
                                        onRunStorageBenchmark={handleRunStorageBenchmark}
                                    />

                                    {/* Algorithm reasoning panel */}
                                    <AlgorithmReasoning />
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
