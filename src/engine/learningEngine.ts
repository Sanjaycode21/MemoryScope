import {
  AlgorithmType,
  LearningMistake,
  LearningProfile,
  MistakeCategory,
  SimulationStep,
} from '../types';

const STORAGE_KEY = 'memoryscope_learning_profile_v1';

export function getInitialLearningProfile(): LearningProfile {
  const defaultProfile: LearningProfile = {
    totalPredictions: 0,
    correctPredictions: 0,
    streak: 0,
    bestStreak: 0,
    mistakesByCategory: {
      confusing_fifo_with_lru: 0,
      forgetting_lru_hit_recency: 0,
      miscounting_opt_distance: 0,
      clock_reference_bit_reset: 0,
      resident_status_confusion: 0,
      frame_allocation_misunderstanding: 0,
    },
    masteryByAlgorithm: {
      FIFO: { correct: 0, total: 0 },
      LRU: { correct: 0, total: 0 },
      OPT: { correct: 0, total: 0 },
      CLOCK: { correct: 0, total: 0 },
    },
    history: [],
  };

  if (typeof window === 'undefined') return defaultProfile;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw);
    return { ...defaultProfile, ...parsed };
  } catch {
    return defaultProfile;
  }
}

export function saveLearningProfile(profile: LearningProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save learning profile:', err);
  }
}

export function evaluatePrediction(
  step: SimulationStep,
  predictedOutcome: 'hit' | 'fault',
  predictedVictim: number | null,
  algorithm: AlgorithmType
): {
  isOutcomeCorrect: boolean;
  isVictimCorrect: boolean;
  isFullyCorrect: boolean;
  mistake?: LearningMistake;
  feedbackTitle: string;
  feedbackExplanation: string;
} {
  const actualOutcome = step.outcome;
  const actualVictim = step.victimPage;
  const isOutcomeCorrect = predictedOutcome === actualOutcome;

  // Victim check is relevant only on eviction faults
  const isEviction = actualOutcome === 'fault' && actualVictim !== null;
  const isVictimCorrect = isEviction ? predictedVictim === actualVictim : true;
  const isFullyCorrect = isOutcomeCorrect && isVictimCorrect;

  if (isFullyCorrect) {
    return {
      isOutcomeCorrect: true,
      isVictimCorrect: true,
      isFullyCorrect: true,
      feedbackTitle: 'Correct Prediction!',
      feedbackExplanation:
        actualOutcome === 'hit'
          ? `Spot on! Page ${step.requestedPage} was already resident in Frame ${step.allocatedFrame}.`
          : isEviction
          ? `Outstanding! You correctly anticipated the Page Fault AND identified Page ${actualVictim} as the victim under ${algorithm}.`
          : `Correct! Page ${step.requestedPage} faulted and was placed directly into empty Frame ${step.allocatedFrame}.`,
    };
  }

  // Determine specific educational mistake categorization
  let mistake: LearningMistake;

  if (!isOutcomeCorrect) {
    if (predictedOutcome === 'hit' && actualOutcome === 'fault') {
      mistake = {
        category: 'resident_status_confusion',
        categoryLabel: 'Resident Status Misidentification',
        explanation: `You predicted a HIT, but Page ${step.requestedPage} was NOT present in physical frames [${step.framesBefore
          .filter((f) => f !== null)
          .join(', ')}].`,
        recommendedTip:
          'Always inspect the current resident frames before predicting. A hit only occurs if the requested page is already loaded.',
      };
    } else {
      mistake = {
        category: 'resident_status_confusion',
        categoryLabel: 'Unnecessary Fault Prediction',
        explanation: `You predicted a FAULT, but Page ${step.requestedPage} was already resident in Frame ${step.allocatedFrame}!`,
        recommendedTip:
          'Scan physical memory frames first. If the requested page number matches any allocated frame, it is an instant cache hit.',
      };
    }
  } else {
    // Outcome was correct (fault), but victim was wrong
    if (step.framesBefore.includes(null)) {
      mistake = {
        category: 'frame_allocation_misunderstanding',
        categoryLabel: 'Cold Frame Allocation Confusion',
        explanation: `You predicted an eviction, but Frame ${step.allocatedFrame} was completely empty! No page needed to be evicted.`,
        recommendedTip:
          'Physical frames are filled sequentially during initial cold faults before any replacement algorithm needs to evict a page.',
      };
    } else if (algorithm === 'FIFO') {
      mistake = {
        category: 'confusing_fifo_with_lru',
        categoryLabel: 'Confusing FIFO with LRU',
        explanation: `You predicted Page ${predictedVictim}, but FIFO evicts the page loaded earliest into memory (Page ${actualVictim}).`,
        recommendedTip:
          'Remember: FIFO strictly looks at arrival timestamps. Cache hits do NOT change arrival order in FIFO!',
      };
    } else if (algorithm === 'LRU') {
      // Did user pick the oldest arrived page instead of least recently used?
      const arrivedEarliest = step.decisionData.fifoQueue?.[0]?.page;
      if (arrivedEarliest !== undefined && predictedVictim === arrivedEarliest && actualVictim !== arrivedEarliest) {
        mistake = {
          category: 'forgetting_lru_hit_recency',
          categoryLabel: 'Forgetting LRU Hit Recency Update',
          explanation: `You chose Page ${predictedVictim} because it arrived early, but a recent cache hit refreshed its recency timer! LRU evicts Page ${actualVictim}.`,
          recommendedTip:
            'Crucial rule: In LRU, every hit resets that page to "most recently used". Look for which page has gone longest without ANY access.',
        };
      } else {
        mistake = {
          category: 'confusing_fifo_with_lru',
          categoryLabel: 'LRU Recency Miscalculation',
          explanation: `Page ${actualVictim} had the oldest last-used timestamp among resident frames. Page ${predictedVictim} was accessed more recently.`,
          recommendedTip:
            'Order the resident pages by their most recent access step. The one furthest in the past is the LRU victim.',
        };
      }
    } else if (algorithm === 'OPT') {
      mistake = {
        category: 'miscounting_opt_distance',
        categoryLabel: 'Optimal Lookahead Error',
        explanation: `Optimal looks forward: Page ${actualVictim} is needed furthest in the future (or never again), whereas Page ${predictedVictim} is needed sooner!`,
        recommendedTip:
          'Scan forward in the future sequence. For each page in memory, find its next occurrence. Pick the one with the maximum distance.',
      };
    } else {
      mistake = {
        category: 'clock_reference_bit_reset',
        categoryLabel: 'Clock Reference Bit Transition',
        explanation: `The clock hand skipped candidate pages because their reference bit R was 1 (clearing it to 0), and evicted Page ${actualVictim} whose R bit was 0.`,
        recommendedTip:
          'Clock gives pages with R=1 a second chance. Trace the hand around the ring and flip 1s to 0s until an R=0 page is found.',
      };
    }
  }

  return {
    isOutcomeCorrect,
    isVictimCorrect,
    isFullyCorrect: false,
    mistake,
    feedbackTitle: 'Incorrect Prediction',
    feedbackExplanation: mistake.explanation,
  };
}

export function generateAdaptivePractice(
  profile: LearningProfile,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): {
  referenceString: number[];
  frameCount: number;
  recommendedAlgorithm: AlgorithmType;
  focusArea: string;
} {
  // Identify most frequent mistake category
  const mistakeCounts = profile.mistakesByCategory;
  const categories = Object.keys(mistakeCounts) as MistakeCategory[];
  let worstCategory: MistakeCategory = 'forgetting_lru_hit_recency';
  let maxMistakes = -1;

  for (const cat of categories) {
    if (mistakeCounts[cat] > maxMistakes) {
      maxMistakes = mistakeCounts[cat];
      worstCategory = cat;
    }
  }

  let frameCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 3 : 4;
  let recommendedAlgorithm: AlgorithmType = 'LRU';
  let focusArea = 'Targeting your most frequent challenge';
  let referenceString: number[] = [];

  if (worstCategory === 'forgetting_lru_hit_recency' || worstCategory === 'confusing_fifo_with_lru') {
    recommendedAlgorithm = 'LRU';
    focusArea = 'Mastering Hit Recency Updates in LRU vs FIFO';
    if (difficulty === 'easy') {
      // 0, 1, 2 loaded. 0 hits (recency refreshed). 3 arrives -> must evict 1, NOT 0!
      referenceString = [0, 1, 2, 0, 3, 2, 4, 0, 1];
    } else if (difficulty === 'medium') {
      referenceString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3];
    } else {
      referenceString = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    }
  } else if (worstCategory === 'miscounting_opt_distance') {
    recommendedAlgorithm = 'OPT';
    focusArea = 'Future Lookahead Distance Precision in Optimal';
    if (difficulty === 'easy') {
      referenceString = [1, 2, 3, 4, 1, 2, 1, 3];
    } else if (difficulty === 'medium') {
      referenceString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3];
    } else {
      referenceString = [2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2];
    }
  } else if (worstCategory === 'clock_reference_bit_reset') {
    recommendedAlgorithm = 'CLOCK';
    focusArea = 'Clock Second-Chance Reference Bit Transitions';
    referenceString = [1, 2, 3, 1, 4, 2, 5, 3, 1];
  } else {
    // Default balanced sequence
    recommendedAlgorithm = 'FIFO';
    focusArea = 'Basic Paging & Compulsory Miss vs Capacity Miss';
    referenceString = difficulty === 'easy' ? [0, 1, 2, 0, 1, 3] : [1, 2, 3, 4, 1, 2, 5, 1, 2];
  }

  return {
    referenceString,
    frameCount,
    recommendedAlgorithm,
    focusArea,
  };
}
