/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoRefState, TeamSide } from '../types';
import { audio } from './audio';

export function createInitialVideoRefState(): VideoRefState {
  return {
    isActive: false,
    phase: 'freeze_scan',
    timer: 0,
    incidentType: 'offside',
    passStartX: 0,
    passStartY: 0,
    passerName: '',
    passerTeam: 'home',
    receiverX: 0,
    receiverY: 0,
    receiverName: '',
    receiverTeam: 'away',
    defensiveLineY: 0,
    defenderName: 'DEFENDER',
    marginMeters: 0,
    isOffsideConfirmed: true,
    decisionText: 'OFFSIDE CONFIRMED',
    zoomLevel: 1.0,
    canSkip: true,
  };
}

export function startVideoRefOffsideReview(
  passStartX: number,
  passStartY: number,
  passerName: string,
  passerTeam: TeamSide,
  receiverX: number,
  receiverY: number,
  receiverName: string,
  receiverTeam: TeamSide,
  defensiveLineY: number,
  defenderName: string = 'LAST DEFENDER',
  marginMeters: number = 0.28,
  isOffsideConfirmed: boolean = true
): VideoRefState {
  audio.playWhistle(true);

  return {
    isActive: true,
    phase: 'freeze_scan',
    timer: 0,
    incidentType: 'offside',
    passStartX,
    passStartY,
    passerName: passerName.toUpperCase(),
    passerTeam,
    receiverX,
    receiverY,
    receiverName: receiverName.toUpperCase(),
    receiverTeam,
    defensiveLineY,
    defenderName: defenderName.toUpperCase(),
    marginMeters,
    isOffsideConfirmed,
    decisionText: isOffsideConfirmed ? 'OFFSIDE CONFIRMED' : 'ONSIDE - PLAY ON',
    zoomLevel: 1.0,
    canSkip: true,
  };
}

export function startVideoRefPenaltyReview(
  foulX: number,
  foulY: number,
  victimName: string,
  victimTeam: TeamSide,
  offenderName: string,
  isInsidePenaltyBox: boolean = true
): VideoRefState {
  audio.playWhistle(true);

  return {
    isActive: true,
    phase: 'freeze_scan',
    timer: 0,
    incidentType: 'penalty',
    passStartX: foulX,
    passStartY: foulY,
    passerName: offenderName.toUpperCase(),
    passerTeam: victimTeam === 'home' ? 'away' : 'home',
    receiverX: foulX,
    receiverY: foulY,
    receiverName: victimName.toUpperCase(),
    receiverTeam: victimTeam,
    defensiveLineY: foulY,
    defenderName: offenderName.toUpperCase(),
    marginMeters: 0,
    isOffsideConfirmed: isInsidePenaltyBox,
    decisionText: isInsidePenaltyBox ? 'PENALTY CONFIRMED' : 'OUTSIDE BOX - FREE KICK',
    zoomLevel: 1.0,
    canSkip: true,
  };
}

export function updateVideoRef(state: VideoRefState, timeScale: number = 1): boolean {
  if (!state.isActive) return false;

  state.timer += timeScale;

  // Phase sequencing
  if (state.timer < 32) {
    state.phase = 'freeze_scan';
    state.zoomLevel = 1.0 + (state.timer / 32) * 0.12;
  } else if (state.timer < 85) {
    state.phase = 'calibrating_lines';
    state.zoomLevel = 1.12;
  } else if (state.timer < 165) {
    state.phase = 'decision_reveal';
    state.zoomLevel = 1.12;
  } else {
    state.phase = 'finished';
    state.isActive = false;
    return false;
  }

  return true;
}

export function skipVideoRef(state: VideoRefState): void {
  state.isActive = false;
  state.phase = 'finished';
  state.timer = 999;
}

/**
 * 32-Bit Arcade VideoRef (VIR) Monitor Replay Overlay:
 * Renders an authentic late-90s/early-2000s referee TV monitor review cut-scene:
 * - Gunmetal metallic beveled monitor frame with corner hex rivets
 * - Calibrated 2D computer vision lines across the pitch turf
 * - Digital millimeter margin measurement readout
 * - IFAB Law 11 decision stamp and skip prompt
 */
export function drawVideoRefOverlay(
  ctx: CanvasRenderingContext2D,
  state: VideoRefState,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!state.isActive) return;

  ctx.save();

  // Dim the background pitch slightly to focus on the VIR monitor
  ctx.fillStyle = 'rgba(5, 8, 17, 0.65)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Center monitor box dimensions
  const monitorWidth = Math.min(canvasWidth * 0.88, 760);
  const monitorHeight = Math.min(canvasHeight * 0.62, 420);
  const monX = (canvasWidth - monitorWidth) / 2;
  const monY = (canvasHeight - monitorHeight) / 2;

  // 1. Monitor Chassis (Metallic Chiseled Bevel)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(monX, monY, monitorWidth, monitorHeight);

  // Metallic border
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.strokeRect(monX, monY, monitorWidth, monitorHeight);

  // Inner inset border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(monX + 4, monY + 4, monitorWidth - 8, monitorHeight - 8);

  // Corner Rivets (Brushed Gold)
  const drawRivet = (rx: number, ry: number) => {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#713f12';
    ctx.beginPath();
    ctx.arc(rx + 1, ry + 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawRivet(monX + 10, monY + 10);
  drawRivet(monX + monitorWidth - 10, monY + 10);
  drawRivet(monX + 10, monY + monitorHeight - 10);
  drawRivet(monX + monitorWidth - 10, monY + monitorHeight - 10);

  // 2. Top Broadcast Header Bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(monX + 6, monY + 6, monitorWidth - 12, 38);
  ctx.fillStyle = '#334155';
  ctx.fillRect(monX + 6, monY + 44, monitorWidth - 12, 2);

  // Glowing Red / Amber Recording Indicator
  const isBlink = Math.floor(state.timer / 12) % 2 === 0;
  ctx.fillStyle = isBlink ? '#ef4444' : '#7f1d1d';
  ctx.beginPath();
  ctx.arc(monX + 26, monY + 25, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('VIR // IFAB LAW 11 REVIEW', monX + 42, monY + 28);

  ctx.font = '11px "Outfit", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText('CAM 02 - TACTICAL HIGH SIGHTLINE', monX + monitorWidth - 24, monY + 28);
  ctx.textAlign = 'left';

  // 3. Screen Viewport (Simulated pitch review camera with scanlines)
  const viewX = monX + 14;
  const viewY = monY + 52;
  const viewW = monitorWidth - 28;
  const viewH = monitorHeight - 110;

  // Viewport background: Pitch turf gradient
  const turfGrad = ctx.createLinearGradient(viewX, viewY, viewX, viewY + viewH);
  turfGrad.addColorStop(0, '#14532d');
  turfGrad.addColorStop(0.5, '#166534');
  turfGrad.addColorStop(1, '#15803d');
  ctx.fillStyle = turfGrad;
  ctx.fillRect(viewX, viewY, viewW, viewH);

  // Mowing lawn bands
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let ly = viewY; ly < viewY + viewH; ly += 24) {
    ctx.fillRect(viewX, ly, viewW, 12);
  }

  // Scanline overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let sy = viewY; sy < viewY + viewH; sy += 3) {
    ctx.fillRect(viewX, sy, viewW, 1);
  }

  // Crosshair in center
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(viewX + viewW / 2, viewY);
  ctx.lineTo(viewX + viewW / 2, viewY + viewH);
  ctx.moveTo(viewX, viewY + viewH / 2);
  ctx.lineTo(viewX + viewW, viewY + viewH / 2);
  ctx.stroke();

  // 4. Calibrated 2D Lines (The core IFAB Computer Vision Visual)
  if (state.phase === 'calibrating_lines' || state.phase === 'decision_reveal') {
    const centerY = viewY + viewH * 0.48;
    const defLineScreenY = centerY - 28;
    const offsideMarginPx = Math.min(75, Math.max(16, state.marginMeters * 38));
    const attLineScreenY = defLineScreenY - offsideMarginPx;

    // Translucent offside zone corridor
    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.fillRect(viewX, attLineScreenY, viewW, defLineScreenY - attLineScreenY);

    // Diagonal warning stripes in corridor
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let sx = viewX - 40; sx < viewX + viewW + 40; sx += 20) {
      ctx.moveTo(sx, defLineScreenY);
      ctx.lineTo(sx + 18, attLineScreenY);
    }
    ctx.stroke();

    // Line 1: Defensive Line (CYAN #38bdf8)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(viewX, defLineScreenY);
    ctx.lineTo(viewX + viewW, defLineScreenY);
    ctx.stroke();

    // Defensive line label badge
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(viewX + 16, defLineScreenY - 10, 150, 18);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`DEF: ${state.defenderName.slice(0, 12)}`, viewX + 22, defLineScreenY + 3);

    // Line 2: Attacker Offside Line (RED / MAGENTA #f43f5e)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(viewX, attLineScreenY);
    ctx.lineTo(viewX + viewW, attLineScreenY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Attacker line label badge
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(viewX + 16, attLineScreenY - 10, 150, 18);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ATT: ${state.receiverName.slice(0, 12)}`, viewX + 22, attLineScreenY + 3);

    // Digital Millimeter Margin Callout on Right
    const calloutX = viewX + viewW - 200;
    const calloutY = (defLineScreenY + attLineScreenY) / 2 - 16;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(calloutX, calloutY, 184, 32);
    ctx.strokeStyle = state.isOffsideConfirmed ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(calloutX, calloutY, 184, 32);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = state.isOffsideConfirmed ? '#f87171' : '#4ade80';
    const sign = state.isOffsideConfirmed ? '+' : '-';
    ctx.fillText(`MARGIN: ${sign}${state.marginMeters.toFixed(2)}m`, calloutX + 10, calloutY + 20);
  }

  // 5. Decision Reveal Stamp
  if (state.phase === 'decision_reveal') {
    const stampW = Math.min(viewW * 0.72, 420);
    const stampH = 54;
    const stampX = viewX + (viewW - stampW) / 2;
    const stampY = viewY + viewH / 2 - 27;

    ctx.fillStyle = state.isOffsideConfirmed
      ? 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)'
      : 'linear-gradient(180deg, #166534 0%, #052e16 100%)';
    ctx.fillRect(stampX, stampY, stampW, stampH);

    ctx.strokeStyle = state.isOffsideConfirmed ? '#f87171' : '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(stampX, stampY, stampW, stampH);

    ctx.textAlign = 'center';
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.decisionText, stampX + stampW / 2, stampY + 28);

    ctx.font = '10px "Outfit", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const subtext = state.isOffsideConfirmed
      ? 'INDIRECT FREE KICK AWARDED TO DEFENDING TEAM'
      : 'GOAL CONFIRMED // NO OFFENCE';
    ctx.fillText(subtext, stampX + stampW / 2, stampY + 44);
    ctx.textAlign = 'left';
  } else if (state.phase === 'freeze_scan') {
    // Scanning banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(viewX + 20, viewY + viewH - 42, viewW - 40, 28);
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CALIBRATING 2D FIELD METRICS...', viewX + 36, viewY + viewH - 24);
  }

  // 6. Bottom Console Action Bar with Instant Skip Prompt
  const botY = monY + monitorHeight - 48;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(monX + 6, botY, monitorWidth - 12, 42);

  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#facc15';
  ctx.fillText('▶ PRESS SPACE OR TAP SCREEN TO RESUME', monX + 24, botY + 26);

  ctx.font = '11px "Outfit", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText('IFAB LAW 11 PROTOCOL', monX + monitorWidth - 24, botY + 26);
  ctx.textAlign = 'left';

  ctx.restore();
}
