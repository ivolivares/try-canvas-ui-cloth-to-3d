'use client';

import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import BathroomScene, { type SceneTelemetry } from '@/components/BathroomScene';
import CanvasUiClothStage from '@/components/CanvasUiClothStage';
import HtmlInCanvasNotice from '@/components/HtmlInCanvasNotice';
import ViceHud from '@/components/ViceHud';
import ControlDock from '@/components/ControlDock';
import TextureInspectorModal from '@/components/TextureInspectorModal';
import type { ClothPinMode } from '@/lib/clothPhysics';
import {
  detectHtmlInCanvasSupport,
  type HtmlInCanvasCapabilities,
} from '@/lib/htmlInCanvasBridge';
import {
  CHARACTER_TEXTURES,
  type CameraPresetId,
  type CharacterTextureAsset,
  type LightingMoodId,
} from '@/lib/galleryData';

const INITIAL_TELEMETRY: SceneTelemetry = {
  glitchEnergy: 0,
  touchIntensity: 0,
  isDragging: false,
  displacement: 0,
  lastTouchU: 0.5,
  lastTouchV: 0.5,
  ready: false,
};

const SSR_CAPABILITIES: HtmlInCanvasCapabilities = {
  supported: false,
  reason: 'ssr',
  hasDrawElementImage: false,
  hasRequestPaint: false,
  isAndroidBlocked: false,
};

const emptySubscribe = () => () => {};
let cachedClientCapabilities: HtmlInCanvasCapabilities | null = null;
function getClientCapabilities(): HtmlInCanvasCapabilities {
  if (!cachedClientCapabilities) {
    cachedClientCapabilities = detectHtmlInCanvasSupport();
  }
  return cachedClientCapabilities;
}

export default function HomePage() {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterTextureAsset>(
    CHARACTER_TEXTURES[0]
  );
  const [lightingMood, setLightingMood] = useState<LightingMoodId>('vice-dusk');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('hero');
  const [pinMode, setPinMode] = useState<ClothPinMode>('top');
  const [floatMode, setFloatMode] = useState(false);
  const [wind, setWind] = useState(0.42);
  const [stiffness, setStiffness] = useState(0.86);
  const [gustTrigger, setGustTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stageMode, setStageMode] = useState<'three-3d' | 'canvasui-cloth'>('three-3d');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<SceneTelemetry>(INITIAL_TELEMETRY);

  const htmlInCanvasCaps = useSyncExternalStore(
    emptySubscribe,
    getClientCapabilities,
    () => SSR_CAPABILITIES
  );

  const handleTelemetry = useCallback((next: SceneTelemetry) => {
    setTelemetry(next);
  }, []);

  // Keyboard shortcuts: 'H' toggles dock, 'G' triggers steam gust, 'M' mutes/unmutes audio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((v) => !v);
      } else if (e.key === 'g' || e.key === 'G') {
        setGustTrigger((n) => n + 1);
      } else if (e.key === 'm' || e.key === 'M') {
        setAudioEnabled((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0b0816]">
      {/* Primary Interactive Stage: Three.js 3D Bathroom (+ html-in-canvas live DOM texture) OR Direct Canvas UI <Cloth> */}
      {stageMode === 'three-3d' ? (
        <BathroomScene
          character={selectedCharacter}
          lightingMood={lightingMood}
          cameraPreset={cameraPreset}
          pinMode={pinMode}
          floatMode={floatMode}
          wind={wind}
          stiffness={stiffness}
          gustTrigger={gustTrigger}
          resetTrigger={resetTrigger}
          audioEnabled={audioEnabled}
          onTelemetry={handleTelemetry}
        />
      ) : (
        <CanvasUiClothStage
          character={selectedCharacter}
          pinMode={pinMode}
          floatMode={floatMode}
          wind={wind}
          stiffness={stiffness}
          audioEnabled={audioEnabled}
          onTelemetry={handleTelemetry}
        />
      )}

      {/* Chrome 157+ html-in-canvas Support & Fallback Notice */}
      <HtmlInCanvasNotice capabilities={htmlInCanvasCaps} stageMode={stageMode} />

      {/* Classic GTA VI Reactive HUD Overlay */}
      <ViceHud
        character={selectedCharacter}
        telemetry={telemetry}
        onInspect={() => setInspectorOpen(true)}
      />

      {/* Collapsible Bottom Gallery & Cloth Control Dock + Footer Attribution Badge */}
      <ControlDock
        selectedCharacter={selectedCharacter}
        onSelectCharacter={setSelectedCharacter}
        onOpenInspector={() => setInspectorOpen(true)}
        lightingMood={lightingMood}
        onChangeLightingMood={setLightingMood}
        cameraPreset={cameraPreset}
        onChangeCameraPreset={setCameraPreset}
        pinMode={pinMode}
        onChangePinMode={setPinMode}
        floatMode={floatMode}
        onToggleFloatMode={() => setFloatMode((v) => !v)}
        wind={wind}
        onChangeWind={setWind}
        stiffness={stiffness}
        onChangeStiffness={setStiffness}
        onTriggerGust={() => setGustTrigger((n) => n + 1)}
        onResetCloth={() => setResetTrigger((n) => n + 1)}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled((v) => !v)}
        stageMode={stageMode}
        onToggleStageMode={() =>
          setStageMode((m) => (m === 'three-3d' ? 'canvasui-cloth' : 'three-3d'))
        }
        collapsed={dockCollapsed}
        onToggleCollapsed={() => setDockCollapsed((v) => !v)}
      />

      {/* High-Resolution Character Texture Lightbox Modal */}
      <TextureInspectorModal
        open={inspectorOpen}
        character={selectedCharacter}
        onSelectCharacter={setSelectedCharacter}
        onClose={() => setInspectorOpen(false)}
      />
    </main>
  );
}
