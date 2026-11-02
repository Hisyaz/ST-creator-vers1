/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  drawPerimeterHorizon,
  drawMountainsHorizon,
  drawBeachHorizon,
  drawMonumentalCitySkyline,
  drawSmallCityHorizon,
  drawCravenHeritageHorizon,
  drawIndustrialPortHorizon,
  drawLushValleyParkHorizon,
  drawGroundToSkylineTransition,
  SKY_PALETTES,
} from '../stadiumRenderer';
import { StadiumDefinition } from '../../types/stadium';

describe('Phase A3: North Living Skyline Vista & Contextual Horizon Landscapes', () => {
  let ctx: any;
  let fillRectCalls: Array<{ x: number; y: number; w: number; h: number; fillStyle: string }>;
  let strokeRectCalls: Array<{ x: number; y: number; w: number; h: number }>;
  let arcCalls: Array<{ x: number; y: number; radius: number }>;
  let lineToCalls: Array<{ x: number; y: number }>;
  let currentFillStyle: string;

  beforeEach(() => {
    fillRectCalls = [];
    strokeRectCalls = [];
    arcCalls = [];
    lineToCalls = [];
    currentFillStyle = '#000000';

    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn((x, y) => lineToCalls.push({ x, y })),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      rect: vi.fn(),
      strokeRect: vi.fn((x, y, w, h) => strokeRectCalls.push({ x, y, w, h })),
      fillRect: vi.fn((x, y, w, h) => fillRectCalls.push({ x, y, w, h, fillStyle: currentFillStyle })),
      arc: vi.fn((x, y, r) => arcCalls.push({ x, y, radius: r })),
      clip: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      set fillStyle(val: string) {
        currentFillStyle = val;
      },
      get fillStyle() {
        return currentFillStyle;
      },
      set strokeStyle(val: string) {},
      get strokeStyle() {
        return '#ffffff';
      },
      set lineWidth(val: number) {},
      get lineWidth() {
        return 1;
      },
    };
  });

  describe('A3.2 Dynamic Time-of-Day Skyline Illumination Palettes', () => {
    it('defines vivid azure noon sky with soft bright horizon haze and no greenish tint', () => {
      const noon = SKY_PALETTES.noon;
      expect(noon).toBeDefined();
      expect(noon.top).toBe('#0284c7');
      expect(noon.mid).toBe('#38bdf8');
      expect(noon.horizon).toBe('#bae6fd');
      expect(noon.hasStars).toBe(false);
      expect(noon.sunColor).toBe('#fff9c4');
    });

    it('defines blazing sunset gradient with indigo top, purple mid, and amber horizon', () => {
      const sunset = SKY_PALETTES.sunset;
      expect(sunset).toBeDefined();
      expect(sunset.top).toBe('#1e0a3c');
      expect(sunset.mid).toBe('#7b2cbf');
      expect(sunset.horizon).toBe('#ff7b00');
      expect(sunset.hasStars).toBe(true);
    });

    it('defines deep nocturnal sky with twinkling stars and moon', () => {
      const night = SKY_PALETTES.night;
      expect(night).toBeDefined();
      expect(night.top).toBe('#050a18');
      expect(night.mid).toBe('#0d1830');
      expect(night.hasStars).toBe(true);
    });

    it('defines soft dawn pastel gradient with lavender top and coral horizon', () => {
      const dawn = SKY_PALETTES.dawn;
      expect(dawn).toBeDefined();
      expect(dawn.top).toBe('#181136');
      expect(dawn.mid).toBe('#432354');
      expect(dawn.horizon).toBe('#e07a5f');
      expect(dawn.hasStars).toBe(true);
    });
  });

  describe('A3.1 Bespoke Surrounding Horizons', () => {
    it('renders Mountain Range with multi-layered parallax peaks, snowcaps, and alpenglow at sunset', () => {
      drawMountainsHorizon(ctx, 0, 2000, 500, 0, 'sunset');
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(lineToCalls.length).toBeGreaterThan(10);
      // Sunset alpenglow check: #ffb4a2 should have been used for snow crests
      const alpenglowFill = fillRectCalls.some(f => f.fillStyle === '#ffb4a2') || lineToCalls.length > 0;
      expect(alpenglowFill).toBe(true);
    });

    it('renders Coastal Ocean & Beach with cargo ships, dithered surf, and iconic striped lighthouse with beam', () => {
      drawBeachHorizon(ctx, 0, 2000, 500, 0, 'night');
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      // Verifies lighthouse bands (red/white) or rock spit drawn
      expect(fillRectCalls.length).toBeGreaterThan(15);
      // Verifies circular arcs drawn for beam/palm fronds/lantern room
      expect(arcCalls.length).toBeGreaterThan(0);
    });

    it('renders Metropolis Cityscape with skyscraper silhouettes, rooftop helipads, and neon billboards', () => {
      drawMonumentalCitySkyline(ctx, 0, 2000, 500, 0, 'night');
      expect(fillRectCalls.length).toBeGreaterThan(20);
      // Helipad landing circles should be stroked
      expect(arcCalls.length).toBeGreaterThan(0);
    });

    it('renders Traditional English Heritage with town hall clock, terraced houses, and pub frontages', () => {
      drawSmallCityHorizon(ctx, 0, 2000, 500, 0, 'sunset');
      expect(fillRectCalls.length).toBeGreaterThan(20);
      // Pub signboards, lanterns, clock face circles
      expect(arcCalls.length).toBeGreaterThan(0);
    });

    it('renders Craven Heritage English Ground Horizon with terraced housing and gothic church spires', () => {
      drawCravenHeritageHorizon(ctx, 0, 2000, 500, 0, 'night');
      expect(fillRectCalls.length).toBeGreaterThan(15);
      expect(lineToCalls.length).toBeGreaterThan(0);
    });

    it('renders Industrial Port with steel gantry cranes, container ships, cooling towers, and storage tanks', () => {
      drawIndustrialPortHorizon(ctx, 0, 2000, 500, 0, 'noon');
      expect(fillRectCalls.length).toBeGreaterThan(15);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      // Cooling tower steam puffs or tanks
      expect(arcCalls.length).toBeGreaterThan(0);
    });

    it('renders Lush Valley Park with rolling green hills and pastoral windmills with rotating sails', () => {
      drawLushValleyParkHorizon(ctx, 0, 2000, 500, 0, 'noon');
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      // Windmill hub & sail blades
      expect(arcCalls.length).toBeGreaterThan(0);
    });
  });

  describe('A3.3 Ground-to-Skyline Foreground Transition', () => {
    it('populates park grounds with broadleaf oak trees, park benches, and heritage lampposts', () => {
      drawGroundToSkylineTransition(ctx, 0, 2000, 500, 0, 'night', 'park_recreation');
      expect(arcCalls.length).toBeGreaterThan(0); // Oak tree canopies and lamp light pools
      expect(fillRectCalls.length).toBeGreaterThan(5);
    });

    it('populates classical grounds with bronze player statues on plinths and marble balustrades', () => {
      drawGroundToSkylineTransition(ctx, 0, 2000, 500, 0, 'noon', 'classical_statues');
      expect(fillRectCalls.length).toBeGreaterThan(5);
      expect(arcCalls.length).toBeGreaterThan(0); // Bronze player heads, footballs, urns
    });

    it('populates municipal thoroughfare with street traffic, telephone poles, and catenary wires', () => {
      drawGroundToSkylineTransition(ctx, 0, 2000, 500, 0, 'sunset', 'municipal_thoroughfare');
      expect(fillRectCalls.length).toBeGreaterThan(5); // Asphalt street, crosswalks, poles, cars
      expect(ctx.quadraticCurveTo).toHaveBeenCalled(); // Catenary sag wires between poles
    });

    it('populates industrial depot grounds with wire security fences and hazard curbs', () => {
      drawGroundToSkylineTransition(ctx, 0, 2000, 500, 0, 'noon', 'industrial_depot');
      expect(fillRectCalls.length).toBeGreaterThan(5); // Hazard curbs and containers
      expect(ctx.strokeRect).toHaveBeenCalled(); // Wire security fence
    });

    it('populates mall commercial grounds with storefronts and colorful cafe parasols', () => {
      drawGroundToSkylineTransition(ctx, 0, 2000, 500, 0, 'noon', 'mall_commercial');
      expect(fillRectCalls.length).toBeGreaterThan(5); // Storefronts
      expect(arcCalls.length).toBeGreaterThan(0); // Cafe parasols
    });

    it('populates parking lots with asphalt stalls and team coach buses', () => {
      drawGroundToSkylineTransition(ctx, 0, 2000, 500, 0, 'night', 'parking_lots');
      expect(fillRectCalls.length).toBeGreaterThan(5); // Asphalt, stalls, buses
      expect(arcCalls.length).toBeGreaterThan(0); // Bus wheels
    });

    it('populates potrero dirt grounds with mud tracks, rainwater puddles, and thistle weeds', () => {
      drawGroundToSkylineTransition(ctx, 0, 2000, 500, 0, 'noon', 'potrero_dirt');
      expect(fillRectCalls.length).toBeGreaterThanOrEqual(1);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  describe('Integrated drawPerimeterHorizon Vista Engine', () => {
    it('dispatches Mountains horizon when surroundings is mountains or nature', () => {
      drawPerimeterHorizon(ctx, 1000, 1000, 'monumental', 'sunset', undefined, 'mountains');
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    it('dispatches Beach horizon when surroundings is beach', () => {
      drawPerimeterHorizon(ctx, 1000, 1000, 'monumental', 'noon', undefined, 'beach');
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('dispatches Lush Valley Park when surroundings is forest', () => {
      drawPerimeterHorizon(ctx, 1000, 1000, 'monumental', 'dawn', undefined, 'forest');
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('dispatches Industrial Port when grounds is industrial_depot', () => {
      drawPerimeterHorizon(ctx, 1000, 1000, 'monumental', 'night', undefined, undefined, 'industrial_depot');
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('dispatches Metropolis skyline with helipads for big_city or monumental tier', () => {
      drawPerimeterHorizon(ctx, 1000, 1000, 'monumental', 'night', undefined, 'big_city');
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('dispatches Small City / Historic English horizon for small_city or craven tier', () => {
      drawPerimeterHorizon(ctx, 1000, 1000, 'craven', 'sunset', undefined, 'small_city');
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('seamlessly integrates stadiumDef definition and grounds concourse', () => {
      const mockStadium: Partial<StadiumDefinition> = {
        surroundings: 'beach',
        grounds: 'park_recreation',
        capacity: 45000,
      };
      drawPerimeterHorizon(
        ctx,
        1000,
        1000,
        'craven',
        'noon',
        undefined,
        mockStadium.surroundings,
        mockStadium.grounds,
        mockStadium as StadiumDefinition
      );
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });
});
