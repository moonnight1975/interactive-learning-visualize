"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { DiskVisualization } from "@/components/DiskVisualization";
import { RequestQueue } from "@/components/RequestQueue";
import { PerformanceDashboard } from "@/components/PerformanceDashboard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { TerminalLog, type LogEntry } from "@/components/TerminalLog";
import { AlgorithmPanel } from "@/components/AlgorithmPanel";
import { ComparisonResults } from "@/components/ComparisonResults";
import { ControlPanel } from "@/components/ControlPanel";
import { FileUpload } from "@/components/FileUpload";
import {
    runFCFS,
    runDualSimulation,
    type SimulationStep,
    type DualSimResult,
    createPatternSearchConfig
} from "@/lib/simulation";
import type { ParsedFile } from "@/lib/fileParser";

interface OSState {
    steps: SimulationStep[];
    currentStepIndex: number;
    isRunning: boolean;
    isPaused: boolean;
    isComplete: boolean;
    initialHead: number;
    totalBlocks: number;
    autoRun: boolean;
    speed: number;
    totalSeekTime: number;
    executionMs: number;
    comparisonMode: boolean;
    dual: DualSimResult | null;
    fcfsStepIndex: number;
    sstfStepIndex: number;
}

const INITIAL_STATE: OSState = {
    steps: [],
    currentStepIndex: -1,
    isRunning: false,
    isPaused: false,
    isComplete: false,
    initialHead: 0,
    totalBlocks: 0,
    autoRun: true,
    speed: 800,
    totalSeekTime: 0,
    executionMs: 0,
    comparisonMode: false,
    dual: null,
    fcfsStepIndex: -1,
    sstfStepIndex: -1,
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

export default function OSMode() {
    const [sim, setSim] = useState<OSState>(INITIAL_STATE);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([
        makeLog("system", "Disk Scheduling Simulation Mode Initialized"),
        makeLog("info", "Focus solely on Head Movement and Seek Time."),
        makeLog("info", "Upload a text or log file to auto-fill file-backed track requests."),
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
            addLog("system", `File loaded: "${parsed.name}" (${parsed.blocks.length} mapped blocks)`);
            addLog(
                "info",
                `Track extent T${parsed.ioProfile.trackStart}-T${parsed.ioProfile.trackEnd} ready for OS scheduling`
            );
        },
        [addLog]
    );

    const handleFileClear = useCallback(() => {
        setParsedFile(null);
        addLog("system", "File cleared - back to manual track entry");
    }, [addLog]);

    const buildBlockDataMap = useCallback((): Map<number, string> | undefined => {
        if (!parsedFile) return undefined;

        const blockDataMap = new Map<number, string>();
        parsedFile.blocks.forEach((block) => {
            blockDataMap.set(block.trackNum, block.content);
        });

        return blockDataMap.size > 0 ? blockDataMap : undefined;
    }, [parsedFile]);

    const advanceStep = useCallback((prev: OSState): OSState => {
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

            return {
                ...prev,
                fcfsStepIndex: fcfsIdx,
                sstfStepIndex: sstfIdx,
                currentStepIndex: fcfsIdx,
                steps: prev.dual.fcfs.steps,
                totalSeekTime: fcfsStep ? fcfsStep.cumulativeSeekTime : prev.totalSeekTime,
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

            const isFileMode = !!parsedFile;
            addLog("system", `Simulation started (${isFileMode ? "File-backed OS Mode" : "Manual OS Mode"})`);
            addLog("info", `Head: ${params.head} | Tracks: [${params.tracks.join(", ")}]`);
            if (isFileMode && parsedFile) {
                addLog("info", `Using "${parsedFile.name}" as the source for mapped disk blocks`);
            }

            const startTs = performance.now();
            const config = createPatternSearchConfig(""); // No pattern matching
            const blockDataMap = buildBlockDataMap();

            let newSim: OSState;

            if (params.comparisonMode) {
                const dual = runDualSimulation(params.head, params.tracks, config, blockDataMap);
                const execMs = performance.now() - startTs;
                addLog("success", `FCFS: ${dual.fcfsTotal} tracks | SSTF: ${dual.sstfTotal} tracks`);

                newSim = {
                    ...INITIAL_STATE,
                    isRunning: true,
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
                };
            } else {
                const { result, steps } = runFCFS(params.head, params.tracks, config, blockDataMap);
                const execMs = performance.now() - startTs;
                addLog("success", `FCFS computed in ${execMs.toFixed(2)}ms - Seek: ${result.totalSeekTime} tracks`);

                newSim = {
                    ...INITIAL_STATE,
                    steps,
                    isRunning: true,
                    initialHead: params.head,
                    autoRun: params.autoRun,
                    speed: params.speed,
                    totalBlocks: steps.length,
                    executionMs: execMs,
                    comparisonMode: false,
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
                                addLog("info", `FCFS -> T${fcfsStep.currentTrack} (+${fcfsStep.seekDistance})`);
                            }
                            if (sstfStep) {
                                addLog("info", `SSTF -> T${sstfStep.currentTrack} (+${sstfStep.seekDistance})`);
                            }
                        } else {
                            const step = next.steps[next.currentStepIndex];
                            if (step) {
                                addLog("info", `-> Track ${step.currentTrack} (dist: ${step.seekDistance})`);
                            }
                        }

                        if (next.isComplete) {
                            addLog("success", "Done!");
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
            if (next.isComplete) addLog("success", "Simulation complete!");
            return next;
        });
    }, [advanceStep, addLog]);

    const handleTogglePause = useCallback(() => {
        setSim((prev) => ({ ...prev, isPaused: !prev.isPaused }));
    }, []);

    const handleReset = useCallback(() => {
        clearAutoRun();
        setSim(INITIAL_STATE);
        logId = 0;
        setLogs([
            makeLog("system", "Simulator reset"),
            makeLog(
                "info",
                parsedFile
                    ? `File "${parsedFile.name}" still loaded - press START to reuse its mapped tracks`
                    : "Manual mode ready - enter tracks or upload a file"
            ),
        ]);
    }, [clearAutoRun, parsedFile]);

    useEffect(() => () => clearAutoRun(), [clearAutoRun]);

    const totalSteps = sim.dual
        ? Math.max(sim.dual.fcfs.steps.length, sim.dual.sstf.steps.length)
        : sim.steps.length;

    const activeCompMode = sim.comparisonMode || comparisonMode;

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
                    <h1 className="font-display text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-2 tracking-wider">
                        DISK SCHEDULING MODE
                    </h1>
                    <p className="text-sm font-mono text-[var(--text-secondary)]">
                        Pure OS Environment (FCFS / SSTF)
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div className="xl:col-span-1 flex flex-col gap-5">
                        <FileUpload
                            onFileParsed={handleFileParsed}
                            onClear={handleFileClear}
                            parsedFile={parsedFile}
                            showSearchSuggestions={false}
                        />

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
                            onToggleComparison={() => setComparisonMode(!comparisonMode)}
                            initialTrackInput={parsedFile?.suggestedTracks.join(", ")}
                            fileMode={!!parsedFile}
                            showPatternControls={false}
                        />

                        {!sim.comparisonMode && (
                            <RequestQueue
                                steps={sim.steps}
                                currentStepIndex={sim.currentStepIndex}
                                initialHead={sim.initialHead}
                            />
                        )}

                        <TerminalLog logs={logs} />
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
                                            totalSeekTime={sim.fcfsStepIndex >= 0 ? sim.dual.fcfs.steps[sim.fcfsStepIndex]?.cumulativeSeekTime ?? 0 : 0}
                                            avgSeek={sim.fcfsStepIndex >= 0 ? ((sim.dual.fcfs.steps[sim.fcfsStepIndex]?.cumulativeSeekTime ?? 0) / (sim.fcfsStepIndex + 1)).toFixed(1) : "-"}
                                        />
                                        <AlgorithmPanel
                                            label="SSTF"
                                            color="green"
                                            steps={sim.dual.sstf.steps}
                                            currentStepIndex={sim.sstfStepIndex}
                                            initialHead={sim.initialHead}
                                            totalSeekTime={sim.sstfStepIndex >= 0 ? sim.dual.sstf.steps[sim.sstfStepIndex]?.cumulativeSeekTime ?? 0 : 0}
                                            avgSeek={sim.sstfStepIndex >= 0 ? ((sim.dual.sstf.steps[sim.sstfStepIndex]?.cumulativeSeekTime ?? 0) / (sim.sstfStepIndex + 1)).toFixed(1) : "-"}
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

                                    <PerformanceDashboard
                                        totalSeekTime={sim.totalSeekTime}
                                        totalBlocks={sim.totalBlocks}
                                        completedBlocks={Math.max(0, sim.currentStepIndex + 1)}
                                        totalComparisons={0}
                                        executionMs={sim.executionMs}
                                        matchCount={0}
                                        isComplete={sim.isComplete}
                                    />

                                    <PerformanceChart steps={sim.steps} currentStepIndex={sim.currentStepIndex} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
