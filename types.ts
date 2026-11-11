export enum MissionStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  CONTACT = 'CONTACT',
  INSPECT = 'INSPECT',
  CONFIRMED = 'CONFIRMED',
  PAUSED = 'PAUSED'
}

export type DebrisCategory =
  | 'Plastic Waste'
  | 'Flexible Waste'
  | 'Metal Waste'
  | 'Fishing Waste'
  | 'Rubber Waste'
  | 'Other Debris';

export type ObjectType =
  | 'plastic_bottle'
  | 'plastic_bag'
  | 'aluminum_can'
  | 'fishing_net'
  | 'tire'
  | 'metal_scrap'
  | 'unknown';

export interface EstimatedDimensions {
  length: number;
  width: number;
  height: number;
}

export interface SonarTarget {
  target_id: string;
  object_type: ObjectType;
  category: DebrisCategory;
  label: string;
  distance: number;
  bearing: number;
  depth: number;
  confidence: number;
  signal_strength: number;
  estimated_dimensions: EstimatedDimensions;
  track_status: 'active' | 'lost' | 'archived';
  detection_source: 'simulation';
  timestamp: string;
  id: string;
  status: 'TRACKING' | 'CONFIRMED' | 'ARCHIVED';
  angle: number;
  velocity?: { dr: number; dtheta: number };
}

export type ScenarioId = 'plastic_field' | 'mixed_debris' | 'ghost_net' | 'dynamic' | 'clean';

export interface ScenarioConfig {
  id: ScenarioId;
  label: string;
  description: string;
  targets: Omit<SonarTarget, 'id' | 'timestamp' | 'status' | 'track_status'>[];
}

export interface SonarState {
  missionStatus: MissionStatus;
  targets: SonarTarget[];
  selectedId: string | null;
  scanRange: number;
  scanAngle: number;
  scenario: ScenarioId;
  elapsedSeconds: number;
  waterTemp: number;
  signalStrength: number;
  eventLog: LogEntry[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARN' | 'CRIT';
}

export interface TelemetryData {
  depth: number;
  heading: number;
  battery: number;
  temperature: number;
  turbidity: number;
  distanceToTarget: number;
  confidence: number;
  gimbalYaw: number;
  gimbalPitch: number;
  isLocked: boolean;
  driftX: number;
  driftY: number;
}

export interface Particulate {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
}

export interface DebrisDetection extends SonarTarget {}
