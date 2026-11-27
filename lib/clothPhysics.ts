/**
 * Canvas UI Cloth — 3D Verlet Physics Adaptation
 *
 * Credits: Based on the Canvas UI Cloth component by David Haz
 * Original component & docs: https://canvasui.dev/docs/components/cloth
 *
 * Adapted from the 2D `html-in-canvas` Canvas UI Cloth simulation into a
 * browser-universal 3D Verlet cloth solver (structural/shear/bend springs,
 * pin-distance tethers, pin modes, float/fold mode, wind gusts, cursor brush,
 * and pointer grab/drag) for the Three.js shower curtain in `components/BathroomScene.tsx`.
 */

export type ClothPinMode = 'top' | 'corners' | 'left' | 'right' | 'none';

export interface TubCollider {
  /** Local Y of the top of the tub rim (cloth nodes below this can hit the tub wall) */
  topY: number;
  /** Local Z of the front face of the tub lip/apron */
  frontZ: number;
  /** Local Z of the inside-tub back face of the tub lip/apron */
  backZ: number;
}

export interface ClothConfig {
  cols: number;
  rows: number;
  width: number;
  height: number;
  pin: ClothPinMode;
  floatMode: boolean;
  gravity: number;
  wind: number;
  stiffness: number;
  damping: number;
  iterations: number;
  dragRadius: number;
  cursorRadius: number;
  cursorForce: number;
  /** Solid bathtub rim/apron collider in local cloth space */
  tubCollider?: TubCollider;
  /** Half-width clearance between left/right shower alcove jambs */
  jambHalfWidth?: number;
  /** Local Z where alcove jambs end toward the room */
  jambFrontZ?: number;
}

export interface ClothNode {
  x: number;
  y: number;
  z: number;
  ox: number;
  oy: number;
  oz: number;
  rx: number;
  ry: number;
  rz: number;
  nx: number;
  ny: number;
  nz: number;
  pinned: boolean;
}

export interface ClothSpring {
  a: number;
  b: number;
  rest: number;
  k: number;
  kind: 'structural' | 'shear' | 'bend';
}

export interface ClothTether {
  node: number;
  pin: number;
  maxDist: number;
}

export interface ClothPointerInput {
  /** Local cloth space coordinates: x in [-width/2, width/2], y in [-height, 0] */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  active: boolean;
  grabbing: boolean;
}

export interface ClothMetrics {
  glitchEnergy: number;
  touchIntensity: number;
  averageDisplacement: number;
  maxDisplacement: number;
  isGrabbed: boolean;
  grabbedCount: number;
  lastTouchU: number;
  lastTouchV: number;
}

interface GrabbedAnchor {
  index: number;
  offX: number;
  offY: number;
  offZ: number;
  weight: number;
}

export const DEFAULT_CLOTH_CONFIG: ClothConfig = {
  cols: 28,
  rows: 34,
  width: 2.15,
  height: 2.65,
  pin: 'top',
  floatMode: false,
  gravity: 4.2,
  wind: 0.42,
  stiffness: 0.86,
  damping: 0.985,
  iterations: 7,
  dragRadius: 0.48,
  cursorRadius: 0.36,
  cursorForce: 0.24,
};

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function isPinnedAt(pin: ClothPinMode, r: number, c: number, rows: number, cols: number): boolean {
  if (pin === 'none') return false;
  if (pin === 'top') {
    // Shower curtain grommet rings spaced along top rail + edges
    return r === 0 && (c === 0 || c === cols || c % 2 === 0);
  }
  if (pin === 'corners') {
    return (r === 0 && (c === 0 || c === cols)) || (r === rows && (c === 0 || c === cols));
  }
  if (pin === 'left') return c === 0;
  if (pin === 'right') return c === cols;
  return false;
}

/**
 * Pure Verlet Cloth Physics Solver adapted from David Haz's Canvas UI Cloth component
 * (https://canvasui.dev/docs/components/cloth) into 3D world-space units for Three.js.
 */
export class ClothSimulation {
  public config: ClothConfig;
  public nodes: ClothNode[] = [];
  public springs: ClothSpring[] = [];
  public tethers: ClothTether[] = [];

  public simTime = 0;
  public glitchEnergy = 0;
  public touchIntensity = 0;
  public lastTouchU = 0.5;
  public lastTouchV = 0.5;

  private grabbed: GrabbedAnchor[] = [];
  private wasGrabbing = false;

  constructor(partialConfig?: Partial<ClothConfig>) {
    this.config = { ...DEFAULT_CLOTH_CONFIG, ...partialConfig };
    this.rebuild();
  }

  public get cols(): number {
    return this.config.cols;
  }

  public get rows(): number {
    return this.config.rows;
  }

  public getRingNodeIndices(): number[] {
    const indices: number[] = [];
    for (let c = 0; c <= this.config.cols; c++) {
      if (isPinnedAt('top', 0, c, this.config.rows, this.config.cols)) {
        indices.push(c);
      }
    }
    return indices;
  }

  public rebuild(): void {
    const { cols, rows, width, height, pin } = this.config;
    const dx = width / cols;
    const dy = height / rows;

    this.nodes = [];
    this.springs = [];
    this.tethers = [];
    this.grabbed = [];
    this.wasGrabbing = false;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const v = r / rows;
        const x = (u - 0.5) * width;
        const y = -v * height;
        // Subtle natural shower-curtain pleat wave at rest
        const pleatZ = Math.sin(u * Math.PI * 7) * 0.035 * (0.25 + 0.75 * v);
        const pinned = isPinnedAt(pin, r, c, rows, cols);

        this.nodes.push({
          x,
          y,
          z: pleatZ,
          ox: x,
          oy: y,
          oz: pleatZ,
          rx: x,
          ry: y,
          rz: pleatZ,
          nx: 0,
          ny: 0,
          nz: 1,
          pinned,
        });
      }
    }

    const idx = (r: number, c: number) => r * (cols + 1) + c;
    const diag = Math.hypot(dx, dy);

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const i = idx(r, c);
        if (c < cols) {
          this.springs.push({ a: i, b: idx(r, c + 1), rest: dx, k: 1.0, kind: 'structural' });
        }
        if (r < rows) {
          this.springs.push({ a: i, b: idx(r + 1, c), rest: dy, k: 1.0, kind: 'structural' });
        }
        if (c < cols && r < rows) {
          this.springs.push({ a: i, b: idx(r + 1, c + 1), rest: diag, k: 0.72, kind: 'shear' });
          this.springs.push({ a: idx(r + 1, c), b: idx(r, c + 1), rest: diag, k: 0.72, kind: 'shear' });
        }
        if (c + 2 <= cols) {
          this.springs.push({ a: i, b: idx(r, c + 2), rest: dx * 2, k: 0.34, kind: 'bend' });
        }
        if (r + 2 <= rows) {
          this.springs.push({ a: i, b: idx(r + 2, c), rest: dy * 2, k: 0.34, kind: 'bend' });
        }
      }
    }

    this.rebuildTethers();
    this.computeNormals();
  }

  private rebuildTethers(): void {
    this.tethers = [];
    const pinIndices: number[] = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].pinned) pinIndices.push(i);
    }
    if (pinIndices.length === 0) return;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.pinned) continue;
      let nearestPin = pinIndices[0];
      let nearestDist = Infinity;
      for (const pIdx of pinIndices) {
        const p = this.nodes[pIdx];
        const d = Math.hypot(n.rx - p.rx, n.ry - p.ry, n.rz - p.rz);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPin = pIdx;
        }
      }
      this.tethers.push({
        node: i,
        pin: nearestPin,
        maxDist: nearestDist * 1.055,
      });
    }
  }

  public setPinMode(pin: ClothPinMode): void {
    if (this.config.pin === pin) return;
    this.config.pin = pin;
    const { rows, cols } = this.config;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const n = this.nodes[r * (cols + 1) + c];
        const nextPinned = isPinnedAt(pin, r, c, rows, cols);
        n.pinned = nextPinned;
        if (nextPinned) {
          n.x = n.rx;
          n.y = n.ry;
          n.z = n.rz;
          n.ox = n.rx;
          n.oy = n.ry;
          n.oz = n.rz;
        }
      }
    }
    this.rebuildTethers();
  }

  public updateConfig(partial: Partial<ClothConfig>): void {
    const pinChanged = partial.pin !== undefined && partial.pin !== this.config.pin;
    const gridChanged =
      (partial.cols !== undefined && partial.cols !== this.config.cols) ||
      (partial.rows !== undefined && partial.rows !== this.config.rows) ||
      (partial.width !== undefined && partial.width !== this.config.width) ||
      (partial.height !== undefined && partial.height !== this.config.height);

    this.config = { ...this.config, ...partial };
    if (gridChanged) {
      this.rebuild();
    } else if (pinChanged) {
      this.setPinMode(this.config.pin);
    }
  }

  public reset(): void {
    this.grabbed = [];
    this.wasGrabbing = false;
    for (const n of this.nodes) {
      n.x = n.rx;
      n.y = n.ry;
      n.z = n.rz;
      n.ox = n.rx;
      n.oy = n.ry;
      n.oz = n.rz;
    }
    this.glitchEnergy = 0;
    this.touchIntensity = 0;
    this.computeNormals();
  }

  /** Applies a dramatic Vice City bathroom steam/vent gust across the shower curtain */
  public applyGust(strength = 1.0, triggerGlitch = true): void {
    const dir = Math.sin(this.simTime * 1.3) >= 0 ? 1 : -1;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.pinned) continue;
      const vFrac = clamp(-n.ry / this.config.height, 0, 1);
      const wave = Math.sin(n.rx * 3.1 + this.simTime * 2.0) * 0.5 + 0.5;
      const impulseZ = (0.045 + 0.055 * wave) * strength * (0.25 + 0.75 * vFrac);
      const impulseX = 0.025 * dir * strength * vFrac;
      n.ox -= impulseX;
      n.oz -= impulseZ;
    }
    if (triggerGlitch) {
      this.triggerGlitch(0.85, 0.5, 0.45);
    }
  }

  public triggerGlitch(amount = 0.8, u = 0.5, v = 0.5): void {
    this.glitchEnergy = clamp(Math.max(this.glitchEnergy, amount), 0, 1.35);
    this.touchIntensity = clamp(Math.max(this.touchIntensity, amount), 0, 1.0);
    this.lastTouchU = clamp(u, 0, 1);
    this.lastTouchV = clamp(v, 0, 1);
  }

  private beginGrab(px: number, py: number, pz: number): void {
    this.grabbed = [];
    const r = this.config.dragRadius;
    const r2 = r * r;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.pinned) continue;
      const dx = n.x - px;
      const dy = n.y - py;
      const dz = n.z - pz;
      const d2 = dx * dx + dy * dy + dz * dz * 0.35;
      if (d2 < r2) {
        const w = Math.cos((Math.sqrt(d2) / r) * (Math.PI * 0.5));
        this.grabbed.push({
          index: i,
          offX: dx,
          offY: dy,
          offZ: dz,
          weight: w * w,
        });
      }
    }

    // Fallback: grab the single closest non-pinned node if pointer is slightly outside radius
    if (this.grabbed.length === 0) {
      let bestIdx = -1;
      let bestD2 = Infinity;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        if (n.pinned) continue;
        const dx = n.x - px;
        const dy = n.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        const n = this.nodes[bestIdx];
        this.grabbed.push({
          index: bestIdx,
          offX: n.x - px,
          offY: n.y - py,
          offZ: n.z - pz,
          weight: 1,
        });
      }
    }
  }

  public step(rawDt: number, pointer?: ClothPointerInput): void {
    const dt = clamp(rawDt, 0.001, 1 / 30);
    this.simTime += dt;

    const {
      gravity,
      wind,
      damping,
      stiffness,
      iterations,
      floatMode,
      cursorRadius,
      cursorForce,
      width,
      height,
    } = this.config;

    const dt2 = dt * dt;
    const t = this.simTime;
    const gust = 0.65 + 0.35 * Math.sin(t * 0.9) * Math.cos(t * 0.43);

    // Handle pointer grab start/release transitions
    const isGrabbing = Boolean(pointer?.active && pointer.grabbing);
    if (isGrabbing && !this.wasGrabbing && pointer) {
      this.beginGrab(pointer.x, pointer.y, pointer.z);
      const u = clamp(pointer.x / width + 0.5, 0, 1);
      const v = clamp(-pointer.y / height, 0, 1);
      this.triggerGlitch(1.0, u, v);
    } else if (!isGrabbing && this.wasGrabbing) {
      this.grabbed = [];
    }
    this.wasGrabbing = isGrabbing;

    // 1. Verlet integration + ambient bathroom airflow + cursor brush
    const effDamping = floatMode ? Math.min(damping, 0.925) : damping;
    const effGravity = floatMode ? 0 : gravity;
    const cr2 = cursorRadius * cursorRadius;

    let frameTouchImpulse = 0;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.pinned) {
        n.x = n.rx;
        n.y = n.ry;
        n.z = n.rz;
        n.ox = n.rx;
        n.oy = n.ry;
        n.oz = n.rz;
        continue;
      }

      const vx = clamp((n.x - n.ox) * effDamping, -0.18, 0.18);
      const vy = clamp((n.y - n.oy) * effDamping, -0.18, 0.18);
      const vz = clamp((n.z - n.oz) * effDamping, -0.18, 0.18);

      n.ox = n.x;
      n.oy = n.y;
      n.oz = n.z;

      let ax = 0;
      let ay = -effGravity;
      let az = 0;

      if (!floatMode && wind > 0.001) {
        const phase1 = n.x * 2.1 + n.y * 1.4 - t * 2.6;
        const phase2 = n.x * 4.3 - n.y * 2.7 + t * 1.7;
        const n1 = Math.sin(phase1) * Math.cos(phase2 * 0.5);
        const n2 = Math.cos(phase2);
        const vFactor = clamp(-n.ry / height, 0.12, 1);
        az += wind * gust * (0.45 + 0.55 * n1) * 2.8 * vFactor;
        ax += wind * gust * n2 * 0.65 * vFactor;
      }

      if (pointer?.active && !isGrabbing) {
        const dx = n.x - pointer.x;
        const dy = n.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < cr2) {
          const dist = Math.sqrt(d2);
          const falloff = 1 - dist / cursorRadius;
          const f2 = falloff * falloff;
          const speed = Math.hypot(pointer.vx, pointer.vy);
          const push = cursorForce * f2 * (0.55 + Math.min(speed * 2.2, 2.2));
          ax += pointer.vx * f2 * 3.2;
          ay += pointer.vy * f2 * 3.2;
          az -= push * 18.0; // Push curtain smoothly inward into the shower space
          frameTouchImpulse = Math.max(frameTouchImpulse, f2 * (0.35 + Math.min(speed * 1.4, 0.65)));
        }
      }

      n.x += vx + ax * dt2;
      n.y += vy + ay * dt2;
      n.z += vz + az * dt2;
    }

    if (frameTouchImpulse > 0.05 && pointer) {
      const u = clamp(pointer.x / width + 0.5, 0, 1);
      const v = clamp(-pointer.y / height, 0, 1);
      this.glitchEnergy = clamp(Math.max(this.glitchEnergy, frameTouchImpulse * 0.95), 0, 1.35);
      this.touchIntensity = clamp(Math.max(this.touchIntensity, frameTouchImpulse), 0, 1.0);
      this.lastTouchU = u;
      this.lastTouchV = v;
    }

    // 2. Apply pointer grab dragging with gentle Z lift toward user
    if (isGrabbing && pointer && this.grabbed.length > 0) {
      const u = clamp(pointer.x / width + 0.5, 0, 1);
      const v = clamp(-pointer.y / height, 0, 1);
      const speed = Math.hypot(pointer.vx, pointer.vy);
      this.glitchEnergy = clamp(Math.max(this.glitchEnergy, 0.72 + Math.min(speed * 0.45, 0.5)), 0, 1.35);
      this.touchIntensity = 1.0;
      this.lastTouchU = u;
      this.lastTouchV = v;

      for (const anchor of this.grabbed) {
        const n = this.nodes[anchor.index];
        if (n.pinned) continue;
        const tx = pointer.x + anchor.offX * 0.72;
        const ty = pointer.y + anchor.offY * 0.72;
        const tz = pointer.z + 0.16 * anchor.weight + anchor.offZ * 0.45;
        const blend = clamp(anchor.weight * 0.68, 0.08, 0.82);
        n.x += (tx - n.x) * blend;
        n.y += (ty - n.y) * blend;
        n.z += (tz - n.z) * blend;
      }
    }

    // 3. Constraint relaxation (springs + tethers + tub/rod containment)
    const bendScale = 0.25 + stiffness * 0.75;
    for (let iter = 0; iter < iterations; iter++) {
      for (let s = 0; s < this.springs.length; s++) {
        const sp = this.springs[s];
        const a = this.nodes[sp.a];
        const b = this.nodes[sp.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 1e-6) continue;

        const effK = sp.kind === 'bend' ? sp.k * bendScale : sp.k * (0.65 + stiffness * 0.35);
        const diff = ((dist - sp.rest) / dist) * effK;

        if (!a.pinned && !b.pinned) {
          const half = diff * 0.5;
          a.x += dx * half;
          a.y += dy * half;
          a.z += dz * half;
          b.x -= dx * half;
          b.y -= dy * half;
          b.z -= dz * half;
        } else if (a.pinned && !b.pinned) {
          b.x -= dx * diff;
          b.y -= dy * diff;
          b.z -= dz * diff;
        } else if (!a.pinned && b.pinned) {
          a.x += dx * diff;
          a.y += dy * diff;
          a.z += dz * diff;
        }
      }

      if (!floatMode) {
        for (let ti = 0; ti < this.tethers.length; ti++) {
          const teth = this.tethers[ti];
          const n = this.nodes[teth.node];
          const p = this.nodes[teth.pin];
          const dx = n.x - p.x;
          const dy = n.y - p.y;
          const dz = n.z - p.z;
          const dist = Math.hypot(dx, dy, dz);
          if (dist > teth.maxDist && dist > 1e-6) {
            const scale = teth.maxDist / dist;
            n.x = p.x + dx * scale;
            n.y = p.y + dy * scale;
            n.z = p.z + dz * scale;
          }
        }
      }

      // Solid collision bounds: never clip through bathtub rim/apron, alcove jambs, back wall, or floor
      const tub = this.config.tubCollider;
      const jambHalfW = this.config.jambHalfWidth;
      const jambFrontZ = this.config.jambFrontZ ?? 0.08;

      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        if (n.pinned) continue;

        if (n.z < -0.68) n.z = -0.68;
        if (n.z > 0.78) n.z = 0.78;
        if (n.y < -height - 0.18) n.y = -height - 0.18;
        if (n.y > 0.12) n.y = 0.12;

        // Prevent side edges from penetrating alcove marble jambs or vertical neon tubes
        if (jambHalfW !== undefined && n.z < jambFrontZ) {
          if (n.x < -jambHalfW) n.x = -jambHalfW;
          if (n.x > jambHalfW) n.x = jambHalfW;
        }

        // Solid bathtub lip & apron AABB collision (minimum penetration push-out)
        if (tub && n.y < tub.topY && n.z < tub.frontZ && n.z > tub.backZ) {
          const penFront = tub.frontZ - n.z;
          const penTop = tub.topY - n.y;
          const penBack = n.z - tub.backZ;

          if (penFront <= penTop && penFront <= penBack) {
            n.z = tub.frontZ;
            if (n.oz < tub.frontZ) n.oz = tub.frontZ;
          } else if (penTop <= penBack) {
            n.y = tub.topY;
            if (n.oy < tub.topY) n.oy = tub.topY;
          } else {
            n.z = tub.backZ;
            if (n.oz > tub.backZ) n.oz = tub.backZ;
          }
        }
      }
    }

    // 4. Decay glitch & touch reactivity smoothly
    const glitchDecay = isGrabbing ? 0.35 : 1.15;
    const touchDecay = isGrabbing ? 0.25 : 1.65;
    this.glitchEnergy = Math.max(0, this.glitchEnergy - dt * glitchDecay);
    this.touchIntensity = Math.max(0, this.touchIntensity - dt * touchDecay);

    this.computeNormals();
  }

  public computeNormals(): void {
    const { cols, rows } = this.config;
    const stride = cols + 1;

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const i = r * stride + c;
        const left = this.nodes[r * stride + Math.max(0, c - 1)];
        const right = this.nodes[r * stride + Math.min(cols, c + 1)];
        const up = this.nodes[Math.max(0, r - 1) * stride + c];
        const down = this.nodes[Math.min(rows, r + 1) * stride + c];

        const tx = right.x - left.x;
        const ty = right.y - left.y;
        const tz = right.z - left.z;

        const bx = up.x - down.x;
        const by = up.y - down.y;
        const bz = up.z - down.z;

        // Cross(T, B) points toward +Z (facing the viewer in bathroom)
        let nx = ty * bz - tz * by;
        let ny = tz * bx - tx * bz;
        let nz = tx * by - ty * bx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;

        const n = this.nodes[i];
        n.nx = nx;
        n.ny = ny;
        n.nz = nz;
      }
    }
  }

  public writeToBufferArrays(positions: Float32Array, normals: Float32Array): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const o = i * 3;
      positions[o] = n.x;
      positions[o + 1] = n.y;
      positions[o + 2] = n.z;
      normals[o] = n.nx;
      normals[o + 1] = n.ny;
      normals[o + 2] = n.nz;
    }
  }

  public getMetrics(): ClothMetrics {
    let sumDisp = 0;
    let maxDisp = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const d = Math.hypot(n.x - n.rx, n.y - n.ry, n.z - n.rz);
      sumDisp += d;
      if (d > maxDisp) maxDisp = d;
    }
    return {
      glitchEnergy: this.glitchEnergy,
      touchIntensity: this.touchIntensity,
      averageDisplacement: this.nodes.length > 0 ? sumDisp / this.nodes.length : 0,
      maxDisplacement: maxDisp,
      isGrabbed: this.wasGrabbing && this.grabbed.length > 0,
      grabbedCount: this.grabbed.length,
      lastTouchU: this.lastTouchU,
      lastTouchV: this.lastTouchV,
    };
  }
}
