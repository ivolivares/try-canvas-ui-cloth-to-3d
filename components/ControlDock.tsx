'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Wind,
  RotateCcw,
  ScanSearch,
  SlidersHorizontal,
  Camera,
  SunMedium,
  Pin,
  Layers,
  Volume2,
  VolumeX,
  Box,
} from 'lucide-react';
import type { ClothPinMode } from '@/lib/clothPhysics';
import {
  CAMERA_PRESETS,
  CHARACTER_TEXTURES,
  LIGHTING_MOODS,
  type CameraPresetId,
  type CharacterTextureAsset,
  type LightingMoodId,
} from '@/lib/galleryData';

interface ControlDockProps {
  selectedCharacter: CharacterTextureAsset;
  onSelectCharacter: (char: CharacterTextureAsset) => void;
  onOpenInspector: () => void;
  lightingMood: LightingMoodId;
  onChangeLightingMood: (mood: LightingMoodId) => void;
  cameraPreset: CameraPresetId;
  onChangeCameraPreset: (preset: CameraPresetId) => void;
  pinMode: ClothPinMode;
  onChangePinMode: (pin: ClothPinMode) => void;
  floatMode: boolean;
  onToggleFloatMode: () => void;
  wind: number;
  onChangeWind: (wind: number) => void;
  stiffness: number;
  onChangeStiffness: (stiffness: number) => void;
  onTriggerGust: () => void;
  onResetCloth: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  stageMode: 'three-3d' | 'canvasui-cloth';
  onToggleStageMode: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const PIN_OPTIONS: { id: ClothPinMode; label: string }[] = [
  { id: 'top', label: 'Top Rod' },
  { id: 'corners', label: 'Corners' },
  { id: 'left', label: 'Left Rail' },
  { id: 'none', label: 'Free' },
];

export default function ControlDock({
  selectedCharacter,
  onSelectCharacter,
  onOpenInspector,
  lightingMood,
  onChangeLightingMood,
  cameraPreset,
  onChangeCameraPreset,
  pinMode,
  onChangePinMode,
  floatMode,
  onToggleFloatMode,
  wind,
  onChangeWind,
  stiffness,
  onChangeStiffness,
  onTriggerGust,
  onResetCloth,
  audioEnabled,
  onToggleAudio,
  stageMode,
  onToggleStageMode,
  collapsed,
  onToggleCollapsed,
}: ControlDockProps) {
  const [tuningOpen, setTuningOpen] = useState(false);

  return (
    <>
      {/* Collapsible Bottom Control Dock — sits cleanly above the footer-right attribution badge */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center px-3 pb-10">
        <div className="pointer-events-auto flex w-full max-w-[1180px] flex-col items-center">
          {/* Expanded Tuning Strip (Physics, Lighting Mood, Camera Presets) */}
          <AnimatePresence>
            {!collapsed && tuningOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.16 }}
                className="mb-2 w-full bg-[#0b0718]/94 border border-white/15 p-3 sm:p-4 shadow-2xl"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Cloth Physics Tuning */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#2ee7ff]">
                      <Pin className="h-3.5 w-3.5" />
                      <span>Cloth Anchors &amp; Physics</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {PIN_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangePinMode(opt.id)}
                          className={`px-2 py-1 text-[11px] font-medium transition-colors border ${
                            pinMode === opt.id
                              ? 'bg-[#ff4fd8]/25 border-[#ff4fd8] text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-white/30'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <label className="flex items-center justify-between text-[11px] text-white/75">
                        <span>Steam Airflow</span>
                        <span className="font-mono tabular-nums text-white">{wind.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1.4}
                        step={0.05}
                        value={wind}
                        onChange={(e) => onChangeWind(parseFloat(e.target.value))}
                        className="w-full accent-[#2ee7ff] h-1 bg-white/15 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between text-[11px] text-white/75">
                        <span>Fabric Stiffness</span>
                        <span className="font-mono tabular-nums text-white">{stiffness.toFixed(2)}</span>
                      </label>
                      <input
                        type="range"
                        min={0.35}
                        max={1.0}
                        step={0.05}
                        value={stiffness}
                        onChange={(e) => onChangeStiffness(parseFloat(e.target.value))}
                        className="w-full accent-[#ff4fd8] h-1 bg-white/15 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Dim Neon Lighting Moods */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#ff6ae4]">
                      <SunMedium className="h-3.5 w-3.5" />
                      <span>Neon Bathroom Lighting</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {LIGHTING_MOODS.map((mood) => {
                        const active = lightingMood === mood.id;
                        return (
                          <button
                            key={mood.id}
                            type="button"
                            onClick={() => onChangeLightingMood(mood.id)}
                            className={`flex items-center justify-between px-2.5 py-1.5 text-left border transition-colors ${
                              active
                                ? 'bg-[#1c1033] border-[#ff4fd8] text-white'
                                : 'bg-white/5 border-white/10 text-white/75 hover:border-white/30'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold">{mood.label}</div>
                              <div className="text-[10px] text-white/55 line-clamp-1">
                                {mood.description}
                              </div>
                            </div>
                            <span className="ml-2 flex gap-1 shrink-0">
                              <span
                                className="h-2.5 w-2.5 border border-white/25"
                                style={{ backgroundColor: mood.neonPinkColor }}
                              />
                              <span
                                className="h-2.5 w-2.5 border border-white/25"
                                style={{ backgroundColor: mood.neonCyanColor }}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Camera Presets */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#ffca6b]">
                      <Camera className="h-3.5 w-3.5" />
                      <span>Camera Angles</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CAMERA_PRESETS.map((preset) => {
                        const active = cameraPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => onChangeCameraPreset(preset.id)}
                            className={`px-2.5 py-2 text-xs font-medium border transition-colors ${
                              active
                                ? 'bg-[#2ee7ff]/20 border-[#2ee7ff] text-white'
                                : 'bg-white/5 border-white/10 text-white/75 hover:border-white/30 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] leading-snug text-white/55 pt-1">
                      Drag directly on the shower curtain to pull &amp; trigger Vice HUD glitches. Drag outside the curtain to orbit the bathroom.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Compact Dock Bar OR Collapsed Toggle Button */}
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="flex items-center gap-2 bg-[#0b0718]/92 hover:bg-[#170f2e] border border-white/20 px-4 py-2 text-xs font-medium text-white transition-colors"
            >
              <ChevronUp className="h-4 w-4 text-[#2ee7ff]" />
              <span>Show Controls</span>
              <span className="font-mono text-[10px] text-white/45">[H]</span>
            </button>
          ) : (
            <div className="flex w-full flex-wrap lg:flex-nowrap items-center justify-between gap-2 bg-[#0b0718]/92 border border-white/15 px-2.5 py-1.5 shadow-2xl">
              {/* Left: Character Texture Gallery Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {CHARACTER_TEXTURES.map((char) => {
                  const active = selectedCharacter.id === char.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => onSelectCharacter(char)}
                      data-character-btn={char.id}
                      className={`group flex items-center gap-1.5 px-1.5 py-1 border transition-colors shrink-0 ${
                        active
                          ? 'bg-[#1a1030] border-[#ff4fd8] text-white'
                          : 'bg-white/5 border-white/10 text-white/75 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <Image
                        src={char.imagePath}
                        alt={char.name}
                        width={22}
                        height={30}
                        referrerPolicy="no-referrer"
                        className="h-7 w-5 object-cover border border-white/20"
                      />
                      <div className="text-left pr-0.5">
                        <div className="font-display text-xs font-semibold uppercase tracking-wide leading-none">
                          {char.name.split(' ')[0]}
                        </div>
                        <div className="mt-0.5 font-mono text-[9px] text-white/55">
                          {char.codename}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: Quick Action Controls */}
              <div className="flex items-center gap-1.5 flex-wrap lg:flex-nowrap shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={onToggleStageMode}
                  data-action="toggle-stage-mode"
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    stageMode === 'canvasui-cloth'
                      ? 'bg-[#ff4fd8]/25 border-[#ff4fd8] text-white'
                      : 'bg-white/5 border-white/15 text-white/90 hover:bg-white/12'
                  }`}
                  title="Switch between Three.js 3D Bathroom (with html-in-canvas texture) and direct Canvas UI Cloth component"
                >
                  <Box className="h-3.5 w-3.5 text-[#ff6ae4]" />
                  <span>{stageMode === 'three-3d' ? 'Canvas UI' : '3D Room'}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenInspector}
                  data-action="inspect-texture"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#ff4fd8]/25 to-[#2ee7ff]/25 hover:from-[#ff4fd8]/40 hover:to-[#2ee7ff]/40 border border-[#2ee7ff]/60 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <ScanSearch className="h-3.5 w-3.5 text-[#2ee7ff]" />
                  <span>Inspect 4K</span>
                </button>

                <button
                  type="button"
                  onClick={onTriggerGust}
                  data-action="gust"
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/12 border border-white/15 px-2.5 py-1.5 text-xs text-white/90 transition-colors"
                  title="Send a neon steam gust across the curtain"
                >
                  <Wind className="h-3.5 w-3.5 text-[#ff6ae4]" />
                  <span className="hidden sm:inline">Gust</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleFloatMode}
                  data-action="float-mode"
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs transition-colors ${
                    floatMode
                      ? 'bg-[#ff4fd8]/25 border-[#ff4fd8] text-white'
                      : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/12'
                  }`}
                  title="Hold sculpted folds in mid-air"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Fold</span>
                </button>

                <button
                  type="button"
                  onClick={onResetCloth}
                  className="flex items-center justify-center bg-white/5 hover:bg-white/12 border border-white/15 p-1.5 text-white/80 hover:text-white transition-colors"
                  title="Reset curtain shape"
                  aria-label="Reset curtain shape"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onToggleAudio}
                  data-action="toggle-audio"
                  aria-pressed={audioEnabled}
                  className={`flex items-center justify-center border p-1.5 transition-colors ${
                    audioEnabled
                      ? 'bg-[#2ee7ff]/15 border-[#2ee7ff]/60 text-[#2ee7ff] hover:bg-[#2ee7ff]/25'
                      : 'bg-white/5 border-white/15 text-white/50 hover:text-white hover:bg-white/12'
                  }`}
                  title={audioEnabled ? 'Mute fabric & neon audio (M)' : 'Unmute fabric & neon audio (M)'}
                  aria-label={audioEnabled ? 'Mute fabric and neon audio' : 'Unmute fabric and neon audio'}
                >
                  {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setTuningOpen((v) => !v)}
                  data-action="toggle-tuning"
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-xs transition-colors ${
                    tuningOpen
                      ? 'bg-[#2ee7ff]/20 border-[#2ee7ff] text-white'
                      : 'bg-white/5 border-white/15 text-white/85 hover:bg-white/12'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Scene</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  data-action="hide-controls"
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/12 border border-white/15 px-2 py-1.5 text-xs text-white/75 hover:text-white transition-colors"
                  title="Hide Controls (H)"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Hide</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Required Footer Right Attribution Badge */}
      <footer className="pointer-events-none fixed right-3 bottom-2.5 z-30">
        <div
          data-footer-badge="david-haz"
          className="pointer-events-auto inline-flex items-center gap-2 bg-[#0b0718]/92 border border-[#ff4fd8]/40 px-3 py-1 text-[11px] font-medium tracking-wide text-white/90 shadow-lg"
        >
          <span className="h-1.5 w-1.5 bg-[#2ee7ff]" aria-hidden="true" />
          <span>Build using Gemini 4 Neon by <a href="https://x.com/ivolivares" target="_blank">Iván Olivares R.</a> - Inspired by <a href="https://canvasui.dev/docs/components/cloth" target="_blank">Canvas UI Cloth component</a> by <a href="https://x.com/davidhaz" target="_blank">David Haz</a></span>
        </div>
      </footer>
    </>
  );
}
