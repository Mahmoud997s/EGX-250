# Product Requirements Document (PRD)
## EGX Market Intelligence System

### 1. Product Overview
The EGX Market Intelligence System is a fully deterministic, backend-only financial analysis pipeline for the Egyptian Exchange (EGX). It scrapes raw OHLC (Open, High, Low, Close) data, calculates classical support and resistance levels, determines market bias, and maintains historical context to deduce market regimes (e.g., Accumulation, Distribution).

### 2. Architecture & Components
The system is composed of four strictly sequential engines, orchestrated by a Pipeline Controller (`run_pipeline.js`).

**A. Scraper & Orchestrator (`orchestrator.js`)**
- Connects to TradingView and streams OHLC data for a configurable list of symbols.
- Implements chunking, retries, and circuit breakers.
- Outputs raw data as a JSONL stream (`data/output.jsonl`).

**B. Pivot Engine (`pivot_engine.js`)**
- Reads raw data and calculates the Classic Pivot Point.
- Calculates 4 Support levels (S1-S4) and 4 Resistance levels (R1-R4).
- Validates High >= Low and Close is within bounds.
- Outputs calculated levels to `data/levels.jsonl`.

**C. Intelligence Engine (`intelligence_engine.js`)**
- Evaluates the proximity of the Current Price to the Pivot levels.
- Assigns a `bias` (STRONG_BULL, WEAK_BULL, NEUTRAL, WEAK_BEAR, STRONG_BEAR) based on predefined percentage thresholds.
- Detects technical signals (e.g., `SUPPORT_BOUNCE_S1`, `BREAKOUT_R1`).
- Outputs intelligent signals to `data/intelligence.jsonl`.

**D. Time Intelligence Engine (`time_intelligence_engine.js`)**
- Appends daily results to an append-only historical database (`data/history.jsonl`).
- Analyzes the last 5 days of history for each symbol.
- Determines the market regime based on multi-day trends (e.g., `ACCUMULATION`, `DISTRIBUTION`, `TRENDING_UP`, `SIDEWAYS_RANGE`).
- Calculates a dynamic Time-Based Strength Score (TSS).
- Outputs the final temporal analysis to `data/time_intelligence.jsonl`.

### 3. Execution Safety & Flow
- The system is executed via `node run_pipeline.js --mode=full`.
- The controller uses strict blocking execution (`child_process.spawn`).
- Files are updated using an Atomic write strategy (written to `.tmp.jsonl` first, then renamed).
- Lock files (`pipeline.lock`) prevent concurrent executions.
- The pipeline immediately halts if any engine returns a non-zero exit code.

### 4. Testing Requirements
- **Unit Tests**: Must validate the mathematical precision of the Pivot formulas, the threshold logic of the Intelligence Engine, and the regime detection rules in the Time Intelligence Engine.
- **E2E Tests**: Must validate that `run_pipeline.js` executes the engines in the correct sequence, handles mock raw JSONL data correctly, successfully creates the `.tmp.jsonl` files, renames them, and completes the execution cleanly.
