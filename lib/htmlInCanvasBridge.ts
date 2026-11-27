/**
 * html-in-canvas API Bridge for Three.js & Canvas UI
 *
 * Implements the Chrome 157+ html-in-canvas specification (`layoutsubtree` /
 * `content="drawable"`, `ctx.drawElementImage`, `canvas.requestPaint`, `canvas.onpaint`)
 * as documented by David Haz in Canvas UI: https://canvasui.dev/docs/components/cloth
 */

export interface HtmlInCanvasCapabilities {
  supported: boolean;
  reason: 'supported' | 'ssr' | 'android-fallback' | 'api-unavailable';
  hasDrawElementImage: boolean;
  hasRequestPaint: boolean;
  isAndroidBlocked: boolean;
}

export interface HtmlInCanvasProbeInput {
  hasDocument: boolean;
  userAgent: string;
  platform?: string;
  hasDrawElementImage: boolean;
  hasRequestPaint: boolean;
}

export type PaintableHtmlCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
  updateElementGeometry?: (
    element: Element,
    options: { canvasTransform: DOMMatrix }
  ) => void;
};

export type DrawElementContext2D = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => DOMMatrix | void;
};

/**
 * Pure capability evaluator so html-in-canvas feature detection can be unit-tested cleanly.
 */
export function evaluateHtmlInCanvasSupport(
  probe: HtmlInCanvasProbeInput
): HtmlInCanvasCapabilities {
  if (!probe.hasDocument) {
    return {
      supported: false,
      reason: 'ssr',
      hasDrawElementImage: false,
      hasRequestPaint: false,
      isAndroidBlocked: false,
    };
  }

  const isAndroidBlocked =
    probe.platform === 'Android' || /Android/i.test(probe.userAgent);

  if (isAndroidBlocked) {
    return {
      supported: false,
      reason: 'android-fallback',
      hasDrawElementImage: probe.hasDrawElementImage,
      hasRequestPaint: probe.hasRequestPaint,
      isAndroidBlocked: true,
    };
  }

  const supported = probe.hasDrawElementImage && probe.hasRequestPaint;
  return {
    supported,
    reason: supported ? 'supported' : 'api-unavailable',
    hasDrawElementImage: probe.hasDrawElementImage,
    hasRequestPaint: probe.hasRequestPaint,
    isAndroidBlocked: false,
  };
}

/**
 * Runtime browser probe matching Canvas UI's `supportsHtmlInCanvas()` contract.
 */
export function detectHtmlInCanvasSupport(): HtmlInCanvasCapabilities {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') {
    return evaluateHtmlInCanvasSupport({
      hasDocument: false,
      userAgent: '',
      hasDrawElementImage: false,
      hasRequestPaint: false,
    });
  }

  const probe = document.createElement('canvas') as PaintableHtmlCanvas;
  const ctx = probe.getContext('2d') as DrawElementContext2D | null;
  const navWithData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  return evaluateHtmlInCanvasSupport({
    hasDocument: true,
    userAgent: navigator.userAgent || '',
    platform: navWithData.userAgentData?.platform,
    hasDrawElementImage: Boolean(ctx && typeof ctx.drawElementImage === 'function'),
    hasRequestPaint: typeof probe.requestPaint === 'function',
  });
}

/**
 * Configures a `<canvas>` and its child DOM root for both the original `layoutsubtree`
 * and newer `content="drawable"` html-in-canvas attribute variants.
 */
export function prepareHtmlInCanvasSource(
  source: HTMLCanvasElement,
  content: HTMLElement
): void {
  if ('content' in source) {
    source.setAttribute('content', 'drawable');
    content.setAttribute('drawable', '');
  } else {
    source.setAttribute('layoutsubtree', '');
  }
}

/**
 * Paints a live HTML subtree into a 2D canvas using Chrome's `drawElementImage` API
 * and syncs element geometry transforms when available.
 */
export function paintHtmlInCanvasElement(
  source: HTMLCanvasElement,
  content: HTMLElement
): boolean {
  const ctx = source.getContext('2d') as DrawElementContext2D | null;
  if (!ctx || typeof ctx.drawElementImage !== 'function') return false;
  if (!source.contains(content)) return false;

  ctx.clearRect(0, 0, source.width, source.height);
  const transform = ctx.drawElementImage(content, 0, 0);
  const paintable = source as PaintableHtmlCanvas;
  if (transform && typeof paintable.updateElementGeometry === 'function') {
    paintable.updateElementGeometry(content, { canvasTransform: transform });
  }
  return true;
}

export function requestHtmlInCanvasPaint(source: HTMLCanvasElement | null): void {
  if (!source) return;
  const paintable = source as PaintableHtmlCanvas;
  if (typeof paintable.requestPaint === 'function') {
    paintable.requestPaint();
  }
}
