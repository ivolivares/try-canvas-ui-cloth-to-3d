'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ShieldAlert, Crosshair, Sparkles } from 'lucide-react';
import type { CharacterTextureAsset } from '@/lib/galleryData';
import type { SceneTelemetry } from './BathroomScene';

interface ViceHudProps {
  character: CharacterTextureAsset;
  telemetry: SceneTelemetry;
  onInspect: () => void;
}

export default function ViceHud({ character, telemetry, onInspect }: ViceHudProps) {
  const isGlitching = telemetry.glitchEnergy > 0.08 || telemetry.isDragging;
  const activeStars = isGlitching ? Math.min(5, character.wantedLevel + 1) : character.wantedLevel;
  const signalStrength = Math.min(100, Math.round(telemetry.glitchEnergy * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Row: Minimal Title Lockup (Left) + Classic GTA VI HUD Cluster (Right) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Title Lockup */}
        <div className="pointer-events-auto select-none">
          <div className="flex items-baseline gap-2.5">
            <h1
              className={`font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,79,216,0.45)] ${
                isGlitching ? 'vice-glitch-jitter' : ''
              }`}
            >
              <span className="bg-gradient-to-r from-[#ffca6b] via-[#ff4fd8] to-[#2ee7ff] bg-clip-text text-transparent">
                GTA VI
              </span>{' '}
              <span className="text-white/95">Cloth Gallery</span>
            </h1>
          </div>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-white/75">
            <span className="font-vice text-base text-[#ff6ae4] tracking-wide">
              Powered by Canvas UI
            </span>
            <span className="text-white/30">·</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#2ee7ff]/90">
              Drag or Brush Curtain
            </span>
          </p>
        </div>

        {/* Top-Right Classic GTA HUD Cluster */}
        <div
          data-hud-glitch={isGlitching ? 'active' : 'idle'}
          className={`pointer-events-auto flex flex-col items-end gap-1.5 transition-transform duration-150 ${
            isGlitching ? 'vice-glitch-jitter' : ''
          }`}
        >
          {/* Classic Wanted Stars Row */}
          <div className="flex items-center gap-1 bg-[#0b0718]/85 border border-white/15 px-3 py-1.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const lit = i < activeStars;
              return (
                <Star
                  key={i}
                  className={`h-4 w-4 transition-colors duration-150 ${
                    lit
                      ? isGlitching
                        ? i % 2 === 0
                          ? 'fill-[#ff4fd8] text-[#ff4fd8]'
                          : 'fill-[#2ee7ff] text-[#2ee7ff]'
                        : 'fill-[#ffca6b] text-[#ffca6b]'
                      : 'text-white/20'
                  }`}
                />
              );
            })}
            <span className="ml-2 font-mono text-xs font-semibold tabular-nums text-[#4df59d]">
              {character.bounty}
            </span>
          </div>

          {/* Character / Texture Slot Micro-HUD */}
          <button
            type="button"
            onClick={onInspect}
            className="group flex items-center gap-3 bg-[#0b0718]/85 hover:bg-[#160f2d]/95 border border-white/15 hover:border-[#2ee7ff]/60 px-3 py-2 text-left transition-colors"
            title="Inspect high-resolution character texture"
          >
            <div className="flex flex-col items-end">
              <span className="font-display text-sm font-semibold uppercase tracking-wider text-white">
                {character.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/65">
                {character.codename} · {character.role}
              </span>
            </div>
            <div
              className="flex h-8 w-8 items-center justify-center border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${character.accentHex}33, ${character.secondaryHex}33)`,
                borderColor: isGlitching ? '#2ee7ff' : `${character.accentHex}88`,
              }}
            >
              <Crosshair className="h-4 w-4 text-white group-hover:text-[#2ee7ff] transition-colors" />
            </div>
          </button>

          {/* Reactive Signal Glitch Readout (appears dynamically when touching/dragging curtain) */}
          <AnimatePresence>
            {isGlitching && (
              <motion.div
                initial={{ opacity: 0, x: 12, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className="flex items-center gap-2.5 bg-[#120826]/92 border-l-2 border-[#ff4fd8] border-y border-r border-[#2ee7ff]/40 px-3 py-1.5"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-[#ff4fd8]" />
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#2ee7ff]">
                    {telemetry.isDragging ? 'CURTAIN GRAB // GLITCH ACTIVE' : 'SURFACE TOUCH // SIGNAL SHIFT'}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-white/15 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#ff4fd8] to-[#2ee7ff] transition-all duration-75"
                        style={{ width: `${Math.max(18, signalStrength)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-white/90">
                      {signalStrength}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Classic Vice City District Callout — sits cleanly below top-left title, zero dock overlap */}
      <AnimatePresence>
        {isGlitching && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed left-4 sm:left-6 top-24 sm:top-24 z-10 max-w-xs"
          >
            <div className="border-l-2 border-[#2ee7ff] bg-[#0b0718]/90 border-y border-r border-white/10 px-3.5 py-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#ff6ae4]">
                <Sparkles className="h-3 w-3" />
                <span>{character.hudTagline}</span>
              </div>
              <div className="font-vice text-2xl leading-tight text-white drop-shadow-[0_0_8px_rgba(46,231,255,0.65)]">
                {character.district}
              </div>
              <div className="font-mono text-[10px] text-white/60">
                {character.coordinates} · UV ({telemetry.lastTouchU.toFixed(2)}, {telemetry.lastTouchV.toFixed(2)})
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
