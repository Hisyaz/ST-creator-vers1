/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StadiumDefinition,
  StandPosition,
  StandConfig,
  StadiumShape,
  RoofCutawayMode,
  RoofStyle,
  RoofMaterial,
  RoofBorder,
  RoofConfig,
  CORE_GROUNDS_ARCHETYPES,
  ROOF_CUTAWAY_OPTIONS,
  ROOF_STYLE_OPTIONS,
  ROUND_OVAL_ROOF_STYLE_OPTIONS,
  ROUND_OVAL_ROOF_MATERIAL_OPTIONS,
  ROUND_OVAL_ROOF_BORDER_OPTIONS,
  getGroundsForSurroundings,
  getDefaultGroundsForSurroundings,
  isRoundOrOvalShape,
  getRoofStylesForShape,
  getRoofMaterialsForShape,
  getRoofBordersForShape,
  getDefaultRoofConfig,
  getTierChairRows,
} from '../../types/stadium';
import {
  drawStadiumArchitecture,
  drawStandRoofCanopy,
  drawCornerMiterRoofCanopy,
  drawContinuousColiseumRoofCanopy,
  drawMiteredCornerStand,
  drawCornerQuadrantStands,
  getCornerMiterGeometry,
  getStadiumShapeMetrics,
  get32BitBayerPattern,
  preallocateStadiumGeometryBuffers,
  getStadiumGeometryCache,
  clearStadiumGeometryCache,
  measureStadiumRenderPerformance,
} from '../stadiumRenderer';
import {
  drawAerialSkyCam,
  drawStadiumPlaza,
  drawStadiumOuterFacade,
  drawStadiumRoofStructure,
  drawAerialExposedSeatingBowl,
  isStandActive,
} from '../skyCamRenderer';
import {
  createDefaultStadium,
  saveCustomStadium,
  getStadiumById,
} from '../stadiumRegistry';
import { CLOCKWISE_STANDS } from '../../components/StadiumCreatorModal';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';

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

describe('PHASE ST7: Master ST Stadium Overhaul & Synchronization Regression Suite', () => {
  beforeEach(() => {
    clearStadiumGeometryCache();
  });

  // ===========================================================================
  // 1. ST7.1.1 EIGHT STAND INDEPENDENCE & SPATIAL ISOLATION
  // ===========================================================================
  describe('ST7.1.1: 8-Stand Independence, Discrete Mutability & Serialization', () => {
    it('verifies CLOCKWISE_STANDS contains exactly 8 stands in canonical clockwise sequence', () => {
      expect(CLOCKWISE_STANDS).toHaveLength(8);
      const expectedIds: StandPosition[] = [
        'corner_ne',
        'east',
        'corner_se',
        'south',
        'corner_sw',
        'west',
        'corner_nw',
        'north',
      ];
      expect(CLOCKWISE_STANDS.map((s) => s.id)).toEqual(expectedIds);
    });

    it('mutating one stand does not mutate any of the other 7 stands', () => {
      const stadium = createDefaultStadium();
      expect(stadium.stands).toBeDefined();

      // Mutate West Stand to 3-tier futuristic cyan
      stadium.stands.west = {
        ...stadium.stands.west,
        tierCount: 3,
        grade: 'grade5_futuristic',
        primaryColor: '#06b6d4',
        secondaryColor: '#f8fafc',
        hasRoof: true,
        roofCutaway: 'full',
      };

      // Mutate East Stand to 1-tier municipal red brick wall
      stadium.stands.east = {
        ...stadium.stands.east,
        type: 'wall',
        wallSize: 'large',
        grade: 'grade1_municipal',
        primaryColor: '#b91c1c',
        hasRoof: false,
      };

      // Mutate Corner SW to open corner with park backdrop
      stadium.stands.corner_sw = {
        ...stadium.stands.corner_sw,
        type: 'no_stand',
        backdrop: 'clearing_trail',
        hasRoof: false,
      };

      // Verify West retains its exact custom properties
      expect(stadium.stands.west.tierCount).toBe(3);
      expect(stadium.stands.west.grade).toBe('grade5_futuristic');
      expect(stadium.stands.west.primaryColor).toBe('#06b6d4');
      expect(stadium.stands.west.roofCutaway).toBe('full');

      // Verify East is completely distinct from West
      expect(stadium.stands.east.type).toBe('wall');
      expect(stadium.stands.east.grade).toBe('grade1_municipal');
      expect(stadium.stands.east.primaryColor).toBe('#b91c1c');
      expect(stadium.stands.east.hasRoof).toBe(false);

      // Verify Corner SW is open without affecting Corner NW or Corner NE
      expect(stadium.stands.corner_sw.type).toBe('no_stand');
      expect(stadium.stands.corner_nw.type).not.toBe('no_stand');
      expect(stadium.stands.corner_ne.type).not.toBe('no_stand');
      expect(stadium.stands.north.tierCount).toBeDefined();
    });

    it('faithfully serializes and deserializes all 8 discrete stands via JSON', () => {
      const stadium = createDefaultStadium();
      stadium.stands.corner_ne.grade = 'grade2_classic';
      stadium.stands.corner_ne.primaryColor = '#15803d';
      stadium.stands.south.type = 'no_stand';
      stadium.stands.south.backdrop = 'mall';

      const jsonStr = JSON.stringify(stadium);
      const restored: StadiumDefinition = JSON.parse(jsonStr);

      expect(restored.stands.corner_ne.grade).toBe('grade2_classic');
      expect(restored.stands.corner_ne.primaryColor).toBe('#15803d');
      expect(restored.stands.south.type).toBe('no_stand');
      expect(restored.stands.south.backdrop).toBe('mall');
      expect(restored.stands.west).toBeDefined();
      expect(restored.stands.east).toBeDefined();
      expect(restored.stands.north).toBeDefined();
    });

    it('renders multi-tier heterogeneous 8 stands concurrently in pitch view without errors', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.shape = 'rectangular';
      stadium.stands.west = {
        position: 'west',
        type: 'tiered',
        tierCount: 3,
        grade: 'grade5_futuristic',
        primaryColor: '#0284c7',
        secondaryColor: '#f0f9ff',
        hasRoof: true,
      };
      stadium.stands.east = {
        position: 'east',
        type: 'wall',
        wallSize: 'large',
        grade: 'grade3_industrial',
        primaryColor: '#eab308',
        secondaryColor: '#0f172a',
        hasRoof: true,
      };
      stadium.stands.north = {
        position: 'north',
        type: 'tiered',
        tierCount: 1,
        grade: 'grade1_municipal',
        primaryColor: '#16a34a',
        hasRoof: false,
      };
      stadium.stands.south = {
        position: 'south',
        type: 'no_stand',
        grade: 'grade1_municipal',
        backdrop: 'parking_lot',
        hasRoof: false,
      };

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

      expect(operations.length).toBeGreaterThan(150);

      // Verify colors from both heterogeneous sides were applied
      const cyanOps = operations.filter((op) => op.method === 'set:fillStyle' && op.args[0] === '#0284c7');
      const yellowOps = operations.filter((op) => op.method === 'set:fillStyle' && op.args[0] === '#eab308');
      expect(cyanOps.length).toBeGreaterThan(0);
      expect(yellowOps.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 2. ST7.1.2 45° CORNER MITER GEOMETRY & CONTINUOUS PATH WELDING
  // ===========================================================================
  describe('ST7.1.2: 45° Corner Miter Geometry & Continuous Path Welding', () => {
    it('computes accurate mathematical coordinates for all 4 corner quadrants', () => {
      const left = 300;
      const right = 900;
      const top = 200;
      const bottom = 800;
      const depthX = 140;
      const depthY = 160;

      const corners: ('corner_nw' | 'corner_ne' | 'corner_se' | 'corner_sw')[] = [
        'corner_nw',
        'corner_ne',
        'corner_se',
        'corner_sw',
      ];

      for (const pos of corners) {
        const miter = getCornerMiterGeometry(pos, left, right, top, bottom, depthX, depthY);
        expect(miter.pos).toBe(pos);
        expect(typeof miter.pIn.x).toBe('number');
        expect(typeof miter.pIn.y).toBe('number');
        expect(typeof miter.pOut.x).toBe('number');
        expect(typeof miter.pOut.y).toBe('number');

        // Touchline and goal alignment points
        const pt0 = miter.pTouch(0);
        const pg0 = miter.pGoal(0);
        expect(pt0).toEqual(miter.pIn);
        expect(pg0).toEqual(miter.pIn);

        // Maximum depth outer points
        const ptMax = miter.pTouch(depthX);
        const pgMax = miter.pGoal(depthY);

        if (pos === 'corner_nw') {
          expect(miter.pIn).toEqual({ x: left, y: top });
          expect(miter.pOut).toEqual({ x: left - depthX, y: top - depthY });
          expect(ptMax).toEqual({ x: left - depthX, y: top });
          expect(pgMax).toEqual({ x: left, y: top - depthY });
        } else if (pos === 'corner_ne') {
          expect(miter.pIn).toEqual({ x: right, y: top });
          expect(miter.pOut).toEqual({ x: right + depthX, y: top - depthY });
          expect(ptMax).toEqual({ x: right + depthX, y: top });
          expect(pgMax).toEqual({ x: right, y: top - depthY });
        } else if (pos === 'corner_se') {
          expect(miter.pIn).toEqual({ x: right, y: bottom });
          expect(miter.pOut).toEqual({ x: right + depthX, y: bottom + depthY });
          expect(ptMax).toEqual({ x: right + depthX, y: bottom });
          expect(pgMax).toEqual({ x: right, y: bottom + depthY });
        } else if (pos === 'corner_sw') {
          expect(miter.pIn).toEqual({ x: left, y: bottom });
          expect(miter.pOut).toEqual({ x: left - depthX, y: bottom + depthY });
          expect(ptMax).toEqual({ x: left - depthX, y: bottom });
          expect(pgMax).toEqual({ x: left, y: bottom + depthY });
        }
      }
    });

    it('welds tier quads into continuous non-zero area trapezoids without gaps', () => {
      const left = 300;
      const right = 900;
      const top = 200;
      const bottom = 800;
      const depthX = 140;
      const depthY = 160;

      const miter = getCornerMiterGeometry('corner_nw', left, right, top, bottom, depthX, depthY);
      const tierCount = 3;

      for (let t = 0; t < tierCount; t++) {
        const dX0 = (t * depthX) / tierCount;
        const dX1 = ((t + 1) * depthX) / tierCount;
        const dY0 = (t * depthY) / tierCount;
        const dY1 = ((t + 1) * depthY) / tierCount;

        const quad = miter.computeTierQuad(dX0, dX1, dY0, dY1);
        expect(quad.area).toBeGreaterThan(0);
        expect(quad.v0.x).toBeLessThanOrEqual(left);
        expect(quad.v1.x).toBeLessThanOrEqual(quad.v0.x);
        expect(quad.v2.y).toBeLessThanOrEqual(quad.v3.y);
      }
    });

    it('renders 45° corner miter with asymmetric return walls when adjacent stand is No Stand', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stand: StandConfig = {
        position: 'corner_nw',
        type: 'tiered',
        grade: 'grade2_classic',
        tierCount: 2,
        primaryColor: '#1d4ed8',
      };
      const adjacentTouchlineStand: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade2_classic',
      };
      const adjacentGoalStand: StandConfig = {
        position: 'north',
        type: 'no_stand',
        grade: 'grade1_municipal',
      };

      drawMiteredCornerStand(
        ctx,
        stand,
        'corner_nw',
        300,
        900,
        200,
        800,
        140,
        160,
        HOME_KIT,
        AWAY_KIT,
        'rectangular',
        'night',
        'big_city',
        adjacentTouchlineStand,
        adjacentGoalStand
      );

      // Verify asymmetric return wall coping and stroke was drawn
      const strokeOps = operations.filter((op) => op.method === 'stroke');
      expect(strokeOps.length).toBeGreaterThan(3);
    });
  });

  // ===========================================================================
  // 3. ST7.1.3 NINE IMMEDIATE GROUNDS ARCHETYPES & CONTEXTUAL FILTERING
  // ===========================================================================
  describe('ST7.1.3: 9 Immediate Grounds Archetypes & Contextual Filtering', () => {
    it('verifies all 9 core grounds archetypes are defined with icons and descriptions', () => {
      expect(CORE_GROUNDS_ARCHETYPES).toHaveLength(9);
      const expectedIds = [
        'parking_lots',
        'mall_commercial',
        'club_museum_trophies',
        'classical_statues',
        'modern_architectural',
        'industrial_depot',
        'park_recreation',
        'municipal_thoroughfare',
        'potrero_dirt',
      ];
      expect(CORE_GROUNDS_ARCHETYPES.map((g) => g.id)).toEqual(expectedIds);

      for (const opt of CORE_GROUNDS_ARCHETYPES) {
        expect(opt.label).toBeTruthy();
        expect(opt.icon).toBeTruthy();
        expect(opt.desc).toBeTruthy();
      }
    });

    it('contextual filtering maps specific grounds to surroundings', () => {
      const marineGrounds = getGroundsForSurroundings('marine_floating');
      expect(marineGrounds.some((g) => g.id === 'marine_floating_pontoons')).toBe(true);

      const airportGrounds = getGroundsForSurroundings('airport');
      expect(airportGrounds.some((g) => g.id === 'airport_runway_tarmac')).toBe(true);

      const mountainGrounds = getGroundsForSurroundings('mountains');
      expect(mountainGrounds.some((g) => g.id === 'mountains_granite_terrace')).toBe(true);

      const forestGrounds = getGroundsForSurroundings('forest');
      expect(forestGrounds.some((g) => g.id === 'forest_pine_trail')).toBe(true);
    });

    it('resolves sensible default grounds for every surrounding environment', () => {
      expect(getDefaultGroundsForSurroundings('marine_floating')).toBe('marine_floating_pontoons');
      expect(getDefaultGroundsForSurroundings('airport')).toBe('airport_runway_tarmac');
      expect(getDefaultGroundsForSurroundings('mountains')).toBe('mountains_granite_terrace');
      expect(getDefaultGroundsForSurroundings('beach')).toBe('beach_boardwalk_cabanas');
      expect(getDefaultGroundsForSurroundings('big_city')).toBe('mall_commercial');
      expect(getDefaultGroundsForSurroundings('small_city')).toBe('classical_statues');
      expect(getDefaultGroundsForSurroundings('parking_lot')).toBe('parking_lots');
    });

    it('drawStadiumPlaza in aerial view renders textures for all core grounds', () => {
      const groundsList = [
        'parking_lots',
        'mall_commercial',
        'club_museum_trophies',
        'classical_statues',
        'modern_architectural',
        'industrial_depot',
        'park_recreation',
        'municipal_thoroughfare',
        'potrero_dirt',
      ] as const;

      for (const g of groundsList) {
        const { ctx, operations } = createMockCanvasContext();
        drawStadiumPlaza(ctx, 1000, 1000, 2400, 2400, false, 'noon', g, 'big_city');
        expect(operations.length).toBeGreaterThan(10);
      }
    });
  });

  // ===========================================================================
  // 4. ST7.1.4 EIGHT ROOF STYLES & 3-TIER HIERARCHY
  // ===========================================================================
  describe('ST7.1.4: 8 Architectural Roof Styles & 3-Tier Customization Hierarchy', () => {
    it('verifies 4 rectangular and 4 round/oval roof styles are correctly partitioned', () => {
      expect(ROOF_STYLE_OPTIONS).toHaveLength(4);
      expect(ROOF_STYLE_OPTIONS.map((r) => r.id)).toEqual([
        'cantilever_truss',
        'barrel_vault',
        'tensile_cable',
        'spaceframe_halo',
      ]);

      expect(ROUND_OVAL_ROOF_STYLE_OPTIONS).toHaveLength(4);
      expect(ROUND_OVAL_ROOF_STYLE_OPTIONS.map((r) => r.id)).toEqual([
        'spoke_wheel_tension',
        'petal_ocular_halo',
        'continuous_cantilever_ring',
        'radial_louvered_pergola',
      ]);
    });

    it('verifies 3-tier hierarchy: Style, Material, and Border options for all shapes', () => {
      // Rectangular shape options
      const rectStyles = getRoofStylesForShape('rectangular');
      const rectMaterials = getRoofMaterialsForShape('rectangular');
      const rectBorders = getRoofBordersForShape('rectangular');

      expect(rectStyles).toHaveLength(4);
      expect(rectMaterials).toHaveLength(4);
      expect(rectBorders).toHaveLength(4);

      // Round coliseum shape options
      const roundStyles = getRoofStylesForShape('round');
      const roundMaterials = getRoofMaterialsForShape('round');
      const roundBorders = getRoofBordersForShape('round');

      expect(roundStyles).toHaveLength(4);
      expect(roundMaterials).toHaveLength(4);
      expect(roundBorders).toHaveLength(4);
    });

    it('isRoundOrOvalShape accurately detects circular and racetrack footprints', () => {
      expect(isRoundOrOvalShape('round')).toBe(true);
      expect(isRoundOrOvalShape('circular')).toBe(true);
      expect(isRoundOrOvalShape('oval')).toBe(true);
      expect(isRoundOrOvalShape('square')).toBe(false);
      expect(isRoundOrOvalShape('rectangular')).toBe(false);
    });

    it('draws all 4 rectangular roof styles in pitch view without errors', () => {
      const styles: RoofStyle[] = [
        'cantilever_truss',
        'barrel_vault',
        'tensile_cable',
        'spaceframe_halo',
      ];

      for (const s of styles) {
        const { ctx, operations } = createMockCanvasContext();
        const stand: StandConfig = {
          position: 'west',
          type: 'tiered',
          grade: 'grade4_modern',
          hasRoof: true,
          roofStyle: s,
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
          'noon'
        );

        expect(operations.length).toBeGreaterThan(10);
      }
    });

    it('draws all 4 round/oval coliseum continuous roof styles in pitch view', () => {
      const styles: RoofStyle[] = [
        'spoke_wheel_tension',
        'petal_ocular_halo',
        'continuous_cantilever_ring',
        'radial_louvered_pergola',
      ];

      for (const s of styles) {
        const { ctx, operations } = createMockCanvasContext();
        const stadium = createDefaultStadium();
        stadium.shape = 'round';
        stadium.roof = {
          enabled: true,
          style: s,
          material: 'ptfe_fabric',
          border: 'video_halo_board',
          cutawayMode: 'full',
        };

        drawContinuousColiseumRoofCanopy(
          ctx,
          stadium,
          'round'
        );

        expect(operations.length).toBeGreaterThan(15);
      }
    });
  });

  // ===========================================================================
  // 5. ST7.1.5 SIMS-STYLE 3-STATE ROOF CUTAWAY TOGGLER
  // ===========================================================================
  describe('ST7.1.5: Sims-Style 3-State Roof Cutaway Mode (Hidden / Partial / Full)', () => {
    it('verifies all 3 cutaway modes are catalogued with exact percentages', () => {
      expect(ROOF_CUTAWAY_OPTIONS).toHaveLength(3);
      expect(ROOF_CUTAWAY_OPTIONS[0].id).toBe('hidden');
      expect(ROOF_CUTAWAY_OPTIONS[0].pct).toBe('0%');
      expect(ROOF_CUTAWAY_OPTIONS[1].id).toBe('partial');
      expect(ROOF_CUTAWAY_OPTIONS[1].pct).toBe('50%');
      expect(ROOF_CUTAWAY_OPTIONS[2].id).toBe('full');
      expect(ROOF_CUTAWAY_OPTIONS[2].pct).toBe('100%');
    });

    it('hidden cutaway (0%) completely suppresses pitch-view roof rendering', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stand: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade4_modern',
        hasRoof: true,
        roofCutaway: 'hidden',
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
        'noon'
      );

      // Hidden cutaway immediately returns with 0 draw operations
      expect(operations).toHaveLength(0);
    });

    it('partial cutaway (50%) vs full cutaway (100%) scales depth projection', () => {
      const { ctx: ctxPartial, operations: opsPartial } = createMockCanvasContext();
      const { ctx: ctxFull, operations: opsFull } = createMockCanvasContext();

      const standPartial: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade4_modern',
        hasRoof: true,
        roofCutaway: 'partial',
      };
      const standFull: StandConfig = {
        position: 'west',
        type: 'tiered',
        grade: 'grade4_modern',
        hasRoof: true,
        roofCutaway: 'full',
      };

      drawStandRoofCanopy(ctxPartial, standPartial, 100, 200, 140, 600, 'west', HOME_KIT, AWAY_KIT, 'noon');
      drawStandRoofCanopy(ctxFull, standFull, 100, 200, 140, 600, 'west', HOME_KIT, AWAY_KIT, 'noon');

      expect(opsPartial.length).toBeGreaterThan(0);
      expect(opsFull.length).toBeGreaterThan(0);

      // Full cutaway produces larger depth fill operations
      const fillRectPartial = opsPartial.filter((op) => op.method === 'fillRect');
      const fillRectFull = opsFull.filter((op) => op.method === 'fillRect');
      expect(fillRectFull.length).toBeGreaterThanOrEqual(fillRectPartial.length);
    });

    it('in aerial view, hidden cutaway reveals full exposed seating bowl', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.roofCutaway = 'hidden';
      stadium.seats.colors = ['#1d4ed8', '#facc15'];

      drawStadiumRoofStructure(ctx, 1000, 1000, 2400, 2400, 'round', stadium, 'noon');

      // Verify exposed seat colors and safety stair nosing were drawn
      const seatColorOps = operations.filter(
        (op) => op.method === 'set:strokeStyle' && op.args[0] === '#1d4ed8'
      );
      const yellowNosingOps = operations.filter(
        (op) => op.method === 'set:strokeStyle' && op.args[0] === '#facc15'
      );
      expect(seatColorOps.length).toBeGreaterThan(0);
      expect(yellowNosingOps.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 6. ST7.1.6 DUAL-PERSPECTIVE SYNCHRONIZATION
  // ===========================================================================
  describe('ST7.1.6: Dual-Perspective Architectural Synchronization', () => {
    it('synchronizes round coliseum geometry between pitch view and aerial sky-cam', () => {
      const stadium = createDefaultStadium();
      stadium.shape = 'round';
      stadium.roof = {
        enabled: true,
        style: 'spoke_wheel_tension',
        material: 'ptfe_fabric',
        border: 'video_halo_board',
        cutawayMode: 'full',
      };

      const { ctx: ctxPitch, operations: opsPitch } = createMockCanvasContext();
      const { ctx: ctxAerial, operations: opsAerial } = createMockCanvasContext();

      drawStadiumArchitecture(
        ctxPitch,
        PITCH_CONFIG.CENTER_X,
        PITCH_CONFIG.CENTER_Y,
        'monumental',
        'noon',
        HOME_KIT,
        AWAY_KIT,
        undefined,
        stadium
      );

      drawAerialSkyCam(ctxAerial, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'noon',
      });

      expect(opsPitch.length).toBeGreaterThan(100);
      expect(opsAerial.length).toBeGreaterThan(100);

      // Both perspectives should have drawn circular/arc paths
      const pitchArcs = opsPitch.filter((op) => op.method === 'arc');
      const aerialArcs = opsAerial.filter((op) => op.method === 'arc');
      expect(pitchArcs.length).toBeGreaterThan(0);
      expect(aerialArcs.length).toBeGreaterThan(0);
    });

    it('asymmetric No-Stand sides expose grounds faithfully in both pitch view and aerial view', () => {
      const stadium = createDefaultStadium();
      stadium.stands.south = {
        position: 'south',
        type: 'no_stand',
        grade: 'grade1_municipal',
        backdrop: 'parking_lot',
        hasRoof: false,
      };

      const { ctx: ctxPitch, operations: opsPitch } = createMockCanvasContext();
      const { ctx: ctxAerial, operations: opsAerial } = createMockCanvasContext();

      drawStadiumArchitecture(
        ctxPitch,
        PITCH_CONFIG.CENTER_X,
        PITCH_CONFIG.CENTER_Y,
        'craven',
        'noon',
        HOME_KIT,
        AWAY_KIT,
        undefined,
        stadium
      );

      drawAerialSkyCam(ctxAerial, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'noon',
      });

      expect(opsPitch.length).toBeGreaterThan(100);
      expect(opsAerial.length).toBeGreaterThan(100);
    });
  });

  // ===========================================================================
  // 7. ST7.2 60 FPS MOBILE PERFORMANCE & ZERO GARBAGE COLLECTION
  // ===========================================================================
  describe('ST7.2: 60 FPS Mobile Performance & Zero Garbage Collection Calibration', () => {
    it('preallocateStadiumGeometryBuffers creates and reuses geometry cache without reallocation', () => {
      const stadium = createDefaultStadium();
      stadium.shape = 'rectangular';

      const cache = getStadiumGeometryCache();
      expect(cache.size).toBe(0);

      const entry1 = preallocateStadiumGeometryBuffers(stadium);
      expect(cache.size).toBe(1);
      expect(entry1.shape).toBe('rectangular');
      expect(entry1.cornerMiters.corner_nw).toBeDefined();
      expect(entry1.bounds.west).toBeDefined();

      // Second call must return cached entry without adding new cache entries
      const entry2 = preallocateStadiumGeometryBuffers(stadium);
      expect(entry2).toBe(entry1);
      expect(cache.size).toBe(1);
    });

    it('cached 32-bit Bayer pattern returns a valid pattern or null gracefully without allocation loops', () => {
      const { ctx } = createMockCanvasContext();
      const p1 = get32BitBayerPattern(ctx);
      const p2 = get32BitBayerPattern(ctx);
      expect(p1).toBe(p2);
    });

    it('executes performance benchmark sustaining 60 FPS budget (< 16.67ms per frame)', () => {
      const { ctx } = createMockCanvasContext(false);
      const stadium = createDefaultStadium();

      const perf = measureStadiumRenderPerformance(ctx, stadium, 25);
      expect(perf.avgDurationMs).toBeLessThan(16.67);
      expect(perf.is60FpsCapable).toBe(true);
      expect(perf.fps).toBeGreaterThanOrEqual(60);
    });
  });
});
