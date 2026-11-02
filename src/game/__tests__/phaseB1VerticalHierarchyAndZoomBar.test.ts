import { describe, it, expect, vi } from 'vitest';
import {
  getNorthSpatialHierarchy,
  drawHorizonSkirt,
  drawPerimeterHorizon,
} from '../stadiumRenderer';
import {
  ZOOM_SNAP_PRESETS,
  resolveHorizonSkirt,
  HorizonSkirtType,
  StadiumDefinition,
} from '../../types/stadium';
import { PITCH_CONFIG } from '../constants';

// Helper to construct a mock 2D canvas context
function createMockCanvasCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  } as unknown as CanvasRenderingContext2D;
}

describe('Phase B1: Vertical Spatial Hierarchy, Northern Horizon Aperture & Dedicated Zoom Bar Engine', () => {

  describe('B1.1 & B1.2: North Spatial Hierarchy & Northern Aperture Expansion', () => {
    it('calculates strictly ascending Y-coordinates from sky down to pitch', () => {
      const shapes = ['rectangular', 'round', 'oval', 'square'] as const;

      for (const shape of shapes) {
        const hierarchy = getNorthSpatialHierarchy(shape, 80, false, 'standard', shape === 'round' || shape === 'oval');

        // Y in canvas increases downwards:
        // bgTop < horizonBaseY < northConcourseTop < northOuterY < northInnerY < pitchTop
        expect(hierarchy.bgTop).toBeLessThan(hierarchy.horizonBaseY);
        expect(hierarchy.horizonBaseY).toBeLessThan(hierarchy.northConcourseTop);
        expect(hierarchy.northConcourseTop).toBeLessThan(hierarchy.northOuterY);
        expect(hierarchy.northOuterY).toBeLessThan(hierarchy.northInnerY);
        expect(hierarchy.northInnerY).toBeLessThan(hierarchy.pitchTop);
      }
    });

    it('enforces positive spatial clearances between all northern vertical tiers', () => {
      const hierarchy = getNorthSpatialHierarchy('rectangular', 75, false, 'standard', false);

      // Pitch to inner apron edge
      const apronClearance = hierarchy.pitchTop - hierarchy.northInnerY;
      expect(apronClearance).toBeGreaterThanOrEqual(40);

      // Inner apron to outer stand edge (grandstand depth)
      const standClearance = hierarchy.northInnerY - hierarchy.northOuterY;
      expect(standClearance).toBeGreaterThanOrEqual(75);

      // Outer stand to concourse edge: compact receding perspective shelf (150px)
      const concourseDepth = hierarchy.northOuterY - hierarchy.northConcourseTop;
      expect(concourseDepth).toBe(150);

      // Concourse to horizon skirt base: elevated buffer transition (320px)
      // Skyline base starts prominently above the northern stand grounds
      const skirtDepth = hierarchy.northConcourseTop - hierarchy.horizonBaseY;
      expect(skirtDepth).toBe(320);

      // Northern sky headroom expansion: +2000px virtual aperture
      const skyHeadroom = hierarchy.horizonBaseY - hierarchy.bgTop;
      expect(skyHeadroom).toBe(2000);
    });

    it('maintains strict hierarchy when North stand has no structure (no_stand / none)', () => {
      const hierarchyNoStand = getNorthSpatialHierarchy('rectangular', 0, true, 'standard', false);

      expect(hierarchyNoStand.bgTop).toBeLessThan(hierarchyNoStand.horizonBaseY);
      expect(hierarchyNoStand.horizonBaseY).toBeLessThan(hierarchyNoStand.northConcourseTop);
      expect(hierarchyNoStand.northConcourseTop).toBeLessThan(hierarchyNoStand.northOuterY);
      expect(hierarchyNoStand.northOuterY).toBeLessThanOrEqual(hierarchyNoStand.northInnerY);
      expect(hierarchyNoStand.northInnerY).toBeLessThan(hierarchyNoStand.pitchTop);
    });

    it('adjusts apron boundary when athletic running track is present', () => {
      const withoutTrack = getNorthSpatialHierarchy('round', 80, false, 'standard', false);
      const withTrack = getNorthSpatialHierarchy('round', 80, false, 'standard', true);

      // Running track pushes the apron edge further out from pitch
      expect(withTrack.northInnerY).toBeLessThan(withoutTrack.northInnerY);
    });

    it('preserves IFAB standard pitch coordinate invariance (105m x 68m center origin)', () => {
      const hierarchy = getNorthSpatialHierarchy('rectangular', 80, false, 'standard', false);

      // Center and pitch boundary must remain exactly aligned with PITCH_CONFIG
      expect(hierarchy.pitchTop).toBe(PITCH_CONFIG.PITCH_TOP);
      expect(hierarchy.centerX).toBe(PITCH_CONFIG.CENTER_X);
    });
  });

  describe('B1.1: 5 Surrounding-Specific Horizon Skirts', () => {
    it('correctly maps all surroundings types to appropriate horizon skirt styles', () => {
      expect(resolveHorizonSkirt('beach')).toBe('coastal_marine');
      expect(resolveHorizonSkirt('marine_floating')).toBe('coastal_marine');
      expect(resolveHorizonSkirt('railroad')).toBe('industrial_harbor');
      expect(resolveHorizonSkirt('airport')).toBe('industrial_harbor');
      expect(resolveHorizonSkirt('parking_lot')).toBe('industrial_harbor');
      expect(resolveHorizonSkirt('big_city')).toBe('metropolis');
      expect(resolveHorizonSkirt('highway')).toBe('metropolis');
      expect(resolveHorizonSkirt('small_city')).toBe('heritage_uk');
      expect(resolveHorizonSkirt('mountains')).toBe('mountain_valley');
      expect(resolveHorizonSkirt('forest')).toBe('mountain_valley');
      expect(resolveHorizonSkirt('savannah')).toBe('mountain_valley');
      expect(resolveHorizonSkirt('nature')).toBe('mountain_valley');
    });

    it('renders each of the 5 horizon skirts without error on HTML5 canvas', () => {
      const skirts: HorizonSkirtType[] = [
        'mountain_valley',
        'coastal_marine',
        'metropolis',
        'heritage_uk',
        'industrial_harbor',
      ];

      for (const skirt of skirts) {
        const ctx = createMockCanvasCtx();
        expect(() => {
          drawHorizonSkirt(
            ctx,
            skirt,
            PITCH_CONFIG.CENTER_X,
            PITCH_CONFIG.CENTER_Y - 330,
            PITCH_CONFIG.CENTER_Y - 450,
            2400,
            'noon'
          );
        }).not.toThrow();

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
        expect(ctx.fillRect).toHaveBeenCalled();
      }
    });

    it('renders horizon skirts under night time-of-day with atmospheric color adjustments', () => {
      const ctx = createMockCanvasCtx();
      drawHorizonSkirt(
        ctx,
        'metropolis',
        PITCH_CONFIG.CENTER_X,
        PITCH_CONFIG.CENTER_Y - 450,
        PITCH_CONFIG.CENTER_Y - 330,
        2400,
        'night'
      );

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe('B1.3: Dedicated Vertical Zoom Bar Presets & Range Engine', () => {
    it('defines exactly 4 standard zoom snap presets with exact target scales', () => {
      expect(ZOOM_SNAP_PRESETS).toHaveLength(4);

      const [pitch, concourse, arena, wholeWorld] = ZOOM_SNAP_PRESETS;

      expect(pitch.id).toBe('pitch');
      expect(pitch.zoom).toBe(1.0);
      expect(pitch.label).toContain('100%');

      expect(concourse.id).toBe('concourse');
      expect(concourse.zoom).toBe(0.50);
      expect(concourse.label).toContain('50%');

      expect(arena.id).toBe('arena');
      expect(arena.zoom).toBe(0.15);
      expect(arena.label).toContain('15%');

      expect(wholeWorld.id).toBe('whole_world');
      expect(wholeWorld.zoom).toBe(0.05);
      expect(wholeWorld.label).toContain('5%');
    });

    it('supports continuous macroscopic zoom down to 0.05 (5%) scale', () => {
      const minPreset = ZOOM_SNAP_PRESETS.reduce((min, p) => (p.zoom < min ? p.zoom : min), 1.0);
      expect(minPreset).toBe(0.05);
    });
  });

  describe('drawPerimeterHorizon with Expanded Northern Aperture Headroom', () => {
    it('executes perimeter horizon rendering with expanded headroom seamlessly', () => {
      const ctx = createMockCanvasCtx();
      const mockStadium: Partial<StadiumDefinition> = {
        name: 'Grand Vista Arena',
        shape: 'rectangular',
        surroundings: 'mountains',
        grounds: 'park_recreation',
        capacity: 45000,
        lighting: {
          type: 'corner_pylons',
          powerKw: 2500,
          pylonCount: 4,
          timeOfDay: 'sunset',
        },
        stands: {
          north: { position: 'north', type: 'tiered', hasRoof: true, tierCount: 2, grade: 'grade2_classic' },
          south: { position: 'south', type: 'tiered', hasRoof: true, tierCount: 2, grade: 'grade2_classic' },
          east: { position: 'east', type: 'tiered', hasRoof: true, tierCount: 2, grade: 'grade2_classic' },
          west: { position: 'west', type: 'tiered', hasRoof: true, tierCount: 2, grade: 'grade2_classic' },
          corner_nw: { position: 'corner_nw', type: 'none', hasRoof: false, grade: 'grade1_municipal' },
          corner_ne: { position: 'corner_ne', type: 'none', hasRoof: false, grade: 'grade1_municipal' },
          corner_se: { position: 'corner_se', type: 'none', hasRoof: false, grade: 'grade1_municipal' },
          corner_sw: { position: 'corner_sw', type: 'none', hasRoof: false, grade: 'grade1_municipal' },
        },
      };

      expect(() => {
        drawPerimeterHorizon(
          ctx,
          PITCH_CONFIG.CENTER_X,
          PITCH_CONFIG.CENTER_Y,
          'craven',
          'sunset',
          undefined,
          'mountains',
          'park_recreation',
          mockStadium as StadiumDefinition
        );
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });
});
