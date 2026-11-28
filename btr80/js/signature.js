// Muallif yozuvi: BTR korpusining ikki yon tomoniga harbiy texnikadagi kabi oq bo'yoq bilan yozilgan
// ism-familiya. Yozuv korpus sirtiga "yopishtiriladi" (DecalGeometry) va korpus detaliga bola sifatida
// qo'shiladi, shuning uchun yoyilma, yurish va kesimda korpus bilan birga harakatlanadi.
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

const LINE1 = "SOBIROV QODIRBEK NODIRBEK O'G'LI";
const LINE2 = '253-GURUH';

async function makeTexture() {
  const font = '"Barlow Condensed", "Arial Narrow", sans-serif';
  try { await document.fonts.load('700 100px "Barlow Condensed"'); } catch (e) { /* zaxira shrift */ }
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ece8d9'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fit = (text, weight, size, y) => {
    g.font = `${weight} ${size}px ${font}`;
    const w = g.measureText(text).width;
    if (w > 980) g.font = `${weight} ${Math.floor(size * 980 / w)}px ${font}`;
    g.fillText(text, 512, y);
  };
  fit(LINE1, 700, 110, 92);
  fit(LINE2, 600, 72, 196);
  // bo'yoqning biroz ko'chgan joylari (trafaret bo'yoq ko'rinishi uchun)
  g.globalCompositeOperation = 'destination-out';
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) { g.globalAlpha = 0.25 + rnd() * 0.6; g.beginPath(); g.arc(rnd() * 1024, rnd() * 256, 0.6 + rnd() * 2.2, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// real — haqiqiy BTR modeli (old tomoni +z, yonlari x bo'ylab)
export async function addSignature(real) {
  const tex = await makeTexture();
  real.updateMatrixWorld(true);
  const hulls = [];
  real.traverse((o) => { if (o.isMesh && o.userData.part === 'hull') hulls.push(o); });
  const ray = new THREE.Raycaster();
  const decals = [];
  const Z = -1.72, Y = 1.5, SIZE = new THREE.Vector3(0.86, 0.215, 0.25);
  for (const s of [-1, 1]) {
    ray.set(new THREE.Vector3(s * 4, Y, Z), new THREE.Vector3(-s, 0, 0));
    const hit = ray.intersectObjects(hulls, false)[0];
    if (!hit) continue;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (n.x * s < 0) n.negate();
    const xA = new THREE.Vector3(0, 1, 0).cross(n).normalize();   // tashqaridan qaraganda o'ngga
    const yA = n.clone().cross(xA).normalize();                    // sirt bo'ylab yuqoriga
    const rot = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, n));
    const geo = new DecalGeometry(hit.object, hit.point, rot, SIZE);
    geo.applyMatrix4(hit.object.matrixWorld.clone().invert());
    const mat = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    const d = new THREE.Mesh(geo, mat);
    d.raycast = () => {};
    d.renderOrder = 2;
    hit.object.add(d);
    decals.push(d);
  }
  return decals;
}

// Har kadrda: yozuv korpus bilan birga xiralashadi, yashirinadi va kesimda qirqiladi
export function syncSignature(decals) {
  for (const d of decals) {
    const pm = d.parent.material;
    const op = pm.transparent ? pm.opacity : 1;
    d.material.opacity = op;
    d.visible = op > 0.2;
    if (d.material.clippingPlanes !== pm.clippingPlanes) { d.material.clippingPlanes = pm.clippingPlanes; d.material.needsUpdate = true; }
  }
}
