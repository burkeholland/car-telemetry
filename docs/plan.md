# Car Telemetry Simulator – Project Plan

_Last updated: 2025-09-17_

## 1. Vision & Goals
Build an interactive, real‑time car telemetry simulator dashboard using Next.js (App Router), Tailwind v4, and shadcn/ui. It should:
- Stream low‑latency telemetry for one or more simulated vehicles.
- Provide intuitive, performant visualization widgets (gauges, charts, map/track, systems status, alerts).
- Allow historical replay (phase 2) and alerting on rule thresholds.
- Be easily extensible for future advanced analytics (predictive maintenance, multi‑vehicle comparisons).

## 2. High-Level Architecture
| Layer | Responsibility | Notes |
|-------|----------------|-------|
| Simulation Engine | Generate deterministic pseudo-random telemetry ticks | Seeds for reproducibility |
| Transport | WebSocket primary; SSE fallback | JSON messages (MessagePack optional later) |
| Persistence (Phase 2) | Rolling in-memory buffer → SQLite/LibSQL upgrade | Replay + lap analytics |
| API Routes | Vehicle meta, history queries, session control | Next.js Route Handlers |
| Client State | Live buffer (Zustand) + historical cache (React Query) | Derived selectors for metrics |
| UI Layer | shadcn/ui primitives + custom telemetry widgets | Themed, status colors |
| Alert Engine | Evaluate rule thresholds over rolling windows | Debounce + severity escalation |

## 3. Core Data Model (Conceptual)
```
Vehicle: id, name, model, maxRpm, tireSpec, batterySpec
TelemetrySample: timestamp, vehicleId, speedKph, rpm, gear, throttlePct, brakePct, steeringDeg,
  coolantC, oilC, batteryV, stateOfCharge, tireTemps{FL,FR,RL,RR}, latitude, longitude,
  lap, sector
Alert: id, vehicleId, ruleId, severity, message, firstSeen, lastSeen, active
Rule: id, metricKey, operator, threshold, windowMs, severity
Track: id, name, lengthM, polyline[], sectorBreaks[]
Session: id, seed, startedAt, endedAt?, vehicles[]
```

## 4. Simulation Engine Outline
Tick interval: 100–250ms (configurable). Steps per tick:
1. Update speed from throttle, drag, gear ratio, friction.
2. Compute RPM from speed + gear ratio (clamp to maxRpm; transient drop on shift).
3. Adjust temperatures (coolant/oil) toward target with noise & load factor.
4. Battery SoC drain based on throttle; regen under braking.
5. Tire temps: base + sustained speed + steering (cornering factor); add inter-wheel deltas.
6. Geospatial progression along track polyline; wrap to increment lap, compute sector.
7. Derived metrics (lap delta, average speed, sector splits).
8. Random anomaly injection (rare spikes) for alert testing.
9. Emit TelemetrySample → broadcaster.

Edge Cases & Behaviors:
- Gear shift smoothing (rpm interpolation). 
- Overheat scenario triggers cascading alerts.
- Optional packet loss mode (drop every Nth sample) for resilience tests.

## 5. Transport Strategy
- Primary: WebSocket route handler (`/api/stream`). Reasons: bidirectional potential (client control), lower latency, efficient.
- Fallback: SSE (`/api/stream-sse`) if WS blocked; send serverTime + sample.
- Backpressure: limit client ring buffer size; if overflow, drop oldest & increment `droppedPackets` metric.

## 6. Client State Management
- Live Stream: Zustand store (mutable, minimal re-renders) or Signals (alternative) with selectors.
- Historical Data: React Query fetching `/api/history` slices.
- Replay Mode: separate temporal cursor + derived slice from persisted samples.
- Derived Selectors: current lap metrics, average speed, max temps, alert counts, latency.

## 7. UI Information Architecture
Layout Zones:
- Header: Vehicle selector, session controls (Start/Stop/Seed), theme toggle, latency indicator.
- Left Sidebar: Vehicle list & summary statuses.
- Main Content Grid:
  - Gauges Row (Speed, RPM, Gear).
  - System Row (Driver Inputs, Engine Temps, Battery/SoC, Tire Temps).
  - Charts / Map Tabs (Speed, RPM, Battery, Track View).
- Right Drawer (Sheet): Alerts & Settings.
- Footer (optional): Frame rate, packet drop stats.

Responsive Behavior:
- Below `md`: Sidebar collapses into a slide-over; gauges compress to 2-column; charts stack.

## 8. Widget Breakdown (MVP)
1. Speed Gauge (digital + radial bar). 
2. RPM Gauge (circular with shift zone color). 
3. Gear Indicator (large centered). 
4. Throttle / Brake Bars (vertical stacked). 
5. Steering Dial (± degrees). 
6. Engine Temps Panel (coolant/oil mini gauges + status pills). 
7. Battery Panel (SoC progress, voltage numeric, status). 
8. Tire Temperature Grid (2×2, gradient-coded, highlight delta). 
9. Live Charts (tabbed): Speed, RPM, Battery SoC (rolling window). 
10. Track / Map Mini-view (SVG path + moving marker). 
11. Alerts Drawer (active & historical tabs, filter by severity). 
12. Session Timeline (Phase 2 replay control + scrubber). 

## 9. shadcn/ui Component Inventory
Primitives to scaffold via CLI:
- Button, Card, Tabs, Dialog, DropdownMenu, Toggle, Switch, Progress, Skeleton, Badge, Sheet, Tooltip, Toast, Separator, ScrollArea.
Custom wrappers:
- Gauge (Speed/RPM variants), MiniChart container, StatusPill, TireGrid, TrackMap, AlertItem.

## 10. Theming & Design Tokens
- Dark-first palette with CSS variables: `--color-bg`, `--color-surface`, `--color-accent`, semantic status (`--status-ok`, `--status-warn`, `--status-critical`).
- Tailwind config mapping semantic tokens to utility classes.
- High contrast for critical alerts (accessible red with appropriate luminance).
- Shift zone color band for RPM gauge (e.g., gradient amber→red in final 15%).

## 11. Alert Rules (Initial Set)
| Rule | Warning | Critical | Notes |
|------|---------|----------|-------|
| High RPM sustained | >95% for >5s | >95% for >8s | Debounce 1s |
| Coolant Temp | >110°C | >120°C | Escalate severity |
| Tire Delta | Any pair >15°C | >20°C | Compare max-min |
| Battery SoC | <15% | <8% | Hysteresis on recovery |
| Brake+Throttle overlap | Both >20% for 3s | 5s | Driving anomaly |

Evaluation Cadence: every tick; rule windows use rolling deque or aggregate stats. Active alerts update `lastSeen`; removal after condition clear + cooldown.

## 12. Performance Considerations
- Rolling Window: Keep last 2–5 minutes (config) for live charts. 
- Downsampling: Apply Largest Triangle Three Buckets when datapoints > 1000 for chart viewport.
- Batch UI Updates: Accumulate samples per animation frame; single state commit.
- Memory Limits: Hard cap (e.g., 10k samples/vehicle); drop oldest.
- Avoid Re-renders: Slice selectors, React.memo on widgets, structural sharing.
- Optional Web Worker: Offload simulation if browser-side fallback needed (Phase 3).

## 13. Persistence & History (Phase 2)
- Start: in-memory ring buffer (per vehicle). 
- Upgrade: SQLite/LibSQL with table `telemetry_samples (vehicleId, ts, metrics...)` indexed by `(vehicleId, ts)`.
- History API pagination: time-range query with `from` / `to` or cursor.
- Replay: Preload range into local store; drive a virtual clock & feed widgets deterministically.

## 14. Testing Strategy
| Layer | Approach |
|-------|----------|
| Simulation Formulas | Unit tests (deterministic seeds) |
| Rule Engine | Windowed scenarios & edge cases |
| Transport | Integration test: open WS, receive N samples, handle close/retry |
| Widgets | Storybook stories w/ states (normal/warn/critical) |
| Performance | Script measuring avg frame commit under load (3–5 vehicles) |
| E2E | Playwright: connect, display gauges, trigger alert scenario |

## 15. Deployment & Observability
- Platform: Vercel (edge not required initially; Node runtime OK for WS).
- Logging: Structured console logs for session start/stop, alert transitions.
- Metrics (future): Expose simple JSON status endpoint `/api/health` (uptime, sample rate, clients connected).
- Feature Flags: ENV toggles for heavy widgets (map, multi-vehicle) & anomaly injection.

## 16. Roadmap / Phases
### Phase 1 (MVP)
Simulation engine, WebSocket stream, core widgets, basic alerts, dark theme.
### Phase 2
Persistence + history API, replay timeline, advanced alerts, downsampling refinement.
### Phase 3
Multi-vehicle comparison, predictive maintenance stub, export/import sessions.
### Phase 4
Plugin system, binary protocol optimization, offline PWA mode.

## 17. Implementation Sequence (Detailed)
1. Integrate shadcn/ui & scaffold primitives. 
2. Define TypeScript interfaces (shared `types/telemetry.ts`).
3. Implement server simulation (single vehicle) + WS broadcast.
4. Client WebSocket provider + Zustand store (live buffer, selectors).
5. Build layout & placeholder widgets (static values).
6. Wire live data into gauges & driver input components.
7. Add charts (Visx) w/ rolling window & batching.
8. Implement basic alert rules & UI drawer.
9. Add tire temps & map track view (static SVG track).
10. Performance pass (downsampling, memo, buffer caps).
11. Persistence layer & history API + replay controls.
12. Testing & E2E hardening; finalize design polish.

## 18. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Excessive re-renders | Zustand selectors + frame batching |
| Chart perf degradation | Downsampling + window limit + lazy tab mount |
| WebSocket disconnect churn | Auto-reconnect with exponential backoff |
| Alert noise (flapping) | Hysteresis + min active duration |
| Memory growth | Hard sample cap + metrics purge |

## 19. Future Enhancements (Backlog)
- Predictive wear model (simple regression on temperature/time).
- ML anomaly detection placeholder (z-score on rolling window).
- Multi-vehicle grid comparison view.
- Export session to JSON/CSV & import for replay.
- Custom user-defined rule builder UI (DSL or form).
- Offline caching (IndexedDB) for replay when offline.
- Binary protocol (MessagePack) for bandwidth reduction.

## 20. Open Questions (To Clarify Later)
- Required maximum number of concurrent vehicles? (Assume 3–5 short term.)
- Target max sample rate (Hz)? (Assume 10Hz = 100ms tick for now.)
- Persistence retention window? (Assume per-session until session ends.)

## 21. Summary
This plan lays out a modular, performance-conscious architecture enabling rapid MVP delivery while leaving clear expansion paths. Next actionable step: scaffold UI primitives & simulation server endpoint.

## 22. Implementation in 10 Steps
Below is a condensed, outcome-focused 10–step execution path derived from the broader sequence (Sections 16–17). Each step lists objectives, key tasks, deliverables, and exit criteria.

### Step 1. UI & Design System Scaffold
**Objective:** Establish consistent styling and component primitives to accelerate feature work.
**Key Tasks:**
- Install and configure shadcn/ui (primitives: Button, Card, Tabs, Dialog, DropdownMenu, Sheet, Tooltip, Toast, Progress, Badge, Separator, ScrollArea, Switch, Skeleton).
- Add theme provider, dark-first CSS variables, semantic status tokens in Tailwind config.
- Create `components/ui` barrel exports and basic documentation in `README` snippet.
**Deliverables:** Installed components; theme toggle working; dark/light parity for primitives.
**Exit Criteria:** Can compose a demo page with cards, tabs, buttons, and toasts with no styling regressions.

### Step 2. Core Types & Contracts
**Objective:** Define shared TypeScript interfaces to prevent drift between simulation, transport, and UI.
**Key Tasks:**
- Add `types/telemetry.ts` containing Vehicle, TelemetrySample, Alert, Rule, Track, Session.
- Define discriminated union for Alert severity; centralize metric keys as string literal types.
- Create validation helpers (type guards) for inbound messages.
**Deliverables:** Typed interfaces + minimal tests validating sample object shape.
**Exit Criteria:** All subsequent code imports from a single source of truth; no duplicate type declarations.

### Step 3. Server Simulation Engine (MVP)
**Objective:** Generate deterministic telemetry for a single vehicle at 100–200ms cadence.
**Key Tasks:**
- Implement tick loop with seeded PRNG utilities.
- Produce TelemetrySample objects with realistic bounded ranges (speed, rpm, temps, battery, tires, geo progression on mock track polyline).
- Expose start/stop & seed control functions.
**Deliverables:** Module exporting `startSimulation(seed)`, `stopSimulation()`, and event emitter.
**Exit Criteria:** Local logging shows coherent, evolving samples; rpm & speed remain within spec; no memory leaks over 5-minute run.

### Step 4. Real-Time Transport Layer
**Objective:** Stream samples to clients reliably with low latency.
**Key Tasks:**
- Implement WebSocket route (`/api/stream`) that subscribes to simulation emitter.
- Add SSE fallback route (`/api/stream-sse`).
- Include heartbeats / ping interval & basic reconnect guidance (client side placeholder function docs).
**Deliverables:** Running dev server allows a test client to receive continuous JSON messages.
**Exit Criteria:** Open a browser console client and receive >100 sequential samples without disconnect.

### Step 5. Client State & Providers
**Objective:** Manage live streaming data efficiently and expose selectors to widgets.
**Key Tasks:**
- Implement Zustand store with ring buffer (configurable sample cap) and derived metrics.
- Create `WebSocketProvider` handling connect, reconnect backoff, and buffer insertion.
- Add latency measurement (round-trip or server timestamp diff).
**Deliverables:** Global provider tree (Theme, Stream, TelemetryStore, Toast) in `app/layout.tsx`.
**Exit Criteria:** Store introspection shows rolling window bounded; dropped packet counter increments under artificial stress.

### Step 6. Skeleton Dashboard Layout & Placeholder Widgets
**Objective:** Establish page structure & visual placeholders before binding real data.
**Key Tasks:**
- Build responsive grid layout: header, sidebar, main panels, alerts drawer.
- Scaffold placeholder components (SpeedGauge, RpmGauge, GearIndicator, DriverInputs, EngineTemps, BatteryPanel, TireGrid, LiveChartsContainer, TrackMapStub, AlertsDrawer).
- Insert mock static values.
**Deliverables:** Navigable dashboard route rendering all placeholders with no runtime errors.
**Exit Criteria:** Lighthouse / basic render shows acceptable layout in desktop & mobile viewport; no hydration warnings.

---
**Progress Log (2025-09-17):** Steps 1–6 implemented. Current app renders dashboard skeleton with placeholder widgets, basic connection metrics, and accessible structure ready for live data binding (Step 7).

### Step 7. Data Binding & Live Gauges
**Objective:** Replace mock values with live stream updates and ensure smooth visual transitions.
**Key Tasks:**
- Connect gauges & panels to selectors (latest sample, computed deltas, min/max windows).
- Add animation easing for gauge transitions (rpm & speed smoothing / interpolation between ticks).
- Implement alert badge count in header.
**Deliverables:** Fully live top-level gauges & system panels updating in real time.
**Exit Criteria:** No dropped frame spikes (>16ms) during sustained updates (observed via dev tools performance sample).

### Step 8. Charts, Downsampling & Performance Pass
**Objective:** Introduce rolling charts without degrading UI responsiveness.
**Key Tasks:**
- Add Visx line charts for speed/rpm/battery with a 2–5 minute window.
- Implement LTTB downsampling when point count exceeds threshold.
- Batch setState calls with `requestAnimationFrame` scheduler.
**Deliverables:** Smooth charts with stable memory footprint and capped array lengths.
**Exit Criteria:** Memory usage plateaus; charts stay responsive under 10Hz feed for >10 minutes.

### Step 9. Alert Engine & Drawer UI
**Objective:** Evaluate rule thresholds and surface actionable alert information.
**Key Tasks:**
- Implement rule evaluation loop (per tick) with hysteresis & debounce.
- Maintain active vs historical lists; update lastSeen timestamps.
- UI: Alerts drawer with severity filters, active count badge, toast on new critical alert.
**Deliverables:** Configurable initial rule set; visible transitions when triggering simulated anomalies.
**Exit Criteria:** Inducing test conditions reliably creates & resolves alerts; no duplicate alert spam.

### Step 10. Persistence, Replay & Hardening
**Objective:** Enable history queries and replay mode; finalize quality gates.
**Key Tasks:**
- Introduce SQLite/LibSQL (or in-memory adapter abstraction) & write telemetry samples asynchronously.
- Implement `/api/history` with time-range filtering & pagination.
- Add replay controller (pause live, seek timeline, feed historical samples at virtual cadence).
- Testing suite completion: unit (formulas), integration (stream), Playwright smoke, perf script.
- Documentation update in `README` & architectural notes.
**Deliverables:** Persisted sample table; replay controls functioning; CI test script passing.
**Exit Criteria:** All planned tests green; manual replay shows deterministic progression; plan sections updated with any deltas.

---
**Next Recommended Action:** Execute Step 1 (UI & Design System Scaffold) to unblock parallel development of simulation and widgets.
