import asyncio
import json
import math
import random
import time
from abc import ABC, abstractmethod
from typing import List, AsyncGenerator, Generator, Dict, Any, Literal, Optional

from pydantic import BaseModel, Field
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# =========================================
# Shared Models / Definitions
# =========================================

# ─── Disk Physics Constants ─────────────────────────────────────────────────

class DiskPhysics:
    """Encapsulates the physics model for HDD / SSD I/O timing calculations."""

    # HDD defaults (7200 RPM consumer drive)
    DEFAULT_RPM = 7200
    DEFAULT_SECTORS_PER_TRACK = 63
    DEFAULT_SECTOR_SIZE_BYTES = 512
    SEEK_TIME_PER_TRACK_MS = 0.1          # ms per track of seek distance
    FULL_STROKE_SEEK_MS = 12.0            # max seek across entire platter

    # SSD constants (near-instant, no mechanical parts)
    SSD_ACCESS_TIME_MS = 0.05             # ~50 microseconds
    SSD_THROUGHPUT_MBPS = 550.0           # typical SATA SSD

    # NVMe constants
    NVME_ACCESS_TIME_MS = 0.02            # ~20 microseconds
    NVME_THROUGHPUT_MBPS = 3500.0         # typical NVMe

    @staticmethod
    def rotation_time_ms(rpm: int) -> float:
        """Time for one full revolution in milliseconds."""
        return (60.0 / rpm) * 1000.0

    @staticmethod
    def avg_rotational_latency_ms(rpm: int) -> float:
        """Average rotational latency = half a revolution."""
        return DiskPhysics.rotation_time_ms(rpm) / 2.0

    @staticmethod
    def seek_time_ms(seek_distance: int, max_track: int) -> float:
        """Calculate seek time based on distance (linear model)."""
        if seek_distance == 0:
            return 0.0
        # Scale seek time: proportional to distance, capped at full stroke
        ratio = seek_distance / max(max_track, 1)
        return max(0.5, ratio * DiskPhysics.FULL_STROKE_SEEK_MS)

    @staticmethod
    def transfer_time_ms(sector_size_bytes: int, rpm: int, sectors_per_track: int) -> float:
        """Time to read one sector once it's under the head."""
        rev_time_ms = DiskPhysics.rotation_time_ms(rpm)
        return rev_time_ms / sectors_per_track

    @staticmethod
    def total_access_time_ms(
        seek_distance: int,
        max_track: int,
        rpm: int = 7200,
        sector_size_bytes: int = 512,
        sectors_per_track: int = 63,
        storage_type: str = "HDD",
    ) -> Dict[str, float]:
        """Calculate complete I/O access time breakdown."""
        if storage_type == "SSD":
            return {
                "seek_time_ms": 0.0,
                "rotational_latency_ms": 0.0,
                "transfer_time_ms": DiskPhysics.SSD_ACCESS_TIME_MS,
                "total_access_time_ms": DiskPhysics.SSD_ACCESS_TIME_MS,
                "throughput_mbps": DiskPhysics.SSD_THROUGHPUT_MBPS,
            }
        elif storage_type == "NVME":
            return {
                "seek_time_ms": 0.0,
                "rotational_latency_ms": 0.0,
                "transfer_time_ms": DiskPhysics.NVME_ACCESS_TIME_MS,
                "total_access_time_ms": DiskPhysics.NVME_ACCESS_TIME_MS,
                "throughput_mbps": DiskPhysics.NVME_THROUGHPUT_MBPS,
            }

        # HDD model
        seek_ms = DiskPhysics.seek_time_ms(seek_distance, max_track)
        rot_latency = DiskPhysics.avg_rotational_latency_ms(rpm)
        xfer_ms = DiskPhysics.transfer_time_ms(sector_size_bytes, rpm, sectors_per_track)
        total_ms = seek_ms + rot_latency + xfer_ms

        # Throughput: sector_size / total_time
        throughput = (sector_size_bytes / (total_ms / 1000.0)) / (1024 * 1024) if total_ms > 0 else 0

        return {
            "seek_time_ms": round(seek_ms, 4),
            "rotational_latency_ms": round(rot_latency, 4),
            "transfer_time_ms": round(xfer_ms, 4),
            "total_access_time_ms": round(total_ms, 4),
            "throughput_mbps": round(throughput, 4),
        }


# ─── Page Fault Model ────────────────────────────────────────────────────────

class PageFaultEngine:
    """Simulates page faults for virtual memory integration."""

    PAGE_FAULT_PENALTY_MS = 8.0  # disk I/O penalty for page fault
    MEMORY_SIZE = 4              # number of page frames

    def __init__(self, memory_size: int = 4):
        self.memory_size = memory_size
        self.pages_in_memory: List[int] = []
        self.page_faults = 0
        self.page_hits = 0

    def access_page(self, page_id: int) -> Dict[str, Any]:
        """LRU page replacement. Returns fault info."""
        if page_id in self.pages_in_memory:
            self.page_hits += 1
            # Move to most recently used
            self.pages_in_memory.remove(page_id)
            self.pages_in_memory.append(page_id)
            return {
                "page_fault": False,
                "page_id": page_id,
                "penalty_ms": 0.0,
                "memory_state": self.pages_in_memory.copy(),
                "evicted_page": None,
            }

        self.page_faults += 1
        evicted = None
        if len(self.pages_in_memory) >= self.memory_size:
            evicted = self.pages_in_memory.pop(0)  # LRU eviction
        self.pages_in_memory.append(page_id)

        return {
            "page_fault": True,
            "page_id": page_id,
            "penalty_ms": self.PAGE_FAULT_PENALTY_MS,
            "memory_state": self.pages_in_memory.copy(),
            "evicted_page": evicted,
        }

    def get_stats(self) -> Dict[str, Any]:
        total = self.page_faults + self.page_hits
        return {
            "total_accesses": total,
            "page_faults": self.page_faults,
            "page_hits": self.page_hits,
            "fault_rate": round(self.page_faults / max(total, 1), 4),
            "hit_rate": round(self.page_hits / max(total, 1), 4),
        }


# ─── OS Simulation Models ────────────────────────────────────────────────────

class OSSimulationConfig(BaseModel):
    algorithm_name: Literal["FCFS", "SSTF", "SCAN", "C-SCAN", "LOOK", "C-LOOK"]
    initial_head: int
    requests: List[int]
    max_track: int = 199
    direction: Literal["UP", "DOWN"] = "UP"
    # Physics engine config
    rpm: int = 7200
    sector_size_bytes: int = 512
    sectors_per_track: int = 63
    storage_type: Literal["HDD", "SSD", "NVME"] = "HDD"
    # Page fault simulation
    enable_page_faults: bool = False
    memory_pages: int = 4

class OSSimulationStep(BaseModel):
    step_index: int
    head_position: int
    queue_state: List[int]
    seek_distance_this_step: int
    cumulative_seek: int
    algorithm_decision_reason: str
    # Physics timing (new in NGILP)
    seek_time_ms: float = 0.0
    rotational_latency_ms: float = 0.0
    transfer_time_ms: float = 0.0
    total_access_time_ms: float = 0.0
    cumulative_time_ms: float = 0.0
    throughput_mbps: float = 0.0
    # Sector visualization
    target_sector: int = 0
    current_rotation_angle: float = 0.0
    # Page fault data (optional)
    page_fault: Optional[bool] = None
    page_fault_penalty_ms: float = 0.0
    memory_state: Optional[List[int]] = None
    evicted_page: Optional[int] = None

class OSMetricSet(BaseModel):
    total_seek_distance: int
    request_count: int
    average_seek_distance: float
    # Extended timing metrics
    total_time_ms: float = 0.0
    avg_access_time_ms: float = 0.0
    avg_rotational_latency_ms: float = 0.0
    avg_throughput_mbps: float = 0.0
    storage_type: str = "HDD"
    rpm: int = 7200
    # Page fault stats
    page_fault_count: int = 0
    page_hit_count: int = 0
    page_fault_rate: float = 0.0
    total_page_fault_penalty_ms: float = 0.0

class OSAlgorithm(ABC):
    def __init__(self, requests: List[int], params: Dict[str, Any]):
        self.requests = requests.copy()
        self.params = params
        self.cumulative_seek = 0
        self.cumulative_time_ms = 0.0
        self.current_head = params.get('initial_head', 0)
        self.step_index = 0
        self.sequence = [self.current_head]
        # Physics config
        self.rpm = params.get('rpm', 7200)
        self.sector_size = params.get('sector_size_bytes', 512)
        self.sectors_per_track = params.get('sectors_per_track', 63)
        self.storage_type = params.get('storage_type', 'HDD')
        self.max_track = params.get('max_track', 199)
        # Page fault engine
        self.enable_page_faults = params.get('enable_page_faults', False)
        self.page_engine = PageFaultEngine(params.get('memory_pages', 4)) if self.enable_page_faults else None
        # Timing accumulators
        self.total_throughput = 0.0
        self.throughput_count = 0

    def _compute_timing(self, seek_distance: int, target_track: int) -> Dict[str, Any]:
        """Compute full I/O timing for this step."""
        timing = DiskPhysics.total_access_time_ms(
            seek_distance=seek_distance,
            max_track=self.max_track,
            rpm=self.rpm,
            sector_size_bytes=self.sector_size,
            sectors_per_track=self.sectors_per_track,
            storage_type=self.storage_type,
        )

        # Add page fault penalty if enabled
        pf_info = None
        if self.page_engine:
            page_id = target_track % 32  # Map tracks to pages
            pf_info = self.page_engine.access_page(page_id)
            if pf_info["page_fault"]:
                timing["total_access_time_ms"] += pf_info["penalty_ms"]

        self.cumulative_time_ms += timing["total_access_time_ms"]
        self.total_throughput += timing["throughput_mbps"]
        self.throughput_count += 1

        # Target sector for rotation visualization
        target_sector = target_track % self.sectors_per_track
        rotation_angle = (target_sector / self.sectors_per_track) * 360.0

        return {
            **timing,
            "cumulative_time_ms": round(self.cumulative_time_ms, 4),
            "target_sector": target_sector,
            "current_rotation_angle": round(rotation_angle, 2),
            "page_fault_info": pf_info,
        }

    @abstractmethod
    def step_generator(self) -> Generator[OSSimulationStep, None, None]: pass

    def compute_metrics(self) -> OSMetricSet:
        req_count = max(0, len(self.sequence) - 1)
        avg_throughput = self.total_throughput / max(self.throughput_count, 1)
        avg_access = self.cumulative_time_ms / max(req_count, 1)
        avg_rot = DiskPhysics.avg_rotational_latency_ms(self.rpm) if self.storage_type == "HDD" else 0

        pf_stats = self.page_engine.get_stats() if self.page_engine else {}

        return OSMetricSet(
            total_seek_distance=self.cumulative_seek,
            request_count=req_count,
            average_seek_distance=(self.cumulative_seek / req_count) if req_count > 0 else 0.0,
            total_time_ms=round(self.cumulative_time_ms, 4),
            avg_access_time_ms=round(avg_access, 4),
            avg_rotational_latency_ms=round(avg_rot, 4),
            avg_throughput_mbps=round(avg_throughput, 4),
            storage_type=self.storage_type,
            rpm=self.rpm,
            page_fault_count=pf_stats.get("page_faults", 0),
            page_hit_count=pf_stats.get("page_hits", 0),
            page_fault_rate=pf_stats.get("fault_rate", 0.0),
            total_page_fault_penalty_ms=round(pf_stats.get("page_faults", 0) * PageFaultEngine.PAGE_FAULT_PENALTY_MS, 4),
        )


class FCFS(OSAlgorithm):
    def step_generator(self):
        queue = self.requests.copy()
        while queue:
            req = queue.pop(0)
            seek_dist = abs(req - self.current_head)
            self.cumulative_seek += seek_dist

            timing = self._compute_timing(seek_dist, req)
            pf = timing.get("page_fault_info")

            self.current_head = req
            self.sequence.append(req)
            self.step_index += 1

            reason = f"Served {req} linearly via FCFS."
            if pf and pf["page_fault"]:
                reason += f" PAGE FAULT: page {pf['page_id']} loaded, evicted {pf['evicted_page']}."

            yield OSSimulationStep(
                step_index=self.step_index, head_position=req, queue_state=queue.copy(),
                seek_distance_this_step=seek_dist, cumulative_seek=self.cumulative_seek,
                algorithm_decision_reason=reason,
                seek_time_ms=timing["seek_time_ms"],
                rotational_latency_ms=timing["rotational_latency_ms"],
                transfer_time_ms=timing["transfer_time_ms"],
                total_access_time_ms=timing["total_access_time_ms"],
                cumulative_time_ms=timing["cumulative_time_ms"],
                throughput_mbps=timing["throughput_mbps"],
                target_sector=timing["target_sector"],
                current_rotation_angle=timing["current_rotation_angle"],
                page_fault=pf["page_fault"] if pf else None,
                page_fault_penalty_ms=pf["penalty_ms"] if pf else 0,
                memory_state=pf["memory_state"] if pf else None,
                evicted_page=pf["evicted_page"] if pf else None,
            )

class SSTF(OSAlgorithm):
    def step_generator(self):
        pending = self.requests.copy()
        while pending:
            closest_req = min(pending, key=lambda x: abs(x - self.current_head))
            seek_dist = abs(closest_req - self.current_head)

            timing = self._compute_timing(seek_dist, closest_req)
            pf = timing.get("page_fault_info")

            reason = f"Served {closest_req} simultaneously (0 seek)." if seek_dist == 0 else f"Served {closest_req} due to shortest seek distance ({seek_dist})."
            if pf and pf["page_fault"]:
                reason += f" PAGE FAULT: page {pf['page_id']} loaded, evicted {pf['evicted_page']}."

            self.cumulative_seek += seek_dist
            pending.remove(closest_req)
            self.current_head = closest_req
            self.sequence.append(closest_req)
            self.step_index += 1

            yield OSSimulationStep(
                step_index=self.step_index, head_position=closest_req, queue_state=pending.copy(),
                seek_distance_this_step=seek_dist, cumulative_seek=self.cumulative_seek,
                algorithm_decision_reason=reason,
                seek_time_ms=timing["seek_time_ms"],
                rotational_latency_ms=timing["rotational_latency_ms"],
                transfer_time_ms=timing["transfer_time_ms"],
                total_access_time_ms=timing["total_access_time_ms"],
                cumulative_time_ms=timing["cumulative_time_ms"],
                throughput_mbps=timing["throughput_mbps"],
                target_sector=timing["target_sector"],
                current_rotation_angle=timing["current_rotation_angle"],
                page_fault=pf["page_fault"] if pf else None,
                page_fault_penalty_ms=pf["penalty_ms"] if pf else 0,
                memory_state=pf["memory_state"] if pf else None,
                evicted_page=pf["evicted_page"] if pf else None,
            )

class SCAN(OSAlgorithm):
    def step_generator(self):
        pending = self.requests.copy()
        direction = self.params.get('direction', 'UP')
        max_track = self.params.get('max_track', 199)
        min_track = 0

        def _emit_step(target: int, reason: str, queue: List[int]) -> OSSimulationStep:
            seek_dist = abs(target - self.current_head)
            self.cumulative_seek += seek_dist

            timing = self._compute_timing(seek_dist, target)
            pf = timing.get("page_fault_info")

            if pf and pf["page_fault"]:
                reason += f" PAGE FAULT: page {pf['page_id']} loaded."

            self.current_head = target
            self.sequence.append(target)
            self.step_index += 1

            return OSSimulationStep(
                step_index=self.step_index, head_position=target, queue_state=queue.copy(),
                seek_distance_this_step=seek_dist, cumulative_seek=self.cumulative_seek,
                algorithm_decision_reason=reason,
                seek_time_ms=timing["seek_time_ms"],
                rotational_latency_ms=timing["rotational_latency_ms"],
                transfer_time_ms=timing["transfer_time_ms"],
                total_access_time_ms=timing["total_access_time_ms"],
                cumulative_time_ms=timing["cumulative_time_ms"],
                throughput_mbps=timing["throughput_mbps"],
                target_sector=timing["target_sector"],
                current_rotation_angle=timing["current_rotation_angle"],
                page_fault=pf["page_fault"] if pf else None,
                page_fault_penalty_ms=pf["penalty_ms"] if pf else 0,
                memory_state=pf["memory_state"] if pf else None,
                evicted_page=pf["evicted_page"] if pf else None,
            )

        while pending:
            if direction == 'UP':
                candidates = sorted([r for r in pending if r >= self.current_head])
                if not candidates:
                    yield _emit_step(max_track, f"Sweeping boundary {max_track} tracking UP.", pending)
                    direction = 'DOWN'
                    continue
                else:
                    target = candidates[0]
                    reason = "Sweeping UP."
            else:
                candidates = sorted([r for r in pending if r <= self.current_head], reverse=True)
                if not candidates:
                    yield _emit_step(min_track, f"Sweeping boundary {min_track} tracking DOWN.", pending)
                    direction = 'UP'
                    continue
                else:
                    target = candidates[0]
                    reason = "Sweeping DOWN."

            pending.remove(target)
            yield _emit_step(target, reason, pending)


class CSCAN(OSAlgorithm):
    def step_generator(self):
        pending = self.requests.copy()
        direction = self.params.get('direction', 'UP')
        max_track = self.params.get('max_track', 199)
        min_track = 0

        def _emit_step(target: int, reason: str, queue: List[int]) -> OSSimulationStep:
            seek_dist = abs(target - self.current_head)
            self.cumulative_seek += seek_dist
            timing = self._compute_timing(seek_dist, target)
            pf = timing.get("page_fault_info")
            if pf and pf["page_fault"]:
                reason += f" PAGE FAULT: page {pf['page_id']} loaded."
            self.current_head = target
            self.sequence.append(target)
            self.step_index += 1
            return OSSimulationStep(
                step_index=self.step_index, head_position=target, queue_state=queue.copy(),
                seek_distance_this_step=seek_dist, cumulative_seek=self.cumulative_seek,
                algorithm_decision_reason=reason, seek_time_ms=timing["seek_time_ms"],
                rotational_latency_ms=timing["rotational_latency_ms"], transfer_time_ms=timing["transfer_time_ms"],
                total_access_time_ms=timing["total_access_time_ms"], cumulative_time_ms=timing["cumulative_time_ms"],
                throughput_mbps=timing["throughput_mbps"], target_sector=timing["target_sector"],
                current_rotation_angle=timing["current_rotation_angle"], page_fault=pf["page_fault"] if pf else None,
                page_fault_penalty_ms=pf["penalty_ms"] if pf else 0, memory_state=pf["memory_state"] if pf else None,
                evicted_page=pf["evicted_page"] if pf else None,
            )

        while pending:
            if direction == 'UP':
                candidates = sorted([r for r in pending if r >= self.current_head])
                if not candidates:
                    if self.current_head != max_track:
                        yield _emit_step(max_track, f"Sweeping up to boundary {max_track}.", pending)
                    yield _emit_step(min_track, f"Jumping to boundary {min_track}.", pending)
                    direction = 'UP'
                    continue
                else:
                    target = candidates[0]
                    reason = "Sweeping UP."
            else:
                candidates = sorted([r for r in pending if r <= self.current_head], reverse=True)
                if not candidates:
                    if self.current_head != min_track:
                        yield _emit_step(min_track, f"Sweeping down to boundary {min_track}.", pending)
                    yield _emit_step(max_track, f"Jumping to boundary {max_track}.", pending)
                    direction = 'DOWN'
                    continue
                else:
                    target = candidates[0]
                    reason = "Sweeping DOWN."

            pending.remove(target)
            yield _emit_step(target, reason, pending)


class LOOK(OSAlgorithm):
    def step_generator(self):
        pending = self.requests.copy()
        direction = self.params.get('direction', 'UP')

        def _emit_step(target: int, reason: str, queue: List[int]) -> OSSimulationStep:
            seek_dist = abs(target - self.current_head)
            self.cumulative_seek += seek_dist
            timing = self._compute_timing(seek_dist, target)
            pf = timing.get("page_fault_info")
            if pf and pf["page_fault"]:
                reason += f" PAGE FAULT: page {pf['page_id']} loaded."
            self.current_head = target
            self.sequence.append(target)
            self.step_index += 1
            return OSSimulationStep(
                step_index=self.step_index, head_position=target, queue_state=queue.copy(),
                seek_distance_this_step=seek_dist, cumulative_seek=self.cumulative_seek,
                algorithm_decision_reason=reason, seek_time_ms=timing["seek_time_ms"],
                rotational_latency_ms=timing["rotational_latency_ms"], transfer_time_ms=timing["transfer_time_ms"],
                total_access_time_ms=timing["total_access_time_ms"], cumulative_time_ms=timing["cumulative_time_ms"],
                throughput_mbps=timing["throughput_mbps"], target_sector=timing["target_sector"],
                current_rotation_angle=timing["current_rotation_angle"], page_fault=pf["page_fault"] if pf else None,
                page_fault_penalty_ms=pf["penalty_ms"] if pf else 0, memory_state=pf["memory_state"] if pf else None,
                evicted_page=pf["evicted_page"] if pf else None,
            )

        while pending:
            if direction == 'UP':
                candidates = sorted([r for r in pending if r >= self.current_head])
                if not candidates:
                    direction = 'DOWN'
                    target = max(pending)
                    reason = "No more requests UP. Reversing to DOWN."
                else:
                    target = candidates[0]
                    reason = "Scanning UP to nearest request."
            else:
                candidates = sorted([r for r in pending if r <= self.current_head], reverse=True)
                if not candidates:
                    direction = 'UP'
                    target = min(pending)
                    reason = "No more requests DOWN. Reversing to UP."
                else:
                    target = candidates[0]
                    reason = "Scanning DOWN to nearest request."

            pending.remove(target)
            yield _emit_step(target, reason, pending)


class CLOOK(OSAlgorithm):
    def step_generator(self):
        pending = self.requests.copy()
        direction = self.params.get('direction', 'UP')

        def _emit_step(target: int, reason: str, queue: List[int]) -> OSSimulationStep:
            seek_dist = abs(target - self.current_head)
            self.cumulative_seek += seek_dist
            timing = self._compute_timing(seek_dist, target)
            pf = timing.get("page_fault_info")
            if pf and pf["page_fault"]:
                reason += f" PAGE FAULT: page {pf['page_id']} loaded."
            self.current_head = target
            self.sequence.append(target)
            self.step_index += 1
            return OSSimulationStep(
                step_index=self.step_index, head_position=target, queue_state=queue.copy(),
                seek_distance_this_step=seek_dist, cumulative_seek=self.cumulative_seek,
                algorithm_decision_reason=reason, seek_time_ms=timing["seek_time_ms"],
                rotational_latency_ms=timing["rotational_latency_ms"], transfer_time_ms=timing["transfer_time_ms"],
                total_access_time_ms=timing["total_access_time_ms"], cumulative_time_ms=timing["cumulative_time_ms"],
                throughput_mbps=timing["throughput_mbps"], target_sector=timing["target_sector"],
                current_rotation_angle=timing["current_rotation_angle"], page_fault=pf["page_fault"] if pf else None,
                page_fault_penalty_ms=pf["penalty_ms"] if pf else 0, memory_state=pf["memory_state"] if pf else None,
                evicted_page=pf["evicted_page"] if pf else None,
            )

        while pending:
            if direction == 'UP':
                candidates = sorted([r for r in pending if r >= self.current_head])
                if not candidates:
                    target = min(pending)
                    reason = "Circular jump to lowest request."
                else:
                    target = candidates[0]
                    reason = "Scanning UP to nearest request."
            else:
                candidates = sorted([r for r in pending if r <= self.current_head], reverse=True)
                if not candidates:
                    target = max(pending)
                    reason = "Circular jump to highest request."
                else:
                    target = candidates[0]
                    reason = "Scanning DOWN to nearest request."

            pending.remove(target)
            yield _emit_step(target, reason, pending)


class OSSimulationEngine:
    def __init__(self, config: OSSimulationConfig, max_steps: int = 10000):
        self.config = config; self.max_steps = max_steps
        algo_cls = {"FCFS": FCFS, "SSTF": SSTF, "SCAN": SCAN, "C-SCAN": CSCAN, "LOOK": LOOK, "C-LOOK": CLOOK}.get(config.algorithm_name)
        self.algo = algo_cls(
            requests=config.requests,
            params={
                'initial_head': config.initial_head,
                'max_track': config.max_track,
                'direction': config.direction,
                'rpm': config.rpm,
                'sector_size_bytes': config.sector_size_bytes,
                'sectors_per_track': config.sectors_per_track,
                'storage_type': config.storage_type,
                'enable_page_faults': config.enable_page_faults,
                'memory_pages': config.memory_pages,
            }
        )

    async def stream_steps(self) -> AsyncGenerator[OSSimulationStep, None]:
        steps = 0
        for step in self.algo.step_generator():
            if steps >= self.max_steps: raise RuntimeError("Limit exceeded")
            yield step
            steps += 1
            await asyncio.sleep(0)

# =========================================
# AOA String Matching Models
# =========================================

class AOASimulationConfig(BaseModel):
    algorithm_name: Literal["NAIVE", "KMP", "RABIN_KARP", "BOYER_MOORE"]
    text: str
    pattern: str
    case_sensitive: bool = False
    whole_word: bool = False

class AOAStateInternal(BaseModel):
    i: int
    j: int
    match_found: bool = False
    lps: Optional[List[int]] = None
    text_hash: Optional[int] = None
    pattern_hash: Optional[int] = None

class AOASimulationStep(BaseModel):
    step_index: int
    pointers: AOAStateInternal
    comparisons: int
    algorithm_decision_reason: str

class PatternBreakdown(BaseModel):
    pattern: str
    matches: List[int]
    comparisons: int
    count: int

class AOAMetricSet(BaseModel):
    algorithm: str
    total_comparisons: int
    matches: List[int]
    execution_time_ms: float
    pattern_breakdown: List[PatternBreakdown]
    # Complexity analysis (new in NGILP)
    time_complexity: str = ""
    space_complexity: str = ""
    comparison_efficiency: float = 0.0  # comparisons / (n * m) ratio

class StringAlgorithm(ABC):
    def __init__(self, config: AOASimulationConfig):
        self.config = config
        self.pattern = config.pattern if config.case_sensitive else config.pattern.lower()
        self.text = config.text if config.case_sensitive else config.text.lower()
        self.step_index = 0; self.comparisons = 0; self.matches = []
        self.start_time = time.perf_counter()
        
    def check_whole_word(self, match_idx: int) -> bool:
        if not self.config.whole_word: return True
        orig = self.config.text
        s_bound = match_idx == 0 or not orig[match_idx - 1].isalnum()
        e_bound = (match_idx + len(self.pattern) == len(orig)) or not orig[match_idx + len(self.pattern)].isalnum()
        return s_bound and e_bound

    @abstractmethod
    def step_generator(self) -> Generator[AOASimulationStep, None, None]: pass

    def compute_metrics(self) -> AOAMetricSet:
        exec_ms = (time.perf_counter() - self.start_time) * 1000
        n = len(self.text)
        m = len(self.pattern)
        max_comparisons = max(n * m, 1)
        efficiency = self.comparisons / max_comparisons

        return AOAMetricSet(
            algorithm=self.config.algorithm_name,
            total_comparisons=self.comparisons, matches=self.matches,
            execution_time_ms=exec_ms,
            pattern_breakdown=[PatternBreakdown(pattern=self.config.pattern, matches=self.matches, comparisons=self.comparisons, count=len(self.matches))],
            time_complexity=self._time_complexity(),
            space_complexity=self._space_complexity(),
            comparison_efficiency=round(efficiency, 6),
        )

    def _time_complexity(self) -> str:
        return "O(n×m)"

    def _space_complexity(self) -> str:
        return "O(1)"

# =========================================
# AOA String Matching Concrete implementations
# =========================================

class Naive(StringAlgorithm):
    def _time_complexity(self) -> str:
        return "O(n×m)"

    def _space_complexity(self) -> str:
        return "O(1)"

    def step_generator(self):
        m = len(self.pattern); n = len(self.text)
        if m == 0 or n == 0 or m > n: return
        for i in range(n - m + 1):
            j = 0
            while j < m:
                self.comparisons += 1; self.step_index += 1
                reason = f"Comparing text[{i+j}] '{self.text[i+j]}' with pattern[{j}] '{self.pattern[j]}'."
                if self.text[i+j] != self.pattern[j]:
                    yield AOASimulationStep(step_index=self.step_index, pointers=AOAStateInternal(i=i+j, j=j), comparisons=self.comparisons, algorithm_decision_reason=reason + " Mismatch.")
                    break
                yield AOASimulationStep(step_index=self.step_index, pointers=AOAStateInternal(i=i+j, j=j), comparisons=self.comparisons, algorithm_decision_reason=reason + " Match.")
                j += 1
            if j == m and self.check_whole_word(i): self.matches.append(i)

class KMP(StringAlgorithm):
    def _time_complexity(self) -> str:
        return "O(n+m)"

    def _space_complexity(self) -> str:
        return "O(m)"

    def build_lps(self):
        m = len(self.pattern)
        if m == 0: return []
        lps = [0] * m
        length = 0; i = 1
        while i < m:
            if self.pattern[i] == self.pattern[length]:
                length += 1; lps[i] = length; i += 1
            else:
                if length != 0: length = lps[length - 1]
                else: lps[i] = 0; i += 1
        return lps

    def step_generator(self):
        m = len(self.pattern); n = len(self.text)
        if m == 0 or n == 0 or m > n: return
        lps = self.build_lps()
        i = 0; j = 0
        while i < n:
            self.comparisons += 1; self.step_index += 1
            reason = f"Comparing text[{i}] '{self.text[i]}' with pattern[{j}] '{self.pattern[j]}'."
            if self.pattern[j] == self.text[i]:
                i += 1; j += 1
                reason += " Match."
            else: reason += " Mismatch."
                
            if j == m:
                match_idx = i - j
                if self.check_whole_word(match_idx): self.matches.append(match_idx)
                j = lps[j - 1]
            elif i < n and self.pattern[j] != self.text[i]:
                if j != 0:
                    j = lps[j - 1]
                    reason += f" Shifting via LPS to {j}."
                else:
                    i += 1
            yield AOASimulationStep(step_index=self.step_index, pointers=AOAStateInternal(i=min(i, n-1), j=min(j, m-1), lps=lps), comparisons=self.comparisons, algorithm_decision_reason=reason)

class RabinKarp(StringAlgorithm):
    def _time_complexity(self) -> str:
        return "O(n+m) avg, O(n×m) worst"

    def _space_complexity(self) -> str:
        return "O(1)"

    def step_generator(self):
        d = 256; q = 101
        m = len(self.pattern); n = len(self.text)
        if m == 0 or n == 0 or m > n: return
        p = 0; t = 0; h = 1
        for i in range(m-1): h = (h*d) % q
        for i in range(m):
            p = (d*p + ord(self.pattern[i])) % q; t = (d*t + ord(self.text[i])) % q
            
        for i in range(n - m + 1):
            self.comparisons += 1; self.step_index += 1
            reason = f"Window {i}: text_hash {t} vs pattern_hash {p}."
            if p == t:
                reason += " Hash Match! Inner verification."
                yield AOASimulationStep(step_index=self.step_index, pointers=AOAStateInternal(i=i, j=0, text_hash=t, pattern_hash=p), comparisons=self.comparisons, algorithm_decision_reason=reason)
                match = True
                for j in range(m):
                    self.comparisons += 1
                    if self.text[i+j] != self.pattern[j]: match = False; break
                if match and self.check_whole_word(i): self.matches.append(i)
            else:
                yield AOASimulationStep(step_index=self.step_index, pointers=AOAStateInternal(i=i, j=0, text_hash=t, pattern_hash=p), comparisons=self.comparisons, algorithm_decision_reason=reason)
            if i < n - m:
                t = (d*(t - ord(self.text[i])*h) + ord(self.text[i+m])) % q
                if t < 0: t += q

class BoyerMoore(StringAlgorithm):
    def _time_complexity(self) -> str:
        return "O(n/m) best, O(n×m) worst"

    def _space_complexity(self) -> str:
        return "O(σ)"  # alphabet size

    def build_bad_char(self):
        bad_char = {}
        for i in range(len(self.pattern)): bad_char[self.pattern[i]] = i
        return bad_char

    def step_generator(self):
        m = len(self.pattern); n = len(self.text)
        if m == 0 or n == 0 or m > n: return
        bad_char = self.build_bad_char()
        s = 0 
        while s <= n - m:
            j = m - 1
            while j >= 0 and self.pattern[j] == self.text[s + j]:
                self.comparisons += 1; self.step_index += 1
                yield AOASimulationStep(step_index=self.step_index, pointers=AOAStateInternal(i=s+j, j=j), comparisons=self.comparisons, algorithm_decision_reason=f"Matched char RTL.")
                j -= 1
            if j < 0:
                if self.check_whole_word(s): self.matches.append(s)
                s += (m - bad_char.get(self.text[s + m], -1)) if s + m < n else 1
            else:
                self.comparisons += 1; self.step_index += 1
                yield AOASimulationStep(step_index=self.step_index, pointers=AOAStateInternal(i=s+j, j=j), comparisons=self.comparisons, algorithm_decision_reason=f"Mismatch. Bad Character heuristic jump.")
                s += max(1, j - bad_char.get(self.text[s + j], -1))

class AOASimulationEngine:
    def __init__(self, config: AOASimulationConfig, max_steps: int = 150000):
        self.config = config; self.max_steps = max_steps
        algo_cls = {"NAIVE": Naive, "KMP": KMP, "RABIN_KARP": RabinKarp, "BOYER_MOORE": BoyerMoore}.get(config.algorithm_name)
        if not algo_cls: raise ValueError(f"Unknown logic '{config.algorithm_name}'.")
        self.algo = algo_cls(config)

    async def stream_steps(self) -> AsyncGenerator[AOASimulationStep, None]:
        steps = 0
        for step in self.algo.step_generator():
            if steps >= self.max_steps: raise RuntimeError("Limit exceeded")
            yield step
            steps += 1
            await asyncio.sleep(0)

# =========================================
# FastAPI Application
# =========================================

# =========================================
# Comparison Engine Models
# =========================================

class ComparisonRequest(BaseModel):
    requests: List[int] = Field(..., min_length=1, max_length=200)
    algorithms: List[Literal["FCFS", "SSTF", "SCAN", "C-SCAN", "LOOK", "C-LOOK"]] = Field(..., min_length=2, max_length=6)
    head_start: int = Field(default=53, ge=0, le=199)
    max_track: int = Field(default=199, ge=1, le=999)
    direction: Literal["UP", "DOWN"] = "UP"
    # Physics config for timing comparison
    rpm: int = Field(default=7200, ge=3600, le=15000)
    storage_type: Literal["HDD", "SSD", "NVME"] = "HDD"

class AlgorithmComparisonResult(BaseModel):
    algorithm: str
    total_seek_time: int
    avg_seek_per_op: float
    max_single_seek: int
    throughput_score: float          # 0-100, higher = more efficient
    consistency_score: float         # 0-1 normalised, higher = more consistent step sizes
    step_count: int
    head_path: List[int]
    is_winner: bool = False
    # Extended timing (new in NGILP)
    total_time_ms: float = 0.0
    avg_access_time_ms: float = 0.0
    avg_throughput_mbps: float = 0.0
    performance_delta_pct: float = 0.0  # relative improvement vs worst

class ComparisonResponse(BaseModel):
    results: List[AlgorithmComparisonResult]
    winner: str
    input_summary: Dict[str, Any]
    # Performance analysis (new in NGILP)
    performance_summary: str = ""
    timing_summary: Dict[str, Any] = {}


def _run_algorithm_sync(
    algo_name: str,
    requests: List[int],
    head_start: int,
    max_track: int,
    direction: str,
    rpm: int = 7200,
    storage_type: str = "HDD",
) -> AlgorithmComparisonResult:
    """Run one algorithm synchronously and collect full stats. Deterministic."""
    params = {
        "initial_head": head_start,
        "max_track": max_track,
        "direction": direction,
        "rpm": rpm,
        "storage_type": storage_type,
    }
    algo_cls = {"FCFS": FCFS, "SSTF": SSTF, "SCAN": SCAN, "C-SCAN": CSCAN, "LOOK": LOOK, "C-LOOK": CLOOK}[algo_name]
    algo = algo_cls(requests=requests, params=params)

    seek_distances: List[int] = []
    head_path: List[int] = [head_start]
    total_time_ms = 0.0
    total_throughput = 0.0

    for step in algo.step_generator():
        seek_distances.append(step.seek_distance_this_step)
        head_path.append(step.head_position)
        total_time_ms = step.cumulative_time_ms
        total_throughput += step.throughput_mbps

    total_seek = algo.cumulative_seek
    step_count = len(seek_distances)
    avg_seek = total_seek / step_count if step_count > 0 else 0.0
    max_single = max(seek_distances, default=0)
    avg_throughput = total_throughput / max(step_count, 1)
    avg_access = total_time_ms / max(step_count, 1)

    # Consistency: 1 - normalised std-dev (lower variance = more consistent = higher score)
    if step_count > 1:
        mean = avg_seek
        variance = sum((d - mean) ** 2 for d in seek_distances) / step_count
        std_dev = math.sqrt(variance)
        # Normalise by max possible seek (max_track) so it is comparable across runs
        normalised_std = std_dev / max_track
        consistency = max(0.0, 1.0 - normalised_std)
    else:
        consistency = 1.0

    return AlgorithmComparisonResult(
        algorithm=algo_name,
        total_seek_time=total_seek,
        avg_seek_per_op=round(avg_seek, 2),
        max_single_seek=max_single,
        throughput_score=0.0,          # filled in after group normalisation
        consistency_score=round(consistency, 4),
        step_count=step_count,
        head_path=head_path,
        total_time_ms=round(total_time_ms, 4),
        avg_access_time_ms=round(avg_access, 4),
        avg_throughput_mbps=round(avg_throughput, 4),
    )


def _apply_throughput_scores(
    results: List[AlgorithmComparisonResult],
) -> List[AlgorithmComparisonResult]:
    """
    throughput_score = 100 × (min_seek / this_seek)  — deterministic, same input → same winner.
    The algorithm with the lowest total seek always gets 100.
    Also computes performance_delta_pct relative to the worst performer.
    """
    seeks = [r.total_seek_time for r in results]
    min_seek = min(seeks) if seeks else 1
    max_seek = max(seeks) if seeks else 1

    for r in results:
        denom = r.total_seek_time if r.total_seek_time > 0 else 1
        r.throughput_score = round(100.0 * min_seek / denom, 2)
        # Performance delta: how much better than worst
        if max_seek > 0:
            r.performance_delta_pct = round(((max_seek - r.total_seek_time) / max_seek) * 100.0, 2)

    winner = min(results, key=lambda r: r.total_seek_time)
    winner.is_winner = True
    return results


def _generate_performance_summary(results: List[AlgorithmComparisonResult]) -> str:
    """Generate human-readable performance analysis text."""
    if not results:
        return ""
    
    winner = next((r for r in results if r.is_winner), results[0])
    others = [r for r in results if not r.is_winner]
    
    if not others:
        return f"{winner.algorithm} completed with {winner.total_seek_time} total seek distance."
    
    parts = []
    for other in others:
        if other.total_seek_time > 0:
            improvement = ((other.total_seek_time - winner.total_seek_time) / other.total_seek_time) * 100
            parts.append(
                f"{winner.algorithm} improved performance by {improvement:.1f}% over {other.algorithm} "
                f"({winner.total_seek_time} vs {other.total_seek_time} tracks, "
                f"saving {other.total_seek_time - winner.total_seek_time} seek operations)"
            )
    
    return ". ".join(parts) + "."


app = FastAPI(title="NGILP — I/O Simulation & Optimization Lab Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Comparison endpoint ──────────────────────────────────────────────────────

@app.post("/api/compare", response_model=ComparisonResponse)
async def compare_algorithms(body: ComparisonRequest):
    """
    Run 2-5 OS scheduling algorithms on identical input via asyncio.gather
    and return normalised ComparisonResult for each.
    """
    # Deduplicate while preserving order (determinism)
    seen: set = set()
    algos: List[str] = []
    for a in body.algorithms:
        if a not in seen:
            seen.add(a)
            algos.append(a)

    loop = asyncio.get_event_loop()

    # Run each algorithm in a thread executor so CPU work doesn't block the event loop
    tasks = [
        loop.run_in_executor(
            None,
            _run_algorithm_sync,
            algo,
            list(body.requests),
            body.head_start,
            body.max_track,
            body.direction,
            body.rpm,
            body.storage_type,
        )
        for algo in algos
    ]
    raw_results: List[AlgorithmComparisonResult] = list(await asyncio.gather(*tasks))

    # Apply group-level throughput normalisation
    scored = _apply_throughput_scores(raw_results)

    winner = next((r.algorithm for r in scored if r.is_winner), scored[0].algorithm)
    performance_summary = _generate_performance_summary(scored)

    # Timing summary
    timing_summary = {
        "storage_type": body.storage_type,
        "rpm": body.rpm,
        "algorithms": {
            r.algorithm: {
                "total_time_ms": r.total_time_ms,
                "avg_access_time_ms": r.avg_access_time_ms,
                "avg_throughput_mbps": r.avg_throughput_mbps,
            }
            for r in scored
        },
    }

    return ComparisonResponse(
        results=scored,
        winner=winner,
        input_summary={
            "requests": body.requests,
            "head_start": body.head_start,
            "algorithms": algos,
            "max_track": body.max_track,
        },
        performance_summary=performance_summary,
        timing_summary=timing_summary,
    )


# ─── Storage comparison endpoint (HDD vs SSD vs NVMe) ─────────────────────────

class StorageComparisonRequest(BaseModel):
    requests: List[int] = Field(..., min_length=1, max_length=200)
    algorithm: Literal["FCFS", "SSTF", "SCAN"] = "SSTF"
    head_start: int = Field(default=53, ge=0, le=199)
    max_track: int = Field(default=199, ge=1, le=999)
    direction: Literal["UP", "DOWN"] = "UP"
    rpm: int = Field(default=7200, ge=1, le=50000)

class StorageComparisonResponse(BaseModel):
    hdd: AlgorithmComparisonResult
    ssd: AlgorithmComparisonResult
    nvme: AlgorithmComparisonResult
    speedup_ssd_over_hdd: float
    speedup_nvme_over_hdd: float
    summary: str

@app.post("/api/compare-storage", response_model=StorageComparisonResponse)
async def compare_storage_types(body: StorageComparisonRequest):
    """Compare the same algorithm across HDD, SSD, and NVMe."""
    loop = asyncio.get_event_loop()

    storage_types = ["HDD", "SSD", "NVME"]
    tasks = [
        loop.run_in_executor(
            None,
            _run_algorithm_sync,
            body.algorithm,
            list(body.requests),
            body.head_start,
            body.max_track,
            body.direction,
            body.rpm,
            st,
        )
        for st in storage_types
    ]
    results = list(await asyncio.gather(*tasks))
    hdd, ssd, nvme = results

    speedup_ssd = hdd.total_time_ms / max(ssd.total_time_ms, 0.001)
    speedup_nvme = hdd.total_time_ms / max(nvme.total_time_ms, 0.001)

    summary = (
        f"Using {body.algorithm}: HDD ({body.rpm} RPM) took {hdd.total_time_ms:.2f}ms, "
        f"SSD took {ssd.total_time_ms:.2f}ms ({speedup_ssd:.1f}× faster), "
        f"NVMe took {nvme.total_time_ms:.2f}ms ({speedup_nvme:.1f}× faster). "
        f"SSD eliminates seek time and rotational latency entirely."
    )

    return StorageComparisonResponse(
        hdd=hdd, ssd=ssd, nvme=nvme,
        speedup_ssd_over_hdd=round(speedup_ssd, 2),
        speedup_nvme_over_hdd=round(speedup_nvme, 2),
        summary=summary,
    )


@app.websocket("/ws/simulate/os")
async def simulate_os_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_text()
        engine = OSSimulationEngine(config=OSSimulationConfig(**json.loads(data)))
        async for step in engine.stream_steps():
            await websocket.send_text(step.model_dump_json())
        await websocket.send_json({"type": "SIM_END", "metrics": engine.algo.compute_metrics().model_dump()})
    except WebSocketDisconnect: pass
    except Exception as e: await websocket.send_json({"type": "ERROR", "message": str(e)})

@app.websocket("/ws/simulate/aoa")
async def simulate_aoa_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_text()
        engine = AOASimulationEngine(config=AOASimulationConfig(**json.loads(data)))
        async for step in engine.stream_steps():
            await websocket.send_text(step.model_dump_json())
        await websocket.send_json({"type": "SIM_END", "metrics": engine.algo.compute_metrics().model_dump()})
    except WebSocketDisconnect: pass
    except Exception as e: await websocket.send_json({"type": "ERROR", "message": str(e)})

if __name__ == "__main__":
    import os
    import uvicorn

    host = os.getenv("OS_AOA_BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("OS_AOA_BACKEND_PORT", "8000"))

    # Keep the direct-run path compatible with restricted environments.
    # Developers who want live reload can still use the uvicorn CLI explicitly.
    uvicorn.run(app, host=host, port=port, reload=False)
