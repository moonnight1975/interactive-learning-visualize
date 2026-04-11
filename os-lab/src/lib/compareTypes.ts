/**
 * compareTypes.ts — NGILP Comparison Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors the Pydantic models in backend/main.py exactly.
 * Enhanced with timing metrics and performance delta.
 */

export type OSAlgoName = "FCFS" | "SSTF" | "SCAN" | "C-SCAN" | "LOOK" | "C-LOOK";

export type StorageType = "HDD" | "SSD" | "NVME";

export interface CompareRequest {
    requests: number[];
    algorithms: OSAlgoName[];
    head_start: number;
    max_track?: number;
    direction?: "UP" | "DOWN";
    rpm?: number;
    storage_type?: StorageType;
}

export interface AlgorithmComparisonResult {
    algorithm: OSAlgoName;
    total_seek_time: number;
    avg_seek_per_op: number;
    max_single_seek: number;
    /** 0–100 where 100 = least total seek in the group */
    throughput_score: number;
    /** 0–1 where 1 = perfectly consistent step sizes */
    consistency_score: number;
    step_count: number;
    head_path: number[];
    is_winner: boolean;
    /** Total I/O time including rotational latency (ms) */
    total_time_ms: number;
    /** Average per-request access time (ms) */
    avg_access_time_ms: number;
    /** Average throughput (MB/s) */
    avg_throughput_mbps: number;
    /** Performance improvement vs worst performer (%) */
    performance_delta_pct: number;
}

export interface CompareResponse {
    results: AlgorithmComparisonResult[];
    winner: OSAlgoName;
    input_summary: {
        requests: number[];
        head_start: number;
        algorithms: OSAlgoName[];
        max_track: number;
    };
    /** Human-readable performance analysis */
    performance_summary: string;
    /** Timing breakdown by algorithm */
    timing_summary: {
        storage_type: string;
        rpm: number;
        algorithms: Record<string, {
            total_time_ms: number;
            avg_access_time_ms: number;
            avg_throughput_mbps: number;
        }>;
    };
}

/** Storage comparison types */
export interface StorageCompareRequest {
    requests: number[];
    algorithm: OSAlgoName;
    head_start: number;
    max_track?: number;
    direction?: "UP" | "DOWN";
    rpm?: number;
}

export interface StorageCompareResponse {
    hdd: AlgorithmComparisonResult;
    ssd: AlgorithmComparisonResult;
    nvme: AlgorithmComparisonResult;
    speedup_ssd_over_hdd: number;
    speedup_nvme_over_hdd: number;
    summary: string;
}

/** Radar chart datum — all axes normalised 0–1 across the comparison group */
export interface RadarDatum {
    axis: string;
    [algo: string]: number | string;
}
