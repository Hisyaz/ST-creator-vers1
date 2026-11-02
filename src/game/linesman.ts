/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, Ball, TeamSide, AssistantReferee, LinesmanFlagSignal, PendingOffsidePass } from '../types';
import { PITCH_CONFIG } from './constants';

// Pitch scaling constant: 3100 virtual pitch height units / 105 IFAB meters ≈ 29.5 px/m
export const PIXELS_PER_METER = 29.5;

/**
 * Initializes the two official Assistant Referees (Linesmen):
 * - AR1 patrols the Right Touchline (patrolling the top half defending line, from PITCH_TOP to CENTER_Y)
 * - AR2 patrols the Left Touchline (patrolling the bottom half defending line, from CENTER_Y to PITCH_BOTTOM)
 */
export function createAssistantReferees(): [AssistantReferee, AssistantReferee] {
  const ar1: AssistantReferee = {
    id: 'ar1',
    name: 'Assistant Referee 1 (East Touchline)',
    side: 'right',
    x: PITCH_CONFIG.PITCH_RIGHT + 14,
    y: PITCH_CONFIG.PITCH_TOP + 160,
    vx: 0,
    vy: 0,
    targetY: PITCH_CONFIG.PITCH_TOP + 160,
    patrolMinY: PITCH_CONFIG.PITCH_TOP - 10,
    patrolMaxY: PITCH_CONFIG.CENTER_Y + 15,
    facingAngle: Math.PI, // Facing West into pitch
    flagSignal: 'neutral',
    flagTimer: 0,
    animFrame: 0,
    animTimer: 0,
  };

  const ar2: AssistantReferee = {
    id: 'ar2',
    name: 'Assistant Referee 2 (West Touchline)',
    side: 'left',
    x: PITCH_CONFIG.PITCH_LEFT - 14,
    y: PITCH_CONFIG.PITCH_BOTTOM - 160,
    vx: 0,
    vy: 0,
    targetY: PITCH_CONFIG.PITCH_BOTTOM - 160,
    patrolMinY: PITCH_CONFIG.CENTER_Y - 15,
    patrolMaxY: PITCH_CONFIG.PITCH_BOTTOM + 10,
    facingAngle: 0, // Facing East into pitch
    flagSignal: 'neutral',
    flagTimer: 0,
    animFrame: 0,
    animTimer: 0,
  };

  return [ar1, ar2];
}

export interface Law11Evaluation {
  isOffside: boolean;
  defensiveLineY: number;
  marginMeters: number;
  marginPixels: number;
  secondLastDefender: Player | null;
  lastDefender: Player | null;
  reason: string;
}

/**
 * IFAB Law 11 Ray-Cast:
 * Evaluates whether an attacking player is in an offside position at the exact moment the ball is played.
 *
 * Core Law 11 Rules:
 * 1. Must be in opponent's half (excluding halfway line).
 * 2. Must be nearer to opponent's goal line than the ball (level with or behind ball is strictly onside).
 * 3. Must be nearer to opponent's goal line than the second-last opponent (the 2nd-last defender or GK).
 * 4. Exceptions: Direct from Throw-In, Goal Kick, Corner Kick, or deliberate opponent touch -> NEVER OFFSIDE.
 */
export function evaluateLaw11OffsidePosition(
  attacker: Player,
  ballY: number,
  allPlayers: Player[],
  isAttackingUp: boolean
): Law11Evaluation {
  const centerY = PITCH_CONFIG.CENTER_Y;

  // 1. Own Half Exception: A player is NOT in an offside position if in their own half
  const inOpponentHalf = isAttackingUp
    ? attacker.y < centerY - 2
    : attacker.y > centerY + 2;

  if (!inOpponentHalf) {
    return {
      isOffside: false,
      defensiveLineY: centerY,
      marginMeters: 0,
      marginPixels: 0,
      secondLastDefender: null,
      lastDefender: null,
      reason: 'In own half or on halfway line',
    };
  }

  // 2. Ball Ray-Cast Exception: Level with or behind the ball is NOT offside (ball played backward / square)
  const isAheadOfBall = isAttackingUp
    ? attacker.y < ballY - 2
    : attacker.y > ballY + 2;

  if (!isAheadOfBall) {
    return {
      isOffside: false,
      defensiveLineY: ballY,
      marginMeters: 0,
      marginPixels: 0,
      secondLastDefender: null,
      lastDefender: null,
      reason: 'Level with or behind the ball',
    };
  }

  // 3. Two-Player Offside Ray-Cast: Find the 2nd-last defending opponent
  const defendingOpponents = allPlayers.filter(
    (p) => p.team !== attacker.team && !p.isRedCarded
  );

  if (defendingOpponents.length < 2) {
    // If fewer than 2 opponents on pitch, cannot be offside
    return {
      isOffside: false,
      defensiveLineY: isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM,
      marginMeters: 0,
      marginPixels: 0,
      secondLastDefender: null,
      lastDefender: null,
      reason: 'Fewer than 2 opponents active',
    };
  }

  // Sort opponents by distance to defending goal line:
  // - If attacker attacks UP, defending goal is at PITCH_TOP (smallest Y) -> sort ascending
  // - If attacker attacks DOWN, defending goal is at PITCH_BOTTOM (largest Y) -> sort descending
  if (isAttackingUp) {
    defendingOpponents.sort((a, b) => a.y - b.y);
  } else {
    defendingOpponents.sort((a, b) => b.y - a.y);
  }

  const lastDefender = defendingOpponents[0]; // Deepest defender (usually GK)
  const secondLastDefender = defendingOpponents[1]; // The offside line!
  const defLineY = secondLastDefender.y;

  // 4. Compare Attacker Position against the Second-Last Defender
  const isAheadOfDefLine = isAttackingUp
    ? attacker.y < defLineY - 2
    : attacker.y > defLineY + 2;

  const marginPixels = isAttackingUp
    ? defLineY - attacker.y
    : attacker.y - defLineY;

  const marginMeters = Math.round((marginPixels / PIXELS_PER_METER) * 100) / 100;

  if (isAheadOfDefLine) {
    return {
      isOffside: true,
      defensiveLineY: defLineY,
      marginMeters: Math.max(0.01, marginMeters),
      marginPixels,
      secondLastDefender,
      lastDefender,
      reason: `Ahead of second-last defender (${secondLastDefender.name}) by ${marginMeters.toFixed(2)}m`,
    };
  }

  return {
    isOffside: false,
    defensiveLineY: defLineY,
    marginMeters,
    marginPixels,
    secondLastDefender,
    lastDefender,
    reason: `Level or behind second-last defender (${secondLastDefender.name})`,
  };
}

/**
 * Creates a PendingOffsidePass snapshot at the exact moment a pass is kicked.
 * Under modern IFAB Law 11, players in an offside position are not penalised until
 * they become actively involved in play (by touching/playing the ball).
 */
export function recordPendingOffsidePass(
  passer: Player,
  allPlayers: Player[],
  passTargetX: number,
  passTargetY: number,
  intendedReceiver: Player | null,
  isSetPieceRestart: boolean = false,
  isAttackingUp: boolean = true
): PendingOffsidePass | null {
  // IFAB Law 11: There is NO offside offence directly from a throw-in, goal kick, or corner kick
  if (isSetPieceRestart) {
    return null;
  }

  // Determine the true defensive line from the 2nd-last defending opponent
  const defendingOpponents = allPlayers.filter(
    (p) => p.team !== passer.team && !p.isRedCarded
  );
  if (isAttackingUp) {
    defendingOpponents.sort((a, b) => a.y - b.y);
  } else {
    defendingOpponents.sort((a, b) => b.y - a.y);
  }

  const secondLastDefender = defendingOpponents.length >= 2 ? defendingOpponents[1] : (defendingOpponents[0] || null);
  const defLineY = secondLastDefender ? secondLastDefender.y : (isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM);
  const secondLastDefId = secondLastDefender ? secondLastDefender.id : '';
  const secondLastDefName = secondLastDefender ? secondLastDefender.name : 'DEFENDER';

  // Find all teammates of the passer who are in an offside position at this precise kick frame
  const teammates = allPlayers.filter(
    (p) => p.team === passer.team && p.id !== passer.id && !p.isRedCarded
  );

  const potentialOffsidePlayerIds: string[] = [];
  const offsideMargins: Record<string, number> = {};

  for (const mate of teammates) {
    const evalResult = evaluateLaw11OffsidePosition(mate, passer.y, allPlayers, isAttackingUp);
    if (evalResult.isOffside) {
      potentialOffsidePlayerIds.push(mate.id);
      offsideMargins[mate.id] = evalResult.marginMeters;
    }
  }

  if (potentialOffsidePlayerIds.length === 0) {
    return null; // All teammates were clean/onside at pass release!
  }

  return {
    passFrame: 0,
    passerId: passer.id,
    passerName: passer.name,
    passerTeam: passer.team,
    passStartX: passer.x,
    passStartY: passer.y,
    targetX: passTargetX,
    targetY: passTargetY,
    intendedReceiverId: intendedReceiver ? intendedReceiver.id : null,
    isSetPieceRestart: false,
    defensiveLineY: defLineY,
    secondLastDefenderId: secondLastDefId,
    secondLastDefenderName: secondLastDefName,
    potentialOffsidePlayerIds,
    offsideMargins,
  };
}

/**
 * Updates linesman positioning along the touchlines:
 * - AR1 patrols the right touchline, positioning level with the second-last defender in the top half
 * - AR2 patrols the left touchline, positioning level with the second-last defender in the bottom half
 * - If the ball is closer to the defending endline than the second-last defender, AR tracks the ball
 */
export function updateAssistantReferees(
  ar1: AssistantReferee,
  ar2: AssistantReferee,
  ball: Ball,
  allPlayers: Player[],
  homeAttacksUp: boolean,
  timeScale: number = 1
): void {
  // Resolve defending lines for both halves:
  // TOP HALF (near PITCH_TOP): Defending team is away (if homeAttacksUp) else home
  const topDefendingTeam: TeamSide = homeAttacksUp ? 'away' : 'home';
  const bottomDefendingTeam: TeamSide = homeAttacksUp ? 'home' : 'away';

  // 1. Calculate offside line in Top Half for AR1
  const topDefenders = allPlayers.filter(
    (p) => p.team === topDefendingTeam && !p.isRedCarded
  );
  let topOffsideLineY = PITCH_CONFIG.PITCH_TOP + 120;
  if (topDefenders.length >= 2) {
    // Top defending goal is at PITCH_TOP -> sort ascending Y
    topDefenders.sort((a, b) => a.y - b.y);
    topOffsideLineY = topDefenders[1].y; // 2nd-last defender
  }
  // If ball is closer to top goal line than 2nd-last defender, AR tracks ball
  if (ball.y < topOffsideLineY && ball.y > PITCH_CONFIG.PITCH_TOP) {
    topOffsideLineY = ball.y;
  }
  // Clamp to AR1's patrol sector (PITCH_TOP to CENTER_Y)
  ar1.targetY = Math.max(ar1.patrolMinY, Math.min(ar1.patrolMaxY, topOffsideLineY));

  // 2. Calculate offside line in Bottom Half for AR2
  const bottomDefenders = allPlayers.filter(
    (p) => p.team === bottomDefendingTeam && !p.isRedCarded
  );
  let bottomOffsideLineY = PITCH_CONFIG.PITCH_BOTTOM - 120;
  if (bottomDefenders.length >= 2) {
    // Bottom defending goal is at PITCH_BOTTOM -> sort descending Y
    bottomDefenders.sort((a, b) => b.y - a.y);
    bottomOffsideLineY = bottomDefenders[1].y; // 2nd-last defender
  }
  // If ball is closer to bottom goal line than 2nd-last defender, AR tracks ball
  if (ball.y > bottomOffsideLineY && ball.y < PITCH_CONFIG.PITCH_BOTTOM) {
    bottomOffsideLineY = ball.y;
  }
  // Clamp to AR2's patrol sector (CENTER_Y to PITCH_BOTTOM)
  ar2.targetY = Math.max(ar2.patrolMinY, Math.min(ar2.patrolMaxY, bottomOffsideLineY));

  // Update physical positions & running animations
  updateSingleLinesman(ar1, ball, timeScale);
  updateSingleLinesman(ar2, ball, timeScale);
}

function updateSingleLinesman(ar: AssistantReferee, ball: Ball, timeScale: number) {
  const dy = ar.targetY - ar.y;
  const dist = Math.abs(dy);

  if (dist > 3) {
    const moveSpeed = Math.min(3.8, dist * 0.45);
    ar.vy = (dy > 0 ? 1 : -1) * moveSpeed;
    ar.y += ar.vy * timeScale;

    // Running cadence
    ar.animTimer += timeScale;
    if (ar.animTimer > 5) {
      ar.animTimer = 0;
      ar.animFrame = (ar.animFrame + 1) % 4;
    }
  } else {
    ar.vy = 0;
    ar.animFrame = 0;
  }

  // Face into the pitch toward the ball
  ar.facingAngle = ar.side === 'right' ? Math.PI : 0;

  // Signal timer countdown
  if (ar.flagTimer > 0) {
    ar.flagTimer = Math.max(0, ar.flagTimer - timeScale);
    if (ar.flagTimer === 0) {
      ar.flagSignal = 'neutral';
    }
  }
}

/**
 * Triggers the official IFAB Law 6 linesman flag signal for offside:
 * 1. Attracts referee's attention by holding flag straight up above head (raised_vertical).
 * 2. Indicates location of the offence across the width of the pitch:
 *    - Far side from linesman -> signal_far (45° upward)
 *    - Center of pitch -> signal_center (horizontal 90°)
 *    - Near side to linesman -> signal_near (45° downward)
 */
export function triggerLinesmanOffsideFlag(
  ar1: AssistantReferee,
  ar2: AssistantReferee,
  spotX: number,
  spotY: number
): AssistantReferee {
  // Choose responsible linesman based on pitch half
  const ar = spotY < PITCH_CONFIG.CENTER_Y ? ar1 : ar2;

  const pitchLeft = PITCH_CONFIG.PITCH_LEFT;
  const pitchWidth = PITCH_CONFIG.FIELD_WIDTH;
  const relativeX = spotX - pitchLeft; // 0 to pitchWidth

  let signal: LinesmanFlagSignal = 'signal_center';

  if (ar.side === 'right') {
    // AR is on the East touchline (right)
    if (relativeX < pitchWidth * 0.33) {
      signal = 'signal_far'; // Across on West side
    } else if (relativeX > pitchWidth * 0.67) {
      signal = 'signal_near'; // Right near East line
    } else {
      signal = 'signal_center';
    }
  } else {
    // AR is on the West touchline (left)
    if (relativeX > pitchWidth * 0.67) {
      signal = 'signal_far'; // Across on East side
    } else if (relativeX < pitchWidth * 0.33) {
      signal = 'signal_near'; // Right near West line
    } else {
      signal = 'signal_center';
    }
  }

  ar.flagSignal = signal;
  ar.flagTimer = 160; // Hold signal for ~2.6 seconds

  return ar;
}
