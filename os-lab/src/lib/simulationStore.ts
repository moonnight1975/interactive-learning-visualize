/**
 * simulationStore.ts — NGILP Zustand Store
 * ─────────────────────────────────────────────────────────────────────────────
 * Enhanced with:
 *   • diskConfigSlice  — RPM, sector size, storage type, page fault settings
 *   • Extended timing selectors for rotational latency / throughput
 *   • Storage type comparison state
 *
 * Zero simulation logic lives here — this is purely reactive state.
 */

import { create } from "zustand";
import type { WsSimulationStep, WsMetricSet, WebSocketConfig } from "./wsClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

export type OSAlgorithm = "FCFS" | "SSTF" | "SCAN";

export type StorageType = "HDD" | "SSD" | "NVME";

export interface AlgorithmParams {
    max_track: number;
    direction: "UP" | "DOWN";
}

export interface DiskConfig {
    rpm: number;
    sectorSizeBytes: number;
    sectorsPerTrack: number;
    storageType: StorageType;
    enablePageFaults: boolean;
    memoryPages: number;
}

// ─── Slice shapes ─────────────────────────────────────────────────────────────

interface ConnectionSlice {
    wsStatus: WsStatus;
    wsError: string | null;
    retryCount: number;
    maxRetries: number;
    // actions
    setWsStatus: (status: WsStatus) => void;
    setWsError: (err: string | null) => void;
    incrementRetry: () => void;
    resetRetry: () => void;
}

interface SimulationSlice {
    steps: WsSimulationStep[];
    currentStepIndex: number;
    isPlaying: boolean;
    isScrubbing: boolean;
    isComplete: boolean;
    playbackSpeed: number;   // multiplier — 1× default
    finalMetrics: WsMetricSet | null;
    // actions
    appendStep: (step: WsSimulationStep) => void;
    setCurrentStepIndex: (index: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setIsScrubbing: (scrubbing: boolean) => void;
    setIsComplete: (complete: boolean) => void;
    setPlaybackSpeed: (speed: number) => void;
    setFinalMetrics: (metrics: WsMetricSet) => void;
    resetSimulation: () => void;
}

interface ConfigSlice {
    algorithm: OSAlgorithm;
    initialHead: number;
    requests: number[];
    params: AlgorithmParams;
    diskConfig: DiskConfig;
    // actions
    setAlgorithm: (algo: OSAlgorithm) => void;
    setInitialHead: (head: number) => void;
    setRequests: (reqs: number[]) => void;
    setParams: (params: Partial<AlgorithmParams>) => void;
    setDiskConfig: (config: Partial<DiskConfig>) => void;
    buildConfig: () => WebSocketConfig;
}

// ─── Combined store type ──────────────────────────────────────────────────────

export type SimulationStore = ConnectionSlice & SimulationSlice & ConfigSlice;

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULT_PARAMS: AlgorithmParams = { max_track: 199, direction: "UP" };

const DEFAULT_DISK_CONFIG: DiskConfig = {
    rpm: 7200,
    sectorSizeBytes: 512,
    sectorsPerTrack: 63,
    storageType: "HDD",
    enablePageFaults: false,
    memoryPages: 4,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationStore>((set, get) => ({
    // ── connectionSlice ──────────────────────────────────────────────────────
    wsStatus: "idle",
    wsError: null,
    retryCount: 0,
    maxRetries: 5,

    setWsStatus: (status) => set({ wsStatus: status }),
    setWsError: (err) => set({ wsError: err }),
    incrementRetry: () => set((s) => ({ retryCount: s.retryCount + 1 })),
    resetRetry: () => set({ retryCount: 0 }),

    // ── simulationSlice ──────────────────────────────────────────────────────
    steps: [],
    currentStepIndex: -1,
    isPlaying: false,
    isScrubbing: false,
    isComplete: false,
    playbackSpeed: 1,
    finalMetrics: null,

    appendStep: (step) =>
        set((s) => ({ steps: [...s.steps, step] })),

    setCurrentStepIndex: (index) =>
        set({ currentStepIndex: index }),

    setIsPlaying: (playing) =>
        set({ isPlaying: playing }),

    setIsScrubbing: (scrubbing) =>
        set({ isScrubbing: scrubbing }),

    setIsComplete: (complete) =>
        set({ isComplete: complete }),

    setPlaybackSpeed: (speed) =>
        set({ playbackSpeed: speed }),

    setFinalMetrics: (metrics) =>
        set({ finalMetrics: metrics }),

    resetSimulation: () =>
        set({
            steps: [],
            currentStepIndex: -1,
            isPlaying: false,
            isScrubbing: false,
            isComplete: false,
            finalMetrics: null,
            wsStatus: "idle",
            wsError: null,
            retryCount: 0,
        }),

    // ── configSlice ──────────────────────────────────────────────────────────
    algorithm: "FCFS",
    initialHead: 53,
    requests: [98, 183, 37, 122, 14, 124, 65, 67],
    params: DEFAULT_PARAMS,
    diskConfig: DEFAULT_DISK_CONFIG,

    setAlgorithm: (algo) => set({ algorithm: algo }),
    setInitialHead: (head) => set({ initialHead: head }),
    setRequests: (reqs) => set({ requests: reqs }),
    setParams: (p) =>
        set((s) => ({ params: { ...s.params, ...p } })),
    setDiskConfig: (config) =>
        set((s) => ({ diskConfig: { ...s.diskConfig, ...config } })),

    buildConfig: (): WebSocketConfig => {
        const { algorithm, initialHead, requests, params, diskConfig } = get();
        return {
            algorithm_name: algorithm,
            initial_head: initialHead,
            requests,
            max_track: params.max_track,
            direction: params.direction,
            rpm: diskConfig.rpm,
            sector_size_bytes: diskConfig.sectorSizeBytes,
            sectors_per_track: diskConfig.sectorsPerTrack,
            storage_type: diskConfig.storageType,
            enable_page_faults: diskConfig.enablePageFaults,
            memory_pages: diskConfig.memoryPages,
        };
    },
}));

// ─── Selectors (stable refs for consumer components) ─────────────────────────

export const selectCurrentStep = (s: SimulationStore) =>
    s.currentStepIndex >= 0 ? s.steps[s.currentStepIndex] ?? null : null;

export const selectTotalSeekDistance = (s: SimulationStore) =>
    s.currentStepIndex >= 0 ? (s.steps[s.currentStepIndex]?.cumulative_seek ?? 0) : 0;

export const selectTotalTimeMs = (s: SimulationStore) =>
    s.currentStepIndex >= 0 ? (s.steps[s.currentStepIndex]?.cumulative_time_ms ?? 0) : 0;

export const selectCurrentThroughput = (s: SimulationStore) =>
    s.currentStepIndex >= 0 ? (s.steps[s.currentStepIndex]?.throughput_mbps ?? 0) : 0;

export const selectConnectionStatus = (s: SimulationStore) => ({
    wsStatus: s.wsStatus,
    wsError: s.wsError,
    retryCount: s.retryCount,
});

export const selectPlayback = (s: SimulationStore) => ({
    isPlaying: s.isPlaying,
    isScrubbing: s.isScrubbing,
    isComplete: s.isComplete,
    currentStepIndex: s.currentStepIndex,
    totalSteps: s.steps.length,
    playbackSpeed: s.playbackSpeed,
});

export const selectDiskConfig = (s: SimulationStore) => s.diskConfig;

export const selectTimingMetrics = (s: SimulationStore) => {
    const step = s.currentStepIndex >= 0 ? s.steps[s.currentStepIndex] : null;
    return {
        seekTimeMs: step?.seek_time_ms ?? 0,
        rotationalLatencyMs: step?.rotational_latency_ms ?? 0,
        transferTimeMs: step?.transfer_time_ms ?? 0,
        totalAccessTimeMs: step?.total_access_time_ms ?? 0,
        cumulativeTimeMs: step?.cumulative_time_ms ?? 0,
        throughputMbps: step?.throughput_mbps ?? 0,
        targetSector: step?.target_sector ?? 0,
        rotationAngle: step?.current_rotation_angle ?? 0,
    };
};

export const selectPageFaultData = (s: SimulationStore) => {
    const step = s.currentStepIndex >= 0 ? s.steps[s.currentStepIndex] : null;
    return {
        pageFault: step?.page_fault ?? null,
        pageFaultPenaltyMs: step?.page_fault_penalty_ms ?? 0,
        memoryState: step?.memory_state ?? null,
        evictedPage: step?.evicted_page ?? null,
    };
};
