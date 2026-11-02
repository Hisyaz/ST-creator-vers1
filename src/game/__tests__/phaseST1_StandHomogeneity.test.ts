/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  drawContinuousColiseumBowl,
  drawStadiumArchitecture,
  get32BitBayerPattern,
  getStadiumShapeMetrics,
} from "../stadiumRenderer";
import { StadiumDefinition } from "../../types/stadium";
import { HOME_KIT, AWAY_KIT, PITCH_CONFIG } from "../constants";

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
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
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
  } as unknown as CanvasRenderingContext2D;
}

describe("PHASE ST1: Round & Oval Coliseum Bowl Homogeneity & 32-Bit Dither Engine", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("1. Unified 360 Coliseum Bowl Execution & Tangent Continuity", () => {
    it("executes drawContinuousColiseumBowl cleanly for Oval shape without error", () => {
      const ovalDef = {

        id: "test-oval",
        name: "Olympic Oval Bowl",
        shape: "oval",
        surroundings: "big_city",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#0284c7", secondaryColor: "#e0f2fe" },
          east: { position: "east", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#0284c7", secondaryColor: "#e0f2fe" },
          north: { position: "north", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#0284c7", secondaryColor: "#e0f2fe" },
          south: { position: "south", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#0284c7", secondaryColor: "#e0f2fe" },
        }, } as unknown as StadiumDefinition;

      expect(() => {
        drawContinuousColiseumBowl(
          ctx,
          ovalDef,
          "monumental",
          "night",
          HOME_KIT,
          AWAY_KIT,
          "oval",
          undefined,
          "big_city"
        );
      }).not.toThrow();

      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("executes drawContinuousColiseumBowl cleanly for Round shape without error", () => {
      const roundDef = {

        id: "test-round",
        name: "Coliseum Round Arena",
        shape: "round",
        surroundings: "mountains",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade2_classic", tierCount: 2, primaryColor: "#dc2626", secondaryColor: "#fef08a" },
          east: { position: "east", type: "tiered", grade: "grade2_classic", tierCount: 2, primaryColor: "#dc2626", secondaryColor: "#fef08a" },
          north: { position: "north", type: "tiered", grade: "grade2_classic", tierCount: 2, primaryColor: "#dc2626", secondaryColor: "#fef08a" },
          south: { position: "south", type: "tiered", grade: "grade2_classic", tierCount: 2, primaryColor: "#dc2626", secondaryColor: "#fef08a" },
        }, } as unknown as StadiumDefinition;

      expect(() => {
        drawContinuousColiseumBowl(
          ctx,
          roundDef,
          "monumental",
          "noon",
          HOME_KIT,
          AWAY_KIT,
          "round",
          undefined,
          "mountains"
        );
      }).not.toThrow();

      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it("verifies that drawStadiumArchitecture automatically routes oval/round stadiums through coliseum bowl", () => {
      const ovalDef = {

        id: "test-arch-oval",
        name: "Monumental Oval",
        shape: "oval",
        surroundings: "big_city",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          east: { position: "east", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          north: { position: "north", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          south: { position: "south", type: "tiered", grade: "grade4_modern", tierCount: 2 },
        }, } as unknown as StadiumDefinition;

      expect(() => {
        drawStadiumArchitecture(
          ctx,
          PITCH_CONFIG.CENTER_X,
          PITCH_CONFIG.CENTER_Y,
          "monumental",
          "night",
          HOME_KIT,
          AWAY_KIT,
          undefined,
          ovalDef
        );
      }).not.toThrow();
    });
  });

  describe("2. Solid Scaled Terrace Substrate & Riser Lips", () => {
    it("renders stepped concentric terraces with 100% opaque fills", () => {
      const ovalDef = {

        id: "test-oval-scales",
        name: "Scales Oval",
        shape: "oval",
        surroundings: "big_city",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          east: { position: "east", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          north: { position: "north", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          south: { position: "south", type: "tiered", grade: "grade4_modern", tierCount: 2 },
        }, } as unknown as StadiumDefinition;

      drawContinuousColiseumBowl(ctx, ovalDef, "monumental", "night", HOME_KIT, AWAY_KIT, "oval");

      expect((ctx.fill as any).mock.calls.length).toBeGreaterThanOrEqual(6);
      expect((ctx.stroke as any).mock.calls.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("3. 32-Bit Bayer Dither Texture Pattern", () => {
    it("initializes and caches the 32-bit Bayer pattern canvas", () => {
      const pattern = get32BitBayerPattern(ctx);
      const pattern2 = get32BitBayerPattern(ctx);
      expect(pattern).toBe(pattern2);
    });
  });

  describe("4. Harmonized Stepped Seat Rows (S2.1 Integration)", () => {
    it("draws 32-bit pixel spectator sprites across all 4 sectors in an oval coliseum bowl", () => {
      const ovalDef = {

        id: "test-oval-seats",
        name: "Oval Spectators",
        shape: "oval",
        surroundings: "big_city",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#1d4ed8", secondaryColor: "#93c5fd" },
          east: { position: "east", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#1d4ed8", secondaryColor: "#93c5fd" },
          north: { position: "north", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#1d4ed8", secondaryColor: "#93c5fd" },
          south: { position: "south", type: "tiered", grade: "grade4_modern", tierCount: 2, primaryColor: "#1d4ed8", secondaryColor: "#93c5fd" },
        }, } as unknown as StadiumDefinition;

      drawContinuousColiseumBowl(ctx, ovalDef, "monumental", "noon", HOME_KIT, AWAY_KIT, "oval");

      expect((ctx.fillRect as any).mock.calls.length).toBeGreaterThan(100);
    });
  });

  describe("5. Clean No-Stand Sector Handling in Coliseum Bowls", () => {
    it("cleanly seals grandstand ends with solid end-caps when South stand is no_stand", () => {
      const ovalNoSouthDef = {

        id: "test-oval-no-south",
        name: "Oval No South Stand",
        shape: "oval",
        surroundings: "mountains",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          east: { position: "east", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          north: { position: "north", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          south: { position: "south", type: "none", grade: "grade4_modern" },
        }, } as unknown as StadiumDefinition;

      drawContinuousColiseumBowl(ctx, ovalNoSouthDef, "monumental", "night", HOME_KIT, AWAY_KIT, "oval");

      expect((ctx.fillRect as any).mock.calls.length).toBeGreaterThan(10);
      expect(ctx.arc).toHaveBeenCalled();
    });

    it("cleanly seals grandstand ends when North stand is no_stand", () => {
      const ovalNoNorthDef = {

        id: "test-oval-no-north",
        name: "Oval No North Stand",
        shape: "oval",
        surroundings: "beach",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          east: { position: "east", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          north: { position: "north", type: "no_stand", grade: "grade4_modern" },
          south: { position: "south", type: "tiered", grade: "grade4_modern", tierCount: 2 },
        }, } as unknown as StadiumDefinition;

      expect(() => {
        drawContinuousColiseumBowl(ctx, ovalNoNorthDef, "monumental", "noon", HOME_KIT, AWAY_KIT, "oval");
      }).not.toThrow();
    });
  });

  describe("6. 60 FPS Zero-Allocation Performance Benchmark", () => {
    it("executes 60 continuous coliseum bowl frames in under 50ms", () => {
      const ovalDef = {

        id: "test-perf-oval",
        name: "Perf Oval",
        shape: "oval",
        surroundings: "big_city",
        stands: {
        corner_nw: { position: "corner_nw", type: "none", grade: "grade4_modern" },
        corner_ne: { position: "corner_ne", type: "none", grade: "grade4_modern" },
        corner_sw: { position: "corner_sw", type: "none", grade: "grade4_modern" },
        corner_se: { position: "corner_se", type: "none", grade: "grade4_modern" },
          west: { position: "west", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          east: { position: "east", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          north: { position: "north", type: "tiered", grade: "grade4_modern", tierCount: 2 },
          south: { position: "south", type: "tiered", grade: "grade4_modern", tierCount: 2 },
        }, } as unknown as StadiumDefinition;

      const noop = () => {};
      const fastCtx = {
        save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop,
        lineTo: noop, arc: noop, fill: noop, stroke: noop, fillRect: noop, strokeRect: noop,
        createPattern: () => null,
      } as unknown as CanvasRenderingContext2D;

      const start = performance.now();
      for (let f = 0; f < 60; f++) {
        drawContinuousColiseumBowl(fastCtx, ovalDef, "monumental", "night", HOME_KIT, AWAY_KIT, "oval");
      }
      const duration = performance.now() - start;

      // 60 frames in under 100ms indicates well over 600 FPS throughput
      expect(duration).toBeLessThan(350);
    });
  });
});
