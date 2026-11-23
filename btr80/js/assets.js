// Sketchfab'dan olingan haqiqiy 3D modellarni BTR ichiga joylash.
// Har bir model ixtiyoriy: yuklanmasa, mech.js dagi sxematik detallar qoladi.
//  KamAZ 740.3 — ChB corp. (CC BY 4.0) · Ilashish muftasi — Er.Praveen.Kumar (CC BY 4.0)
//  Uzatmalar qutisi — avredu (CC BY 4.0) · Taqsimlash qutisi NP261 — ypro (CC BY 4.0)
//  Differensial korpusi — Anoopbg (CC BY 4.0) · Kardan vali — PolyPhantom (CC BY 4.0)
//  Radiator — Terllok (CC BY 4.0)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const NAMES = ['kamaz', 'clutch', 'gearbox', 'transfer', 'diff', 'driveshaft', 'radiator'];

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
export function driveshaftBetween(scene, a, b, thick = 0.075) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A), len = dir.length();
  const g = new THREE.Group();
  g.position.copy(A).add(B).multiplyScalar(0.5);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const inner = scene.clone(true);
  inner.rotation.x = -Math.PI / 2;
  inner.scale.set(thick / 1.1, thick / 1.1, len / 7.14);
  g.add(inner);
  g.userData.spinShaft = true;
  paint(g, null, 'shafts');
  return g;
}

export function radiatorModel(scene) {
  const g = new THREE.Group();
  for (const z of [-0.33, 0.33]) {
    const w = wrap(scene, { pivot: [0, 806, 2567], scale: 0.0011, rot: [-Math.PI / 2, 0, 0], pos: [0, 0, z] });
    g.add(w);
  }
  return paint(g, null, 'radiator');
}
