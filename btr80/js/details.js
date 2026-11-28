// O'zimiz yasagan batafsil detallar: haydovchi asboblar paneli (ko'rsatkichlari jonli),
// R-163-50U radiostansiyasi, filtr-ventilyatsiya qurilmasi, suv otgich (parragi aylanadi).
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.45, roughness: 0.55, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const OLIVE = 0x4f5a37, DARK = 0x2b2e30, STEEL = 0x9ba1a6;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const redraw = (...a) => { draw(c.getContext('2d'), w, h, ...a); t.needsUpdate = true; };
  redraw();
  return { tex: t, redraw };
}

/* ---------- Haydovchi asboblar paneli (BTR-80 paneli uslubida) ---------- */
// Raqamli shkalali strelkali asbob. ticks: [qiymatlar], vmax — shkala oxiri
function dial(g, x, y, r, value, vmax, ticks, caption, unit, redFrom = null) {
  g.fillStyle = '#5d6455'; g.beginPath(); g.arc(x, y, r * 1.12, 0, 7); g.fill();          // gardish
  g.fillStyle = '#2c302a'; g.beginPath(); g.arc(x, y, r * 1.05, 0, 7); g.fill();
  g.fillStyle = '#0e0f0e'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = (v) => a0 + (a1 - a0) * Math.min(1, Math.max(0, v / vmax));
  if (redFrom !== null) { g.strokeStyle = '#b5332a'; g.lineWidth = r * 0.09; g.beginPath(); g.arc(x, y, r * 0.86, ang(redFrom), a1); g.stroke(); }
  g.strokeStyle = '#ece8da'; g.fillStyle = '#ece8da'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = (ticks.length - 1) * 5;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, major = i % 5 === 0;
    g.lineWidth = major ? r * 0.035 : r * 0.018;
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * (major ? 0.74 : 0.8), y + Math.sin(a) * r * (major ? 0.74 : 0.8)); g.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); g.stroke();
  }
  g.font = `bold ${Math.round(r * 0.2)}px sans-serif`;
  ticks.forEach((t, i) => { const a = a0 + (a1 - a0) * i / (ticks.length - 1); g.fillText(String(t), x + Math.cos(a) * r * 0.56, y + Math.sin(a) * r * 0.56); });
  g.font = `${Math.round(r * 0.15)}px sans-serif`; g.fillText(unit, x, y + r * 0.5);
  if (caption) { g.font = `bold ${Math.round(r * 0.17)}px sans-serif`; g.fillText(caption, x, y - r * 0.3); }
  const a = ang(value);
  g.strokeStyle = '#f1efe6'; g.lineWidth = r * 0.06; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - Math.cos(a) * r * 0.12, y - Math.sin(a) * r * 0.12); g.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); g.stroke();
  g.fillStyle = '#3a3d38'; g.beginPath(); g.arc(x, y, r * 0.1, 0, 7); g.fill();
  g.lineCap = 'butt'; g.textBaseline = 'alphabetic';
}
function plate(g, x, y, w, text) {
  g.fillStyle = '#c9c7bb'; g.fillRect(x - w / 2, y - 11, w, 22);
  g.strokeStyle = '#6f7266'; g.lineWidth = 1.5; g.strokeRect(x - w / 2, y - 11, w, 22);
  g.fillStyle = '#1d1f1b'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(text, x, y + 5);
}
function toggle(g, x, y, up) {
  g.fillStyle = '#2a2c29'; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill();
  g.fillStyle = '#b9bcb4'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
  g.strokeStyle = '#d5d7d0'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (up ? -24 : 24)); g.stroke(); g.lineCap = 'butt';
}
function lamp(g, x, y, col, on) {
  g.fillStyle = '#3b3e38'; g.beginPath(); g.arc(x, y, 19, 0, 7); g.fill();
  const grd = g.createRadialGradient(x - 4, y - 4, 2, x, y, 15);
  grd.addColorStop(0, on ? '#fff' : col); grd.addColorStop(1, on ? col : shade(col));
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill();
}
const shade = (c) => '#' + c.slice(1).match(/../g).map((h) => Math.round(parseInt(h, 16) * 0.35).toString(16).padStart(2, '0')).join('');
function screw(g, x, y) { g.fillStyle = '#80857a'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.strokeStyle = '#4a4d46'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.stroke(); }

export function buildDashboard() {
  const W = 1600, H = 560;
  const { tex, redraw } = canvasTex(W, H, (g, w, h, kmh = 0, rpm = 0, on = false) => {
    g.fillStyle = '#7e8574'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(255,255,255,0.08)'); grd.addColorStop(1, 'rgba(0,0,0,0.15)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5b6152'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30], [w / 2, 30]].forEach(([x, y]) => screw(g, x, y));
    // kichik asboblar
    const small = [
      ['МАСЛО', 'кгс/см²', on ? 4.2 : 0, 8, [0, 2, 4, 6, 8], 'ДАВЛ. МАСЛА', null],
      ['°C', '', on ? 82 : 20, 120, [40, 60, 80, 100, 120], 'ТЕМП. ЖИДКОСТИ', 100],
      ['°C', '', on ? 75 : 20, 150, [50, 75, 100, 125, 150], 'ТЕМП. МАСЛА', 120],
      ['', '', 0.75, 1, [0, '¼', '½', '¾', 1], 'ТОПЛИВО', null],
      ['A', '', on ? 12 : 0, 60, [-60, -30, 0, 30, 60], 'АМПЕРМЕТР', null],
    ];
    small.forEach(([cap, unit, v, max, ticks, lab, red], i) => {
      const x = 105 + i * 155, y = 150;
      dial(g, x, y, 62, cap === 'A' ? v + 60 : (ticks[0] === 40 ? v - 40 : ticks[0] === 50 ? v - 50 : v), cap === 'A' ? 120 : (ticks[0] === 40 ? 80 : ticks[0] === 50 ? 100 : max), ticks, cap, unit, red !== null ? (ticks[0] === 40 ? red - 40 : red - 50) : null);
      plate(g, x, y + 92, 140, lab);
    });
    // katta asboblar
    dial(g, 955, 175, 118, kmh, 120, [0, 20, 40, 60, 80, 100, 120], '', 'км/ч'); plate(g, 955, 318, 150, 'СПИДОМЕТР');
    g.fillStyle = '#d9d6c8'; g.fillRect(925, 205, 62, 18); g.fillStyle = '#111'; g.font = 'bold 15px monospace'; g.textAlign = 'center'; g.fillText('03826', 956, 219);
    dial(g, 1215, 175, 118, rpm / 100, 30, [0, 5, 10, 15, 20, 25, 30], '', 'об/мин ×100', 26); plate(g, 1215, 318, 150, 'ТАХОМЕТР');
    dial(g, 1460, 175, 105, 3.0, 10, [0, 2, 4, 6, 8, 10], 'ШИНЫ', 'кгс/см²'); plate(g, 1460, 318, 130, 'ДАВЛЕНИЕ В ШИНАХ');
    // tumblerlar
    ['ЗАЖИГАНИЕ', 'СТАРТЕР', 'ФАРЫ', 'ОТОПИТЕЛЬ', 'НАСОС', 'ПЕРЕДН. МОСТ', 'ВОДОМЁТ', 'ГАБАРИТЫ', 'ПРИБОРЫ'].forEach((l, i) => {
      const x = 80 + i * 82, y = 330; toggle(g, x, y, on && i !== 1 && i !== 6); g.save(); g.translate(x, y + 58); g.rotate(-0.35); g.fillStyle = '#1d1f1b'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText(l, 0, 0); g.restore();
    });
    plate(g, 410, 430, 640, 'ВЫКЛЮЧАТЕЛИ');
    // nazorat chiroqlari
    [['#c0392b', 'МАСЛО', !on], ['#2e9e4f', 'ТЕРМОСТАТ', on], ['#e0a020', 'ГЕНЕРАТОР', !on], ['#e07b20', 'ТОРМОЗ', false], ['#c0392b', 'ПОЖАР', false], ['#2f6fd0', 'ДАЛЬНИЙ', false]].forEach(([c, l, o], i) => {
      const x = 860 + (i % 3) * 95, y = 400 + Math.floor(i / 3) * 80; lamp(g, x, y, c, o);
      g.fillStyle = '#1d1f1b'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText(l, x, y + 34);
    });
    // knopkalar
    [['СТАРТЕР', '#2a2c29'], ['ЗВУК. СИГНАЛ', '#2a2c29'], ['ЖАЛЮЗИ', '#b0302a'], ['МАССА', '#2a2c29']].forEach(([l, c], i) => {
      const x = 1190 + (i % 2) * 150, y = 400 + Math.floor(i / 2) * 80;
      g.fillStyle = '#3b3e38'; g.beginPath(); g.arc(x, y, 20, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill();
      plate(g, x, y + 36, 120, l);
    });
    g.fillStyle = '#2e322b'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('БТР-80', 640, 520);
  });
  const g = new THREE.Group();
  const body = box(0.16, 0.32, 0.9, M(0x737a69, { metalness: 0.35, roughness: 0.6 })); g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.308), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.15 }));
  face.rotation.y = -Math.PI / 2; face.position.x = -0.081; g.add(face);
  const hood = box(0.12, 0.02, 0.9, M(0x737a69)); hood.position.set(-0.07, 0.165, 0); hood.rotation.z = 0.15; g.add(hood);
  let t = 0;
  return { group: g, update(kmh, rpm, on, dt) { t += dt; if (t > 0.15) { t = 0; redraw(kmh, rpm, on); } } };
}

// BTR-80 ruli: katta, uch kegayli, qora
export function buildSteeringWheel() {
  const g = new THREE.Group();
  const black = M(0x161716, { metalness: 0.1, roughness: 0.55 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.017, 12, 48), black); g.add(rim);
  const hub = cyl(0.045, 0.05, 0.05, black, 20); hub.rotation.x = Math.PI / 2; g.add(hub);
  [Math.PI / 2, Math.PI / 2 + 2.3, Math.PI / 2 - 2.3].forEach((a) => {
    const sp = box(0.2, 0.03, 0.014, black);
    sp.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.01); sp.rotation.z = a; g.add(sp);
  });
  return g;
}

/* ---------- R-163-50U radiostansiyasi ---------- */
export function buildRadio() {
  const { tex } = canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#56603f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3b4329'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#101410'; g.fillRect(40, 40, 230, 70);
    g.fillStyle = '#7dff6a'; g.font = 'bold 44px monospace'; g.fillText('43.875', 56, 92);
    g.fillStyle = '#e8e4d2'; g.font = 'bold 26px monospace'; g.fillText('Р-163-50У', 300, 70);
    g.font = '18px monospace'; g.fillText('UQT RADIOSTANSIYA', 300, 98);
    const knob = (x, y, r, lab) => { g.fillStyle = '#1c1e1c'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#9aa'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - r); g.stroke(); g.fillStyle = '#e8e4d2'; g.font = '16px monospace'; g.textAlign = 'center'; g.fillText(lab, x, y + r + 20); g.textAlign = 'left'; };
    knob(90, 200, 34, 'KANAL'); knob(210, 200, 28, 'OVOZ'); knob(320, 200, 28, "SHOVQIN"); knob(430, 200, 34, 'REJIM');
    for (let i = 0; i < 10; i++) { g.fillStyle = '#d8d4c4'; g.fillRect(50 + i * 42, 300, 30, 40); g.fillStyle = '#222'; g.font = '18px monospace'; g.fillText(String(i), 58 + i * 42, 328); }
  });
  const g = new THREE.Group();
  const body = box(0.36, 0.32, 0.42, M(OLIVE)); g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.315), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  face.rotation.y = Math.PI / 2; face.position.x = 0.181; g.add(face);
  for (const z of [-0.19, 0.19]) { const hnd = box(0.06, 0.02, 0.02, M(STEEL)); hnd.position.set(0.21, 0.13, z); g.add(hnd); }
  const set = box(0.12, 0.05, 0.05, M(DARK)); set.position.set(0.24, -0.08, 0.26); set.rotation.z = 0.4; g.add(set);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 24, Math.PI * 1.4), M(DARK)); cord.position.set(0.22, -0.02, 0.24); cord.rotation.y = Math.PI / 2; g.add(cord);
  const pow = box(0.36, 0.22, 0.3, M(0x434b32)); pow.position.set(0, -0.28, 0); g.add(pow);
  return g;
}

/* ---------- Filtr-ventilyatsiya qurilmasi ---------- */
export function buildFVU() {
  const g = new THREE.Group();
  const filt = cyl(0.15, 0.15, 0.42, M(0x6f7f8f), 28); filt.position.y = 0.1; g.add(filt);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.008, 6, 28), M(0x56636f)); r.rotation.x = Math.PI / 2; r.position.y = -0.08 + i * 0.09; g.add(r); }
  const cap = cyl(0.12, 0.15, 0.05, M(0x56636f), 28); cap.position.y = 0.34; g.add(cap);
  const fan = cyl(0.13, 0.13, 0.16, M(0x4f5a37), 24); fan.rotation.z = Math.PI / 2; fan.position.set(0.0, -0.22, 0); g.add(fan);
  const motor = cyl(0.08, 0.08, 0.14, M(DARK), 18); motor.rotation.z = Math.PI / 2; motor.position.set(-0.15, -0.22, 0); g.add(motor);
  const duct = cyl(0.045, 0.045, 0.5, M(STEEL), 14); duct.position.set(0.08, 0.6, 0.12); duct.rotation.x = 0.3; g.add(duct);
  return g;
}

/* ---------- Suv otgich harakatlantirgichi ----------
   Lokal o'qlar: x — old, y — yuqori, z — yon. Suv korpus tubidagi panjarali kirish teshigidan
   so'riladi, eksial parrak uni tezlatadi, to'g'rilovchi kurakchalar aylanishni yo'qotadi, oqim orqadagi
   soplodan chiqadi. Ikki suv ruli oqimni chapga-o'ngga og'diradi; quruqlikda chiqish qopqoq bilan yopiladi. */
export function buildWaterjet() {
  const g = new THREE.Group();
  const olv = M(OLIVE, { metalness: 0.35, roughness: 0.6, side: THREE.DoubleSide });
  const steel = M(STEEL, { metalness: 0.8, roughness: 0.3 });
  const bronze = M(0xc39a45, { metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
  const flangeAt = (x, r) => { const f = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 8, 32), M(OLIVE, { metalness: 0.4, roughness: 0.55 })); f.rotation.y = Math.PI / 2; f.position.x = x; g.add(f);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const bt = cyl(0.008, 0.008, 0.05, steel, 6); bt.rotation.z = Math.PI / 2; bt.position.set(x, Math.cos(a) * (r + 0.012), Math.sin(a) * (r + 0.012)); g.add(bt); } };
  // kirish tunneli: tubdagi teshikdan yuqoriga-orqaga egilgan quvur
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0.78, -0.3, 0), new THREE.Vector3(0.6, -0.17, 0), new THREE.Vector3(0.36, -0.02, 0), new THREE.Vector3(0.22, 0, 0)]);
  const tunnel = new THREE.Mesh(new THREE.TubeGeometry(path, 24, 0.2, 24, false), olv); g.add(tunnel);
  // kirish panjarasi (korpus tubi sathida)
  const grate = new THREE.Group();
  const gFrame = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.016, 6, 28), M(OLIVE, { metalness: 0.4 })); gFrame.scale.set(1.6, 1, 1); gFrame.rotation.x = Math.PI / 2; grate.add(gFrame);
  for (let i = -3; i <= 3; i++) { const bar = box(0.012, 0.03, 0.4 * Math.sqrt(1 - (i / 4) ** 2), steel); bar.position.x = i * 0.045; grate.add(bar); }
  grate.position.set(0.8, -0.33, 0); grate.rotation.z = -0.15; g.add(grate);
  // parrak korpusi (flanetsli) va to'g'rilovchi apparat korpusi
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.3, 28, 1, true), olv); housing.rotation.z = Math.PI / 2; housing.position.x = 0.07; g.add(housing);
  housing.userData.casing = true;
  flangeAt(0.22, 0.21); flangeAt(-0.08, 0.21);
  const stator = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.2, 28, 1, true), olv); stator.rotation.z = Math.PI / 2; stator.position.x = -0.18; g.add(stator);
  stator.userData.casing = true;
  // eksial parrak: 8 ta qiya kurak, gupchak va konussimon qopqoq
  const imp = new THREE.Group(); imp.name = 'impeller';
  const hub = cyl(0.055, 0.065, 0.14, bronze); hub.rotation.z = Math.PI / 2; imp.add(hub);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.09, 16), bronze); cone.rotation.z = -Math.PI / 2; cone.position.x = 0.115; imp.add(cone);
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Group(); p.rotation.x = (i / 8) * Math.PI * 2;
    const blade = box(0.1, 0.14, 0.008, bronze); blade.position.y = 0.125; blade.rotation.y = 0.75; p.add(blade); imp.add(p);
  }
  imp.position.x = 0.08; g.add(imp);
  // to'g'rilovchi kurakchalar (qo'zg'almas, 6 ta)
  const vaneHub = cyl(0.05, 0.035, 0.18, steel); vaneHub.rotation.z = Math.PI / 2; vaneHub.position.x = -0.18; g.add(vaneHub);
  for (let i = 0; i < 6; i++) { const p = new THREE.Group(); p.rotation.x = (i / 6) * Math.PI * 2 + 0.26; const v = box(0.16, 0.15, 0.007, steel); v.position.y = 0.12; v.rotation.y = -0.15; p.add(v); p.position.x = -0.18; g.add(p); }
  // soplo
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.2, 28, 1, true), olv); nozzle.rotation.z = Math.PI / 2; nozzle.position.x = -0.38; g.add(nozzle);
  nozzle.userData.casing = true;
  flangeAt(-0.28, 0.19);
  // yuritma vali: tunnel devoridan o'tadi, kardan sharniri bilan
  const shaft = cyl(0.025, 0.025, 0.62, steel); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.45; g.add(shaft);
  const seal = cyl(0.05, 0.05, 0.05, M(DARK)); seal.rotation.z = Math.PI / 2; seal.position.x = 0.4; g.add(seal);
  const uj = new THREE.Group(); const yk = box(0.05, 0.07, 0.07, M(DARK)); uj.add(yk); const cr = cyl(0.012, 0.012, 0.1, steel, 8); cr.rotation.x = Math.PI / 2; uj.add(cr); uj.position.x = 0.78; g.add(uj);
  // ikki suv ruli (vertikal, soplo ortida) — drive.js rul bilan buradi
  const rudders = [-1, 1].map((s) => {
    const r = new THREE.Group();
    const plate = box(0.2, 0.34, 0.016, M(OLIVE, { metalness: 0.35, roughness: 0.6 })); plate.position.x = -0.09; r.add(plate);
    const axle = cyl(0.014, 0.014, 0.44, steel, 8); r.add(axle);
    r.position.set(-0.52, -0.02, s * 0.09); g.add(r); return r;
  });
  // ruli tortqisi
  const tie = cyl(0.01, 0.01, 0.2, steel, 6); tie.rotation.x = Math.PI / 2; tie.position.set(-0.52, 0.22, 0); g.add(tie);
  // zirhli chiqish qopqog'i: yuqori sharnirda, quruqlikda yopiq, suvda ochiladi
  const shutter = new THREE.Group();
  const lid = box(0.03, 0.46, 0.5, M(OLIVE, { metalness: 0.35, roughness: 0.6 })); lid.position.y = -0.23; shutter.add(lid);
  for (const zz of [-0.17, 0.17]) { const hg = cyl(0.025, 0.025, 0.08, steel, 10); hg.rotation.x = Math.PI / 2; hg.position.z = zz; shutter.add(hg); }
  const arm = box(0.03, 0.03, 0.22, M(DARK)); arm.position.set(0.08, 0.02, 0); shutter.add(arm);
  shutter.position.set(-0.76, 0.23, 0); g.add(shutter);
  return { group: g, impeller: imp, rudders, shutter };
}

/* ---------- Chig'ir (korpus burun qismida) ----------
   Lokal o'qlar: x — old, y — yuqori, z — yon. Baraban o'qi z bo'ylab, chervyakli reduktor +z yonida,
   yuritma vali orqaga (taqsimlash qutisi tomon) ketadi, tros roliklarli yo'naltirgich orqali oldinga chiqadi. */
export function buildWinch() {
  const g = new THREE.Group();
  const olv = M(OLIVE, { metalness: 0.35, roughness: 0.6 });
  const steel = M(STEEL, { metalness: 0.8, roughness: 0.3 });
  const rope = M(0x5a5d5e, { metalness: 0.7, roughness: 0.45 });
  const L = 0.42, R = 0.075, RF = 0.13;
  // rama: asos va ikki yon devor
  const base = box(0.36, 0.02, L + 0.14, olv); base.position.y = -0.16; g.add(base);
  for (const s of [-1, 1]) { const cheek = box(0.3, 0.3, 0.02, olv); cheek.position.set(0, -0.02, s * (L / 2 + 0.05)); g.add(cheek); }
  // baraban, gardishlari va unga o'ralgan tros (spiral)
  const drum = new THREE.Group();
  const core = cyl(R, R, L, steel, 24); core.rotation.x = Math.PI / 2; drum.add(core);
  for (const s of [-1, 1]) { const fl = cyl(RF, RF, 0.016, olv, 28); fl.rotation.x = Math.PI / 2; fl.position.z = s * (L / 2); drum.add(fl); }
  const turns = 14, layers = 3, pts = [];
  for (let l = 0; l < layers; l++) for (let i = 0; i <= turns * 24; i++) {
    const t = i / (turns * 24), a = t * turns * Math.PI * 2, rr = R + 0.012 + l * 0.02;
    const z = (l % 2 ? 1 - t : t) * (L - 0.04) - (L - 0.04) / 2;
    pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, z));
  }
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * layers * 24, 0.0085, 5), rope); drum.add(coil);
  g.add(drum);
  // chervyakli reduktor (+z yonida)
  const gb = new THREE.Group();
  const gbody = box(0.24, 0.3, 0.13, olv); gb.add(gbody);
  const cover = cyl(0.1, 0.1, 0.03, olv, 24); cover.rotation.x = Math.PI / 2; cover.position.z = 0.075; gb.add(cover);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const bt = cyl(0.008, 0.008, 0.02, steel, 6); bt.rotation.x = Math.PI / 2; bt.position.set(Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0.095); gb.add(bt); }
  const wormHouse = cyl(0.045, 0.045, 0.32, olv, 16); wormHouse.rotation.z = Math.PI / 2; wormHouse.position.set(0, -0.14, 0); gb.add(wormHouse);
  gb.position.set(0, -0.01, L / 2 + 0.13); g.add(gb);
  // yuritma vali (orqaga) — shlitsli uchi va sharnir
  const inp = cyl(0.022, 0.022, 0.42, steel, 12); inp.rotation.z = Math.PI / 2; inp.position.set(-0.36, -0.15, L / 2 + 0.13); g.add(inp);
  const ujY = box(0.05, 0.06, 0.06, M(DARK)); ujY.position.set(-0.58, -0.15, L / 2 + 0.13); g.add(ujY);
  // roliklarli tros yo'naltirgich: 2 ta gorizontal va 2 ta vertikal rolik, rama
  const fair = new THREE.Group();
  const frameM = olv;
  for (const s of [-1, 1]) { const side = box(0.05, 0.22, 0.03, frameM); side.position.z = s * 0.16; fair.add(side); const tb = box(0.05, 0.025, 0.35, frameM); tb.position.y = s * 0.11; fair.add(tb); }
  for (const s of [-1, 1]) { const hr = cyl(0.026, 0.026, 0.3, steel, 14); hr.rotation.x = Math.PI / 2; hr.position.y = s * 0.04; fair.add(hr); }
  for (const s of [-1, 1]) { const vr = cyl(0.026, 0.026, 0.18, steel, 14); vr.position.z = s * 0.11; fair.add(vr); }
  fair.position.set(0.42, -0.07, 0); g.add(fair);
  // trosning drabandan yo'naltirgichgacha bo'lgan qismi va ilgak
  const top = new THREE.Vector3(0.02, R + 0.05, 0.02);
  const free = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, new THREE.Vector3(0.2, 0.02, 0.01), new THREE.Vector3(0.42, -0.07, 0), new THREE.Vector3(0.6, -0.08, 0)]), 24, 0.009, 6), rope); g.add(free);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 18, Math.PI * 1.5), M(DARK)); hook.position.set(0.64, -0.11, 0); hook.rotation.z = Math.PI / 2; g.add(hook);
  return { group: g, drum };
}

/* ---------- Avtomatik yong'inga qarshi tizim (dvigatel bo'limi) ----------
   Mashina koordinatalarida: ballonlar desant va dvigatel bo'limlari orasidagi to'siqda, kollektor quvurlari
   dvigatel ustidan purkagichlari bilan o'tadi, issiqlik datchiklari quvurlarda, boshqaruv bloki to'siqda. */
export function buildFireSuppression() {
  const g = new THREE.Group();
  const red = M(0xb0302a, { metalness: 0.3, roughness: 0.45 });
  const brass = M(0xc29a4a, { metalness: 0.85, roughness: 0.3 });
  const olv = M(OLIVE, { metalness: 0.35, roughness: 0.6 });
  const pipeM = M(0x7d8580, { metalness: 0.7, roughness: 0.35 });
  const wire = M(0x1a1a1a, { roughness: 0.85, metalness: 0.1 });
  const tube = (pts, r, m) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), Math.max(12, pts.length * 10), r, 8), m);
  const X = -1.42, Y = 1.74;
  // ikki ballon (yotiq, z bo'ylab), tagliklar va qisqichlar, bosh qismida klapan va manometr
  for (const s of [-1, 1]) {
    const c = new THREE.Group();
    const body = cyl(0.085, 0.085, 0.34, red, 24); body.rotation.x = Math.PI / 2; c.add(body);
    for (const e of [-1, 1]) { const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), red); dome.rotation.x = e * Math.PI / 2; dome.position.z = e * 0.17; c.add(dome); }
    for (const zz of [-0.09, 0.09]) { const strap = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.009, 6, 24), olv); strap.position.z = zz; c.add(strap); const foot = box(0.03, 0.05, 0.03, olv); foot.position.set(0, -0.11, zz); c.add(foot); }
    const valve = cyl(0.03, 0.03, 0.06, brass, 14); valve.rotation.x = Math.PI / 2; valve.position.z = -s * 0.285; c.add(valve);
    const gauge = cyl(0.022, 0.022, 0.012, M(0xe8e4d8), 16); gauge.position.set(0, 0.04, -s * 0.285); c.add(gauge);
    const squib = box(0.03, 0.04, 0.03, M(0x8d9094)); squib.position.set(0.04, 0, -s * 0.285); c.add(squib);
    c.position.set(X, Y, s * 0.42); g.add(c);
  }
  // klapanlardan markaziy taqsimlash tugunigacha va dvigatel ustidan ikki kollektor
  g.add(tube([[X, Y, -0.1], [X, Y, 0.1]], 0.016, pipeM));
  const tee = cyl(0.028, 0.028, 0.06, brass, 12); tee.position.set(X, Y, 0); g.add(tee);
  g.add(tube([[X, Y, 0], [X - 0.12, Y - 0.08, 0], [X - 0.3, 1.6, 0]], 0.016, pipeM));
  const nozzles = [];
  for (const zz of [-0.4, 0.4]) {
    g.add(tube([[X - 0.3, 1.6, 0], [X - 0.36, 1.6, zz * 0.7], [X - 0.45, 1.6, zz]], 0.014, pipeM));
    g.add(tube([[X - 0.45, 1.6, zz], [-3.35, 1.6, zz]], 0.014, pipeM));
    for (const x of [-2.0, -2.45, -2.9, -3.3]) {
      const n = new THREE.Group();
      const body = cyl(0.016, 0.01, 0.05, brass, 10); n.add(body);
      const tip = cyl(0.02, 0.012, 0.015, brass, 10); tip.position.y = -0.03; n.add(tip);
      n.position.set(x, 1.565, zz); g.add(n); nozzles.push(n);
    }
  }
  // issiqlik datchiklari (termodatchiklar) va ularning simlari
  const box2 = box(0.18, 0.13, 0.07, M(0x8a8f93, { metalness: 0.6 })); box2.position.set(X + 0.02, 1.36, -0.05); g.add(box2);
  for (let i = 0; i < 4; i++) { const lid = cyl(0.008, 0.008, 0.02, M(STEEL), 6); lid.rotation.x = Math.PI / 2; lid.position.set(X - 0.05 + (i % 2) * 0.14, 1.31 + Math.floor(i / 2) * 0.1, -0.09); g.add(lid); }
  const sensors = [[-2.2, -0.55], [-2.7, 0.55], [-3.15, -0.55], [-2.45, 0.0]];
  for (const [x, z] of sensors) {
    const sd = cyl(0.025, 0.025, 0.04, M(0xd0d2d4, { metalness: 0.7 }), 14); sd.position.set(x, 1.66, z); g.add(sd);
    g.add(tube([[x, 1.69, z], [x + 0.3, 1.7, z * 0.6], [X - 0.05, 1.42, -0.05]], 0.006, wire));
  }
  // ballon piropatronlariga simlar
  for (const s of [-1, 1]) g.add(tube([[X + 0.04, 1.42, -0.05], [X + 0.06, 1.6, s * 0.15], [X + 0.04, Y, -s * 0.285 + s * 0.42]], 0.006, wire));
  return g;
}

/* ---------- Sovutish tizimi ----------
   Mashina koordinatalarida (x — old, y — yuqori, z — yon). Ma'ruzadagi BTR-80 sovitish tizimi sxemasiga ko'ra
   radiator dvigatel orqasida TIK turadi; uning orqasida kojux (g'ilof) ichida bitta katta ventilyator bor,
   u dvigateldan gidromufta va val orqali aylanadi va issiq havoni korpus orqasidagi jalyuzlarga haydaydi.
   Radiator yonida moy radiatori, tepasida kengaytiruvchi bakcha. Dvigatel markazi (-2.85, 0.95, 0). */
const RX = -3.5, RY = 1.45; // radiator yuqori bakchasi va bo'g'izi korpus tomidan pastda qoladi
export function buildRadiator() {
  const g = new THREE.Group();
  const coreM = M(0x8a8f86, { metalness: 0.6, roughness: 0.45 });
  const finM = M(0x5f655c, { metalness: 0.6, roughness: 0.5 });
  const tankM = M(0x3d4233, { metalness: 0.5, roughness: 0.5 });
  const W = 0.9, H = 0.56, T = 0.1;
  // o'zak: qovurg'ali sirt (ko'p yupqa plastinalar)
  const core = box(T, H, W, coreM); core.position.set(RX, RY, 0); g.add(core);
  for (let i = 0; i < 30; i++) { const f = box(T + 0.01, H - 0.02, 0.004, finM); f.position.set(RX, RY, -W / 2 + 0.015 + i * (W - 0.03) / 29); g.add(f); }
  // yuqori va pastki bakchalar, yon tirgaklar
  for (const s of [-1, 1]) { const t = box(T + 0.05, 0.08, W + 0.04, tankM); t.position.set(RX, RY + s * (H / 2 + 0.04), 0); g.add(t); const side = box(T + 0.03, H, 0.03, tankM); side.position.set(RX, RY, s * (W / 2 + 0.015)); g.add(side); }
  const neck = cyl(0.03, 0.03, 0.06, M(DARK), 14); neck.position.set(RX, RY + H / 2 + 0.11, -0.3); g.add(neck);
  const capR = cyl(0.04, 0.04, 0.02, M(0x9a9a92, { metalness: 0.8 }), 14); capR.position.set(RX, RY + H / 2 + 0.145, -0.3); g.add(capR);
  for (const s of [-1, 1]) { const pipeS = cyl(0.035, 0.035, 0.08, tankM, 14); pipeS.rotation.z = Math.PI / 2; pipeS.position.set(RX + 0.08, RY + s * (H / 2 + 0.04), s * 0.3); g.add(pipeS); }
  // kojux (ventilyator g'ilofi): radiator orqasidagi plastina va halqa
  const shroudM = M(0xb9bcb4, { metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide });
  const plate = new THREE.Shape(); plate.moveTo(-W / 2, -H / 2 - 0.04); plate.lineTo(W / 2, -H / 2 - 0.04); plate.lineTo(W / 2, H / 2 + 0.04); plate.lineTo(-W / 2, H / 2 + 0.04);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.27, 0, Math.PI * 2, true); plate.holes.push(hole);
  const shroud = new THREE.Mesh(new THREE.ShapeGeometry(plate, 32), shroudM); shroud.rotation.y = Math.PI / 2; shroud.position.set(RX - 0.08, RY, 0); g.add(shroud);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 40, 1, true), shroudM); ring.rotation.z = Math.PI / 2; ring.position.set(RX - 0.14, RY, 0); g.add(ring);
  // ventilyator: 8 kurak, gupchak; drive.js 'fan' nomli obyektni o'z y o'qi atrofida aylantiradi
  const fanHolder = new THREE.Group(); fanHolder.rotation.z = Math.PI / 2; fanHolder.position.set(RX - 0.15, RY, 0); g.add(fanHolder);
  const fan = new THREE.Group(); fan.name = 'fan'; fanHolder.add(fan);
  const hub = cyl(0.06, 0.06, 0.07, M(DARK), 18); fan.add(hub);
  for (let i = 0; i < 8; i++) { const p = new THREE.Group(); p.rotation.y = i / 8 * Math.PI * 2; const bl = box(0.2, 0.008, 0.075, M(0x3a3d3f, { metalness: 0.5 })); bl.position.x = 0.16; bl.rotation.x = 0.45; p.add(bl); fan.add(p); }
  // ventilyator kronshteyni
  const brace = box(0.03, 0.03, 0.6, tankM); brace.position.set(RX - 0.2, RY, 0); g.add(brace);
  return g;
}

export function buildCooling() {
  const g = new THREE.Group();
  const hoseM = M(0x1c1d1c, { metalness: 0.05, roughness: 0.85 });
  const pipe = (pts, r = 0.035) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 10, false), hoseM);
  };
  // suyuqlik nasosi (dvigatel orqa yuzida) va shkivi
  const pump = cyl(0.09, 0.09, 0.16, M(0x6b7075), 20); pump.rotation.z = Math.PI / 2; pump.position.set(-3.3, 0.98, 0); g.add(pump);
  const pulley = cyl(0.1, 0.1, 0.03, M(DARK), 24); pulley.rotation.z = Math.PI / 2; pulley.position.set(-3.4, 0.98, 0); g.add(pulley);
  // termostat korpusi (dvigatel ustida, orqa tomonda)
  const thermo = cyl(0.06, 0.06, 0.12, M(0x8c8f93), 16); thermo.position.set(-3.22, 1.42, 0.3); g.add(thermo);
  // kengaytiruvchi bakcha (radiator oldida, yuqorida)
  const tank = box(0.2, 0.14, 0.32, M(0xd7d3c4, { metalness: 0.1, roughness: 0.5 })); tank.position.set(-3.15, 1.7, 0.5); g.add(tank);
  const cap = cyl(0.03, 0.03, 0.04, M(0xb8322a), 12); cap.position.set(-3.15, 1.79, 0.42); g.add(cap);
  // moy radiatori (tik, asosiy radiator yonida)
  const oil = box(0.08, 0.46, 0.3, M(0x7a7f84, { metalness: 0.6, roughness: 0.4 })); oil.position.set(RX, RY, -0.66); g.add(oil);
  for (let i = 0; i < 10; i++) { const f = box(0.09, 0.44, 0.004, M(0x5c6166)); f.position.set(RX, RY, -0.79 + i * 0.028); g.add(f); }
  // gidromufta va ventilyator yuritma vali (radiator markazidagi teshik orqali ventilyatorga)
  const fluid = cyl(0.11, 0.11, 0.12, M(0x8a8f95), 24); fluid.rotation.z = Math.PI / 2; fluid.position.set(-3.33, RY, 0); g.add(fluid);
  const fshaft = cyl(0.022, 0.022, 0.3, M(STEEL)); fshaft.rotation.z = Math.PI / 2; fshaft.position.set(-3.5, RY, 0); g.add(fshaft);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.012, 6, 30), M(DARK)); belt.rotation.y = Math.PI / 2; belt.scale.set(1, 1.15, 0.35); belt.position.set(-3.31, 1.215, 0); g.add(belt);
  // shlanglar: termostat -> radiator yuqori bakchasi; pastki bakcha -> nasos; bakcha -> nasos; moy radiatori -> dvigatel
  g.add(pipe([[-3.22, 1.48, 0.3], [-3.3, 1.68, 0.3], [-3.42, 1.77, 0.3]]));
  g.add(pipe([[-3.42, 1.13, -0.3], [-3.36, 1.05, -0.2], [-3.3, 1.0, -0.08]]));
  g.add(pipe([[-3.15, 1.63, 0.5], [-3.1, 1.3, 0.35], [-3.28, 1.02, 0.08]], 0.016));
  g.add(pipe([[-3.46, 1.3, -0.66], [-3.3, 1.05, -0.5], [-3.1, 0.85, -0.32]], 0.02));
  g.add(pipe([[-3.46, 1.62, -0.66], [-3.25, 1.5, -0.5], [-3.0, 1.3, -0.35]], 0.02));
  // dvigatelga ulanish: ikki qator kallagidan termostatga suv yig'uvchi quvurlar (metall)
  const steelPipe = (pts, r) => { const m = pipe(pts, r); m.material = M(0x8c9196, { metalness: 0.7, roughness: 0.35 }); return m; };
  g.add(steelPipe([[-3.24, 1.18, 0.3], [-3.27, 1.24, 0.3], [-3.25, 1.31, 0.3], [-3.22, 1.37, 0.3]], 0.024));
  g.add(steelPipe([[-3.24, 1.18, -0.3], [-3.27, 1.25, -0.28], [-3.24, 1.34, -0.14], [-3.21, 1.38, 0.05], [-3.21, 1.39, 0.2], [-3.22, 1.4, 0.27]], 0.024));
  // termostatdan nasosga aylanib o'tish (kichik doira) shlangi
  g.add(pipe([[-3.22, 1.38, 0.3], [-3.24, 1.24, 0.27], [-3.27, 1.1, 0.16], [-3.29, 1.02, 0.08], [-3.3, 0.98, 0.04]], 0.026));
  return g;
}

/* ---------- Komandir o'rni jihozlari ----------
   Komandir guruhi lokal koordinatalarida: x — old, y — yuqori (o'rindiq asosi y≈0), z — o'ngga (bort tomon). */
export function buildCommanderKit() {
  const g = new THREE.Group();
  const OLV = M(0x56603f, { metalness: 0.35, roughness: 0.6 });
  // TKN-3: tomga osilgan kuzatish pribori, ikki okulyar komandir tomonga (-x)
  const tkn = new THREE.Group();
  const body = box(0.16, 0.22, 0.22, OLV); tkn.add(body);
  const head = cyl(0.07, 0.07, 0.16, OLV, 16); head.position.y = 0.17; tkn.add(head);
  for (const dz of [-0.045, 0.045]) { const eye = cyl(0.026, 0.03, 0.09, M(DARK), 14); eye.rotation.z = Math.PI / 2; eye.position.set(-0.12, -0.02, dz); tkn.add(eye); const cupE = cyl(0.032, 0.032, 0.02, M(0x111111, { roughness: 0.9 }), 14); cupE.rotation.z = Math.PI / 2; cupE.position.set(-0.17, -0.02, dz); tkn.add(cupE); }
  const handle = box(0.03, 0.03, 0.14, M(DARK)); handle.position.set(-0.05, -0.13, 0); tkn.add(handle);
  tkn.position.set(0.42, 0.88, 0.02); g.add(tkn);
  // Infraqizil yoritgich (tom ustida, TKN-3 bilan birga buriladi)
  const ir = new THREE.Group();
  const lampB = cyl(0.11, 0.09, 0.14, OLV, 20); lampB.rotation.z = Math.PI / 2; ir.add(lampB);
  const lens = cyl(0.1, 0.1, 0.01, M(0x3a1010, { emissive: 0x220000, roughness: 0.2 }), 20); lens.rotation.z = Math.PI / 2; lens.position.x = 0.075; ir.add(lens);
  const stand = cyl(0.015, 0.015, 0.18, M(DARK)); stand.position.y = -0.14; ir.add(stand);
  ir.position.set(0.48, 1.32, 0.05); g.add(ir);
  // R-174 ichki aloqa qurilmasi (o'ng devorda)
  const ic = box(0.14, 0.16, 0.06, OLV); ic.position.set(0.05, 0.5, 0.36); g.add(ic);
  for (let i = 0; i < 2; i++) { const k = cyl(0.018, 0.018, 0.03, M(STEEL), 10); k.rotation.x = Math.PI / 2; k.position.set(0.02 + i * 0.06, 0.52, 0.33); g.add(k); }
  // Komandir pulti: kichik panel, uchta asbob, tumblerlar
  const panel = box(0.12, 0.2, 0.36, OLV); panel.position.set(0.72, 0.34, 0.02); g.add(panel);
  for (let i = 0; i < 3; i++) { const d = cyl(0.04, 0.04, 0.02, M(0x0e0f0e), 18); d.rotation.z = Math.PI / 2; d.position.set(0.655, 0.38, -0.1 + i * 0.1); g.add(d); const r = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 20), M(STEEL)); r.rotation.y = Math.PI / 2; r.position.set(0.655, 0.38, -0.1 + i * 0.1); g.add(r); }
  for (let i = 0; i < 4; i++) { const t = cyl(0.006, 0.006, 0.04, M(STEEL), 6); t.rotation.z = Math.PI / 2 - 0.4; t.position.set(0.64, 0.29, -0.12 + i * 0.08); g.add(t); }
  // kabellar
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, 0.5, 0.36), new THREE.Vector3(0.2, 0.75, 0.38), new THREE.Vector3(0.42, 0.85, 0.12)]), 24, 0.01, 6), M(0x141414, { roughness: 0.9 }));
  g.add(cable);
  return g;
}
