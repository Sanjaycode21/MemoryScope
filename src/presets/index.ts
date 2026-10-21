import { AlgorithmType } from '../types';

export interface PresetScenario {
  id: string;
  name: string;
  category: 'Textbook' | 'Anomaly' | 'Workload' | 'Comparative';
  description: string;
  referenceString: number[];
  frameCount: number;
  recommendedAlgorithm: AlgorithmType;
  highlightInsight: string;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'silberschatz_classic',
    name: 'Silberschatz Classic Textbook',
    category: 'Textbook',
    description:
      'The canonical 20-reference sequence from Abraham Silberschatz Operating System Concepts (9th/10th Edition).',
    referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1],
    frameCount: 3,
    recommendedAlgorithm: 'FIFO',
    highlightInsight: 'FIFO yields 15 faults, LRU yields 12 faults, and Optimal achieves 9 faults.',
  },
  {
    id: 'belady_anomaly',
    name: "Bélády's Anomaly Demo",
    category: 'Anomaly',
    description:
      "A classic reference sequence demonstrating Bélády's Anomaly where allocating 4 frames produces MORE faults (10) than 3 frames (9) under FIFO!",
    referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
    frameCount: 3,
    recommendedAlgorithm: 'FIFO',
    highlightInsight:
      'Compare 3 frames vs 4 frames in Counterfactual analysis to see 9 faults escalate to 10 under FIFO.',
  },
  {
    id: 'cyclic_thrashing',
    name: 'Cyclic Thrashing (Loop of 5 in 3 Frames)',
    category: 'Workload',
    description:
      'An application iterating repeatedly through 5 pages (1..5) with only 3 physical frames allocated.',
    referenceString: [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
    frameCount: 3,
    recommendedAlgorithm: 'FIFO',
    highlightInsight:
      'Triggers 100% page fault frequency (15 faults in 15 requests). Use Workload Diagnosis to evaluate the fix.',
  },
  {
    id: 'temporal_locality',
    name: 'Hot Working Set (High Temporal Locality)',
    category: 'Workload',
    description:
      'A workload with a tight working set (pages 1 and 2) interleaved with occasional accesses to pages 3 and 4.',
    referenceString: [1, 2, 1, 2, 3, 1, 2, 1, 4, 1, 2, 1, 3, 1, 2],
    frameCount: 3,
    recommendedAlgorithm: 'LRU',
    highlightInsight:
      'LRU achieves near 80% hit ratio by prioritizing recently touched pages over arbitrary arrival order.',
  },
  {
    id: 'sequential_scan',
    name: 'Sequential Array Scan (Table Streaming)',
    category: 'Workload',
    description:
      'A streaming process reading consecutive pages monotonically without revisiting previous pages.',
    referenceString: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    frameCount: 4,
    recommendedAlgorithm: 'FIFO',
    highlightInsight:
      'Shows 0% cache hit ratio regardless of algorithm, demonstrating pure compulsory miss behavior.',
  },
  {
    id: 'matrix_traversal',
    name: 'Column-Major Strided Traversal',
    category: 'Workload',
    description:
      'Simulating iterating down columns of a large row-major 2D matrix, producing large strides between page accesses.',
    referenceString: [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 0, 4, 8, 12],
    frameCount: 4,
    recommendedAlgorithm: 'LRU',
    highlightInsight:
      'High cache miss rate due to poor spatial and temporal locality across wide strides.',
  },
];
