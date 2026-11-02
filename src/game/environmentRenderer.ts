/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PITCH_CONFIG } from './constants';
import { TimeOfDay } from '../types';
import { SurroundingsType, StadiumGroundsType, resolveMarineGroundArchetype } from '../types/stadium';

/**
 * PHASE 15.1: DUAL-PERSPECTIVE OUTSIDE SURROUNDINGS ENGINE
 *
 * Provides high-performance, zero-allocation procedural graphics for all 8 surroundings
 * across dual camera perspectives:
 * 1. Pitch-Level Horizon View (background skyline behind stadium stands)
 * 2. High-Altitude Aerial Bird's-Eye View (landscape surrounding stadium footprint from Sky-Cam)
 *
 * Surroundings Catalog:
 * 1. Nature: Alpine green hills, forest canopies, open sky, mountain lake reservoir.
 * 2. Parking Lot (Camp Nou Style): Asphalt bays, parked cars, team coach buses, tree boulevards.
 * 3. Small City: Suburban townhomes, neighborhood streets, red-brick commercial blocks.
 * 4. Big City: Dense metropolitan skyscrapers, arterial highways, elevated rail lines, helipads.
 * 5. Airport (Gibraltar Style): Adjacent tarmac runway, hangars, taxiways, control tower, aircraft.
 * 6. Railroad: Multi-track train depot, freight railyard, industrial gantries, moving trains.
 * 7. Beach: Sandy coastline, turquoise ocean surf, palm trees, seaside promenade.
 * 8. Marine Floating: Ocean water envelope, floating pontoons, harbor boats, perimeter buoys.
 */

export interface AerialEnvironmentBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  stadiumBounds: {
    centerX: number;
    centerY: number;
    outerWidth: number;
    outerHeight: number;
  };
  grounds?: StadiumGroundsType;
}

/**
 * Procedural color helper for time of day
 */
function isDark(time: TimeOfDay): boolean {
  return time === 'night' || time === 'sunset' || time === 'dawn';
}

/**
 * Calculates the canonical radius of the 360-degree fisheye planetoid diorama globe
 */
export function getDioramaRadius(bounds: AerialEnvironmentBounds): number {
  const { width, height } = bounds;
  return Math.min(width, height) * 0.43;
}

/**
 * PHASE S4.2: MULTI-DIRECTIONAL PANORAMIC SKY ENVELOPE
 *
 * Wraps an atmospheric 360-degree celestial sky around the entire curved diorama rim,
 * shifting dynamically with the time-of-day:
 * - Noon: Vivid blue celestial dome, solar disc with glare flares, concentric high-altitude wispy cirrus arcs
 * - Sunset: Radiant amber, magenta, and deep violet horizon gradients with twilight cloud streamers
 * - Night: Deep starry celestial dome with over 240 deterministic twinkling stars, glowing lunar orb, and subtle city light pollution dome
 */
export function drawPanoramicSkyEnvelope(
  ctx: CanvasRenderingContext2D,
  timeOfDay: TimeOfDay,
  cx: number,
  cy: number,
  dioramaRadius: number,
  bounds: { left: number; top: number; width: number; height: number }
) {
  const isNoon = timeOfDay === 'noon';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isNight = timeOfDay === 'night';
  const { left, top, width, height } = bounds;

  ctx.save();

  // 1. Base 360-degree Panoramic Sky Fill & Radial Atmosphere Gradient
  const maxRadius = Math.max(width, height) * 0.75;
  const skyGrad = ctx.createRadialGradient(cx, cy, dioramaRadius * 0.88, cx, cy, maxRadius);

  if (isNoon) {
    skyGrad.addColorStop(0, '#93c5fd'); // Horizon rim azure
    skyGrad.addColorStop(0.18, '#38bdf8'); // Sky blue
    skyGrad.addColorStop(0.48, '#0284c7'); // Deep azure
    skyGrad.addColorStop(0.82, '#1d4ed8'); // High-altitude cobalt
    skyGrad.addColorStop(1, '#1e3a8a'); // Zenith navy
  } else if (isSunset) {
    skyGrad.addColorStop(0, '#fef08a'); // Searing golden horizon
    skyGrad.addColorStop(0.12, '#f59e0b'); // Radiant amber
    skyGrad.addColorStop(0.28, '#ea580c'); // Burning orange
    skyGrad.addColorStop(0.48, '#c026d3'); // Radiant magenta
    skyGrad.addColorStop(0.72, '#581c87'); // Deep violet
    skyGrad.addColorStop(1, '#0f172a'); // Midnight twilight
  } else {
    // Night: Nocturnal dome with subtle city light pollution rim glow
    skyGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)'); // City light pollution dome
    skyGrad.addColorStop(0.12, '#0f172a');
    skyGrad.addColorStop(0.42, '#050a18');
    skyGrad.addColorStop(0.80, '#020617');
    skyGrad.addColorStop(1, '#000208');
  }

  ctx.fillStyle = skyGrad;
  ctx.fillRect(left, top, width, height);

  // 2. High-Altitude Cirrus Cloud Arcs & Celestial Streamers
  if (isNoon) {
    // Wispy cirrus bands curving in concentric arcs around the planetoid rim
    const cloudArcs = [
      { r: dioramaRadius + 140, width: 28, alpha: 0.65 },
      { r: dioramaRadius + 290, width: 34, alpha: 0.50 },
      { r: dioramaRadius + 460, width: 24, alpha: 0.40 },
    ];

    for (const ca of cloudArcs) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${ca.alpha})`;
      ctx.lineWidth = ca.width;
      ctx.setLineDash([120, 60, 240, 80, 160, 90]);
      ctx.beginPath();
      ctx.arc(cx, cy, ca.r, 0, Math.PI * 2);
      ctx.stroke();

      // Fluffy cirrus pixel puffs along the arc
      ctx.fillStyle = `rgba(255, 255, 255, ${ca.alpha * 1.15})`;
      for (let angle = 0.2; angle < Math.PI * 2; angle += 0.55) {
        const puffX = cx + Math.cos(angle) * ca.r;
        const puffY = cy + Math.sin(angle) * ca.r;
        ctx.beginPath();
        ctx.arc(puffX, puffY, ca.width * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setLineDash([]);

    // High-Zenith Sun Orb in North-East quadrant
    const sunAngle = 0.82 * Math.PI;
    const sunDist = dioramaRadius * 1.32;
    const sunX = cx + Math.cos(sunAngle) * sunDist;
    const sunY = cy - Math.sin(sunAngle) * sunDist;

    // Solar flare multi-ring halo
    const sunHalo = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 260);
    sunHalo.addColorStop(0, 'rgba(255, 255, 240, 0.75)');
    sunHalo.addColorStop(0.35, 'rgba(254, 240, 138, 0.35)');
    sunHalo.addColorStop(0.7, 'rgba(56, 189, 248, 0.15)');
    sunHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunHalo;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
    ctx.fill();

    // Solid core sun
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
    ctx.fill();
  } else if (isSunset) {
    // Fiery amber and magenta sunset cloud streamers wrapping around the planetoid rim
    const sunsetArcs = [
      { r: dioramaRadius + 110, color: 'rgba(251, 146, 60, 0.55)', width: 32 },
      { r: dioramaRadius + 240, color: 'rgba(217, 70, 239, 0.45)', width: 38 },
      { r: dioramaRadius + 390, color: 'rgba(168, 85, 247, 0.35)', width: 28 },
    ];

    for (const sa of sunsetArcs) {
      ctx.strokeStyle = sa.color;
      ctx.lineWidth = sa.width;
      ctx.setLineDash([140, 70, 260, 90]);
      ctx.beginPath();
      ctx.arc(cx, cy, sa.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Sinking Sunset Sun disc on the western planetoid rim
    const sunX = cx - dioramaRadius * 1.08;
    const sunY = cy - 80;
    const sunsetSun = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 320);
    sunsetSun.addColorStop(0, '#fef08a');
    sunsetSun.addColorStop(0.25, 'rgba(249, 115, 22, 0.65)');
    sunsetSun.addColorStop(0.65, 'rgba(192, 38, 211, 0.25)');
    sunsetSun.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunsetSun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 320, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 3. NIGHT: 360-Degree Starry Celestial Dome (Over 240 deterministic stars)
    const numStars = 260;
    for (let s = 0; s < numStars; s++) {
      // Deterministic polar coordinates outside dioramaRadius
      const starAngle = ((s * 47.1238) % (Math.PI * 2));
      const starDist = dioramaRadius + 50 + ((s * 137.9) % (maxRadius - dioramaRadius - 80));
      const sx = cx + Math.cos(starAngle) * starDist;
      const sy = cy + Math.sin(starAngle) * starDist;

      const starType = s % 11;
      if (starType === 0) {
        // Brilliant Diamond Star with 4-point cross diffraction spikes
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 7, sy);
        ctx.lineTo(sx + 7, sy);
        ctx.moveTo(sx, sy - 7);
        ctx.lineTo(sx, sy + 7);
        ctx.stroke();
      } else if (starType < 3) {
        // Cyan shimmering star
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Crisp white pinprick star
        ctx.fillStyle = s % 2 === 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(sx - 0.75, sy - 0.75, 1.5, 1.5);
      }
    }

    // Glowing Lunar Moon Orb in North-West sector
    const moonAngle = -0.72 * Math.PI;
    const moonDist = dioramaRadius * 1.34;
    const moonX = cx + Math.cos(moonAngle) * moonDist;
    const moonY = cy + Math.sin(moonAngle) * moonDist;

    // Soft celestial lunar halo
    const moonHalo = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 180);
    moonHalo.addColorStop(0, 'rgba(226, 232, 240, 0.45)');
    moonHalo.addColorStop(0.4, 'rgba(56, 189, 248, 0.18)');
    moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonHalo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 180, 0, Math.PI * 2);
    ctx.fill();

    // Lunar disc with subtle maria craters
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(moonX - 7, moonY - 6, 7, 0, Math.PI * 2);
    ctx.arc(moonX + 9, moonY + 8, 9, 0, Math.PI * 2);
    ctx.arc(moonX + 11, moonY - 7, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * PHASE S4.1: CONCENTRIC DIORAMA INFRASTRUCTURE RINGS
 *
 * Renders concentric ring waterways, bridges, and circular arterial avenues
 * connecting the stadium plaza outward to the circular perimeter (Matching Reference Image 2).
 */
export function drawDioramaConcentricRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  timeOfDay: TimeOfDay,
  surroundings: SurroundingsType
) {
  // Marine floating has its own open-water setup
  if (surroundings === 'marine_floating') return;

  const isNoon = timeOfDay === 'noon';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';

  ctx.save();

  // 1. Intermediate Concentric River / Ring Canal (at radius ~1580px)
  const canalR = Math.min(dioramaRadius * 0.65, 1580);
  const canalW = 54;
  const canalColor = isNoon ? '#0284c7' : isSunset ? '#c2410c' : '#0369a1';

  ctx.strokeStyle = canalColor;
  ctx.lineWidth = canalW;
  ctx.beginPath();
  ctx.arc(cx, cy, canalR, 0, Math.PI * 2);
  ctx.stroke();

  // Canal water ripple highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([40, 30, 80, 40]);
  ctx.beginPath();
  ctx.arc(cx, cy, canalR - 10, 0, Math.PI * 2);
  ctx.arc(cx, cy, canalR + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Stone canal retaining walls
  ctx.strokeStyle = isSunset ? '#78350f' : dark ? '#1e293b' : '#94a3b8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, canalR - canalW / 2, 0, Math.PI * 2);
  ctx.arc(cx, cy, canalR + canalW / 2, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Outer Concentric Ring Expressway (at radius ~1960px)
  const expR = Math.min(dioramaRadius * 0.81, 1960);
  const expW = 46;
  const roadColor = isSunset ? '#292524' : dark ? '#0a0f1d' : '#1e293b';

  ctx.strokeStyle = roadColor;
  ctx.lineWidth = expW;
  ctx.beginPath();
  ctx.arc(cx, cy, expR, 0, Math.PI * 2);
  ctx.stroke();

  // Yellow circular divider line
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, expR, 0, Math.PI * 2);
  ctx.stroke();

  // Moving vehicular traffic along the circular expressway
  const carColors = ['#dc2626', '#2563eb', '#ffffff', '#eab308', '#059669', '#9333ea'];
  const numCars = 36;
  for (let c = 0; c < numCars; c++) {
    const angle = (c * (Math.PI * 2)) / numCars + (c % 2 === 0 ? 0.05 : -0.05);
    const laneOffset = c % 2 === 0 ? 12 : -12;
    const carR = expR + laneOffset;
    const carX = cx + Math.cos(angle) * carR;
    const carY = cy + Math.sin(angle) * carR;

    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = carColors[(c * 7) % carColors.length];
    ctx.fillRect(-6, -11, 12, 22);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -6, 8, 7);

    // Headlight beams & taillights
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-5, 11, 3, 2);
      ctx.fillRect(2, 11, 3, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-5, -12, 3, 2);
      ctx.fillRect(2, -12, 3, 2);
    }
    ctx.restore();
  }

  // 3. Eight Radial Bridges & Connecting Avenues (Crossing canal at cardinal & diagonal axes)
  const numRadials = 8;
  for (let r = 0; r < numRadials; r++) {
    const angle = (r * Math.PI * 2) / numRadials;
    const bridgeX = cx + Math.cos(angle) * canalR;
    const bridgeY = cy + Math.sin(angle) * canalR;

    ctx.save();
    ctx.translate(bridgeX, bridgeY);
    ctx.rotate(angle);

    // Stone / concrete bridge deck over water
    ctx.fillStyle = isSunset ? '#451a03' : dark ? '#1e293b' : '#64748b';
    ctx.fillRect(-canalW / 2 - 4, -22, canalW + 8, 44);

    // Safety railings on bridge flanks
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-canalW / 2 - 4, -22);
    ctx.lineTo(canalW / 2 + 4, -22);
    ctx.moveTo(-canalW / 2 - 4, 22);
    ctx.lineTo(canalW / 2 + 4, 22);
    ctx.stroke();

    // Road asphalt stripe
    ctx.fillStyle = roadColor;
    ctx.fillRect(-canalW / 2, -18, canalW, 36);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * PHASE S4.1: STYLIZED CIRCULAR FISHEYE PERIMETER BOUNDARY RIM
 *
 * Renders the crisp, glowing 32-bit atmospheric boundary rim separating the
 * planetoid diorama terrain from the outer celestial sky envelope.
 */
export function drawDioramaPerimeterRim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  timeOfDay: TimeOfDay
) {
  ctx.save();

  // 1. Outer Atmospheric Rim Stroke (Glowing horizon ring)
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const rimStrokeColor = dark
    ? (isSunset ? 'rgba(251, 146, 60, 0.75)' : 'rgba(56, 189, 248, 0.55)')
    : 'rgba(147, 197, 253, 0.65)';

  ctx.strokeStyle = rimStrokeColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, dioramaRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Beveled Golden / Cyan Accent Ring
  ctx.strokeStyle = isSunset ? '#f59e0b' : dark ? '#38bdf8' : '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, dioramaRadius - 4, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Subtle Planetary Limb Shading along the inner boundary edge
  const limbGrad = ctx.createRadialGradient(cx, cy, dioramaRadius - 110, cx, cy, dioramaRadius);
  limbGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  limbGrad.addColorStop(1, dark ? (isSunset ? 'rgba(124, 45, 18, 0.45)' : 'rgba(5, 10, 24, 0.50)') : 'rgba(180, 210, 240, 0.35)');
  ctx.fillStyle = limbGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, dioramaRadius, 0, Math.PI * 2);
  ctx.arc(cx, cy, dioramaRadius - 110, 0, Math.PI * 2, true);
  ctx.fill();

  ctx.restore();
}

/**
 * PHASE S4.1: 360-DEGREE CIRCULAR FISHEYE SKYLINE BOUNDARY CURVATURE
 *
 * Renders the 32-bit pixel-art fisheye skyline curvature radiating outward
 * along the circular perimeter rim like a retro globe/planetoid diorama (Matching Reference Image 2).
 * Across all 8 surroundings: Big City, Small City, Mountains, Forest, Savannah, Beach, Airport, Railroad.
 */
export function drawFisheyeSkylineBoundary(
  ctx: CanvasRenderingContext2D,
  surroundings: SurroundingsType,
  timeOfDay: TimeOfDay,
  cx: number,
  cy: number,
  dioramaRadius: number
) {
  const isNoon = timeOfDay === 'noon';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const dark = isDark(timeOfDay);

  ctx.save();

  switch (surroundings) {
    case 'big_city':
    case 'highway':
    case 'parking_lot':
      drawFisheyeBigCitySkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'small_city':
      drawFisheyeSmallCitySkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'mountains':
    case 'nature':
      drawFisheyeMountainsSkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'forest':
      drawFisheyeForestSkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'savannah':
      drawFisheyeSavannahSkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'beach':
      drawFisheyeBeachSkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'marine_floating':
      drawFisheyeMarineSkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'airport':
      drawFisheyeAirportSkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    case 'railroad':
      drawFisheyeRailroadSkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;

    default:
      drawFisheyeBigCitySkyline(ctx, cx, cy, dioramaRadius, dark, isNoon, isSunset);
      break;
  }

  ctx.restore();
}

/**
 * 1. Big City 360-Degree Fisheye Skyline:
 * Towering skyscrapers, stepped Art Deco spires, illuminated window matrices, antenna towers with red beacon LEDs
 */
function drawFisheyeBigCitySkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const towerCount = 56;
  const towerColors = isSunset
    ? ['#7c2d12', '#9a3412', '#451a03', '#292524', '#78350f']
    : dark
    ? ['#0f172a', '#1e293b', '#0b1120', '#1c1917', '#172554']
    : ['#334155', '#475569', '#64748b', '#1e293b', '#94a3b8'];

  for (let i = 0; i < towerCount; i++) {
    const theta = (i * 2 * Math.PI) / towerCount;
    const height = 110 + ((i * 37 + 13) % 155);
    const width = 48 + ((i * 19) % 22);
    const color = towerColors[(i * 3) % towerColors.length];

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    // Skyscraper Body extending radially outward from rim (-Y direction)
    const baseR = dioramaRadius - 16;
    ctx.fillStyle = color;
    ctx.fillRect(-width / 2, -baseR - height, width, height + 20);

    // Sunset Specular Reflection / Noon Glass Accent
    if (isSunset) {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.45)';
      ctx.fillRect(-width / 2, -baseR - height, width * 0.42, height);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-width / 2, -baseR - height, width, height);
    } else if (isNoon) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(-width / 2, -baseR - height, width * 0.35, height);
    }

    // 32-Bit Illuminated Office Windows (Night/Sunset: warm yellow & cyan lights)
    if (dark) {
      ctx.fillStyle = (i % 2 === 0) ? '#fef08a' : '#93c5fd';
      for (let wy = -baseR - height + 10; wy <= -baseR - 10; wy += 14) {
        for (let wx = -width / 2 + 6; wx <= width / 2 - 10; wx += 10) {
          if ((wx * 5 + wy * 7 + i) % 4 !== 0) {
            ctx.fillRect(wx, wy, 5, 5);
          }
        }
      }
    }

    // Architectural Spire / Stepped Setback / Antenna Mast
    if (i % 3 === 0) {
      // Stepped pyramid cap
      const spireH = 45 + (i % 25);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-width / 3, -baseR - height);
      ctx.lineTo(0, -baseR - height - spireH);
      ctx.lineTo(width / 3, -baseR - height);
      ctx.closePath();
      ctx.fill();

      // Needle antenna
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -baseR - height - spireH);
      ctx.lineTo(0, -baseR - height - spireH - 26);
      ctx.stroke();

      // Aircraft Hazard Warning Beacon LED
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -baseR - height - spireH - 26, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (i % 4 === 0) {
      // Rooftop Helipad or HVAC chillers
      ctx.fillStyle = '#475569';
      ctx.fillRect(-12, -baseR - height - 10, 24, 10);
    }

    ctx.restore();
  }
}

/**
 * 2. Small City 360-Degree Fisheye Skyline:
 * Pitched terracotta/slate roofs, historic red-brick clock tower, cathedral spires, oak crowns, lampposts
 */
function drawFisheyeSmallCitySkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const houseCount = 44;
  const roofColors = isSunset
    ? ['#b91c1c', '#c2410c', '#9a3412', '#78350f']
    : isNoon
    ? ['#b91c1c', '#991b1b', '#334155', '#475569']
    : ['#1e293b', '#292524', '#0f172a', '#312e81'];

  for (let i = 0; i < houseCount; i++) {
    const theta = (i * 2 * Math.PI) / houseCount;
    const height = 48 + ((i * 17) % 36);
    const width = 38 + ((i * 11) % 18);
    const baseR = dioramaRadius - 12;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    if (i === 0 || i === 22) {
      // Historic Red-Brick Town Hall with Clock Tower
      const hallH = 115;
      ctx.fillStyle = '#7f1d1d'; // Red brick
      ctx.fillRect(-22, -baseR - hallH, 44, hallH + 15);

      // Copper Green Spire
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(-16, -baseR - hallH);
      ctx.lineTo(0, -baseR - hallH - 35);
      ctx.lineTo(16, -baseR - hallH);
      ctx.closePath();
      ctx.fill();

      // White Clock Face
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -baseR - hallH + 20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-1, -baseR - hallH + 15, 2, 6);
      ctx.fillRect(0, -baseR - hallH + 19, 4, 2);
    } else if (i === 11 || i === 33) {
      // Gothic Parish Church with Stone Steeple
      const churchH = 95;
      ctx.fillStyle = '#475569';
      ctx.fillRect(-18, -baseR - churchH, 36, churchH + 15);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(-14, -baseR - churchH);
      ctx.lineTo(0, -baseR - churchH - 42);
      ctx.lineTo(14, -baseR - churchH);
      ctx.closePath();
      ctx.fill();
    } else {
      // 2-Story Family Townhouse
      ctx.fillStyle = isSunset ? '#57534e' : '#cbd5e1'; // Brick/render facade
      ctx.fillRect(-width / 2, -baseR - height, width, height + 15);

      // Pitched Gable Roof
      ctx.fillStyle = roofColors[(i * 3) % roofColors.length];
      ctx.beginPath();
      ctx.moveTo(-width / 2 - 4, -baseR - height);
      ctx.lineTo(0, -baseR - height - 16);
      ctx.lineTo(width / 2 + 4, -baseR - height);
      ctx.closePath();
      ctx.fill();

      // Chimney with smoke
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(width / 4, -baseR - height - 22, 6, 12);

      // Windows
      if (dark) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-width / 2 + 6, -baseR - height + 8, 6, 6);
        ctx.fillRect(width / 2 - 12, -baseR - height + 8, 6, 6);
      }

      // Deciduous Tree nestled beside house
      ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#78350f' : '#052e16';
      ctx.beginPath();
      ctx.arc(width / 2 + 10, -baseR - height + 10, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * 3. Mountains 360-Degree Fisheye Skyline:
 * Jagged alpine summits, snow caps, rocky granite faces, evergreen pine canopies
 */
function drawFisheyeMountainsSkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const peakCount = 38;
  const rockColors = isSunset
    ? ['#78350f', '#9a3412', '#451a03']
    : dark
    ? ['#1e293b', '#0f172a', '#334155']
    : ['#64748b', '#475569', '#334155'];

  for (let i = 0; i < peakCount; i++) {
    const theta = (i * 2 * Math.PI) / peakCount;
    const height = 120 + ((i * 43) % 145);
    const halfWidth = 55 + ((i * 23) % 35);
    const baseR = dioramaRadius - 20;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    // Granite Mountain Peak Triangle
    ctx.fillStyle = rockColors[i % rockColors.length];
    ctx.beginPath();
    ctx.moveTo(-halfWidth, -baseR + 20);
    ctx.lineTo(0, -baseR - height);
    ctx.lineTo(halfWidth, -baseR + 20);
    ctx.closePath();
    ctx.fill();

    // Shaded Rock Ridge (Granite face contrast)
    ctx.fillStyle = isSunset ? '#451a03' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, -baseR - height);
    ctx.lineTo(halfWidth, -baseR + 20);
    ctx.lineTo(0, -baseR + 20);
    ctx.closePath();
    ctx.fill();

    // Alpine Snow Cap with Couloir Fissures & Alpenglow
    const snowH = height * 0.42;
    ctx.fillStyle = isNoon ? '#ffffff' : isSunset ? '#fb7185' : '#cbd5e1'; // Rich alpenglow rose/coral at sunset
    ctx.beginPath();
    ctx.moveTo(-halfWidth * 0.42, -baseR - height + snowH);
    ctx.lineTo(0, -baseR - height);
    ctx.lineTo(halfWidth * 0.42, -baseR - height + snowH);
    ctx.closePath();
    ctx.fill();

    // Shaded snow face / couloirs
    ctx.fillStyle = isSunset ? '#e11d48' : dark ? '#475569' : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(0, -baseR - height);
    ctx.lineTo(halfWidth * 0.42, -baseR - height + snowH);
    ctx.lineTo(0, -baseR - height + snowH * 0.9);
    ctx.closePath();
    ctx.fill();

    // Couloir glacial runnel fingers cutting down into granite
    ctx.fillStyle = isSunset ? '#fda4af' : '#f8fafc';
    ctx.fillRect(-2, -baseR - height + snowH, 4, snowH * 0.45);
    ctx.fillRect(halfWidth * 0.15, -baseR - height + snowH * 0.8, 3, snowH * 0.35);

    // Pine Trees on mountain shoulders
    const treeCol = isNoon ? '#15803d' : isSunset ? '#78350f' : '#052e16';
    ctx.fillStyle = treeCol;
    for (let tx of [-halfWidth * 0.6, halfWidth * 0.6]) {
      ctx.beginPath();
      ctx.moveTo(tx - 8, -baseR);
      ctx.lineTo(tx, -baseR - 26);
      ctx.lineTo(tx + 8, -baseR);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * 4. Forest 360-Degree Fisheye Skyline:
 * Dense interlocking conifer & redwood crowns, ranger watchtowers
 */
function drawFisheyeForestSkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const treeCount = 48;
  const leafColors = isNoon
    ? ['#166534', '#15803d', '#14532d', '#1e3a1e']
    : isSunset
    ? ['#78350f', '#9a3412', '#b45309', '#d97706']
    : ['#052e16', '#022c22', '#064e3b', '#031a0e'];

  for (let i = 0; i < treeCount; i++) {
    const theta = (i * 2 * Math.PI) / treeCount;
    const height = 75 + ((i * 29) % 65);
    const radius = 24 + ((i * 13) % 18);
    const baseR = dioramaRadius - 16;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    if (i % 12 === 0) {
      // Fire Lookout Tower rising above forest canopy
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, -baseR);
      ctx.lineTo(-6, -baseR - height - 20);
      ctx.moveTo(12, -baseR);
      ctx.lineTo(6, -baseR - height - 20);
      ctx.stroke();

      // Cabin
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-10, -baseR - height - 32, 20, 14);
      ctx.fillStyle = dark ? '#fef08a' : '#38bdf8';
      ctx.fillRect(-7, -baseR - height - 30, 14, 8);
    } else {
      // Tree trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, -baseR - height * 0.4, 8, height * 0.4 + 15);

      // Conifer Multi-Tier Crown
      ctx.fillStyle = leafColors[i % leafColors.length];
      for (let tier = 0; tier < 3; tier++) {
        const tierY = -baseR - height * 0.35 - tier * 18;
        const tierR = radius * (1 - tier * 0.24);
        ctx.beginPath();
        ctx.arc(0, tierY, tierR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

/**
 * 5. Savannah 360-Degree Fisheye Skyline:
 * Umbrella acacias, baobab trees, granite kopjes, safari lodges
 */
function drawFisheyeSavannahSkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const itemCount = 38;
  for (let i = 0; i < itemCount; i++) {
    const theta = (i * 2 * Math.PI) / itemCount;
    const baseR = dioramaRadius - 15;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    if (i % 3 === 0) {
      // Umbrella Acacia Tree (Flat wide elliptical crown)
      ctx.fillStyle = '#78350f'; // Trunk
      ctx.fillRect(-3, -baseR - 55, 6, 65);

      ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#451a03' : '#052e16';
      ctx.beginPath();
      ctx.ellipse(0, -baseR - 55, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (i % 4 === 0) {
      // Swollen Baobab Tree
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -baseR - 40, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isNoon ? '#166534' : '#451a03';
      ctx.beginPath();
      ctx.arc(0, -baseR - 55, 22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Granite Kopje Boulder Mound
      ctx.fillStyle = isSunset ? '#7c2d12' : dark ? '#334155' : '#78716c';
      ctx.beginPath();
      ctx.ellipse(0, -baseR - 18, 28, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * 6. Beach / Marine 360-Degree Fisheye Skyline:
 * Turquoise shoreline, palm trees, cabanas, marina pier, red-and-white lighthouse
 */
function drawFisheyeBeachSkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const itemCount = 36;
  const umbrellaColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'];

  for (let i = 0; i < itemCount; i++) {
    const theta = (i * 2 * Math.PI) / itemCount;
    const baseR = dioramaRadius - 14;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    // ST6.3: Ocean Surf breaking on sandy shores with dithered foam edges
    const surfR = baseR + 24;
    ctx.fillStyle = dark ? '#0369a1' : '#0ea5e9';
    ctx.fillRect(-20, -surfR - 8, 40, 10);
    // Dithered White Foaming Wave Crest
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, -surfR - 2, 36, 2.5);
    for (let fx = -16; fx <= 16; fx += 4) {
      if ((fx + i) % 2 === 0) {
        ctx.fillRect(fx, -surfR, 2, 2);
      }
    }

    if (i === 0) {
      // Maritime Red-and-White Lighthouse
      const lightH = 95;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-12, -baseR - lightH, 24, lightH + 15);
      // Red spiral stripes
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-12, -baseR - lightH + 20, 24, 16);
      ctx.fillRect(-12, -baseR - lightH + 55, 24, 16);

      // Lantern Room & Beacon Beam
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-10, -baseR - lightH - 12, 20, 14);
      if (dark) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, -baseR - lightH - 5);
        ctx.lineTo(-80, -baseR - lightH - 60);
        ctx.lineTo(80, -baseR - lightH - 60);
        ctx.closePath();
        ctx.fill();
      }
    } else if (i % 2 === 0) {
      // Swaying Coconut Palm Tree
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, -baseR);
      ctx.quadraticCurveTo(8, -baseR - 35, 12, -baseR - 60);
      ctx.stroke();

      // Palm fronds
      ctx.fillStyle = isNoon ? '#15803d' : '#052e16';
      for (let f = 0; f < 5; f++) {
        const fa = (f * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.ellipse(12 + Math.cos(fa) * 14, -baseR - 60 + Math.sin(fa) * 10, 14, 5, fa, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Striped Beach Cabana Umbrella
      ctx.fillStyle = umbrellaColors[i % umbrellaColors.length];
      ctx.beginPath();
      ctx.arc(0, -baseR - 22, 16, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -baseR);
      ctx.lineTo(0, -baseR - 22);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * B5.1 Marine Floating 360-Degree Fisheye Skyline:
 * Deep azure open ocean swells, white dithered foam crests, offshore platform / carrier superstructures,
 * maritime navigation buoys with flashing beacons, distant cargo container ships.
 */
function drawFisheyeMarineSkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const itemCount = 36;
  const oceanColors = isSunset
    ? ['#7c2d12', '#9a3412', '#1e1b4b']
    : dark
    ? ['#031d38', '#021324', '#082f49']
    : ['#0284c7', '#0369a1', '#075985'];

  for (let i = 0; i < itemCount; i++) {
    const theta = (i * 2 * Math.PI) / itemCount;
    const baseR = dioramaRadius - 14;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    // Deep ocean water swell
    ctx.fillStyle = oceanColors[i % oceanColors.length];
    ctx.fillRect(-22, -baseR - 45, 44, 55);

    // Dithered white foaming wave crest
    ctx.fillStyle = isSunset ? 'rgba(254, 215, 170, 0.9)' : '#ffffff';
    ctx.fillRect(-18, -baseR - 25, 36, 3);
    for (let fx = -16; fx <= 16; fx += 4) {
      if ((fx + i) % 2 === 0) {
        ctx.fillRect(fx, -baseR - 23, 2, 2);
      }
    }

    if (i === 0) {
      // Offshore Gas Flare Boom / Superstructure Tower
      const boomH = 105;
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, -baseR);
      ctx.lineTo(8, -baseR - boomH);
      ctx.moveTo(10, -baseR);
      ctx.lineTo(8, -baseR - boomH);
      ctx.stroke();
      // Natural gas burnoff flame flare
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(8, -baseR - boomH - 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(8, -baseR - boomH - 10, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (i === 18) {
      // Aircraft Carrier Island Conning Tower / Radome
      ctx.fillStyle = '#475569';
      ctx.fillRect(-14, -baseR - 75, 28, 80);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-18, -baseR - 85, 36, 12);
      // Radar antenna
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -baseR - 85);
      ctx.lineTo(0, -baseR - 105);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -baseR - 105, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (i % 6 === 0) {
      // Maritime Yellow/Green Navigation Buoy
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-6, -baseR - 26, 12, 28);
      // Flashing maritime beacon
      ctx.fillStyle = dark ? '#22c55e' : '#15803d';
      ctx.beginPath();
      ctx.arc(0, -baseR - 30, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (i % 9 === 4) {
      // Distant Cargo Container Ship on horizon
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-22, -baseR - 16, 44, 10);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-14, -baseR - 22, 12, 7);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, -baseR - 22, 12, 7);
    }

    ctx.restore();
  }
}

/**
 * 7. Airport 360-Degree Fisheye Skyline:
 * B5.2 Overhaul: Rock of Gibraltar sheer limestone cliffs, air traffic control tower with rotating beacon,
 * arched flight hangars, radar radomes, runway edge lights, approach light stanchions.
 */
function drawFisheyeAirportSkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const itemCount = 36;
  for (let i = 0; i < itemCount; i++) {
    const theta = (i * 2 * Math.PI) / itemCount;
    const baseR = dioramaRadius - 15;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    if (i >= 8 && i <= 14) {
      // B5.2 Rock of Gibraltar towering limestone sheer cliff ridge
      const rockH = 150 + Math.sin((i - 8) * 0.52) * 55;
      const rockW = 38;
      // Limestone cliff face
      ctx.fillStyle = isSunset ? '#9a3412' : dark ? '#1e293b' : '#64748b';
      ctx.fillRect(-rockW / 2, -baseR - rockH, rockW, rockH + 20);
      // Vertical limestone strata fissures
      ctx.strokeStyle = isSunset ? '#451a03' : dark ? '#0f172a' : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -baseR - rockH);
      ctx.lineTo(-6, -baseR);
      ctx.moveTo(8, -baseR - rockH + 15);
      ctx.lineTo(10, -baseR);
      ctx.stroke();
      // Scrub vegetation terraces
      ctx.fillStyle = isNoon ? '#15803d' : '#052e16';
      ctx.fillRect(-12, -baseR - rockH * 0.45, 12, 4);
      ctx.fillRect(4, -baseR - rockH * 0.7, 10, 4);
      if (i === 11) {
        // Summit Military Communications / Radar Mast
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -baseR - rockH);
        ctx.lineTo(0, -baseR - rockH - 24);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -baseR - rockH - 24, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (i === 0) {
      // Air Traffic Control (ATC) Tower
      const towerH = 120;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-10, -baseR - towerH, 20, towerH + 15);
      // Polygonal glass observation cab
      ctx.fillStyle = dark ? '#fef08a' : '#38bdf8';
      ctx.fillRect(-16, -baseR - towerH - 18, 32, 20);
      // Rotating beacon antenna
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, -baseR - towerH - 24, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (i === 18 || i === 19) {
      // ST6.3: High-Intensity Runway Approach Light Bars (ALSF-2 / Calvert System)
      const approachH = 110;
      // Steel lattice approach gantry extending radially into sky
      ctx.strokeStyle = dark ? '#475569' : '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -baseR);
      ctx.lineTo(0, -baseR - approachH);
      ctx.stroke();

      // Transverse light bars with white & amber sequenced flashers
      const barSteps = [20, 45, 70, 95];
      for (const bs of barSteps) {
        const barW = bs > 60 ? 32 : 24;
        ctx.strokeStyle = dark ? '#334155' : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-barW / 2, -baseR - bs);
        ctx.lineTo(barW / 2, -baseR - bs);
        ctx.stroke();

        // High-intensity white / amber LED strobe clusters
        ctx.fillStyle = dark ? '#fef08a' : '#ffffff';
        for (let bx = -barW / 2; bx <= barW / 2; bx += 8) {
          ctx.fillRect(bx - 1, -baseR - bs - 1, 2.5, 2.5);
        }
      }

      // Runway Green Threshold Bar at base
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-16, -baseR - 6, 32, 4);
    } else if (i % 4 === 0) {
      // Curved Aircraft Hangar with arched corrugated roof
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, -baseR, 35, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#0f172a'; // Hangar doors
      ctx.fillRect(-22, -baseR - 26, 44, 26);
    } else if (i % 6 === 0) {
      // White Geodesic Radar Dome (Radome)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -baseR - 18, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Runway Edge LED Navigation Lights
    ctx.fillStyle = dark ? '#22c55e' : '#15803d';
    ctx.fillRect(-4, -baseR - 4, 8, 4);

    ctx.restore();
  }
}

/**
 * 8. Railroad 360-Degree Fisheye Skyline:
 * Catenary overhead gantries, container cranes, locomotive sheds, signal towers
 */
function drawFisheyeRailroadSkyline(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dioramaRadius: number,
  dark: boolean,
  isNoon: boolean,
  isSunset: boolean
) {
  const itemCount = 36;
  for (let i = 0; i < itemCount; i++) {
    const theta = (i * 2 * Math.PI) / itemCount;
    const baseR = dioramaRadius - 15;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);

    if (i % 6 === 0) {
      // Heavy Industrial Yellow Container Crane Gantry
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-28, -baseR - 90, 8, 95);
      ctx.fillRect(20, -baseR - 90, 8, 95);
      ctx.fillRect(-32, -baseR - 100, 64, 14);
      ctx.fillStyle = '#dc2626'; // Trolley
      ctx.fillRect(-8, -baseR - 75, 16, 10);
    } else if (i % 4 === 0) {
      // Overhead Steel Catenary Gantry
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.strokeRect(-24, -baseR - 55, 48, 60);
    } else {
      // Rail signal tower
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3, -baseR - 40, 6, 45);
      ctx.fillStyle = (i % 2 === 0) ? '#22c55e' : '#ef4444';
      ctx.fillRect(-5, -baseR - 46, 10, 8);
    }

    ctx.restore();
  }
}

/**
 * -----------------------------------------------------------------------------
 * 15.1 AERIAL ENVIRONMENT BIRD'S-EYE RENDERER (PHASE S4 FISHEYE PLANETOID ENGINE)
 * -----------------------------------------------------------------------------
 */
export function drawAerialEnvironment(
  ctx: CanvasRenderingContext2D,
  surroundings: SurroundingsType,
  timeOfDay: TimeOfDay = 'night',
  bounds: AerialEnvironmentBounds,
  grounds?: StadiumGroundsType
) {
  const dark = isDark(timeOfDay);
  const effectiveGrounds = grounds || bounds.grounds;
  const { left, top, width, height, stadiumBounds } = bounds;
  const cx = stadiumBounds.centerX;
  const cy = stadiumBounds.centerY;

  const dioramaRadius = getDioramaRadius(bounds);

  ctx.save();

  // 1. PHASE S4.2: MULTI-DIRECTIONAL PANORAMIC SKY ENVELOPE (Outside circular rim)
  drawPanoramicSkyEnvelope(ctx, timeOfDay, cx, cy, dioramaRadius, { left, top, width, height });

  // 2. PHASE S4.1: FISHEYE PLANETOID DIORAMA WORLD MODEL (Clipped to circular perimeter disk)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, dioramaRadius, 0, Math.PI * 2);
  if (typeof ctx.clip === 'function') {
    ctx.clip();
  }

  // Draw concentric diorama infrastructure rings (canals, bridges, ring expressways)
  drawDioramaConcentricRings(ctx, cx, cy, dioramaRadius, dark, timeOfDay, surroundings);

  // Render specific surrounding terrain and facilities inside the planetoid disk
  switch (surroundings) {
    case 'mountains':
    case 'nature':
      drawAerialMountains(ctx, left, top, width, height, cx, cy, dark, timeOfDay, effectiveGrounds);
      break;

    case 'forest':
      drawAerialForest(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'savannah':
      drawAerialSavannah(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'highway':
      drawAerialHighway(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'parking_lot':
      drawAerialParkingLot(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'small_city':
      drawAerialSmallCity(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'big_city':
      drawAerialBigCity(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'airport':
      drawAerialAirport(ctx, left, top, width, height, cx, cy, dark, timeOfDay, effectiveGrounds);
      break;

    case 'railroad':
      drawAerialRailroad(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'beach':
      drawAerialBeach(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'marine_floating':
      drawAerialMarineFloating(ctx, left, top, width, height, cx, cy, dark, timeOfDay, effectiveGrounds);
      break;

    default:
      drawAerialMountains(ctx, left, top, width, height, cx, cy, dark, timeOfDay, effectiveGrounds);
      break;
  }

  // Atmospheric haze / distance fog vignette towards outer perimeter
  const fogGrad = ctx.createRadialGradient(cx, cy, dioramaRadius * 0.45, cx, cy, dioramaRadius);
  fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fogGrad.addColorStop(0.7, dark ? (timeOfDay === 'sunset' ? 'rgba(80, 20, 10, 0.35)' : 'rgba(5, 10, 24, 0.45)') : 'rgba(210, 230, 255, 0.25)');
  fogGrad.addColorStop(1, dark ? (timeOfDay === 'sunset' ? 'rgba(60, 15, 10, 0.85)' : 'rgba(5, 10, 24, 0.88)') : 'rgba(180, 210, 240, 0.65)');
  ctx.fillStyle = fogGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, dioramaRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Restore planetoid disk clip

  // 3. PHASE S4.1: STYLIZED CIRCULAR / FISHEYE PERIMETER BOUNDARY RIM
  drawDioramaPerimeterRim(ctx, cx, cy, dioramaRadius, dark, timeOfDay);

  // 4. PHASE S4.1: 360-DEGREE CIRCULAR FISHEYE SKYLINE BOUNDARY CURVATURE
  drawFisheyeSkylineBoundary(ctx, surroundings, timeOfDay, cx, cy, dioramaRadius);

  ctx.restore();
}

/**
 * 1. Mountains Aerial: Layered alpine terrain, rocky snow-capped summits, contour ridges, mountain lake, pine clusters, scenic roads
 * 3 Time-of-Day Variants: Morning/Noon (sunlight), Afternoon/Sunset (red/orange glow), Night (moonlit peaks)
 */
function drawAerialMountains(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay,
  _grounds?: StadiumGroundsType
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base alpine meadow terrain
  ctx.fillStyle = isNoon ? '#2d7a2d' : isSunset ? '#5a2d16' : '#0d1e11';
  ctx.fillRect(left, top, w, h);

  // Elevation contour bands (higher plateaus & ridges)
  const ridgeColor = isNoon ? '#3b943b' : isSunset ? '#7c3a1e' : '#142c19';
  ctx.fillStyle = ridgeColor;
  for (let i = 0; i < 7; i++) {
    const rx = left + (i * 390) % w;
    const ry = top + (i * 330) % h;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 360, 220, 0.35 * i, 0, Math.PI * 2);
    ctx.fill();
  }

  // Jagged Rocky Summits with Granite Shading
  const rockColor = isNoon ? '#64748b' : isSunset ? '#78350f' : '#1e293b';
  ctx.fillStyle = rockColor;
  const peaks = [
    { x: left + 220, y: top + 180, r: 160 },
    { x: left + w - 280, y: top + 160, r: 180 },
    { x: left + 190, y: top + h - 220, r: 170 },
    { x: left + w - 240, y: top + h - 200, r: 190 },
  ];
  for (const p of peaks) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.r);
    ctx.lineTo(p.x + p.r * 0.9, p.y + p.r * 0.6);
    ctx.lineTo(p.x - p.r * 0.9, p.y + p.r * 0.6);
    ctx.closePath();
    ctx.fill();

    // Snow caps on peaks
    ctx.fillStyle = isNoon ? '#f8fafc' : isSunset ? '#fde047' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.r);
    ctx.lineTo(p.x + p.r * 0.35, p.y - p.r * 0.4);
    ctx.lineTo(p.x - p.r * 0.35, p.y - p.r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rockColor;
  }

  // Mountain Lake / Reservoir in north-east quadrant
  const lakeX = cx + 640;
  const lakeY = cy - 460;
  const lakeGrad = ctx.createRadialGradient(lakeX, lakeY, 20, lakeX, lakeY, 240);
  if (isNoon) {
    lakeGrad.addColorStop(0, '#0ea5e9');
    lakeGrad.addColorStop(1, '#0284c7');
  } else if (isSunset) {
    lakeGrad.addColorStop(0, '#ea580c');
    lakeGrad.addColorStop(1, '#7c2d12');
  } else {
    lakeGrad.addColorStop(0, '#0369a1');
    lakeGrad.addColorStop(1, '#02131e');
  }
  ctx.fillStyle = lakeGrad;
  ctx.beginPath();
  ctx.ellipse(lakeX, lakeY, 280, 170, -0.22, 0, Math.PI * 2);
  ctx.fill();

  // Lake shoreline sand/rock rim
  ctx.strokeStyle = isSunset ? '#b45309' : dark ? '#334155' : '#cbd5e1';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Serpentine mountain switchback hairpin roads with safety guardrails climbing the western slope
  ctx.strokeStyle = isSunset ? '#451a03' : dark ? '#1e293b' : '#64748b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(left, cy + 540);
  ctx.bezierCurveTo(cx - 500, cy + 640, cx - 640, cy - 380, cx - 220, top);
  ctx.stroke();

  // Mountain switchback hairpin curves on north-west ridge
  ctx.beginPath();
  ctx.moveTo(cx - 720, cy - 500);
  ctx.bezierCurveTo(cx - 820, cy - 420, cx - 820, cy - 340, cx - 700, cy - 320);
  ctx.bezierCurveTo(cx - 580, cy - 300, cx - 580, cy - 220, cx - 720, cy - 200);
  ctx.stroke();

  // Safety guardrails along switchback roads
  ctx.strokeStyle = isSunset ? '#78350f' : dark ? '#475569' : '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Winding scenic mountain highway encircling the stadium
  ctx.strokeStyle = isSunset ? '#451a03' : dark ? '#1e293b' : '#64748b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(left + 220, top);
  ctx.bezierCurveTo(cx - 320, cy - 520, cx + 460, cy - 680, left + w, cy - 320);
  ctx.stroke();

  // Road dashed centerline
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Alpine Wooden Ski Chalets with smoking chimneys nestled in valleys
  const chalets = [
    { x: cx - 620, y: cy - 260, w: 46, h: 32 },
    { x: cx + 680, y: cy + 420, w: 52, h: 36 },
    { x: cx - 480, y: cy + 520, w: 44, h: 30 },
  ];
  for (const ch of chalets) {
    // Chalet timber body
    ctx.fillStyle = isSunset ? '#451a03' : '#78350f';
    ctx.fillRect(ch.x - ch.w / 2, ch.y - ch.h / 2, ch.w, ch.h);

    // Pitched alpine gable roof
    ctx.fillStyle = isNoon ? '#451a03' : isSunset ? '#78350f' : '#1c1917';
    ctx.beginPath();
    ctx.moveTo(ch.x - ch.w / 2 - 4, ch.y + ch.h / 2);
    ctx.lineTo(ch.x, ch.y - ch.h / 2 - 6);
    ctx.lineTo(ch.x + ch.w / 2 + 4, ch.y + ch.h / 2);
    ctx.closePath();
    ctx.fill();

    // Stone chimney with rising pixel smoke
    ctx.fillStyle = '#475569';
    ctx.fillRect(ch.x + ch.w / 4, ch.y - ch.h / 2 - 10, 6, 8);
    // Smoke puffs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(ch.x + ch.w / 4 + 3, ch.y - ch.h / 2 - 14, 3, 0, Math.PI * 2);
    ctx.arc(ch.x + ch.w / 4 + 6, ch.y - ch.h / 2 - 20, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Warm illuminated window at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(ch.x - 8, ch.y - 4, 6, 6);
    }
  }

  // Dense Pine Tree Clusters (thousands of circular/conical canopies)
  const treeBase = isNoon ? '#15803d' : isSunset ? '#78350f' : '#081c0f';
  const treeHigh = isNoon ? '#22c55e' : isSunset ? '#b45309' : '#14532d';
  ctx.fillStyle = treeBase;

  for (let px = left + 80; px < left + w - 80; px += 90) {
    for (let py = top + 80; py < top + h - 80; py += 90) {
      if (Math.hypot(px - cx, py - cy) < 440) continue;
      if (Math.hypot(px - lakeX, py - lakeY) < 250) continue;

      const jitterX = ((px * 19) % 45) - 22;
      const jitterY = ((py * 23) % 45) - 22;
      const treeR = 9 + ((px + py) % 7);

      ctx.beginPath();
      ctx.arc(px + jitterX, py + jitterY, treeR, 0, Math.PI * 2);
      ctx.fill();

      // Tree sunlight/moonlight highlight
      ctx.fillStyle = treeHigh;
      ctx.beginPath();
      ctx.arc(px + jitterX - 2, py + jitterY - 2, treeR * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = treeBase;
    }
  }
}

/**
 * Backward-compatible alias for Nature
 */
function drawAerialNature(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  drawAerialMountains(ctx, left, top, w, h, cx, cy, dark, time);
}

/**
 * 2. Forest Aerial: Vast 360-degree woodland canopy, winding gravel trails, ranger cabins, lumber clearings
 */
function drawAerialForest(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base rich soil & moss forest floor
  ctx.fillStyle = isNoon ? '#14532d' : isSunset ? '#451a03' : '#05180b';
  ctx.fillRect(left, top, w, h);

  // Winding dirt fire-trails & gravel tracks
  const trailColor = isNoon ? '#92400e' : isSunset ? '#78350f' : '#292524';
  ctx.strokeStyle = trailColor;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(left, cy - 350);
  ctx.quadraticCurveTo(cx - 400, cy - 250, cx - 300, top);
  ctx.moveTo(cx + 350, top);
  ctx.bezierCurveTo(cx + 450, cy + 100, cx + 550, cy + 450, left + w, cy + 500);
  ctx.moveTo(left + 300, top + h);
  ctx.quadraticCurveTo(cx - 350, cy + 450, left, cy + 400);
  ctx.stroke();

  // Dense, layered interlocking forest crowns
  const leafColors = isNoon
    ? ['#166534', '#15803d', '#14532d', '#1e3a1e', '#15803d']
    : isSunset
    ? ['#78350f', '#9a3412', '#b45309', '#d97706', '#451a03']
    : ['#052e16', '#022c22', '#064e3b', '#031a0e', '#052e16'];

  for (let fx = left + 50; fx < left + w - 50; fx += 55) {
    for (let fy = top + 50; fy < top + h - 50; fy += 55) {
      if (Math.hypot(fx - cx, fy - cy) < 430) continue;

      const jX = ((fx * 17) % 35) - 17;
      const jY = ((fy * 29) % 35) - 17;
      const r = 16 + ((fx + fy) % 9);
      const col = leafColors[(fx * 3 + fy * 7) % leafColors.length];

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(fx + jX, fy + jY, r, 0, Math.PI * 2);
      ctx.fill();

      // Canopy highlight
      ctx.fillStyle = isNoon ? 'rgba(255,255,255,0.12)' : isSunset ? 'rgba(251,191,36,0.18)' : 'rgba(56,189,248,0.08)';
      ctx.beginPath();
      ctx.arc(fx + jX - 3, fy + jY - 3, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Scenic River cutting diagonally through the woods
  const riverColor = isNoon ? '#0284c7' : isSunset ? '#c2410c' : '#0369a1';
  ctx.strokeStyle = riverColor;
  ctx.lineWidth = 42;
  ctx.beginPath();
  ctx.moveTo(left, cy + 620);
  ctx.bezierCurveTo(cx - 450, cy + 380, cx - 350, cy - 280, left + 450, top);
  ctx.stroke();

  // River water ripples and foam highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left + 80, cy + 560);
  ctx.bezierCurveTo(cx - 430, cy + 360, cx - 340, cy - 260, left + 460, top + 60);
  ctx.stroke();

  // Rustic Wooden Footbridge crossing the scenic river
  const bridgeX = cx - 440;
  const bridgeY = cy + 240;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(bridgeX - 18, bridgeY - 32, 36, 64);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bridgeX - 18, bridgeY - 32, 36, 64);
  // Bridge plank slats
  for (let by = bridgeY - 26; by <= bridgeY + 26; by += 8) {
    ctx.beginPath();
    ctx.moveTo(bridgeX - 16, by);
    ctx.lineTo(bridgeX + 16, by);
    ctx.stroke();
  }

  // Timber logging lumber clearings
  const clearings = [
    { x: cx - 600, y: cy + 420 },
    { x: cx + 580, y: cy - 380 },
  ];
  for (const cl of clearings) {
    ctx.fillStyle = isNoon ? '#78350f' : '#292524';
    ctx.fillRect(cl.x - 45, cl.y - 30, 90, 60);

    // Stored timber log stacks
    ctx.fillStyle = '#d97706';
    for (let ly = cl.y - 20; ly <= cl.y + 15; ly += 9) {
      ctx.fillRect(cl.x - 35, ly, 70, 6);
    }
  }

  // Fire Ranger Lookout Tower on elevated clearing
  const towerX = cx + 540;
  const towerY = cy + 450;
  // Four steel lattice legs
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(towerX - 16, towerY - 16);
  ctx.lineTo(towerX - 8, towerY - 8);
  ctx.moveTo(towerX + 16, towerY - 16);
  ctx.lineTo(towerX + 8, towerY - 8);
  ctx.moveTo(towerX - 16, towerY + 16);
  ctx.lineTo(towerX - 8, towerY + 8);
  ctx.moveTo(towerX + 16, towerY + 16);
  ctx.lineTo(towerX + 8, towerY + 8);
  ctx.stroke();

  // Observation Cabin
  ctx.fillStyle = '#78350f';
  ctx.fillRect(towerX - 12, towerY - 12, 24, 24);
  // Glass panoramic observation windows
  ctx.fillStyle = dark ? '#fef08a' : '#38bdf8';
  ctx.fillRect(towerX - 9, towerY - 9, 18, 18);
  // Metal catwalk balcony railing
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(towerX - 14, towerY - 14, 28, 28);
}

/**
 * 3. Savannah Aerial: Golden sun-drenched plains, umbrella acacia trees, dry riverbed (wadi), watering hole
 */
function drawAerialSavannah(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base golden savannah grasses
  ctx.fillStyle = isNoon ? '#d97706' : isSunset ? '#9a3412' : '#292524';
  ctx.fillRect(left, top, w, h);

  // Dry riverbed (Wadi) with cracked silt meandering across the canvas
  ctx.strokeStyle = isNoon ? '#b45309' : isSunset ? '#78350f' : '#1c1917';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(left, cy - 400);
  ctx.bezierCurveTo(cx - 350, cy - 320, cx - 250, cy + 450, left + w, cy + 380);
  ctx.stroke();

  // Natural Savannah Watering Hole
  const waterX = cx - 550;
  const waterY = cy + 380;
  ctx.fillStyle = isNoon ? '#0284c7' : isSunset ? '#b91c1c' : '#0369a1';
  ctx.beginPath();
  ctx.ellipse(waterX, waterY, 140, 85, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ca8a04'; // Sandy mud banks
  ctx.lineWidth = 12;
  ctx.stroke();

  // Granite Kopje Rock Formations
  const kopjes = [
    { x: cx + 580, y: cy - 400, w: 140, h: 90 },
    { x: cx + 520, y: cy + 460, w: 120, h: 70 },
  ];
  for (const kp of kopjes) {
    ctx.fillStyle = isSunset ? '#7c2d12' : dark ? '#334155' : '#78716c';
    ctx.beginPath();
    ctx.ellipse(kp.x, kp.y, kp.w / 2, kp.h / 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dirt Safari Tracks meandering across the plains
  ctx.strokeStyle = isSunset ? '#78350f' : dark ? '#292524' : '#b45309';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(left + 240, top);
  ctx.bezierCurveTo(cx - 300, cy - 250, cx - 200, cy + 250, left + w - 240, top + h);
  ctx.stroke();

  // Safari 4x4 Land Rover Sprites driving along dirt tracks
  const rovers = [
    { x: cx - 280, y: cy - 220, angle: 0.6 },
    { x: cx - 180, y: cy + 280, angle: 0.4 },
  ];
  for (const rov of rovers) {
    ctx.save();
    ctx.translate(rov.x, rov.y);
    ctx.rotate(rov.angle);
    // Sand-beige vehicle body
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-12, -7, 24, 14);
    // Roof rack with luggage & spare wheel
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-10, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Night headlights
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(11, -5, 3, 3);
      ctx.fillRect(11, 2, 3, 3);
    }
    ctx.restore();
  }

  // Massive Baobab Trees with swollen broad trunks and sprawling branches
  const baobabs = [
    { x: cx - 680, y: cy - 180, r: 24 },
    { x: cx + 640, y: cy + 240, r: 28 },
    { x: cx - 440, y: cy - 420, r: 22 },
  ];
  for (const bb of baobabs) {
    // Broad swollen wooden trunk
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, bb.r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Sprawling leafy crown
    ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#451a03' : '#052e16';
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2);
    ctx.fill();

    // Trunk radial bark creases
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(bb.x, bb.y);
      ctx.lineTo(bb.x + Math.cos(a) * bb.r * 0.8, bb.y + Math.sin(a) * bb.r * 0.8);
      ctx.stroke();
    }
  }

  // Iconic Umbrella Acacia Trees (Flat-topped wide circular canopies with distinct radiating branches)
  const acaciaCol = isNoon ? '#15803d' : isSunset ? '#451a03' : '#052e16';
  for (let ax = left + 100; ax < left + w - 100; ax += 125) {
    for (let ay = top + 100; ay < top + h - 100; ay += 125) {
      if (Math.hypot(ax - cx, ay - cy) < 440) continue;
      if (Math.hypot(ax - waterX, ay - waterY) < 140) continue;

      const jX = ((ax * 13) % 60) - 30;
      const jY = ((ay * 23) % 60) - 30;
      const treeR = 18 + ((ax + ay) % 8);

      // Umbrella canopy (wide flat ellipse)
      ctx.fillStyle = acaciaCol;
      ctx.beginPath();
      ctx.ellipse(ax + jX, ay + jY, treeR, treeR * 0.65, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Shadow cast onto golden savannah
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(ax + jX + 6, ay + jY + 8, treeR * 0.8, treeR * 0.45, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * 4. Highway Aerial: Multi-tier concrete cloverleaf interchange, 8-lane expressways, moving vehicles with headlights/taillights
 */
function drawAerialHighway(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base terrain (highway landscaped grass embankment)
  ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#451a03' : '#0f172a';
  ctx.fillRect(left, top, w, h);

  // Major 8-Lane Expressway Avenues (North-South & East-West)
  const asphaltColor = isSunset ? '#1c1917' : dark ? '#0a0f1d' : '#1e293b';
  const roadWidth = 110;

  // Horizontal Expressway (crossing south of stadium)
  const hRoadY = cy + 480;
  ctx.fillStyle = asphaltColor;
  ctx.fillRect(left, hRoadY - roadWidth / 2, w, roadWidth);

  // Vertical Expressway (crossing east of stadium)
  const vRoadX = cx + 580;
  ctx.fillRect(vRoadX - roadWidth / 2, top, roadWidth, h);

  // Cloverleaf Overpass Flyover Loops (4 sweeping circular interchange ramps)
  const cloverCenter = { x: vRoadX, y: hRoadY };
  const rampRadius = 140;
  ctx.strokeStyle = isSunset ? '#292524' : dark ? '#1e293b' : '#334155';
  ctx.lineWidth = 32;

  // 4 Quadrant Cloverleaf Ramps
  const rampOffsets = [
    { dx: -rampRadius, dy: -rampRadius },
    { dx: rampRadius, dy: -rampRadius },
    { dx: -rampRadius, dy: rampRadius },
    { dx: rampRadius, dy: rampRadius },
  ];
  for (const ro of rampOffsets) {
    ctx.beginPath();
    ctx.arc(cloverCenter.x + ro.dx * 0.8, cloverCenter.y + ro.dy * 0.8, 70, 0, Math.PI * 2);
    ctx.stroke();
  }

  // White and Yellow Lane Divider Markings
  ctx.strokeStyle = '#facc15'; // Yellow median
  ctx.lineWidth = 3;
  // Horizontal median
  ctx.beginPath();
  ctx.moveTo(left, hRoadY);
  ctx.lineTo(left + w, hRoadY);
  ctx.stroke();
  // Vertical median
  ctx.beginPath();
  ctx.moveTo(vRoadX, top);
  ctx.lineTo(vRoadX, top + h);
  ctx.stroke();

  // Dashed white lane markings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([16, 14]);
  for (let off of [-32, 32]) {
    ctx.beginPath();
    ctx.moveTo(left, hRoadY + off);
    ctx.lineTo(left + w, hRoadY + off);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vRoadX + off, top);
    ctx.lineTo(vRoadX + off, top + h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Moving Highway Vehicular Traffic (Cars, Trucks, Tankers, Buses)
  const vehicleColors = ['#dc2626', '#2563eb', '#ffffff', '#eab308', '#059669', '#9333ea', '#64748b'];

  // Vehicles along Horizontal Expressway
  for (let vx = left + 80; vx < left + w - 80; vx += 95) {
    const isEastbound = ((vx % 190) < 95);
    const vy = hRoadY + (isEastbound ? 24 : -24);
    const carW = 28 + (vx % 14);
    const carH = 14;
    const col = vehicleColors[(vx * 7) % vehicleColors.length];

    ctx.fillStyle = col;
    ctx.fillRect(vx, vy - carH / 2, carW, carH);

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(vx + (isEastbound ? carW - 9 : 3), vy - 5, 6, 10);

    // Night Headlight Beams & Red Taillights
    if (dark) {
      // Headlights
      ctx.fillStyle = '#fef08a';
      const headX = isEastbound ? vx + carW : vx - 4;
      ctx.fillRect(headX, vy - 5, 4, 3);
      ctx.fillRect(headX, vy + 2, 4, 3);

      // Light beam cone
      ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
      ctx.beginPath();
      ctx.moveTo(headX, vy);
      ctx.lineTo(headX + (isEastbound ? 35 : -35), vy - 14);
      ctx.lineTo(headX + (isEastbound ? 35 : -35), vy + 14);
      ctx.closePath();
      ctx.fill();

      // Taillights
      ctx.fillStyle = '#ef4444';
      const tailX = isEastbound ? vx - 2 : vx + carW;
      ctx.fillRect(tailX, vy - 5, 3, 3);
      ctx.fillRect(tailX, vy + 2, 3, 3);
    }
  }

  // Overhead Steel Highway Sign Gantries spanning over lanes
  for (let gx = left + 280; gx < left + w - 280; gx += 460) {
    // Metal bridge
    ctx.fillStyle = '#475569';
    ctx.fillRect(gx - 3, hRoadY - roadWidth / 2 - 8, 6, roadWidth + 16);
    // Green highway directional sign
    ctx.fillStyle = '#15803d';
    ctx.fillRect(gx - 18, hRoadY - 35, 36, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx - 18, hRoadY - 35, 36, 16);
  }
}

/**
 * 2. Parking Lot Aerial (Camp Nou style): Vast asphalt grids, white parking stalls, hundreds of cars, team buses
 */
function drawAerialParkingLot(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Base asphalt ground
  ctx.fillStyle = dark ? (time === 'night' ? '#0f172a' : '#1e293b') : '#334155';
  ctx.fillRect(left, top, w, h);

  // Concrete pedestrian concourses and security ring around stadium
  ctx.fillStyle = dark ? '#1e293b' : '#64748b';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 540, 420, 0, 0, Math.PI * 2);
  ctx.fill();

  // Multi-lane vehicular avenues around parking perimeter
  const aveColor = dark ? '#090d16' : '#1e293b';
  ctx.fillStyle = aveColor;
  ctx.fillRect(left, cy - 35, w, 70); // East-West boulevard
  ctx.fillRect(cx - 35, top, 70, h); // North-South avenue

  // Painted road markings
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(left, cy);
  ctx.lineTo(left + w, cy);
  ctx.moveTo(cx, top);
  ctx.lineTo(cx, top + h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Parking Lot Grid Sectors (NW, NE, SW, SE)
  const sectors = [
    { x1: left + 100, y1: top + 100, x2: cx - 120, y2: cy - 120 },
    { x1: cx + 120, y1: top + 100, x2: left + w - 100, y2: cy - 120 },
    { x1: left + 100, y1: cy + 120, x2: cx - 120, y2: top + h - 100 },
    { x1: cx + 120, y1: cy + 120, x2: left + w - 100, y2: top + h - 100 },
  ];

  const carColors = ['#ffffff', '#dc2626', '#2563eb', '#94a3b8', '#1e293b', '#e2e8f0', '#f59e0b', '#10b981'];

  for (const s of sectors) {
    // Asphalt lot section
    ctx.fillStyle = dark ? '#0b1120' : '#1e293b';
    ctx.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);

    // White parking bay stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;

    for (let py = s.y1 + 25; py < s.y2 - 25; py += 50) {
      ctx.beginPath();
      ctx.moveTo(s.x1 + 10, py);
      ctx.lineTo(s.x2 - 10, py);
      ctx.stroke();

      // Individual parked cars
      for (let px = s.x1 + 20; px < s.x2 - 20; px += 24) {
        // Skip some slots to simulate empty parking spots
        const seed = (px * 31 + py * 17) % 100;
        if (seed < 22) continue; // 22% empty slots

        const color = carColors[(seed + px) % carColors.length];
        ctx.fillStyle = color;
        // Car rectangle (8 x 14 px)
        ctx.fillRect(px - 4, py - 10, 8, 14);

        // Windshield glass
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px - 3, py - 6, 6, 4);

        // Car headlights glow at night
        if (dark && seed > 80) {
          ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
          ctx.fillRect(px - 3, py - 14, 2, 3);
          ctx.fillRect(px + 1, py - 14, 2, 3);
        }
      }
    }
  }

  // Official Team Luxury Coach Buses at West VIP Grandstand portal
  const busY = cy - 20;
  const busColors = ['#1d4ed8', '#b91c1c']; // Home Blue & Away Red team buses
  for (let b = 0; b < 2; b++) {
    const bx = cx - 440;
    const by = busY + b * 32;
    // Bus body (16 x 42 px)
    ctx.fillStyle = busColors[b];
    ctx.fillRect(bx, by, 42, 16);
    // Roof air conditioning vents
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 4, by + 3, 34, 10);
    // Team livery stripe
    ctx.fillStyle = '#facc15';
    ctx.fillRect(bx, by + 7, 42, 2);
  }

  // Tree Boulevards lining the perimeter avenues
  ctx.fillStyle = dark ? '#0f291e' : '#15803d';
  for (let tx = left + 40; tx < left + w - 40; tx += 60) {
    ctx.beginPath();
    ctx.arc(tx, cy - 42, 8, 0, Math.PI * 2);
    ctx.arc(tx, cy + 42, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 3. Small City Aerial: Suburban streets, blocks of houses with hip roofs, backyards, roundabouts
 */
function drawAerialSmallCity(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base suburban terrain (lawns & backyard greenery)
  ctx.fillStyle = isNoon ? '#4d7c0f' : isSunset ? '#78350f' : '#111e14';
  ctx.fillRect(left, top, w, h);

  // Street Grid (Residential roads & tree boulevards)
  const roadColor = isSunset ? '#292524' : dark ? '#1e293b' : '#64748b';
  ctx.fillStyle = roadColor;

  const roadSpacingX = 220;
  const roadSpacingY = 180;

  for (let rx = left + 100; rx < left + w; rx += roadSpacingX) {
    ctx.fillRect(rx - 12, top, 24, h);
  }
  for (let ry = top + 90; ry < top + h; ry += roadSpacingY) {
    ctx.fillRect(left, ry - 12, w, 24);
  }

  // Neighborhood Roundabouts
  for (let rx = left + 100; rx < left + w; rx += roadSpacingX * 2) {
    for (let ry = top + 90; ry < top + h; ry += roadSpacingY * 2) {
      ctx.fillStyle = roadColor;
      ctx.beginPath();
      ctx.arc(rx, ry, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isNoon ? '#4d7c0f' : isSunset ? '#78350f' : '#111e14';
      ctx.beginPath();
      ctx.arc(rx, ry, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Civic Center: Historic Town Hall with Clock Tower & Community Center (2-3 medium buildings)
  const civicBuildings = [
    { x: cx - 520, y: cy - 280, w: 90, h: 65, color: '#7f1d1d', isTownHall: true },
    { x: cx + 460, y: cy - 270, w: 80, h: 55, color: '#334155', isTownHall: false },
    { x: cx - 480, y: cy + 290, w: 85, h: 60, color: '#1e293b', isTownHall: false },
  ];

  for (const cb of civicBuildings) {
    ctx.fillStyle = cb.color;
    ctx.fillRect(cb.x, cb.y, cb.w, cb.h);

    if (cb.isTownHall) {
      // Clock tower in center
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(cb.x + cb.w / 2 - 12, cb.y + cb.h / 2 - 12, 24, 24);
      // Clock dial
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cb.x + cb.w / 2, cb.y + cb.h / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Windows with warm lights at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      for (let wx = cb.x + 8; wx < cb.x + cb.w - 8; wx += 14) {
        ctx.fillRect(wx, cb.y + 8, 5, 5);
        ctx.fillRect(wx, cb.y + cb.h - 13, 5, 5);
      }
    }
  }

  // Suburban House Blocks with Pitched Terracotta & Slate Roofs
  const roofColors = isSunset
    ? ['#b91c1c', '#c2410c', '#9a3412', '#78350f', '#451a03']
    : isNoon
    ? ['#991b1b', '#b45309', '#334155', '#475569', '#7c2d12']
    : ['#1e293b', '#292524', '#0f172a', '#1e1b4b', '#312e81'];

  for (let bx = left + 40; bx < left + w - 40; bx += roadSpacingX) {
    for (let by = top + 30; by < top + h - 30; by += roadSpacingY) {
      if (Math.hypot(bx + 80 - cx, by + 70 - cy) < 430) continue; // Clear stadium zone

      // Render 4 small family houses per block
      const houseOffsets = [
        { dx: 30, dy: 25, w: 50, h: 36 },
        { dx: 110, dy: 25, w: 50, h: 36 },
        { dx: 30, dy: 90, w: 50, h: 36 },
        { dx: 110, dy: 90, w: 50, h: 36 },
      ];

      for (let hIdx = 0; hIdx < houseOffsets.length; hIdx++) {
        const ho = houseOffsets[hIdx];
        const hx = bx + ho.dx;
        const hy = by + ho.dy;
        const col = roofColors[(bx + by + hIdx * 7) % roofColors.length];

        // Roof body
        ctx.fillStyle = col;
        ctx.fillRect(hx, hy, ho.w, ho.h);

        // Roof ridge line
        ctx.fillStyle = dark ? '#0f172a' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(hx + 6, hy + ho.h / 2 - 2, ho.w - 12, 4);

        // Chimney
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(hx + ho.w - 10, hy + 5, 5, 5);

        // Windows illuminated at night
        if (dark && (hIdx + bx) % 3 !== 0) {
          ctx.fillStyle = '#fde047';
          ctx.fillRect(hx + 8, hy + 6, 4, 4);
          ctx.fillRect(hx + ho.w - 16, hy + ho.h - 10, 4, 4);
        }

        // Backyard tree
        ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#78350f' : '#0a1a0f';
        ctx.beginPath();
        ctx.arc(hx + ho.w + 12, hy + ho.h / 2, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Green Municipal Park with Duck Pond, walking paths & tree groves in South-East
  const parkX = cx + 560;
  const parkY = cy + 320;
  const parkW = 240;
  const parkH = 180;
  // Lush park lawn
  ctx.fillStyle = isNoon ? '#16a34a' : isSunset ? '#9a3412' : '#064e3b';
  ctx.fillRect(parkX - parkW / 2, parkY - parkH / 2, parkW, parkH);

  // Central park duck pond
  ctx.fillStyle = isNoon ? '#0284c7' : isSunset ? '#c2410c' : '#0369a1';
  ctx.beginPath();
  ctx.ellipse(parkX, parkY, 60, 38, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Winding gravel walking path encircling the pond
  ctx.strokeStyle = isSunset ? '#78350f' : dark ? '#475569' : '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(parkX, parkY, 82, 54, 0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Local High Street Commercial District with colorful shop awnings
  const shopX = cx - 440;
  const shopY = cy - 380;
  const awningColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea'];
  for (let s = 0; s < 5; s++) {
    const sx = shopX + s * 44;
    // Shop building
    ctx.fillStyle = isSunset ? '#451a03' : '#334155';
    ctx.fillRect(sx, shopY, 38, 32);
    // Striped storefront awning
    ctx.fillStyle = awningColors[s % awningColors.length];
    ctx.fillRect(sx - 2, shopY + 28, 42, 8);
    // Warm shop window glow at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 4, shopY + 8, 14, 14);
      ctx.fillRect(sx + 20, shopY + 8, 14, 14);
    }
  }

  // Winding cul-de-sac turnarounds on neighborhood street terminals
  const culDeSacs = [
    { x: left + 140, y: top + 130 },
    { x: left + w - 180, y: cy - 240 },
  ];
  for (const cds of culDeSacs) {
    ctx.fillStyle = roadColor;
    ctx.beginPath();
    ctx.arc(cds.x, cds.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isNoon ? '#4d7c0f' : isSunset ? '#78350f' : '#111e14';
    ctx.beginPath();
    ctx.arc(cds.x, cds.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 4. Big City Aerial: Dense soaring skyscrapers, HVAC vents, helipads, expressways, elevated metro
 */
function drawAerialBigCity(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base metropolitan asphalt & sidewalks
  ctx.fillStyle = dark ? '#0a0e17' : '#1e293b';
  ctx.fillRect(left, top, w, h);

  // 6-Lane Expressway slicing horizontally below stadium
  const expY = cy + 460;
  ctx.fillStyle = dark ? '#05070d' : '#0f172a';
  ctx.fillRect(left, expY - 45, w, 90);

  // Expressway divider & lane stripes
  ctx.fillStyle = '#facc15';
  ctx.fillRect(left, expY - 2, w, 4);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(left, expY - 22);
  ctx.lineTo(left + w, expY - 22);
  ctx.moveTo(left, expY + 22);
  ctx.lineTo(left + w, expY + 22);
  ctx.stroke();
  ctx.setLineDash([]);

  // Moving expressway traffic (night headlights and red taillights)
  if (dark) {
    for (let tx = left + 30; tx < left + w - 30; tx += 65) {
      // Eastbound white headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tx, expY - 25, 6, 3);
      // Westbound red taillights
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(tx + 25, expY + 20, 6, 3);
    }
  }

  // Elevated Metro Rail track line along North
  const railY = cy - 470;
  ctx.fillStyle = dark ? '#1c1917' : '#44403c';
  ctx.fillRect(left, railY - 14, w, 28);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(left, railY - 6, w, 3);
  ctx.fillRect(left, railY + 3, w, 3);

  // Elevated rail support pylons
  ctx.fillStyle = '#64748b';
  for (let px = left + 40; px < left + w; px += 110) {
    ctx.fillRect(px - 5, railY - 18, 10, 36);
  }

  // Illuminated Passenger Transit Train Sprites running on elevated rail
  const trainX = left + 320;
  // Train consists of 4 streamlined cars
  for (let c = 0; c < 4; c++) {
    const cxCar = trainX + c * 52;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cxCar, railY - 12, 48, 16);
    // Dark car base
    ctx.fillStyle = '#0284c7'; // Transit blue stripe
    ctx.fillRect(cxCar, railY + 2, 48, 3);
    // Illuminated passenger car windows
    ctx.fillStyle = dark ? '#fde047' : '#0f172a';
    for (let wx = cxCar + 6; wx < cxCar + 44; wx += 10) {
      ctx.fillRect(wx, railY - 8, 6, 6);
    }
  }

  // Glowing streetlights along avenues forming an illuminated street grid at night
  if (dark) {
    ctx.fillStyle = '#fef08a';
    for (let lx = left + 60; lx < left + w - 60; lx += 110) {
      ctx.beginPath();
      ctx.arc(lx, expY - 48, 3, 0, Math.PI * 2);
      ctx.arc(lx, expY + 48, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Skyscrapers & Commercial Towers surrounding stadium (Massive array of towers)
  const towerBlocks = [
    { x: left + 140, y: top + 120, w: 180, h: 140, color: isSunset ? '#451a03' : '#334155', hasHelipad: true },
    { x: left + 380, y: top + 100, w: 220, h: 150, color: isSunset ? '#292524' : '#1e293b', hasHelipad: false },
    { x: cx + 320, y: top + 110, w: 200, h: 160, color: isSunset ? '#57534e' : '#475569', hasHelipad: true },
    { x: cx + 580, y: top + 90, w: 190, h: 180, color: isSunset ? '#1c1917' : '#0f172a', hasHelipad: false },
    { x: left + 120, y: cy + 180, w: 170, h: 190, color: isSunset ? '#292524' : '#1e293b', hasHelipad: false },
    { x: cx + 420, y: cy + 180, w: 210, h: 200, color: isSunset ? '#451a03' : '#334155', hasHelipad: true },
    { x: left + 100, y: cy - 200, w: 160, h: 220, color: isSunset ? '#1c1917' : '#0f172a', hasHelipad: false },
    { x: cx + 640, y: cy - 180, w: 180, h: 240, color: isSunset ? '#3f3f46' : '#1e293b', hasHelipad: true },
  ];

  for (const tb of towerBlocks) {
    // Rooftop surface
    ctx.fillStyle = tb.color;
    ctx.fillRect(tb.x, tb.y, tb.w, tb.h);

    // Sunset golden specular reflections on skyscraper rooftops
    if (isSunset) {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.35)';
      ctx.fillRect(tb.x, tb.y, tb.w * 0.45, tb.h);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tb.x, tb.y, tb.w, tb.h);
    }

    // Architectural parapet border
    ctx.strokeStyle = dark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(tb.x, tb.y, tb.w, tb.h);

    // Glowing office windows in skyscrapers at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      for (let wy = tb.y + 12; wy < tb.y + tb.h - 12; wy += 22) {
        for (let wx = tb.x + 12; wx < tb.x + tb.w - 12; wx += 24) {
          if ((wx * 3 + wy * 7) % 5 !== 0) {
            ctx.fillRect(wx, wy, 8, 8);
          }
        }
      }
    }

    // Industrial HVAC Chiller Units & Vents
    ctx.fillStyle = '#64748b';
    ctx.fillRect(tb.x + 18, tb.y + 16, 32, 22);
    ctx.fillRect(tb.x + 56, tb.y + 16, 22, 22);

    // Aircraft Hazard Warning Beacon Tower
    const beaconX = tb.x + tb.w - 20;
    const beaconY = tb.y + 20;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Helipad (Circle with 'H')
    if (tb.hasHelipad) {
      const hx = tb.x + tb.w / 2;
      const hy = tb.y + tb.h / 2 + 10;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, 26, 0, Math.PI * 2);
      ctx.stroke();

      // Yellow 'H'
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', hx, hy);
    }
  }
}

/**
 * 5. Airport Aerial (Gibraltar style): Adjacent runway, threshold markings, hangars, control tower, airplanes
 */
function drawAerialAirport(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay,
  _grounds?: StadiumGroundsType
) {
  // Base airfield terrain
  ctx.fillStyle = dark ? (time === 'night' ? '#0f172a' : '#1e293b') : '#334155';
  ctx.fillRect(left, top, w, h);

  // Massive Tarmac Runway running horizontally along South touchline
  const runwayY = cy + 440;
  const runwayH = 150;
  ctx.fillStyle = dark ? '#020617' : '#1e293b';
  ctx.fillRect(left, runwayY - runwayH / 2, w, runwayH);

  // Runway Piano-Key Threshold Markings
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 12; k++) {
    ctx.fillRect(left + 60, runwayY - 55 + k * 10, 50, 6);
    ctx.fillRect(left + w - 110, runwayY - 55 + k * 10, 50, 6);
  }

  // Runway Dashed Centerline
  ctx.fillStyle = '#facc15';
  for (let rx = left + 140; rx < left + w - 140; rx += 70) {
    ctx.fillRect(rx, runwayY - 3, 45, 6);
  }

  // Runway Edge Green & Cyan Navigation Lights
  for (let lx = left + 40; lx < left + w - 40; lx += 45) {
    ctx.fillStyle = dark ? '#22c55e' : '#15803d';
    ctx.fillRect(lx, runwayY - runwayH / 2 + 2, 4, 4);
    ctx.fillRect(lx, runwayY + runwayH / 2 - 6, 4, 4);
  }

  // Taxiways connecting to flight aprons
  ctx.fillStyle = dark ? '#0f172a' : '#334155';
  ctx.fillRect(cx - 180, cy + 220, 80, 160);
  ctx.fillRect(cx + 120, cy + 220, 80, 160);

  // Taxiway yellow centerlines with curve turnoffs
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 140, cy + 220);
  ctx.lineTo(cx - 140, runwayY);
  ctx.moveTo(cx + 160, cy + 220);
  ctx.lineTo(cx + 160, runwayY);
  ctx.stroke();

  // Commercial Jet Airplanes parked on flight apron
  const planes = [
    { x: cx - 440, y: cy + 300, angle: -0.2 },
    { x: cx + 380, y: cy + 290, angle: 0.15 },
  ];

  for (const pl of planes) {
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate(pl.angle);

    // Fuselage
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(8, -52);
    ctx.lineTo(24, -50);
    ctx.lineTo(14, -8);
    ctx.lineTo(14, 8);
    ctx.lineTo(24, 50);
    ctx.lineTo(8, 52);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();

    // Tail horizontal stabilizer
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-42, -5);
    ctx.lineTo(-32, -22);
    ctx.lineTo(-24, -20);
    ctx.lineTo(-30, -5);
    ctx.lineTo(-30, 5);
    ctx.lineTo(-24, 20);
    ctx.lineTo(-32, 22);
    ctx.lineTo(-42, 5);
    ctx.closePath();
    ctx.fill();

    // Jet engines
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, -28, 14, 6);
    ctx.fillRect(0, 22, 14, 6);

    ctx.restore();
  }

  // Air Traffic Control Tower & Radar Dome in North-West
  const towerX = cx - 480;
  const towerY = cy - 380;
  ctx.fillStyle = dark ? '#334155' : '#94a3b8';
  ctx.beginPath();
  ctx.arc(towerX, towerY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0284c7'; // Glass observation circle
  ctx.beginPath();
  ctx.arc(towerX, towerY, 20, 0, Math.PI * 2);
  ctx.fill();
  // Flashing red hazard beacon
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(towerX, towerY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Rotating Radar Surveillance Beam Cone
  ctx.save();
  const sweepAngle = (Date.now() * 0.0015) % (Math.PI * 2);
  const radarRadius = 140;
  const beamGradient = ctx.createRadialGradient(towerX, towerY, 10, towerX, towerY, radarRadius);
  beamGradient.addColorStop(0, 'rgba(34, 197, 94, 0.55)');
  beamGradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.25)');
  beamGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = beamGradient;
  ctx.beginPath();
  ctx.moveTo(towerX, towerY);
  ctx.arc(towerX, towerY, radarRadius, sweepAngle, sweepAngle + 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cargo Freight Terminal Depot Warehouse with loading dock bays in North-East
  const cargoX = cx + 520;
  const cargoY = cy - 360;
  const cargoW = 160;
  const cargoH = 80;
  ctx.fillStyle = dark ? '#1e293b' : '#475569';
  ctx.fillRect(cargoX, cargoY, cargoW, cargoH);
  ctx.strokeStyle = dark ? '#334155' : '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(cargoX, cargoY, cargoW, cargoH);

  // B5.2 Gibraltar Airport Overhaul: Rock of Gibraltar towering limestone ridge along North-East
  const isSunset = time === 'sunset' || time === 'dawn';
  const rockX = cx + 220;
  const rockY = top + 20;
  const rockW = w * 0.45;
  const rockH = 260;

  // Limestone Massif Silhouette & Strata
  ctx.save();
  ctx.fillStyle = isSunset ? '#78350f' : dark ? '#1e293b' : '#64748b';
  ctx.beginPath();
  ctx.moveTo(rockX, rockY + rockH);
  ctx.lineTo(rockX + 40, rockY + 80);
  ctx.lineTo(rockX + 120, rockY + 30);
  ctx.lineTo(rockX + 240, rockY + 15);
  ctx.lineTo(rockX + 380, rockY + 50);
  ctx.lineTo(rockX + rockW, rockY + rockH);
  ctx.closePath();
  ctx.fill();

  // Shadowed cliff fissures & vertical bedding planes
  ctx.strokeStyle = isSunset ? '#451a03' : dark ? '#0f172a' : '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let fx = rockX + 60; fx < rockX + rockW - 40; fx += 55) {
    ctx.moveTo(fx, rockY + 70 + ((fx * 7) % 40));
    ctx.lineTo(fx + 10, rockY + rockH - 10);
  }
  ctx.stroke();

  // Mediterranean scrub vegetation ledges
  ctx.fillStyle = isSunset ? '#451a03' : dark ? '#052e16' : '#15803d';
  for (let sx = rockX + 80; sx < rockX + rockW - 60; sx += 70) {
    const sy = rockY + 110 + ((sx * 13) % 90);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Summit Military Communications Station & Radar Mast on Rock of Gibraltar
  const summitX = rockX + 240;
  const summitY = rockY + 15;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(summitX, summitY - 10, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(summitX, summitY - 22);
  ctx.lineTo(summitX, summitY - 45);
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(summitX, summitY - 45, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Elevated Approach Lighting Pylons & Stanchions (Calvert/ALSF-2) extending off runway ends
  const westPylons = [left - 120, left - 70, left - 20];
  const eastPylons = [left + w + 20, left + w + 70, left + w + 120];
  for (const px of [...westPylons, ...eastPylons]) {
    // Water / marsh base footing
    ctx.fillStyle = '#334155';
    ctx.fillRect(px - 6, runwayY - 30, 12, 60);
    // Steel crossbar
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, runwayY - 40);
    ctx.lineTo(px, runwayY + 40);
    ctx.stroke();
    // High-intensity white / amber sequenced strobe flashers
    ctx.fillStyle = dark ? '#fef08a' : '#ffffff';
    ctx.fillRect(px - 2, runwayY - 35, 4, 4);
    ctx.fillRect(px - 2, runwayY - 15, 4, 4);
    ctx.fillRect(px - 2, runwayY + 15, 4, 4);
    ctx.fillRect(px - 2, runwayY + 35, 4, 4);
  }

  // Double-mesh High Security Airfield Perimeter Fence separating runway from stadium
  const fenceY = runwayY - runwayH / 2 - 14;
  ctx.strokeStyle = dark ? '#475569' : '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, fenceY);
  ctx.lineTo(left + w, fenceY);
  ctx.stroke();

  // Fence posts & warning signs
  for (let fx = left + 20; fx < left + w - 20; fx += 40) {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, fenceY - 12);
    ctx.lineTo(fx, fenceY + 6);
    ctx.stroke();

    // Barbed wire toppers
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx - 15, fenceY - 12);
    ctx.lineTo(fx + 15, fenceY - 12);
    ctx.stroke();

    // Yellow Airfield Danger Warning Placard every 160px
    if (fx % 160 === 20) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(fx - 8, fenceY - 8, 16, 9);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(fx - 5, fenceY - 5, 10, 3);
    }
  }

  // Animated 32-Bit Low-Approach Passenger Aircraft
  const planeAnimCycle = (Date.now() * 0.0004) % 1;
  const approachPlaneX = left + planeAnimCycle * (w + 400) - 200;
  const approachPlaneY = runwayY - 30 + Math.sin(planeAnimCycle * Math.PI) * 15;
  ctx.save();
  ctx.translate(approachPlaneX, approachPlaneY);
  // Aerodynamic swept-wing airliner
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 56, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wings
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(12, -58);
  ctx.lineTo(26, -56);
  ctx.lineTo(16, -8);
  ctx.lineTo(16, 8);
  ctx.lineTo(26, 56);
  ctx.lineTo(12, 58);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();
  // Extended landing gear wheels
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-6, -18, 5, 8);
  ctx.fillRect(-6, 10, 5, 8);
  ctx.fillRect(20, -4, 4, 8);
  // Wingtip navigation strobes: port red, starboard green, tail white
  if (dark || isSunset) {
    ctx.fillStyle = '#ef4444'; // Port red
    ctx.fillRect(22, -58, 4, 4);
    ctx.fillStyle = '#22c55e'; // Starboard green
    ctx.fillRect(22, 54, 4, 4);
    ctx.fillStyle = '#fef08a'; // Rotating beacon
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Loading dock door bays
  for (let dx = cargoX + 16; dx < cargoX + cargoW - 16; dx += 28) {
    ctx.fillStyle = dark ? '#0f172a' : '#1e293b';
    ctx.fillRect(dx, cargoY + cargoH - 14, 20, 14);
    // Yellow baggage tug trailer
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(dx + 2, cargoY + cargoH + 6, 16, 8);
  }
}

/**
 * 6. Railroad Aerial: Switching tracks, ballast gravel, train sheds, freight cars, moving locomotive
 */
function drawAerialRailroad(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Base gravel and ballast ground
  ctx.fillStyle = dark ? (time === 'night' ? '#1c1917' : '#292524') : '#44403c';
  ctx.fillRect(left, top, w, h);

  // Massive Multi-Track Rail Corridor along North
  const railCenterY = cy - 420;
  const numTracks = 6;
  const trackSpacing = 24;

  for (let t = 0; t < numTracks; t++) {
    const ty = railCenterY - ((numTracks - 1) * trackSpacing) / 2 + t * trackSpacing;

    // Gravel ballast bed
    ctx.fillStyle = dark ? '#1c1917' : '#57534e';
    ctx.fillRect(left, ty - 10, w, 20);

    // Wooden cross ties / sleepers
    ctx.fillStyle = '#292524';
    for (let rx = left; rx < left + w; rx += 14) {
      ctx.fillRect(rx, ty - 9, 5, 18);
    }

    // Parallel steel rail lines
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(left, ty - 6, w, 2);
    ctx.fillRect(left, ty + 4, w, 2);
  }

  // Freight Train strings on tracks 1, 3, 5
  const trainColors = ['#b91c1c', '#1d4ed8', '#f59e0b', '#047857', '#6b7280'];
  for (let tr = 0; tr < 3; tr++) {
    const trackIdx = tr * 2;
    const ty = railCenterY - ((numTracks - 1) * trackSpacing) / 2 + trackIdx * trackSpacing;
    const startX = left + 180 + tr * 240;

    // String of 5 freight boxcars
    for (let c = 0; c < 5; c++) {
      const bx = startX + c * 52;
      const color = trainColors[(tr * 3 + c) % trainColors.length];
      ctx.fillStyle = color;
      ctx.fillRect(bx, ty - 7, 48, 14);

      // Boxcar corrugated roof ribs
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let rib = bx + 6; rib < bx + 44; rib += 8) {
        ctx.fillRect(rib, ty - 7, 2, 14);
      }
    }

    // Lead Diesel Locomotive Engine
    const locoX = startX + 5 * 52;
    ctx.fillStyle = '#facc15'; // Heavy industrial yellow locomotive
    ctx.fillRect(locoX, ty - 8, 56, 16);
    ctx.fillStyle = '#0f172a'; // Windshield & cab
    ctx.fillRect(locoX + 38, ty - 6, 12, 12);
    // Headlight glow
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(locoX + 54, ty - 3, 4, 6);
    }
  }

  // Steel Electrification Gantries spanning across tracks every 220px
  for (let gx = left + 120; gx < left + w - 120; gx += 220) {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(gx - 4, railCenterY - 85, 8, 170);
  }

  // Locomotive Turntable (circular pit with rotating bridge track) in the western quadrant
  const turnX = cx - 560;
  const turnY = railCenterY + 140;
  const turnR = 64;
  ctx.fillStyle = dark ? '#0f172a' : '#292524';
  ctx.beginPath();
  ctx.arc(turnX, turnY, turnR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Turntable center pivot & rotating bridge deck
  ctx.fillStyle = '#facc15'; // Yellow safety walkway
  ctx.save();
  ctx.translate(turnX, turnY);
  ctx.rotate(0.45);
  ctx.fillRect(-turnR + 4, -8, (turnR - 4) * 2, 16);
  ctx.fillStyle = '#0f172a'; // Bridge track rails
  ctx.fillRect(-turnR + 4, -4, (turnR - 4) * 2, 2);
  ctx.fillRect(-turnR + 4, 2, (turnR - 4) * 2, 2);
  ctx.restore();

  // Heavy Industrial Container Crane Gantries straddling multiple tracks
  const craneX = cx + 480;
  ctx.fillStyle = '#eab308'; // Safety yellow gantry
  // Left and right vertical gantry towers
  ctx.fillRect(craneX - 32, railCenterY - 95, 8, 190);
  ctx.fillRect(craneX + 24, railCenterY - 95, 8, 190);
  // Overhead horizontal crane beam
  ctx.fillRect(craneX - 36, railCenterY - 105, 72, 14);
  // Hoist trolley & spreader bar
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(craneX - 10, railCenterY - 40, 20, 10);
}

/**
 * 7. Beach Aerial: Golden sandy shoreline, turquoise coastal surf, blue ocean, palm trees, cabanas
 */
function drawAerialBeach(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Base green coastal land
  ctx.fillStyle = dark ? (time === 'night' ? '#142817' : '#1e381f') : '#4d7c0f';
  ctx.fillRect(left, top, w, h);

  // Shoreline curve (starts along top/east, sweeping diagonally)
  const coastPoints = [
    { x: left, y: cy - 280 },
    { x: cx - 200, y: cy - 310 },
    { x: cx + 300, y: cy - 240 },
    { x: left + w, y: cy - 180 },
  ];

  // Deep Azure Ocean Water
  const oceanGrad = ctx.createLinearGradient(0, top, 0, cy - 200);
  oceanGrad.addColorStop(0, dark ? '#041d38' : '#0369a1');
  oceanGrad.addColorStop(1, dark ? '#083344' : '#06b6d4');

  ctx.fillStyle = oceanGrad;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + w, top);
  ctx.lineTo(left + w, cy - 180);
  ctx.bezierCurveTo(cx + 300, cy - 240, cx - 200, cy - 310, left, cy - 280);
  ctx.closePath();
  ctx.fill();

  // White Foaming Surf Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(left, cy - 280);
  ctx.bezierCurveTo(cx - 200, cy - 310, cx + 300, cy - 240, left + w, cy - 180);
  ctx.stroke();

  // Golden Sand Beach Band
  ctx.strokeStyle = dark ? '#78350f' : '#fde047';
  ctx.lineWidth = 48;
  ctx.beginPath();
  ctx.moveTo(left, cy - 250);
  ctx.bezierCurveTo(cx - 200, cy - 280, cx + 300, cy - 210, left + w, cy - 150);
  ctx.stroke();

  // Beachside Boardwalk & Promenade
  ctx.strokeStyle = dark ? '#292524' : '#e2e8f0';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(left, cy - 215);
  ctx.bezierCurveTo(cx - 200, cy - 245, cx + 300, cy - 175, left + w, cy - 115);
  ctx.stroke();

  // Coastal Palm Tree Boulevard
  ctx.fillStyle = dark ? '#0f291e' : '#15803d';
  for (let px = left + 40; px < left + w - 40; px += 55) {
    const py = cy - 215 + Math.sin(px * 0.005) * 45;
    ctx.beginPath();
    ctx.arc(px, py - 18, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Colorful Beach Umbrellas & Sun Loungers
  const umbrellaColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'];
  for (let ux = left + 60; ux < left + w - 60; ux += 45) {
    const uy = cy - 255 + Math.sin(ux * 0.005) * 45;
    ctx.fillStyle = umbrellaColors[ux % umbrellaColors.length];
    ctx.beginPath();
    ctx.arc(ux, uy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Marina Slips and Wooden Pier extending into the azure bay in East
  const pierX = cx + 580;
  const pierY = cy - 260;
  // Wooden pier structure
  ctx.fillStyle = '#78350f';
  ctx.fillRect(pierX - 8, pierY - 90, 16, 120);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pierX - 8, pierY - 90, 16, 120);

  // 3 Moored Leisure Yachts along pier
  for (let yIdx = 0; yIdx < 3; yIdx++) {
    const yBoatX = pierX + (yIdx % 2 === 0 ? 18 : -18);
    const yBoatY = pierY - 70 + yIdx * 32;
    // Boat hull
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(yBoatX, yBoatY - 14);
    ctx.lineTo(yBoatX + 6, yBoatY + 12);
    ctx.lineTo(yBoatX - 6, yBoatY + 12);
    ctx.closePath();
    ctx.fill();
    // Blue glass cabin
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(yBoatX - 3, yBoatY - 4, 6, 8);
  }
}

/**
 * 8. Marine Floating Aerial (Phase B5.1 Deep Marine Ocean Surrounding Overhaul)
 * True Open-Ocean Stadium Architecture completely surrounded by deep azure ocean water,
 * breaking wave swells, and dynamic nested ground adaptation:
 * 1. Military Aircraft Carrier / Mega-Vessel Deck (massive flight deck, catapult markings, island superstructure, wake)
 * 2. Offshore Industrial Oil/Gas Platform (yellow lattice support legs, gas flare boom, helipad [H], cranes)
 * 3. Tiny Tropical Coral Atoll (coral island, white sand beaches, turquoise reef lagoon, coconut palms, breaking surf)
 * 4. Floating Modular Hex-Pontoon (modular concrete pontoon, anchor chains, buoy beacons, ocean spray)
 */
function drawAerialMarineFloating(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay,
  grounds?: StadiumGroundsType | string
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';
  const now = Date.now();
  const archetype = resolveMarineGroundArchetype(grounds);

  // Deep 360-Degree Open Ocean Water Expanse
  const oceanGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, Math.max(w, h) * 0.85);
  if (dark) {
    oceanGrad.addColorStop(0, time === 'sunset' ? '#451a2e' : '#082f49');
    oceanGrad.addColorStop(1, time === 'sunset' ? '#1c0a1a' : '#02131e');
  } else {
    oceanGrad.addColorStop(0, '#0284c7');
    oceanGrad.addColorStop(1, '#075985');
  }
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(left, top, w, h);

  // Animated procedural wave swells across the water
  ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 1.6;
  const waveCycle = (now * 0.0016) % (Math.PI * 2);
  for (let wy = top + 40; wy < top + h - 40; wy += 38) {
    ctx.beginPath();
    for (let wx = left + 30; wx < left + w - 30; wx += 40) {
      const off = Math.sin((wx + wy * 3) * 0.04 + waveCycle) * 4;
      if (wx === left + 30) ctx.moveTo(wx, wy + off);
      else ctx.lineTo(wx, wy + off);
    }
    ctx.stroke();
  }

  // Noon sunbeam specular glints on ocean waves
  if (isNoon) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let gx = left + 80; gx < left + w - 80; gx += 120) {
      for (let gy = top + 80; gy < top + h - 80; gy += 140) {
        if (Math.hypot(gx - cx, gy - cy) > 520) {
          ctx.fillRect(gx + Math.sin(gy + waveCycle) * 6, gy, 4, 1.5);
        }
      }
    }
  }

  if (archetype === 'aircraft_carrier') {
    // 1. MILITARY AIRCRAFT CARRIER / MEGA-VESSEL DECK (AERIAL)
    const carrierW = 1380;
    const carrierH = 880;

    // Angled Steel Flight Deck Plating
    ctx.fillStyle = dark ? '#1e293b' : '#334155';
    ctx.beginPath();
    ctx.moveTo(cx - carrierW / 2 + 180, cy - carrierH / 2);
    ctx.lineTo(cx + carrierW / 2 - 40, cy - carrierH / 2);
    ctx.lineTo(cx + carrierW / 2, cy - carrierH / 2 + 60);
    ctx.lineTo(cx + carrierW / 2, cy + carrierH / 2 - 80);
    ctx.lineTo(cx + carrierW / 2 - 80, cy + carrierH / 2);
    ctx.lineTo(cx - carrierW / 2 + 60, cy + carrierH / 2);
    ctx.lineTo(cx - carrierW / 2, cy + carrierH / 2 - 140);
    ctx.lineTo(cx - carrierW / 2, cy - carrierH / 2 + 160);
    ctx.closePath();
    ctx.fill();

    // Flight deck perimeter safety netting
    ctx.strokeStyle = dark ? '#475569' : '#64748b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Catapult Launch Tracks
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 480, cy - 180);
    ctx.lineTo(cx + 420, cy - 280);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 360, cy - 80);
    ctx.lineTo(cx + 520, cy - 140);
    ctx.stroke();

    // Yellow runway threshold and centerline dashes on deck
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([20, 15]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 450, cy + 180);
    ctx.lineTo(cx + 480, cy + 120);
    ctx.stroke();
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);

    // Starboard Island Superstructure Tower with Radomes & Mast
    const islandX = cx + 460;
    const islandY = cy - 220;
    ctx.fillStyle = dark ? '#0f172a' : '#475569';
    ctx.fillRect(islandX - 30, islandY - 70, 60, 140);
    ctx.strokeStyle = dark ? '#334155' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(islandX - 30, islandY - 70, 60, 140);

    // Two White Spherical Radome Domes
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(islandX - 12, islandY - 45, 14, 0, Math.PI * 2);
    ctx.arc(islandX + 12, islandY + 35, 12, 0, Math.PI * 2);
    ctx.fill();

    // Red beacon LED
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(islandX, islandY - 60, 4, 0, Math.PI * 2);
    ctx.fill();

    // Massive White Water Foaming Ocean Wake Trailing Behind Stern
    const wakeGrad = ctx.createLinearGradient(cx - carrierW / 2, cy, cx - carrierW / 2 - 450, cy);
    wakeGrad.addColorStop(0, dark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.85)');
    wakeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = wakeGrad;
    ctx.beginPath();
    ctx.moveTo(cx - carrierW / 2, cy - carrierH / 2 + 100);
    ctx.lineTo(cx - carrierW / 2 - 450, cy - carrierH / 2 - 80);
    ctx.lineTo(cx - carrierW / 2 - 500, cy + carrierH / 2 + 80);
    ctx.lineTo(cx - carrierW / 2, cy + carrierH / 2 - 80);
    ctx.closePath();
    ctx.fill();
  } else if (archetype === 'oil_rig') {
    // 2. OFFSHORE INDUSTRIAL OIL & GAS PLATFORM (AERIAL)
    const rigW = 1200;
    const rigH = 920;

    // Heavy Industrial Yellow Platform Deck Perimeter
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(cx - rigW / 2, cy - rigH / 2, rigW, rigH);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 6;
    ctx.strokeRect(cx - rigW / 2, cy - rigH / 2, rigW, rigH);

    // Giant Tubular Steel Lattice Legs
    const legRadius = 38;
    const legCorners = [
      { x: cx - rigW / 2 + 30, y: cy - rigH / 2 + 30 },
      { x: cx + rigW / 2 - 30, y: cy - rigH / 2 + 30 },
      { x: cx - rigW / 2 + 30, y: cy + rigH / 2 - 30 },
      { x: cx + rigW / 2 - 30, y: cy + rigH / 2 - 30 },
    ];
    for (const lc of legCorners) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(lc.x, lc.y, legRadius + 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(lc.x, lc.y, legRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.arc(lc.x, lc.y, legRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gas Flare Boom Tower with Active Burning Flame Plume
    const flareBoomX = cx + rigW / 2 + 140;
    const flareBoomY = cy - 220;
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + rigW / 2, cy - 220);
    ctx.lineTo(flareBoomX, flareBoomY);
    ctx.stroke();

    const flareFlicker = Math.sin(now * 0.02) * 6;
    const flareGrad = ctx.createRadialGradient(flareBoomX, flareBoomY, 5, flareBoomX, flareBoomY, 48 + flareFlicker);
    flareGrad.addColorStop(0, '#fef08a');
    flareGrad.addColorStop(0.35, '#f97316');
    flareGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.5)');
    flareGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flareGrad;
    ctx.beginPath();
    ctx.arc(flareBoomX, flareBoomY, 48 + flareFlicker, 0, Math.PI * 2);
    ctx.fill();

    // Cantilevered Offshore Helipad [H]
    const heliX = cx - rigW / 2 - 70;
    const heliY = cy + 160;
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(heliX, heliY, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(heliX - 16, heliY - 20, 6, 40);
    ctx.fillRect(heliX + 10, heliY - 20, 6, 40);
    ctx.fillRect(heliX - 16, heliY - 4, 32, 8);

    // Pedestal Sea Cranes
    const craneLocs = [
      { x: cx - rigW / 2 + 80, y: cy - rigH / 2 + 120 },
      { x: cx + rigW / 2 - 80, y: cy + rigH / 2 - 120 },
    ];
    for (const cl of craneLocs) {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cl.x, cl.y);
      ctx.lineTo(cl.x + 40, cl.y - 50);
      ctx.stroke();
    }
  } else if (archetype === 'coral_atoll') {
    // 3. TINY TROPICAL CORAL ATOLL (AERIAL)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 740, 580, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Shallow Crystal Turquoise Reef Lagoon
    const lagoonGrad = ctx.createRadialGradient(cx, cy, 380, cx, cy, 730);
    lagoonGrad.addColorStop(0, dark ? '#0369a1' : '#06b6d4');
    lagoonGrad.addColorStop(0.7, dark ? '#083344' : '#22d3ee');
    lagoonGrad.addColorStop(1, dark ? '#0c4a6e' : '#38bdf8');
    ctx.fillStyle = lagoonGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 730, 570, 0, 0, Math.PI * 2);
    ctx.fill();

    // Powdery White Sand Coral Beach Island
    ctx.fillStyle = dark ? '#78350f' : '#fef9c3';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 590, 470, 0, 0, Math.PI * 2);
    ctx.fill();

    // Coconut Palm Tree Groves
    const palmColors = dark ? ['#052e16', '#064e3b'] : ['#15803d', '#16a34a'];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
      const px = cx + Math.cos(angle) * 530 + Math.sin(angle * 4) * 20;
      const py = cy + Math.sin(angle) * 420 + Math.cos(angle * 4) * 20;

      for (let c = 0; c < 3; c++) {
        const offAngle = angle + (c * 0.4);
        const cX = px + Math.cos(offAngle) * 16;
        const cY = py + Math.sin(offAngle) * 16;
        ctx.fillStyle = palmColors[c % palmColors.length];
        ctx.beginPath();
        ctx.arc(cX, cY, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // 4. FLOATING MODULAR HEX-PONTOON (AERIAL)
    ctx.fillStyle = dark ? '#334155' : '#64748b';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 580, 460, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy, 500, 380, 0, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.strokeStyle = dark ? '#1e293b' : '#475569';
    ctx.lineWidth = 2.5;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 500, cy + Math.sin(angle) * 380);
      ctx.lineTo(cx + Math.cos(angle) * 580, cy + Math.sin(angle) * 460);
      ctx.stroke();
    }

    // Heavy Slanted Steel Mooring Anchor Chains
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([6, 6]);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 580, cy + Math.sin(angle) * 460);
      ctx.lineTo(cx + Math.cos(angle) * 780, cy + Math.sin(angle) * 640);
      ctx.stroke();
    }
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);

    // 4 Radial Access Gangway Piers
    const pierW = 32;
    ctx.fillStyle = dark ? '#1e293b' : '#94a3b8';
    ctx.fillRect(cx - 580, cy - pierW / 2, -180, pierW);
    ctx.fillRect(cx + 580, cy - pierW / 2, 180, pierW);
    ctx.fillRect(cx - pierW / 2, cy - 460, pierW, -160);
    ctx.fillRect(cx - pierW / 2, cy + 460, pierW, 160);

    // Mooring Buoy Beacons with Blinking LEDs
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 5) {
      const buoyX = cx + Math.cos(angle) * 660;
      const buoyY = cy + Math.sin(angle) * 540;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(buoyX, buoyY, 7, 0, Math.PI * 2);
      ctx.fill();

      if (dark) {
        const isBlinking = Math.floor(now * 0.004 + buoyX) % 3 === 0;
        ctx.fillStyle = isBlinking ? '#facc15' : '#ea580c';
        ctx.beginPath();
        ctx.arc(buoyX, buoyY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 584, 464, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}
