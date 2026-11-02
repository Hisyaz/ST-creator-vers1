/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from './constants';
import { TimeOfDay, TeamKit, GraphicsSettings, WeatherCondition } from '../types';
import { TeamDefinition } from '../types/team';
import {
  StadiumDefinition,
  StadiumShape,
  StandGrade,
  SurroundingsType,
  ApronMaterial,
  StandPosition,
  StandConfig,
  DugoutConfig,
  EntranceTunnelConfig,
  getTierChairRows,
  StadiumGroundsType,
  getDefaultGroundsForSurroundings,
  RoofCutawayMode,
} from '../types/stadium';
import { drawAerialEnvironment } from './environmentRenderer';
import { getStadiumShapeMetrics, StadiumShapeMetrics, drawArchitecturalRoofShadows } from './stadiumRenderer';

/**
 * PHASE 15.2: 32-BIT HIGH-ALTITUDE AERIAL SKY-CAM RENDERER
 * PHASE 15.3: SEAMLESS PRE-MATCH SKY-CAM TO PITCH-CAM ZOOM SWOOP
 *
 * Renders the high-altitude bird's-eye perspective of the entire stadium:
 * 1. Surrounding landscape environment (Nature, City, Beach, Airport, etc.)
 * 2. Stadium outer facade cladding and architectural footprint (Round, Oval, Square, Rectangular)
 * 3. Outer stand grades (Municipal, Classic Red-Brick, Industrial Steel, Modern Concrete, Futuristic Aero)
 * 4. Stadium roof geometry with cantilever canopies / tensile cable aperture
 * 5. Athletics running track (when hasTrack is enabled)
 * 6. Central playing field visible through the roof opening with mowing patterns & line markings
 * 7. Pre-match squad lineups & referee at center circle
 * 8. Corner floodlight pylons & night illumination halos
 * 9. Retro 32-bit broadcast graphics banner overlay
 */

export interface PreMatchSwoopState {
  isActive: boolean;
  progress: number; // 0.0 (aerial sky-cam) to 1.0 (pitch-cam)
  rawProgress: number; // 0.0 to 1.0 linear elapsed time
  startTime: number;
  durationMs: number;
  isSkipped: boolean;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  orbitalAngle: number;
  whistleBlown: boolean;
  stadium: StadiumDefinition;
  homeTeamName: string;
  awayTeamName: string;
  isUltraWide?: boolean;
  startZoom?: number;
}

export interface PreMatchSwoopOptions {
  isUltraWide?: boolean;
  startZoom?: number;
}

export interface PreMatchSwoopResult {
  progress: number;
  rawProgress: number;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  isComplete: boolean;
  camera: {
    x: number;
    y: number;
    zoom: number;
    pitchTilt: number;
    roofOpacity: number;
    orbitalAngle: number;
    flaresVisible: boolean;
    tifosVisible: boolean;
  };
}

export const B6_INTRO_FEATURES = {
  version: 'Phase B6',
  ultraWideMacroscopic: {
    startZoom: 0.05,
    stage1GlobalVistaZoom: [0.05, 0.08] as [number, number],
    stage2AtmosphericDiveZoom: [0.08, 0.35] as [number, number],
    stage3CanopyGlideZoom: [0.35, 0.80] as [number, number],
    stage4PitchHandoffZoom: [0.80, 1.05] as [number, number],
    hasCubicBezierAcceleration: true,
    isFullySkippable: true,
  },
  arcadeUiPolish: {
    hasMetallicBevels: true,
    hasCornerRivets: true,
    hasEmbossedButtons: true,
    zeroScrollDiscipline: true,
  },
};

/**
 * Creates an initial pre-match swoop state (Phase A6 & Phase B6 Cinematic Broadcast Intro)
 */
export function createPreMatchSwoop(
  stadium: StadiumDefinition,
  homeTeamName: string = 'HOME TEAM',
  awayTeamName: string = 'AWAY TEAM',
  durationMs: number = 3800,
  options?: PreMatchSwoopOptions | boolean
): PreMatchSwoopState {
  const isUltraWide = typeof options === 'boolean' ? options : (options?.isUltraWide ?? (options?.startZoom === 0.05));
  const startZoom = isUltraWide ? 0.05 : (typeof options === 'object' && options?.startZoom !== undefined ? options.startZoom : 0.25);

  return {
    isActive: true,
    progress: 0.0,
    rawProgress: 0.0,
    startTime: performance.now(),
    durationMs,
    isSkipped: false,
    phase: 1,
    phaseName: isUltraWide ? 'The Global Vista (5% Horizon)' : 'High-Altitude Vista',
    orbitalAngle: 0,
    whistleBlown: false,
    stadium,
    homeTeamName,
    awayTeamName,
    isUltraWide,
    startZoom,
  };
}

/**
 * PHASE B6.1: Creates the ultra-wide macroscopic intro beginning at 5% zoom
 */
export function createUltraWidePreMatchSwoop(
  stadium: StadiumDefinition,
  homeTeamName: string = 'HOME TEAM',
  awayTeamName: string = 'AWAY TEAM',
  durationMs: number = 4200
): PreMatchSwoopState {
  return createPreMatchSwoop(stadium, homeTeamName, awayTeamName, durationMs, {
    isUltraWide: true,
    startZoom: 0.05,
  });
}

/**
 * PHASE A6.2: 4-Stage Procedural Pre-Match Sky-Cam to Pitch-Cam Cinematic Glide
 *
 * 1. Phase 1 — High-Altitude Vista (0.00 <= t < 0.22):
 *    Frames the full stadium nestled inside its metropolitan, coastal or mountain environment.
 * 2. Phase 2 — The Orbital Swoop & Zoom (0.22 <= t < 0.60):
 *    Smooth exponential zoom descent, tracking down toward the stadium roof with subtle orbital parallax.
 * 3. Phase 3 — Canopy Fly-Through (0.60 <= t < 0.88):
 *    Camera glides directly through roof ocular aperture/cantilevers, revealing roaring crowd, banners & flares.
 * 4. Phase 4 — Seamless Pitch Handoff (0.88 <= t <= 1.00):
 *    Viewpoint smoothly aligns and eases into the active broadcast gameplay camera angle.
 *
 * Interpolation: smooth polynomial ease curve t^2 * (3 - 2t) with zero-jerk endpoint derivatives.
 * Zero-Stutter Performance: 100% skippable at any moment on keypress or touch tap.
 */
export function updatePreMatchSwoop(
  state: PreMatchSwoopState,
  now: number = performance.now()
): PreMatchSwoopResult {
  if (!state.isActive) {
    return {
      progress: 1.0,
      rawProgress: 1.0,
      phase: 4,
      phaseName: 'Seamless Pitch Handoff',
      isComplete: true,
      camera: {
        x: PITCH_CONFIG.CENTER_X,
        y: PITCH_CONFIG.CENTER_Y,
        zoom: 1.05,
        pitchTilt: 0.5,
        roofOpacity: 0.0,
        orbitalAngle: 0,
        flaresVisible: false,
        tifosVisible: false,
      },
    };
  }

  if (state.isSkipped) {
    state.progress = 1.0;
    state.rawProgress = 1.0;
    state.phase = 4;
    state.phaseName = 'Seamless Pitch Handoff';
    state.isActive = false;
    return {
      progress: 1.0,
      rawProgress: 1.0,
      phase: 4,
      phaseName: 'Seamless Pitch Handoff',
      isComplete: true,
      camera: {
        x: PITCH_CONFIG.CENTER_X,
        y: PITCH_CONFIG.CENTER_Y,
        zoom: 1.05,
        pitchTilt: 0.5,
        roofOpacity: 0.0,
        orbitalAngle: 0,
        flaresVisible: false,
        tifosVisible: false,
      },
    };
  }

  const elapsed = now - state.startTime;
  const rawT = Math.min(1.0, Math.max(0.0, elapsed / state.durationMs));
  state.rawProgress = rawT;

  // Roadmap Phase A6.2: Smooth polynomial ease curve t^2 * (3 - 2t)
  const t = rawT * rawT * (3 - 2 * rawT);
  state.progress = t;

  const isComplete = rawT >= 0.999;
  if (isComplete) {
    state.progress = 1.0;
    state.rawProgress = 1.0;
    state.isActive = false;
    state.phase = 4;
    state.phaseName = 'Seamless Pitch Handoff';
    if (!state.whistleBlown) {
      state.whistleBlown = true;
    }
  }

  let phase: 1 | 2 | 3 | 4 = 1;
  let phaseName = 'High-Altitude Vista';
  let orbitalAngle = 0;
  let flaresVisible = false;
  let tifosVisible = true;

  let currentZoom = 0.25;
  let currentX = PITCH_CONFIG.CENTER_X;
  let currentY = PITCH_CONFIG.CENTER_Y;
  let currentTilt = 0.32;
  let roofOpacity = 1.0;

  if (state.isUltraWide || state.startZoom === 0.05) {
    if (t < 0.22) {
      // 1. Stage 1 — The Global Vista (5% zoom)
      phase = 1;
      phaseName = 'The Global Vista (5% Horizon)';
      const subT = t / 0.22;
      currentZoom = 0.05 + (0.08 - 0.05) * subT;
      currentY = PITCH_CONFIG.CENTER_Y - 320 + subT * 40;
      currentX = PITCH_CONFIG.CENTER_X + Math.sin(subT * Math.PI) * 20;
      orbitalAngle = Math.sin(subT * Math.PI * 0.5) * 0.04;
      currentTilt = 0.24 + (0.30 - 0.24) * subT;
      roofOpacity = 1.0;
      flaresVisible = false;
      tifosVisible = true;
    } else if (t < 0.60) {
      // 2. Stage 2 — High-Speed Atmospheric Dive (5% -> 35% zoom)
      phase = 2;
      phaseName = 'Atmospheric Dive (Roof Approach)';
      const subT = (t - 0.22) / 0.38;
      const bezierT = subT * subT * (3 - 2 * subT);
      currentZoom = 0.08 + (0.35 - 0.08) * (subT * 0.35 + bezierT * 0.65);
      currentY = (PITCH_CONFIG.CENTER_Y - 280) + ((PITCH_CONFIG.CENTER_Y - 70) - (PITCH_CONFIG.CENTER_Y - 280)) * subT;
      orbitalAngle = Math.sin(subT * Math.PI) * 0.09;
      currentX = PITCH_CONFIG.CENTER_X + Math.sin(subT * Math.PI) * 110;
      currentTilt = 0.30 + (0.42 - 0.30) * subT;
      roofOpacity = subT > 0.65 ? Math.max(0.85, 1.0 - (subT - 0.65) * 0.42) : 1.0;
      flaresVisible = subT > 0.35;
      tifosVisible = true;
    } else if (t < 0.88) {
      // 3. Stage 3 — Canopy Glide & Grandstand Immersion (35% -> 80% zoom)
      phase = 3;
      phaseName = 'Canopy Glide & Grandstand Immersion';
      const subT = (t - 0.60) / 0.28;
      currentZoom = 0.35 + (0.80 - 0.35) * subT;
      currentY = (PITCH_CONFIG.CENTER_Y - 70) + ((PITCH_CONFIG.CENTER_Y - 15) - (PITCH_CONFIG.CENTER_Y - 70)) * subT;
      currentX = PITCH_CONFIG.CENTER_X + (1 - subT) * Math.sin((1 - subT) * Math.PI * 0.5) * 45;
      orbitalAngle = (1 - subT) * 0.04;
      currentTilt = 0.42 + (0.48 - 0.42) * subT;
      roofOpacity = Math.max(0.0, 0.85 - (subT * 0.85));
      flaresVisible = true;
      tifosVisible = true;
    } else {
      // 4. Stage 4 — Smooth Pitch-View Handoff (80% -> 100% gameplay zoom)
      phase = 4;
      phaseName = 'Pitch-View Kickoff Handoff';
      const subT = (t - 0.88) / 0.12;
      currentZoom = 0.80 + (1.05 - 0.80) * subT;
      currentY = (PITCH_CONFIG.CENTER_Y - 15) + (PITCH_CONFIG.CENTER_Y - (PITCH_CONFIG.CENTER_Y - 15)) * subT;
      currentX = PITCH_CONFIG.CENTER_X;
      orbitalAngle = 0;
      currentTilt = 0.48 + (0.50 - 0.48) * subT;
      roofOpacity = 0.0;
      flaresVisible = true;
      tifosVisible = false;
    }
  } else {
    if (t < 0.22) {
      // 1. Phase 1 — High-Altitude Vista
      phase = 1;
      phaseName = 'High-Altitude Vista';
      const subT = t / 0.22;
      currentZoom = 0.25 + (0.28 - 0.25) * subT;
      currentY = PITCH_CONFIG.CENTER_Y - 220 + subT * 20;
      currentX = PITCH_CONFIG.CENTER_X + Math.sin(subT * Math.PI) * 12;
      currentTilt = 0.32;
      roofOpacity = 1.0;
      orbitalAngle = 0;
      flaresVisible = false;
      tifosVisible = true;
    } else if (t < 0.60) {
      // 2. Phase 2 — The Orbital Swoop & Zoom
      phase = 2;
      phaseName = 'Orbital Swoop & Zoom';
      const subT = (t - 0.22) / 0.38;
      currentZoom = 0.28 + (0.65 - 0.28) * (subT * subT);
      currentY = (PITCH_CONFIG.CENTER_Y - 200) + ((PITCH_CONFIG.CENTER_Y - 70) - (PITCH_CONFIG.CENTER_Y - 200)) * subT;
      orbitalAngle = Math.sin(subT * Math.PI) * 0.08;
      currentX = PITCH_CONFIG.CENTER_X + Math.sin(subT * Math.PI) * 95;
      currentTilt = 0.32 + (0.42 - 0.32) * subT;
      roofOpacity = subT > 0.65 ? Math.max(0.85, 1.0 - (subT - 0.65) * 0.42) : 1.0;
      flaresVisible = subT > 0.4;
      tifosVisible = true;
    } else if (t < 0.88) {
      // 3. Phase 3 — Canopy Fly-Through
      phase = 3;
      phaseName = 'Canopy Fly-Through';
      const subT = (t - 0.60) / 0.28;
      currentZoom = 0.65 + (0.96 - 0.65) * subT;
      currentY = (PITCH_CONFIG.CENTER_Y - 70) + ((PITCH_CONFIG.CENTER_Y - 15) - (PITCH_CONFIG.CENTER_Y - 70)) * subT;
      currentX = PITCH_CONFIG.CENTER_X + (1 - subT) * Math.sin((1 - subT) * Math.PI * 0.5) * 40;
      orbitalAngle = (1 - subT) * 0.04;
      currentTilt = 0.42 + (0.48 - 0.42) * subT;
      roofOpacity = Math.max(0.0, 0.85 - (subT * 0.85));
      flaresVisible = true;
      tifosVisible = true;
    } else {
      // 4. Phase 4 — Seamless Pitch Handoff
      phase = 4;
      phaseName = 'Seamless Pitch Handoff';
      const subT = (t - 0.88) / 0.12;
      currentZoom = 0.96 + (1.05 - 0.96) * subT;
      currentY = (PITCH_CONFIG.CENTER_Y - 15) + (PITCH_CONFIG.CENTER_Y - (PITCH_CONFIG.CENTER_Y - 15)) * subT;
      currentX = PITCH_CONFIG.CENTER_X;
      orbitalAngle = 0;
      currentTilt = 0.48 + (0.50 - 0.48) * subT;
      roofOpacity = 0.0;
      flaresVisible = true;
      tifosVisible = false;
    }
  }

  state.phase = phase;
  state.phaseName = phaseName;
  state.orbitalAngle = orbitalAngle;

  return {
    progress: t,
    rawProgress: rawT,
    phase,
    phaseName,
    isComplete,
    camera: {
      x: currentX,
      y: currentY,
      zoom: currentZoom,
      pitchTilt: currentTilt,
      roofOpacity,
      orbitalAngle,
      flaresVisible,
      tifosVisible,
    },
  };
}

export interface DrawAerialSkyCamOptions {
  roofOpacity?: number; // 0.0 to 1.0 (for swoop fade)
  showBroadcastHUD?: boolean;
  homeKit?: TeamKit;
  awayKit?: TeamKit;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  cameraX?: number;
  cameraY?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  swoopState?: PreMatchSwoopState;
  phase?: 1 | 2 | 3 | 4;
  showUltrasFlares?: boolean;
  showTifoBanners?: boolean;
  zoom?: number;
}

/**
 * PHASE A6.1: High-Fidelity Macroscopic Sky View Renderer
 *
 * Compiles all stadium parameters into a comprehensive architectural render:
 * - Exact footprint geometry: Square, Rectangular, Round Coliseum, Oval Athletics.
 * - True individual 8-stand configurations, multi-tier roof structures, and Sims cutaway states.
 * - Team-customized seat color patterns, club crest field mosaics, and dugout placements.
 * - Accurate surrounding terrain, road networks, waterways, and mountain foothills.
 * - Time-of-day solar position and weather atmosphere (overcast fog, winter snow dusted roofs, golden sunset rim glow).
 */
export function drawAerialSkyCam(
  ctx: CanvasRenderingContext2D,
  stadium: StadiumDefinition,
  options: DrawAerialSkyCamOptions = {}
) {
  const {
    roofOpacity = 1.0,
    showBroadcastHUD = true,
    homeKit = HOME_KIT,
    awayKit = AWAY_KIT,
    timeOfDay = stadium.lighting?.timeOfDay || 'night',
    weather = stadium.weather || 'clear',
    homeTeamName = 'HOME',
    awayTeamName = 'AWAY',
    swoopState,
    showUltrasFlares = false,
    showTifoBanners = false,
  } = options;

  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const shape = stadium.shape || 'rectangular';
  const surroundings = stadium.surroundings || 'big_city';
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'dawn';

  // Phase S1: Canonical Stadium Scale Hierarchy (pitch strictly inside stadium bowl across all 4 shapes)
  const isBowl = shape === 'round' || shape === 'oval' || shape === 'circular';
  const hasTrack = stadium.hasTrack && (shape === 'round' || shape === 'oval' || shape === 'circular');
  const metrics = getStadiumShapeMetrics(shape, stadium.apronSetback || 'standard', hasTrack);

  // Calibrated outer envelope dimensions guaranteed to exceed pitch area (1500w x 2500h)
  let outerWidth: number;
  let outerHeight: number;
  if (shape === 'round' || shape === 'circular') {
    outerWidth = (metrics.apronRadiusX + 280) * 2;
    outerHeight = outerWidth;
  } else if (shape === 'square') {
    outerWidth = (metrics.apronRadiusX + 260) * 2;
    outerHeight = outerWidth;
  } else if (shape === 'oval') {
    outerWidth = metrics.apronWidth + 480;
    outerHeight = metrics.apronHeight + 480;
  } else {
    outerWidth = metrics.apronWidth + 440;
    outerHeight = metrics.apronHeight + 440;
  }

  // 1. Surrounding Landscape Environment (spans 5600px in all directions)
  const envBounds = {
    left: cx - 3000,
    top: cy - 2800,
    width: 6000,
    height: 5600,
    stadiumBounds: {
      centerX: cx,
      centerY: cy,
      outerWidth,
      outerHeight,
    },
  };

  drawAerialEnvironment(ctx, surroundings, timeOfDay, envBounds, stadium.grounds);

  // 2. Concrete Stadium Concourse / Apron Plaza with Dynamic Time-of-Day Architectural Drop Shadows
  drawStadiumPlaza(ctx, cx, cy, outerWidth + 140, outerHeight + 140, isBowl, timeOfDay, stadium.grounds, surroundings);

  // 3. Perimeter Run-off Apron Material (Phase S1: completely bridges gap between pitch and stands)
  drawAerialApron(ctx, cx, cy, stadium.apronMaterial || 'grass', shape, metrics);

  // 4. Central Playing Turf & Markings (Visible through inner opening)
  drawAerialPitchTurf(ctx, cx, cy, stadium, timeOfDay);

  // 5. Athletics Running Track (Exclusive to Round & Oval stadiums with hasTrack enabled; zero pitch overlap)
  if (hasTrack) {
    drawAerialAthleticsTrack(ctx, cx, cy, shape, metrics);
  }

  // 6. Pre-Match 22 Squad Lineup & Referee at Center Circle
  drawAerialSquadLineup(ctx, cx, cy, homeKit, awayKit);

  // 7. Macro-Scale Dugout Benches & Player Entrance Tunnel on Touchline Apron (Phase 15.8.1 Contract)
  drawAerialDugouts(ctx, stadium.dugouts, cx, cy, isBowl);
  drawAerialEntranceTunnel(ctx, stadium.tunnel, cx, cy, isBowl);

  // 8. Stadium Outer Facade Cladding & Seating Bowl / Roof Geometry
  if (roofOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = roofOpacity;

    drawStadiumOuterFacade(ctx, cx, cy, outerWidth, outerHeight, shape, stadium, timeOfDay, metrics);
    drawStadiumRoofStructure(ctx, cx, cy, outerWidth, outerHeight, shape, stadium, timeOfDay, metrics);

    ctx.restore();
  } else {
    // When camera penetrates through roofline during swoop (roofOpacity <= 0.01),
    // the exposed interior seating bowl remains visible below the camera!
    drawStadiumOuterFacade(ctx, cx, cy, outerWidth, outerHeight, shape, stadium, timeOfDay, metrics);
    drawAerialExposedSeatingBowl(ctx, cx, cy, outerWidth, outerHeight, shape, stadium, timeOfDay, metrics);
  }

  // Phase A6: Giant Club Tifo Banners draped across endzone grandstands
  const shouldDrawTifo = showTifoBanners || (swoopState && (swoopState.phase >= 1 && swoopState.phase <= 3));
  if (shouldDrawTifo) {
    drawAerialTifoBanners(ctx, cx, cy, stadium, homeTeamName, homeKit.primaryColor, isBowl);
  }

  // Phase A6: Roaring Ultras Smoke Flares in grandstand curves
  const shouldDrawFlares = showUltrasFlares || (swoopState && (swoopState.phase >= 2 && swoopState.phase <= 4)) || (roofOpacity < 0.95 && roofOpacity > 0.05);
  if (shouldDrawFlares) {
    drawAerialUltrasFlares(ctx, cx, cy, stadium, homeKit.primaryColor, isBowl);
  }

  // 9. Volumetric Light Cones & Corner Floodlight Pylons (Phase 15.8.1)
  drawAerialFloodlights(ctx, cx, cy, outerWidth, outerHeight, isNight, timeOfDay);

  // 10. Atmospheric Sunset Golden-Hour / Night Lighting Wash over Stadium Bowl (Phase 15.8.3)
  if (timeOfDay === 'sunset') {
    ctx.save();
    const sunsetWash = ctx.createRadialGradient(cx, cy, 200, cx, cy, outerWidth * 0.55);
    sunsetWash.addColorStop(0, 'rgba(251, 146, 60, 0.18)');
    sunsetWash.addColorStop(0.7, 'rgba(234, 88, 12, 0.22)');
    sunsetWash.addColorStop(1, 'rgba(124, 45, 18, 0.28)');
    ctx.fillStyle = sunsetWash;
    if (isBowl) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, (outerWidth + 140) / 2, (outerHeight + 140) / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(cx - (outerWidth + 140) / 2, cy - (outerHeight + 140) / 2, outerWidth + 140, outerHeight + 140);
    }
    ctx.restore();
  }

  // Phase A6.1: Time-of-day solar position and weather atmosphere (snow dusted roofs, overcast fog mist, sunset rim glow)
  drawAerialWeatherAtmosphere(ctx, cx, cy, outerWidth, outerHeight, weather, timeOfDay, isBowl);

  // 11. 32-Bit Broadcast Presentation Overlay (Retro Drawstar TV Graphics)
  if (showBroadcastHUD && roofOpacity > 0.15) {
    drawBroadcastPresentationOverlay(
      ctx,
      stadium,
      homeTeamName,
      awayTeamName,
      roofOpacity,
      swoopState,
      options.cameraX,
      options.cameraY
    );
  }
}

/**
 * Concrete perimeter concourse and turnstile plazas encircling the venue with Dynamic Drop Shadows
 */
/**
 * PHASE ST6.3: Concrete perimeter concourse and turnstile plazas encircling the venue with Dynamic Drop Shadows
 * and high-fidelity macroscopic rendering of all 9 core grounds + specialized surroundings forecourts.
 */
export function drawStadiumPlaza(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  isBowl: boolean,
  timeOfDay: TimeOfDay = 'night',
  grounds?: StadiumGroundsType,
  surroundings?: SurroundingsType
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const effectiveGrounds: StadiumGroundsType = grounds || getDefaultGroundsForSurroundings(surroundings || 'big_city');

  ctx.save();

  // Phase 15.8.3 Dynamic Architectural Drop Shadow cast onto terrain:
  // - Noon: Short, sharp perpendicular drop shadow (sun at zenith)
  // - Sunset: Dramatic long diagonal shadow stretching eastward (low-angle sun in west)
  // - Night: Deep nocturnal shadow beneath illuminated coliseum beacon
  const shadowOffsetX = isSunset ? 110 : isNight ? 8 : 4;
  const shadowOffsetY = isSunset ? 85 : isNight ? 14 : 8;
  const shadowAlpha = isSunset ? 'rgba(0, 0, 0, 0.55)' : isNight ? 'rgba(0, 0, 0, 0.60)' : 'rgba(0, 0, 0, 0.35)';

  ctx.fillStyle = shadowAlpha;
  if (isBowl) {
    ctx.beginPath();
    ctx.ellipse(cx + shadowOffsetX, cy + shadowOffsetY, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - w / 2 + shadowOffsetX, cy - h / 2 + shadowOffsetY, w, h);
  }

  // Base concourse pavement tuned to grounds archetype
  let concourseBaseColor = isNight ? '#1e293b' : isSunset ? '#64748b' : '#94a3b8';
  if (effectiveGrounds === 'parking_lots' || effectiveGrounds.startsWith('airport_') || effectiveGrounds.startsWith('highway_')) {
    concourseBaseColor = isNight ? '#0b1120' : '#1e293b';
  } else if (effectiveGrounds === 'classical_statues') {
    concourseBaseColor = isNight ? '#450a0a' : '#7f1d1d';
  } else if (effectiveGrounds === 'club_museum_trophies') {
    concourseBaseColor = isNight ? '#1e293b' : '#e2e8f0';
  } else if (effectiveGrounds === 'park_recreation' || effectiveGrounds.startsWith('forest_')) {
    concourseBaseColor = isNight ? '#052e16' : '#166534';
  } else if (effectiveGrounds === 'potrero_dirt' || effectiveGrounds.startsWith('savannah_')) {
    concourseBaseColor = isNight ? '#2e1005' : '#78350f';
  } else if (effectiveGrounds.startsWith('marine_')) {
    concourseBaseColor = isNight ? '#451a03' : '#854d0e';
  } else if (effectiveGrounds.startsWith('beach_')) {
    concourseBaseColor = isNight ? '#78350f' : '#fde047';
  } else if (effectiveGrounds.startsWith('mountains_')) {
    concourseBaseColor = isNight ? '#1c1917' : '#57534e';
  }

  ctx.fillStyle = concourseBaseColor;
  if (isBowl) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  }

  // ---------------------------------------------------------------------------
  // ST6.3 HIGH-FIDELITY AERIAL MACRO-DETAILS FOR ALL GROUNDS ARCHETYPES
  // ---------------------------------------------------------------------------
  if (effectiveGrounds === 'parking_lots') {
    // 🚌 Parking Lots: Grid of white stalls, luxury team coach buses, parked cars, floodlight poles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.lineWidth = 1.5;

    // South parking bays
    for (let r = 0; r < 5; r++) {
      const bx = cx - w * 0.40 + r * 70;
      const by = cy + h * 0.41;
      ctx.strokeRect(bx, by, 34, 16);
      // Parked passenger cars
      ctx.fillStyle = r % 3 === 0 ? '#1e3a8a' : r % 3 === 1 ? '#dc2626' : '#ffffff';
      ctx.fillRect(bx + 3, by + 3, 28, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 7, by + 5, 20, 6);
    }

    // North luxury team coach buses
    for (let b = 0; b < 2; b++) {
      const busX = cx - 120 + b * 130;
      const busY = cy - h * 0.46;
      ctx.fillStyle = b === 0 ? '#dc2626' : '#2563eb'; // Home & Away coach
      ctx.fillRect(busX, busY, 85, 22);
      ctx.fillStyle = '#0f172a'; // Tinted panoramic glass roof / windows
      ctx.fillRect(busX + 8, busY + 3, 68, 16);
      ctx.fillStyle = '#cbd5e1'; // Roof AC units
      ctx.fillRect(busX + 22, busY + 6, 16, 10);
      ctx.fillRect(busX + 48, busY + 6, 16, 10);
    }

    // Pedestrian zebra crossing stripe
    ctx.fillStyle = '#ffffff';
    for (let z = 0; z < 8; z++) {
      ctx.fillRect(cx - 30 + z * 8, cy + h * 0.41, 5, 18);
    }
  } else if (effectiveGrounds === 'mall_commercial') {
    // 🛍️ Mall / Commercial: Retail center roofs with skylights, HVAC chillers, cafe umbrellas
    // West retail wing
    ctx.fillStyle = isNight ? '#0f172a' : '#475569';
    ctx.fillRect(cx - w * 0.48, cy - 140, 65, 280);
    // Skylights with cyan glass
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - w * 0.48 + 12, cy - 110, 40, 50);
    ctx.fillRect(cx - w * 0.48 + 12, cy + 60, 40, 50);
    // HVAC compressor units on roof
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - w * 0.48 + 16, cy - 20, 16, 16);
    ctx.fillRect(cx - w * 0.48 + 36, cy - 20, 14, 16);

    // East retail wing
    ctx.fillStyle = isNight ? '#0f172a' : '#475569';
    ctx.fillRect(cx + w * 0.48 - 65, cy - 140, 65, 280);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx + w * 0.48 - 52, cy - 110, 40, 50);
    ctx.fillRect(cx + w * 0.48 - 52, cy + 60, 40, 50);

    // Colorful outdoor cafe parasols / umbrellas on south plaza
    const parasolColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
    for (let p = 0; p < 4; p++) {
      const px = cx - 110 + p * 75;
      const py = cy + h * 0.43;
      ctx.fillStyle = parasolColors[p % parasolColors.length];
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effectiveGrounds === 'classical_statues') {
    // 🗿 Classical (Emirates-Style): Circular fountain plaza, bronze statue plinths, boxwood hedges
    // Central circular fountain on south promenade
    const fX = cx;
    const fY = cy + h * 0.42;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(fX, fY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0'; // Marble coping ring
    ctx.lineWidth = 3;
    ctx.stroke();
    // Concentric water jet ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fX, fY, 12, 0, Math.PI * 2);
    ctx.arc(fX, fY, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Four Bronze Legend Statues on stone pedestals at cardinal points
    const statueOffsets = [
      { x: cx - 120, y: cy + h * 0.42 },
      { x: cx + 120, y: cy + h * 0.42 },
      { x: cx - 120, y: cy - h * 0.42 },
      { x: cx + 120, y: cy - h * 0.42 },
    ];
    for (const st of statueOffsets) {
      // Marble plinth
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(st.x - 7, st.y - 7, 14, 14);
      // Bronze legend statue
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(st.x, st.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Symmetrical clipped boxwood hedges
    ctx.fillStyle = '#14532d';
    ctx.fillRect(cx - 180, cy + h * 0.40, 45, 8);
    ctx.fillRect(cx + 135, cy + h * 0.40, 45, 8);
    ctx.fillRect(cx - 180, cy - h * 0.41, 45, 8);
    ctx.fillRect(cx + 135, cy - h * 0.41, 45, 8);
  } else if (effectiveGrounds === 'municipal_thoroughfare') {
    // 🚦 Municipal Thoroughfare: Surrounding street grid with moving traffic, curbs, crosswalks
    ctx.strokeStyle = isNight ? '#020617' : '#1e293b';
    ctx.lineWidth = 26;

    // South perimeter avenue
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.52, cy + h * 0.43);
    ctx.lineTo(cx + w * 0.52, cy + h * 0.43);
    ctx.stroke();

    // Yellow centerline
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.52, cy + h * 0.43);
    ctx.lineTo(cx + w * 0.52, cy + h * 0.43);
    ctx.stroke();
    ctx.setLineDash([]);

    // Moving pixel vehicles with headlights/taillights
    const vehicles = [
      { x: cx - 160, y: cy + h * 0.43 - 5, col: '#dc2626' },
      { x: cx - 40, y: cy + h * 0.43 + 5, col: '#2563eb' },
      { x: cx + 80, y: cy + h * 0.43 - 5, col: '#ffffff' },
      { x: cx + 180, y: cy + h * 0.43 + 5, col: '#f59e0b' },
    ];
    for (const v of vehicles) {
      ctx.fillStyle = v.col;
      ctx.fillRect(v.x, v.y - 4, 18, 8);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(v.x + 3, v.y - 3, 12, 6);
      if (isNight || isSunset) {
        ctx.fillStyle = '#fef08a'; // Headlights
        ctx.fillRect(v.x + 18, v.y - 3, 2, 2);
        ctx.fillRect(v.x + 18, v.y + 1, 2, 2);
        ctx.fillStyle = '#ef4444'; // Taillights
        ctx.fillRect(v.x - 2, v.y - 3, 2, 2);
        ctx.fillRect(v.x - 2, v.y + 1, 2, 2);
      }
    }
  } else if (effectiveGrounds === 'potrero_dirt') {
    // 🌾 Potrero Dirt: Muddy earth with puddle reflections, tire tracks, rustic fence posts
    ctx.fillStyle = isNight ? '#1c1917' : '#57534e';
    for (let i = 0; i < 40; i++) {
      const px = cx - w * 0.42 + ((i * 47) % (w * 0.84));
      const py = cy + h * 0.38 + ((i * 31) % (h * 0.12));
      ctx.fillRect(px, py, 6, 3);
    }

    // Sky puddle reflections with specular blue tint
    const puddles = [
      { x: cx - 120, y: cy + h * 0.42, rx: 24, ry: 10 },
      { x: cx + 90, y: cy + h * 0.43, rx: 32, ry: 12 },
      { x: cx - 50, y: cy - h * 0.43, rx: 20, ry: 8 },
    ];
    for (const pd of puddles) {
      ctx.fillStyle = isSunset ? 'rgba(251, 146, 60, 0.45)' : isNight ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.55)';
      ctx.beginPath();
      ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f'; // Mud edge
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Dirt tire ruts winding through the clearing
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.46, cy + h * 0.44);
    ctx.bezierCurveTo(cx - 100, cy + h * 0.41, cx + 80, cy + h * 0.45, cx + w * 0.46, cy + h * 0.42);
    ctx.stroke();
  } else if (effectiveGrounds === 'modern_architectural') {
    // 💎 Modern Architectural: Polished granite pavers, reflective water basins, ground LED ribbons
    ctx.fillStyle = '#06b6d4'; // Turquoise reflective water basin
    ctx.fillRect(cx - w * 0.36, cy + h * 0.41, 80, 18);
    ctx.fillRect(cx + w * 0.16, cy + h * 0.41, 80, 18);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - w * 0.36, cy + h * 0.41, 80, 18);
    ctx.strokeRect(cx + w * 0.16, cy + h * 0.41, 80, 18);

    // Glowing cyan in-ground LED ribbons
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 120, cy + h * 0.45);
    ctx.lineTo(cx + 120, cy + h * 0.45);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (effectiveGrounds === 'industrial_depot') {
    // 🏗️ Industrial Depot: Shipping container stacks in primary colors, yellow forklift lanes
    const contColors = ['#dc2626', '#2563eb', '#eab308', '#059669'];
    for (let i = 0; i < 5; i++) {
      const contX = cx - w * 0.36 + i * 50;
      const contY = cy + h * 0.41;
      ctx.fillStyle = contColors[i % contColors.length];
      ctx.fillRect(contX, contY, 42, 16);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(contX, contY, 42, 16);
      // Corrugation lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let cl = 4; cl < 40; cl += 6) {
        ctx.fillRect(contX + cl, contY, 2, 16);
      }
    }
  } else if (effectiveGrounds === 'park_recreation') {
    // 🌲 Park & Recreation: Lush tree clusters, pebble paths, mini sports courts
    ctx.fillStyle = '#15803d';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const tx = cx + Math.cos(angle) * (w * 0.45);
      const ty = cy + Math.sin(angle) * (h * 0.45);
      ctx.beginPath();
      ctx.arc(tx, ty, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // Recreational basketball / tennis court lines on concourse corner
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(cx - w * 0.42, cy - h * 0.45, 55, 34);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - w * 0.42 + 3, cy - h * 0.45 + 3, 49, 28);
  } else if (effectiveGrounds === 'club_museum_trophies') {
    // 🏆 Club Museum & Trophies: Team crest mosaic, Walk of Fame star pavers, flagpoles
    // Large circular team crest mosaic in south forecourt
    const mX = cx;
    const mY = cy + h * 0.42;
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(mX, mY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Star emblem inside crest
    ctx.fillStyle = '#facc15';
    ctx.fillRect(mX - 4, mY - 4, 8, 8);

    // Walk of Fame star pavers along east/west promenade
    for (let st = -3; st <= 3; st++) {
      if (st === 0) continue;
      const sx = cx + st * 45;
      const sy = cy + h * 0.42;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx - 7, sy - 7, 14, 14);
      ctx.fillStyle = '#f59e0b'; // Gold star
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
    }
  } else {
    // Radial pavement expansion joints for base concourse
    ctx.strokeStyle = isNight ? '#0f172a' : isSunset ? '#475569' : '#64748b';
    ctx.lineWidth = 1.5;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (w * 0.42), cy + Math.sin(angle) * (h * 0.42));
      ctx.lineTo(cx + Math.cos(angle) * (w * 0.50), cy + Math.sin(angle) * (h * 0.50));
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Central playing field seen from high altitude through the roof aperture
 */
function drawAerialPitchTurf(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  stadium: StadiumDefinition,
  timeOfDay: TimeOfDay = 'night'
) {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const top = PITCH_CONFIG.PITCH_TOP;
  const fWidth = PITCH_CONFIG.FIELD_WIDTH;
  const fHeight = PITCH_CONFIG.FIELD_HEIGHT;

  // Base grass
  const turfQuality = stadium.turfQuality || 'normal';
  ctx.fillStyle = turfQuality === 'pristine' ? '#1eb842' : turfQuality === 'poor' ? '#5f6f25' : '#2d7a18';
  ctx.fillRect(left - 50, top - 50, fWidth + 100, fHeight + 100);

  // Mowing stripes (horizontal alternating tones)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  const stripeH = 80;
  for (let y = top; y < top + fHeight; y += stripeH * 2) {
    ctx.fillRect(left, y, fWidth, stripeH);
  }

  // Official Pitch White Lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;

  // Touchlines & Endlines
  ctx.strokeRect(left, top, fWidth, fHeight);

  // Halfway Line
  ctx.beginPath();
  ctx.moveTo(left, cy);
  ctx.lineTo(left + fWidth, cy);
  ctx.stroke();

  // Center Circle (radius 68 px) & Center Spot
  ctx.beginPath();
  ctx.arc(cx, cy, 68, 0, Math.PI * 2);
  ctx.stroke();

  // Phase A6.1: Center-Circle Club Crest Field Mosaic
  drawAerialClubCrestMosaic(ctx, cx, cy, stadium);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Top & Bottom Penalty Boxes
  const boxW = 280;
  const boxH = 120;
  ctx.strokeRect(cx - boxW / 2, top, boxW, boxH);
  ctx.strokeRect(cx - boxW / 2, top + fHeight - boxH, boxW, boxH);

  // Goal Boxes
  const goalBoxW = 140;
  const goalBoxH = 45;
  ctx.strokeRect(cx - goalBoxW / 2, top, goalBoxW, goalBoxH);
  ctx.strokeRect(cx - goalBoxW / 2, top + fHeight - goalBoxH, goalBoxW, goalBoxH);

  // Penalty Spots & D-Arcs
  ctx.beginPath();
  ctx.arc(cx, top + 80, 3, 0, Math.PI * 2);
  ctx.arc(cx, top + fHeight - 80, 3, 0, Math.PI * 2);
  ctx.fill();

  // 4 Corner Arcs
  const cornerR = 14;
  ctx.beginPath();
  ctx.arc(left, top, cornerR, 0, Math.PI / 2);
  ctx.arc(left + fWidth, top, cornerR, Math.PI / 2, Math.PI);
  ctx.arc(left + fWidth, top + fHeight, cornerR, Math.PI, (Math.PI * 3) / 2);
  ctx.arc(left, top + fHeight, cornerR, (Math.PI * 3) / 2, Math.PI * 2);
  ctx.stroke();

  // Goals (White posts and crossbar)
  const goalW = 86;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - goalW / 2, top - 14, goalW, 4);
  ctx.fillRect(cx - goalW / 2, top + fHeight + 10, goalW, 4);

  // Phase S3.3: Shape-consistent roof shadows cast over pitch turf & markings from aerial view
  drawArchitecturalRoofShadows(ctx, stadium, timeOfDay);
}

/**
 * Perimeter Run-off Apron Material (Phase 15.5: between pitch line and grandstands/track)
 * 6 Materials: grass, concrete, rubber_tartan, artificial_turf, gravel_ballast, asphalt_paved
 */
function drawAerialApron(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  material: ApronMaterial = 'grass',
  shape: StadiumShape,
  metrics: StadiumShapeMetrics
) {
  ctx.save();

  switch (material) {
    case 'concrete':
      ctx.fillStyle = '#94a3b8';
      break;
    case 'rubber_tartan':
      ctx.fillStyle = '#991b1b';
      break;
    case 'artificial_turf':
      ctx.fillStyle = '#15803d';
      break;
    case 'gravel_ballast':
      ctx.fillStyle = '#44403c';
      break;
    case 'asphalt_paved':
      ctx.fillStyle = '#1e293b';
      break;
    case 'grass':
    default:
      ctx.fillStyle = '#2d7a18';
      break;
  }

  if (shape === 'round' || shape === 'circular') {
    ctx.beginPath();
    ctx.arc(cx, cy, metrics.apronRadiusX, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'oval') {
    const pTop = PITCH_CONFIG.PITCH_TOP;
    const pBottom = PITCH_CONFIG.PITCH_BOTTOM;
    ctx.beginPath();
    ctx.moveTo(metrics.westInnerX, pTop);
    ctx.lineTo(metrics.westInnerX, pBottom);
    ctx.arc(cx, pBottom, cx - metrics.westInnerX, Math.PI, 0, true);
    ctx.lineTo(metrics.eastInnerX, pTop);
    ctx.arc(cx, pTop, cx - metrics.westInnerX, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(metrics.apronLeft, metrics.apronTop, metrics.apronWidth, metrics.apronHeight);
  }

  // Texture details on apron
  if (material === 'concrete') {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    for (let x = metrics.apronLeft + 60; x < metrics.apronLeft + metrics.apronWidth; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, metrics.apronTop);
      ctx.lineTo(x, metrics.apronTop + metrics.apronHeight);
      ctx.stroke();
    }
  } else if (material === 'gravel_ballast') {
    ctx.fillStyle = '#292524';
    for (let i = 0; i < 60; i++) {
      const gx = metrics.apronLeft + ((i * 47) % metrics.apronWidth);
      const gy = metrics.apronTop + ((i * 31) % metrics.apronHeight);
      ctx.fillRect(gx, gy, 8, 4);
    }
  }

  ctx.restore();
}

/**
 * 8-Lane Terracotta Athletics Running Track (Encircles the pitch and apron for Round & Oval; zero pitch overlap)
 */
function drawAerialAthleticsTrack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  shape: StadiumShape,
  metrics: StadiumShapeMetrics
) {
  const trackWidth = 85;
  const isSyntheticBlue = metrics.hasTrack && (shape === 'oval');
  const trackColor = isSyntheticBlue ? '#1e3a5f' : '#b91c1c';

  ctx.save();

  if (shape === 'round' || shape === 'circular') {
    const r = metrics.trackRadiusX;
    // Circular track completely clearing pitch corners
    ctx.fillStyle = trackColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r + trackWidth / 2, 0, Math.PI * 2);
    ctx.arc(cx, cy, r - trackWidth / 2, 0, Math.PI * 2, true);
    ctx.fill();

    // 8 White lane lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    for (let lane = 1; lane < 8; lane++) {
      const lr = r - trackWidth / 2 + (trackWidth * lane) / 8;
      ctx.beginPath();
      ctx.arc(cx, cy, lr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Finish line & ticks
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - r - trackWidth / 2 + 2, cy - 8, 6, 16);
  } else if (shape === 'oval') {
    // Olympic Oval track: straight touchlines + semicircular bends
    const pTop = PITCH_CONFIG.PITCH_TOP;
    const pBottom = PITCH_CONFIG.PITCH_BOTTOM;
    const trackDistX = cx - (PITCH_CONFIG.PITCH_LEFT - 140);

    ctx.strokeStyle = trackColor;
    ctx.lineWidth = trackWidth;
    ctx.beginPath();
    ctx.moveTo(cx - trackDistX, pTop);
    ctx.lineTo(cx - trackDistX, pBottom);
    ctx.arc(cx, pBottom, trackDistX, Math.PI, 0, true);
    ctx.lineTo(cx + trackDistX, pTop);
    ctx.arc(cx, pTop, trackDistX, 0, Math.PI, true);
    ctx.closePath();
    ctx.stroke();

    // 8 White lane divider lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([14, 10]);
    for (let lane = 1; lane < 8; lane++) {
      const offset = -trackWidth / 2 + (trackWidth * lane) / 8;
      const curDist = trackDistX + offset;
      ctx.beginPath();
      ctx.moveTo(cx - curDist, pTop);
      ctx.lineTo(cx - curDist, pBottom);
      ctx.arc(cx, pBottom, curDist, Math.PI, 0, true);
      ctx.lineTo(cx + curDist, pTop);
      ctx.arc(cx, pTop, curDist, 0, Math.PI, true);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/**
 * 22 Players and Referee lined up around center circle for pre-match ceremony
 */
function drawAerialSquadLineup(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  homeKit: TeamKit,
  awayKit: TeamKit
) {
  ctx.save();

  // Home Squad (11 dots lined up horizontally above halfway line)
  const startX = cx - 180;
  for (let i = 0; i < 11; i++) {
    const px = startX + i * 36;
    const py = cy - 24;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(px + 1, py + 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player jersey dot
    ctx.fillStyle = i === 0 ? '#facc15' : homeKit.primaryColor; // GK is yellow
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Away Squad (11 dots lined up horizontally below halfway line)
  for (let i = 0; i < 11; i++) {
    const px = startX + i * 36;
    const py = cy + 24;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(px + 1, py + 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player jersey dot
    ctx.fillStyle = i === 0 ? '#10b981' : awayKit.primaryColor; // GK is green
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Referee + 2 Assistant Referees at Center Spot
  ctx.fillStyle = '#0f172a'; // Black kit
  ctx.beginPath();
  ctx.arc(cx - 10, cy, 3.5, 0, Math.PI * 2); // Referee
  ctx.arc(cx + 10, cy, 3.5, 0, Math.PI * 2); // Ball
  ctx.fill();

  ctx.restore();
}

/**
 * Helper to check if a stand is configured and active (not 'none' and not 'no_stand')
 */
export function isStandActive(stand?: StandConfig): boolean {
  if (!stand) return false;
  return stand.type !== 'none' && stand.type !== 'no_stand';
}

/**
 * PHASE ST6.1: Outer facade cladding reflecting the stand architectural grade,
 * true stadium shape geometry (Round coliseum, Oval racetrack, Square 1:1 box, Rectangular),
 * and faithful No-Stand asymmetry (open ground when stand is none/no_stand).
 */
export function drawStadiumOuterFacade(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  shape: StadiumShape,
  stadium: StadiumDefinition,
  timeOfDay: TimeOfDay = 'night',
  metrics?: StadiumShapeMetrics
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isRound = shape === 'round' || shape === 'circular';
  const isOval = shape === 'oval';
  const isSquare = shape === 'square';
  const grade: StandGrade = stadium.stands?.west?.grade || 'grade4_modern';
  const stands = stadium.stands || ({} as Record<StandPosition, StandConfig>);

  ctx.save();

  // Resolve Facade Material Color based on Architectural Grade
  let facadeColor = '#cbd5e1';
  let structuralRibColor = '#94a3b8';

  if (grade === 'grade1_municipal' || grade === 'grade1_historic_timber') {
    facadeColor = isNight ? '#292524' : isSunset ? '#57534e' : '#78716c';
    structuralRibColor = '#44403c';
  } else if (grade === 'grade2_classic') {
    facadeColor = isNight ? '#450a0a' : isSunset ? '#7f1d1d' : '#991b1b';
    structuralRibColor = '#1e293b';
  } else if (grade === 'grade3_industrial' || grade === 'grade3_steel_cantilever') {
    facadeColor = isNight ? '#1e293b' : isSunset ? '#334155' : '#475569';
    structuralRibColor = '#0f172a';
  } else if (grade === 'grade4_modern') {
    facadeColor = isNight ? '#334155' : isSunset ? '#94a3b8' : '#e2e8f0';
    structuralRibColor = '#64748b';
  } else if (grade === 'grade5_futuristic') {
    facadeColor = isNight ? '#0f172a' : isSunset ? '#cbd5e1' : '#f8fafc';
    structuralRibColor = '#38bdf8';
  }

  // Stand presence flags (ST6.1: No-Stand Asymmetry)
  const hasWest = isStandActive(stands.west);
  const hasEast = isStandActive(stands.east);
  const hasNorth = isStandActive(stands.north);
  const hasSouth = isStandActive(stands.south);

  const apertureRadiusX = metrics ? metrics.apronRadiusX : 1200;
  const apertureRadiusY = metrics ? metrics.apronRadiusY : 1200;
  const pTop = PITCH_CONFIG.PITCH_TOP;
  const pBottom = PITCH_CONFIG.PITCH_BOTTOM;

  if (isRound) {
    // 🏟️ ROUND COLISEUM: True circular concentric footprint with radial buttresses
    const outerR = w / 2;
    const innerR = apertureRadiusX + 40;

    // Define 4 cardinal quadrant arcs:
    // West: angle 3*PI/4 to 5*PI/4
    // North: angle 5*PI/4 to 7*PI/4
    // East: angle -PI/4 to PI/4
    // South: angle PI/4 to 3*PI/4
    const sectors = [
      { active: hasEast, startAngle: -Math.PI / 4, endAngle: Math.PI / 4 },
      { active: hasSouth, startAngle: Math.PI / 4, endAngle: (3 * Math.PI) / 4 },
      { active: hasWest, startAngle: (3 * Math.PI) / 4, endAngle: (5 * Math.PI) / 4 },
      { active: hasNorth, startAngle: (5 * Math.PI) / 4, endAngle: (7 * Math.PI) / 4 },
    ];

    ctx.fillStyle = facadeColor;
    for (const sec of sectors) {
      if (!sec.active) continue; // ST6.1: Omit facade where stand is No Stand, revealing open grounds!
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, sec.startAngle, sec.endAngle);
      ctx.arc(cx, cy, innerR, sec.endAngle, sec.startAngle, true);
      ctx.closePath();
      ctx.fill();
    }

    // Radial architectural buttresses
    ctx.strokeStyle = structuralRibColor;
    ctx.lineWidth = 3;
    const numRibs = 32;
    for (let i = 0; i < numRibs; i++) {
      const angle = (i * Math.PI * 2) / numRibs;
      // Check which sector this rib falls into
      let ribActive = true;
      if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4 && !hasSouth) ribActive = false;
      else if (angle >= (3 * Math.PI) / 4 && angle < (5 * Math.PI) / 4 && !hasWest) ribActive = false;
      else if (angle >= (5 * Math.PI) / 4 && angle < (7 * Math.PI) / 4 && !hasNorth) ribActive = false;
      else if ((angle < Math.PI / 4 || angle >= (7 * Math.PI) / 4) && !hasEast) ribActive = false;

      if (ribActive) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (innerR + 10), cy + Math.sin(angle) * (innerR + 10));
        ctx.lineTo(cx + Math.cos(angle) * (outerR - 6), cy + Math.sin(angle) * (outerR - 6));
        ctx.stroke();
      }
    }
  } else if (isOval) {
    // 🏟️ OVAL ATHLETICS STADIUM: Elongated racetrack silhouette with straight touchlines and curved endzones
    const trackDistX = metrics ? (cx - metrics.westInnerX) : (w / 2 - 200);
    const outerTrackDistX = w / 2;

    ctx.fillStyle = facadeColor;

    // 1. West Straight Touchline Facade
    if (hasWest) {
      ctx.fillRect(cx - outerTrackDistX, pTop, outerTrackDistX - trackDistX, pBottom - pTop);
      // Vertical structural ribs
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let ry = pTop + 40; ry <= pBottom - 40; ry += 50) {
        ctx.beginPath();
        ctx.moveTo(cx - outerTrackDistX, ry);
        ctx.lineTo(cx - trackDistX, ry);
        ctx.stroke();
      }
    }

    // 2. East Straight Touchline Facade
    if (hasEast) {
      ctx.fillRect(cx + trackDistX, pTop, outerTrackDistX - trackDistX, pBottom - pTop);
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let ry = pTop + 40; ry <= pBottom - 40; ry += 50) {
        ctx.beginPath();
        ctx.moveTo(cx + trackDistX, ry);
        ctx.lineTo(cx + outerTrackDistX, ry);
        ctx.stroke();
      }
    }

    // 3. North Semicircular Endzone Curve
    if (hasNorth) {
      ctx.beginPath();
      ctx.arc(cx, pTop, outerTrackDistX, Math.PI, 0, false);
      ctx.arc(cx, pTop, trackDistX, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Radial ribs on north bend
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let a = Math.PI + 0.2; a < Math.PI * 2 - 0.2; a += 0.3) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (trackDistX + 10), pTop + Math.sin(a) * (trackDistX + 10));
        ctx.lineTo(cx + Math.cos(a) * (outerTrackDistX - 6), pTop + Math.sin(a) * (outerTrackDistX - 6));
        ctx.stroke();
      }
    }

    // 4. South Semicircular Endzone Curve
    if (hasSouth) {
      ctx.beginPath();
      ctx.arc(cx, pBottom, outerTrackDistX, 0, Math.PI, false);
      ctx.arc(cx, pBottom, trackDistX, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();

      // Radial ribs on south bend
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let a = 0.2; a < Math.PI - 0.2; a += 0.3) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (trackDistX + 10), pBottom + Math.sin(a) * (trackDistX + 10));
        ctx.lineTo(cx + Math.cos(a) * (outerTrackDistX - 6), pBottom + Math.sin(a) * (outerTrackDistX - 6));
        ctx.stroke();
      }
    }
  } else {
    // 🏟️ RECTILINEAR / SQUARE STADIUM: Four distinct stand wings with 45° corner joins
    const wingDepthX = w / 2 - (apertureRadiusX + 40);
    const wingDepthY = h / 2 - (apertureRadiusY + 40);

    // 1. WEST STAND FACADE
    if (hasWest) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx - w / 2, cy - h / 2, wingDepthX, h);
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let ry = cy - h / 2 + 50; ry <= cy + h / 2 - 50; ry += 60) {
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, ry);
        ctx.lineTo(cx - w / 2 + wingDepthX, ry);
        ctx.stroke();
      }
    }

    // 2. EAST STAND FACADE
    if (hasEast) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx + w / 2 - wingDepthX, cy - h / 2, wingDepthX, h);
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let ry = cy - h / 2 + 50; ry <= cy + h / 2 - 50; ry += 60) {
        ctx.beginPath();
        ctx.moveTo(cx + w / 2 - wingDepthX, ry);
        ctx.lineTo(cx + w / 2, ry);
        ctx.stroke();
      }
    }

    // 3. NORTH STAND FACADE
    if (hasNorth) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx - w / 2, cy - h / 2, w, wingDepthY);
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let rx = cx - w / 2 + 50; rx <= cx + w / 2 - 50; rx += 70) {
        ctx.beginPath();
        ctx.moveTo(rx, cy - h / 2);
        ctx.lineTo(rx, cy - h / 2 + wingDepthY);
        ctx.stroke();
      }
    }

    // 4. SOUTH STAND FACADE
    if (hasSouth) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx - w / 2, cy + h / 2 - wingDepthY, w, wingDepthY);
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let rx = cx - w / 2 + 50; rx <= cx + w / 2 - 50; rx += 70) {
        ctx.beginPath();
        ctx.moveTo(rx, cy + h / 2 - wingDepthY);
        ctx.lineTo(rx, cy + h / 2);
        ctx.stroke();
      }
    }

    // ST6.1: Square 45° Corner Link Pavilions
    if (isSquare) {
      ctx.fillStyle = structuralRibColor;
      const cornerSize = 48;
      // NW, NE, SE, SW corner accent pavilions
      if (hasWest && hasNorth) ctx.fillRect(cx - w / 2, cy - h / 2, cornerSize, cornerSize);
      if (hasEast && hasNorth) ctx.fillRect(cx + w / 2 - cornerSize, cy - h / 2, cornerSize, cornerSize);
      if (hasEast && hasSouth) ctx.fillRect(cx + w / 2 - cornerSize, cy + h / 2 - cornerSize, cornerSize, cornerSize);
      if (hasWest && hasSouth) ctx.fillRect(cx - w / 2, cy + h / 2 - cornerSize, cornerSize, cornerSize);
    }
  }

  // Archibald Leitch British racing green criss-cross lattice on Outer Facade
  if (grade === 'grade2_classic') {
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.5;
    if (isRound) {
      ctx.beginPath();
      ctx.arc(cx, cy, (w / 2) * 0.94, 0, Math.PI * 2);
      ctx.stroke();
    } else if (isOval) {
      const pTop = PITCH_CONFIG.PITCH_TOP;
      const pBottom = PITCH_CONFIG.PITCH_BOTTOM;
      const outerR = (w / 2) * 0.94;
      ctx.beginPath();
      ctx.moveTo(cx - outerR, pTop);
      ctx.lineTo(cx - outerR, pBottom);
      ctx.arc(cx, pBottom, outerR, Math.PI, 0, true);
      ctx.lineTo(cx + outerR, pTop);
      ctx.arc(cx, pTop, outerR, 0, Math.PI, true);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - (w * 0.94) / 2, cy - (h * 0.94) / 2, w * 0.94, h * 0.94);
    }
  }

  // Futuristic LED Ribbon Glow on Outer Facade
  if (grade === 'grade5_futuristic' && (isNight || isSunset)) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    if (isRound) {
      ctx.beginPath();
      ctx.arc(cx, cy, (w / 2) * 0.94, 0, Math.PI * 2);
      ctx.stroke();
    } else if (isOval) {
      const pTop = PITCH_CONFIG.PITCH_TOP;
      const pBottom = PITCH_CONFIG.PITCH_BOTTOM;
      const outerR = (w / 2) * 0.94;
      ctx.beginPath();
      ctx.moveTo(cx - outerR, pTop);
      ctx.lineTo(cx - outerR, pBottom);
      ctx.arc(cx, pBottom, outerR, Math.PI, 0, true);
      ctx.lineTo(cx + outerR, pTop);
      ctx.arc(cx, pTop, outerR, 0, Math.PI, true);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - (w * 0.94) / 2, cy - (h * 0.94) / 2, w * 0.94, h * 0.94);
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/**
 * Macro-Scale Dugout Benches on Touchline Concourse (Phase 15.8.1 Contract)
 * Renders manager and player dugout shelters faithfully according to DugoutConfig
 */
function drawAerialDugouts(
  ctx: CanvasRenderingContext2D,
  dugouts: DugoutConfig | undefined,
  cx: number,
  cy: number,
  isBowl: boolean
) {
  ctx.save();

  const pLeft = PITCH_CONFIG.PITCH_LEFT;
  const pCenterY = PITCH_CONFIG.CENTER_Y;
  const type = dugouts?.type || 'recaro_racing';
  const quality = dugouts?.quality || 'modern';
  const frameColor = dugouts?.frameColor || '#334155';
  const cushionColor = dugouts?.cushionColor || '#0284c7';
  const shelterTint = dugouts?.shelterTint || 'rgba(56, 189, 248, 0.45)';

  const dugoutW = 44;
  const dugoutH = 74;
  const setback = Math.max(70, dugouts?.setbackDistance || 95);
  const dugoutX = pLeft - setback;

  const homeDugoutY = pCenterY - 115;
  const awayDugoutY = pCenterY + 45;

  const benchSlots = [
    { y: homeDugoutY, teamCol: cushionColor || '#0284c7', label: 'HOME' },
    { y: awayDugoutY, teamCol: '#dc2626', label: 'AWAY' },
  ];

  for (const b of benchSlots) {
    if (type === 'recaro_racing' || type === 'racing_bucket') {
      // Luxury aerodynamic bucket seat shell
      ctx.fillStyle = frameColor;
      ctx.fillRect(dugoutX, b.y, dugoutW, dugoutH);

      // Ergonomic bucket seats (2 rows of 6 seats)
      for (let r = 0; r < 2; r++) {
        for (let s = 0; s < 6; s++) {
          const sx = dugoutX + 6 + r * 18;
          const sy = b.y + 8 + s * 10;
          ctx.fillStyle = b.teamCol;
          ctx.fillRect(sx, sy, 12, 7);
          ctx.fillStyle = '#0f172a'; // Contoured headrest
          ctx.fillRect(sx + 2, sy + 1, 8, 2);
        }
      }

      // Tinted glass aerodynamic weather canopy
      ctx.fillStyle = shelterTint;
      ctx.fillRect(dugoutX + 2, b.y + 2, dugoutW - 4, dugoutH - 4);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(dugoutX, b.y, dugoutW, dugoutH);
    } else if (type === 'covered_sunken') {
      // Sub-surface sunken trench with curved polycarbonate weather shield
      ctx.fillStyle = '#0f172a'; // Deep trench shadow
      ctx.fillRect(dugoutX - 4, b.y - 2, dugoutW + 8, dugoutH + 4);
      ctx.strokeStyle = '#64748b'; // Concrete trench retaining wall
      ctx.lineWidth = 2.5;
      ctx.strokeRect(dugoutX - 4, b.y - 2, dugoutW + 8, dugoutH + 4);

      // Benches inside trench
      ctx.fillStyle = b.teamCol;
      ctx.fillRect(dugoutX + 4, b.y + 6, dugoutW - 8, dugoutH - 12);

      // Curved transparent canopy
      ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.fillRect(dugoutX, b.y, dugoutW, dugoutH);
    } else if (type === 'classic_timber') {
      // Grassroots timber bench with slatted wood planks
      ctx.fillStyle = '#451a03'; // Wooden frame
      ctx.fillRect(dugoutX, b.y, dugoutW, dugoutH);
      ctx.fillStyle = '#78350f'; // Slatted wood
      for (let sy = b.y + 6; sy < b.y + dugoutH - 6; sy += 8) {
        ctx.fillRect(dugoutX + 4, sy, dugoutW - 8, 5);
      }
      ctx.fillStyle = b.teamCol; // Cushion seats
      ctx.fillRect(dugoutX + 6, b.y + 10, dugoutW - 12, dugoutH - 20);
      ctx.strokeStyle = '#1c1917'; // Iron brackets
      ctx.lineWidth = 2;
      ctx.strokeRect(dugoutX, b.y, dugoutW, dugoutH);
    } else if (type === 'utilitarian_concrete' || type === 'concrete_dugout') {
      // Solid concrete bunker shelter
      ctx.fillStyle = '#334155'; // Concrete bunker
      ctx.fillRect(dugoutX - 4, b.y - 2, dugoutW + 8, dugoutH + 4);
      ctx.fillStyle = '#0f172a'; // Interior recess
      ctx.fillRect(dugoutX, b.y + 4, dugoutW - 2, dugoutH - 8);
      ctx.fillStyle = b.teamCol;
      ctx.fillRect(dugoutX + 6, b.y + 10, dugoutW - 14, dugoutH - 20);
    } else {
      // Pitch-Level folding chairs
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Drop shadow
      ctx.fillRect(dugoutX, b.y, dugoutW * 0.7, dugoutH);
      for (let s = 0; s < 7; s++) {
        const sy = b.y + 6 + s * 9;
        ctx.fillStyle = '#64748b'; // Metal frame
        ctx.fillRect(dugoutX + 2, sy, 22, 6);
        ctx.fillStyle = b.teamCol; // Cushion
        ctx.fillRect(dugoutX + 5, sy + 1, 16, 4);
      }
    }
  }

  ctx.restore();
}

/**
 * Macro-Scale Player Entrance Tunnel on Touchline / Concourse (Phase 15.8.1 Contract)
 * Renders pre-match player entrance portals faithfully according to EntranceTunnelConfig
 */
function drawAerialEntranceTunnel(
  ctx: CanvasRenderingContext2D,
  tunnel: EntranceTunnelConfig | undefined,
  cx: number,
  cy: number,
  isBowl: boolean
) {
  ctx.save();

  const pLeft = PITCH_CONFIG.PITCH_LEFT;
  const pTop = PITCH_CONFIG.PITCH_TOP;
  const fWidth = PITCH_CONFIG.FIELD_WIDTH;
  const fHeight = PITCH_CONFIG.FIELD_HEIGHT;
  const pCenterY = PITCH_CONFIG.CENTER_Y;

  const type = tunnel?.type || 'inflatable_accordion';
  const siting = tunnel?.siting || 'center_main';
  const primaryCol = tunnel?.primaryColor || '#b91c1c';
  const secondaryCol = tunnel?.secondaryColor || '#ffffff';

  // Determine Entrance Tunnel Coordinates based on siting
  let tunX = pLeft - 140;
  let tunY = pCenterY - 18;
  let tunW = 120;
  let tunH = 36;
  let isVertical = false;

  if (siting === 'corner') {
    // South-West pitch corner
    tunX = pLeft - 95;
    tunY = pTop + fHeight + 15;
    tunW = 85;
    tunH = 34;
  } else if (siting === 'behind_goal') {
    // Behind South goal line
    tunX = cx - 22;
    tunY = pTop + fHeight + 25;
    tunW = 44;
    tunH = 95;
    isVertical = true;
  }

  // Red Carpet Runner with gold embroidered trim
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(tunX, tunY, tunW, tunH);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.strokeRect(tunX, tunY, tunW, tunH);

  // Tunnel Body Architecture
  if (type === 'inflatable_accordion') {
    // South American style segmented bellows with alternating club stripes
    const numHoops = isVertical ? 8 : 10;
    const hoopStep = (isVertical ? tunH : tunW) / numHoops;
    for (let h = 0; h < numHoops; h++) {
      ctx.fillStyle = h % 2 === 0 ? primaryCol : secondaryCol;
      if (isVertical) {
        ctx.fillRect(tunX + 3, tunY + h * hoopStep, tunW - 6, hoopStep - 2);
      } else {
        ctx.fillRect(tunX + h * hoopStep, tunY + 3, hoopStep - 2, tunH - 6);
      }
    }
  } else if (type === 'modern_architectural') {
    // High-tech architectural tunnel with dark matte panels & glowing LED ribbons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    // Illuminated cyan/gold LED ribbon edges
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.strokeRect(tunX + 2, tunY + 2, tunW - 4, tunH - 4);
    ctx.shadowBlur = 0;
  } else if (type === 'subterranean_staircase') {
    // Sunken concrete staircase descending into subterranean dressing rooms
    ctx.fillStyle = '#334155';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    // Step lines
    const steps = 7;
    for (let st = 1; st < steps; st++) {
      ctx.beginPath();
      if (isVertical) {
        ctx.moveTo(tunX, tunY + (tunH * st) / steps);
        ctx.lineTo(tunX + tunW, tunY + (tunH * st) / steps);
      } else {
        ctx.moveTo(tunX + (tunW * st) / steps, tunY);
        ctx.lineTo(tunX + (tunW * st) / steps, tunY + tunH);
      }
      ctx.stroke();
    }
  } else if (type === 'direct_portal') {
    // Flush arched masonry portal with security grille
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(tunX, tunY, tunW, tunH);
  } else {
    // Telescopic canopy
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(tunX, tunY, tunW, tunH);
  }

  ctx.restore();
}

/**
 * Helper to compute aerial seat color according to seat pattern
 */
export function getAerialSeatColor(
  rowIdx: number,
  colIdx: number,
  tierIdx: number,
  totalTiers: number,
  pattern: string,
  color1: string,
  color2: string
): string {
  if (pattern === 'solid') return color1;
  if (pattern === 'horizontalBands') return rowIdx % 2 === 0 ? color1 : color2;
  if (pattern === 'verticalStripes') return colIdx % 2 === 0 ? color1 : color2;
  if (pattern === 'lowerUpper') return tierIdx < Math.ceil(totalTiers / 2) ? color1 : color2;
  return color1;
}

/**
 * PHASE ST6.2: Master 32-Bit Aerial Exposed Grandstand Seating Bowl Renderer
 *
 * Renders the full interior grandstand seating bowl visible from high altitude
 * when the roof canopy is disabled (hasRoof: false, enabled: false) or cutaway is hidden (cutaway: 'hidden'):
 * 1. Stepped seating tiers and risers based on tierCount and getTierChairRows
 * 2. Seat color patterns (solid, horizontal bands, vertical stripes, lower/upper tiers)
 * 3. Stepped gangways with yellow safety hazard stripes
 * 4. Deep vomitory access concourse portals with illuminated green emergency exit signage
 * 5. Tier safety balustrades and rear delimitation walls with coping caps
 * 6. Faithful support across all 4 shapes (Round coliseum, Oval racetrack, Square 1:1 box, Rectangular)
 * 7. Faithful No-Stand asymmetry: completely omits seating where a stand is set to 'none' or 'no_stand'
 */
export function drawAerialExposedSeatingBowl(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  shape: StadiumShape,
  stadium: StadiumDefinition,
  timeOfDay: TimeOfDay = 'night',
  metrics?: StadiumShapeMetrics
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isRound = shape === 'round' || shape === 'circular';
  const isOval = shape === 'oval';
  const isSquare = shape === 'square';
  const stands = stadium.stands || ({} as Record<StandPosition, StandConfig>);

  const apertureRadiusX = metrics ? Math.round(metrics.apronRadiusX * 0.90) : 1100;
  const apertureRadiusY = metrics ? Math.round(metrics.apronRadiusY * 0.90) : 1100;
  const outerBowlR = (w / 2) * 0.92;

  const seatColor1 = stadium.seats?.colors?.[0] || '#2563eb';
  const seatColor2 = stadium.seats?.colors?.[1] || '#ffffff';
  const seatPattern = stadium.seats?.pattern || 'solid';

  const hasWest = isStandActive(stands.west);
  const hasEast = isStandActive(stands.east);
  const hasNorth = isStandActive(stands.north);
  const hasSouth = isStandActive(stands.south);

  const pTop = PITCH_CONFIG.PITCH_TOP;
  const pBottom = PITCH_CONFIG.PITCH_BOTTOM;

  ctx.save();

  if (isRound) {
    // 🏟️ ROUND COLISEUM EXPOSED SEATING BOWL (Concentric Stepped Rings & Radial Vomitories)
    const sectors = [
      { active: hasEast, startAngle: -Math.PI / 4, endAngle: Math.PI / 4, stand: stands.east },
      { active: hasSouth, startAngle: Math.PI / 4, endAngle: (3 * Math.PI) / 4, stand: stands.south },
      { active: hasWest, startAngle: (3 * Math.PI) / 4, endAngle: (5 * Math.PI) / 4, stand: stands.west },
      { active: hasNorth, startAngle: (5 * Math.PI) / 4, endAngle: (7 * Math.PI) / 4, stand: stands.north },
    ];

    for (const sec of sectors) {
      if (!sec.active) continue; // ST6.1: Omit seating where stand is No Stand, revealing open grounds!

      const tierCount = sec.stand?.type === 'wall' ? 1 : (sec.stand?.tierCount || (sec.stand?.tiers ? sec.stand.tiers.length : 2));
      const bowlDepth = outerBowlR - apertureRadiusX;
      const tierRadialStep = bowlDepth / tierCount;

      // 1. Under-seat solid concrete decking fill
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx, cy, outerBowlR, sec.startAngle, sec.endAngle);
      ctx.arc(cx, cy, apertureRadiusX, sec.endAngle, sec.startAngle, true);
      ctx.closePath();
      ctx.fill();

      // Outer Delimitation Wall along perimeter
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, outerBowlR, sec.startAngle, sec.endAngle);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1'; // Stone coping cap
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, outerBowlR, sec.startAngle, sec.endAngle);
      ctx.stroke();

      // 2. Stepped chair rows per tier
      let globalRow = 0;
      for (let t = 0; t < tierCount; t++) {
        const tierSize = sec.stand?.type === 'wall' ? (sec.stand?.wallSize || 'large') : (sec.stand?.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepR = (tierRadialStep - 6) / chairRows;
        const tierOuterR = outerBowlR - t * tierRadialStep;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const curR = tierOuterR - r * subStepR;
          ctx.strokeStyle = getAerialSeatColor(globalRow, t, t, tierCount, seatPattern, seatColor1, seatColor2);
          ctx.lineWidth = Math.max(3, subStepR - 2);
          ctx.beginPath();
          ctx.arc(cx, cy, curR, sec.startAngle + 0.03, sec.endAngle - 0.03);
          ctx.stroke();
        }

        // Tier safety balustrade
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, tierOuterR - tierRadialStep + 2, sec.startAngle + 0.02, sec.endAngle - 0.02);
        ctx.stroke();
      }

      // 3. Radial Yellow Safety Stair Aisles & Vomitories
      const midAngle = (sec.startAngle + sec.endAngle) / 2;
      const aisleAngles = [midAngle - 0.22, midAngle, midAngle + 0.22];

      for (const a of aisleAngles) {
        // Yellow safety gangway
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (apertureRadiusX + 6), cy + Math.sin(a) * (apertureRadiusX + 6));
        ctx.lineTo(cx + Math.cos(a) * (outerBowlR - 10), cy + Math.sin(a) * (outerBowlR - 10));
        ctx.stroke();

        // Vomitory access concourse portal with green exit sign
        const vomR = apertureRadiusX + bowlDepth * 0.45;
        const vx = cx + Math.cos(a) * vomR;
        const vy = cy + Math.sin(a) * vomR;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(vx, vy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(vx - 4, vy - 2, 8, 4);
      }
    }
  } else if (isOval) {
    // 🏟️ OVAL ATHLETICS STADIUM EXPOSED SEATING BOWL (Straight Touchlines + Semicircular Endzones)
    const trackDistX = metrics ? (cx - metrics.westInnerX) : 1150;
    const outerTrackDistX = (w / 2) * 0.92;
    const bowlDepth = outerTrackDistX - trackDistX;

    // 1. WEST STRAIGHT TOUCHLINE EXPOSED SEATS
    if (hasWest) {
      const stand = stands.west;
      const tierCount = stand.type === 'wall' ? 1 : (stand.tierCount || (stand.tiers ? stand.tiers.length : 2));
      const tierW = bowlDepth / tierCount;

      // Concrete decking
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - outerTrackDistX, pTop, bowlDepth, pBottom - pTop);

      // Outer delimitation wall
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - outerTrackDistX, pTop, 10, pBottom - pTop);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - outerTrackDistX, pTop, 2.5, pBottom - pTop);

      let globalRow = 0;
      for (let t = 0; t < tierCount; t++) {
        const tierSize = stand.type === 'wall' ? (stand.wallSize || 'large') : (stand.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepW = (tierW - 4) / chairRows;
        const tierBaseX = cx - outerTrackDistX + 10 + t * tierW;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const rx = tierBaseX + r * subStepW;
          ctx.fillStyle = getAerialSeatColor(globalRow, 0, t, tierCount, seatPattern, seatColor1, seatColor2);
          ctx.fillRect(rx, pTop, Math.max(3, subStepW - 2), pBottom - pTop);
        }

        ctx.fillStyle = '#64748b';
        ctx.fillRect(tierBaseX + tierW - 2, pTop, 2, pBottom - pTop);
      }

      // Yellow stair gangways
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - outerTrackDistX + bowlDepth * 0.35, pTop, 6, pBottom - pTop);
      ctx.fillRect(cx - outerTrackDistX + bowlDepth * 0.70, pTop, 6, pBottom - pTop);

      // Vomitories
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - outerTrackDistX + bowlDepth * 0.30, cy - 24, 18, 48);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - outerTrackDistX + bowlDepth * 0.30 + 3, cy - 20, 12, 4);
    }

    // 2. EAST STRAIGHT TOUCHLINE EXPOSED SEATS
    if (hasEast) {
      const stand = stands.east;
      const tierCount = stand.type === 'wall' ? 1 : (stand.tierCount || (stand.tiers ? stand.tiers.length : 2));
      const tierW = bowlDepth / tierCount;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx + trackDistX, pTop, bowlDepth, pBottom - pTop);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + outerTrackDistX - 10, pTop, 10, pBottom - pTop);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx + outerTrackDistX - 2.5, pTop, 2.5, pBottom - pTop);

      let globalRow = 0;
      for (let t = 0; t < tierCount; t++) {
        const tierSize = stand.type === 'wall' ? (stand.wallSize || 'large') : (stand.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepW = (tierW - 4) / chairRows;
        const tierBaseX = cx + trackDistX + t * tierW;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const rx = tierBaseX + r * subStepW;
          ctx.fillStyle = getAerialSeatColor(globalRow, 1, t, tierCount, seatPattern, seatColor1, seatColor2);
          ctx.fillRect(rx, pTop, Math.max(3, subStepW - 2), pBottom - pTop);
        }

        ctx.fillStyle = '#64748b';
        ctx.fillRect(tierBaseX, pTop, 2, pBottom - pTop);
      }

      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx + trackDistX + bowlDepth * 0.35, pTop, 6, pBottom - pTop);
      ctx.fillRect(cx + trackDistX + bowlDepth * 0.70, pTop, 6, pBottom - pTop);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + trackDistX + bowlDepth * 0.55, cy - 24, 18, 48);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx + trackDistX + bowlDepth * 0.55 + 3, cy - 20, 12, 4);
    }

    // 3. NORTH SEMICIRCULAR ENDZONE EXPOSED SEATS
    if (hasNorth) {
      const stand = stands.north;
      const tierCount = stand.type === 'wall' ? 1 : (stand.tierCount || (stand.tiers ? stand.tiers.length : 2));
      const tierR = bowlDepth / tierCount;

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx, pTop, outerTrackDistX, Math.PI, 0, false);
      ctx.arc(cx, pTop, trackDistX, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Outer wall
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, pTop, outerTrackDistX, Math.PI, 0, false);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, pTop, outerTrackDistX, Math.PI, 0, false);
      ctx.stroke();

      let globalRow = 0;
      for (let t = 0; t < tierCount; t++) {
        const tierSize = stand.type === 'wall' ? (stand.wallSize || 'large') : (stand.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepR = (tierR - 4) / chairRows;
        const tierBaseR = outerTrackDistX - t * tierR;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const curR = tierBaseR - r * subStepR;
          ctx.strokeStyle = getAerialSeatColor(globalRow, 2, t, tierCount, seatPattern, seatColor1, seatColor2);
          ctx.lineWidth = Math.max(3, subStepR - 2);
          ctx.beginPath();
          ctx.arc(cx, pTop, curR, Math.PI + 0.05, Math.PI * 2 - 0.05);
          ctx.stroke();
        }
      }

      // Radial yellow stairways & vomitories
      for (let a of [Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75]) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (trackDistX + 6), pTop + Math.sin(a) * (trackDistX + 6));
        ctx.lineTo(cx + Math.cos(a) * (outerTrackDistX - 10), pTop + Math.sin(a) * (outerTrackDistX - 10));
        ctx.stroke();
      }
    }

    // 4. SOUTH SEMICIRCULAR ENDZONE EXPOSED SEATS
    if (hasSouth) {
      const stand = stands.south;
      const tierCount = stand.type === 'wall' ? 1 : (stand.tierCount || (stand.tiers ? stand.tiers.length : 2));
      const tierR = bowlDepth / tierCount;

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx, pBottom, outerTrackDistX, 0, Math.PI, false);
      ctx.arc(cx, pBottom, trackDistX, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, pBottom, outerTrackDistX, 0, Math.PI, false);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, pBottom, outerTrackDistX, 0, Math.PI, false);
      ctx.stroke();

      let globalRow = 0;
      for (let t = 0; t < tierCount; t++) {
        const tierSize = stand.type === 'wall' ? (stand.wallSize || 'large') : (stand.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepR = (tierR - 4) / chairRows;
        const tierBaseR = outerTrackDistX - t * tierR;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const curR = tierBaseR - r * subStepR;
          ctx.strokeStyle = getAerialSeatColor(globalRow, 3, t, tierCount, seatPattern, seatColor1, seatColor2);
          ctx.lineWidth = Math.max(3, subStepR - 2);
          ctx.beginPath();
          ctx.arc(cx, pBottom, curR, 0.05, Math.PI - 0.05);
          ctx.stroke();
        }
      }

      for (let a of [Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75]) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (trackDistX + 6), pBottom + Math.sin(a) * (trackDistX + 6));
        ctx.lineTo(cx + Math.cos(a) * (outerTrackDistX - 10), pBottom + Math.sin(a) * (outerTrackDistX - 10));
        ctx.stroke();
      }
    }
  } else {
    // 🏟️ RECTILINEAR / SQUARE STADIUM EXPOSED SEATING BOWL
    const wRoofLeft = cx - (w * 0.90) / 2;
    const wRoofWidth = (w * 0.90) / 2 - apertureRadiusX;
    const eRoofLeft = cx + apertureRadiusX;
    const eRoofWidth = (w * 0.90) / 2 - apertureRadiusX;
    const nRoofTop = cy - (h * 0.90) / 2;
    const nRoofHeight = (h * 0.90) / 2 - apertureRadiusY;
    const sRoofTop = cy + apertureRadiusY;
    const sRoofHeight = (h * 0.90) / 2 - apertureRadiusY;

    // 1. WEST STAND EXPOSED TIERS
    if (hasWest) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wRoofLeft, cy - (h * 0.85) / 2, wRoofWidth, h * 0.85);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wRoofLeft, cy - (h * 0.85) / 2, 10, h * 0.85);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wRoofLeft, cy - (h * 0.85) / 2, 2.5, h * 0.85);

      const wTierCount = stands.west.type === 'wall' ? 1 : (stands.west.tierCount || (stands.west.tiers ? stands.west.tiers.length : 2));
      const wTierWidth = (wRoofWidth - 14) / wTierCount;

      let globalRow = 0;
      for (let t = 0; t < wTierCount; t++) {
        const tierSize = stands.west.type === 'wall' ? (stands.west.wallSize || 'large') : (stands.west.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepW = (wTierWidth - 4) / chairRows;
        const tierBaseX = wRoofLeft + 12 + t * wTierWidth;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const rx = tierBaseX + r * subStepW;
          ctx.fillStyle = getAerialSeatColor(globalRow, 0, t, wTierCount, seatPattern, seatColor1, seatColor2);
          ctx.fillRect(rx, cy - (h * 0.85) / 2, Math.max(4, subStepW - 2), h * 0.85);
        }

        ctx.fillStyle = '#64748b';
        ctx.fillRect(tierBaseX + wTierWidth - 2, cy - (h * 0.85) / 2, 2, h * 0.85);
      }

      ctx.fillStyle = '#facc15';
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.35, cy - (h * 0.85) / 2, 6, h * 0.85);
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.70, cy - (h * 0.85) / 2, 6, h * 0.85);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.30, cy - 24, 18, 48);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.30 + 3, cy - 20, 12, 4);
    }

    // 2. EAST STAND EXPOSED TIERS
    if (hasEast) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(eRoofLeft, cy - (h * 0.85) / 2, eRoofWidth, h * 0.85);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eRoofLeft + eRoofWidth - 10, cy - (h * 0.85) / 2, 10, h * 0.85);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(eRoofLeft + eRoofWidth - 2.5, cy - (h * 0.85) / 2, 2.5, h * 0.85);

      const eTierCount = stands.east.type === 'wall' ? 1 : (stands.east.tierCount || (stands.east.tiers ? stands.east.tiers.length : 2));
      const eTierWidth = (eRoofWidth - 14) / eTierCount;

      let globalRow = 0;
      for (let t = 0; t < eTierCount; t++) {
        const tierSize = stands.east.type === 'wall' ? (stands.east.wallSize || 'large') : (stands.east.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepW = (eTierWidth - 4) / chairRows;
        const tierBaseX = eRoofLeft + t * eTierWidth;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const rx = tierBaseX + r * subStepW;
          ctx.fillStyle = getAerialSeatColor(globalRow, 1, t, eTierCount, seatPattern, seatColor1, seatColor2);
          ctx.fillRect(rx, cy - (h * 0.85) / 2, Math.max(4, subStepW - 2), h * 0.85);
        }

        ctx.fillStyle = '#64748b';
        ctx.fillRect(tierBaseX, cy - (h * 0.85) / 2, 2, h * 0.85);
      }

      ctx.fillStyle = '#facc15';
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.35, cy - (h * 0.85) / 2, 6, h * 0.85);
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.70, cy - (h * 0.85) / 2, 6, h * 0.85);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.55, cy - 24, 18, 48);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.55 + 3, cy - 20, 12, 4);
    }

    // 3. NORTH STAND EXPOSED TIERS
    if (hasNorth) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - apertureRadiusX * 0.95, nRoofTop, apertureRadiusX * 1.9, nRoofHeight);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - apertureRadiusX * 0.95, nRoofTop, apertureRadiusX * 1.9, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - apertureRadiusX * 0.95, nRoofTop, apertureRadiusX * 1.9, 2.5);

      const nTierCount = stands.north.type === 'wall' ? 1 : (stands.north.tierCount || (stands.north.tiers ? stands.north.tiers.length : 2));
      const nTierHeight = (nRoofHeight - 14) / nTierCount;

      let globalRow = 0;
      for (let t = 0; t < nTierCount; t++) {
        const tierSize = stands.north.type === 'wall' ? (stands.north.wallSize || 'large') : (stands.north.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepH = (nTierHeight - 4) / chairRows;
        const tierBaseY = nRoofTop + 12 + t * nTierHeight;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const ry = tierBaseY + r * subStepH;
          ctx.fillStyle = getAerialSeatColor(globalRow, 2, t, nTierCount, seatPattern, seatColor1, seatColor2);
          ctx.fillRect(cx - apertureRadiusX * 0.9, ry, apertureRadiusX * 1.8, Math.max(3, subStepH - 2));
        }

        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - apertureRadiusX * 0.9, tierBaseY + nTierHeight - 2, apertureRadiusX * 1.8, 2);
      }

      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 60, nRoofTop, 8, nRoofHeight);
      ctx.fillRect(cx + 60, nRoofTop, 8, nRoofHeight);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 14, nRoofTop + nRoofHeight * 0.4, 28, 16);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 10, nRoofTop + nRoofHeight * 0.4 + 2, 20, 3);
    }

    // 4. SOUTH STAND EXPOSED TIERS
    if (hasSouth) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - apertureRadiusX * 0.95, sRoofTop, apertureRadiusX * 1.9, sRoofHeight);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - apertureRadiusX * 0.95, sRoofTop + sRoofHeight - 10, apertureRadiusX * 1.9, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - apertureRadiusX * 0.95, sRoofTop + sRoofHeight - 2.5, apertureRadiusX * 1.9, 2.5);

      const sTierCount = stands.south.type === 'wall' ? 1 : (stands.south.tierCount || (stands.south.tiers ? stands.south.tiers.length : 2));
      const sTierHeight = (sRoofHeight - 14) / sTierCount;

      let globalRow = 0;
      for (let t = 0; t < sTierCount; t++) {
        const tierSize = stands.south.type === 'wall' ? (stands.south.wallSize || 'large') : (stands.south.tiers?.[t]?.size || 'medium');
        const chairRows = getTierChairRows(tierSize);
        const subStepH = (sTierHeight - 4) / chairRows;
        const tierBaseY = sRoofTop + t * sTierHeight;

        for (let r = 0; r < chairRows; r++) {
          globalRow++;
          const ry = tierBaseY + r * subStepH;
          ctx.fillStyle = getAerialSeatColor(globalRow, 3, t, sTierCount, seatPattern, seatColor1, seatColor2);
          ctx.fillRect(cx - apertureRadiusX * 0.9, ry, apertureRadiusX * 1.8, Math.max(3, subStepH - 2));
        }

        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - apertureRadiusX * 0.9, tierBaseY, apertureRadiusX * 1.8, 2);
      }

      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 60, sRoofTop, 8, sRoofHeight);
      ctx.fillRect(cx + 60, sRoofTop, 8, sRoofHeight);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 14, sRoofTop + sRoofHeight * 0.4, 28, 16);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 10, sRoofTop + sRoofHeight * 0.4 + 2, 20, 3);
    }

    // 5. 8-Stand Miter Corner Grandstands (NW, NE, SE, SW)
    const renderCornerGrandstand = (cornerStand: StandConfig | undefined, rx: number, ry: number, rw: number, rh: number) => {
      const active = isStandActive(cornerStand) || isSquare;
      if (!active) return;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);

      // Diagonal stepped seating tiers in miter corner
      const steps = 6;
      for (let s = 1; s <= steps; s++) {
        ctx.fillStyle = getAerialSeatColor(s, 0, s % 2, 2, seatPattern, seatColor1, seatColor2);
        const subW = (rw * (steps - s)) / steps;
        const subH = (rh * (steps - s)) / steps;
        ctx.fillRect(rx, ry, Math.max(3, subW), Math.max(3, subH));
      }

      // Yellow safety stair notch
      ctx.fillStyle = '#facc15';
      ctx.fillRect(rx + rw * 0.45, ry + rh * 0.45, 6, 6);
    };

    renderCornerGrandstand(stands.corner_nw, wRoofLeft, nRoofTop, wRoofWidth, nRoofHeight);
    renderCornerGrandstand(stands.corner_ne, eRoofLeft, nRoofTop, eRoofWidth, nRoofHeight);
    renderCornerGrandstand(stands.corner_se, eRoofLeft, sRoofTop, eRoofWidth, sRoofHeight);
    renderCornerGrandstand(stands.corner_sw, wRoofLeft, sRoofTop, wRoofWidth, sRoofHeight);
  }

  ctx.restore();
}

/**
 * PHASE ST6.2: Master Aerial Stadium Roof Structure & Geometric Canopy Synchronizer
 *
 * Implements Dual-State Aerial Canopy Logic:
 * - Roof Disabled or Cutaway Hidden: Completely omits roof canopy from aerial view,
 *   faithfully revealing the full interior grandstand seating bowl below!
 * - Roof Enabled: Renders the complete macroscopic geometric roof canopy matching the
 *   exact chosen Style, Material, and outer/inner Border.
 */
export function drawStadiumRoofStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  shape: StadiumShape,
  stadium: StadiumDefinition,
  timeOfDay: TimeOfDay = 'night',
  metrics?: StadiumShapeMetrics
) {
  // ST6.2 Dual-State Check: Is roof enabled and cutaway visible?
  const isRoofDisabledOrHidden =
    stadium.roof?.enabled === false ||
    stadium.roofCutaway === 'hidden' ||
    stadium.roof?.cutawayMode === 'hidden';

  // If roof is disabled or cutaway is hidden, completely omit roof and render exposed seating bowl below!
  if (isRoofDisabledOrHidden) {
    drawAerialExposedSeatingBowl(ctx, cx, cy, w, h, shape, stadium, timeOfDay, metrics);
    return;
  }

  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isRound = shape === 'round' || shape === 'circular';
  const isOval = shape === 'oval';
  const isBowl = isRound || isOval;
  const isSquare = shape === 'square';
  const apertureRadiusX = metrics ? Math.round(metrics.apronRadiusX * 0.88) : (isBowl ? 1350 : 1000);
  const apertureRadiusY = metrics ? Math.round(metrics.apronRadiusY * 0.88) : (isBowl ? 1350 : 1340);
  const stands = stadium.stands || ({} as Record<StandPosition, StandConfig>);
  const grade: StandGrade = stadium.stands?.west?.grade || 'grade4_modern';

  ctx.save();

  // Roof Canopy Colors according to Architectural Grade & Time of Day
  let roofColor = isNight ? '#1e293b' : isSunset ? '#e2e8f0' : '#ffffff';
  let innerCanopyColor = isNight ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.65)'; // Translucent ETFE

  if (grade === 'grade1_municipal' || grade === 'grade1_historic_timber') {
    roofColor = isNight ? '#292524' : isSunset ? '#78350f' : '#94a3b8'; // Corrugated tin
  } else if (grade === 'grade2_classic') {
    roofColor = isNight ? '#1e293b' : isSunset ? '#7f1d1d' : '#f1f5f9'; // Leitch painted steel
  } else if (grade === 'grade3_industrial' || grade === 'grade3_steel_cantilever') {
    roofColor = isNight ? '#0f172a' : isSunset ? '#475569' : '#64748b'; // Galvanized steel
  } else if (grade === 'grade5_futuristic') {
    roofColor = isNight ? '#020617' : isSunset ? '#cbd5e1' : '#f8fafc'; // Aero-titanium
    innerCanopyColor = isNight ? 'rgba(56, 189, 248, 0.40)' : 'rgba(56, 189, 248, 0.25)';
  }

  // Stand Roof Status
  const westHasRoof = isStandActive(stands.west) && stands.west?.hasRoof !== false;
  const eastHasRoof = isStandActive(stands.east) && stands.east?.hasRoof !== false;
  const northHasRoof = isStandActive(stands.north) && stands.north?.hasRoof !== false;
  const southHasRoof = isStandActive(stands.south) && stands.south?.hasRoof !== false;

  // ST6.2 / ST7: If any stand is uncovered (hasRoof === false), render exposed seating bowl below canopy
  if (!westHasRoof || !eastHasRoof || !northHasRoof || !southHasRoof) {
    drawAerialExposedSeatingBowl(ctx, cx, cy, w, h, shape, stadium, timeOfDay, metrics);
  }

  const roofStyle = stadium.roof?.style || (isRound ? 'spoke_wheel_tension' : isOval ? 'continuous_cantilever_ring' : 'cantilever_truss');
  const roofBorder = stadium.roof?.border || (isBowl ? 'video_halo_board' : 'painted_club_fascia');
  const roofMaterial = stadium.roof?.material || (isBowl ? 'ptfe_fabric' : 'corrugated_steel');

  // Material-tuned fill
  let effectiveCanopyFill = roofColor;
  if (roofMaterial === 'ptfe_fabric') {
    effectiveCanopyFill = isNight ? 'rgba(30, 41, 59, 0.90)' : isSunset ? 'rgba(254, 215, 170, 0.85)' : 'rgba(248, 250, 252, 0.94)';
  } else if (roofMaterial === 'solar_glass') {
    effectiveCanopyFill = isNight ? 'rgba(15, 23, 42, 0.94)' : 'rgba(8, 145, 178, 0.80)';
  } else if (roofMaterial === 'perforated_aluminum') {
    effectiveCanopyFill = isNight ? '#1e293b' : '#cbd5e1';
  } else if (roofMaterial === 'galvanized_plate') {
    effectiveCanopyFill = isNight ? '#0f172a' : '#64748b';
  } else if (roofMaterial === 'etfe_cushion') {
    effectiveCanopyFill = isNight ? 'rgba(15, 23, 42, 0.92)' : 'rgba(56, 189, 248, 0.75)';
  }

  if (isRound) {
    // 🏟️ ROUND COLISEUM BOWL ROOF
    const sectors = [
      { active: isStandActive(stands.east), hasRoof: eastHasRoof, startAngle: -Math.PI / 4, endAngle: Math.PI / 4 },
      { active: isStandActive(stands.south), hasRoof: southHasRoof, startAngle: Math.PI / 4, endAngle: (3 * Math.PI) / 4 },
      { active: isStandActive(stands.west), hasRoof: westHasRoof, startAngle: (3 * Math.PI) / 4, endAngle: (5 * Math.PI) / 4 },
      { active: isStandActive(stands.north), hasRoof: northHasRoof, startAngle: (5 * Math.PI) / 4, endAngle: (7 * Math.PI) / 4 },
    ];

    for (const sec of sectors) {
      if (!sec.active) continue; // Stand is None: open grounds, no roof!
      if (!sec.hasRoof) {
        // Open-air stand in coliseum: render exposed seating!
        continue;
      }

      ctx.fillStyle = effectiveCanopyFill;
      ctx.beginPath();
      ctx.arc(cx, cy, (w / 2) * 0.90, sec.startAngle, sec.endAngle);
      ctx.arc(cx, cy, apertureRadiusX + 50, sec.endAngle, sec.startAngle, true);
      ctx.closePath();
      ctx.fill();

      // Translucent inner canopy lip
      ctx.fillStyle = innerCanopyColor;
      ctx.beginPath();
      ctx.arc(cx, cy, apertureRadiusX + 50, sec.startAngle, sec.endAngle);
      ctx.arc(cx, cy, apertureRadiusX, sec.endAngle, sec.startAngle, true);
      ctx.closePath();
      ctx.fill();
    }

    // Structural Framing based on ST5 style
    if (roofStyle === 'petal_ocular_halo') {
      // 8 Interlocking Geometric Petals (Mercedes-Benz Stadium Atlanta)
      const petalCount = 8;
      for (let p = 0; p < petalCount; p++) {
        const a1 = (p * Math.PI * 2) / petalCount;
        const a2 = ((p + 1) * Math.PI * 2) / petalCount;
        ctx.fillStyle = p % 2 === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * apertureRadiusX, cy + Math.sin(a1) * apertureRadiusX);
        ctx.lineTo(cx + Math.cos(a1) * (w * 0.44), cy + Math.sin(a1) * (w * 0.44));
        ctx.lineTo(cx + Math.cos(a2) * (w * 0.44), cy + Math.sin(a2) * (w * 0.44));
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * apertureRadiusX, cy + Math.sin(a1) * apertureRadiusX);
        ctx.lineTo(cx + Math.cos(a1) * (w * 0.44), cy + Math.sin(a1) * (w * 0.44));
        ctx.stroke();
      }
    } else if (roofStyle === 'radial_louvered_pergola') {
      const louverSteps = 3;
      for (let ls = 1; ls <= louverSteps; ls++) {
        const rad = apertureRadiusX + ((w * 0.44 - apertureRadiusX) / (louverSteps + 1)) * ls;
        ctx.strokeStyle = isNight ? '#1e293b' : '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Spoke-Wheel Tension / Continuous Cantilever Ring
      ctx.strokeStyle = isNight ? '#475569' : isSunset ? '#78350f' : '#cbd5e1';
      ctx.lineWidth = 1.8;
      const numSpokes = 24;
      for (let s = 0; s < numSpokes; s++) {
        const angle = (s * Math.PI * 2) / numSpokes;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * apertureRadiusX, cy + Math.sin(angle) * apertureRadiusX);
        ctx.lineTo(cx + Math.cos(angle) * (w * 0.44), cy + Math.sin(angle) * (w * 0.44));
        ctx.stroke();
      }
    }

    // 📺 360° Digital Video Halo Board / Inner Ocular Rim
    if (roofBorder === 'video_halo_board') {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, apertureRadiusX + 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, apertureRadiusX, 0, Math.PI * 2);
      ctx.stroke();

      const ledDots = 32;
      for (let ld = 0; ld < ledDots; ld++) {
        const lang = (ld * Math.PI * 2) / ledDots;
        const lx = cx + Math.cos(lang) * (apertureRadiusX + 3);
        const ly = cy + Math.sin(lang) * (apertureRadiusX + 3);
        ctx.fillStyle = ld % 4 === 0 ? '#38bdf8' : ld % 4 === 1 ? '#f59e0b' : ld % 4 === 2 ? '#ffffff' : '#ec4899';
        ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
      }
    } else if (roofBorder === 'glow_led_ribbon') {
      ctx.strokeStyle = stadium.stands?.west?.primaryColor || '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, apertureRadiusX, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, apertureRadiusX, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (isOval) {
    // 🏟️ OVAL ATHLETICS STADIUM ROOF (Racetrack silhouette)
    const trackDistX = metrics ? (cx - metrics.westInnerX) : 1150;
    const outerTrackDistX = (w / 2) * 0.90;
    const pTop = PITCH_CONFIG.PITCH_TOP;
    const pBottom = PITCH_CONFIG.PITCH_BOTTOM;

    // West Touchline Canopy
    if (westHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.fillRect(cx - outerTrackDistX, pTop, outerTrackDistX - trackDistX, pBottom - pTop);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx - trackDistX - 40, pTop, 40, pBottom - pTop);
    }
    // East Touchline Canopy
    if (eastHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.fillRect(cx + trackDistX, pTop, outerTrackDistX - trackDistX, pBottom - pTop);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx + trackDistX, pTop, 40, pBottom - pTop);
    }
    // North Endzone Curved Canopy
    if (northHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.beginPath();
      ctx.arc(cx, pTop, outerTrackDistX, Math.PI, 0, false);
      ctx.arc(cx, pTop, trackDistX, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
    }
    // South Endzone Curved Canopy
    if (southHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.beginPath();
      ctx.arc(cx, pBottom, outerTrackDistX, 0, Math.PI, false);
      ctx.arc(cx, pBottom, trackDistX, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
    }

    // Video Halo Board on oval aperture
    if (roofBorder === 'video_halo_board') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - trackDistX, pTop);
      ctx.lineTo(cx - trackDistX, pBottom);
      ctx.arc(cx, pBottom, trackDistX, Math.PI, 0, true);
      ctx.lineTo(cx + trackDistX, pTop);
      ctx.arc(cx, pTop, trackDistX, 0, Math.PI, true);
      ctx.closePath();
      ctx.stroke();
    }
  } else {
    // 🏟️ RECTILINEAR / SQUARE STADIUM: Stand-by-stand roof canopies
    const wRoofLeft = cx - (w * 0.90) / 2;
    const wRoofWidth = (w * 0.90) / 2 - apertureRadiusX;
    const eRoofLeft = cx + apertureRadiusX;
    const eRoofWidth = (w * 0.90) / 2 - apertureRadiusX;
    const nRoofTop = cy - (h * 0.90) / 2;
    const nRoofHeight = (h * 0.90) / 2 - apertureRadiusY;
    const sRoofTop = cy + apertureRadiusY;
    const sRoofHeight = (h * 0.90) / 2 - apertureRadiusY;

    // 1. WEST ROOF
    if (westHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.fillRect(wRoofLeft, cy - (h * 0.90) / 2, wRoofWidth, h * 0.90);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx - apertureRadiusX - 40, cy - (h * 0.90) / 2, 40, h * 0.90);

      // Corrugated pitched ridge purlins
      if (roofStyle === 'cantilever_truss' || grade === 'grade2_classic') {
        ctx.strokeStyle = isNight ? '#0f172a' : '#64748b';
        ctx.lineWidth = 1.5;
        for (let y = cy - (h * 0.85) / 2; y < cy + (h * 0.85) / 2; y += 40) {
          ctx.beginPath();
          ctx.moveTo(wRoofLeft, y);
          ctx.lineTo(cx - apertureRadiusX, y + 20);
          ctx.lineTo(wRoofLeft, y + 40);
          ctx.stroke();
        }
      }
    }

    // 2. EAST ROOF
    if (eastHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.fillRect(eRoofLeft, cy - (h * 0.90) / 2, eRoofWidth, h * 0.90);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(eRoofLeft, cy - (h * 0.90) / 2, 40, h * 0.90);

      if (roofStyle === 'cantilever_truss' || grade === 'grade2_classic') {
        ctx.strokeStyle = isNight ? '#0f172a' : '#64748b';
        ctx.lineWidth = 1.5;
        for (let y = cy - (h * 0.85) / 2; y < cy + (h * 0.85) / 2; y += 40) {
          ctx.beginPath();
          ctx.moveTo(eRoofLeft + eRoofWidth, y);
          ctx.lineTo(eRoofLeft, y + 20);
          ctx.lineTo(eRoofLeft + eRoofWidth, y + 40);
          ctx.stroke();
        }
      }
    }

    // 3. NORTH ROOF
    if (northHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.fillRect(cx - apertureRadiusX, nRoofTop, apertureRadiusX * 2, nRoofHeight);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx - apertureRadiusX, cy - apertureRadiusY - 35, apertureRadiusX * 2, 35);
    }

    // 4. SOUTH ROOF
    if (southHasRoof) {
      ctx.fillStyle = effectiveCanopyFill;
      ctx.fillRect(cx - apertureRadiusX, sRoofTop, apertureRadiusX * 2, sRoofHeight);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx - apertureRadiusX, sRoofTop, apertureRadiusX * 2, 35);
    }

    // Mitered 45° Corner Links for Rectangular / Square
    if (isSquare || shape === 'rectangular') {
      ctx.fillStyle = isNight ? '#1e293b' : '#475569';
      // NW corner hip
      if (westHasRoof && northHasRoof) {
        ctx.beginPath();
        ctx.moveTo(wRoofLeft, nRoofTop);
        ctx.lineTo(cx - apertureRadiusX, nRoofTop);
        ctx.lineTo(wRoofLeft, cy - apertureRadiusY);
        ctx.closePath();
        ctx.fill();
      }
      // NE corner hip
      if (eastHasRoof && northHasRoof) {
        ctx.beginPath();
        ctx.moveTo(eRoofLeft + eRoofWidth, nRoofTop);
        ctx.lineTo(cx + apertureRadiusX, nRoofTop);
        ctx.lineTo(eRoofLeft + eRoofWidth, cy - apertureRadiusY);
        ctx.closePath();
        ctx.fill();
      }
      // SE corner hip
      if (eastHasRoof && southHasRoof) {
        ctx.beginPath();
        ctx.moveTo(eRoofLeft + eRoofWidth, sRoofTop + sRoofHeight);
        ctx.lineTo(cx + apertureRadiusX, sRoofTop + sRoofHeight);
        ctx.lineTo(eRoofLeft + eRoofWidth, cy + apertureRadiusY);
        ctx.closePath();
        ctx.fill();
      }
      // SW corner hip
      if (westHasRoof && southHasRoof) {
        ctx.beginPath();
        ctx.moveTo(wRoofLeft, sRoofTop + sRoofHeight);
        ctx.lineTo(cx - apertureRadiusX, sRoofTop + sRoofHeight);
        ctx.lineTo(wRoofLeft, cy + apertureRadiusY);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Circular / Rectangular Roof Catwalk & Drainage Gutter
  ctx.strokeStyle = isNight ? '#0f172a' : isSunset ? '#64748b' : '#94a3b8';
  ctx.lineWidth = 3;
  if (isRound) {
    ctx.beginPath();
    ctx.arc(cx, cy, apertureRadiusX, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isOval) {
    const trackDistX = metrics ? (cx - metrics.westInnerX) : 1150;
    const pTop = PITCH_CONFIG.PITCH_TOP;
    const pBottom = PITCH_CONFIG.PITCH_BOTTOM;
    ctx.beginPath();
    ctx.moveTo(cx - trackDistX, pTop);
    ctx.lineTo(cx - trackDistX, pBottom);
    ctx.arc(cx, pBottom, trackDistX, Math.PI, 0, true);
    ctx.lineTo(cx + trackDistX, pTop);
    ctx.arc(cx, pTop, trackDistX, 0, Math.PI, true);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(cx - apertureRadiusX, cy - apertureRadiusY, apertureRadiusX * 2, apertureRadiusY * 2);
  }

  ctx.restore();
}

/**
 * 4 Corner Floodlight Masts and Volumetric Illumination Cones into Bowl (Phase 15.8.1)
 */
function drawAerialFloodlights(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  isNight: boolean,
  timeOfDay: TimeOfDay
) {
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const pylons = [
    { x: cx - w * 0.48, y: cy - h * 0.48, targetAngle: 0.8 },
    { x: cx + w * 0.48, y: cy - h * 0.48, targetAngle: 2.3 },
    { x: cx - w * 0.48, y: cy + h * 0.48, targetAngle: -0.8 },
    { x: cx + w * 0.48, y: cy + h * 0.48, targetAngle: -2.3 },
  ];

  ctx.save();

  for (const p of pylons) {
    // Pylon steel head
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();

    // High-output LED light matrix (6 bulbs per corner)
    ctx.fillStyle = isNight ? '#ffffff' : isSunset ? '#fde047' : '#64748b';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      const bx = p.x + Math.cos(angle) * 6;
      const by = p.y + Math.sin(angle) * 6;
      ctx.fillRect(bx - 1.5, by - 1.5, 3, 3);
    }

    // Volumetric Atmospheric Light Cones projecting into the pitch bowl at night / sunset
    if (isNight || isSunset) {
      const coneLength = 540;
      const coneSpread = 0.55;
      const beamAngle = Math.atan2(cy - p.y, cx - p.x);

      const coneGrad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, coneLength);
      if (isNight) {
        coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
        coneGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.18)');
        coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        coneGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.20)');
        coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, coneLength, beamAngle - coneSpread / 2, beamAngle + coneSpread / 2);
      ctx.closePath();
      ctx.fill();

      // Atmospheric Halo centered directly on pylon head
      const haloGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 160);
      haloGrad.addColorStop(0, isNight ? 'rgba(255, 255, 255, 0.65)' : 'rgba(254, 240, 138, 0.55)');
      haloGrad.addColorStop(0.35, isNight ? 'rgba(56, 189, 248, 0.22)' : 'rgba(249, 115, 22, 0.18)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 160, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * 32-Bit Broadcast Presentation Overlay (Retro Drawstar TV Network Graphics)
 */
/**
 * 32-Bit Broadcast Presentation Overlay (Retro Drawstar TV Network Graphics)
 */
function drawBroadcastPresentationOverlay(
  ctx: CanvasRenderingContext2D,
  stadium: StadiumDefinition,
  homeTeam: string,
  awayTeam: string,
  opacity: number,
  swoopState?: PreMatchSwoopState,
  camX?: number,
  camY?: number
) {
  ctx.save();
  ctx.globalAlpha = Math.min(1.0, opacity);

  const cx = camX !== undefined ? camX : PITCH_CONFIG.CENTER_X;
  const topY = camY !== undefined ? camY - 520 : PITCH_CONFIG.CENTER_Y - 520;

  // 1. TOP HEADER BANNER (DRAWSTAR TV LIVE BROADCAST)
  const bannerW = 680;
  const bannerH = 76;
  const bannerX = cx - bannerW / 2;

  // 32-Bit Metallic Beveled Container
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fillRect(bannerX, topY, bannerW, bannerH);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bannerX, topY, bannerW, bannerH);

  // Top Cyan Highlight Accent
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(bannerX + 2, topY + 2, bannerW - 4, 3);

  // Broadcast Bug Icon & Text
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 12px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('DRAWSTAR TV 📺', bannerX + 18, topY + 28);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.fillText('LIVE SKY-CAM BROADCAST', bannerX + 220, topY + 28);

  // Stadium Name & Location
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Press Start 2P", monospace';
  ctx.fillText(stadium.name.toUpperCase(), bannerX + 18, topY + 58);

  // FIFA Category Badge
  const fifa = (stadium.fifaCategory || 'continental').toUpperCase();
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`FIFA ${fifa}`, bannerX + bannerW - 18, topY + 58);

  // 2. CINEMATIC SWOOP PHASE INDICATOR & SKIP PROMPT
  if (swoopState && swoopState.isActive) {
    const stageY = topY + bannerH + 10;
    const stageW = 440;
    const stageH = 34;
    const stageX = cx - stageW / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(stageX, stageY, stageW, stageH);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(stageX, stageY, stageW, stageH);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 8.5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PHASE ${swoopState.phase}/4: ${swoopState.phaseName.toUpperCase()}`, cx, stageY + 14);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.fillText('[SPACE] OR TAP TO SKIP INTRO', cx, stageY + 26);
  }

  // 3. BOTTOM MATCHUP & CAPACITY BANNER
  const botY = PITCH_CONFIG.CENTER_Y + 480;
  const botW = 620;
  const botH = 48;
  const botX = cx - botW / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fillRect(botX, botY, botW, botH);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.strokeRect(botX, botY, botW, botH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${homeTeam.toUpperCase()}  VS  ${awayTeam.toUpperCase()}`, cx, botY + 28);

  ctx.restore();
}

/**
 * Phase A6.1: Center-Circle Club Crest Field Mosaic etched into the grass lawn
 */
export function drawAerialClubCrestMosaic(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  stadium: StadiumDefinition
) {
  ctx.save();
  const primary = stadium.seats?.colors?.[0] || '#2563eb';
  const secondary = stadium.seats?.colors?.[1] || '#facc15';

  // Circular medallion base
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fill();

  // 8-point geometric club star medallion
  ctx.fillStyle = primary;
  ctx.globalAlpha = 0.45;
  const numPoints = 8;
  const outerR = 36;
  const innerR = 18;
  ctx.beginPath();
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI) / numPoints;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Gold accent inner ring
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Phase A6.1: Macroscopic Weather & Solar Atmosphere
 * - Winter snow dusted roofs and concourse frost
 * - Overcast rolling fog mist bands
 * - Golden sunset rim glow along stadium exterior facade
 */
export function drawAerialWeatherAtmosphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerW: number,
  outerH: number,
  weather: WeatherCondition,
  timeOfDay: TimeOfDay,
  isBowl: boolean
) {
  ctx.save();

  // 1. Winter Snow Dusted Roofs & Concourse Frost
  if (weather === 'snow' || weather === 'blizzard') {
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = weather === 'blizzard' ? 5 : 3;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    if (isBowl) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, outerW / 2 + 10, outerH / 2 + 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - (outerW + 20) / 2, cy - (outerH + 20) / 2, outerW + 20, outerH + 20);
    }
    ctx.shadowBlur = 0;

    // Snow dusted truss accents
    ctx.fillStyle = 'rgba(248, 250, 252, 0.40)';
    for (let i = 0; i < 28; i++) {
      const sx = cx - outerW / 2 + (i * (outerW / 27));
      const sy = cy - outerH / 2 + (Math.sin(i * 1.7) * 20 + 20);
      ctx.fillRect(sx, sy, 8, 3);
    }
  }

  // 2. Overcast Atmospheric Fog Mist
  if ((weather as any) === 'overcast' || (weather as any) === 'fog') {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.16)';
    const bands = 4;
    for (let b = 0; b < bands; b++) {
      const fogY = cy - outerH / 2 + b * (outerH / bands) + 40;
      ctx.fillRect(cx - outerW * 0.75, fogY, outerW * 1.5, 36);
    }
  }

  // 3. Golden Sunset Rim Glow
  if (timeOfDay === 'sunset') {
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 22;
    if (isBowl) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, (outerW + 40) / 2, (outerH + 40) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - (outerW + 40) / 2, cy - (outerH + 40) / 2, outerW + 40, outerH + 40);
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/**
 * Phase A6.2: Roaring Ultras Smoke Flares in Grandstand Curves
 */
export function drawAerialUltrasFlares(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  stadium: StadiumDefinition,
  flareColor: string,
  isBowl: boolean
) {
  ctx.save();
  const now = Date.now();
  const flarePositions = [
    { x: cx - 420, y: cy - 700 }, // North-West Curve
    { x: cx + 420, y: cy - 700 }, // North-East Curve
    { x: cx - 420, y: cy + 700 }, // South-West Curve
    { x: cx + 420, y: cy + 700 }, // South-East Curve
  ];

  for (let idx = 0; idx < flarePositions.length; idx++) {
    const pos = flarePositions[idx];
    const wobble = Math.sin(now / 180 + idx) * 8;
    const fx = pos.x + wobble;
    const fy = pos.y + Math.cos(now / 220 + idx) * 6;

    // Core flare glow
    const flareGrad = ctx.createRadialGradient(fx, fy, 4, fx, fy, 65);
    flareGrad.addColorStop(0, '#ffffff');
    flareGrad.addColorStop(0.25, flareColor || '#ef4444');
    flareGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.35)');
    flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, 65, 0, Math.PI * 2);
    ctx.fill();

    // Drifting volumetric smoke puffs
    for (let p = 0; p < 3; p++) {
      const smokeR = 18 + p * 12;
      const smokeX = fx + (p * 14) * (idx % 2 === 0 ? -1 : 1);
      const smokeY = fy - p * 18;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
      ctx.beginPath();
      ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Phase A6.2: Giant Tifo Banners draped across endzone grandstands
 */
export function drawAerialTifoBanners(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  stadium: StadiumDefinition,
  homeTeamName: string,
  teamColor: string,
  isBowl: boolean
) {
  ctx.save();
  const bannerW = 420;
  const bannerH = 46;

  // North Curve Giant Tifo
  const nY = cy - 840;
  const nX = cx - bannerW / 2;

  ctx.fillStyle = teamColor || '#2563eb';
  ctx.fillRect(nX, nY, bannerW, bannerH);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(nX, nY, bannerW, bannerH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(homeTeamName.toUpperCase(), cx, nY + bannerH / 2);

  // South Curve Motto Banner
  const sY = cy + 800;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(nX, sY, bannerW, bannerH);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(nX, sY, bannerW, bannerH);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px "Press Start 2P", monospace';
  ctx.fillText('FORZA ULTRAS · GLORIA AETERNA', cx, sY + bannerH / 2);

  ctx.restore();
}

export interface MacroscopicPreviewOptions {
  width?: number;
  height?: number;
  timeOfDay?: TimeOfDay;
  weather?: WeatherCondition;
  homeTeam?: TeamDefinition;
  awayTeam?: TeamDefinition;
  zoom?: number;
  roofCutaway?: RoofCutawayMode;
}

/**
 * PHASE A6.1 Dual Utilization:
 * Generates the live high-resolution preview thumbnail in both the Stadium Creator
 * and Team Home Venue menus with instant visual feedback whenever any parameter is tweaked.
 */
export function renderMacroscopicSkyViewPreview(
  canvas: HTMLCanvasElement,
  stadium: StadiumDefinition,
  options: MacroscopicPreviewOptions = {}
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = options.width || canvas.width || 360;
  const h = options.height || canvas.height || 220;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#050a18';
  ctx.fillRect(0, 0, w, h);

  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const baseZoom = options.zoom || 0.086;

  ctx.translate(w / 2, h / 2);
  ctx.scale(baseZoom, baseZoom * 0.95);
  ctx.translate(-cx, -cy);

  // Apply temporary roofCutaway override if requested
  const appliedStadium = options.roofCutaway
    ? { ...stadium, roofCutaway: options.roofCutaway }
    : stadium;

  drawAerialSkyCam(ctx, appliedStadium, {
    roofOpacity: appliedStadium.roofCutaway === 'hidden' ? 0.0 : 1.0,
    showBroadcastHUD: false,
    timeOfDay: options.timeOfDay || stadium.lighting?.timeOfDay || 'night',
    weather: options.weather || stadium.weather || 'clear',
    homeKit: options.homeTeam?.kit || HOME_KIT,
    awayKit: options.awayTeam?.kit || AWAY_KIT,
    homeTeamName: options.homeTeam?.name || 'HOME',
    awayTeamName: options.awayTeam?.name || 'AWAY',
    showTifoBanners: true,
  });

  ctx.restore();
}
