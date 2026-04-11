/**
 * wsClient.ts — NGILP WebSocket Client Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Enhanced with:
 *  • Rotational latency / timing fields on OS steps
 *  • Page fault data fields
 *  • Storage type configuration
 *  • Complexity analysis fields on AOA metrics
 */

export interface WebSocketConfig {
    algorithm_name: "FCFS" | "SSTF" | "SCAN" | "C-SCAN" | "LOOK" | "C-LOOK";
    initial_head: number;
    requests: number[];
    max_track?: number;
    direction?: "UP" | "DOWN";
    // Physics engine config (NGILP)
    rpm?: number;
    sector_size_bytes?: number;
    sectors_per_track?: number;
    storage_type?: "HDD" | "SSD" | "NVME";
    // Page fault config
    enable_page_faults?: boolean;
    memory_pages?: number;
}

export interface WsSimulationStep {
    step_index: number;
    head_position: number;
    queue_state: number[];
    seek_distance_this_step: number;
    cumulative_seek: number;
    algorithm_decision_reason: string;
    // Physics timing (NGILP)
    seek_time_ms: number;
    rotational_latency_ms: number;
    transfer_time_ms: number;
    total_access_time_ms: number;
    cumulative_time_ms: number;
    throughput_mbps: number;
    // Sector visualization
    target_sector: number;
    current_rotation_angle: number;
    // Page fault data
    page_fault: boolean | null;
    page_fault_penalty_ms: number;
    memory_state: number[] | null;
    evicted_page: number | null;
}

export interface WsMetricSet {
    total_seek_distance: number;
    request_count: number;
    average_seek_distance: number;
    // Extended timing metrics (NGILP)
    total_time_ms: number;
    avg_access_time_ms: number;
    avg_rotational_latency_ms: number;
    avg_throughput_mbps: number;
    storage_type: string;
    rpm: number;
    // Page fault stats
    page_fault_count: number;
    page_hit_count: number;
    page_fault_rate: number;
    total_page_fault_penalty_ms: number;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function trimTrailingSlash(value: string): string {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readConfiguredBaseUrl(): string | undefined {
    const processRef = globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
    };

    return processRef.process?.env?.NEXT_PUBLIC_WS_BASE_URL?.trim();
}

function resolveWebSocketBaseUrl(defaultPort: number): string {
    const configuredBase = readConfiguredBaseUrl();
    if (configuredBase) {
        return trimTrailingSlash(configuredBase);
    }

    if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.hostname}:${defaultPort}`;
    }

    return `ws://127.0.0.1:${defaultPort}`;
}

function buildWebSocketUrl(path: string, explicitUrl?: string): string {
    if (explicitUrl) {
        return explicitUrl;
    }

    return `${resolveWebSocketBaseUrl(8000)}${path}`;
}

export class StreamingSimulationClient {
    private ws: WebSocket | null = null;
    private readonly url: string;

    constructor(url?: string) {
        this.url = buildWebSocketUrl("/ws/simulate/os", url);
    }

    public executeSimulation(
        config: WebSocketConfig,
        onStep: (step: WsSimulationStep) => void,
        onComplete: (metrics: WsMetricSet) => void,
        onError: (err: string) => void,
        onOpen?: () => void
    ) {
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                onOpen?.();
                this.ws?.send(JSON.stringify(config));
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === "SIM_END") {
                    onComplete(data.metrics);
                    this.disconnect();
                } else if (data.type === "ERROR") {
                    onError(data.message);
                    this.disconnect();
                } else if (data.step_index !== undefined) {
                    onStep(data as WsSimulationStep);
                }
            };

            this.ws.onerror = () => {
                onError("Failed to connect to the simulation backend at " + this.url);
                this.disconnect();
            };
        } catch (error: unknown) {
            onError(getErrorMessage(error));
        }
    }

    public disconnect() {
        if (this.ws && this.ws.readyState < WebSocket.CLOSING) {
            this.ws.close();
        }
        this.ws = null;
    }
}

// ----------------------------------------------------
// AOA String Matching WebSocket Mappings
// ----------------------------------------------------

export interface StringSimulationConfig {
    algorithm_name: "NAIVE" | "KMP" | "RABIN_KARP" | "BOYER_MOORE";
    text: string;
    pattern: string;
    case_sensitive: boolean;
    whole_word: boolean;
}

export interface PatternBreakdown {
    pattern: string;
    matches: number[];
    comparisons: number;
    count: number;
}

export interface StringMetricSet {
    algorithm: string;
    total_comparisons: number;
    matches: number[];
    execution_time_ms: number;
    pattern_breakdown: PatternBreakdown[];
    // Complexity analysis (NGILP)
    time_complexity: string;
    space_complexity: string;
    comparison_efficiency: number;
}

export interface AOAStateInternal {
    i: number;
    j: number;
    match_found: boolean;
    lps?: number[];
    text_hash?: number;
    pattern_hash?: number;
    bad_char_table?: Record<string, number>;
}

export interface AOASimulationStep {
    step_index: number;
    pointers: AOAStateInternal;
    comparisons: number;
    algorithm_decision_reason: string;
}

export class StringSimulationClient {
    private ws: WebSocket | null = null;
    private readonly url: string;

    constructor(url?: string) {
        this.url = buildWebSocketUrl("/ws/simulate/aoa", url);
    }

    public executeSimulation(
        config: StringSimulationConfig,
        onStep: (step: AOASimulationStep) => void,
        onComplete: (metrics: StringMetricSet) => void,
        onError: (err: string) => void
    ) {
        try {
            this.ws = new WebSocket(this.url);
            this.ws.onopen = () => this.ws?.send(JSON.stringify(config));
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "SIM_END") {
                    onComplete(data.metrics);
                    this.disconnect();
                } else if (data.type === "ERROR") {
                    onError(data.message);
                    this.disconnect();
                } else if (data.step_index !== undefined) {
                    onStep(data as AOASimulationStep);
                }
            };
            this.ws.onerror = () => { onError("Failed to connect"); this.disconnect(); };
        } catch (error: unknown) { onError(getErrorMessage(error)); }
    }
    public disconnect() {
        if (this.ws && this.ws.readyState < WebSocket.CLOSING) {
            this.ws.close();
        }
        this.ws = null;
    }
}
