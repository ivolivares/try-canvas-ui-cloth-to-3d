'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Zap,
  Check,
  Layers,
  MapPin,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { CHARACTER_TEXTURES, type CharacterTextureAsset } from '@/lib/galleryData';
import { renderCurtainCanvas } from '@/lib/bathroomTextures';

type TextureChannel = 'composite' | 'albedo' | 'weave' | 'normal' | 'specular';

interface TextureInspectorModalProps {
  open: boolean;
  character: CharacterTextureAsset;
  onSelectCharacter: (char: CharacterTextureAsset) => void;
  onClose: () => void;
}

const CHANNEL_TABS: { id: TextureChannel; label: string }[] = [
  { id: 'composite', label: 'Curtain Print' },
  { id: 'albedo', label: 'Raw Albedo' },
  { id: 'weave', label: 'Fabric Weave' },
  { id: 'normal', label: 'Fold Normal' },
  { id: 'specular', label: 'Neon Specular' },
];

export default function TextureInspectorModal({
  open,
  character,
  onSelectCharacter,
  onClose,
}: TextureInspectorModalProps) {
  const [channel, setChannel] = useState<TextureChannel>('composite');
  const [zoom, setZoom] = useState(1);
  const [glitchBurst, setGlitchBurst] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!scratchRef.current) {
      scratchRef.current = document.createElement('canvas');
      scratchRef.current.width = canvas.width;
      scratchRef.current.height = canvas.height;
    }

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      drawChannelPreview(canvas, scratchRef.current!, img, character, channel, glitchBurst);
    };
    img.src = character.imagePath;

    return () => {
      cancelled = true;
    };
  }, [open, character, channel, glitchBurst]);

  // Smoothly decay test glitch pulse in modal
  useEffect(() => {
    if (glitchBurst <= 0) return;
    const id = window.setTimeout(() => {
      setGlitchBurst((prev) => (prev > 0.12 ? Number((prev - 0.18).toFixed(2)) : 0));
    }, 65);
    return () => clearTimeout(id);
  }, [glitchBurst]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#06040d]/92 p-3 sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="High-Resolution Character Texture Inspector"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden border border-white/15 bg-[#0c0819] shadow-2xl md:flex-row"
          >
            {/* Left: Interactive High-Res Texture Canvas */}
            <div className="relative flex flex-1 flex-col bg-[#080512] border-b md:border-b-0 md:border-r border-white/15">
              {/* Channel Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 bg-[#0f0a21]">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {CHANNEL_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setChannel(tab.id)}
                      className={`px-2.5 py-1 text-[11px] font-medium border transition-colors shrink-0 ${
                        channel === tab.id
                          ? 'bg-[#2ee7ff]/20 border-[#2ee7ff] text-white'
                          : 'bg-white/5 border-white/10 text-white/65 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGlitchBurst(1.0)}
                    className="flex items-center gap-1 bg-[#ff4fd8]/20 hover:bg-[#ff4fd8]/35 border border-[#ff4fd8]/60 px-2 py-1 text-[11px] font-semibold text-white transition-colors"
                  >
                    <Zap className="h-3 w-3 text-[#ff87e5]" />
                    <span>Test Glitch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                    className="p-1 bg-white/5 hover:bg-white/15 border border-white/10 text-white/80"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-[11px] tabular-nums text-white/75 w-9 text-center">
                    {zoom.toFixed(1)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.5).toFixed(1))))}
                    className="p-1 bg-white/5 hover:bg-white/15 border border-white/10 text-white/80"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Zoomable High-Res Preview Surface */}
              <div className="relative flex flex-1 items-center justify-center overflow-auto p-4">
                <div
                  className="transition-transform duration-200 origin-center"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <canvas
                    ref={canvasRef}
                    width={720}
                    height={960}
                    className="max-h-[68vh] w-auto border border-white/15 shadow-[0_0_40px_rgba(255,79,216,0.18)]"
                  />
                </div>
              </div>
            </div>

            {/* Right: Character & Material Technical Dossier */}
            <div className="flex w-full md:w-[340px] lg:w-[370px] flex-col justify-between bg-[#0d091c] p-5 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-[#2ee7ff]">
                      {character.codename} · TEXTURE SHEET
                    </div>
                    <h2 className="mt-0.5 font-display text-2xl font-bold uppercase tracking-wide text-white">
                      {character.name}
                    </h2>
                    <p className="text-xs text-[#ff87e5] font-medium">{character.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/15 text-white/80 hover:text-white transition-colors"
                    aria-label="Close Texture Inspector"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Vice Location Banner */}
                <div className="border-l-2 border-[#ff4fd8] bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-white/60">
                    <MapPin className="h-3 w-3 text-[#2ee7ff]" />
                    <span>{character.district}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-white/85">
                    {character.coordinates}
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-white/75">{character.materialNotes}</p>

                {/* PBR Technical Specs Grid */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/55">
                    <Cpu className="h-3 w-3 text-[#2ee7ff]" />
                    <span>PBR Cloth Material Specs</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/[0.04] border border-white/10 p-2.5">
                      <div className="text-[10px] text-white/50">Resolution</div>
                      <div className="mt-0.5 font-mono text-[11px] text-white">
                        {character.resolution}
                      </div>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 p-2.5">
                      <div className="text-[10px] text-white/50">Roughness</div>
                      <div className="mt-0.5 font-mono text-[11px] text-white">
                        {character.pbrSpecs.roughness}
                      </div>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 p-2.5">
                      <div className="text-[10px] text-white/50">Fabric Weave</div>
                      <div className="mt-0.5 font-mono text-[11px] text-white">
                        {character.pbrSpecs.weaveDensity}
                      </div>
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 p-2.5">
                      <div className="text-[10px] text-white/50">Sheen Profile</div>
                      <div className="mt-0.5 font-mono text-[11px] text-white">
                        {character.pbrSpecs.sheen}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Switch Character Sheets */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/55">
                    <Layers className="h-3 w-3 text-[#ff6ae4]" />
                    <span>Switch Gallery Texture</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CHARACTER_TEXTURES.map((item) => {
                      const active = item.id === character.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectCharacter(item)}
                          className={`relative overflow-hidden border transition-colors ${
                            active
                              ? 'border-[#2ee7ff]'
                              : 'border-white/15 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <Image
                            src={item.imagePath}
                            alt={item.name}
                            width={72}
                            height={96}
                            referrerPolicy="no-referrer"
                            className="aspect-[3/4] w-full object-cover"
                          />
                          {active && (
                            <span className="absolute top-1 right-1 bg-[#2ee7ff] text-[#090612] p-0.5">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[#ff4fd8] to-[#2ee7ff] px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-[#080512] hover:brightness-110 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Return to 3D Shower Curtain</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function drawChannelPreview(
  canvas: HTMLCanvasElement,
  scratch: HTMLCanvasElement,
  img: HTMLImageElement,
  character: CharacterTextureAsset,
  channel: TextureChannel,
  glitchBurst: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  if (channel === 'composite') {
    renderCurtainCanvas(canvas, scratch, {
      character,
      image: img,
      glitchEnergy: glitchBurst,
      touchU: 0.52,
      touchV: 0.44,
      time: performance.now() * 0.001,
    });
    return;
  }

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  if (channel === 'albedo') {
    return;
  }

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  if (channel === 'weave') {
    // High-contrast monochrome micro-weave textile preview
    for (let y = 0; y < h; y++) {
      const rowWeave = (y % 6 < 3 ? 18 : -14);
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        const colWeave = (x % 6 < 3 ? 14 : -12);
        const val = Math.max(0, Math.min(255, lum * 0.65 + 70 + rowWeave + colWeave));
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = Math.min(255, val + 12);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (channel === 'normal') {
    // Tangent-space normal map approximation from luminance derivatives + simulated curtain pleat wave
    const src = new Uint8ClampedArray(data);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const lL = src[idx - 4] * 0.3 + src[idx - 3] * 0.59 + src[idx - 2] * 0.11;
        const lR = src[idx + 4] * 0.3 + src[idx + 5] * 0.59 + src[idx + 6] * 0.11;
        const lU = src[idx - w * 4] * 0.3 + src[idx - w * 4 + 1] * 0.59 + src[idx - w * 4 + 2] * 0.11;
        const lD = src[idx + w * 4] * 0.3 + src[idx + w * 4 + 1] * 0.59 + src[idx + w * 4 + 2] * 0.11;
        const pleatDx = Math.cos((x / w) * Math.PI * 14) * 34;
        data[idx] = Math.max(0, Math.min(255, 128 + (lR - lL) * 1.9 + pleatDx));
        data[idx + 1] = Math.max(0, Math.min(255, 128 + (lD - lU) * 1.9));
        data[idx + 2] = 242;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (channel === 'specular') {
    // Neon rim specular isolation
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxC = Math.max(r, g, b);
      const spec = maxC > 135 ? (maxC - 135) * 2.1 : maxC * 0.15;
      data[i] = Math.min(255, spec * (r / Math.max(1, maxC)) * 1.25);
      data[i + 1] = Math.min(255, spec * (g / Math.max(1, maxC)) * 1.05);
      data[i + 2] = Math.min(255, spec * (b / Math.max(1, maxC)) * 1.35);
    }
    ctx.putImageData(imageData, 0, 0);
  }
}
