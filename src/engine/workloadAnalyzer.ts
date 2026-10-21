import {
  DetectedPattern,
  SimulationConfig,
  SimulationTrace,
  WorkloadDiagnosis,
} from '../types';
import { simulateSequence } from './simulationEngine';

export function analyzeWorkload(
  referenceString: number[],
  currentConfig: SimulationConfig,
  currentTrace: SimulationTrace
): WorkloadDiagnosis {
  const patterns: DetectedPattern[] = [];
  const n = referenceString.length;

  if (n === 0) {
    return {
      patterns: [],
      workingSetWindow: 4,
      avgWorkingSetSize: 0,
      maxWorkingSetSize: 0,
      thrashingRisk: 'low',
      diagnosisSummary: 'No page references provided.',
      evidence: [],
      recommendations: [],
    };
  }

  // 1. Check for Sequential Scan
  let monotonicTransitions = 0;
  for (let i = 0; i < n - 1; i++) {
    if (referenceString[i + 1] === referenceString[i] + 1) {
      monotonicTransitions++;
    }
  }
  const sequentialRatio = monotonicTransitions / Math.max(1, n - 1);
  if (sequentialRatio > 0.4) {
    patterns.push({
      id: 'sequential_scan',
      name: 'Sequential Scan (Streaming Access)',
      confidence: Math.min(1, Number((sequentialRatio * 1.5).toFixed(2))),
      description:
        'Pages are accessed monotonically in ascending order, typical of full-table database scans or array traversals.',
      evidence: [
        `${(sequentialRatio * 100).toFixed(0)}% of transitions are sequential (page N -> page N+1).`,
        'Sequential scans offer poor temporal locality because each page is used once and never revisited immediately.',
      ],
    });
  }

  // 2. Check for Cyclic / Looping Access
  // Look for periodic auto-correlation with lag 2..8
  let bestPeriod = -1;
  let maxLoopMatches = 0;
  for (let period = 2; period <= Math.min(8, Math.floor(n / 2)); period++) {
    let matches = 0;
    for (let i = 0; i < n - period; i++) {
      if (referenceString[i] === referenceString[i + period]) {
        matches++;
      }
    }
    const matchRate = matches / (n - period);
    if (matchRate > 0.6 && matchRate > maxLoopMatches) {
      maxLoopMatches = matchRate;
      bestPeriod = period;
    }
  }

  if (bestPeriod !== -1 && maxLoopMatches > 0.6) {
    patterns.push({
      id: 'cyclic_loop',
      name: `Cyclic Loop (Period = ${bestPeriod} pages)`,
      confidence: Math.min(1, Number((maxLoopMatches * 1.2).toFixed(2))),
      description: `Workload exhibits a repeating loop of ${bestPeriod} distinct page references (e.g. inner loop of nested matrix multiplication or iterative batch job).`,
      evidence: [
        `Detected periodic cycle of length ${bestPeriod} with ${(maxLoopMatches * 100).toFixed(0)}% recurrence match.`,
        `Loop size (${bestPeriod}) compared to allocated RAM (${currentConfig.frameCount} frames).`,
      ],
    });
  }

  // 3. Temporal Locality
  // Calculate average reuse distance
  const reuseDistances: number[] = [];
  const lastSeen = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const page = referenceString[i];
    if (lastSeen.has(page)) {
      reuseDistances.push(i - lastSeen.get(page)!);
    }
    lastSeen.set(page, i);
  }
  const avgReuse =
    reuseDistances.length > 0
      ? reuseDistances.reduce((a, b) => a + b, 0) / reuseDistances.length
      : Infinity;
  const temporalScore = Math.max(0, Math.min(1, 1 - (avgReuse - 1) / 10));

  if (temporalScore > 0.5 && reuseDistances.length >= 3) {
    patterns.push({
      id: 'temporal_locality',
      name: 'Strong Temporal Locality',
      confidence: Number(temporalScore.toFixed(2)),
      description:
        'Recently referenced pages have a very high probability of being referenced again in the immediate near future.',
      evidence: [
        `Average page reuse distance is ${avgReuse.toFixed(1)} steps (very short recurrence gap).`,
        'LRU algorithm performs exceptionally well under high temporal locality.',
      ],
    });
  }

  // 4. Working Set Calculation over sliding window Delta
  const windowSize = Math.max(3, Math.min(6, Math.floor(n / 3)));
  const workingSetSizes: number[] = [];
  for (let i = 0; i <= n - windowSize; i++) {
    const windowSlice = referenceString.slice(i, i + windowSize);
    const uniqueInWindow = new Set(windowSlice).size;
    workingSetSizes.push(uniqueInWindow);
  }
  const avgWorkingSetSize =
    workingSetSizes.length > 0
      ? Number((workingSetSizes.reduce((a, b) => a + b, 0) / workingSetSizes.length).toFixed(1))
      : 1;
  const maxWorkingSetSize = workingSetSizes.length > 0 ? Math.max(...workingSetSizes) : 1;

  // 5. Thrashing Risk Evaluation
  let thrashingRisk: 'low' | 'moderate' | 'critical' = 'low';
  const faultRatio = currentTrace.summary.faultRatio;

  if (currentConfig.frameCount < avgWorkingSetSize && faultRatio >= 0.7) {
    thrashingRisk = 'critical';
  } else if (currentConfig.frameCount < maxWorkingSetSize || faultRatio >= 0.5) {
    thrashingRisk = 'moderate';
  }

  // 6. Generate Diagnosis Summary & Evidence
  const evidenceList: string[] = [
    `Reference string length: ${n} requests across ${new Set(referenceString).size} distinct pages.`,
    `Physical allocation: ${currentConfig.frameCount} frames.`,
    `Measured fault ratio: ${(faultRatio * 100).toFixed(1)}% (${currentTrace.summary.faults} faults / ${n} requests).`,
    `Estimated working-set size: average ${avgWorkingSetSize} frames (peak ${maxWorkingSetSize} frames) with window $\\Delta = ${windowSize}$.`,
  ];

  let diagnosisSummary = '';
  if (thrashingRisk === 'critical') {
    diagnosisSummary = `CRITICAL THRASHING DETECTED: The active working set (${avgWorkingSetSize} pages) exceeds physical memory capacity (${currentConfig.frameCount} frames). The CPU is spending the majority of execution time servicing page faults and disk swapping.`;
  } else if (bestPeriod > currentConfig.frameCount) {
    diagnosisSummary = `CYCLIC THRASHING DETECTED: The workload loops through ${bestPeriod} pages, but only ${currentConfig.frameCount} frames are allocated. Under ${currentConfig.algorithm}, every single loop iteration causes total cache eviction and 100% continuous faults.`;
  } else if (currentConfig.algorithm === 'FIFO' && temporalScore > 0.6) {
    diagnosisSummary = `SUBOPTIMAL ALGORITHM FOR WORKLOAD: Workload shows strong temporal locality, but FIFO ignores access recency and evicts hot pages simply because they arrived early. Switching to LRU will drastically reduce page faults.`;
  } else if (faultRatio < 0.35) {
    diagnosisSummary = `EXCELLENT HEALTH: Physical memory sizing (${currentConfig.frameCount} frames) comfortably covers the application working set. Fault rate is low and hit ratio is ${(currentTrace.summary.hitRatio * 100).toFixed(0)}%.`;
  } else {
    diagnosisSummary = `MODERATE MEMORY PRESSURE: Memory capacity is close to working-set boundary. Consider fine-tuning frame allocation or algorithm to improve hit rates.`;
  }

  // 7. Actionable Recommendations
  const recommendations: WorkloadDiagnosis['recommendations'] = [];

  // Recommendation 1: Frame sizing
  if (currentConfig.frameCount < maxWorkingSetSize) {
    recommendations.push({
      title: `Expand Physical Memory to ${maxWorkingSetSize} Frames`,
      description: `Increasing physical frames from ${currentConfig.frameCount} to ${maxWorkingSetSize} will hold the full active working set in RAM and eliminate thrashing.`,
      suggestedConfig: { frameCount: maxWorkingSetSize },
      actionLabel: `Allocate ${maxWorkingSetSize} Frames`,
    });
  } else if (currentConfig.frameCount > 1 && currentConfig.frameCount < 8) {
    recommendations.push({
      title: `Test +1 Frame Allocation (${currentConfig.frameCount + 1} Frames)`,
      description: `Assess the marginal return of adding a single additional RAM frame to reduce capacity misses.`,
      suggestedConfig: { frameCount: currentConfig.frameCount + 1 },
      actionLabel: `Add +1 Frame`,
    });
  }

  // Recommendation 2: Algorithm upgrade
  if (currentConfig.algorithm === 'FIFO') {
    recommendations.push({
      title: 'Switch from FIFO to LRU Replacement',
      description:
        'LRU exploits temporal locality by preserving frequently used pages and avoiding premature eviction of hot working sets.',
      suggestedConfig: { algorithm: 'LRU' },
      actionLabel: 'Switch to LRU',
    });
  }

  // Recommendation 3: Benchmark against Optimal
  if (currentConfig.algorithm !== 'OPT') {
    recommendations.push({
      title: "Evaluate Bélády's Optimal (Theoretical Ceiling)",
      description:
        'Run the Optimal algorithm to identify the mathematical minimum possible page faults for this exact sequence.',
      suggestedConfig: { algorithm: 'OPT' },
      actionLabel: 'Compare with OPT',
    });
  }

  return {
    patterns,
    workingSetWindow: windowSize,
    avgWorkingSetSize,
    maxWorkingSetSize,
    thrashingRisk,
    diagnosisSummary,
    evidence: evidenceList,
    recommendations,
  };
}

export function testRecommendationImprovement(
  baseConfig: SimulationConfig,
  suggestedPatch: Partial<SimulationConfig>
): {
  originalConfig: SimulationConfig;
  improvedConfig: SimulationConfig;
  originalTrace: SimulationTrace;
  improvedTrace: SimulationTrace;
  faultReduction: number;
  percentageGain: number;
  explanation: string;
} {
  const originalTrace = simulateSequence(baseConfig);
  const improvedConfig: SimulationConfig = { ...baseConfig, ...suggestedPatch };
  const improvedTrace = simulateSequence(improvedConfig);

  const originalFaults = originalTrace.summary.faults;
  const newFaults = improvedTrace.summary.faults;
  const faultReduction = originalFaults - newFaults;
  const percentageGain =
    originalFaults > 0 ? Math.round((faultReduction / originalFaults) * 100) : 0;

  let explanation = '';
  if (faultReduction > 0) {
    explanation = `Applying this fix reduced page faults from ${originalFaults} down to ${newFaults} (a ${percentageGain}% reduction in page faults)! Memory hit ratio improved from ${(originalTrace.summary.hitRatio * 100).toFixed(0)}% to ${(improvedTrace.summary.hitRatio * 100).toFixed(0)}%.`;
  } else if (faultReduction === 0) {
    explanation = `Both configurations achieved an identical ${newFaults} page faults. The memory bottleneck in this specific sequence is constrained by compulsory cold faults.`;
  } else {
    explanation = `Page faults changed from ${originalFaults} to ${newFaults}. This illustrates how specific reference sequences behave under different policies.`;
  }

  return {
    originalConfig: baseConfig,
    improvedConfig,
    originalTrace,
    improvedTrace,
    faultReduction,
    percentageGain,
    explanation,
  };
}
