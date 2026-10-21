# MemoryScope: Explainable Virtual Memory Analysis & Simulation System

> An interactive, web-based educational system that simulates virtual memory management, explains replacement decisions in natural language, analyzes workload patterns, compares counterfactual configurations, and guides student learning with an adaptive prediction loop.

Built strictly according to the **MemoryScope Product Requirements Document (PRD v1.0)**.

---

## 🌟 Core Capabilities & Features

### 1. Simulation Engine (FR-1 – FR-6)
- **Supported Algorithms**: FIFO, LRU, Optimal (Bélády's MIN), and Clock (Second-Chance).
- **Deterministic Step-by-Step State**: Frame allocation, hits, cold faults, replacements, page table updates, and cumulative metrics.
- **Configurable Parameters**:
  - Reference strings (comma/space-separated input, format validation, random generation, textbook presets).
  - Number of frames (1 to 16).
  - Page size (1 KB to 8 KB) and address space size.
- **Playback Controls**: Step forward, step back, auto-play with speed control (0.5x, 1x, 2x, 4x), scrubber slider, and keyboard shortcuts (`[Space]`, `[←]`, `[→]`, `[R]`).

### 2. Multi-View Real-Time Visualizations (FR-4, FR-7)
- **Physical Memory View**: RAM frames with resident pages, distinct color-coded and accessible badges for Hit (green), Cold Fault (rose), Eviction (amber), and Idle/Empty.
- **Process Page Table View**: Shows VPN, Valid/Present bit, PPN (Frame #), load step, last used step, and reference bit.
- **Address Translation Pipeline**: Interactive decomposition of Virtual Address (VA) into VPN and Offset based on page size, MMU table lookup, PPN synthesis, and physical address calculation or hardware page-fault trap.
- **TLB Teaching View (Optional)**: Translation Lookaside Buffer simulation showing fast-path cache hits (~0.5 ns) vs slow-path page table walks.
- **Timeline Matrix**: Interactive grid showing all memory frames across all time steps with click-to-scrub navigation.
- **Live Metrics Ribbon**: Page hits, faults, hit ratio %, fault ratio %, replacements count, RAM utilization %, and sparkline hit-rate curves.

### 3. Explainable Simulation & Decision "Why" Panel (FR-8)
- **Deterministic Rule-Based Explanations**: Generates natural language explanations for every step explaining *why* it hit or faulted and *why* a particular victim page was chosen.
- **Algorithm Decision Tables**:
  - **FIFO**: Queue ordered by arrival timestamp, highlighting the oldest page.
  - **LRU**: Recency ranking list with idle age and last-used step.
  - **Optimal (OPT)**: Lookahead distance table showing future reference steps (+N steps or NEVER AGAIN).
  - **Clock**: Circular dial pointer showing reference bits ($R=0$ or $R=1$) and inspected second chances.

### 4. Counterfactual Analysis & Bélády's Anomaly (FR-9, FR-10, FR-11)
- **Side-by-Side Comparison**: Runs FIFO, LRU, Optimal, and Clock simultaneously on identical inputs.
- **Divergence Point Inspector**: Detects every step where algorithms diverge in hit/fault outcome or victim selection, explaining the underlying architectural cause.
- **Frame-Count Sweep Chart**: SVG curve charting page faults vs frames (1 to 8/16).
- **Bélády's Anomaly Detection**: Automatically flags non-stack anomalies (e.g. FIFO 3 frames producing 9 faults vs 4 frames producing 10 faults).
- **One-Click "What If" Studio**: Instant testing of $+1$ Frame, $-1$ Frame, or switching to the theoretical Optimal lower bound.

### 5. Workload-Aware Diagnosis & "Test This Fix" (FR-12, FR-13)
- **Pattern Recognition**: Detects Sequential Scans, Cyclic Loops (with period length), Temporal Locality, Spatial Locality, and Random access.
- **Working-Set Size Estimation**: Computes sliding window working-set $W(t, \Delta)$ and flags critical thrashing risk when $W(t, \Delta) > \text{Frames}$.
- **Root-Cause Diagnostic Report**: Summary, supporting evidence, and actionable recommendations.
- **"Test This Fix" Live Benchmark**: One-click re-simulation testing recommended configurations with measured fault reduction % and hit-rate improvements.

### 6. Interactive Learning Mode & Adaptive Practice (FR-14, FR-15)
- **Step-by-Step Prediction Challenge**: Students predict HIT or FAULT, and if FAULT, predict which resident page is evicted.
- **Targeted Feedback & Mistake Categorization**:
  - `confusing_fifo_with_lru` (arrival order vs access recency)
  - `forgetting_lru_hit_recency` (forgetting hits reset recency)
  - `miscounting_opt_distance` (lookahead distance calculation errors)
  - `clock_reference_bit_reset` (second chance bit clearing)
  - `resident_status_confusion` & `frame_allocation_misunderstanding`
- **Adaptive Practice Generator**: Creates tailored practice sequences with Easy, Medium, and Hard difficulty targeting the user's specific weak areas.
- **Mastery Dashboard**: Algorithm mastery bars, streak counter, and confetti celebration on successful runs.

### 7. Presets, OS Glossary & Data Export (FR-16)
- **Textbook Presets**: Silberschatz classic, Bélády's anomaly demo, cyclic thrashing loop, temporal locality working set, and sequential scan.
- **OS Virtual Memory Glossary**: Searchable encyclopedia of virtual memory concepts, definitions, and core rules.
- **Export & Share**: Full JSON trace download, CSV spreadsheet export, and shareable URL query parameters.

---

## 🚀 Quickstart & Verification

### Install & Run Dev Server
```bash
npm install
npm run dev
```

### Run Automated Unit Tests (15 tests covering textbook sequences)
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## 🧪 Automated Test Verification

All 15 automated test cases verify:
1. **Silberschatz Textbook (3 frames, 20 requests)**:
   - FIFO: Exactly 15 faults
   - LRU: Exactly 12 faults
   - Optimal: Exactly 9 faults
2. **Bélády's Anomaly**:
   - FIFO 3 frames: 9 faults
   - FIFO 4 frames: 10 faults (anomaly verified)
3. **Edge Cases**:
   - 1 frame allocation
   - Repeated requests to the same page
   - More frames than distinct pages
4. **Non-Functional Requirement (NFR)**:
   - 1,000 requests computed in $<200\text{ ms}$ (measured $<25\text{ ms}$).
5. **Pattern Detection & Diagnosis**:
   - Cyclic loop detection & thrashing warning
   - Sequential scan detection
   - Recommendation re-simulation measurement
6. **Learning Mistake Categorization**:
   - Mistake taxonomy detection and adaptive practice sequence generation.
