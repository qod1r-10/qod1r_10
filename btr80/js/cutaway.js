// "Kesim" rejimi: korpus bo'ylama tekislik bilan qirqiladi, kesilgan joy qizil rangda ko'rinadi.
import * as THREE from 'three';

const CUT_PARTS = new Set(['hull', 'hatch_front', 'hatch_roof', 'side_doors', 'vision', 'turret', 'lights', 'radiator', 'trimvane', 'sight', 'smoke']);
const OPEN = -0.02; // kesim tekisligining oxirgi holati (x, metr): chap yarmi olib tashlanadi
const START = 1.7;

export function createCutaway({ renderer, meshes }) {
  renderer.localClippingEnabled = true;
  const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), START);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xc0211b, roughness: 0.55, metalness: 0.1, side: THREE.BackSide,
    clippingPlanes: [plane], transparent: true,
  });
  const targets = meshes.filter((m) => CUT_PARTS.has(m.userData.part) && !m.userData.ghost && m.geometry.attributes.uv);
  const caps = targets.map((m) => {
    const c = new THREE.Mesh(m.geometry, capMat);
    c.visible = false;
    c.raycast = () => {};
    m.add(c);
    return { m, c };
  });
  const S = { on: false, k: START };

  function set(on) {
    S.on = on;
    for (const { m, c } of caps) {
      m.material.clippingPlanes = on ? [plane] : null;
      m.material.clipShadows = on;
      m.material.needsUpdate = true;
      c.visible = on;
    }
    if (on) S.k = START;
  }

  function update(dt, reduceMotion) {
    if (!S.on) return;
    const target = OPEN;
    S.k = reduceMotion ? target : S.k + (target - S.k) * Math.min(1, dt * 2.2);
    plane.constant = S.k;
    for (const { m, c } of caps) {
      c.visible = m.visible;
      capMat.opacity = 1;
      if (m.material.opacity < 0.999) c.visible = false;
    }
  }

  return { state: S, set, update };
}
