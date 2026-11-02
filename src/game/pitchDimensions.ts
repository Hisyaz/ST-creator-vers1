/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PitchDimensionPreset, PitchDimensionConfig } from '../types';

/**
 * Standard IFAB Law 1 Pitch Dimension Presets
 * Compact: 100m × 64m (IFAB Legal Minimum ground)
 * Standard / Balanced: 105m × 68m (FIFA & UEFA Benchmark)
 * Expansive: 110m × 74m (IFAB Legal Maximum ground, e.g. Camp Nou)
 */
export const PITCH_DIMENSION_PRESETS: Record<
  'compact' | 'standard' | 'balanced' | 'expansive',
  {
    name: string;
    lengthMeters: number;
    widthMeters: number;
    description: string;
    tacticalSummary: string;
    staminaDrainMultiplier: number;
    spaceHalfSpaceMultiplier: number;
    pressingTrapMultiplier: number;
  }
> = {
  compact: {
    name: 'Compact / Direct Ground (100m × 64m)',
    lengthMeters: 100,
    widthMeters: 64,
    description: 'IFAB Legal Minimum ground. Compresses midfield channels and passing avenues.',
    tacticalSummary: 'Favors low blocks, aggressive gegenpressing, and direct aerial long balls.',
    staminaDrainMultiplier: 0.90,
    spaceHalfSpaceMultiplier: 0.82,
    pressingTrapMultiplier: 1.25,
  },
  standard: {
    name: 'Standard / FIFA Benchmark (105m × 68m)',
    lengthMeters: 105,
    widthMeters: 68,
    description: 'Standard international tournament & UEFA Champions League specification.',
    tacticalSummary: 'Symmetrical spacing for both wide wingers and central possession triangles.',
    staminaDrainMultiplier: 1.0,
    spaceHalfSpaceMultiplier: 1.0,
    pressingTrapMultiplier: 1.0,
  },
  balanced: {
    name: 'Standard / FIFA Benchmark (105m × 68m)',
    lengthMeters: 105,
    widthMeters: 68,
    description: 'Standard international tournament & UEFA Champions League specification.',
    tacticalSummary: 'Symmetrical spacing for both wide wingers and central possession triangles.',
    staminaDrainMultiplier: 1.0,
    spaceHalfSpaceMultiplier: 1.0,
    pressingTrapMultiplier: 1.0,
  },
  expansive: {
    name: 'Expansive Cathedral (110m × 74m)',
    lengthMeters: 110,
    widthMeters: 74,
    description: 'IFAB Legal Maximum ground (e.g., Camp Nou). Hugely stretched half-spaces.',
    tacticalSummary: 'Favors tiki-taka possession, switches to wingers, and stretching low defensive blocks.',
    staminaDrainMultiplier: 1.15,
    spaceHalfSpaceMultiplier: 1.22,
    pressingTrapMultiplier: 0.82,
  },
};

export const MIN_LEGAL_METERS_WIDTH = 64;   // Compact minimum width
export const MAX_LEGAL_METERS_WIDTH = 74;   // Expansive maximum width
export const MIN_LEGAL_METERS_LENGTH = 100; // Compact minimum length
export const MAX_LEGAL_METERS_LENGTH = 110; // Expansive maximum length

// Infill area is strictly fixed: Maximum pitch possible (110m × 74m) plus 1 meter in every direction
export const INFILL_SAFETY_MARGIN_METERS = 1;
export const INFILL_METERS_WIDTH = MAX_LEGAL_METERS_WIDTH + INFILL_SAFETY_MARGIN_METERS * 2;   // 76m
export const INFILL_METERS_LENGTH = MAX_LEGAL_METERS_LENGTH + INFILL_SAFETY_MARGIN_METERS * 2; // 112m

export const MAX_PITCH_TURF_WIDTH = 1500;
export const MAX_PITCH_TURF_HEIGHT = 2500;

/**
 * Converts real-world pitch dimensions (meters) into pixel coordinates
 * Baseline benchmark: 74m × 110m (max pitch) maps to 1500px × 2500px
 * Infill area: 76m × 112m (max pitch + 1m in every direction)
 */
export interface ResolvedPitchMetrics {
  preset: PitchDimensionPreset;
  lengthMeters: number;
  widthMeters: number;
  turfWidth: number;
  turfHeight: number;
  fieldWidth: number;
  fieldHeight: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  totalWidth: number;
  totalHeight: number;
  pitchLeft: number;
  pitchRight: number;
  pitchTop: number;
  pitchBottom: number;
  turfLeft: number;
  turfRight: number;
  turfTop: number;
  turfBottom: number;
  lineOffsetX: number;
  lineOffsetY: number;
  centerX: number;
  centerY: number;
  // Infill Area Metrics (Max pitch possible + 1m in every direction)
  infillWidthMeters: number;  // 76m
  infillLengthMeters: number; // 112m
  infillWidth: number;        // ~1541px
  infillHeight: number;       // ~2545px
  infillLeft: number;         // ~160px
  infillRight: number;        // ~1701px
  infillTop: number;          // ~197px
  infillBottom: number;       // ~2742px
  marginToInfillMetersX: number; // (76 - widthMeters) / 2 (min 1.0m)
  marginToInfillMetersY: number; // (112 - lengthMeters) / 2 (min 1.0m)
  // Markings
  penaltyBoxWidth: number;
  penaltyBoxHeight: number;
  sixYardBoxWidth: number;
  sixYardBoxHeight: number;
  centerCircleRadius: number;
  penaltySpotDist: number;
  cornerArcRadius: number;
  // Tactical Modifiers
  staminaMultiplier: number;
  spaceMultiplier: number;
}

export function resolvePitchMetrics(
  config?: Partial<PitchDimensionConfig> & { pitchDimensions?: PitchDimensionPreset }
): ResolvedPitchMetrics {
  const preset = config?.preset || config?.pitchDimensions || 'standard';
  let lengthMeters = 105;
  let widthMeters = 68;

  if (preset === 'custom') {
    // Limits strictly enforced: compact minimum to expansive maximum
    lengthMeters = Math.max(MIN_LEGAL_METERS_LENGTH, Math.min(MAX_LEGAL_METERS_LENGTH, Math.round(config?.lengthMeters ?? 105)));
    widthMeters = Math.max(MIN_LEGAL_METERS_WIDTH, Math.min(MAX_LEGAL_METERS_WIDTH, Math.round(config?.widthMeters ?? 68)));
  } else if (preset === 'compact') {
    lengthMeters = 100;
    widthMeters = 64;
  } else if (preset === 'expansive') {
    lengthMeters = 110;
    widthMeters = 74;
  } else {
    // standard / balanced
    lengthMeters = 105;
    widthMeters = 68;
  }

  // Canonical coordinate scale: 74m x 110m (expansive max pitch) maps to 1500px x 2500px
  const pxPerMeterX = MAX_PITCH_TURF_WIDTH / MAX_LEGAL_METERS_WIDTH;
  const pxPerMeterY = MAX_PITCH_TURF_HEIGHT / MAX_LEGAL_METERS_LENGTH;

  const marginX = 180;
  const marginTop = 220;
  const marginBottom = 200;

  const centerX = marginX + MAX_PITCH_TURF_WIDTH / 2; // 930
  const centerY = marginTop + MAX_PITCH_TURF_HEIGHT / 2; // 1470

  // The infill area is fixed to the maximum pitch possible plus 1 meter in every direction
  const infillWidth = Math.round(INFILL_METERS_WIDTH * pxPerMeterX);   // ~1541px
  const infillHeight = Math.round(INFILL_METERS_LENGTH * pxPerMeterY); // ~2545px
  const infillLeft = Math.round(centerX - infillWidth / 2);            // ~160px
  const infillRight = infillLeft + infillWidth;                       // ~1701px
  const infillTop = Math.round(centerY - infillHeight / 2);            // ~197px
  const infillBottom = infillTop + infillHeight;                      // ~2742px

  // Pitch field dimensions strictly centered inside the infill area
  const fieldWidth = Math.round(widthMeters * pxPerMeterX);
  const fieldHeight = Math.round(lengthMeters * pxPerMeterY);

  const pitchLeft = Math.round(centerX - fieldWidth / 2);
  const pitchRight = pitchLeft + fieldWidth;
  const pitchTop = Math.round(centerY - fieldHeight / 2);
  const pitchBottom = pitchTop + fieldHeight;

  // Margin to infill area boundary in meters (at least 1 meter in every direction)
  const marginToInfillMetersX = (INFILL_METERS_WIDTH - widthMeters) / 2;
  const marginToInfillMetersY = (INFILL_METERS_LENGTH - lengthMeters) / 2;

  // Total canvas boundaries
  const totalWidth = MAX_PITCH_TURF_WIDTH + marginX * 2;
  const totalHeight = MAX_PITCH_TURF_HEIGHT + marginTop + marginBottom;

  const turfLeft = marginX;
  const turfRight = marginX + MAX_PITCH_TURF_WIDTH;
  const turfTop = marginTop;
  const turfBottom = marginTop + MAX_PITCH_TURF_HEIGHT;

  const lineOffsetX = Math.max(0, Math.round((MAX_PITCH_TURF_WIDTH - fieldWidth) / 2));
  const lineOffsetY = Math.max(0, Math.round((MAX_PITCH_TURF_HEIGHT - fieldHeight) / 2));

  // Markings scale according to IFAB standards
  const penaltyBoxWidth = Math.round(40.32 * pxPerMeterX); // 40.32m
  const penaltyBoxHeight = Math.round(16.5 * pxPerMeterY); // 16.5m
  const sixYardBoxWidth = Math.round(18.32 * pxPerMeterX);  // 18.32m
  const sixYardBoxHeight = Math.round(5.5 * pxPerMeterY);   // 5.5m
  const centerCircleRadius = Math.round(9.15 * pxPerMeterX); // 9.15m (10 yards)
  const penaltySpotDist = Math.round(11.0 * pxPerMeterY);   // 11.0m (12 yards)
  const cornerArcRadius = Math.round(1.0 * pxPerMeterX);    // 1m

  // Compute tactical modifiers
  const areaRatio = (widthMeters * lengthMeters) / (68 * 105);
  const staminaMultiplier = Math.max(0.85, Math.min(1.25, Math.sqrt(areaRatio)));
  const spaceMultiplier = Math.max(0.80, Math.min(1.25, widthMeters / 68));

  return {
    preset,
    lengthMeters,
    widthMeters,
    turfWidth: MAX_PITCH_TURF_WIDTH,
    turfHeight: MAX_PITCH_TURF_HEIGHT,
    fieldWidth,
    fieldHeight,
    marginX,
    marginTop,
    marginBottom,
    totalWidth,
    totalHeight,
    pitchLeft,
    pitchRight,
    pitchTop,
    pitchBottom,
    turfLeft,
    turfRight,
    turfTop,
    turfBottom,
    lineOffsetX,
    lineOffsetY,
    centerX,
    centerY,
    infillWidthMeters: INFILL_METERS_WIDTH,
    infillLengthMeters: INFILL_METERS_LENGTH,
    infillWidth,
    infillHeight,
    infillLeft,
    infillRight,
    infillTop,
    infillBottom,
    marginToInfillMetersX,
    marginToInfillMetersY,
    penaltyBoxWidth,
    penaltyBoxHeight,
    sixYardBoxWidth,
    sixYardBoxHeight,
    centerCircleRadius,
    penaltySpotDist,
    cornerArcRadius: Math.max(26, cornerArcRadius),
    staminaMultiplier,
    spaceMultiplier,
  };
}
