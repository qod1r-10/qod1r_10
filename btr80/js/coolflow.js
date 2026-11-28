// Sovutish tizimidagi suyuqlik oqimi: kichik va katta doira.
// Har bir yo'l bo'lagi ingichka "nur" naycha; uning ustida strelkalar suyuqlik yo'nalishida harakatlanadi.
// Rang: ko'k — radiatorda sovigan suyuqlik, sariq — iliq, qizil — dvigateldan chiqqan issiq suyuqlik.
// Koordinatalar model.js dagi ichki tizimda: x — old tomon, y — yuqori, z — chap/o'ng.
import * as THREE from 'three';

const RX = -3.5, RY = 1.45, H = 0.56; // details.js dagi radiator bilan bir xil
const PUMP = [-3.3, 0.98, 0];
const COLD = new THREE.Color('#2f9bff'), WARM = new THREE.Color('#ffb02e'), HOT = new THREE.Color('#ff3b1f');
const SPACING = 0.09; // strelkalar orasidagi masofa, m

function arrowTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.32)'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(40, 0); g.lineTo(88, 16); g.lineTo(40, 32); g.lineTo(58, 16); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCoolFlow() {
  const group = new THREE.Group();
  group.name = 'coolflow';
  const tex = arrowTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false });
  const sets = { small: new THREE.Group(), large: new THREE.Group() };
  group.add(sets.small, sets.large);

  // bitta yo'l bo'lagi: nuqtalar, boshlang'ich va oxirgi rang
  function seg(target, pts, c0, c1, r = 0.013) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const len = curve.getLength();
    const tubular = Math.max(12, Math.round(len / 0.025));
    const radial = 8;
    const geo = new THREE.TubeGeometry(curve, tubular, r, radial, false);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / SPACING);
    const col = new Float32Array(geo.attributes.position.count * 3);
    const cc = new THREE.Color();
    for (let i = 0; i <= tubular; i++) {
      cc.copy(c0).lerp(c1, i / tubular);
      for (let j = 0; j <= radial; j++) { const k = (i * (radial + 1) + j) * 3; col[k] = cc.r; col[k + 1] = cc.g; col[k + 2] = cc.b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 6;
    m.raycast = () => {};
    target.add(m);
  }

  // Dvigatel ichidagi yo'l (ikkala doirada bir xil, faqat rangi farq qiladi):
  // nasos -> blok g'ilofi (orqaga) -> kallak g'ilofi (oldinga) -> suv yig'uvchi quvur -> termostat
  function engineLoop(target, cIn, cMid, cOut) {
    for (const s of [-1, 1]) {
      seg(target, [PUMP, [-3.33, 0.95, 0.12 * s], [-3.27, 0.92, 0.24 * s], [-3.2, 0.93, 0.3 * s]], cIn, cIn);
      const block = [];
      for (let k = 0; k <= 8; k++) block.push([-3.2 + k * 0.095, k % 2 ? 1.0 : 0.9, 0.3 * s]);
      seg(target, block, cIn, cMid);
      seg(target, [[-2.44, 0.95, 0.3 * s], [-2.4, 1.06, 0.31 * s], [-2.44, 1.18, 0.31 * s]], cMid, cMid);
      const head = [];
      for (let k = 0; k <= 8; k++) head.push([-2.48 - k * 0.095, 1.18, (k % 2 ? 0.27 : 0.33) * s]);
      seg(target, head, cMid, cOut);
    }
    // suv yig'uvchi quvurlar termostatga (details.js dagi quvurlar bilan bir yo'ldan)
    seg(target, [[-3.24, 1.18, 0.3], [-3.27, 1.24, 0.3], [-3.25, 1.31, 0.3], [-3.22, 1.37, 0.3]], cOut, cOut);
    seg(target, [[-3.24, 1.18, -0.3], [-3.27, 1.25, -0.28], [-3.24, 1.34, -0.14], [-3.21, 1.38, 0.05], [-3.21, 1.39, 0.2], [-3.22, 1.4, 0.27]], cOut, cOut);
  }

  // KICHIK DOIRA: termostat yopiq — suyuqlik aylanib o'tish shlangi orqali yana nasosga
  engineLoop(sets.small, WARM, WARM, WARM);
  seg(sets.small, [[-3.22, 1.38, 0.3], [-3.24, 1.24, 0.27], [-3.27, 1.1, 0.16], [-3.29, 1.02, 0.08], PUMP], WARM, WARM);

  // KATTA DOIRA: termostat ochiq — yuqori shlang, radiator, pastki shlang, nasos
  engineLoop(sets.large, COLD, WARM, HOT);
  seg(sets.large, [[-3.22, 1.4, 0.3], [-3.22, 1.48, 0.3], [-3.3, 1.68, 0.3], [-3.42, 1.77, 0.3], [RX, 1.77, 0.3]], HOT, HOT);
  // radiator: yuqori bakcha bo'ylab tarqaladi, o'zakdagi naychalardan pastga tushadi, pastki bakchada yig'iladi
  seg(sets.large, [[RX, 1.77, 0.3], [RX, 1.77, 0], [RX, 1.77, -0.38]], HOT, HOT);
  const tops = RY + H / 2 + 0.04, bots = RY - H / 2 - 0.04;
  for (const z of [0.36, 0.12, -0.12, -0.36]) seg(sets.large, [[RX, tops - 0.03, z], [RX, RY, z], [RX, bots + 0.03, z]], HOT, COLD, 0.011);
  seg(sets.large, [[RX, bots, 0.38], [RX, bots, 0], [RX, bots, -0.3]], COLD, COLD);
  seg(sets.large, [[RX, bots, -0.3], [-3.42, 1.13, -0.3], [-3.36, 1.05, -0.2], [-3.3, 1.0, -0.08], PUMP], COLD, COLD);

  let circuit = 'large';
  function setCircuit(c) { circuit = c; sets.small.visible = c === 'small'; sets.large.visible = c === 'large'; }
  setCircuit('large');
  function update(dt, speed) { tex.offset.x -= dt * speed / SPACING; }

  // Raqamli yorliqlar: suyuqlik o'tadigan qismlar tartibi bilan (panel ro'yxati bilan bir xil)
  const L = (n, text, pos) => ({ n, text, pos });
  const labels = {
    small: [
      L(1, 'Suyuqlik nasosi', [-3.3, 0.86, 0.12]),
      L(2, "Blok g'ilofi", [-2.75, 0.88, 0.34]),
      L(3, "Kallak g'ilofi", [-2.45, 1.3, 0.34]),
      L(4, "Suv yig'uvchi quvur", [-3.08, 1.31, 0.3]),
      L(5, 'Termostat (yopiq)', [-3.2, 1.5, 0.32]),
      L(6, "Aylanib o'tish shlangi", [-3.27, 1.12, 0.22]),
    ],
    large: [
      L(1, 'Suyuqlik nasosi', [-3.3, 0.86, 0.12]),
      L(2, "Blok g'ilofi", [-2.75, 0.88, 0.34]),
      L(3, "Kallak g'ilofi", [-2.45, 1.3, 0.34]),
      L(4, "Suv yig'uvchi quvur", [-3.08, 1.31, 0.3]),
      L(5, 'Termostat (ochiq)', [-3.2, 1.5, 0.32]),
      L(6, 'Yuqori shlang', [-3.32, 1.72, 0.3]),
      L(7, 'Radiator', [RX, RY + 0.05, -0.42]),
      L(8, 'Pastki shlang', [-3.44, 0.98, -0.32]),
      L(0, 'Kengaytiruvchi bakcha', [-3.05, 1.95, 0.55]),
      L(0, 'Ventilyator', [RX - 0.2, RY - 0.42, 0]),
    ],
  };
  return { group, setCircuit, update, labels, get circuit() { return circuit; } };
}
