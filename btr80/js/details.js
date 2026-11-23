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

/* ---------- Haydovchi asboblar paneli ---------- */
function gauge(g, x, y, r, frac, label, unit, maxLabel) {
  g.fillStyle = '#0d0f0e'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = '#8d9396'; g.lineWidth = r * 0.07; g.beginPath(); g.arc(x, y, r * 0.96, 0, 7); g.stroke();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  g.strokeStyle = '#e9e6da'; g.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const a = a0 + (a1 - a0) * i / 10, r1 = r * (i % 5 ? 0.78 : 0.7);
    g.beginPath(); g.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); g.stroke();
  }
  g.strokeStyle = '#c0392b'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(x, y, r * 0.82, a0 + (a1 - a0) * 0.85, a1); g.stroke();
  g.fillStyle = '#e9e6da'; g.font = `bold ${Math.round(r * 0.22)}px monospace`; g.textAlign = 'center';
  g.fillText(label, x, y + r * 0.45); g.font = `${Math.round(r * 0.17)}px monospace`; g.fillText(unit, x, y + r * 0.66);
  g.fillText('0', x - r * 0.5, y + r * 0.62 - r * 0.05); g.fillText(maxLabel, x + r * 0.5, y + r * 0.57);
  const a = a0 + (a1 - a0) * Math.min(1, Math.max(0, frac));
  g.strokeStyle = '#f5d23b'; g.lineWidth = r * 0.07; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.76, y + Math.sin(a) * r * 0.76); g.stroke();
  g.fillStyle = '#5a5f62'; g.beginPath(); g.arc(x, y, r * 0.1, 0, 7); g.fill();
}
export function buildDashboard() {
  const { tex, redraw } = canvasTex(1024, 360, (g, w, h, kmh = 0, rpm = 800, on = false) => {
    g.fillStyle = '#3d4636'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#323a2c'; g.fillRect(14, 14, w - 28, h - 28);
    gauge(g, 160, 170, 125, kmh / 100, 'km/soat', 'TEZLIK', '100');
    gauge(g, 440, 170, 125, rpm / 3000, 'ayl/daq', '×1000', '3');
    const small = [['°C', 'SUV', on ? 0.6 : 0.2, '120'], ['kgf', 'MOY', on ? 0.45 : 0, '8'], ['V', 'VOLT', on ? 0.7 : 0.62, '32'], ['l', "YONILG'I", 0.75, '1']];
    small.forEach(([u, l, f, mx], i) => gauge(g, 660 + (i % 2) * 170, 95 + Math.floor(i / 2) * 160, 66, f, u, l, mx));
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i === 0 && on ? '#4caf50' : i === 3 ? '#c0392b' : '#555';
      g.beginPath(); g.arc(70 + i * 70, 330, 11, 0, 7); g.fill();
    }
    g.fillStyle = '#d8d4c4'; g.font = 'bold 22px monospace'; g.textAlign = 'left'; g.fillText('BTR-80', 860, 340);
  });
  const g = new THREE.Group();
  const body = box(0.16, 0.3, 0.86, M(OLIVE)); g.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.29), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.1 }));
  face.rotation.y = -Math.PI / 2; face.position.x = -0.081; g.add(face);
  for (let i = 0; i < 5; i++) { const s = cyl(0.008, 0.008, 0.05, M(STEEL)); s.rotation.z = Math.PI / 2; s.position.set(-0.1, -0.16, -0.3 + i * 0.13); g.add(s); }
  let t = 0;
  return { group: g, update(kmh, rpm, on, dt) { t += dt; if (t > 0.15) { t = 0; redraw(kmh, rpm, on); } } };
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
