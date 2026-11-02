/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Building2,
  ZoomIn,
  ZoomOut,
  Focus,
  Scan,
  Video,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Save,
  Play,
  X,
  Layers,
  Palette,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Shield,
  Trophy,
  Sliders,
  Maximize2,
  Compass,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  Move,
  Plane,
  Anchor,
  Trees,
  Train,
  Car,
  Armchair,
  DoorOpen,
  Users,
} from 'lucide-react';
import {
  StadiumDefinition,
  StadiumShape,
  StandGrade,
  SurroundingsType,
  ApronMaterial,
  ApronSetback,
  BenchType,
  BenchQualityTier,
  TunnelType,
  TunnelSiting,
  FifaQualification,
  StandPosition,
  StandConfig,
  TierSize,
  WallTierSize,
  SeatPattern,
  SeatStyle,
  NoStandBackdrop,
  WallSize,
  WallMaterial,
  PerimeterFinishType,
  calculateStadiumTotalCapacity,
  calculateFifaQualification,
  getBackdropsForSurroundings,
  getTierChairRows,
  StadiumGroundsType,
  GroundsOption,
  getGroundsForSurroundings,
  getDefaultGroundsForSurroundings,
  TierBalustradeStyle,
  StandDeckMaterial,
  RearWallMaterial,
  RoofCutawayMode,
  RoofStyle,
  RoofMaterial,
  RoofBorder,
  RoofConfig,
  ROOF_CUTAWAY_OPTIONS,
  ROOF_STYLE_OPTIONS,
  ROOF_MATERIAL_OPTIONS,
  ROOF_BORDER_OPTIONS,
  ROUND_OVAL_ROOF_STYLE_OPTIONS,
  ROUND_OVAL_ROOF_MATERIAL_OPTIONS,
  ROUND_OVAL_ROOF_BORDER_OPTIONS,
  isRoundOrOvalShape,
  getRoofStylesForShape,
  getRoofMaterialsForShape,
  getRoofBordersForShape,
  getDefaultRoofConfig,
  getContextualPerimeters,
  getDefaultPerimeterForContext,
  PerimeterOption,
  SeatArchetype,
  SEAT_ARCHETYPE_OPTIONS,
  ZOOM_SNAP_PRESETS,
  ZoomPreset,
  GrandstandMaterial,
  CANONICAL_B3_MATERIALS,
  resolveGrandstandMaterial,
  CardinalDirection,
  CARDINAL_GROUND_ROLES,
  B4_GROUND_FLAVORS,
  getCardinalGroundRole,
  getGroundFlavorDetail,
  B5_HORIZON_FEATURES,
  resolveMarineGroundArchetype,
} from '../types/stadium';
import {
  StadiumCameraPerspective,
  StandInspectionPosition,
  getStadiumCameraTarget,
  lerpCamera,
  CameraTarget,
} from '../game/stadiumCamera';
import {
  drawPerimeterHorizon,
  drawStadiumArchitecture,
  drawArchitecturalRoofShadows,
  drawTimeOfDayAtmosphere,
} from '../game/stadiumRenderer';
import { drawAerialSkyCam } from '../game/skyCamRenderer';
import {
  createDefaultStadium,
  saveCustomStadium,
  getStadiumById,
} from '../game/stadiumRegistry';
import { audio } from '../game/audio';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../game/constants';
import { LawnMowingPattern, TurfQuality, TimeOfDay, PitchDimensionPreset } from '../types';
import { resolvePitchMetrics } from '../game/pitchDimensions';

export const CLOCKWISE_STANDS: {
  id: StandPosition;
  shortLabel: string;
  badge: string;
  name: string;
  desc: string;
}[] = [
  { id: 'corner_ne', shortLabel: 'C1 (NE)', badge: 'NE', name: 'Corner 1 (NE)', desc: 'Top-Right Corner Stand uniting East and North stands' },
  { id: 'east', shortLabel: 'EAST', badge: 'E', name: 'East Stand', desc: 'Right Touchline Main/Visitor Stand' },
  { id: 'corner_se', shortLabel: 'C2 (SE)', badge: 'SE', name: 'Corner 2 (SE)', desc: 'Bottom-Right Corner Stand uniting East and South stands' },
  { id: 'south', shortLabel: 'SOUTH', badge: 'S', name: 'South Stand', desc: 'Bottom Goal Stand (behind South goal)' },
  { id: 'corner_sw', shortLabel: 'C3 (SW)', badge: 'SW', name: 'Corner 3 (SW)', desc: 'Bottom-Left Corner Stand uniting West and South stands' },
  { id: 'west', shortLabel: 'WEST', badge: 'W', name: 'West Stand', desc: 'Left Touchline Main Stand (dugout benches and tunnel walkout)' },
  { id: 'corner_nw', shortLabel: 'C4 (NW)', badge: 'NW', name: 'Corner 4 (NW)', desc: 'Top-Left Corner Stand uniting West and North stands' },
  { id: 'north', shortLabel: 'NORTH', badge: 'N', name: 'North Stand', desc: 'Top Goal Stand (behind North goal)' },
];

export const CARDINAL_STANDS: {
  id: StandPosition;
  shortLabel: string;
  badge: string;
  name: string;
  desc: string;
}[] = [
  { id: 'west', shortLabel: 'WEST', badge: 'W', name: 'West Stand', desc: 'West Coliseum Sector (touchline benches and main tunnel)' },
  { id: 'north', shortLabel: 'NORTH', badge: 'N', name: 'North Stand', desc: 'North Coliseum Sector (curved goal end terrace)' },
  { id: 'east', shortLabel: 'EAST', badge: 'E', name: 'East Stand', desc: 'East Coliseum Sector (opposite touchline stand)' },
  { id: 'south', shortLabel: 'SOUTH', badge: 'S', name: 'South Stand', desc: 'South Coliseum Sector (curved goal end terrace)' },
];

interface StadiumCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStadium?: (stadium: StadiumDefinition) => void;
  onTestMatchday?: (stadium: StadiumDefinition) => void;
  initialStadium?: StadiumDefinition;
}

export const StadiumCreatorModal: React.FC<StadiumCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveStadium,
  onTestMatchday,
  initialStadium,
}) => {
  // Active wizard step: 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Stadium definition state being edited
  const [stadium, setStadium] = useState<StadiumDefinition>(() => {
    return initialStadium ? JSON.parse(JSON.stringify(initialStadium)) : createDefaultStadium();
  });

  // Stand-by-stand inspector sub-navigation
  const [activeStandPos, setActiveStandPos] = useState<StandInspectionPosition>('west');

  // Step 1 Sub-focus (Shape vs Surroundings vs Grounds)
  const [step1SubFocus, setStep1SubFocus] = useState<'shape' | 'surroundings' | 'grounds'>('shape');

  // Step 3 Sub-tab (Dugouts vs Tunnel)
  const [step3SubTab, setStep3SubTab] = useState<'dugouts' | 'tunnel'>('dugouts');

  // Step 4 Satisfaction Lock
  const [isArchitectureLocked, setIsArchitectureLocked] = useState(false);

  // Top-Right Camera Director State (Phase 14.1)
  const [cameraPerspective, setCameraPerspective] = useState<StadiumCameraPerspective>('relevant');
  const [isCameraPopoverOpen, setIsCameraPopoverOpen] = useState(false);

  // Free Camera manual target reference
  const freeCamTargetRef = useRef<CameraTarget>({
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    zoom: 0.38,
    pitchTilt: 0.5,
    label: 'FREE CAMERA',
    description: 'Freely moveable manual camera. Drag to pan, scroll/pinch/stick to zoom.',
  });

  // Aerial Free Camera manual target reference (High-Altitude Vista Navigation)
  const aerialFreeCamTargetRef = useRef<CameraTarget>({
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y - 140,
    zoom: 0.26,
    pitchTilt: 0.35,
    label: 'AERIAL FREE CAM',
    description: 'Freely moveable aerial camera. Drag to pan, scroll/pinch/stick to zoom in sky view.',
  });

  // Synchronous ref to prevent stale closures during rapid drag/scroll gestures
  const cameraPerspectiveRef = useRef<StadiumCameraPerspective>(cameraPerspective);
  cameraPerspectiveRef.current = cameraPerspective;

  // Touch & Drag interaction tracker
  const touchStateRef = useRef<{
    lastDistance: number | null;
    lastX: number;
    lastY: number;
    isDragging: boolean;
  }>({
    lastDistance: null,
    lastX: 0,
    lastY: 0,
    isDragging: false,
  });

  // Helper to switch to free camera seamlessly from current animated position
  // When in Aerial Sky-Cam, transitions to aerial_free so the user stays in aerial view
  const switchToFreeCam = useCallback(() => {
    setCameraPerspective((prev) => {
      if (prev === 'aerial_sky' || prev === 'aerial_free') {
        if (prev !== 'aerial_free') {
          aerialFreeCamTargetRef.current = {
            x: cameraStateRef.current.x,
            y: cameraStateRef.current.y,
            zoom: cameraStateRef.current.zoom,
            pitchTilt: cameraStateRef.current.pitchTilt ?? 0.35,
            label: 'AERIAL FREE CAM',
            description: 'Freely moveable aerial camera. Drag to pan, scroll/pinch/stick to zoom.',
          };
          return 'aerial_free';
        }
        return prev;
      }
      if (prev !== 'free') {
        freeCamTargetRef.current = {
          x: cameraStateRef.current.x,
          y: cameraStateRef.current.y,
          zoom: cameraStateRef.current.zoom,
          pitchTilt: cameraStateRef.current.pitchTilt ?? 0.5,
          label: 'FREE CAMERA',
          description: 'Freely moveable manual camera. Drag to pan, scroll/pinch/stick to zoom.',
        };
        return 'free';
      }
      return prev;
    });
  }, []);

  // Interactive Canvas Camera tracking state
  const cameraStateRef = useRef<{ x: number; y: number; zoom: number; pitchTilt: number }>({
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    zoom: 0.38,
    pitchTilt: 0.5,
  });

  // User manual pan/drag offset
  const manualPanRef = useRef<{ x: number; y: number; isDragging: boolean; lastX: number; lastY: number }>({
    x: 0,
    y: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Canvas element ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dedicated Vertical Interactive Zoom Bar Engine (Phase B1.3)
  const zoomTrackRef = useRef<HTMLDivElement | null>(null);
  const zoomThumbRef = useRef<HTMLDivElement | null>(null);
  const zoomReadoutRef = useRef<HTMLDivElement | null>(null);

  const applyZoomValue = useCallback((targetZoom: number) => {
    audio.playKick(0.15);
    switchToFreeCam();
    const isAerial = cameraPerspectiveRef.current === 'aerial_sky' || cameraPerspectiveRef.current === 'aerial_free';
    const targetRef = isAerial ? aerialFreeCamTargetRef : freeCamTargetRef;
    const clamped = Math.max(0.05, Math.min(2.50, targetZoom));
    targetRef.current.zoom = clamped;
  }, [switchToFreeCam]);

  const handleZoomTrackPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const track = zoomTrackRef.current;
    if (!track) return;

    const updateFromPointer = (clientY: number) => {
      const rect = track.getBoundingClientRect();
      if (rect.height <= 0) return;
      // 0 at bottom, 1 at top
      const t = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      const minZ = 0.05;
      const maxZ = 2.50;
      const targetZ = minZ * Math.pow(maxZ / minZ, t);
      applyZoomValue(targetZ);
    };

    updateFromPointer(e.clientY);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromPointer(ev.clientY);
    };
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [applyZoomValue]);

  // Re-sync stadium when opened with a new initialStadium
  useEffect(() => {
    if (isOpen) {
      if (initialStadium) {
        setStadium(JSON.parse(JSON.stringify(initialStadium)));
      } else {
        setStadium(createDefaultStadium());
      }
      setCurrentStep(1);
      setIsArchitectureLocked(false);
      setCameraPerspective('relevant');
    }
  }, [isOpen, initialStadium]);

  // Dynamically recompute capacity & FIFA category on any architectural change
  const totalCapacity = calculateStadiumTotalCapacity(stadium.stands, stadium.shape);
  const activeEffectivePos = (activeStandPos === 'corners' ? 'corner_nw' : activeStandPos) as StandPosition;
  const currentFifa = calculateFifaQualification(
    totalCapacity,
    stadium.stands[activeEffectivePos]?.grade || 'grade1_municipal',
    stadium.lighting?.powerKw,
    stadium.turfQuality || 'normal'
  );

  // Round and oval coliseum bowls are seamless 360° monolithic structures without corner stands
  const isRoundOval = isRoundOrOvalShape(stadium.shape);
  const displayedStands = isRoundOval ? CARDINAL_STANDS : CLOCKWISE_STANDS;

  // Auto-reset active stand selection to 'west' if in round/oval shape and corner stand is selected
  useEffect(() => {
    if (isRoundOrOvalShape(stadium.shape) && activeStandPos.startsWith('corner_')) {
      setActiveStandPos('west');
    }
  }, [stadium.shape, activeStandPos]);

  // Real-time Canvas Rendering Loop (WYSIWYG Procedural Canvas 2D)
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      // 1. Resolve Target Camera View (with dynamic viewport fitting for stadium_view and full_pitch)
      const target = getStadiumCameraTarget(cameraPerspective, {
        activeStep: currentStep,
        activeStand: activeStandPos,
        stadiumDef: stadium,
        focusSubTarget:
          currentStep === 3
            ? step3SubTab
            : currentStep === 1
            ? (step1SubFocus === 'grounds' ? 'grounds' : step1SubFocus === 'surroundings' ? 'surroundings' : undefined)
            : undefined,
        viewportWidth: width,
        viewportHeight: height,
        freeCameraTarget: freeCamTargetRef.current,
        aerialCameraTarget: aerialFreeCamTargetRef.current,
      });

      // Gamepad Controller Polling (Left stick/D-pad pan, Right stick/triggers zoom)
      if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
        if (gp) {
          const isAerial = cameraPerspectiveRef.current === 'aerial_sky' || cameraPerspectiveRef.current === 'aerial_free';
          const targetRef = isAerial ? aerialFreeCamTargetRef : freeCamTargetRef;
          const lx = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : (gp.buttons[14]?.pressed ? -1 : gp.buttons[15]?.pressed ? 1 : 0);
          const ly = Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : (gp.buttons[12]?.pressed ? -1 : gp.buttons[13]?.pressed ? 1 : 0);
          const rx = Math.abs(gp.axes[2]) > 0.15 ? gp.axes[2] : 0;
          const ry = Math.abs(gp.axes[3]) > 0.15 ? gp.axes[3] : 0;
          const l2 = gp.buttons[6]?.value || (gp.buttons[6]?.pressed ? 1 : 0);
          const r2 = gp.buttons[7]?.value || (gp.buttons[7]?.pressed ? 1 : 0);

          const panSpeed = 22 / Math.max(0.05, cameraStateRef.current.zoom);
          if (Math.abs(lx) > 0.15 || Math.abs(ly) > 0.15 || Math.abs(rx) > 0.15) {
            switchToFreeCam();
            targetRef.current.x += (lx + rx * 0.4) * panSpeed;
            targetRef.current.y += ly * panSpeed;
          }
          const zoomDelta = -ry * 0.035 + (r2 - l2) * 0.035;
          if (Math.abs(zoomDelta) > 0.005) {
            switchToFreeCam();
            const minZ = 0.05;
            const maxZ = 2.50;
            targetRef.current.zoom = Math.max(minZ, Math.min(maxZ, targetRef.current.zoom * (1 + zoomDelta)));
          }
        }
      }

      // Smooth camera interpolation towards target
      const isFreeMoving = cameraPerspective === 'free' || cameraPerspective === 'aerial_free';
      const lerped = lerpCamera(cameraStateRef.current, target, isFreeMoving ? 0.35 : 0.08);
      cameraStateRef.current = lerped;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      // Fill background sky/void
      ctx.fillStyle = '#050a18';
      ctx.fillRect(0, 0, width, height);

      // Apply Camera View Transform
      const isAerial = cameraPerspective === 'aerial_sky' || cameraPerspective === 'aerial_free';
      const minZoom = 0.05; // Phase B1.3: Continuous extreme zoom-out down to 5% scale
      const maxZoom = 2.50;
      const effectiveZoom = Math.max(minZoom, Math.min(maxZoom, lerped.zoom));
      const effectiveTilt = lerped.pitchTilt ?? (isAerial ? 0.35 : 0.5);
      const scaleY = effectiveZoom * (isAerial ? (0.90 + effectiveTilt * 0.10) : (0.94 + effectiveTilt * 0.10));

      const screenCenterX = width / 2;
      const screenCenterY = height / 2;

      // Phase B1.3: Update dedicated vertical zoom bar thumb position & live readout at 60fps
      if (zoomThumbRef.current) {
        const t = Math.max(0, Math.min(1, (Math.log(effectiveZoom) - Math.log(0.05)) / (Math.log(2.50) - Math.log(0.05))));
        zoomThumbRef.current.style.bottom = `${t * 100}%`;
      }
      if (zoomReadoutRef.current) {
        zoomReadoutRef.current.textContent = `${Math.round(effectiveZoom * 100)}%`;
      }

      ctx.translate(screenCenterX, screenCenterY);
      ctx.scale(effectiveZoom, scaleY);
      ctx.translate(-lerped.x, -lerped.y);

      const timeOfDay = stadium.lighting?.timeOfDay || 'night';

      if (isAerial) {
        // Phase 15.2: High-Altitude 32-Bit Aerial Sky-Cam Renderer
        drawAerialSkyCam(ctx, stadium as StadiumDefinition, {
          roofOpacity: 1.0,
          showBroadcastHUD: false,
          timeOfDay,
          cameraX: lerped.x,
          cameraY: lerped.y,
        });
      } else {
        // 2. Draw Procedural Skybox & Living North Horizon
        drawPerimeterHorizon(
          ctx,
          lerped.x,
          lerped.y,
          stadium.capacity > 50000 ? 'monumental' : stadium.capacity > 20000 ? 'craven' : 'ascenso',
          timeOfDay,
          undefined,
          stadium.surroundings,
          stadium.grounds,
          stadium
        );

        // 3. Draw Procedural Stadium Architecture (360 Surroundings, Apron, Running Track, Stands, Benches, Tunnels, Floodlights)
        drawStadiumArchitecture(
          ctx,
          lerped.x,
          lerped.y,
          stadium.capacity > 50000 ? 'monumental' : stadium.capacity > 20000 ? 'craven' : 'ascenso',
          timeOfDay,
          HOME_KIT,
          AWAY_KIT,
          undefined,
          stadium
        );

        // 4. Draw Infill Area & Pitch Turf & Markings (Strict Containment Engine)
        const metrics = resolvePitchMetrics({
          preset: stadium.pitchPreset || 'standard',
          lengthMeters: stadium.pitchLengthMeters,
          widthMeters: stadium.pitchWidthMeters,
        });

        // A. Draw the fixed Infill Area Substrate (Max pitch + 1m in every direction: 76m × 112m)
        const apronMat = stadium.apronMaterial || 'grass';
        ctx.save();
        if (apronMat === 'concrete') {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(metrics.infillLeft, metrics.infillTop, metrics.infillWidth, metrics.infillHeight);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          for (let x = metrics.infillLeft; x <= metrics.infillRight; x += 90) {
            ctx.beginPath();
            ctx.moveTo(x, metrics.infillTop);
            ctx.lineTo(x, metrics.infillBottom);
            ctx.stroke();
          }
          for (let y = metrics.infillTop; y <= metrics.infillBottom; y += 90) {
            ctx.beginPath();
            ctx.moveTo(metrics.infillLeft, y);
            ctx.lineTo(metrics.infillRight, y);
            ctx.stroke();
          }
        } else if (apronMat === 'rubber_tartan') {
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(metrics.infillLeft, metrics.infillTop, metrics.infillWidth, metrics.infillHeight);
        } else if (apronMat === 'artificial_turf') {
          ctx.fillStyle = '#15803d';
          ctx.fillRect(metrics.infillLeft, metrics.infillTop, metrics.infillWidth, metrics.infillHeight);
        } else if (apronMat === 'gravel_ballast') {
          ctx.fillStyle = '#57534e';
          ctx.fillRect(metrics.infillLeft, metrics.infillTop, metrics.infillWidth, metrics.infillHeight);
        } else if (apronMat === 'asphalt_paved') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(metrics.infillLeft, metrics.infillTop, metrics.infillWidth, metrics.infillHeight);
        } else {
          // natural turf infill
          ctx.fillStyle = '#166534';
          ctx.fillRect(metrics.infillLeft, metrics.infillTop, metrics.infillWidth, metrics.infillHeight);
        }
        ctx.restore();

        // B. Draw Pitch Turf strictly centered inside and ABOVE the infill zone
        const pLeft = metrics.pitchLeft;
        const pTop = metrics.pitchTop;
        const fWidth = metrics.fieldWidth;
        const fHeight = metrics.fieldHeight;

        ctx.fillStyle = stadium.turfQuality === 'pristine' ? '#1eb842' : stadium.turfQuality === 'poor' ? '#5f6f25' : '#338317';
        ctx.fillRect(pLeft, pTop, fWidth, fHeight);

        // Mowing stripes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        const stripeH = 90;
        for (let y = pTop; y < pTop + fHeight; y += stripeH * 2) {
          const h = Math.min(stripeH, pTop + fHeight - y);
          ctx.fillRect(pLeft, y, fWidth, h);
        }

        // Pitch white regulation lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(pLeft, pTop, fWidth, fHeight);

        // Halfway line & center circle
        ctx.beginPath();
        ctx.moveTo(pLeft, metrics.centerY);
        ctx.lineTo(pLeft + fWidth, metrics.centerY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(metrics.centerX, metrics.centerY, metrics.centerCircleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Penalty boxes
        ctx.strokeRect(
          metrics.centerX - metrics.penaltyBoxWidth / 2,
          pTop,
          metrics.penaltyBoxWidth,
          metrics.penaltyBoxHeight
        );
        ctx.strokeRect(
          metrics.centerX - metrics.penaltyBoxWidth / 2,
          pTop + fHeight - metrics.penaltyBoxHeight,
          metrics.penaltyBoxWidth,
          metrics.penaltyBoxHeight
        );

        // Six-yard boxes
        ctx.strokeRect(
          metrics.centerX - metrics.sixYardBoxWidth / 2,
          pTop,
          metrics.sixYardBoxWidth,
          metrics.sixYardBoxHeight
        );
        ctx.strokeRect(
          metrics.centerX - metrics.sixYardBoxWidth / 2,
          pTop + fHeight - metrics.sixYardBoxHeight,
          metrics.sixYardBoxWidth,
          metrics.sixYardBoxHeight
        );

        // Phase S3: Architectural Roof Shadows & Time-of-day atmospheric grading
        drawArchitecturalRoofShadows(ctx, stadium as StadiumDefinition, timeOfDay);
        drawTimeOfDayAtmosphere(ctx, timeOfDay, {
          left: pLeft - 250,
          top: pTop - 250,
          width: fWidth + 500,
          height: fHeight + 500,
        });
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, cameraPerspective, currentStep, activeStandPos, step3SubTab, stadium]);

  if (!isOpen) return null;

  // Stand-by-stand mutation helper (independent per-stand updates)
  const updateCurrentStand = (patch: Partial<StandConfig>) => {
    audio.playKick(0.18);
    const posList: StandPosition[] =
      activeStandPos === 'corners'
        ? ['corner_ne', 'corner_nw', 'corner_se', 'corner_sw']
        : [activeStandPos as StandPosition];

    setStadium((prev) => {
      const nextStands = { ...prev.stands };
      for (const p of posList) {
        nextStands[p] = {
          ...nextStands[p],
          ...patch,
          position: p,
        };
      }
      return {
        ...prev,
        stands: nextStands,
      };
    });
  };

  // Replicate active corner architecture to all 4 corners helper
  const copyCornerToAllCorners = () => {
    audio.playKick(0.25);
    const sourcePos = (activeStandPos.startsWith('corner_') ? activeStandPos : 'corner_nw') as StandPosition;
    const source = stadium.stands[sourcePos];
    if (!source) return;
    setStadium((prev) => {
      const nextStands = { ...prev.stands };
      const allCorners: StandPosition[] = ['corner_ne', 'corner_se', 'corner_sw', 'corner_nw'];
      for (const c of allCorners) {
        nextStands[c] = {
          ...source,
          position: c,
        };
      }
      return { ...prev, stands: nextStands };
    });
  };

  const activeStandConfig = stadium.stands[(activeStandPos === 'corners' ? 'corner_nw' : activeStandPos) as StandPosition];

  // Save handler
  const handleSave = () => {
    audio.playKick(0.35);
    const updatedStadium: StadiumDefinition = {
      ...stadium,
      capacity: totalCapacity,
      fifaCategory: currentFifa,
    };
    saveCustomStadium(updatedStadium);
    if (onSaveStadium) onSaveStadium(updatedStadium);
  };

  // Test matchday handler
  const handleTestMatchday = () => {
    audio.playKick(0.4);
    const updatedStadium: StadiumDefinition = {
      ...stadium,
      capacity: totalCapacity,
      fifaCategory: currentFifa,
    };
    saveCustomStadium(updatedStadium);
    if (onTestMatchday) {
      onTestMatchday(updatedStadium);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-1 sm:p-3 select-none animate-fadeIn">
      {/* 32-Bit Metallic Console Shell */}
      <div className="relative w-full max-w-6xl h-[98vh] max-h-[760px] flex flex-col rounded-2xl border-4 border-slate-700 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* ========================================================================= */}
        {/* TOP HEADER: Console Marquee & Multi-View Camera Switcher Suite (14.1)      */}
        {/* ========================================================================= */}
        <div className="relative flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b-2 border-slate-800 flex items-center justify-between z-20">
          
          {/* Left Title & Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/70 text-cyan-300 font-mono text-[10px] tracking-widest font-black uppercase shadow-inner">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>STADIUM CREATOR</span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-300 tracking-wider font-bold">
              32-BIT ARCHITECT • {stadium.name.toUpperCase()}
            </span>
          </div>

          {/* Center 6-Step LED Indicator */}
          <div className="hidden md:flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const labels = ['SHAPE', 'STANDS', 'BENCH/TUNNEL', 'LOCK', 'SEATS', 'LIGHTS'];
              const isActive = currentStep === step;
              const isPassed = currentStep > step;
              return (
                <button
                  key={step}
                  onClick={() => {
                    audio.playKick(0.2);
                    setCurrentStep(step);
                  }}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 border ${
                    isActive
                      ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md ring-1 ring-amber-400'
                      : isPassed
                      ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{step}.</span>
                  <span>{labels[step - 1]}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Quick-Switch Time of Day, Camera Director Icon [ 📹 CAM ] & Close */}
          <div className="flex items-center gap-2">
            {/* Phase 15.6: Time-of-Day Sky & Lighting Switcher (☀️ Noon -> 🌅 Sunset -> 🌙 Night) */}
            {(() => {
              const currentTod = stadium.lighting?.timeOfDay || 'night';
              return (
                <button
                  onClick={() => {
                    audio.playKick(0.2);
                    const next: TimeOfDay = currentTod === 'noon' ? 'sunset' : currentTod === 'sunset' ? 'night' : 'noon';
                    setStadium((prev) => ({
                      ...prev,
                      lighting: {
                        ...(prev.lighting || { type: 'corner_pylons', pylonCount: 4, powerKw: 2000, timeOfDay: next }),
                        timeOfDay: next,
                      },
                    }));
                  }}
                  className={`px-2.5 py-1 rounded border-2 text-[10px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
                    currentTod === 'noon'
                      ? 'bg-amber-950/60 hover:bg-amber-900/70 border-amber-400 text-amber-300 shadow-amber-500/20'
                      : currentTod === 'sunset'
                      ? 'bg-orange-950/60 hover:bg-orange-900/70 border-orange-500 text-orange-300 shadow-orange-500/20'
                      : 'bg-indigo-950/60 hover:bg-indigo-900/70 border-indigo-500 text-cyan-300 shadow-indigo-500/20'
                  }`}
                  title={`Matchday Lighting: ${
                    currentTod === 'noon'
                      ? 'Morning / Noon (☀️ Sun: Bright Daylight) — Tap for Sunset'
                      : currentTod === 'sunset'
                      ? 'Afternoon / Sunset (🌅 Dying Sun: Orange/Red Glow) — Tap for Night'
                      : 'Night (🌙 Moon: Moonlight & Floodlights) — Tap for Noon'
                  }`}
                >
                  {currentTod === 'noon' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
                  {currentTod === 'sunset' && <Sunset className="w-3.5 h-3.5 text-orange-400" />}
                  {currentTod === 'night' && <Moon className="w-3.5 h-3.5 text-cyan-300" />}
                  <span className="hidden xs:inline">SKY:</span>
                  <span className="text-white font-bold uppercase">{currentTod}</span>
                </button>
              );
            })()}

            {/* ST4.1 Sims-Style 3-State Roof Cutaway Toggler */}
            {(() => {
              const currentCutaway: RoofCutawayMode = stadium.roofCutaway || stadium.roof?.cutawayMode || 'partial';
              const nextCutaway: RoofCutawayMode =
                currentCutaway === 'hidden' ? 'partial' : currentCutaway === 'partial' ? 'full' : 'hidden';

              return (
                <button
                  onClick={() => {
                    audio.playKick(0.22);
                    const updatedRoof = { ...(stadium.roof || getDefaultRoofConfig()), cutawayMode: nextCutaway };
                    setStadium({
                      ...stadium,
                      roofCutaway: nextCutaway,
                      roof: updatedRoof,
                    });
                  }}
                  className={`px-2.5 py-1 rounded border-2 text-[10px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
                    currentCutaway === 'full'
                      ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                      : currentCutaway === 'partial'
                      ? 'bg-amber-950/70 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Sims-Style Roof Cutaway: ${
                    currentCutaway === 'hidden'
                      ? 'Hidden (0% Canopy) — Unobstructed View into Tiers & Pitch. Tap for Edge-Only (50%)'
                      : currentCutaway === 'partial'
                      ? 'Edge-Only (50% Canopy) — Default framing upper rows without blocking action. Tap for Full (100%)'
                      : 'Full Canopy (100%) — Covered grandstand with trusses & floodlights. Tap to Hide (0%)'
                  }`}
                >
                  <span>🏛️</span>
                  <span className="hidden sm:inline">ROOF:</span>
                  <span className="font-bold uppercase">
                    {currentCutaway === 'hidden' ? '0% [HIDE]' : currentCutaway === 'partial' ? '50% [EDGE]' : '100% [FULL]'}
                  </span>
                </button>
              );
            })()}

            {/* Phase B1.3: Dedicated Sky View / Aerial Free Toggle Button */}
            <button
              onClick={() => {
                audio.playKick(0.24);
                if (cameraPerspective === 'aerial_free') {
                  setCameraPerspective('relevant');
                } else {
                  aerialFreeCamTargetRef.current = {
                    x: PITCH_CONFIG.CENTER_X,
                    y: PITCH_CONFIG.CENTER_Y - 140,
                    zoom: 0.22,
                    pitchTilt: 0.35,
                    label: 'AERIAL FREE CAM',
                    description: 'Unrestricted 360° pan and zoom across grounds, concourse, and horizon skyline.',
                  };
                  setCameraPerspective('aerial_free');
                }
              }}
              className={`px-2.5 py-1 rounded border-2 text-[10px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
                cameraPerspective === 'aerial_free'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/50 shadow-cyan-400/30 font-black'
                  : cameraPerspective === 'aerial_sky'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-400/30 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Toggle Unrestricted 360° Sky View / Aerial Free Mode (Drag to Pan anywhere, Zoom from 5% to 250%)"
            >
              <span>🦅</span>
              <span className="hidden xs:inline">SKY VIEW / AERIAL FREE</span>
              <span className="xs:hidden">SKY VIEW</span>
              {cameraPerspective === 'aerial_free' && <span className="text-[9px]">●</span>}
            </button>

            {/* Camera Switcher Button */}
            <div className="relative">
              <button
                onClick={() => {
                  audio.playKick(0.25);
                  setIsCameraPopoverOpen(!isCameraPopoverOpen);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border-2 border-cyan-500/60 text-cyan-300 text-[10px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                title="Top-Right Multi-View Camera Switcher Suite (7 Perspectives)"
              >
                <Video className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden xs:inline">CAM:</span>
                <span className="text-white font-bold">{cameraPerspective.toUpperCase()}</span>
                <span className="text-cyan-400 text-[8px]">▼</span>
              </button>

              {/* Camera Popover (7 Specialized Perspectives) */}
              {isCameraPopoverOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border-2 border-cyan-500/80 bg-slate-950 p-2 shadow-2xl z-50 text-[10px] font-mono space-y-1 animate-fadeIn">
                  <div className="px-2 py-1 text-cyan-400 font-bold border-b border-slate-800 flex items-center justify-between">
                    <span>📹 CAMERA DIRECTOR</span>
                    <span className="text-[9px] text-slate-500">7 VIEWS</span>
                  </div>

                  {/* 1. Relevant View */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('relevant');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'relevant' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>🎯 Relevant View (Auto-Focus)</span>
                    {cameraPerspective === 'relevant' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 2. Full Pitch View */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('full_pitch');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'full_pitch' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>🏟️ Full Pitch Overview</span>
                    {cameraPerspective === 'full_pitch' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 3. Stands View with stand selector */}
                  <div className={`p-1.5 rounded border ${cameraPerspective === 'stands' ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-800'}`}>
                    <button
                      onClick={() => {
                        audio.playKick(0.2);
                        setCameraPerspective('stands');
                      }}
                      className="w-full text-left font-bold text-slate-200 flex items-center justify-between"
                    >
                      <span>👥 Stands View (Spectator Rows)</span>
                      {cameraPerspective === 'stands' && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                    <div className="grid grid-cols-4 gap-1 mt-1 text-[8px]">
                      {displayedStands.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            audio.playKick(0.18);
                            setCameraPerspective('stands');
                            setActiveStandPos(s.id);
                            setIsCameraPopoverOpen(false);
                          }}
                          className={`py-0.5 rounded text-center uppercase font-bold border truncate ${
                            activeStandPos === s.id && cameraPerspective === 'stands'
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                          }`}
                        >
                          {s.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Playing Field Focus */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('field_focus');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'field_focus' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>⚽ Field Turf & Goals Focus</span>
                    {cameraPerspective === 'field_focus' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 5. Aerial Sky-Cam */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      aerialFreeCamTargetRef.current = {
                        x: PITCH_CONFIG.CENTER_X,
                        y: PITCH_CONFIG.CENTER_Y - 140,
                        zoom: 0.26,
                        pitchTilt: 0.35,
                        label: 'AERIAL SKY-CAM (FAR)',
                        description: 'High-altitude bird’s-eye perspective showing outer architecture and horizon.',
                      };
                      setCameraPerspective('aerial_sky');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'aerial_sky' || cameraPerspective === 'aerial_free' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>🦅 Aerial Sky-Cam (Birds-Eye Vista)</span>
                      {cameraPerspective === 'aerial_free' && (
                        <span className="text-[7.5px] opacity-80">Free Navigation Active</span>
                      )}
                    </div>
                    {(cameraPerspective === 'aerial_sky' || cameraPerspective === 'aerial_free') && <Check className="w-3 h-3" />}
                  </button>

                  {/* 6. Tunnel Camera */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('tunnel');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'tunnel' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>🚪 Tunnel Walkout Cam</span>
                    {cameraPerspective === 'tunnel' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 7. Bench Camera */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('bench');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'bench' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>💺 Dugout Benches Cam</span>
                    {cameraPerspective === 'bench' && <Check className="w-3 h-3" />}
                  </button>

                  <div className="pt-1 border-t border-slate-800 text-[8px] text-slate-500 text-center">
                    Dual-purpose: Used in Pre-Match Walkouts
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                audio.playKick(0.2);
                onClose();
              }}
              className="p-1 rounded bg-slate-800 hover:bg-red-950/80 border border-slate-700 hover:border-red-600 text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: SPLIT VIEW (Inspector on Left, Real-Time Preview on Right)     */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden relative">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT COLUMN: 6-STEP WIZARD INSPECTOR (Cols 1-5, Single Screen Fit)      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="md:col-span-5 h-full flex flex-col bg-slate-900/90 border-r-2 border-slate-800 overflow-hidden z-10">
            
            {/* Step Header Marquee */}
            <div className="flex-none px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest">
                  STEP {currentStep} OF 6
                </span>
                <h3 className="font-['Outfit'] font-black text-sm text-white uppercase tracking-wide">
                  {currentStep === 1 && '1. Structure, Shape & Surroundings'}
                  {currentStep === 2 && '2. Stand-by-Stand Architecture'}
                  {currentStep === 3 && '3. Dugouts & Entrance Tunnel'}
                  {currentStep === 4 && '4. Structural Review & Lock'}
                  {currentStep === 5 && '5. Stadium Bowl Seats & Colors'}
                  {currentStep === 6 && '6. Floodlights & Registry Save'}
                </h3>
              </div>

              {/* Step Navigation Arrows */}
              <div className="flex items-center gap-1">
                <button
                  disabled={currentStep <= 1}
                  onClick={() => {
                    audio.playKick(0.18);
                    setCurrentStep((p) => Math.max(1, p - 1));
                  }}
                  className="p-1 rounded bg-slate-800 disabled:opacity-30 border border-slate-700 hover:bg-slate-700 text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentStep >= 6}
                  onClick={() => {
                    audio.playKick(0.18);
                    setCurrentStep((p) => Math.min(6, p + 1));
                  }}
                  className="p-1 rounded bg-slate-800 disabled:opacity-30 border border-slate-700 hover:bg-slate-700 text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step Content Container (Scrollable internally without page scroll) */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 font-mono text-[11px]">
              
              {/* ------------------------------------------------------------------- */}
              {/* STEP 1: STRUCTURE, SHAPE & SURROUNDINGS (14.4.1)                   */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 1 && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Stadium Name & Short Name */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      VENUE IDENTITY
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-500">FULL NAME:</span>
                        <input
                          type="text"
                          value={stadium.name}
                          onChange={(e) => setStadium({ ...stadium, name: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold focus:border-amber-400 outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500">CITY / REGION:</span>
                        <input
                          type="text"
                          value={stadium.city}
                          onChange={(e) => setStadium({ ...stadium, city: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white focus:border-cyan-400 outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Architectural Shape Selection */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      ARCHITECTURAL SHAPE (4 DISTINCTIVE FORMATS)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['round', 'oval', 'square', 'rectangular'] as StadiumShape[]).map((shp) => (
                        <button
                          key={shp}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStep1SubFocus('shape');
                            const nextIsRoundOval = isRoundOrOvalShape(shp);
                            const currIsRoundOval = isRoundOrOvalShape(stadium.shape);
                            let nextRoof = stadium.roof;
                            if (nextIsRoundOval && !currIsRoundOval) {
                              nextRoof = {
                                ...(stadium.roof || getDefaultRoofConfig(shp)),
                                style: shp === 'round' ? 'spoke_wheel_tension' : 'continuous_cantilever_ring',
                                material: 'ptfe_fabric',
                                border: 'video_halo_board',
                              };
                            } else if (!nextIsRoundOval && currIsRoundOval) {
                              nextRoof = {
                                ...(stadium.roof || getDefaultRoofConfig(shp)),
                                style: 'cantilever_truss',
                                material: 'corrugated_steel',
                                border: 'painted_club_fascia',
                              };
                            }
                            if (nextIsRoundOval && activeStandPos.startsWith('corner_')) {
                              setActiveStandPos('west');
                            }
                            setStadium({
                              ...stadium,
                              shape: shp,
                              roof: nextRoof,
                              // Running track strictly exclusive to round & oval
                              hasTrack: shp === 'round' || shp === 'oval' ? stadium.hasTrack : false,
                            });
                          }}
                          className={`p-2 rounded border text-left transition-all ${
                            stadium.shape === shp
                              ? 'border-amber-400 bg-amber-950/40 text-amber-300 ring-1 ring-amber-400'
                              : 'border-slate-800 bg-slate-900 hover:border-slate-600 text-slate-300'
                          }`}
                        >
                          <div className="font-bold uppercase text-[10px]">{shp}</div>
                          <div className="text-[8px] text-slate-500">
                            {shp === 'round' && 'Continuous Coliseum Circular Bowl'}
                            {shp === 'oval' && 'Olympic Curved Horseshoe Endzones'}
                            {shp === 'square' && 'Rectilinear with 45° Corner Pavilions'}
                            {shp === 'rectangular' && 'Classic English 4-Stand Box Ground'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PHASE HOTFIX: Pitch Size Selector & Fixed Infill Containment Engine (Step 1) */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Maximize2 className="w-3 h-3 text-amber-400" />
                        PITCH SIZE (STEP 1)
                      </label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                        ✓ 76m × 112m FIXED INFILL ZONE
                      </span>
                    </div>

                    <div className="text-[8px] text-slate-400 leading-relaxed">
                      Inside the stadium right after the stands is the infill area, sized to maximum pitch possible plus 1m in every direction (76m × 112m). The pitch is centered inside and rendered above the infilling.
                    </div>

                    {/* 4 Preset Option Buttons: Compact, Standard, Expansive, Custom */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          {
                            id: 'compact' as PitchDimensionPreset,
                            label: 'Compact',
                            dims: '100m × 64m',
                            desc: 'IFAB Min Legal',
                            length: 100,
                            width: 64,
                          },
                          {
                            id: 'standard' as PitchDimensionPreset,
                            label: 'Standard',
                            dims: '105m × 68m',
                            desc: 'FIFA Benchmark',
                            length: 105,
                            width: 68,
                          },
                          {
                            id: 'expansive' as PitchDimensionPreset,
                            label: 'Expansive',
                            dims: '110m × 74m',
                            desc: 'Max Cathedral',
                            length: 110,
                            width: 74,
                          },
                          {
                            id: 'custom' as PitchDimensionPreset,
                            label: 'Custom',
                            dims: `${stadium.pitchLengthMeters || 105}m × ${stadium.pitchWidthMeters || 68}m`,
                            desc: 'Exact Dimensions',
                            length: stadium.pitchLengthMeters || 105,
                            width: stadium.pitchWidthMeters || 68,
                          },
                        ]
                      ).map((opt) => {
                        const isCurrent =
                          (stadium.pitchPreset || 'standard') === opt.id ||
                          ((stadium.pitchPreset === 'balanced' || !stadium.pitchPreset) && opt.id === 'standard');
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              audio.playKick(0.2);
                              if (opt.id === 'custom') {
                                setStadium({
                                  ...stadium,
                                  pitchPreset: 'custom',
                                  pitchLengthMeters: Math.max(100, Math.min(110, stadium.pitchLengthMeters || 105)),
                                  pitchWidthMeters: Math.max(64, Math.min(74, stadium.pitchWidthMeters || 68)),
                                });
                              } else {
                                setStadium({
                                  ...stadium,
                                  pitchPreset: opt.id,
                                  pitchLengthMeters: opt.length,
                                  pitchWidthMeters: opt.width,
                                  apronSetback: opt.id === 'compact' ? 'compact' : opt.id === 'expansive' ? 'expansive' : 'standard',
                                });
                              }
                            }}
                            className={`p-1.5 rounded border text-left transition-all ${
                              isCurrent
                                ? 'border-amber-400 bg-amber-950/50 text-amber-200 ring-1 ring-amber-400 shadow-sm'
                                : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <div className="font-bold text-[9px] uppercase truncate">{opt.label}</div>
                            <div className="text-[8px] font-semibold text-amber-300 mt-0.5">{opt.dims}</div>
                            <div className="text-[7px] text-slate-500 mt-0.5 truncate">{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Width & Length Dimension Editors (Allowed strictly within Compact [min] and Expansive [max] limits) */}
                    {(stadium.pitchPreset === 'custom') && (
                      <div className="p-2 rounded bg-slate-900/90 border border-amber-500/30 space-y-2 mt-1">
                        <div className="flex items-center justify-between text-[9px] text-amber-300 font-bold border-b border-slate-800 pb-1">
                          <span>CUSTOM PITCH DIMENSIONS</span>
                          <span className="text-[8px] text-slate-400">LIMITS: 100-110m (L) × 64-74m (W)</span>
                        </div>

                        {/* Length Slider & Exact Number Input */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="text-slate-300 font-medium">Pitch Length (North - South):</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="100"
                                max="110"
                                step="1"
                                value={stadium.pitchLengthMeters || 105}
                                onChange={(e) => {
                                  const rawVal = parseInt(e.target.value);
                                  const clamped = isNaN(rawVal) ? 105 : Math.max(100, Math.min(110, rawVal));
                                  setStadium({ ...stadium, pitchPreset: 'custom', pitchLengthMeters: clamped });
                                }}
                                className="w-12 px-1 py-0.5 text-center text-[9px] bg-slate-950 border border-amber-500/40 rounded text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <span className="text-slate-400 font-bold">m</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="100"
                            max="110"
                            step="1"
                            value={stadium.pitchLengthMeters || 105}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              audio.playKick(0.12);
                              setStadium({ ...stadium, pitchPreset: 'custom', pitchLengthMeters: val });
                            }}
                            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                          />
                          <div className="flex justify-between text-[7px] text-slate-500">
                            <span>Min 100m (Compact)</span>
                            <span className="text-slate-400 font-semibold">Goal Inset: {((112 - (stadium.pitchLengthMeters || 105)) / 2).toFixed(1)}m</span>
                            <span>Max 110m (Expansive)</span>
                          </div>
                        </div>

                        {/* Width Slider & Exact Number Input */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[8px]">
                            <span className="text-slate-300 font-medium">Pitch Width (West - East):</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="64"
                                max="74"
                                step="1"
                                value={stadium.pitchWidthMeters || 68}
                                onChange={(e) => {
                                  const rawVal = parseInt(e.target.value);
                                  const clamped = isNaN(rawVal) ? 68 : Math.max(64, Math.min(74, rawVal));
                                  setStadium({ ...stadium, pitchPreset: 'custom', pitchWidthMeters: clamped });
                                }}
                                className="w-12 px-1 py-0.5 text-center text-[9px] bg-slate-950 border border-amber-500/40 rounded text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <span className="text-slate-400 font-bold">m</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="64"
                            max="74"
                            step="1"
                            value={stadium.pitchWidthMeters || 68}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              audio.playKick(0.12);
                              setStadium({ ...stadium, pitchPreset: 'custom', pitchWidthMeters: val });
                            }}
                            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                          />
                          <div className="flex justify-between text-[7px] text-slate-500">
                            <span>Min 64m (Compact)</span>
                            <span className="text-slate-400 font-semibold">Touchline Inset: {((76 - (stadium.pitchWidthMeters || 68)) / 2).toFixed(1)}m</span>
                            <span>Max 74m (Expansive)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Containment Readout & Margins */}
                    <div className="flex items-center justify-between text-[8px] px-2 py-1 bg-slate-900/60 rounded border border-slate-800/80">
                      <span className="text-slate-400">
                        Pitch: <strong className="text-amber-300">{stadium.pitchLengthMeters || 105}m × {stadium.pitchWidthMeters || 68}m</strong>
                      </span>
                      <span className="text-emerald-400 font-medium">
                        Touchline Margin: {((76 - (stadium.pitchWidthMeters || 68)) / 2).toFixed(1)}m | Goal Line Margin: {((112 - (stadium.pitchLengthMeters || 105)) / 2).toFixed(1)}m
                      </span>
                    </div>
                  </div>

                  {/* PHASE 15.5 & S1: Apron Perimeter Infill Material (Fills 100% Between Pitch and Grandstands) */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>APRON INFILL MATERIAL (PITCH-TO-STANDS)</span>
                      <span className="text-[9px] text-slate-500">6 MATERIALS</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'grass', label: 'Natural Turf', icon: '🌱', desc: 'Lush green lawn & chalk line' },
                          { id: 'concrete', label: 'Concrete Slabs', icon: '🧱', desc: 'Pre-cast pavers & joint grid' },
                          { id: 'rubber_tartan', label: 'Tartan Rubber', icon: '🏃', desc: 'High-grip non-slip tartan' },
                          { id: 'artificial_turf', label: 'AstroTurf', icon: '🌿', desc: 'Lime synthetic turf & seam tape' },
                          { id: 'gravel_ballast', label: 'Crushed Gravel', icon: '🪨', desc: 'Ballast river gravel & stone' },
                          { id: 'asphalt_paved', label: 'Paved Asphalt', icon: '🛣️', desc: 'Charcoal tarmac & hazard curb' },
                        ] as { id: ApronMaterial; label: string; icon: string; desc: string }[]
                      ).map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({ ...stadium, apronMaterial: mat.id });
                          }}
                          className={`p-1.5 rounded border text-left transition-all ${
                            (stadium.apronMaterial || 'grass') === mat.id
                              ? 'border-amber-400 bg-amber-950/50 text-amber-200 ring-1 ring-amber-400'
                              : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-[9px]">
                            <span>{mat.icon}</span>
                            <span className="truncate">{mat.label}</span>
                          </div>
                          <div className="text-[7px] text-slate-500 truncate mt-0.5">{mat.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Athletics Running Track (Exclusive to Round & Oval; strictly outside pitch perimeter) */}
                  {(stadium.shape === 'round' || stadium.shape === 'oval') && (
                    <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-700/50 flex items-center justify-between animate-fadeIn">
                      <div>
                        <div className="font-bold text-cyan-300 text-[10px] uppercase">
                          🏃 ATHLETICS RUNNING TRACK (8-LANE CURVED)
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {stadium.shape === 'round'
                            ? 'Continuous circular track encircling pitch and apron with zero pitch overlap'
                            : 'Olympic straight touchlines & semicircular curved endzones clearing pitch'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          audio.playKick(0.2);
                          setStadium({ ...stadium, hasTrack: !stadium.hasTrack });
                        }}
                        className={`px-3 py-1 rounded font-bold text-[10px] uppercase border transition-all ${
                          stadium.hasTrack
                            ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {stadium.hasTrack ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  )}

                  {/* Eleven Outside Surroundings (15.5 Overhaul) */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>OUTSIDE SURROUNDINGS (360° PANORAMIC)</span>
                      <span className="text-cyan-400 text-[9px]">3 TIME VARIANTS</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {(
                        [
                          { id: 'mountains', label: 'Mountains', icon: '⛰️' },
                          { id: 'forest', label: 'Forest', icon: '🌲' },
                          { id: 'savannah', label: 'Savannah', icon: '🦒' },
                          { id: 'highway', label: 'Highway', icon: '🛣️' },
                          { id: 'small_city', label: 'Small City', icon: '🏘️' },
                          { id: 'big_city', label: 'Big City', icon: '🌆' },
                          { id: 'beach', label: 'Beach', icon: '🏖️' },
                          { id: 'airport', label: 'Airport', icon: '✈️' },
                          { id: 'railroad', label: 'Railroad', icon: '🚂' },
                          { id: 'parking_lot', label: 'Parking Lot', icon: '🚌' },
                          { id: 'marine_floating', label: 'Marine Floating', icon: '🌊' },
                        ] as { id: SurroundingsType; label: string; icon: string }[]
                      ).map((sur) => (
                        <button
                          key={sur.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStep1SubFocus('surroundings');
                            const newSur = sur.id;
                            const newOptions = getGroundsForSurroundings(newSur);
                            const isValid = stadium.grounds && newOptions.some((g) => g.id === stadium.grounds);
                            const nextGrounds = isValid ? stadium.grounds : getDefaultGroundsForSurroundings(newSur);
                            const validPerimeters = getContextualPerimeters(newSur, nextGrounds).map((p) => p.id);
                            const updatedStands = { ...stadium.stands };
                            let standsChanged = false;
                            for (const pos of (['east', 'west', 'north', 'south', 'corner_ne', 'corner_nw', 'corner_se', 'corner_sw'] as StandPosition[])) {
                              const st = updatedStands[pos];
                              if (st && (st.type === 'none' || st.type === 'no_stand')) {
                                if (st.perimeterFinish && !validPerimeters.includes(st.perimeterFinish)) {
                                  st.perimeterFinish = getDefaultPerimeterForContext(newSur, nextGrounds);
                                  standsChanged = true;
                                }
                              }
                            }
                            setStadium({
                              ...stadium,
                              surroundings: newSur,
                              grounds: nextGrounds,
                              ...(standsChanged ? { stands: updatedStands } : {}),
                            });
                          }}
                          className={`p-1.5 rounded border text-left flex items-center gap-1.5 transition-all ${
                            stadium.surroundings === sur.id
                              ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200'
                              : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-base">{sur.icon}</span>
                          <span className="font-bold text-[10px]">{sur.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* PHASE B5: SURROUNDING HORIZONS OVERHAUL (Deep Marine Ocean, Gibraltar Airport & Mountain Chains) */}
                    {(() => {
                      const sur = stadium.surroundings;
                      const isMarine = sur === 'marine_floating';
                      const isAirport = sur === 'airport';
                      const isMountains = sur === 'mountains' || sur === 'nature';

                      if (!isMarine && !isAirport && !isMountains) {
                        return null;
                      }

                      let horizonTitle = '360° PANORAMIC HORIZON SKYLINE';
                      let horizonDesc = 'Curved panoramic horizon with contextual atmospheric lighting';
                      let horizonKeyElements: string[] = [];
                      let activeArchetypeBadge = '';

                      if (isMarine) {
                        const arch = resolveMarineGroundArchetype(stadium.grounds);
                        horizonTitle = 'PHASE B5: DEEP MARINE OCEAN HORIZON';
                        horizonDesc = B5_HORIZON_FEATURES.marine.description;
                        activeArchetypeBadge = arch === 'aircraft_carrier' ? 'AIRCRAFT CARRIER DECK' :
                          arch === 'oil_rig' ? 'OFFSHORE OIL/GAS PLATFORM' :
                          arch === 'coral_atoll' ? 'TROPICAL CORAL ATOLL' : 'MODULAR HEX-PONTOON';
                        horizonKeyElements = B5_HORIZON_FEATURES.marine.keyElements;
                      } else if (isAirport) {
                        horizonTitle = 'PHASE B5: GIBRALTAR RUNWAY & ROCK';
                        horizonDesc = B5_HORIZON_FEATURES.airport.description;
                        activeArchetypeBadge = 'GIBRALTAR VICTORIA RUNWAY';
                        horizonKeyElements = B5_HORIZON_FEATURES.airport.keyElements;
                      } else if (isMountains) {
                        horizonTitle = 'PHASE B5: ALPINE MOUNTAIN CHAIN HORIZON';
                        horizonDesc = B5_HORIZON_FEATURES.mountains.description;
                        activeArchetypeBadge = 'PARALLAX ALPINE PEAKS & ALPENGLOW';
                        horizonKeyElements = B5_HORIZON_FEATURES.mountains.keyElements;
                      }

                      return (
                        <div className="p-2 rounded bg-slate-900/90 border border-cyan-500/30 space-y-1.5 mt-2">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="text-[9px] font-bold text-cyan-300 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>{horizonTitle}</span>
                            </span>
                            {activeArchetypeBadge && (
                              <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                                {activeArchetypeBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[8px] text-slate-400 leading-tight">
                            {horizonDesc}
                          </div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {horizonKeyElements.map((elem, idx) => (
                              <span
                                key={idx}
                                className="text-[7px] px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300"
                              >
                                ✓ {elem}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* PHASE ST3: Immediate Stadium Grounds & Forecourt Concourse (Step 1) */}
                  {(() => {
                    const groundsList = getGroundsForSurroundings(stadium.surroundings);
                    const currentGroundsId = stadium.grounds || groundsList[0]?.id || 'parking_lots';
                    const currentGrounds = groundsList.find((g) => g.id === currentGroundsId) || groundsList[0];
                    const isSpecializedSurroundings =
                      stadium.surroundings === 'marine_floating' ||
                      stadium.surroundings === 'airport' ||
                      stadium.surroundings === 'railroad' ||
                      stadium.surroundings === 'highway' ||
                      stadium.surroundings === 'beach' ||
                      stadium.surroundings === 'mountains' ||
                      stadium.surroundings === 'nature' ||
                      stadium.surroundings === 'forest' ||
                      stadium.surroundings === 'savannah';

                    return (
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span>IMMEDIATE GROUNDS & FORECOURT (STEP 1)</span>
                            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                              {groundsList.length} OPTIONS
                            </span>
                          </label>
                          <span className="text-[9px] text-cyan-300 font-bold font-mono">
                            {currentGrounds?.icon} {currentGrounds?.label}
                          </span>
                        </div>

                        <div className="text-[8px] text-slate-400 leading-tight">
                          Spatial Layer 4: Immediate perimeter plaza & concourse outside grandstand exterior walls before distant horizon.
                          {isSpecializedSurroundings && (
                            <span className="text-emerald-400 ml-1">
                              ✓ Homogeneity filter active for {stadium.surroundings.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                          {groundsList.map((g) => {
                            const isSelected = currentGroundsId === g.id;
                            return (
                              <button
                                key={g.id}
                                onClick={() => {
                                  audio.playKick(0.2);
                                  setStep1SubFocus('grounds');
                                  setStadium({ ...stadium, grounds: g.id });
                                }}
                                className={`p-1.5 rounded border text-left transition-all ${
                                  isSelected
                                    ? 'border-amber-400 bg-amber-950/50 text-amber-200 ring-1 ring-amber-400 shadow'
                                    : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 font-bold text-[9px] truncate">
                                    <span className="text-xs">{g.icon}</span>
                                    <span className="truncate">{g.label}</span>
                                  </div>
                                  {g.isSpecialized && (
                                    <span className="text-[7px] px-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold shrink-0">
                                      SPECIAL
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="text-[8px] text-amber-400 font-black">✓</span>
                                  )}
                                </div>
                                <div className="text-[7.5px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                                  {g.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* PHASE B4: Asymmetric Cardinal Directionality & Rich Ground Flavor Engine */}
                        {(() => {
                          const flavor = getGroundFlavorDetail(currentGroundsId);
                          return (
                            <div className="p-2 rounded bg-slate-900/90 border border-amber-500/30 space-y-2 mt-2">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                                <span className="text-[9px] font-bold text-amber-300 flex items-center gap-1">
                                  <Compass className="w-3 h-3 text-amber-400" />
                                  <span>PHASE B4: CARDINAL ASYMMETRIC GROUND FLAVOR</span>
                                </span>
                                <span className="text-[8px] text-cyan-400 font-mono font-bold">
                                  {flavor.name.toUpperCase()}
                                </span>
                              </div>

                              {/* 4 Cardinal Profiles Grid */}
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                                  <div className="flex items-center justify-between text-[8px] font-bold text-cyan-300">
                                    <span>🧭 NORTH (HORIZON SHELF)</span>
                                    <span className="text-[7px] text-slate-500">COMPACT</span>
                                  </div>
                                  <div className="text-[7.5px] text-slate-400 line-clamp-2">
                                    {flavor.northFlavor}
                                  </div>
                                </div>
                                <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                                  <div className="flex items-center justify-between text-[8px] font-bold text-amber-300">
                                    <span>🏛️ SOUTH (MAIN FACADE)</span>
                                    <span className="text-[7px] text-slate-500">PUBLIC HUB</span>
                                  </div>
                                  <div className="text-[7.5px] text-slate-400 line-clamp-2">
                                    {flavor.southFlavor}
                                  </div>
                                </div>
                                <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                                  <div className="flex items-center justify-between text-[8px] font-bold text-emerald-300">
                                    <span>🍔 EAST (FAN FANFARE)</span>
                                    <span className="text-[7px] text-slate-500">PROMENADE</span>
                                  </div>
                                  <div className="text-[7.5px] text-slate-400 line-clamp-2">
                                    {flavor.eastFlavor}
                                  </div>
                                </div>
                                <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80 space-y-0.5">
                                  <div className="flex items-center justify-between text-[8px] font-bold text-purple-300">
                                    <span>📡 WEST (MEDIA & BROADCAST)</span>
                                    <span className="text-[7px] text-slate-500">TECHNICAL</span>
                                  </div>
                                  <div className="text-[7.5px] text-slate-400 line-clamp-2">
                                    {flavor.westFlavor}
                                  </div>
                                </div>
                              </div>

                              {/* Bespoke 32-Bit Ground Props List */}
                              <div className="space-y-1 pt-1 border-t border-slate-800/60">
                                <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
                                  Bespoke 32-Bit Ground Props & Textures:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {flavor.groundProps.map((prop, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[7px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300"
                                    >
                                      ✓ {prop}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 2: STAND-BY-STAND FOCUS CAMERA & CHISELED INSPECTOR (14.4.2)   */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 2 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Stand Selector Tabs Header (8 Discrete Clockwise Stands) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1 text-[9px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 font-bold text-amber-300">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isRoundOval ? 'CONTINUOUS COLISEUM 4-SECTOR INSPECTOR:' : 'CLOCKWISE 8-STAND INSPECTOR:'}</span>
                      </span>
                      <span className="text-cyan-400 font-black">
                        {displayedStands.find((s) => s.id === activeStandPos)?.name.toUpperCase() || String(activeStandPos).toUpperCase()}
                      </span>
                    </div>

                    <div className={`p-1 bg-slate-950 rounded-lg border border-slate-800 grid gap-1 ${isRoundOval ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-8'}`}>
                      {displayedStands.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setActiveStandPos(s.id);
                            setCameraPerspective('stands');
                          }}
                          title={s.desc}
                          className={`py-1.5 px-0.5 rounded text-center uppercase font-bold text-[9px] transition-all border ${
                            activeStandPos === s.id
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black ring-1 ring-amber-300'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="truncate">{s.shortLabel}</div>
                        </button>
                      ))}
                    </div>

                    {/* Active Stand Role & Description Strip */}
                    <div className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-[9px]">
                      <span className="text-slate-300 font-bold truncate">
                        {displayedStands.find((s) => s.id === activeStandPos)?.desc || CLOCKWISE_STANDS.find((s) => s.id === activeStandPos)?.desc}
                      </span>
                      {!isRoundOval && activeStandPos.startsWith('corner_') && (
                        <button
                          onClick={copyCornerToAllCorners}
                          className="flex-none ml-2 px-1.5 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 font-black text-[8px] tracking-wide active:scale-95 transition-all"
                          title="Replicate this corner's architecture to all 4 corners"
                        >
                          ⚡ UNIFY ALL 4 CORNERS
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stand Structural Type: Tiered vs Wall Tier vs No Stand */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      STAND STRUCTURAL TYPE
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => updateCurrentStand({ type: 'tiered' })}
                        className={`p-2 rounded border text-left font-bold ${
                          activeStandConfig?.type === 'tiered'
                            ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div>TIERED</div>
                        <div className="text-[8px] text-slate-500">1 to 4 Decks</div>
                      </button>

                      <button
                        onClick={() => updateCurrentStand({ type: 'wall' })}
                        className={`p-2 rounded border text-left font-bold ${
                          activeStandConfig?.type === 'wall'
                            ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div>WALL TIER</div>
                        <div className="text-[8px] text-slate-500">Yellow Wall</div>
                      </button>

                      <button
                        onClick={() => updateCurrentStand({ type: 'none' })}
                        className={`p-2 rounded border text-left font-bold ${
                          activeStandConfig?.type === 'none' || activeStandConfig?.type === 'no_stand'
                            ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div>NO STAND</div>
                        <div className="text-[8px] text-slate-500">Open End</div>
                      </button>
                    </div>
                  </div>

                  {/* If Tiered: Tier Count (1 to 4) & Tier Size */}
                  {activeStandConfig?.type === 'tiered' && (
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">TIER DECKS COUNT:</span>
                        <div className="flex items-center gap-1">
                          {([1, 2, 3, 4] as (1 | 2 | 3 | 4)[]).map((tc) => (
                            <button
                              key={tc}
                              onClick={() => {
                                const currentTiers = activeStandConfig.tiers || [];
                                const newTiers = Array.from({ length: tc }, (_, i) => currentTiers[i] || { size: 'medium' as TierSize });
                                updateCurrentStand({ tierCount: tc, tiers: newTiers });
                              }}
                              className={`w-7 h-6 rounded font-bold border text-xs ${
                                activeStandConfig.tierCount === tc
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {tc}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tier size per deck */}
                      <div className="space-y-1">
                        {(activeStandConfig.tiers || [{ size: 'medium' }]).map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px] bg-slate-900 p-1.5 rounded">
                            <span className="text-slate-400 font-bold">DECK {idx + 1}:</span>
                            <div className="flex gap-1">
                              {(['small', 'medium', 'large'] as TierSize[]).map((sz) => (
                                <button
                                  key={sz}
                                  onClick={() => {
                                    const nextTiers = [...(activeStandConfig.tiers || [])];
                                    nextTiers[idx] = { ...nextTiers[idx], size: sz };
                                    updateCurrentStand({ tiers: nextTiers });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${
                                    t.size === sz
                                      ? 'bg-cyan-500 border-cyan-300 text-slate-950 font-black shadow-sm'
                                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {sz === 'small' && 'Small (2 Rows)'}
                                  {sz === 'medium' && 'Medium (3 Rows)'}
                                  {sz === 'large' && 'Big (4 Rows)'}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If Wall Tier: Wall size (small, medium, large) */}
                  {activeStandConfig?.type === 'wall' && (
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        WALL TIER SCALE (DORTMUND-STYLE CONTINUOUS TERRACE)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['small', 'medium', 'large'] as WallTierSize[]).map((wsz) => (
                          <button
                            key={wsz}
                            onClick={() => updateCurrentStand({ wallSize: wsz })}
                            className={`p-2 rounded border text-center font-bold uppercase ${
                              activeStandConfig.wallSize === wsz
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            <div>{wsz === 'small' ? 'Small' : wsz === 'medium' ? 'Medium' : 'Big'}</div>
                            <div className="text-[8px] text-slate-500">
                              {wsz === 'small' ? '2 Chair Sets' : wsz === 'medium' ? '3 Chair Sets' : '4 Chair Sets'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase S2 & S5: Grandstand Substance & Density Panel */}
                  {activeStandConfig?.type !== 'none' && activeStandConfig?.type !== 'no_stand' && (
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                          TIER DENSITY & SUBSTANCE (PHASE S5 WYSIWYG)
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
                          {activeStandConfig.type === 'wall'
                            ? `${getTierChairRows(activeStandConfig.wallSize)} SEAT ROWS`
                            : `${(activeStandConfig.tiers || [{ size: 'medium' }]).reduce((acc, cur) => acc + getTierChairRows(cur.size), 0)} TOTAL ROWS`}
                        </span>
                      </div>

                      {/* S5.1 Quick Tier Density Presets (2, 3, 4 Chair Rows per Tier) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold">
                          <span>STEPPED CHAIR ROWS PER TIER:</span>
                          <span className="text-cyan-300">INSTANT PREVIEW</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => {
                              audio.playKick(0.2);
                              if (activeStandConfig.type === 'wall') {
                                updateCurrentStand({ wallSize: 'small' });
                              } else {
                                const tiers = (activeStandConfig.tiers || [{ size: 'small' }]).map(() => ({ size: 'small' as TierSize }));
                                updateCurrentStand({ tiers });
                              }
                            }}
                            className={`p-1.5 rounded border text-center transition-all ${
                              (activeStandConfig.type === 'wall' ? activeStandConfig.wallSize === 'small' : (activeStandConfig.tiers?.[0]?.size === 'small'))
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-sm'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="font-bold text-[9px]">2 CHAIR ROWS</div>
                            <div className="text-[7px] text-slate-500">Small Deck (2 Rows)</div>
                          </button>

                          <button
                            onClick={() => {
                              audio.playKick(0.2);
                              if (activeStandConfig.type === 'wall') {
                                updateCurrentStand({ wallSize: 'medium' });
                              } else {
                                const tiers = (activeStandConfig.tiers || [{ size: 'medium' }]).map(() => ({ size: 'medium' as TierSize }));
                                updateCurrentStand({ tiers });
                              }
                            }}
                            className={`p-1.5 rounded border text-center transition-all ${
                              (activeStandConfig.type === 'wall' ? activeStandConfig.wallSize === 'medium' : (activeStandConfig.tiers?.[0]?.size === 'medium'))
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="font-bold text-[9px]">3 CHAIR ROWS</div>
                            <div className="text-[7px] text-slate-500">Medium Deck (3 Rows)</div>
                          </button>

                          <button
                            onClick={() => {
                              audio.playKick(0.2);
                              if (activeStandConfig.type === 'wall') {
                                updateCurrentStand({ wallSize: 'large' });
                              } else {
                                const tiers = (activeStandConfig.tiers || [{ size: 'large' }]).map(() => ({ size: 'large' as TierSize }));
                                updateCurrentStand({ tiers });
                              }
                            }}
                            className={`p-1.5 rounded border text-center transition-all ${
                              (activeStandConfig.type === 'wall' ? activeStandConfig.wallSize === 'large' : (activeStandConfig.tiers?.[0]?.size === 'large'))
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-sm'
                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="font-bold text-[9px]">4 CHAIR ROWS</div>
                            <div className="text-[7px] text-slate-500">Big Deck (4 Rows)</div>
                          </button>
                        </div>
                      </div>

                      {/* S2.2 Tier Safety Balustrade Style */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">TIER SAFETY FENCE / BALUSTRADE:</span>
                        <div className="grid grid-cols-2 gap-1">
                          {([
                            { id: 'metal_railing', label: 'Tubular Pipe Railing' },
                            { id: 'leitch_lattice', label: 'Archibald Leitch Lattice' },
                            { id: 'industrial_mesh', label: 'Steel Wire Mesh' },
                            { id: 'glass_balustrade', label: 'Tempered Glass Balustrade' },
                            { id: 'illuminated_glass', label: 'Illuminated LED Glass' },
                          ] as { id: TierBalustradeStyle; label: string }[]).map((b) => (
                            <button
                              key={b.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                updateCurrentStand({ balustradeStyle: b.id });
                              }}
                              className={`px-1.5 py-1 rounded text-left text-[9px] font-bold border truncate ${
                                (activeStandConfig.balustradeStyle ||
                                  (activeStandConfig.grade === 'grade2_classic'
                                    ? 'leitch_lattice'
                                    : activeStandConfig.grade === 'grade3_industrial'
                                    ? 'industrial_mesh'
                                    : activeStandConfig.grade === 'grade4_modern'
                                    ? 'glass_balustrade'
                                    : activeStandConfig.grade === 'grade5_futuristic'
                                    ? 'illuminated_glass'
                                    : 'metal_railing')) === b.id
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* S2.2 Outer Rear Delimitation Wall Material */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">REAR DELIMITATION WALL:</span>
                        <div className="grid grid-cols-3 gap-1">
                          {([
                            { id: 'brick', label: '🧱 Red Brick' },
                            { id: 'concrete', label: '🏢 Concrete Slab' },
                            { id: 'corrugated_steel', label: '🏭 Gunmetal Steel' },
                            { id: 'timber', label: '🪵 Heavy Timber' },
                            { id: 'stone', label: '🪨 Ashlar Stone' },
                          ] as { id: RearWallMaterial; label: string }[]).map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                updateCurrentStand({ rearWallMaterial: m.id });
                              }}
                              className={`px-1 py-1 rounded text-center text-[9px] font-bold border truncate ${
                                (activeStandConfig.rearWallMaterial ||
                                  (activeStandConfig.grade === 'grade2_classic'
                                    ? 'brick'
                                    : activeStandConfig.grade === 'grade3_industrial'
                                    ? 'corrugated_steel'
                                    : activeStandConfig.grade === 'grade1_municipal'
                                    ? 'timber'
                                    : 'concrete')) === m.id
                                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* S2.2 Solid Under-Seat Decking Material */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">SOLID UNDER-SEAT DECKING:</span>
                        <div className="grid grid-cols-4 gap-1">
                          {([
                            { id: 'timber', label: 'Timber' },
                            { id: 'concrete', label: 'Concrete' },
                            { id: 'steel', label: 'Steel Plate' },
                            { id: 'composite', label: 'Composite' },
                          ] as { id: StandDeckMaterial; label: string }[]).map((d) => (
                            <button
                              key={d.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                updateCurrentStand({ deckMaterial: d.id });
                              }}
                              className={`px-1 py-0.5 rounded text-center text-[9px] font-bold border truncate ${
                                (activeStandConfig.deckMaterial ||
                                  (activeStandConfig.grade === 'grade1_municipal'
                                    ? 'timber'
                                    : activeStandConfig.grade === 'grade3_industrial'
                                    ? 'steel'
                                    : activeStandConfig.grade === 'grade5_futuristic'
                                    ? 'composite'
                                    : 'concrete')) === d.id
                                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* B3.1 Grandstand Material Selector */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">32-BIT GRANDSTAND MATERIAL (B3.1):</span>
                        <div className="grid grid-cols-2 gap-1">
                          {CANONICAL_B3_MATERIALS.map((mat) => {
                            const isSelected = (activeStandConfig.grandstandMaterial || resolveGrandstandMaterial(activeStandConfig)) === mat.id;
                            return (
                              <button
                                key={mat.id}
                                onClick={() => {
                                  audio.playKick(0.2);
                                  updateCurrentStand({ grandstandMaterial: mat.id });
                                }}
                                className={`p-1.5 rounded border text-left text-[9px] transition-all ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                                }`}
                                title={mat.desc}
                              >
                                <div className="font-bold truncate flex items-center gap-1">
                                  <span>{mat.icon}</span>
                                  <span className="truncate">{mat.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ----------------------------------------------------------- */}
                      {/* PHASE ST4: ROOF CANOPY, EAVE OVERHANG & 3-LEVEL CUSTOMIZER */}
                      {/* ----------------------------------------------------------- */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span>🏛️ ROOF CANOPY & EAVE OVERHANG (ST4)</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                audio.playKick(0.2);
                                updateCurrentStand({ hasRoof: activeStandConfig.hasRoof === false ? true : false });
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                activeStandConfig.hasRoof !== false
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {activeStandConfig.hasRoof !== false ? 'ROOF ON' : 'NO ROOF'}
                            </button>
                          </div>
                        </div>

                        {activeStandConfig.hasRoof !== false && (
                          <div className="space-y-2">
                            {/* 1. Style */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">
                                {isRoundOrOvalShape(stadium.shape) ? 'CONTINUOUS ROOF STYLE:' : 'ROOF ARCHITECTURE STYLE:'}
                              </span>
                              <div className="grid grid-cols-2 gap-1">
                                {getRoofStylesForShape(stadium.shape).map((st) => (
                                  <button
                                    key={st.id}
                                    onClick={() => {
                                      audio.playKick(0.2);
                                      updateCurrentStand({ roofStyle: st.id });
                                    }}
                                    className={`p-1.5 rounded border text-left text-[9px] transition-all ${
                                      (activeStandConfig.roofStyle || stadium.roof?.style || (isRoundOrOvalShape(stadium.shape) ? 'spoke_wheel_tension' : 'cantilever_truss')) === st.id
                                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                                    }`}
                                  >
                                    <div className="font-bold truncate">{st.label}</div>
                                    <div className="text-[7px] text-slate-500 truncate">{st.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 2. Material */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">CANOPY DECK MATERIAL:</span>
                              <div className="grid grid-cols-4 gap-1">
                                {getRoofMaterialsForShape(stadium.shape).map((mat) => (
                                  <button
                                    key={mat.id}
                                    onClick={() => {
                                      audio.playKick(0.2);
                                      updateCurrentStand({ roofMaterial: mat.id });
                                    }}
                                    className={`px-1 py-1 rounded text-center text-[8px] font-bold border truncate ${
                                      (activeStandConfig.roofMaterial || stadium.roof?.material || (isRoundOrOvalShape(stadium.shape) ? 'ptfe_fabric' : 'corrugated_steel')) === mat.id
                                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                    }`}
                                    title={mat.desc}
                                  >
                                    {mat.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 3. Fascia Border / Inner Halo Ribbon */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">
                                {isRoundOrOvalShape(stadium.shape) ? 'INNER OCULAR RIM & HALO BOARD:' : 'FASCIA BORDER & TRIM:'}
                              </span>
                              <div className="grid grid-cols-2 gap-1">
                                {getRoofBordersForShape(stadium.shape).map((b) => (
                                  <button
                                    key={b.id}
                                    onClick={() => {
                                      audio.playKick(0.2);
                                      updateCurrentStand({ roofBorder: b.id });
                                    }}
                                    className={`px-1.5 py-1 rounded text-left text-[8px] font-bold border truncate ${
                                      (activeStandConfig.roofBorder || stadium.roof?.border || (isRoundOrOvalShape(stadium.shape) ? 'video_halo_board' : 'painted_club_fascia')) === b.id
                                        ? 'bg-indigo-500 text-white border-indigo-300 font-black'
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                    }`}
                                    title={b.desc}
                                  >
                                    {b.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 4. Stand Cutaway Override */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase">
                                <span>STAND CUTAWAY OVERRIDE:</span>
                                <span className="text-cyan-300">
                                  {activeStandConfig.roofCutaway || `GLOBAL (${stadium.roofCutaway || 'PARTIAL'})`}
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {[
                                  { id: undefined, label: 'Global' },
                                  { id: 'hidden', label: 'Hidden (0%)' },
                                  { id: 'partial', label: 'Edge (50%)' },
                                  { id: 'full', label: 'Full (100%)' },
                                ].map((c) => (
                                  <button
                                    key={c.label}
                                    onClick={() => {
                                      audio.playKick(0.2);
                                      updateCurrentStand({ roofCutaway: c.id as RoofCutawayMode | undefined });
                                    }}
                                    className={`py-0.5 rounded text-center text-[8px] font-bold border truncate ${
                                      activeStandConfig.roofCutaway === c.id
                                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                        : 'bg-slate-900 text-slate-400 border-slate-800'
                                    }`}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 5. APPLY TO ALL 8 STANDS */}
                            <button
                              onClick={() => {
                                audio.playKick(0.25);
                                const roofStyle = activeStandConfig.roofStyle || stadium.roof?.style || 'cantilever_truss';
                                const roofMaterial = activeStandConfig.roofMaterial || stadium.roof?.material || 'corrugated_steel';
                                const roofBorder = activeStandConfig.roofBorder || stadium.roof?.border || 'painted_club_fascia';
                                const hasRoof = activeStandConfig.hasRoof !== false;
                                const standKeys = ['west', 'east', 'north', 'south', 'corner_nw', 'corner_ne', 'corner_se', 'corner_sw'] as const;
                                const updatedStands = { ...stadium.stands };
                                standKeys.forEach((key) => {
                                  const existing = updatedStands[key];
                                  if (existing && existing.type !== 'none' && existing.type !== 'no_stand') {
                                    updatedStands[key] = {
                                      ...existing,
                                      hasRoof,
                                      roofStyle,
                                      roofMaterial,
                                      roofBorder,
                                    };
                                  }
                                });
                                setStadium({
                                  ...stadium,
                                  roof: {
                                    ...(stadium.roof || getDefaultRoofConfig()),
                                    style: roofStyle,
                                    material: roofMaterial,
                                    border: roofBorder,
                                  },
                                  stands: updatedStands,
                                });
                              }}
                              className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/50 text-amber-300 text-[9px] font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>⚡</span>
                              <span>APPLY ROOF ARCHITECTURE TO ALL 8 STANDS</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* If No Stand: 15.7.1 Contextual Backdrop, Universal Wall, 15.7.2 Perimeter Finish & 15.7.3 Grassroots Fans */}
                  {(activeStandConfig?.type === 'none' || activeStandConfig?.type === 'no_stand') ? (
                    <div className="space-y-3">
                      {/* 15.7.1 Contextual Backdrop */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          NO-STAND CONTEXTUAL BACKDROP (PHASE 15.7.1)
                        </label>
                        <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto">
                          {getBackdropsForSurroundings(stadium.surroundings).map((bd) => (
                            <button
                              key={bd.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                updateCurrentStand({ backdrop: bd.id, noStandBackdrop: bd.id });
                              }}
                              className={`w-full p-1.5 rounded border text-left text-[10px] font-bold flex items-center justify-between transition-all ${
                                (activeStandConfig.backdrop === bd.id || activeStandConfig.noStandBackdrop === bd.id)
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{bd.label}</span>
                              {(activeStandConfig.backdrop === bd.id || activeStandConfig.noStandBackdrop === bd.id) && (
                                <Check className="w-3.5 h-3.5 text-slate-950" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* If Backdrop is Wall: Wall Height & Material */}
                      {(activeStandConfig.backdrop === 'wall' || activeStandConfig.noStandBackdrop === 'wall') && (
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/50 space-y-2">
                          <label className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">
                            🧱 UNIVERSAL PERIMETER WALL OPTIONS
                          </label>
                          {/* Wall Size */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">WALL HEIGHT:</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(['low', 'medium', 'tall'] as WallSize[]).map((sz) => (
                                <button
                                  key={sz}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    updateCurrentStand({
                                      wallPerimeter: {
                                        size: sz,
                                        material: activeStandConfig.wallPerimeter?.material || 'brick',
                                      },
                                    });
                                  }}
                                  className={`py-1 rounded text-center text-[9px] font-bold uppercase border ${
                                    (activeStandConfig.wallPerimeter?.size || 'medium') === sz
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Wall Material */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">WALL FINISH MATERIAL:</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(
                                [
                                  { id: 'brick', label: 'Brick' },
                                  { id: 'concrete', label: 'Concrete' },
                                  { id: 'stone', label: 'Stone' },
                                  { id: 'timber', label: 'Timber' },
                                  { id: 'metal_cladding', label: 'Metal' },
                                ] as { id: WallMaterial; label: string }[]
                              ).map((mat) => (
                                <button
                                  key={mat.id}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    updateCurrentStand({
                                      wallPerimeter: {
                                        size: activeStandConfig.wallPerimeter?.size || 'medium',
                                        material: mat.id,
                                      },
                                    });
                                  }}
                                  className={`py-1 rounded text-center text-[9px] font-bold uppercase border ${
                                    (activeStandConfig.wallPerimeter?.material || 'brick') === mat.id
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {mat.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PHASE A2 Contextual Perimeter Enclosure Suite */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                            CONTEXTUAL PERIMETER ENCLOSURE (PHASE A2)
                          </label>
                          <span className="text-[9px] text-slate-500 uppercase font-mono">
                            {stadium.surroundings.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {getContextualPerimeters(stadium.surroundings, stadium.grounds).map((p) => {
                            const isSelected = (activeStandConfig.perimeterFinish || getDefaultPerimeterForContext(stadium.surroundings, stadium.grounds)) === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  audio.playKick(0.2);
                                  updateCurrentStand({ perimeterFinish: p.id });
                                }}
                                className={`w-full p-2 rounded border text-left text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-sm">{p.icon}</span>
                                    <span>{p.label}</span>
                                  </span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-slate-950 flex-shrink-0" />
                                  )}
                                </div>
                                <div className={`text-[8.5px] mt-0.5 line-clamp-1 ${
                                  isSelected ? 'text-slate-900/80 font-medium' : 'text-slate-500 font-normal'
                                }`}>
                                  {p.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 15.7.3 Grassroots Fan Presence */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-200 text-[10px] uppercase flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            <span>GRASSROOTS SUPPORTERS (15.7.3)</span>
                          </div>
                          <div className="text-[9px] text-slate-500">
                            Casual fans leaning on barrier with caps, scarves & beers
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            audio.playKick(0.2);
                            updateCurrentStand({ hasGrassrootsFans: activeStandConfig.hasGrassrootsFans === false ? true : false });
                          }}
                          className={`px-3 py-1 rounded font-bold text-[10px] border transition-all ${
                            activeStandConfig.hasGrassrootsFans !== false
                              ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {activeStandConfig.hasGrassrootsFans !== false ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Stand Architectural Grade (5 Grades) */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          ARCHITECTURAL GRADE & FINISH
                        </label>
                        <div className="space-y-1">
                          {(
                            [
                              { id: 'grade1_municipal', label: 'Grade 1: Municipal (Weathered Cinder Block / Timber)' },
                              { id: 'grade2_classic', label: 'Grade 2: Classic (English Red-Brick Masonry)' },
                              { id: 'grade3_industrial', label: 'Grade 3: Industrial (Corrugated Heavy Steel)' },
                              { id: 'grade4_modern', label: 'Grade 4: Modern (Pre-Cast Concrete & Glass)' },
                              { id: 'grade5_futuristic', label: 'Grade 5: Futuristic (Aero-Aluminum & LED Ribbon)' },
                            ] as { id: StandGrade; label: string }[]
                          ).map((g) => (
                            <button
                              key={g.id}
                              onClick={() => updateCurrentStand({ grade: g.id })}
                              className={`w-full p-1.5 rounded border text-left text-[10px] font-bold transition-all ${
                                activeStandConfig?.grade === g.id
                                  ? 'border-amber-400 bg-amber-950/50 text-amber-200'
                                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Roof Inspector */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-200 text-[10px] uppercase">
                            ROOF CANOPY
                          </div>
                          <div className="text-[9px] text-slate-500">
                            Coverage: {Math.round((activeStandConfig?.roofCoverage || 0.8) * 100)}%
                          </div>
                        </div>
                        <button
                          onClick={() => updateCurrentStand({ hasRoof: !activeStandConfig?.hasRoof })}
                          className={`px-3 py-1 rounded font-bold text-[10px] border ${
                            activeStandConfig?.hasRoof
                              ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {activeStandConfig?.hasRoof ? 'ROOF COVERED' : 'OPEN SKY'}
                        </button>
                      </div>

                      {/* Stand Primary & Secondary Seat Colors (Independent) */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          STAND SEAT COLORS (INDEPENDENT)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-bold">PRIMARY COLOR:</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={activeStandConfig?.primaryColor || HOME_KIT.primaryColor}
                                onChange={(e) => updateCurrentStand({ primaryColor: e.target.value })}
                                className="w-7 h-6 rounded bg-transparent cursor-pointer border border-slate-700"
                              />
                              <input
                                type="text"
                                value={activeStandConfig?.primaryColor || HOME_KIT.primaryColor}
                                onChange={(e) => updateCurrentStand({ primaryColor: e.target.value })}
                                className="w-full px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono uppercase text-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-bold">SECONDARY COLOR:</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={activeStandConfig?.secondaryColor || HOME_KIT.secondaryColor}
                                onChange={(e) => updateCurrentStand({ secondaryColor: e.target.value })}
                                className="w-7 h-6 rounded bg-transparent cursor-pointer border border-slate-700"
                              />
                              <input
                                type="text"
                                value={activeStandConfig?.secondaryColor || HOME_KIT.secondaryColor}
                                onChange={(e) => updateCurrentStand({ secondaryColor: e.target.value })}
                                className="w-full px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono uppercase text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stand Deck & Rear Wall Materials */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          STAND SUBSTRATE & REAR WALL MATERIALS
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold">DECKING SUBSTRATE:</span>
                            <div className="grid grid-cols-2 gap-1 mt-0.5">
                              {(['concrete', 'timber', 'steel', 'composite'] as StandDeckMaterial[]).map((dm) => (
                                <button
                                  key={dm}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    updateCurrentStand({ deckMaterial: dm });
                                  }}
                                  className={`py-0.5 px-1 rounded text-[8px] font-bold uppercase border truncate ${
                                    (activeStandConfig?.deckMaterial || 'concrete') === dm
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  {dm}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-bold">REAR BOUNDARY WALL:</span>
                            <div className="grid grid-cols-2 gap-1 mt-0.5">
                              {(['brick', 'concrete', 'corrugated_steel', 'timber', 'stone'] as RearWallMaterial[]).map((rwm) => (
                                <button
                                  key={rwm}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    updateCurrentStand({ rearWallMaterial: rwm });
                                  }}
                                  className={`py-0.5 px-1 rounded text-[8px] font-bold uppercase border truncate ${
                                    (activeStandConfig?.rearWallMaterial || 'concrete') === rwm
                                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  {rwm.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 3: DUGOUTS & ENTRANCE TUNNEL INSPECTOR (14.4.3)                */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 3 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Dugout vs Tunnel Sub-Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                      onClick={() => {
                        audio.playKick(0.2);
                        setStep3SubTab('dugouts');
                      }}
                      className={`py-2 rounded text-center font-bold text-xs uppercase border transition-all flex items-center justify-center gap-1.5 ${
                        step3SubTab === 'dugouts'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <Armchair className="w-4 h-4" />
                      <span>DUGOUT BENCHES</span>
                    </button>

                    <button
                      onClick={() => {
                        audio.playKick(0.2);
                        setStep3SubTab('tunnel');
                      }}
                      className={`py-2 rounded text-center font-bold text-xs uppercase border transition-all flex items-center justify-center gap-1.5 ${
                        step3SubTab === 'tunnel'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <DoorOpen className="w-4 h-4" />
                      <span>ENTRANCE TUNNEL</span>
                    </button>
                  </div>

                  {/* DUGOUT BENCHES INSPECTOR */}
                  {step3SubTab === 'dugouts' && (
                    <div className="space-y-2.5 animate-fadeIn">
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          BENCH TYPE (5 CANONICAL STYLES)
                        </label>
                        <div className="space-y-1">
                          {(
                            [
                              { id: 'recaro_racing', label: 'Recaro Racing Bucket Seats (Premier League / UCL Luxury)' },
                              { id: 'covered_sunken', label: 'Covered Sunken Dugout Trench (Acrylic Canopy Shield)' },
                              { id: 'classic_timber', label: 'Classic Timber Bench (Grassroots Slatted Wood)' },
                              { id: 'utilitarian_concrete', label: 'Utilitarian Concrete Bunker (Heavy Cast Cinder Block)' },
                              { id: 'folding_chairs', label: 'Pitch-Level Folding Chairs (Community Ground)' },
                            ] as { id: BenchType; label: string }[]
                          ).map((b) => (
                            <button
                              key={b.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                setStadium({
                                  ...stadium,
                                  dugouts: {
                                    ...(stadium.dugouts || {
                                      type: b.id,
                                      quality: 'modern',
                                      frameColor: '#0f172a',
                                      cushionColor: '#dc2626',
                                      shelterTint: 'rgba(15,23,42,0.9)',
                                      setbackDistance: 12,
                                    }),
                                    type: b.id,
                                  },
                                });
                              }}
                              className={`w-full p-2 rounded border text-left text-[10px] font-bold ${
                                stadium.dugouts?.type === b.id
                                  ? 'border-amber-400 bg-amber-950/50 text-amber-200'
                                  : 'border-slate-800 bg-slate-900 text-slate-400'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bench Quality Tier */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          BENCH QUALITY TIER
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {(['municipal', 'classic', 'modern', 'elite_vip'] as BenchQualityTier[]).map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                audio.playKick(0.2);
                                if (stadium.dugouts) {
                                  setStadium({
                                    ...stadium,
                                    dugouts: { ...stadium.dugouts, quality: q },
                                  });
                                }
                              }}
                              className={`py-1.5 rounded border text-center text-[9px] uppercase font-bold ${
                                stadium.dugouts?.quality === q
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {q.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PLAYER ENTRANCE TUNNEL INSPECTOR */}
                  {step3SubTab === 'tunnel' && (
                    <div className="space-y-2.5 animate-fadeIn">
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          TUNNEL TYPE (5 CANONICAL PORTALS)
                        </label>
                        <div className="space-y-1">
                          {(
                            [
                              { id: 'inflatable_accordion', label: 'Inflatable Accordion Bellows (South American Style)' },
                              { id: 'modern_architectural', label: 'Modern Architectural Backlit LED Ribbon Tunnel' },
                              { id: 'subterranean_staircase', label: 'Subterranean Concrete Staircase (English Ground)' },
                              { id: 'direct_portal', label: 'Direct Pitch-Level Portal with Security Grille' },
                              { id: 'telescopic_canopy', label: 'Covered Telescopic Canopy on Sliding Tracks' },
                            ] as { id: TunnelType; label: string }[]
                          ).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                setStadium({
                                  ...stadium,
                                  tunnel: {
                                    ...(stadium.tunnel || {
                                      type: t.id,
                                      siting: 'center_main',
                                      primaryColor: '#2563eb',
                                      secondaryColor: '#ffffff',
                                    }),
                                    type: t.id,
                                  },
                                });
                              }}
                              className={`w-full p-2 rounded border text-left text-[10px] font-bold ${
                                stadium.tunnel?.type === t.id
                                  ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200'
                                  : 'border-slate-800 bg-slate-900 text-slate-400'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tunnel Siting */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          TUNNEL SITING & LOCATION
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'center_main', label: 'Center Main' },
                              { id: 'corner', label: 'Pitch Corner' },
                              { id: 'behind_goal', label: 'Behind Goal' },
                            ] as { id: TunnelSiting; label: string }[]
                          ).map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                if (stadium.tunnel) {
                                  setStadium({
                                    ...stadium,
                                    tunnel: { ...stadium.tunnel, siting: s.id },
                                  });
                                }
                              }}
                              className={`py-1.5 rounded border text-center text-[10px] uppercase font-bold ${
                                stadium.tunnel?.siting === s.id
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 4: STAND COMPLETION & SATISFACTION CONFIRMATION (14.4.4)      */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 4 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase border-b border-slate-800 pb-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>STRUCTURAL ARCHITECTURE SUMMARY</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">SHAPE & SURROUNDINGS:</div>
                        <div className="font-bold text-white uppercase mt-0.5">{stadium.shape} • {stadium.surroundings}</div>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">CALCULATED CAPACITY:</div>
                        <div className="font-bold text-amber-300 text-sm mt-0.5">{totalCapacity.toLocaleString()} SEATS</div>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">DUGOUTS & TUNNEL:</div>
                        <div className="font-bold text-cyan-300 uppercase mt-0.5">
                          {stadium.dugouts?.type.replace('_', ' ')} • {stadium.tunnel?.siting}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">FIFA QUALIFICATION:</div>
                        <div className="font-bold text-emerald-400 text-sm uppercase mt-0.5">{currentFifa.replace('_', ' ')}</div>
                      </div>
                    </div>

                    {/* Lock Button */}
                    <button
                      onClick={() => {
                        audio.playKick(0.35);
                        setIsArchitectureLocked(true);
                        setCurrentStep(5);
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>LOCK ARCHITECTURE & ADVANCE TO AESTHETICS ⏩</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 5: FULL-STADIUM PAN - SEAT COLOR, PATTERN & STYLES (14.4.5)   */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 5 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Seat Pattern Selection */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      GRANDSTAND SEAT PATTERN
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'solid', label: 'Solid Color' },
                          { id: 'horizontalBands', label: 'Horizontal Bands' },
                          { id: 'verticalStripes', label: 'Vertical Stripes' },
                          { id: 'lowerUpper', label: 'Lower / Upper Decks' },
                          { id: 'perStand', label: 'Per Stand Division' },
                        ] as { id: SeatPattern; label: string }[]
                      ).map((pat) => (
                        <button
                          key={pat.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              seats: { ...stadium.seats, pattern: pat.id },
                            });
                          }}
                          className={`p-2 rounded border text-left font-bold text-[10px] ${
                            stadium.seats.pattern === pat.id
                              ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {pat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seat Style (Bucket, VIP, Bench, Tip-up) */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      SEAT HARDWARE STYLE
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'classic_bucket', label: 'Classic Bucket' },
                          { id: 'tip_up_padded', label: 'Tip-Up Padded' },
                          { id: 'vip_leather', label: 'VIP Leather' },
                          { id: 'plastic_bench', label: 'Plastic Bench' },
                        ] as { id: SeatStyle; label: string }[]
                      ).map((st) => (
                        <button
                          key={st.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              seats: { ...stadium.seats, style: st.id },
                            });
                          }}
                          className={`p-1.5 rounded border text-left font-bold text-[10px] ${
                            stadium.seats.style === st.id
                              ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary & Accent Seat Colors */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      CLUB SEAT PALETTE
                    </label>
                    <div className="flex items-center gap-2">
                      {['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#7c3aed', '#ffffff', '#0f172a'].map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              seats: { ...stadium.seats, colors: [c, stadium.seats.colors[1] || '#ffffff'] },
                            });
                          }}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            stadium.seats.colors[0] === c ? 'scale-125 border-amber-400 ring-2 ring-amber-400' : 'border-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Phase A5.2: 32-Bit Seat Hardware Archetype */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">
                      🪑 32-BIT SEAT HARDWARE ARCHETYPE (PHASE A5.2)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SEAT_ARCHETYPE_OPTIONS.map((arch) => {
                        const isSelected = (stadium.seatArchetype || stadium.seats?.archetype || 'molded_bucket') === arch.id;
                        return (
                          <button
                            key={arch.id}
                            onClick={() => {
                              audio.playKick(0.2);
                              setStadium({
                                ...stadium,
                                seatArchetype: arch.id,
                                seats: { ...stadium.seats, archetype: arch.id },
                              });
                            }}
                            className={`p-1.5 rounded border text-left transition-all ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-sm'
                                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-bold text-[9px]">
                              <span>{arch.icon}</span>
                              <span className="truncate">{arch.label}</span>
                            </div>
                            <div className="text-[7.5px] text-slate-500 mt-0.5 line-clamp-2">
                              {arch.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phase A5.3: Pitch Apron Material & Infill */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                      🏟️ PITCH APRON MATERIAL & INFILL (PHASE A5.3)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'artificial_turf' as ApronMaterial, label: 'Synthetic Turf', desc: 'Dual-tone emerald stripes & infill' },
                        { id: 'rubber_tartan' as ApronMaterial, label: 'Olympic Tartan Track', desc: '8-lane Olympic red running track' },
                        { id: 'heritage_red_brick' as ApronMaterial, label: 'Heritage Brick', desc: 'English Flemish-bond brick pavers' },
                        { id: 'concrete' as ApronMaterial, label: 'Brushed Concrete', desc: 'Precast pavers with expansion joints' },
                        { id: 'natural_grass' as ApronMaterial, label: 'Natural Grass', desc: 'Continuation of pitch grass' },
                        { id: 'asphalt' as ApronMaterial, label: 'Dark Asphalt', desc: 'Coarse aggregate perimeter tarmac' },
                      ].map((ap) => {
                        const isSelected = (stadium.apronMaterial || 'artificial_turf') === ap.id;
                        return (
                          <button
                            key={ap.id}
                            onClick={() => {
                              audio.playKick(0.2);
                              setStadium({ ...stadium, apronMaterial: ap.id });
                            }}
                            className={`p-1.5 rounded border text-left font-bold text-[10px] transition-all ${
                              isSelected
                                ? 'border-amber-400 bg-amber-950/50 text-amber-200 shadow-sm'
                                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="font-bold text-[9px]">{ap.label}</div>
                            <div className="text-[7.5px] text-slate-500 line-clamp-1">{ap.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 6: FLOODLIGHTS & FINAL REGISTRY SAVE (14.4.6)                  */}
              {/* ------------------------------------------------------------------- */}
              {/* ------------------------------------------------------------------- */}
              {/* STEP 6: FLOODLIGHTS & FINAL REGISTRY SAVE (14.4.6 & S5 WYSIWYG)     */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 6 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Phase S5 Time of Day Lighting Director */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                        TIME-OF-DAY ILLUMINATION DIRECTOR (PHASE S5)
                      </label>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
                        {(stadium.lighting?.timeOfDay || 'noon') === 'noon'
                          ? 'ZENITH SUN'
                          : (stadium.lighting?.timeOfDay || 'noon') === 'sunset'
                          ? 'GOLDEN HOUR'
                          : (stadium.lighting?.timeOfDay || 'noon') === 'night'
                          ? 'NOCTURNAL FLOODS'
                          : 'MORNING SUN'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          { id: 'noon', label: '☀️ Noon', sub: 'Zenith Sun' },
                          { id: 'sunset', label: '🌅 Afternoon', sub: 'Golden Hour' },
                          { id: 'night', label: '🌙 Night', sub: 'Floodlights' },
                          { id: 'dawn', label: '🌄 Dawn', sub: 'Low East Sun' },
                        ] as { id: TimeOfDay; label: string; sub: string }[]
                      ).map((tod) => (
                        <button
                          key={tod.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              lighting: {
                                ...(stadium.lighting || { type: 'corner_pylons', pylonCount: 4, powerKw: 2000, timeOfDay: tod.id }),
                                timeOfDay: tod.id,
                              },
                            });
                          }}
                          className={`p-2 rounded border text-left transition-all ${
                            (stadium.lighting?.timeOfDay || 'noon') === tod.id
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-[10px] font-bold">{tod.label}</div>
                          <div className="text-[7px] text-slate-500 mt-0.5">{tod.sub}</div>
                        </button>
                      ))}
                    </div>

                    {/* Dynamic Illumination & Architectural Roof Shadow Status (Phase S3 & S5) */}
                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800 space-y-1.5 text-[9px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>ATMOSPHERIC COLOR GRADE:</span>
                        <span className="font-bold text-amber-300">
                          {(stadium.lighting?.timeOfDay || 'noon') === 'noon' && '☀️ Crisp High-Contrast Zenith Daylight'}
                          {(stadium.lighting?.timeOfDay || 'noon') === 'sunset' && '🌅 Warm Amber / Golden-Orange Horizon Wash'}
                          {(stadium.lighting?.timeOfDay || 'noon') === 'night' && '🌙 Indigo Nocturnal Tint + 4 Corner Floodlight Cones'}
                          {(stadium.lighting?.timeOfDay || 'noon') === 'dawn' && '🌄 Soft Lavender-Pink Low Morning Sun'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>ROOF PITCH SHADOW GEOMETRY:</span>
                        <span className="font-bold text-cyan-300">
                          {stadium.shape === 'round' && '⭕ Annular Circular Aperture with Radial Spokes'}
                          {stadium.shape === 'oval' && '🏟️ Elliptical Contour with Semicircular Endzones'}
                          {stadium.shape === 'square' && '🔲 90° Rectilinear Box with Cantilever Overhang'}
                          {stadium.shape === 'rectangular' && '📐 Linear Touchline & Goal-Line Roof Eaves'}
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-500 italic">
                        {(stadium.lighting?.timeOfDay || 'noon') === 'night'
                          ? 'Zero direct sun shadows; 4-corner parabolic floodlights illuminate pitch and grandstands.'
                          : 'Architectural cast shadows calculate live sun azimuth & elevation across pitch grass and turf.'}
                      </div>
                    </div>
                  </div>

                  {/* PHASE ST4: GLOBAL ROOF ARCHITECTURE & 3-LEVEL SPECIFICATION */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">🏛️</span>
                        <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                          {isRoundOrOvalShape(stadium.shape)
                            ? 'CONTINUOUS COLISEUM ROOF SPECIFICATION (PHASE ST5)'
                            : 'ROOF ARCHITECTURE SPECIFICATION (PHASE ST4)'}
                        </label>
                      </div>
                      <button
                        onClick={() => {
                          audio.playKick(0.2);
                          const currentEnabled = stadium.roof?.enabled !== false;
                          const nextRoof = { ...(stadium.roof || getDefaultRoofConfig(stadium.shape)), enabled: !currentEnabled };
                          setStadium({
                            ...stadium,
                            roof: nextRoof,
                          });
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                          stadium.roof?.enabled !== false
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {stadium.roof?.enabled !== false ? 'ROOF ON' : 'NO ROOF'}
                      </button>
                    </div>

                    {stadium.roof?.enabled !== false && (
                      <div className="space-y-2.5">
                        {/* Sims-Style Cutaway Toggler */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase">
                            <span>SIMS-STYLE CUTAWAY MODE:</span>
                            <span className="text-cyan-300">
                              {(stadium.roofCutaway || stadium.roof?.cutawayMode || 'partial').toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {ROOF_CUTAWAY_OPTIONS.map((c) => {
                              const isSelected = (stadium.roofCutaway || stadium.roof?.cutawayMode || 'partial') === c.id;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    const updatedRoof = { ...(stadium.roof || getDefaultRoofConfig(stadium.shape)), cutawayMode: c.id };
                                    setStadium({
                                      ...stadium,
                                      roofCutaway: c.id,
                                      roof: updatedRoof,
                                    });
                                  }}
                                  className={`p-1 rounded text-center text-[8px] font-bold border transition-all ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                  }`}
                                  title={c.desc}
                                >
                                  <div>{c.label}</div>
                                  <div className="text-[7px] text-slate-500 truncate">{c.pct} canopy</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Level 1: Roof Style (Shape-Aware: 4 Rectangular/Square or 4 Round/Oval) */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            {isRoundOrOvalShape(stadium.shape) ? '1. CONTINUOUS ROOF STYLE:' : '1. ROOF STYLE:'}
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            {getRoofStylesForShape(stadium.shape).map((st) => {
                              const defaultStyle = isRoundOrOvalShape(stadium.shape) ? 'spoke_wheel_tension' : 'cantilever_truss';
                              const isSelected = (stadium.roof?.style || defaultStyle) === st.id;
                              return (
                                <button
                                  key={st.id}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    setStadium({
                                      ...stadium,
                                      roof: {
                                        ...(stadium.roof || getDefaultRoofConfig(stadium.shape)),
                                        style: st.id,
                                      },
                                    });
                                  }}
                                  className={`p-1.5 rounded border text-left text-[9px] transition-all ${
                                    isSelected
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                                  }`}
                                >
                                  <div className="font-bold truncate">{st.label}</div>
                                  <div className="text-[7px] text-slate-500 truncate">{st.desc}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Level 2: Roof Deck Material */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">2. CANOPY MATERIAL:</span>
                          <div className="grid grid-cols-4 gap-1">
                            {getRoofMaterialsForShape(stadium.shape).map((mat) => {
                              const defaultMat = isRoundOrOvalShape(stadium.shape) ? 'ptfe_fabric' : 'corrugated_steel';
                              const isSelected = (stadium.roof?.material || defaultMat) === mat.id;
                              return (
                                <button
                                  key={mat.id}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    setStadium({
                                      ...stadium,
                                      roof: {
                                        ...(stadium.roof || getDefaultRoofConfig(stadium.shape)),
                                        material: mat.id,
                                      },
                                    });
                                  }}
                                  className={`px-1 py-1 rounded text-center text-[8px] font-bold border truncate ${
                                    isSelected
                                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                  }`}
                                  title={mat.desc}
                                >
                                  {mat.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Level 3: Fascia Border / Inner Ocular Rim & 360° Halo Board */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            {isRoundOrOvalShape(stadium.shape) ? '3. INNER OCULAR RIM & 360° HALO BOARD:' : '3. FASCIA BORDER & TRIM:'}
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            {getRoofBordersForShape(stadium.shape).map((b) => {
                              const defaultBorder = isRoundOrOvalShape(stadium.shape) ? 'video_halo_board' : 'painted_club_fascia';
                              const isSelected = (stadium.roof?.border || defaultBorder) === b.id;
                              return (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    setStadium({
                                      ...stadium,
                                      roof: {
                                        ...(stadium.roof || getDefaultRoofConfig(stadium.shape)),
                                        border: b.id,
                                      },
                                    });
                                  }}
                                  className={`px-1.5 py-1 rounded text-left text-[8px] font-bold border truncate ${
                                    isSelected
                                      ? 'bg-indigo-500 text-white border-indigo-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                  }`}
                                  title={b.desc}
                                >
                                  {b.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Propagate to all stands */}
                        <button
                          onClick={() => {
                            audio.playKick(0.25);
                            const rStyle = stadium.roof?.style || (isRoundOrOvalShape(stadium.shape) ? 'spoke_wheel_tension' : 'cantilever_truss');
                            const rMaterial = stadium.roof?.material || (isRoundOrOvalShape(stadium.shape) ? 'ptfe_fabric' : 'corrugated_steel');
                            const rBorder = stadium.roof?.border || (isRoundOrOvalShape(stadium.shape) ? 'video_halo_board' : 'painted_club_fascia');
                            const rEnabled = stadium.roof?.enabled !== false;
                            const standKeys = ['west', 'east', 'north', 'south', 'corner_nw', 'corner_ne', 'corner_se', 'corner_sw'] as const;
                            const updatedStands = { ...stadium.stands };
                            standKeys.forEach((key) => {
                              const existing = updatedStands[key];
                              if (existing && existing.type !== 'none' && existing.type !== 'no_stand') {
                                updatedStands[key] = {
                                  ...existing,
                                  hasRoof: rEnabled,
                                  roofStyle: rStyle,
                                  roofMaterial: rMaterial,
                                  roofBorder: rBorder,
                                };
                              }
                            });
                            setStadium({
                              ...stadium,
                              stands: updatedStands,
                            });
                          }}
                          className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/50 text-amber-300 text-[9px] font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>⚡</span>
                          <span>SYNC GLOBAL ROOF SPECIFICATION TO ALL 8 STANDS</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Turf Quality & Mowing Pattern */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      TURF QUALITY GRADE
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['pristine', 'normal', 'poor'] as TurfQuality[]).map((tq) => (
                        <button
                          key={tq}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({ ...stadium, turfQuality: tq });
                          }}
                          className={`py-1.5 rounded border text-center font-bold text-[10px] uppercase ${
                            stadium.turfQuality === tq
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {tq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons: Save & Test Matchday */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleSave}
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 border border-cyan-400"
                    >
                      <Save className="w-4 h-4" />
                      <span>SAVE STADIUM TO REGISTRY</span>
                    </button>

                    <button
                      onClick={handleTestMatchday}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>⚽ TEST LIVE MATCHDAY WITH THIS VENUE</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Wizard Navigation Footer */}
            <div className="flex-none px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                disabled={currentStep <= 1}
                onClick={() => {
                  audio.playKick(0.18);
                  setCurrentStep((p) => Math.max(1, p - 1));
                }}
                className="px-3 py-1.5 rounded bg-slate-800 disabled:opacity-30 border border-slate-700 text-slate-300 font-bold text-xs"
              >
                ◀ PREVIOUS
              </button>

              <div className="text-[10px] text-slate-500 font-bold">
                {currentStep} / 6
              </div>

              <button
                disabled={currentStep >= 6}
                onClick={() => {
                  audio.playKick(0.18);
                  setCurrentStep((p) => Math.min(6, p + 1));
                }}
                className="px-3 py-1.5 rounded bg-amber-400 disabled:opacity-30 text-slate-950 font-black text-xs shadow"
              >
                NEXT ▶
              </button>
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: WYSIWYG CANVAS 2D REAL-TIME MATCHDAY PREVIEW (Cols 6-12)  */}
          {/* ----------------------------------------------------------------------- */}
          <div className="md:col-span-7 h-full relative overflow-hidden bg-black select-none">
            
            {/* The Real-Time Procedural Matchday Canvas with Free Camera & Full Zoom Engine */}
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-grab active:cursor-grabbing touch-none select-none"
              onMouseDown={(e) => {
                touchStateRef.current.isDragging = true;
                touchStateRef.current.lastX = e.clientX;
                touchStateRef.current.lastY = e.clientY;
              }}
              onMouseMove={(e) => {
                if (touchStateRef.current.isDragging) {
                  const dx = e.clientX - touchStateRef.current.lastX;
                  const dy = e.clientY - touchStateRef.current.lastY;
                  touchStateRef.current.lastX = e.clientX;
                  touchStateRef.current.lastY = e.clientY;
                  switchToFreeCam();
                  const isAerial = cameraPerspectiveRef.current === 'aerial_sky' || cameraPerspectiveRef.current === 'aerial_free';
                  const targetRef = isAerial ? aerialFreeCamTargetRef : freeCamTargetRef;
                  const currentZoom = Math.max(0.05, cameraStateRef.current.zoom);
                  targetRef.current.x -= dx / currentZoom;
                  targetRef.current.y -= dy / currentZoom;
                }
              }}
              onMouseUp={() => {
                touchStateRef.current.isDragging = false;
              }}
              onMouseLeave={() => {
                touchStateRef.current.isDragging = false;
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  touchStateRef.current.isDragging = true;
                  touchStateRef.current.lastX = e.touches[0].clientX;
                  touchStateRef.current.lastY = e.touches[0].clientY;
                  touchStateRef.current.lastDistance = null;
                } else if (e.touches.length >= 2) {
                  touchStateRef.current.isDragging = false;
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  touchStateRef.current.lastDistance = Math.hypot(dx, dy);
                }
              }}
              onTouchMove={(e) => {
                const isAerial = cameraPerspectiveRef.current === 'aerial_sky' || cameraPerspectiveRef.current === 'aerial_free';
                const targetRef = isAerial ? aerialFreeCamTargetRef : freeCamTargetRef;
                if (e.touches.length === 1 && touchStateRef.current.isDragging) {
                  const dx = e.touches[0].clientX - touchStateRef.current.lastX;
                  const dy = e.touches[0].clientY - touchStateRef.current.lastY;
                  touchStateRef.current.lastX = e.touches[0].clientX;
                  touchStateRef.current.lastY = e.touches[0].clientY;
                  switchToFreeCam();
                  const currentZoom = Math.max(0.05, cameraStateRef.current.zoom);
                  targetRef.current.x -= dx / currentZoom;
                  targetRef.current.y -= dy / currentZoom;
                } else if (e.touches.length >= 2 && touchStateRef.current.lastDistance !== null) {
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  const dist = Math.hypot(dx, dy);
                  if (dist > 5 && touchStateRef.current.lastDistance > 5) {
                    const zoomFactor = dist / touchStateRef.current.lastDistance;
                    touchStateRef.current.lastDistance = dist;
                    switchToFreeCam();
                    const minZ = 0.05;
                    const maxZ = 2.50;
                    targetRef.current.zoom = Math.max(minZ, Math.min(maxZ, targetRef.current.zoom * zoomFactor));
                  }
                }
              }}
              onTouchEnd={() => {
                touchStateRef.current.isDragging = false;
                touchStateRef.current.lastDistance = null;
              }}
              onWheel={(e) => {
                e.preventDefault();
                switchToFreeCam();
                const isAerial = cameraPerspectiveRef.current === 'aerial_sky' || cameraPerspectiveRef.current === 'aerial_free';
                const targetRef = isAerial ? aerialFreeCamTargetRef : freeCamTargetRef;
                const minZ = 0.05;
                const maxZ = 2.50;
                const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;
                targetRef.current.zoom = Math.max(minZ, Math.min(maxZ, targetRef.current.zoom * zoomFactor));
              }}
            />

            {/* Phase B1.3: Dedicated 32-Bit Vertical Interactive Zoom Bar Engine */}
            <div className="absolute right-3 top-20 bottom-24 z-30 flex flex-col items-center justify-between w-11 bg-slate-950/90 backdrop-blur-md border-2 border-slate-700/80 rounded-xl p-1.5 shadow-2xl pointer-events-auto select-none">
              {/* Zoom In Button */}
              <button
                type="button"
                title="Zoom In (+)"
                onClick={() => {
                  applyZoomValue(cameraStateRef.current.zoom * 1.25);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-700 active:scale-90 transition-all font-black"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Quick Snap Presets */}
              <div className="flex flex-col gap-1 w-full my-1">
                {ZOOM_SNAP_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.description}
                    onClick={() => {
                      applyZoomValue(preset.zoom);
                    }}
                    className="w-full py-0.5 rounded text-[8px] font-mono font-black text-center border transition-all truncate bg-slate-900/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border-slate-800 hover:border-cyan-500/60 active:scale-95"
                  >
                    {preset.id === 'pitch' ? '100%' : preset.id === 'concourse' ? '50%' : preset.id === 'arena' ? '15%' : '5%'}
                  </button>
                ))}
              </div>

              {/* Draggable Vertical Slider Track with Tick Marks */}
              <div
                ref={zoomTrackRef}
                onPointerDown={handleZoomTrackPointerDown}
                className="relative flex-1 w-3 bg-slate-900 rounded-full border border-slate-700 my-1 cursor-pointer flex flex-col justify-between items-center py-1 group"
                title="Interactive Zoom Bar: Click or Drag to Zoom (5% to 250%)"
              >
                {/* Visual Tick marks */}
                <div className="w-2 h-0.5 bg-slate-600 rounded-full pointer-events-none" />
                <div className="w-2 h-0.5 bg-slate-600 rounded-full pointer-events-none" />
                <div className="w-2 h-0.5 bg-slate-600 rounded-full pointer-events-none" />
                <div className="w-2 h-0.5 bg-slate-600 rounded-full pointer-events-none" />

                {/* Draggable Metallic Thumb */}
                <div
                  ref={zoomThumbRef}
                  style={{ bottom: '30%' }}
                  className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-4.5 rounded bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border border-amber-200 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-none"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="w-2.5 h-[1px] bg-slate-950/70" />
                    <span className="w-2.5 h-[1px] bg-slate-950/70" />
                  </div>
                </div>
              </div>

              {/* Live Zoom Readout */}
              <div
                ref={zoomReadoutRef}
                className="text-[8px] font-mono font-black text-amber-300 text-center tracking-tighter w-full py-0.5"
              >
                {Math.round(cameraStateRef.current.zoom * 100)}%
              </div>

              {/* Zoom Out Button */}
              <button
                type="button"
                title="Zoom Out (-)"
                onClick={() => {
                  applyZoomValue(cameraStateRef.current.zoom * 0.80);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-700 active:scale-90 transition-all font-black"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Floating Camera & Zoom Controls HUD */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20 pointer-events-auto">
              <div className="flex items-center bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-2xl text-[9px] font-mono">
                <button
                  type="button"
                  title="Zoom Out (Mouse Wheel Down • Touch Pinch • Controller Stick)"
                  onClick={() => {
                    audio.playKick(0.15);
                    switchToFreeCam();
                    const isAerial = cameraPerspectiveRef.current === 'aerial_sky' || cameraPerspectiveRef.current === 'aerial_free';
                    const targetRef = isAerial ? aerialFreeCamTargetRef : freeCamTargetRef;
                    const minZ = isAerial ? 0.04 : 0.10;
                    targetRef.current.zoom = Math.max(minZ, targetRef.current.zoom * 0.84);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-90 transition-all font-bold"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <div className="px-2 text-center min-w-[42px] font-bold text-amber-300">
                  {Math.round(cameraStateRef.current.zoom * 100)}%
                </div>
                <button
                  type="button"
                  title="Zoom In (Mouse Wheel Up • Touch Spread • Controller Stick)"
                  onClick={() => {
                    audio.playKick(0.15);
                    switchToFreeCam();
                    const isAerial = cameraPerspectiveRef.current === 'aerial_sky' || cameraPerspectiveRef.current === 'aerial_free';
                    const targetRef = isAerial ? aerialFreeCamTargetRef : freeCamTargetRef;
                    const maxZ = isAerial ? 1.60 : 2.50;
                    targetRef.current.zoom = Math.min(maxZ, targetRef.current.zoom * 1.18);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-90 transition-all font-bold"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Instant Fit Preset Shortcuts */}
              <button
                type="button"
                onClick={() => {
                  audio.playKick(0.2);
                  setCameraPerspective('stadium_view');
                }}
                title="Fit Entire Stadium & All Stands onto Screen"
                className={`px-2 py-1.5 rounded-lg border text-[9px] font-mono font-bold tracking-wider flex items-center gap-1 shadow-md active:scale-95 transition-all ${
                  cameraPerspective === 'stadium_view'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/50'
                    : 'bg-slate-950/85 backdrop-blur-md border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                <span>🏟️</span>
                <span className="hidden sm:inline">ALL STANDS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playKick(0.2);
                  setCameraPerspective('full_pitch');
                }}
                title="Fit Entire Pitch onto Screen"
                className={`px-2 py-1.5 rounded-lg border text-[9px] font-mono font-bold tracking-wider flex items-center gap-1 shadow-md active:scale-95 transition-all ${
                  cameraPerspective === 'full_pitch'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/50'
                    : 'bg-slate-950/85 backdrop-blur-md border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                <span>📐</span>
                <span className="hidden sm:inline">FULL PITCH</span>
              </button>

              {(cameraPerspective === 'free' || cameraPerspective === 'aerial_free') && (
                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.2);
                    if (cameraPerspective === 'aerial_free') {
                      aerialFreeCamTargetRef.current = {
                        x: PITCH_CONFIG.CENTER_X,
                        y: PITCH_CONFIG.CENTER_Y - 140,
                        zoom: 0.26,
                        pitchTilt: 0.35,
                        label: 'AERIAL SKY-CAM (FAR)',
                        description: 'High-altitude bird’s-eye perspective showing outer architecture and horizon.',
                      };
                      setCameraPerspective('aerial_sky');
                    } else {
                      setCameraPerspective('relevant');
                    }
                  }}
                  title={cameraPerspective === 'aerial_free' ? 'Reset Aerial Sky Camera View' : 'Reset to Relevant Step View'}
                  className="px-2 py-1.5 rounded-lg border border-amber-500/80 bg-amber-950/80 text-amber-300 text-[9px] font-mono font-bold flex items-center gap-1 active:scale-95 transition-all shadow-md animate-pulse"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>RESET</span>
                </button>
              )}
            </div>

            {/* Free Camera Active Indicator Pill */}
            {(cameraPerspective === 'free' || cameraPerspective === 'aerial_free') && (
              <div className="absolute top-12 left-3 z-10 animate-fadeIn pointer-events-none">
                <div className={`px-2 py-0.5 rounded-full border text-[8px] font-mono font-bold flex items-center gap-1 shadow-lg ${
                  cameraPerspective === 'aerial_free'
                    ? 'bg-cyan-950/90 border-cyan-400/80 text-cyan-300'
                    : 'bg-amber-950/90 border-amber-400/80 text-amber-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                    cameraPerspective === 'aerial_free' ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}></span>
                  <span>
                    {cameraPerspective === 'aerial_free'
                      ? 'AERIAL FREE CAM • DRAG TO PAN • SCROLL/PINCH TO ZOOM'
                      : 'FREE CAM • DRAG TO PAN • SCROLL/PINCH TO ZOOM'}
                  </span>
                </div>
              </div>
            )}

            {/* Top-Left Floating WYSIWYG Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <div className="px-2 py-1 rounded bg-black/80 backdrop-blur border border-slate-700 text-[10px] font-mono font-bold text-slate-300 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>60 FPS WYSIWYG</span>
              </div>

              {/* Sky-Cam Diorama Active Indicator & Dedicated Aerial Free Toggle */}
              {(cameraPerspective === 'aerial_sky' || cameraPerspective === 'aerial_free') ? (
                <button
                  onClick={() => {
                    audio.playKick(0.2);
                    setCameraPerspective('full_pitch');
                  }}
                  title="Return to Ground Pitch View"
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 border border-cyan-300 text-[9px] font-mono font-black text-white flex items-center gap-1.5 shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  <span>🦅 SKY VIEW: ACTIVE</span>
                  <span className="text-[8px] bg-slate-950/70 px-1 py-0.5 rounded text-cyan-200 uppercase font-bold tracking-wider">RETURN TO PITCH 🏟️</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    audio.playKick(0.2);
                    aerialFreeCamTargetRef.current = {
                      x: PITCH_CONFIG.CENTER_X,
                      y: PITCH_CONFIG.CENTER_Y - 140,
                      zoom: 0.15,
                      pitchTilt: 0.35,
                      label: 'AERIAL FREE CAM',
                      description: 'High-altitude bird’s-eye perspective showing outer architecture and horizon.',
                    };
                    setCameraPerspective('aerial_free');
                  }}
                  title="Switch to Sky View / Aerial Free (Unrestricted 360° Pan & Zoom)"
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/50 text-[9px] font-mono font-black text-cyan-300 flex items-center gap-1.5 shadow-md hover:border-cyan-400 active:scale-95 transition-all"
                >
                  <span>🦅 SKY VIEW / AERIAL FREE</span>
                </button>
              )}
            </div>

            {/* Top-Center Floating Quick Time-of-Day Director (Phase S5 WYSIWYG) */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center p-0.5 rounded-lg bg-black/85 backdrop-blur-md border border-slate-700 shadow-xl z-10 text-[9px] font-mono font-bold">
              {(
                [
                  { id: 'noon', label: '☀️ NOON' },
                  { id: 'sunset', label: '🌅 AFTERNOON' },
                  { id: 'night', label: '🌙 NIGHT' },
                ] as { id: TimeOfDay; label: string }[]
              ).map((tod) => (
                <button
                  key={tod.id}
                  onClick={() => {
                    audio.playKick(0.18);
                    setStadium({
                      ...stadium,
                      lighting: {
                        ...(stadium.lighting || { type: 'corner_pylons', pylonCount: 4, powerKw: 2000, timeOfDay: tod.id }),
                        timeOfDay: tod.id,
                      },
                    });
                  }}
                  className={`px-2 py-1 rounded transition-all ${
                    (stadium.lighting?.timeOfDay || 'noon') === tod.id
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tod.label}
                </button>
              ))}
            </div>

            {/* Top-Right Manual Pan Reset Button */}
            <button
              onClick={() => {
                audio.playKick(0.18);
                manualPanRef.current.x = 0;
                manualPanRef.current.y = 0;
                if (cameraPerspective === 'aerial_free' || cameraPerspective === 'aerial_sky') {
                  aerialFreeCamTargetRef.current.x = PITCH_CONFIG.CENTER_X;
                  aerialFreeCamTargetRef.current.y = PITCH_CONFIG.CENTER_Y - 140;
                } else if (cameraPerspective === 'free') {
                  freeCamTargetRef.current.x = PITCH_CONFIG.CENTER_X;
                  freeCamTargetRef.current.y = PITCH_CONFIG.CENTER_Y;
                }
              }}
              title="Reset View Centering"
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-mono flex items-center gap-1 shadow-md z-10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET PAN</span>
            </button>

            {/* ===================================================================== */}
            {/* PERSISTENT BOTTOM-LEFT 32-BIT HUD BOX (Section 14.3)                  */}
            {/* Qualification & Capacity HUD Box                                      */}
            {/* ===================================================================== */}
            <div className="absolute bottom-3 left-3 pointer-events-auto z-20">
              <div className="p-3 rounded-xl border-2 border-slate-700 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-black/95 backdrop-blur-md shadow-2xl text-[10px] font-mono min-w-[210px] space-y-2">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    FIFA HUD
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[8px] font-black uppercase">
                    OFFICIAL
                  </span>
                </div>

                {/* FIFA Category */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">QUALIFICATION:</span>
                  <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] tracking-wider border shadow-sm ${
                    currentFifa === 'world'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30'
                      : currentFifa === 'continental'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                      : currentFifa === 'first_division'
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {currentFifa.replace('_', ' ')}
                  </span>
                </div>

                {/* Numerical Capacity Meter */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">TOTAL CAPACITY:</span>
                  <span className="text-amber-300 font-bold text-sm tracking-wider">
                    {totalCapacity.toLocaleString()}
                  </span>
                </div>

                {/* Mini Stand Contributions Breakdown */}
                <div className="pt-1 border-t border-slate-800/80 grid grid-cols-4 gap-1 text-[8px] text-center text-slate-400">
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">EAST</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.east?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ east: stadium.stands.east } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">WEST</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.west?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ west: stadium.stands.west } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">NORTH</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.north?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ north: stadium.stands.north } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">SOUTH</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.south?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ south: stadium.stands.south } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
