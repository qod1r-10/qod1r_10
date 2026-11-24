// "Yoyilma" — portlatilgan ko'rinish: har bir qism o'z yo'nalishi bo'yicha havoga uzoqlashadi
// va qayta bosilganda o'z o'rniga qaytadi. Siljish har kadrda boshqa harakatlardan keyin qo'shiladi
// va keyingi kadr boshida olib tashlanadi, shuning uchun aylanish/yurish bilan to'qnashmaydi.
import * as THREE from 'three';

// [dx, dy, dz] metrda; dz 'S' bilan berilsa — qismning o'z tomoni (chap/o'ng) bo'yicha tashqariga
// Mashina o'qlari: x — old tomon, y — yuqori, z — chap/o'ng
const RULES = {
  hull: [0, 2.3, 0], hatch_front: [0.2, 2.9, 0], hatch_roof: [0, 2.9, 0], side_doors: [0, 2.3, 'S0.9'],
  vision: [0.35, 2.5, 0], lights: [0.9, 2.4, 0], firing_ports: [0, 2.3, 'S0.6'], trimvane: [1.4, 1.6, 0], antenna: [-0.3, 3.4, 0.3],
  turret: [0, 3.6, 0], kpvt: [0.9, 3.9, 0], pkt: [0.9, 3.9, -0.35], sight: [0, 4.4, 0], smoke: [-0.5, 4.1, 0], gunner: [0, 2.6, 0],
  wheels: [0, 0, 'S1.3'], suspension: [0, -0.15, 'S0.75'], brakes: [0, -0.05, 'S0.95'], halfshafts: [0, -0.45, 'S0.4'], axles: [0, -0.55, 0], shafts: [0, -0.3, 0],
  engine: [-1.1, 1.1, 0], crank: [-1.1, 0.35, 0], valvetrain: [-1.1, 1.55, 0], radiator: [-1.3, 3.0, 0],
  gearbox: [-0.2, 0.75, 0], transfer: [0, 0.55, 0], fuel: [-0.3, 1.0, 'S1.0'], waterjet: [-1.7, 0.4, 0],
  driver: [1.2, 1.0, -0.5], commander: [1.2, 1.0, 0.5], troop_seats: [0, 1.25, 0], fire: [0, 1.4, 'S0.6'],
  radio: [0.6, 1.8, 0.9], battery: [0.4, 0.6, -1.3], fvu: [0.3, 1.3, 1.3],
};

export function createExplode(meshes) {
  const S = { on: false, p: 0 };
  const C = new THREE.Vector3(0, 1.2, 0);
  const items = meshes.map((m, i) => {
    const b = new THREE.Box3().setFromObject(m);
    const c = b.isEmpty() ? m.getWorldPosition(new THREE.Vector3()) : b.getCenter(new THREE.Vector3());
    const r = RULES[m.userData.part];
    let off;
    if (r) {
      // Qoidalar mashina tizimida (x — old, z — yon); sahnada esa BTR modeli old tomoni +z, yoni x bo'ylab:
      // mashina (x, y, z) -> sahna (-z, y, x)
      const side = -c.x >= 0 ? 1 : -1;
      const dz = typeof r[2] === 'string' ? side * parseFloat(r[2].slice(1)) : r[2];
      off = new THREE.Vector3(-dz, r[1], r[0]);
    } else off = c.clone().sub(C).multiplyScalar(0.8);
    // kichik tasodifiy kechikish — "portlash" tabiiyroq ko'rinadi
    const delay = ((i * 9301 + 49297) % 233280) / 233280 * 0.25;
    return { m, off, delay, applied: new THREE.Vector3() };
  });
  const inv = new THREE.Matrix3(), tmp = new THREE.Vector3();
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  return {
    state: S,
    set(on) { S.on = on; },
    // kadr boshida: oldingi siljishni olib tashlash
    undo() {
      for (const it of items) if (it.applied.lengthSq()) { it.m.position.sub(it.applied); it.applied.set(0, 0, 0); }
    },
    // kadr oxirida: yangi siljishni qo'shish
    apply(dt, reduce) {
      const target = S.on ? 1 : 0;
      const speed = 1 / 1.3;
      S.p = reduce ? target : S.p + Math.sign(target - S.p) * Math.min(Math.abs(target - S.p), dt * speed);
      if (S.p <= 0) return;
      for (const it of items) {
        const k = Math.min(1, Math.max(0, (S.p * 1.25 - it.delay)));
        const e = S.on ? easeOut(k) : easeInOut(k);
        if (e <= 0) continue;
        const parent = it.m.parent;
        if (!parent) continue;
        parent.updateWorldMatrix(true, false);
        inv.setFromMatrix4(parent.matrixWorld).invert();
        tmp.copy(it.off).multiplyScalar(e).applyMatrix3(inv);
        it.m.position.add(tmp);
        it.applied.copy(tmp);
      }
    },
  };
}
