'use client';

import React, { useEffect, useRef, useState } from 'react';
import Cloth from '@/components/Cloth';
import CurtainDomContent from '@/components/CurtainDomContent';
import type { ClothPinMode } from '@/lib/clothPhysics';
import type { CharacterTextureAsset } from '@/lib/galleryData';
import type { SceneTelemetry } from '@/components/BathroomScene';
import { ViceAudioEngine } from '@/lib/audioEngine';

interface CanvasUiClothStageProps {
  character: CharacterTextureAsset;
  pinMode: ClothPinMode;
  floatMode: boolean;
  wind: number;
  stiffness: number;
  audioEnabled: boolean;
  onTelemetry: (telemetry: SceneTelemetry) => void;
}

/**
 * Direct Canvas UI `<Cloth>` stage rendering David Haz's official React Cloth component
 * (https://canvasui.dev/docs/components/cloth) over live GTA VI HTML DOM content.
 *
 * On Chrome 157+ (`html-in-canvas` enabled), `<Cloth>` paints the live DOM subtree
 * onto a WebGL cloth shader. On browsers without `html-in-canvas`, `<Cloth>` renders
 * its built-in graceful HTML fallback while `HtmlInCanvasNotice` explains browser support.
 */
export default function CanvasUiClothStage({
  character,
  pinMode,
  floatMode,
  wind,
  stiffness,
  audioEnabled,
  onTelemetry,
}: CanvasUiClothStageProps) {
  const [glitchEnergy, setGlitchEnergy] = useState(0);
  const glitchEnergyRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<ViceAudioEngine | null>(null);
  const lastPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const engine = new ViceAudioEngine();
    audioRef.current = engine;
    return () => {
      engine.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = audioRef.current;
    if (!engine) return;
    engine.setMuted(!audioEnabled);
    if (audioEnabled) engine.unlock();
  }, [audioEnabled]);

  useEffect(() => {
    if (glitchEnergy <= 0.01 && !isDragging) return;
    const id = window.setInterval(() => {
      const prev = glitchEnergyRef.current;
      const next = isDragging ? Math.max(0.7, prev * 0.96) : Math.max(0, prev - 0.08);
      glitchEnergyRef.current = next;
      setGlitchEnergy(next);
      onTelemetry({
        glitchEnergy: next,
        touchIntensity: Math.min(1, next),
        isDragging,
        displacement: next * 0.4,
        lastTouchU: 0.5,
        lastTouchV: 0.5,
        ready: true,
      });
      audioRef.current?.update({
        pointerSpeed: isDragging ? 0.6 : 0,
        isHovering: next > 0.05,
        isDragging,
        glitchEnergy: next,
        touchU: 0.5,
        displacement: next * 0.4,
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [glitchEnergy, isDragging, onTelemetry]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const v = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    const now = performance.now();
    const prev = lastPosRef.current;
    let speed = 0;
    if (prev) {
      const dt = Math.max(8, now - prev.time) / 1000;
      speed = Math.min(3, Math.hypot(e.clientX - prev.x, e.clientY - prev.y) / (dt * 450));
    }
    lastPosRef.current = { x: e.clientX, y: e.clientY, time: now };

    if (audioEnabled) audioRef.current?.unlock();
    const nextGlitch = Math.min(1.2, Math.max(glitchEnergyRef.current, isDragging ? 1.0 : speed * 0.65));
    glitchEnergyRef.current = nextGlitch;
    setGlitchEnergy(nextGlitch);

    audioRef.current?.update({
      pointerSpeed: speed,
      isHovering: true,
      isDragging,
      glitchEnergy: nextGlitch,
      touchU: u,
      displacement: nextGlitch * 0.35,
    });

    onTelemetry({
      glitchEnergy: nextGlitch,
      touchIntensity: Math.min(1, nextGlitch),
      isDragging,
      displacement: nextGlitch * 0.35,
      lastTouchU: u,
      lastTouchV: v,
      ready: true,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    glitchEnergyRef.current = 1.0;
    setGlitchEnergy(1.0);
    if (audioEnabled) {
      audioRef.current?.unlock();
      const rect = e.currentTarget.getBoundingClientRect();
      const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
      audioRef.current?.triggerGrabCue(u);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      data-stage-mode="canvasui-cloth"
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#090612] px-4 pb-24 pt-20"
    >
      {/* Dim Neon Bathroom Tiled Ambient Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 22% 38%, rgba(255,40,174,0.28), transparent 42%), radial-gradient(circle at 78% 40%, rgba(12,229,255,0.24), transparent 42%), linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 48px 26px, 48px 26px',
        }}
      />

      {/* Neon Alcove Frame + Chrome Rod + Official David Haz Canvas UI <Cloth> */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Chrome Curtain Rod */}
        <div className="mb-1.5 flex w-[min(430px,84vw)] items-center justify-between">
          <span className="h-3.5 w-2 bg-gradient-to-b from-white to-slate-400" />
          <div className="h-2 flex-1 bg-gradient-to-b from-white via-slate-300 to-slate-500 shadow-[0_2px_12px_rgba(255,255,255,0.25)]" />
          <span className="h-3.5 w-2 bg-gradient-to-b from-white to-slate-400" />
        </div>

        <div className="relative flex items-center gap-3">
          {/* Left Magenta Neon Tube */}
          <div
            aria-hidden="true"
            className="hidden sm:block h-[min(64vh,580px)] w-2 rounded-full bg-[#ff36b8] shadow-[0_0_24px_#ff36b8,0_0_48px_rgba(255,54,184,0.65)]"
          />

          {/* Official Canvas UI <Cloth> Component */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="h-[min(66vh,600px)] w-[min(410px,80vw)] cursor-grab active:cursor-grabbing"
          >
            <Cloth
              pin={pinMode}
              wind={Math.min(1, wind)}
              stiffness={stiffness}
              float={floatMode}
              drag
              className="h-full w-full shadow-[0_24px_64px_rgba(0,0,0,0.75)]"
            >
              <CurtainDomContent
                character={character}
                glitchActive={glitchEnergy > 0.12 || isDragging}
                interactiveHint="CANVAS UI <CLOTH> · HTML-IN-CANVAS COMPONENT"
              />
            </Cloth>
          </div>

          {/* Right Cyan Neon Tube */}
          <div
            aria-hidden="true"
            className="hidden sm:block h-[min(64vh,580px)] w-2 rounded-full bg-[#1ae6ff] shadow-[0_0_24px_#1ae6ff,0_0_48px_rgba(26,230,255,0.65)]"
          />
        </div>
      </div>
    </div>
  );
}
