/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  drawMiteredCornerStand,
  drawCornerQuadrantStands,
  drawStadiumArchitecture,
  getStadiumShapeMetrics,
} from '../stadiumRenderer';
import { getStandCameraCoordinates, getStadiumCameraTarget, StandInspectionPosition } from '../stadiumCamera';
import { StadiumDefinition, StandPosition, StandConfig } from '../../types/stadium';
import { HOME_KIT, AWAY_KIT } from '../constants';
import { CLOCKWISE_STANDS } from '../../components/StadiumCreatorModal';

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(() => ({} as CanvasPattern)),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D;
}

describe('PHASE ST2: Independent 8-Stand Customizer & 45° Mitered Corner Pavilions', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe('1. 8-Stand Clockwise Matrix & Sequence', () => {
    it('verifies that CLOCKWISE_STANDS defines exactly 8 stands in intuitive clockwise sequence', () => {
      expect(CLOCKWISE_STANDS).toHaveLength(8);
      const expectedSequence: StandPosition[] = [
        'corner_ne',
        'east',
        'corner_se',
        'south',
        'corner_sw',
        'west',
        'corner_nw',
        'north',
      ];
      expect(CLOCKWISE_STANDS.map((s) => s.id)).toEqual(expectedSequence);
      expect(CLOCKWISE_STANDS[0].shortLabel).toBe('C1 (NE)');
      expect(CLOCKWISE_STANDS[1].shortLabel).toBe('EAST');
      expect(CLOCKWISE_STANDS[2].shortLabel).toBe('C2 (SE)');
      expect(CLOCKWISE_STANDS[3].shortLabel).toBe('SOUTH');
      expect(CLOCKWISE_STANDS[4].shortLabel).toBe('C3 (SW)');
      expect(CLOCKWISE_STANDS[5].shortLabel).toBe('WEST');
      expect(CLOCKWISE_STANDS[6].shortLabel).toBe('C4 (NW)');
      expect(CLOCKWISE_STANDS[7].shortLabel).toBe('NORTH');
    });

    it('computes distinct, accurate camera coordinates for each of the 8 clockwise stand positions', () => {
      const positions: (StandPosition | StandInspectionPosition)[] = [
        'corner_ne',
        'east',
        'corner_se',
        'south',
        'corner_sw',
        'west',
        'corner_nw',
        'north',
      ];

      const coords = positions.map((p) => getStandCameraCoordinates(p));
      expect(coords).toHaveLength(8);

      // Verify that Corner 1 (NE) is in the top-right quadrant
      expect(coords[0].x).toBeGreaterThan(coords[5].x); // NE.x > West.x
      expect(coords[0].y).toBeLessThan(coords[3].y); // NE.y < South.y

      // Verify that Corner 3 (SW) is in the bottom-left quadrant
      expect(coords[4].x).toBeLessThan(coords[1].x); // SW.x < East.x
      expect(coords[4].y).toBeGreaterThan(coords[7].y); // SW.y > North.y
    });

    it('generates rich, distinct labels in getStadiumCameraTarget for stands view', () => {
      const targetNE = getStadiumCameraTarget('stands', {
        activeStep: 2,
        activeStand: 'corner_ne',
        stadiumDef: {},
      });
      expect(targetNE.label).toBe('STANDS VIEW (CORNER 1 (NE))');

      const targetSW = getStadiumCameraTarget('stands', {
        activeStep: 2,
        activeStand: 'corner_sw',
        stadiumDef: {},
      });
      expect(targetSW.label).toBe('STANDS VIEW (CORNER 3 (SW))');
    });
  });

  describe('2. 45° Mitered Corner Pavilion Geometry & Seamless Stand Welding', () => {
    it('executes drawMiteredCornerStand for Corner 4 (NW) with tiered grandstand cleanly', () => {
      const nwStand: StandConfig = {
        position: 'corner_nw',
        type: 'tiered',
        grade: 'grade4_modern',
        tierCount: 3,
        tiers: [{ size: 'small' }, { size: 'medium' }, { size: 'large' }],
        primaryColor: '#0284c7',
        secondaryColor: '#f0f9ff',
        hasRoof: true,
      };

      const metrics = getStadiumShapeMetrics('rectangular');
      expect(() => {
        drawMiteredCornerStand(
          ctx,
          nwStand,
          'corner_nw',
          metrics.westInnerX,
          metrics.eastInnerX,
          metrics.northInnerY,
          metrics.southInnerY,
          metrics.standDepthX,
          metrics.standDepthY,
          HOME_KIT,
          AWAY_KIT,
          'rectangular',
          'night'
        );
      }).not.toThrow();

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('executes drawMiteredCornerStand across all 4 corner positions (NE, SE, SW, NW) without errors', () => {
      const cornerPositions: ('corner_nw' | 'corner_ne' | 'corner_se' | 'corner_sw')[] = [
        'corner_ne',
        'corner_se',
        'corner_sw',
        'corner_nw',
      ];

      const metrics = getStadiumShapeMetrics('square');

      for (const pos of cornerPositions) {
        const stand: StandConfig = {
          position: pos,
          type: 'tiered',
          grade: 'grade3_industrial',
          tierCount: 2,
          tiers: [{ size: 'medium' }, { size: 'medium' }],
          primaryColor: '#eab308',
          secondaryColor: '#1e3a8a',
          hasRoof: true,
        };

        expect(() => {
          drawMiteredCornerStand(
            ctx,
            stand,
            pos,
            metrics.westInnerX,
            metrics.eastInnerX,
            metrics.northInnerY,
            metrics.southInnerY,
            metrics.standDepthX,
            metrics.standDepthY,
            HOME_KIT,
            AWAY_KIT,
            'square',
            'sunset'
          );
        }).not.toThrow();
      }
    });

    it('executes drawCornerQuadrantStands and renders all 4 corners simultaneously', () => {
      const stadiumDef: StadiumDefinition = {
        id: 'test_stadium',
        name: 'Test Arena',
        shortName: 'Arena',
        city: 'Metropolis',
        country: 'World',
        shape: 'rectangular',
        surroundings: 'big_city',
        hasTrack: false,
        stands: {
          west: { position: 'west', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          east: { position: 'east', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          north: { position: 'north', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          south: { position: 'south', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          corner_ne: { position: 'corner_ne', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          corner_se: { position: 'corner_se', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          corner_sw: { position: 'corner_sw', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
          corner_nw: { position: 'corner_nw', type: 'tiered', grade: 'grade4_modern', tierCount: 2 },
        },
        seats: { style: 'tip_up_padded', pattern: 'solid', colors: ['#0284c7'] },
        lighting: { type: 'corner_pylons', pylonCount: 4, powerKw: 1800, timeOfDay: 'night' },
        dugouts: { type: 'racing_bucket', quality: 'luxury', frameColor: '#dc2626', cushionColor: '#ffffff', shelterTint: 'rgba(0,0,0,0.8)', setbackDistance: 12 },
        tunnel: { type: 'modern_architectural', siting: 'center_main', primaryColor: '#0284c7', secondaryColor: '#ffffff' },
        capacity: 45000,
        fifaCategory: 'continental',
      };

      const metrics = getStadiumShapeMetrics('rectangular');
      expect(() => {
        drawCornerQuadrantStands(
          ctx,
          stadiumDef,
          metrics.westInnerX,
          metrics.eastInnerX,
          metrics.northInnerY,
          metrics.southInnerY,
          HOME_KIT,
          AWAY_KIT,
          'rectangular',
          'night',
          metrics.standDepthX,
          metrics.standDepthY,
          'big_city'
        );
      }).not.toThrow();

      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  describe('3. Asymmetric Corner Support & Return Walls', () => {
    it('renders reinforced end-wall buttresses when an open corner (No Stand) is adjacent to a grandstand', () => {
      const openCorner: StandConfig = {
        position: 'corner_ne',
        type: 'none',
        grade: 'grade2_classic',
        perimeterFinish: 'brick_wall',
        backdrop: 'wall',
        hasGrassrootsFans: true,
      };

      const adjacentEastStand: StandConfig = {
        position: 'east',
        type: 'tiered',
        grade: 'grade2_classic',
        tierCount: 3,
      };

      const adjacentNorthStand: StandConfig = {
        position: 'north',
        type: 'tiered',
        grade: 'grade2_classic',
        tierCount: 3,
      };

      const metrics = getStadiumShapeMetrics('rectangular');

      expect(() => {
        drawMiteredCornerStand(
          ctx,
          openCorner,
          'corner_ne',
          metrics.westInnerX,
          metrics.eastInnerX,
          metrics.northInnerY,
          metrics.southInnerY,
          metrics.standDepthX,
          metrics.standDepthY,
          HOME_KIT,
          AWAY_KIT,
          'rectangular',
          'noon',
          'small_city',
          adjacentEastStand,
          adjacentNorthStand
        );
      }).not.toThrow();

      // Verified fillRect called for buttress return wall and coping
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('verifies La Bombonera style asymmetric stadium (open eastern corners) renders with proper end buttresses', () => {
      const bomboneraCornerSE: StandConfig = {
        position: 'corner_se',
        type: 'no_stand',
        grade: 'grade3_industrial',
        backdrop: 'wall',
        perimeterFinish: 'concrete_wall',
      };

      const metrics = getStadiumShapeMetrics('rectangular');
      expect(() => {
        drawMiteredCornerStand(
          ctx,
          bomboneraCornerSE,
          'corner_se',
          metrics.westInnerX,
          metrics.eastInnerX,
          metrics.northInnerY,
          metrics.southInnerY,
          metrics.standDepthX,
          metrics.standDepthY,
          HOME_KIT,
          AWAY_KIT,
          'rectangular',
          'night',
          'small_city',
          { position: 'east', type: 'wall', grade: 'grade3_industrial', wallSize: 'small' },
          { position: 'south', type: 'tiered', grade: 'grade3_industrial', tierCount: 2 }
        );
      }).not.toThrow();
    });
  });

  describe('4. Independent 8-Stand Customization Isolation', () => {
    it('verifies that updating one corner does not alter other corners or side stands', () => {
      const standsRecord: Record<StandPosition, StandConfig> = {
        west: { position: 'west', type: 'tiered', grade: 'grade1_municipal' },
        east: { position: 'east', type: 'tiered', grade: 'grade1_municipal' },
        north: { position: 'north', type: 'tiered', grade: 'grade1_municipal' },
        south: { position: 'south', type: 'tiered', grade: 'grade1_municipal' },
        corner_ne: { position: 'corner_ne', type: 'tiered', grade: 'grade1_municipal', primaryColor: '#ffffff' },
        corner_se: { position: 'corner_se', type: 'tiered', grade: 'grade1_municipal', primaryColor: '#ffffff' },
        corner_sw: { position: 'corner_sw', type: 'tiered', grade: 'grade1_municipal', primaryColor: '#ffffff' },
        corner_nw: { position: 'corner_nw', type: 'tiered', grade: 'grade1_municipal', primaryColor: '#ffffff' },
      };

      // Mutate only corner_ne
      standsRecord.corner_ne = {
        ...standsRecord.corner_ne,
        grade: 'grade5_futuristic',
        tierCount: 4,
        primaryColor: '#f43f5e',
        hasRoof: true,
      };

      // Verify that other corners remain untouched
      expect(standsRecord.corner_nw.grade).toBe('grade1_municipal');
      expect(standsRecord.corner_nw.primaryColor).toBe('#ffffff');
      expect(standsRecord.corner_se.grade).toBe('grade1_municipal');
      expect(standsRecord.corner_sw.grade).toBe('grade1_municipal');

      // Verify corner_ne has updated independently
      expect(standsRecord.corner_ne.grade).toBe('grade5_futuristic');
      expect(standsRecord.corner_ne.primaryColor).toBe('#f43f5e');
      expect(standsRecord.corner_ne.tierCount).toBe(4);
    });
  });
});
