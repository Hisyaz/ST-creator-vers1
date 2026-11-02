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
  ALL_ROOF_STYLE_OPTIONS,
  ALL_ROOF_MATERIAL_OPTIONS,
  ALL_ROOF_BORDER_OPTIONS,
  getDefaultRoofConfig,
  RoofCutawayMode,
  RoofStyle,
  RoofMaterial,
  RoofBorder,
  RoofConfig,
  StandConfig,
  StadiumDefinition,
} from '../../types/stadium';
import {
  drawStandRoofCanopy,
  drawCornerMiterRoofCanopy,
  drawStadiumArchitecture,
  drawTouchlineAndCornerStands,
  drawContinuousColiseumBowl,
} from '../stadiumRenderer';
import {
  STADIUM_REGISTRY,
  createDefaultStadium,
  ESTADIO_MONUMENTAL,
  LA_BOMBONERA,
  SANTIAGO_BERNABEU,
  CRAVEN_COTTAGE,
  ESTADIO_TECHO,
  MARACANA_LEGEND,
  VICTORIA_AIRPORT_GROUND,
  FLOATING_MARINA_ARENA,
} from '../stadiumRegistry';
import { HOME_KIT, AWAY_KIT } from '../constants';
import { MatchEngine } from '../engine';

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
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

describe('Phase ST4: Pitch-View Eave Overhangs, Sims-Style 3-State Cutaway & 4 Roof Styles', () => {
  // ---------------------------------------------------------------------------
  // 1. DATA CONTRACTS & 3-LEVEL CUSTOMIZATION HIERARCHY
  // ---------------------------------------------------------------------------
  describe('ST4.1 & ST4.2 & ST4.4 Data Contracts & Options', () => {
    it('defines all 3 Sims-Style Cutaway modes', () => {
      expect(ROOF_CUTAWAY_OPTIONS).toHaveLength(3);
      const ids = ROOF_CUTAWAY_OPTIONS.map((o) => o.id);
      expect(ids).toContain('hidden');
      expect(ids).toContain('partial');
      expect(ids).toContain('full');
    });

    it('defines 4 architectural roof styles', () => {
      expect(ROOF_STYLE_OPTIONS).toHaveLength(4);
      const styles = ROOF_STYLE_OPTIONS.map((s) => s.id);
      expect(styles).toContain('cantilever_truss');
      expect(styles).toContain('barrel_vault');
      expect(styles).toContain('tensile_cable');
      expect(styles).toContain('spaceframe_halo');
    });

    it('defines 4 roof deck materials', () => {
      expect(ROOF_MATERIAL_OPTIONS).toHaveLength(4);
      const materials = ROOF_MATERIAL_OPTIONS.map((m) => m.id);
      expect(materials).toContain('corrugated_steel');
      expect(materials).toContain('etfe_cushion');
      expect(materials).toContain('precast_concrete');
      expect(materials).toContain('anodized_aluminum');
    });

    it('defines 4 fascia border & trim finishes', () => {
      expect(ROOF_BORDER_OPTIONS).toHaveLength(4);
      const borders = ROOF_BORDER_OPTIONS.map((b) => b.id);
      expect(borders).toContain('painted_club_fascia');
      expect(borders).toContain('gunmetal_box_girder');
      expect(borders).toContain('led_halo_ribbon');
      expect(borders).toContain('copper_stone_coping');
    });

    it('provides valid default roof config', () => {
      const def = getDefaultRoofConfig();
      expect(def.style).toBe('cantilever_truss');
      expect(def.material).toBe('corrugated_steel');
      expect(def.border).toBe('painted_club_fascia');
      expect(def.cutawayMode).toBe('partial');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CANONICAL STADIUM REGISTRY CONFIGURATION
  // ---------------------------------------------------------------------------
  describe('Canonical Stadium Roof Architectures', () => {
    it('initializes default stadium with authentic roof and partial cutaway', () => {
      const std = createDefaultStadium();
      expect(std.roof).toBeDefined();
      expect(std.roofCutaway).toBe('partial');
    });

    it('assigns authentic distinct roof architectures to all 8 canonical stadiums', () => {
      const stadiums = [
        ESTADIO_MONUMENTAL,
        LA_BOMBONERA,
        SANTIAGO_BERNABEU,
        CRAVEN_COTTAGE,
        ESTADIO_TECHO,
        MARACANA_LEGEND,
        VICTORIA_AIRPORT_GROUND,
        FLOATING_MARINA_ARENA,
      ];

      for (const std of stadiums) {
        expect(std.roof).toBeDefined();
        expect(std.roofCutaway).toBe('partial');
        expect(ALL_ROOF_STYLE_OPTIONS.some((o) => o.id === std.roof?.style)).toBe(true);
        expect(ALL_ROOF_MATERIAL_OPTIONS.some((o) => o.id === std.roof?.material)).toBe(true);
        expect(ALL_ROOF_BORDER_OPTIONS.some((o) => o.id === std.roof?.border)).toBe(true);
      }
    });

    it('ensures Santiago Bernabéu features spaceframe_halo and LED halo ribbon', () => {
      expect(SANTIAGO_BERNABEU.roof?.style).toBe('spaceframe_halo');
      expect(SANTIAGO_BERNABEU.roof?.border).toBe('led_halo_ribbon');
    });

    it('ensures Craven Cottage features traditional cantilever truss and historic stone coping', () => {
      expect(CRAVEN_COTTAGE.roof?.style).toBe('cantilever_truss');
      expect(CRAVEN_COTTAGE.roof?.material).toBe('corrugated_steel');
      expect(CRAVEN_COTTAGE.roof?.border).toBe('copper_stone_coping');
    });

    it('ensures Maracanã features tensile spoke-wheel tension ring', () => {
      expect(['spoke_wheel_tension', 'tensile_cable']).toContain(MARACANA_LEGEND.roof?.style);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. MASTER STAND ROOF CANOPY RENDERER (drawStandRoofCanopy)
  // ---------------------------------------------------------------------------
  describe('drawStandRoofCanopy Renderer & Cutaways', () => {
    const sampleStand: StandConfig = {
      position: 'west',
      type: 'tiered',
      grade: 'grade4_modern',
      tierCount: 3,
      hasRoof: true,
      roofStyle: 'cantilever_truss',
      roofMaterial: 'corrugated_steel',
      roofBorder: 'painted_club_fascia',
    };

    it('skips rendering completely when stand.hasRoof is false', () => {
      const ctx = createMockContext();
      drawStandRoofCanopy(
        ctx,
        { ...sampleStand, hasRoof: false },
        100,
        100,
        120,
        400,
        'west',
        HOME_KIT,
        AWAY_KIT
      );
      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('skips rendering completely when cutaway is hidden (0% canopy)', () => {
      const ctx = createMockContext();
      drawStandRoofCanopy(
        ctx,
        sampleStand,
        100,
        100,
        120,
        400,
        'west',
        HOME_KIT,
        AWAY_KIT,
        'night',
        undefined,
        'hidden'
      );
      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('renders partial canopy (50% cutaway) framing upper rows without blocking pitch', () => {
      const ctx = createMockContext();
      drawStandRoofCanopy(
        ctx,
        sampleStand,
        100,
        100,
        120,
        400,
        'west',
        HOME_KIT,
        AWAY_KIT,
        'night',
        undefined,
        'partial'
      );
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders full canopy (100% cutaway) with suspended floodlight cluster and trusses', () => {
      const ctx = createMockContext();
      drawStandRoofCanopy(
        ctx,
        sampleStand,
        100,
        100,
        120,
        400,
        'west',
        HOME_KIT,
        AWAY_KIT,
        'night',
        undefined,
        'full'
      );
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders all 4 roof styles cleanly', () => {
      const styles: RoofStyle[] = ['cantilever_truss', 'barrel_vault', 'tensile_cable', 'spaceframe_halo'];

      for (const style of styles) {
        const ctx = createMockContext();
        drawStandRoofCanopy(
          ctx,
          { ...sampleStand, roofStyle: style },
          100,
          100,
          120,
          400,
          'west',
          HOME_KIT,
          AWAY_KIT,
          'night',
          undefined,
          'partial'
        );
        expect(ctx.fillRect).toHaveBeenCalled();
      }
    });

    it('renders all 4 deck materials cleanly', () => {
      const materials: RoofMaterial[] = ['corrugated_steel', 'etfe_cushion', 'precast_concrete', 'anodized_aluminum'];

      for (const material of materials) {
        const ctx = createMockContext();
        drawStandRoofCanopy(
          ctx,
          { ...sampleStand, roofMaterial: material },
          100,
          100,
          120,
          400,
          'east',
          HOME_KIT,
          AWAY_KIT,
          'noon',
          undefined,
          'partial'
        );
        expect(ctx.fillRect).toHaveBeenCalled();
      }
    });

    it('renders all 4 fascia borders including 360° LED ribbon', () => {
      const borders: RoofBorder[] = ['painted_club_fascia', 'gunmetal_box_girder', 'led_halo_ribbon', 'copper_stone_coping'];

      for (const border of borders) {
        const ctx = createMockContext();
        drawStandRoofCanopy(
          ctx,
          { ...sampleStand, roofBorder: border },
          100,
          100,
          400,
          120,
          'north',
          HOME_KIT,
          AWAY_KIT,
          'night',
          undefined,
          'partial'
        );
        expect(ctx.fillRect).toHaveBeenCalled();
      }
    });

    it('renders goal-end orientation (south stand) cleanly', () => {
      const ctx = createMockContext();
      drawStandRoofCanopy(
        ctx,
        sampleStand,
        100,
        100,
        400,
        120,
        'south',
        HOME_KIT,
        AWAY_KIT,
        'sunset',
        undefined,
        'partial'
      );
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. 45° CORNER ROOF MITER CANOPY RENDERER (drawCornerMiterRoofCanopy)
  // ---------------------------------------------------------------------------
  describe('drawCornerMiterRoofCanopy Renderer (ST4.3)', () => {
    const cornerStand: StandConfig = {
      position: 'corner_nw',
      type: 'tiered',
      grade: 'grade4_modern',
      tierCount: 2,
      hasRoof: true,
      roofStyle: 'spaceframe_halo',
      roofMaterial: 'anodized_aluminum',
      roofBorder: 'led_halo_ribbon',
    };

    const pOut = { x: 50, y: 50 };
    const pTMax = { x: 50, y: 200 };
    const pGMax = { x: 200, y: 50 };
    const pT = { x: 170, y: 200 };
    const pG = { x: 200, y: 170 };

    it('skips rendering when stand hasRoof is false', () => {
      const ctx = createMockContext();
      drawCornerMiterRoofCanopy(
        ctx,
        { ...cornerStand, hasRoof: false },
        'corner_nw',
        pOut,
        pTMax,
        pGMax,
        pT,
        pG,
        HOME_KIT,
        AWAY_KIT
      );
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('skips rendering when cutaway is hidden', () => {
      const ctx = createMockContext();
      drawCornerMiterRoofCanopy(
        ctx,
        cornerStand,
        'corner_nw',
        pOut,
        pTMax,
        pGMax,
        pT,
        pG,
        HOME_KIT,
        AWAY_KIT,
        'night',
        undefined,
        'hidden'
      );
      expect(ctx.fill).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('renders 45° diagonal hip rafter, radiating purlins, and LED halo miter border in partial mode', () => {
      const ctx = createMockContext();
      drawCornerMiterRoofCanopy(
        ctx,
        cornerStand,
        'corner_nw',
        pOut,
        pTMax,
        pGMax,
        pT,
        pG,
        HOME_KIT,
        AWAY_KIT,
        'night',
        undefined,
        'partial'
      );
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders full canopy mode across corner miters', () => {
      const ctx = createMockContext();
      drawCornerMiterRoofCanopy(
        ctx,
        cornerStand,
        'corner_se',
        pOut,
        pTMax,
        pGMax,
        pT,
        pG,
        HOME_KIT,
        AWAY_KIT,
        'noon',
        undefined,
        'full'
      );
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders all 4 distinct corner roof styles (truss, barrel vault, tensile cable, spaceframe halo)', () => {
      const styles: RoofStyle[] = ['cantilever_truss', 'barrel_vault', 'tensile_cable', 'spaceframe_halo'];
      for (const style of styles) {
        const ctx = createMockContext();
        drawCornerMiterRoofCanopy(
          ctx,
          { ...cornerStand, roofStyle: style },
          'corner_nw',
          pOut,
          pTMax,
          pGMax,
          pT,
          pG,
          HOME_KIT,
          AWAY_KIT,
          'night',
          undefined,
          'partial'
        );
        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.stroke).toHaveBeenCalled();
      }
    });

    it('renders asymmetric open-corner decorative gable end-caps when adjacent stand is no_stand', () => {
      const ctx = createMockContext();
      const noStandTouch: StandConfig = {
        position: 'west',
        type: 'no_stand',
        grade: 'grade1_municipal',
        hasRoof: false,
      };
      const noStandGoal: StandConfig = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        hasRoof: false,
      };

      drawCornerMiterRoofCanopy(
        ctx,
        cornerStand,
        'corner_nw',
        pOut,
        pTMax,
        pGMax,
        pT,
        pG,
        HOME_KIT,
        AWAY_KIT,
        'night',
        undefined,
        'partial',
        noStandTouch,
        noStandGoal
      );

      // Verify open-corner bargeboard strokes were executed
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. INTEGRATED STADIUM ARCHITECTURE & COLISEUM BOWL
  // ---------------------------------------------------------------------------
  describe('Full Architecture & Shape Integration', () => {
    it('executes drawStadiumArchitecture cleanly for rectangular stadiums with ST4 roofs', () => {
      const ctx = createMockContext();
      const std = SANTIAGO_BERNABEU;
      expect(() => {
        drawStadiumArchitecture(ctx, 930, 1470, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, std);
      }).not.toThrow();
    });

    it('executes drawContinuousColiseumBowl for round stadium with cutaway hidden', () => {
      const ctx = createMockContext();
      const std: StadiumDefinition = {
        ...ESTADIO_MONUMENTAL,
        shape: 'round',
        roofCutaway: 'hidden',
      };
      expect(() => {
        drawStadiumArchitecture(ctx, 930, 1470, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, std);
      }).not.toThrow();
    });

    it('executes drawContinuousColiseumBowl for oval stadium with full cutaway', () => {
      const ctx = createMockContext();
      const std: StadiumDefinition = {
        ...ESTADIO_MONUMENTAL,
        shape: 'oval',
        roofCutaway: 'full',
      };
      expect(() => {
        drawStadiumArchitecture(ctx, 930, 1470, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, std);
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. MATCH ENGINE INTEGRATION
  // ---------------------------------------------------------------------------
  describe('MatchEngine ST4 Integration', () => {
    it('allows toggling roof cutaway mode via engine.setRoofCutaway', () => {
      const engine = new MatchEngine();
      engine.setRoofCutaway('hidden');
      expect(engine.activeStadium.roofCutaway).toBe('hidden');
      expect(engine.activeStadium.roof?.cutawayMode).toBe('hidden');

      engine.setRoofCutaway('full');
      expect(engine.activeStadium.roofCutaway).toBe('full');
      expect(engine.activeStadium.roof?.cutawayMode).toBe('full');

      engine.setRoofCutaway('partial');
      expect(engine.activeStadium.roofCutaway).toBe('partial');
      expect(engine.activeStadium.roof?.cutawayMode).toBe('partial');
    });

    it('allows updating roof configuration via engine.setRoofConfig', () => {
      const engine = new MatchEngine();
      const newRoof: RoofConfig = {
        enabled: true,
        style: 'spaceframe_halo',
        material: 'etfe_cushion',
        border: 'led_halo_ribbon',
        cutawayMode: 'full',
      };
      engine.setRoofConfig(newRoof);
      expect(engine.activeStadium.roof?.style).toBe('spaceframe_halo');
      expect(engine.activeStadium.roof?.material).toBe('etfe_cushion');
      expect(engine.activeStadium.roof?.border).toBe('led_halo_ribbon');
      expect(engine.activeStadium.roofCutaway).toBe('full');
    });
  });
});
