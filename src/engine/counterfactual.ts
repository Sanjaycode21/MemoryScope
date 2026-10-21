import { AlgorithmType, SimulationConfig, SimulationTrace } from '../types';
import { simulateSequence } from './simulationEngine';

export interface DivergencePoint {
  stepIndex: number;
  requestedPage: number;
  outcomes: Record<AlgorithmType, 'hit' | 'fault'>;
  victims: Record<AlgorithmType, number | null>;
  frames: Record<AlgorithmType, (number | null)[]>;
  divergenceReason: string;
  keyTakeaway: string;
}

export interface BeladyAnomalyResult {
  hasAnomaly: boolean;
  algorithm: AlgorithmType;
  fromFrames: number;
  toFrames: number;
  fromFaults: number;
  toFaults: number;
  explanation: string;
}

export interface FrameSweepPoint {
  frames: number;
  FIFO: number;
  LRU: number;
  OPT: number;
  CLOCK: number;
}

export interface FrameSweepReport {
  dataPoints: FrameSweepPoint[];
  anomalies: BeladyAnomalyResult[];
}

export function runMultiAlgorithmComparison(
  baseConfig: Omit<SimulationConfig, 'algorithm'>,
  algorithms: AlgorithmType[] = ['FIFO', 'LRU', 'OPT', 'CLOCK']
): Record<AlgorithmType, SimulationTrace> {
  const traces = {} as Record<AlgorithmType, SimulationTrace>;
  for (const algo of algorithms) {
    traces[algo] = simulateSequence({
      ...baseConfig,
      algorithm: algo,
    });
  }
  return traces;
}

export function findDivergencePoints(
  traces: Record<AlgorithmType, SimulationTrace>
): DivergencePoint[] {
  const algos = Object.keys(traces) as AlgorithmType[];
  if (algos.length === 0) return [];

  const stepCount = traces[algos[0]].steps.length;
  const divergences: DivergencePoint[] = [];

  for (let i = 0; i < stepCount; i++) {
    const page = traces[algos[0]].steps[i].requestedPage;
    const outcomes = {} as Record<AlgorithmType, 'hit' | 'fault'>;
    const victims = {} as Record<AlgorithmType, number | null>;
    const framesMap = {} as Record<AlgorithmType, (number | null)[]>;

    let hasOutcomeDivergence = false;
    let hasVictimDivergence = false;

    for (const algo of algos) {
      outcomes[algo] = traces[algo].steps[i].outcome;
      victims[algo] = traces[algo].steps[i].victimPage;
      framesMap[algo] = traces[algo].steps[i].framesAfter;

      if (outcomes[algo] !== outcomes[algos[0]]) {
        hasOutcomeDivergence = true;
      }
      if (victims[algo] !== victims[algos[0]]) {
        hasVictimDivergence = true;
      }
    }

    if (hasOutcomeDivergence || hasVictimDivergence) {
      let divergenceReason = '';
      let keyTakeaway = '';

      if (hasOutcomeDivergence) {
        const hittingAlgos = algos.filter((a) => outcomes[a] === 'hit');
        const faultingAlgos = algos.filter((a) => outcomes[a] === 'fault');

        divergenceReason = `At request #${i + 1} (Page ${page}), [${hittingAlgos.join(', ')}] scored a Cache HIT, while [${faultingAlgos.join(', ')}] suffered a PAGE FAULT.`;

        if (hittingAlgos.includes('LRU') && faultingAlgos.includes('FIFO')) {
          keyTakeaway = `LRU retained Page ${page} because of a recent hit, while FIFO blindly discarded it because of its initial early load timestamp.`;
        } else if (hittingAlgos.includes('OPT')) {
          keyTakeaway = `Optimal had foresight of future requests, evicting an unneeded page earlier and keeping Page ${page} in RAM.`;
        } else {
          keyTakeaway = `Different eviction policies retained different sets of pages from earlier steps.`;
        }
      } else {
        const victimSummary = algos
          .map((a) => `${a} evicted P${victims[a] ?? 'none'}`)
          .join(' vs ');
        divergenceReason = `All algorithms had the same hit/fault outcome, but chose different victim pages: ${victimSummary}.`;
        keyTakeaway = `Future hit rates will diverge as each algorithm holds a different working frame set.`;
      }

      divergences.push({
        stepIndex: i,
        requestedPage: page,
        outcomes,
        victims,
        frames: framesMap,
        divergenceReason,
        keyTakeaway,
      });
    }
  }

  return divergences;
}

export function runFrameSweep(
  baseConfig: Omit<SimulationConfig, 'frameCount'>,
  minFrames = 1,
  maxFrames = 8
): FrameSweepReport {
  const dataPoints: FrameSweepPoint[] = [];
  const anomalies: BeladyAnomalyResult[] = [];

  const algos: AlgorithmType[] = ['FIFO', 'LRU', 'OPT', 'CLOCK'];
  const faultsHistory: Record<AlgorithmType, number[]> = {
    FIFO: [],
    LRU: [],
    OPT: [],
    CLOCK: [],
  };

  for (let f = minFrames; f <= maxFrames; f++) {
    const point: FrameSweepPoint = {
      frames: f,
      FIFO: 0,
      LRU: 0,
      OPT: 0,
      CLOCK: 0,
    };

    for (const algo of algos) {
      const trace = simulateSequence({
        ...baseConfig,
        algorithm: algo,
        frameCount: f,
      });
      point[algo] = trace.summary.faults;
      faultsHistory[algo].push(trace.summary.faults);
    }

    dataPoints.push(point);
  }

  // Detect Belady's Anomaly (specifically in FIFO or any stack/non-stack algorithm)
  // An anomaly occurs if increasing frame count from f to f+1 results in strictly more faults
  for (const algo of algos) {
    for (let idx = 0; idx < dataPoints.length - 1; idx++) {
      const current = dataPoints[idx];
      const next = dataPoints[idx + 1];
      if (next[algo] > current[algo]) {
        anomalies.push({
          hasAnomaly: true,
          algorithm: algo,
          fromFrames: current.frames,
          toFrames: next.frames,
          fromFaults: current[algo],
          toFaults: next[algo],
          explanation: `Bélády's Anomaly detected for ${algo}: Increasing physical memory from ${current.frames} to ${next.frames} frames actually INCREASED page faults from ${current[algo]} to ${next[algo]}! Non-stack algorithms like FIFO do not guarantee inclusion property.`,
        });
      }
    }
  }

  return {
    dataPoints,
    anomalies,
  };
}
