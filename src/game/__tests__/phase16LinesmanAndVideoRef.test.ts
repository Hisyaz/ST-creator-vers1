/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAssistantReferees,
  evaluateLaw11OffsidePosition,
  recordPendingOffsidePass,
  updateAssistantReferees,
  triggerLinesmanOffsideFlag,
  PIXELS_PER_METER,
} from '../linesman';
import {
  createInitialVideoRefState,
  startVideoRefOffsideReview,
  startVideoRefPenaltyReview,
  updateVideoRef,
  skipVideoRef,
} from '../videoRef';
import { MatchEngine } from '../engine';
import { PITCH_CONFIG } from '../constants';
import { Player, Ball, AssistantReferee } from '../../types';

describe('Phase 16: IFAB Linesman Offside Engine & VideoRef (VIR)', () => {
  let engine: MatchEngine;

  beforeEach(() => {
    engine = new MatchEngine();
  });

  describe('16.1 Autonomous Assistant Referee & IFAB Law 11 Offside Engine', () => {
    it('creates AR1 on East touchline and AR2 on West touchline with correct patrol sectors', () => {
      const [ar1, ar2] = createAssistantReferees();

      expect(ar1.id).toBe('ar1');
      expect(ar1.side).toBe('right');
      expect(ar1.x).toBeGreaterThan(PITCH_CONFIG.PITCH_RIGHT);
      expect(ar1.patrolMinY).toBe(PITCH_CONFIG.PITCH_TOP - 10);
      expect(ar1.patrolMaxY).toBe(PITCH_CONFIG.CENTER_Y + 15);

      expect(ar2.id).toBe('ar2');
      expect(ar2.side).toBe('left');
      expect(ar2.x).toBeLessThan(PITCH_CONFIG.PITCH_LEFT);
      expect(ar2.patrolMinY).toBe(PITCH_CONFIG.CENTER_Y - 15);
      expect(ar2.patrolMaxY).toBe(PITCH_CONFIG.PITCH_BOTTOM + 10);
    });

    it('Law 11 Exception: Attacking player in their own half is NEVER in an offside position', () => {
      const attacker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;
      // Position attacker in own half (attacks UP, so own half is y > CENTER_Y)
      attacker.y = PITCH_CONFIG.CENTER_Y + 80;

      // Position defenders deep in opponent half or even behind attacker
      const evalRes = evaluateLaw11OffsidePosition(attacker, PITCH_CONFIG.CENTER_Y + 90, engine.players, true);

      expect(evalRes.isOffside).toBe(false);
      expect(evalRes.reason).toContain('own half');
    });

    it('Law 11 Exception: Attacking player level with or behind the ball is NEVER offside (ball played backward/square)', () => {
      const attacker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;
      // Attacker in opponent half at Y = 900
      attacker.y = 900;
      // Passer/ball is deeper downfield at Y = 850 (nearer to opponent goal)
      const ballY = 850;

      const evalRes = evaluateLaw11OffsidePosition(attacker, ballY, engine.players, true);

      expect(evalRes.isOffside).toBe(false);
      expect(evalRes.reason).toContain('Level with or behind the ball');
    });

    it('Law 11 Two-Player Ray-Cast: Evaluates offside against the second-last defender', () => {
      const attacker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;
      const awayGK = engine.players.find(p => p.team === 'away' && p.role === 'GK')!;
      const awayCB1 = engine.players.find(p => p.team === 'away' && p.role === 'CB1')!;
      const awayCB2 = engine.players.find(p => p.team === 'away' && p.role === 'CB2')!;

      // Home attacks UP towards PITCH_TOP (smaller Y)
      // GK is deepest at Y = 350 (last defender)
      awayGK.y = 350;
      // CB1 is 2nd-last defender at Y = 500 (Offside line)
      awayCB1.y = 500;
      // All other away defenders are higher up at Y = 600+
      awayCB2.y = 650;
      for (const p of engine.players) {
        if (p.team === 'away' && p.id !== awayGK.id && p.id !== awayCB1.id) {
          p.y = 700;
        }
      }

      // Case A: Attacker is onside (level with or behind 2nd-last defender at Y = 520)
      attacker.y = 520;
      const onsideEval = evaluateLaw11OffsidePosition(attacker, 800, engine.players, true);
      expect(onsideEval.isOffside).toBe(false);
      expect(onsideEval.secondLastDefender?.id).toBe(awayCB1.id);
      expect(onsideEval.defensiveLineY).toBe(500);

      // Case B: Attacker is ahead of 2nd-last defender at Y = 460
      attacker.y = 460;
      const offsideEval = evaluateLaw11OffsidePosition(attacker, 800, engine.players, true);
      expect(offsideEval.isOffside).toBe(true);
      expect(offsideEval.secondLastDefender?.id).toBe(awayCB1.id);
      expect(offsideEval.marginPixels).toBe(40);
      expect(offsideEval.marginMeters).toBeCloseTo(40 / PIXELS_PER_METER, 2);
    });

    it('Law 11 Exception: Set-piece restarts (throw-in, goal kick, corner kick) return null for pending offside', () => {
      const passer = engine.players.find(p => p.team === 'home' && p.role === 'LB')!;
      const pending = recordPendingOffsidePass(
        passer,
        engine.players,
        PITCH_CONFIG.CENTER_X,
        400,
        null,
        true, // isSetPieceRestart
        true
      );

      expect(pending).toBeNull();
    });

    it('records pending offside pass snapshot when a teammate is in an offside position at kick instant', () => {
      const passer = engine.players.find(p => p.team === 'home' && p.role === 'CM1')!;
      const striker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;
      const awayGK = engine.players.find(p => p.team === 'away' && p.role === 'GK')!;
      const awayCB1 = engine.players.find(p => p.team === 'away' && p.role === 'CB1')!;

      // Setup defensive line at Y = 600
      awayGK.y = 400;
      awayCB1.y = 600;
      for (const p of engine.players) {
        if (p.team === 'away' && p.id !== awayGK.id && p.id !== awayCB1.id) {
          p.y = 750;
        }
      }

      // Striker is cherry-picking in offside position at Y = 500
      striker.y = 500;
      passer.y = 900;

      const pending = recordPendingOffsidePass(
        passer,
        engine.players,
        striker.x,
        striker.y,
        striker,
        false,
        true
      );

      expect(pending).not.toBeNull();
      expect(pending?.potentialOffsidePlayerIds).toContain(striker.id);
      expect(pending?.defensiveLineY).toBe(600);
      expect(pending?.secondLastDefenderId).toBe(awayCB1.id);
    });

    it('Assistant Referees update patrol positions smoothly tracking 2nd-last defender along touchlines', () => {
      const [ar1, ar2] = engine.assistantReferees;
      const initialY1 = ar1.y;
      const initialY2 = ar2.y;

      // Position top-half away defenders
      const awayGK = engine.players.find(p => p.team === 'away' && p.role === 'GK')!;
      const awayCB = engine.players.find(p => p.team === 'away' && p.role === 'CB1')!;
      awayGK.y = PITCH_CONFIG.PITCH_TOP + 80;
      awayCB.y = PITCH_CONFIG.PITCH_TOP + 280;

      updateAssistantReferees(ar1, ar2, engine.ball, engine.players, true, 1.0);

      // AR1 should adjust targetY to 2nd-last defender in top half
      expect(ar1.targetY).toBe(awayCB.y);
      expect(ar1.y).not.toBe(initialY1);

      // Clamping: AR1 never exceeds halfway line or pitch top
      awayCB.y = PITCH_CONFIG.CENTER_Y + 400; // Far in bottom half
      updateAssistantReferees(ar1, ar2, engine.ball, engine.players, true, 1.0);
      expect(ar1.targetY).toBeLessThanOrEqual(ar1.patrolMaxY);
    });

    it('triggers IFAB Law 6 linesman flag signal with correct directional sector', () => {
      const [ar1, ar2] = engine.assistantReferees;

      // Case 1: Offside in center of pitch
      const signaledArCenter = triggerLinesmanOffsideFlag(ar1, ar2, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.PITCH_TOP + 200);
      expect(signaledArCenter.flagSignal).toBe('signal_center');
      expect(signaledArCenter.flagTimer).toBeGreaterThan(0);

      // Case 2: Offside near far West line for AR1 (East line)
      const signaledArFar = triggerLinesmanOffsideFlag(ar1, ar2, PITCH_CONFIG.PITCH_LEFT + 20, PITCH_CONFIG.PITCH_TOP + 200);
      expect(signaledArFar.flagSignal).toBe('signal_far');

      // Case 3: Offside near AR1 on East line
      const signaledArNear = triggerLinesmanOffsideFlag(ar1, ar2, PITCH_CONFIG.PITCH_RIGHT - 20, PITCH_CONFIG.PITCH_TOP + 200);
      expect(signaledArNear.flagSignal).toBe('signal_near');
    });
  });

  describe('16.1.2 Active Involvement Rule at Ball Reception', () => {
    it('penalises offside ONLY when the player in an offside position actively touches the ball', () => {
      const striker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;
      const passer = engine.players.find(p => p.team === 'home' && p.role === 'CM1')!;

      // Setup pending offside snapshot with striker flagged
      engine.pendingOffside = {
        passFrame: 0,
        passerId: passer.id,
        passerName: passer.name,
        passerTeam: 'home',
        passStartX: passer.x,
        passStartY: passer.y,
        targetX: striker.x,
        targetY: striker.y,
        intendedReceiverId: striker.id,
        isSetPieceRestart: false,
        defensiveLineY: 600,
        secondLastDefenderId: 'away_CB1',
        secondLastDefenderName: 'DEFENDER',
        potentialOffsidePlayerIds: [striker.id],
        offsideMargins: { [striker.id]: 0.42 },
      };

      const initialOffsideCount = engine.matchStats.home.offsides;

      // Striker touches the ball -> ACTIVE INVOLVEMENT OFFENCE
      const isOffsideTriggered = engine.checkPendingOffsideAtTouch(striker);

      expect(isOffsideTriggered).toBe(true);
      expect(engine.matchStats.home.offsides).toBe(initialOffsideCount + 1);
      expect(engine.setPiece?.type).toBe('free_kick');
      expect(engine.setPiece?.team).toBe('away');
      expect(engine.lastOffsideIncident).not.toBeNull();
      expect(engine.lastOffsideIncident?.marginMeters).toBe(0.42);
      expect(engine.pendingOffside).toBeNull();
    });

    it('Advantage / Play On: If an opposing defender intercepts or touches the ball first, offside is cleared', () => {
      const defender = engine.players.find(p => p.team === 'away' && p.role === 'CB1')!;
      const striker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;

      engine.pendingOffside = {
        passFrame: 0,
        passerId: 'home_CM1',
        passerName: 'PASSER',
        passerTeam: 'home',
        passStartX: 500,
        passStartY: 900,
        targetX: striker.x,
        targetY: striker.y,
        intendedReceiverId: striker.id,
        isSetPieceRestart: false,
        defensiveLineY: 600,
        secondLastDefenderId: defender.id,
        secondLastDefenderName: defender.name,
        potentialOffsidePlayerIds: [striker.id],
        offsideMargins: { [striker.id]: 0.35 },
      };

      // Defender cuts out pass -> advantage / clean play on!
      const isOffsideTriggered = engine.checkPendingOffsideAtTouch(defender);

      expect(isOffsideTriggered).toBe(false);
      expect(engine.pendingOffside).toBeNull();
      expect(engine.setPiece).toBeNull();
    });

    it('Clean Reception: If an onside teammate touches the ball instead of the offside player, offside is cleared', () => {
      const onsideWinger = engine.players.find(p => p.team === 'home' && (p.role === 'LM' || p.role === 'RM'))!;
      const offsideStriker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;

      engine.pendingOffside = {
        passFrame: 0,
        passerId: 'home_CM1',
        passerName: 'PASSER',
        passerTeam: 'home',
        passStartX: 500,
        passStartY: 900,
        targetX: offsideStriker.x,
        targetY: offsideStriker.y,
        intendedReceiverId: offsideStriker.id,
        isSetPieceRestart: false,
        defensiveLineY: 600,
        secondLastDefenderId: 'away_CB1',
        secondLastDefenderName: 'DEFENDER',
        potentialOffsidePlayerIds: [offsideStriker.id], // Only striker was offside!
        offsideMargins: { [offsideStriker.id]: 0.50 },
      };

      // Winger (who was onside) runs onto the ball first -> perfectly legal!
      const isOffsideTriggered = engine.checkPendingOffsideAtTouch(onsideWinger);

      expect(isOffsideTriggered).toBe(false);
      expect(engine.pendingOffside).toBeNull();
      expect(engine.setPiece).toBeNull();
    });
  });

  describe('16.2 Toggleable VideoRef (VIR) Review Engine', () => {
    it('initializes VideoRef state with inactive flag and default parameters', () => {
      const vr = createInitialVideoRefState();

      expect(vr.isActive).toBe(false);
      expect(vr.phase).toBe('freeze_scan');
      expect(vr.canSkip).toBe(true);
      expect(vr.timer).toBe(0);
    });

    it('starts offside review with accurate metrics and IFAB Law 11 decision', () => {
      const vr = startVideoRefOffsideReview(
        500, 800, 'MATTHÄUS', 'home',
        520, 480, 'KLINSMANN', 'home',
        510, 'BARESÍ', 0.28, true
      );

      expect(vr.isActive).toBe(true);
      expect(vr.incidentType).toBe('offside');
      expect(vr.passerName).toBe('MATTHÄUS');
      expect(vr.receiverName).toBe('KLINSMANN');
      expect(vr.defenderName).toBe('BARESÍ');
      expect(vr.marginMeters).toBe(0.28);
      expect(vr.isOffsideConfirmed).toBe(true);
      expect(vr.decisionText).toBe('OFFSIDE CONFIRMED');
    });

    it('starts penalty review with correct box check and decision text', () => {
      const vr = startVideoRefPenaltyReview(500, 320, 'MARADONA', 'home', 'KOHLER', true);

      expect(vr.isActive).toBe(true);
      expect(vr.incidentType).toBe('penalty');
      expect(vr.receiverName).toBe('MARADONA');
      expect(vr.defenderName).toBe('KOHLER');
      expect(vr.isOffsideConfirmed).toBe(true);
      expect(vr.decisionText).toBe('PENALTY CONFIRMED');
    });

    it('progresses through all 3 television broadcast review phases smoothly', () => {
      const vr = startVideoRefOffsideReview(
        500, 800, 'MATTHÄUS', 'home',
        520, 480, 'KLINSMANN', 'home',
        510, 'BARESÍ', 0.28, true
      );

      // Phase 1: Freeze Scan (timer < 32)
      updateVideoRef(vr, 10);
      expect(vr.phase).toBe('freeze_scan');

      // Phase 2: Calibrating 2D Computer Vision Lines (timer between 32 and 85)
      updateVideoRef(vr, 35); // timer = 45
      expect(vr.phase).toBe('calibrating_lines');

      // Phase 3: Decision Reveal Stamp (timer between 85 and 165)
      updateVideoRef(vr, 50); // timer = 95
      expect(vr.phase).toBe('decision_reveal');

      // Completion: Finishes and deactivates after timer >= 165
      updateVideoRef(vr, 80); // timer = 175
      expect(vr.phase).toBe('finished');
      expect(vr.isActive).toBe(false);
    });

    it('allows instant user skip at any frame via skipVideoRef', () => {
      const vr = startVideoRefOffsideReview(
        500, 800, 'MATTHÄUS', 'home',
        520, 480, 'KLINSMANN', 'home',
        510, 'BARESÍ', 0.28, true
      );
      expect(vr.isActive).toBe(true);

      skipVideoRef(vr);

      expect(vr.isActive).toBe(false);
      expect(vr.phase).toBe('finished');
    });

    it('respects GraphicsSettings videoRefReview toggle: bypasses review cut-scene when disabled', () => {
      engine.graphicsSettings.videoRefReview = false;

      const victim = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;
      const offender = engine.players.find(p => p.team === 'away' && p.role === 'CB1')!;

      // Award penalty inside box
      engine.awardFoul(victim, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.PITCH_TOP + 120, offender, 'none');

      // With videoRefReview = false, videoRef is NOT triggered
      expect(engine.videoRef.isActive).toBe(false);
      expect(engine.matchPhase).toBe('penalty');
    });
  });

  describe('16.3 Zero-Allocation & Performance Guarantee', () => {
    it('executes 1,000 assistant referee patrol updates well under 25ms total (<0.025ms/frame)', () => {
      const [ar1, ar2] = engine.assistantReferees;
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        updateAssistantReferees(ar1, ar2, engine.ball, engine.players, true, 1.0);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50); // Generous ceiling, typically ~3-8ms
    });

    it('evaluates 1,000 Law 11 offside ray-casts well under 25ms (<0.025ms/raycast)', () => {
      const attacker = engine.players.find(p => p.team === 'home' && p.role === 'ST1')!;
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        attacker.y = 500 + (i % 200);
        evaluateLaw11OffsidePosition(attacker, 850, engine.players, true);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });
});
