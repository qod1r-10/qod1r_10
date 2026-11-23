// BTR-80 ning soddalashtirilgan (sxematik) 3D modeli.
// O'qlar: x — uzunlik bo'ylab (old tomon +x), y — yuqoriga, z — eni bo'ylab.
// Har bir mesh'ga userData.part beriladi — u parts.js dagi qism id'si bilan bir xil.
import * as THREE from 'three';
import { buildEngine, buildGearbox, buildTransfer, buildDiff } from './mech.js';
import { buildDashboard, buildRadio, buildFVU, buildWaterjet } from './details.js';
import { driveshaftBetween, radiatorModel, batteryModel, steerModel, seatModel, tankModel, extModel } from './assets.js';

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
  'wheels', 'suspension', 'trimvane', 'lights', 'antenna']);
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
    if (!exterior && part === 'firing_ports') obj.traverse(o => { o.userData.ghost = true; });
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
    if (assets.tank) { const t = tankModel(assets.tank); t.position.set(-1.8, 0.85, s * 0.72); add('fuel', t); continue; }
    const tank = box(0.36, 0.95, 0.5, C.tank);
    tank.position.set(-1.8, 1.32, s * 0.72);
    add('fuel', tank);
    const capT = cyl(0.06, 0.06, 0.06, C.darkSteel, 10); capT.position.set(-1.8, 1.82, s * 0.72);
    add('fuel', capT);
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
  if (assets.steer) steerSpin.add(steerModel(assets.steer));
  else steerSpin.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 24), mat(C.darkSteel)));
  const dashB = buildDashboard(); // ko'rsatkichlari yurishda jonli o'zgaradi
  dashB.group.position.set(0.8, 0.36, 0.12); drv.add(dashB.group);
  root.userData.dash = dashB;
  for (const zz of [-0.12, 0.06, 0.18]) { const ped = box(0.04, 0.12, 0.07, C.darkSteel); ped.position.set(0.7, -0.15, zz); ped.rotation.z = 0.4; drv.add(ped); }
  drv.position.set(2.3, 0.95, -0.47);
  add('driver', drv);

  const cmd = new THREE.Group();
  if (assets.seat) { const m = seatModel(assets.seat); m.position.set(-0.05, -0.44, 0); cmd.add(m); }
  else { const cSeat = seat(); cmd.add(cSeat); }
  const cPanel = box(0.18, 0.22, 0.5, C.darkSteel); cPanel.position.set(0.78, 0.35, 0); cmd.add(cPanel);
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
  if (assets.seat) {
    // Desantchilar o'rindiqlari: o'rtada orqama-orqa, yon tomonga (ambrazuralarga) qaragan
    for (const xx of [-0.55, 0, 0.55]) for (const s of [-1, 1]) {
      const m = seatModel(assets.seat, 0.0031, 'troop_seats');
      m.rotation.y = s > 0 ? 0 : Math.PI; // modelning old tomoni +z
      m.position.set(xx, -0.44, s * 0.26);
      seats.add(m);
    }
  } else {
  const bench = box(BL, 0.1, 0.9, C.seat); seats.add(bench);
  const backrest = box(BL, 0.55, 0.08, C.seat); backrest.position.y = 0.32; seats.add(backrest);
  for (const xx of [-BL * 0.43, 0, BL * 0.43]) for (const zz of [-0.36, 0.36]) { const leg = box(0.06, 0.4, 0.06, C.darkSteel); leg.position.set(xx, -0.25, zz); seats.add(leg); }
  for (const s of [-1, 1]) {
    const side = box(0.5, 0.08, 0.38, C.seat); side.position.set(BL / 2 + 0.25, 0.0, s * 0.6); seats.add(side);
  }
  }
  seats.position.set(assets.kamaz ? -0.3 : -0.62, 0.95, 0);
  add('troop_seats', seats);

  // O't o'chirgichlar: boshqaruv va desant bo'limlarida
  if (assets.ext) for (const [x, z] of [[2.0, -0.86], [-1.25, 0.86]]) { const e = extModel(assets.ext); e.position.set(x, 0.55, z); add('fire', e); }

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
