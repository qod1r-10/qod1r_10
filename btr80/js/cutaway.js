// "Kesim" rejimi: korpus bo'ylama tekislik bilan qirqiladi. Faqat tekislik kesib o'tgan joy (zirh listining
// kesimi) qizil rangda ko'rsatiladi. Korpusning ichki devorlari haqiqiy BTR dagidek och kulrang bo'yoqda,
// agregat korpuslarining ichi esa o'z rangida (biroz to'qroq) ko'rinadi.
import * as THREE from 'three';

const CUT_PARTS = new Set(['hull', 'hatch_front', 'hatch_roof', 'side_doors', 'vision', 'turret', 'lights', 'radiator', 'trimvane', 'sight', 'smoke']);
const ARMOR = new Set(['hull', 'hatch_front', 'hatch_roof', 'side_doors', 'turret', 'trimvane']);
const OPEN = -0.02; // kesim tekisligining oxirgi holati (x, metr)
const START = 1.7;
// Kesim qalinligi, metr: zirh listlari uchun ko'rinadigan bo'lishi uchun biroz kattalashtirilgan
const THICK_ARMOR = 0.03, THICK_PART = 0.012;

const INTERIOR = 0xb9beb5; // BTR ichki devorlarining och kulrang bo'yog'i

export function createCutaway({ renderer, meshes }) {
  renderer.localClippingEnabled = true;
  const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), START);
  const sectionMat = new THREE.MeshStandardMaterial({
    color: 0xb8281f, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const interiorMat = new THREE.MeshStandardMaterial({ color: INTERIOR, roughness: 0.85, metalness: 0, side: THREE.BackSide, clippingPlanes: [plane] });

  const targets = meshes.filter((m) => (CUT_PARTS.has(m.userData.part) || m.userData.casing) && !m.userData.ghost && m.geometry.attributes.position);
  const items = targets.map((m) => {
    const armor = ARMOR.has(m.userData.part);
    // ichki yuza: zirh uchun umumiy och kulrang, agregatlar uchun o'z rangining to'qroq nusxasi
    let inner = interiorMat;
    if (!armor) {
      inner = new THREE.MeshStandardMaterial({
        color: (m.material.color || new THREE.Color(0x888888)).clone().multiplyScalar(0.62),
        roughness: 0.8, metalness: 0.1, side: THREE.BackSide, clippingPlanes: [plane],
      });
    }
    const c = new THREE.Mesh(m.geometry, inner);
    c.visible = false;
    c.raycast = () => {};
    m.add(c);
    const s = new THREE.Mesh(new THREE.BufferGeometry(), sectionMat);
    s.visible = false;
    s.raycast = () => {};
    s.frustumCulled = false;
    m.add(s);
    return { m, c, s, thick: armor ? THICK_ARMOR : THICK_PART, key: null };
  });
  const S = { on: false, k: START };

  function set(on) {
    S.on = on;
    for (const it of items) {
      it.m.material.clippingPlanes = on ? [plane] : null;
      it.m.material.clipShadows = on;
      it.m.material.needsUpdate = true;
      it.c.visible = on;
      it.s.visible = false;
      it.key = null;
    }
    if (on) S.k = START;
  }

  function update(dt, reduceMotion) {
    if (!S.on) return;
    S.k = reduceMotion ? OPEN : S.k + (OPEN - S.k) * Math.min(1, dt * 2.2);
    if (Math.abs(S.k - OPEN) < 1e-4) S.k = OPEN;
    plane.constant = S.k;
    for (const it of items) {
      const shown = it.m.visible && it.m.material.opacity >= 0.999;
      it.c.visible = shown;
      it.s.visible = shown;
      if (!shown) continue;
      // tekislik yoki detal joyi o'zgargandagina kesim qayta hisoblanadi
      const e = it.m.matrixWorld.elements;
      const key = S.k.toFixed(4) + ',' + e[12].toFixed(4) + ',' + e[13].toFixed(4) + ',' + e[14].toFixed(4) + ',' + e[0].toFixed(4) + ',' + e[2].toFixed(4);
      if (key !== it.key) { it.key = key; buildSection(it); }
    }
  }

  const inv = new THREE.Matrix4(), lp = new THREE.Plane();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3(), vn = new THREE.Vector3(), tmp = new THREE.Vector3();
  const P = [new THREE.Vector3(), new THREE.Vector3()], dir = new THREE.Vector3();

  // Detal uchburchaklarini kesim tekisligi bilan kesishtirib, har bir kesishish chizig'idan ichkariga
  // qarab "thick" kenglikdagi qizil tasma yasaladi — bu zirh listining kesimi.
  function buildSection(it) {
    const { m, s } = it;
    inv.copy(m.matrixWorld).invert();
    lp.copy(plane).applyMatrix4(inv);
    const scale = m.matrixWorld.getMaxScaleOnAxis() || 1;
    const t = it.thick / scale, eps = 0.0015 / scale;
    const N = lp.normal;
    const pos = m.geometry.attributes.position, nor = m.geometry.attributes.normal, idx = m.geometry.index;
    const count = idx ? idx.count : pos.count;
    const out = [];
    const d = [0, 0, 0], ids = [0, 0, 0], V = [a, b, c];
    for (let i = 0; i < count; i += 3) {
      for (let j = 0; j < 3; j++) {
        ids[j] = idx ? idx.getX(i + j) : i + j;
        V[j].fromBufferAttribute(pos, ids[j]);
        d[j] = lp.distanceToPoint(V[j]);
        if (d[j] === 0) d[j] = 1e-9;
      }
      if ((d[0] > 0 && d[1] > 0 && d[2] > 0) || (d[0] < 0 && d[1] < 0 && d[2] < 0)) continue;
      let k = 0;
      for (let j = 0; j < 3 && k < 2; j++) {
        const j2 = (j + 1) % 3;
        if ((d[j] > 0) !== (d[j2] > 0)) {
          const f = d[j] / (d[j] - d[j2]);
          P[k++].copy(V[j]).lerp(V[j2], f);
        }
      }
      if (k < 2) continue;
      n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
      if (nor) {
        vn.set(0, 0, 0);
        for (let j = 0; j < 3; j++) vn.add(tmp.fromBufferAttribute(nor, ids[j]));
        if (n.dot(vn) < 0) n.negate();
      }
      // ichkariga yo'nalish: sirt normalining tekislikdagi proyeksiyasiga teskari
      dir.copy(n).addScaledVector(N, -n.dot(N));
      const len = dir.length();
      if (len < 1e-8) continue;
      dir.multiplyScalar(-t / len);
      const p1 = P[0].clone().addScaledVector(N, eps), p2 = P[1].clone().addScaledVector(N, eps);
      const q1 = p1.clone().add(dir), q2 = p2.clone().add(dir);
      out.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, q2.x, q2.y, q2.z, p1.x, p1.y, p1.z, q2.x, q2.y, q2.z, q1.x, q1.y, q1.z);
    }
    const g = s.geometry;
    g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    const nn = new Float32Array(out.length);
    for (let i = 0; i < nn.length; i += 3) { nn[i] = -N.x; nn[i + 1] = -N.y; nn[i + 2] = -N.z; }
    g.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
    g.computeBoundingSphere();
  }

  return { state: S, set, update };
}
