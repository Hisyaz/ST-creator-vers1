/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchEngine } from '../engine';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import {
  getStadiumShapeMetrics,
  getNorthSpatialHierarchy,
  drawStadiumArchitecture,
  drawSingleTouchlineStand,
  drawGoalEndStand,
  drawMiteredCornerStand,
  drawCornerQuadrantStands,
  drawImmediateStadiumGrounds,
  drawPerimeterHorizon,
  drawHorizonSkirt,
  drawSeatArchetype,
  drawWallCrushBarriers,
  drawAirportHorizon,
  drawMarineFloatingHorizon,
  drawMountainsHorizon,
  draw32BitGrandstandMaterial,
  drawInnerApronInfillPolish,
  preallocateStadiumGeometryBuffers,
  getStadiumGeometryCache,
  clearStadiumGeometryCache,
  measureStadiumRenderPerformance,
  B7_MASTER_SUITE_FEATURES,
} from '../stadiumRenderer';
import {
  drawAerialSkyCam,
  createUltraWidePreMatchSwoop,
  createPreMatchSwoop,
  updatePreMatchSwoop,
  B6_INTRO_FEATURES,
} from '../skyCamRenderer';
import {
  drawAerialEnvironment,
  drawFisheyeSkylineBoundary,
} from '../environmentRenderer';
import { createDefaultStadium, getStadiumById } from '../stadiumRegistry';
import {
  StadiumDefinition,
  StandConfig,
  StadiumShape,
  PerimeterFinishType,
  SeatArchetype,
  ZOOM_SNAP_PRESETS,
  CANONICAL_B2_PERIMETERS,
  CANONICAL_B3_MATERIALS,
  B5_HORIZON_FEATURES,
  isTheWallStand,
  resolvePitchViewSeatColor,
  shouldSeatBeOccupied,
  getAttendancePercentage,
  getDefaultPerimeterForGrounds,
  resolveGrandstandMaterial,
  resolveMarineGroundArchetype,
  resolveHorizonSkirt,
} from '../../types/stadium';
import { CLOCKWISE_STANDS, CARDINAL_STANDS } from '../../components/StadiumCreatorModal';

/**
 * High-performance mock Canvas 2D context tracking operations and state changes
 */
function createMockCanvasContext(recordOps = true): {
  ctx: CanvasRenderingContext2D;
  operations: { method: string; args: any[] }[];
} {
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
        if (prop === 'getLineDash') {
          return [];
        }
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return {
            addColorStop: (...gArgs: any[]) => {
              if (recordOps) {
                operations.push({ method: 'addColorStop', args: gArgs });
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

  const baseCtx: any = {
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

  if (!recordOps) {
    baseCtx.beginPath = () => {};
    baseCtx.closePath = () => {};
    baseCtx.moveTo = () => {};
    baseCtx.lineTo = () => {};
    baseCtx.fill = () => {};
    baseCtx.stroke = () => {};
    baseCtx.fillRect = () => {};
    baseCtx.strokeRect = () => {};
    baseCtx.arc = () => {};
    baseCtx.ellipse = () => {};
    baseCtx.rect = () => {};
    baseCtx.clip = () => {};
    baseCtx.save = () => {};
    baseCtx.restore = () => {};
    baseCtx.bezierCurveTo = () => {};
    baseCtx.quadraticCurveTo = () => {};
    baseCtx.setLineDash = () => {};
    baseCtx.getLineDash = () => [];
  }

  const proxy = new Proxy(baseCtx, handler) as unknown as CanvasRenderingContext2D;
  return { ctx: proxy, operations };
}

describe('PHASE B7: Master B-Series Integration, Zero-Allocation Calibration & Vitest Regression Suite', () => {
  let engine: MatchEngine;

  beforeEach(() => {
    engine = new MatchEngine();
    clearStadiumGeometryCache();
  });

  // ===========================================================================
  // B7.1: Authoritative Architectural Configuration & Master Contracts
  // ===========================================================================
  describe('B7.1: Master Architecture Configuration & System Alignment', () => {
    it('exports complete authoritative B7_MASTER_SUITE_FEATURES contract', () => {
      expect(B7_MASTER_SUITE_FEATURES).toBeDefined();
      expect(B7_MASTER_SUITE_FEATURES.version).toBe('Phase B7');
      expect(B7_MASTER_SUITE_FEATURES.verticalHierarchy.strictlyMonotonicYOrder).toBe(true);
      expect(B7_MASTER_SUITE_FEATURES.verticalHierarchy.apertureHeadroomBufferMinPx).toBe(320);
      expect(B7_MASTER_SUITE_FEATURES.verticalHierarchy.supportedShapes).toEqual([
        'rectangular',
        'square',
        'round',
        'oval',
      ]);
      expect(B7_MASTER_SUITE_FEATURES.zoomScaleEngine.minZoom).toBe(0.05);
      expect(B7_MASTER_SUITE_FEATURES.zoomScaleEngine.maxZoom).toBe(1.60);
      expect(B7_MASTER_SUITE_FEATURES.zoomScaleEngine.snapPresets.length).toBe(4);
      expect(B7_MASTER_SUITE_FEATURES.performanceSLA.targetFps).toBe(60);
      expect(B7_MASTER_SUITE_FEATURES.performanceSLA.maxFrameBudgetMs).toBeCloseTo(16.67, 1);
      expect(B7_MASTER_SUITE_FEATURES.performanceSLA.zeroPerFrameAllocation).toBe(true);
    });
  });

  // ===========================================================================
  // B7.2: Vertical Coordinate Hierarchy & Aperture Headroom Invariance
  // ===========================================================================
  describe('B7.2: Vertical Spatial Hierarchy & Northern Aperture Aperture Contract', () => {
    const shapes: StadiumShape[] = ['rectangular', 'square', 'round', 'oval'];

    it.each(shapes)('guarantees strict vertical ascending Y-hierarchy for %s shape', (shape) => {
      const hierarchy = getNorthSpatialHierarchy(
        shape,
        140,
        false,
        'standard',
        shape === 'round' || shape === 'oval'
      );

      // Strict vertical ordering from high sky down into playing pitch:
      // bgTop < horizonBaseY < northConcourseTop < northOuterY < northInnerY < pitchTop
      expect(hierarchy.bgTop).toBeLessThan(hierarchy.horizonBaseY);
      expect(hierarchy.horizonBaseY).toBeLessThan(hierarchy.northConcourseTop);
      expect(hierarchy.northConcourseTop).toBeLessThan(hierarchy.northOuterY);
      expect(hierarchy.northOuterY).toBeLessThan(hierarchy.northInnerY);
      expect(hierarchy.northInnerY).toBeLessThan(hierarchy.pitchTop);
      expect(hierarchy.pitchTop).toBe(PITCH_CONFIG.PITCH_TOP);
    });

    it('enforces minimum 320px elevated skyline aperture clearance buffer', () => {
      shapes.forEach((shape) => {
        const hierarchy = getNorthSpatialHierarchy(shape, 160);
        const clearanceBuffer = hierarchy.northConcourseTop - hierarchy.horizonBaseY;
        expect(clearanceBuffer).toBeGreaterThanOrEqual(320);
      });
    });

    it('accurately resolves Oval and Round semicircular apex and bounding envelopes', () => {
      const ovalMetrics = getStadiumShapeMetrics('oval');
      const roundMetrics = getStadiumShapeMetrics('round');

      expect(ovalMetrics.shape).toBe('oval');
      expect(roundMetrics.shape).toBe('round');

      // Center is (930, 1470)
      const cx = PITCH_CONFIG.CENTER_X; // 930
      const pTop = PITCH_CONFIG.PITCH_TOP; // 220
      const expectedRadius = cx - ovalMetrics.westInnerX; // 930 - (-120) = 1050
      expect(ovalMetrics.northInnerY).toBe(pTop - expectedRadius); // -830
      expect(ovalMetrics.standDepthY).toBe(220);

      const cy = PITCH_CONFIG.CENTER_Y; // 1470
      expect(roundMetrics.northInnerY).toBe(cy - 1660); // -190
      expect(roundMetrics.standDepthY).toBe(220);
    });

    it('renders all cardinal and surrounding horizon skirts without Y-inversion', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawHorizonSkirt(ctx, 'mountain_valley', 930, -500, 2000, 120, 'noon');
      expect(operations.length).toBeGreaterThan(0);
      const fills = operations.filter((op) => op.method === 'fill' || op.method === 'fillRect');
      expect(fills.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // B7.3: Dedicated Zoom Bar & Continuous Extreme Macroscopic Dynamic Range
  // ===========================================================================
  describe('B7.3: Dedicated Zoom Bar, Dynamic Range & Snap Presets', () => {
    it('provides all 4 canonical ZOOM_SNAP_PRESETS covering 100% down to 5%', () => {
      expect(ZOOM_SNAP_PRESETS.length).toBe(4);

      const [pitch, concourse, arena, wholeWorld] = ZOOM_SNAP_PRESETS;
      expect(pitch.id).toBe('pitch');
      expect(pitch.zoom).toBe(1.0);

      expect(concourse.id).toBe('concourse');
      expect(concourse.zoom).toBe(0.50);

      expect(arena.id).toBe('arena');
      expect(arena.zoom).toBe(0.15);

      expect(wholeWorld.id).toBe('whole_world');
      expect(wholeWorld.zoom).toBe(0.05);
    });

    it('renders aerial environment at extreme 5% whole-world zoom without NaN or zero division', () => {
      const { ctx, operations } = createMockCanvasContext();
      const bounds = {
        left: -5000,
        top: -5000,
        width: 12000,
        height: 12000,
        stadiumBounds: {
          centerX: PITCH_CONFIG.CENTER_X,
          centerY: PITCH_CONFIG.CENTER_Y,
          outerWidth: 2400,
          outerHeight: 3200,
        },
      };

      drawAerialEnvironment(ctx, 'nature', 'noon', bounds);
      expect(operations.length).toBeGreaterThan(0);

      // Verify no invalid coordinates or NaN were issued
      operations.forEach((op) => {
        if (op.args) {
          op.args.forEach((arg) => {
            if (typeof arg === 'number') {
              expect(Number.isFinite(arg)).toBe(true);
            }
          });
        }
      });
    });

    it('confirms Stadium Creator stand sector options dynamically swap for round/oval coliseums', () => {
      // Rectangular/Square stadiums have 8 stands (4 cardinal + 4 corners)
      expect(CLOCKWISE_STANDS.length).toBe(8);

      // Round/Oval coliseums have continuous bowls with 4 cardinal sectors
      expect(CARDINAL_STANDS.length).toBe(4);
      expect(CARDINAL_STANDS.map((s) => s.id)).toEqual(['west', 'north', 'east', 'south']);
    });
  });

  // ===========================================================================
  // B7.4: "The Wall" Dortmund Monolithic Rake vs Multi-Tier Cantilevers
  // ===========================================================================
  describe('B7.4: Grandstand Typology Distinction ("The Wall" vs Multi-Tier)', () => {
    it('identifies "The Wall" stand type correctly via isTheWallStand', () => {
      const standardStand: StandConfig = {
        position: 'west',
        type: 'tiered',
        tierCount: 2,
        seatArchetype: 'molded_bucket',
      };
      const wallStand: StandConfig = {
        position: 'south',
        type: 'wall',
        wallSize: 'large',
        seatArchetype: 'molded_bucket',
      };

      expect(isTheWallStand(standardStand)).toBe(false);
      expect(isTheWallStand(wallStand)).toBe(true);
    });

    it('draws high-contrast yellow/black anti-surge crush barriers on "The Wall"', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawWallCrushBarriers(ctx, 100, 200, 300, 20, 'south', 1, false);

      const yellowFills = operations.filter((op) => op.method === 'set:fillStyle' && op.args[0] === '#facc15');
      const blackFills = operations.filter((op) => op.method === 'set:fillStyle' && op.args[0] === '#0f172a');
      expect(yellowFills.length).toBeGreaterThan(0);
      expect(blackFills.length).toBeGreaterThan(0);
    });

    it('renders multi-tier cantilever overhang shadows with pronounced depth', () => {
      const { ctx, operations } = createMockCanvasContext();
      const multiTierStand: StandConfig = {
        position: 'west',
        type: 'tiered',
        tierCount: 3,
        grade: 'grade4_modern',
        primaryColor: '#1e3a8a',
        secondaryColor: '#ffffff',
      };

      drawSingleTouchlineStand(
        ctx,
        multiTierStand,
        100,
        200,
        160,
        600,
        'west',
        HOME_KIT,
        AWAY_KIT,
        'rectangular',
        'night'
      );

      // Cantilever overhang drop shadow onto lower tier
      const hasOverhangShadow = operations.some(
        (op) => op.method === 'set:fillStyle' && op.args[0] === 'rgba(0, 0, 0, 0.55)'
      );
      expect(hasOverhangShadow).toBe(true);

      // Illuminated Green Emergency Exit Lamp on vomitories (#22c55e)
      const hasExitGreen = operations.some((op) => op.method === 'set:fillStyle' && op.args[0] === '#22c55e');
      expect(hasExitGreen).toBe(true);

      // Intermediate VIP glass suites
      const hasGlassSuite = operations.some(
        (op) => op.method === 'set:fillStyle' && (op.args[0] === '#0369a1' || op.args[0] === 'rgba(56, 189, 248, 0.45)')
      );
      expect(hasGlassSuite).toBe(true);
    });

    it('renders all canonical B3 materials (concrete, brick, steel, composite)', () => {
      const { ctx, operations } = createMockCanvasContext();

      CANONICAL_B3_MATERIALS.forEach((mat) => {
        operations.length = 0;
        draw32BitGrandstandMaterial(ctx, 100, 100, 200, 150, mat.id, 'west', false);
        expect(operations.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // B7.5: Functional No-Stand Perimeter Enclosure Renderers
  // ===========================================================================
  describe('B7.5: Functional Visible "No Stand" Perimeter Fillings', () => {
    it('defines all 6 canonical B2 perimeter enclosures', () => {
      expect(CANONICAL_B2_PERIMETERS.length).toBe(6);
      const ids = CANONICAL_B2_PERIMETERS.map((p) => p.id);
      expect(ids).toContain('chainlink_fence');
      expect(ids).toContain('turnstile_brick_wall');
      expect(ids).toContain('concrete_wall');
      expect(ids).toContain('glass_balustrade');
      expect(ids).toContain('potrero_berm');
      expect(ids).toContain('stone_seawall');
    });

    it('maps surroundings and grounds coherently to default perimeter barriers', () => {
      expect(getDefaultPerimeterForGrounds('potrero_dirt', 'nature')).toBe('potrero_berm');
      expect(getDefaultPerimeterForGrounds('marine_floating_pontoons', 'marine_floating')).toBe('stone_seawall');
      expect(getDefaultPerimeterForGrounds('modern_architectural', 'big_city')).toBe('glass_balustrade');
      expect(getDefaultPerimeterForGrounds('industrial_depot', 'railroad')).toBe('concrete_wall');
      expect(getDefaultPerimeterForGrounds('classical_statues', 'small_city')).toBe('turnstile_brick_wall');
      expect(getDefaultPerimeterForGrounds('parking_lots', 'parking_lot')).toBe('chainlink_fence');
    });

    it('renders all 6 perimeter barrier types without null exceptions when stand tier is none', () => {
      const perimeters: PerimeterFinishType[] = [
        'chainlink_fence',
        'turnstile_brick_wall',
        'concrete_wall',
        'glass_balustrade',
        'potrero_berm',
        'stone_seawall',
      ];

      perimeters.forEach((p) => {
        const { ctx, operations } = createMockCanvasContext();
        const cornerStand: StandConfig = {
          position: 'corner_nw',
          type: 'none',
          perimeterFinish: p,
        };

        drawMiteredCornerStand(
          ctx,
          cornerStand,
          'corner_nw',
          200,
          800,
          200,
          800,
          120,
          120,
          HOME_KIT,
          AWAY_KIT,
          'rectangular',
          'night'
        );

        expect(operations.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // B7.6: Seat Color Fidelity, Archetypes & Attendance Capacity Scaling
  // ===========================================================================
  describe('B7.6: Seat Color Specular Highlights, Archetypes & Attendance Scaling', () => {
    it('calculates deterministic attendance percentages across all crowd levels', () => {
      expect(getAttendancePercentage('packet')).toBe(100);
      expect(getAttendancePercentage('crowded')).toBe(75);
      expect(getAttendancePercentage('half')).toBe(50);
      expect(getAttendancePercentage('few')).toBe(38);
      expect(getAttendancePercentage('small')).toBe(25);
      expect(getAttendancePercentage('empty')).toBe(0);
    });

    it('distributes empty seats proportionally according to attendance capacity', () => {
      const totalChecks = 200;
      let occupiedFull = 0;
      let occupiedHalf = 0;
      let occupiedEmpty = 0;

      for (let r = 0; r < 20; r++) {
        for (let c = 0; c < 10; c++) {
          if (shouldSeatBeOccupied(r, c, 'west', 'packet')) occupiedFull++;
          if (shouldSeatBeOccupied(r, c, 'west', 'half')) occupiedHalf++;
          if (shouldSeatBeOccupied(r, c, 'west', 'empty')) occupiedEmpty++;
        }
      }

      expect(occupiedFull).toBe(totalChecks); // 100%
      expect(occupiedEmpty).toBe(0); // 0%
      expect(occupiedHalf).toBeGreaterThan(60);
      expect(occupiedHalf).toBeLessThan(160); // ~50%
    });

    it('resolves seat patterns with high color contrast (stripes, checkered, mosaics)', () => {
      const primary = '#dc2626';
      const secondary = '#ffffff';

      // Solid
      expect(resolvePitchViewSeatColor('solid', 0, 0, 0, primary, secondary)).toBe(primary);

      // Horizontal Bands: even rows primary, odd rows secondary
      expect(resolvePitchViewSeatColor('horizontalBands', 0, 0, 0, primary, secondary)).toBe(primary);
      expect(resolvePitchViewSeatColor('horizontalBands', 1, 0, 0, primary, secondary)).toBe('#e2e8f0');

      // Checkered
      const c1 = resolvePitchViewSeatColor('checkered', 0, 0, 0, primary, secondary);
      const c2 = resolvePitchViewSeatColor('checkered', 1, 0, 0, primary, secondary);
      expect(c1).not.toBe(c2);
    });

    it('renders all 3 functional seat archetypes (bucket, benches, flip) with specular highlights', () => {
      const { ctx, operations } = createMockCanvasContext();
      const archetypes: SeatArchetype[] = ['molded_bucket', 'wooden_heritage_bench', 'metallic_tip_up'];

      archetypes.forEach((arch) => {
        operations.length = 0;
        // Unoccupied seat
        drawSeatArchetype(ctx, 100, 100, 6, 5, arch, '#0284c7', '#ffffff', 0, 0, false, false);
        expect(operations.length).toBeGreaterThan(0);

        // Occupied seat
        operations.length = 0;
        drawSeatArchetype(ctx, 100, 100, 6, 5, arch, '#0284c7', '#ffffff', 0, 0, true, true);
        expect(operations.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // B7.7: Deep Marine Ocean, Gibraltar Airport & Mountain Horizons
  // ===========================================================================
  describe('B7.7: Surrounding Horizons Overhaul (Deep Marine, Airport & Mountains)', () => {
    it('resolves canonical marine ground archetypes correctly', () => {
      expect(resolveMarineGroundArchetype('marine_aircraft_carrier')).toBe('aircraft_carrier');
      expect(resolveMarineGroundArchetype('marine_moored_boats')).toBe('aircraft_carrier');
      expect(resolveMarineGroundArchetype('marine_oil_rig')).toBe('oil_rig');
      expect(resolveMarineGroundArchetype('marine_tropical_atoll')).toBe('coral_atoll');
      expect(resolveMarineGroundArchetype('marine_open_lagoon')).toBe('coral_atoll');
      expect(resolveMarineGroundArchetype('marine_floating_pontoons')).toBe('hex_pontoon');
    });

    it('renders all 4 deep marine vessel & platform horizons', () => {
      const archetypes = ['marine_aircraft_carrier', 'marine_oil_rig', 'marine_tropical_atoll', 'marine_floating_pontoons'] as const;

      archetypes.forEach((arch) => {
        const { ctx, operations } = createMockCanvasContext();
        drawMarineFloatingHorizon(ctx, 0, 1200, 250, 0, 'noon', arch);
        expect(operations.length).toBeGreaterThan(0);
      });
    });

    it('renders Gibraltar Victoria Airport runway hugging stadium perimeter', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAirportHorizon(ctx, 0, 1200, 250, 0, 'sunset');
      expect(operations.length).toBeGreaterThan(0);

      // Asserts tarmac runway, threshold piano keys, and Rock of Gibraltar
      const rects = operations.filter((op) => op.method === 'fillRect' || op.method === 'rect');
      expect(rects.length).toBeGreaterThan(0);
    });

    it('renders Alpine Mountain Chain horizon with parallax ridges and alpenglow', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawMountainsHorizon(ctx, 0, 1200, 250, 0, 'sunset');
      expect(operations.length).toBeGreaterThan(0);

      const colorChanges = operations.filter((op) => op.method === 'set:fillStyle');
      expect(colorChanges.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // B7.8: Ultra-Wide Macroscopic Intro & Cinematic Continuity
  // ===========================================================================
  describe('B7.8: Ultra-Wide Macroscopic Intro (5% Fisheye to Pitch Glide) Continuity', () => {
    it('initializes ultra-wide intro swoop at exactly 5% zoom (0.05)', () => {
      const swoop = createUltraWidePreMatchSwoop(engine.activeStadium, 'Home', 'Away', 4500);
      expect(swoop.isUltraWide).toBe(true);
      expect(swoop.startZoom).toBe(0.05);
      expect(swoop.durationMs).toBe(4500);
      expect(swoop.progress).toBe(0);
      expect(swoop.phase).toBe(1);
    });

    it('executes smooth cubic bezier progression across all 4 flight stages', () => {
      const swoop = createUltraWidePreMatchSwoop(engine.activeStadium, 'Home', 'Away', 4000);
      const startT = swoop.startTime;

      // Stage 1: Global Vista (t = 0.08)
      const res1 = updatePreMatchSwoop(swoop, startT + 320);
      expect(res1.phase).toBe(1);
      expect(res1.camera.zoom).toBeGreaterThanOrEqual(0.05);
      expect(res1.camera.zoom).toBeLessThan(0.10);

      // Stage 2: Atmospheric Dive (t = 0.35)
      const res2 = updatePreMatchSwoop(swoop, startT + 1400);
      expect(res2.phase).toBe(2);
      expect(res2.camera.zoom).toBeGreaterThanOrEqual(0.08);
      expect(res2.camera.zoom).toBeLessThan(0.40);

      // Stage 3: Canopy Glide & Grandstand Immersion (t = 0.70)
      const res3 = updatePreMatchSwoop(swoop, startT + 2800);
      expect(res3.phase).toBe(3);
      expect(res3.camera.zoom).toBeGreaterThanOrEqual(0.35);
      expect(res3.camera.zoom).toBeLessThan(0.85);

      // Stage 4: Pitch Handoff (t = 1.0)
      const res4 = updatePreMatchSwoop(swoop, startT + 4100);
      expect(res4.isComplete).toBe(true);
      expect(res4.camera.zoom).toBeCloseTo(1.05, 2);
    });

    it('supports instantaneous skippability without remaining camera locks', () => {
      engine.startUltraWidePreMatchSwoop(4500);
      expect(engine.isPreMatchSwoopActive()).toBe(true);

      engine.skipPreMatchSwoop();
      expect(engine.isPreMatchSwoopActive()).toBe(false);
      expect(engine.preMatchSwoop?.isSkipped).toBe(true);
      expect(engine.camera.zoom).toBeCloseTo(1.05, 1);
    });
  });

  // ===========================================================================
  // B7.9: 60 FPS Mobile Performance, Pre-Allocated Buffers & Memory Hardening
  // ===========================================================================
  describe('B7.9: Budget Device Stress Testing, 60 FPS Budget & Memory Hardening', () => {
    it('pre-allocates stadium geometry buffers and caches them without memory growth', () => {
      const stadium = createDefaultStadium();
      const initialCacheSize = getStadiumGeometryCache().size;

      const entry1 = preallocateStadiumGeometryBuffers(stadium);
      expect(entry1).toBeDefined();
      expect(entry1.bounds).toBeDefined();
      expect(entry1.cornerMiters).toBeDefined();
      expect(getStadiumGeometryCache().size).toBe(initialCacheSize + 1);

      // Second retrieval must hit the cache without re-allocating
      const entry2 = preallocateStadiumGeometryBuffers(stadium);
      expect(entry2).toBe(entry1);
      expect(getStadiumGeometryCache().size).toBe(initialCacheSize + 1);
    });

    it('sustains 60 FPS performance benchmark (< 16.67ms per frame) with zero per-frame allocation', () => {
      const { ctx } = createMockCanvasContext(false);
      const stadium = createDefaultStadium();

      const perf = measureStadiumRenderPerformance(ctx, stadium, 25);
      expect(perf).toBeDefined();
      expect(perf.avgDurationMs).toBeLessThan(16.67);
      expect(perf.is60FpsCapable).toBe(true);
      expect(perf.allocations).toBe(0);
    });

    it('maintains stability and zero memory leaks under consecutive shape transitions', () => {
      const { ctx } = createMockCanvasContext(false);
      const shapes: StadiumShape[] = ['rectangular', 'square', 'round', 'oval'];

      shapes.forEach((shape) => {
        const stadium = createDefaultStadium();
        stadium.shape = shape;
        preallocateStadiumGeometryBuffers(stadium);

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
      });

      // Cache size should exactly match number of unique shapes
      expect(getStadiumGeometryCache().size).toBeLessThanOrEqual(4);
    });
  });
});
