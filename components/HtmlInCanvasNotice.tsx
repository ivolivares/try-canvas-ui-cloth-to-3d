'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, X } from 'lucide-react';
import type { HtmlInCanvasCapabilities } from '@/lib/htmlInCanvasBridge';

interface HtmlInCanvasNoticeProps {
  capabilities: HtmlInCanvasCapabilities;
  stageMode: 'three-3d' | 'canvasui-cloth';
}

/**
 * Explains Chrome 157+ `html-in-canvas` API availability clearly whenever the
 * user's browser does not yet expose `drawElementImage` / `requestPaint`.
 */
export default function HtmlInCanvasNotice({
  capabilities,
  stageMode,
}: HtmlInCanvasNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || capabilities.reason === 'ssr') return null;

  if (capabilities.supported) {
    return (
      <div
        data-html-in-canvas-status="supported"
        className="pointer-events-auto fixed left-4 top-[84px] sm:left-6 sm:top-[92px] z-30 flex w-[min(320px,calc(100vw-2rem))] items-start gap-2 border border-[#2ee7ff]/45 bg-[#0b0718]/92 px-3 py-2 text-[11px] text-white/90 shadow-lg"
      >
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2ee7ff]" />
        <div className="min-w-0 flex-1 leading-snug">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#2ee7ff]">
            html-in-canvas Active
          </div>
          <div className="mt-0.5 text-white/75">
            {stageMode === 'three-3d'
              ? 'Live DOM painted onto Three.js curtain via drawElementImage'
              : 'Native Canvas UI <Cloth> GPU shader active'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss html-in-canvas status"
          className="shrink-0 text-white/45 hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      data-html-in-canvas-status={capabilities.reason}
      className="pointer-events-auto fixed left-4 top-[84px] sm:left-6 sm:top-[92px] z-30 flex w-[min(316px,calc(100vw-2rem))] items-start gap-2.5 border border-[#ff9d3b]/55 bg-[#12091d]/95 px-3 py-2.5 text-xs text-white/90 shadow-2xl"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ffca6b]" />
      <div className="min-w-0 flex-1 leading-relaxed">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-[#ffca6b]">
            html-in-canvas API Not Detected
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#2ee7ff]">
            {capabilities.reason === 'android-fallback'
              ? 'Android Fallback Active'
              : 'Requires Chrome 157+'}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-white/75">
          Canvas UI&apos;s <code className="font-mono text-[#ff87e5]">&lt;Cloth&gt;</code> and the live HTML-to-Three.js curtain texture use Chrome&apos;s experimental{' '}
          <code className="font-mono text-[#2ee7ff]">html-in-canvas</code> API (Chrome 157+ or{' '}
          <code className="font-mono text-white/90">chrome://flags/#canvas-draw-element</code>).{' '}
          {stageMode === 'three-3d'
            ? 'Running interactive Three.js Canvas 2D fallback so the 3D scene stays playable.'
            : 'Canvas UI <Cloth> is rendering its native HTML fallback.'}{' '}
          <a
            href="https://canvasui.dev/docs/components/cloth"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-[#2ee7ff] underline decoration-[#2ee7ff]/50 underline-offset-2 hover:text-white"
          >
            Canvas UI Docs
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss compatibility notice"
        className="shrink-0 p-1 text-white/50 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
