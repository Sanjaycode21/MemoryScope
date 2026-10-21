export type AlgorithmType = 'FIFO' | 'LRU' | 'OPT' | 'CLOCK';

export interface SimulationConfig {
  algorithm: AlgorithmType;
  frameCount: number; // 1 to 16
  pageSize: number; // In bytes, e.g. 4096 (4 KB)
  addressSpaceSize: number; // In bytes, e.g. 65536 (64 KB) or pages count
  referenceString: number[]; // Sequence of requested page numbers
}

export interface PageTableEntry {
  pageNumber: number;
  frameNumber: number | null;
  valid: boolean;
  loadTime: number | null;
  lastUsedTime: number | null;
  referenceBit: number; // For Clock algorithm (0 or 1)
  dirty: boolean;
}

export interface DecisionData {
  algorithm: AlgorithmType;
  reason: string;
  victimCandidate: number | null;
  fifoQueue?: { page: number; arrivalTime: number }[];
  lruRankings?: { page: number; lastUsedTime: number; age: number }[];
  optDistances?: {
    page: number;
    nextUseIndex: number | null;
    distance: number | 'infinity';
    willBeUsedAgain: boolean;
  }[];
  clockState?: {
    hand: number;
    frameBits: { frameIndex: number; page: number; refBit: number }[];
    inspectedFrames: number[];
  };
}

export interface StepExplanation {
  title: string;
  summary: string;
  detail: string;
  ruleApplied: string;
}

export interface TLBEntry {
  vpn: number;
  ppn: number;
  valid: boolean;
  lastUsed: number;
}

export interface TLBState {
  enabled: boolean;
  entries: TLBEntry[];
  hit: boolean;
  hitVPN: number | null;
}

export interface SimulationStep {
  index: number; // 0-based step index
  requestedPage: number;
  outcome: 'hit' | 'fault';
  framesBefore: (number | null)[];
  framesAfter: (number | null)[];
  victimPage: number | null; // Page that got evicted, or null
  allocatedFrame: number; // Which frame index was hit or updated
  pageTableSnapshot: PageTableEntry[];
  decisionData: DecisionData;
  explanation: StepExplanation;
  virtualAddress: number;
  physicalAddress: number | null; // null if page fault before loading
  tlbState?: TLBState;
  cumulativeHits: number;
  cumulativeFaults: number;
  cumulativeReplacements: number;
}

export interface TraceSummary {
  totalRequests: number;
  hits: number;
  faults: number;
  hitRatio: number; // 0.0 to 1.0
  faultRatio: number; // 0.0 to 1.0
  replacements: number;
  peakFramesUsed: number;
  memoryUtilization: number; // % (peakFramesUsed / frameCount * 100)
}

export interface SimulationTrace {
  config: SimulationConfig;
  steps: SimulationStep[];
  summary: TraceSummary;
}

export interface DetectedPattern {
  id: string;
  name: string;
  confidence: number; // 0.0 to 1.0
  description: string;
  evidence: string[];
}

export interface WorkloadDiagnosis {
  patterns: DetectedPattern[];
  workingSetWindow: number;
  avgWorkingSetSize: number;
  maxWorkingSetSize: number;
  thrashingRisk: 'low' | 'moderate' | 'critical';
  diagnosisSummary: string;
  evidence: string[];
  recommendations: {
    title: string;
    description: string;
    suggestedConfig: Partial<SimulationConfig>;
    actionLabel: string;
  }[];
}

export type MistakeCategory =
  | 'confusing_fifo_with_lru'
  | 'forgetting_lru_hit_recency'
  | 'miscounting_opt_distance'
  | 'clock_reference_bit_reset'
  | 'resident_status_confusion'
  | 'frame_allocation_misunderstanding';

export interface LearningMistake {
  category: MistakeCategory;
  categoryLabel: string;
  explanation: string;
  recommendedTip: string;
}

export interface LearningHistoryRecord {
  id: string;
  timestamp: number;
  stepIndex: number;
  requestedPage: number;
  predictedOutcome: 'hit' | 'fault';
  actualOutcome: 'hit' | 'fault';
  predictedVictim: number | null;
  actualVictim: number | null;
  isOutcomeCorrect: boolean;
  isVictimCorrect: boolean;
  mistake?: LearningMistake;
}

export interface LearningProfile {
  totalPredictions: number;
  correctPredictions: number;
  streak: number;
  bestStreak: number;
  mistakesByCategory: Record<MistakeCategory, number>;
  masteryByAlgorithm: Record<AlgorithmType, { correct: number; total: number }>;
  history: LearningHistoryRecord[];
}
