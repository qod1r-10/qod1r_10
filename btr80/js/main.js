import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadV8 } from './engine3d.js';
import { loadAssets } from './assets.js';
import { buildBTR80, AXLES_X, REAL_AXLES_X } from './model.js';
import { createDrive, FLOW_PARTS, FLOW_STEPS } from './drive.js';
import { createCutaway } from './cutaway.js';
import { createExplode } from './explode.js';
import { addSignature, syncSignature } from './signature.js';
import { VEHICLE, CATEGORIES, FIGS } from './parts.js';
import { DEMOS, STROKES } from './demos.js';
import { buildCoolFlow } from './coolflow.js';
import { buildOilFlow, buildFuelFlow, buildStartFlow } from './systemflows.js';
import { createDemoExplode } from './demoexplode.js';

const $ = (s) => document.querySelector(s);
// Oflayn (bitta fayl) versiyada fayllar ichki xotiradan olinadi
const asset = (p) => (window.__asset ? window.__asset(p) : p);

/* ---------- Ko'rinish rejimi: kunduzgi / tungi ----------
   Foydalanuvchi sarlavhadagi tugma bilan tanlaydi, tanlov shu brauzerda eslab qolinadi (standart: tungi).
   O'ng panel CSS da har doim tungi ranglarda. */
function setMode(mode, save) {
  document.documentElement.dataset.mode = mode;
  document.querySelectorAll('[data-mode-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeSet === mode)));
  if (save) { try { localStorage.setItem('btr80-mode', mode); } catch (e) { /* saqlab bo'lmasa ham ishlaydi */ } }
}
let savedMode = null;
try { savedMode = localStorage.getItem('btr80-mode'); } catch (e) { /* saqlangan tanlov yo'q */ }
setMode(savedMode === 'light' ? 'light' : 'dark', false);
document.querySelectorAll('[data-mode-set]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeSet, true)));

/* ---------- O'ng panelni ekranga sig'dirish ----------
   Yotiq va past ekranlarda (masalan, sensorli interaktiv doska) panel ichidagi hamma narsa — ma'lumot va
   "Asosiy qismlar" ro'yxati — aylantirmasdan ko'rinishi uchun panel ichi zoom bilan kichraytiriladi. */
const panelEl = $('.panel'), panelIn = $('.panel-in');
const FIT_MIN = 0.72;
let fitQueued = false;
function fitPanel() {
  fitQueued = false;
  panelIn.style.zoom = '';
  panelIn.style.height = '';
  if (!window.matchMedia('(min-width: 861px)').matches) return;
  const H = panelEl.clientHeight;
  if (!H) return;
  let z = 1;
  for (let i = 0; i < 6; i++) {
    const need = panelEl.scrollHeight; // panel ichining haqiqiy (kichraytirilgan) balandligi
    if (need <= H + 1) break;
    const nz = Math.max(FIT_MIN, z * (H / need) * (i ? 0.99 : 1));
    if (Math.abs(nz - z) < 0.002) break;
    z = nz;
    panelIn.style.zoom = String(z);
    if (z === FIT_MIN) break;
  }
  // panel ichi ekran balandligiga teng: menyu doim to'liq ko'rinadi, matn sig'masa faqat yuqoridagi ma'lumot qismi aylanadi
  panelIn.style.height = (H / z) + 'px';
}
function queueFit() { if (!fitQueued) { fitQueued = true; requestAnimationFrame(fitPanel); } }
window.addEventListener('resize', queueFit);
panelEl.addEventListener('load', queueFit, true);   // rasmlar yuklanganda balandlik o'zgaradi
panelEl.addEventListener('toggle', queueFit, true); // "Belgilar" ochilganda
if (document.fonts) document.fonts.ready.then(queueFit);
const viewer = $('#viewer');
const tagEl = $('#tag');
const tipEl = $('#tip');

/* ---------- Ma'lumotlar indeksi ---------- */
const PART = new Map();      // partId -> { part, cat }
const CAT = new Map();       // catId -> cat
for (const cat of CATEGORIES) {
  CAT.set(cat.id, cat);
  for (const p of cat.parts) PART.set(p.id, { part: p, cat });
}
const ARMOR_PARTS = new Set(['hull', 'hatch_front', 'hatch_roof', 'side_doors', 'vision', 'turret', 'radiator', 'firing_ports']);

/* ---------- Sahna ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  $('#loading').textContent = "Brauzeringiz WebGL'ni qo'llab-quvvatlamaydi. Boshqa brauzerda oching.";
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
viewer.prepend(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
const HOME = { pos: new THREE.Vector3(8.2, 4.6, 8.6), target: new THREE.Vector3(0, 1.1, 0) };
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.zoomToCursor = true; // kursor (barmoq) turgan joyga yaqinlashadi
controls.screenSpacePanning = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.5;
controls.maxDistance = 26;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotateSpeed = 0.8;

scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a2a, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(6, 11, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
sun.shadow.bias = -0.0005;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.22 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

let grid;
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
const HL = new THREE.Color();
function applyTheme() {
  if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
  const gc = new THREE.Color(cssVar('--grid') || '#888');
  grid = new THREE.GridHelper(40, 40, gc, gc);
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  grid.position.y = 0.001;
  scene.add(grid);
  HL.set(cssVar('--hl') || '#f0a43a');
}
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });

/* ---------- Model ---------- */
// Tashqi ko'rinish: haqiqiy teksturali model (models/btr80.glb). Ichki qismlar: model.js dagi sxematik detallar.
// models/btr80.glb; u bo'lmasa (ba'zi hostinglar .glb bermaydi) base64 JSON nusxasi
async function loadGLB(path = 'models/btr80.glb') {
  const r = await fetch(path);
  if (r.ok && (r.headers.get('content-type') || '').indexOf('html') < 0) return r.arrayBuffer();
  const j = await (await fetch(path + '.json')).json();
  const bin = atob(j.data), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function loadRealModel() {
  const tl = new THREE.TextureLoader();
  const tex = (f, color = true) => new Promise((res, rej) => tl.load(asset('models/' + f), (t) => {
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    res(t);
  }, undefined, rej));
  const [gltf, mbC, mbMR, dtC, dtMR, liC, whC] = await Promise.all([
    loadGLB().then((buf) => new GLTFLoader().parseAsync(buf, '')),
    tex('metalbase_color.jpg'), tex('metalbase_mr.jpg', false), tex('details_color.jpg'), tex('details_mr.jpg', false),
    tex('lights_color.jpg'), tex('wheels_color.jpg'),
  ]);
  const M = {
    MetalBase: { map: mbC, metalnessMap: mbMR, roughnessMap: mbMR, metalness: 1, roughness: 1 },
    Details: { map: dtC, metalnessMap: dtMR, roughnessMap: dtMR, metalness: 1, roughness: 1 },
    Lights: { map: liC, roughness: 0.5, metalness: 0.2 },
    Wheels: { map: whC, roughness: 0.92, metalness: 0 },
  };
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const [part, matName] = o.name.split('__');
    // Modelning tomidagi silindrsimon qutilar avtomatik ajratishda "radiator" deb belgilangan edi — ular korpusga tegishli
    o.userData.part = part === 'radiator' ? 'hull' : part;
    o.material = new THREE.MeshStandardMaterial({ name: matName, ...(M[matName] || {}) });
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return gltf.scene;
}

let real = null;
try { real = await loadRealModel(); } catch (e) { console.warn("Haqiqiy model yuklanmadi, sxematik model ko'rsatiladi", e); }
const model = new THREE.Group();
let v8 = null;
try { v8 = await loadV8(loadGLB); } catch (e) { console.warn("V8 dvigatel modeli yuklanmadi, sxematik dvigatel ko'rsatiladi", e); }
const assets = await loadAssets(loadGLB).catch(() => ({}));
const interior = buildBTR80({ exterior: !real, v8, assets });
if (real) {
  interior.rotation.y = -Math.PI / 2; // sxematik modelda old tomon +x, haqiqiy modelda +z
  model.add(real);
}
model.add(interior);
scene.add(model);
const meshes = [];
const meshesByPart = new Map();
function registerMesh(o) {
  o.material = o.material.clone();
  o.material.envMapIntensity = 0.7;
  o.userData.baseEmissive = o.material.emissive.clone();
  o.userData.op = 1;
  o.userData.state = 'normal';
  meshes.push(o);
  const id = o.userData.part;
  if (!meshesByPart.has(id)) meshesByPart.set(id, []);
  meshesByPart.get(id).push(o);
}
model.traverse((o) => { if (o.isMesh && !o.userData.noReg) registerMesh(o); });

const drive = createDrive({ scene, real, interior, axles: real ? REAL_AXLES_X : AXLES_X, getGrid: () => grid, shadowGround: ground, assets });
drive.extra.forEach(registerMesh);
for (let i = meshes.length - 1; i >= 0; i--) if (meshes[i].userData.removed) { const m = meshes[i]; meshes.splice(i, 1); const l = meshesByPart.get(m.userData.part); l.splice(l.indexOf(m), 1); }

const cut = createCutaway({ renderer, meshes });
const explode = createExplode(meshes);
// Muallif yozuvi korpusning ikki yonida
const signature = real ? await addSignature(real).catch((e) => { console.warn(e); return []; }) : [];
// Sovutish suyuqligi oqimi ("Qo'shimcha" bo'limidagi namoyish uchun; qismlar ro'yxatiga kirmaydi)
// Tizimlardagi oqimlar ("Qo'shimcha" namoyishlari uchun; qismlar ro'yxatiga kirmaydi)
const flows = { cool: buildCoolFlow(), oil: buildOilFlow(), fuel: buildFuelFlow(interior.userData), start: buildStartFlow() };
for (const f of Object.values(flows)) { f.group.visible = false; interior.add(f.group); }
const GAS_DEMOS = new Set(['kshm', 'gtm', 'fuel', 'start']); // silindr ichidagi gaz ko'rinadigan namoyishlar
const DEMO = new Map(DEMOS.map((d) => [d.id, d]));
const demoExp = createDemoExplode(interior);
const v8gas = interior.getObjectByName('v8gas'); // silindr ichidagi gaz (engine3d.js)
const meshByName = new Map();
for (const m of meshes) if (m.name && !meshByName.has(m.name)) meshByName.set(m.name, m);

/* ---------- Holat ---------- */
const state = { cat: null, part: null, open: null, xray: false, demo: null, only: false,
  circuits: { cool: 'large', oil: 'main', fuel: 'feed', start: 'starter' } };
const circuitOf = (id) => state.circuits[id];

function focusIds() {
  if (state.part) return new Set([state.part]);
  if (state.cat) return new Set(CAT.get(state.cat).parts.map((p) => p.id));
  if (drive.state.flow) return FLOW_PARTS;
  return null;
}

function applyMeshStates() {
  const D = state.demo ? DEMO.get(state.demo) : null;
  if (D) {
    // namoyish: faqat mexanizm/tizim qismlari; qolgani yashiriladi
    for (const m of meshes) {
      const id = m.userData.part;
      // "Faqat" bosilmagan bo'lsa, atrofdagi qismlar xira ko'rinib turadi
      m.userData.state = D.show.includes(id) ? 'show' : D.xray.includes(id) ? 'xray' : (D.context || []).includes(id) ? 'context' : D.faint.includes(id) ? 'faint' : state.only ? 'hidden' : 'dim';
    }
    return;
  }
  const f = focusIds();
  for (const m of meshes) {
    const id = m.userData.part;
    if (f) m.userData.state = f.has(id) ? 'focus' : 'dim';
    else m.userData.state = state.xray && ARMOR_PARTS.has(id) ? 'ghost' : 'normal';
    if (m.userData.ghost && m.userData.state !== 'focus') m.userData.state = 'hidden';
  }
}

/* ---------- Kamera harakati ---------- */
let fly = null;
function flyTo(pos, target, ms = 900) {
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), ms };
}
function flyToMeshes(list) {
  const b = new THREE.Box3();
  list.forEach((m) => b.expandByObject(m));
  const center = b.getCenter(new THREE.Vector3());
  const size = b.getSize(new THREE.Vector3()).length();
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspectFix = Math.max(1, 1.2 / camera.aspect);
  const dist = Math.max(2.6, (size * 0.75 / Math.tan(fov / 2)) * aspectFix);
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.3) { dir.y = 0.4; dir.normalize(); }
  flyTo(center.clone().addScaledVector(dir, dist), center);
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- Tanlash ---------- */
const reduceMotionPref = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function selectCategory(id, { toggle = true } = {}) {
  leaveDemo();
  const same = state.cat === id && !state.part;
  if (same && toggle) { state.open = state.open === id ? null : id; }
  else { state.open = id; }
  state.cat = id; state.part = null;
  applyMeshStates();
  flyToMeshes(CAT.get(id).parts.flatMap((p) => meshesByPart.get(p.id) || []));
  render();
}
function selectPart(id, fromModel = false) {
  if (window.matchMedia('(min-width: 861px)').matches) $('.side-info').scrollTo({ top: 0, behavior: reduceMotionPref() ? 'auto' : 'smooth' });
  else if (!fromModel) window.scrollTo({ top: 0, behavior: reduceMotionPref() ? 'auto' : 'smooth' }); // telefonda: menyudan tanlansa, model ko'rinadi
  const info = PART.get(id);
  if (!info) return;
  leaveDemo();
  state.part = id; state.cat = info.cat.id; state.open = info.cat.id;
  applyMeshStates();
  flyToMeshes(meshesByPart.get(id) || []);
  render();
  if (fromModel && window.matchMedia('(min-width: 861px)').matches) {
    const btn = document.querySelector(`[data-part="${id}"]`);
    if (btn) btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
function resetView() {
  leaveDemo();
  state.cat = null; state.part = null; state.open = null;
  applyMeshStates();
  flyTo(HOME.pos.clone(), HOME.target.clone());
  render();
}

/* ---------- "Qo'shimcha": mexanizm va tizimlar namoyishi ---------- */
const labelsEl = $('#dlabels');
let demoLabels = [];
function selectDemo(id) {
  const D = DEMO.get(id);
  if (!D) return;
  if (explode.state.on) { explode.set(false); explode.undo(); }
  demoExp.reset();
  $('#btn-explode').setAttribute('aria-pressed', 'false');
  if (drive.state.on) $('#btn-drive').click();
  if (drive.state.flow) $('#btn-flow').click();
  state.demo = id; state.cat = null; state.part = null; state.open = '_extra';
  $('#btn-explode').title = "Faqat shu mexanizm yoki tizimning o'z qismlari ajraladi";
  $('#btn-only').hidden = false;
  $('#btn-only').setAttribute('aria-pressed', String(state.only));
  for (const [k, f] of Object.entries(flows)) f.group.visible = k === id;
  if (flows[id]) flows[id].setCircuit(circuitOf(id));
  if (v8gas) v8gas.visible = GAS_DEMOS.has(id);
  buildDemoLabels();
  applyMeshStates();
  // kamera: har bir namoyish uchun tanlangan burchakdan
  const b = new THREE.Box3();
  if (D.focus) b.set(new THREE.Vector3(...D.focus[0]), new THREE.Vector3(...D.focus[1])).applyMatrix4(interior.matrixWorld);
  else {
    [...D.show, ...D.xray].flatMap((p) => meshesByPart.get(p) || []).forEach((m) => b.expandByObject(m));
    if (flows[id]) b.expandByObject(flows[id].group);
  }
  const center = b.getCenter(new THREE.Vector3());
  const size = b.getSize(new THREE.Vector3()).length();
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = Math.max(2.2, (size * 0.62 / Math.tan(fov / 2)) * Math.max(1, 1.2 / camera.aspect));
  const dir = new THREE.Vector3(...(D.view || [0.5, 0.5, 1])).normalize().transformDirection(interior.matrixWorld);
  flyTo(center.clone().addScaledVector(dir, dist), center, 1100);
  render();
  $('.side-info').scrollTop = 0;
  if (!window.matchMedia('(min-width: 861px)').matches) window.scrollTo({ top: 0, behavior: reduceMotionPref() ? 'auto' : 'smooth' });
}
function leaveDemo() {
  if (!state.demo) return;
  state.demo = null;
  demoExp.reset();
  $('#btn-explode').setAttribute('aria-pressed', 'false');
  for (const f of Object.values(flows)) f.group.visible = false;
  if (v8gas) v8gas.visible = false;
  if (interior.userData.efFlames) interior.userData.efFlames.visible = false;
  state.only = false;
  $('#btn-only').hidden = true;
  $('#btn-explode').title = "BTR qismlarga ajralib havoda yoyiladi; qayta bosilsa yig'iladi";
  labelsEl.innerHTML = ''; demoLabels = [];
}
function buildDemoLabels() {
  labelsEl.innerHTML = ''; demoLabels = [];
  const D = DEMO.get(state.demo);
  if (!D) return;
  const list = flows[state.demo]
    ? flows[state.demo].labels[circuitOf(state.demo)].map((l) => ({ ...l, local: new THREE.Vector3(...l.pos) }))
    : (D.labels || []).map((l) => ({ ...l, at: l.at || [0.5, 0.5, 0.5], obj: l.gas !== undefined ? (v8gas && v8gas.children[l.gas]) : meshByName.get(l.mesh) })).filter((l) => l.obj);
  // modelda faqat raqam; nomlari paneldagi ro'yxatda shu raqam bilan
  for (const l of list) {
    const el = document.createElement('div');
    el.className = 'dl' + (typeof l.n === 'string' ? ' dl-side' : '');
    el.innerHTML = `<b>${esc(l.n)}</b>`;
    el.title = l.text;
    labelsEl.appendChild(el);
    demoLabels.push({ ...l, el });
  }
}
const lblBox = new THREE.Box3(), lblV = new THREE.Vector3(), lblInv = new THREE.Matrix4();
function updateDemoLabels() {
  if (!demoLabels.length) return;
  const w = viewer.clientWidth, h = viewer.clientHeight;
  lblInv.copy(interior.matrixWorld).invert();
  for (const l of demoLabels) {
    if (l.local) {
      lblV.copy(l.local).applyMatrix4(interior.matrixWorld);
      const off = l.unit ? demoExp.offsetOf(l.unit) : null;
      if (off) lblV.add(off);
      lblV.applyMatrix4(lblInv);
    } else {
      // detal chegarasi ichki tizimda (x — old, y — yuqori, z — yon) olinadi, keyin nisbiy nuqta
      lblBox.setFromObject(l.obj).applyMatrix4(lblInv);
      lblV.set(
        lblBox.min.x + (lblBox.max.x - lblBox.min.x) * l.at[0],
        lblBox.min.y + (lblBox.max.y - lblBox.min.y) * l.at[1],
        lblBox.min.z + (lblBox.max.z - lblBox.min.z) * l.at[2]);
    }
    lblV.applyMatrix4(interior.matrixWorld);
    lblV.project(camera);
    let hide = lblV.z > 1 || explode.state.on;
    if (l.obj && (!l.obj.visible || !l.obj.parent.visible)) hide = true; // masalan, yoyilmada yashirilgan gaz
    l.el.hidden = hide;
    l.el.style.transform = `translate(${Math.round((lblV.x * 0.5 + 0.5) * w)}px, ${Math.round((-lblV.y * 0.5 + 0.5) * h)}px) translate(-50%, -50%)`;
  }
}
// 1-silindrdagi takt va klapanlar holati (tirsakli val burchagidan)
let liveT = 0;
function updateDemoLive(dt) {
  const D = state.demo ? DEMO.get(state.demo) : null;
  if (!D || !D.live || !v8 || !v8.meta) return;
  liveT += dt;
  if (liveT < 0.08) return;
  liveT = 0;
  const el = document.getElementById('demo-live');
  if (!el) return;
  const FOUR = Math.PI * 4;
  const c0 = v8.meta.cyl[0];
  const cyc = (((c0.psi0 + drive.state.crank) % FOUR) + FOUR) % FOUR;
  const k = Math.min(3, Math.floor(cyc / Math.PI));
  el.querySelectorAll('.stroke').forEach((s, i) => s.classList.toggle('is-on', i === k));
  const deg = Math.round((cyc / FOUR) * 720);
  const txt = el.querySelector('.live-text');
  if (D.live === 'valves') {
    const inOpen = cyc < Math.PI, exOpen = cyc > Math.PI * 3;
    txt.textContent = `Kiritish klapani: ${inOpen ? 'ochiq' : 'yopiq'} · Chiqarish klapani: ${exOpen ? 'ochiq' : 'yopiq'} · sikl burchagi ${deg}°`;
  } else txt.textContent = `${STROKES[k][0]} takti: ${STROKES[k][1]} (sikl burchagi ${deg}° / 720°)`;
}
function demoHTML(D) {
  let h = `<p class="eyebrow">Qo'shimcha · ${esc(D.kind)}</p><h2>${esc(D.name)}</h2><p>${esc(D.desc)}</p>`;
  if (D.circuits) {
    h += `<div class="seg" role="group" aria-label="Suyuqlik aylanish doirasi">${Object.entries(D.circuits).map(([k, c]) =>
      `<button type="button" class="seg-btn" data-circuit="${k}" aria-pressed="${circuitOf(D.id) === k}">${esc(c.title)}</button>`).join('')}</div>`;
    const c = D.circuits[circuitOf(D.id)];
    // kichik harf bilan boshlangan qadam — boshiga qaytish (masalan, "yana suyuqlik nasosiga")
    h += `<p class="circ-when">${esc(c.when)}</p><ol class="steps">${c.steps.map((s, i) => /^[a-z]/.test(s)
      ? `<li class="back" data-n="↺">${esc(s)}</li>` : `<li data-n="${i + 1}">${esc(s)}</li>`).join('')}</ol>`;
    const extra = flows[D.id].labels[circuitOf(D.id)].filter((l) => typeof l.n === 'string');
    if (extra.length) h += `<ul class="steps steps-side">${extra.map((l) => `<li data-n="${esc(l.n)}">${esc(l.text)}</li>`).join('')}</ul>`;
    if (D.swatches) h += `<p class="swatches">${D.swatches.map(([c, t]) => `<span><i class="sw" style="background:${c}"></i>${esc(t)}</span>`).join('')}</p>`;
  }
  if (D.live) {
    h += `<div class="live" id="demo-live"><p class="eyebrow">1-silindr hozir</p><div class="strokes">${STROKES.map(([n]) => `<span class="stroke">${esc(n)}</span>`).join('')}</div><p class="live-text"></p></div>`;
  }
  if (D.labels) h += `<p class="eyebrow legend-t">Modeldagi raqamlar</p><ol class="steps">${D.labels.map((l) => `<li data-n="${esc(l.n)}">${esc(l.text)}</li>`).join('')}</ol>`;
  if (D.list) h += `<dl class="specs">${D.list.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  if (D.note) h += `<p class="hint">${esc(D.note)}</p>`;
  h += `<p class="hint">"Yoyilma" shu ${D.kind === 'Tizim' ? 'tizimning' : 'mexanizmning'} o'z qismlarini ajratadi, ishlash to'xtamaydi. "Faqat" atrofdagi qismlarni yashiradi. "Sekin" harakatni 4 marta sekinlashtiradi, "Kesim" ichini ochadi.</p>`;
  return h + figsHTML(D.fig);
}

/* ---------- Panel ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function specsHTML(specs) {
  if (!specs || !specs.length) return '';
  return `<dl class="specs">${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function figsHTML(key) {
  const list = FIGS[key];
  if (!list || !list.length) return '';
  return `<div class="figs"><p class="eyebrow">Ma'ruzadan rasmlar</p>${list.map(([src, title, legend, source], i) => `
    <figure class="fig">
      <button class="fig-img" type="button" data-fig="${key}|${i}" aria-label="Kattalashtirish: ${esc(title)}"><img src="${asset('img/' + src)}" alt="${esc(title)}" loading="lazy"></button>
      <figcaption><b>${esc(title)}</b>${legend ? `<details><summary>Belgilar</summary><p>${esc(legend)}</p></details>` : ''}<span class="src">${esc(source)}</span></figcaption>
    </figure>`).join('')}</div>`;
}

function openFig(key, i) {
  const [src, title, legend, source] = FIGS[key][i];
  const box = $('#lightbox');
  box.innerHTML = `<div class="lb-inner"><img src="${asset('img/' + src)}" alt="${esc(title)}"><div class="lb-cap"><b>${esc(title)}</b>${legend ? `<p>${esc(legend)}</p>` : ''}<span class="src">${esc(source)}</span></div><button class="lb-close" type="button" aria-label="Yopish">✕</button></div>`;
  box.hidden = false;
  box.querySelector('.lb-close').focus();
}
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox' || e.target.closest('.lb-close')) $('#lightbox').hidden = true; });

function extraHTML() {
  const open = state.open === '_extra';
  const item = (d) => `
      <li><button class="part${state.demo === d.id ? ' is-active' : ''}" data-demo="${d.id}" aria-pressed="${state.demo === d.id}">
        <span class="dot" aria-hidden="true"></span>${esc(d.name)}</button></li>`;
  const group = (kind, title) => `<li class="sub-h">${title}</li>${DEMOS.filter((d) => d.kind === kind).map(item).join('')}`;
  const items = open ? `<ul class="parts" id="parts-extra">${group('Mexanizm', 'Mexanizmlar')}${group('Tizim', 'Tizimlar')}</ul>` : '';
  return `<li class="cat cat-extra${state.demo ? ' is-active' : ''}${open ? ' is-open' : ''}">
    <button class="cat-btn" data-extra="1" aria-expanded="${open}" aria-controls="parts-extra">
      <span class="cat-name">Qo'shimcha: dvigatel mexanizmlari va tizimlari</span>
      <span class="count">${DEMOS.length}</span>
      <svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>${items}</li>`;
}

function render() {
  const info = $('#info');
  const crumbs = [`<button class="crumb" data-act="home">${VEHICLE.name}</button>`];
  if (state.cat) crumbs.push(`<button class="crumb" data-cat-crumb="${state.cat}">${esc(CAT.get(state.cat).name)}</button>`);
  if (state.part) crumbs.push(`<span class="crumb current">${esc(PART.get(state.part).part.name)}</span>`);
  if (state.demo) crumbs.push(`<span class="crumb current">Qo'shimcha</span>`, `<span class="crumb current">${esc(DEMO.get(state.demo).name)}</span>`);
  $('#crumbs').innerHTML = crumbs.join('<span class="sep" aria-hidden="true">›</span>');

  if (state.demo) {
    info.innerHTML = demoHTML(DEMO.get(state.demo));
  } else if (state.part) {
    const { part, cat } = PART.get(state.part);
    const demoFor = DEMOS.find((d) => d.from === part.id);
    const demoBtn = demoFor ? `<button type="button" class="demo-link" data-demo="${demoFor.id}">Ishlashini ko'rsatish ›</button>` : '';
    info.innerHTML = `<p class="eyebrow">${esc(cat.name)}</p><h2>${esc(part.name)}</h2>${demoBtn}<p>${esc(part.desc)}</p>${specsHTML(part.specs)}${figsHTML(part.id)}`;
  } else if (state.cat) {
    const cat = CAT.get(state.cat);
    info.innerHTML = `<p class="eyebrow">Asosiy qism · ${cat.parts.length} ta ichki qism</p><h2>${esc(cat.name)}</h2><p>${esc(cat.desc)}</p><p class="hint">Ichki qismlardan birini tanlang: uning BTR ichidagi joyi ko'rsatiladi.</p>`;
  } else if (drive.state.on || drive.state.flow) {
    info.innerHTML = `<p class="eyebrow">Yurgizish rejimi</p><h2>Kuch qanday uzatiladi</h2>
      <p>Dvigateldan chiqqan aylanish sakkizala g'ildirakka shu zanjir orqali yetib boradi. "Kuch oqimi" tugmasini bosing: yo'l modelda ko'rinadi.</p>
      <ol class="flow">${FLOW_STEPS.map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ol>${figsHTML('_flow')}`;
  } else {
    info.innerHTML = `<p class="eyebrow">Taktik-texnik ma'lumotlar</p><h2>${esc(VEHICLE.full)}</h2><p>${esc(VEHICLE.desc)}</p>${specsHTML(VEHICLE.specs)}${figsHTML('_vehicle')}`;
  }

  $('#cats').innerHTML = CATEGORIES.map((cat, i) => {
    const open = state.open === cat.id;
    const active = state.cat === cat.id;
    const parts = open ? `<ul class="parts" id="parts-${cat.id}">${cat.parts.map((p) => `
        <li><button class="part${state.part === p.id ? ' is-active' : ''}" data-part="${p.id}" aria-pressed="${state.part === p.id}">
          <span class="dot" aria-hidden="true"></span>${esc(p.name)}</button></li>`).join('')}</ul>` : '';
    return `<li class="cat${active ? ' is-active' : ''}${open ? ' is-open' : ''}">
      <button class="cat-btn" data-cat="${cat.id}" aria-expanded="${open}" aria-controls="parts-${cat.id}">
        <span class="cat-name">${esc(cat.name)}</span>
        <span class="count">${cat.parts.length}</span>
        <svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>${parts}</li>`;
  }).join('') + extraHTML();

  $('#btn-reset').disabled = false; // har doim ishlaydi: qo'lda aylantirilgan kamerani ham qaytaradi
  queueFit();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.cat) selectCategory(t.dataset.cat);
  else if (t.dataset.extra) { state.open = state.open === '_extra' ? null : '_extra'; render(); }
  else if (t.dataset.demo) selectDemo(t.dataset.demo);
  else if (t.dataset.circuit && state.demo) { state.circuits[state.demo] = t.dataset.circuit; flows[state.demo].setCircuit(t.dataset.circuit); buildDemoLabels(); render(); }
  else if (t.dataset.part) selectPart(t.dataset.part);
  else if (t.dataset.catCrumb) selectCategory(t.dataset.catCrumb, { toggle: false });
  else if (t.dataset.act === 'home') resetView();
  else if (t.dataset.fig) { const [k, i] = t.dataset.fig.split('|'); openFig(k, +i); }
});
$('#btn-reset').addEventListener('click', resetView);
$('#btn-xray').addEventListener('click', (e) => {
  state.xray = !state.xray;
  e.currentTarget.setAttribute('aria-pressed', state.xray);
  applyMeshStates();
});
$('#btn-rotate').addEventListener('click', (e) => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.setAttribute('aria-pressed', controls.autoRotate);
});
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#lightbox').hidden) { $('#lightbox').hidden = true; return; }
  resetView();
});

$('#btn-drive').addEventListener('click', (e) => {
  if (state.demo) { leaveDemo(); state.open = null; applyMeshStates(); }
  const on = !drive.state.on;
  drive.setOn(on);
  e.currentTarget.setAttribute('aria-pressed', on);
  $('#hud').hidden = !on;
  $('#pad').hidden = !on;
  viewer.classList.toggle('is-driving', on);
  if (on) {
    controls.autoRotate = false;
    $('#btn-rotate').setAttribute('aria-pressed', 'false');
    if (!state.cat) flyTo(new THREE.Vector3(-6.5, 4.6, -9.5), HOME.target.clone());
  }
  render();
});
$('#btn-cut').addEventListener('click', (e) => {
  const on = !cut.state.on;
  cut.set(on);
  e.currentTarget.setAttribute('aria-pressed', on);
  if (on && !state.cat && !state.demo) flyTo(new THREE.Vector3(8.4, 3.4, 2.2), new THREE.Vector3(0, 1.1, -0.2), 1400);
});
$('#btn-explode').addEventListener('click', (e) => {
  if (state.demo) {
    // namoyishda: faqat shu mexanizm/tizim qismlari yoyiladi
    const on = !demoExp.state.on;
    demoExp.set(on, meshes.filter((m) => ['show', 'xray', 'context', 'faint'].includes(m.userData.state)));
    e.currentTarget.setAttribute('aria-pressed', on);
    // ajralgan qismlar sig'ishi uchun kamera biroz uzoqlashadi (yig'ilganda qaytadi)
    const k = on ? 1.5 : 1 / 1.5;
    flyTo(controls.target.clone().add(camera.position.clone().sub(controls.target).multiplyScalar(k)), controls.target.clone(), 1000);
    return;
  }
  const on = !explode.state.on;
  explode.set(on);
  e.currentTarget.setAttribute('aria-pressed', on);
  if (!state.cat) {
    if (on) flyTo(new THREE.Vector3(9.5, 7.2, 11.5), new THREE.Vector3(0, 2.4, 0), 1300);
    else flyTo(HOME.pos.clone(), HOME.target.clone(), 1300);
  }
});
$('#btn-only').addEventListener('click', (e) => {
  state.only = !state.only;
  e.currentTarget.setAttribute('aria-pressed', state.only);
  applyMeshStates();
});
$('#btn-slow').addEventListener('click', (e) => {
  drive.state.slow = !drive.state.slow;
  e.currentTarget.setAttribute('aria-pressed', drive.state.slow);
});
$('#btn-flow').addEventListener('click', (e) => {
  if (state.demo) { leaveDemo(); state.open = null; }
  const on = !drive.state.flow;
  drive.setFlow(on);
  e.currentTarget.setAttribute('aria-pressed', on);
  if (on) { state.cat = null; state.part = null; }
  applyMeshStates();
  render();
});

/* ---------- 3D da bosish va ko'rsatish ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(meshes.filter((m) => m.visible), false);
  if (!hits.length) return null;
  const visible = hits.find((h) => h.object.userData.state !== 'dim' && h.object.userData.state !== 'ghost');
  return (visible || hits[0]).object.userData.part;
}
// Bosish: qisqa va joyidan siljimagan bosish qismni tanlaydi; aylantirish uchun bosish tanlamaydi.
// Ikki marta tez bosish (yoki ikki marta teginish) umumiy ko'rinishga qaytaradi.
let down = null, lastTap = null, tapTimer = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType !== 'mouse' }; fly = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const held = performance.now() - down.t;
  const limit = down.touch ? 12 : 6;
  down = null;
  if (moved > limit || held > 350) { lastTap = null; return; }
  const now = performance.now();
  if (lastTap && now - lastTap.t < 380 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
    clearTimeout(tapTimer); lastTap = null;
    resetView();
    return;
  }
  lastTap = { t: now, x: e.clientX, y: e.clientY };
  const x = e.clientX, y = e.clientY;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { if (state.demo) return; const id = pick(x, y); if (id) selectPart(id, true); }, 260);
});
let hoverReq = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) { tipEl.hidden = true; return; }
  if (hoverReq) return;
  hoverReq = requestAnimationFrame(() => {
    hoverReq = null;
    const id = pick(e.clientX, e.clientY);
    if (!id) { tipEl.hidden = true; renderer.domElement.style.cursor = ''; return; }
    const r = viewer.getBoundingClientRect();
    tipEl.textContent = PART.get(id).part.name;
    tipEl.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
    tipEl.hidden = false;
    renderer.domElement.style.cursor = 'pointer';
  });
});
renderer.domElement.addEventListener('pointerleave', () => { tipEl.hidden = true; });

/* ---------- Kadr ---------- */
function resize() {
  const w = viewer.clientWidth, h = viewer.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);
resize();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();
const tmpBox = new THREE.Box3();
const tmpV = new THREE.Vector3();
const TARGET_OP = { normal: 1, focus: 1, dim: 0.07, ghost: 0.16, hidden: 0, show: 1, xray: 0.38, context: 0.24, faint: 0.12 };

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  const fade = 1 - Math.exp(-dt * 9);
  if (fly) {
    const k = reduceMotion ? 1 : Math.min(1, (performance.now() - fly.start) / fly.ms);
    const e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) fly = null;
  }
  drive.state.hideWorld = !!(state.part || state.cat || state.demo);
  drive.state.idle = cut.state.on || !!state.demo; // namoyishda dvigatel doim ishlaydi
  explode.undo();
  demoExp.undo();
  drive.update(dt);
  cut.update(dt, reduceMotion);
  explode.apply(dt, reduceMotion);
  demoExp.apply(dt, reduceMotion);
  // yoyilgan holatda oqim va gaz yashiriladi (ular qismlar bilan birga ajralmaydi)
  const assembled = demoExp.state.p < 0.02;
  for (const [k, f] of Object.entries(flows)) f.group.visible = state.demo === k && assembled;
  if (v8gas) v8gas.visible = GAS_DEMOS.has(state.demo) && assembled;
  if (flows[state.demo]) flows[state.demo].update(dt, drive.state.slow ? 0.08 : 0.32);
  // starter shesternyasi maxovik gardishi bilan ilashib aylanadi; sovuq havoda alangali shamlar yonadi
  const ud = interior.userData;
  if (state.demo === 'start') {
    if (ud.starterPinion) ud.starterPinion.rotation.x = -drive.state.crank * 7.8;
    if (ud.efFlames) {
      ud.efFlames.visible = circuitOf('start') === 'cold' && assembled;
      const fl = 0.85 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.3);
      ud.efFlames.children.forEach((c) => c.scale.set(1, fl, 1));
    }
  }
  controls.update();

  const pulse = reduceMotion ? 0.45 : 0.38 + 0.22 * Math.sin(t * 3.4);
  for (const m of meshes) {
    const u = m.userData, mt = m.material;
    const target = TARGET_OP[u.state];
    u.op += (target - u.op) * fade;
    if (Math.abs(target - u.op) < 0.002) u.op = target;
    mt.opacity = u.op;
    const tr = u.op < 0.999;
    if (mt.transparent !== tr) { mt.transparent = tr; mt.needsUpdate = true; }
    mt.depthWrite = u.op > 0.5;
    if (u.state === 'focus') mt.emissive.copy(HL).multiplyScalar(pulse);
    else mt.emissive.copy(u.baseEmissive);
    m.castShadow = u.op > 0.5;
    m.visible = u.op > 0.003;
    m.renderOrder = u.state === 'focus' ? 2 : 0;
  }

  // tanlangan qism nomi yorlig'i
  const ids = focusIds();
  if (ids && (state.part || state.cat)) {
    tmpBox.makeEmpty();
    ids.forEach((id) => (meshesByPart.get(id) || []).forEach((m) => tmpBox.expandByObject(m)));
    tmpBox.getCenter(tmpV);
    tmpV.y = tmpBox.max.y + 0.15;
    tmpV.project(camera);
    const w = viewer.clientWidth, h = viewer.clientHeight;
    const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
    tagEl.textContent = state.part ? PART.get(state.part).part.name : CAT.get(state.cat).name;
    tagEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    tagEl.hidden = tmpV.z > 1;
  } else tagEl.hidden = true;

  syncSignature(signature);
  renderer.render(scene, camera);
  updateDemoLabels();
  updateDemoLive(dt);
  requestAnimationFrame(frame);
}

render();
applyMeshStates();
requestAnimationFrame(() => { frame(); $('#loading').hidden = true; });
