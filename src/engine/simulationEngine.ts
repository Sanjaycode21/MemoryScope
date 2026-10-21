import {
  AlgorithmType,
  DecisionData,
  PageTableEntry,
  SimulationConfig,
  SimulationStep,
  SimulationTrace,
  TLBEntry,
  TLBState,
  TraceSummary,
} from '../types';
import { generateStepExplanation } from './explanationEngine';

/**
 * Pure simulation engine that executes FIFO, LRU, Optimal, and Clock algorithms.
 * Returns a full deterministic trace with per-step memory snapshots, decision tables,
 * and plain-language explanations.
 */
export function simulateSequence(config: SimulationConfig): SimulationTrace {
  const { algorithm, frameCount, pageSize, referenceString } = config;

  if (frameCount < 1 || frameCount > 16) {
    throw new Error('Frame count must be between 1 and 16.');
  }

  // Ensure we at least have pages 0..max(pages, 7)
  const maxPage = Math.max(...referenceString, 7);
  const allPages = Array.from({ length: maxPage + 1 }, (_, i) => i);

  // Initial page table
  const initialPageTable: Map<number, PageTableEntry> = new Map();
  for (const page of allPages) {
    initialPageTable.set(page, {
      pageNumber: page,
      frameNumber: null,
      valid: false,
      loadTime: null,
      lastUsedTime: null,
      referenceBit: 0,
      dirty: false,
    });
  }

  // Frames state: array of page number or null
  const frames: (number | null)[] = Array(frameCount).fill(null);

  // Algorithm tracking structures
  // FIFO: frame index -> load step
  const loadTimes: number[] = Array(frameCount).fill(-1);
  // LRU: frame index -> last used step
  const lastUsedTimes: number[] = Array(frameCount).fill(-1);
  // Clock: reference bits and hand pointer
  const refBits: number[] = Array(frameCount).fill(0);
  let clockHand = 0;

  // TLB tracking: 4-entry LRU TLB
  const tlbCapacity = 4;
  let tlbEntries: TLBEntry[] = [];

  let cumulativeHits = 0;
  let cumulativeFaults = 0;
  let cumulativeReplacements = 0;

  const steps: SimulationStep[] = [];

  for (let stepIndex = 0; stepIndex < referenceString.length; stepIndex++) {
    const requestedPage = referenceString[stepIndex];
    const framesBefore = [...frames];

    // Check if requested page is in frames
    const residentFrameIndex = frames.indexOf(requestedPage);
    const isHit = residentFrameIndex !== -1;

    let outcome: 'hit' | 'fault';
    let victimPage: number | null = null;
    let allocatedFrame = -1;
    let decisionData: DecisionData;

    // TLB check
    const tlbHitIndex = tlbEntries.findIndex((e) => e.valid && e.vpn === requestedPage);
    const tlbHit = tlbHitIndex !== -1;

    if (isHit) {
      outcome = 'hit';
      allocatedFrame = residentFrameIndex;
      cumulativeHits++;

      // Update LRU recency
      lastUsedTimes[allocatedFrame] = stepIndex + 1;
      // Update Clock ref bit
      refBits[allocatedFrame] = 1;

      // Update Page Table
      const ptEntry = initialPageTable.get(requestedPage)!;
      ptEntry.lastUsedTime = stepIndex + 1;
      ptEntry.referenceBit = 1;

      // Build decision data for explanation
      decisionData = buildDecisionData({
        algorithm,
        frames,
        loadTimes,
        lastUsedTimes,
        refBits,
        clockHand,
        inspectedFrames: [],
        stepIndex,
        referenceString,
        victimPage: null,
        reason: `Page ${requestedPage} hit in physical Frame ${allocatedFrame}.`,
      });
    } else {
      outcome = 'fault';
      cumulativeFaults++;

      // Check if there is an empty frame
      const emptyFrameIndex = frames.indexOf(null);

      if (emptyFrameIndex !== -1) {
        // Cold fault / Initial fill without eviction
        allocatedFrame = emptyFrameIndex;
        victimPage = null;

        frames[allocatedFrame] = requestedPage;
        loadTimes[allocatedFrame] = stepIndex + 1;
        lastUsedTimes[allocatedFrame] = stepIndex + 1;
        refBits[allocatedFrame] = 1;

        // Update Page Table
        const ptEntry = initialPageTable.get(requestedPage)!;
        ptEntry.valid = true;
        ptEntry.frameNumber = allocatedFrame;
        ptEntry.loadTime = stepIndex + 1;
        ptEntry.lastUsedTime = stepIndex + 1;
        ptEntry.referenceBit = 1;

        decisionData = buildDecisionData({
          algorithm,
          frames,
          loadTimes,
          lastUsedTimes,
          refBits,
          clockHand,
          inspectedFrames: [],
          stepIndex,
          referenceString,
          victimPage: null,
          reason: `Unallocated Frame ${allocatedFrame} found. Loaded without eviction.`,
        });
      } else {
        // Frames are full: Eviction required
        cumulativeReplacements++;
        let evictionResult: {
          victimFrameIndex: number;
          inspectedFrames?: number[];
        };

        switch (algorithm) {
          case 'FIFO': {
            // Evict frame with minimum loadTime
            let earliestLoadTime = Infinity;
            let targetFrame = 0;
            for (let f = 0; f < frameCount; f++) {
              if (loadTimes[f] < earliestLoadTime) {
                earliestLoadTime = loadTimes[f];
                targetFrame = f;
              }
            }
            evictionResult = { victimFrameIndex: targetFrame };
            break;
          }
          case 'LRU': {
            // Evict frame with minimum lastUsedTime
            let oldestUsedTime = Infinity;
            let targetFrame = 0;
            for (let f = 0; f < frameCount; f++) {
              if (lastUsedTimes[f] < oldestUsedTime) {
                oldestUsedTime = lastUsedTimes[f];
                targetFrame = f;
              }
            }
            evictionResult = { victimFrameIndex: targetFrame };
            break;
          }
          case 'OPT': {
            // Evict frame whose next use is farthest in the future (or never)
            let farthestDistance = -1;
            let targetFrame = 0;

            for (let f = 0; f < frameCount; f++) {
              const resident = frames[f]!;
              // Look ahead in remaining reference string
              let nextUse = -1;
              for (let k = stepIndex + 1; k < referenceString.length; k++) {
                if (referenceString[k] === resident) {
                  nextUse = k;
                  break;
                }
              }

              if (nextUse === -1) {
                // Never used again - highest priority for eviction
                farthestDistance = Infinity;
                targetFrame = f;
                break; // Guaranteed optimal victim
              } else {
                const distance = nextUse - stepIndex;
                if (distance > farthestDistance) {
                  farthestDistance = distance;
                  targetFrame = f;
                }
              }
            }
            evictionResult = { victimFrameIndex: targetFrame };
            break;
          }
          case 'CLOCK': {
            const inspected: number[] = [];
            while (true) {
              inspected.push(clockHand);
              if (refBits[clockHand] === 0) {
                // Found victim
                const victimFrame = clockHand;
                clockHand = (clockHand + 1) % frameCount;
                evictionResult = { victimFrameIndex: victimFrame, inspectedFrames: inspected };
                break;
              } else {
                // Second chance: clear bit and advance
                refBits[clockHand] = 0;
                clockHand = (clockHand + 1) % frameCount;
              }
            }
            break;
          }
        }

        allocatedFrame = evictionResult.victimFrameIndex;
        victimPage = frames[allocatedFrame]!;

        // Invalidate old page in Page Table
        const victimPtEntry = initialPageTable.get(victimPage);
        if (victimPtEntry) {
          victimPtEntry.valid = false;
          victimPtEntry.frameNumber = null;
        }

        // Place new page into frame
        frames[allocatedFrame] = requestedPage;
        loadTimes[allocatedFrame] = stepIndex + 1;
        lastUsedTimes[allocatedFrame] = stepIndex + 1;
        refBits[allocatedFrame] = 1;

        // Update new page in Page Table
        const newPtEntry = initialPageTable.get(requestedPage)!;
        newPtEntry.valid = true;
        newPtEntry.frameNumber = allocatedFrame;
        newPtEntry.loadTime = stepIndex + 1;
        newPtEntry.lastUsedTime = stepIndex + 1;
        newPtEntry.referenceBit = 1;

        decisionData = buildDecisionData({
          algorithm,
          frames: framesBefore,
          loadTimes,
          lastUsedTimes,
          refBits,
          clockHand,
          inspectedFrames: evictionResult.inspectedFrames || [allocatedFrame],
          stepIndex,
          referenceString,
          victimPage,
          reason: `Frames full. Evicted Page ${victimPage} from Frame ${allocatedFrame} using ${algorithm}.`,
        });
      }
    }

    // Update TLB
    if (tlbHit) {
      tlbEntries[tlbHitIndex].lastUsed = stepIndex + 1;
    } else {
      // Miss: add entry (LRU eviction if TLB is full)
      if (tlbEntries.length >= tlbCapacity) {
        // find oldest
        let oldestIndex = 0;
        let oldestTime = Infinity;
        for (let t = 0; t < tlbEntries.length; t++) {
          if (tlbEntries[t].lastUsed < oldestTime) {
            oldestTime = tlbEntries[t].lastUsed;
            oldestIndex = t;
          }
        }
        tlbEntries.splice(oldestIndex, 1);
      }
      tlbEntries.push({
        vpn: requestedPage,
        ppn: allocatedFrame,
        valid: true,
        lastUsed: stepIndex + 1,
      });
    }

    // Clone page table snapshot for step
    const pageTableSnapshot: PageTableEntry[] = Array.from(initialPageTable.values()).map(
      (entry) => ({ ...entry })
    );

    // Compute virtual and physical address
    // Offset is simulated based on stepIndex deterministic pseudo-offset
    const offset = (stepIndex * 64 + 128) % pageSize;
    const virtualAddress = requestedPage * pageSize + offset;
    const physicalAddress = allocatedFrame !== -1 ? allocatedFrame * pageSize + offset : null;

    const explanation = generateStepExplanation(
      stepIndex,
      requestedPage,
      outcome,
      framesBefore,
      victimPage,
      allocatedFrame,
      algorithm,
      decisionData
    );

    const tlbStateSnapshot: TLBState = {
      enabled: true,
      entries: tlbEntries.map((e) => ({ ...e })),
      hit: tlbHit,
      hitVPN: tlbHit ? requestedPage : null,
    };

    steps.push({
      index: stepIndex,
      requestedPage,
      outcome,
      framesBefore,
      framesAfter: [...frames],
      victimPage,
      allocatedFrame,
      pageTableSnapshot,
      decisionData,
      explanation,
      virtualAddress,
      physicalAddress,
      tlbState: tlbStateSnapshot,
      cumulativeHits,
      cumulativeFaults,
      cumulativeReplacements,
    });
  }

  const totalRequests = referenceString.length;
  const hits = cumulativeHits;
  const faults = cumulativeFaults;
  const hitRatio = totalRequests > 0 ? hits / totalRequests : 0;
  const faultRatio = totalRequests > 0 ? faults / totalRequests : 0;
  const peakFramesUsed = frames.filter((f) => f !== null).length;
  const memoryUtilization = Math.round((peakFramesUsed / frameCount) * 100);

  const summary: TraceSummary = {
    totalRequests,
    hits,
    faults,
    hitRatio,
    faultRatio,
    replacements: cumulativeReplacements,
    peakFramesUsed,
    memoryUtilization,
  };

  return {
    config,
    steps,
    summary,
  };
}

interface DecisionHelperParams {
  algorithm: AlgorithmType;
  frames: (number | null)[];
  loadTimes: number[];
  lastUsedTimes: number[];
  refBits: number[];
  clockHand: number;
  inspectedFrames: number[];
  stepIndex: number;
  referenceString: number[];
  victimPage: number | null;
  reason: string;
}

function buildDecisionData(params: DecisionHelperParams): DecisionData {
  const {
    algorithm,
    frames,
    loadTimes,
    lastUsedTimes,
    refBits,
    clockHand,
    inspectedFrames,
    stepIndex,
    referenceString,
    victimPage,
    reason,
  } = params;

  const validFrames = frames.map((p, idx) => ({ page: p, frameIndex: idx })).filter((f) => f.page !== null) as {
    page: number;
    frameIndex: number;
  }[];

  const data: DecisionData = {
    algorithm,
    reason,
    victimCandidate: victimPage,
    fifoQueue: validFrames
      .map((f) => ({
        page: f.page,
        arrivalTime: loadTimes[f.frameIndex],
      }))
      .sort((a, b) => a.arrivalTime - b.arrivalTime),
  };

  if (algorithm === 'LRU') {
    data.lruRankings = validFrames
      .map((f) => ({
        page: f.page,
        lastUsedTime: lastUsedTimes[f.frameIndex],
        age: (stepIndex + 1) - lastUsedTimes[f.frameIndex],
      }))
      .sort((a, b) => a.lastUsedTime - b.lastUsedTime); // Smallest lastUsedTime = LRU head (victim)
  } else if (algorithm === 'OPT') {
    data.optDistances = validFrames
      .map((f) => {
        let nextUse: number | null = null;
        for (let k = stepIndex + 1; k < referenceString.length; k++) {
          if (referenceString[k] === f.page) {
            nextUse = k;
            break;
          }
        }
        return {
          page: f.page,
          nextUseIndex: nextUse,
          distance: nextUse !== null ? nextUse - stepIndex : ('infinity' as const),
          willBeUsedAgain: nextUse !== null,
        };
      })
      .sort((a, b) => {
        if (a.distance === 'infinity' && b.distance === 'infinity') return 0;
        if (a.distance === 'infinity') return -1;
        if (b.distance === 'infinity') return 1;
        return (b.distance as number) - (a.distance as number); // Largest distance first (victim candidate at index 0)
      });
  } else if (algorithm === 'CLOCK') {
    data.clockState = {
      hand: clockHand,
      frameBits: validFrames.map((f) => ({
        frameIndex: f.frameIndex,
        page: f.page,
        refBit: refBits[f.frameIndex],
      })),
      inspectedFrames,
    };
  }

  return data;
}
