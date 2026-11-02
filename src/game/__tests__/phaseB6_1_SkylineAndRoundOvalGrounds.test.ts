import { describe, it, expect, vi } from 'vitest';
import {
  getStadiumShapeMetrics,
  getNorthSpatialHierarchy,
  drawCornerQuadrantStands,
  drawImmediateStadiumGrounds,
  drawPerimeterHorizon,
} from '../stadiumRenderer';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import { CARDINAL_STANDS, CLOCKWISE_STANDS } from '../../components/StadiumCreatorModal';
import { StadiumDefinition } from '../../types/stadium';

// Mock Canvas 2D context helper
function createMockCtx() {
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
    setLineDash: vi.fn(),
    getLineDash: vi.fn().mockReturnValue([]),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
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
  } as unknown as CanvasRenderingContext2D;
}

describe('Hotfix B6.1: Northern Grounds Geometry, Elevated Skyline Aperture & Round/Oval Stand Homogeneity', () => {

  describe('1. Stadium Shape Metrics Geometry (Round & Oval Semicircular Apex Contract)', () => {
    it('accurately resolves Oval stadium semicircular inner apex and outer stand depths', () => {
      const metrics = getStadiumShapeMetrics('oval');

      // Center is (930, 1470)
      const cx = PITCH_CONFIG.CENTER_X; // 930
      const pTop = PITCH_CONFIG.PITCH_TOP; // 220
      const pBottom = PITCH_CONFIG.PITCH_BOTTOM; // 2720
      const expectedRadius = cx - metrics.westInnerX; // 930 - (-120) = 1050

      expect(metrics.shape).toBe('oval');
      expect(metrics.apronRadiusX).toBe(expectedRadius); // 1050
      expect(metrics.apronRadiusY).toBe(expectedRadius); // 1050
      // North semicircle apex is pTop - rIn = 220 - 1050 = -830
      expect(metrics.northInnerY).toBe(pTop - expectedRadius);
      expect(metrics.northInnerY).toBe(-830);
      // South semicircle apex is pBottom + rIn = 2720 + 1050 = 3770
      expect(metrics.southInnerY).toBe(pBottom + expectedRadius);
      expect(metrics.southInnerY).toBe(3770);

      // Radial stand bowl depth
      expect(metrics.standDepthX).toBe(220);
      expect(metrics.standDepthY).toBe(220);
    });

    it('accurately resolves Round stadium circular coliseum inner boundaries and stand depths', () => {
      const metrics = getStadiumShapeMetrics('round');

      const cy = PITCH_CONFIG.CENTER_Y; // 1470
      const baseR = 1660;

      expect(metrics.shape).toBe('round');
      expect(metrics.apronRadiusX).toBe(baseR);
      expect(metrics.northInnerY).toBe(cy - baseR); // 1470 - 1660 = -190
      expect(metrics.southInnerY).toBe(cy + baseR); // 1470 + 1660 = 3130
      expect(metrics.standDepthX).toBe(220);
      expect(metrics.standDepthY).toBe(220);
    });
  });

  describe('2. Elevated Skyline Aperture & Northern Grounds Spatial Hierarchy', () => {
    it('enforces strict vertical ascending order across all 4 stadium shapes', () => {
      const shapes = ['rectangular', 'square', 'round', 'oval'] as const;

      for (const shape of shapes) {
        const hierarchy = getNorthSpatialHierarchy(shape, 120, false, 'standard', shape === 'round' || shape === 'oval');

        // Canvas coordinate convention (Y increases downwards):
        // bgTop < horizonBaseY < northConcourseTop < northOuterY < northInnerY < pitchTop
        expect(hierarchy.bgTop).toBeLessThan(hierarchy.horizonBaseY);
        expect(hierarchy.horizonBaseY).toBeLessThan(hierarchy.northConcourseTop);
        expect(hierarchy.northConcourseTop).toBeLessThan(hierarchy.northOuterY);
        expect(hierarchy.northOuterY).toBeLessThan(hierarchy.northInnerY);
        expect(hierarchy.northInnerY).toBeLessThan(hierarchy.pitchTop);

        // Northern grounds must start immediately after the northern stand ends
        const groundsShelfDepth = hierarchy.northOuterY - hierarchy.northConcourseTop;
        expect(groundsShelfDepth).toBeGreaterThanOrEqual(150);

        // Skyline must start strictly ABOVE the northern grounds (with elevation buffer >= 320px)
        const skylineClearanceAboveGrounds = hierarchy.northConcourseTop - hierarchy.horizonBaseY;
        expect(skylineClearanceAboveGrounds).toBeGreaterThanOrEqual(320);
      }
    });

    it('guarantees Oval stadium skyline starts strictly above northern grounds with zero bowl overlap', () => {
      // Test without track (pure oval bowl)
      const hierarchy = getNorthSpatialHierarchy('oval', 120, false, 'standard', false);

      // Stand outer boundary is at -1050
      expect(hierarchy.northOuterY).toBe(-1050);
      // Concourse grounds shelf ends at -1200
      expect(hierarchy.northConcourseTop).toBe(-1200);
      // Skyline starts at -1520 (320px above northern grounds, 470px above north stand)
      expect(hierarchy.horizonBaseY).toBe(-1520);
      expect(hierarchy.horizonBaseY).toBeLessThan(hierarchy.northConcourseTop);
      expect(hierarchy.northConcourseTop).toBeLessThan(hierarchy.northOuterY);

      // Test with track
      const hierarchyTrack = getNorthSpatialHierarchy('oval', 120, false, 'standard', true);
      expect(hierarchyTrack.horizonBaseY).toBeLessThan(hierarchyTrack.northConcourseTop);
      expect(hierarchyTrack.northConcourseTop).toBeLessThan(hierarchyTrack.northOuterY);
    });

    it('guarantees Round stadium skyline starts strictly above northern grounds with zero bowl overlap', () => {
      // Test without track
      const hierarchy = getNorthSpatialHierarchy('round', 120, false, 'standard', false);

      // Stand outer boundary is at -410
      expect(hierarchy.northOuterY).toBe(-410);
      // Concourse grounds shelf ends at -560
      expect(hierarchy.northConcourseTop).toBe(-560);
      // Skyline starts at -880 (320px above northern grounds, 470px above north stand)
      expect(hierarchy.horizonBaseY).toBe(-880);
      expect(hierarchy.horizonBaseY).toBeLessThan(hierarchy.northConcourseTop);
      expect(hierarchy.northConcourseTop).toBeLessThan(hierarchy.northOuterY);

      // Test with track
      const hierarchyTrack = getNorthSpatialHierarchy('round', 120, false, 'standard', true);
      expect(hierarchyTrack.horizonBaseY).toBeLessThan(hierarchyTrack.northConcourseTop);
      expect(hierarchyTrack.northConcourseTop).toBeLessThan(hierarchyTrack.northOuterY);
    });
  });

  describe('3. Corner Stand Exclusion for Round & Oval Coliseum Bowls', () => {
    it('provides CARDINAL_STANDS with exactly 4 sectors and zero corner stands', () => {
      expect(CARDINAL_STANDS).toHaveLength(4);
      expect(CARDINAL_STANDS.map((s) => s.id)).toEqual(['west', 'north', 'east', 'south']);

      // Ensure no corner stands exist in CARDINAL_STANDS
      const cornerCount = CARDINAL_STANDS.filter((s) => s.id.startsWith('corner_')).length;
      expect(cornerCount).toBe(0);

      // Ensure CLOCKWISE_STANDS still contains 8 stands for rectangular/square stadiums
      expect(CLOCKWISE_STANDS).toHaveLength(8);
      expect(CLOCKWISE_STANDS.filter((s) => s.id.startsWith('corner_'))).toHaveLength(4);
    });

    it('drawCornerQuadrantStands returns immediately without drawing for round or oval shape', () => {
      const ctx = createMockCtx();
      const stadiumDef = {
        id: 'test_oval',
        name: 'Test Oval Ground',
        shape: 'oval',
        tier: 'monumental',
        capacity: 70000,
        fifaCategory: 'cat4',
        stands: {
          west: { position: 'west', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          east: { position: 'east', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          north: { position: 'north', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          south: { position: 'south', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
        },
      } as unknown as StadiumDefinition;

      // Call drawCornerQuadrantStands with oval shape
      drawCornerQuadrantStands(
        ctx,
        stadiumDef,
        -120,
        1980,
        -830,
        3770,
        HOME_KIT,
        AWAY_KIT,
        'oval'
      );

      // Should return early and not perform any miter corner stand canvas operations
      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('drawCornerQuadrantStands returns immediately without drawing for round shape', () => {
      const ctx = createMockCtx();
      const stadiumDef = {
        id: 'test_round',
        name: 'Test Coliseum',
        shape: 'round',
        tier: 'monumental',
        capacity: 80000,
        fifaCategory: 'cat4',
        stands: {
          west: { position: 'west', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          east: { position: 'east', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          north: { position: 'north', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          south: { position: 'south', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
        },
      } as unknown as StadiumDefinition;

      drawCornerQuadrantStands(
        ctx,
        stadiumDef,
        -730,
        2590,
        -190,
        3130,
        HOME_KIT,
        AWAY_KIT,
        'round'
      );

      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe('4. Master Stadium Render Pipeline Integration', () => {
    it('executes drawImmediateStadiumGrounds and drawPerimeterHorizon without error for oval stadium', () => {
      const ctx = createMockCtx();
      const stadiumDef = {
        id: 'monumental_oval',
        name: 'Stadio Olimpico',
        shape: 'oval',
        tier: 'monumental',
        capacity: 72000,
        fifaCategory: 'cat4',
        surroundings: 'mountains',
        grounds: 'park_recreation',
        stands: {
          west: { position: 'west', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          east: { position: 'east', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          north: { position: 'north', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          south: { position: 'south', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
        },
      } as unknown as StadiumDefinition;

      expect(() => {
        drawImmediateStadiumGrounds(ctx, 930, 1470, stadiumDef, 'monumental', 'sunset');
      }).not.toThrow();

      expect(() => {
        drawPerimeterHorizon(ctx, 930, 1470, 'monumental', 'sunset', undefined, 'mountains', 'park_recreation', stadiumDef);
      }).not.toThrow();
    });

    it('executes drawImmediateStadiumGrounds and drawPerimeterHorizon without error for round stadium', () => {
      const ctx = createMockCtx();
      const stadiumDef = {
        id: 'monumental_round',
        name: 'Circular Coliseum',
        shape: 'round',
        tier: 'monumental',
        capacity: 85000,
        fifaCategory: 'cat4',
        surroundings: 'big_city',
        grounds: 'modern_architectural',
        stands: {
          west: { position: 'west', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          east: { position: 'east', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          north: { position: 'north', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          south: { position: 'south', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
        },
      } as unknown as StadiumDefinition;

      expect(() => {
        drawImmediateStadiumGrounds(ctx, 930, 1470, stadiumDef, 'monumental', 'night');
      }).not.toThrow();

      expect(() => {
        drawPerimeterHorizon(ctx, 930, 1470, 'monumental', 'night', undefined, 'big_city', 'modern_architectural', stadiumDef);
      }).not.toThrow();
    });
  });

});
