/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { GraphicsSettings, Player } from '../../types';
import { StadiumDefinition } from '../../types/stadium';
import {
  drawArchitecturalRoofShadows,
  drawTimeOfDayAtmosphere,
} from '../stadiumRenderer';
import { drawPitchMarkings } from '../pitchRenderer';
import { drawPlayerShadow, drawBall, drawReferee } from '../sprites';
import { createDefaultStadium } from '../stadiumRegistry';
import { PITCH_CONFIG } from '../constants';

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

const mockPerfSettings: GraphicsSettings = {
  tier: 'performance',
  quadShadows: false,
  ambientOcclusion: false,
  pitchScuffs: false,
  highDpi: false,
  volumetricLighting: false,
  crowdFlashbulbs: false,
  netSpringPhysics: false,
  powerVaporTrails: false,
  waterSprayParticles: false,
  videoRefReview: false,
  activeFilter: 'none',
  unlockedFilters: ['none'],
};

const mockHighEndSettings: GraphicsSettings = {
  tier: 'high_end',
  quadShadows: true,
  ambientOcclusion: true,
  pitchScuffs: true,
  highDpi: true,
  volumetricLighting: true,
  crowdFlashbulbs: true,
  netSpringPhysics: true,
  powerVaporTrails: true,
  waterSprayParticles: true,
  videoRefReview: true,
  activeFilter: 'none',
  unlockedFilters: ['none'],
};

describe('Phase S3: Dynamic Time-of-Day Illumination Suite & Shape-Consistent Architectural Roof Shadows', () => {
  const bounds = {
    left: PITCH_CONFIG.PITCH_LEFT - 200,
    top: PITCH_CONFIG.PITCH_TOP - 200,
    width: PITCH_CONFIG.FIELD_WIDTH + 400,
    height: PITCH_CONFIG.FIELD_HEIGHT + 400,
  };

  describe('S3.1: Global Time-of-Day Atmospheric Filters & Glare Cones', () => {
    it('applies noon crisp zenith sunlight gradient filter', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawTimeOfDayAtmosphere(ctx, 'noon', bounds);

      const radialGrads = operations.filter((op) => op.method === 'createRadialGradient');
      expect(radialGrads.length).toBeGreaterThan(0);
      const fills = operations.filter((op) => op.method === 'fillRect');
      expect(fills.length).toBeGreaterThan(0);
    });

    it('applies sunset / golden hour warm amber wash and directional west sun flare', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawTimeOfDayAtmosphere(ctx, 'sunset', bounds);

      const linearGrads = operations.filter((op) => op.method === 'createLinearGradient');
      expect(linearGrads.length).toBeGreaterThan(0);
      const colorStops = operations.filter((op) => op.method === 'addColorStop');
      // Warm amber / golden orange stops
      const amberStops = colorStops.filter((op) =>
        typeof op.args[1] === 'string' && (op.args[1].includes('251, 146, 60') || op.args[1].includes('245, 158, 11'))
      );
      expect(amberStops.length).toBeGreaterThan(0);
    });

    it('applies dawn soft morning sunrise rose-amber wash', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawTimeOfDayAtmosphere(ctx, 'dawn', bounds);

      const colorStops = operations.filter((op) => op.method === 'addColorStop');
      const dawnStops = colorStops.filter((op) =>
        typeof op.args[1] === 'string' && op.args[1].includes('253, 164, 175')
      );
      expect(dawnStops.length).toBeGreaterThan(0);
    });

    it('applies night nocturnal blue-violet ambient grading and 4-corner floodlight glare cones', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawTimeOfDayAtmosphere(ctx, 'night', bounds);

      const colorStops = operations.filter((op) => op.method === 'addColorStop');
      // Nocturnal ambient blue-violet grading
      const nocturnalStops = colorStops.filter((op) =>
        typeof op.args[1] === 'string' && op.args[1].includes('10, 16, 40')
      );
      expect(nocturnalStops.length).toBeGreaterThan(0);

      // Arc cones for 4 corner pylons plus halo rings and center pool
      const arcs = operations.filter((op) => op.method === 'arc');
      expect(arcs.length).toBeGreaterThanOrEqual(4);
    });

    it('skips noon atmosphere filter when performance tier is active', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawTimeOfDayAtmosphere(ctx, 'noon', bounds, mockPerfSettings);
      expect(operations.length).toBe(0);
    });
  });

  describe('S3.2: Pitch Markings, Sprites, Ball & Referee Time-of-Day Shading', () => {
    it('shades pitch boundary lines warmly at sunset, crisp at night, pure white at noon', () => {
      const { ctx: ctxSunset, properties: propsSunset } = createMockCanvasContext();
      drawPitchMarkings(ctxSunset, false, undefined, 'sunset');
      expect(propsSunset.strokeStyle).toBe('#fff4e6'); // Warm chalk

      const { ctx: ctxNight, properties: propsNight } = createMockCanvasContext();
      drawPitchMarkings(ctxNight, false, undefined, 'night');
      expect(propsNight.strokeStyle).toBe('#f8fafc'); // High-contrast nocturnal chalk

      const { ctx: ctxNoon, properties: propsNoon } = createMockCanvasContext();
      drawPitchMarkings(ctxNoon, false, undefined, 'noon');
      expect(propsNoon.strokeStyle).toBe('#ffffff'); // Pure white
    });

    it('casts player shadow with accurate sun movement angles', () => {
      const dummyPlayer: Player = {
        id: 'p1',
        name: 'Matthäus',
        team: 'home',
        role: 'CM',
        x: 500,
        y: 400,
        vx: 0,
        vy: 0,
        facingDir: 'down',
        facingAngle: 0,
        action: 'running',
        animFrame: 0,
        number: 10,
        stamina: 100,
        speed: 10,
        isUserControlled: false,
      } as unknown as Player;

      // Noon: short, centered laterally (offset X = 0, offset Y > 0)
      const { ctx: ctxNoon, operations: opsNoon } = createMockCanvasContext();
      drawPlayerShadow(ctxNoon, dummyPlayer, undefined, 'noon');
      const noonEllipse = opsNoon.find((op) => op.method === 'ellipse');
      expect(noonEllipse).toBeDefined();
      expect(noonEllipse?.args[0]).toBe(500); // 500 + 0 (centered)
      expect(noonEllipse?.args[1]).toBeGreaterThan(400); // Slight downward offset for high-zenith sun

      // Sunset: long slanted East/SE (offset X > 0, offset Y > 0)
      const { ctx: ctxSunset, operations: opsSunset } = createMockCanvasContext();
      drawPlayerShadow(ctxSunset, dummyPlayer, undefined, 'sunset');
      const sunsetEllipse = opsSunset.find((op) => op.method === 'ellipse');
      expect(sunsetEllipse).toBeDefined();
      expect(sunsetEllipse?.args[0]).toBeGreaterThan(500); // Slanted East
      expect(sunsetEllipse?.args[1]).toBeGreaterThan(400); // Slanted South

      // Dawn: long slanted West/SW (offset X < 0, offset Y > 0)
      const { ctx: ctxDawn, operations: opsDawn } = createMockCanvasContext();
      drawPlayerShadow(ctxDawn, dummyPlayer, undefined, 'dawn');
      const dawnEllipse = opsDawn.find((op) => op.method === 'ellipse');
      expect(dawnEllipse).toBeDefined();
      expect(dawnEllipse?.args[0]).toBeLessThan(500); // Slanted West
      expect(dawnEllipse?.args[1]).toBeGreaterThan(400); // Slanted South

      // Night: quad floodlights (4 directional shadow lobes radiating outward + cleat contact AO)
      const { ctx: ctxNight, operations: opsNight } = createMockCanvasContext();
      drawPlayerShadow(ctxNight, dummyPlayer, mockHighEndSettings, 'night');
      const nightEllipses = opsNight.filter((op) => op.method === 'ellipse');
      expect(nightEllipses.length).toBe(5);
    });

    it('draws ball and referee with time-of-day dynamic shadow vectors', () => {
      const dummyBall = {
        x: 600,
        y: 400,
        z: 10,
        vx: 0,
        vy: 0,
        vz: 0,
        carrierId: null,
        ownerId: null,
      } as any;

      const { ctx: ctxBallSunset, operations: opsBallSunset } = createMockCanvasContext();
      drawBall(ctxBallSunset, dummyBall, 'sunset');
      const ballSunsetEllipse = opsBallSunset.find((op) => op.method === 'ellipse');
      expect(ballSunsetEllipse).toBeDefined();
      // At sunset, ball shadow offset X is 8 + z * 0.22 = 8 + 2.2 = 10.2 -> 610.2
      expect(ballSunsetEllipse?.args[0]).toBeCloseTo(610.2, 1);

      const dummyRef = {
        x: 600,
        y: 450,
        vx: 0,
        vy: 0,
        facingAngle: 0,
      } as any;

      const { ctx: ctxRefSunset, operations: opsRefSunset } = createMockCanvasContext();
      drawReferee(ctxRefSunset, dummyRef, 'sunset');
      const refSunsetEllipse = opsRefSunset.find((op) => op.method === 'ellipse');
      expect(refSunsetEllipse).toBeDefined();
      // At sunset, referee shadow X is ref.x + 12 = 612
      expect(refSunsetEllipse?.args[0]).toBe(612);
    });
  });

  describe('S3.3: Shape-Consistent Architectural Roof Shadows', () => {
    it('omits directional sun roof shadows at night (floodlight illumination dominates)', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      drawArchitecturalRoofShadows(ctx, stadium, 'night');
      expect(operations.length).toBe(0);
    });

    it('renders annular circular aperture roof shadow for Round stadium at Sunset', () => {
      const { ctx, operations } = createMockCanvasContext();
      const roundStadium: StadiumDefinition = {
        ...createDefaultStadium(),
        shape: 'round',
      };

      drawArchitecturalRoofShadows(ctx, roundStadium, 'sunset');

      // Uses evenodd fill on outer rect and inner circular aperture
      const evenOddFills = operations.filter(
        (op) => op.method === 'fill' && op.args[0] === 'evenodd'
      );
      expect(evenOddFills.length).toBeGreaterThan(0);

      const arcs = operations.filter((op) => op.method === 'arc');
      expect(arcs.length).toBeGreaterThan(0);

      // Cantilever truss girder spokes
      const lines = operations.filter((op) => op.method === 'lineTo');
      expect(lines.length).toBeGreaterThanOrEqual(16);
    });

    it('renders elliptical curve contour roof shadow for Oval stadium', () => {
      const { ctx, operations } = createMockCanvasContext();
      const ovalStadium: StadiumDefinition = {
        ...createDefaultStadium(),
        shape: 'oval',
      };

      drawArchitecturalRoofShadows(ctx, ovalStadium, 'sunset');

      const evenOddFills = operations.filter(
        (op) => op.method === 'fill' && op.args[0] === 'evenodd'
      );
      expect(evenOddFills.length).toBeGreaterThan(0);

      // Oval cantilever spokes
      const lines = operations.filter((op) => op.method === 'lineTo');
      expect(lines.length).toBeGreaterThanOrEqual(16);
    });

    it('renders crisp 90-degree corner shadows for Square stadium', () => {
      const { ctx, operations } = createMockCanvasContext();
      const squareStadium: StadiumDefinition = {
        ...createDefaultStadium(),
        shape: 'square',
      };

      drawArchitecturalRoofShadows(ctx, squareStadium, 'sunset');

      const evenOddFills = operations.filter(
        (op) => op.method === 'fill' && op.args[0] === 'evenodd'
      );
      expect(evenOddFills.length).toBeGreaterThan(0);

      // Square uses rects for outer bounds and inner square aperture
      const rects = operations.filter((op) => op.method === 'rect');
      expect(rects.length).toBeGreaterThanOrEqual(2);
    });

    it('renders straight linear eave bands for Rectangular stadium respecting stand hasRoof', () => {
      const defaultStands = createDefaultStadium().stands;
      const { ctx: ctxWithRoofs, operations: opsWithRoofs } = createMockCanvasContext();
      const rectStadium: StadiumDefinition = {
        ...createDefaultStadium(),
        shape: 'rectangular',
        stands: {
          ...defaultStands,
          west: { ...defaultStands.west, hasRoof: true },
          east: { ...defaultStands.east, hasRoof: true },
          north: { ...defaultStands.north, hasRoof: true },
          south: { ...defaultStands.south, hasRoof: true },
        },
      };

      drawArchitecturalRoofShadows(ctxWithRoofs, rectStadium, 'sunset');
      const fillsWithRoofs = opsWithRoofs.filter((op) => op.method === 'fillRect');
      expect(fillsWithRoofs.length).toBeGreaterThan(0);

      // When West stand has no roof (hasRoof: false), West roof eave shadow is skipped
      const { ctx: ctxNoWestRoof, operations: opsNoWestRoof } = createMockCanvasContext();
      const rectStadiumNoWestRoof: StadiumDefinition = {
        ...rectStadium,
        stands: {
          ...rectStadium.stands,
          west: { ...rectStadium.stands.west, hasRoof: false },
        },
      };

      drawArchitecturalRoofShadows(ctxNoWestRoof, rectStadiumNoWestRoof, 'sunset');
      const fillsNoWest = opsNoWestRoof.filter((op) => op.method === 'fillRect');
      // Fills without West roof shadow should be fewer than with West roof
      expect(fillsNoWest.length).toBeLessThan(fillsWithRoofs.length);
    });

    it('skips roof shadows when graphicsSettings.tier is performance', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      drawArchitecturalRoofShadows(ctx, stadium, 'sunset', mockPerfSettings);
      expect(operations.length).toBe(0);
    });
  });
});
