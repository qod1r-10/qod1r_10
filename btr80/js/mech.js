// Ichki mexanizmlar: dvigatel (krivoship-shatun va gaz taqsimlash), ilashish muftasi va uzatmalar qutisi,
// taqsimlash qutisi, ko'prik differensiali. Har biri update(crank, wheel) bilan harakatlanadi.
// Korpus detallari userData.casing = true — "Kesim" rejimida ular qirqiladi.
import * as THREE from 'three';
import { buildV8 } from './engine3d.js';
import { clutchModel, gearboxGears, transferHousing, diffHousing } from './assets.js';

const Y = new THREE.Vector3(0, 1, 0);
const COL = {
  cast: 0x6f7377, castDark: 0x55595d, steel: 0xc9ccd0, bright: 0xe2e4e6, brass: 0xc9a24a,
  gear: 0xa7adb3, gearDark: 0x7d848b, alu: 0xb9bdc0, red: 0x9b3b2c,
};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: 0.32, ...o });

function mesh(geo, color, o) { return new THREE.Mesh(geo, mat(color, o)); }
function cylX(r, len, color, seg = 20) { const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), color); m.rotation.z = Math.PI / 2; return m; }

const gearCache = new Map();
function gearGeo(r, width, teeth) {
  const key = r + '|' + width + '|' + teeth;
  if (gearCache.has(key)) return gearCache.get(key);
  const depth = Math.min(0.018, r * 0.16);
  const shape = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ph = i % 4;
    const rr = ph === 1 || ph === 2 ? r : r - depth;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, Math.max(0.012, r * 0.22), 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -width / 2);
  gearCache.set(key, g);
  return g;
}
// axis: 'x' | 'y' | 'z' — g'ildirak aylanish o'qi
function gear(r, width, axis, color = COL.gear) {
  const teeth = Math.max(10, Math.round(r * 260));
  const inner = mesh(gearGeo(r, width, teeth), color, { flatShading: true });
  const g = new THREE.Group();
  if (axis === 'x') inner.rotation.y = Math.PI / 2;
  if (axis === 'y') inner.rotation.x = Math.PI / 2;
  g.add(inner);
  g.userData.axis = axis;
  return g;
}
const spin = (g, a) => { g.rotation[g.userData.axis] = a; };

function casing(m) { m.userData.casing = true; return m; }

/* ================= DVIGATEL (KamAZ-7403, V8 90°) ================= */
export function buildEngine(v8, kamaz) {
  if (v8) return buildV8(v8, kamaz);
  const root = new THREE.Group();
  const block = new THREE.Group(), crankG = new THREE.Group(), valve = new THREE.Group();
  root.add(block, crankG, valve);
  const AX = new THREE.Vector3(0, -0.16, 0); // tirsakli val o'qi
  crankG.position.copy(AX);
  const R = 0.055, L = 0.19;              // krivoship radiusi, shatun uzunligi
  const BANK = [new THREE.Vector3(0, Math.SQRT1_2, Math.SQRT1_2), new THREE.Vector3(0, Math.SQRT1_2, -Math.SQRT1_2)];
  const THROWS = [-0.33, -0.11, 0.11, 0.33];
  const PHASE = [0, Math.PI / 2, Math.PI * 1.5, Math.PI]; // krestsimon tirsakli val

  // --- korpus (silindrlar bloki, kallaklar, karter) ---
  const castM = (c) => mat(c, { metalness: 0.55, roughness: 0.55 });
  BANK.forEach((d) => {
    const q = new THREE.Quaternion().setFromUnitVectors(Y, d);
    const cyl = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.22, 0.2), castM(COL.cast));
    cyl.quaternion.copy(q); cyl.position.copy(AX).addScaledVector(d, 0.2);
    block.add(casing(cyl));
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 0.22), castM(COL.castDark));
    head.quaternion.copy(q); head.position.copy(AX).addScaledVector(d, 0.355);
    block.add(casing(head));
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.05, 0.17), castM(COL.red));
    cover.quaternion.copy(q); cover.position.copy(AX).addScaledVector(d, 0.42);
    block.add(casing(cover));
  });
  const crankcase = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.2, 0.5), castM(COL.cast));
  crankcase.position.set(0, -0.12, 0); block.add(casing(crankcase));
  const pan = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.12, 0.42), castM(COL.castDark));
  pan.position.set(0, -0.28, 0); block.add(casing(pan));
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.42), castM(COL.castDark));
  front.position.set(-0.54, -0.02, 0); block.add(casing(front));
  block.traverse((o) => { if (o.isMesh) o.userData.part = 'engine'; });

  // --- tirsakli val va maxovik ---
  const main = cylX(0.028, 1.12, COL.bright); crankG.add(main);
  THROWS.forEach((x, i) => {
    const a = PHASE[i];
    const py = Math.cos(a) * R, pz = Math.sin(a) * R;
    for (const dx of [-0.065, 0.065]) {
      const web = mesh(new THREE.BoxGeometry(0.025, 0.12, 0.07), COL.steel);
      web.position.set(x + dx, py / 2, pz / 2);
      web.rotation.x = a;
      crankG.add(web);
    }
    const pin = cylX(0.024, 0.13, COL.bright); pin.position.set(x, py, pz); crankG.add(pin);
  });
  const fly = cylX(0.2, 0.045, COL.steel, 40); fly.position.x = 0.6; crankG.add(fly);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 60), mat(COL.gearDark)); ring.rotation.y = Math.PI / 2; ring.position.x = 0.6; crankG.add(ring);
  const pul = cylX(0.07, 0.04, COL.castDark); pul.position.x = -0.6; crankG.add(pul);
  crankG.traverse((o) => { if (o.isMesh) o.userData.part = 'crank'; });

  // --- porshenlar va shatunlar ---
  const pistons = [];
  const pGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.075, 24);
  const rGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 10);
  THROWS.forEach((x, i) => {
    BANK.forEach((d, b) => {
      const p = new THREE.Mesh(pGeo, mat(COL.alu, { metalness: 0.7, roughness: 0.35 }));
      p.quaternion.setFromUnitVectors(Y, d);
      const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 4, 24), mat(COL.gearDark));
      ringL.rotation.x = Math.PI / 2; ringL.position.y = 0.02; p.add(ringL);
      const rod = new THREE.Mesh(rGeo, mat(COL.steel));
      p.userData.part = rod.userData.part = ringL.userData.part = 'crank';
      root.add(p, rod);
      pistons.push({ p, rod, d, x: x + (b ? 0.035 : -0.035), a: PHASE[i] });
    });
  });

  // --- gaz taqsimlash: taqsimlash vali va klapanlar ---
  const cam = cylX(0.02, 1.02, COL.bright); cam.position.set(0, 0.02, 0); valve.add(cam);
  const lobes = [];
  THROWS.forEach((x) => {
    for (const dx of [-0.05, 0.05]) {
      const lobe = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 3), COL.steel);
      lobe.rotation.z = Math.PI / 2; lobe.position.set(x + dx, 0.02, 0); valve.add(lobe); lobes.push(lobe);
    }
  });
  const valves = [];
  pistons.forEach((ps, k) => {
    for (const [dx, ex] of [[-0.022, 0], [0.022, 1]]) {
      const v = new THREE.Group();
      const stem = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8), COL.bright); stem.position.y = 0.05; v.add(stem);
      const head = mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.008, 16), ex ? COL.brass : COL.bright); v.add(head);
      const spring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 4, 12), mat(COL.gearDark)); spring.rotation.x = Math.PI / 2; spring.position.y = 0.085; v.add(spring);
      v.quaternion.setFromUnitVectors(Y, ps.d);
      valve.add(v);
      valves.push({ v, base: AX.clone().addScaledVector(ps.d, 0.305).add(new THREE.Vector3(ps.x + dx, 0, 0)), d: ps.d, ph: ps.a + (k % 2) * Math.PI / 2 + (ex ? Math.PI * 0.6 : 0) });
    }
  });
  valve.traverse((o) => { if (o.isMesh) o.userData.part = 'valvetrain'; });

  const tmp = new THREE.Vector3(), pinW = new THREE.Vector3(), dir = new THREE.Vector3();
  function update(crank) {
    crankG.rotation.x = crank;
    for (const ps of pistons) {
      const ang = ps.a + crank;
      pinW.set(ps.x, Math.cos(ang) * R, Math.sin(ang) * R);
      const along = pinW.y * ps.d.y + pinW.z * ps.d.z;
      const perp2 = pinW.y * pinW.y + pinW.z * pinW.z - along * along;
      const s = along + Math.sqrt(L * L - perp2);
      ps.p.position.copy(AX).addScaledVector(ps.d, s + 0.03); ps.p.position.x = ps.x;
      tmp.copy(AX).addScaledVector(ps.d, s); tmp.x = ps.x;
      pinW.add(AX);
      dir.subVectors(tmp, pinW);
      ps.rod.position.copy(pinW).addScaledVector(dir, 0.5);
      ps.rod.scale.y = dir.length();
      ps.rod.quaternion.setFromUnitVectors(Y, dir.normalize());
    }
    cam.rotation.x = crank / 2;
    lobes.forEach((l, i) => { l.rotation.x = crank / 2 + i; });
    for (const v of valves) {
      const lift = Math.pow(Math.max(0, Math.sin(crank / 2 + v.ph)), 4) * 0.022;
      v.v.position.copy(v.base).addScaledVector(v.d, -lift);
    }
  }
  update(0);
  return { root, update };
}

/* ================= ILASHISH MUFTASI VA UZATMALAR QUTISI ================= */
export function buildGearbox(A = {}) {
  const root = new THREE.Group();
  const castM = (c) => mat(c, { metalness: 0.55, roughness: 0.55 });
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.25, 0.26, 32), castM(COL.cast)); bell.rotation.z = Math.PI / 2; bell.position.x = -0.14; root.add(casing(bell));
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.36), castM(COL.cast)); box.position.x = 0.27; root.add(casing(box));
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.22), castM(COL.red)); top.position.set(0.27, 0.245, 0); root.add(casing(top));
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), mat(COL.castDark)); lever.position.set(0.3, 0.4, 0); root.add(lever);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), mat(0x222222, { metalness: 0.1, roughness: 0.6 })); knob.position.set(0.3, 0.55, 0); root.add(knob);

  // ilashish muftasi: yetaklanuvchi disk va bosim diski
  const clutch = new THREE.Group(); clutch.position.x = -0.16; root.add(clutch);
  const disc = cylX(0.2, 0.018, 0x8a6a3a, 40); disc.material.metalness = 0.1; disc.material.roughness = 0.8; clutch.add(disc);
  const plate = cylX(0.19, 0.03, COL.steel, 40); plate.position.x = -0.04; clutch.add(plate);
  for (let i = 0; i < 6; i++) { const s = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), COL.brass); const a = i / 6 * Math.PI * 2; s.rotation.z = Math.PI / 2; s.position.set(-0.08, Math.cos(a) * 0.13, Math.sin(a) * 0.13); clutch.add(s); }

  // vallar
  const IN_Y = 0.07, CT_Y = -0.1, D = IN_Y - CT_Y;
  const inShaft = cylX(0.02, 0.62, COL.bright); inShaft.position.set(0.2, IN_Y, 0); root.add(inShaft);
  const ctShaft = cylX(0.02, 0.5, COL.bright); ctShaft.position.set(0.27, CT_Y, 0); root.add(ctShaft);
  const pairs = [];
  const RM = [0.06, 0.1, 0.085, 0.07, 0.05, 0.04]; // doimiy ilashish, 1..5
  const XS = [0.04, 0.12, 0.2, 0.28, 0.36, 0.44];
  RM.forEach((rm, i) => {
    const rc = D - rm;
    const gm = gear(rm, 0.035, 'x', i === 0 ? COL.brass : COL.gear); gm.position.set(XS[i], IN_Y, 0); root.add(gm);
    const gc = gear(rc, 0.035, 'x', COL.gearDark); gc.position.set(XS[i], CT_Y, 0); root.add(gc);
    pairs.push({ gm, gc, rm, rc, i });
  });
  // sinxronizator muftalari
  const syncs = [0.16, 0.32].map((x) => { const s = cylX(0.045, 0.03, COL.brass); s.position.set(x, IN_Y, 0); root.add(s); return s; });
  root.traverse((o) => { if (o.isMesh) o.userData.part = 'gearbox'; });

  let last = 0;
  // Haqiqiy modellar: ilashish muftasi va tishli g'ildiraklar
  let gears3d = null;
  if (A.clutch) { clutch.clear(); clutch.add(clutchModel(A.clutch)); }
  if (A.gearbox) {
    pairs.forEach((p) => { root.remove(p.gm); root.remove(p.gc); });
    syncs.forEach((x) => root.remove(x)); root.remove(inShaft); root.remove(ctShaft);
    gears3d = gearboxGears(A.gearbox);
    root.add(gears3d.group);
    box.geometry.dispose(); box.geometry = new THREE.BoxGeometry(0.82, 0.44, 0.44); box.position.set(0.33, 0, 0.05);
    top.position.set(0.33, 0.245, 0.05);
  }
  function update(crank, wheel, gearNo) {
    if (gears3d) gears3d.update(crank);
    clutch.rotation.x = crank;
    const ct = -crank * RM[0] / (D - RM[0]);
    for (const p of pairs) {
      spin(p.gc, ct + p.i * 0.3);
      spin(p.gm, p.i === 0 ? crank : -ct * p.rc / p.rm);
      const on = gearNo === p.i;
      const gmM = p.gm.children[0];
      if (gmM.userData.baseEmissive) gmM.userData.baseEmissive.setHex(on ? 0x664000 : 0x000000);
    }
    inShaft.rotation.x = crank;
    ctShaft.rotation.x = ct;
    // sinxronizator ulangan uzatma tomonga suriladi
    const g = gearNo;
    const tA = g === 1 ? -0.03 : g === 2 ? 0.03 : 0, tB = g === 3 ? -0.03 : g === 4 ? 0.03 : 0;
    syncs[0].position.x += (0.16 + tA - syncs[0].position.x) * 0.2;
    syncs[1].position.x += (0.32 + tB - syncs[1].position.x) * 0.2;
    syncs.forEach((s) => { s.rotation.x = wheel * 3; });
    last = crank;
  }
  return { root, update };
}

/* ================= TAQSIMLASH QUTISI ================= */
export function buildTransfer(A = {}) {
  const root = new THREE.Group();
  const castM = (c) => mat(c, { metalness: 0.55, roughness: 0.55 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.5), castM(COL.cast)); root.add(casing(box));
  const g1 = gear(0.075, 0.05, 'x'); g1.position.set(-0.05, 0.08, 0); root.add(g1);
  const g2 = gear(0.075, 0.05, 'x', COL.gearDark); g2.position.set(-0.05, -0.08, 0); root.add(g2);
  const g3 = gear(0.05, 0.04, 'x', COL.brass); g3.position.set(0.1, -0.08, 0.1); root.add(g3);
  const diff = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat(COL.steel)); diff.position.set(0.08, -0.08, -0.08); root.add(diff);
  root.traverse((o) => { if (o.isMesh) o.userData.part = 'transfer'; });
  if (A.transfer) { root.remove(box); root.add(transferHousing(A.transfer)); }
  function update(crank, wheel) { spin(g1, wheel * 4); spin(g2, -wheel * 4); spin(g3, wheel * 6); diff.rotation.x = wheel * 4; }
  return { root, update };
}

/* ================= KO'PRIK: BOSH UZATMA VA DIFFERENSIAL ================= */
// Konussimon (bevel) tishli g'ildirak: oddiy tishli g'ildirakni bir tomonga toraytiramiz.
const bevelCache = new Map();
function bevelGeo(r, width, teeth, taper) {
  const key = r + '|' + width + '|' + teeth + '|' + taper;
  if (bevelCache.has(key)) return bevelCache.get(key);
  const g = gearGeo(r, width, teeth).clone();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getZ(i) + width / 2) / width;           // 0 — keng tomon, 1 — tor tomon
    const k = 1 - taper * t;
    p.setXY(i, p.getX(i) * k, p.getY(i) * k);
  }
  g.computeVertexNormals();
  bevelCache.set(key, g);
  return g;
}
// facing: tor tomoni qaragan yo'nalish (+1/-1) o'q bo'ylab
function bevel(r, width, axis, color, taper = 0.45, facing = 1) {
  const teeth = Math.max(9, Math.round(r * 220));
  const inner = mesh(bevelGeo(r, width, teeth, taper), color, { flatShading: true });
  if (axis === 'z' && facing < 0) inner.rotation.x = Math.PI;
  const wrapG = new THREE.Group(); wrapG.add(inner);
  if (axis === 'x') wrapG.rotation.y = Math.PI / 2 * facing;
  if (axis === 'y') wrapG.rotation.x = -Math.PI / 2 * facing;
  const g = new THREE.Group(); g.add(wrapG); g.userData.axis = axis;
  return g;
}

// Ko'prik lokal o'qlari: x — old (kardan shu tomondan keladi), y — yuqori, z — g'ildiraklar tomon
export function buildDiff(A = {}) {
  const root = new THREE.Group();
  const castM = mat(COL.castDark, { metalness: 0.55, roughness: 0.55 });
  const house = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), castM);
  house.scale.set(1.15, 0.9, 1); root.add(casing(house));
  // bosh uzatma: yetaklanuvchi konussimon katta g'ildirak (z o'qi) va yetaklovchi shesternya (x o'qi)
  const ringG = bevel(0.135, 0.032, 'z', COL.brass, 0.32, -1); ringG.position.z = 0.055; root.add(ringG);
  const pinion = bevel(0.05, 0.07, 'x', COL.gear, 0.5, -1); pinion.position.set(0.1, 0, 0); root.add(pinion);
  // shesternya vali, podshipniklar va kardan flanetsi
  const pShaft = cylX(0.022, 0.2, COL.steel, 14); pShaft.position.set(0.22, 0, 0); root.add(pShaft);
  for (const x of [0.17, 0.25]) { const b = mesh(new THREE.TorusGeometry(0.03, 0.01, 8, 18), COL.bright); b.rotation.y = Math.PI / 2; b.position.set(x, 0, 0); root.add(b); }
  const flange = cylX(0.055, 0.02, COL.gearDark, 20); flange.position.set(0.33, 0, 0); root.add(flange);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; const bt = cylX(0.007, 0.03, COL.steel, 6); bt.position.set(0.335, Math.cos(a) * 0.038, Math.sin(a) * 0.038); root.add(bt); }
  // differensial korobkasi (ochiq ko'rinishda — ikki yarim jild), krestovina va 4 ta satellit
  const cage = new THREE.Group(); root.add(cage);
  const cupM = mat(COL.gearDark, { metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.03, 20, 1, true), cupM);
    cup.rotation.x = Math.PI / 2; cup.position.z = s * 0.075; cage.add(cup);
  }
  const crossA = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.15, 8), COL.steel); cage.add(crossA);
  const crossB = crossA.clone(); crossB.rotation.z = Math.PI / 2; cage.add(crossB);
  for (const [ax, s] of [['y', 1], ['y', -1], ['x', 1], ['x', -1]]) {
    const sp = bevel(0.03, 0.026, ax, COL.gearDark, 0.45, -s);
    sp.position[ax] = s * 0.052; cage.add(sp);
  }
  // yarim o'q shesternyalari va chiqish vallari (shlitsli)
  const side = [-1, 1].map((s) => { const g = bevel(0.04, 0.028, 'z', COL.gear, 0.4, -s); g.position.z = s * 0.045; root.add(g); return g; });
  const outs = [-1, 1].map((s) => {
    const o = new THREE.Group(); o.userData.axis = 'z';
    const sh = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 12), COL.steel); sh.rotation.x = Math.PI / 2; o.add(sh);
    for (let i = 0; i < 6; i++) { const sp = mesh(new THREE.BoxGeometry(0.006, 0.006, 0.07), COL.bright); const a = i / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.021, Math.sin(a) * 0.021, s * 0.04); o.add(sp); }
    const fl = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 18), COL.gearDark); fl.rotation.x = Math.PI / 2; fl.position.z = s * 0.085; o.add(fl);
    o.position.z = s * 0.13; root.add(o); return o;
  });
  root.traverse((o) => { if (o.isMesh) o.userData.part = 'axles'; });
  if (A.diff) { root.remove(house); root.add(diffHousing(A.diff)); }
  function update(crank, wheel) {
    const a = wheel * 2.5;
    spin(ringG, a); cage.rotation.z = a;
    spin(pinion, -a * 0.135 / 0.05); pShaft.rotation.x = flange.rotation.x = -a * 0.135 / 0.05;
    side.forEach((g) => spin(g, a)); outs.forEach((g) => spin(g, a));
  }
  return { root, update };
}
