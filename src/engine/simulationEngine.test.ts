import { describe, expect, it } from 'vitest';
import { simulateSequence } from './simulationEngine';

describe('Simulation Engine Correctness', () => {
  // Silberschatz textbook classic: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1 (20 references) with 3 frames
  const textbookSeq = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];

  it('matches textbook results for FIFO with 3 frames (15 faults)', () => {
    const trace = simulateSequence({
      algorithm: 'FIFO',
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: textbookSeq,
    });

    expect(trace.summary.faults).toBe(15);
    expect(trace.summary.hits).toBe(5);
    expect(trace.summary.replacements).toBe(12); // 3 cold fills + 12 replacements
  });

  it('matches textbook results for LRU with 3 frames (12 faults)', () => {
    const trace = simulateSequence({
      algorithm: 'LRU',
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: textbookSeq,
    });

    expect(trace.summary.faults).toBe(12);
    expect(trace.summary.hits).toBe(8);
  });

  it('matches textbook results for Optimal (OPT) with 3 frames (9 faults)', () => {
    const trace = simulateSequence({
      algorithm: 'OPT',
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: textbookSeq,
    });

    expect(trace.summary.faults).toBe(9);
    expect(trace.summary.hits).toBe(11);
  });

  it("verifies Belady's Anomaly on FIFO (3 frames = 9 faults vs 4 frames = 10 faults)", () => {
    const beladySeq = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

    const fifo3 = simulateSequence({
      algorithm: 'FIFO',
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: beladySeq,
    });

    const fifo4 = simulateSequence({
      algorithm: 'FIFO',
      frameCount: 4,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: beladySeq,
    });

    expect(fifo3.summary.faults).toBe(9);
    expect(fifo4.summary.faults).toBe(10);
    // Belady's Anomaly confirmed: 4 frames had MORE faults than 3 frames!
    expect(fifo4.summary.faults).toBeGreaterThan(fifo3.summary.faults);
  });

  it('handles edge case: 1 frame', () => {
    const trace = simulateSequence({
      algorithm: 'LRU',
      frameCount: 1,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: [1, 2, 1, 2, 1],
    });

    expect(trace.summary.faults).toBe(5);
    expect(trace.summary.hits).toBe(0);
    expect(trace.steps.map((s) => s.framesAfter[0])).toEqual([1, 2, 1, 2, 1]);
  });

  it('handles edge case: repeated requests to same page', () => {
    const trace = simulateSequence({
      algorithm: 'FIFO',
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: [1, 1, 1, 1, 1],
    });

    expect(trace.summary.faults).toBe(1);
    expect(trace.summary.hits).toBe(4);
    expect(trace.summary.replacements).toBe(0);
  });

  it('handles edge case: more frames than unique pages', () => {
    const trace = simulateSequence({
      algorithm: 'LRU',
      frameCount: 8,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: [0, 1, 2, 0, 1, 2],
    });

    expect(trace.summary.faults).toBe(3);
    expect(trace.summary.hits).toBe(3);
    expect(trace.summary.replacements).toBe(0);
  });

  it('meets non-functional requirement: 1,000 requests computed in < 200 ms', () => {
    const largeSeq = Array.from({ length: 1000 }, (_, i) => (i * 7 + 3) % 20);

    const start = performance.now();
    const trace = simulateSequence({
      algorithm: 'LRU',
      frameCount: 4,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: largeSeq,
    });
    const duration = performance.now() - start;

    expect(trace.steps.length).toBe(1000);
    expect(duration).toBeLessThan(200); // PRD: "a full run computes in under 200 ms"
  });
});
