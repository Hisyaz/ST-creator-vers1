import { describe, it, expect } from 'vitest';
import { resolvePitchMetrics, MAX_PITCH_TURF_WIDTH, MAX_PITCH_TURF_HEIGHT } from '../pitchDimensions';
import { getStadiumShapeMetrics } from '../stadiumRenderer';
import { StadiumDefinition } from '../../types/stadium';
import { createDefaultStadium } from '../stadiumRegistry';

describe('Phase S1: Canonical Pitch Invariance, Stadium Scale Hierarchy & 4-Shape Apron Infill Engine', () => {
  describe('Canonical Pitch Area Invariance', () => {
    it('enforces constant outer turf bounds (1500w x 2500h) regardless of dimension presets', () => {
      const compactMetrics = resolvePitchMetrics({ preset: 'compact' });
      const balancedMetrics = resolvePitchMetrics({ preset: 'balanced' });
      const expansiveMetrics = resolvePitchMetrics({ preset: 'expansive' });

      expect(compactMetrics.turfWidth).toBe(MAX_PITCH_TURF_WIDTH);
      expect(compactMetrics.turfHeight).toBe(MAX_PITCH_TURF_HEIGHT);
      expect(compactMetrics.turfRight - compactMetrics.turfLeft).toBe(MAX_PITCH_TURF_WIDTH);
      expect(compactMetrics.turfBottom - compactMetrics.turfTop).toBe(MAX_PITCH_TURF_HEIGHT);

      expect(balancedMetrics.turfWidth).toBe(MAX_PITCH_TURF_WIDTH);
      expect(balancedMetrics.turfHeight).toBe(MAX_PITCH_TURF_HEIGHT);

      expect(expansiveMetrics.turfWidth).toBe(MAX_PITCH_TURF_WIDTH);
      expect(expansiveMetrics.turfHeight).toBe(MAX_PITCH_TURF_HEIGHT);
    });

    it('shifts painted field lines inward when pitch size is smaller than maximum canonical turf area', () => {
      const compactMetrics = resolvePitchMetrics({ preset: 'compact' });
      const expansiveMetrics = resolvePitchMetrics({ preset: 'expansive' });

      // Compact has smaller playable area than expansive, so line offsets are larger (moved inward)
      expect(compactMetrics.lineOffsetX).toBeGreaterThan(0);
      expect(compactMetrics.lineOffsetY).toBeGreaterThan(0);

      expect(compactMetrics.lineOffsetX).toBeGreaterThanOrEqual(expansiveMetrics.lineOffsetX);
      expect(compactMetrics.lineOffsetY).toBeGreaterThanOrEqual(expansiveMetrics.lineOffsetY);

      // Playable lines are strictly within canonical turf boundaries
      expect(compactMetrics.pitchLeft).toBeGreaterThanOrEqual(compactMetrics.turfLeft);
      expect(compactMetrics.pitchRight).toBeLessThanOrEqual(compactMetrics.turfRight);
      expect(compactMetrics.pitchTop).toBeGreaterThanOrEqual(compactMetrics.turfTop);
      expect(compactMetrics.pitchBottom).toBeLessThanOrEqual(compactMetrics.turfBottom);
    });
  });

  describe('Strict Stadium Superiority Invariant & 4 Stadium Shapes', () => {
    const PITCH_HALF_DIAG = Math.hypot(1500 / 2, 2500 / 2); // ~1457.738px
    const P_LEFT = 180;
    const P_RIGHT = 1680;
    const P_TOP = 220;
    const P_BOTTOM = 2720;

    const createDummyStadium = (
      shape: 'round' | 'oval' | 'square' | 'rectangular',
      apronSetback: 'compact' | 'standard' | 'expansive' = 'standard'
    ): StadiumDefinition => ({
      ...createDefaultStadium(),
      id: `test-${shape}`,
      name: `Test ${shape}`,
      shape,
      apronSetback,
      hasTrack: true,
    });

    it('Round shape: inner stand perimeter strictly exceeds pitch half-diagonal so pitch is 100% inside', () => {
      const roundDef = createDummyStadium('round');
      const metrics = getStadiumShapeMetrics(roundDef);

      expect(metrics.shape).toBe('round');
      expect(metrics.apronRadiusX).toBeGreaterThan(PITCH_HALF_DIAG);
      // Ensure athletics track inner edge strictly clears pitch corners (zero track bleed)
      const trackInnerEdge = metrics.trackRadiusX - metrics.trackWidthTotal / 2;
      expect(trackInnerEdge).toBeGreaterThan(PITCH_HALF_DIAG);
    });

    it('Oval shape: touchline and end-curve setbacks strictly clear pitch bounds and accommodate D-zones', () => {
      const ovalDef = createDummyStadium('oval');
      const metrics = getStadiumShapeMetrics(ovalDef);

      expect(metrics.shape).toBe('oval');
      expect(metrics.westInnerX).toBeLessThan(P_LEFT);
      expect(metrics.eastInnerX).toBeGreaterThan(P_RIGHT);
      expect(metrics.northInnerY).toBeLessThan(P_TOP);
      expect(metrics.southInnerY).toBeGreaterThan(P_BOTTOM);
      // North/South setback is large enough for Olympic curve
      expect(P_TOP - metrics.northInnerY).toBeGreaterThanOrEqual(400);
    });

    it('Square shape: symmetric outer perimeter maintains deep North/South setback and wide flanks', () => {
      const squareDef = createDummyStadium('square');
      const metrics = getStadiumShapeMetrics(squareDef);

      expect(metrics.shape).toBe('square');
      expect(metrics.apronWidth).toBe(metrics.apronHeight);
      expect(metrics.apronRadiusX).toBeGreaterThan(PITCH_HALF_DIAG);
      expect(metrics.westInnerX).toBeLessThan(P_LEFT);
      expect(metrics.eastInnerX).toBeGreaterThan(P_RIGHT);
      expect(metrics.northInnerY).toBeLessThan(P_TOP);
      expect(metrics.southInnerY).toBeGreaterThan(P_BOTTOM);
      // Flank setback is significantly wider than standard touchlines
      expect(P_LEFT - metrics.westInnerX).toBeGreaterThan(600);
    });

    it('Rectangular shape: infill area is maximum pitch possible plus 1 meter in every direction', () => {
      const rectDef = createDummyStadium('rectangular');
      const metrics = getStadiumShapeMetrics(rectDef);

      expect(metrics.shape).toBe('rectangular');
      expect(metrics.westInnerX).toBeLessThan(P_LEFT);
      expect(metrics.eastInnerX).toBeGreaterThan(P_RIGHT);
      expect(metrics.northInnerY).toBeLessThan(P_TOP);
      expect(metrics.southInnerY).toBeGreaterThan(P_BOTTOM);
      // Infill boundary is at least 1 meter (approx 20px) beyond expansive pitch
      expect(P_LEFT - metrics.westInnerX).toBeGreaterThanOrEqual(18);
      expect(P_TOP - metrics.northInnerY).toBeGreaterThanOrEqual(20);
    });

    it('Stadium stands remain invariant and do not scale when pitch size or setback changes', () => {
      const compactDef = createDummyStadium('rectangular', 'compact');
      const standardDef = createDummyStadium('rectangular', 'standard');
      const expansiveDef = createDummyStadium('rectangular', 'expansive');

      const compactMetrics = getStadiumShapeMetrics(compactDef);
      const standardMetrics = getStadiumShapeMetrics(standardDef);
      const expansiveMetrics = getStadiumShapeMetrics(expansiveDef);

      // Stadium stand positions are strictly invariant (stadium size does not change)
      expect(compactMetrics.eastInnerX).toBe(standardMetrics.eastInnerX);
      expect(standardMetrics.eastInnerX).toBe(expansiveMetrics.eastInnerX);
      expect(compactMetrics.southInnerY).toBe(standardMetrics.southInnerY);
      expect(standardMetrics.southInnerY).toBe(expansiveMetrics.southInnerY);

      // Infill area is strictly larger than maximum pitch by 1 meter in every direction
      expect(compactMetrics.westInnerX).toBeLessThan(P_LEFT);
      expect(compactMetrics.eastInnerX).toBeGreaterThan(P_RIGHT);
      expect(compactMetrics.northInnerY).toBeLessThan(P_TOP);
      expect(compactMetrics.southInnerY).toBeGreaterThan(P_BOTTOM);
    });
  });
});
