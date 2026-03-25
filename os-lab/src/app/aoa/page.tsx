"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { StringMatchPanel } from "@/components/StringMatchPanel";
import { TerminalLog, type LogEntry } from "@/components/TerminalLog";
import { KMPTable } from "@/components/KMPTable";
import { FileUpload } from "@/components/FileUpload";
import {
    naiveMatch,
    kmpMatch,
    compareAlgorithms,
    createPatternSearchConfig,
    type StringMatchResult,
    type AlgorithmComparison,
    parseSearchTerms,
} from "@/lib/simulation";
import type { ParsedFile } from "@/lib/fileParser";
import { Play, RotateCcw } from "lucide-react";

let logId = 0;
function makeLog(type: LogEntry["type"], message: string): LogEntry {
    return {
        id: logId++,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type,
        message,
    };
}

export default function AOAMode() {
    const [textInput, setTextInput] = useState("The kernel is the core of the operating system. It manages processes, memory, and devices.");
    const [query, setQuery] = useState("kernel");
    const [algorithm, setAlgorithm] = useState<"naive" | "kmp" | "compare">("compare");
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(true);

    const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([
        makeLog("system", "Algorithm Analysis Mode Initialized"),
        makeLog("info", "Enter text and a pattern to analyze string matching algorithms."),
    ]);

    const [result, setResult] = useState<StringMatchResult | null>(null);
    const [comparison, setComparison] = useState<AlgorithmComparison | null>(null);

    const addLog = useCallback((type: LogEntry["type"], message: string) => {
        setLogs((prev) => [...prev.slice(-120), makeLog(type, message)]);
    }, []);

    const handleFileParsed = useCallback(
        (parsed: ParsedFile) => {
            setParsedFile(parsed);
            
            // Extract some text from file
            const combinedText = parsed.blocks.slice(0, 10).map(b => b.content).join(" ");
            setTextInput(combinedText);
            
            setQuery(parsed.recommendedQuery || parsed.topKeywords[0] || "");
            addLog("system", `File loaded: "${parsed.name}"`);
            addLog("info", `Extracted text from first few blocks for analysis.`);
        },
        [addLog]
    );

    const handleFileClear = useCallback(() => {
        setParsedFile(null);
        addLog("system", "File cleared");
    }, [addLog]);

    const handleSuggestedQuerySelect = useCallback((q: string) => {
        setQuery(q);
        addLog("info", `Loaded search profile: ${q}`);
    }, [addLog]);

    const handleAnalyze = () => {
        logId = 0;
        setLogs([]);
        setResult(null);
        setComparison(null);
        
        const config = createPatternSearchConfig(query, { caseSensitive, wholeWord });
        const primary = config.terms[0] || "";

        if (!primary) {
            addLog("error", "Please enter a pattern to search.");
            return;
        }

        if (!textInput) {
            addLog("error", "Please enter text to search in.");
            return;
        }

        addLog("system", `Starting Algorithm Analysis`);
        addLog("info", `Target Pattern: "${primary}"`);
        addLog("info", `Text Length: ${textInput.length} characters`);

        if (algorithm === "compare") {
            const comp = compareAlgorithms(config, textInput, { caseSensitive, wholeWord });
            setComparison(comp);
            addLog("success", `Comparison Complete.`);
            addLog("info", `Naive: ${comp.naive.comparisons} comparisons. KMP: ${comp.kmp.comparisons} comparisons.`);
            if (comp.winner !== "tie") {
                addLog("success", `${comp.winner.toUpperCase()} was faster by ${comp.speedupFactor.toFixed(2)}x factor.`);
            } else {
                addLog("info", `Both algorithms took the same number of comparisons.`);
            }
        } else if (algorithm === "naive") {
            const res = naiveMatch(config, textInput, { caseSensitive, wholeWord });
            setResult(res);
            addLog("success", `Naive Match Complete. Found ${res.matches.length} matches in ${res.comparisons} comparisons.`);
        } else {
            const res = kmpMatch(config, textInput, { caseSensitive, wholeWord });
            setResult(res);
            addLog("success", `KMP Match Complete. Found ${res.matches.length} matches in ${res.comparisons} comparisons.`);
        }
    };

    const handleReset = () => {
        setResult(null);
        setComparison(null);
        setLogs([makeLog("system", "Analyzer Reset")]);
    };

    return (
        <div className="min-h-screen grid-bg">
            <Header
                isRunning={false}
                isComplete={result !== null || comparison !== null}
                comparisonMode={algorithm === "compare"}
                fileMode={!!parsedFile}
            />

            <main className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="font-display text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2 tracking-wider">
                        ALGORITHM ANALYSIS MODE
                    </h1>
                    <p className="text-sm font-mono text-gray-400">
                        Pure String Matching Environment
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div className="xl:col-span-1 flex flex-col gap-5">
                        <FileUpload
                            onFileParsed={handleFileParsed}
                            onClear={handleFileClear}
                            parsedFile={parsedFile}
                            onSuggestedQuerySelect={handleSuggestedQuerySelect}
                        />

                        <div className="glass-card p-5">
                            <h2 className="font-mono text-sm font-semibold text-blue-400 mb-4">ANALYSIS PARAMETERS</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1.5">ALGORITHM</label>
                                    <select 
                                        value={algorithm}
                                        onChange={(e) => setAlgorithm(e.target.value as any)}
                                        className="w-full bg-[#0a0f1c] border border-blue-500/20 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="naive">Naive String Matching</option>
                                        <option value="kmp">KMP (Knuth-Morris-Pratt)</option>
                                        <option value="compare">Compare Both</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1.5">SEARCH PATTERN</label>
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full bg-[#0a0f1c] border border-blue-500/20 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
                                        placeholder="Enter pattern to search"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1.5 flex justify-between">
                                        <span>TEXT INPUT</span>
                                        {parsedFile && <span className="text-green-400 text-[10px]">Loaded from file</span>}
                                    </label>
                                    <textarea
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        rows={4}
                                        className="w-full bg-[#0a0f1c] border border-blue-500/20 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 resize-y"
                                        placeholder="Enter text to search in..."
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={caseSensitive} onChange={() => setCaseSensitive(!caseSensitive)} className="accent-blue-500" />
                                        <span className="text-xs font-mono text-gray-300">Case Sensitive</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={wholeWord} onChange={() => setWholeWord(!wholeWord)} className="accent-blue-500" />
                                        <span className="text-xs font-mono text-gray-300">Whole Word</span>
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleAnalyze} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                                        <Play size={14} /> ANALYZE
                                    </button>
                                    <button onClick={handleReset} className="px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-sm rounded-lg transition-colors flex items-center justify-center">
                                        <RotateCcw size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {query && (algorithm === "kmp" || algorithm === "compare") && (
                            <KMPTable pattern={createPatternSearchConfig(query).terms[0] || ""} />
                        )}

                        <TerminalLog logs={logs} />
                    </div>

                    <div className="xl:col-span-2 flex flex-col gap-5">
                        <AnimatePresence mode="wait">
                            {comparison ? (
                                <motion.div
                                    key="compare"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex flex-col gap-5"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="glass-card p-5 border-l-4 border-l-blue-500">
                                            <h3 className="font-mono font-bold text-blue-400 mb-2">NAIVE ALGORITHM</h3>
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="bg-[#0a0f1c] p-3 rounded-lg border border-white/5">
                                                    <div className="text-[10px] text-gray-400 mb-1">COMPARISONS</div>
                                                    <div className="text-2xl font-mono text-white">{comparison.naive.comparisons}</div>
                                                </div>
                                                <div className="bg-[#0a0f1c] p-3 rounded-lg border border-white/5">
                                                    <div className="text-[10px] text-gray-400 mb-1">MATCHES</div>
                                                    <div className="text-2xl font-mono text-white">{comparison.naive.matches.length}</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#0a0f1c] p-3 rounded-lg border border-white/5">
                                                <div className="text-[10px] text-gray-400 mb-1">EXECUTION TIME</div>
                                                <div className="text-sm font-mono text-blue-300">{comparison.naive.executionTimeMs.toFixed(2)} ms</div>
                                            </div>
                                        </div>

                                        <div className="glass-card p-5 border-l-4 border-l-purple-500">
                                            <h3 className="font-mono font-bold text-purple-400 mb-2">KMP ALGORITHM</h3>
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="bg-[#0a0f1c] p-3 rounded-lg border border-white/5">
                                                    <div className="text-[10px] text-gray-400 mb-1">COMPARISONS</div>
                                                    <div className="text-2xl font-mono text-white">{comparison.kmp.comparisons}</div>
                                                </div>
                                                <div className="bg-[#0a0f1c] p-3 rounded-lg border border-white/5">
                                                    <div className="text-[10px] text-gray-400 mb-1">MATCHES</div>
                                                    <div className="text-2xl font-mono text-white">{comparison.kmp.matches.length}</div>
                                                </div>
                                            </div>
                                            <div className="bg-[#0a0f1c] p-3 rounded-lg border border-white/5">
                                                <div className="text-[10px] text-gray-400 mb-1">EXECUTION TIME</div>
                                                <div className="text-sm font-mono text-purple-300">{comparison.kmp.executionTimeMs.toFixed(2)} ms</div>
                                            </div>
                                        </div>
                                    </div>

                                    {comparison.winner !== "tie" && (
                                        <div className="glass-card p-4 text-center bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-t-2 border-t-green-500">
                                            <h3 className="text-lg font-bold text-green-400">
                                                {comparison.winner.toUpperCase()} is {comparison.speedupFactor.toFixed(2)}x more efficient!
                                            </h3>
                                        </div>
                                    )}

                                    {/* Create a pseudo-step to use StringMatchPanel */}
                                    <div className="mt-4">
                                        <h3 className="font-mono text-gray-400 mb-2">MATCH VISUALIZATION</h3>
                                        <StringMatchPanel 
                                            step={{
                                                stepIndex: 0,
                                                currentTrack: 0,
                                                previousTrack: 0,
                                                seekDistance: 0,
                                                cumulativeSeekTime: 0,
                                                request: { id: 0, track: 0, status: "done", seekTime: 0, blockData: textInput },
                                                matchResult: comparison.kmp
                                            }}
                                            searchConfig={createPatternSearchConfig(query, { caseSensitive, wholeWord })}
                                        />
                                    </div>
                                </motion.div>
                            ) : result ? (
                                <motion.div
                                    key="single"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex flex-col gap-5"
                                >
                                    <div className="glass-card p-5">
                                        <h3 className="font-mono font-bold text-blue-400 mb-4 tracking-wider uppercase">
                                            {algorithm} ALGORITHM RESULTS
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="bg-[#0a0f1c] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                                <div className="text-[10px] text-gray-400 mb-1 font-mono tracking-widest">COMPARISONS</div>
                                                <div className="text-3xl font-mono text-white">{result.comparisons}</div>
                                            </div>
                                            <div className="bg-[#0a0f1c] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                                <div className="text-[10px] text-gray-400 mb-1 font-mono tracking-widest">MATCHES</div>
                                                <div className="text-3xl font-mono text-white">{result.matches.length}</div>
                                            </div>
                                            <div className="bg-[#0a0f1c] p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                                <div className="text-[10px] text-gray-400 mb-1 font-mono tracking-widest">EXEC TIME ms</div>
                                                <div className="text-3xl font-mono text-white">{result.executionTimeMs.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <StringMatchPanel 
                                        step={{
                                            stepIndex: 0,
                                            currentTrack: 0,
                                            previousTrack: 0,
                                            seekDistance: 0,
                                            cumulativeSeekTime: 0,
                                            request: { id: 0, track: 0, status: "done", seekTime: 0, blockData: textInput },
                                            matchResult: result
                                        }}
                                        searchConfig={createPatternSearchConfig(query, { caseSensitive, wholeWord })}
                                    />
                                </motion.div>
                            ) : (
                                <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl glass-card">
                                    <div className="text-center">
                                        <div className="text-4xl mb-4">🔍</div>
                                        <h3 className="text-lg font-mono text-gray-400">WAITING FOR INPUT</h3>
                                        <p className="text-sm text-gray-600">Configure parameters and click Analyze.</p>
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
