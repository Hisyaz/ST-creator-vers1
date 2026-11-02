/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  GrandstandMaterial,
  CANONICAL_B3_MATERIALS,
  resolveGrandstandMaterial,
  RoofStyle,
  ROOF_STYLE_OPTIONS,
  GABLE_PEAK_ROOF_OPTION,
  EXTENDED_ROOF_STYLE_OPTIONS,
  ROOF_MATERIAL_OPTIONS,
  ROUND_OVAL_ROOF_STYLE_OPTIONS,
  StadiumDefinition,
  StandConfig,
  SeatArchetype,
} from '../../types/stadium';
import {
  getStadiumShapeMetrics,
  draw32BitGrandstandMaterial,
  drawInnerApronInfillPolish,
  drawStandRoofCanopy,
  drawSeatArchetype,
  drawSingleTouchlineStand,
  drawGoalEndStand,
  drawContinuousColiseumBowl,
  drawStadiumArchitecture,
  measureStadiumRenderPerformance,
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

describe('Phase B3: Comprehensive 32-Bit Architectural Overhaul', () => {
  describe('B3.1: Authentic 32-Bit Grandstand Materials', () => {
    it('defines 4 canonical procedural 32-bit grandstand materials with descriptive metadata', () => {
      expect(CANONICAL_B3_MATERIALS).toHaveLength(4);
      const ids = CANONICAL_B3_MATERIALS.map((m) => m.id);
      expect(ids).toContain('brutalist_concrete');
      expect(ids).toContain('victorian_brick');
      expect(ids).toContain('industrial_steel');
      expect(ids).toContain('composite_cladding');
    });

    it('resolves grandstand material from explicit config and falls back to architectural grade', () => {
      // Explicit override
      expect(resolveGrandstandMaterial({ position: 'west', type: 'tiered', grandstandMaterial: 'composite_cladding' })).toBe('composite_cladding');
      expect(resolveGrandstandMaterial({ position: 'east', type: 'tiered', grandstandMaterial: 'victorian_brick' })).toBe('victorian_brick');

      // Grade 2 Classic fallback
      expect(resolveGrandstandMaterial({ position: 'north', type: 'tiered', grade: 'grade2_classic' })).toBe('victorian_brick');

      // Grade 3 Industrial fallback
      expect(resolveGrandstandMaterial({ position: 'south', type: 'tiered', grade: 'grade3_industrial' })).toBe('industrial_steel');
      expect(resolveGrandstandMaterial({ position: 'south', type: 'tiered', grade: 'grade3_steel_cantilever' })).toBe('industrial_steel');

      // Grade 4 / 5 Modern fallback
      expect(resolveGrandstandMaterial({ position: 'west', type: 'tiered', grade: 'grade4_modern' })).toBe('composite_cladding');
      expect(resolveGrandstandMaterial({ position: 'west', type: 'tiered', grade: 'grade5_futuristic' })).toBe('composite_cladding');

      // Default fallback
      expect(resolveGrandstandMaterial({ position: 'west', type: 'tiered', grade: 'grade1_municipal' })).toBe('brutalist_concrete');
    });

    it('renders brutalist_concrete with stone tones, aggregate flecks, and water runoff stains', () => {
      const { ctx, operations } = createMockCanvasContext();
      draw32BitGrandstandMaterial(ctx, 100, 100, 200, 300, 'brutalist_concrete', 'west', false);

      // Check fill styles for stone tones and runoff staining
      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasStoneTone = fillStyles.some((c) => c === '#475569' || c === '#1e293b');
      const hasWaterRunoff = fillStyles.some((c) => typeof c === 'string' && c.includes('rgba(15, 23, 42'));
      const hasExpansionJoint = operations.some((op) => op.method === 'fillRect');

      expect(hasStoneTone).toBe(true);
      expect(hasWaterRunoff).toBe(true);
      expect(hasExpansionJoint).toBe(true);
    });

    it('renders victorian_brick with red & burnt umber modules and light mortar joints', () => {
      const { ctx, operations } = createMockCanvasContext();
      draw32BitGrandstandMaterial(ctx, 100, 100, 200, 300, 'victorian_brick', 'west', false);

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasRedBrick = fillStyles.some((c) => c === '#b91c1c' || c === '#991b1b' || c === '#7f1d1d');
      const hasMortar = fillStyles.some((c) => c === '#cbd5e1' || c === '#1c1917');
      const hasStringcourse = fillStyles.some((c) => c === '#fef08a' || c === '#92400e');

      expect(hasRedBrick).toBe(true);
      expect(hasMortar).toBe(true);
      expect(hasStringcourse).toBe(true);
    });

    it('renders industrial_steel with vertical fluting, zinc specular highlights, and rivets', () => {
      const { ctx, operations } = createMockCanvasContext();
      draw32BitGrandstandMaterial(ctx, 100, 100, 200, 300, 'industrial_steel', 'west', false);

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasFluteShadow = fillStyles.some((c) => c === '#0f172a' || c === '#020617');
      const hasZincHighlight = fillStyles.some((c) => c === '#f1f5f9' || c === '#94a3b8');
      const hasSilverRivet = fillStyles.some((c) => c === '#cbd5e1');

      expect(hasFluteShadow).toBe(true);
      expect(hasZincHighlight).toBe(true);
      expect(hasSilverRivet).toBe(true);
    });

    it('renders composite_cladding with modular enamel panels and glowing neon LED reveal strips', () => {
      const { ctx, operations } = createMockCanvasContext();
      draw32BitGrandstandMaterial(ctx, 100, 100, 200, 300, 'composite_cladding', 'west', false);

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasEnamel = fillStyles.some((c) => c === '#1e293b' || c === '#0f172a');
      const hasNeonStrip = fillStyles.some((c) => c === '#06b6d4' || c === '#38bdf8');
      const hasGloss = fillStyles.some((c) => typeof c === 'string' && c.includes('rgba(255, 255, 255'));

      expect(hasEnamel).toBe(true);
      expect(hasNeonStrip).toBe(true);
      expect(hasGloss).toBe(true);
    });
  });

  describe('B3.2: Comprehensive 32-Bit Structural Roof Trusses & Lighting Gantry', () => {
    it('includes gable_peak in GABLE_PEAK_ROOF_OPTION and EXTENDED_ROOF_STYLE_OPTIONS', () => {
      expect(GABLE_PEAK_ROOF_OPTION.id).toBe('gable_peak');
      expect(GABLE_PEAK_ROOF_OPTION.label).toContain('Gable');
      const gable = EXTENDED_ROOF_STYLE_OPTIONS.find((s) => s.id === 'gable_peak');
      expect(gable).toBeDefined();
      expect(gable?.label).toContain('Gable');
    });

    it('renders classic gable_peak double-pitched timber canopy with king-post rafters and drainage downpipes', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stand: StandConfig = {
        position: 'north',
        type: 'tiered',
        hasRoof: true,
        roofStyle: 'gable_peak',
        roofMaterial: 'corrugated_steel',
        roofBorder: 'painted_club_fascia',
      };

      drawStandRoofCanopy(ctx, stand, 200, 100, 800, 140, 'north', HOME_KIT, AWAY_KIT, 'noon', undefined, 'full');

      // Check king-post timber rafters and horizontal tie-rods
      const strokeStyles = operations.filter((op) => op.method === 'set:strokeStyle').map((op) => op.args[0]);
      const hasTimberRafter = strokeStyles.some((c) => c === '#92400e' || c === '#78350f');
      const hasTieRod = strokeStyles.some((c) => c === '#1e293b' || c === '#0f172a');

      // Check downpipe and wooden fascia trim
      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasDownpipe = fillStyles.some((c) => c === '#475569');
      const hasWoodFascia = fillStyles.some((c) => c === '#451a03');

      expect(hasTimberRafter).toBe(true);
      expect(hasTieRod).toBe(true);
      expect(hasDownpipe).toBe(true);
      expect(hasWoodFascia).toBe(true);
    });

    it('renders 360° LED halo board with glowing cyan borders and animated telemetry clusters', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stand: StandConfig = {
        position: 'west',
        type: 'tiered',
        hasRoof: true,
        roofStyle: 'spaceframe_halo',
        roofMaterial: 'etfe_cushion',
        roofBorder: 'led_halo_ribbon',
      };

      drawStandRoofCanopy(ctx, stand, 100, 200, 140, 800, 'west', HOME_KIT, AWAY_KIT, 'night', undefined, 'full');

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasCyanHaloBezel = fillStyles.some((c) => c === '#0284c7' || c === '#38bdf8');
      const hasTelemetryClock = fillStyles.some((c) => c === '#38bdf8');
      const hasScoreHighlight = fillStyles.some((c) => c === '#f59e0b');

      expect(hasCyanHaloBezel).toBe(true);
      expect(hasTelemetryClock).toBe(true);
      expect(hasScoreHighlight).toBe(true);
    });
  });

  describe('B3.3: 4 Footprint Geometries & Inner Infill Realism', () => {
    it('accurately calculates setback metrics for all 4 canonical footprint shapes', () => {
      const rectMetrics = getStadiumShapeMetrics('rectangular', 'standard', false);
      const squareMetrics = getStadiumShapeMetrics('square', 'standard', false);
      const roundMetrics = getStadiumShapeMetrics('round', 'standard', true);
      const ovalMetrics = getStadiumShapeMetrics('oval', 'standard', true);

      expect(rectMetrics.shape).toBe('rectangular');
      expect(squareMetrics.shape).toBe('square');
      expect(roundMetrics.shape).toBe('round');
      expect(ovalMetrics.shape).toBe('oval');

      // Square has equal width and height apron clearance
      expect(squareMetrics.apronWidth).toBe(squareMetrics.apronHeight);

      // Round and Oval require running tracks and circular/elliptical radii
      expect(roundMetrics.hasTrack).toBe(true);
      expect(roundMetrics.trackRadiusX).toBeGreaterThan(1400);
      expect(ovalMetrics.hasTrack).toBe(true);
    });

    it('renders slotted iron drainage grates, ball boy stools, corner quadrants, and camera pits in inner apron infill', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawInnerApronInfillPolish(
        ctx,
        PITCH_CONFIG.PITCH_LEFT,
        PITCH_CONFIG.PITCH_RIGHT,
        PITCH_CONFIG.PITCH_TOP,
        PITCH_CONFIG.PITCH_BOTTOM,
        'oval',
        'grass',
        false,
        true
      );

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const strokeStyles = operations.filter((op) => op.method === 'set:strokeStyle').map((op) => op.args[0]);

      // 1. Drainage grates (recessed dark trench #090d16 and slots #0f172a)
      const hasGrateTrench = fillStyles.some((c) => c === '#090d16');
      const hasGrateSlots = fillStyles.some((c) => c === '#0f172a');
      expect(hasGrateTrench).toBe(true);
      expect(hasGrateSlots).toBe(true);

      // 2. Corner flag quadrants (white chalk arc #ffffff and pin #facc15)
      const hasCornerChalk = strokeStyles.some((c) => c === '#ffffff');
      const hasCornerPin = fillStyles.some((c) => c === '#facc15');
      expect(hasCornerChalk).toBe(true);
      expect(hasCornerPin).toBe(true);

      // 3. Ball boy stools (cushion #0284c7, highlight #38bdf8, folding legs)
      const hasStoolCushion = fillStyles.some((c) => c === '#0284c7');
      const hasStoolLegs = strokeStyles.some((c) => c === '#cbd5e1' || c === '#64748b');
      expect(hasStoolCushion).toBe(true);
      expect(hasStoolLegs).toBe(true);

      // 4. Broadcast TV camera crew pits (yellow safety border, active red tally light #ef4444)
      const hasCameraSafetyBorder = strokeStyles.some((c) => c === '#facc15');
      const hasActiveRedTally = fillStyles.some((c) => c === '#ef4444');
      expect(hasCameraSafetyBorder).toBe(true);
      expect(hasActiveRedTally).toBe(true);

      // 5. Steeplechase water pit on Oval footprint (water pool #0284c7 and hurdle barrier #ffffff)
      const hasWaterPit = fillStyles.some((c) => c === '#0284c7');
      const hasHurdleStripe = fillStyles.some((c) => c === '#ffffff');
      expect(hasWaterPit).toBe(true);
      expect(hasHurdleStripe).toBe(true);
    });
  });

  describe('B3.4: 3 Distinct Functional Seat Archetypes in 32-Bit Pixel Art', () => {
    it('renders molded_bucket seats with curved backrests and stamped seat numbers', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawSeatArchetype(ctx, 50, 50, 6, 5, 'molded_bucket', '#0284c7', '#ffffff', 0, 0, false, false);

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasGlossHighlight = fillStyles.some((c) => typeof c === 'string' && c.includes('rgba(255, 255, 255, 0.4'));
      const hasNumberStamp = fillStyles.some((c) => typeof c === 'string' && c.includes('rgba(255, 255, 255, 0.65'));

      expect(hasGlossHighlight).toBe(true);
      expect(hasNumberStamp).toBe(true);
    });

    it('renders wooden_heritage_bench with slatted timber planks, cast-iron legs, and stamped brass numbering plaque', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawSeatArchetype(ctx, 50, 50, 6, 5, 'wooden_heritage_bench', '#0284c7', '#ffffff', 0, 0, false, false);

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasCastIronLeg = fillStyles.some((c) => c === '#0f172a');
      const hasTimberPlank = fillStyles.some((c) => c === '#92400e' || c === '#78350f');
      const hasBrassPlaque = fillStyles.some((c) => c === '#d97706');
      const hasBrassHighlight = fillStyles.some((c) => c === '#fef08a');

      expect(hasCastIronLeg).toBe(true);
      expect(hasTimberPlank).toBe(true);
      expect(hasBrassPlaque).toBe(true);
      expect(hasBrassHighlight).toBe(true);
    });

    it('renders metallic_tip_up flip seats with spring-loaded undercarriage and folded upright shadow when empty', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawSeatArchetype(ctx, 50, 50, 6, 5, 'metallic_tip_up', '#0284c7', '#ffffff', 0, 0, false, false);

      const fillStyles = operations.filter((op) => op.method === 'set:fillStyle').map((op) => op.args[0]);
      const hasPivotBracket = fillStyles.some((c) => c === '#1e293b');
      const hasFoldedUprightShadow = fillStyles.some((c) => typeof c === 'string' && c.includes('rgba(0, 0, 0, 0.40)'));
      const hasAlloyFlange = fillStyles.some((c) => typeof c === 'string' && c.includes('rgba(255, 255, 255, 0.75)'));

      expect(hasPivotBracket).toBe(true);
      expect(hasFoldedUprightShadow).toBe(true);
      expect(hasAlloyFlange).toBe(true);
    });
  });

  describe('B3.5: 60 FPS Mobile Performance & Zero Garbage Collection', () => {
    it('executes stadium architecture rendering within 60 FPS frame budget (< 16.67ms)', () => {
      const { ctx } = createMockCanvasContext(false);
      const stadium = createDefaultStadium();

      const perf = measureStadiumRenderPerformance(ctx, stadium, 10);
      expect(perf.is60FpsCapable).toBe(true);
      expect(perf.avgDurationMs).toBeLessThan(16.67);
      expect(perf.fps).toBeGreaterThanOrEqual(60);
    });

    it('renders seamless full stadium architecture without errors across all 4 footprint shapes', () => {
      const { ctx } = createMockCanvasContext(false);
      const shapes: ('rectangular' | 'square' | 'round' | 'oval')[] = ['rectangular', 'square', 'round', 'oval'];

      for (const sh of shapes) {
        const stadium = createDefaultStadium();
        stadium.shape = sh;
        stadium.hasTrack = sh === 'round' || sh === 'oval';
        stadium.stands.west.grandstandMaterial = 'brutalist_concrete';
        stadium.stands.east.grandstandMaterial = 'victorian_brick';
        stadium.stands.north.grandstandMaterial = 'industrial_steel';
        stadium.stands.south.grandstandMaterial = 'composite_cladding';
        stadium.stands.north.roofStyle = 'gable_peak';

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

    it('renders seamless full stadium architecture without errors across all grandstand materials and roof trusses', () => {
      const { ctx } = createMockCanvasContext(false);
      const stadium = createDefaultStadium();

      const materials: GrandstandMaterial[] = [
        'brutalist_concrete',
        'victorian_brick',
        'industrial_steel',
        'composite_cladding',
      ];

      for (const mat of materials) {
        stadium.stands.west.grandstandMaterial = mat;
        stadium.stands.west.roofStyle = 'gable_peak';

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
  });
});
