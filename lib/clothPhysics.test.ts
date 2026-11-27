import test from 'node:test';
import assert from 'node:assert/strict';
import { ClothSimulation } from './clothPhysics.ts';

test('initializes cloth grid with top grommet pins and finite coordinates', () => {
  const sim = new ClothSimulation({ cols: 12, rows: 14, pin: 'top' });
  assert.equal(sim.nodes.length, 13 * 15);
  const ringIndices = sim.getRingNodeIndices();
  assert.ok(ringIndices.length >= 6, 'Expected multiple grommet pin rings along top edge');
  for (const idx of ringIndices) {
    assert.equal(sim.nodes[idx].pinned, true);
  }
  for (const node of sim.nodes) {
    assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y) && Number.isFinite(node.z));
    assert.ok(Number.isFinite(node.nx) && Number.isFinite(node.ny) && Number.isFinite(node.nz));
  }
});

test('pinned top nodes stay anchored while free lower nodes sway under wind', () => {
  const sim = new ClothSimulation({ cols: 10, rows: 12, pin: 'top', wind: 0.9, gravity: 4.0 });
  const topLeftRest = { x: sim.nodes[0].rx, y: sim.nodes[0].ry, z: sim.nodes[0].rz };
  const bottomCenterIndex = 12 * 11 + 5;
  const bottomInitialZ = sim.nodes[bottomCenterIndex].z;

  for (let i = 0; i < 40; i++) {
    sim.step(1 / 60);
  }

  assert.equal(sim.nodes[0].x, topLeftRest.x);
  assert.equal(sim.nodes[0].y, topLeftRest.y);
  assert.equal(sim.nodes[0].z, topLeftRest.z);
  assert.notEqual(sim.nodes[bottomCenterIndex].z, bottomInitialZ);
  assert.ok(sim.getMetrics().maxDisplacement > 0.01);
});

test('grabbing and dragging cloth triggers glitch energy and moves fabric toward pointer', () => {
  const sim = new ClothSimulation({ cols: 10, rows: 12, pin: 'top', wind: 0 });
  assert.equal(sim.glitchEnergy, 0);

  sim.step(1 / 60, {
    x: 0.1,
    y: -1.4,
    z: 0.25,
    vx: 0.6,
    vy: 0.2,
    vz: 0.1,
    active: true,
    grabbing: true,
  });

  for (let i = 0; i < 12; i++) {
    sim.step(1 / 60, {
      x: 0.55,
      y: -1.1,
      z: 0.35,
      vx: 0.8,
      vy: 0.3,
      vz: 0.1,
      active: true,
      grabbing: true,
    });
  }

  const activeMetrics = sim.getMetrics();
  assert.equal(activeMetrics.isGrabbed, true);
  assert.ok(activeMetrics.grabbedCount > 0);
  assert.ok(activeMetrics.glitchEnergy > 0.65, `Expected high glitch energy, got ${activeMetrics.glitchEnergy}`);
  assert.ok(activeMetrics.maxDisplacement > 0.15, `Expected visible fabric pull, got ${activeMetrics.maxDisplacement}`);

  // Releasing pointer allows glitch energy to decay cleanly back toward 0
  for (let i = 0; i < 90; i++) {
    sim.step(1 / 60, {
      x: 0.55,
      y: -1.1,
      z: 0.35,
      vx: 0,
      vy: 0,
      vz: 0,
      active: false,
      grabbing: false,
    });
  }

  const cooledMetrics = sim.getMetrics();
  assert.equal(cooledMetrics.isGrabbed, false);
  assert.ok(cooledMetrics.glitchEnergy < activeMetrics.glitchEnergy);
  assert.equal(cooledMetrics.glitchEnergy, 0);
});

test('floatMode holds sculpted creases without gravity sag and reset restores rest mesh', () => {
  const sim = new ClothSimulation({ cols: 8, rows: 10, pin: 'none', floatMode: true, wind: 0 });
  sim.applyGust(1.4, true);
  for (let i = 0; i < 20; i++) {
    sim.step(1 / 60);
  }
  assert.ok(sim.getMetrics().maxDisplacement > 0.04);

  sim.reset();
  assert.equal(sim.getMetrics().maxDisplacement, 0);
  assert.equal(sim.glitchEnergy, 0);
});

test('writeToBufferArrays populates exact vertex positions and unit normals without NaN', () => {
  const sim = new ClothSimulation({ cols: 8, rows: 8 });
  sim.applyGust(1.0);
  for (let i = 0; i < 15; i++) {
    sim.step(1 / 60);
  }

  const count = sim.nodes.length;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  sim.writeToBufferArrays(positions, normals);

  for (let i = 0; i < count; i++) {
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];
    const mag = Math.hypot(nx, ny, nz);
    assert.ok(Number.isFinite(positions[i * 3]));
    assert.ok(Math.abs(mag - 1) < 0.01, `Expected unit normal magnitude ~1, got ${mag}`);
  }
});

test('cloth nodes never penetrate bathtub collider or alcove side jambs under gust and drag', () => {
  const tub = { topY: -2.22, frontZ: -0.11, backZ: -0.39 };
  const jambHalfWidth = 1.09;
  const jambFrontZ = 0.08;
  const sim = new ClothSimulation({
    cols: 14,
    rows: 18,
    width: 2.08,
    height: 2.4,
    pin: 'top',
    wind: 1.2,
    tubCollider: tub,
    jambHalfWidth,
    jambFrontZ,
  });

  sim.applyGust(1.5, true);
  // Drag bottom area directly toward the tub wall to stress-test collision resolution
  for (let i = 0; i < 45; i++) {
    sim.step(1 / 60, {
      x: 0.0,
      y: -2.32,
      z: -0.22,
      vx: 0,
      vy: -0.2,
      vz: -0.8,
      active: i < 20,
      grabbing: i < 20,
    });
    for (const n of sim.nodes) {
      const insideTub = n.y < tub.topY - 1e-4 && n.z < tub.frontZ - 1e-4 && n.z > tub.backZ + 1e-4;
      assert.equal(insideTub, false, `Node penetrated tub volume at (${n.x}, ${n.y}, ${n.z})`);
      if (n.z < jambFrontZ - 1e-4) {
        assert.ok(
          Math.abs(n.x) <= jambHalfWidth + 1e-4,
          `Node penetrated alcove jamb at x=${n.x}, z=${n.z}`
        );
      }
    }
  }
});
