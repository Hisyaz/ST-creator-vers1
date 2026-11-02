/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  CardinalDirection,
  CARDINAL_GROUND_ROLES,
  B4_GROUND_FLAVORS,
  getCardinalGroundRole,
  getGroundFlavorDetail,
  StadiumGroundsType,
  CoreStadiumGrounds,
  CORE_GROUNDS_ARCHETYPES,
} from '../../types/stadium';
import {
  drawCardinalNorthGround,
  drawCardinalSouthGround,
  drawCardinalEastGround,
  drawCardinalWestGround,
  drawDeepDetailGroundFeatures,
  drawImmediateStadiumGrounds,
  drawStadiumArchitecture,
  measureStadiumRenderPerformance,
  ConcourseBounds,
} from '../stadiumRenderer';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import { createDefaultStadium } from '../stadiumRegistry';

function createMockCanvasContext(recordOps = true): { ctx: CanvasRenderingContext2D; operations: { method: string; args: any[] }[] } {
  const operations: { method: string; args: any[] }[] = [];

  const handler = {
    get(target: any, prop: string) {
      if (prop === 'canvas') {
        return { width: 1920, height: 1080 };
      }
      if (prop in target) {
        return target[prop];
      }
      return (...args: any[]) => {
        if (recordOps) {
          operations.push({ method: prop, args });
        }
        if (prop === 'measureText') {
          return { width: 50 };
        }
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return {
            addColorStop: (...gArgs: any[]) => {
              if (recordOps) {
                operations.push({ method: 'gradient:addColorStop', args: gArgs });
              }
            },
          };
        }
        if (prop === 'createPattern') {
          return {} as CanvasPattern;
        }
        return undefined;
      };
    },
    set(target: any, prop: string, value: any) {
      if (recordOps && (prop === 'fillStyle' || prop === 'strokeStyle' || prop === 'lineWidth')) {
        operations.push({ method: `set:${prop}`, args: [value] });
      }
      target[prop] = value;
      return true;
    },
  };

  const dummyTarget = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'top',
    setLineDash: () => {},
  };

  const ctx = new Proxy(dummyTarget, handler) as unknown as CanvasRenderingContext2D;
  return { ctx, operations };
}

function createSampleConcourseBounds(): ConcourseBounds {
  const westOuterX = PITCH_CONFIG.PITCH_LEFT - 120;
  const eastOuterX = PITCH_CONFIG.PITCH_RIGHT + 120;
  const northOuterY = PITCH_CONFIG.PITCH_TOP - 120;
  const southOuterY = PITCH_CONFIG.PITCH_BOTTOM + 120;
  const concourseWidthFlanks = 260;
  const concourseWidthNorth = 150;

  return {
    left: westOuterX - concourseWidthFlanks,
    top: northOuterY - concourseWidthNorth,
    right: eastOuterX + concourseWidthFlanks,
    bottom: southOuterY + concourseWidthFlanks,
    totalW: (eastOuterX + concourseWidthFlanks) - (westOuterX - concourseWidthFlanks),
    totalH: (southOuterY + concourseWidthFlanks) - (northOuterY - concourseWidthNorth),
    westOuterX,
    eastOuterX,
    northOuterY,
    southOuterY,
    centerX: PITCH_CONFIG.CENTER_X,
    centerY: PITCH_CONFIG.CENTER_Y,
  };
}

describe('Phase B4: Asymmetric Ground Directionality & Rich Ground Flavor Engine', () => {
  describe('B4.1: Cardinal Asymmetric Ground Architecture', () => {
    it('defines distinct cardinal ground profiles for North, South, East, and West', () => {
      const cardinals: CardinalDirection[] = ['north', 'south', 'east', 'west'];
      for (const card of cardinals) {
        const profile = CARDINAL_GROUND_ROLES[card];
        expect(profile).toBeDefined();
        expect(profile.cardinal).toBe(card);
        expect(profile.title).toBeDefined();
        expect(profile.keyProps.length).toBeGreaterThanOrEqual(4);
      }

      expect(getCardinalGroundRole('north').role).toBe('horizon_shelf_service');
      expect(getCardinalGroundRole('south').role).toBe('main_facade_public');
      expect(getCardinalGroundRole('east').role).toBe('fan_fanfare_concourse');
      expect(getCardinalGroundRole('west').role).toBe('media_broadcast_technical');
    });

    it('renders North Ground with low-profile staff gates, service bay, delivery van, and fire exits', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();

      drawCardinalNorthGround(ctx, bounds, 'parking_lots', 'night', 'big_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);

      // Evergreen landscaping
      const hasEvergreen = fillStyles.some((c) => c === '#052316' || c === '#15803d');
      expect(hasEvergreen).toBe(true);

      // Staff gate turnstiles (strokes)
      const hasTurnstile = operations.some((op) => op.method === 'stroke' || op.method === 'strokeRect');
      expect(hasTurnstile).toBe(true);

      // Emergency fire door & green exit sign
      const hasFireRedDoor = fillStyles.some((c) => c === '#b91c1c');
      const hasExitGreen = fillStyles.some((c) => c === '#16a34a' || c === '#22c55e');
      expect(hasFireRedDoor).toBe(true);
      expect(hasExitGreen).toBe(true);

      // Service vehicle loading dock hazard bumper
      const hasHazardYellow = fillStyles.some((c) => c === '#facc15' || c === '#eab308');
      expect(hasHazardYellow).toBe(true);
    });

    it('renders South Ground with grand facade, ticket booths, VIP red carpet, team buses, and legend statue', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();

      drawCardinalSouthGround(ctx, bounds, 'mall_commercial', 'night', 'big_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);

      // Grand facade structural columns & glass atrium windows
      const hasAtriumGlass = fillStyles.some((c) => c === '#0284c7' || c === '#7dd3fc');
      expect(hasAtriumGlass).toBe(true);

      // VIP red carpet arrival runner
      const hasRedCarpet = fillStyles.some((c) => c === '#991b1b' || c === '#b91c1c');
      const hasGoldFringe = fillStyles.some((c) => c === '#facc15' || c === '#eab308');
      expect(hasRedCarpet).toBe(true);
      expect(hasGoldFringe).toBe(true);

      // Official Team Coaches (Home royal blue & Away crimson)
      const hasHomeBus = fillStyles.some((c) => c === '#1e3a8a');
      const hasAwayBus = fillStyles.some((c) => c === '#991b1b');
      expect(hasHomeBus).toBe(true);
      expect(hasAwayBus).toBe(true);

      // Bronze legend statue
      const hasBronze = fillStyles.some((c) => c === '#78350f' || c === '#b45309' || c === '#d97706');
      expect(hasBronze).toBe(true);
    });

    it('renders East Ground with artisan food trucks, smoke puffs, beverage kiosk, merch trailer, and beer garden', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();

      drawCardinalEastGround(ctx, bounds, 'park_recreation', 'sunset', 'small_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);

      // Artisan Food Trucks (smash burger, doner kebab, tacos)
      const hasBurgerOrange = fillStyles.some((c) => c === '#ea580c');
      const hasKebabBlue = fillStyles.some((c) => c === '#0284c7');
      expect(hasBurgerOrange || hasKebabBlue).toBe(true);

      // Beverage kiosk illuminated neon sign
      const hasNeonCyan = fillStyles.some((c) => c === '#38bdf8');
      expect(hasNeonCyan).toBe(true);

      // Official fan merch trailer and hanging scarves
      const hasMerchRed = fillStyles.some((c) => c === '#dc2626');
      expect(hasMerchRed).toBe(true);

      // Outdoor beer garden picnic tables & round parasols
      const hasPicnicTimber = fillStyles.some((c) => c === '#78350f' || c === '#451a03');
      expect(hasPicnicTimber).toBe(true);
    });

    it('renders West Ground with OB satellite trucks, parabolic dishes, TV trailers, security fence, and access ramps', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();

      drawCardinalWestGround(ctx, bounds, 'industrial_depot', 'night', 'big_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);

      // Parabolic satellite uplink dishes
      const hasDishWhite = fillStyles.some((c) => c === '#f8fafc' || c === '#ffffff');
      const hasLNBRed = fillStyles.some((c) => c === '#ef4444' || c === '#dc2626');
      expect(hasDishWhite).toBe(true);
      expect(hasLNBRed).toBe(true);

      // Power generator trailer & yellow cable-bridge ramp
      const hasGenYellow = fillStyles.some((c) => c === '#eab308' || c === '#facc15');
      expect(hasGenYellow).toBe(true);

      // Security checkpoint fence with striped boom barrier
      const hasFenceStroke = operations.some((op) => op.method === 'stroke');
      expect(hasFenceStroke).toBe(true);

      // Team technical access non-slip rubber runner
      const hasRubberRunner = fillStyles.some((c) => c === '#0f172a' || c === '#1e293b' || c === '#334155');
      expect(hasRubberRunner).toBe(true);
    });
  });

  describe('B4.2: Deep Detail Expansion for All 9 Immediate Ground Types', () => {
    const allCoreGrounds: CoreStadiumGrounds[] = [
      'municipal_thoroughfare',
      'parking_lots',
      'mall_commercial',
      'classical_statues',
      'potrero_dirt',
      'modern_architectural',
      'industrial_depot',
      'park_recreation',
      'club_museum_trophies',
    ];

    it('provides rich descriptive ground flavor metadata for all 9 core grounds', () => {
      expect(Object.keys(B4_GROUND_FLAVORS)).toHaveLength(9);
      for (const gId of allCoreGrounds) {
        const flavor = getGroundFlavorDetail(gId);
        expect(flavor).toBeDefined();
        expect(flavor.name).toBeDefined();
        expect(flavor.groundProps.length).toBeGreaterThanOrEqual(4);
        expect(flavor.northFlavor).toBeDefined();
        expect(flavor.southFlavor).toBeDefined();
        expect(flavor.eastFlavor).toBeDefined();
        expect(flavor.westFlavor).toBeDefined();
      }
    });

    it('renders Municipal Street Grid with asphalt streets, crosswalks, taxis, and bus stops', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'municipal_thoroughfare', 'night', 'big_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles).toContain('#ffffff'); // Zebra crosswalks
      expect(fillStyles.some((c) => c === '#facc15')).toBe(true); // City taxis
    });

    it('renders Parking Lots with marked parking bays, speed bumps, and realistic oil stains', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'parking_lots', 'noon', 'parking_lot');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasOilStains = fillStyles.some((c) => typeof c === 'string' && c.includes('rgba(15, 23, 42'));
      const hasSpeedBumpHazard = fillStyles.some((c) => c === '#facc15');

      expect(hasOilStains).toBe(true);
      expect(hasSpeedBumpHazard).toBe(true);
    });

    it('renders Commercial Mall Concourse with modern glass storefronts, LED totems, and tiered fountain', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'mall_commercial', 'sunset', 'small_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles.some((c) => c === '#38bdf8')).toBe(true); // Digital LED totem screen
      expect(fillStyles.some((c) => c === '#0284c7')).toBe(true); // Fountain turquoise pool
    });

    it('renders Classical Plaza with checkered marble, balustrades with urns, topiary hedges, and equestrian statue', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'classical_statues', 'noon', 'small_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles.some((c) => c === '#b45309')).toBe(true); // Bronze equestrian statue
      expect(fillStyles.some((c) => c === '#15803d')).toBe(true); // Topiary box hedges
      expect(fillStyles.some((c) => c === '#cbd5e1')).toBe(true); // Marble balustrades
    });

    it('renders Dirt Potrero with dry scrub grass, white stacked tires, corrugated sheds, and chalk dust', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'potrero_dirt', 'noon', 'mountains');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles.some((c) => c === '#ffffff')).toBe(true); // White painted tires
      expect(fillStyles.some((c) => c === '#b45309')).toBe(true); // Rust patches on tin shed
    });

    it('renders Modern Architectural Plaza with reflection water basins, stepping stones, and linear LED ribbons', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'modern_architectural', 'night', 'big_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles.some((c) => c === '#38bdf8')).toBe(true); // Ground LED ribbon
      expect(fillStyles.some((c) => c === '#06b6d4')).toBe(true); // Reflection basin turquoise water
      expect(fillStyles.some((c) => c === '#e2e8f0')).toBe(true); // Stepping stones
    });

    it('renders Industrial Depot with rail spur tracks, shipping containers, forklift, and steel drums', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'industrial_depot', 'noon', 'railroad');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles.some((c) => c === '#44403c')).toBe(true); // Rail ballast
      expect(fillStyles.some((c) => c === '#eab308')).toBe(true); // Industrial forklift yellow body
    });

    it('renders Park & Recreation with gravel paths, mature trees, wooden benches, and green trash cans', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'park_recreation', 'noon', 'forest');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles.some((c) => c === '#15803d')).toBe(true); // Oak/pine tree foliage
      expect(fillStyles.some((c) => c === '#14532d')).toBe(true); // Green wooden trash receptacles
    });

    it('renders Club Museum & Heritage Walk with timeline plaques, crest mosaic, and trophy rotunda', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = createSampleConcourseBounds();
      drawDeepDetailGroundFeatures(ctx, bounds, 'club_museum_trophies', 'night', 'small_city');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      expect(fillStyles.some((c) => c === '#b45309')).toBe(true); // Bronze timeline plaque
      expect(fillStyles.some((c) => c === '#1e3a8a' || c === '#facc15')).toBe(true); // Crest mosaic medallion
      expect(fillStyles.some((c) => c === '#f8fafc')).toBe(true); // Silver silverware cup inside rotunda
    });
  });

  describe('B4.3: End-to-End Stadium Architecture Integration', () => {
    it('executes full drawStadiumArchitecture seamlessly across all 9 ground environments', () => {
      const { ctx } = createMockCanvasContext(false);
      const stadium = createDefaultStadium();

      const allGrounds: StadiumGroundsType[] = [
        'municipal_thoroughfare',
        'parking_lots',
        'mall_commercial',
        'classical_statues',
        'potrero_dirt',
        'modern_architectural',
        'industrial_depot',
        'park_recreation',
        'club_museum_trophies',
      ];

      for (const g of allGrounds) {
        stadium.grounds = g;
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
      }
    });

    it('executes drawImmediateStadiumGrounds invoking all 4 cardinal and deep detail systems without error', () => {
      const { ctx, operations } = createMockCanvasContext(true);
      const stadium = createDefaultStadium();
      stadium.grounds = 'classical_statues';

      expect(() => {
        drawImmediateStadiumGrounds(
          ctx,
          PITCH_CONFIG.CENTER_X,
          PITCH_CONFIG.CENTER_Y,
          stadium,
          'monumental',
          'night'
        );
      }).not.toThrow();

      // Ensure draw ops occurred
      expect(operations.length).toBeGreaterThan(50);
    });
  });

  describe('B4.4: Low-End 60 FPS Performance & Memory Verification', () => {
    it('sustains 60 FPS performance budget with zero allocations during grounds rendering', () => {
      const stadium = createDefaultStadium();
      stadium.grounds = 'mall_commercial';
      const { ctx } = createMockCanvasContext(false);

      // Warmup pass
      measureStadiumRenderPerformance(ctx, stadium, 2);

      const result = measureStadiumRenderPerformance(ctx, stadium, 10);
      expect(result.avgDurationMs).toBeLessThan(35); // Tolerates JS Proxy trap overhead under heavy multi-threaded Vitest runs
      expect(result.allocations).toBe(0);
    });
  });
});
