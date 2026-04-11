// --- Types -----------------------------------------------------------------

export interface TrackRequest {
    id: number;
    track: number;
    status: "pending" | "processing" | "done";
    seekTime: number;
    blockData: string;
}

export interface FCFSResult {
    order: TrackRequest[];
    totalSeekTime: number;
    seekSequence: number[];
    executionTimeMs: number;
}

export interface PatternSearchOptions {
    caseSensitive: boolean;
    wholeWord: boolean;
}

export interface PatternSearchConfig extends PatternSearchOptions {
    rawQuery: string;
    terms: string[];
}

export interface PatternOccurrence {
    start: number;
    end: number;
    pattern: string;
}

export interface PatternBreakdown {
    pattern: string;
    matches: number[];
    comparisons: number;
    count: number;
}

export interface StringMatchResult {
    algorithm: "naive" | "kmp" | "multi-kmp" | "rabin-karp" | "boyer-moore";
    pattern: string;
    primaryPattern: string;
    text: string;
    matches: number[];
    occurrences: PatternOccurrence[];
    comparisons: number;
    executionTimeMs: number;
    found: boolean;
    matchedPatterns: string[];
    patternBreakdown: PatternBreakdown[];
    options: PatternSearchOptions;
}

export interface SimulationStep {
    stepIndex: number;
    currentTrack: number;
    previousTrack: number;
    seekDistance: number;
    cumulativeSeekTime: number;
    request: TrackRequest;
    matchResult?: StringMatchResult;
}

export interface SimulationState {
    requests: TrackRequest[];
    headPosition: number;
    currentStepIndex: number;
    steps: SimulationStep[];
    isRunning: boolean;
    isComplete: boolean;
    totalSeekTime: number;
    totalComparisons: number;
    executionMs: number;
}

// --- Block Data Generator ---------------------------------------------------

const WORDS = [
    "kernel", "process", "thread", "memory", "buffer", "cache", "inode",
    "sector", "cluster", "partition", "cylinder", "scheduler", "semaphore",
    "mutex", "deadlock", "paging", "segment", "virtual", "physical", "interrupt",
    "syscall", "fork", "exec", "pipe", "socket", "device", "driver", "module",
    "bootloader", "filesystem", "journal", "bitmap", "superblock", "metadata",
    "allocation", "deallocation", "fragmentation", "compaction", "swapping",
    "thrashing", "priority", "preemption", "context", "switch", "quantum",
    "round", "robin", "fifo", "stack", "queue", "heap", "pointer", "register",
    "instruction", "pipeline", "cache", "fetch", "decode", "execute", "writeback",
];

const DEFAULT_SEARCH_OPTIONS: PatternSearchOptions = {
    caseSensitive: false,
    wholeWord: false,
};

export function parseSearchTerms(rawQuery: string): string[] {
    const normalized = rawQuery
        .split(/[\n,|]+/)
        .map((term) => term.trim())
        .filter(Boolean);

    const seen = new Set<string>();
    const unique: string[] = [];

    for (const term of normalized) {
        const key = term.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(term);
        }
    }

    return unique;
}

export function createPatternSearchConfig(
    rawQuery: string,
    options: Partial<PatternSearchOptions> = {}
): PatternSearchConfig {
    return {
        rawQuery,
        terms: parseSearchTerms(rawQuery),
        caseSensitive: options.caseSensitive ?? DEFAULT_SEARCH_OPTIONS.caseSensitive,
        wholeWord: options.wholeWord ?? DEFAULT_SEARCH_OPTIONS.wholeWord,
    };
}

export function getPrimaryPattern(searchConfig: PatternSearchConfig): string {
    return searchConfig.terms[0] ?? "";
}

function normalizeText(text: string, caseSensitive: boolean): string {
    return caseSensitive ? text : text.toLowerCase();
}

function isWordBoundary(char: string | undefined): boolean {
    return !char || !/[a-z0-9_]/i.test(char);
}

function passesWholeWordCheck(text: string, start: number, patternLength: number): boolean {
    const before = text[start - 1];
    const after = text[start + patternLength];
    return isWordBoundary(before) && isWordBoundary(after);
}

function normalizePatternInput(
    patternOrConfig: string | PatternSearchConfig,
    options: Partial<PatternSearchOptions> = {}
): PatternSearchConfig {
    if (typeof patternOrConfig === "string") {
        return createPatternSearchConfig(patternOrConfig, options);
    }

    return createPatternSearchConfig(patternOrConfig.rawQuery, patternOrConfig);
}

function buildEmptyResult(searchConfig: PatternSearchConfig, text: string): StringMatchResult {
    return {
        algorithm: searchConfig.terms.length > 1 ? "multi-kmp" : "kmp",
        pattern: searchConfig.rawQuery,
        primaryPattern: getPrimaryPattern(searchConfig),
        text,
        matches: [],
        occurrences: [],
        comparisons: 0,
        executionTimeMs: 0,
        found: false,
        matchedPatterns: [],
        patternBreakdown: [],
        options: {
            caseSensitive: searchConfig.caseSensitive,
            wholeWord: searchConfig.wholeWord,
        },
    };
}

export function generateBlockData(trackNum: number, primaryPattern?: string): string {
    const seed = trackNum * 31 + 7;
    const rng = (n: number) => Math.abs(Math.sin(seed + n) * 10000) % WORDS.length | 0;

    const words: string[] = [];
    for (let i = 0; i < 20; i++) {
        words.push(WORDS[rng(i)]);
    }

    if (primaryPattern && primaryPattern.length > 0) {
        const injectChance = (seed % 3 === 0) || (trackNum % 4 === 1);
        if (injectChance) {
            const pos = (seed % 15) + 2;
            words.splice(pos, 0, primaryPattern);
        }
    }

    return words.join(" ");
}

// --- FCFS Scheduling --------------------------------------------------------

export function runFCFS(
    initialHead: number,
    trackRequests: number[],
    patternOrConfig: string | PatternSearchConfig,
    blockDataMap?: Map<number, string>
): { result: FCFSResult; steps: SimulationStep[] } {
    const searchConfig = normalizePatternInput(patternOrConfig);
    const primaryPattern = getPrimaryPattern(searchConfig);
    const start = performance.now();

    const requests: TrackRequest[] = trackRequests.map((track, i) => ({
        id: i,
        track,
        status: "pending" as const,
        seekTime: 0,
        blockData: blockDataMap?.get(track) ?? generateBlockData(track, primaryPattern),
    }));

    const steps: SimulationStep[] = [];
    let currentHead = initialHead;
    let cumulativeSeek = 0;
    const seekSequence = [initialHead];

    for (let i = 0; i < requests.length; i++) {
        const rawReq = requests[i];
        const seekDist = Math.abs(rawReq.track - currentHead);
        cumulativeSeek += seekDist;
        const req: TrackRequest = {
            ...rawReq,
            status: "done" as const,
            seekTime: seekDist,
        };

        const matchResult = runPatternDetection(searchConfig, req.blockData);

        seekSequence.push(req.track);

        steps.push({
            stepIndex: i,
            currentTrack: req.track,
            previousTrack: currentHead,
            seekDistance: seekDist,
            cumulativeSeekTime: cumulativeSeek,
            request: req,
            matchResult,
        });

        currentHead = req.track;
        requests[i] = req;
    }

    const executionTimeMs = performance.now() - start;

    return {
        result: {
            order: requests,
            totalSeekTime: cumulativeSeek,
            seekSequence,
            executionTimeMs,
        },
        steps,
    };
}

// --- String Matching --------------------------------------------------------

export function naiveMatch(
    patternOrConfig: string | PatternSearchConfig,
    text: string,
    options: Partial<PatternSearchOptions> = {}
): StringMatchResult {
    const searchConfig = normalizePatternInput(patternOrConfig, options);
    const pattern = getPrimaryPattern(searchConfig);
    const start = performance.now();

    if (!pattern) {
        return buildEmptyResult(searchConfig, text);
    }

    const normalizedText = normalizeText(text, searchConfig.caseSensitive);
    const normalizedPattern = normalizeText(pattern, searchConfig.caseSensitive);
    const matches: number[] = [];
    let comparisons = 0;

    const n = normalizedText.length;
    const m = normalizedPattern.length;

    for (let i = 0; i <= n - m; i++) {
        let j = 0;
        while (j < m) {
            comparisons++;
            if (normalizedText[i + j] !== normalizedPattern[j]) break;
            j++;
        }
        if (j === m && (!searchConfig.wholeWord || passesWholeWordCheck(text, i, pattern.length))) {
            matches.push(i);
        }
    }

    const occurrences = matches.map((match) => ({
        start: match,
        end: match + pattern.length,
        pattern,
    }));

    return {
        algorithm: "naive",
        pattern: searchConfig.rawQuery,
        primaryPattern: pattern,
        text,
        matches,
        occurrences,
        comparisons,
        executionTimeMs: performance.now() - start,
        found: matches.length > 0,
        matchedPatterns: matches.length > 0 ? [pattern] : [],
        patternBreakdown: [
            {
                pattern,
                matches,
                comparisons,
                count: matches.length,
            },
        ],
        options: {
            caseSensitive: searchConfig.caseSensitive,
            wholeWord: searchConfig.wholeWord,
        },
    };
}

// --- KMP String Matching ----------------------------------------------------

export function buildKMPTable(pattern: string): number[] {
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    let len = 0;
    let i = 1;

    while (i < m) {
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else if (len !== 0) {
            len = lps[len - 1];
        } else {
            lps[i] = 0;
            i++;
        }
    }

    return lps;
}

export function kmpMatch(
    patternOrConfig: string | PatternSearchConfig,
    text: string,
    options: Partial<PatternSearchOptions> = {}
): StringMatchResult {
    const searchConfig = normalizePatternInput(patternOrConfig, options);
    const pattern = getPrimaryPattern(searchConfig);
    const start = performance.now();

    if (!pattern) {
        return buildEmptyResult(searchConfig, text);
    }

    const normalizedText = normalizeText(text, searchConfig.caseSensitive);
    const normalizedPattern = normalizeText(pattern, searchConfig.caseSensitive);
    const matches: number[] = [];
    let comparisons = 0;

    const n = normalizedText.length;
    const m = normalizedPattern.length;
    const lps = buildKMPTable(normalizedPattern);

    let i = 0;
    let j = 0;

    while (i < n) {
        comparisons++;

        if (normalizedPattern[j] === normalizedText[i]) {
            i++;
            j++;
        }

        if (j === m) {
            const matchIndex = i - j;
            if (!searchConfig.wholeWord || passesWholeWordCheck(text, matchIndex, pattern.length)) {
                matches.push(matchIndex);
            }
            j = lps[j - 1];
        } else if (i < n && normalizedPattern[j] !== normalizedText[i]) {
            if (j !== 0) {
                j = lps[j - 1];
            } else {
                i++;
            }
        }
    }

    const occurrences = matches.map((match) => ({
        start: match,
        end: match + pattern.length,
        pattern,
    }));

    return {
        algorithm: "kmp",
        pattern: searchConfig.rawQuery,
        primaryPattern: pattern,
        text,
        matches,
        occurrences,
        comparisons,
        executionTimeMs: performance.now() - start,
        found: matches.length > 0,
        matchedPatterns: matches.length > 0 ? [pattern] : [],
        patternBreakdown: [
            {
                pattern,
                matches,
                comparisons,
                count: matches.length,
            },
        ],
        options: {
            caseSensitive: searchConfig.caseSensitive,
            wholeWord: searchConfig.wholeWord,
        },
    };
}

export function runPatternDetection(
    patternOrConfig: string | PatternSearchConfig,
    text: string
): StringMatchResult {
    const searchConfig = normalizePatternInput(patternOrConfig);

    if (searchConfig.terms.length === 0) {
        return buildEmptyResult(searchConfig, text);
    }

    if (searchConfig.terms.length === 1) {
        return kmpMatch(searchConfig, text);
    }

    const start = performance.now();
    const patternBreakdown: PatternBreakdown[] = searchConfig.terms.map((term) => {
        const result = kmpMatch(term, text, searchConfig);
        return {
            pattern: term,
            matches: result.matches,
            comparisons: result.comparisons,
            count: result.matches.length,
        };
    });

    const occurrences = patternBreakdown
        .flatMap((entry) =>
            entry.matches.map((match) => ({
                start: match,
                end: match + entry.pattern.length,
                pattern: entry.pattern,
            }))
        )
        .sort((a, b) => a.start - b.start || b.end - a.end);

    const matches = occurrences.map((occurrence) => occurrence.start);
    const matchedPatterns = patternBreakdown
        .filter((entry) => entry.count > 0)
        .map((entry) => entry.pattern);
    const comparisons = patternBreakdown.reduce((total, entry) => total + entry.comparisons, 0);

    return {
        algorithm: "multi-kmp",
        pattern: searchConfig.rawQuery,
        primaryPattern: getPrimaryPattern(searchConfig),
        text,
        matches,
        occurrences,
        comparisons,
        executionTimeMs: performance.now() - start,
        found: matches.length > 0,
        matchedPatterns,
        patternBreakdown,
        options: {
            caseSensitive: searchConfig.caseSensitive,
            wholeWord: searchConfig.wholeWord,
        },
    };
}

// --- Highlight text ---------------------------------------------------------

export function highlightMatches(
    text: string,
    occurrences: PatternOccurrence[]
): Array<{ text: string; highlight: boolean; pattern?: string }> {
    if (occurrences.length === 0) {
        return [{ text, highlight: false }];
    }

    const sorted = [...occurrences].sort((a, b) => a.start - b.start || b.end - a.end);
    const segments: Array<{ text: string; highlight: boolean; pattern?: string }> = [];
    let cursor = 0;

    for (const occurrence of sorted) {
        const start = Math.max(cursor, occurrence.start);
        const end = Math.max(start, occurrence.end);

        if (start > cursor) {
            segments.push({ text: text.slice(cursor, start), highlight: false });
        }

        if (end > start) {
            segments.push({
                text: text.slice(start, end),
                highlight: true,
                pattern: occurrence.pattern,
            });
            cursor = end;
        }
    }

    if (cursor < text.length) {
        segments.push({ text: text.slice(cursor), highlight: false });
    }

    return segments;
}

export function formatMatchSummary(result: StringMatchResult): string {
    if (!result.found) {
        return "no hits";
    }

    return result.patternBreakdown
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((entry) => `${entry.pattern}x${entry.count}`)
        .join(", ");
}

// --- Comparison: Naive vs KMP -----------------------------------------------

export interface AlgorithmComparison {
    naive: StringMatchResult;
    kmp: StringMatchResult;
    lpsTable: number[];
    winner: "naive" | "kmp" | "tie";
    speedupFactor: number;
}

export function compareAlgorithms(
    patternOrConfig: string | PatternSearchConfig,
    text: string,
    options: Partial<PatternSearchOptions> = {}
): AlgorithmComparison {
    const searchConfig = normalizePatternInput(patternOrConfig, options);
    const primaryPattern = getPrimaryPattern(searchConfig);
    const naive = naiveMatch(primaryPattern, text, searchConfig);
    const kmp = kmpMatch(primaryPattern, text, searchConfig);
    const lpsTable = buildKMPTable(
        searchConfig.caseSensitive ? primaryPattern : primaryPattern.toLowerCase()
    );

    const winner =
        naive.comparisons < kmp.comparisons
            ? "naive"
            : kmp.comparisons < naive.comparisons
                ? "kmp"
                : "tie";

    const speedupFactor =
        naive.comparisons > 0 ? naive.comparisons / Math.max(kmp.comparisons, 1) : 1;

    return { naive, kmp, lpsTable, winner, speedupFactor };
}

// --- SSTF Scheduling --------------------------------------------------------

export interface SSTFResult {
    order: TrackRequest[];
    totalSeekTime: number;
    seekSequence: number[];
    executionTimeMs: number;
}

export function runSSTF(
    initialHead: number,
    trackRequests: number[],
    patternOrConfig: string | PatternSearchConfig,
    blockDataMap?: Map<number, string>
): { result: SSTFResult; steps: SimulationStep[] } {
    const searchConfig = normalizePatternInput(patternOrConfig);
    const primaryPattern = getPrimaryPattern(searchConfig);
    const start = performance.now();

    const pending: Array<{ id: number; track: number; blockData: string }> =
        trackRequests.map((track, i) => ({
            id: i,
            track,
            blockData: blockDataMap?.get(track) ?? generateBlockData(track, primaryPattern),
        }));

    const steps: SimulationStep[] = [];
    let currentHead = initialHead;
    let cumulativeSeek = 0;
    const seekSequence = [initialHead];
    const orderedRequests: TrackRequest[] = [];

    while (pending.length > 0) {
        let minDist = Infinity;
        let minIdx = 0;

        for (let i = 0; i < pending.length; i++) {
            const dist = Math.abs(pending[i].track - currentHead);
            if (dist < minDist) {
                minDist = dist;
                minIdx = i;
            }
        }

        const chosen = pending.splice(minIdx, 1)[0];
        const seekDist = Math.abs(chosen.track - currentHead);
        cumulativeSeek += seekDist;

        const req: TrackRequest = {
            id: chosen.id,
            track: chosen.track,
            status: "done" as const,
            seekTime: seekDist,
            blockData: chosen.blockData,
        };

        const matchResult = runPatternDetection(searchConfig, req.blockData);
        seekSequence.push(req.track);

        steps.push({
            stepIndex: orderedRequests.length,
            currentTrack: req.track,
            previousTrack: currentHead,
            seekDistance: seekDist,
            cumulativeSeekTime: cumulativeSeek,
            request: req,
            matchResult,
        });

        currentHead = req.track;
        orderedRequests.push(req);
    }

    const executionTimeMs = performance.now() - start;

    return {
        result: {
            order: orderedRequests,
            totalSeekTime: cumulativeSeek,
            seekSequence,
            executionTimeMs,
        },
        steps,
    };
}

// --- Dual Simulation (FCFS + SSTF comparison) -------------------------------

export interface DualSimResult {
    fcfs: { result: FCFSResult; steps: SimulationStep[] };
    sstf: { result: SSTFResult; steps: SimulationStep[] };
    improvement: number;
    fcfsTotal: number;
    sstfTotal: number;
    winner: "fcfs" | "sstf" | "tie";
}

export function runDualSimulation(
    initialHead: number,
    trackRequests: number[],
    patternOrConfig: string | PatternSearchConfig,
    blockDataMap?: Map<number, string>
): DualSimResult {
    const fcfs = runFCFS(initialHead, trackRequests, patternOrConfig, blockDataMap);
    const sstf = runSSTF(initialHead, trackRequests, patternOrConfig, blockDataMap);

    const fcfsTotal = fcfs.result.totalSeekTime;
    const sstfTotal = sstf.result.totalSeekTime;
    const improvement =
        fcfsTotal > 0 ? ((fcfsTotal - sstfTotal) / fcfsTotal) * 100 : 0;

    const winner =
        sstfTotal < fcfsTotal ? "sstf" : fcfsTotal < sstfTotal ? "fcfs" : "tie";

    return { fcfs, sstf, improvement, fcfsTotal, sstfTotal, winner };
}
