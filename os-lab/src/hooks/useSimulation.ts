/**
 * useSimulation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook that:
 *   • Opens/closes the OS scheduling WebSocket on demand
 *   • Dispatches every incoming SimulationStep into the Zustand store
 *   • Drives the playback ticker (respects playbackSpeed)
 *   • Handles exponential-backoff reconnection (max 5 retries)
 *   • Exposes a clean action API: play / pause / reset / scrubTo / setSpeed
 *
 * Components using this hook need ZERO knowledge of WebSocket internals.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSimulationStore } from "@/lib/simulationStore";
import { StreamingSimulationClient } from "@/lib/wsClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_RETRY_DELAY_MS = 500;   // first retry after 500 ms
const MAX_RETRIES = 5;
const BASE_TICK_MS = 800;          // tick interval at 1× speed

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSimulation() {
    const store = useSimulationStore();
    const clientRef = useRef<StreamingSimulationClient | null>(null);
    const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── helpers ──────────────────────────────────────────────────────────────

    const stopTicker = useCallback(() => {
        if (tickerRef.current) {
            clearInterval(tickerRef.current);
            tickerRef.current = null;
        }
    }, []);

    const startTicker = useCallback(() => {
        stopTicker();
        const intervalMs = BASE_TICK_MS / store.playbackSpeed;
        tickerRef.current = setInterval(() => {
            const { steps, currentStepIndex, isComplete, isScrubbing, isPlaying } =
                useSimulationStore.getState();

            if (!isPlaying || isScrubbing) return;

            const next = currentStepIndex + 1;
            if (next >= steps.length) {
                if (isComplete) {
                    stopTicker();
                    useSimulationStore.getState().setIsPlaying(false);
                }
                return; // wait for more steps to arrive
            }
            useSimulationStore.getState().setCurrentStepIndex(next);
        }, intervalMs);
    }, [store.playbackSpeed, stopTicker]);

    // ── open connection ───────────────────────────────────────────────────────

    const openConnection = useCallback(() => {
        const state = useSimulationStore.getState();
        state.setWsStatus("connecting");
        state.setWsError(null);

        const config = state.buildConfig();
        clientRef.current = new StreamingSimulationClient();

        clientRef.current.executeSimulation(
            config,
            // onStep
            (step) => {
                useSimulationStore.getState().appendStep(step);
            },
            // onComplete
            (metrics) => {
                useSimulationStore.getState().setFinalMetrics(metrics);
                useSimulationStore.getState().setWsStatus("closed");
                useSimulationStore.getState().setIsComplete(true);
                useSimulationStore.getState().resetRetry();
            },
            // onError — trigger exponential backoff
            (err) => {
                const s = useSimulationStore.getState();
                s.setWsStatus("error");
                s.setWsError(err);
                s.setIsPlaying(false);
                stopTicker();

                if (s.retryCount < MAX_RETRIES) {
                    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, s.retryCount);
                    s.incrementRetry();
                    retryTimerRef.current = setTimeout(() => {
                        openConnection();
                    }, delay);
                } else {
                    s.setWsError(`Connection failed after ${MAX_RETRIES} attempts: ${err}`);
                }
            },
            // onOpen
            () => {
                useSimulationStore.getState().setWsStatus("open");
            }
        );
    }, [stopTicker]);

    // ── public API ────────────────────────────────────────────────────────────

    /** Start / resume playback. Opens WS if not yet started. */
    const play = useCallback(() => {
        const s = useSimulationStore.getState();
        if (s.wsStatus === "idle") {
            openConnection();
        }
        s.setIsPlaying(true);
        startTicker();
    }, [openConnection, startTicker]);

    /** Pause playback without closing the connection. */
    const pause = useCallback(() => {
        useSimulationStore.getState().setIsPlaying(false);
        stopTicker();
    }, [stopTicker]);

    /** Full reset: close WS, clear all steps, return to idle. */
    const reset = useCallback(() => {
        stopTicker();
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        clientRef.current?.disconnect();
        clientRef.current = null;
        useSimulationStore.getState().resetSimulation();
    }, [stopTicker]);

    /**
     * Scrub to an arbitrary step index.
     * Works fully offline — only reads from the already-buffered steps[].
     */
    const scrubTo = useCallback((stepIndex: number) => {
        const { steps } = useSimulationStore.getState();
        const clamped = Math.max(0, Math.min(stepIndex, steps.length - 1));
        const s = useSimulationStore.getState();
        s.setIsScrubbing(true);
        s.setIsPlaying(false);
        stopTicker();
        s.setCurrentStepIndex(clamped);
        // Release scrub lock after a short debounce
        setTimeout(() => {
            useSimulationStore.getState().setIsScrubbing(false);
        }, 150);
    }, [stopTicker]);

    /**
     * Change playback speed multiplier.
     * If currently playing, restarts the ticker at the new rate.
     */
    const setSpeed = useCallback((multiplier: number) => {
        useSimulationStore.getState().setPlaybackSpeed(multiplier);
        if (useSimulationStore.getState().isPlaying) {
            startTicker();
        }
    }, [startTicker]);

    // ── cleanup on unmount ────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            stopTicker();
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            clientRef.current?.disconnect();
        };
    }, [stopTicker]);

    // ── restart ticker when speed changes while playing ───────────────────────

    useEffect(() => {
        if (store.isPlaying) startTicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.playbackSpeed]);

    return { play, pause, reset, scrubTo, setSpeed };
}
