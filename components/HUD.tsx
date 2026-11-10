import React, { useMemo, useState } from 'react';
import { Activity, Battery, Clock3, Crosshair, Database, RefreshCw, Waves } from 'lucide-react';
import { DebrisDetection, LogEntry, MissionStatus, TelemetryData } from '../types';
import Viewport from './Viewport';

interface HUDProps {
  missionStatus: MissionStatus;
  telemetry: TelemetryData;
  logs: LogEntry[];
  detections: DebrisDetection[];
  selectedId: string;
  onSelect: (id: string) => void;
  onReset: () => void;
}

const categoryColor: Record<DebrisDetection['category'], string> = {
  'Plastic Waste': 'text-cyan-300',
  'Flexible Waste': 'text-violet-300',
  'Metal Waste': 'text-amber-300',
  'Fishing Waste': 'text-rose-300',
  'Other Debris': 'text-slate-300'
};

const HUD: React.FC<HUDProps> = ({ missionStatus, telemetry, logs, detections, selectedId, onSelect, onReset }) => {
  const [filter, setFilter] = useState('');
  const selected = detections.find(detection => detection.id === selectedId) ?? detections[0];
  const filteredDetections = useMemo(() => detections.filter(detection =>
    `${detection.id} ${detection.label} ${detection.category}`.toLowerCase().includes(filter.toLowerCase())
  ), [detections, filter]);
  const categoryCounts = detections.reduce<Record<string, number>>((counts, detection) => {
    counts[detection.category] = (counts[detection.category] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="relative z-10 min-h-screen bg-[#020b14]/90 p-3 font-mono sm:p-5">
      <header className="flex flex-col gap-3 border border-cyan-400/20 bg-[#03111d]/95 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 text-cyan-300"><Waves className="h-5 w-5 animate-pulse" /><span className="text-xs tracking-[0.3em]">AQUA-SONAR // UNIT 09</span></div>
          <h1 className="mt-1 text-lg font-black tracking-[0.12em] text-white sm:text-2xl">UNDERWATER DEBRIS DETECTION SYSTEM</h1>
          <p className="mt-1 text-[9px] tracking-[0.2em] text-cyan-100/50">SONAR-POWERED MARINE WASTE IDENTIFICATION AND MONITORING</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[9px] text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> SYSTEM ONLINE</span>
          <button onClick={onReset} className="flex items-center gap-2 border border-cyan-300/30 px-3 py-2 text-[10px] tracking-widest text-cyan-200 transition hover:bg-cyan-300/10"><RefreshCw className="h-3.5 w-3.5" /> RESET SCAN</button>
        </div>
      </header>

      <div className="mt-4 grid min-h-[calc(100vh-170px)] grid-cols-1 gap-4 lg:grid-cols-[230px_minmax(420px,1fr)_280px] lg:grid-rows-[minmax(500px,1fr)_auto]">
        <aside className="order-2 space-y-4 lg:order-1">
          <Panel title="DEBRIS STATISTICS">
            <Stat label="TOTAL DETECTED" value={detections.length.toString()} icon={<Database />} />
            <Stat label="PLASTIC WASTE" value={(categoryCounts['Plastic Waste'] ?? 0).toString()} />
            <Stat label="METAL WASTE" value={(categoryCounts['Metal Waste'] ?? 0).toString()} />
            <Stat label="FISHING WASTE" value={(categoryCounts['Fishing Waste'] ?? 0).toString()} />
            <Stat label="OTHER DEBRIS" value={((categoryCounts['Other Debris'] ?? 0) + (categoryCounts['Flexible Waste'] ?? 0)).toString()} />
          </Panel>
          <Panel title="CLASSIFICATION BREAKDOWN">
            <div className="space-y-3">{Object.entries(categoryCounts).map(([category, count]) => <div key={category}><div className="mb-1 flex justify-between text-[9px]"><span className={categoryColor[category as DebrisDetection['category']]}>{category}</span><span>{count}</span></div><div className="h-1 bg-white/10"><div className="h-full bg-cyan-300/70" style={{ width: `${(count / detections.length) * 100}%` }} /></div></div>)}</div>
          </Panel>
        </aside>

        <section className="order-1 flex min-h-[420px] min-w-0 flex-col border border-cyan-300/25 bg-[#010a13] p-3 lg:order-2 lg:row-span-1">
          <div className="flex items-center justify-between border-b border-cyan-300/15 pb-3"><div><h2 className="text-xs font-bold tracking-[0.2em] text-cyan-200">CENTRAL SONAR RADAR // 200 kHz</h2><p className="mt-1 text-[9px] text-cyan-100/40">LIVE DEBRIS TRACKING FIELD</p></div><span className="text-[9px] text-emerald-300">{missionStatus}</span></div>
          <div className="relative mt-3 min-h-[360px] flex-1 overflow-hidden rounded-full border border-cyan-400/10 bg-[#020b14]"><Viewport missionStatus={missionStatus} telemetry={telemetry} detection={selected} /></div>
          <div className="flex justify-between px-1 pt-3 text-[8px] tracking-widest text-cyan-100/40"><span>RANGE 0—100M</span><span>SWEEP ACTIVE</span><span>HEADING {telemetry.heading.toFixed(0)}°</span></div>
        </section>

        <aside className="order-3 space-y-4">
          <Panel title="SELECTED OBJECT">
            {selected && <div className="grid grid-cols-2 gap-4 text-[10px]"><Metric label="ID" value={selected.id} /><Metric label="TYPE" value={selected.label} /><Metric label="CONFIDENCE" value={`${selected.confidence.toFixed(1)}%`} /><Metric label="DEPTH" value={`${selected.depth.toFixed(1)} m`} /><Metric label="DISTANCE" value={`${selected.distance.toFixed(1)} m`} /><Metric label="STATUS" value={selected.status} /><div className="col-span-2"><Metric label="DETECTION TIME" value={new Date(selected.timestamp).toLocaleTimeString('en-GB')} /></div></div>}
          </Panel>
          <Panel title="ENVIRONMENTAL MONITORING">
            <Metric label="DRONE DEPTH" value={`${telemetry.depth.toFixed(2)} m`} /><Metric label="WATER TEMP" value={`${telemetry.temperature.toFixed(1)}°C`} /><Metric label="TURBIDITY" value={`${telemetry.turbidity.toFixed(0)} NTU`} /><Metric label="SONAR BATTERY" value={`${telemetry.battery.toFixed(0)}%`} /><div className="mt-2 h-1 bg-white/10"><div className="h-full bg-emerald-300" style={{ width: `${telemetry.battery}%` }} /></div>
          </Panel>
        </aside>

        <section className="order-4 border border-cyan-300/20 bg-[#03111d]/95 p-4 lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs font-bold tracking-[0.2em] text-cyan-200">DETECTION HISTORY / RECENT ALERTS</h2><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="FILTER OBJECTS..." className="border border-cyan-300/20 bg-black/30 px-2 py-1 text-[9px] text-cyan-100 outline-none placeholder:text-cyan-100/30" /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[9px]"><thead className="text-cyan-100/40"><tr><th className="p-2">ID</th><th className="p-2">CATEGORY</th><th className="p-2">CONF.</th><th className="p-2">DEPTH</th><th className="p-2">DIST.</th><th className="p-2">TIME</th><th className="p-2">STATUS</th></tr></thead><tbody>{filteredDetections.map(detection => <tr key={detection.id} onClick={() => onSelect(detection.id)} className={`cursor-pointer border-t border-cyan-300/10 transition hover:bg-cyan-300/10 ${detection.id === selectedId ? 'bg-cyan-300/10' : ''}`}><td className="p-2 text-cyan-200">{detection.id}</td><td className={`p-2 ${categoryColor[detection.category]}`}>{detection.label}</td><td className="p-2">{detection.confidence.toFixed(1)}%</td><td className="p-2">{detection.depth.toFixed(1)}m</td><td className="p-2">{detection.distance.toFixed(1)}m</td><td className="p-2">{new Date(detection.timestamp).toLocaleTimeString('en-GB')}</td><td className="p-2 text-emerald-300">{detection.status}</td></tr>)}</tbody></table></div>
          <div className="mt-3 flex flex-wrap gap-3 border-t border-cyan-300/10 pt-2 text-[8px] text-cyan-100/50">{logs.slice(0, 3).map(log => <span key={log.id}><Clock3 className="mr-1 inline h-3 w-3" />{log.message}</span>)}</div>
        </section>
      </div>
    </div>
  );
};

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <div className="border border-cyan-300/20 bg-[#03111d]/95 p-4 backdrop-blur-md"><h2 className="mb-4 border-b border-cyan-300/10 pb-2 text-[10px] font-bold tracking-[0.2em] text-cyan-200">{title}</h2><div className="space-y-3">{children}</div></div>;
const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div><div className="text-[8px] tracking-widest text-cyan-100/40">{label}</div><div className="mt-1 truncate font-bold text-white">{value}</div></div>;
const Stat: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[9px] text-cyan-100/60">{icon && React.cloneElement(icon as React.ReactElement, { className: 'h-3 w-3 text-cyan-300' })}{label}</span><strong className="text-sm text-white">{value}</strong></div>;

export default HUD;
