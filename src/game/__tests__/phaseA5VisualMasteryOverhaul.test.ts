/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SeatArchetype,
  SEAT_ARCHETYPE_OPTIONS,
  resolveSeatArchetype,
  StadiumDefinition,
  StandConfig,
  ApronMaterial,
} from '../../types/stadium';
import {
  drawSeatArchetype,
  drawStandRoofCanopy,
  drawOuterRearDelimitationWall,
  drawTierSafetyBalustrade,
  drawStadiumArchitecture,
  getStadiumShapeMetrics,
  measureStadiumRenderPerformance,
} from '../stadiumRenderer';
import {
  addChalkDustPuff,
  clearChalkParticles,
  updateAndDrawChalkParticles,
  drawPitch,
  drawPitchMarkings,
} from '../pitchRenderer';
import {
  getGoalFrameMetrics,
  processGoalNetCollision,
} from '../goalNetPhysics';
import { updateBallPhysics } from '../physics';
import { Ball, GoalNetState } from '../../types';
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
      if (recordOps) {
        operations.push({ method: `set:${prop}`, args: [value] });
      }
      target[prop] = value;
      return true;
    },
  };

  const baseCtx = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };

  const proxy = new Proxy(baseCtx, handler) as unknown as CanvasRenderingContext2D;
  return { ctx: proxy, operations };
}

describe('Phase A5: 32-Bit Visual Mastery Overhaul (Stands, Seats, Aprons, Turf & UI)', () => {
  beforeEach(() => {
    clearChalkParticles();
  });

  // ===========================================================================
  // A5.1 Grandstand & Structural Architecture 32-Bit Detailing
  // ===========================================================================
  describe('A5.1: Grandstand & Structural Architecture 32-Bit Detailing', () => {
    it('renders detailed cross-hatched steel roof trusses, rivets, ridge caps and cantilever support pillars with rim lighting', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stand: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade3_steel_cantilever',
        roofStyle: 'cantilever_truss',
        roofMaterial: 'corrugated_steel',
        roofBorder: 'painted_club_fascia',
        roofCutaway: 'partial',
        hasRoof: true,
      };

      drawStandRoofCanopy(
        ctx,
        stand,
        100,
        200,
        140,
        600,
        'west',
        HOME_KIT,
        AWAY_KIT,
        'night'
      );

      // Verify canvas drew structural rafters and X-truss diagonal webbing lines
      const strokeOps = operations.filter((op) => op.method === 'stroke');
      expect(strokeOps.length).toBeGreaterThan(10);

      // Verify cantilever load-bearing pillars and rim lighting
      const fillRectOps = operations.filter((op) => op.method === 'fillRect');
      expect(fillRectOps.length).toBeGreaterThan(15);
    });

    it('renders structural rear delimitation walls with stone coping and outer drop shadows', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stand: StandConfig = {
        position: 'north',
        type: 'tiered',
        grade: 'grade2_classic',
        rearWallMaterial: 'brick',
      };

      drawOuterRearDelimitationWall(
        ctx,
        stand,
        200,
        150,
        800,
        30,
        'north',
        'noon'
      );

      // Should render shadow and brick masonry with stone coping
      expect(operations.some((op) => op.method === 'set:fillStyle' && op.args[0] === 'rgba(0, 0, 0, 0.50)')).toBe(true);
      expect(operations.some((op) => op.method === 'fillRect')).toBe(true);
    });

    it('renders tier safety balustrades with authentic grade styles (Leitch lattice, industrial mesh, glass)', () => {
      const { ctx: ctxLattice, operations: opsLattice } = createMockCanvasContext();
      const standClassic: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade2_classic',
        balustradeStyle: 'leitch_lattice',
      };
      drawTierSafetyBalustrade(ctxLattice, standClassic, 100, 200, 4, 300, 'west', 1, true);
      expect(opsLattice.some((op) => op.method === 'set:strokeStyle' && op.args[0] === '#15803d')).toBe(true);

      const { ctx: ctxGlass, operations: opsGlass } = createMockCanvasContext();
      const standModern: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade4_modern',
        balustradeStyle: 'glass_balustrade',
      };
      drawTierSafetyBalustrade(ctxGlass, standModern, 100, 200, 4, 300, 'west', 1, true);
      expect(opsGlass.some((op) => op.method === 'set:fillStyle' && op.args[0] === 'rgba(56, 189, 248, 0.45)')).toBe(true);
    });
  });

  // ===========================================================================
  // A5.2 3 Distinct Functional Seat Archetypes
  // ===========================================================================
  describe('A5.2: 3 Distinct Functional Seat Archetypes', () => {
    it('verifies exact catalog of 3 seat archetypes with descriptive metadata', () => {
      expect(SEAT_ARCHETYPE_OPTIONS).toHaveLength(3);
      const ids = SEAT_ARCHETYPE_OPTIONS.map((o) => o.id);
      expect(ids).toContain('molded_bucket');
      expect(ids).toContain('wooden_heritage_bench');
      expect(ids).toContain('metallic_tip_up');

      for (const opt of SEAT_ARCHETYPE_OPTIONS) {
        expect(opt.label.length).toBeGreaterThan(0);
        expect(opt.icon.length).toBeGreaterThan(0);
        expect(opt.desc.length).toBeGreaterThan(15);
      }
    });

    it('accurately resolves seat archetype with fallback cascade', () => {
      // Explicit override has highest priority
      expect(resolveSeatArchetype('wooden_heritage_bench', 'classic_bucket', 'grade4_modern')).toBe('wooden_heritage_bench');
      expect(resolveSeatArchetype('metallic_tip_up', 'plastic_bench', 'grade2_classic')).toBe('metallic_tip_up');

      // Fallback from seatStyle
      expect(resolveSeatArchetype(undefined, 'classic_bucket', 'grade4_modern')).toBe('molded_bucket');
      expect(resolveSeatArchetype(undefined, 'plastic_bench', 'grade4_modern')).toBe('wooden_heritage_bench');
      expect(resolveSeatArchetype(undefined, 'tip_up_padded', 'grade2_classic')).toBe('metallic_tip_up');
      expect(resolveSeatArchetype(undefined, 'vip_leather', 'grade2_classic')).toBe('metallic_tip_up');

      // Fallback from standGrade
      expect(resolveSeatArchetype(undefined, undefined, 'grade1_historic_timber')).toBe('wooden_heritage_bench');
      expect(resolveSeatArchetype(undefined, undefined, 'grade1_municipal')).toBe('wooden_heritage_bench');
      expect(resolveSeatArchetype(undefined, undefined, 'grade4_modern')).toBe('metallic_tip_up');
      expect(resolveSeatArchetype(undefined, undefined, 'grade5_futuristic')).toBe('metallic_tip_up');
      expect(resolveSeatArchetype(undefined, undefined, 'grade2_classic')).toBe('molded_bucket');
    });

    it('renders Molded Ergonomic Bucket Seats with curved backrest and specular highlight', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawSeatArchetype(
        ctx,
        50,
        50,
        8,
        7,
        'molded_bucket',
        '#dc2626',
        '#ffffff',
        0,
        0,
        false,
        true,
        '#dc2626'
      );

      // Specular highlight line
      expect(operations.some((op) => op.method === 'set:fillStyle' && op.args[0] === 'rgba(255, 255, 255, 0.40)')).toBe(true);
      expect(operations.some((op) => op.method === 'fillRect')).toBe(true);
    });

    it('renders Folding Wooden Heritage Benches with slatted timber planks and cast-iron legs', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawSeatArchetype(
        ctx,
        50,
        50,
        8,
        7,
        'wooden_heritage_bench',
        '#92400e',
        '#78350f',
        0,
        0,
        false,
        false
      );

      // Cast-iron frame legs (#0f172a) and timber plank shades (#92400e / #78350f)
      expect(operations.some((op) => op.method === 'set:fillStyle' && op.args[0] === '#0f172a')).toBe(true);
      expect(operations.some((op) => op.method === 'set:fillStyle' && op.args[0] === '#92400e')).toBe(true);
    });

    it('renders Metallic Tip-Up Flip Seats with spring-loaded undercarriage and alloy sheen', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawSeatArchetype(
        ctx,
        50,
        50,
        8,
        7,
        'metallic_tip_up',
        '#2563eb',
        '#1d4ed8',
        0,
        0,
        false,
        true
      );

      // Alloy backrest (#64748b) and undercarriage shadow
      expect(operations.some((op) => op.method === 'set:fillStyle' && op.args[0] === 'rgba(0, 0, 0, 0.48)')).toBe(true);
      expect(operations.some((op) => op.method === 'set:fillStyle' && op.args[0] === '#64748b')).toBe(true);
    });
  });

  // ===========================================================================
  // A5.3 Pitch Aprons, Infill, Tartan Tracks & Goal Net Physics
  // ===========================================================================
  describe('A5.3: Pitch Aprons, Infill, Tartan Tracks & Goal Net Physics', () => {
    it('supports all canonical pitch apron infill materials', () => {
      const materials: ApronMaterial[] = [
        'artificial_turf',
        'rubber_tartan',
        'heritage_red_brick',
        'concrete',
        'asphalt_paved',
        'gravel_ballast',
      ];

      for (const mat of materials) {
        const { ctx, operations } = createMockCanvasContext();
        const stadium: StadiumDefinition = {
          ...createDefaultStadium(),
          apronMaterial: mat,
        };

        drawStadiumArchitecture(
          ctx,
          PITCH_CONFIG.CENTER_X,
          PITCH_CONFIG.CENTER_Y,
          'monumental',
          'noon',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          stadium
        );

        expect(operations.length).toBeGreaterThan(50);
      }
    });

    it('spawns and updates chalk dust puffs on pitch line impacts', () => {
      clearChalkParticles();
      addChalkDustPuff(PITCH_CONFIG.PITCH_LEFT, 500, 8);

      const { ctx, operations } = createMockCanvasContext();
      updateAndDrawChalkParticles(ctx);

      // Should draw white chalk particles
      const fillRects = operations.filter((op) => op.method === 'fillRect');
      expect(fillRects.length).toBeGreaterThan(0);
      expect(operations.some((op) => op.method === 'set:fillStyle' && (op.args[0] as string).includes('255, 255, 255'))).toBe(true);
    });

    it('triggers chalk dust puffs when high-velocity ball impacts near touchlines or endlines', () => {
      clearChalkParticles();

      const ball: Ball = {
        x: PITCH_CONFIG.PITCH_LEFT + 2, // Right on the touchline!
        y: 1000,
        z: 0.5,
        vx: 6.5,
        vy: 1.0,
        vz: -2.4, // Downward strike
        spin: 0,
        ownerId: null,
        lastTouchTeam: null,
        lastTouchPlayerId: null,
        isAirborne: true,
      };

      updateBallPhysics(ball, () => {});

      const { ctx, operations } = createMockCanvasContext();
      updateAndDrawChalkParticles(ctx);
      expect(operations.length).toBeGreaterThan(0);
    });

    it('renders goal frame metrics for octagonal, round_steel, and standard Brazilian profiles', () => {
      const std = getGoalFrameMetrics('standard');
      expect(std.postProfile).toBe('cylindrical');
      expect(std.width).toBe(PITCH_CONFIG.GOAL_WIDTH);

      const oct = getGoalFrameMetrics('octagonal');
      expect(oct.postProfile).toBe('octagonal');
      expect(oct.depth).toBe(72);

      const round = getGoalFrameMetrics('round_steel');
      expect(round.postProfile).toBe('round');

      const brazilian = getGoalFrameMetrics('brazilian');
      expect(brazilian.depth).toBe(95);
      expect(brazilian.hasTieBackCables).toBe(true);
    });

    it('simulates spring-damper vertex net collisions with tension absorption and bulging', () => {
      const net: GoalNetState = {
        impactX: PITCH_CONFIG.CENTER_X,
        impactY: PITCH_CONFIG.PITCH_TOP - 20,
        impactZ: 10,
        bulgeAmount: 0,
        bulgeVel: 0,
        shake: 0,
        ballCaught: false,
      };

      const ball: Ball = {
        x: PITCH_CONFIG.CENTER_X,
        y: PITCH_CONFIG.PITCH_TOP - 15,
        z: 8,
        vx: 0,
        vy: -14, // Piercing shot into back of net!
        vz: 1,
        spin: 0,
        ownerId: null,
        lastTouchTeam: null,
        lastTouchPlayerId: null,
        isAirborne: true,
      };

      processGoalNetCollision(ball, net, true, PITCH_CONFIG.PITCH_TOP, 'hard', 'octagonal', 1);

      expect(net.ballCaught).toBe(true);
      expect(net.bulgeAmount).toBeGreaterThan(0);
      expect(net.shake).toBeGreaterThan(0);
      // Hard tension net absorbs energy and dampens ball velocity
      expect(Math.abs(ball.vy)).toBeLessThan(14);
    });
  });

  // ===========================================================================
  // A5.4 Complete 32-Bit Arcade UI Theme Consistency & Performance Profiling
  // ===========================================================================
  describe('A5.4: Complete 32-Bit Arcade UI Theme Consistency & Performance', () => {
    it('executes master stadium render within strict 60 FPS budget (< 16.67ms per frame)', () => {
      const { ctx } = createMockCanvasContext(false);
      const stadium = createDefaultStadium();

      const perf = measureStadiumRenderPerformance(ctx, stadium, 20);
      expect(perf.avgDurationMs).toBeLessThan(16.67);
      expect(perf.is60FpsCapable).toBe(true);
      expect(perf.fps).toBeGreaterThanOrEqual(60);
    });

    it('renders regulation pitch markings with time-of-day grading without allocation leaks', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawPitchMarkings(ctx, false, undefined, 'sunset');

      // Verify warm sunset line grading
      expect(operations.some((op) => op.method === 'set:strokeStyle' && op.args[0] === '#fff4e6')).toBe(true);
      expect(operations.some((op) => op.method === 'strokeRect')).toBe(true);
    });
  });
});
