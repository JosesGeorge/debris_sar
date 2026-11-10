import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DebrisCategory, DebrisDetection, LogEntry, MissionStatus, TelemetryData } from './types';
import Viewport from './components/Viewport';
import HUD from './components/HUD';

const debrisCatalog: Array<{ category: DebrisCategory; label: string }> = [
  { category: 'Plastic Waste', label: 'Plastic bottle' },
  { category: 'Flexible Waste', label: 'Plastic bag' },
  { category: 'Metal Waste', label: 'Aluminium can' },
  { category: 'Fishing Waste', label: 'Discarded fishing net' },
  { category: 'Plastic Waste', label: 'Plastic container' },
  { category: 'Other Debris', label: 'Unclassified debris' }
];

const App: React.FC = () => {
  const [missionStatus, setMissionStatus] = useState(MissionStatus.SCANNING);
  const [selectedId, setSelectedId] = useState('DBR-001');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [detections, setDetections] = useState<DebrisDetection[]>(() => debrisCatalog.slice(0, 4).map((item, index) => ({
    id: `DBR-${String(index + 1).padStart(3, '0')}`,
    ...item,
    confidence: 91.4 - index * 3.2,
    depth: 14.2 + index * 2.8,
    distance: 18.6 + index * 11.4,
    timestamp: new Date(Date.now() - index * 720000).toISOString(),
    status: index === 0 ? 'TRACKING' : 'CONFIRMED',
    angle: -28 + index * 18
  })));
  const startTime = useRef(Date.now());

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'INFO') => {
    setLogs(previous => [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      message,
      type
    }, ...previous].slice(0, 8));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - startTime.current) / 1000;
      setElapsed(seconds);
      const status = seconds < 5 ? MissionStatus.SCANNING : seconds < 10 ? MissionStatus.CONTACT : seconds < 16 ? MissionStatus.INSPECT : MissionStatus.CONFIRMED;
      setMissionStatus(status);
      if (Math.floor(seconds) === 5) addLog('ACOUSTIC_CONTACT // DBR-001 acquired', 'WARN');
      if (Math.floor(seconds) === 10) addLog('CLASSIFIER_ACTIVE // category confidence rising');
      if (Math.floor(seconds) === 16) addLog('TARGET_CONFIRMED // plastic bottle', 'INFO');
      setDetections(previous => previous.map((detection, index) => index === 0 ? {
        ...detection,
        confidence: Math.min(98.8, 84 + seconds * 0.8),
        status: status === MissionStatus.CONFIRMED ? 'CONFIRMED' : 'TRACKING'
      } : detection));
    }, 500);
    return () => window.clearInterval(timer);
  }, [addLog]);

  const selectedDetection = useMemo(
    () => detections.find(detection => detection.id === selectedId) ?? detections[0],
    [detections, selectedId]
  );

  const telemetry: TelemetryData = {
    depth: 14.2 + Math.sin(elapsed / 6) * 0.08,
    heading: (185 + Math.sin(elapsed / 10) * 4 + 360) % 360,
    battery: Math.max(72, 96 - elapsed / 90),
    temperature: 4.5 + Math.sin(elapsed / 3) * 0.1,
    turbidity: 82 + Math.sin(elapsed / 5) * 3,
    distanceToTarget: selectedDetection?.distance ?? 0,
    confidence: selectedDetection?.confidence ?? 0,
    gimbalYaw: Math.sin(elapsed / 4) * 2,
    gimbalPitch: Math.cos(elapsed / 5) * 1.5,
    isLocked: missionStatus === MissionStatus.CONFIRMED,
    driftX: Math.sin(elapsed) * 2,
    driftY: Math.cos(elapsed / 2) * 1.5
  };

  const resetMission = useCallback(() => {
    startTime.current = Date.now();
    setElapsed(0);
    setMissionStatus(MissionStatus.SCANNING);
    setLogs([]);
    addLog('SONAR_ARRAY_REINITIALIZED // simulation ready', 'WARN');
  }, [addLog]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020b14] text-cyan-50 font-mono selection:bg-cyan-400/30">
      <Viewport missionStatus={missionStatus} telemetry={telemetry} detection={selectedDetection} />
      <HUD missionStatus={missionStatus} telemetry={telemetry} logs={logs} detections={detections} selectedId={selectedId} onSelect={setSelectedId} onReset={resetMission} />
    </main>
  );
};

export default App;
