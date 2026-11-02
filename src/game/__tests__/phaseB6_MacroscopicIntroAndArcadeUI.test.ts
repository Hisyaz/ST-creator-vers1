/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchEngine } from '../engine';
import {
  B6_INTRO_FEATURES,
  createPreMatchSwoop,
  createUltraWidePreMatchSwoop,
  updatePreMatchSwoop,
} from '../skyCamRenderer';
import { PITCH_CONFIG } from '../constants';

describe('Phase B6: Ultra-Wide Macroscopic Intro (5% Fisheye to Pitch Glide) & 32-Bit Menu UI Polish', () => {
  let engine: MatchEngine;

  beforeEach(() => {
    engine = new MatchEngine();
  });

  describe('B6.1: Ultra-Wide Macroscopic Intro Progression (5% Zoom to Pitch Glide)', () => {
    it('exports authoritative B6_INTRO_FEATURES configuration metadata', () => {
      expect(B6_INTRO_FEATURES).toBeDefined();
      expect(B6_INTRO_FEATURES.version).toBe('Phase B6');
      expect(B6_INTRO_FEATURES.ultraWideMacroscopic.startZoom).toBe(0.05);
      expect(B6_INTRO_FEATURES.ultraWideMacroscopic.stage1GlobalVistaZoom).toEqual([0.05, 0.08]);
      expect(B6_INTRO_FEATURES.ultraWideMacroscopic.stage2AtmosphericDiveZoom).toEqual([0.08, 0.35]);
      expect(B6_INTRO_FEATURES.ultraWideMacroscopic.stage3CanopyGlideZoom).toEqual([0.35, 0.80]);
      expect(B6_INTRO_FEATURES.ultraWideMacroscopic.stage4PitchHandoffZoom).toEqual([0.80, 1.05]);
      expect(B6_INTRO_FEATURES.ultraWideMacroscopic.hasCubicBezierAcceleration).toBe(true);
      expect(B6_INTRO_FEATURES.ultraWideMacroscopic.isFullySkippable).toBe(true);
    });

    it('initializes ultra-wide swoop with exact 5% zoom (0.05)', () => {
      const swoop = createUltraWidePreMatchSwoop(engine.activeStadium, 'Home', 'Away', 4200);
      expect(swoop.isUltraWide).toBe(true);
      expect(swoop.startZoom).toBe(0.05);
      expect(swoop.durationMs).toBe(4200);
      expect(swoop.progress).toBe(0.0);
      expect(swoop.phase).toBe(1);
    });

    it('maintains backwards compatibility for non-ultrawide swoop starting at 0.25 zoom', () => {
      const standardSwoop = createPreMatchSwoop(engine.activeStadium, 'Home', 'Away', 3800);
      expect(standardSwoop.isUltraWide).toBe(false);
      expect(standardSwoop.startZoom).toBe(0.25);

      const explicitUltraWideSwoop = createPreMatchSwoop(engine.activeStadium, 'Home', 'Away', 4200, { isUltraWide: true });
      expect(explicitUltraWideSwoop.isUltraWide).toBe(true);
      expect(explicitUltraWideSwoop.startZoom).toBe(0.05);
    });

    it('engine.startUltraWidePreMatchSwoop initializes camera zoom to 0.05 with high altitude tilt', () => {
      engine.startUltraWidePreMatchSwoop(4200);
      expect(engine.preMatchSwoop).not.toBeNull();
      expect(engine.preMatchSwoop?.isUltraWide).toBe(true);
      expect(engine.preMatchSwoop?.startZoom).toBe(0.05);
      expect(engine.camera.zoom).toBeCloseTo(0.05, 3);
      expect(engine.camera.pitchTilt).toBe(0.24);
      expect(engine.camera.y).toBe(PITCH_CONFIG.CENTER_Y - 320);
    });

    it('engine.startPreMatchSwoop accepts isUltraWide flag', () => {
      // Default false for legacy regression tests
      engine.startPreMatchSwoop(3800, false);
      expect(engine.camera.zoom).toBe(0.25);

      // True for B6 ultra-wide intro
      engine.startPreMatchSwoop(4200, true);
      expect(engine.camera.zoom).toBe(0.05);
    });

    it('progresses smoothly through all 4 stages from 0.05 to 1.05', () => {
      const swoop = createUltraWidePreMatchSwoop(engine.activeStadium, 'Home', 'Away', 4000);
      const startT = swoop.startTime;

      // Stage 1: Global Vista (t = 0.08)
      const res1 = updatePreMatchSwoop(swoop, startT + 320);
      expect(res1.camera.zoom).toBeGreaterThanOrEqual(0.05);
      expect(res1.camera.zoom).toBeLessThan(0.10);
      expect(res1.phase).toBe(1);

      // Stage 2: Atmospheric Dive (t = 0.35)
      const res2 = updatePreMatchSwoop(swoop, startT + 1400);
      expect(res2.camera.zoom).toBeGreaterThanOrEqual(0.08);
      expect(res2.camera.zoom).toBeLessThan(0.40);
      expect(res2.phase).toBe(2);

      // Stage 3: Canopy Glide & Roof Dissolve (t = 0.70)
      const res3 = updatePreMatchSwoop(swoop, startT + 2800);
      expect(res3.camera.zoom).toBeGreaterThanOrEqual(0.35);
      expect(res3.camera.zoom).toBeLessThan(0.85);
      expect(res3.phase).toBe(3);

      // Stage 4: Pitch Handoff (t = 1.0)
      const res4 = updatePreMatchSwoop(swoop, startT + 4100);
      expect(res4.isComplete).toBe(true);
      expect(res4.camera.zoom).toBeCloseTo(1.05, 2);
      expect(res4.camera.pitchTilt).toBe(0.5);
      expect(res4.camera.y).toBe(PITCH_CONFIG.CENTER_Y);
    });

    it('supports instant skip via engine.skipPreMatchSwoop at any frame without jitter', () => {
      engine.startUltraWidePreMatchSwoop(4200);
      expect(engine.isPreMatchSwoopActive()).toBe(true);

      // Skip the swoop
      engine.skipPreMatchSwoop();
      expect(engine.isPreMatchSwoopActive()).toBe(false);
      expect(engine.preMatchSwoop?.isSkipped).toBe(true);
      expect(engine.camera.zoom).toBe(1.05);
      expect(engine.camera.x).toBe(PITCH_CONFIG.CENTER_X);
      expect(engine.camera.y).toBe(PITCH_CONFIG.CENTER_Y);
      expect(engine.camera.pitchTilt).toBe(0.5);
    });
  });

  describe('B6.2: 32-Bit Arcade Console UI Polish & Invariants', () => {
    it('verifies arcade styling features and tokens are recorded', () => {
      expect(B6_INTRO_FEATURES.arcadeUiPolish.hasMetallicBevels).toBe(true);
      expect(B6_INTRO_FEATURES.arcadeUiPolish.hasCornerRivets).toBe(true);
      expect(B6_INTRO_FEATURES.arcadeUiPolish.hasEmbossedButtons).toBe(true);
      expect(B6_INTRO_FEATURES.arcadeUiPolish.zeroScrollDiscipline).toBe(true);
    });
  });

  describe('B6.3: High Performance 60 FPS Microsecond Guarantee', () => {
    it('executes 1000 swoop update iterations well under 50ms total (<0.05ms per frame)', () => {
      const swoop = createUltraWidePreMatchSwoop(engine.activeStadium, 'Home', 'Away', 4200);
      const startT = swoop.startTime;

      const benchStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        updatePreMatchSwoop(swoop, startT + (i * 4.2) % 4200);
      }
      const benchElapsed = performance.now() - benchStart;

      // Ensure execution is lightning-fast and generates zero frame stutter
      expect(benchElapsed).toBeLessThan(50);
    });
  });
});
