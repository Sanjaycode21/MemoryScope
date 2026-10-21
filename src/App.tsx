import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlgorithmType, SimulationConfig } from './types';
import { simulateSequence } from './engine/simulationEngine';
import { PRESET_SCENARIOS, PresetScenario } from './presets';
import { Navbar, ActiveTab } from './components/Navbar';
import { SetupBar } from './components/simulation/SetupBar';
import { PlaybackControls } from './components/simulation/PlaybackControls';
import { PhysicalMemoryView } from './components/simulation/PhysicalMemoryView';
import { PageTableView } from './components/simulation/PageTableView';
import { AddressTranslationView } from './components/simulation/AddressTranslationView';
import { TLBView } from './components/simulation/TLBView';
import { TimelineView } from './components/simulation/TimelineView';
import { MetricsPanel } from './components/simulation/MetricsPanel';
import { ExplanationWhyPanel } from './components/simulation/ExplanationWhyPanel';
import { CounterfactualView } from './components/comparison/CounterfactualView';
import { WorkloadDiagnosisView } from './components/diagnosis/WorkloadDiagnosisView';
import { LearningModeView } from './components/learning/LearningModeView';
import { GlossaryView } from './components/glossary/GlossaryView';
import { ExportModal } from './components/export/ExportModal';

export const App: React.FC = () => {
  // Read initial configuration from URL params if available, else default to Silberschatz classic
  const initialConfig: SimulationConfig = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlAlgo = params.get('algo') as AlgorithmType | null;
      const urlFrames = Number(params.get('frames'));
      const urlSeq = params.get('seq');

      if (urlSeq) {
        const parsedSeq = urlSeq.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
        if (parsedSeq.length > 0) {
          return {
            algorithm: urlAlgo || 'FIFO',
            frameCount: !isNaN(urlFrames) && urlFrames >= 1 && urlFrames <= 16 ? urlFrames : 3,
            pageSize: 4096,
            addressSpaceSize: 65536,
            referenceString: parsedSeq,
          };
        }
      }
    }

    return {
      algorithm: 'FIFO',
      frameCount: 3,
      pageSize: 4096,
      addressSpaceSize: 65536,
      referenceString: PRESET_SCENARIOS[0].referenceString,
    };
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('simulation');
  const [config, setConfig] = useState<SimulationConfig>(initialConfig);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [tlbEnabled, setTlbEnabled] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Compute deterministic full simulation trace whenever config changes
  const trace = useMemo(() => {
    return simulateSequence(config);
  }, [config]);

  // Ensure current step index stays in bounds
  useEffect(() => {
    if (currentStepIndex >= trace.steps.length) {
      setCurrentStepIndex(Math.max(0, trace.steps.length - 1));
    }
  }, [trace.steps.length, currentStepIndex]);

  // Auto-play timer
  const playTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1000 / speed);
      playTimerRef.current = window.setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= trace.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, speed, trace.steps.length]);

  const handleSelectPreset = (preset: PresetScenario) => {
    setIsPlaying(false);
    setConfig({
      ...config,
      referenceString: [...preset.referenceString],
      frameCount: preset.frameCount,
      algorithm: preset.recommendedAlgorithm,
    });
    setCurrentStepIndex(0);
  };

  const handleApplyConfig = (patch: Partial<SimulationConfig>) => {
    setIsPlaying(false);
    setConfig((prev) => ({ ...prev, ...patch }));
    setCurrentStepIndex(0);
  };

  const currentStep = trace.steps[currentStepIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectPreset={handleSelectPreset}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenQuickWhatIf={() => setActiveTab('compare')}
        tlbEnabled={tlbEnabled}
        setTlbEnabled={setTlbEnabled}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Global Setup Bar & Scenarios */}
        <SetupBar
          config={config}
          onChangeConfig={handleApplyConfig}
          onReset={() => {
            setIsPlaying(false);
            setCurrentStepIndex(0);
          }}
        />

        {/* TAB 1: Simulation Workspace */}
        {activeTab === 'simulation' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Playback Scrubber & Speed Controls */}
            <PlaybackControls
              currentStepIndex={currentStepIndex}
              totalSteps={trace.steps.length}
              isPlaying={isPlaying}
              speed={speed}
              onPlay={() => {
                if (currentStepIndex >= trace.steps.length - 1) {
                  setCurrentStepIndex(0);
                }
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onStepForward={() => {
                setIsPlaying(false);
                setCurrentStepIndex((prev) => Math.min(trace.steps.length - 1, prev + 1));
              }}
              onStepBack={() => {
                setIsPlaying(false);
                setCurrentStepIndex((prev) => Math.max(0, prev - 1));
              }}
              onReset={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
              onJumpToStep={(idx) => {
                setIsPlaying(false);
                setCurrentStepIndex(idx);
              }}
              onChangeSpeed={setSpeed}
            />

            {/* Metrics Ribbon */}
            <MetricsPanel
              summary={trace.summary}
              currentStep={currentStep}
              steps={trace.steps}
            />

            {/* Physical Memory & Decision "Why" Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-6">
                <PhysicalMemoryView
                  currentStep={currentStep}
                  frameCount={config.frameCount}
                  algorithm={config.algorithm}
                />

                {tlbEnabled && currentStep && (
                  <TLBView tlbState={currentStep.tlbState} />
                )}

                {currentStep && (
                  <AddressTranslationView
                    pageSize={config.pageSize}
                    pageTable={currentStep.pageTableSnapshot}
                    currentVirtualAddress={currentStep.virtualAddress}
                  />
                )}
              </div>

              <div className="lg:col-span-5 space-y-6">
                <ExplanationWhyPanel
                  step={currentStep}
                  algorithm={config.algorithm}
                />

                {currentStep && (
                  <PageTableView
                    pageTable={currentStep.pageTableSnapshot}
                    currentlyRequestedPage={currentStep.requestedPage}
                  />
                )}
              </div>
            </div>

            {/* Complete Timeline Matrix */}
            <TimelineView
              steps={trace.steps}
              currentStepIndex={currentStepIndex}
              frameCount={config.frameCount}
              onSelectStep={(idx) => {
                setIsPlaying(false);
                setCurrentStepIndex(idx);
              }}
            />
          </div>
        )}

        {/* TAB 2: Counterfactual Compare */}
        {activeTab === 'compare' && (
          <div className="animate-fadeIn">
            <CounterfactualView
              config={config}
              onApplyConfig={handleApplyConfig}
            />
          </div>
        )}

        {/* TAB 3: Workload-Aware Diagnosis */}
        {activeTab === 'diagnosis' && (
          <div className="animate-fadeIn">
            <WorkloadDiagnosisView
              config={config}
              currentTrace={trace}
              onApplyConfig={handleApplyConfig}
            />
          </div>
        )}

        {/* TAB 4: Learning & Mastery Mode */}
        {activeTab === 'learning' && (
          <div className="animate-fadeIn">
            <LearningModeView
              currentStep={currentStep}
              algorithm={config.algorithm}
              onApplyAdaptiveConfig={handleApplyConfig}
              onNextStep={() => {
                setCurrentStepIndex((prev) => Math.min(trace.steps.length - 1, prev + 1));
              }}
            />
          </div>
        )}

        {/* TAB 5: Virtual Memory Glossary */}
        {activeTab === 'glossary' && (
          <div className="animate-fadeIn">
            <GlossaryView />
          </div>
        )}
      </main>

      {/* Export & Share Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        trace={trace}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MemoryScope — Explainable Virtual Memory Analysis & Simulation</span>
          <span>Deterministic OS Paging Model • FIFO, LRU, Optimal & Clock</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
