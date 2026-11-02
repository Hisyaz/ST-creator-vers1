/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import { TimeOfDay } from '../../types';
import { SurroundingsType, StadiumDefinition } from '../../types/stadium';
import { createDefaultStadium } from '../stadiumRegistry';
import { drawAerialSkyCam } from '../skyCamRenderer';
import {
  drawAerialEnvironment,
  getDioramaRadius,
  drawPanoramicSkyEnvelope,
  drawDioramaConcentricRings,
  drawDioramaPerimeterRim,
  drawFisheyeSkylineBoundary,
} from '../environmentRenderer';

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

  return { ctx: ctx as CanvasRenderingContext2D, operations, properties };
}

describe('PHASE S4: 32-Bit Fisheye Horizon Skyline Boundary & Spherical Panoramic Surroundings', () => {
  const envBounds = {
    left: PITCH_CONFIG.CENTER_X - 3000,
    top: PITCH_CONFIG.CENTER_Y - 2800,
    width: 6000,
    height: 5600,
    stadiumBounds: {
      centerX: PITCH_CONFIG.CENTER_X,
      centerY: PITCH_CONFIG.CENTER_Y,
      outerWidth: 2000,
      outerHeight: 2200,
    },
  };

  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const dioramaRadius = getDioramaRadius(envBounds);

  describe('S4.1: Fisheye Planetoid Diorama World Model & Boundary Rim', () => {
    it('calculates the canonical planetoid diorama radius proportionally to environment bounds', () => {
      const radius = getDioramaRadius(envBounds);
      expect(radius).toBeGreaterThan(2000);
      expect(radius).toBeLessThan(3000);
      expect(radius).toBeCloseTo(envBounds.height * 0.43, 0);
    });

    it('renders concentric diorama infrastructure rings (canals, bridges, ring expressways)', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawDioramaConcentricRings(ctx, cx, cy, dioramaRadius, false, 'noon', 'big_city');

      // Concentric water canal (#0284c7)
      const canalOps = operations.filter(
        (op) => op.method === 'set:strokeStyle' && op.args[0] === '#0284c7'
      );
      expect(canalOps.length).toBeGreaterThan(0);

      // Yellow circular expressway divider line (#facc15)
      const roadDividerOps = operations.filter(
        (op) => op.method === 'set:strokeStyle' && op.args[0] === '#facc15'
      );
      expect(roadDividerOps.length).toBeGreaterThan(0);

      // Radial bridges and avenues crossing at cardinal axes (8 bridges)
      const bridgeTransforms = operations.filter((op) => op.method === 'rotate');
      expect(bridgeTransforms.length).toBeGreaterThanOrEqual(8);
    });

    it('renders stylized circular fisheye perimeter boundary rim with glowing atmospheric stroke and limb shading', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawDioramaPerimeterRim(ctx, cx, cy, dioramaRadius, false, 'noon');

      // Outer atmospheric rim stroke
      const arcOps = operations.filter((op) => op.method === 'arc');
      expect(arcOps.length).toBeGreaterThanOrEqual(2);

      // Golden / cyan accent ring
      const strokeOps = operations.filter((op) => op.method === 'stroke');
      expect(strokeOps.length).toBeGreaterThanOrEqual(2);

      // Inner limb shading radial gradient
      const limbGradOps = operations.filter((op) => op.method === 'createRadialGradient');
      expect(limbGradOps.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Big City with skyscrapers, spires and aircraft beacons', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'big_city', 'night', cx, cy, dioramaRadius);

      // Rotation transforms radiating 360 degrees around the planetoid rim (56 towers)
      const rotateOps = operations.filter((op) => op.method === 'rotate');
      expect(rotateOps.length).toBeGreaterThanOrEqual(50);

      // Aircraft Hazard Warning Beacon LEDs (#ef4444)
      const beaconOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#ef4444'
      );
      expect(beaconOps.length).toBeGreaterThan(0);

      // Illuminated windows in yellow (#fef08a) and cyan (#93c5fd)
      const windowOps = operations.filter(
        (op) =>
          op.method === 'set:fillStyle' &&
          (op.args[0] === '#fef08a' || op.args[0] === '#93c5fd')
      );
      expect(windowOps.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Small City with town hall clock tower, church steeple and townhomes', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'small_city', 'noon', cx, cy, dioramaRadius);

      // Historic Red-Brick Town Hall (#7f1d1d) with copper green spire (#10b981)
      const townHallBrick = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#7f1d1d'
      );
      expect(townHallBrick.length).toBeGreaterThan(0);

      const copperSpire = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#10b981'
      );
      expect(copperSpire.length).toBeGreaterThan(0);

      // Church stone steeple (#475569 / #64748b)
      const churchOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#475569'
      );
      expect(churchOps.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Mountains with snow caps, granite rock ridges and pine spires', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'mountains', 'noon', cx, cy, dioramaRadius);

      // Pristine alpine snow caps (#f8fafc)
      const snowCapOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#f8fafc'
      );
      expect(snowCapOps.length).toBeGreaterThan(0);

      // Pine trees on mountain ridges (#15803d)
      const pineOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#15803d'
      );
      expect(pineOps.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Forest with elevated fire watchtowers', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'forest', 'noon', cx, cy, dioramaRadius);

      // Fire lookout steel legs (#334155) and wooden cabin (#78350f)
      const steelLegs = operations.filter(
        (op) => op.method === 'set:strokeStyle' && op.args[0] === '#334155'
      );
      expect(steelLegs.length).toBeGreaterThan(0);
      const cabinOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#78350f'
      );
      expect(cabinOps.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Savannah with umbrella acacias, baobabs and kopjes', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'savannah', 'noon', cx, cy, dioramaRadius);

      // Umbrella acacia canopies (#15803d) and granite kopjes (#78716c)
      const acaciaOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#15803d'
      );
      expect(acaciaOps.length).toBeGreaterThan(0);
      const kopjeOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#78716c'
      );
      expect(kopjeOps.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Beach with coastal lighthouse and swaying palms', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'beach', 'night', cx, cy, dioramaRadius);

      // Red spiral stripes on maritime lighthouse (#dc2626) and white body (#ffffff)
      const redStripe = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#dc2626'
      );
      expect(redStripe.length).toBeGreaterThan(0);

      // Sweeping beacon lantern beam in the dark
      const beaconLight = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === 'rgba(254, 240, 138, 0.45)'
      );
      expect(beaconLight.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Airport with ATC tower, rotating green beacon and hangars', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'airport', 'night', cx, cy, dioramaRadius);

      // Rotating green beacon on ATC tower (#22c55e)
      const greenBeacon = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#22c55e'
      );
      expect(greenBeacon.length).toBeGreaterThan(0);

      // Curved aircraft hangars (#334155)
      const hangarOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#334155'
      );
      expect(hangarOps.length).toBeGreaterThan(0);
    });

    it('renders 360-degree circular fisheye skyline curvature for Railroad with container cranes and catenary gantries', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawFisheyeSkylineBoundary(ctx, 'railroad', 'noon', cx, cy, dioramaRadius);

      // Heavy industrial yellow container crane (#eab308) and red trolley (#dc2626)
      const yellowCrane = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#eab308'
      );
      expect(yellowCrane.length).toBeGreaterThan(0);
      const trolleyOps = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#dc2626'
      );
      expect(trolleyOps.length).toBeGreaterThan(0);
    });
  });

  describe('S4.2: Multi-Directional Panoramic Sky Envelope across Time-of-Day', () => {
    it('renders Noon panoramic sky envelope with vivid blue celestial dome, solar disc and wispy cirrus arcs', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawPanoramicSkyEnvelope(ctx, 'noon', cx, cy, dioramaRadius, envBounds);

      // Radial sky gradient stops: azure (#93c5fd), sky blue (#38bdf8), cobalt (#1d4ed8), navy (#1e3a8a)
      const colorStops = operations.filter((op) => op.method === 'addColorStop');
      const azureStops = colorStops.filter(
        (op) => typeof op.args[1] === 'string' && op.args[1] === '#93c5fd'
      );
      expect(azureStops.length).toBeGreaterThan(0);

      // Solid core sun orb (#fff9c4)
      const sunCore = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#fff9c4'
      );
      expect(sunCore.length).toBeGreaterThan(0);

      // Concentric cirrus cloud arcs
      const cirrusArcs = operations.filter((op) => op.method === 'arc');
      expect(cirrusArcs.length).toBeGreaterThanOrEqual(4);
    });

    it('renders Sunset panoramic sky envelope with radiant amber, magenta, deep violet gradients and fiery streamers', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawPanoramicSkyEnvelope(ctx, 'sunset', cx, cy, dioramaRadius, envBounds);

      // Radial sky gradient color stops
      const colorStops = operations.filter((op) => op.method === 'addColorStop');
      const amberStops = colorStops.filter(
        (op) => typeof op.args[1] === 'string' && op.args[1] === '#f59e0b'
      );
      expect(amberStops.length).toBeGreaterThan(0);

      const magentaStops = colorStops.filter(
        (op) => typeof op.args[1] === 'string' && op.args[1] === '#c026d3'
      );
      expect(magentaStops.length).toBeGreaterThan(0);

      const violetStops = colorStops.filter(
        (op) => typeof op.args[1] === 'string' && op.args[1] === '#581c87'
      );
      expect(violetStops.length).toBeGreaterThan(0);

      // Sinking sun disc on western rim (#fde047)
      const sunsetDisc = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#fde047'
      );
      expect(sunsetDisc.length).toBeGreaterThan(0);
    });

    it('renders Night panoramic sky envelope with over 240 deterministic stars, diamond diffraction spikes and lunar orb', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawPanoramicSkyEnvelope(ctx, 'night', cx, cy, dioramaRadius, envBounds);

      // Brilliant diamond stars with diffraction spikes (#fde047)
      const diamondStars = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#fde047'
      );
      expect(diamondStars.length).toBeGreaterThan(15);

      // Shimmering cyan stars (#93c5fd)
      const cyanStars = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#93c5fd'
      );
      expect(cyanStars.length).toBeGreaterThan(25);

      // Glowing lunar orb (#f8fafc)
      const moonOrb = operations.filter(
        (op) => op.method === 'set:fillStyle' && op.args[0] === '#f8fafc'
      );
      expect(moonOrb.length).toBeGreaterThan(0);
    });
  });

  describe('Integrated Aerial Sky-Cam with Phase S4 Diorama', () => {
    it('executes drawAerialSkyCam across all 8 surroundings with Phase S4 Fisheye Diorama without errors', () => {
      const surroundingsList: SurroundingsType[] = [
        'big_city',
        'small_city',
        'mountains',
        'forest',
        'savannah',
        'beach',
        'airport',
        'railroad',
      ];

      for (const sur of surroundingsList) {
        const { ctx, operations } = createMockCanvasContext();
        const stadium: StadiumDefinition = {
          ...createDefaultStadium(),
          surroundings: sur,
        };

        expect(() => {
          drawAerialSkyCam(ctx, stadium, {
            roofOpacity: 1.0,
            showBroadcastHUD: false,
            timeOfDay: 'sunset',
          });
        }).not.toThrow();

        expect(operations.length).toBeGreaterThan(200);
      }
    });
  });
});
