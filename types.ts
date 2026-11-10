export enum MissionStatus {
  SCANNING = 'SCANNING',
  CONTACT = 'CONTACT',
  INSPECT = 'INSPECT',
  CONFIRMED = 'CONFIRMED'
}

export type DebrisCategory =
  | 'Plastic Waste'
  | 'Flexible Waste'
  | 'Metal Waste'
  | 'Fishing Waste'
  | 'Other Debris';

export interface DebrisDetection {
  id: string;
  category: DebrisCategory;
  label: string;
  confidence: number;
  depth: number;
  distance: number;
  timestamp: string;
  status: 'TRACKING' | 'CONFIRMED' | 'ARCHIVED';
  angle: number;
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
