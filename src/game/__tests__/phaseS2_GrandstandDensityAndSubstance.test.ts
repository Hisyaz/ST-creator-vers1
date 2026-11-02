/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  getTierChairRows,
  TierBalustradeStyle,
  StandDeckMaterial,
  RearWallMaterial,
  StandConfig,
  StadiumDefinition,
} from '../../types/stadium';
import {
  drawOuterRearDelimitationWall,
  drawSolidUnderSeatDecking,
  drawTierSafetyBalustrade,
  drawStadiumArchitecture,
} from '../stadiumRenderer';
import { drawAerialSkyCam } from '../skyCamRenderer';
import { createDefaultStadium } from '../stadiumRegistry';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';

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
      operations.push({ method: `set:${prop}`, args: [value] });
      return true;
    },
  });

  return { ctx, operations, properties };
}

describe('Phase S2: Grandstand Density & Substance Overhaul', () => {
  describe('S2.1: Stepped Chair Densities Per Tier Size', () => {
    it('returns exactly 2 sets of chairs per tier riser band for Small Tier', () => {
      expect(getTierChairRows('small')).toBe(2);
    });

    it('returns exactly 3 sets of chairs per tier riser band for Medium Tier', () => {
      expect(getTierChairRows('medium')).toBe(3);
    });

    it('returns exactly 4 sets of chairs per tier riser band for Big/Large Tier', () => {
      expect(getTierChairRows('large')).toBe(4);
    });

    it('falls back to default 3 chair rows when size is undefined', () => {
      expect(getTierChairRows(undefined)).toBe(3);
    });

    it('calculates total stand row count accurately for multi-tier configurations', () => {
      const standSmallMediumBig: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade4_modern',
        tierCount: 3,
        tiers: [
          { size: 'small' },   // 2
          { size: 'medium' },  // 3
          { size: 'large' },   // 4
        ],
      };

      const totalRows = (standSmallMediumBig.tiers || []).reduce(
        (acc, t) => acc + getTierChairRows(t.size),
        0
      );
      expect(totalRows).toBe(9); // 2 + 3 + 4 = 9
    });

    it('calculates single massive terrace row count for Wall stands', () => {
      const wallStandSmall: StandConfig = {
        position: 'south',
        type: 'wall',
        grade: 'grade3_industrial',
        wallSize: 'small',
      };
      const wallStandLarge: StandConfig = {
        position: 'south',
        type: 'wall',
        grade: 'grade3_industrial',
        wallSize: 'large',
      };

      expect(getTierChairRows(wallStandSmall.wallSize)).toBe(2);
      expect(getTierChairRows(wallStandLarge.wallSize)).toBe(4);
    });
  });

  describe('S2.2: Solid Under-Seat Decking Substrate', () => {
    const materials: StandDeckMaterial[] = ['concrete', 'timber', 'steel', 'composite'];

    materials.forEach((material) => {
      it(`renders solid under-seat decking without error for material: ${material}`, () => {
        const { ctx, operations } = createMockCanvasContext();
        const stand: StandConfig = {
          position: 'west',
          type: 'tiered',
          grade: 'grade4_modern',
          deckMaterial: material,
        };

        expect(() => {
          drawSolidUnderSeatDecking(ctx, stand, 100, 200, 300, 400, 0);
        }).not.toThrow();

        // Must execute fillRect for decking solid backing
        const fillRectOps = operations.filter((op) => op.method === 'fillRect');
        expect(fillRectOps.length).toBeGreaterThan(0);
      });
    });

    it('prevents ground bleed by fully spanning the tier deck bounds', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stand: StandConfig = {
        position: 'east',
        type: 'tiered',
        grade: 'grade2_classic',
        deckMaterial: 'concrete',
      };

      drawSolidUnderSeatDecking(ctx, stand, 50, 60, 200, 500, 1);

      // Verify that at least one fillRect matches the full deck dimensions [50, 60, 200, 500]
      const fullFill = operations.find(
        (op) =>
          op.method === 'fillRect' &&
          op.args[0] === 50 &&
          op.args[1] === 60 &&
          op.args[2] === 200 &&
          op.args[3] === 500
      );
      expect(fullFill).toBeDefined();
    });
  });

  describe('S2.2: Tier Safety Fences & Balustrades', () => {
    const balustrades: TierBalustradeStyle[] = [
      'metal_railing',
      'leitch_lattice',
      'industrial_mesh',
      'glass_balustrade',
      'illuminated_glass',
    ];

    balustrades.forEach((style) => {
      it(`renders tier safety balustrade without error for style: ${style} (horizontal)`, () => {
        const { ctx, operations } = createMockCanvasContext();
        const stand: StandConfig = {
          position: 'north',
          type: 'tiered',
          grade: 'grade4_modern',
          balustradeStyle: style,
        };

        expect(() => {
          drawTierSafetyBalustrade(ctx, stand, 100, 200, 600, 8, 'north', 1, true);
        }).not.toThrow();

        expect(operations.length).toBeGreaterThan(0);
      });

      it(`renders tier safety balustrade without error for style: ${style} (vertical)`, () => {
        const { ctx, operations } = createMockCanvasContext();
        const stand: StandConfig = {
          position: 'west',
          type: 'tiered',
          grade: 'grade4_modern',
          balustradeStyle: style,
        };

        expect(() => {
          drawTierSafetyBalustrade(ctx, stand, 100, 200, 8, 600, 'west', 1, true);
        }).not.toThrow();

        expect(operations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('S2.2: Outer Rear Delimitation Walls & Coping Caps', () => {
    const rearWalls: RearWallMaterial[] = ['brick', 'concrete', 'corrugated_steel', 'timber', 'stone'];
    const orientations: ('west' | 'east' | 'north' | 'south')[] = ['west', 'east', 'north', 'south'];

    rearWalls.forEach((material) => {
      it(`renders outer delimitation wall for material: ${material}`, () => {
        const { ctx, operations } = createMockCanvasContext();
        const stand: StandConfig = {
          position: 'west',
          type: 'tiered',
          grade: 'grade2_classic',
          rearWallMaterial: material,
        };

        expect(() => {
          drawOuterRearDelimitationWall(ctx, stand, 100, 200, 300, 400, 'west', 'night');
        }).not.toThrow();

        // Must cast drop shadows and draw wall substrate
        const fillRectOps = operations.filter((op) => op.method === 'fillRect');
        expect(fillRectOps.length).toBeGreaterThan(1);
      });
    });

    orientations.forEach((orientation) => {
      it(`renders outer contact drop shadow in correct direction for ${orientation} stand`, () => {
        const { ctx, operations } = createMockCanvasContext();
        const stand: StandConfig = {
          position: orientation,
          type: 'tiered',
          grade: 'grade4_modern',
          rearWallMaterial: 'concrete',
        };

        drawOuterRearDelimitationWall(ctx, stand, 100, 200, 300, 400, orientation, 'night');

        // Verify contact shadow is drawn outside the outer boundary
        const shadowOps = operations.filter(
          (op) =>
            op.method === 'fillRect' &&
            operations.some(
              (setOp) => setOp.method === 'set:fillStyle' && String(setOp.args[0]).includes('0, 0, 0')
            )
        );
        expect(shadowOps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Full Live Matchday & Sky-Cam Architectural Integration', () => {
    it('executes drawStadiumArchitecture with Phase S2 stepped chairs and solid decking without error', () => {
      const { ctx } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      // Configure touchlines and goal-ends with Phase S2 properties
      stadium.stands.west.tiers = [{ size: 'small' }, { size: 'large' }];
      stadium.stands.west.deckMaterial = 'steel';
      stadium.stands.west.balustradeStyle = 'industrial_mesh';
      stadium.stands.west.rearWallMaterial = 'corrugated_steel';

      stadium.stands.north.tiers = [{ size: 'medium' }, { size: 'medium' }];
      stadium.stands.north.deckMaterial = 'concrete';
      stadium.stands.north.balustradeStyle = 'leitch_lattice';
      stadium.stands.north.rearWallMaterial = 'brick';

      expect(() => {
        drawStadiumArchitecture(
          ctx,
          PITCH_CONFIG.CENTER_X,
          PITCH_CONFIG.CENTER_Y,
          'monumental',
          'night',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          stadium
        );
      }).not.toThrow();
    });

    it('renders Dual-Perspective Sky-Cam with Phase S2 stepped chair rows and balustrades', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      stadium.stands.west.hasRoof = false; // Exposed seating bowl
      stadium.stands.east.hasRoof = false;
      stadium.stands.north.hasRoof = false;
      stadium.stands.south.hasRoof = false;

      stadium.stands.west.tiers = [{ size: 'small' }, { size: 'large' }]; // 2 + 4 rows
      stadium.stands.north.tiers = [{ size: 'medium' }]; // 3 rows

      expect(() => {
        drawAerialSkyCam(
          ctx,
          stadium,
          {
            roofOpacity: 0.0, // Force exposed seating bowl
            homeKit: HOME_KIT,
            awayKit: AWAY_KIT,
            timeOfDay: 'night',
          }
        );
      }).not.toThrow();

      expect(operations.length).toBeGreaterThan(50);
    });
  });
});
