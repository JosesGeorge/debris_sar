import type { SonarTarget, ScenarioConfig } from '../../types';
import { MissionStatus } from '../../types';
import { SCENARIOS } from './scenarios';

export interface SimulatorCallbacks {
  onTargetsUpdate: (targets: SonarTarget[]) => void;
  onAcousticData: (buffer: Float32Array) => void;
  onLog: (message: string, type?: 'INFO' | 'WARN' | 'CRIT') => void;
  onStatusChange: (status: MissionStatus) => void;
}

const DYNAMIC_SCENARIO_ID = 'dynamic';

function buildTargetsFromScenario(scenario: ScenarioConfig): SonarTarget[] {
  return scenario.targets.map((t, idx) => ({
    ...t,
    id: t.target_id,
    status: 'TRACKING' as const,
    track_status: 'active' as const,
    timestamp: new Date(Date.now() - idx * 30000).toISOString(),
    angle: t.bearing,
    velocity: scenario.id === DYNAMIC_SCENARIO_ID
      ? { dr: (Math.random() - 0.5) * 0.08, dtheta: (Math.random() - 0.5) * 0.6 }
      : undefined
  }));
}

function generateAcousticBuffer(targets: SonarTarget[], scanRange: number, noise: number = 0.08): Float32Array {
  const SIZE = 256;
  const buf = new Float32Array(SIZE);
  // Background noise
  for (let i = 0; i < SIZE; i++) {
    buf[i] = (Math.random() * 2 - 1) * noise;
  }
  // Add echo peaks for each active target
  targets.forEach(t => {
    if (t.track_status !== 'active') return;
    const timeOfFlight = t.distance / scanRange; // 0–1
    const peakIndex = Math.floor(timeOfFlight * (SIZE - 10)) + 5;
    const amplitude = t.signal_strength * (1 - timeOfFlight * 0.6);
    for (let k = -6; k <= 6; k++) {
      const idx = peakIndex + k;
      if (idx >= 0 && idx < SIZE) {
        buf[idx] += amplitude * Math.exp(-(k * k) / 8);
      }
    }
  });
  // Clamp
  for (let i = 0; i < SIZE; i++) {
    buf[i] = Math.max(-1, Math.min(1, buf[i]));
  }
  return buf;
}

export class SonarSimulator {
  private targets: SonarTarget[] = [];
  private scenario: ScenarioConfig;
  private scanRange: number = 100;
  private callbacks: SimulatorCallbacks;
  private intervalId: number | null = null;
  private status: MissionStatus = MissionStatus.SCANNING;
  private tick: number = 0;

  constructor(callbacks: SimulatorCallbacks) {
    this.callbacks = callbacks;
    this.scenario = SCENARIOS.find(s => s.id === 'mixed_debris')!;
  }

  loadScenario(scenarioId: string): void {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    this.scenario = scenario;
    this.targets = buildTargetsFromScenario(scenario);
    this.tick = 0;
    this.callbacks.onTargetsUpdate([...this.targets]);
    this.callbacks.onLog(`SCENARIO_LOADED // ${scenario.label}`, 'INFO');
    if (scenario.targets.length === 0) {
      this.callbacks.onLog('SEABED_SCAN_CLEAR // No objects detected', 'INFO');
    }
  }

  setScanRange(range: number): void {
    this.scanRange = range;
  }

  start(): void {
    if (this.intervalId !== null) return;
    if (this.targets.length === 0) {
      this.loadScenario(this.scenario.id);
    }
    this.status = MissionStatus.SCANNING;
    this.callbacks.onStatusChange(this.status);
    this.callbacks.onLog('SONAR_SWEEP_ACTIVE // Scanning...', 'INFO');
    this.intervalId = window.setInterval(() => this.update(), 500);
  }

  pause(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.status = MissionStatus.PAUSED;
    this.callbacks.onStatusChange(this.status);
    this.callbacks.onLog('SCAN_PAUSED // Sweep suspended', 'WARN');
  }

  resume(): void {
    if (this.intervalId !== null) return;
    this.status = MissionStatus.SCANNING;
    this.callbacks.onStatusChange(this.status);
    this.callbacks.onLog('SCAN_RESUMED // Sweep active', 'INFO');
    this.intervalId = window.setInterval(() => this.update(), 500);
  }

  reset(): void {
    this.pause();
    this.loadScenario(this.scenario.id);
    this.status = MissionStatus.SCANNING;
    this.callbacks.onStatusChange(this.status);
    this.callbacks.onLog('SONAR_ARRAY_REINITIALIZED // Simulation ready', 'WARN');
    this.start();
  }

  clearTargets(): void {
    this.targets = [];
    this.callbacks.onTargetsUpdate([]);
    this.callbacks.onLog('TARGETS_CLEARED // Target list reset', 'WARN');
  }

  getTargets(): SonarTarget[] {
    return this.targets;
  }

  private update(): void {
    this.tick++;
    const isDynamic = this.scenario.id === DYNAMIC_SCENARIO_ID;

    // Move dynamic targets
    if (isDynamic) {
      this.targets = this.targets.map(t => {
        if (!t.velocity) return t;
        const newDist = Math.max(5, Math.min(this.scanRange - 2, t.distance + t.velocity.dr));
        const newBearing = ((t.bearing + t.velocity.dtheta) + 360) % 360;
        return {
          ...t,
          distance: newDist,
          bearing: newBearing,
          angle: newBearing,
          velocity: {
            dr: t.velocity.dr + (Math.random() - 0.5) * 0.01,
            dtheta: t.velocity.dtheta + (Math.random() - 0.5) * 0.05
          }
        };
      });
    }

    // Confidence drift
    this.targets = this.targets.map(t => {
      const newConf = Math.max(0.45, Math.min(0.99, t.confidence + (Math.random() - 0.5) * 0.015));
      const newSig  = Math.max(0.30, Math.min(0.99, t.signal_strength + (Math.random() - 0.5) * 0.012));
      const newStat = newConf > 0.80 ? 'CONFIRMED' : 'TRACKING';
      return { ...t, confidence: newConf, signal_strength: newSig, status: newStat as 'CONFIRMED' | 'TRACKING' };
    });

    // Promote status after a few ticks
    if (this.tick === 6 && this.targets.length > 0) {
      this.status = MissionStatus.CONTACT;
      this.callbacks.onStatusChange(this.status);
      this.callbacks.onLog(`ACOUSTIC_CONTACT // ${this.targets.length} object(s) acquired`, 'WARN');
    }
    if (this.tick === 14) {
      this.status = MissionStatus.CONFIRMED;
      this.callbacks.onStatusChange(this.status);
      this.callbacks.onLog('CLASSIFIER_ACTIVE // High-confidence detections confirmed', 'INFO');
    }

    // Acoustic buffer
    const acoustic = generateAcousticBuffer(this.targets, this.scanRange);
    this.callbacks.onAcousticData(acoustic);
    this.callbacks.onTargetsUpdate([...this.targets]);
  }
}
