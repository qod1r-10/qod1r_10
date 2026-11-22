import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildBTR80 } from './model.js';
import { VEHICLE, CATEGORIES } from './parts.js';

const $ = (s) => document.querySelector(s);
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
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- Model ---------- */
// Tashqi ko'rinish: haqiqiy teksturali model (models/btr80.glb). Ichki qismlar: model.js dagi sxematik detallar.
// models/btr80.glb; u bo'lmasa (ba'zi hostinglar .glb bermaydi) base64 JSON nusxasi
async function loadGLB() {
  const r = await fetch('models/btr80.glb');
  if (r.ok && (r.headers.get('content-type') || '').indexOf('html') < 0) return r.arrayBuffer();
  const j = await (await fetch('models/btr80.glb.json')).json();
  const bin = atob(j.data), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function loadRealModel() {
  const tl = new THREE.TextureLoader();
  const tex = (f, color = true) => new Promise((res, rej) => tl.load('models/' + f, (t) => {
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
    o.userData.part = part;
    o.material = new THREE.MeshStandardMaterial({ name: matName, ...(M[matName] || {}) });
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return gltf.scene;
}

let real = null;
try { real = await loadRealModel(); } catch (e) { console.warn("Haqiqiy model yuklanmadi, sxematik model ko'rsatiladi", e); }
const model = new THREE.Group();
const interior = buildBTR80({ exterior: !real });
if (real) {
  interior.rotation.y = -Math.PI / 2; // sxematik modelda old tomon +x, haqiqiy modelda +z
  model.add(real);
}
model.add(interior);
scene.add(model);
const meshes = [];
const meshesByPart = new Map();
model.traverse((o) => {
  if (!o.isMesh) return;
  o.material = o.material.clone();
  o.material.envMapIntensity = 0.7;
  o.userData.baseEmissive = o.material.emissive.clone();
  o.userData.op = 1;
  o.userData.state = 'normal';
  meshes.push(o);
  const id = o.userData.part;
  if (!meshesByPart.has(id)) meshesByPart.set(id, []);
  meshesByPart.get(id).push(o);
});

/* ---------- Holat ---------- */
const state = { cat: null, part: null, open: null, xray: false };

function focusIds() {
  if (state.part) return new Set([state.part]);
  if (state.cat) return new Set(CAT.get(state.cat).parts.map((p) => p.id));
  return null;
}

function applyMeshStates() {
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
  const dist = Math.max(4.6, (size * 0.75 / Math.tan(fov / 2)) * aspectFix);
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.3) { dir.y = 0.4; dir.normalize(); }
  flyTo(center.clone().addScaledVector(dir, dist), center);
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- Tanlash ---------- */
function selectCategory(id, { toggle = true } = {}) {
  const same = state.cat === id && !state.part;
  if (same && toggle) { state.open = state.open === id ? null : id; }
  else { state.open = id; }
  state.cat = id; state.part = null;
  applyMeshStates();
  flyToMeshes(CAT.get(id).parts.flatMap((p) => meshesByPart.get(p.id) || []));
  render();
}
function selectPart(id, fromModel = false) {
  const info = PART.get(id);
  if (!info) return;
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
  state.cat = null; state.part = null; state.open = null;
  applyMeshStates();
  flyTo(HOME.pos.clone(), HOME.target.clone());
  render();
}

/* ---------- Panel ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function specsHTML(specs) {
  if (!specs || !specs.length) return '';
  return `<dl class="specs">${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function render() {
  const info = $('#info');
  const crumbs = [`<button class="crumb" data-act="home">${VEHICLE.name}</button>`];
  if (state.cat) crumbs.push(`<button class="crumb" data-cat-crumb="${state.cat}">${esc(CAT.get(state.cat).name)}</button>`);
  if (state.part) crumbs.push(`<span class="crumb current">${esc(PART.get(state.part).part.name)}</span>`);
  $('#crumbs').innerHTML = crumbs.join('<span class="sep" aria-hidden="true">›</span>');

  if (state.part) {
    const { part, cat } = PART.get(state.part);
    info.innerHTML = `<p class="eyebrow">${esc(cat.name)}</p><h2>${esc(part.name)}</h2><p>${esc(part.desc)}</p>${specsHTML(part.specs)}`;
  } else if (state.cat) {
    const cat = CAT.get(state.cat);
    info.innerHTML = `<p class="eyebrow">Asosiy qism · ${cat.parts.length} ta ichki qism</p><h2>${esc(cat.name)}</h2><p>${esc(cat.desc)}</p><p class="hint">Ichki qismlardan birini tanlang: uning BTR ichidagi joyi ko'rsatiladi.</p>`;
  } else {
    info.innerHTML = `<p class="eyebrow">Taktik-texnik ma'lumotlar</p><h2>${esc(VEHICLE.full)}</h2><p>${esc(VEHICLE.desc)}</p>${specsHTML(VEHICLE.specs)}`;
  }

  $('#cats').innerHTML = CATEGORIES.map((cat, i) => {
    const open = state.open === cat.id;
    const active = state.cat === cat.id;
    const parts = open ? `<ul class="parts" id="parts-${cat.id}">${cat.parts.map((p) => `
        <li><button class="part${state.part === p.id ? ' is-active' : ''}" data-part="${p.id}" aria-pressed="${state.part === p.id}">
          <span class="dot" aria-hidden="true"></span>${esc(p.name)}</button></li>`).join('')}</ul>` : '';
    return `<li class="cat${active ? ' is-active' : ''}${open ? ' is-open' : ''}">
      <button class="cat-btn" data-cat="${cat.id}" aria-expanded="${open}" aria-controls="parts-${cat.id}">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="cat-name">${esc(cat.name)}</span>
        <span class="count">${cat.parts.length}</span>
        <svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>${parts}</li>`;
  }).join('');

  $('#btn-reset').disabled = !state.cat;
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.cat) selectCategory(t.dataset.cat);
  else if (t.dataset.part) selectPart(t.dataset.part);
  else if (t.dataset.catCrumb) selectCategory(t.dataset.catCrumb, { toggle: false });
  else if (t.dataset.act === 'home') resetView();
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
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') resetView(); });

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
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; fly = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  const id = pick(e.clientX, e.clientY);
  if (id) selectPart(id, true);
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
const TARGET_OP = { normal: 1, focus: 1, dim: 0.07, ghost: 0.16, hidden: 0 };

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

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

render();
applyMeshStates();
requestAnimationFrame(() => { frame(); $('#loading').hidden = true; });
