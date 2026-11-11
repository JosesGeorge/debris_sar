import type { ScenarioConfig, ObjectType, DebrisCategory } from '../../types';

export const OBJECT_REFLECTIVITY: Record<ObjectType, number> = {
  plastic_bottle: 0.72,
  plastic_bag: 0.41,
  aluminum_can: 0.95,
  fishing_net: 0.55,
  tire: 0.88,
  metal_scrap: 0.93,
  unknown: 0.60
};

export const OBJECT_DIMENSIONS: Record<ObjectType, { length: number; width: number; height: number }> = {
  plastic_bottle: { length: 0.24, width: 0.07, height: 0.07 },
  plastic_bag:    { length: 0.45, width: 0.35, height: 0.02 },
  aluminum_can:   { length: 0.12, width: 0.07, height: 0.07 },
  fishing_net:    { length: 3.50, width: 2.80, height: 0.05 },
  tire:           { length: 0.70, width: 0.70, height: 0.20 },
  metal_scrap:    { length: 0.60, width: 0.40, height: 0.15 },
  unknown:        { length: 0.30, width: 0.30, height: 0.30 }
};

export const OBJECT_CATEGORY: Record<ObjectType, DebrisCategory> = {
  plastic_bottle: 'Plastic Waste',
  plastic_bag:    'Flexible Waste',
  aluminum_can:   'Metal Waste',
  fishing_net:    'Fishing Waste',
  tire:           'Rubber Waste',
  metal_scrap:    'Metal Waste',
  unknown:        'Other Debris'
};

export const OBJECT_LABEL: Record<ObjectType, string> = {
  plastic_bottle: 'Plastic bottle',
  plastic_bag:    'Plastic bag',
  aluminum_can:   'Aluminium can',
  fishing_net:    'Fishing net',
  tire:           'Discarded tire',
  metal_scrap:    'Metal scrap',
  unknown:        'Unknown debris'
};

function makeTarget(
  idSuffix: string,
  object_type: ObjectType,
  distance: number,
  bearing: number,
  depth: number,
  confidence: number
) {
  return {
    target_id: `DBR-${idSuffix}`,
    object_type,
    category: OBJECT_CATEGORY[object_type],
    label: OBJECT_LABEL[object_type],
    distance,
    bearing,
    depth,
    confidence,
    signal_strength: OBJECT_REFLECTIVITY[object_type] * confidence,
    estimated_dimensions: OBJECT_DIMENSIONS[object_type],
    detection_source: 'simulation' as const,
    angle: bearing
  };
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'plastic_field',
    label: 'SCENARIO 1 — PLASTIC WASTE FIELD',
    description: 'Dense plastic bottle and bag scatter across seabed at 10–25m depth.',
    targets: [
      makeTarget('001', 'plastic_bottle', 18.5, 125, 12.0, 0.94),
      makeTarget('002', 'plastic_bag',    31.2,  48, 10.5, 0.78),
      makeTarget('003', 'plastic_bottle', 42.8, 220, 15.2, 0.86),
      makeTarget('004', 'plastic_bag',    15.6, 310,  9.8, 0.71),
      makeTarget('005', 'plastic_bottle', 57.3, 170, 18.4, 0.82),
      makeTarget('006', 'plastic_bag',    68.1,  85, 22.1, 0.65),
    ]
  },
  {
    id: 'mixed_debris',
    label: 'SCENARIO 2 — MIXED MARINE DEBRIS',
    description: 'Plastic, metal, and mixed waste. Realistic post-storm seabed scan.',
    targets: [
      makeTarget('007', 'plastic_bottle', 18.5, 125, 12.0, 0.94),
      makeTarget('008', 'plastic_bag',    31.2,  48, 10.5, 0.78),
      makeTarget('009', 'aluminum_can',   22.6, 290, 11.2, 0.91),
      makeTarget('010', 'metal_scrap',    45.7, 195, 20.3, 0.89),
      makeTarget('011', 'unknown',        63.4,  15, 25.0, 0.55),
    ]
  },
  {
    id: 'ghost_net',
    label: 'SCENARIO 3 — GHOST NET DETECTION',
    description: 'Abandoned fishing nets and entangled debris drifting near reef.',
    targets: [
      makeTarget('012', 'fishing_net',   28.4,  70,  8.5, 0.88),
      makeTarget('013', 'fishing_net',   52.1, 142, 12.0, 0.81),
      makeTarget('014', 'fishing_net',   76.3, 258, 15.5, 0.74),
      makeTarget('015', 'unknown',       33.0, 190, 10.0, 0.60),
      makeTarget('016', 'plastic_bag',   41.5,  35,  9.2, 0.70),
    ]
  },
  {
    id: 'dynamic',
    label: 'SCENARIO 4 — DYNAMIC DEBRIS TRACKING',
    description: 'Moving debris carried by current. High-update-rate target tracking.',
    targets: [
      makeTarget('017', 'tire',           35.2, 110, 14.8, 0.90),
      makeTarget('018', 'metal_scrap',    48.6, 265, 22.3, 0.85),
      makeTarget('019', 'plastic_bottle', 22.1,  55, 10.5, 0.92),
      makeTarget('020', 'fishing_net',    61.4, 320, 18.0, 0.77),
      makeTarget('021', 'aluminum_can',   17.8, 185,  8.9, 0.94),
      makeTarget('022', 'plastic_bag',    39.5, 240, 13.4, 0.68),
    ]
  },
  {
    id: 'clean',
    label: 'SCENARIO 5 — CLEAN SEABED',
    description: 'No debris detected. Nominal environmental conditions.',
    targets: []
  }
];

export function getScenarioById(id: string): ScenarioConfig | undefined {
  return SCENARIOS.find(s => s.id === id);
}
