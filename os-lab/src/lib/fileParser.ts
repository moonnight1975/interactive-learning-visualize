import type { PatternSearchOptions } from "@/lib/simulation";

// --- Types -----------------------------------------------------------------

export interface FileBlock {
    blockIndex: number;
    trackNum: number;
    content: string;
    lineStart: number;
    lineEnd: number;
    byteStart: number;
    byteEnd: number;
    lineCount: number;
    charCount: number;
}

export interface LogSignal {
    label: string;
    count: number;
    severity: "critical" | "warning" | "info";
}

export interface FileIoProfile {
    trackStart: number;
    trackEnd: number;
    avgBlockChars: number;
    avgLinesPerBlock: number;
}

export interface ParsedFile {
    name: string;
    size: number;
    type: string;
    totalLines: number;
    totalChars: number;
    totalWords: number;
    blocks: FileBlock[];
    suggestedTracks: number[];
    topKeywords: string[];
    recommendedPatterns: string[];
    recommendedQuery: string;
    detectedSignals: LogSignal[];
    uniqueWordCount: number;
    ioProfile: FileIoProfile;
}

export interface PatternFrequency {
    word: string;
    count: number;
    blocks: number[];
}

export interface BlockHotspot {
    blockIndex: number;
    trackNum: number;
    lineStart: number;
    lineEnd: number;
    totalHits: number;
    matchedPatterns: string[];
}

// --- Constants --------------------------------------------------------------

const STOP_WORDS = new Set([
    "the", "and", "or", "is", "in", "it", "of", "to", "a", "an", "for",
    "on", "at", "be", "by", "as", "if", "do", "so", "no", "up", "we",
    "but", "not", "are", "was", "has", "had", "this", "that", "with",
    "from", "he", "she", "they", "them", "then", "than", "have", "been",
    "will", "can", "may", "all", "any", "one", "two", "new", "get", "set",
    "its", "our", "your", "my", "his", "her", "via", "etc", "line", "data",
]);

const DEFAULT_SEARCH_OPTIONS: PatternSearchOptions = {
    caseSensitive: false,
    wholeWord: false,
};

const LOG_SIGNAL_PATTERNS: Array<{
    label: string;
    aliases: string[];
    severity: LogSignal["severity"];
}> = [
    { label: "error", aliases: ["error", "failed", "failure"], severity: "critical" },
    { label: "warning", aliases: ["warn", "warning"], severity: "warning" },
    { label: "exception", aliases: ["exception", "traceback", "panic"], severity: "critical" },
    { label: "timeout", aliases: ["timeout", "timed out", "deadline"], severity: "warning" },
    { label: "retry", aliases: ["retry", "backoff"], severity: "info" },
    { label: "denied", aliases: ["denied", "forbidden", "unauthorized"], severity: "critical" },
];

// --- Helpers ----------------------------------------------------------------

function hashString(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function normalizeText(text: string, caseSensitive: boolean): string {
    return caseSensitive ? text : text.toLowerCase();
}

function isWordBoundary(char: string | undefined): boolean {
    return !char || !/[a-z0-9_]/i.test(char);
}

function passesWholeWordCheck(text: string, start: number, length: number): boolean {
    return isWordBoundary(text[start - 1]) && isWordBoundary(text[start + length]);
}

function countMatches(
    text: string,
    pattern: string,
    options: PatternSearchOptions = DEFAULT_SEARCH_OPTIONS
): number {
    if (!pattern) return 0;

    const source = normalizeText(text, options.caseSensitive);
    const target = normalizeText(pattern, options.caseSensitive);
    let count = 0;
    let index = 0;

    while ((index = source.indexOf(target, index)) !== -1) {
        if (!options.wholeWord || passesWholeWordCheck(text, index, pattern.length)) {
            count++;
        }
        index += Math.max(target.length, 1);
    }

    return count;
}

function detectSignals(content: string): LogSignal[] {
    return LOG_SIGNAL_PATTERNS
        .map((signal) => ({
            label: signal.label,
            count: signal.aliases.reduce(
                (total, alias) => total + countMatches(content, alias, { caseSensitive: false, wholeWord: true }),
                0
            ),
            severity: signal.severity,
        }))
        .filter((signal) => signal.count > 0)
        .sort((a, b) => b.count - a.count);
}

function deriveRecommendedPatterns(topKeywords: string[], signals: LogSignal[]): string[] {
    const combined = [
        ...signals.map((signal) => signal.label),
        ...topKeywords.filter((keyword) => keyword.length >= 4),
    ];

    const seen = new Set<string>();
    const recommended: string[] = [];

    for (const pattern of combined) {
        const normalized = pattern.toLowerCase();
        if (!seen.has(normalized)) {
            seen.add(normalized);
            recommended.push(pattern);
        }
        if (recommended.length === 5) break;
    }

    return recommended;
}

// --- Core Parser ------------------------------------------------------------

/**
 * Splits a file's text content into disk blocks and assigns them deterministic
 * track numbers so repeated uploads map to the same simulated disk layout.
 */
export function parseFileToBlocks(
    content: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    maxBlocks = 16
): ParsedFile {
    const lines = content.split("\n");
    const totalLines = lines.length;
    const totalChars = content.length;
    const words = content.toLowerCase().match(/[a-z][a-z0-9_-]{1,}/g) ?? [];
    const totalWords = words.length;

    const freq = new Map<string, number>();
    for (const word of words) {
        if (!STOP_WORDS.has(word) && word.length >= 3) {
            freq.set(word, (freq.get(word) ?? 0) + 1);
        }
    }

    const topKeywords = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([word]) => word);

    const uniqueWordCount = freq.size;
    const targetBlocks = Math.max(4, Math.ceil(Math.max(totalChars, 1) / 420));
    const numBlocks = Math.min(maxBlocks, targetBlocks);
    const linesPerBlock = Math.max(1, Math.ceil(totalLines / numBlocks));
    const blocks: FileBlock[] = [];

    const extentSeed = hashString(`${fileName}:${fileSize}`);
    const trackStart = 8 + (extentSeed % 28);
    const trackSpan = Math.max(36, Math.min(150, numBlocks * 11));
    const trackEnd = Math.min(199, trackStart + trackSpan);

    let cumulativeBytes = 0;

    for (let blockIndex = 0; blockIndex < numBlocks; blockIndex++) {
        const lineStart = blockIndex * linesPerBlock;
        const lineEndExclusive = Math.min(lineStart + linesPerBlock, totalLines);
        const blockLines = lines.slice(lineStart, lineEndExclusive);
        const joinedWithNewlines = blockLines.join("\n");
        const blockContent = joinedWithNewlines.trim().slice(0, 420);

        const byteStart = cumulativeBytes;
        const byteEnd = byteStart + joinedWithNewlines.length;
        cumulativeBytes = byteEnd + 1;

        const ratio = numBlocks === 1 ? 0 : blockIndex / (numBlocks - 1);
        const trackNum = Math.round(trackStart + ratio * (trackEnd - trackStart));

        blocks.push({
            blockIndex,
            trackNum,
            content: blockContent || `[Empty block ${blockIndex}]`,
            lineStart,
            lineEnd: Math.max(lineStart, lineEndExclusive - 1),
            byteStart,
            byteEnd,
            lineCount: Math.max(1, lineEndExclusive - lineStart),
            charCount: blockContent.length,
        });
    }

    const suggestedTracks = blocks.map((block) => block.trackNum);
    const detectedSignals = detectSignals(content);
    const recommendedPatterns = deriveRecommendedPatterns(topKeywords, detectedSignals);

    return {
        name: fileName,
        size: fileSize,
        type: fileType,
        totalLines,
        totalChars,
        totalWords,
        blocks,
        suggestedTracks,
        topKeywords,
        recommendedPatterns,
        recommendedQuery: recommendedPatterns.slice(0, 3).join(", "),
        detectedSignals,
        uniqueWordCount,
        ioProfile: {
            trackStart,
            trackEnd,
            avgBlockChars:
                blocks.length > 0
                    ? Math.round(blocks.reduce((total, block) => total + block.charCount, 0) / blocks.length)
                    : 0,
            avgLinesPerBlock:
                blocks.length > 0
                    ? Number(
                        (
                            blocks.reduce((total, block) => total + block.lineCount, 0) / blocks.length
                        ).toFixed(1)
                    )
                    : 0,
        },
    };
}

/**
 * Analyse pattern frequency across blocks.
 */
export function analyzePatternFrequency(
    blocks: FileBlock[],
    patterns: string[],
    options: PatternSearchOptions = DEFAULT_SEARCH_OPTIONS
): PatternFrequency[] {
    return patterns.map((pattern) => {
        const matchingBlocks: number[] = [];
        let count = 0;

        blocks.forEach((block, index) => {
            const localCount = countMatches(block.content, pattern, options);
            if (localCount > 0) {
                count += localCount;
                matchingBlocks.push(index);
            }
        });

        return { word: pattern, count, blocks: matchingBlocks };
    });
}

export function analyzeBlockHotspots(
    blocks: FileBlock[],
    patterns: string[],
    options: PatternSearchOptions = DEFAULT_SEARCH_OPTIONS
): BlockHotspot[] {
    return blocks
        .map((block) => {
            const matchedPatterns = patterns.filter((pattern) => countMatches(block.content, pattern, options) > 0);
            const totalHits = matchedPatterns.reduce(
                (total, pattern) => total + countMatches(block.content, pattern, options),
                0
            );

            return {
                blockIndex: block.blockIndex,
                trackNum: block.trackNum,
                lineStart: block.lineStart,
                lineEnd: block.lineEnd,
                totalHits,
                matchedPatterns,
            };
        })
        .filter((block) => block.totalHits > 0)
        .sort((a, b) => b.totalHits - a.totalHits || a.blockIndex - b.blockIndex);
}

/**
 * Format bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Detect file type category for display.
 */
export function getFileCategory(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const categories: Record<string, string> = {
        log: "System Log",
        txt: "Text File",
        csv: "CSV Data",
        json: "JSON Data",
        md: "Markdown",
        yaml: "YAML Config",
        yml: "YAML Config",
        xml: "XML Data",
        conf: "Config File",
        sh: "Shell Script",
        py: "Python Source",
        js: "JavaScript",
        ts: "TypeScript",
        sql: "SQL Script",
        ini: "INI Config",
        cfg: "Config File",
    };
    return categories[ext] ?? "Text Document";
}

/**
 * Validates that the uploaded file can be used (text-based, reasonable size).
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return { valid: false, error: "File too large. Maximum size is 5 MB." };
    }

    const textMimeTypes = [
        "text/plain", "text/csv", "text/markdown", "text/xml",
        "application/json", "application/xml", "application/x-yaml",
    ];
    const textExtensions = [
        "txt", "log", "csv", "json", "md", "yaml", "yml", "xml",
        "conf", "sh", "py", "js", "ts", "sql", "ini", "cfg",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!textMimeTypes.includes(file.type) && !textExtensions.includes(ext)) {
        return {
            valid: false,
            error: "Unsupported file type. Upload a text, log, CSV, JSON, or config file.",
        };
    }

    return { valid: true };
}
