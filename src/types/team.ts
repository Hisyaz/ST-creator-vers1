/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PlayerRole,
  SubPosition,
  PlayerPlaystyle,
  FormationName,
  TacticalPlaystyle,
  DetailedTactics,
  TeamKit,
  CanonicalOutfieldStats,
  CanonicalGoalkeeperStats,
  PlayerAppearance,
  PitchDimensionPreset,
  TurfQuality,
  GrassLength,
  LawnMowingPattern,
  NetTension,
  GoalFrameType,
} from '../types';
import {
  TeamVenueOverrides,
  SeatPattern,
  SeatStyle,
  SeatArchetype,
  BenchType,
  BenchQualityTier,
} from './stadium';

/**
 * Phase A1: Multi-Sponsor Brand Engine & 4-Tier Adboard Perimeter System
 */
export type AdboardTier =
  | 'basic_paper'
  | 'classic_electronic'
  | 'led_ribbon'
  | 'modern_dynamic_led';

export interface TeamSponsor {
  id: string;
  name: string;
  colors: [string, string?, string?]; // 1 to 3 distinct colors: [bg, text, accent/glow]
}

export type FanAcousticStyle =
  | 'choral'
  | 'murga'
  | 'whistling'
  | 'horns'
  | 'thunder_clap';

export type FanHostilityLevel =
  | 'friendly'
  | 'moderate'
  | 'hostile'
  | 'cauldron';

export type SpecialClubTradition =
  | 'none'
  | 'bubbles'
  | 'poznan'
  | 'viking_clap'
  | 'poropopo'
  | 'yellow_wall'
  | 'bombonera_tremor'
  | 'murga_trompetas';

export type CulturalDemographicRegion =
  | 'south_american'
  | 'british'
  | 'continental_balkans'
  | 'nordic'
  | 'east_asian_global';

export interface TeamHomeVenueConfig {
  stadiumId: string;
  customStadiumName?: string;
  seatPattern: SeatPattern;
  seatColors: string[];
  seatStyle?: SeatStyle;
  seatArchetype?: SeatArchetype; // Phase A5.2
  netColor?: string;
  netPattern?: 'solid' | 'striped' | 'checkered' | 'vintage_hex';
  netTension: NetTension;
  goalFrame: GoalFrameType;
  benchType: BenchType;
  benchQuality: BenchQualityTier;
  pitchPreset?: PitchDimensionPreset;
  pitchLengthMeters: number;
  pitchWidthMeters: number;
  turfQuality: TurfQuality;
  mowingPattern: LawnMowingPattern;
  grassLength: GrassLength;
  baseSurfaceStatus: 'dry' | 'normal' | 'wet';
  sponsors: TeamSponsor[];
  adboardTier: AdboardTier;
  // Phase A4 Fan Culture and Traditions Hooks
  culturalRegion?: CulturalDemographicRegion;
  fanAcoustics?: FanAcousticStyle;
  fanHostility?: FanHostilityLevel;
  fanShirtless?: boolean;
  fanFlags?: boolean;
  fanFlares?: boolean;
  fanPaperShower?: boolean;
  fanTifo?: boolean;
  fanMexicanWave?: boolean;
  specialTradition?: SpecialClubTradition;
}

/**
 * Phase 13: Multi-Tier Team Database & Hierarchical Selection Engine
 */

export type TeamCategory = 'national' | 'club' | 'special';

export type Confederation = 'uefa' | 'conmebol' | 'concacaf' | 'afc' | 'caf' | 'ofc' | 'special';

export type RatingTier = 'S' | 'A' | 'B' | 'C';

/**
 * Authoritative Tactical Roles & Set-Piece Takers Schema (Section 13.4)
 */
export interface TeamTacticalRoles {
  captainId: string;           // Team captain (wears armband, CMP & POS leader)
  freeKickNearId: string;      // Direct free kicks near the penalty box (< 28m, high SHO & CMP)
  freeKickLongId: string;      // Deep / long free kicks into the box (> 28m, high LPA & CRO)
  penaltyTakerId: string;      // Primary penalty taker (highest SHO & CMP balance)
  leftCornerTakerId: string;   // Left corner kick specialist (high CRO & SPA)
  rightCornerTakerId: string;  // Right corner kick specialist (high CRO & SPA)
}

export interface TeamBadge {
  icon: string;         // Unicode or emoji emblem (e.g. '⭐', '🇪🇸', '🇦🇷', '👑')
  bg: string;           // Badge background color hex
  text: string;         // 3-letter badge abbreviation or symbol
  primaryColor: string; // Accent color hex
  secondaryColor: string;
}

export interface TeamRosterPlayer {
  id: string;
  name: string;
  number: number;
  role: PlayerRole;
  subPosition: SubPosition;
  playstyle: PlayerPlaystyle;
  intrinsicPlaystyle?: PlayerPlaystyle; // Phase 16.5: Intrinsic natural playstyle
  appearance: PlayerAppearance;
  scale?: number;
  canonicalStats: CanonicalOutfieldStats | CanonicalGoalkeeperStats;
  isCaptain?: boolean;
  customPos?: { x: number; y: number };
}

export interface TeamDefinition {
  id: string;
  name: string;
  shortName: string;
  category: TeamCategory;
  confederation: Confederation;
  country: string;
  countryCode: string; // e.g. 'ES', 'AR', 'CO', 'GL'
  league?: string;     // Domestic league for clubs (e.g. 'Liga Profesional', 'Torneo BetPlay')
  badge: TeamBadge;
  ratingTier: RatingTier;
  averageOvr: number; // Calibrated 50+ to 99+
  description: string;
  tacticalPlaystyle: TacticalPlaystyle;
  preferredFormation: FormationName;
  tactics: DetailedTactics;
  kit: TeamKit;
  awayKit: TeamKit;
  thirdKit?: TeamKit;
  roles: TeamTacticalRoles;
  manager?: {
    name: string;
    country?: string;
    countryCode?: string;
  };
  players: TeamRosterPlayer[];
  substitutes?: TeamRosterPlayer[];
  // Phase 12: Team-Specific Home Stadium Binding & Kickoff Venue Registry
  homeStadiumId?: string;
  venueOverrides?: TeamVenueOverrides;
  // Phase A1: Full Team Home Venue Customization & Sponsor Adboard Architecture
  homeVenueConfig?: TeamHomeVenueConfig;
}
