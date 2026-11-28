// Haqiqiy V8 dvigatel ichki qismlari (models/v8.glb + models/v8meta.json).
// Model asosi: "V8 engine Internals" (Sketchfab, CC BY-NC 4.0) — qismlarga ajratilgan va harakat uchun tayyorlangan.
// Krivoship-shatun mexanizmi va gaz taqsimlash mexanizmi haqiqiy kinematika bo'yicha harakatlanadi.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { kamazCasing } from './assets.js';

export async function loadV8(fetchBuffer) {
  const [buf, meta] = await Promise.all([
    fetchBuffer('models/v8.glb'),
    fetch('models/v8meta.json').then((r) => r.json()),
  ]);
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  return { scene: gltf.scene, meta };
}

const MAT = {
  crank: { color: 0xb9bdc1, metalness: 0.9, roughness: 0.28 },
  piston: { color: 0xd3d6d9, metalness: 0.65, roughness: 0.32 },
  rod: { color: 0x9aa1a8, metalness: 0.85, roughness: 0.3 },
  cam: { color: 0xc4c7ca, metalness: 0.9, roughness: 0.25 },
  valve: { color: 0xe1e3e5, metalness: 0.9, roughness: 0.22 },
  push: { color: 0xa9aeb3, metalness: 0.85, roughness: 0.3 },
  vtstatic: { color: 0x878d93, metalness: 0.8, roughness: 0.35 },
  engstatic: { color: 0x6d7378, metalness: 0.6, roughness: 0.45 },
};
const PART = { crank: 'crank', piston: 'crank', rod: 'crank', cam: 'valvetrain', valve: 'valvetrain', push: 'valvetrain', vtstatic: 'valvetrain', engstatic: 'engine' };

// Model koordinatalari -> dvigatel koordinatalari (dvigatel o'qi +x, tirsakli val o'qi y = -0.16 da)
const K = 0.0075;

export function buildV8(asset, kamaz) {
  const { scene, meta } = asset;
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(K);
  inner.rotation.y = -Math.PI / 2;
  const ax = meta.crankAxis, zMid = 27;
  inner.position.set(zMid * K, -0.16 - ax[1] * K, -ax[0] * K);
  root.add(inner);

  const byName = {};
  [...scene.children].forEach((o) => {
    if (!o.isMesh) return;
    const kind = o.name.split('_')[0];
    o.geometry = toCreasedNormals(o.geometry, Math.PI / 6);
    o.material = new THREE.MeshStandardMaterial(MAT[kind] || MAT.engstatic);
    o.userData.part = PART[kind] || 'engine';
    o.castShadow = true;
    o.position.set(0, 0, 0);
    inner.add(o);
    byName[o.name] = o;
  });

  const { R, L } = meta;
  const sOf = (psi) => R * Math.cos(psi) + Math.sqrt(L * L - R * R * Math.sin(psi) ** 2);
  const cAx = new THREE.Vector2(...meta.crankAxis), camAx = new THREE.Vector2(...meta.camAxis);
  const turn = (mesh, axis, a) => {
    mesh.rotation.z = a;
    const c = Math.cos(a), s = Math.sin(a);
    mesh.position.set(axis.x - (c * axis.x - s * axis.y), axis.y - (s * axis.x + c * axis.y), 0);
  };
  const cyl = meta.cyl.map((c, i) => ({ ...c, piston: byName['piston_' + i], rod: byName['rod_' + i] }));
  const valves = meta.valves.map((v, i) => ({ ...v, mesh: byName['valve_' + i], lift: 0 }));
  const pushes = meta.pushes.map((p, i) => ({ ...p, mesh: byName['push_' + i] }));
  const LIFT = 1.4;

  function update(theta) {
    if (byName.crank) turn(byName.crank, cAx, theta);
    if (byName.cam) turn(byName.cam, camAx, theta / 2);
    cyl.forEach((c, i) => {
      const [dx, dy] = c.d;
      const s = sOf(c.psi0 + theta);
      if (c.piston) c.piston.position.set(dx * (s - c.s0), dy * (s - c.s0), 0);
      if (c.rod) {
        const a0 = c.pin0, a1 = c.pin0 + theta;
        const P0x = cAx.x + R * Math.cos(a0), P0y = cAx.y + R * Math.sin(a0);
        const P1x = cAx.x + R * Math.cos(a1), P1y = cAx.y + R * Math.sin(a1);
        const Q0x = cAx.x + c.s0 * dx, Q0y = cAx.y + c.s0 * dy;
        const Q1x = cAx.x + s * dx, Q1y = cAx.y + s * dy;
        const da = Math.atan2(Q1y - P1y, Q1x - P1x) - Math.atan2(Q0y - P0y, Q0x - P0x);
        const co = Math.cos(da), si = Math.sin(da);
        c.rod.rotation.z = da;
        c.rod.position.set(P1x - (co * P0x - si * P0y), P1y - (si * P0x + co * P0y), 0);
      }
    });
    // 4 taktli sikl: kiritish klapani 0…180°, chiqarish klapani 540…720° (tirsakli val bo'yicha)
    const FOUR = Math.PI * 4;
    valves.forEach((v) => {
      const c = cyl[v.cyl];
      const cyc = (((c.psi0 + theta + (v.cyl % 2) * Math.PI * 2) % FOUR) + FOUR) % FOUR;
      let lift = 0;
      if (!v.ex && cyc < Math.PI) lift = Math.sin(cyc);
      if (v.ex && cyc > Math.PI * 3) lift = Math.sin(cyc - Math.PI * 3);
      v.lift = lift * LIFT;
      if (v.mesh) v.mesh.position.set(-c.d[0] * v.lift, -c.d[1] * v.lift, 0);
    });
    pushes.forEach((p) => {
      const l = valves[p.valve] ? valves[p.valve].lift * 0.6 : 0;
      if (p.mesh) p.mesh.position.set(p.axis[0] * l, p.axis[1] * l, p.axis[2] * l);
    });
  }

  // Korpus: silindrlar bloki, kallaklar, karter (Kesim rejimida qirqiladi)
  const castM = (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.55 });
  const AXL = new THREE.Vector3(0, -0.16, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const banks = [cyl.find((c) => c.d[0] > 0), cyl.find((c) => c.d[0] < 0)].filter(Boolean);
  const casing = [];
  banks.forEach((c) => {
    const d = new THREE.Vector3(0, c.d[1], c.d[0]); // model (x,y) -> dvigatel (z,y)
    const q = new THREE.Quaternion().setFromUnitVectors(Y, d);
    const mk = (w, h, t, s, col) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), castM(col));
      m.quaternion.copy(q); m.position.copy(AXL).addScaledVector(d, s);
      casing.push(m); return m;
    };
    mk(0.86, 0.32, 0.27, 0.23, 0x6f7377);  // silindrlar bloki
    mk(0.9, 0.2, 0.32, 0.47, 0x5a5e62);    // silindrlar kallagi
    mk(0.86, 0.04, 0.26, 0.585, 0x8f2f22); // klapan qopqog'i
  });
  const crankcase = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.36, 0.56), castM(0x6f7377));
  crankcase.position.set(0, -0.2, 0); casing.push(crankcase);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.5), castM(0x5a5e62));
  front.position.set(-0.53, -0.1, 0); casing.push(front);
  if (kamaz) root.add(kamazCasing(kamaz)); // haqiqiy KamAZ-740 korpusi

  else casing.forEach((m) => { m.userData.casing = true; m.userData.part = 'engine'; m.castShadow = true; root.add(m); });
  // Silindr ichidagi gaz ("Qo'shimcha" namoyishida): porshen tepasidan kallakkacha bo'lgan hajm,
  // rangi takt bo'yicha o'zgaradi — kiritilgan havo, siqilgan havo, yonish, ishlatilgan gazlar.
  const gas = new THREE.Group(); gas.name = 'v8gas'; gas.visible = false;
  inner.add(gas);
  const gasCols = [];
  const unitY = new THREE.Vector3(0, 1, 0);
  cyl.forEach((c, i) => {
    if (!c.piston) return;
    const d = new THREE.Vector2(c.d[0], c.d[1]);
    const pos = c.piston.geometry.attributes.position;
    let maxP = -Infinity, zMin = Infinity, zMax = -Infinity;
    for (let k = 0; k < pos.count; k++) {
      const pr = (pos.getX(k) - cAx.x) * d.x + (pos.getY(k) - cAx.y) * d.y;
      if (pr > maxP) maxP = pr;
      const z = pos.getZ(k); if (z < zMin) zMin = z; if (z > zMax) zMax = z;
    }
    const top = maxP - c.s0;                 // porshen barmog'idan tubigacha
    const r = (zMax - zMin) / 2 * 0.94;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 24, 1),
      new THREE.MeshBasicMaterial({ color: 0x59b6ff, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false }));
    m.quaternion.setFromUnitVectors(unitY, new THREE.Vector3(d.x, d.y, 0));
    m.renderOrder = 7; m.raycast = () => {}; m.userData.noReg = true;
    gas.add(m);
    gasCols.push({ m, c, i, d, top, z: (zMin + zMax) / 2 });
  });
  const SMAX = R + L, CLEAR = 0.9;
  // Forsunkalar (ta'minlash tizimi): har bir silindr kallagida, silindr o'qi bo'ylab; uchidan yoqilg'i purkaladi
  inner.updateMatrix();
  const injectors = [];
  const injM = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.85, roughness: 0.3 });
  const injCapM = new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: 0.6, roughness: 0.4 });
  const sprayM = new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
  const IL = 0.11 / K, IR = 0.011 / K;
  for (const g of gasCols) {
    const dir3 = new THREE.Vector3(g.d.x, g.d.y, 0);
    const tip = new THREE.Vector3(cAx.x + g.d.x * (SMAX + g.top + CLEAR), cAx.y + g.d.y * (SMAX + g.top + CLEAR), g.z);
    const q = new THREE.Quaternion().setFromUnitVectors(unitY, dir3);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(IR * 0.75, IR, IL, 14), injM);
    body.quaternion.copy(q); body.position.copy(tip).addScaledVector(dir3, IL / 2);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(IR * 1.2, IR * 1.2, IL * 0.18, 14), injCapM);
    cap.quaternion.copy(q); cap.position.copy(tip).addScaledVector(dir3, IL * 0.85);
    for (const m of [body, cap]) { m.userData.part = 'fuel'; m.name = 'injector_' + g.i; inner.add(m); }
    // purkalayotgan yoqilg'i (faqat namoyishda, ish yo'li boshida ko'rinadi)
    const spray = new THREE.Mesh(new THREE.ConeGeometry(0.02 / K, 0.055 / K, 16, 1, true), sprayM);
    spray.quaternion.copy(q); spray.position.copy(tip).addScaledVector(dir3, -0.0275 / K);
    spray.renderOrder = 8; spray.raycast = () => {}; spray.userData.noReg = true; spray.visible = false;
    gas.add(spray);
    g.spray = spray;
    const top = tip.clone().addScaledVector(dir3, IL).applyMatrix4(inner.matrix);
    const tipR = tip.clone().applyMatrix4(inner.matrix);
    injectors.push({ cyl: g.i, top, tip: tipR });
  }
  const cA = new THREE.Color(0x59b6ff), cB = new THREE.Color(0xd2f2ff), cF = new THREE.Color(0xfff2a0), cP = new THREE.Color(0xff6a1a), cQ = new THREE.Color(0xb0301a), cE = new THREE.Color(0x8d8478);
  function updateGas(theta) {
    if (!gas.visible) return;
    const FOUR = Math.PI * 4;
    for (const g of gasCols) {
      const s = sOf(g.c.psi0 + theta);
      const a = s + g.top, b = SMAX + g.top + CLEAR;
      const mid = (a + b) / 2;
      g.m.position.set(cAx.x + g.d.x * mid, cAx.y + g.d.y * mid, g.z);
      g.m.scale.set(1, Math.max(0.05, b - a), 1);
      const cyc = (((g.c.psi0 + theta + (g.i % 2) * Math.PI * 2) % FOUR) + FOUR) % FOUR;
      const k = Math.floor(cyc / Math.PI), t = cyc / Math.PI - k;
      const mt = g.m.material;
      if (k === 0) { mt.color.copy(cA); mt.opacity = 0.32; }
      else if (k === 1) { mt.color.copy(cA).lerp(cB, t); mt.opacity = 0.32 + 0.33 * t; }
      else if (k === 2) { if (t < 0.25) mt.color.copy(cF).lerp(cP, t / 0.25); else mt.color.copy(cP).lerp(cQ, (t - 0.25) / 0.75); mt.opacity = 0.9 - 0.35 * t; }
      else { mt.color.copy(cE); mt.opacity = 0.5 - 0.25 * t; }
      if (g.spray) g.spray.visible = (k === 1 && t > 0.9) || (k === 2 && t < 0.14);
    }
  }


  update(0);
  return { root, update: (theta) => { update(theta); updateGas(theta); }, gas, injectors };
}
