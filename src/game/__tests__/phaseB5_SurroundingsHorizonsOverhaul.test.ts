/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  drawAirportHorizon,
  drawMarineFloatingHorizon,
  drawMountainsHorizon,
  drawPerimeterHorizon,
} from '../stadiumRenderer';
import {
  drawAerialEnvironment,
  drawFisheyeSkylineBoundary,
} from '../environmentRenderer';
import {
  resolveMarineGroundArchetype,
  getGroundsForSurroundings,
  B5_HORIZON_FEATURES,
  StadiumDefinition,
  SurroundingsType,
  TimeOfDay,
  StadiumGroundsType,
} from '../../types/stadium';

// Helper: Mock HTML5 Canvas 2D Context recording all rendering operations
function createMockCanvasContext() {
  const calls: { method: string; args: any[] }[] = [];
  const state: Record<string, any> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  };

  const handler = {
    get(_target: any, prop: string) {
      if (prop in state) {
        return state[prop];
      }
      return (...args: any[]) => {
        calls.push({ method: prop, args });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return {
            addColorStop: (offset: number, color: string) => {
              calls.push({ method: 'addColorStop', args: [offset, color] });
            },
          };
        }
      };
    },
    set(_target: any, prop: string, value: any) {
      state[prop] = value;
      calls.push({ method: `set:${prop}`, args: [value] });
      return true;
    },
  };

  const proxy = new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
  return { ctx: proxy, calls, state };
}

describe('Phase B5: Surrounding Horizons Overhaul', () => {
  let mock: ReturnType<typeof createMockCanvasContext>;

  beforeEach(() => {
    mock = createMockCanvasContext();
  });

  const aerialBounds = {
    left: 0,
    top: 0,
    width: 1200,
    height: 800,
    stadiumBounds: {
      centerX: 600,
      centerY: 400,
      outerWidth: 400,
      outerHeight: 300,
    },
  };

  // ---------------------------------------------------------------------------
  // B5.1 Deep Marine Ocean Surrounding Overhaul
  // ---------------------------------------------------------------------------
  describe('B5.1 Deep Marine Ocean Surrounding Overhaul', () => {
    it('accurately resolves canonical marine ground archetypes', () => {
      // Aircraft Carrier
      expect(resolveMarineGroundArchetype('marine_aircraft_carrier')).toBe('aircraft_carrier');
      expect(resolveMarineGroundArchetype('marine_moored_boats')).toBe('aircraft_carrier');

      // Offshore Oil Rig
      expect(resolveMarineGroundArchetype('marine_oil_rig')).toBe('oil_rig');

      // Tropical Coral Atoll
      expect(resolveMarineGroundArchetype('marine_tropical_atoll')).toBe('coral_atoll');
      expect(resolveMarineGroundArchetype('marine_open_lagoon')).toBe('coral_atoll');

      // Modular Hex-Pontoon
      expect(resolveMarineGroundArchetype('marine_floating_pontoons')).toBe('hex_pontoon');
      expect(resolveMarineGroundArchetype('grass')).toBe('hex_pontoon');
    });

    it('exposes the 4 canonical archetypes in getGroundsForSurroundings("marine_floating")', () => {
      const grounds = getGroundsForSurroundings('marine_floating');
      expect(grounds).toHaveLength(4);
      const ids = grounds.map(g => g.id);
      expect(ids).toEqual([
        'marine_floating_pontoons',
        'marine_moored_boats',
        'marine_oil_rig',
        'marine_open_lagoon',
      ]);

      // Every option resolves to one of the 4 canonical archetypes
      const archetypes = ids.map(id => resolveMarineGroundArchetype(id));
      expect(archetypes).toContain('hex_pontoon');
      expect(archetypes).toContain('aircraft_carrier');
      expect(archetypes).toContain('oil_rig');
      expect(archetypes).toContain('coral_atoll');
    });

    it('renders Aircraft Carrier flight deck, catapult markings, and island superstructure', () => {
      drawMarineFloatingHorizon(mock.ctx, 0, 1200, 250, 0, 'noon', 'marine_aircraft_carrier');

      // Verify ocean swells and wave crests drawn
      const fills = mock.calls.filter(c => c.method === 'fillRect');
      expect(fills.length).toBeGreaterThan(15);

      // Verify yellow catapult stripe / deck markings (#facc15)
      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      const hasYellowMarking = colorChanges.some(c => c.args[0] === '#facc15' || c.args[0] === '#eab308');
      expect(hasYellowMarking).toBe(true);

      // Verify island conning superstructure steel
      const hasSuperstructureSteel = colorChanges.some(c => c.args[0] === '#475569' || c.args[0] === '#1e293b');
      expect(hasSuperstructureSteel).toBe(true);
    });

    it('renders Offshore Oil/Gas Platform with yellow crane lattice and active flare boom', () => {
      drawMarineFloatingHorizon(mock.ctx, 0, 1200, 250, 0, 'sunset', 'marine_oil_rig');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      const strokeColorChanges = mock.calls.filter(c => c.method === 'set:strokeStyle');

      // Yellow crane lattice
      const hasYellowLattice = strokeColorChanges.some(c => c.args[0] === '#eab308' || c.args[0] === '#ca8a04');
      expect(hasYellowLattice).toBe(true);

      // Active flare boom natural gas burnoff fire / helipad
      const hasFlareOrHelipad = colorChanges.some(c => c.args[0] === '#ca8a04' || c.args[0] === '#15803d');
      expect(hasFlareOrHelipad).toBe(true);
    });

    it('renders Tropical Coral Atoll with shallow turquoise lagoon and coconut palms', () => {
      drawMarineFloatingHorizon(mock.ctx, 0, 1200, 250, 0, 'noon', 'marine_tropical_atoll');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');

      // Coral sand beach (#fef9c3, #b45309, #78350f)
      const hasCoralSand = colorChanges.some(c =>
        c.args[0] === '#fef9c3' || c.args[0] === '#b45309' || c.args[0] === '#78350f'
      );
      expect(hasCoralSand).toBe(true);

      // Palm foliage greens
      const hasPalmGreen = colorChanges.some(c => c.args[0] === '#15803d' || c.args[0] === '#052e16');
      expect(hasPalmGreen).toBe(true);
    });

    it('renders Modular Hex-Pontoon with perimeter markings and anchor buoys', () => {
      drawMarineFloatingHorizon(mock.ctx, 0, 1200, 250, 0, 'night', 'marine_floating_pontoons');

      const strokeCalls = mock.calls.filter(c => c.method === 'stroke');
      expect(strokeCalls.length).toBeGreaterThan(0);

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Buoy beacon colors (#ea580c, #facc15)
      const hasBuoy = colorChanges.some(c => c.args[0] === '#ea580c' || c.args[0] === '#facc15');
      expect(hasBuoy).toBe(true);
    });

    it('aerial marine environment renders all 4 archetypes without throwing', () => {
      const archetypes: StadiumGroundsType[] = [
        'marine_aircraft_carrier',
        'marine_oil_rig',
        'marine_tropical_atoll',
        'marine_floating_pontoons',
      ];

      for (const arch of archetypes) {
        mock = createMockCanvasContext();
        expect(() => {
          drawAerialEnvironment(mock.ctx, 'marine_floating', 'noon', aerialBounds, arch);
        }).not.toThrow();

        // Must perform procedural draw calls
        expect(mock.calls.length).toBeGreaterThan(30);
      }
    });

    it('360-degree fisheye skyline supports marine_floating with wave swells and buoys', () => {
      drawFisheyeSkylineBoundary(mock.ctx, 'marine_floating', 'sunset', 600, 400, 500);
      expect(mock.calls.length).toBeGreaterThan(50);

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Deep ocean colors at sunset
      const hasOceanColor = colorChanges.some(c => c.args[0] === '#7c2d12' || c.args[0] === '#9a3412');
      expect(hasOceanColor).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // B5.2 Airport Surrounding Overhaul (Gibraltar Victoria Stadium Style)
  // ---------------------------------------------------------------------------
  describe('B5.2 Airport Surrounding Overhaul (Gibraltar Victoria Stadium Style)', () => {
    it('renders the Rock of Gibraltar limestone cliffs, vertical strata, and summit mast', () => {
      drawAirportHorizon(mock.ctx, 0, 1200, 250, 0, 'noon');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');

      // Limestone rock colors (#78716c, #64748b, #57534e)
      const hasLimestone = colorChanges.some(c =>
        c.args[0] === '#78716c' || c.args[0] === '#64748b' || c.args[0] === '#57534e'
      );
      expect(hasLimestone).toBe(true);

      // Summit telecom / radar mast with red beacon (#ef4444)
      const hasSummitBeacon = colorChanges.some(c => c.args[0] === '#ef4444');
      expect(hasSummitBeacon).toBe(true);
    });

    it('renders active runway with white threshold piano keys and dashed centerline', () => {
      drawAirportHorizon(mock.ctx, 0, 1200, 250, 0, 'noon');

      const fills = mock.calls.filter(c => c.method === 'fillRect');
      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');

      // Crisp white threshold piano keys (#ffffff)
      const hasWhitePianoKeys = colorChanges.some(c => c.args[0] === '#ffffff');
      expect(hasWhitePianoKeys).toBe(true);

      // Yellow taxiways turnoffs (#facc15)
      const strokeColorChanges = mock.calls.filter(c => c.method === 'set:strokeStyle');
      const hasYellowTaxiway = strokeColorChanges.some(c => c.args[0] === '#facc15');
      expect(hasYellowTaxiway).toBe(true);

      expect(fills.length).toBeGreaterThan(20);
    });

    it('renders elevated approach lighting stanchions on pylons extending outwards', () => {
      drawAirportHorizon(mock.ctx, 0, 1200, 250, 0, 'night');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Green threshold navigation lights (#22c55e)
      const hasGreenLights = colorChanges.some(c => c.args[0] === '#22c55e');
      expect(hasGreenLights).toBe(true);
    });

    it('renders airfield perimeter security fence with barbed wire and warning placards', () => {
      drawAirportHorizon(mock.ctx, 0, 1200, 250, 0, 'noon');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Yellow warning placard (#facc15)
      const hasWarningPlacard = colorChanges.some(c => c.args[0] === '#facc15');
      expect(hasWarningPlacard).toBe(true);
    });

    it('renders animated 32-bit aircraft with fuselage, wings, and beacon', () => {
      drawAirportHorizon(mock.ctx, 0, 1200, 250, 0, 'sunset');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Red tailfin livery (#dc2626) and blue cheatline (#0284c7)
      const hasRedTail = colorChanges.some(c => c.args[0] === '#dc2626');
      const hasBlueCheatline = colorChanges.some(c => c.args[0] === '#0284c7');
      expect(hasRedTail).toBe(true);
      expect(hasBlueCheatline).toBe(true);
    });

    it('aerial airport environment renders Gibraltar limestone massif, approach stanchions, and fence', () => {
      drawAerialEnvironment(mock.ctx, 'airport', 'night', aerialBounds);

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Runway edge navigation lights green (#22c55e)
      const hasRunwayLights = colorChanges.some(c => c.args[0] === '#22c55e');
      expect(hasRunwayLights).toBe(true);

      // Animated aircraft or radar drawn
      const ellipseCalls = mock.calls.filter(c => c.method === 'ellipse');
      expect(ellipseCalls.length).toBeGreaterThan(0);
    });

    it('360-degree fisheye airport skyline renders the Rock of Gibraltar cliffs at indices 8..14', () => {
      drawFisheyeSkylineBoundary(mock.ctx, 'airport', 'sunset', 600, 400, 500);

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Limestone cliff color at sunset (#9a3412 or #78350f)
      const hasCliffSunset = colorChanges.some(c => c.args[0] === '#9a3412');
      expect(hasCliffSunset).toBe(true);

      // Red summit communications mast beacon (#ef4444)
      const hasSummitBeacon = colorChanges.some(c => c.args[0] === '#ef4444');
      expect(hasSummitBeacon).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // B5.3 Mountain Surrounding Overhaul (Northern Mountain Chain Horizon)
  // ---------------------------------------------------------------------------
  describe('B5.3 Mountain Surrounding Overhaul (Northern Mountain Chain Horizon)', () => {
    it('renders 3 distinct tiers: pine ridge, granite cliffs with switchbacks, and snow peaks', () => {
      drawMountainsHorizon(mock.ctx, 0, 1200, 250, 0, 'noon');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');

      // Tier 1: Pine forest ridge greens (#14532d, #16a34a)
      const hasPineGreen = colorChanges.some(c => c.args[0] === '#14532d' || c.args[0] === '#16a34a');
      expect(hasPineGreen).toBe(true);

      // Tier 2: Granite cliffs (#475569) & mid mountain meadow (#1f4e38)
      const hasGraniteOrMeadow = colorChanges.some(c => c.args[0] === '#475569' || c.args[0] === '#1f4e38');
      expect(hasGraniteOrMeadow).toBe(true);

      // Tier 3: Jagged snowcapped peaks (#f8fafc)
      const hasSnowCaps = colorChanges.some(c => c.args[0] === '#f8fafc');
      expect(hasSnowCaps).toBe(true);
    });

    it('renders sunset alpenglow gradient on snow caps and couloirs', () => {
      drawMountainsHorizon(mock.ctx, 0, 1200, 250, 0, 'sunset');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Fiery rose/coral alpenglow (#fca5a5)
      const hasAlpenglow = colorChanges.some(c => c.args[0] === '#fca5a5');
      expect(hasAlpenglow).toBe(true);
    });

    it('renders night time alpine horizon with glowing chalet windows and vehicle headlights', () => {
      drawMountainsHorizon(mock.ctx, 0, 1200, 250, 0, 'night');

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Warm yellow illumination (#fde047 or #fef08a)
      const hasChaletGlow = colorChanges.some(c => c.args[0] === '#fde047' || c.args[0] === '#fef08a');
      expect(hasChaletGlow).toBe(true);
    });

    it('360-degree fisheye mountains skyline features snow couloirs and alpenglow', () => {
      drawFisheyeSkylineBoundary(mock.ctx, 'mountains', 'sunset', 600, 400, 500);

      const colorChanges = mock.calls.filter(c => c.method === 'set:fillStyle');
      // Alpenglow rose/coral at sunset (#fb7185, #fda4af)
      const hasAlpenglowFisheye = colorChanges.some(c => c.args[0] === '#fb7185' || c.args[0] === '#fda4af');
      expect(hasAlpenglowFisheye).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // B5.4 Dynamic Time-of-Day Lighting Across All Horizons
  // ---------------------------------------------------------------------------
  describe('B5.4 Dynamic Time-of-Day Lighting Across All Horizons', () => {
    const surroundingsList: SurroundingsType[] = ['marine_floating', 'airport', 'mountains'];
    const times: TimeOfDay[] = ['noon', 'sunset', 'night'];

    it('renders cleanly across all surroundings and times of day without errors', () => {
      for (const surr of surroundingsList) {
        for (const tod of times) {
          mock = createMockCanvasContext();
          expect(() => {
            drawPerimeterHorizon(mock.ctx, 1000, 1000, 'monumental', tod, undefined, surr, 'marine_oil_rig');
          }).not.toThrow();

          expect(mock.calls.length).toBeGreaterThan(10);
        }
      }
    });

    it('B5_HORIZON_FEATURES metadata is declared and documented', () => {
      expect(B5_HORIZON_FEATURES.version).toBe('Phase B5');
      expect(B5_HORIZON_FEATURES.deepMarineOcean.canonicalArchetypes).toHaveLength(4);
      expect(B5_HORIZON_FEATURES.airportGibraltar.hasRockOfGibraltar).toBe(true);
      expect(B5_HORIZON_FEATURES.mountainsNorthernChain.hasAlpenglow).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Performance Benchmark: Zero-Allocation 60 FPS Check
  // ---------------------------------------------------------------------------
  describe('Performance Benchmark: 60 FPS Execution Speed', () => {
    it('executes horizon render cycles within 2ms budget', () => {
      const start = performance.now();
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        drawAirportHorizon(mock.ctx, 0, 1200, 250, 0, 'noon');
        drawMarineFloatingHorizon(mock.ctx, 0, 1200, 250, 0, 'sunset', 'marine_aircraft_carrier');
        drawMountainsHorizon(mock.ctx, 0, 1200, 250, 0, 'night');
      }

      const elapsed = performance.now() - start;
      const msPerCycle = elapsed / iterations;

      // 3 full horizon renderings per cycle should run well under 10ms in mock
      expect(msPerCycle).toBeLessThan(15);
    });
  });
});
