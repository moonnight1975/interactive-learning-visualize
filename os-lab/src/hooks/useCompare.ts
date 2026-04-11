/**
 * useCompare.ts — NGILP Comparison Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Enhanced with:
 *  • Storage type and RPM forwarding
 *  • Storage comparison endpoint support
 *  • Performance summary retrieval
 */

"use client";

import { useState, useCallback } from "react";
import type {
    CompareRequest,
    CompareResponse,
    StorageCompareRequest,
    StorageCompareResponse,
} from "@/lib/compareTypes";

function trimTrailingSlash(value: string): string {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readConfiguredBaseUrl(): string | undefined {
    const processRef = globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
    };

    return processRef.process?.env?.NEXT_PUBLIC_API_BASE_URL?.trim();
}

function resolveApiBase(): string {
    const configuredBase = readConfiguredBaseUrl();
    if (configuredBase) {
        return trimTrailingSlash(configuredBase);
    }

    if (typeof window !== "undefined") {
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }

    return "http://127.0.0.1:8000";
}

export function useCompare() {
    const [data, setData] = useState<CompareResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async (req: CompareRequest) => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const base = resolveApiBase();
            const res = await fetch(`${base}/api/compare`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status}: ${text}`);
            }
            const json: CompareResponse = await res.json();
            setData(json);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    return { data, loading, error, run, reset };
}

/** Hook for HDD vs SSD vs NVMe storage comparison */
export function useStorageCompare() {
    const [data, setData] = useState<StorageCompareResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async (req: StorageCompareRequest) => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const base = resolveApiBase();
            const res = await fetch(`${base}/api/compare-storage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status}: ${text}`);
            }
            const json: StorageCompareResponse = await res.json();
            setData(json);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
    }, []);

    return { data, loading, error, run, reset };
}
