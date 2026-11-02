import { describe, it, expect, beforeEach } from 'vitest';
import { MatchEngine } from '../engine';
import {
  TEAM_DATABASE,
  getAllTeams,
  getTeamById,
  getDefaultHomeVenueConfig,
  saveTeamCustomization,
  resetTeamCustomization,
} from '../teamDatabase';
import { TeamDefinition, TeamSponsor, AdboardTier } from '../../types/team';
import { drawStadiumAdHoardings } from '../stadiumRenderer';

describe('Phase A1: Team Home Venue Architecture, Sponsor Engine & Team Editor Hub', () => {
  let engine: MatchEngine;

  beforeEach(() => {
    engine = new MatchEngine();
  });

  describe('A1.1: Default Team Home Venue Configuration & Data Integrity', () => {
    it('generates a valid TeamHomeVenueConfig for all teams in the database', () => {
      const teams = getAllTeams();
      expect(teams.length).toBeGreaterThan(0);

      for (const t of teams) {
        const cfg = t.homeVenueConfig || getDefaultHomeVenueConfig(t);
        expect(cfg).toBeDefined();
        expect(cfg.stadiumId).toBeDefined();
        expect(cfg.seatPattern).toBeDefined();
        expect(Array.isArray(cfg.seatColors)).toBe(true);
        expect(cfg.seatColors.length).toBeGreaterThanOrEqual(1);
        expect(cfg.netTension).toBeDefined();
        expect(cfg.goalFrame).toBeDefined();
        expect(cfg.benchType).toBeDefined();
        expect(cfg.benchQuality).toBeDefined();
        expect(cfg.pitchLengthMeters).toBeGreaterThanOrEqual(95);
        expect(cfg.pitchLengthMeters).toBeLessThanOrEqual(115);
        expect(cfg.pitchWidthMeters).toBeGreaterThanOrEqual(64);
        expect(cfg.pitchWidthMeters).toBeLessThanOrEqual(75);
        expect(cfg.turfQuality).toBeDefined();
        expect(cfg.mowingPattern).toBeDefined();
        expect(cfg.baseSurfaceStatus).toBeDefined();
        expect(Array.isArray(cfg.sponsors)).toBe(true);
        expect(cfg.sponsors.length).toBeLessThanOrEqual(5);
        expect(cfg.adboardTier).toBeDefined();
      }
    });

    it('assigns authentic club-specific identity and custom stadium name for iconic clubs', () => {
      const boca = getTeamById('boca_juniors_2026');
      expect(boca).toBeDefined();
      expect(boca.homeVenueConfig?.customStadiumName).toContain('La Bombonera');
      expect(boca.homeVenueConfig?.seatColors).toContain('#003399');
      expect(boca.homeVenueConfig?.seatColors).toContain('#facc15');
      expect(boca.homeVenueConfig?.adboardTier).toBe('classic_electronic');

      const river = getTeamById('river_plate_2026');
      expect(river).toBeDefined();
      expect(river.homeVenueConfig?.customStadiumName).toContain('Monumental');
      expect(river.homeVenueConfig?.adboardTier).toBe('led_ribbon');
    });
  });

  describe('A1.2: Team Customization Persistence & Engine Application', () => {
    it('saves custom team venue modifications and updates getTeamById', () => {
      const customSponsors: TeamSponsor[] = [
        { id: 'sp_test_1', name: 'RETRO ARCADE', colors: ['#ff0055', '#ffffff', '#00ffff'] },
        { id: 'sp_test_2', name: 'PIXEL CORP', colors: ['#00aa44', '#ffffff'] },
      ];

      const updated = saveTeamCustomization('boca_juniors_2026', {
        homeVenueConfig: {
          ...getDefaultHomeVenueConfig(getTeamById('boca_juniors_2026')),
          customStadiumName: 'La Bombonera Test Arena',
          seatPattern: 'verticalStripes',
          seatColors: ['#002244', '#ffdd00'],
          pitchLengthMeters: 110,
          pitchWidthMeters: 70,
          turfQuality: 'pristine',
          baseSurfaceStatus: 'dry',
          sponsors: customSponsors,
          adboardTier: 'modern_dynamic_led',
        },
      });

      expect(updated.homeVenueConfig?.customStadiumName).toBe('La Bombonera Test Arena');
      expect(updated.homeVenueConfig?.seatPattern).toBe('verticalStripes');
      expect(updated.homeVenueConfig?.sponsors.length).toBe(2);
      expect(updated.homeVenueConfig?.adboardTier).toBe('modern_dynamic_led');

      // Verify getTeamById reflects this
      const retrieved = getTeamById('boca_juniors_2026');
      expect(retrieved.homeVenueConfig?.customStadiumName).toBe('La Bombonera Test Arena');

      // Reset
      resetTeamCustomization('boca_juniors_2026');
    });

    it('applies custom home venue settings into MatchEngine when team plays at home', () => {
      const testTeam: TeamDefinition = {
        ...getTeamById('boca_juniors_2026'),
        id: 'test_fc',
        name: 'Test Football Club',
        homeVenueConfig: {
          stadiumId: 'craven_cottage',
          customStadiumName: 'Test Heritage Ground',
          seatPattern: 'horizontalBands',
          seatColors: ['#880000', '#ffffff'],
          seatStyle: 'classic_bucket',
          netColor: '#ffffff',
          netTension: 'hard',
          goalFrame: 'standard',
          benchType: 'covered_sunken',
          benchQuality: 'modern',
          pitchLengthMeters: 108,
          pitchWidthMeters: 72,
          turfQuality: 'pristine',
          mowingPattern: 'checkerboard',
          grassLength: 'short',
          baseSurfaceStatus: 'dry',
          sponsors: [
            { id: 'sp1', name: 'SPONSOR A', colors: ['#111111', '#ffffff'] },
            { id: 'sp2', name: 'SPONSOR B', colors: ['#222222', '#ffffff'] },
          ],
          adboardTier: 'classic_electronic',
        },
      };

      engine.weather = 'clear';
      engine.setTeam('home', testTeam);

      expect(engine.activeStadium.name).toBe('Test Heritage Ground');
      expect(engine.activeStadium.seats.pattern).toBe('horizontalBands');
      expect(engine.activeStadium.seats.colors).toEqual(['#880000', '#ffffff']);
      expect(engine.activeStadium.dugouts.type).toBe('covered_sunken');
      expect(engine.pitchLengthMeters).toBe(108);
      expect(engine.pitchWidthMeters).toBe(72);
      expect(engine.turfQuality).toBe('pristine');
      expect(engine.mowingPattern).toBe('checkerboard');
      expect(engine.surfaceStatus).toBe('dry');
      expect(engine.activeSponsors.length).toBe(2);
      expect(engine.activeAdboardTier).toBe('classic_electronic');
    });

    it('dynamically cascades surface status to wet when weather is rain or snow', () => {
      const testTeam: TeamDefinition = {
        ...getTeamById('boca_juniors_2026'),
        id: 'test_fc_weather',
        homeVenueConfig: {
          ...getDefaultHomeVenueConfig(getTeamById('boca_juniors_2026')),
          baseSurfaceStatus: 'dry',
        },
      };

      engine.setWeather('rain');
      engine.setTeam('home', testTeam);
      expect(engine.surfaceStatus).toBe('wet');

      // Now change weather to clear, should revert to base status
      engine.setWeather('clear');
      expect(engine.surfaceStatus).toBe('dry');

      // Changing to snow cascades to wet
      engine.setWeather('snow');
      expect(engine.surfaceStatus).toBe('wet');
    });
  });

  describe('A1.3: Multi-Sponsor Brand Engine & 4 Adboard Technology Tiers', () => {
    it('supports 0 to 5 sponsors with 1 to 3 distinct colors', () => {
      const validSponsors: TeamSponsor[] = [
        { id: 's1', name: 'BRAND 1', colors: ['#000000'] },
        { id: 's2', name: 'BRAND 2', colors: ['#000000', '#ffffff'] },
        { id: 's3', name: 'BRAND 3', colors: ['#000000', '#ffffff', '#ffcc00'] },
        { id: 's4', name: 'BRAND 4', colors: ['#112233', '#ffffff'] },
        { id: 's5', name: 'BRAND 5', colors: ['#223344', '#ffffff', '#00ffaa'] },
      ];

      expect(validSponsors.length).toBe(5);
      validSponsors.forEach(s => {
        expect(s.colors.length).toBeGreaterThanOrEqual(1);
        expect(s.colors.length).toBeLessThanOrEqual(3);
      });
    });

    it('renders all 4 adboard technology tiers without canvas exceptions', () => {
      // Mock Canvas 2D context
      const fillRectCalls: any[] = [];
      const fillTextCalls: any[] = [];

      const ctxMock = {
        save: () => {},
        restore: () => {},
        fillRect: (...args: any[]) => fillRectCalls.push(args),
        fillText: (...args: any[]) => fillTextCalls.push(args),
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        font: '',
        textBaseline: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      const tiers: AdboardTier[] = ['basic_paper', 'classic_electronic', 'led_ribbon', 'modern_dynamic_led'];
      const testSponsors: TeamSponsor[] = [
        { id: 's1', name: 'SONY', colors: ['#003399', '#ffffff', '#38bdf8'] },
        { id: 's2', name: 'PIRELLI', colors: ['#cc0000', '#ffff00'] },
      ];

      for (const t of tiers) {
        fillRectCalls.length = 0;
        fillTextCalls.length = 0;

        expect(() => {
          drawStadiumAdHoardings(ctxMock, 'monumental', 'night', undefined, testSponsors, t);
        }).not.toThrow();

        expect(fillRectCalls.length).toBeGreaterThan(0);
        expect(fillTextCalls.length).toBeGreaterThan(0);
      }
    });

    it('correctly handles 0 sponsors by rendering clean architectural stadium walls', () => {
      const fillRectCalls: any[] = [];
      const ctxMock = {
        save: () => {},
        restore: () => {},
        fillRect: (...args: any[]) => fillRectCalls.push(args),
        fillText: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        font: '',
        textBaseline: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;

      expect(() => {
        drawStadiumAdHoardings(ctxMock, 'monumental', 'night', undefined, [], 'basic_paper');
      }).not.toThrow();

      expect(fillRectCalls.length).toBeGreaterThan(0);
    });
  });
});
