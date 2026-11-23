// KPVT va PKT pulemyotlarining minora ichidagi qismlari (modelda faqat stvollar bor).
// Koordinatalar qurol beshigi o'qiga nisbatan: +z — stvol yo'nalishi, gorizontal holatda.
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.75, roughness: 0.38, ...o });
const GUN = 0x2f3236, GUN2 = 0x3d4147, STEEL = 0x9ea3a8, BRASS = 0xc39a45, OLIVE = 0x4d5634, BELT = 0x5b5548;

function box(w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; }
function cylZ(r, len, c, x, y, z, seg = 20) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), M(c)); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; }

// Lentadagi patronlar
function belt(n, start, step, caliberR, caseLen, bulletLen) {
  const g = new THREE.Group();
  const caseGeo = new THREE.CylinderGeometry(caliberR * 1.25, caliberR * 1.4, caseLen, 10);
  const bulGeo = new THREE.ConeGeometry(caliberR, bulletLen, 10);
  const linkGeo = new THREE.BoxGeometry(caliberR * 3.2, caliberR * 0.9, caseLen * 0.55);
  for (let i = 0; i < n; i++) {
    const p = start(i);
    const c = new THREE.Group();
    const cs = new THREE.Mesh(caseGeo, M(BRASS, { metalness: 0.9, roughness: 0.3 })); cs.rotation.x = Math.PI / 2; c.add(cs);
    const bl = new THREE.Mesh(bulGeo, M(0x6b4a2a)); bl.rotation.x = Math.PI / 2; bl.position.z = caseLen / 2 + bulletLen / 2; c.add(bl);
    const ln = new THREE.Mesh(linkGeo, M(BELT, { metalness: 0.6 })); ln.position.y = caliberR * 1.4; c.add(ln);
    c.position.set(p[0], p[1], p[2]);
    if (p[3]) c.rotation.x = p[3];
    g.add(c);
  }
  return g;
}

export function buildKPVT() {
  const g = new THREE.Group();
  const Y = -0.04, X = -0.01;
  // zatvor qutisi (korobka) va qopqoq
  g.add(box(0.15, 0.17, 0.78, GUN, X, Y, -0.46));
  g.add(box(0.16, 0.05, 0.62, GUN2, X, Y + 0.11, -0.42));          // lenta qabul qilgich qopqog'i
  g.add(box(0.2, 0.06, 0.12, GUN2, X, Y + 0.09, -0.22));            // lenta uzatuvchi mexanizm
  for (const z of [-0.68, -0.5, -0.32]) g.add(box(0.162, 0.012, 0.02, STEEL, X, Y + 0.09, z));
  g.add(box(0.14, 0.15, 0.06, GUN2, X, Y, -0.88));                  // orqa bufer
  g.add(cylZ(0.035, 0.06, STEEL, X, Y, -0.93));
  g.add(box(0.03, 0.03, 0.16, STEEL, X + 0.095, Y + 0.02, -0.5));  // qayta zaryadlash dastagi
  g.add(box(0.05, 0.04, 0.04, 0x8a2a20, X + 0.095, Y - 0.05, -0.75)); // elektr tepki
  // stvol kojuxi (teshikli) — minoradan chiqquncha
  const jacket = cylZ(0.052, 0.36, GUN2, X, Y, -0.02, 24); g.add(jacket);
  for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const h = box(0.012, 0.012, 0.05, 0x0d0e0f, X + Math.cos(a) * 0.05, Y + Math.sin(a) * 0.05, -0.15 + i * 0.085);
    h.rotation.z = a; g.add(h);
  }
  // patron qutisi va lenta (chap tomonda)
  const boxX = X + 0.21;
  g.add(box(0.2, 0.24, 0.42, OLIVE, boxX, Y - 0.16, -0.45));
  g.add(box(0.21, 0.02, 0.43, 0x3c432a, boxX, Y - 0.03, -0.45));
  g.add(belt(9, (i) => {
    const t = i / 8;
    return [boxX - 0.04 - t * 0.12, Y - 0.04 + Math.sin(t * Math.PI) * 0.09, -0.45 + (i % 2) * 0.004, Math.PI / 2];
  }, 0, 0.0145, 0.075, 0.035));
  // gilza chiqarish trubkasi
  const chute = cylZ(0.035, 0.32, STEEL, X, Y - 0.2, -0.38); chute.rotation.x = Math.PI / 2 + 0.9; g.add(chute);
  g.traverse((o) => { if (o.isMesh) { o.userData.part = 'kpvt'; o.castShadow = true; } });
  return g;
}

export function buildPKT() {
  const g = new THREE.Group();
  const Y = -0.04, X = -0.18;
  g.add(box(0.075, 0.1, 0.5, GUN, X, Y, -0.32));                    // zatvor qutisi
  g.add(box(0.08, 0.03, 0.26, GUN2, X, Y + 0.065, -0.24));          // qopqoq
  g.add(box(0.05, 0.06, 0.08, GUN2, X, Y - 0.02, -0.6));            // orqa plastina
  g.add(cylZ(0.018, 0.34, GUN2, X, Y, -0.02, 14));                  // stvolning ichki qismi
  g.add(cylZ(0.008, 0.3, STEEL, X, Y - 0.032, -0.04, 8));           // gaz kamerasi trubkasi
  g.add(box(0.02, 0.03, 0.05, 0x8a2a20, X, Y - 0.07, -0.5));        // elektr tepki
  // patron qutisi (250 ta) va lenta (o'ng tomonda)
  const bx = X - 0.13;
  g.add(box(0.11, 0.18, 0.28, OLIVE, bx, Y - 0.12, -0.3));
  g.add(belt(7, (i) => {
    const t = i / 6;
    return [bx + 0.03 + t * 0.07, Y - 0.02 + Math.sin(t * Math.PI) * 0.05, -0.3, Math.PI / 2];
  }, 0, 0.0078, 0.054, 0.03));
  const chute = cylZ(0.02, 0.2, STEEL, X, Y - 0.14, -0.28); chute.rotation.x = Math.PI / 2 + 0.9; g.add(chute);
  g.traverse((o) => { if (o.isMesh) { o.userData.part = 'pkt'; o.castShadow = true; } });
  return g;
}

// 1PZ-2 nishon qurilmasining minora ichidagi qismi: periskop tanasi va okulyar
export function buildSightBody() {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 20), M(GUN2)); tube.position.y = -0.27; g.add(tube);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.2), M(GUN)); body.position.set(0, -0.5, -0.06); g.add(body);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.1, 16), M(0x151515, { metalness: 0.1, roughness: 0.9 }));
  eye.rotation.x = Math.PI / 2; eye.position.set(0, -0.48, -0.2); g.add(eye);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12), M(STEEL)); knob.rotation.z = Math.PI / 2; knob.position.set(0.1, -0.52, -0.04); g.add(knob);
  g.traverse((o) => { if (o.isMesh) { o.userData.part = 'sight'; o.castShadow = true; } });
  return g;
}

// Haqiqiy PKT (fotoskaner: «PKT Machinegun photoscan» — MikeRTV, CC BY 4.0), tagligidan ajratib olingan.
// Skanerda stvol -y tomonga qaragan, taglik +z tomonda; bu yerda stvol +z ga, taglik pastga buriladi.
export function pktModel(scene) {
  const u1 = new THREE.Vector3(0.115, 1, 0).normalize(); // dulodan orqaga
  const u2 = new THREE.Vector3(0, 0, 1);                 // taglik tomoni
  const u3 = new THREE.Vector3().crossVectors(u1, u2);
  const v1 = new THREE.Vector3(0, 0, -1), v2 = new THREE.Vector3(0, -1, 0), v3 = new THREE.Vector3().crossVectors(v1, v2);
  const U = new THREE.Matrix4().makeBasis(u1, u2, u3), V = new THREE.Matrix4().makeBasis(v1, v2, v3);
  const R = V.multiply(U.transpose());
  const g = new THREE.Group();
  const m = scene.clone(true);
  const muzzle = new THREE.Vector3(0.908, -1.38, -0.30);
  m.position.copy(muzzle).negate();
  const rot = new THREE.Group();
  rot.quaternion.setFromRotationMatrix(R);
  rot.add(m);
  g.add(rot);
  g.position.set(-0.18, -0.04, 0.27);
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.part = 'pkt'; o.castShadow = true;
    if (o.material) { o.material = o.material.clone(); o.material.metalness = 0.35; o.material.roughness = 0.6; }
  });
  return g;
}
