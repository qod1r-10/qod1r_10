// Haqiqiy V8 dvigatel ichki qismlari (models/v8.glb + models/v8meta.json).
// Model asosi: "V8 engine Internals" (Sketchfab, CC BY-NC 4.0) — qismlarga ajratilgan va harakat uchun tayyorlangan.
// Krivoship-shatun mexanizmi va gaz taqsimlash mexanizmi haqiqiy kinematika bo'yicha harakatlanadi.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export async function loadV8(fetchBuffer) {
  const [buf, meta] = await Promise.all([
    fetchBuffer('models/v8.glb'),
    fetch('models/v8meta.json').then((r) => r.json()),
  ]);
  const gltf = await new GLTFLoader().parseAsync(buf, '');
  return { scene: gltf.scene, meta };
}

const MAT = {
  crank: { color: 0xb9bdc1, metalness: 0.9, roughness: 0.28 },
  piston: { color: 0xd3d6d9, metalness: 0.65, roughness: 0.32 },
  rod: { color: 0x9aa1a8, metalness: 0.85, roughness: 0.3 },
  cam: { color: 0xc4c7ca, metalness: 0.9, roughness: 0.25 },
  valve: { color: 0xe1e3e5, metalness: 0.9, roughness: 0.22 },
  push: { color: 0xa9aeb3, metalness: 0.85, roughness: 0.3 },
  vtstatic: { color: 0x878d93, metalness: 0.8, roughness: 0.35 },
  engstatic: { color: 0x6d7378, metalness: 0.6, roughness: 0.45 },
};
const PART = { crank: 'crank', piston: 'crank', rod: 'crank', cam: 'valvetrain', valve: 'valvetrain', push: 'valvetrain', vtstatic: 'valvetrain', engstatic: 'engine' };

// Model koordinatalari -> dvigatel koordinatalari (dvigatel o'qi +x, tirsakli val o'qi y = -0.16 da)
const K = 0.0075;

export function buildV8(asset) {
  const { scene, meta } = asset;
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(K);
  inner.rotation.y = -Math.PI / 2;
  const ax = meta.crankAxis, zMid = 27;
  inner.position.set(zMid * K, -0.16 - ax[1] * K, -ax[0] * K);
  root.add(inner);

  const byName = {};
  [...scene.children].forEach((o) => {
    if (!o.isMesh) return;
    const kind = o.name.split('_')[0];
    o.geometry = toCreasedNormals(o.geometry, Math.PI / 6);
    o.material = new THREE.MeshStandardMaterial(MAT[kind] || MAT.engstatic);
    o.userData.part = PART[kind] || 'engine';
    o.castShadow = true;
    o.position.set(0, 0, 0);
    inner.add(o);
    byName[o.name] = o;
  });

  const { R, L } = meta;
  const sOf = (psi) => R * Math.cos(psi) + Math.sqrt(L * L - R * R * Math.sin(psi) ** 2);
  const cAx = new THREE.Vector2(...meta.crankAxis), camAx = new THREE.Vector2(...meta.camAxis);
  const turn = (mesh, axis, a) => {
    mesh.rotation.z = a;
    const c = Math.cos(a), s = Math.sin(a);
    mesh.position.set(axis.x - (c * axis.x - s * axis.y), axis.y - (s * axis.x + c * axis.y), 0);
  };
  const cyl = meta.cyl.map((c, i) => ({ ...c, piston: byName['piston_' + i], rod: byName['rod_' + i] }));
  const valves = meta.valves.map((v, i) => ({ ...v, mesh: byName['valve_' + i], lift: 0 }));
  const pushes = meta.pushes.map((p, i) => ({ ...p, mesh: byName['push_' + i] }));
  const LIFT = 1.4;

  function update(theta) {
    if (byName.crank) turn(byName.crank, cAx, theta);
    if (byName.cam) turn(byName.cam, camAx, theta / 2);
    cyl.forEach((c, i) => {
      const [dx, dy] = c.d;
      const s = sOf(c.psi0 + theta);
      if (c.piston) c.piston.position.set(dx * (s - c.s0), dy * (s - c.s0), 0);
      if (c.rod) {
        const a0 = c.pin0, a1 = c.pin0 + theta;
        const P0x = cAx.x + R * Math.cos(a0), P0y = cAx.y + R * Math.sin(a0);
        const P1x = cAx.x + R * Math.cos(a1), P1y = cAx.y + R * Math.sin(a1);
        const Q0x = cAx.x + c.s0 * dx, Q0y = cAx.y + c.s0 * dy;
        const Q1x = cAx.x + s * dx, Q1y = cAx.y + s * dy;
        const da = Math.atan2(Q1y - P1y, Q1x - P1x) - Math.atan2(Q0y - P0y, Q0x - P0x);
        const co = Math.cos(da), si = Math.sin(da);
        c.rod.rotation.z = da;
        c.rod.position.set(P1x - (co * P0x - si * P0y), P1y - (si * P0x + co * P0y), 0);
      }
    });
    // 4 taktli sikl: kiritish klapani 0…180°, chiqarish klapani 540…720° (tirsakli val bo'yicha)
    const FOUR = Math.PI * 4;
    valves.forEach((v) => {
      const c = cyl[v.cyl];
      const cyc = (((c.psi0 + theta + (v.cyl % 2) * Math.PI * 2) % FOUR) + FOUR) % FOUR;
      let lift = 0;
      if (!v.ex && cyc < Math.PI) lift = Math.sin(cyc);
      if (v.ex && cyc > Math.PI * 3) lift = Math.sin(cyc - Math.PI * 3);
      v.lift = lift * LIFT;
      if (v.mesh) v.mesh.position.set(-c.d[0] * v.lift, -c.d[1] * v.lift, 0);
    });
    pushes.forEach((p) => {
      const l = valves[p.valve] ? valves[p.valve].lift * 0.6 : 0;
      if (p.mesh) p.mesh.position.set(p.axis[0] * l, p.axis[1] * l, p.axis[2] * l);
    });
  }

  // Korpus: silindrlar bloki, kallaklar, karter (Kesim rejimida qirqiladi)
  const castM = (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.55 });
  const AXL = new THREE.Vector3(0, -0.16, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const banks = [cyl.find((c) => c.d[0] > 0), cyl.find((c) => c.d[0] < 0)].filter(Boolean);
  const casing = [];
  banks.forEach((c) => {
    const d = new THREE.Vector3(0, c.d[1], c.d[0]); // model (x,y) -> dvigatel (z,y)
    const q = new THREE.Quaternion().setFromUnitVectors(Y, d);
    const mk = (w, h, t, s, col) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), castM(col));
      m.quaternion.copy(q); m.position.copy(AXL).addScaledVector(d, s);
      casing.push(m); return m;
    };
    mk(0.86, 0.32, 0.27, 0.23, 0x6f7377);  // silindrlar bloki
    mk(0.9, 0.2, 0.32, 0.47, 0x5a5e62);    // silindrlar kallagi
    mk(0.86, 0.04, 0.26, 0.585, 0x8f2f22); // klapan qopqog'i
  });
  const crankcase = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.36, 0.56), castM(0x6f7377));
  crankcase.position.set(0, -0.2, 0); casing.push(crankcase);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.5), castM(0x5a5e62));
  front.position.set(-0.53, -0.1, 0); casing.push(front);
  casing.forEach((m) => { m.userData.casing = true; m.userData.part = 'engine'; m.castShadow = true; root.add(m); });

  update(0);
  return { root, update };
}
