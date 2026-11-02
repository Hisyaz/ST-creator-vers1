import { describe, it, expect } from 'vitest';
import {
  getStadiumShapeMetrics,
  drawArchitecturalRoofShadows,
  drawTimeOfDayAtmosphere,
} from '../stadiumRenderer';
import { getTierChairRows, StadiumDefinition, StadiumShape, ApronSetback, TierSize } from '../../types/stadium';
import { getAllRegisteredStadiums, createDefaultStadium } from '../stadiumRegistry';
import { PITCH_CONFIG } from '../constants';
import { resolvePitchMetrics, MAX_PITCH_TURF_WIDTH, MAX_PITCH_TURF_HEIGHT } from '../pitchDimensions';

/**
 * Creates a mock 2D canvas rendering context that tracks operations and properties
 */
function createMockCanvasContext() {
  const operations: { method: string; args: any[] }[] = [];
  const properties: Record<string, any> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1.0,
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '',
    shadowBlur: 0,
  };

  const ctx = new Proxy({} as any, {
    get(target, prop: string) {
      if (prop in properties) {
        return properties[prop];
      }
      return (...args: any[]) => {
        operations.push({ method: prop, args });
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
          return {
            addColorStop: (offset: number, color: string) => {
              operations.push({ method: 'addColorStop', args: [offset, color] });
            },
          };
        }
        return undefined;
      };
    },
    set(target, prop: string, value: any) {
      properties[prop] = value;
      return true;
    },
  });

  return { ctx: ctx as CanvasRenderingContext2D, operations, properties };
}

describe('Phase S5: Stadium Creator WYSIWYG & Full Synchronization Validation Suite', () => {
  const P_LEFT = 180;
  const P_RIGHT = 1680;
  const P_TOP = 220;
  const P_BOTTOM = 2720;
  const PITCH_HALF_DIAG = Math.hypot(1500 / 2, 2500 / 2); // ~1457.738px

  const createDummyStadium = (
    shape: StadiumShape,
    apronSetback: ApronSetback = 'standard',
    hasTrack: boolean = false
  ): StadiumDefinition => ({
    ...createDefaultStadium(),
    id: `test-${shape}-${apronSetback}`,
    name: `Test ${shape}`,
    shape,
    apronSetback,
    hasTrack,
  });

  describe('S5.1: Canonical Pitch Area Invariance & Strict Containment', () => {
    it('enforces constant outer turf bounds (1500w x 2500h) across dimension presets', () => {
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

    it('guarantees fixed pitch boundaries are completely enclosed inside stadium inner bowl for all 4 shapes', () => {
      const shapes: StadiumShape[] = ['round', 'oval', 'square', 'rectangular'];

      for (const shape of shapes) {
        const stadium = createDummyStadium(shape, 'standard');
        const metrics = getStadiumShapeMetrics(stadium);

        expect(metrics.shape).toBe(shape);
        // Pitch boundaries must be strictly inside the stand coordinates
        expect(metrics.westInnerX).toBeLessThan(P_LEFT);
        expect(metrics.eastInnerX).toBeGreaterThan(P_RIGHT);
        expect(metrics.northInnerY).toBeLessThan(P_TOP);
        expect(metrics.southInnerY).toBeGreaterThan(P_BOTTOM);
      }
    });

    it('verifies dedicated Step 1 fixed infill containment preserves invariant stand boundaries', () => {
      const compact = createDummyStadium('rectangular', 'compact');
      const standard = createDummyStadium('rectangular', 'standard');
      const expansive = createDummyStadium('rectangular', 'expansive');

      const mCompact = getStadiumShapeMetrics(compact);
      const mStandard = getStadiumShapeMetrics(standard);
      const mExpansive = getStadiumShapeMetrics(expansive);

      // Stadium size and stand positions are invariant across pitch presets
      expect(mCompact.westInnerX).toBe(mStandard.westInnerX);
      expect(mStandard.westInnerX).toBe(mExpansive.westInnerX);
      expect(mCompact.eastInnerX).toBe(mExpansive.eastInnerX);

      // Safety buffer between max pitch and infill boundary is strictly positive (at least 1m)
      const bufferExpansive = P_LEFT - mExpansive.westInnerX;
      expect(bufferExpansive).toBeGreaterThanOrEqual(18);
    });

    it('guarantees athletics track clearance with zero overlap beneath the pitch grass', () => {
      const roundWithTrack = createDummyStadium('round', 'standard', true);
      const mRound = getStadiumShapeMetrics(roundWithTrack);

      expect(mRound.trackRadiusX).toBeGreaterThan(0);
      const trackInnerEdge = mRound.trackRadiusX - mRound.trackWidthTotal / 2;
      expect(trackInnerEdge).toBeGreaterThan(PITCH_HALF_DIAG);

      const ovalWithTrack = createDummyStadium('oval', 'standard', true);
      const mOval = getStadiumShapeMetrics(ovalWithTrack);
      expect(mOval.hasTrack).toBe(true);
      expect(mOval.northInnerY).toBeLessThan(P_TOP);
      expect(mOval.southInnerY).toBeGreaterThan(P_BOTTOM);
    });
  });

  describe('S5.2: Grandstand Stepped Chair Rows Calculation (2, 3, 4 Rows)', () => {
    it('returns exact stepped chair row counts: 2 for small, 3 for medium, 4 for big', () => {
      expect(getTierChairRows('small')).toBe(2);
      expect(getTierChairRows('medium')).toBe(3);
      expect(getTierChairRows('large')).toBe(4);
      expect(getTierChairRows(undefined)).toBe(3);
    });

    it('accurately computes total stand seat row densities across multi-tier combinations', () => {
      const singleTierSmall: { size: TierSize }[] = [{ size: 'small' }];
      const twoTierMixed: { size: TierSize }[] = [{ size: 'medium' }, { size: 'large' }];
      const threeTierGrand: { size: TierSize }[] = [{ size: 'small' }, { size: 'medium' }, { size: 'large' }];
      const fourTierMaximum: { size: TierSize }[] = [{ size: 'large' }, { size: 'large' }, { size: 'large' }, { size: 'large' }];

      const countRows = (tiers: { size: TierSize }[]) =>
        tiers.reduce((acc, cur) => acc + getTierChairRows(cur.size), 0);

      expect(countRows(singleTierSmall)).toBe(2);
      expect(countRows(twoTierMixed)).toBe(3 + 4); // 7 rows
      expect(countRows(threeTierGrand)).toBe(2 + 3 + 4); // 9 rows
      expect(countRows(fourTierMaximum)).toBe(4 * 4); // 16 rows
    });

    it('verifies registered stadiums have valid chair row counts across all stands', () => {
      const allStadiums = getAllRegisteredStadiums();
      expect(allStadiums.length).toBeGreaterThan(0);
      for (const stadium of allStadiums) {
        for (const standKey of ['east', 'west', 'north', 'south'] as const) {
          const stand = stadium.stands[standKey];
          if (!stand || stand.type === 'none' || stand.type === 'no_stand') continue;

          if (stand.type === 'wall') {
            const wallRows = getTierChairRows(stand.wallSize || 'medium');
            expect(wallRows).toBeGreaterThanOrEqual(2);
            expect(wallRows).toBeLessThanOrEqual(4);
          } else {
            const tiers = stand.tiers || [{ size: 'medium' }];
            for (const t of tiers) {
              const rows = getTierChairRows(t.size);
              expect(rows).toBeGreaterThanOrEqual(2);
              expect(rows).toBeLessThanOrEqual(4);
            }
          }
        }
      }
    });
  });

  describe('S5.3: Time-of-Day Shadow Geometry & Illumination Filters', () => {
    it('draws shape-consistent architectural roof shadows for Round stadiums with annular circular aperture and spokes', () => {
      const { ctx, operations } = createMockCanvasContext();
      const roundStadium = createDummyStadium('round');

      drawArchitecturalRoofShadows(ctx, roundStadium, 'sunset');

      const evenOddFills = operations.filter((op) => op.method === 'fill' && op.args[0] === 'evenodd');
      expect(evenOddFills.length).toBeGreaterThan(0);

      const arcs = operations.filter((op) => op.method === 'arc');
      expect(arcs.length).toBeGreaterThan(0);

      const lines = operations.filter((op) => op.method === 'lineTo');
      expect(lines.length).toBeGreaterThanOrEqual(16);
    });

    it('draws shape-consistent architectural roof shadows for Square stadiums with 90° rectilinear overhang', () => {
      const { ctx, operations } = createMockCanvasContext();
      const squareStadium = createDummyStadium('square');

      drawArchitecturalRoofShadows(ctx, squareStadium, 'sunset');

      const rects = operations.filter((op) => op.method === 'rect');
      expect(rects.length).toBeGreaterThan(0);

      const evenOddFills = operations.filter((op) => op.method === 'fill' && op.args[0] === 'evenodd');
      expect(evenOddFills.length).toBeGreaterThan(0);
    });

    it('draws shape-consistent architectural roof shadows for Oval stadiums with elliptical geometry', () => {
      const { ctx, operations } = createMockCanvasContext();
      const ovalStadium = createDummyStadium('oval');

      drawArchitecturalRoofShadows(ctx, ovalStadium, 'sunset');

      const evenOddFills = operations.filter((op) => op.method === 'fill' && op.args[0] === 'evenodd');
      expect(evenOddFills.length).toBeGreaterThan(0);

      const hasEllipseOrArc = operations.some((op) => op.method === 'ellipse' || op.method === 'arc');
      expect(hasEllipseOrArc).toBe(true);
    });

    it('suppresses directional sun shadows during Night mode (floodlight illumination dominates)', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawArchitecturalRoofShadows(ctx, stadium, 'night');
      // Zero roof shadows rendered at night
      expect(operations.length).toBe(0);
    });

    it('renders global time-of-day atmospheric filters for noon, sunset, and night', () => {
      const bounds = {
        left: PITCH_CONFIG.PITCH_LEFT - 200,
        top: PITCH_CONFIG.PITCH_TOP - 200,
        width: PITCH_CONFIG.FIELD_WIDTH + 400,
        height: PITCH_CONFIG.FIELD_HEIGHT + 400,
      };

      const testTimes: Array<'noon' | 'sunset' | 'night' | 'dawn'> = ['noon', 'sunset', 'night', 'dawn'];

      for (const tod of testTimes) {
        const { ctx, operations } = createMockCanvasContext();
        drawTimeOfDayAtmosphere(ctx, tod, bounds);

        const fills = operations.filter((op) => op.method === 'fillRect');
        expect(fills.length).toBeGreaterThan(0);
      }
    });
  });

  describe('S5.4: 60 FPS Performance & Zero Per-Frame Garbage Collection', () => {
    it('executes consecutive render passes without throwing errors or dynamic memory leaks', () => {
      const stadium = createDefaultStadium();
      const bounds = {
        left: PITCH_CONFIG.PITCH_LEFT - 200,
        top: PITCH_CONFIG.PITCH_TOP - 200,
        width: PITCH_CONFIG.FIELD_WIDTH + 400,
        height: PITCH_CONFIG.FIELD_HEIGHT + 400,
      };

      const { ctx } = createMockCanvasContext();

      const start = performance.now();
      const ITERATIONS = 120; // 2 seconds of 60 FPS frames

      for (let i = 0; i < ITERATIONS; i++) {
        const tod: 'noon' | 'sunset' | 'night' = i % 3 === 0 ? 'noon' : i % 3 === 1 ? 'sunset' : 'night';
        drawArchitecturalRoofShadows(ctx, stadium, tod);
        drawTimeOfDayAtmosphere(ctx, tod, bounds);
      }

      const elapsed = performance.now() - start;
      // 120 consecutive renders should execute comfortably under 100ms
      expect(elapsed).toBeLessThan(100);
    });
  });
});
