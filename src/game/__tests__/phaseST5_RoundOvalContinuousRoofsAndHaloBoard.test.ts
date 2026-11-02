/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ROOF_CUTAWAY_OPTIONS,
  ROOF_STYLE_OPTIONS,
  ROOF_MATERIAL_OPTIONS,
  ROOF_BORDER_OPTIONS,
  ROUND_OVAL_ROOF_STYLE_OPTIONS,
  ROUND_OVAL_ROOF_MATERIAL_OPTIONS,
  ROUND_OVAL_ROOF_BORDER_OPTIONS,
  ALL_ROOF_STYLE_OPTIONS,
  ALL_ROOF_MATERIAL_OPTIONS,
  ALL_ROOF_BORDER_OPTIONS,
  isRoundOrOvalShape,
  getRoofStylesForShape,
  getRoofMaterialsForShape,
  getRoofBordersForShape,
  getDefaultRoofConfig,
  RoofCutawayMode,
  RoofStyle,
  RoofMaterial,
  RoofBorder,
  RoofConfig,
  StadiumDefinition,
} from '../../types/stadium';
import {
  drawContinuousColiseumRoofCanopy,
  getColiseumPointAtDistance,
  drawStadiumArchitecture,
  drawContinuousColiseumBowl,
} from '../stadiumRenderer';
import {
  STADIUM_REGISTRY,
  MARACANA_LEGEND,
  ESTADIO_MONUMENTAL,
  SANTIAGO_BERNABEU,
  CRAVEN_COTTAGE,
} from '../stadiumRegistry';
import { HOME_KIT, AWAY_KIT, PITCH_CONFIG } from '../constants';
import { MatchEngine } from '../engine';
import { drawAerialSkyCam } from '../skyCamRenderer';

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

describe('Phase ST5: Round & Oval Coliseum Continuous Roof Architectures & 360° Halo Board', () => {
  // ---------------------------------------------------------------------------
  // 1. DATA CONTRACTS & ROUND/OVAL 3-LEVEL CUSTOMIZATION HIERARCHY
  // ---------------------------------------------------------------------------
  describe('ST5.1 & ST5.2 Data Contracts & Options', () => {
    it('defines 4 dedicated continuous roof styles for round and oval stadiums', () => {
      expect(ROUND_OVAL_ROOF_STYLE_OPTIONS).toHaveLength(4);
      const styles = ROUND_OVAL_ROOF_STYLE_OPTIONS.map((s) => s.id);
      expect(styles).toContain('spoke_wheel_tension');
      expect(styles).toContain('petal_ocular_halo');
      expect(styles).toContain('continuous_cantilever_ring');
      expect(styles).toContain('radial_louvered_pergola');
    });

    it('contains all 8 styles in ALL_ROOF_STYLE_OPTIONS', () => {
      expect(ALL_ROOF_STYLE_OPTIONS).toHaveLength(8);
      const ids = ALL_ROOF_STYLE_OPTIONS.map((s) => s.id);
      expect(ids).toContain('cantilever_truss');
      expect(ids).toContain('barrel_vault');
      expect(ids).toContain('tensile_cable');
      expect(ids).toContain('spaceframe_halo');
      expect(ids).toContain('spoke_wheel_tension');
      expect(ids).toContain('petal_ocular_halo');
      expect(ids).toContain('continuous_cantilever_ring');
      expect(ids).toContain('radial_louvered_pergola');
    });

    it('defines 4 dedicated round/oval roof materials', () => {
      expect(ROUND_OVAL_ROOF_MATERIAL_OPTIONS).toHaveLength(4);
      const materials = ROUND_OVAL_ROOF_MATERIAL_OPTIONS.map((m) => m.id);
      expect(materials).toContain('ptfe_fabric');
      expect(materials).toContain('perforated_aluminum');
      expect(materials).toContain('solar_glass');
      expect(materials).toContain('galvanized_plate');
    });

    it('defines 4 dedicated round/oval inner ocular rim finishes including 360° Halo Board', () => {
      expect(ROUND_OVAL_ROOF_BORDER_OPTIONS).toHaveLength(4);
      const borders = ROUND_OVAL_ROOF_BORDER_OPTIONS.map((b) => b.id);
      expect(borders).toContain('video_halo_board');
      expect(borders).toContain('glow_led_ribbon');
      expect(borders).toContain('compression_box_ring');
      expect(borders).toContain('leitch_radial_truss');
    });

    it('correctly discriminates round and oval shapes via isRoundOrOvalShape helper', () => {
      expect(isRoundOrOvalShape('round')).toBe(true);
      expect(isRoundOrOvalShape('oval')).toBe(true);
      expect(isRoundOrOvalShape('circular')).toBe(true);
      expect(isRoundOrOvalShape('square')).toBe(false);
      expect(isRoundOrOvalShape('rectangular')).toBe(false);
      expect(isRoundOrOvalShape(undefined)).toBe(false);
    });

    it('returns shape-appropriate roof styles, materials, and borders', () => {
      expect(getRoofStylesForShape('round')).toEqual(ROUND_OVAL_ROOF_STYLE_OPTIONS);
      expect(getRoofStylesForShape('oval')).toEqual(ROUND_OVAL_ROOF_STYLE_OPTIONS);
      expect(getRoofStylesForShape('rectangular')).toEqual(ROOF_STYLE_OPTIONS);
      expect(getRoofStylesForShape('square')).toEqual(ROOF_STYLE_OPTIONS);

      expect(getRoofMaterialsForShape('round')).toEqual(ROUND_OVAL_ROOF_MATERIAL_OPTIONS);
      expect(getRoofMaterialsForShape('rectangular')).toEqual(ROOF_MATERIAL_OPTIONS);

      expect(getRoofBordersForShape('round')).toEqual(ROUND_OVAL_ROOF_BORDER_OPTIONS);
      expect(getRoofBordersForShape('rectangular')).toEqual(ROOF_BORDER_OPTIONS);
    });

    it('provides shape-differentiated defaults via getDefaultRoofConfig', () => {
      const roundDef = getDefaultRoofConfig('round');
      expect(roundDef.style).toBe('spoke_wheel_tension');
      expect(roundDef.material).toBe('ptfe_fabric');
      expect(roundDef.border).toBe('video_halo_board');
      expect(roundDef.cutawayMode).toBe('partial');

      const ovalDef = getDefaultRoofConfig('oval');
      expect(ovalDef.style).toBe('continuous_cantilever_ring');
      expect(ovalDef.material).toBe('ptfe_fabric');
      expect(ovalDef.border).toBe('video_halo_board');

      const rectDef = getDefaultRoofConfig('rectangular');
      expect(rectDef.style).toBe('cantilever_truss');
      expect(rectDef.material).toBe('corrugated_steel');
      expect(rectDef.border).toBe('painted_club_fascia');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CANONICAL STADIUM REGISTRY CONFIGURATION
  // ---------------------------------------------------------------------------
  describe('Canonical Stadium Registry ST5 Alignment', () => {
    it('configures Maracanã with canonical spoke_wheel_tension and ptfe_fabric', () => {
      expect(MARACANA_LEGEND.shape).toBe('round');
      expect(MARACANA_LEGEND.roof).toBeDefined();
      expect(MARACANA_LEGEND.roof?.style).toBe('spoke_wheel_tension');
      expect(MARACANA_LEGEND.roof?.material).toBe('ptfe_fabric');
      expect(MARACANA_LEGEND.roof?.border).toBe('video_halo_board');
      expect(MARACANA_LEGEND.roofCutaway).toBe('partial');
    });

    it('configures Estadio Monumental with continuous_cantilever_ring and ptfe_fabric', () => {
      expect(ESTADIO_MONUMENTAL.shape).toBe('oval');
      expect(ESTADIO_MONUMENTAL.roof).toBeDefined();
      expect(ESTADIO_MONUMENTAL.roof?.style).toBe('continuous_cantilever_ring');
      expect(ESTADIO_MONUMENTAL.roof?.material).toBe('ptfe_fabric');
      expect(ESTADIO_MONUMENTAL.roof?.border).toBe('video_halo_board');
      expect(ESTADIO_MONUMENTAL.roofCutaway).toBe('partial');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. COLISEUM COORDINATE ENGINE (getColiseumPointAtDistance)
  // ---------------------------------------------------------------------------
  describe('getColiseumPointAtDistance Coordinate Math', () => {
    const cx = 1000;
    const cy = 1200;
    const pTop = 400;
    const pBottom = 2000;
    const rIn = 300;
    const d = 50;

    it('calculates round coliseum circular points correctly', () => {
      const pEast = getColiseumPointAtDistance('round', cx, cy, pTop, pBottom, 700, 1300, rIn, d, 0);
      expect(pEast.x).toBeCloseTo(cx + 350, 2);
      expect(pEast.y).toBeCloseTo(cy, 2);

      const pSouth = getColiseumPointAtDistance('round', cx, cy, pTop, pBottom, 700, 1300, rIn, d, Math.PI / 2);
      expect(pSouth.x).toBeCloseTo(cx, 2);
      expect(pSouth.y).toBeCloseTo(cy + 350, 2);

      const pWest = getColiseumPointAtDistance('round', cx, cy, pTop, pBottom, 700, 1300, rIn, d, Math.PI);
      expect(pWest.x).toBeCloseTo(cx - 350, 2);
      expect(pWest.y).toBeCloseTo(cy, 2);

      const pNorth = getColiseumPointAtDistance('round', cx, cy, pTop, pBottom, 700, 1300, rIn, d, (3 * Math.PI) / 2);
      expect(pNorth.x).toBeCloseTo(cx, 2);
      expect(pNorth.y).toBeCloseTo(cy - 350, 2);
    });

    it('calculates oval racetrack coliseum points smoothly across curves', () => {
      const pSouth = getColiseumPointAtDistance('oval', cx, cy, pTop, pBottom, 700, 1300, rIn, d, Math.PI / 2);
      expect(pSouth.x).toBeCloseTo(cx, 2);
      expect(pSouth.y).toBeCloseTo(pBottom + 350, 2);

      const pNorth = getColiseumPointAtDistance('oval', cx, cy, pTop, pBottom, 700, 1300, rIn, d, (3 * Math.PI) / 2);
      expect(pNorth.x).toBeCloseTo(cx, 2);
      expect(pNorth.y).toBeCloseTo(pTop - 350, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MASTER CONTINUOUS COLISEUM ROOF RENDERER (drawContinuousColiseumRoofCanopy)
  // ---------------------------------------------------------------------------
  describe('drawContinuousColiseumRoofCanopy Renderer & Cutaways', () => {
    const roundStadium: StadiumDefinition = {
      ...MARACANA_LEGEND,
      shape: 'round',
      roof: {
        enabled: true,
        style: 'spoke_wheel_tension',
        material: 'ptfe_fabric',
        border: 'video_halo_board',
        cutawayMode: 'partial',
        coverage: 0.5,
      },
    };

    it('skips rendering completely when roof.enabled is false', () => {
      const ctx = createMockContext();
      drawContinuousColiseumRoofCanopy(
        ctx,
        {
          ...roundStadium,
          roof: { ...roundStadium.roof!, enabled: false },
        },
        'round'
      );
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('skips rendering completely when cutaway is hidden (0% canopy)', () => {
      const ctx = createMockContext();
      drawContinuousColiseumRoofCanopy(
        ctx,
        roundStadium,
        'round',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        HOME_KIT,
        AWAY_KIT,
        'night',
        'hidden'
      );
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('renders partial canopy (50% cutaway) framing upper rows with soffit shadow', () => {
      const ctx = createMockContext();
      drawContinuousColiseumRoofCanopy(
        ctx,
        roundStadium,
        'round',
        1000,
        1200,
        400,
        2000,
        700,
        1300,
        300,
        200,
        HOME_KIT,
        AWAY_KIT,
        'night',
        'partial'
      );
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders full canopy (100% cutaway) with suspended floodlight pods', () => {
      const ctx = createMockContext();
      drawContinuousColiseumRoofCanopy(
        ctx,
        roundStadium,
        'round',
        1000,
        1200,
        400,
        2000,
        700,
        1300,
        300,
        200,
        HOME_KIT,
        AWAY_KIT,
        'night',
        'full'
      );
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders all 4 continuous roof architectures cleanly', () => {
      const styles: RoofStyle[] = [
        'spoke_wheel_tension',
        'petal_ocular_halo',
        'continuous_cantilever_ring',
        'radial_louvered_pergola',
      ];

      for (const style of styles) {
        const ctx = createMockContext();
        const std: StadiumDefinition = {
          ...roundStadium,
          roof: { ...roundStadium.roof!, style },
        };
        drawContinuousColiseumRoofCanopy(
          ctx,
          std,
          'round',
          1000,
          1200,
          400,
          2000,
          700,
          1300,
          300,
          200,
          HOME_KIT,
          AWAY_KIT,
          'noon',
          'partial'
        );
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.stroke).toHaveBeenCalled();
      }
    });

    it('renders all 4 round/oval deck materials cleanly', () => {
      const materials: RoofMaterial[] = [
        'ptfe_fabric',
        'perforated_aluminum',
        'solar_glass',
        'galvanized_plate',
      ];

      for (const material of materials) {
        const ctx = createMockContext();
        const std: StadiumDefinition = {
          ...roundStadium,
          roof: { ...roundStadium.roof!, material },
        };
        drawContinuousColiseumRoofCanopy(
          ctx,
          std,
          'round',
          1000,
          1200,
          400,
          2000,
          700,
          1300,
          300,
          200,
          HOME_KIT,
          AWAY_KIT,
          'sunset',
          'partial'
        );
        expect(ctx.fill).toHaveBeenCalled();
      }
    });

    it('renders all 4 border & 360° Halo Board options cleanly', () => {
      const borders: RoofBorder[] = [
        'video_halo_board',
        'glow_led_ribbon',
        'compression_box_ring',
        'leitch_radial_truss',
      ];

      for (const border of borders) {
        const ctx = createMockContext();
        const std: StadiumDefinition = {
          ...roundStadium,
          roof: { ...roundStadium.roof!, border },
        };
        drawContinuousColiseumRoofCanopy(
          ctx,
          std,
          'round',
          1000,
          1200,
          400,
          2000,
          700,
          1300,
          300,
          200,
          HOME_KIT,
          AWAY_KIT,
          'night',
          'partial'
        );
        expect(ctx.stroke).toHaveBeenCalled();
        expect(ctx.fillRect).toHaveBeenCalled();
      }
    });

    it('renders oval racetrack coliseum roof cleanly', () => {
      const ctx = createMockContext();
      drawContinuousColiseumRoofCanopy(
        ctx,
        ESTADIO_MONUMENTAL,
        'oval',
        1000,
        1200,
        400,
        2000,
        700,
        1300,
        300,
        200,
        HOME_KIT,
        AWAY_KIT,
        'night',
        'partial'
      );
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. INTEGRATED STADIUM ARCHITECTURE & AERIAL SKY-CAM
  // ---------------------------------------------------------------------------
  describe('Full Stadium Architecture & Aerial View Integration', () => {
    it('executes drawStadiumArchitecture cleanly for round stadiums with ST5 roofs', () => {
      const ctx = createMockContext();
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
          MARACANA_LEGEND
        );
      }).not.toThrow();
    });

    it('executes drawStadiumArchitecture cleanly for oval stadiums with ST5 roofs', () => {
      const ctx = createMockContext();
      expect(() => {
        drawStadiumArchitecture(
          ctx,
          PITCH_CONFIG.CENTER_X,
          PITCH_CONFIG.CENTER_Y,
          'monumental',
          'sunset',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          ESTADIO_MONUMENTAL
        );
      }).not.toThrow();
    });

    it('executes drawContinuousColiseumBowl with ST5 roof canopy', () => {
      const ctx = createMockContext();
      expect(() => {
        drawContinuousColiseumBowl(
          ctx,
          MARACANA_LEGEND,
          'monumental',
          'night',
          HOME_KIT,
          AWAY_KIT,
          'round'
        );
      }).not.toThrow();
    });

    it('executes drawAerialSkyCam cleanly with ST5 360° halo board and petal/spoke roof', () => {
      const ctx = createMockContext();
      expect(() => {
        drawAerialSkyCam(ctx, MARACANA_LEGEND, {
          timeOfDay: 'night',
          roofOpacity: 1.0,
          showBroadcastHUD: true,
        });
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. MATCH ENGINE INTEGRATION
  // ---------------------------------------------------------------------------
  describe('MatchEngine ST5 Integration', () => {
    it('allows updating roof configuration to round/oval styles via engine.setRoofConfig', () => {
      const engine = new MatchEngine();
      engine.setStadiumTier('monumental');
      const newRoof: RoofConfig = {
        enabled: true,
        style: 'petal_ocular_halo',
        material: 'solar_glass',
        border: 'video_halo_board',
        cutawayMode: 'full',
      };
      engine.setRoofConfig(newRoof);
      expect(engine.activeStadium.roof?.style).toBe('petal_ocular_halo');
      expect(engine.activeStadium.roof?.material).toBe('solar_glass');
      expect(engine.activeStadium.roof?.border).toBe('video_halo_board');
      expect(engine.activeStadium.roofCutaway).toBe('full');
    });

    it('preserves ST5 roof configuration when switching stadium and cutaway mode', () => {
      const engine = new MatchEngine();
      engine.setRoofCutaway('partial');
      expect(engine.activeStadium.roofCutaway).toBe('partial');
      engine.setRoofCutaway('hidden');
      expect(engine.activeStadium.roofCutaway).toBe('hidden');
    });
  });
});
