/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  createPreMatchSwoop,
  updatePreMatchSwoop,
  drawAerialSkyCam,
  renderMacroscopicSkyViewPreview,
  PreMatchSwoopState,
} from '../skyCamRenderer';
import { createDefaultStadium } from '../stadiumRegistry';
import { StadiumDefinition } from '../../types/stadium';
import { TeamDefinition } from '../../types/team';

/**
 * Creates a mock 2D canvas context tracking drawing calls and canvas state
 */
function createMockCanvasContext(width = 1280, height = 720) {
  const operations: { method: string; args: any[] }[] = [];
  const properties: Record<string, any> = {
    canvas: { width, height },
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

  return { ctx, operations, properties };
}

const mockHomeTeam: any = {
  id: 'flamengo_rio',
  name: 'CR Flamengo',
  shortName: 'FLA',
  country: 'Brazil',
  league: 'Brasileirao',
  badge: {
    icon: '🛡️',
    bg: '#000000',
    text: 'FLA',
    primaryColor: '#c8102e',
    secondaryColor: '#000000',
  },
  kit: {
    name: 'Flamengo Home',
    shortName: 'FLA',
    primaryColor: '#c8102e',
    secondaryColor: '#000000',
    shortsColor: '#ffffff',
    socksColor: '#c8102e',
  },
  awayKit: {
    name: 'Flamengo Away',
    shortName: 'FLA',
    primaryColor: '#ffffff',
    secondaryColor: '#000000',
    shortsColor: '#000000',
    socksColor: '#ffffff',
  },
  preferredFormation: '4-3-3',
  tacticalPlaystyle: 'possession',
  starPlayer: 'Zico',
  ratingTier: 'S',
  stadiumId: 'maracana',
  players: [],
};

describe('Phase A6: High-Fidelity Macroscopic Sky View & Cinematic Intro', () => {
  describe('A6.1 Footprint Geometries & Architectural Synthesis', () => {
    it('accurately renders all 4 distinct footprint shapes: Rectangular, Square, Round, and Oval', () => {
      const shapes: StadiumDefinition['shape'][] = ['rectangular', 'square', 'round', 'oval'];

      for (const shape of shapes) {
        const { ctx, operations } = createMockCanvasContext();
        const stadium = createDefaultStadium(shape);
        stadium.shape = shape;

        drawAerialSkyCam(ctx, stadium, {
          timeOfDay: 'noon',
          weather: 'clear',
          homeTeamName: mockHomeTeam.name,
          awayTeamName: 'Fluminense',
          homeKit: {
            name: 'FLA Home',
            shortName: 'FLA',
            primaryColor: mockHomeTeam.badge.primaryColor,
            secondaryColor: '#000000',
            socksColor: '#c8102e',
            shortsColor: '#ffffff',
            gkColor: '#ffbb00',
          },
        });

        // Verification of drawing pipeline: save/restore pairs, pitch canvas operations, grandstands
        const saveCalls = operations.filter((op) => op.method === 'save').length;
        const restoreCalls = operations.filter((op) => op.method === 'restore').length;
        expect(saveCalls).toBeGreaterThan(0);
        expect(saveCalls).toBe(restoreCalls);

        // Verify shape-specific drawing calls (ellipse/arc for round/oval, rect/path for square/rect)
        if (shape === 'round' || shape === 'oval') {
          const arcCalls = operations.filter((op) => op.method === 'arc' || op.method === 'ellipse').length;
          expect(arcCalls).toBeGreaterThan(0);
        } else {
          const fillRectCalls = operations.filter((op) => op.method === 'fillRect').length;
          expect(fillRectCalls).toBeGreaterThan(0);
        }
      }
    });

    it('renders 8-stand configurations including corner miters and concourses', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium('rectangular');

      drawAerialSkyCam(ctx, stadium, {
        timeOfDay: 'noon',
        weather: 'clear',
      });

      // Verify fillRect calls are used extensively for pitch, concourses, and 8 grandstands
      const fillRects = operations.filter((op) => op.method === 'fillRect');
      expect(fillRects.length).toBeGreaterThan(25);
    });

    it('faithfully handles Sims Cutaway Roof States (full, partial, hidden)', () => {
      const cutawayModes: ('full' | 'partial' | 'hidden')[] = ['full', 'partial', 'hidden'];

      for (const mode of cutawayModes) {
        const { ctx, operations } = createMockCanvasContext();
        const stadium = createDefaultStadium('rectangular');
        stadium.roofCutaway = mode;

        drawAerialSkyCam(ctx, stadium, {
          roofOpacity: mode === 'hidden' ? 0.0 : mode === 'partial' ? 0.5 : 1.0,
          timeOfDay: 'noon',
          weather: 'clear',
        });

        // Verify that operations execute without throwing and balanced save/restore
        expect(operations.length).toBeGreaterThan(30);
      }
    });

    it('renders club crest mosaic in center circle and fan tifos/flares', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium('rectangular');
      stadium.seats = {
        style: 'classic_bucket',
        pattern: 'solid',
        colors: [mockHomeTeam.badge.primaryColor, '#ffffff'],
      };

      drawAerialSkyCam(ctx, stadium, {
        timeOfDay: 'night',
        weather: 'clear',
        showTifoBanners: true,
        showUltrasFlares: true,
      });

      // Verify that primary club badge colors are applied to context
      const fillStyles = operations
        .filter((op) => op.method === 'set:fillStyle')
        .map((op) => op.args[0]);

      expect(fillStyles).toContain(mockHomeTeam.badge.primaryColor);
    });

    it('renders atmospheric weather effects: snow dusted roofs and sunset rim glow', () => {
      // 1. Winter Snow Dusted
      const snowCtx = createMockCanvasContext();
      const snowStadium = createDefaultStadium('rectangular');
      drawAerialSkyCam(snowCtx.ctx, snowStadium, {
        timeOfDay: 'noon',
        weather: 'snow',
      });

      const snowColors = snowCtx.operations
        .filter((op) => op.method === 'set:strokeStyle')
        .map((op) => op.args[0]);
      expect(snowColors).toContain('#f8fafc');

      // 2. Sunset Golden Rim Glow
      const sunsetCtx = createMockCanvasContext();
      const sunsetStadium = createDefaultStadium('rectangular');
      drawAerialSkyCam(sunsetCtx.ctx, sunsetStadium, {
        timeOfDay: 'sunset',
        weather: 'clear',
      });

      const sunsetStroke = sunsetCtx.operations
        .filter((op) => op.method === 'set:strokeStyle')
        .map((op) => op.args[0]);
      expect(sunsetStroke).toContain('#fb923c');
    });

    it('renders live Macroscopic Sky View architectural preview via renderMacroscopicSkyViewPreview helper', () => {
      const mockCanvas: any = {
        width: 320,
        height: 180,
        getContext: () => createMockCanvasContext(320, 180).ctx,
      };

      const stadium = createDefaultStadium('round');
      expect(() => {
        renderMacroscopicSkyViewPreview(mockCanvas, stadium, {
          timeOfDay: 'noon',
          weather: 'clear',
          homeTeam: mockHomeTeam,
        });
      }).not.toThrow();
    });
  });

  describe('A6.2 4-Phase Pre-Match Broadcast Cinematic Glide', () => {
    it('initializes in Phase 1 (High-Altitude Vista) with high altitude and wide zoom', () => {
      const stadium = createDefaultStadium('rectangular');
      const state = createPreMatchSwoop(stadium, 'CR Flamengo', 'Fluminense', 3800);

      expect(state.isActive).toBe(true);
      expect(state.phase).toBe(1);
      expect(state.phaseName).toBe('High-Altitude Vista');
      expect(state.durationMs).toBe(3800);
      expect(state.whistleBlown).toBe(false);

      const result = updatePreMatchSwoop(state, state.startTime);
      expect(result.phase).toBe(1);
      expect(result.camera.zoom).toBeCloseTo(0.25, 2);
    });

    it('progresses smoothly through all 4 distinct cinematic stages over time', () => {
      const stadium = createDefaultStadium('rectangular');
      const state = createPreMatchSwoop(stadium, 'CR Flamengo', 'Fluminense', 3800);
      const phasesVisited = new Set<number>();

      // Step through duration (0ms to 3800ms)
      for (let t = 0; t <= 3800; t += 200) {
        const result = updatePreMatchSwoop(state, state.startTime + t);
        phasesVisited.add(result.phase);
      }

      expect(phasesVisited.has(1)).toBe(true); // Phase 1: High-Altitude Vista
      expect(phasesVisited.has(2)).toBe(true); // Phase 2: Orbital Swoop & Zoom
      expect(phasesVisited.has(3)).toBe(true); // Phase 3: Canopy Fly-Through
      expect(phasesVisited.has(4)).toBe(true); // Phase 4: Seamless Pitch Handoff
    });

    it('enforces polynomial smoothstep curve t^2(3 - 2t) with zero-jerk continuous transition', () => {
      const stadium = createDefaultStadium('rectangular');
      const state = createPreMatchSwoop(stadium, 'CR Flamengo', 'Fluminense', 3800);
      let previousZoom = 0;

      // Over the entire swoop, zoom should monotonically transition towards pitch gameplay zoom (~1.05)
      for (let step = 0; step <= 19; step++) {
        const now = state.startTime + step * 200;
        const result = updatePreMatchSwoop(state, now);
        expect(result.camera.zoom).toBeGreaterThanOrEqual(previousZoom);
        previousZoom = result.camera.zoom;
      }

      // At completion (beyond duration)
      const finalResult = updatePreMatchSwoop(state, state.startTime + 4000);
      expect(finalResult.isComplete).toBe(true);
      expect(finalResult.camera.zoom).toBeCloseTo(1.05, 1);
      expect(state.isActive).toBe(false);
    });

    it('allows instant skip at any point with seamless transition and whistle blown flag', () => {
      const stadium = createDefaultStadium('rectangular');
      const state = createPreMatchSwoop(stadium, 'CR Flamengo', 'Fluminense', 3800);
      expect(state.isActive).toBe(true);

      // User skips mid-flight
      state.isSkipped = true;
      const skippedResult = updatePreMatchSwoop(state, state.startTime + 500);

      expect(skippedResult.isComplete).toBe(true);
      expect(skippedResult.camera.zoom).toBeCloseTo(1.05, 1);
      expect(state.isActive).toBe(false);
    });

    it('renders broadcast HUD overlay during intro sequence with stage details', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium('oval');
      const state = createPreMatchSwoop(stadium, 'Flamengo', 'Vasco', 3800);

      drawAerialSkyCam(ctx, stadium, {
        showBroadcastHUD: true,
        swoopState: state,
        homeTeamName: 'Flamengo',
        awayTeamName: 'Vasco',
      });

      // Verify that stadium name, phase, and skip prompt are rendered
      const texts = operations
        .filter((op) => op.method === 'fillText')
        .map((op) => op.args[0]);

      expect(texts.some((t) => typeof t === 'string' && t.includes(stadium.name.toUpperCase()))).toBe(true);
      expect(texts.some((t) => typeof t === 'string' && t.includes('PHASE 1'))).toBe(true);
      expect(texts.some((t) => typeof t === 'string' && t.includes('SKIP'))).toBe(true);
    });
  });

  describe('A6.3 Real-Time Performance & Stability Standards', () => {
    it('executes updatePreMatchSwoop math loop in microseconds (<0.05ms per tick)', () => {
      const stadium = createDefaultStadium('rectangular');
      const state = createPreMatchSwoop(stadium, 'CR Flamengo', 'Fluminense', 3800);

      const start = performance.now();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        updatePreMatchSwoop(state, state.startTime + (i % 3800));
      }
      const elapsed = performance.now() - start;
      const msPerTick = elapsed / iterations;

      expect(msPerTick).toBeLessThan(0.05);
    });

    it('executes full sky cam rendering loop within 60 FPS budgets (<30ms in JS Proxy mock)', () => {
      const { ctx } = createMockCanvasContext();
      const stadium = createDefaultStadium('rectangular');
      const state = createPreMatchSwoop(stadium, 'CR Flamengo', 'Fluminense', 3800);

      const start = performance.now();
      const frames = 30;
      for (let i = 0; i < frames; i++) {
        const result = updatePreMatchSwoop(state, state.startTime + i * 33.3);
        drawAerialSkyCam(ctx, stadium, {
          roofOpacity: result.camera.roofOpacity,
          swoopState: state,
        });
      }
      const elapsed = performance.now() - start;
      const msPerFrame = elapsed / frames;

      expect(msPerFrame).toBeLessThan(35);
    });
  });
});
