import React, { useMemo, useState } from 'react';
import { Activity, Radio, Layers, Settings, AlertTriangle, CheckCircle, Pause, Play, RefreshCw, Trash2, Waves } from 'lucide-react';
import { MissionStatus, SonarTarget, LogEntry, TelemetryData, ScenarioId, ScenarioConfig } from '../types';
import SonarRadar from './SonarRadar';
import WireframeViewer from './WireframeViewer';
import AcousticWaveform from './AcousticWaveform';

interface SonarHUDProps {
  missionStatus: MissionStatus;
  telemetry: TelemetryData;
  logs: LogEntry[];
  targets: SonarTarget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onScenarioChange: (s: ScenarioId) => void;
  onRangeChange: (r: number) => void;
  onClearTargets: () => void;
  scenario: ScenarioId;
  scanRange: number;
  acousticData: Float32Array;
  isScanning: boolean;
  elapsed: number;
  scenarios: ScenarioConfig[];
}

const STATUS_COLOR: Record<MissionStatus, string> = {
  [MissionStatus.IDLE]:      'text-slate-400',
  [MissionStatus.SCANNING]:  'text-emerald-400',
  [MissionStatus.CONTACT]:   'text-amber-400',
  [MissionStatus.INSPECT]:   'text-cyan-400',
  [MissionStatus.CONFIRMED]: 'text-amber-300',
  [MissionStatus.PAUSED]:    'text-slate-400',
};

const CATEGORY_COLOR: Record<string, string> = {
  'Plastic Waste':  'text-cyan-300',
  'Flexible Waste': 'text-violet-300',
  'Metal Waste':    'text-amber-300',
  'Fishing Waste':  'text-rose-300',
  'Rubber Waste':   'text-orange-300',
  'Other Debris':   'text-slate-300',
};

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`border border-cyan-400/20 bg-[#03111d]/95 backdrop-blur-md ${className}`}>
    <div className="border-b border-cyan-400/10 px-3 py-2.5">
      <h2 className="text-[11px] font-bold tracking-[0.2em] text-cyan-300/80">{title}</h2>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const Metric: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="mb-2">
    <div className="text-[10px] tracking-widest text-cyan-100/50">{label}</div>
    <div className={`mt-0.5 font-bold ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</div>
  </div>
);

const BarStat: React.FC<{ label: string; value: number; max?: number; color?: string }> = ({ label, value, max = 100, color = 'bg-cyan-400' }) => (
  <div className="mb-2">
    <div className="mb-1 flex justify-between text-[10px]">
      <span className="text-cyan-100/50">{label}</span>
      <span className="text-white">{value.toFixed(1)}</span>
    </div>
    <div className="h-1 bg-white/10">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
);

const SonarHUD: React.FC<SonarHUDProps> = ({
  missionStatus, telemetry, logs, targets, selectedId, onSelect,
  onStart, onPause, onResume, onReset, onScenarioChange, onRangeChange, onClearTargets,
  scenario, scanRange, acousticData, isScanning, elapsed, scenarios
}) => {
  const [filter, setFilter] = useState('');
  const selected = targets.find(t => t.target_id === selectedId) ?? targets[0] ?? null;

  const filteredTargets = useMemo(() =>
    targets.filter(t =>
      `${t.target_id} ${t.label} ${t.category}`.toLowerCase().includes(filter.toLowerCase())
    ), [targets, filter]);

  const categoryCounts = useMemo(() =>
    targets.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + 1;
      return acc;
    }, {}), [targets]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="flex min-h-screen flex-col p-2 gap-2 lg:p-3 lg:gap-2">
      {/* HEADER */}
      <header className="flex flex-col gap-2 border border-cyan-400/20 bg-[#03111d]/98 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 text-cyan-300">
            <Waves className="h-4 w-4 animate-pulse" />
            <span className="text-[11px] tracking-[0.28em] text-cyan-400/70">MARINE SONAR SYSTEMS // SONAR UNIT 09</span>
            <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] tracking-widest text-amber-300">⚠ SIMULATION MODE</span>
          </div>
          <h1 className="mt-1 text-xl font-black tracking-[0.08em] text-white sm:text-2xl">SONAR INTELLIGENCE DASHBOARD</h1>
          <p className="mt-1 text-[10px] tracking-[0.16em] text-cyan-100/50">UNDERWATER MARINE DEBRIS DETECTION AND SURVEILLANCE SYSTEM</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 font-bold ${STATUS_COLOR[missionStatus]}`}>
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                {missionStatus}
              </span>
            </div>
            <span className="text-cyan-100/40">{dateStr} · {timeStr} · T+{formatElapsed(elapsed)}</span>
          </div>
          <div className="flex flex-col items-end gap-1 border-l border-cyan-400/20 pl-3">
            <span className="text-cyan-100/40">SCAN RANGE</span>
            <span className="font-bold text-white">{scanRange}m</span>
          </div>
          <div className="flex flex-col items-end gap-1 border-l border-cyan-400/20 pl-3">
            <span className="text-cyan-100/40">TARGETS</span>
            <span className="font-bold text-amber-300">{targets.length}</span>
          </div>
          <div className="flex flex-col items-end gap-1 border-l border-cyan-400/20 pl-3">
            <span className="text-cyan-100/40">DEPTH EST.</span>
            <span className="font-bold text-white">{telemetry.depth.toFixed(1)}m</span>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN GRID */}
      <div className="grid flex-1 grid-cols-1 gap-2 lg:grid-cols-[220px_1fr_260px]">

        {/* LEFT PANEL */}
        <div className="flex flex-col gap-2 order-2 lg:order-1">
          <Panel title="SENSOR STATUS">
            <BarStat label="SIGNAL STRENGTH" value={telemetry.confidence} max={100} color="bg-emerald-400" />
            <BarStat label="SONAR POWER" value={telemetry.battery} max={100} color="bg-cyan-400" />
            <Metric label="WATER TEMPERATURE" value={`${telemetry.temperature.toFixed(1)} °C`} />
            <Metric label="TURBIDITY" value={`${telemetry.turbidity.toFixed(0)} NTU`} />
            <Metric label="SCAN RANGE" value={`${scanRange} m`} />
            <Metric label="HEADING" value={`${telemetry.heading.toFixed(0)}°`} />
          </Panel>

          <Panel title="DEBRIS STATISTICS">
            <Metric label="TOTAL DETECTED" value={targets.length.toString()} highlight={targets.length > 0} />
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <div key={cat} className="mb-2">
                <div className="mb-1 flex justify-between text-[10px]">
                  <span className={CATEGORY_COLOR[cat] ?? 'text-slate-300'}>{cat}</span>
                  <span className="text-white font-bold">{count}</span>
                </div>
                <div className="h-0.5 bg-white/10">
                  <div className="h-full bg-cyan-400/70 transition-all" style={{ width: `${(count / targets.length) * 100}%` }} />
                </div>
              </div>
            ))}
            {targets.length === 0 && <p className="text-[10px] text-cyan-100/30">No objects detected</p>}
          </Panel>

          <Panel title="SCAN RANGE">
            <div className="space-y-2">
              {[25, 50, 75, 100, 150, 200].map(r => (
                <button
                  key={r}
                  onClick={() => onRangeChange(r)}
                  className={`w-full border px-2 py-1.5 text-[10px] tracking-widest transition ${
                    scanRange === r
                      ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-300'
                      : 'border-cyan-400/15 text-cyan-100/50 hover:border-cyan-400/40 hover:text-cyan-200'
                  }`}
                >
                  {r}m
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* CENTRE: SONAR RADAR */}
        <div className="order-1 flex min-w-0 flex-col border border-cyan-300/25 bg-[#010a13] lg:order-2">
          <div className="flex items-center justify-between border-b border-cyan-300/15 px-3 py-2.5">
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.2em] text-cyan-200">SONAR RADAR // 200 kHz</h2>
              <p className="mt-0.5 text-[10px] text-cyan-100/50">360° SWEEP · LIVE DEBRIS TRACKING · ⚠ SIMULATED DATA</p>
            </div>
            <span className={`text-[11px] font-bold ${STATUS_COLOR[missionStatus]}`}>{missionStatus}</span>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-2 p-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
            <div className="relative flex min-h-[460px] items-center justify-center border border-cyan-300/10 bg-[#010810] p-2">
              <SonarRadar
                targets={targets}
                selectedId={selectedId}
                onSelect={onSelect}
                scanRange={scanRange}
                missionStatus={missionStatus}
              />
            </div>
            <div className="flex min-h-[460px] min-w-0 flex-col border border-cyan-300/10 bg-[#010810]">
              <div className="border-b border-cyan-300/10 px-3 py-2">
                <h3 className="text-[11px] font-bold tracking-[0.18em] text-cyan-200">3D WIREFRAME SIMULATION</h3>
                <p className="mt-1 text-[10px] text-cyan-100/50">LIVE REPRESENTATION OF SELECTED CONTACT</p>
              </div>
              <div className="min-h-0 flex-1">
                <WireframeViewer target={selected} />
              </div>
              <div className="border-t border-cyan-300/10 px-3 py-2 text-[10px] text-cyan-100/50">
                {selected ? `${selected.target_id} · ${selected.label}` : 'SELECT A TARGET TO VIEW MODEL'}
              </div>
            </div>
          </div>
          <div className="flex justify-between border-t border-cyan-300/10 px-3 py-2 text-[10px] tracking-widest text-cyan-100/40">
            <span>RANGE 0—{scanRange}M</span>
            <span>{isScanning ? '● SWEEP ACTIVE' : '■ PAUSED'}</span>
            <span>HDG {telemetry.heading.toFixed(0)}°</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-2 order-3">
          <Panel title="LIVE TARGET LIST" className="flex-shrink-0">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="FILTER TARGETS..."
              className="mb-2 w-full border border-cyan-300/20 bg-black/30 px-2 py-1.5 text-[10px] text-cyan-100 outline-none placeholder:text-cyan-100/30"
            />
            <div className="max-h-[180px] space-y-1 overflow-y-auto custom-scrollbar">
              {filteredTargets.length === 0 && (
                <p className="py-2 text-[10px] text-cyan-100/30">No targets detected</p>
              )}
              {filteredTargets.map(t => (
                <div
                  key={t.target_id}
                  onClick={() => onSelect(t.target_id)}
                  className={`cursor-pointer border px-2 py-1.5 text-[10px] transition ${
                    t.target_id === selectedId
                      ? 'border-amber-400/50 bg-amber-400/10'
                      : 'border-cyan-400/15 hover:border-cyan-400/35 hover:bg-cyan-400/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-200">{t.target_id}</span>
                    <span className={`${t.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-400'}`}>{t.status}</span>
                  </div>
                  <div className={`mt-0.5 ${CATEGORY_COLOR[t.category] ?? 'text-slate-300'}`}>{t.label}</div>
                  <div className="mt-0.5 text-cyan-100/50">{t.distance.toFixed(1)}m · {t.bearing.toFixed(0)}° · {(t.confidence * 100).toFixed(0)}% conf</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="SELECTED TARGET">
            {selected ? (
              <div className="space-y-1 text-[10px]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold text-cyan-200">{selected.target_id}</span>
                  <span className={`font-bold ${selected.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-400'}`}>{selected.status}</span>
                </div>
                <Metric label="OBJECT TYPE" value={selected.label} />
                <Metric label="CONFIDENCE" value={`${(selected.confidence * 100).toFixed(1)}%`} highlight={selected.confidence > 0.85} />
                <div className="grid grid-cols-2 gap-x-3">
                  <Metric label="DISTANCE" value={`${selected.distance.toFixed(1)} m`} />
                  <Metric label="BEARING" value={`${selected.bearing.toFixed(0)}°`} />
                  <Metric label="DEPTH EST." value={`${selected.depth.toFixed(1)} m`} />
                  <Metric label="SIGNAL" value={`${(selected.signal_strength * 100).toFixed(0)}%`} />
                </div>
                <Metric label="DIMENSIONS (L×W×H)" value={`${selected.estimated_dimensions.length.toFixed(2)}×${selected.estimated_dimensions.width.toFixed(2)}×${selected.estimated_dimensions.height.toFixed(2)} m`} />
                <Metric label="DETECTION SOURCE" value="⚠ SIMULATION" />
              </div>
            ) : (
              <p className="text-[10px] text-cyan-100/30">Select a target on the radar or list</p>
            )}
          </Panel>

          {/* 3D WIREFRAME VIEWER */}
        </div>
      </div>

      {/* BOTTOM PANEL */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_1fr_240px]">
        {/* Acoustic Waveform */}
        <Panel title="ACOUSTIC SIGNAL // SIMULATED ECHO DATA">
          <div className="h-[70px]">
            <AcousticWaveform data={acousticData} isActive={isScanning} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-cyan-100/40">
            <span>TX PULSE ──►</span>
            <span>ECHO RETURNS</span>
            <span>GAIN: 72dB</span>
          </div>
        </Panel>

        {/* Event Log */}
        <Panel title="SYSTEM EVENT LOG">
          <div className="max-h-[100px] space-y-1 overflow-y-auto custom-scrollbar">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className={`text-[10px] ${log.type === 'CRIT' ? 'text-rose-400' : log.type === 'WARN' ? 'text-amber-400' : 'text-cyan-100/60'}`}>
                <span className="text-cyan-100/30">{log.timestamp}</span> {log.message}
              </div>
            ))}
            {logs.length === 0 && <p className="text-[10px] text-cyan-100/30">No events</p>}
          </div>
        </Panel>

        {/* Controls */}
        <Panel title="SCAN CONTROLS">
          <div className="space-y-1.5">
            <button onClick={onStart} disabled={isScanning} className="flex w-full items-center justify-center gap-2 border border-emerald-400/40 bg-emerald-400/10 px-2 py-1.5 text-[10px] tracking-widest text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-30">
              <Play className="h-3 w-3" /> START SCAN
            </button>
            <button onClick={isScanning ? onPause : onResume} className="flex w-full items-center justify-center gap-2 border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-[10px] tracking-widest text-amber-300 transition hover:bg-amber-400/20">
              {isScanning ? <><Pause className="h-3 w-3" /> PAUSE</> : <><Play className="h-3 w-3" /> RESUME</>}
            </button>
            <button onClick={onReset} className="flex w-full items-center justify-center gap-2 border border-cyan-400/40 bg-cyan-400/10 px-2 py-1.5 text-[10px] tracking-widest text-cyan-300 transition hover:bg-cyan-400/20">
              <RefreshCw className="h-3 w-3" /> RESET
            </button>
            <button onClick={onClearTargets} className="flex w-full items-center justify-center gap-2 border border-rose-400/40 bg-rose-400/10 px-2 py-1.5 text-[10px] tracking-widest text-rose-300 transition hover:bg-rose-400/20">
              <Trash2 className="h-3 w-3" /> CLEAR TARGETS
            </button>
          </div>
          <div className="mt-2 border-t border-cyan-400/10 pt-2">
            <div className="mb-1 text-[10px] tracking-widest text-cyan-100/40">SCENARIO</div>
            <select
              value={scenario}
              onChange={e => onScenarioChange(e.target.value as ScenarioId)}
              className="w-full border border-cyan-400/20 bg-[#010810] px-2 py-1.5 text-[10px] text-cyan-200 outline-none"
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>{s.label.split('—')[0].trim()}</option>
              ))}
            </select>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default SonarHUD;
