"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { ControlPanel } from "@/components/ControlPanel";
import { DiskVisualization } from "@/components/DiskVisualization";
import { RequestQueue } from "@/components/RequestQueue";
import { StringMatchPanel } from "@/components/StringMatchPanel";
import { PerformanceDashboard } from "@/components/PerformanceDashboard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { TerminalLog, type LogEntry } from "@/components/TerminalLog";
import { KMPTable } from "@/components/KMPTable";
import { AlgorithmPanel } from "@/components/AlgorithmPanel";
import { ComparisonResults } from "@/components/ComparisonResults";
import { FileUpload } from "@/components/FileUpload";
import { FileAnalysisPanel } from "@/components/FileAnalysisPanel";
import {
    runFCFS,
    runDualSimulation,
    type SimulationStep,
    type DualSimResult,
    type PatternSearchConfig,
    createPatternSearchConfig,
    formatMatchSummary,
    getPrimaryPattern,
} from "@/lib/simulation";
import type { ParsedFile } from "@/lib/fileParser";

interface SimState {
    steps: SimulationStep[];
    currentStepIndex: number;
    isRunning: boolean;
    isPaused: boolean;
    isComplete: boolean;
    initialHead: number;
    searchConfig: PatternSearchConfig;
    totalBlocks: number;
    autoRun: boolean;
    speed: number;
    totalSeekTime: number;
    totalComparisons: number;
    totalPatternHits: number;
    matchedBlocks: number;
    executionMs: number;
    comparisonMode: boolean;
    dual: DualSimResult | null;
    fcfsStepIndex: number;
    sstfStepIndex: number;
    fileMode: boolean;
}

const INITIAL_STATE: SimState = {
    steps: [],
    currentStepIndex: -1,
    isRunning: false,
    isPaused: false,
    isComplete: false,
    initialHead: 0,
    searchConfig: createPatternSearchConfig(""),
    totalBlocks: 0,
    autoRun: true,
    speed: 800,
    totalSeekTime: 0,
    totalComparisons: 0,
    totalPatternHits: 0,
    matchedBlocks: 0,
    executionMs: 0,
    comparisonMode: false,
    dual: null,
    fcfsStepIndex: -1,
    sstfStepIndex: -1,
    fileMode: false,
};

let logId = 0;
function makeLog(type: LogEntry["type"], message: string): LogEntry {
    return {
        id: logId++,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type,
        message,
    };
}

export default function Home() {
    const [sim, setSim] = useState<SimState>(INITIAL_STATE);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
    const [fileQuery, setFileQuery] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([
        makeLog("system", "OS Lab Interactive I/O Platform v3.0 initialized"),
        makeLog("info", "Upload a log/text file to switch into real file-backed disk analysis"),
        makeLog("info", "Use comma-separated watchlists for advanced pattern detection"),
    ]);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const addLog = useCallback((type: LogEntry["type"], message: string) => {
        setLogs((prev) => [...prev.slice(-120), makeLog(type, message)]);
    }, []);

    const clearAutoRun = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const handleFileParsed = useCallback(
        (parsed: ParsedFile) => {
            setParsedFile(parsed);
            setFileQuery(parsed.recommendedQuery || parsed.topKeywords[0] || null);
            addLog("system", `File loaded: "${parsed.name}" (${parsed.totalLines} lines, ${parsed.blocks.length} blocks)`);
            addLog(
                "success",
                `Recommended watchlist: ${parsed.recommendedPatterns.slice(0, 4).join(", ") || "top keywords unavailable"}`
            );
            addLog(
                "info",
                `Disk extent: T${parsed.ioProfile.trackStart}-T${parsed.ioProfile.trackEnd} | Avg block ${parsed.ioProfile.avgBlockChars} chars`
            );
        },
        [addLog]
    );

    const handleFileClear = useCallback(() => {
        setParsedFile(null);
        setFileQuery(null);
        addLog("system", "File cleared - reverted to synthetic block data");
    }, [addLog]);

    const handleSuggestedQuerySelect = useCallback((query: string) => {
        setFileQuery(query);
        addLog("info", `Loaded search profile: ${query}`);
    }, [addLog]);

    const buildBlockDataMap = useCallback(
        (tracks: number[]): Map<number, string> | undefined => {
            if (!parsedFile) return undefined;
            const map = new Map<number, string>();
            parsedFile.blocks.forEach((block) => map.set(block.trackNum, block.content));
            const result = new Map<number, string>();
            tracks.forEach((track) => {
                const content = map.get(track);
                if (content) result.set(track, content);
            });
            return result.size > 0 ? result : undefined;
        },
        [parsedFile]
    );

    const advanceStep = useCallback((prev: SimState): SimState => {
        if (prev.comparisonMode && prev.dual) {
            const nextFCFS = prev.fcfsStepIndex + 1;
            const nextSSTF = prev.sstfStepIndex + 1;
            const fcfsDone = nextFCFS >= prev.dual.fcfs.steps.length;
            const sstfDone = nextSSTF >= prev.dual.sstf.steps.length;

            if (fcfsDone && sstfDone) {
                return { ...prev, isRunning: false, isComplete: true, isPaused: false };
            }

            const fcfsIdx = fcfsDone ? prev.fcfsStepIndex : nextFCFS;
            const sstfIdx = sstfDone ? prev.sstfStepIndex : nextSSTF;
            const fcfsStep = prev.dual.fcfs.steps[fcfsIdx];
            const sstfStep = prev.dual.sstf.steps[sstfIdx];

            return {
                ...prev,
                fcfsStepIndex: fcfsIdx,
                sstfStepIndex: sstfIdx,
                currentStepIndex: fcfsIdx,
                steps: prev.dual.fcfs.steps,
                totalSeekTime: fcfsStep ? fcfsStep.cumulativeSeekTime : prev.totalSeekTime,
                totalComparisons:
                    prev.totalComparisons +
                    (fcfsStep?.matchResult?.comparisons ?? 0) +
                    (sstfStep?.matchResult?.comparisons ?? 0),
                totalPatternHits:
                    prev.totalPatternHits +
                    (fcfsStep?.matchResult?.matches.length ?? 0) +
                    (sstfStep?.matchResult?.matches.length ?? 0),
                matchedBlocks:
                    prev.matchedBlocks +
                    (fcfsStep?.matchResult?.found ? 1 : 0) +
                    (sstfStep?.matchResult?.found ? 1 : 0),
            };
        }

        const next = prev.currentStepIndex + 1;
        if (next >= prev.steps.length) {
            return { ...prev, isRunning: false, isComplete: true, isPaused: false };
        }

        const step = prev.steps[next];
        return {
            ...prev,
            currentStepIndex: next,
            totalSeekTime: prev.totalSeekTime + step.seekDistance,
            totalComparisons: prev.totalComparisons + (step.matchResult?.comparisons ?? 0),
            totalPatternHits: prev.totalPatternHits + (step.matchResult?.matches.length ?? 0),
            matchedBlocks: prev.matchedBlocks + (step.matchResult?.found ? 1 : 0),
        };
    }, []);

    const handleStart = useCallback(
        (params: {
            head: number;
            tracks: number[];
            query: string;
            autoRun: boolean;
            speed: number;
            comparisonMode: boolean;
            caseSensitive: boolean;
            wholeWord: boolean;
        }) => {
            clearAutoRun();
            logId = 0;
            setLogs([]);

            const isFile = !!parsedFile;
            const searchConfig = createPatternSearchConfig(params.query, {
                caseSensitive: params.caseSensitive,
                wholeWord: params.wholeWord,
            });

            addLog("system", `Simulation started (${isFile ? "Real File I/O Mode" : "Synthetic Mode"})`);
            addLog("info", `Head: ${params.head} | Tracks: [${params.tracks.join(", ")}]`);
            addLog(
                "info",
                searchConfig.terms.length > 0
                    ? `Watchlist: ${searchConfig.terms.join(", ")}`
                    : "Watchlist empty: disk walk only"
            );
            addLog(
                "info",
                `${searchConfig.wholeWord ? "Whole-word" : "Substring"} | ${
                    searchConfig.caseSensitive ? "Case-sensitive" : "Case-insensitive"
                }`
            );

            if (isFile && parsedFile) {
                addLog("info", `File: "${parsedFile.name}" | ${parsedFile.blocks.length} real blocks`);
            }

            addLog(
                "info",
                params.comparisonMode
                    ? "Mode: COMPARISON (FCFS + SSTF)"
                    : `Mode: FCFS | ${params.autoRun ? "Auto" : "Step"} @ ${params.speed}ms`
            );

            const startTs = performance.now();
            const blockDataMap = buildBlockDataMap(params.tracks);

            let newSim: SimState;

            if (params.comparisonMode) {
                const dual = runDualSimulation(params.head, params.tracks, searchConfig, blockDataMap);
                const execMs = performance.now() - startTs;
                addLog("success", `FCFS: ${dual.fcfsTotal} tracks | SSTF: ${dual.sstfTotal} tracks`);
                addLog(
                    dual.improvement > 0 ? "success" : "warn",
                    `SSTF improvement: ${dual.improvement.toFixed(1)}%`
                );

                newSim = {
                    ...INITIAL_STATE,
                    isRunning: true,
                    searchConfig,
                    initialHead: params.head,
                    autoRun: params.autoRun,
                    speed: params.speed,
                    comparisonMode: true,
                    dual,
                    totalBlocks: dual.fcfs.steps.length,
                    executionMs: execMs,
                    steps: dual.fcfs.steps,
                    fcfsStepIndex: -1,
                    sstfStepIndex: -1,
                    fileMode: isFile,
                };
            } else {
                const { result, steps } = runFCFS(params.head, params.tracks, searchConfig, blockDataMap);
                const execMs = performance.now() - startTs;
                addLog("success", `FCFS computed in ${execMs.toFixed(2)}ms - Seek: ${result.totalSeekTime} tracks`);
                if (isFile && searchConfig.terms.length > 0) {
                    const matchedBlocks = steps.filter((step) => step.matchResult?.found).length;
                    addLog("info", `Watchlist hit ${matchedBlocks}/${steps.length} real blocks`);
                }

                newSim = {
                    ...INITIAL_STATE,
                    steps,
                    isRunning: true,
                    searchConfig,
                    initialHead: params.head,
                    autoRun: params.autoRun,
                    speed: params.speed,
                    totalBlocks: steps.length,
                    executionMs: execMs,
                    comparisonMode: false,
                    fileMode: isFile,
                };
            }

            setSim(newSim);

            if (params.autoRun) {
                intervalRef.current = setInterval(() => {
                    setSim((prev) => {
                        if (prev.isPaused) return prev;
                        const next = advanceStep(prev);

                        if (next.comparisonMode && next.dual) {
                            const fcfsStep = next.dual.fcfs.steps[next.fcfsStepIndex];
                            const sstfStep = next.dual.sstf.steps[next.sstfStepIndex];
                            if (fcfsStep) {
                                addLog(
                                    "info",
                                    `FCFS -> T${fcfsStep.currentTrack} (+${fcfsStep.seekDistance}) | ${
                                        fcfsStep.matchResult?.found ? formatMatchSummary(fcfsStep.matchResult) : "no hits"
                                    }`
                                );
                            }
                            if (sstfStep) {
                                addLog(
                                    "info",
                                    `SSTF -> T${sstfStep.currentTrack} (+${sstfStep.seekDistance}) | ${
                                        sstfStep.matchResult?.found ? formatMatchSummary(sstfStep.matchResult) : "no hits"
                                    }`
                                );
                            }
                        } else {
                            const step = next.steps[next.currentStepIndex];
                            if (step) {
                                addLog("info", `-> Track ${step.currentTrack} (dist: ${step.seekDistance})`);
                                if (step.matchResult?.found) {
                                    addLog("success", `Pattern hits: ${formatMatchSummary(step.matchResult)}`);
                                } else if (prev.searchConfig.terms.length > 0) {
                                    addLog("warn", `No watchlist hits in Track ${step.currentTrack}`);
                                }
                            }
                        }

                        if (next.isComplete) {
                            if (next.comparisonMode && next.dual) {
                                addLog("success", `Done! FCFS: ${next.dual.fcfsTotal} | SSTF: ${next.dual.sstfTotal} tracks`);
                                addLog("system", `SSTF improvement: ${next.dual.improvement.toFixed(1)}%`);
                            } else {
                                addLog("success", `Done! Total seek: ${next.totalSeekTime} tracks`);
                                addLog(
                                    "system",
                                    `${next.totalPatternHits} total hits across ${next.matchedBlocks}/${Math.max(next.steps.length, 1)} blocks`
                                );
                            }
                            clearAutoRun();
                        }

                        return next;
                    });
                }, params.speed);
            }
        },
        [advanceStep, addLog, buildBlockDataMap, clearAutoRun, parsedFile]
    );

    const handleStep = useCallback(() => {
        setSim((prev) => {
            const next = advanceStep(prev);
            if (next.comparisonMode && next.dual) {
                const fcfsStep = next.dual.fcfs.steps[next.fcfsStepIndex];
                const sstfStep = next.dual.sstf.steps[next.sstfStepIndex];
                if (fcfsStep) {
                    addLog(
                        "info",
                        `[STEP] FCFS -> T${fcfsStep.currentTrack} (+${fcfsStep.seekDistance}) | ${
                            fcfsStep.matchResult?.found ? formatMatchSummary(fcfsStep.matchResult) : "no hits"
                        }`
                    );
                }
                if (sstfStep) {
                    addLog(
                        "info",
                        `[STEP] SSTF -> T${sstfStep.currentTrack} (+${sstfStep.seekDistance}) | ${
                            sstfStep.matchResult?.found ? formatMatchSummary(sstfStep.matchResult) : "no hits"
                        }`
                    );
                }
            } else {
                const step = next.steps[next.currentStepIndex];
                if (step) {
                    addLog("info", `[STEP] -> T${step.currentTrack} (dist: ${step.seekDistance})`);
                    if (step.matchResult?.found) {
                        addLog("success", `Pattern hits: ${formatMatchSummary(step.matchResult)}`);
                    }
                }
            }

            if (next.isComplete) addLog("success", "Simulation complete!");
            return next;
        });
    }, [advanceStep, addLog]);

    const handleTogglePause = useCallback(() => {
        setSim((prev) => {
            addLog("system", prev.isPaused ? "Resumed" : "Paused");
            return { ...prev, isPaused: !prev.isPaused };
        });
    }, [addLog]);

    const handleReset = useCallback(() => {
        clearAutoRun();
        setSim(INITIAL_STATE);
        logId = 0;
        setLogs([
            makeLog("system", "Simulator reset"),
            makeLog(
                "info",
                parsedFile
                    ? `File "${parsedFile.name}" still loaded -> configure watchlist and START`
                    : "Configure parameters and press START to begin"
            ),
        ]);
    }, [clearAutoRun, parsedFile]);

    useEffect(() => () => clearAutoRun(), [clearAutoRun]);

    const currentStep =
        !sim.comparisonMode && sim.currentStepIndex >= 0 && sim.steps[sim.currentStepIndex]
            ? sim.steps[sim.currentStepIndex]
            : null;

    const totalSteps = sim.dual
        ? Math.max(sim.dual.fcfs.steps.length, sim.dual.sstf.steps.length)
        : sim.steps.length;

    const showFileAnalysis = sim.fileMode && parsedFile && sim.steps.length > 0;
    const activeCompMode = sim.comparisonMode || comparisonMode;
    const primaryPattern = getPrimaryPattern(sim.searchConfig);

    return (
        <div className="min-h-screen grid-bg">
            <Header
                isRunning={sim.isRunning}
                isComplete={sim.isComplete}
                comparisonMode={activeCompMode}
                fileMode={!!parsedFile}
            />

            <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="font-display text-3xl md:text-4xl font-black gradient-text mb-2 tracking-wider">
                        INTERACTIVE OS LEARNING PLATFORM
                    </h1>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        <p className="text-sm font-mono text-[var(--text-secondary)]">
                            {parsedFile
                                ? `Real File Mode | "${parsedFile.name}" | ${parsedFile.blocks.length} file-backed blocks`
                                : "Synthetic Mode | 200-track disk simulation"}
                        </p>
                        {parsedFile && (
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400">
                                REAL FILE I/O
                            </span>
                        )}
                        {sim.searchConfig.terms.length > 1 && (
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
                                MULTI-PATTERN DETECTION
                            </span>
                        )}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div className="xl:col-span-1 flex flex-col gap-5">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                        >
                            <FileUpload
                                onFileParsed={handleFileParsed}
                                onClear={handleFileClear}
                                parsedFile={parsedFile}
                                onSuggestedQuerySelect={handleSuggestedQuerySelect}
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <ControlPanel
                                onStart={handleStart}
                                onStep={handleStep}
                                onReset={handleReset}
                                onTogglePause={handleTogglePause}
                                isRunning={sim.isRunning}
                                isPaused={sim.isPaused}
                                isComplete={sim.isComplete}
                                canStep={!sim.isComplete && sim.currentStepIndex < totalSteps - 1}
                                comparisonMode={comparisonMode}
                                onToggleComparison={() => setComparisonMode((value) => !value)}
                                initialTrackInput={parsedFile?.suggestedTracks.join(", ")}
                                initialQuery={fileQuery ?? undefined}
                                suggestedPatterns={parsedFile?.recommendedPatterns}
                                fileMode={!!parsedFile}
                            />
                        </motion.div>

                        {!sim.comparisonMode && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 }}
                            >
                                <RequestQueue
                                    steps={sim.steps}
                                    currentStepIndex={sim.currentStepIndex}
                                    initialHead={sim.initialHead}
                                />
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <KMPTable pattern={primaryPattern} />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <TerminalLog logs={logs} />
                        </motion.div>
                    </div>

                    <div className="xl:col-span-2 flex flex-col gap-5">
                        <AnimatePresence mode="wait">
                            {sim.comparisonMode && sim.dual ? (
                                <motion.div
                                    key="comparison"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex flex-col gap-5"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <AlgorithmPanel
                                            label="FCFS"
                                            color="blue"
                                            steps={sim.dual.fcfs.steps}
                                            currentStepIndex={sim.fcfsStepIndex}
                                            initialHead={sim.initialHead}
                                            totalSeekTime={
                                                sim.fcfsStepIndex >= 0
                                                    ? sim.dual.fcfs.steps[sim.fcfsStepIndex]?.cumulativeSeekTime ?? 0
                                                    : 0
                                            }
                                            avgSeek={
                                                sim.fcfsStepIndex >= 0
                                                    ? (
                                                        (sim.dual.fcfs.steps[sim.fcfsStepIndex]?.cumulativeSeekTime ?? 0) /
                                                        (sim.fcfsStepIndex + 1)
                                                    ).toFixed(1)
                                                    : "-"
                                            }
                                        />
                                        <AlgorithmPanel
                                            label="SSTF"
                                            color="green"
                                            steps={sim.dual.sstf.steps}
                                            currentStepIndex={sim.sstfStepIndex}
                                            initialHead={sim.initialHead}
                                            totalSeekTime={
                                                sim.sstfStepIndex >= 0
                                                    ? sim.dual.sstf.steps[sim.sstfStepIndex]?.cumulativeSeekTime ?? 0
                                                    : 0
                                            }
                                            avgSeek={
                                                sim.sstfStepIndex >= 0
                                                    ? (
                                                        (sim.dual.sstf.steps[sim.sstfStepIndex]?.cumulativeSeekTime ?? 0) /
                                                        (sim.sstfStepIndex + 1)
                                                    ).toFixed(1)
                                                    : "-"
                                            }
                                        />
                                    </div>

                                    {(sim.fcfsStepIndex >= 0 || sim.isComplete) && (
                                        <ComparisonResults
                                            dual={sim.dual}
                                            isComplete={sim.isComplete}
                                            fcfsStep={sim.fcfsStepIndex}
                                            sstfStep={sim.sstfStepIndex}
                                            totalSteps={totalSteps}
                                        />
                                    )}

                                    {showFileAnalysis && parsedFile && (
                                        <FileAnalysisPanel
                                            parsedFile={parsedFile}
                                            searchConfig={sim.searchConfig}
                                            steps={sim.steps}
                                            currentStepIndex={sim.fcfsStepIndex}
                                        />
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="single"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex flex-col gap-5"
                                >
                                    <DiskVisualization
                                        initialHead={sim.initialHead}
                                        steps={sim.steps}
                                        currentStepIndex={sim.currentStepIndex}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {showFileAnalysis && parsedFile ? (
                                            <FileAnalysisPanel
                                                parsedFile={parsedFile}
                                                searchConfig={sim.searchConfig}
                                                steps={sim.steps}
                                                currentStepIndex={sim.currentStepIndex}
                                            />
                                        ) : (
                                            <StringMatchPanel step={currentStep} searchConfig={sim.searchConfig} />
                                        )}

                                        <PerformanceDashboard
                                            totalSeekTime={sim.totalSeekTime}
                                            totalBlocks={sim.totalBlocks}
                                            completedBlocks={Math.max(0, sim.currentStepIndex + 1)}
                                            totalComparisons={sim.totalComparisons}
                                            executionMs={sim.executionMs}
                                            matchCount={sim.totalPatternHits}
                                            isComplete={sim.isComplete}
                                        />
                                    </div>

                                    {showFileAnalysis && (
                                        <StringMatchPanel step={currentStep} searchConfig={sim.searchConfig} />
                                    )}

                                    <PerformanceChart steps={sim.steps} currentStepIndex={sim.currentStepIndex} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-10 pt-6 border-t border-[rgba(56,139,253,0.08)] text-center"
                >
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">
                        OS LAB v3.0 | Real File Uploads | FCFS & SSTF Disk Scheduling | Multi-pattern KMP Analysis |
                        Educational Operating Systems Demo Platform
                    </p>
                </motion.footer>
            </main>
        </div>
    );
}
