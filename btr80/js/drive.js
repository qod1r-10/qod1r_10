// Yurgizish rejimi: harakat, rul, minora va kuch uzatilishini ko'rsatish.
// Mashina joyida turadi, yer (to'r va belgilar) uning ostidan harakatlanadi.
import * as THREE from 'three';
import { buildKPVT, buildPKT } from './weapons.js';

const KMH = 3.6;
const VMAX = 80 / KMH;            // m/s
const VREV = -8 / KMH;
const GEARS = [[0, 12], [12, 24], [24, 40], [40, 58], [58, 80]]; // km/soat oraliqlari
const WHEEL_R = 0.6;

export const FLOW_PARTS = new Set(['crank', 'valvetrain', 'gearbox', 'transfer', 'shafts', 'axles', 'wheels']);

export const FLOW_STEPS = [
  ['Dvigatel', "KamAZ-7403 yonilg'i yonishidan hosil bo'lgan issiqlik energiyasini tirsakli valning aylanishiga aylantiradi."],
  ['Ilashish muftasi', "Dvigatelni transmissiyaga ravon ulaydi va uzatma almashtirishda vaqtincha ajratadi."],
  ['Uzatmalar qutisi', "Uzatish sonini (1–5, orqaga) o'zgartirib, tezlik va tortish kuchini moslaydi."],
  ['Taqsimlash qutisi', "Momentni oldingi va orqa ko'priklarga bo'ladi; suv to'piga ham quvvat beradi."],
  ['Kardan uzatmalari', "Aylanishni to'rtta ko'prikning bosh uzatmalariga yetkazadi."],
  ["Ko'priklar", "Bosh uzatma momentni 90° buradi, differensial uni chap va o'ng g'ildirakka taqsimlaydi."],
  ["G'ildiraklar", "G'ildirak reduktorlari orqali sakkizala g'ildirak yetaklovchi (8×8)."],
];

export function createDrive(ctx) {
  const { scene, real, interior, axles, getGrid, shadowGround } = ctx;
  const S = { elev: 0, on: false, idle: false, slow: false, crank: 0, wheelAng: 0, flow: false, v: 0, heading: 0, steer: 0, turret: 0, px: 0, pz: 0, rpm: 800, gear: 'N', t: 0 };
  const keys = new Set();

  /* --- harakatlanuvchi qismlar --- */
  const wheels = [];
  const body = [];
  let turretPivot = null, gunPivot = null;
  const extra = [];
  const GUN_REST = Math.atan2(0.52, 1.08);
  if (real) {
    turretPivot = new THREE.Group();
    turretPivot.position.set(0, 0, 0.97);
    real.add(turretPivot);
    const TURRET = new Set(['turret', 'kpvt', 'pkt', 'sight', 'smoke']);
    [...real.children].forEach((o) => {
      if (!o.isMesh) return;
      const [part, , wi] = o.name.split('__');
      if (part === 'wheels' && wi !== undefined) {
        o.rotation.order = 'YXZ';
        wheels.push({ mesh: o, axle: Math.floor(+wi / 2) });
      } else if (TURRET.has(part)) {
        turretPivot.attach(o);
      } else {
        body.push({ o, y: o.position.y });
      }
    });
    // Qurol beshigi: KPVT va PKT o'q (tsapfa) atrofida ko'tariladi/tushadi.
    // Modelda stvol 25.7° ko'tarilgan holda; GUN_REST uni gorizontal holatga keltiradi.
    gunPivot = new THREE.Group();
    gunPivot.position.set(0, 2.2, 1.36 - 0.97);
    turretPivot.add(gunPivot);
    turretPivot.updateMatrixWorld(true);
    [...turretPivot.children].forEach((o) => {
      if (o.isMesh && /^(kpvt|pkt)__/.test(o.name)) gunPivot.attach(o);
    });
    // Pulemyotlarning minora ichidagi qismlari (beshik bilan birga harakatlanadi)
    const rig = new THREE.Group();
    rig.rotation.x = -GUN_REST;
    rig.add(buildKPVT(), buildPKT());
    gunPivot.add(rig);
    rig.traverse((o) => { if (o.isMesh) extra.push(o); });
    body.push({ o: turretPivot, y: turretPivot.position.y });
  }
  body.push({ o: interior, y: interior.position.y });

  const spinners = [];
  const shakers = [];
  const shaftGroups = new Set();
  interior.traverse((o) => { if (o.userData.spinShaft) { shaftGroups.add(o); spinners.push({ o, k: 3.2 }); } });
  const inShaftGroup = (o) => { for (let p = o.parent; p; p = p.parent) if (shaftGroups.has(p)) return true; return false; };
  interior.traverse((o) => {
    if (!o.isMesh || inShaftGroup(o)) return;
    const p = o.userData.part;
    if (p === 'shafts' || (p === 'axles' && o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.height > 1)) spinners.push({ o, k: p === 'shafts' ? 3.2 : 1 });
    if (o.name === 'fan') spinners.push({ o, k: 0, fan: true });
    if (o.name === 'pulley') spinners.push({ o, k: 0, fan: true });
  });
  const mechs = interior.userData.mechs || [];

  /* --- yer (dala) --- */
  // Mashina joyida turadi; yer teksturasi uning ostidan suriladi.
  const TILE = 6; // bitta tekstura bo'lagi, metr
  function groundTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#86775a'; g.fillRect(0, 0, 512, 512);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const blot = (n, rMin, rMax, colors, alpha) => {
      for (let i = 0; i < n; i++) {
        const x = rnd() * 512, y = rnd() * 512, r = rMin + rnd() * (rMax - rMin);
        g.globalAlpha = alpha * (0.5 + rnd() * 0.5);
        g.fillStyle = colors[Math.floor(rnd() * colors.length)];
        for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { g.beginPath(); g.ellipse(x + dx, y + dy, r, r * (0.6 + rnd() * 0.5), rnd() * 3, 0, 7); g.fill(); }
      }
    };
    blot(60, 30, 90, ['#7b6d50', '#94845f', '#6f6a46', '#8f7c58'], 0.35);   // tuproq dog'lari
    blot(90, 6, 22, ['#6b6b40', '#76703f', '#5f6238'], 0.45);               // quruq o't
    blot(700, 0.8, 2.5, ['#5a503c', '#a89a78', '#4d4535', '#b3a684'], 0.8); // mayda toshlar
    g.globalAlpha = 1;
    const img = g.getImageData(0, 0, 512, 512), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  function fadeTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const SIZE = 90;
  const groundMap = groundTexture();
  groundMap.repeat.set(SIZE / TILE, SIZE / TILE);
  const world = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshStandardMaterial({ map: groundMap, alphaMap: fadeTexture(), transparent: true, depthWrite: false, roughness: 0.97, metalness: 0 }),
  );
  world.rotation.x = -Math.PI / 2;
  world.position.y = -0.005;
  world.receiveShadow = true;
  world.renderOrder = -1;
  world.visible = false;
  scene.add(world);

  /* --- kuch oqimi zarralari --- */
  const flow = new THREE.Group();
  flow.visible = false;
  interior.add(flow);
  const chains = [];
  const E = [-2.85, 0.95, 0], G = [-2.12, 0.88, 0], T = [-0.05, 0.78, 0];
  for (const ax of axles) for (const s of [-1, 1]) {
    chains.push([E, G, T, [ax, 0.6, 0], [ax, 0.56, s * 1.14]].map((p) => new THREE.Vector3(...p)));
  }
  const dotGeo = new THREE.SphereGeometry(0.045, 10, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffb02e, depthTest: false, transparent: true });
  const dots = [];
  chains.forEach((pts, ci) => {
    const lens = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); lens.push(d); L += d; }
    for (let k = 0; k < 7; k++) {
      const m = new THREE.Mesh(dotGeo, dotMat);
      m.renderOrder = 20;
      flow.add(m);
      dots.push({ m, pts, lens, L, phase: k / 7 + ci * 0.013 });
    }
  });
  const at = (d, u) => {
    let s = u * d.L;
    for (let i = 0; i < d.lens.length; i++) {
      if (s <= d.lens[i]) return d.m.position.lerpVectors(d.pts[i], d.pts[i + 1], s / d.lens[i]);
      s -= d.lens[i];
    }
    return d.m.position.copy(d.pts[d.pts.length - 1]);
  };

  /* --- boshqaruv --- */
  const typing = (e) => /input|textarea|select/i.test(e.target.tagName);
  const MAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'tl', KeyE: 'tr', KeyR: 'gu', KeyF: 'gd', Space: 'brake' };
  window.addEventListener('keydown', (e) => {
    if (!S.on || typing(e) || !MAP[e.code]) return;
    keys.add(MAP[e.code]);
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { if (MAP[e.code]) keys.delete(MAP[e.code]); });
  window.addEventListener('blur', () => keys.clear());
  document.querySelectorAll('[data-hold]').forEach((b) => {
    const k = b.dataset.hold;
    const on = (e) => { e.preventDefault(); keys.add(k); b.classList.add('is-held'); b.setPointerCapture?.(e.pointerId); };
    const off = () => { keys.delete(k); b.classList.remove('is-held'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
  });

  const hud = {
    speed: document.getElementById('hud-speed'),
    gear: document.getElementById('hud-gear'),
    rpm: document.getElementById('hud-rpm'),
    rpmVal: document.getElementById('hud-rpm-val'),
  };

  function setOn(v) {
    S.on = v;
    world.visible = v;
    if (!v) {
      keys.clear();
      S.v = 0; S.steer = 0;
    }
  }
  function setFlow(v) { S.flow = v; flow.visible = v; }

  function update(dt) {
    S.t += dt;
    if (S.on) {
      const up = keys.has('up'), down = keys.has('down'), brake = keys.has('brake');
      if (brake) S.v -= Math.sign(S.v) * Math.min(Math.abs(S.v), 9 * dt);
      else if (up) S.v = S.v < 0 ? Math.min(0, S.v + 7 * dt) : Math.min(VMAX, S.v + (2.8 - 1.9 * S.v / VMAX) * dt);
      else if (down) S.v = S.v > 0 ? Math.max(0, S.v - 7 * dt) : Math.max(VREV, S.v - 1.5 * dt);
      else S.v -= Math.sign(S.v) * Math.min(Math.abs(S.v), (0.6 + Math.abs(S.v) * 0.03) * dt);

      const steerT = (keys.has('left') ? 1 : 0) - (keys.has('right') ? 1 : 0);
      S.steer += (steerT * 0.45 - S.steer) * Math.min(1, dt * 4);
      S.heading += (S.v * Math.tan(S.steer * 0.8) / 3.4) * dt;
      S.px += Math.sin(S.heading) * S.v * dt;
      S.pz += Math.cos(S.heading) * S.v * dt;

      const tr = (keys.has('tl') ? 1 : 0) - (keys.has('tr') ? 1 : 0);
      S.turret += tr * dt * 0.9;
      const el = (keys.has('gu') ? 1 : 0) - (keys.has('gd') ? 1 : 0);
      S.elev = Math.min(60, Math.max(-4, S.elev + el * dt * 25)); // 1PZ-2: −4° … +60°
    }

    // uzatma va aylanishlar
    const kmh = S.v * KMH, a = Math.abs(kmh);
    if (S.v < -0.05) { S.gear = 'R'; S.rpm = 900 + a / 8 * 1500; }
    else if (a < 0.3) { S.gear = keys.has('up') ? '1' : 'N'; S.rpm = 800; }
    else {
      const gi = GEARS.findIndex(([lo, hi]) => a >= lo && a < hi);
      const g = gi < 0 ? 4 : gi;
      const [lo, hi] = GEARS[g];
      S.gear = String(g + 1);
      S.rpm = 1000 + Math.min(1, (a - lo) / (hi - lo)) * 1600;
    }
    const running = S.on || S.idle;
    const slow = S.slow ? 0.25 : 1;
    const engineSpin = running ? S.rpm / 60 * Math.PI * 2 * 0.1 * slow : 0;
    S.crank += engineSpin * dt;

    // g'ildiraklar
    const wr = S.v / WHEEL_R * dt;
    S.wheelAng += wr;
    const gNo = /^[1-5]$/.test(S.gear) ? +S.gear : 0;
    for (const m of mechs) m.update(S.crank, S.wheelAng, gNo);
    for (const w of wheels) {
      w.mesh.rotation.x += wr;
      w.mesh.rotation.y = w.axle === 0 ? S.steer : w.axle === 1 ? S.steer * 0.55 : 0;
    }
    for (const s of spinners) {
      s.o.rotateY(s.fan ? engineSpin * dt * 2 : wr * s.k);
    }
    // korpus tebranishi
    const bob = S.on ? Math.sin(S.t * 9) * 0.004 * Math.min(1, a / 30) + Math.sin(S.t * 2.3) * 0.006 * Math.min(1, a / 50) : 0;
    for (const b of body) b.o.position.y = b.y + bob;
    const shake = S.on ? Math.sin(S.t * S.rpm / 60 * 6.28) * 0.004 : 0;
    for (const s of shakers) s.o.position.y = s.y + shake;
    if (turretPivot) turretPivot.rotation.y = S.turret;
    if (gunPivot) gunPivot.rotation.x = GUN_REST - S.elev * Math.PI / 180;

    // yer harakati
    world.visible = S.on;
    const grid = getGrid();
    if (grid) grid.visible = !S.on;
    if (shadowGround) shadowGround.visible = !S.on;
    if (S.on) {
      world.rotation.z = -S.heading; // yotqizilgan tekislikning z o'qi vertikal o'qqa to'g'ri keladi
      groundMap.offset.set(S.px / TILE, -S.pz / TILE);
    }

    // kuch oqimi
    if (S.flow) {
      const sp = 0.12 + (S.on ? S.rpm / 2600 * 0.5 : 0.1);
      for (const d of dots) at(d, (d.phase + S.t * sp) % 1);
      dotMat.opacity = 0.75 + 0.25 * Math.sin(S.t * 6);
    }

    // panel
    if (S.on && hud.speed) {
      hud.speed.textContent = Math.round(a);
      hud.gear.textContent = S.gear;
      hud.rpm.style.transform = `scaleX(${(S.rpm / 2600).toFixed(3)})`;
      hud.rpmVal.textContent = Math.round(S.rpm / 10) * 10;
    }
  }

  return { state: S, setOn, setFlow, update, extra };
}
