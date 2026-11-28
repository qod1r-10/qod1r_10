// "Qo'shimcha" namoyishidagi yoyilma: faqat tanlangan mexanizm yoki tizimning o'z bo'laklari markazdan
// tashqariga ajraladi (butun BTR emas). Mexanizm yoyilgan holda ham ishlashda davom etadi.
// Bo'lak — userData.unit belgili eng yaqin guruh (masalan, radiator, nasos, dvigatel korpusi), u bo'lmasa detalning o'zi.
// Siljish har kadrda boshqa harakatlardan keyin qo'shiladi va keyingi kadr boshida olib tashlanadi.
import * as THREE from 'three';

export function createDemoExplode(stop) {
  const S = { on: false, p: 0 };
  let units = [];           // { o, local, world }
  const byName = new Map(); // nom -> dunyo koordinatalaridagi siljish (p=1 da)

  function unitOf(m) {
    for (let a = m; a && a !== stop; a = a.parent) if (a.userData.unit) return a;
    return m;
  }

  function build(meshList) {
    units = []; byName.clear();
    const set = new Set(meshList.map(unitOf));
    const centers = new Map();
    const all = new THREE.Box3();
    for (const u of set) {
      const b = new THREE.Box3().setFromObject(u);
      if (b.isEmpty()) continue;
      centers.set(u, b.getCenter(new THREE.Vector3()));
      all.union(b);
    }
    const C = all.getCenter(new THREE.Vector3());
    const spread = Math.max(0.6, all.getSize(new THREE.Vector3()).length());
    for (const [u, c] of centers) {
      const d = c.clone().sub(C);
      const len = d.length();
      if (len < 0.03) continue;
      // markazdan uzoqroq bo'lak ko'proq siljiydi; juda yaqinlari ham sezilarli ajraladi
      const world = d.multiplyScalar((0.09 * spread + len * 0.6) / len);
      const parent = u.parent;
      const local = parent.worldToLocal(c.clone().add(world)).sub(parent.worldToLocal(c.clone()));
      units.push({ o: u, local, applied: 0 });
      if (u.name) byName.set(u.name, world);
    }
  }

  function set(on, meshList) {
    if (on) { undo(); build(meshList); }
    S.on = on;
  }

  function undo() {
    for (const u of units) if (u.applied) { u.o.position.addScaledVector(u.local, -u.applied); u.applied = 0; }
  }

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function apply(dt, reduceMotion) {
    const target = S.on ? 1 : 0;
    S.p = reduceMotion ? target : S.p + Math.sign(target - S.p) * Math.min(Math.abs(target - S.p), dt * 1.1);
    const e = ease(S.p);
    for (const u of units) { u.o.position.addScaledVector(u.local, e); u.applied = e; }
    if (!S.on && S.p === 0) units = [];
  }

  // darhol yig'ish (namoyishdan chiqilganda)
  function reset() { undo(); units = []; byName.clear(); S.on = false; S.p = 0; }

  // yorliqlar bo'lak bilan birga siljishi uchun
  const tmp = new THREE.Vector3();
  function offsetOf(name) {
    const w = byName.get(name);
    if (!w) return null;
    return tmp.copy(w).multiplyScalar(ease(S.p));
  }

  return { state: S, set, undo, apply, reset, offsetOf };
}
