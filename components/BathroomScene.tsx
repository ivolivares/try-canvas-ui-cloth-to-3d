'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ClothSimulation,
  type ClothPinMode,
  type ClothPointerInput,
} from '@/lib/clothPhysics';
import {
  createBathroomTileMaps,
  createFabricWeaveBumpMap,
  createSteamParticleTexture,
  renderCurtainCanvas,
} from '@/lib/bathroomTextures';
import {
  CAMERA_PRESETS,
  LIGHTING_MOODS,
  type CameraPresetId,
  type CharacterTextureAsset,
  type LightingMoodId,
} from '@/lib/galleryData';
import { ViceAudioEngine } from '@/lib/audioEngine';
import {
  detectHtmlInCanvasSupport,
  paintHtmlInCanvasElement,
  prepareHtmlInCanvasSource,
  requestHtmlInCanvasPaint,
  type PaintableHtmlCanvas,
} from '@/lib/htmlInCanvasBridge';
import CurtainDomContent from '@/components/CurtainDomContent';

export interface SceneTelemetry {
  glitchEnergy: number;
  touchIntensity: number;
  isDragging: boolean;
  displacement: number;
  lastTouchU: number;
  lastTouchV: number;
  ready: boolean;
}

export interface BathroomSceneProps {
  character: CharacterTextureAsset;
  lightingMood: LightingMoodId;
  cameraPreset: CameraPresetId;
  pinMode: ClothPinMode;
  floatMode: boolean;
  wind: number;
  stiffness: number;
  gustTrigger: number;
  resetTrigger: number;
  audioEnabled: boolean;
  onTelemetry: (telemetry: SceneTelemetry) => void;
}

export default function BathroomScene({
  character,
  lightingMood,
  cameraPreset,
  pinMode,
  floatMode,
  wind,
  stiffness,
  gustTrigger,
  resetTrigger,
  audioEnabled,
  onTelemetry,
}: BathroomSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const htmlSourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const htmlDomContentRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [domGlitchActive, setDomGlitchActive] = useState(false);
  const domGlitchRef = useRef(false);

  // Refs synced from React props via effect so WebGL never tears down on UI state changes
  const propsRef = useRef({
    character,
    lightingMood,
    cameraPreset,
    pinMode,
    floatMode,
    wind,
    stiffness,
    audioEnabled,
    onTelemetry,
  });

  useEffect(() => {
    propsRef.current = {
      character,
      lightingMood,
      cameraPreset,
      pinMode,
      floatMode,
      wind,
      stiffness,
      audioEnabled,
      onTelemetry,
    };
  }, [character, lightingMood, cameraPreset, pinMode, floatMode, wind, stiffness, audioEnabled, onTelemetry]);

  // Action refs exposed to prop triggers
  const simRef = useRef<ClothSimulation | null>(null);
  const audioRef = useRef<ViceAudioEngine | null>(null);
  const cameraGoalRef = useRef<{
    pos: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
    active: boolean;
  }>({
    pos: new THREE.Vector3(...CAMERA_PRESETS[0].position),
    target: new THREE.Vector3(...CAMERA_PRESETS[0].target),
    fov: CAMERA_PRESETS[0].fov,
    active: false,
  });
  const dirtyCurtainRef = useRef(true);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const applyLightingRef = useRef<((moodId: LightingMoodId) => void) | null>(null);

  // Sync physics config props without remounting WebGL
  useEffect(() => {
    simRef.current?.updateConfig({ pin: pinMode, floatMode, wind, stiffness });
  }, [pinMode, floatMode, wind, stiffness]);

  // Sync character image & redraw curtain
  useEffect(() => {
    dirtyCurtainRef.current = true;
    const cache = loadedImagesRef.current;
    if (!cache.has(character.imagePath)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        cache.set(character.imagePath, img);
        dirtyCurtainRef.current = true;
      };
      img.src = character.imagePath;
      cache.set(character.imagePath, img);
    }
    // Give the curtain a subtle tactile glitch pulse & fabric rustle cue when swapping character textures
    simRef.current?.triggerGlitch(0.75, 0.5, 0.45);
    audioRef.current?.triggerGrabCue(0.5);
    const raf = window.requestAnimationFrame(() => {
      requestHtmlInCanvasPaint(htmlSourceCanvasRef.current);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [character]);

  // Trigger a fresh html-in-canvas DOM repaint whenever glitch overlay toggles on Chrome 157+
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      requestHtmlInCanvasPaint(htmlSourceCanvasRef.current);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [domGlitchActive]);

  // Sync audio mute/unmute state cleanly
  useEffect(() => {
    const engine = audioRef.current;
    if (!engine) return;
    engine.setMuted(!audioEnabled);
    if (audioEnabled) {
      engine.unlock();
    }
  }, [audioEnabled]);

  // Sync lighting mood
  useEffect(() => {
    applyLightingRef.current?.(lightingMood);
  }, [lightingMood]);

  // Sync camera preset smooth lerp goal
  useEffect(() => {
    const preset = CAMERA_PRESETS.find((p) => p.id === cameraPreset) ?? CAMERA_PRESETS[0];
    cameraGoalRef.current.pos.set(...preset.position);
    cameraGoalRef.current.target.set(...preset.target);
    cameraGoalRef.current.fov = preset.fov;
    cameraGoalRef.current.active = true;
  }, [cameraPreset]);

  // Gust & reset triggers
  useEffect(() => {
    if (gustTrigger > 0) {
      simRef.current?.applyGust(1.15, true);
      audioRef.current?.unlock();
      audioRef.current?.triggerGustWhoosh();
      dirtyCurtainRef.current = true;
    }
  }, [gustTrigger]);

  useEffect(() => {
    if (resetTrigger > 0) {
      simRef.current?.reset();
      dirtyCurtainRef.current = true;
    }
  }, [resetTrigger]);

  // Mount Three.js WebGL scene ONCE
  useEffect(() => {
    const mount = mountRef.current;
    const container = containerRef.current;
    if (!mount || !container) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // 1. Detect software WebGL (SwiftShader / llvmpipe) to adapt render cost without removing visuals
    const probeCanvas = document.createElement('canvas');
    const probeGl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    let rendererName = '';
    if (probeGl) {
      const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
      rendererName = dbg
        ? String(probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
        : String(probeGl.getParameter(probeGl.RENDERER) || '');
    }
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const domElement = renderer.domElement;
    domElement.style.display = 'block';
    domElement.style.width = '100%';
    domElement.style.height = '100%';
    domElement.style.touchAction = 'none';
    mount.appendChild(domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    domElement.addEventListener('webglcontextlost', handleContextLost);
    domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const maxAniso = isSoftwareGl ? 2 : Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // 2. Scene, Environment (PMREM RoomEnvironment), Camera & OrbitControls
    const scene = new THREE.Scene();
    const initialMood = LIGHTING_MOODS.find((m) => m.id === propsRef.current.lightingMood) ?? LIGHTING_MOODS[0];
    scene.background = new THREE.Color(initialMood.bgHex);
    scene.fog = new THREE.FogExp2(initialMood.fogHex, initialMood.fogDensity);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const heroPreset = CAMERA_PRESETS[0];
    const camera = new THREE.PerspectiveCamera(heroPreset.fov, width / height, 0.1, 35);
    camera.position.set(...heroPreset.position);

    const controls = new OrbitControls(camera, domElement);
    controls.target.set(...heroPreset.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 1.35;
    controls.maxDistance = 4.65;
    controls.minPolarAngle = Math.PI * 0.24;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.minAzimuthAngle = -Math.PI * 0.34;
    controls.maxAzimuthAngle = Math.PI * 0.34;
    controls.update();

    // Cancel camera preset auto-glide when user manually orbits
    const onControlStart = () => {
      cameraGoalRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // 3. Lighting (warm/cool contrast + Vice City dim neon tubes)
    const hemiLight = new THREE.HemisphereLight(
      initialMood.hemiSky,
      initialMood.hemiGround,
      initialMood.hemiIntensity
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initialMood.keyColor, initialMood.keyIntensity);
    keyLight.position.set(1.6, 3.3, 2.8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.camera.left = -3.2;
      keyLight.shadow.camera.right = 3.2;
      keyLight.shadow.camera.top = 3.4;
      keyLight.shadow.camera.bottom = -1.2;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const neonPinkLight = new THREE.PointLight(
      initialMood.neonPinkColor,
      initialMood.neonPinkIntensity,
      8.5,
      1.75
    );
    neonPinkLight.position.set(-1.65, 2.15, 0.35);
    scene.add(neonPinkLight);

    const neonCyanLight = new THREE.PointLight(
      initialMood.neonCyanColor,
      initialMood.neonCyanIntensity,
      8.5,
      1.75
    );
    neonCyanLight.position.set(1.55, 2.1, 0.15);
    scene.add(neonCyanLight);

    const vanityLight = new THREE.PointLight(
      initialMood.vanityColor,
      initialMood.vanityIntensity,
      6.5,
      1.8
    );
    vanityLight.position.set(-1.75, 2.05, 1.35);
    scene.add(vanityLight);

    const showerBackLight = new THREE.PointLight('#ff36b8', 3.4, 5.2, 1.8);
    showerBackLight.position.set(0.0, 2.35, -1.35);
    scene.add(showerBackLight);

    // 4. Shared Materials & Procedural Bathroom Tile PBR Textures
    const wallTileMaps = createBathroomTileMaps(maxAniso, 'wall');
    wallTileMaps.map.repeat.set(4.2, 2.4);
    wallTileMaps.bumpMap.repeat.set(4.2, 2.4);
    wallTileMaps.roughnessMap.repeat.set(4.2, 2.4);

    const floorTileMaps = createBathroomTileMaps(maxAniso, 'floor');
    floorTileMaps.map.repeat.set(4.5, 4.5);
    floorTileMaps.bumpMap.repeat.set(4.5, 4.5);
    floorTileMaps.roughnessMap.repeat.set(4.5, 4.5);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: wallTileMaps.map,
      bumpMap: wallTileMaps.bumpMap,
      bumpScale: 0.018,
      roughnessMap: wallTileMaps.roughnessMap,
      roughness: 0.24,
      metalness: 0.14,
      envMapIntensity: 1.35,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: floorTileMaps.map,
      bumpMap: floorTileMaps.bumpMap,
      bumpScale: 0.016,
      roughnessMap: floorTileMaps.roughnessMap,
      roughness: 0.17,
      metalness: 0.18,
      envMapIntensity: 1.55,
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x100c1e,
      roughness: 0.78,
      metalness: 0.05,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe6edf7,
      roughness: 0.14,
      metalness: 0.94,
      envMapIntensity: 1.65,
    });

    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0x26213b,
      roughness: 0.16,
      metalness: 0.12,
      envMapIntensity: 1.4,
    });

    const darkMarbleMat = new THREE.MeshStandardMaterial({
      color: 0x161128,
      roughness: 0.2,
      metalness: 0.14,
      envMapIntensity: 1.35,
    });

    const walnutMat = new THREE.MeshStandardMaterial({
      color: 0x2b1926,
      roughness: 0.52,
      metalness: 0.05,
    });

    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xd6e8ff,
      roughness: 0.04,
      metalness: 0.96,
      envMapIntensity: 1.9,
    });

    const neonPinkTubeMat = new THREE.MeshStandardMaterial({
      color: 0xff2bb4,
      emissive: new THREE.Color(initialMood.neonPinkColor),
      emissiveIntensity: 1.75,
      roughness: 0.18,
      metalness: 0.0,
      toneMapped: false,
    });

    const neonCyanTubeMat = new THREE.MeshStandardMaterial({
      color: 0x1de8ff,
      emissive: new THREE.Color(initialMood.neonCyanColor),
      emissiveIntensity: 1.75,
      roughness: 0.18,
      metalness: 0.0,
      toneMapped: false,
    });

    // Helper to dynamically update lighting mood
    applyLightingRef.current = (moodId: LightingMoodId) => {
      const m = LIGHTING_MOODS.find((item) => item.id === moodId) ?? LIGHTING_MOODS[0];
      scene.background = new THREE.Color(m.bgHex);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.set(m.fogHex);
        scene.fog.density = m.fogDensity;
      }
      hemiLight.color.set(m.hemiSky);
      hemiLight.groundColor.set(m.hemiGround);
      hemiLight.intensity = m.hemiIntensity;
      keyLight.color.set(m.keyColor);
      keyLight.intensity = m.keyIntensity;
      neonPinkLight.color.set(m.neonPinkColor);
      neonPinkLight.intensity = m.neonPinkIntensity;
      neonCyanLight.color.set(m.neonCyanColor);
      neonCyanLight.intensity = m.neonCyanIntensity;
      vanityLight.color.set(m.vanityColor);
      vanityLight.intensity = m.vanityIntensity;
      showerBackLight.color.set(m.neonPinkColor);
      neonPinkTubeMat.emissive.set(m.neonPinkColor);
      neonCyanTubeMat.emissive.set(m.neonCyanColor);
    };

    // 5. Build Composite 3D Bathroom Architecture
    const bathroomGroup = new THREE.Group();
    scene.add(bathroomGroup);

    const roomW = 5.4;
    const roomH = 3.55;
    const roomD = 6.2;

    // Reflective wet tiled floor (y = 0)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.1);
    floor.receiveShadow = true;
    bathroomGroup.add(floor);

    // Subtle standing-water wet gloss puddle near tub apron (+0.02 Y offset to prevent Z-fighting)
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x1a263b,
      roughness: 0.05,
      metalness: 0.28,
      transparent: true,
      opacity: 0.42,
      envMapIntensity: 1.85,
      depthWrite: false,
    });
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.92, 32), puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(0.18, 0.02, 0.58);
    bathroomGroup.add(puddle);

    // Back tiled shower wall (z = -1.85)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    backWall.position.set(0, roomH / 2, -1.85);
    backWall.receiveShadow = true;
    bathroomGroup.add(backWall);

    // Left vanity tiled wall (x = -2.45)
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-2.45, roomH / 2, 1.1);
    leftWall.receiveShadow = true;
    bathroomGroup.add(leftWall);

    // Right return tiled wall (x = 2.45)
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(2.45, roomH / 2, 1.1);
    rightWall.receiveShadow = true;
    bathroomGroup.add(rightWall);

    // Dark recessed ceiling + neon perimeter cove trim
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, roomH, 1.1);
    bathroomGroup.add(ceiling);

    // Architectural Shower Alcove Side Jambs (framing the bathtub & shower rod cleanly)
    const jambGeo = new THREE.BoxGeometry(0.32, roomH, 1.62);
    const leftJamb = new THREE.Mesh(jambGeo, darkMarbleMat);
    leftJamb.position.set(-1.32, roomH / 2, -1.04);
    leftJamb.receiveShadow = true;
    bathroomGroup.add(leftJamb);

    const rightJamb = new THREE.Mesh(jambGeo, darkMarbleMat);
    rightJamb.position.set(1.32, roomH / 2, -1.04);
    rightJamb.receiveShadow = true;
    bathroomGroup.add(rightJamb);

    // Header lintel beam above shower alcove
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.34, 0.24), darkMarbleMat);
    lintel.position.set(0, roomH - 0.17, -0.32);
    bathroomGroup.add(lintel);

    // 6. Multi-part Sculpted Bathtub / Shower Basin Group (recessed cleanly behind curtain hanging plane)
    const tubGroup = new THREE.Group();
    const tubZ = -0.52;
    const tubApron = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.48, 0.14), porcelainMat);
    tubApron.position.set(0, 0.24, tubZ);
    tubApron.castShadow = true;
    tubApron.receiveShadow = true;
    tubGroup.add(tubApron);

    // Top rounded ceramic tub lip (front face at z = -0.43, top at y = 0.52)
    const tubLip = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.06, 0.18), porcelainMat);
    tubLip.position.set(0, 0.49, tubZ);
    tubGroup.add(tubLip);

    // Recessed dark shower floor pan inside tub
    const tubFloor = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.12, 1.32), darkMarbleMat);
    tubFloor.position.set(0, 0.08, -1.2);
    tubGroup.add(tubFloor);

    // Chrome drain grate + overflow ring
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 20), chromeMat);
    drain.position.set(-0.65, 0.15, -1.08);
    tubGroup.add(drain);

    // Tub side soap niche with glowing Vice bottles
    const nicheFrame = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.36, 0.08), darkMarbleMat);
    nicheFrame.position.set(0.66, 1.38, -1.81);
    tubGroup.add(nicheFrame);

    const bottle1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.042, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0xff4fd8, roughness: 0.22, metalness: 0.1 })
    );
    bottle1.position.set(0.56, 1.32, -1.76);
    tubGroup.add(bottle1);

    const bottle2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.036, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: 0x2ee7ff, roughness: 0.25, metalness: 0.1 })
    );
    bottle2.position.set(0.68, 1.31, -1.76);
    tubGroup.add(bottle2);

    bathroomGroup.add(tubGroup);

    // 7. Multi-part Chrome Rainfall Showerhead & Mixing Valve (visible behind/around curtain)
    const showerFixtureGroup = new THREE.Group();
    const riserPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.25, 14), chromeMat);
    riserPipe.position.set(-0.56, 1.98, -1.74);
    showerFixtureGroup.add(riserPipe);

    const showerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 14), chromeMat);
    showerArm.rotation.x = Math.PI / 2;
    showerArm.position.set(-0.56, 2.58, -1.56);
    showerFixtureGroup.add(showerArm);

    const rainHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.035, 24), chromeMat);
    rainHead.position.set(-0.56, 2.54, -1.36);
    showerFixtureGroup.add(rainHead);

    const valvePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.025, 24), chromeMat);
    valvePlate.rotation.x = Math.PI / 2;
    valvePlate.position.set(-0.56, 1.28, -1.82);
    showerFixtureGroup.add(valvePlate);

    const valveHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.1, 14), chromeMat);
    valveHandle.rotation.x = Math.PI / 2;
    valveHandle.position.set(-0.56, 1.28, -1.76);
    showerFixtureGroup.add(valveHandle);

    const tubSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 14), chromeMat);
    tubSpout.rotation.x = Math.PI / 2;
    tubSpout.position.set(-0.56, 0.72, -1.74);
    showerFixtureGroup.add(tubSpout);

    bathroomGroup.add(showerFixtureGroup);

    // 8. Chrome Curtain Rod + Wall Flanges + Individual Rings (positioned cleanly in front of tub lip)
    const rodY = 2.86;
    const rodZ = -0.26;
    const rodGroup = new THREE.Group();

    const rodBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 20), chromeMat);
    rodBar.rotation.z = Math.PI / 2;
    rodBar.position.set(0, rodY, rodZ);
    rodGroup.add(rodBar);

    const flangeGeo = new THREE.CylinderGeometry(0.052, 0.058, 0.04, 20);
    const leftFlange = new THREE.Mesh(flangeGeo, chromeMat);
    leftFlange.rotation.z = Math.PI / 2;
    leftFlange.position.set(-1.16, rodY, rodZ);
    rodGroup.add(leftFlange);

    const rightFlange = new THREE.Mesh(flangeGeo, chromeMat);
    rightFlange.rotation.z = Math.PI / 2;
    rightFlange.position.set(1.16, rodY, rodZ);
    rodGroup.add(rightFlange);

    bathroomGroup.add(rodGroup);

    // 9. Left-Wall Floating Vanity, Ceramic Basin, Mirror & Vertical Vice Neon Tubes
    const vanityGroup = new THREE.Group();
    vanityGroup.position.set(-2.06, 0, 1.25);

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, 1.56), walnutMat);
    cabinet.position.set(0, 0.62, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    vanityGroup.add(cabinet);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 1.62), darkMarbleMat);
    counterTop.position.set(0.02, 0.93, 0);
    vanityGroup.add(counterTop);

    // Ceramic vessel sink
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.14, 24), porcelainMat);
    basin.position.set(0.04, 1.02, -0.05);
    vanityGroup.add(basin);

    const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.24, 12), chromeMat);
    faucetStem.position.set(-0.22, 1.08, -0.05);
    vanityGroup.add(faucetStem);

    const faucetSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), chromeMat);
    faucetSpout.rotation.z = Math.PI / 2;
    faucetSpout.position.set(-0.14, 1.18, -0.05);
    vanityGroup.add(faucetSpout);

    // Framed mirror on left wall
    const mirrorBacking = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.22, 1.38), darkMarbleMat);
    mirrorBacking.position.set(-0.35, 1.94, 0);
    vanityGroup.add(mirrorBacking);

    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.14), mirrorMat);
    mirrorGlass.rotation.y = Math.PI / 2;
    mirrorGlass.position.set(-0.325, 1.94, 0);
    vanityGroup.add(mirrorGlass);

    // Vertical Vice Neon Tubes flanking mirror
    const mirrorTubeGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.18, 12);
    const leftMirrorTube = new THREE.Mesh(mirrorTubeGeo, neonPinkTubeMat);
    leftMirrorTube.position.set(-0.31, 1.94, -0.78);
    vanityGroup.add(leftMirrorTube);

    const rightMirrorTube = new THREE.Mesh(mirrorTubeGeo, neonCyanTubeMat);
    rightMirrorTube.position.set(-0.31, 1.94, 0.78);
    vanityGroup.add(rightMirrorTube);

    bathroomGroup.add(vanityGroup);

    // 10. Architectural Neon Light Tubes framing the Shower Alcove & Right Wall
    const alcoveTubeGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.55, 12);
    const pinkAlcoveTube = new THREE.Mesh(alcoveTubeGeo, neonPinkTubeMat);
    pinkAlcoveTube.position.set(-1.18, 1.72, -0.2);
    bathroomGroup.add(pinkAlcoveTube);

    const cyanAlcoveTube = new THREE.Mesh(alcoveTubeGeo, neonCyanTubeMat);
    cyanAlcoveTube.position.set(1.18, 1.72, -0.2);
    bathroomGroup.add(cyanAlcoveTube);

    // Subtle overhead neon accent bar above shower lintel
    const topNeonBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 2.24, 12),
      neonPinkTubeMat
    );
    topNeonBar.rotation.z = Math.PI / 2;
    topNeonBar.position.set(0, 3.16, -0.2);
    bathroomGroup.add(topNeonBar);

    // Right wall minimalist heated chrome towel rail + draped neon-lit towel
    const towelRailGroup = new THREE.Group();
    towelRailGroup.position.set(2.34, 1.38, 0.95);
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.84, 10), chromeMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(0, i * 0.22 - 0.33, 0);
      towelRailGroup.add(bar);
    }
    const postGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.88, 10);
    const p1 = new THREE.Mesh(postGeo, chromeMat);
    p1.position.set(0, 0, -0.42);
    towelRailGroup.add(p1);
    const p2 = new THREE.Mesh(postGeo, chromeMat);
    p2.position.set(0, 0, 0.42);
    towelRailGroup.add(p2);
    bathroomGroup.add(towelRailGroup);

    // 11. Interactive Canvas UI Cloth Shower Curtain Mesh
    // Physics & interaction adapted from David Haz's Canvas UI Cloth component:
    // https://canvasui.dev/docs/components/cloth
    const clothCols = isSoftwareGl ? 22 : 30;
    const clothRows = isSoftwareGl ? 28 : 36;
    const clothWidth = 2.08;
    const clothHeight = 2.4;
    const clothOriginY = rodY - 0.055;

    // Tub lip occupies world y <= 0.52 and z in [-0.61, -0.43]; convert to local cloth coordinates with safety margin
    const sim = new ClothSimulation({
      cols: clothCols,
      rows: clothRows,
      width: clothWidth,
      height: clothHeight,
      pin: propsRef.current.pinMode,
      floatMode: propsRef.current.floatMode,
      wind: propsRef.current.wind,
      stiffness: propsRef.current.stiffness,
      tubCollider: {
        topY: 0.56 - clothOriginY,
        frontZ: -0.39 - rodZ,
        backZ: -0.65 - rodZ,
      },
      jambHalfWidth: 1.09,
      jambFrontZ: -0.18 - rodZ,
    });
    simRef.current = sim;

    // Build custom indexed BufferGeometry matching sim grid
    const vertCount = (clothCols + 1) * (clothRows + 1);
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);

    for (let r = 0; r <= clothRows; r++) {
      for (let c = 0; c <= clothCols; c++) {
        const idx = r * (clothCols + 1) + c;
        uvs[idx * 2] = c / clothCols;
        uvs[idx * 2 + 1] = 1 - r / clothRows;
      }
    }

    const indices: number[] = [];
    for (let r = 0; r < clothRows; r++) {
      for (let c = 0; c < clothCols; c++) {
        const a = r * (clothCols + 1) + c;
        const b = a + 1;
        const d = (r + 1) * (clothCols + 1) + c;
        const e = d + 1;
        indices.push(a, d, b);
        indices.push(b, d, e);
      }
    }

    sim.writeToBufferArrays(positions, normals);

    const clothGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const normAttr = new THREE.BufferAttribute(normals, 3);
    normAttr.setUsage(THREE.DynamicDrawUsage);

    clothGeo.setAttribute('position', posAttr);
    clothGeo.setAttribute('normal', normAttr);
    clothGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    clothGeo.setIndex(indices);

    // Dynamic Texture Pipeline:
    //  1) Chrome 157+ html-in-canvas: paints live React DOM (<CurtainDomContent />) into
    //     `<canvas layoutsubtree="true">` via `drawElementImage` and uploads directly to Three.js!
    //  2) Standard browser fallback: renders high-resolution Canvas 2D curtain texture + glitch slices.
    const texW = isSoftwareGl ? 768 : 1024;
    const texH = isSoftwareGl ? 1024 : 1365;
    const curtainCanvas = document.createElement('canvas');
    curtainCanvas.width = texW;
    curtainCanvas.height = texH;
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = texW;
    scratchCanvas.height = texH;

    const curtainTexture = new THREE.CanvasTexture(curtainCanvas);
    curtainTexture.colorSpace = THREE.SRGBColorSpace;
    curtainTexture.anisotropy = maxAniso;

    const htmlCapabilities = detectHtmlInCanvasSupport();
    const htmlSource = htmlSourceCanvasRef.current as PaintableHtmlCanvas | null;
    const htmlContent = htmlDomContentRef.current;
    let htmlInCanvasActive = false;
    let htmlInCanvasTexture: THREE.CanvasTexture | null = null;

    // Persistent snapshot canvas so Three.js always uploads a complete frame even after sourceCtx.reset()
    const htmlSnapshotCanvas = document.createElement('canvas');
    htmlSnapshotCanvas.width = texW;
    htmlSnapshotCanvas.height = texH;
    const htmlSnapshotCtx = htmlSnapshotCanvas.getContext('2d');

    const weaveBump = createFabricWeaveBumpMap(maxAniso);

    // Always start with the guaranteed rendered Canvas 2D curtain texture so the 3D curtain
    // is never blank; seamlessly upgrade to html-in-canvas as soon as Chrome 157+ paints real pixels.
    const clothMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: curtainTexture,
      bumpMap: weaveBump,
      bumpScale: 0.008,
      roughness: 0.56,
      metalness: 0.02,
      sheen: 0.55,
      sheenRoughness: 0.48,
      sheenColor: new THREE.Color('#ff6be0'),
      side: THREE.DoubleSide,
      envMapIntensity: 0.55,
      emissive: new THREE.Color('#280e34'),
      emissiveMap: curtainTexture,
      emissiveIntensity: 0.06,
    });

    if (htmlCapabilities.supported && htmlSource && htmlContent && htmlSnapshotCtx) {
      const sourceDpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = htmlSource.clientWidth || 512;
      const cssH = htmlSource.clientHeight || 682;
      htmlSource.width = Math.round(cssW * sourceDpr);
      htmlSource.height = Math.round(cssH * sourceDpr);
      prepareHtmlInCanvasSource(htmlSource, htmlContent);

      htmlInCanvasTexture = new THREE.CanvasTexture(htmlSnapshotCanvas);
      htmlInCanvasTexture.colorSpace = THREE.SRGBColorSpace;
      htmlInCanvasTexture.anisotropy = maxAniso;

      htmlSource.onpaint = () => {
        try {
          const sourceCtx = htmlSource.getContext('2d');
          if (!sourceCtx) return;
          if (typeof sourceCtx.reset === 'function') sourceCtx.reset();
          const painted = paintHtmlInCanvasElement(htmlSource, htmlContent);
          if (!painted) return;

          htmlSnapshotCtx.clearRect(0, 0, texW, texH);
          htmlSnapshotCtx.drawImage(htmlSource, 0, 0, texW, texH);
          if (typeof sourceCtx.reset === 'function') sourceCtx.reset();

          // Verify the painted DOM actually contains non-transparent pixels before binding to Three.js
          const probe = htmlSnapshotCtx.getImageData(
            Math.floor(texW * 0.5),
            Math.floor(texH * 0.45),
            1,
            1
          ).data;
          if (probe[3] > 0 && htmlInCanvasTexture) {
            htmlInCanvasTexture.needsUpdate = true;
            if (!htmlInCanvasActive) {
              htmlInCanvasActive = true;
              clothMat.map = htmlInCanvasTexture;
              clothMat.emissiveMap = htmlInCanvasTexture;
              clothMat.needsUpdate = true;
              container.dataset.texturePipeline = 'html-in-canvas';
            }
          }
        } catch {
          // Keep guaranteed Canvas 2D fallback active if browser drawElementImage fails
        }
      };

      requestHtmlInCanvasPaint(htmlSource);
    }

    container.dataset.texturePipeline = htmlInCanvasActive ? 'html-in-canvas' : 'canvas2d-fallback';

    const clothMesh = new THREE.Mesh(clothGeo, clothMat);
    clothMesh.position.set(0, rodY - 0.055, rodZ);
    clothMesh.castShadow = !isSoftwareGl;
    clothMesh.receiveShadow = true;
    scene.add(clothMesh);

    // Individual chrome curtain rings aligned to top pinned grommets
    const ringIndices = sim.getRingNodeIndices();
    const ringGeo = new THREE.TorusGeometry(0.036, 0.006, 10, 20);
    const ringMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < ringIndices.length; i++) {
      const node = sim.nodes[ringIndices[i]];
      const ring = new THREE.Mesh(ringGeo, chromeMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(node.rx, rodY - 0.012, rodZ + node.rz);
      scene.add(ring);
      ringMeshes.push(ring);
    }

    // 12. Rising Humid Steam Particles
    const steamCount = isSoftwareGl ? 36 : 72;
    const steamPositions = new Float32Array(steamCount * 3);
    const steamSpeeds = new Float32Array(steamCount);
    for (let i = 0; i < steamCount; i++) {
      steamPositions[i * 3] = (Math.random() - 0.5) * 3.8;
      steamPositions[i * 3 + 1] = 0.25 + Math.random() * 2.8;
      steamPositions[i * 3 + 2] = -1.4 + Math.random() * 2.8;
      steamSpeeds[i] = 0.08 + Math.random() * 0.14;
    }
    const steamGeo = new THREE.BufferGeometry();
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
    const steamTex = createSteamParticleTexture();
    const steamMat = new THREE.PointsMaterial({
      map: steamTex,
      color: 0xe6d4ff,
      size: 0.68,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const steamPoints = new THREE.Points(steamGeo, steamMat);
    scene.add(steamPoints);

    // Preload initial character image & re-render once web fonts finish loading
    const preloadChar = (path: string) => {
      if (!loadedImagesRef.current.has(path)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          loadedImagesRef.current.set(path, img);
          dirtyCurtainRef.current = true;
        };
        img.src = path;
        loadedImagesRef.current.set(path, img);
      }
    };
    preloadChar(propsRef.current.character.imagePath);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        dirtyCurtainRef.current = true;
        requestHtmlInCanvasPaint(htmlSource);
      });
    }

    // 13. Raycast, Pointer Drag & Web Audio Feedback for Shower Curtain
    const audioEngine = new ViceAudioEngine();
    audioEngine.setMuted(!propsRef.current.audioEnabled);
    audioRef.current = audioEngine;

    const unlockAudioOnGesture = () => {
      if (propsRef.current.audioEnabled) {
        audioEngine.unlock();
      }
    };
    window.addEventListener('pointerdown', unlockAudioOnGesture, { passive: true });
    window.addEventListener('keydown', unlockAudioOnGesture, { passive: true });

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const planeHit = new THREE.Vector3();
    const localHit = new THREE.Vector3();
    const prevLocal = new THREE.Vector3();
    const clothOrigin = clothMesh.position;

    const pointerInput: ClothPointerInput = {
      x: 0,
      y: -1.2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      active: false,
      grabbing: false,
    };

    const setNdcFromEvent = (e: PointerEvent) => {
      const rect = domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      unlockAudioOnGesture();
      setNdcFromEvent(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(clothMesh, false);
      if (hits.length > 0) {
        const pt = hits[0].point;
        localHit.copy(pt).sub(clothOrigin);
        prevLocal.copy(localHit);

        pointerInput.x = localHit.x;
        pointerInput.y = localHit.y;
        pointerInput.z = localHit.z;
        pointerInput.vx = 0;
        pointerInput.vy = 0;
        pointerInput.vz = 0;
        pointerInput.active = true;
        pointerInput.grabbing = true;

        // Create camera-facing drag plane passing through grabbed fabric point
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        dragPlane.setFromNormalAndCoplanarPoint(camDir.negate(), pt);

        controls.enabled = false;
        domElement.style.cursor = 'grabbing';
        try {
          domElement.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointer events in tests may not have an active pointerId
        }
        const grabU = THREE.MathUtils.clamp(localHit.x / clothWidth + 0.5, 0, 1);
        audioEngine.triggerGrabCue(grabU);
        dirtyCurtainRef.current = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      setNdcFromEvent(e);
      raycaster.setFromCamera(pointerNdc, camera);

      if (pointerInput.grabbing) {
        if (raycaster.ray.intersectPlane(dragPlane, planeHit)) {
          localHit.copy(planeHit).sub(clothOrigin);
          pointerInput.vx = THREE.MathUtils.clamp((localHit.x - prevLocal.x) * 26, -3.5, 3.5);
          pointerInput.vy = THREE.MathUtils.clamp((localHit.y - prevLocal.y) * 26, -3.5, 3.5);
          pointerInput.vz = THREE.MathUtils.clamp((localHit.z - prevLocal.z) * 26, -3.5, 3.5);
          pointerInput.x = THREE.MathUtils.clamp(localHit.x, -clothWidth * 0.72, clothWidth * 0.72);
          pointerInput.y = THREE.MathUtils.clamp(localHit.y, -clothHeight * 1.05, 0.08);
          pointerInput.z = THREE.MathUtils.clamp(localHit.z, -0.55, 0.72);
          prevLocal.copy(localHit);
        }
        return;
      }

      // Hover brush interaction on shower curtain
      const hits = raycaster.intersectObject(clothMesh, false);
      if (hits.length > 0) {
        const pt = hits[0].point;
        localHit.copy(pt).sub(clothOrigin);
        if (pointerInput.active) {
          pointerInput.vx = THREE.MathUtils.clamp((localHit.x - prevLocal.x) * 20, -2.5, 2.5);
          pointerInput.vy = THREE.MathUtils.clamp((localHit.y - prevLocal.y) * 20, -2.5, 2.5);
          pointerInput.vz = 0;
        } else {
          pointerInput.vx = 0;
          pointerInput.vy = 0;
          pointerInput.vz = 0;
        }
        pointerInput.x = localHit.x;
        pointerInput.y = localHit.y;
        pointerInput.z = localHit.z;
        pointerInput.active = true;
        prevLocal.copy(localHit);
        domElement.style.cursor = 'grab';
        unlockAudioOnGesture();
      } else {
        pointerInput.active = false;
        pointerInput.vx *= 0.5;
        pointerInput.vy *= 0.5;
        domElement.style.cursor = 'default';
      }
    };

    const releaseGrab = (e?: PointerEvent) => {
      if (pointerInput.grabbing) {
        pointerInput.grabbing = false;
        controls.enabled = true;
        domElement.style.cursor = 'default';
        if (e) {
          try {
            domElement.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }
      }
    };

    const onPointerLeave = () => {
      if (!pointerInput.grabbing) {
        pointerInput.active = false;
        domElement.style.cursor = 'default';
      }
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', releaseGrab);
    domElement.addEventListener('pointercancel', releaseGrab);
    domElement.addEventListener('pointerleave', onPointerLeave);

    // 14. Resize handling — immediately re-render so the canvas never flashes blank on resize
    const handleResize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // Pre-warm shaders on real GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 15. Render Loop with Software-WebGL Pacing (afterDraw fenceSync)
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let lastTime = performance.now();
    let lastCurtainDraw = 0;
    let lastTelemetryPush = 0;
    let firstFrameRendered = false;

    const glCtx = renderer.getContext();

    const afterDraw = (fn: () => void) => {
      if (disposed) return;
      if (!isSoftwareGl) {
        rafId = requestAnimationFrame(fn);
        return;
      }
      const pause = () => {
        if (!disposed) {
          timerId = window.setTimeout(fn, 75);
        }
      };
      if (glCtx instanceof WebGL2RenderingContext) {
        const sync = glCtx.fenceSync(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!sync) {
          pause();
          return;
        }
        glCtx.flush();
        const poll = () => {
          if (disposed) {
            glCtx.deleteSync(sync);
            return;
          }
          const status = glCtx.clientWaitSync(sync, 0, 0);
          if (status === glCtx.TIMEOUT_EXPIRED) {
            timerId = window.setTimeout(poll, 10);
          } else {
            glCtx.deleteSync(sync);
            pause();
          }
        };
        timerId = window.setTimeout(poll, 10);
      } else {
        pause();
      }
    };

    const renderCurtainIfNeeded = (now: number, elapsedSec: number) => {
      const activeChar = propsRef.current.character;
      const img = loadedImagesRef.current.get(activeChar.imagePath) ?? null;
      const isGlitching = sim.glitchEnergy > 0.025;
      const drawInterval = isSoftwareGl ? 90 : 42;

      if (dirtyCurtainRef.current || (isGlitching && now - lastCurtainDraw >= drawInterval)) {
        renderCurtainCanvas(curtainCanvas, scratchCanvas, {
          character: activeChar,
          image: img,
          glitchEnergy: sim.glitchEnergy,
          touchU: sim.lastTouchU,
          touchV: sim.lastTouchV,
          time: elapsedSec,
        });
        curtainTexture.needsUpdate = true;
        dirtyCurtainRef.current = false;
        lastCurtainDraw = now;
      }
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const rawDt = Math.min(0.05, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;
      const elapsedSec = now * 0.001;

      // Step Verlet cloth simulation (sub-step cleanly for stability)
      sim.step(Math.min(rawDt, 1 / 45), pointerInput);
      sim.writeToBufferArrays(positions, normals);
      posAttr.needsUpdate = true;
      normAttr.needsUpdate = true;

      // Feed real-time mouse/cloth velocity into Web Audio API ('fabric swishing' & 'neon humming')
      const pointerSpeed = Math.hypot(pointerInput.vx, pointerInput.vy);
      const metricsNow = sim.getMetrics();
      audioEngine.update({
        pointerSpeed,
        isHovering: pointerInput.active,
        isDragging: pointerInput.grabbing,
        glitchEnergy: sim.glitchEnergy,
        touchU: sim.lastTouchU,
        displacement: metricsNow.maxDisplacement,
      });
      // Smoothly decay pointer velocity between move events so fabric swish fades cleanly when mouse stops
      pointerInput.vx *= 0.78;
      pointerInput.vy *= 0.78;
      pointerInput.vz *= 0.78;

      // Update cloth emissive glow dynamically with glitch energy (kept rich, never blown-out)
      clothMat.emissiveIntensity = 0.06 + sim.glitchEnergy * 0.24;
      clothMat.sheenColor.set(sim.glitchEnergy > 0.15 ? '#2ee7ff' : propsRef.current.character.accentHex);

      // Update dynamic curtain texture when character changes or glitch is active
      renderCurtainIfNeeded(now, elapsedSec);

      // Subtle neon flicker pulse during active touch glitches
      const glitchPulse = sim.glitchEnergy > 0.1 ? Math.sin(elapsedSec * 48) * 1.4 * sim.glitchEnergy : 0;
      const activeMood =
        LIGHTING_MOODS.find((m) => m.id === propsRef.current.lightingMood) ?? LIGHTING_MOODS[0];
      neonPinkLight.intensity = activeMood.neonPinkIntensity + Math.sin(elapsedSec * 1.7) * 0.35 + glitchPulse;
      neonCyanLight.intensity = activeMood.neonCyanIntensity + Math.cos(elapsedSec * 1.3) * 0.35 - glitchPulse * 0.8;

      // Gently animate rising bathroom steam
      const sPos = steamGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < steamCount; i++) {
        let y = sPos.getY(i) + steamSpeeds[i] * rawDt;
        const x = sPos.getX(i) + Math.sin(elapsedSec * 0.5 + i) * 0.018 * rawDt;
        if (y > 3.15) {
          y = 0.25;
        }
        sPos.setXYZ(i, x, y, sPos.getZ(i));
      }
      sPos.needsUpdate = true;

      // Smooth damped camera preset transitions
      if (cameraGoalRef.current.active) {
        const alpha = 1 - Math.exp(-5.5 * rawDt);
        camera.position.lerp(cameraGoalRef.current.pos, alpha);
        controls.target.lerp(cameraGoalRef.current.target, alpha);
        camera.fov = THREE.MathUtils.lerp(camera.fov, cameraGoalRef.current.fov, alpha);
        camera.updateProjectionMatrix();
        if (
          camera.position.distanceTo(cameraGoalRef.current.pos) < 0.015 &&
          controls.target.distanceTo(cameraGoalRef.current.target) < 0.015
        ) {
          cameraGoalRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (!firstFrameRendered) {
        firstFrameRendered = true;
        container.dataset.sceneReady = 'true';
      }

      // Throttled telemetry push (<= 10Hz) for classic GTA HUD reactivity
      if (now - lastTelemetryPush >= 100) {
        lastTelemetryPush = now;
        const isGlitchNow = metricsNow.glitchEnergy > 0.08;
        container.dataset.glitchActive = isGlitchNow ? 'true' : 'false';
        container.dataset.dragging = metricsNow.isGrabbed ? 'true' : 'false';
        container.dataset.audioState = audioEngine.getState();
        if (htmlInCanvasActive && domGlitchRef.current !== isGlitchNow) {
          domGlitchRef.current = isGlitchNow;
          setDomGlitchActive(isGlitchNow);
        }
        propsRef.current.onTelemetry({
          glitchEnergy: metricsNow.glitchEnergy,
          touchIntensity: metricsNow.touchIntensity,
          isDragging: metricsNow.isGrabbed,
          displacement: metricsNow.maxDisplacement,
          lastTouchU: metricsNow.lastTouchU,
          lastTouchV: metricsNow.lastTouchV,
          ready: true,
        });
      }

      afterDraw(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', unlockAudioOnGesture);
      window.removeEventListener('keydown', unlockAudioOnGesture);
      controls.removeEventListener('start', onControlStart);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', releaseGrab);
      domElement.removeEventListener('pointercancel', releaseGrab);
      domElement.removeEventListener('pointerleave', onPointerLeave);
      domElement.removeEventListener('webglcontextlost', handleContextLost);
      domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      audioEngine.dispose();
      audioRef.current = null;
      if (htmlSource) {
        htmlSource.onpaint = null;
      }
      htmlInCanvasTexture?.dispose();
      controls.dispose();
      wallTileMaps.dispose();
      floorTileMaps.dispose();
      curtainTexture.dispose();
      weaveBump.dispose();
      steamTex.dispose();
      envTarget.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (domElement.parentNode === mount) {
        mount.removeChild(domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-scene-ready="false"
      data-character={character.id}
      data-lighting-mood={lightingMood}
      data-camera-preset={cameraPreset}
      data-glitch-active="false"
      data-dragging="false"
      data-audio-enabled={audioEnabled ? 'true' : 'false'}
      data-audio-state={audioEnabled ? 'idle' : 'muted'}
      data-texture-pipeline="canvas2d-fallback"
      className="relative w-full h-full overflow-hidden bg-[#0b0816]"
    >
      {/* In-viewport Chrome 157+ html-in-canvas live DOM source canvas (occluded behind Three.js WebGL so Blink fires onpaint) */}
      <canvas
        ref={htmlSourceCanvasRef}
        // @ts-expect-error experimental Chrome 157+ html-in-canvas attribute
        layoutsubtree="true"
        suppressHydrationWarning
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '512px',
          height: '682px',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <div
          ref={htmlDomContentRef}
          style={{ width: '512px', height: '682px', position: 'relative', overflow: 'hidden' }}
        >
          <CurtainDomContent
            character={character}
            glitchActive={domGlitchActive}
            onImageLoad={() => requestHtmlInCanvasPaint(htmlSourceCanvasRef.current)}
          />
        </div>
      </canvas>

      <div ref={mountRef} className="relative z-10 w-full h-full bg-[#0b0816]" />

      {contextLost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0b0816]/95 text-center px-6">
          <p className="font-display text-2xl uppercase tracking-wider text-[#ff4fd8]">
            WebGL Context Paused
          </p>
          <p className="mt-2 max-w-md text-sm text-white/75">
            The 3D neon bathroom renderer lost its graphics context. Reload or wait a moment for recovery.
          </p>
        </div>
      )}
    </div>
  );
}
