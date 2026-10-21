import { describe, expect, it } from 'vitest';
import { runMultiAlgorithmComparison, findDivergencePoints, runFrameSweep } from './counterfactual';
import { analyzeWorkload, testRecommendationImprovement } from './workloadAnalyzer';
import { evaluatePrediction, generateAdaptivePractice, getInitialLearningProfile } from './learningEngine';
import { simulateSequence } from './simulationEngine';

describe('Counterfactual & Divergence Analysis', () => {
  const beladySeq = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

  it('detects divergence points between FIFO and LRU', () => {
    const traces = runMultiAlgorithmComparison({
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: beladySeq,
    });

    const divergences = findDivergencePoints(traces);
    expect(divergences.length).toBeGreaterThan(0);
    // There must be at least one step where outcomes or victims differ
    expect(divergences.some((d) => d.outcomes.FIFO !== d.outcomes.LRU || d.victims.FIFO !== d.victims.LRU)).toBe(true);
  });

  it("detects Bélády's Anomaly in frame-sweep report", () => {
    const report = runFrameSweep({
      algorithm: 'FIFO',
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: beladySeq,
    }, 1, 6);

    expect(report.anomalies.length).toBeGreaterThan(0);
    const fifoAnomaly = report.anomalies.find((a) => a.algorithm === 'FIFO');
    expect(fifoAnomaly).toBeDefined();
    expect(fifoAnomaly?.fromFrames).toBe(3);
    expect(fifoAnomaly?.toFrames).toBe(4);
    expect(fifoAnomaly?.toFaults).toBeGreaterThan(fifoAnomaly?.fromFaults ?? 0);
  });
});

describe('Workload-Aware Diagnosis & Remediation', () => {
  it('detects cyclic loops and flags thrashing risk when loop > frame count', () => {
    const loopSeq = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5];
    const config = {
      algorithm: 'FIFO' as const,
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: loopSeq,
    };
    const trace = simulateSequence(config);
    const diagnosis = analyzeWorkload(loopSeq, config, trace);

    expect(diagnosis.patterns.some((p) => p.id === 'cyclic_loop')).toBe(true);
    expect(diagnosis.thrashingRisk).toBe('critical');
    expect(diagnosis.recommendations.length).toBeGreaterThan(0);
  });

  it('detects sequential scans', () => {
    const scanSeq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const config = {
      algorithm: 'FIFO' as const,
      frameCount: 4,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: scanSeq,
    };
    const trace = simulateSequence(config);
    const diagnosis = analyzeWorkload(scanSeq, config, trace);

    expect(diagnosis.patterns.some((p) => p.id === 'sequential_scan')).toBe(true);
  });

  it('measures improvement when testing recommended fix', () => {
    const loopSeq = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5];
    const baseConfig = {
      algorithm: 'FIFO' as const,
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: loopSeq,
    };

    const result = testRecommendationImprovement(baseConfig, { frameCount: 5 });
    expect(result.faultReduction).toBeGreaterThan(0);
    expect(result.percentageGain).toBeGreaterThan(0);
  });
});

describe('Learning Mode & Mistake Taxonomy', () => {
  it('categorizes confusing FIFO with LRU mistake', () => {
    const trace = simulateSequence({
      algorithm: 'LRU',
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: [0, 1, 2, 0, 3], // At step 4 (page 3), frames are full [0, 1, 2]. Page 0 hit at step 3. Oldest arrived is 0, but LRU victim is 1!
    });

    const step4 = trace.steps[4];
    // User erroneously predicts that page 0 is evicted (because it arrived first)
    const evaluation = evaluatePrediction(step4, 'fault', 0, 'LRU');

    expect(evaluation.isFullyCorrect).toBe(false);
    expect(evaluation.isOutcomeCorrect).toBe(true);
    expect(evaluation.isVictimCorrect).toBe(false);
    expect(evaluation.mistake?.category).toBe('forgetting_lru_hit_recency');
  });

  it('generates adaptive practice based on user profile', () => {
    const profile = getInitialLearningProfile();
    profile.mistakesByCategory.forgetting_lru_hit_recency = 5;

    const practice = generateAdaptivePractice(profile, 'medium');
    expect(practice.recommendedAlgorithm).toBe('LRU');
    expect(practice.referenceString.length).toBeGreaterThan(0);
  });
});
