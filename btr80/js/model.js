// BTR-80 ning soddalashtirilgan (sxematik) 3D modeli.
// O'qlar: x — uzunlik bo'ylab (old tomon +x), y — yuqoriga, z — eni bo'ylab.
// Har bir mesh'ga userData.part beriladi — u parts.js dagi qism id'si bilan bir xil.
import * as THREE from 'three';
import { buildEngine, buildGearbox, buildTransfer, buildDiff } from './mech.js';
import { buildDashboard, buildRadio, buildFVU, buildWaterjet, buildCooling, buildSteeringWheel, buildCommanderKit } from './details.js';
import { driveshaftBetween, radiatorModel, batteryModel, steerModel, seatModel, tankModel, extModel, gaugeSet } from './assets.js';

const C = {
  armor: 0x5a6640, armorDark: 0x46502f, rubber: 0x1d1e1b, hub: 0x4c5534,
  steel: 0xb4b7b2, darkSteel: 0x45484a, engine: 0x6d7175, gear: 0x8a9096,
  shaft: 0xd2d5d8, tank: 0x8f7d3c, seat: 0x6e5236, glass: 0x22404f,
  radio: 0x3f4d3c, lamp: 0xfff1c2, fvu: 0x7d8a96, battery: 0x2b2e35, radiator: 0x9aa0a6,
};
// Metall detallar yaltiroq, bo'yalgan va yumshoq detallar xira
const MATTE = new Set([0x5a6640, 0x46502f, 0x1d1e1b, 0x4c5534, 0x8f7d3c, 0x6e5236, 0x3f4d3c, 0x2b2e35, 0x7d8a96]);

function mat(color, opts = {}) {
  const metal = !MATTE.has(color);
  return new THREE.MeshStandardMaterial({ color, roughness: metal ? 0.34 : 0.75, metalness: metal ? 0.85 : 0.12, ...opts });
}

function box(w, h, d, color, opts) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts)); }
function cyl(rt, rb, h, color, seg = 18, opts) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts)); }

const Y = new THREE.Vector3(0, 1, 0);
function cylBetween(a, b, r, color, seg = 12) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const m = cyl(r, r, dir.length(), color, seg);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y, dir.normalize());
  return m;
}

// Kesimlar bo'ylab korpus sirtini "loft" qilish
function prof(bY, bW, wY, wW, rY, rW) {
  return [[bY, -bW], [wY, -wW], [rY, -rW], [rY, rW], [wY, wW], [bY, bW]];
}
function loft(stations) {
  const pos = [];
  const v = (x, p) => [x, p[0], p[1]];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  const m = stations[0].p.length;
  for (let i = 0; i < stations.length - 1; i++) {
    const s0 = stations[i], s1 = stations[i + 1];
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m;
      const a = v(s0.x, s0.p[j]), b = v(s0.x, s0.p[k]), c = v(s1.x, s1.p[k]), d = v(s1.x, s1.p[j]);
      tri(a, b, c); tri(a, c, d);
    }
  }
  for (const s of [stations[0], stations[stations.length - 1]]) {
    const cy = s.p.reduce((t, p) => t + p[0], 0) / m;
    const ctr = [s.x, cy, 0];
    for (let j = 0; j < m; j++) tri(ctr, v(s.x, s.p[j]), v(s.x, s.p[(j + 1) % m]));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Sirt bo'ylab qiya joylashgan yupqa plastinka (lyuk, eshik va h.k.)
function onSlopeX(mesh, x0, y0, x1, y1, offset = 0.025) {
  // x-y tekisligida qiya sirt (old/orqa listlar)
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len; // tashqi normal
  mesh.rotation.z = Math.atan2(dy, dx);
  mesh.position.x = (x0 + x1) / 2 + nx * offset;
  mesh.position.y = (y0 + y1) / 2 + ny * offset;
  return mesh;
}

export const AXLES_X = [2.115, 0.765, -0.765, -2.115];

// Haqiqiy 3D modelda (models/btr80.glb) bor tashqi qismlar
const REAL_PARTS = new Set(['hull', 'hatch_front', 'hatch_roof', 'side_doors', 'vision', 'turret', 'kpvt', 'pkt', 'sight', 'smoke',
  'wheels', 'suspension', 'trimvane', 'lights', 'antenna', 'gunner']);
export const REAL_AXLES_X = [2.16, 0.755, -0.935, -2.41];

// exterior=false: faqat ichki qismlar (tashqi ko'rinish haqiqiy modeldan olinadi)
export function buildBTR80({ exterior = true, v8 = null, assets = {} } = {}) {
  const AX = exterior ? AXLES_X : REAL_AXLES_X;
  const mechs = [];
  const addMech = (m, pos) => {
    m.root.position.set(...pos);
    m.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.add(m.root);
    mechs.push(m);
  };
  const root = new THREE.Group();
  root.name = 'BTR-80';

  const tag = (part, obj) => { obj.traverse(o => { if (o.isMesh) { o.userData.part = part; o.castShadow = true; o.receiveShadow = true; } }); return obj; };
  const add = (part, obj, parent = root) => {
    tag(part, obj);
    if (!exterior && REAL_PARTS.has(part)) return obj; // haqiqiy modelda bor
    if (!exterior && part === 'radiator' && obj.isMesh && obj.position.y > 2) return obj; // tomdagi jalyuzlar
    parent.add(obj); return obj;
  };

  /* ---------- KORPUS ---------- */
  const hullGeo = loft([
    { x: 3.85, p: prof(0.95, 0.85, 1.05, 1.2, 1.15, 0.95) },
    { x: 3.3, p: prof(0.55, 1.0, 1.1, 1.42, 1.6, 1.05) },
    { x: 2.4, p: prof(0.5, 1.0, 1.1, 1.42, 2.0, 1.0) },
    { x: -3.3, p: prof(0.5, 1.0, 1.1, 1.42, 2.0, 1.0) },
    { x: -3.8, p: prof(0.75, 0.95, 1.15, 1.38, 1.9, 0.95) },
  ]);
  const hull = new THREE.Mesh(hullGeo, mat(C.armor, { side: THREE.DoubleSide, flatShading: true }));
  add('hull', hull);
  // korpus qovurg'alari (yon ustidagi to'siq planka)
  for (const s of [-1, 1]) {
    const rail = box(6.9, 0.05, 0.08, C.armorDark);
    rail.position.set(-0.3, 1.12, s * 1.44);
    add('hull', rail);
  }

  // Haydovchi va komandir lyuklari (tom, minora oldida)
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    const lid = box(0.55, 0.06, 0.55, C.armorDark); h.add(lid);
    const hinge = cyl(0.03, 0.03, 0.5, C.darkSteel, 8); hinge.rotation.x = Math.PI / 2; hinge.position.set(-0.27, 0.03, 0); h.add(hinge);
    const handle = box(0.04, 0.04, 0.2, C.darkSteel); handle.position.set(0.18, 0.05, 0); h.add(handle);
    h.position.set(2.08, 2.03, s * 0.47);
    add('hatch_front', h);
  }
  // Desant lyuklari
  for (const x of [-0.55, -1.35]) for (const s of [-1, 1]) {
    const h = new THREE.Group();
    const lid = box(0.62, 0.05, 0.6, C.armorDark); h.add(lid);
    const rim = box(0.68, 0.025, 0.66, C.darkSteel); rim.position.y = -0.03; h.add(rim);
    h.position.set(x, 2.03, s * 0.5);
    add('hatch_roof', h);
  }

  // Yon eshiklar (2- va 3-ko'prik orasida)
  for (const s of [-1, 1]) {
    const upAng = Math.atan2(0.42, 0.9); // yuqori yon list qiyaligi
    const upper = box(0.62, 0.72, 0.05, C.armorDark);
    upper.position.set(0, 1.55, s * 1.235);
    upper.rotation.x = -s * upAng;
    add('side_doors', upper);
    const lowAng = Math.atan2(0.42, 0.6); // pastki yon list
    const lower = box(0.42, 0.56, 0.05, C.armorDark);
    lower.position.set(0, 0.84, s * 1.23);
    lower.rotation.x = s * lowAng;
    add('side_doors', lower);
    const handle = box(0.16, 0.04, 0.04, C.darkSteel);
    handle.position.set(0.15, 1.45, s * 1.3);
    add('side_doors', handle);
  }

  // Kuzatish oynalari (old qiya list) va yon priborlar
  for (const s of [-1, 1]) {
    const glass = box(0.62, 0.035, 0.5, C.glass, { metalness: 0.5, roughness: 0.2 });
    onSlopeX(glass, 3.3, 1.6, 2.4, 2.0, 0.02);
    glass.position.z = s * 0.47;
    add('vision', glass);
    const cover = box(0.66, 0.04, 0.06, C.armorDark);
    onSlopeX(cover, 3.3, 1.6, 2.4, 2.0, 0.05);
    cover.position.z = s * 0.47 + s * 0.27;
    add('vision', cover);
    for (const x of [1.65, -0.15, -0.95, -1.75]) {
      const peri = box(0.16, 0.1, 0.07, C.glass, { metalness: 0.4, roughness: 0.3 });
      peri.position.set(x, 1.82, s * 1.11);
      peri.rotation.x = -s * Math.atan2(0.42, 0.9);
      add('vision', peri);
    }
  }

  /* ---------- QUROLLANISH ---------- */
  const TX = 1.0;
  const turret = new THREE.Group();
  const tBody = cyl(0.5, 0.74, 0.5, C.armor, 10, { flatShading: true }); tBody.position.y = 0.25; turret.add(tBody);
  const tRing = cyl(0.78, 0.8, 0.06, C.armorDark, 24); tRing.position.y = 0.0; turret.add(tRing);
  const tTop = cyl(0.42, 0.5, 0.04, C.armorDark, 10); tTop.position.y = 0.52; turret.add(tTop);
  const mantlet = box(0.32, 0.3, 0.42, C.armorDark); mantlet.position.set(0.6, 0.3, 0); turret.add(mantlet);
  turret.position.set(TX, 2.0, 0);
  add('turret', turret);

  const kpvt = new THREE.Group();
  const recv = box(0.9, 0.16, 0.16, C.darkSteel); recv.position.set(0.25, 0, 0); kpvt.add(recv);
  const barrel = cyl(0.05, 0.05, 2.0, C.darkSteel, 14, { metalness: 0.6, roughness: 0.4 }); barrel.rotation.z = Math.PI / 2; barrel.position.x = 1.6; kpvt.add(barrel);
  const shroud = cyl(0.08, 0.08, 0.9, C.darkSteel, 14, { metalness: 0.5, roughness: 0.45 }); shroud.rotation.z = Math.PI / 2; shroud.position.x = 1.1; kpvt.add(shroud);
  const muzzle = cyl(0.075, 0.075, 0.18, C.darkSteel, 14); muzzle.rotation.z = Math.PI / 2; muzzle.position.x = 2.62; kpvt.add(muzzle);
  kpvt.position.set(TX + 0.4, 2.32, 0.07);
  add('kpvt', kpvt);

  const pkt = new THREE.Group();
  const pRecv = box(0.5, 0.09, 0.08, C.darkSteel); pRecv.position.x = 0.15; pkt.add(pRecv);
  const pBar = cyl(0.022, 0.022, 0.7, C.darkSteel, 10, { metalness: 0.6 }); pBar.rotation.z = Math.PI / 2; pBar.position.x = 0.7; pkt.add(pBar);
  pkt.position.set(TX + 0.5, 2.3, -0.16);
  add('pkt', pkt);

  const sight = new THREE.Group();
  const sBody = box(0.2, 0.22, 0.16, C.darkSteel); sight.add(sBody);
  const sHead = box(0.12, 0.1, 0.18, C.glass, { metalness: 0.5, roughness: 0.2 }); sHead.position.set(0.06, 0.15, 0); sight.add(sHead);
  const sHood = box(0.16, 0.04, 0.22, C.armorDark); sHood.position.set(0.04, 0.22, 0); sight.add(sHood);
  sight.position.set(TX + 0.18, 2.58, 0.22);
  add('sight', sight);

  const smoke = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const zz = -0.42 + i * 0.168;
    const tube = cyl(0.045, 0.045, 0.24, C.armorDark, 10);
    tube.position.set(0, 0, zz);
    tube.rotation.z = Math.PI * 0.22; // orqaga-yuqoriga qiya
    tube.rotation.x = zz * 0.6;
    smoke.add(tube);
  }
  const smokeBar = box(0.08, 0.06, 0.95, C.darkSteel); smokeBar.position.set(0.06, -0.08, 0); smoke.add(smokeBar);
  smoke.position.set(TX - 0.62, 2.42, 0);
  add('smoke', smoke);

  /* ---------- YURISH QISMI ---------- */
  const tyreProfile = [[0.28, -0.19], [0.47, -0.19], [0.53, -0.17], [0.56, -0.11], [0.56, 0.11], [0.53, 0.17], [0.47, 0.19], [0.28, 0.19]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const tyreGeo = new THREE.LatheGeometry(tyreProfile, 32);
  for (const x of AX) for (const s of [-1, 1]) {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(tyreGeo, mat(C.rubber, { roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
    tyre.rotation.x = Math.PI / 2; w.add(tyre);
    const hub = cyl(0.29, 0.29, 0.34, C.hub, 20); hub.rotation.x = Math.PI / 2; w.add(hub);
    const cap = cyl(0.12, 0.14, 0.42, C.darkSteel, 12); cap.rotation.x = Math.PI / 2; w.add(cap);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bolt = cyl(0.022, 0.022, 0.39, C.steel, 6); bolt.rotation.x = Math.PI / 2;
      bolt.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0); w.add(bolt);
    }
    w.position.set(x, 0.56, s * 1.22);
    add('wheels', w);
  }

  for (const x of AX) {
    const axle = cylBetween([x, 0.56, -1.08], [x, 0.56, 1.08], 0.075, C.darkSteel);
    add('axles', axle);
    addMech(buildDiff(assets), [x, 0.58, 0]);
    for (const s of [-1, 1]) {
      const red = cyl(0.13, 0.13, 0.16, C.darkSteel, 14); red.rotation.x = Math.PI / 2;
      red.position.set(x, 0.56, s * 0.98);
      add('axles', red);
      // osma: torsion richag va amortizator
      const arm = cylBetween([x - 0.35, 0.62, s * 0.62], [x, 0.58, s * 0.95], 0.045, C.steel, 8);
      add('suspension', arm);
      const torsion = cylBetween([x - 0.35, 0.62, s * 0.62], [x - 1.0, 0.62, s * 0.62], 0.03, C.steel, 8);
      add('suspension', torsion);
      const shock = cylBetween([x + 0.05, 0.66, s * 0.92], [x + 0.22, 1.15, s * 0.82], 0.05, C.gear, 10);
      add('suspension', shock);
      const spring = cylBetween([x + 0.1, 0.8, s * 0.89], [x + 0.18, 1.03, s * 0.85], 0.075, C.engine, 10);
      add('suspension', spring);
    }
  }

  /* ---------- DVIGATEL-TRANSMISSIYA ---------- */
  // Batafsil mexanizmlar (mech.js): dvigatel, uzatmalar qutisi, taqsimlash qutisi
  // KamAZ korpusi uzunroq (maxovik karteri bilan), shuning uchun uzatmalar qutisi biroz oldinga suriladi
  const GBX = assets.kamaz ? -1.82 : -2.12;
  addMech(buildEngine(v8, assets.kamaz), [-2.85, 0.95, 0]);
  addMech(buildGearbox(assets), [GBX, 0.88, 0]);
  addMech(buildTransfer(assets), [-0.05, 0.78, 0]);

  const shaft = (a, b, r) => (assets.driveshaft ? add('shafts', driveshaftBetween(assets.driveshaft, a, b, r * 1.9, assets.ujoint)) : add('shafts', cylBetween(a, b, r, C.shaft, 10)));
  shaft([GBX + (assets.gearbox ? 0.74 : 0.24), 0.86, 0], [0.16, 0.8, 0], 0.045);
  for (const x of AX) {
    const from = x > 0 ? [0.16, 0.74, 0.08] : [-0.26, 0.74, -0.08];
    shaft(from, [x + (x > 0 ? -0.2 : 0.2), 0.6, 0], 0.04);
  }
  // Suv to'piga val
  add('shafts', cylBetween([-0.4, 0.72, 0.12], [-3.3, 0.82, 0.12], 0.03, C.shaft, 8));

  for (const s of [-1, 1]) {
    // BTR-80 yonilg'i baki: korpus yon devoriga moslangan to'rtburchak bak (qovurg'alari va quyish bo'g'izi bilan)
    { const t = new THREE.Group();
      const body = box(0.42, 0.9, 0.34, C.tank); t.add(body);
      for (const yy of [-0.25, 0, 0.25]) { const rib = box(0.43, 0.025, 0.35, C.armorDark); rib.position.y = yy; t.add(rib); }
      const neck = cyl(0.05, 0.05, 0.08, C.darkSteel, 14); neck.position.set(0.1, 0.49, 0); t.add(neck);
      const capT = cyl(0.065, 0.065, 0.03, C.darkSteel, 14); capT.position.set(0.1, 0.54, 0); t.add(capT);
      const strap = box(0.03, 0.92, 0.36, C.darkSteel); strap.position.x = -0.12; t.add(strap); const strap2 = strap.clone(); strap2.position.x = 0.12; t.add(strap2);
      t.position.set(-1.8, 1.3, s * 0.78); add('fuel', t); continue; }
    const tank = box(0.36, 0.95, 0.5, C.tank);
    tank.position.set(-1.8, 1.32, s * 0.72);
    add('fuel', tank);
    const capT = cyl(0.06, 0.06, 0.06, C.darkSteel, 10); capT.position.set(-1.8, 1.82, s * 0.72);
    add('fuel', capT);
  }
  // Yonilg'i tizimi: baklardan taqsimlash krani, dag'al va mayin tozalash filtrlari, qo'l nasosi orqali
  // dvigatelning yuqori bosimli yonilg'i nasosiga (YuBYoN, silindr qatorlari orasida) boradi.
  {
    const fs = new THREE.Group();
    const steelM = mat(C.steel), darkM = mat(C.darkSteel), lineM = mat(0x2a2a26, { metalness: 0.3, roughness: 0.6 });
    const pipe = (pts, r = 0.012) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 30, r, 6), lineM);
    const valve = new THREE.Group(); const vb = box(0.1, 0.08, 0.12, C.darkSteel); valve.add(vb); const lever = cylBetween([0, 0.04, 0], [0.12, 0.12, 0], 0.01, C.steel, 6); valve.add(lever);
    valve.position.set(-1.62, 0.95, 0); fs.add(valve);                                      // taqsimlash krani
    const coarse = cyl(0.06, 0.06, 0.18, C.steel, 16); coarse.position.set(-2.05, 0.85, -0.32); fs.add(coarse);   // dag'al filtr
    const cbowl = cyl(0.05, 0.04, 0.06, 0x8a8f95, 16); cbowl.position.set(-2.05, 0.73, -0.32); fs.add(cbowl);
    const fine = cyl(0.07, 0.07, 0.22, 0x9aa0a6, 16); fine.position.set(-2.12, 1.15, 0.32); fs.add(fine);       // mayin filtr
    const fcap = cyl(0.075, 0.075, 0.03, C.darkSteel, 16); fcap.position.set(-2.12, 1.27, 0.32); fs.add(fcap);
    const prime = box(0.08, 0.12, 0.08, C.darkSteel); prime.position.set(-2.2, 1.0, -0.12); fs.add(prime);       // qo'l nasosi
    const knob = cyl(0.02, 0.02, 0.06, 0x141414, 10); knob.position.set(-2.2, 1.09, -0.12); fs.add(knob);
    const tnvd = box(0.36, 0.14, 0.14, 0x6f7377); tnvd.position.set(-2.62, 1.36, 0); fs.add(tnvd);               // YuBYoN
    for (let k = 0; k < 8; k++) { const o = cyl(0.008, 0.008, 0.06, C.steel, 6); o.position.set(-2.76 + k * 0.04, 1.45, 0); fs.add(o); }
    fs.add(pipe([[-1.8, 0.86, -0.62], [-1.7, 0.85, -0.3], [-1.62, 0.92, -0.04]]));
    fs.add(pipe([[-1.8, 0.86, 0.62], [-1.7, 0.85, 0.3], [-1.62, 0.92, 0.04]]));
    fs.add(pipe([[-1.62, 0.92, 0], [-1.85, 0.95, -0.25], [-2.05, 0.95, -0.32]]));
    fs.add(pipe([[-2.05, 0.95, -0.32], [-2.2, 0.95, -0.12]]));
    fs.add(pipe([[-2.2, 1.06, -0.12], [-2.15, 1.1, 0.15], [-2.12, 1.05, 0.32]]));
    fs.add(pipe([[-2.12, 1.28, 0.32], [-2.3, 1.38, 0.15], [-2.45, 1.37, 0.02]]));
    add('fuel', fs);
  }


  const rad = new THREE.Group();
  if (assets.radiator) rad.add(radiatorModel(assets.radiator));
  else {
    const core = box(1.0, 0.14, 1.5, C.radiator, { metalness: 0.4, roughness: 0.5 }); rad.add(core);
    for (const s of [-1, 1]) {
      const fan = cyl(0.28, 0.28, 0.06, C.darkSteel, 20); fan.name = 'fan'; fan.position.set(0, -0.12, s * 0.38); rad.add(fan);
    }
  }
  rad.position.set(-2.85, 1.78, 0);
  add('radiator', rad);
  add('radiator', buildCooling()); // nasos, termostat, bakcha, moy radiatori, gidromufta, shlanglar
  // tomdagi jalyuzlar (radiatorga tegishli)
  for (let i = 0; i < 7; i++) {
    const louver = box(0.07, 0.03, 1.5, C.armorDark);
    louver.position.set(-2.4 - i * 0.14, 2.02, 0);
    add('radiator', louver);
  }

  /* ---------- SUZISH ---------- */
  const wjB = buildWaterjet();
  const wj = wjB.group;
  wj.position.set(-3.42, 0.85, 0);
  root.userData.impeller = wjB.impeller;
  add('waterjet', wj);

  const tv = new THREE.Group();
  const plate = box(0.62, 0.035, 2.0, C.armorDark); tv.add(plate);
  for (const zz of [-0.7, 0, 0.7]) { const rib = box(0.56, 0.05, 0.04, C.armor); rib.position.set(0, 0.03, zz); tv.add(rib); }
  onSlopeX(tv, 3.3, 0.55, 3.85, 0.95, -0.05);
  add('trimvane', tv);

  /* ---------- BOSHQARUV BO'LIMI ---------- */
  function seat(back = 0.5) {
    const g = new THREE.Group();
    const base = box(0.44, 0.1, 0.44, C.seat); g.add(base);
    const bk = box(0.08, back, 0.44, C.seat); bk.position.set(-0.2, back / 2, 0); g.add(bk);
    const leg = cyl(0.03, 0.03, 0.4, C.darkSteel, 8); leg.position.y = -0.24; g.add(leg);
    return g;
  }
  const drv = new THREE.Group();
  if (assets.seat) { const m = seatModel(assets.seat); m.position.set(-0.05, -0.44, 0); drv.add(m); }
  else { const dSeat = seat(); dSeat.position.set(0, 0, 0); drv.add(dSeat); }
  const col = cylBetween([0.62, 0.05, 0], [0.38, 0.38, 0], 0.03, C.darkSteel, 8); drv.add(col);
  // Rul chambaragi: haqiqiy model bo'lsa o'sha, bo'lmasa halqa. steerSpin guruhi yurishda rul bilan buriladi.
  const wheel = new THREE.Group();
  wheel.position.set(0.38, 0.4, 0);
  wheel.rotation.set(0.55, Math.PI / 2, 0, 'YXZ'); drv.add(wheel);
  const steerSpin = new THREE.Group(); steerSpin.name = 'steerSpin'; wheel.add(steerSpin);
  steerSpin.add(buildSteeringWheel()); // BTR-80 ruli: katta, uch kegayli
  const dashB = buildDashboard(); // ko'rsatkichlari yurishda jonli o'zgaradi
  dashB.group.position.set(0.8, 0.36, 0.12); drv.add(dashB.group);
  root.userData.dash = dashB;
  // Pedallar (BTR-80 kabinasi suratiga ko'ra): ilashish muftasi, tormoz (qovurg'ali kvadrat) va baland yonilg'i pedali
  const pedalPad = (w, h, zz, x, y) => {
    const g = new THREE.Group();
    const pad = box(0.02, h, w, C.darkSteel); g.add(pad);
    for (let i = 0; i < Math.round(h / 0.018); i++) { const rib = box(0.008, 0.006, w * 0.9, C.steel); rib.position.set(-0.012, -h / 2 + 0.01 + i * 0.018, 0); g.add(rib); }
    g.position.set(x, y, zz); g.rotation.z = 0.35; drv.add(g);
  };
  pedalPad(0.09, 0.09, -0.13, 0.66, -0.26);
  pedalPad(0.09, 0.09, 0.03, 0.66, -0.26);
  pedalPad(0.07, 0.2, 0.17, 0.7, -0.3);
  for (const zz of [-0.13, 0.03]) drv.add(cylBetween([0.7, -0.2, zz], [0.78, 0.15, zz], 0.012, C.darkSteel, 6));
  drv.add(cylBetween([0.62, 0.05, 0], [0.78, -0.44, 0], 0.035, C.darkSteel, 10)); // rul ustuni polgacha
  const boot = cyl(0.07, 0.09, 0.08, C.rubber, 14); boot.position.set(0.76, -0.4, 0); drv.add(boot);
  // Dastaklar (o'ng tomonda): uzatmalar qutisi va taqsimlash qutisi (ikkita)
  [[0.42, 0.36, 0.46, 0.2], [0.52, 0.46, 0.38, -0.15], [0.34, 0.5, 0.34, 0.1]].forEach(([x, zz, len, tilt]) => {
    const top = [x + Math.sin(tilt) * len * 0.3, -0.44 + len, zz];
    drv.add(cylBetween([x, -0.44, zz], top, 0.011, C.steel, 8));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), mat(0x141414, { metalness: 0.1, roughness: 0.4 }));
    knob.position.set(...top); drv.add(knob);
    const base = box(0.08, 0.03, 0.06, C.armorDark); base.position.set(x, -0.43, zz); drv.add(base);
  });
  drv.position.set(2.3, 0.95, -0.47);
  add('driver', drv);

  const cmd = new THREE.Group();
  if (assets.seat) { const m = seatModel(assets.seat); m.position.set(-0.05, -0.44, 0); cmd.add(m); }
  else { const cSeat = seat(); cmd.add(cSeat); }
  cmd.add(buildCommanderKit()); // TKN-3, IQ yoritgich, R-174, komandir pulti
  cmd.position.set(2.3, 0.95, 0.47);
  add('commander', cmd);

  const gun = new THREE.Group();
  const gSeat = seat(0.35); gun.add(gSeat);
  const strap = cylBetween([0, 0.05, 0], [0, 0.85, 0], 0.025, C.darkSteel, 6); strap.position.x = -0.05; gun.add(strap);
  gun.position.set(TX - 0.1, 1.15, 0);
  add('gunner', gun);

  /* ---------- DESANT BO'LIMI ---------- */
  const seats = new THREE.Group();
  const BL = assets.kamaz ? 1.6 : 2.2;
  {
    // Desantchilar skameykalari: o'rtada orqama-orqa, yon devorlarga (ambrazuralarga) qaragan.
    // Metall quvur ramka, to'q rangli charm o'rindiq va suyanchiqlar, har tomonda 3 kishilik.
    const LEATHER = mat(0x2e2522, { metalness: 0.05, roughness: 0.75 }), TUBE = mat(0x9aa09a, { metalness: 0.75, roughness: 0.35 });
    const n = 3, segL = BL / n;
    const tube = (a, b, r = 0.016) => { const m = cylBetween(a, b, r, 0x9aa09a, 8); m.material = TUBE; seats.add(m); };
    for (const sd of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const x = -BL / 2 + segL * (i + 0.5);
        const cu = new THREE.Mesh(new THREE.BoxGeometry(segL - 0.04, 0.08, 0.36), LEATHER); cu.position.set(x, 0, sd * 0.24); seats.add(cu);
        const bk = new THREE.Mesh(new THREE.BoxGeometry(segL - 0.04, 0.4, 0.07), LEATHER); bk.position.set(x, 0.3, sd * 0.06); bk.rotation.x = sd * -0.08; seats.add(bk);
      }
      tube([-BL / 2, -0.05, sd * 0.42], [BL / 2, -0.05, sd * 0.42]);   // o'rindiq old quvuri
      tube([-BL / 2, 0.52, sd * 0.02], [BL / 2, 0.52, sd * 0.02]);       // suyanchiq tepasidagi quvur
      for (let i = 0; i <= n; i++) {
        const x = -BL / 2 + segL * i;
        tube([x, -0.45, sd * 0.4], [x, -0.05, sd * 0.42]);                 // oyoq
        tube([x, -0.05, sd * 0.42], [x, -0.05, 0]);                        // ko'ndalang
      }
    }
    for (let i = 0; i <= n; i++) { const x = -BL / 2 + segL * i; tube([x, -0.45, 0], [x, 0.52, 0], 0.02); }  // markaziy ustunlar
    tube([-BL / 2, -0.44, 0], [BL / 2, -0.44, 0], 0.02);                   // pol bo'ylab asos
  }
  seats.position.set(assets.kamaz ? -0.3 : -0.62, 0.95, 0);
  add('troop_seats', seats);

  // Desant bo'limida joylangan jihozlar: patron qutilari va suv kanistrlari (yon devorlar bo'ylab)
  {
    const st = new THREE.Group();
    const ammoBox = (x, zz) => { const g = new THREE.Group(); const b = box(0.3, 0.18, 0.16, 0x4f5a37); g.add(b); const lid = box(0.31, 0.02, 0.17, 0x3e4729); lid.position.y = 0.1; g.add(lid); const h = box(0.1, 0.015, 0.02, C.darkSteel); h.position.set(0, 0.12, 0); g.add(h); g.position.set(x, 0.6, zz); st.add(g); };
    const can = (x, zz) => { const g = new THREE.Group(); const b = box(0.14, 0.34, 0.24, 0x55603c); g.add(b); const cap = cyl(0.025, 0.025, 0.04, C.darkSteel, 10); cap.position.set(0.04, 0.19, 0.07); g.add(cap); const hd = box(0.03, 0.03, 0.18, C.darkSteel); hd.position.set(-0.02, 0.19, -0.02); g.add(hd); g.position.set(x, 0.68, zz); st.add(g); };
    for (const sd of [-1, 1]) { ammoBox(-0.9, sd * 0.86); ammoBox(-0.55, sd * 0.86); ammoBox(0.35, sd * 0.86); }
    can(-1.3, -0.82); can(0.7, 0.82);
    add('stowage', st);
  }

  // O't o'chirgichlar: boshqaruv va desant bo'limlarida
  if (assets.ext) for (const [x, z] of [[1.95, -0.6], [-1.3, 0.42]]) { const e = extModel(assets.ext); e.position.set(x, 0.9, z); add('fire', e); }

  for (const s of [-1, 1]) for (const x of [-1.5, -0.95, 0.55, 1.6]) {
    const port = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 8, 16), mat(C.darkSteel));
    port.add(ring);
    const plug = cyl(0.06, 0.06, 0.03, C.armorDark, 14); plug.rotation.x = Math.PI / 2; port.add(plug);
    port.position.set(x, 1.48, s * 1.25);
    port.rotation.x = -s * Math.atan2(0.42, 0.9);
    add('firing_ports', port);
  }

  /* ---------- ELEKTR VA ALOQA ---------- */
  const radio = buildRadio();
  radio.position.set(1.75, 1.58, 0.84);
  add('radio', radio);

  const ant = new THREE.Group();
  const aBase = cyl(0.07, 0.09, 0.12, C.darkSteel, 12); ant.add(aBase);
  const aRod = cyl(0.008, 0.015, 1.9, C.darkSteel, 6); aRod.position.y = 1.0; ant.add(aRod);
  ant.position.set(-0.1, 2.06, 0.82);
  add('antenna', ant);

  for (const s of [-1, 1]) {
    const lamp = new THREE.Group();
    const housing = cyl(0.1, 0.1, 0.14, C.darkSteel, 16); housing.rotation.z = Math.PI / 2; lamp.add(housing);
    const lens = cyl(0.085, 0.085, 0.02, C.lamp, 16, { emissive: 0x6b5a20, roughness: 0.2 }); lens.rotation.z = Math.PI / 2; lens.position.x = 0.08; lamp.add(lens);
    const guard = box(0.04, 0.24, 0.04, C.darkSteel); guard.position.set(0.12, 0, 0); lamp.add(guard);
    lamp.position.set(3.45, 1.5, s * 0.98);
    add('lights', lamp);
    const ir = cyl(0.06, 0.06, 0.1, 0x5a1010, 12, { emissive: 0x200000 }); ir.rotation.z = Math.PI / 2;
    ir.position.set(3.38, 1.66, s * 0.78);
    add('lights', ir);
  }

  for (const zz of [-0.92, -0.62]) {
    if (assets.battery) { const b = batteryModel(assets.battery); b.position.set(1.55, 0.78, zz); add('battery', b); continue; }
    const bat = box(0.5, 0.26, 0.26, C.battery);
    bat.position.set(1.55, 0.78, zz);
    add('battery', bat);
    for (const dz of [-0.07, 0.07]) { const term = cyl(0.02, 0.02, 0.04, 0xb33a2a, 8); term.position.set(1.55 + dz * 2, 0.93, zz); add('battery', term); }
  }

  const fvu = buildFVU();
  fvu.position.set(1.28, 0.86, 0.82);
  add('fvu', fvu);

  root.userData.mechs = mechs;
  return root;
}
