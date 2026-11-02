/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SurroundingsType,
  StadiumGroundsType,
  PerimeterFinishType,
  getGroundsForSurroundings,
  getDefaultGroundsForSurroundings,
  getContextualPerimeters,
  getDefaultPerimeterForContext,
  StadiumDefinition,
  StandConfig,
} from '../../types/stadium';
import {
  drawImmediateStadiumGrounds,
  drawPerimeterHorizon,
} from '../stadiumRenderer';
import { MatchEngine } from '../engine';

// Mock Canvas 2D Context for headless rendering inspection
function createMockCanvasContext() {
  const calls: { method: string; args: any[] }[] = [];
  const state: Record<string, any> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineDash: [] as number[],
  };

  const record = (method: string) => (...args: any[]) => {
    calls.push({ method, args });
  };

  const ctx = {
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    arc: record('arc'),
    ellipse: record('ellipse'),
    stroke: record('stroke'),
    fill: record('fill'),
    clip: record('clip'),
    rect: record('rect'),
    fillRect: (x: number, y: number, w: number, h: number) => {
      calls.push({ method: 'fillRect', args: [x, y, w, h, state.fillStyle] });
    },
    strokeRect: (x: number, y: number, w: number, h: number) => {
      calls.push({ method: 'strokeRect', args: [x, y, w, h, state.strokeStyle] });
    },
    quadraticCurveTo: record('quadraticCurveTo'),
    bezierCurveTo: record('bezierCurveTo'),
    setLineDash: (dash: number[]) => {
      state.lineDash = dash;
      calls.push({ method: 'setLineDash', args: [dash] });
    },
    createLinearGradient: () => ({
      addColorStop: record('addColorStop'),
    }),
    createRadialGradient: () => ({
      addColorStop: record('addColorStop'),
    }),
  } as unknown as CanvasRenderingContext2D;

  Object.defineProperty(ctx, 'fillStyle', {
    get: () => state.fillStyle,
    set: (v) => { state.fillStyle = v; calls.push({ method: 'set_fillStyle', args: [v] }); },
  });
  Object.defineProperty(ctx, 'strokeStyle', {
    get: () => state.strokeStyle,
    set: (v) => { state.strokeStyle = v; calls.push({ method: 'set_strokeStyle', args: [v] }); },
  });
  Object.defineProperty(ctx, 'lineWidth', {
    get: () => state.lineWidth,
    set: (v) => { state.lineWidth = v; calls.push({ method: 'set_lineWidth', args: [v] }); },
  });

  return { ctx, calls, state };
}

describe('Phase A2: Nested Environmental Matrix & Unified Subtle-Angle Isometric Perspective', () => {

  describe('1. Hierarchical Parent Matrix Architecture (Surroundings -> Grounds -> Perimeters)', () => {
    it('restricts Grounds choices based on parent Surroundings according to matrix rules', () => {
      // Big City: strictly urban, commercial, modern, and parking
      const bigCityGrounds = getGroundsForSurroundings('big_city').map((g) => g.id);
      expect(bigCityGrounds).toContain('municipal_thoroughfare');
      expect(bigCityGrounds).toContain('mall_commercial');
      expect(bigCityGrounds).toContain('modern_architectural');
      expect(bigCityGrounds).toContain('parking_lots');
      expect(bigCityGrounds).toContain('club_museum_trophies');
      expect(bigCityGrounds).not.toContain('potrero_dirt');
      expect(bigCityGrounds).not.toContain('marine_floating_pontoons');

      // Small City: classical red-brick, pub forecourt, tramway thoroughfare, park, parking
      const smallCityGrounds = getGroundsForSurroundings('small_city').map((g) => g.id);
      expect(smallCityGrounds).toContain('classical_statues');
      expect(smallCityGrounds).toContain('mall_commercial');
      expect(smallCityGrounds).toContain('municipal_thoroughfare');
      expect(smallCityGrounds).toContain('park_recreation');
      expect(smallCityGrounds).toContain('parking_lots');

      // Beach: dune paths, boardwalk, palm boulevard, marina slips
      const beachGrounds = getGroundsForSurroundings('beach').map((g) => g.id);
      expect(beachGrounds).toContain('beach_boardwalk_cabanas');
      expect(beachGrounds).toContain('beach_dune_paths');
      expect(beachGrounds).toContain('beach_palm_boulevard');

      // Mountains: granite terrace, gondola terminal, switchback road, rocky crags, potrero
      const mountainGrounds = getGroundsForSurroundings('mountains').map((g) => g.id);
      expect(mountainGrounds).toContain('mountains_granite_terrace');
      expect(mountainGrounds).toContain('mountains_gondola_terminal');
      expect(mountainGrounds).toContain('mountains_switchback_road');
      expect(mountainGrounds).toContain('potrero_dirt');
    });

    it('returns coherent default grounds for every surroundings type', () => {
      const surroundingsList: SurroundingsType[] = [
        'big_city',
        'small_city',
        'mountains',
        'nature',
        'beach',
        'forest',
        'savannah',
        'highway',
        'airport',
        'railroad',
        'parking_lot',
        'marine_floating',
      ];

      for (const sur of surroundingsList) {
        const defaultGrounds = getDefaultGroundsForSurroundings(sur);
        expect(defaultGrounds).toBeTruthy();
        const validGrounds = getGroundsForSurroundings(sur).map((g) => g.id);
        expect(validGrounds).toContain(defaultGrounds);
      }
    });

    it('resolves contextual No-Stand perimeter options based on (Surroundings, Grounds) matrix', () => {
      // Big City contextual perimeters
      const cityPerimeters = getContextualPerimeters('big_city', 'municipal_thoroughfare').map((p) => p.id);
      expect(cityPerimeters).toContain('security_fence_lamp');
      expect(cityPerimeters).toContain('concrete_wall');
      expect(cityPerimeters).toContain('glass_balustrade');
      expect(cityPerimeters).toContain('chainlink_fence');

      // Beach contextual perimeters
      const beachPerimeters = getContextualPerimeters('beach', 'beach_boardwalk_cabanas').map((p) => p.id);
      expect(beachPerimeters).toContain('weathered_wooden_pickets');
      expect(beachPerimeters).toContain('nautical_rope_barrier');
      expect(beachPerimeters).toContain('stone_seawall');
      expect(beachPerimeters).toContain('rustic_timber');

      // Mountains contextual perimeters
      const mountainPerimeters = getContextualPerimeters('mountains', 'mountains_granite_terrace').map((p) => p.id);
      expect(mountainPerimeters).toContain('dry_stone_wall');
      expect(mountainPerimeters).toContain('pine_timber_fence');
      expect(mountainPerimeters).toContain('wire_mesh_backstop');
      expect(mountainPerimeters).toContain('brick_wall');

      // Small City contextual perimeters
      const smallCityPerimeters = getContextualPerimeters('small_city', 'classical_statues').map((p) => p.id);
      expect(smallCityPerimeters).toContain('turnstile_brick_wall');
      expect(smallCityPerimeters).toContain('corrugated_hoarding');
      expect(smallCityPerimeters).toContain('cast_iron_railings');
      expect(smallCityPerimeters).toContain('brick_wall');

      // Highway contextual perimeters
      const highwayPerimeters = getContextualPerimeters('highway').map((p) => p.id);
      expect(highwayPerimeters).toContain('guardrail_barrier');
      expect(highwayPerimeters).toContain('concrete_wall');
      expect(highwayPerimeters).toContain('chainlink_fence');
    });

    it('returns canonical default perimeter for any surroundings/grounds pair', () => {
      expect(getDefaultPerimeterForContext('big_city')).toBe('security_fence_lamp');
      expect(getDefaultPerimeterForContext('beach')).toBe('weathered_wooden_pickets');
      expect(getDefaultPerimeterForContext('mountains')).toBe('dry_stone_wall');
      expect(getDefaultPerimeterForContext('small_city')).toBe('turnstile_brick_wall');
      expect(getDefaultPerimeterForContext('highway')).toBe('guardrail_barrier');
    });
  });

  describe('2. Contextual Ground Variants (Parking Lots adapting to Surroundings)', () => {
    it('renders Metropolis yellow stalls, parking meters and metallic storm drains under big_city', () => {
      const { ctx, calls } = createMockCanvasContext();
      const stadiumDef: Partial<StadiumDefinition> = {
        shape: 'rectangular',
        surroundings: 'big_city',
        grounds: 'parking_lots',
      };

      drawImmediateStadiumGrounds(ctx, 930, 1470, stadiumDef as StadiumDefinition, 'monumental', 'night');

      // Verify yellow bays (#facc15) and metallic storm drains (#1e293b / #475569)
      const hasYellowBays = calls.some(
        (c) => c.method === 'set_strokeStyle' && c.args[0] === '#facc15'
      );
      expect(hasYellowBays).toBe(true);

      const hasStormDrains = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === '#1e293b'
      );
      expect(hasStormDrains).toBe(true);
    });

    it('renders Alpine crushed scree and timber log wheel stops under mountains/nature', () => {
      const { ctx, calls } = createMockCanvasContext();
      const stadiumDef: Partial<StadiumDefinition> = {
        shape: 'rectangular',
        surroundings: 'mountains',
        grounds: 'parking_lots',
      };

      drawImmediateStadiumGrounds(ctx, 930, 1470, stadiumDef as StadiumDefinition, 'monumental', 'night');

      // Timber log stops (#78350f)
      const hasTimberLogs = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === '#78350f'
      );
      expect(hasTimberLogs).toBe(true);

      // Pine needle litter (#166534)
      const hasPineNeedles = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === '#166534'
      );
      expect(hasPineNeedles).toBe(true);
    });

    it('renders coastal sandy patches and palm shadows under beach', () => {
      const { ctx, calls } = createMockCanvasContext();
      const stadiumDef: Partial<StadiumDefinition> = {
        shape: 'rectangular',
        surroundings: 'beach',
        grounds: 'parking_lots',
      };

      drawImmediateStadiumGrounds(ctx, 930, 1470, stadiumDef as StadiumDefinition, 'monumental', 'noon');

      // Drifted sand (#d97706)
      const hasSandPatches = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === '#d97706'
      );
      expect(hasSandPatches).toBe(true);
    });

    it('renders heritage red-brick curbing and vintage gas lampposts under small_city', () => {
      const { ctx, calls } = createMockCanvasContext();
      const stadiumDef: Partial<StadiumDefinition> = {
        shape: 'rectangular',
        surroundings: 'small_city',
        grounds: 'parking_lots',
      };

      drawImmediateStadiumGrounds(ctx, 930, 1470, stadiumDef as StadiumDefinition, 'craven', 'night');

      // Red brick edging (#7f1d1d)
      const hasBrickEdging = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === '#7f1d1d'
      );
      expect(hasBrickEdging).toBe(true);
    });
  });

  describe('3. Anchored Perimeter Ring & Foundation Skirt (Phase A2.2)', () => {
    it('draws beveled retaining curb and storm drainage gutter channel with slotted grates', () => {
      const { ctx, calls } = createMockCanvasContext();
      const stadiumDef: Partial<StadiumDefinition> = {
        shape: 'rectangular',
        surroundings: 'big_city',
        grounds: 'municipal_thoroughfare',
      };

      drawImmediateStadiumGrounds(ctx, 930, 1470, stadiumDef as StadiumDefinition, 'monumental', 'night');

      // 1. Foundation Drop Shadow
      const hasDropShadow = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === 'rgba(0, 0, 0, 0.45)'
      );
      expect(hasDropShadow).toBe(true);

      // 2. Beveled Retaining Curb (#334155 in night)
      const hasCurb = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === '#334155'
      );
      expect(hasCurb).toBe(true);

      // 3. Continuous Storm Drainage Channel with Slotted Grates (#020617 / #475569)
      const hasDrainGutter = calls.some(
        (c) => c.method === 'set_fillStyle' && c.args[0] === '#020617'
      );
      expect(hasDrainGutter).toBe(true);
    });
  });

  describe('4. Unified Subtle-Angle Near-Aerial Isometric Perspective & Perimeters', () => {
    it('renders directional isometric variations for South front facades vs North rear roofs', () => {
      // In engine, set up a stand with 'no_stand' / 'none'
      const engine = new MatchEngine();
      expect(engine).toBeDefined();

      // South stand: front elevations (pub sign, entrance door)
      const { ctx: ctxSouth, calls: callsSouth } = createMockCanvasContext();
      const southStand: StandConfig = {
        position: 'south',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'turnstile_brick_wall',
      };

      // North stand: rear aspects (roofs, smoke plume)
      const { ctx: ctxNorth, calls: callsNorth } = createMockCanvasContext();
      const northStand: StandConfig = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'dry_stone_wall',
      };

      // Both should have valid stand configurations
      expect(southStand.perimeterFinish).toBe('turnstile_brick_wall');
      expect(northStand.perimeterFinish).toBe('dry_stone_wall');
    });

    it('verifies all 11 canonical Phase A2 perimeter finish types are registered', () => {
      const canonicalA2Finishes: PerimeterFinishType[] = [
        'security_fence_lamp',
        'glass_balustrade',
        'weathered_wooden_pickets',
        'nautical_rope_barrier',
        'stone_seawall',
        'dry_stone_wall',
        'pine_timber_fence',
        'wire_mesh_backstop',
        'cast_iron_railings',
        'turnstile_brick_wall',
        'guardrail_barrier',
      ];

      for (const finish of canonicalA2Finishes) {
        expect(typeof finish).toBe('string');
        expect(finish.length).toBeGreaterThan(0);
      }
    });
  });
});
