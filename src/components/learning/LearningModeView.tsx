import React, { useState, useEffect } from 'react';
import {
  AlgorithmType,
  LearningHistoryRecord,
  LearningProfile,
  SimulationConfig,
  SimulationStep,
} from '../../types';
import {
  evaluatePrediction,
  generateAdaptivePractice,
  getInitialLearningProfile,
  saveLearningProfile,
} from '../../engine/learningEngine';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  Award,
  Flame,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface LearningModeViewProps {
  currentStep: SimulationStep | undefined;
  algorithm: AlgorithmType;
  onApplyAdaptiveConfig: (newConfig: Partial<SimulationConfig>) => void;
  onNextStep: () => void;
}

export const LearningModeView: React.FC<LearningModeViewProps> = ({
  currentStep,
  algorithm,
  onApplyAdaptiveConfig,
  onNextStep,
}) => {
  const [profile, setProfile] = useState<LearningProfile>(getInitialLearningProfile);
  const [predictedOutcome, setPredictedOutcome] = useState<'hit' | 'fault' | null>(null);
  const [predictedVictim, setPredictedVictim] = useState<number | null>(null);
  const [submittedResult, setSubmittedResult] = useState<ReturnType<
    typeof evaluatePrediction
  > | null>(null);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Reset local state when step changes
  useEffect(() => {
    setPredictedOutcome(null);
    setPredictedVictim(null);
    setSubmittedResult(null);
  }, [currentStep?.index]);

  if (!currentStep) return null;

  const residentPages = currentStep.framesBefore.filter((f) => f !== null) as number[];
  const framesAreFull = !currentStep.framesBefore.includes(null);

  const handleSubmitPrediction = () => {
    if (!predictedOutcome) return;

    const evalResult = evaluatePrediction(
      currentStep,
      predictedOutcome,
      predictedVictim,
      algorithm
    );
    setSubmittedResult(evalResult);

    // Update learning profile
    const newStreak = evalResult.isFullyCorrect ? profile.streak + 1 : 0;
    const newBestStreak = Math.max(profile.bestStreak, newStreak);

    if (evalResult.isFullyCorrect && newStreak >= 3 && newStreak % 3 === 0) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {}
    }

    const updatedMistakes = { ...profile.mistakesByCategory };
    if (evalResult.mistake) {
      updatedMistakes[evalResult.mistake.category] =
        (updatedMistakes[evalResult.mistake.category] || 0) + 1;
    }

    const updatedMastery = { ...profile.masteryByAlgorithm };
    updatedMastery[algorithm] = {
      correct: updatedMastery[algorithm].correct + (evalResult.isFullyCorrect ? 1 : 0),
      total: updatedMastery[algorithm].total + 1,
    };

    const newRecord: LearningHistoryRecord = {
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      stepIndex: currentStep.index,
      requestedPage: currentStep.requestedPage,
      predictedOutcome,
      actualOutcome: currentStep.outcome,
      predictedVictim,
      actualVictim: currentStep.victimPage,
      isOutcomeCorrect: evalResult.isOutcomeCorrect,
      isVictimCorrect: evalResult.isVictimCorrect,
      mistake: evalResult.mistake,
    };

    const newProfile: LearningProfile = {
      totalPredictions: profile.totalPredictions + 1,
      correctPredictions: profile.correctPredictions + (evalResult.isFullyCorrect ? 1 : 0),
      streak: newStreak,
      bestStreak: newBestStreak,
      mistakesByCategory: updatedMistakes,
      masteryByAlgorithm: updatedMastery,
      history: [newRecord, ...profile.history.slice(0, 49)],
    };

    setProfile(newProfile);
    saveLearningProfile(newProfile);
  };

  const handleTriggerAdaptivePractice = () => {
    const practice = generateAdaptivePractice(profile, adaptiveDifficulty);
    onApplyAdaptiveConfig({
      referenceString: practice.referenceString,
      frameCount: practice.frameCount,
      algorithm: practice.recommendedAlgorithm,
    });
  };

  const accuracyRate =
    profile.totalPredictions > 0
      ? Math.round((profile.correctPredictions / profile.totalPredictions) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Learning Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-500/10 rounded-xl border border-brand-500/30">
            <GraduationCap className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interactive Mastery & Prediction Mode</h2>
            <p className="text-xs text-slate-400">
              Predict memory behavior before advancing each step to build intuitive mental models.
            </p>
          </div>
        </div>

        {/* Streak & Accuracy KPI Pills */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-slate-400">Streak:</span>
            <span className="font-bold text-amber-300">{profile.streak}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Accuracy:</span>
            <span className="font-bold text-emerald-300">
              {accuracyRate}% ({profile.correctPredictions}/{profile.totalPredictions})
            </span>
          </div>
        </div>
      </div>

      {/* Prediction Challenge Interactive Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono text-brand-400 font-bold uppercase tracking-wider block">
              Step #{currentStep.index + 1} Challenge
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Next Request: <span className="text-brand-300 font-mono">Page {currentStep.requestedPage}</span>
            </h3>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono block">Current RAM Policy</span>
            <span className="text-sm font-mono font-bold text-slate-200">{algorithm}</span>
          </div>
        </div>

        {/* Current State Preview */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">
              Current Resident Frames
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {currentStep.framesBefore.map((p, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200"
                >
                  F{idx}: {p !== null ? `P${p}` : 'Empty'}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Frames Status</span>
            <span className="font-bold text-slate-300">
              {framesAreFull ? 'All Frames Occupied' : 'Empty Frames Available'}
            </span>
          </div>
        </div>

        {/* Question 1: Hit or Fault? */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            1. Will this memory access produce a Hit or a Page Fault?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPredictedOutcome('hit')}
              disabled={Boolean(submittedResult)}
              className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                predictedOutcome === 'hit'
                  ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'bg-slate-950 hover:bg-slate-800/60 text-slate-300 border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Cache HIT (Page in RAM)</span>
            </button>

            <button
              onClick={() => setPredictedOutcome('fault')}
              disabled={Boolean(submittedResult)}
              className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                predictedOutcome === 'fault'
                  ? 'bg-rose-600 text-white border-rose-500 ring-2 ring-rose-500/30'
                  : 'bg-slate-950 hover:bg-slate-800/60 text-slate-300 border-slate-800'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>PAGE FAULT (Needs Fetch)</span>
            </button>
          </div>
        </div>

        {/* Question 2: If Fault & Frames Full, which victim is evicted? */}
        {predictedOutcome === 'fault' && framesAreFull && (
          <div className="space-y-2 animate-fadeIn">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              2. Frames are full: Which resident page will {algorithm} evict?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {residentPages.map((page) => (
                <button
                  key={page}
                  onClick={() => setPredictedVictim(page)}
                  disabled={Boolean(submittedResult)}
                  className={`p-2.5 rounded-lg border font-mono text-xs font-bold transition-all ${
                    predictedVictim === page
                      ? 'bg-amber-600 text-white border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  Evict Page {page}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit Prediction Button */}
        {!submittedResult ? (
          <button
            onClick={handleSubmitPrediction}
            disabled={
              !predictedOutcome ||
              (predictedOutcome === 'fault' && framesAreFull && predictedVictim === null)
            }
            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
              !predictedOutcome ||
              (predictedOutcome === 'fault' && framesAreFull && predictedVictim === null)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30'
            }`}
          >
            Submit Prediction & Verify
          </button>
        ) : (
          /* Instant Feedback & Educational Explanation */
          <div className="space-y-4 animate-fadeIn">
            <div
              className={`p-4 rounded-xl border ${
                submittedResult.isFullyCorrect
                  ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/60 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {submittedResult.isFullyCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">
                    {submittedResult.feedbackTitle}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {submittedResult.feedbackExplanation}
                  </p>
                  {submittedResult.mistake && (
                    <div className="mt-2 pt-2 border-t border-rose-900/50 text-xs">
                      <span className="font-bold text-amber-300">Key Tip: </span>
                      <span className="text-slate-300">
                        {submittedResult.mistake.recommendedTip}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onNextStep}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <span>Continue to Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Adaptive Practice Generator & Mistake Taxonomy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Adaptive Practice Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Adaptive Practice Generator
              </h3>
            </div>
            {/* Difficulty selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setAdaptiveDifficulty(diff)}
                  className={`px-2 py-0.5 rounded capitalize ${
                    adaptiveDifficulty === diff
                      ? 'bg-brand-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Generates tailored sequence exercises aimed directly at your most frequent mistake
            categories.
          </p>

          <button
            onClick={handleTriggerAdaptivePractice}
            className="w-full py-2 px-3 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/40 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate Adaptive Practice Session</span>
          </button>
        </div>

        {/* Algorithm Mastery Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Algorithm Mastery Levels</h3>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {(['FIFO', 'LRU', 'OPT', 'CLOCK'] as AlgorithmType[]).map((alg) => {
              const data = profile.masteryByAlgorithm[alg];
              const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

              return (
                <div key={alg} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{alg}</span>
                    <span>
                      {pct}% ({data.correct}/{data.total})
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
