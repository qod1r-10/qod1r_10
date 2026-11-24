// Sketchfab'dan olingan haqiqiy 3D modellarni BTR ichiga joylash.
// Har bir model ixtiyoriy: yuklanmasa, mech.js dagi sxematik detallar qoladi.
//  KamAZ 740.3 — ChB corp. (CC BY 4.0) · Ilashish muftasi — Er.Praveen.Kumar (CC BY 4.0)
//  Uzatmalar qutisi — avredu (CC BY 4.0) · Taqsimlash qutisi NP261 — ypro (CC BY 4.0)
//  Differensial korpusi — Anoopbg (CC BY 4.0) · Kardan vali — PolyPhantom (CC BY 4.0)
//  Radiator — Terllok (CC BY 4.0) · Akkumulyator — NatharaQuetzl · Rul — NIXO · Kardan sharniri — ravindra.mohan09 · O'rindiq — DeWolfePilot · Kanistr — ROY (CC BY 4.0)
//  O't o'chirgich — Renend Studio (Sketchfab Standard) · DShK — Sleepykingzzz · Asboblar — Kryox Shade (CC BY 4.0)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const NAMES = ['kamaz', 'clutch', 'gearbox', 'transfer', 'diff', 'driveshaft', 'radiator', 'pkt', 'battery', 'ujoint', 'seat', 'tank', 'ext', 'dshk'];

export async function loadAssets(loadBin) {
  const loader = new GLTFLoader();
  const out = {};
  await Promise.all(NAMES.map(async (n) => {
    try {
      const buf = await loadBin('models/' + n + '.glb');
      out[n] = (await loader.parseAsync(buf, '')).scene;
      out[n].traverse((o) => {
        if (o.isMesh && !o.geometry.attributes.normal) o.geometry = toCreasedNormals(o.geometry, Math.PI / 5);
      });
    } catch (e) { console.warn('Model yuklanmadi: ' + n, e); }
  }));
  return out;
}

// Modelni o'rab oluvchi guruh: model nuqtasi `pivot` guruh boshiga tushadi
function wrap(scene, { pivot, scale = 1, rot = [0, 0, 0], pos = [0, 0, 0] }) {
  const w = new THREE.Group();
  const m = scene.clone(true);
  m.position.set(-pivot[0], -pivot[1], -pivot[2]);
  w.add(m);
  w.scale.setScalar(scale);
  w.rotation.set(...rot);
  w.position.set(...pos);
  return w;
}
function paint(obj, mat, part, casing = false) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    if (mat) o.material = new THREE.MeshStandardMaterial(mat);
    o.userData.part = part;
    if (casing) o.userData.casing = true;
    o.castShadow = true; o.receiveShadow = true;
  });
  return obj;
}

// Dvigatel korpusi (dvigatel koordinatalarida: o'q +x maxovik tomonga, tirsakli val o'qi y = -0.16)
export function kamazCasing(scene) {
  const w = wrap(scene, { pivot: [-230, 1046, -6127], scale: 0.001, rot: [0, -Math.PI / 2, 0], pos: [-0.03, -0.16, 0] });
  return paint(w, { color: 0x50565b, metalness: 0.55, roughness: 0.5 }, 'engine', true);
}

// Ilashish muftasi (maxovik, siquvchi disk, richaglar) — tirsakli val bilan aylanadi
export function clutchModel(scene) {
  const w = wrap(scene, { pivot: [0.435, 0.135, -0.23], scale: 0.85, rot: [0, Math.PI / 2, 0] });
  return paint(w, null, 'gearbox');
}

// Uzatmalar qutisi vallari va tishli g'ildiraklari (avtomobil g'ildiragi va amortizator olib tashlanadi)
export function gearboxGears(scene) {
  const AXES = [{ y: 8.4, z: 6.5, k: 1 }, { y: 7.4, z: 10.0, k: -0.62 }, { y: 9.4, z: 11.4, k: 0.45 }];
  const model = scene.clone(true);
  model.updateMatrixWorld(true);
  const keep = [], drop = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const inside = c.x > -8 && c.x < 14.2 && c.y > 5 && c.y < 11 && c.z > 3 && c.z < 12.5 && Math.max(s.y, s.z) < 5.2;
    (inside ? keep : drop).push({ o, c, s });
  });
  drop.forEach(({ o }) => o.parent.remove(o));
  const pivots = AXES.map((a) => { const p = new THREE.Group(); p.position.set(0, a.y, a.z); p.userData.k = a.k; model.add(p); return p; });
  keep.forEach(({ o, c, s }) => {
    const round = Math.abs(s.y - s.z) < 0.5;
    const ax = AXES.findIndex((a) => Math.hypot(c.y - a.y, c.z - a.z) < 0.4);
    if (round && ax >= 0) {
      pivots[ax].attach(o); // dunyo holatini saqlagan holda val o'qiga ulanadi
    }
  });
  const w = new THREE.Group();
  model.position.set(-3, -8.4, -6.5);
  w.add(model);
  w.scale.setScalar(0.032);
  w.position.set(0.3, 0.07, 0);
  paint(w, null, 'gearbox');
  w.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.metalness = 0.8; o.material.roughness = 0.32; } });
  return { group: w, update(crank) { pivots.forEach((p) => { p.rotation.x = crank * p.userData.k; }); } };
}

export function transferHousing(scene) {
  const w = wrap(scene, { pivot: [0.17, 249.5, 0.5], scale: 0.0009, rot: [0, Math.PI / 2, 0] });
  return paint(w, { color: 0x6f7377, metalness: 0.5, roughness: 0.55 }, 'transfer', true);
}

export function diffHousing(scene) {
  const w = wrap(scene, { pivot: [136.86, 100.46, -64.4], scale: 0.0042, rot: [0, -Math.PI / 2, 0] });
  return paint(w, { color: 0x4f5458, metalness: 0.55, roughness: 0.5 }, 'axles', true);
}

// Kardan vali: a dan b gacha cho'zilgan nusxa; guruh o'z o'qi (y) atrofida aylanadi
export function driveshaftBetween(scene, a, b, thick = 0.075, uj = null) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A), len = dir.length();
  const g = new THREE.Group();
  g.position.copy(A).add(B).multiplyScalar(0.5);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const inner = scene.clone(true);
  inner.rotation.x = -Math.PI / 2;
  inner.scale.set(thick / 1.1, thick / 1.1, len / 7.14);
  g.add(inner);
  // Ikki uchida krestovinali kardan sharnirlari (val bilan birga aylanadi)
  if (uj) for (const sgn of [-1, 1]) {
    const j = uj.clone(true);
    const w = new THREE.Group();
    w.add(j);
    w.rotation.z = Math.PI / 2; // model x o'qi -> val o'qi (y)
    w.scale.setScalar(thick * 7.5);
    w.position.y = sgn * (len / 2 - thick * 0.6);
    g.add(w);
  }
  g.userData.spinShaft = true;
  paint(g, null, 'shafts');
  return g;
}

export function radiatorModel(scene) {
  // Bitta radiator (ikkita ventilyatori bilan) dvigatel bo'limi tomi ostida yotadi: eni mashina bo'ylab ko'ndalang
  const w = wrap(scene, { pivot: [0, 806, 2567], scale: 0.0016, rot: [-Math.PI / 2, 0, Math.PI / 2] });
  paint(w, null, 'radiator');
  // Model teksturasi juda qora — ko'rinishi uchun biroz yorqinlashtiriladi
  w.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color.setScalar(1.8); } });
  return w;
}

// Akkumulyator batareyasi (uzunligi ≈0.5 m)
export function batteryModel(scene) {
  return paint(wrap(scene, { pivot: [0, 0.35, 0], scale: 0.053 }), null, 'battery');
}

// Rul chambaragi (diametri ≈0.4 m), yuzasi +z ga qaragan
export function steerModel(scene) {
  return paint(wrap(scene, { pivot: [0, 3.15, -0.5], scale: 0.065 }), null, 'driver');
}

// Yuk mashinasi o'rindig'i (asosi y=0 da, yuzi +x ga — mashina oldiga qaraydi)
export function seatModel(scene, scale = 0.0037, part = 'driver') {
  return paint(wrap(scene, { pivot: [0, 401.6, 0], scale, rot: [0, Math.PI / 2, 0] }), null, part);
}
// Yonilg'i baki o'rniga harbiy kanistr shaklidagi bak (zaytun rangida)
export function tankModel(scene) {
  return paint(wrap(scene, { pivot: [0.03, 0, 0.01], scale: 1.9, rot: [0, Math.PI / 2, 0] }), { color: 0x56603a, metalness: 0.3, roughness: 0.6 }, 'fuel');
}
// Qo'l o't o'chirgichi (balandligi ≈0.5 m)
export function extModel(scene) {
  return paint(wrap(scene, { pivot: [0, -1.81, 0], scale: 0.16 }), null, 'fire');
}

// Yirik kalibrli pulemyot (DShK modeli KPVT o'rnida): lentasi va patron qutisi bilan.
// Qurol beshigi koordinatalarida: stvol o'qi (x -0.01, y -0.04), +z ga qaragan.
export function dshkModel(scene, s = 1.0) {
  const g = wrap(scene, { pivot: [0.16, 0.744, 1.23], scale: s, pos: [-0.01, -0.04, 1.32] });
  // Qo'shaloq qurilmaning ramkasi (tepadagi to'sin va orqa ustun) olib tashlanadi
  g.updateMatrixWorld(true);
  const drop = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    const local = g.worldToLocal(c.clone());
    if (local.y > 0.18 || (sz.y < 0.15 && sz.z > 0.8 && local.y > 0.1)) drop.push(o);
  });
  drop.forEach((o) => o.parent.remove(o));
  return paint(g, null, 'kpvt');
}

// Eski uslubdagi 4 ta qora asbob (ko'rsatkich) — har biri markazlashtirilgan guruh, yuzi -x ga qaragan
export function gaugeSet(scene) {
  const CENTERS = [[-5.1, -0.1], [-7.6, -0.1], [-5.1, -2.3], [-7.6, -2.4]];
  const src = scene.clone(true); src.updateMatrixWorld(true);
  const groups = CENTERS.map(() => new THREE.Group());
  const items = [];
  src.traverse((o) => { if (o.isMesh) items.push(o); });
  items.forEach((o) => {
    const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    if (Math.max(sz.x, sz.y) > 2.5) return;
    const k = CENTERS.findIndex(([x, y]) => Math.hypot(c.x - x, c.y - y) < 1.0);
    if (k < 0) return;
    const m = o.clone(); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.applyMatrix4(o.matrixWorld);
    m.position.x -= CENTERS[k][0]; m.position.y -= CENTERS[k][1];
    groups[k].add(m);
  });
  return groups.map((grp) => {
    const w = new THREE.Group(); w.add(grp); grp.scale.setScalar(0.06); w.rotation.y = Math.PI / 2;
    return paint(w, null, 'driver');
  });
}
