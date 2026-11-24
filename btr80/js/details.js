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

/* ---------- Suv otgich harakatlantirgichi ---------- */
export function buildWaterjet() {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.62, 28, 1, true), M(DARK, { side: THREE.DoubleSide, metalness: 0.6 }));
  tube.rotation.z = Math.PI / 2; g.add(tube);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 28), M(STEEL)); ring.rotation.y = Math.PI / 2; ring.position.x = 0.31; g.add(ring);
  const imp = new THREE.Group(); imp.name = 'impeller';
  const hub = cyl(0.05, 0.07, 0.16, M(0xc39a45, { metalness: 0.85, roughness: 0.3 })); hub.rotation.z = Math.PI / 2; imp.add(hub);
  for (let i = 0; i < 5; i++) {
    const blade = box(0.04, 0.17, 0.012, M(0xc39a45, { metalness: 0.85, roughness: 0.3 }));
    blade.position.set(0, 0.1, 0); const p = new THREE.Group(); p.rotation.x = (i / 5) * Math.PI * 2; blade.rotation.x = 0.5; p.add(blade); imp.add(p);
  }
  g.add(imp);
  const shaft = cyl(0.025, 0.025, 0.4, M(STEEL)); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.36; g.add(shaft);
  const nozzle = cyl(0.17, 0.21, 0.18, M(STEEL, { metalness: 0.6 })); nozzle.rotation.z = Math.PI / 2; nozzle.position.x = -0.38; g.add(nozzle);
  const flap = box(0.03, 0.46, 0.48, M(OLIVE)); flap.position.x = -0.5; g.add(flap);
  return { group: g, impeller: imp };
}

/* ---------- Sovutish tizimi (radiatordan tashqari qismlar) ----------
   Mashina koordinatalarida (x — old, y — yuqori, z — o'ng/chap). Dvigatel markazi (-2.85, 0.95, 0),
   radiator (-2.85, 1.78, 0) dvigatel ustida yotadi. Ma'ruzadagi BTR-80 sovitish tizimi sxemasiga ko'ra:
   radiator, ventilyator, gidromufta, kengaytiruvchi bakcha, suyuqlik nasosi, termostat, moy radiatori, shlanglar. */
export function buildCooling() {
  const g = new THREE.Group();
  const hoseM = M(0x1c1d1c, { metalness: 0.05, roughness: 0.85 });
  const pipe = (pts, r = 0.035) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 10, false), hoseM);
  };
  // suyuqlik nasosi (dvigatel orqa yuzida, -x tomonda) va shkivi
  const pump = cyl(0.09, 0.09, 0.16, M(0x6b7075), 20); pump.rotation.z = Math.PI / 2; pump.position.set(-3.38, 0.98, 0); g.add(pump);
  const pulley = cyl(0.1, 0.1, 0.03, M(DARK), 24); pulley.rotation.z = Math.PI / 2; pulley.position.set(-3.48, 0.98, 0); g.add(pulley);
  // termostat korpusi (dvigatel ustida, orqa tomonda)
  const thermo = cyl(0.06, 0.06, 0.12, M(0x8c8f93), 16); thermo.position.set(-3.25, 1.42, 0); g.add(thermo);
  // kengaytiruvchi bakcha
  const tank = cyl(0.11, 0.11, 0.42, M(0xd7d3c4, { metalness: 0.1, roughness: 0.5, transparent: false }), 20); tank.rotation.x = Math.PI / 2; tank.position.set(-2.3, 1.72, 0.62); g.add(tank);
  const cap = cyl(0.04, 0.04, 0.05, M(0xb8322a), 12); cap.position.set(-2.3, 1.85, 0.62); g.add(cap);
  // moy radiatori (chap tomonda)
  const oil = box(0.5, 0.06, 0.32, M(0x7a7f84, { metalness: 0.6, roughness: 0.4 })); oil.position.set(-2.85, 1.7, -0.86); g.add(oil);
  for (let i = 0; i < 8; i++) { const f = box(0.5, 0.004, 0.3, M(0x5c6166)); f.position.set(-2.85, 1.675 + i * 0.008, -0.86); g.add(f); }
  // gidromufta (ventilyator yuritmasi)
  const fluid = cyl(0.12, 0.12, 0.12, M(0x8a8f95), 24); fluid.rotation.z = Math.PI / 2; fluid.position.set(-3.38, 1.32, 0.0); g.add(fluid);
  // shlanglar: termostat -> radiator kirishi; radiator chiqishi -> nasos; bakcha -> nasos; moy radiatori
  g.add(pipe([[-3.25, 1.48, 0], [-3.32, 1.62, 0.25], [-3.3, 1.74, 0.55]]));
  g.add(pipe([[-2.4, 1.72, -0.6], [-2.5, 1.3, -0.62], [-3.1, 0.95, -0.35], [-3.3, 0.98, -0.05]]));
  g.add(pipe([[-2.3, 1.6, 0.62], [-2.7, 1.2, 0.45], [-3.3, 1.0, 0.08]], 0.018));
  g.add(pipe([[-2.6, 1.7, -0.7], [-2.5, 1.2, -0.5], [-2.45, 0.85, -0.32]], 0.022));
  g.add(pipe([[-3.1, 1.7, -0.7], [-3.2, 1.1, -0.45], [-3.25, 0.8, -0.3]], 0.022));
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
