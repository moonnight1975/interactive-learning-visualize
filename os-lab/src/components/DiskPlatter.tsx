"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, Cpu, RotateCw } from "lucide-react";

interface DiskPlatterProps {
    rpm: number;
    sectorsPerTrack: number;
    targetSector: number;
    rotationAngle: number;
    headPosition: number;
    maxTrack: number;
    isPlaying: boolean;
    seekTimeMs: number;
    rotationalLatencyMs: number;
    storageType: "HDD" | "SSD" | "NVME";
}

// ─── Color Palette ───────────────────────────────────────────────────────────

const COLORS = {
    platter: "rgba(15, 23, 42, 0.95)",
    platterRing: "rgba(56, 139, 253, 0.12)",
    platterRingHover: "rgba(56, 139, 253, 0.25)",
    sector: "rgba(56, 139, 253, 0.06)",
    sectorLine: "rgba(56, 139, 253, 0.15)",
    sectorActive: "rgba(247, 144, 0, 0.6)",
    sectorTarget: "rgba(63, 185, 80, 0.7)",
    arm: "rgba(188, 140, 255, 0.9)",
    armShadow: "rgba(188, 140, 255, 0.3)",
    headDot: "rgba(247, 144, 0, 1)",
    headGlow: "rgba(247, 144, 0, 0.4)",
    spindle: "rgba(56, 139, 253, 0.8)",
    text: "rgba(125, 133, 144, 0.8)",
    trackHighlight: "rgba(56, 139, 253, 0.3)",
};

export function DiskPlatter({
    rpm,
    sectorsPerTrack,
    targetSector,
    rotationAngle,
    headPosition,
    maxTrack,
    isPlaying,
    seekTimeMs,
    rotationalLatencyMs,
    storageType,
}: DiskPlatterProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const rotationRef = useRef(0);
    const [canvasSize, setCanvasSize] = useState(380);

    // ── Responsive canvas size ───────────────────────────────────────────────

    useEffect(() => {
        const updateSize = () => {
            const w = window.innerWidth;
            if (w < 640) setCanvasSize(280);
            else if (w < 1024) setCanvasSize(340);
            else setCanvasSize(380);
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    // ── Drawing function ─────────────────────────────────────────────────────

    const draw = useCallback(
        (ctx: CanvasRenderingContext2D, timestamp: number) => {
            const size = canvasSize;
            const dpr = window.devicePixelRatio || 1;
            const cx = size / 2;
            const cy = size / 2;
            const outerR = size * 0.42;
            const innerR = size * 0.08;
            const numTracks = 8; // Visible concentric rings

            ctx.clearRect(0, 0, size * dpr, size * dpr);
            ctx.save();
            ctx.scale(dpr, dpr);

            // Rotation speed: degrees per frame at 60fps
            const degreesPerSec = (rpm / 60) * 360;
            const degreesPerFrame = degreesPerSec / 60;

            if (isPlaying) {
                rotationRef.current = (rotationRef.current + degreesPerFrame * 0.02) % 360;
            }
            const currentRotation = rotationRef.current;

            // ── Platter base (dark circle with subtle gradient) ──────────────
            const platterGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
            platterGrad.addColorStop(0, "rgba(20, 30, 50, 0.95)");
            platterGrad.addColorStop(0.5, "rgba(12, 20, 38, 0.98)");
            platterGrad.addColorStop(1, "rgba(8, 14, 28, 1)");

            ctx.beginPath();
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
            ctx.fillStyle = platterGrad;
            ctx.fill();

            // Outer rim glow
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(56, 139, 253, 0.2)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // ── Concentric track rings ───────────────────────────────────────
            const headTrackNorm = headPosition / maxTrack;
            const headTrackIdx = Math.round(headTrackNorm * (numTracks - 1));

            for (let t = 0; t < numTracks; t++) {
                const r = innerR + ((outerR - innerR) / numTracks) * (t + 0.5);
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);

                if (t === headTrackIdx) {
                    ctx.strokeStyle = COLORS.trackHighlight;
                    ctx.lineWidth = 3;
                    ctx.shadowColor = "rgba(56, 139, 253, 0.3)";
                    ctx.shadowBlur = 8;
                } else {
                    ctx.strokeStyle = COLORS.platterRing;
                    ctx.lineWidth = 0.5;
                    ctx.shadowBlur = 0;
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // ── Sector lines (rotating) ──────────────────────────────────────
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(((currentRotation + rotationAngle) * Math.PI) / 180);

            for (let s = 0; s < sectorsPerTrack && s < 32; s++) {
                // Only draw a subset for visual clarity
                if (sectorsPerTrack > 16 && s % Math.ceil(sectorsPerTrack / 16) !== 0 && s !== targetSector) {
                    continue;
                }
                const angle = (s / sectorsPerTrack) * Math.PI * 2 - Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                ctx.beginPath();
                ctx.moveTo(cos * innerR, sin * innerR);
                ctx.lineTo(cos * outerR * 0.98, sin * outerR * 0.98);

                if (s === targetSector) {
                    ctx.strokeStyle = COLORS.sectorTarget;
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = "rgba(63, 185, 80, 0.5)";
                    ctx.shadowBlur = 10;
                } else {
                    ctx.strokeStyle = COLORS.sectorLine;
                    ctx.lineWidth = 0.5;
                    ctx.shadowBlur = 0;
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Sector number labels for visible sectors
                if (
                    s === targetSector ||
                    s % Math.ceil(Math.max(sectorsPerTrack / 8, 1)) === 0
                ) {
                    const labelR = outerR * 0.88;
                    ctx.save();
                    ctx.fillStyle = s === targetSector ? COLORS.sectorTarget : COLORS.text;
                    ctx.font = `${s === targetSector ? "bold " : ""}${size < 320 ? 7 : 8}px 'JetBrains Mono', monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(String(s), cos * labelR, sin * labelR);
                    ctx.restore();
                }
            }

            ctx.restore();

            // ── Spindle hub ──────────────────────────────────────────────────
            const spindleGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, innerR);
            spindleGrad.addColorStop(0, "rgba(56, 139, 253, 0.6)");
            spindleGrad.addColorStop(0.6, "rgba(56, 139, 253, 0.2)");
            spindleGrad.addColorStop(1, "rgba(56, 139, 253, 0.05)");

            ctx.beginPath();
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
            ctx.fillStyle = spindleGrad;
            ctx.fill();
            ctx.strokeStyle = "rgba(56, 139, 253, 0.4)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // ── Read/Write Head Arm ──────────────────────────────────────────
            const armBaseX = cx + outerR + 20;
            const armBaseY = cy + outerR * 0.3;
            const headR = innerR + headTrackNorm * (outerR - innerR);
            const headAngle = -Math.PI * 0.5; // Head approaches from the right
            const headX = cx + Math.cos(headAngle) * headR * 0.15;
            const headY = cy - headR + 5;

            // Arm shadow
            ctx.save();
            ctx.shadowColor = COLORS.armShadow;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            // Arm line
            ctx.beginPath();
            ctx.moveTo(armBaseX, armBaseY);
            ctx.quadraticCurveTo(cx + outerR * 0.5, cy - outerR * 0.2, cx, cy - headR + 5);
            ctx.strokeStyle = COLORS.arm;
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.restore();

            // Arm pivot
            ctx.beginPath();
            ctx.arc(armBaseX, armBaseY, 6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(188, 140, 255, 0.5)";
            ctx.fill();
            ctx.strokeStyle = COLORS.arm;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Head tip (read/write element)
            ctx.save();
            ctx.shadowColor = COLORS.headGlow;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(cx, cy - headR + 5, 5, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.headDot;
            ctx.fill();
            ctx.restore();

            // Head position label
            ctx.fillStyle = COLORS.headDot;
            ctx.font = `bold ${size < 320 ? 9 : 10}px 'JetBrains Mono', monospace`;
            ctx.textAlign = "center";
            ctx.fillText(`Track ${headPosition}`, cx, cy - headR - 10);

            // ── Storage type badge ───────────────────────────────────────────
            ctx.fillStyle =
                storageType === "SSD"
                    ? "rgba(63, 185, 80, 0.8)"
                    : storageType === "NVME"
                    ? "rgba(188, 140, 255, 0.8)"
                    : "rgba(56, 139, 253, 0.8)";
            ctx.font = `bold ${size < 320 ? 9 : 10}px 'JetBrains Mono', monospace`;
            ctx.textAlign = "center";
            ctx.fillText(storageType, cx, cy + outerR + 18);

            ctx.restore();
        },
        [
            canvasSize, rpm, sectorsPerTrack, targetSector, rotationAngle,
            headPosition, maxTrack, isPlaying, storageType,
        ]
    );

    // ── Animation loop ───────────────────────────────────────────────────────

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
        canvas.style.width = `${canvasSize}px`;
        canvas.style.height = `${canvasSize}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let running = true;
        const loop = (ts: number) => {
            if (!running) return;
            draw(ctx, ts);
            animationRef.current = requestAnimationFrame(loop);
        };
        animationRef.current = requestAnimationFrame(loop);

        return () => {
            running = false;
            cancelAnimationFrame(animationRef.current);
        };
    }, [draw, canvasSize]);

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="font-mono font-semibold text-sm text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-purple)]" />
                    DISK PLATTER VISUALIZATION
                </h2>
                <div className="flex items-center gap-3">
                    {storageType === "HDD" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)]">
                            <RotateCw size={10} className={isPlaying ? "animate-spin" : ""} />
                            {rpm} RPM
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)]">
                            <Cpu size={10} />
                            Solid-state access
                        </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold ${
                        storageType === "SSD"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : storageType === "NVME"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                        {storageType}
                    </span>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-5">
                {/* Canvas */}
                <div className="relative flex-shrink-0">
                    <canvas
                        ref={canvasRef}
                        className="rounded-2xl"
                        style={{ width: canvasSize, height: canvasSize }}
                    />
                    {/* Pulse overlay when seeking */}
                    {isPlaying && seekTimeMs > 0 && (
                        <motion.div
                            className="absolute inset-0 rounded-2xl border-2 border-orange-500/30"
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    )}
                </div>

                {/* I/O Timing Breakdown */}
                <div className="flex-1 min-w-0 w-full space-y-3">
                    <h3 className="font-mono text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">
                        I/O Access Time Breakdown
                    </h3>

                    {/* Seek Time */}
                    <TimingBar
                        label="Seek Time"
                        value={seekTimeMs}
                        unit="ms"
                        color="var(--accent-blue)"
                        maxValue={15}
                        icon={<HardDrive size={11} />}
                        description="Head arm repositioning"
                    />

                    {/* Rotational Latency */}
                    <TimingBar
                        label="Rotation Delay"
                        value={rotationalLatencyMs}
                        unit="ms"
                        color="var(--accent-purple)"
                        maxValue={10}
                        icon={<RotateCw size={11} />}
                        description="Waiting for sector to rotate"
                    />

                    {/* Total */}
                    <div className="pt-2 border-t border-[rgba(56,139,253,0.1)]">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[var(--text-primary)] uppercase">
                                Total I/O Wait
                            </span>
                            <span className="text-sm font-mono font-bold text-[var(--accent-orange)]">
                                {(seekTimeMs + rotationalLatencyMs).toFixed(2)} ms
                            </span>
                        </div>
                    </div>

                    {/* Formula */}
                    <div className="rounded-lg p-3 bg-[rgba(240,230,140,0.04)] border border-[rgba(240,230,140,0.12)]">
                        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase mb-1">
                            Access Time Formula
                        </p>
                        <p className="text-[10px] font-mono text-[var(--accent-yellow)] leading-relaxed">
                            T<sub>access</sub> = T<sub>seek</sub> + T<sub>rotation</sub> + T<sub>transfer</sub>
                        </p>
                        {storageType === "HDD" ? (
                            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1">
                                Avg rotation = {(60 / rpm * 1000 / 2).toFixed(2)}ms (½ revolution at {rpm} RPM)
                            </p>
                        ) : (
                            <p className="text-[9px] font-mono text-[var(--text-muted)] mt-1">
                                {storageType} removes rotational wait, so access time is dominated by controller and transfer cost.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Timing Bar Sub-component ────────────────────────────────────────────────

function TimingBar({
    label,
    value,
    unit,
    color,
    maxValue,
    icon,
    description,
}: {
    label: string;
    value: number;
    unit: string;
    color: string;
    maxValue: number;
    icon: React.ReactNode;
    description: string;
}) {
    const pct = Math.min((value / maxValue) * 100, 100);

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <span style={{ color }} className="opacity-70">
                        {icon}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                        {label}
                    </span>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color }}>
                    {value.toFixed(2)} {unit}
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-[rgba(56,139,253,0.08)] overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                />
            </div>
            <p className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">
                {description}
            </p>
        </div>
    );
}
