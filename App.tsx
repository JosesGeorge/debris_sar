import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MissionStatus, SonarTarget, LogEntry, ScenarioId } from './types';
import { SonarSimulator } from './src/simulation/sonarSimulator';
import { SCENARIOS } from './src/simulation/scenarios';
import SonarHUD from './components/SonarHUD';

const App: React.FC = () => {
  const [missionStatus, setMissionStatus] = useState<MissionStatus>(MissionStatus.SCANNING);
  const [targets, setTargets] = useState<SonarTarget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scenario, setScenario] = useState<ScenarioId>('mixed_debris');
  const [scanRange, setScanRange] = useState(100);
  const [elapsed, setElapsed] = useState(0);
  const [acousticData, setAcousticData] = useState<Float32Array>(new Float32Array(256));
  const [isScanning, setIsScanning] = useState(true);
  const startTime = useRef(Date.now());
  const simulatorRef = useRef<SonarSimulator | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'INFO') => {
    setLogs(prev => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      message,
      type
    }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const sim = new SonarSimulator({
      onTargetsUpdate: (newTargets) => {
        setTargets(newTargets);
        if (newTargets.length > 0 && !selectedId) {
          setSelectedId(newTargets[0].target_id);
        }
      },
      onAcousticData: (buf) => setAcousticData(buf),
      onLog: (msg, type) => addLog(msg, type),
      onStatusChange: (status) => setMissionStatus(status)
    });
    simulatorRef.current = sim;
    sim.loadScenario('mixed_debris');
    sim.start();

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => {
      sim.pause();
      clearInterval(timer);
    };
  }, []);

  const handleStart = useCallback(() => {
    simulatorRef.current?.start();
    setIsScanning(true);
    addLog('SCAN_STARTED // Sweep active', 'INFO');
  }, [addLog]);

  const handlePause = useCallback(() => {
    simulatorRef.current?.pause();
    setIsScanning(false);
  }, []);

  const handleResume = useCallback(() => {
    simulatorRef.current?.resume();
    setIsScanning(true);
  }, []);

  const handleReset = useCallback(() => {
    startTime.current = Date.now();
    setElapsed(0);
    setLogs([]);
    setSelectedId(null);
    simulatorRef.current?.reset();
    setIsScanning(true);
    addLog('SONAR_ARRAY_REINITIALIZED // Simulation ready', 'WARN');
  }, [addLog]);

  const handleScenarioChange = useCallback((newScenario: ScenarioId) => {
    setScenario(newScenario);
    setSelectedId(null);
    simulatorRef.current?.loadScenario(newScenario);
    addLog(`SCENARIO_CHANGE // ${newScenario}`, 'INFO');
  }, [addLog]);

  const handleRangeChange = useCallback((range: number) => {
    setScanRange(range);
    simulatorRef.current?.setScanRange(range);
    addLog(`SCAN_RANGE_SET // ${range}m`, 'INFO');
  }, [addLog]);

  const handleClearTargets = useCallback(() => {
    simulatorRef.current?.clearTargets();
    setTargets([]);
    setSelectedId(null);
    addLog('TARGETS_CLEARED // Target list reset', 'WARN');
  }, [addLog]);

  const selectedTarget = targets.find(t => t.target_id === selectedId) ?? targets[0] ?? null;

  const telemetry = {
    depth: 14.2 + Math.sin(elapsed / 6) * 0.08,
    heading: (185 + Math.sin(elapsed / 10) * 4 + 360) % 360,
    battery: Math.max(72, 96 - elapsed / 90),
    temperature: 4.5 + Math.sin(elapsed / 3) * 0.1,
    turbidity: 82 + Math.sin(elapsed / 5) * 3,
    distanceToTarget: selectedTarget?.distance ?? 0,
    confidence: (selectedTarget?.confidence ?? 0) * 100,
    gimbalYaw: Math.sin(elapsed / 4) * 2,
    gimbalPitch: Math.cos(elapsed / 5) * 1.5,
    isLocked: missionStatus === MissionStatus.CONFIRMED,
    driftX: Math.sin(elapsed) * 2,
    driftY: Math.cos(elapsed / 2) * 1.5
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020b14] text-cyan-50 font-mono selection:bg-cyan-400/30">
      <SonarHUD
        missionStatus={missionStatus}
        telemetry={telemetry}
        logs={logs}
        targets={targets}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
        onScenarioChange={handleScenarioChange}
        onRangeChange={handleRangeChange}
        onClearTargets={handleClearTargets}
        scenario={scenario}
        scanRange={scanRange}
        acousticData={acousticData}
        isScanning={isScanning}
        elapsed={elapsed}
        scenarios={SCENARIOS}
      />
    </main>
  );
};

export default App;
