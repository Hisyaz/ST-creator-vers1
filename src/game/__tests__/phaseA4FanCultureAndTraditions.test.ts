import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveCulturalRegion,
  getDefaultFanCulture,
  getDefaultHomeVenueConfig,
  saveTeamCustomization,
  resetTeamCustomization,
  getTeamById,
} from '../teamDatabase';
import { MatchEngine } from '../engine';
import {
  triggerMatchdayEntranceAtmosphere,
  triggerGoalCelebrationAtmosphere,
  getStandTremorOffset,
  triggerStandTremor,
  updateAtmosphereParticles,
  activeTurfPaperDebris,
  activeFloatingBubbles,
  activeTifoState,
  clearMatchdayAtmosphere,
} from '../crowdRenderer';
import { audio } from '../audio';
import { TeamHomeVenueConfig } from '../../types/team';

describe('Phase A4: Fan Culture Engine, Ultra Traditions & Regional Match Atmosphere', () => {
  beforeEach(() => {
    clearMatchdayAtmosphere();
  });

  describe('A4.1: Geographic Cultural Identity & Demographic Resolution', () => {
    it('correctly maps South American / Latin clubs to south_american cultural region', () => {
      expect(resolveCulturalRegion('Argentina', 'conmebol')).toBe('south_american');
      expect(resolveCulturalRegion('Brazil', 'conmebol')).toBe('south_american');
      expect(resolveCulturalRegion('Colombia', 'conmebol')).toBe('south_american');
      expect(resolveCulturalRegion('Uruguay', 'conmebol')).toBe('south_american');

      const boca = getTeamById('boca_juniors_2026');
      const bocaCulture = getDefaultFanCulture(boca);
      expect(bocaCulture.culturalRegion).toBe('south_american');
      expect(bocaCulture.fanAcoustics).toBe('murga');
      expect(bocaCulture.fanHostility).toBe('cauldron');
      expect(bocaCulture.fanShirtless).toBe(true);
      expect(bocaCulture.fanFlares).toBe(true);
      expect(bocaCulture.fanPaperShower).toBe(true);
      expect(bocaCulture.specialTradition).toBe('bombonera_tremor');
    });

    it('correctly maps British / UK clubs to british cultural region', () => {
      expect(resolveCulturalRegion('England', 'uefa')).toBe('british');
      expect(resolveCulturalRegion('Scotland', 'uefa')).toBe('british');
      expect(resolveCulturalRegion('Wales', 'uefa')).toBe('british');

      const westHamMock = {
        id: 'west_ham_united',
        name: 'London Stadium Irons',
        shortName: 'WHU',
        country: 'England',
        confederation: 'uefa' as const,
        ratingTier: 'A' as const,
        category: 'club' as const,
        league: 'Premier League',
        players: [],
        averageOvr: 80,
        tactics: {} as any,
        kit: {} as any,
      };
      const whCulture = getDefaultFanCulture(westHamMock as any);
      expect(whCulture.culturalRegion).toBe('british');
      expect(whCulture.fanAcoustics).toBe('choral');
      expect(whCulture.fanShirtless).toBe(false);
      expect(whCulture.fanFlares).toBe(false);
      expect(whCulture.specialTradition).toBe('bubbles');
    });

    it('correctly maps Continental European / Balkans clubs with pyros and whistling acoustics', () => {
      expect(resolveCulturalRegion('Germany', 'uefa')).toBe('continental_balkans');
      expect(resolveCulturalRegion('Croatia', 'uefa')).toBe('continental_balkans');
      expect(resolveCulturalRegion('Greece', 'uefa')).toBe('continental_balkans');
      expect(resolveCulturalRegion('Italy', 'uefa')).toBe('continental_balkans');

      const dortmundMock = {
        id: 'borussia_dortmund',
        name: 'Ruhr Yellows',
        shortName: 'BVB',
        country: 'Germany',
        confederation: 'uefa' as const,
        ratingTier: 'A' as const,
        category: 'club' as const,
        players: [],
        averageOvr: 84,
        tactics: {} as any,
        kit: {} as any,
      };
      const bvbCulture = getDefaultFanCulture(dortmundMock as any);
      expect(bvbCulture.culturalRegion).toBe('continental_balkans');
      expect(bvbCulture.fanShirtless).toBe(true);
      expect(bvbCulture.fanFlares).toBe(true);
      expect(bvbCulture.specialTradition).toBe('yellow_wall');
    });

    it('correctly maps Nordic clubs with thunder_clap acoustics and Viking Clap tradition', () => {
      expect(resolveCulturalRegion('Iceland', 'uefa')).toBe('nordic');
      expect(resolveCulturalRegion('Sweden', 'uefa')).toBe('nordic');
      expect(resolveCulturalRegion('Norway', 'uefa')).toBe('nordic');
      expect(resolveCulturalRegion('Denmark', 'uefa')).toBe('nordic');

      const icelandMock = {
        id: 'iceland_national',
        name: 'Iceland',
        shortName: 'ISL',
        country: 'Iceland',
        confederation: 'uefa' as const,
        ratingTier: 'B' as const,
        category: 'national' as const,
        players: [],
        averageOvr: 76,
        tactics: {} as any,
        kit: {} as any,
      };
      const islCulture = getDefaultFanCulture(icelandMock as any);
      expect(islCulture.culturalRegion).toBe('nordic');
      expect(islCulture.fanAcoustics).toBe('thunder_clap');
      expect(islCulture.specialTradition).toBe('viking_clap');
    });

    it('correctly maps East Asian / Global clubs with horns acoustics and friendly hostility', () => {
      expect(resolveCulturalRegion('Japan', 'afc')).toBe('east_asian_global');
      expect(resolveCulturalRegion('South Korea', 'afc')).toBe('east_asian_global');

      const japanMock = {
        id: 'japan_samurai',
        name: 'Japan',
        shortName: 'JPN',
        country: 'Japan',
        confederation: 'afc' as const,
        ratingTier: 'A' as const,
        category: 'national' as const,
        players: [],
        averageOvr: 82,
        tactics: {} as any,
        kit: {} as any,
      };
      const jpnCulture = getDefaultFanCulture(japanMock as any);
      expect(jpnCulture.culturalRegion).toBe('east_asian_global');
      expect(jpnCulture.fanAcoustics).toBe('horns');
      expect(jpnCulture.fanHostility).toBe('friendly');
    });
  });

  describe('A4.2: Team Editor "Fans" Tab Customization & Engine Persistence', () => {
    it('persists customized fan properties onto team homeVenueConfig', () => {
      const testTeamId = 'modern_european_xi';
      const customFanConfig: Partial<TeamHomeVenueConfig> = {
        fanAcoustics: 'murga',
        fanHostility: 'cauldron',
        fanShirtless: true,
        fanFlags: true,
        fanFlares: true,
        fanPaperShower: true,
        fanTifo: true,
        fanMexicanWave: true,
        specialTradition: 'bombonera_tremor',
      };

      const baseTeam = getTeamById(testTeamId);
      const updatedConfig: TeamHomeVenueConfig = {
        ...getDefaultHomeVenueConfig(baseTeam),
        ...customFanConfig,
      };

      saveTeamCustomization(testTeamId, { homeVenueConfig: updatedConfig });
      const savedTeam = getTeamById(testTeamId);
      expect(savedTeam.homeVenueConfig?.fanAcoustics).toBe('murga');
      expect(savedTeam.homeVenueConfig?.fanHostility).toBe('cauldron');
      expect(savedTeam.homeVenueConfig?.specialTradition).toBe('bombonera_tremor');
      expect(savedTeam.homeVenueConfig?.fanPaperShower).toBe(true);

      // Clean up reset
      resetTeamCustomization(testTeamId);
    });

    it('applies team homeVenueConfig fan settings to MatchEngine activeFanConfig', () => {
      const engine = new MatchEngine();
      const testTeam = getTeamById('boca_juniors_2026');
      engine.applyHomeVenueForTeam(testTeam);

      expect(engine.activeFanConfig).toBeDefined();
      expect(engine.activeFanConfig?.fanAcoustics).toBe('murga');
      expect(engine.activeFanConfig?.fanHostility).toBe('cauldron');
      expect(engine.activeFanConfig?.specialTradition).toBe('bombonera_tremor');
    });
  });

  describe('A4.3: Special Club Traditions & Atmosphere Triggers', () => {
    it('spawns West Ham floating bubbles when tradition is bubbles', () => {
      const config: Partial<TeamHomeVenueConfig> = {
        specialTradition: 'bubbles',
      };
      triggerMatchdayEntranceAtmosphere('#7a003c', '#58c0ff', config, 'West Ham');
      expect(activeFloatingBubbles.length).toBeGreaterThan(0);

      // Verify bubble physics update
      const initialY = activeFloatingBubbles[0].y;
      updateAtmosphereParticles(1.0);
      expect(activeFloatingBubbles[0].y).toBeLessThanOrEqual(initialY); // Bubbles drift upward
    });

    it('spawns Tifo banner across grandstands when fanTifo is enabled', () => {
      const config: Partial<TeamHomeVenueConfig> = {
        fanTifo: true,
      };
      triggerMatchdayEntranceAtmosphere('#003399', '#facc15', config, 'BOCA JUNIORS');
      expect(activeTifoState.active).toBe(true);
      expect(activeTifoState.teamName).toBe('BOCA JUNIORS');

      // Tifo decays over time
      for (let i = 0; i < 400; i++) {
        updateAtmosphereParticles(1.0);
      }
      expect(activeTifoState.active).toBe(false);
    });

    it('spawns shredded paper shower (papel picado) and grounds turf debris', () => {
      const config: Partial<TeamHomeVenueConfig> = {
        fanPaperShower: true,
      };
      triggerGoalCelebrationAtmosphere('home', '#ffffff', '#dc2626', config, 'RIVER PLATE');
      expect(activeTurfPaperDebris.length).toBeGreaterThan(0);
      expect(activeTurfPaperDebris.length).toBeLessThanOrEqual(140); // Capped to avoid heap bloat

      const firstDebris = activeTurfPaperDebris[0];
      expect(firstDebris).toHaveProperty('x');
      expect(firstDebris).toHaveProperty('y');
      expect(firstDebris).toHaveProperty('color');
      expect(firstDebris).toHaveProperty('opacity');
    });

    it('triggers La Bombonera stand tremor and tactile camera screen vibration', () => {
      triggerStandTremor(60);
      const tremor = getStandTremorOffset();
      expect(Math.abs(tremor.x) + Math.abs(tremor.y)).toBeGreaterThan(0);

      // Tremor decays over time
      for (let i = 0; i < 70; i++) {
        updateAtmosphereParticles(1.0);
      }
      const settledTremor = getStandTremorOffset();
      expect(settledTremor.x).toBe(0);
      expect(settledTremor.y).toBe(0);
    });
  });

  describe('A4.4: Dynamic Audio Atmosphere & Hostility Synthesis', () => {
    it('executes audio.updateAtmosphere with hostility and acoustic styles without error', () => {
      expect(() => {
        audio.updateAtmosphere({
          crowdLevel: 'crowded',
          stadiumTier: 'monumental',
          ballY: 800,
          ballZ: 0,
          homeHasBall: false,
          dangerLevel: 0.8,
          scoreDelta: 0,
          matchTimeSeconds: 1200,
          isPenalty: false,
          fanAcoustics: 'murga',
          fanHostility: 'cauldron',
          specialTradition: 'bombonera_tremor',
          awayHasBallInDefensiveThird: true,
          homeHasBallInAttackingThird: false,
        });
      }).not.toThrow();

      expect(() => {
        audio.playHostileWhistling(0.7);
        audio.playMurgaBrassFlourish(0.6);
        audio.playContinuousHornsFanfare(0.5);
        audio.playVikingClapCrescendo(2, 0.6);
        audio.playStandRumble(0.5);
        audio.playPoropopoRhythm(0.5);
      }).not.toThrow();
    });
  });
});
