import type { SonarTarget, ObjectType } from '../../types';
import { OBJECT_LABEL, OBJECT_DIMENSIONS, OBJECT_REFLECTIVITY } from './scenarios';

export interface ClassificationResult {
  object_type: ObjectType;
  label: string;
  confidence: number;
  alternatives: Array<{ object_type: ObjectType; confidence: number }>;
}

// Deterministic classification rules based on signal parameters
export function classifyTarget(
  signal_strength: number,
  estimated_size_m: number,
  depth: number
): ClassificationResult {
  type Candidate = { type: ObjectType; score: number };
  const candidates: Candidate[] = [];

  // Rule-based scoring
  const reflTypes: ObjectType[] = ['plastic_bottle', 'plastic_bag', 'aluminum_can', 'fishing_net', 'tire', 'metal_scrap', 'unknown'];

  for (const type of reflTypes) {
    const ref = OBJECT_REFLECTIVITY[type];
    const dim = OBJECT_DIMENSIONS[type];
    const typicalSize = (dim.length + dim.width) / 2;
    const refMatch = 1 - Math.abs(signal_strength - ref);
    const sizeMatch = 1 - Math.min(1, Math.abs(estimated_size_m - typicalSize) / typicalSize);
    const score = refMatch * 0.6 + sizeMatch * 0.4 + (Math.random() * 0.1 - 0.05); // small noise
    candidates.push({ type, score: Math.max(0, Math.min(1, score)) });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const totalScore = candidates.reduce((sum, c) => sum + c.score, 0);

  return {
    object_type: best.type,
    label: OBJECT_LABEL[best.type],
    confidence: best.score / totalScore,
    alternatives: candidates.slice(1, 4).map(c => ({
      object_type: c.type,
      confidence: c.score / totalScore
    }))
  };
}

export function getTargetSummary(target: SonarTarget): string {
  const dim = target.estimated_dimensions;
  return `${target.label} | ${(target.confidence * 100).toFixed(0)}% conf | ${target.distance.toFixed(1)}m @ ${target.bearing.toFixed(0)}° | depth ${target.depth.toFixed(1)}m | ${dim.length.toFixed(2)}×${dim.width.toFixed(2)}m`;
}
