import {
  AlgorithmType,
  DecisionData,
  StepExplanation,
} from '../types';

export function generateStepExplanation(
  stepIndex: number,
  page: number,
  outcome: 'hit' | 'fault',
  framesBefore: (number | null)[],
  victimPage: number | null,
  allocatedFrame: number,
  algorithm: AlgorithmType,
  decisionData: DecisionData
): StepExplanation {
  const isInitialFill = outcome === 'fault' && victimPage === null;

  if (outcome === 'hit') {
    let detail = `Page ${page} is already resident in RAM Frame ${allocatedFrame}. No disk I/O was required.`;
    let ruleApplied = '';

    if (algorithm === 'LRU') {
      ruleApplied = `LRU state updated: Page ${page}'s last-used timestamp was updated to step ${stepIndex + 1}, moving it to the top (most recent) of the LRU recency stack.`;
    } else if (algorithm === 'FIFO') {
      ruleApplied = `FIFO state unchanged: In FIFO, hits do NOT alter queue position or arrival timestamps. Page ${page} maintains its original arrival priority.`;
    } else if (algorithm === 'OPT') {
      ruleApplied = `Optimal lookahead: Page ${page} hit; future reference distances for all resident frames remain tracked for subsequent eviction decisions.`;
    } else if (algorithm === 'CLOCK') {
      ruleApplied = `Clock Second-Chance: Page ${page}'s reference bit (R) was set to 1. When the clock hand inspects this frame in the future, it will be granted a second chance.`;
    }

    return {
      title: `Page ${page} Hit in Frame ${allocatedFrame}`,
      summary: `Cache hit! Page ${page} was found already residing in physical memory frame ${allocatedFrame}.`,
      detail,
      ruleApplied,
    };
  }

  // Outcome is FAULT
  if (isInitialFill) {
    const emptyFrame = allocatedFrame;
    return {
      title: `Cold Page Fault (Demand Paged into Frame ${emptyFrame})`,
      summary: `Page ${page} was not in physical memory, but Frame ${emptyFrame} was empty.`,
      detail: `This is a compulsory (cold) page fault. Page ${page} was not resident in memory. Because Frame ${emptyFrame} was currently unallocated, Page ${page} was loaded from secondary storage directly without needing to evict any existing page.`,
      ruleApplied: `Initial frame allocation: Empty frames (0 to ${framesBefore.filter(f => f === null).length - 1}) are filled sequentially before any eviction algorithm activates.`,
    };
  }

  // Outcome is FAULT with EVICTION
  const victim = victimPage!;
  let summary = `Page Fault: All ${framesBefore.length} frames are occupied. Page ${victim} was evicted to load Page ${page}.`;
  let detail = '';
  let ruleApplied = '';

  switch (algorithm) {
    case 'FIFO': {
      const queue = decisionData.fifoQueue || [];
      const arrivalTime = queue.find((q) => q.page === victim)?.arrivalTime ?? 1;
      detail = `All ${framesBefore.length} physical frames were filled. FIFO checks the arrival timestamps of all resident pages: [${queue
        .map((q) => `P${q.page}: step ${q.arrivalTime}`)
        .join(', ')}]. Page ${victim} was loaded earliest (at step ${arrivalTime}), making it the oldest page in memory.`;
      ruleApplied = `FIFO Eviction Rule: The page that has been in memory the longest is evicted first, regardless of how often or how recently it was accessed.`;
      break;
    }
    case 'LRU': {
      const rankings = decisionData.lruRankings || [];
      const victimInfo = rankings.find((r) => r.page === victim);
      const lastUsed = victimInfo ? victimInfo.lastUsedTime : 1;
      const age = victimInfo ? victimInfo.age : stepIndex;
      detail = `All ${framesBefore.length} physical frames were full. LRU inspects access timestamps: [${rankings
        .map((r) => `P${r.page}: last used step ${r.lastUsedTime}`)
        .join(', ')}]. Page ${victim} has not been referenced for ${age} steps (since step ${lastUsed}), making it the least recently used page.`;
      ruleApplied = `LRU Eviction Rule: Assumes the Principle of Locality—pages unreferenced for the longest past interval are least likely to be referenced in the near future.`;
      break;
    }
    case 'OPT': {
      const distances = decisionData.optDistances || [];
      const victimInfo = distances.find((d) => d.page === victim);
      if (victimInfo && victimInfo.distance === 'infinity') {
        detail = `All ${framesBefore.length} frames were full. Optimal checks future references across remaining requests. Page ${victim} is NEVER referenced again in the entire sequence! Hence, keeping it in memory offers zero future utility.`;
      } else {
        const dist = victimInfo ? victimInfo.distance : 'farthest';
        detail = `All ${framesBefore.length} frames were full. Optimal checks the future sequence: [${distances
          .map((d) => `P${d.page}: ${d.distance === 'infinity' ? 'never' : `in +${d.distance} steps`}`)
          .join(', ')}]. Page ${victim} will not be requested until ${dist} steps later, which is the farthest in the future among all resident pages.`;
      }
      ruleApplied = `Bélády's Optimal Rule (MIN): Proven theoretical lower bound on page faults. Evicts the page whose next reference occurs furthest in the future (or never).`;
      break;
    }
    case 'CLOCK': {
      const clock = decisionData.clockState;
      const inspected = clock?.inspectedFrames.join(', ') || '';
      detail = `All frames were occupied. The clock hand inspected frames [${inspected}]. Frames with reference bit R=1 were given a second chance and had R cleared to 0. Frame ${allocatedFrame} containing Page ${victim} had R=0, so it was selected as the victim.`;
      ruleApplied = `Clock / Second Chance Rule: Approximates LRU using 1 reference bit. Clears R=1 to R=0 and advances until finding an unreferenced page (R=0) to evict.`;
      break;
    }
  }

  return {
    title: `Page Fault: Evicted Page ${victim} → Loaded Page ${page} in Frame ${allocatedFrame}`,
    summary,
    detail,
    ruleApplied,
  };
}
