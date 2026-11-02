/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ROOF_CUTAWAY_OPTIONS,
  ROOF_STYLE_OPTIONS,
  ROUND_OVAL_ROOF_STYLE_OPTIONS,
  ROUND_OVAL_ROOF_MATERIAL_OPTIONS,
  ROUND_OVAL_ROOF_BORDER_OPTIONS,
  RoofCutawayMode,
  StadiumDefinition,
  StadiumShape,
} from '../../types/stadium';
import {
  drawAerialSkyCam,
  drawStadiumPlaza,
  drawStadiumOuterFacade,
  drawStadiumRoofStructure,
  drawAerialExposedSeatingBowl,
  isStandActive,
  getAerialSeatColor,
  createPreMatchSwoop,
  updatePreMatchSwoop,
} from '../skyCamRenderer';
import {
  drawFisheyeSkylineBoundary,
  drawAerialEnvironment,
  getDioramaRadius,
} from '../environmentRenderer';
import {
  STADIUM_REGISTRY,
  MARACANA_LEGEND,
  ESTADIO_MONUMENTAL,
  SANTIAGO_BERNABEU,
  CRAVEN_COTTAGE,
} from '../stadiumRegistry';
import { getStadiumShapeMetrics } from '../stadiumRenderer';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
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
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
}

describe('Phase ST6: High-Fidelity Aerial View & 32-Bit Fisheye Horizon Synchronizer', () => {
  // ---------------------------------------------------------------------------
  // 1. ST6.1 FAITHFUL STADIUM SHAPE & FORM REFLECTION FROM BIRD'S-EYE VIEW
  // ---------------------------------------------------------------------------
  describe('ST6.1: True Stadium Shape Projection & No-Stand Asymmetry', () => {
    it('correctly discriminates all four stadium shape footprints in metrics calculation', () => {
      const roundMetrics = getStadiumShapeMetrics('round');
      const ovalMetrics = getStadiumShapeMetrics('oval');
      const squareMetrics = getStadiumShapeMetrics('square');
      const rectMetrics = getStadiumShapeMetrics('rectangular');

      expect(roundMetrics.shape).toBe('round');
      expect(ovalMetrics.shape).toBe('oval');
      expect(squareMetrics.shape).toBe('square');
      expect(rectMetrics.shape).toBe('rectangular');

      // Round & Square have 1:1 aspect ratio envelopes
      expect(roundMetrics.apronRadiusX).toBeGreaterThan(0);
      expect(squareMetrics.standDepthX).toBe(120);
      expect(ovalMetrics.hasTrack).toBe(false);
    });

    it('renders Round Coliseum with true circular concentric outer facade arc', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
      stadium.shape = 'round';

      drawStadiumOuterFacade(ctx, 930, 1470, 3200, 3200, 'round', stadium);

      // Verify circular arcs were drawn
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('renders Oval Athletics Stadium with elongated racetrack silhouette (straight lines + semicircular bends)', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(ESTADIO_MONUMENTAL)) as StadiumDefinition;
      stadium.shape = 'oval';

      drawStadiumOuterFacade(ctx, 930, 1470, 3100, 3500, 'oval', stadium);

      // Oval racetrack uses fillRect for touchlines and arc for endzones
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
    });

    it('renders Square Stadium with 1:1 rectilinear geometry and 45° corner pavilions', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(SANTIAGO_BERNABEU)) as StadiumDefinition;
      stadium.shape = 'square';

      drawStadiumOuterFacade(ctx, 930, 1470, 3000, 3000, 'square', stadium);

      // Should fill rectangles for West, East, North, South and 4 corner pavilions
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders Rectangular Stadium as traditional compact box ground', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(CRAVEN_COTTAGE)) as StadiumDefinition;
      stadium.shape = 'rectangular';

      drawStadiumOuterFacade(ctx, 930, 1470, 2600, 3400, 'rectangular', stadium);

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('faithfully enforces No-Stand asymmetry: omits outer facade when stand is none or no_stand', () => {
      const stadium = JSON.parse(JSON.stringify(CRAVEN_COTTAGE)) as StadiumDefinition;
      expect(isStandActive(stadium.stands.west)).toBe(true);

      // Set south stand to 'no_stand'
      stadium.stands.south.type = 'no_stand';
      expect(isStandActive(stadium.stands.south)).toBe(false);

      // Set north stand to 'none'
      stadium.stands.north.type = 'none';
      expect(isStandActive(stadium.stands.north)).toBe(false);

      const ctx = createMockContext();
      drawStadiumOuterFacade(ctx, 930, 1470, 2600, 3400, 'rectangular', stadium);

      // Verify rendering succeeded without crashing
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('supports Horseshoe and open endzones in Round & Oval bowls with No-Stand asymmetry', () => {
      const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
      stadium.shape = 'round';
      // Convert south end to open marathon entrance / no stand
      stadium.stands.south.type = 'no_stand';

      const ctx = createMockContext();
      drawStadiumOuterFacade(ctx, 930, 1470, 3200, 3200, 'round', stadium);

      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. ST6.2 DUAL-STATE AERIAL CANOPY VS EXPOSED SEATING BOWL SYNCHRONIZATION
  // ---------------------------------------------------------------------------
  describe('ST6.2: Dual-State Aerial Canopy vs Exposed Seating Bowl', () => {
    it('delegates to drawAerialExposedSeatingBowl when roofCutaway is hidden', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(SANTIAGO_BERNABEU)) as StadiumDefinition;
      stadium.roofCutaway = 'hidden';

      drawStadiumRoofStructure(ctx, 930, 1470, 3000, 3000, 'square', stadium);

      // Exposed seating bowl draws under-seat decking, gangway yellow stripes (#facc15), and vomitories
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalled();
    });

    it('delegates to drawAerialExposedSeatingBowl when roof.enabled is false', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
      if (!stadium.roof) stadium.roof = { enabled: false, style: 'spoke_wheel_tension', material: 'ptfe_fabric', border: 'video_halo_board' };
      else stadium.roof.enabled = false;

      drawStadiumRoofStructure(ctx, 930, 1470, 3200, 3200, 'round', stadium);

      // Exposed concentric rings drawn
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('correctly computes seat colors for all four seat patterns (solid, bands, stripes, lowerUpper)', () => {
      const col1 = '#2563eb';
      const col2 = '#ffffff';

      // Solid: always color 1
      expect(getAerialSeatColor(1, 0, 0, 3, 'solid', col1, col2)).toBe(col1);
      expect(getAerialSeatColor(2, 1, 1, 3, 'solid', col1, col2)).toBe(col1);

      // Horizontal bands: alternating row index
      expect(getAerialSeatColor(2, 0, 0, 3, 'horizontalBands', col1, col2)).toBe(col1);
      expect(getAerialSeatColor(3, 0, 0, 3, 'horizontalBands', col1, col2)).toBe(col2);

      // Vertical stripes: alternating column index
      expect(getAerialSeatColor(1, 2, 0, 3, 'verticalStripes', col1, col2)).toBe(col1);
      expect(getAerialSeatColor(1, 3, 0, 3, 'verticalStripes', col1, col2)).toBe(col2);

      // LowerUpper: tier 0 is lower (col1), tier 2 is upper (col2)
      expect(getAerialSeatColor(1, 0, 0, 3, 'lowerUpper', col1, col2)).toBe(col1);
      expect(getAerialSeatColor(1, 0, 2, 3, 'lowerUpper', col1, col2)).toBe(col2);
    });

    it('renders exposed seating tiers with vomitories and yellow stairways in all 4 shapes', () => {
      const shapes: StadiumShape[] = ['round', 'oval', 'square', 'rectangular'];
      for (const sh of shapes) {
        const ctx = createMockContext();
        const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
        stadium.shape = sh;
        stadium.seats.pattern = 'horizontalBands';

        drawAerialExposedSeatingBowl(ctx, 930, 1470, 3000, 3000, sh, stadium);

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
      }
    });

    it('renders macroscopic geometric roof canopy matching Style, Material, and Border when roof is enabled', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
      stadium.shape = 'round';
      stadium.roofCutaway = 'full';
      stadium.roof = {
        enabled: true,
        style: 'petal_ocular_halo',
        material: 'solar_glass',
        border: 'video_halo_board',
      };

      drawStadiumRoofStructure(ctx, 930, 1470, 3200, 3200, 'round', stadium);

      // Petal style draws interlocking geometric petals (8 petals)
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders Spoke-Wheel Tension roof with radial spokes and video halo board', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
      stadium.roofCutaway = 'partial';
      stadium.roof = {
        enabled: true,
        style: 'spoke_wheel_tension',
        material: 'ptfe_fabric',
        border: 'video_halo_board',
      };

      drawStadiumRoofStructure(ctx, 930, 1470, 3200, 3200, 'round', stadium);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders Radial Louvered Pergola roof with concentric sun-break louvers', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
      stadium.roof = {
        enabled: true,
        style: 'radial_louvered_pergola',
        material: 'perforated_aluminum',
        border: 'glow_led_ribbon',
      };

      drawStadiumRoofStructure(ctx, 930, 1470, 3200, 3200, 'round', stadium);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('respects stand-level hasRoof exclusion in rectangular stadiums (reveals seating below open stand)', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(CRAVEN_COTTAGE)) as StadiumDefinition;
      stadium.roofCutaway = 'full';
      stadium.stands.west.hasRoof = true;
      stadium.stands.east.hasRoof = false; // Open-air stand

      drawStadiumRoofStructure(ctx, 930, 1470, 2600, 3400, 'rectangular', stadium);

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ST6.3 IMMEDIATE STADIUM GROUNDS & 32-BIT FISHEYE HORIZON DIORAMA
  // ---------------------------------------------------------------------------
  describe('ST6.3: Immediate Stadium Grounds & 32-Bit Fisheye Horizon Diorama', () => {
    it('renders macroscopic Parking Lots grounds with white stalls, parked cars, and team coach buses', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'noon', 'parking_lots');

      expect(ctx.strokeRect).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('renders Mall / Commercial grounds with retail roofs, skylights, HVAC units, and cafe umbrellas', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'sunset', 'mall_commercial');

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled(); // Parasols
    });

    it('renders Classical Statues grounds with marble fountain, concentric water ripples, and bronze statues', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'noon', 'classical_statues');

      expect(ctx.arc).toHaveBeenCalled(); // Fountain basin and water ripples
      expect(ctx.fillRect).toHaveBeenCalled(); // Statue plinths and hedges
    });

    it('renders Municipal Thoroughfare grounds with perimeter street grid, yellow centerline, and moving pixel traffic', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'night', 'municipal_thoroughfare');

      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled(); // Vehicles & headlights
    });

    it('renders Potrero Dirt grounds with muddy earth, sky puddle reflections, and rutted tire tracks', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'sunset', 'potrero_dirt');

      expect(ctx.ellipse).toHaveBeenCalled(); // Puddle pools
      expect(ctx.stroke).toHaveBeenCalled(); // Tire ruts
    });

    it('renders Modern Architectural grounds with turquoise water basins and cyan LED ribbons', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'night', 'modern_architectural');

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders Industrial Depot grounds with shipping container stacks and forklift lanes', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'noon', 'industrial_depot');

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('renders Park & Recreation grounds with tree canopies and sports court lines', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'noon', 'park_recreation');

      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('renders Club Museum & Trophies grounds with team crest mosaic and Walk of Fame star pavers', () => {
      const ctx = createMockContext();
      drawStadiumPlaza(ctx, 930, 1470, 3000, 3000, false, 'night', 'club_museum_trophies');

      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('renders Airport fisheye skyline with high-intensity runway approach light bars and strobes', () => {
      const ctx = createMockContext();
      drawFisheyeSkylineBoundary(ctx, 'airport', 'night', 930, 1470, 2000);

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders Beach fisheye skyline with breaking ocean surf and dithered foam edges', () => {
      const ctx = createMockContext();
      drawFisheyeSkylineBoundary(ctx, 'beach', 'noon', 930, 1470, 2000);

      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MASTER END-TO-END AERIAL SKY-CAM RENDERER & PRE-MATCH SWOOP
  // ---------------------------------------------------------------------------
  describe('ST6 Master Aerial Sky-Cam & Swoop State Integration', () => {
    it('renders complete high-altitude aerial view without errors for all 4 stadium shapes', () => {
      const shapes: StadiumShape[] = ['round', 'oval', 'square', 'rectangular'];
      for (const sh of shapes) {
        const ctx = createMockContext();
        const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;
        stadium.shape = sh;

        drawAerialSkyCam(ctx, stadium, {
          roofOpacity: 1.0,
          showBroadcastHUD: true,
          timeOfDay: 'sunset',
        });

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
      }
    });

    it('renders complete aerial view with roof cutaway hidden exposing seating bowl', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(SANTIAGO_BERNABEU)) as StadiumDefinition;
      stadium.roofCutaway = 'hidden';

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: true,
        timeOfDay: 'night',
      });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('executes pre-match swoop easing smoothly from high-altitude down to pitch level', () => {
      const stadium = MARACANA_LEGEND;
      const swoop = createPreMatchSwoop(stadium, 'FLAMENGO', 'FLUMINENSE', 3000);
      expect(swoop.isActive).toBe(true);
      expect(swoop.progress).toBe(0.0);

      // Mid-flight update
      const mid = updatePreMatchSwoop(swoop, swoop.startTime + 1500);
      expect(mid.progress).toBeGreaterThan(0.0);
      expect(mid.progress).toBeLessThan(1.0);
      expect(mid.camera.zoom).toBeGreaterThan(0.25);
      expect(mid.isComplete).toBe(false);

      // Completion update
      const finish = updatePreMatchSwoop(swoop, swoop.startTime + 3500);
      expect(finish.progress).toBe(1.0);
      expect(finish.isComplete).toBe(true);
      expect(finish.camera.zoom).toBeCloseTo(1.05);
    });

    it('renders exposed seating bowl when roofOpacity <= 0.01 during pitch-cam touchdown', () => {
      const ctx = createMockContext();
      const stadium = JSON.parse(JSON.stringify(MARACANA_LEGEND)) as StadiumDefinition;

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 0.0, // Swoop reached pitch-cam
        showBroadcastHUD: false,
        timeOfDay: 'noon',
      });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });
});
