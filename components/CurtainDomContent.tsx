'use client';

import React from 'react';
import type { CharacterTextureAsset } from '@/lib/galleryData';

interface CurtainDomContentProps {
  character: CharacterTextureAsset;
  glitchActive?: boolean;
  interactiveHint?: string;
  onImageLoad?: () => void;
}

/**
 * Real live HTML/CSS DOM content for the GTA VI shower curtain.
 * Painted directly onto a GPU texture via Chrome's `html-in-canvas` API
 * (`drawElementImage` / `layoutsubtree`) in both:
 *  - David Haz's official `<Cloth>` component (`components/Cloth.tsx`)
 *  - The 3D Three.js shower curtain mesh (`components/BathroomScene.tsx`)
 */
export default function CurtainDomContent({
  character,
  glitchActive = false,
  interactiveHint = 'DRAG OR BRUSH CURTAIN · INTERACTIVE CLOTH',
  onImageLoad,
}: CurtainDomContentProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden select-none bg-[#120922] text-white"
      style={{
        fontFamily: 'var(--font-sans), sans-serif',
      }}
    >
      {/* High-Resolution GTA VI Character Artwork (Native HTML img painted by html-in-canvas) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={character.imagePath}
        alt={character.name}
        crossOrigin="anonymous"
        draggable={false}
        onLoad={onImageLoad}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />

      {/* Top & Bottom Contrast Scrims */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[16%]"
        style={{
          background: 'linear-gradient(to bottom, rgba(9,6,18,0.78), rgba(9,6,18,0))',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%]"
        style={{
          background:
            'linear-gradient(to top, rgba(9,5,20,0.92) 0%, rgba(12,6,26,0.56) 58%, rgba(10,6,22,0) 100%)',
        }}
      />

      {/* Stitched Shower Curtain Header & Grommet Eyelets */}
      <div className="relative z-10 flex h-[5.5%] w-full items-center justify-between border-b border-dashed border-white/25 bg-[#120d1e]/75 px-[3%]">
        {Array.from({ length: 13 }).map((_, idx) => (
          <span
            key={idx}
            className="h-3.5 w-3.5 rounded-full border-2 border-[#d9e3f0] bg-[#090710]"
          />
        ))}
      </div>

      {/* Top Fabric HUD File Metadata */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-[3.5%] pt-[1.6%] font-mono text-[9px] font-bold tracking-wider whitespace-nowrap">
        <span className="truncate text-[#2ee7ff] drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">
          FILE // {character.codename} · {character.name.toUpperCase()}
        </span>
        <span className="shrink-0 text-[#ff6ae4] drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">
          {character.district}
        </span>
      </div>

      {/* Active Glitch Scanline & HUD Banner Layer */}
      {glitchActive && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(12,8,26,0.55) 0px, rgba(12,8,26,0.55) 2px, transparent 2px, transparent 6px)',
            }}
          />
          <div className="mx-auto mt-[10%] w-[64%] border border-[#2ee7ff] bg-[#0e071c]/90 px-3 py-1.5 text-center font-mono text-xs font-bold tracking-widest text-[#2ee7ff] shadow-[0_0_24px_rgba(46,231,255,0.45)]">
            VICE HUD // HTML-IN-CANVAS GLITCH ACTIVE
          </div>
          <div
            className="absolute inset-x-0 top-[38%] h-2 opacity-60"
            style={{ backgroundColor: '#2ee7ff' }}
          />
          <div
            className="absolute inset-x-0 top-[54%] h-1.5 opacity-60"
            style={{ backgroundColor: '#ff36b8' }}
          />
        </div>
      )}

      {/* Simulated GTA VI Vice City Logo Lockup */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[6%] z-20 flex flex-col items-center text-center">
        <span
          className="font-display text-xs sm:text-sm font-bold uppercase tracking-[0.22em] text-white"
          style={{ textShadow: '0 2px 8px rgba(10,6,22,0.95)' }}
        >
          VICE CITY VIRTUAL GALLERY
        </span>

        <div className="relative -my-2 flex items-center justify-center">
          {/* Giant Sunset Gradient Roman Numeral VI */}
          <span
            className="font-display text-[112px] sm:text-[138px] font-bold leading-none tracking-tight bg-gradient-to-b from-[#ffca6b] via-[#ff5c93] to-[#5856f2] bg-clip-text text-transparent"
            style={{
              WebkitTextStroke: '2px rgba(255,255,255,0.88)',
              filter: glitchActive
                ? 'drop-shadow(-4px 0 0 rgba(46,231,255,0.8)) drop-shadow(4px 0 0 rgba(255,54,184,0.8))'
                : 'drop-shadow(0 8px 24px rgba(255,79,216,0.45))',
            }}
          >
            VI
          </span>

          {/* Vice City Script Overlay: "Powered by Canvas UI" */}
          <span
            className="font-vice absolute top-[54%] -rotate-2 whitespace-nowrap text-3xl sm:text-4xl text-[#ff4fd8]"
            style={{
              textShadow:
                '3px 3px 0px #2ee7ff, -2px -2px 0px #12051f, 2px -2px 0px #12051f, -2px 2px 0px #12051f, 0 0 18px rgba(255,79,216,0.7)',
            }}
          >
            Powered by Canvas UI
          </span>
        </div>

        {/* Bottom Telemetry Bar */}
        <div className="mt-4 flex items-center gap-2 border-x-4 border-[#ff4fd8] bg-[#0a0616]/85 px-4 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#f8f2ff]">
          <span>{glitchActive ? 'SIGNAL GLITCH ACTIVE · TOUCH INTERACTION' : interactiveHint}</span>
        </div>
      </div>

      {/* Subtle Neon Hem Trim */}
      <div className="pointer-events-none absolute inset-1 border border-[#ff4fd8]/30" />
    </div>
  );
}
