/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import {
  CORE_GROUNDS_ARCHETYPES,
  getGroundsForSurroundings,
  getDefaultGroundsForSurroundings,
  StadiumDefinition,
  SurroundingsType,
} from '../../types/stadium';
import {
  drawImmediateStadiumGrounds,
  drawStadiumArchitecture,
} from '../stadiumRenderer';
import { drawAerialSkyCam } from '../skyCamRenderer';
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
    quadraticCurveTo: vi.fn(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D;
}

describe('PHASE ST3: Immediate Stadium Grounds & Forecourt Concourse Engine', () => {
  describe('ST3.1 Core Grounds Archetypes & Selector Catalog', () => {
    it('defines all 9 core grounds archetypes with valid labels, icons and descriptions', () => {
      expect(CORE_GROUNDS_ARCHETYPES.length).toBe(9);
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
      for (const id of expectedIds) {
        const found = CORE_GROUNDS_ARCHETYPES.find((o) => o.id === id);
        expect(found).toBeDefined();
        expect(found?.label.length).toBeGreaterThan(0);
        expect(found?.icon.length).toBeGreaterThan(0);
        expect(found?.desc.length).toBeGreaterThan(15);
      }
    });
  });

  describe('ST3.2 Homogeneity Principle & Surroundings-Fused Filtering', () => {
    it('strictly confines marine_floating surroundings to marine/aquatic forecourts', () => {
      const marineOptions = getGroundsForSurroundings('marine_floating');
      expect(marineOptions.length).toBe(4);
      expect(marineOptions.map((o) => o.id)).toEqual([
        'marine_floating_pontoons',
        'marine_moored_boats',
        'marine_oil_rig',
        'marine_open_lagoon',
      ]);
      // Ensure zero dry-land options leak into floating marina arena
      expect(marineOptions.some((o) => o.id === 'mall_commercial')).toBe(false);
      expect(marineOptions.some((o) => o.id === 'parking_lots')).toBe(false);
      expect(marineOptions.some((o) => o.id === 'potrero_dirt')).toBe(false);
    });

    it('provides specialized airport forecourts alongside core options', () => {
      const airportOptions = getGroundsForSurroundings('airport');
      const ids = airportOptions.map((o) => o.id);
      expect(ids).toContain('airport_runway_tarmac');
      expect(ids).toContain('airport_aircraft_apron');
      expect(ids).toContain('airport_cargo_yard');
      expect(ids).toContain('airport_service_boulevard');
      expect(ids).toContain('parking_lots');
    });

    it('provides specialized railroad forecourts', () => {
      const railOptions = getGroundsForSurroundings('railroad');
      const ids = railOptions.map((o) => o.id);
      expect(ids).toContain('railroad_train_platforms');
      expect(ids).toContain('railroad_switching_yard');
      expect(ids).toContain('industrial_depot');
    });

    it('provides specialized beach forecourts', () => {
      const beachOptions = getGroundsForSurroundings('beach');
      const ids = beachOptions.map((o) => o.id);
      expect(ids).toContain('beach_boardwalk_cabanas');
      expect(ids).toContain('beach_dune_paths');
    });

    it('provides specialized mountain, forest, and savannah forecourts', () => {
      const mtOptions = getGroundsForSurroundings('mountains');
      expect(mtOptions.map((o) => o.id)).toContain('mountains_granite_terrace');

      const forestOptions = getGroundsForSurroundings('forest');
      expect(forestOptions.map((o) => o.id)).toContain('forest_logging_camp');

      const savannahOptions = getGroundsForSurroundings('savannah');
      expect(savannahOptions.map((o) => o.id)).toContain('savannah_wadi_potrero');
    });

    it('returns authentic default grounds for all surroundings types', () => {
      expect(getDefaultGroundsForSurroundings('marine_floating')).toBe('marine_floating_pontoons');
      expect(getDefaultGroundsForSurroundings('airport')).toBe('airport_runway_tarmac');
      expect(getDefaultGroundsForSurroundings('railroad')).toBe('railroad_train_platforms');
      expect(getDefaultGroundsForSurroundings('beach')).toBe('beach_boardwalk_cabanas');
      expect(getDefaultGroundsForSurroundings('mountains')).toBe('mountains_granite_terrace');
      expect(getDefaultGroundsForSurroundings('forest')).toBe('forest_pine_trail');
      expect(getDefaultGroundsForSurroundings('savannah')).toBe('savannah_wadi_potrero');
      expect(getDefaultGroundsForSurroundings('highway')).toBe('highway_viaduct_pillars');
      expect(getDefaultGroundsForSurroundings('small_city')).toBe('classical_statues');
      expect(getDefaultGroundsForSurroundings('big_city')).toBe('mall_commercial');
      expect(getDefaultGroundsForSurroundings('parking_lot')).toBe('parking_lots');
    });
  });

  describe('ST3.3 Canonical Presets Integration', () => {
    it('initializes canonical stadiums with authentic default grounds', () => {
      expect(ESTADIO_MONUMENTAL.grounds).toBe('parking_lots');
      expect(LA_BOMBONERA.grounds).toBe('municipal_thoroughfare');
      expect(SANTIAGO_BERNABEU.grounds).toBe('mall_commercial');
      expect(CRAVEN_COTTAGE.grounds).toBe('classical_statues');
      expect(ESTADIO_TECHO.grounds).toBe('potrero_dirt');
      expect(MARACANA_LEGEND.grounds).toBe('park_recreation');
      expect(VICTORIA_AIRPORT_GROUND.grounds).toBe('airport_runway_tarmac');
      expect(FLOATING_MARINA_ARENA.grounds).toBe('marine_floating_pontoons');
      expect(createDefaultStadium().grounds).toBe('parking_lots');
    });

    it('verifies all registered canonical stadiums have valid grounds', () => {
      for (const stadium of Object.values(STADIUM_REGISTRY)) {
        expect(stadium.grounds).toBeDefined();
        expect(typeof stadium.grounds).toBe('string');
      }
    });
  });

  describe('ST3.4 Immediate Grounds Procedural Renderer (drawImmediateStadiumGrounds)', () => {
    it('renders rectangular concourse without throwing errors', () => {
      const ctx = createMockContext();
      const stadium: StadiumDefinition = {
        ...createDefaultStadium(),
        shape: 'rectangular',
        grounds: 'classical_statues',
      };
      expect(() => {
        drawImmediateStadiumGrounds(ctx, 930, 1470, stadium, 'monumental', 'night');
      }).not.toThrow();
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('renders round coliseum concourse ribbon cleanly', () => {
      const ctx = createMockContext();
      const stadium: StadiumDefinition = {
        ...createDefaultStadium(),
        shape: 'round',
        grounds: 'parking_lots',
      };
      expect(() => {
        drawImmediateStadiumGrounds(ctx, 930, 1470, stadium, 'monumental', 'noon');
      }).not.toThrow();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.clip).toHaveBeenCalled();
    });

    it('renders oval athletics stadium concourse cleanly', () => {
      const ctx = createMockContext();
      const stadium: StadiumDefinition = {
        ...createDefaultStadium(),
        shape: 'oval',
        grounds: 'industrial_depot',
      };
      expect(() => {
        drawImmediateStadiumGrounds(ctx, 930, 1470, stadium, 'monumental', 'sunset');
      }).not.toThrow();
      expect(ctx.clip).toHaveBeenCalled();
    });

    it('renders marine pontoon docks cleanly', () => {
      const ctx = createMockContext();
      const stadium: StadiumDefinition = {
        ...FLOATING_MARINA_ARENA,
        grounds: 'marine_floating_pontoons',
      };
      expect(() => {
        drawImmediateStadiumGrounds(ctx, 930, 1470, stadium, 'monumental', 'night');
      }).not.toThrow();
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  describe('ST3.5 No-Stand Midground Concourse Integration', () => {
    it('seamlessly renders midground concourse behind barrier on open stand', () => {
      const ctx = createMockContext();
      const defaultStad = createDefaultStadium();
      const stadium: StadiumDefinition = {
        ...defaultStad,
        grounds: 'classical_statues',
        stands: {
          ...defaultStad.stands,
          west: {
            position: 'west',
            type: 'none',
            grade: 'grade2_classic',
            perimeterFinish: 'brick_wall',
            backdrop: 'small_houses',
          },
          east: { position: 'east', type: 'tiered', tierCount: 2, grade: 'grade2_classic' },
          north: { position: 'north', type: 'tiered', tierCount: 2, grade: 'grade2_classic' },
          south: { position: 'south', type: 'tiered', tierCount: 2, grade: 'grade2_classic' },
        },
      };

      expect(() => {
        drawStadiumArchitecture(ctx, 930, 1470, 'craven', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);
      }).not.toThrow();
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  describe('ST3.6 Aerial Sky-Cam Synchronization', () => {
    it('renders aerial sky-cam with grounds concourse synchronization', () => {
      const ctx = createMockContext();
      const stadium: StadiumDefinition = {
        ...createDefaultStadium(),
        grounds: 'modern_architectural',
      };

      expect(() => {
        drawAerialSkyCam(ctx, stadium, {
          roofOpacity: 1.0,
          timeOfDay: 'noon',
        });
      }).not.toThrow();
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  describe('ST3.7 Backward Compatibility & Serialization', () => {
    it('gracefully handles missing grounds field using fallback helper', () => {
      const legacyStadium: Partial<StadiumDefinition> = {
        id: 'legacy-venue',
        name: 'Legacy Ground',
        surroundings: 'marine_floating',
      };
      const resolved = legacyStadium.grounds || getDefaultGroundsForSurroundings(legacyStadium.surroundings as SurroundingsType);
      expect(resolved).toBe('marine_floating_pontoons');
    });
  });
});
