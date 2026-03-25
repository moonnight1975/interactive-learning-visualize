"use client";

import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    UploadCloud,
    CheckCircle,
    XCircle,
    X,
    Sparkles,
    HardDrive,
    FileCode,
    AlertTriangle,
    Radar,
    Activity,
} from "lucide-react";
import {
    type ParsedFile,
    parseFileToBlocks,
    validateFile,
    formatFileSize,
    getFileCategory,
} from "@/lib/fileParser";

interface FileUploadProps {
    onFileParsed: (parsed: ParsedFile) => void;
    onClear: () => void;
    parsedFile: ParsedFile | null;
    onSuggestedQuerySelect?: (query: string) => void;
    showSearchSuggestions?: boolean;
}

const ACCEPTED_EXT = ".txt,.log,.csv,.json,.md,.yaml,.yml,.xml,.conf,.sh,.py,.js,.ts,.sql,.ini,.cfg";

export function FileUpload({
    onFileParsed,
    onClear,
    parsedFile,
    onSuggestedQuerySelect,
    showSearchSuggestions = true,
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processFile = useCallback(
        async (file: File) => {
            setError(null);
            const validation = validateFile(file);
            if (!validation.valid) {
                setError(validation.error ?? "Invalid file");
                return;
            }

            setIsProcessing(true);
            try {
                const text = await file.text();
                const parsed = parseFileToBlocks(text, file.name, file.size, file.type);
                onFileParsed(parsed);
            } catch {
                setError("Failed to read file. Make sure it is a valid text file.");
            } finally {
                setIsProcessing(false);
            }
        },
        [onFileParsed]
    );

    const onDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const onChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) processFile(file);
            event.target.value = "";
        },
        [processFile]
    );

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <UploadCloud size={15} className="text-[var(--accent-blue)]" />
                    <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide">
                        FILE UPLOAD
                    </h2>
                    <span className="ml-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        REAL DATA MODE
                    </span>
                </div>
                {parsedFile && (
                    <button
                        onClick={onClear}
                        className="text-[10px] font-mono flex items-center gap-1 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    >
                        <X size={11} /> Clear
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {parsedFile ? (
                    <motion.div
                        key="parsed"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="space-y-3"
                    >
                        <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-3 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                                <FileCode size={18} className="text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-mono font-bold text-xs text-green-300 truncate">
                                        {parsedFile.name}
                                    </p>
                                    <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                                </div>
                                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                                    {getFileCategory(parsedFile.name)} | {formatFileSize(parsedFile.size)}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: "Total Lines", value: parsedFile.totalLines.toLocaleString() },
                                { label: "Total Words", value: parsedFile.totalWords.toLocaleString() },
                                { label: "Disk Blocks", value: parsedFile.blocks.length },
                                {
                                    label: "Track Span",
                                    value: `T${parsedFile.ioProfile.trackStart}-T${parsedFile.ioProfile.trackEnd}`,
                                },
                            ].map(({ label, value }) => (
                                <div
                                    key={label}
                                    className="rounded-lg p-2.5 bg-[rgba(8,13,26,0.6)] border border-[rgba(56,139,253,0.1)] text-center"
                                >
                                    <p className="text-[8px] font-mono text-[var(--text-muted)] uppercase mb-0.5">
                                        {label}
                                    </p>
                                    <p className="font-mono font-bold text-sm text-[var(--accent-cyan)]">{value}</p>
                                </div>
                            ))}
                        </div>

                        {parsedFile.detectedSignals.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Activity size={10} className="text-[var(--accent-red)]" />
                                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
                                        Detected Log Signals
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {parsedFile.detectedSignals.slice(0, 5).map((signal) => (
                                        <span
                                            key={signal.label}
                                            className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                                                signal.severity === "critical"
                                                    ? "bg-red-500/10 border-red-500/20 text-red-300"
                                                    : signal.severity === "warning"
                                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                                        : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                                            }`}
                                        >
                                            {signal.label} x{signal.count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {showSearchSuggestions && parsedFile.recommendedPatterns.length > 0 && (
                            <div className="rounded-lg p-3 bg-[rgba(56,139,253,0.04)] border border-[rgba(56,139,253,0.12)]">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Radar size={10} className="text-[var(--accent-blue)]" />
                                        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
                                            Recommended Watchlist
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onSuggestedQuerySelect?.(parsedFile.recommendedQuery)}
                                        className="text-[9px] font-mono px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20"
                                    >
                                        Load all
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {parsedFile.recommendedPatterns.map((pattern) => (
                                        <button
                                            key={pattern}
                                            type="button"
                                            onClick={() => onSuggestedQuerySelect?.(pattern)}
                                            className="text-[9px] font-mono px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20"
                                            title="Load this pattern into the search profile"
                                        >
                                            {pattern}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {showSearchSuggestions && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Sparkles size={10} className="text-[var(--accent-yellow)]" />
                                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
                                        Suggested Keywords
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {parsedFile.topKeywords.slice(0, 8).map((keyword) => (
                                        <button
                                            key={keyword}
                                            type="button"
                                            onClick={() => onSuggestedQuerySelect?.(keyword)}
                                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 cursor-pointer hover:bg-amber-500/20 transition-colors"
                                        >
                                            {keyword}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="rounded-lg p-2.5 bg-[rgba(56,139,253,0.04)] border border-[rgba(56,139,253,0.1)]">
                            <div className="flex items-center gap-1.5 mb-1">
                                <HardDrive size={10} className="text-[var(--accent-blue)]" />
                                <p className="text-[9px] font-mono text-[var(--accent-blue)] uppercase font-bold">
                                    File-to-Disk Mapping
                                </p>
                            </div>
                            <p className="text-[9px] font-mono text-[var(--text-muted)]">
                                Blocks are mapped into a stable extent from Track {parsedFile.ioProfile.trackStart} to{" "}
                                Track {parsedFile.ioProfile.trackEnd}. Avg block size: {parsedFile.ioProfile.avgBlockChars} chars.
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {parsedFile.blocks.map((block) => (
                                    <span
                                        key={block.blockIndex}
                                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300"
                                    >
                                        B{block.blockIndex} {"->"} T{block.trackNum}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="dropzone"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div
                            onDragOver={(event) => {
                                event.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={onDrop}
                            onClick={() => inputRef.current?.click()}
                            className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-8 px-4 text-center ${
                                isDragging
                                    ? "border-[var(--accent-blue)] bg-[rgba(56,139,253,0.08)] scale-[1.01]"
                                    : isProcessing
                                        ? "border-[rgba(56,139,253,0.3)] bg-[rgba(56,139,253,0.04)]"
                                        : "border-[rgba(56,139,253,0.2)] bg-[rgba(8,13,26,0.4)] hover:border-[rgba(56,139,253,0.4)] hover:bg-[rgba(56,139,253,0.04)]"
                            }`}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept={ACCEPTED_EXT}
                                className="hidden"
                                onChange={onChange}
                            />

                            {isProcessing ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-10 h-10 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent"
                                    />
                                    <p className="font-mono text-xs text-[var(--accent-blue)]">Parsing file...</p>
                                </>
                            ) : (
                                <>
                                    <motion.div
                                        animate={isDragging ? { scale: [1, 1.15, 1] } : {}}
                                        transition={{ duration: 0.4, repeat: Infinity }}
                                        className="w-12 h-12 rounded-xl bg-[rgba(56,139,253,0.1)] flex items-center justify-center"
                                    >
                                        <UploadCloud
                                            size={24}
                                            className={isDragging ? "text-[var(--accent-blue)]" : "text-[var(--text-muted)]"}
                                        />
                                    </motion.div>
                                    <div>
                                        <p className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                                            {isDragging ? "Drop to upload" : "Drop a file or click to browse"}
                                        </p>
                                        <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
                                            .txt | .log | .csv | .json | .md | .yaml | .conf | .py | .ts | .sql
                                        </p>
                                        <p className="font-mono text-[9px] text-[var(--text-muted)] mt-1 opacity-60">
                                            Max 5 MB | File is parsed client-side only
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400"
                                >
                                    <XCircle size={12} />
                                    <p className="text-[10px] font-mono">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-[rgba(247,144,0,0.05)] border border-[rgba(247,144,0,0.15)]">
                            <AlertTriangle size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-[9px] font-mono text-[var(--text-muted)] leading-4">
                                Upload real log or text files to replace synthetic blocks. The parser maps the file
                                into a deterministic disk extent and extracts watchlist candidates for deeper demos.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
