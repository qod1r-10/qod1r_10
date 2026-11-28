// G'ildirak uzeli: tormoz barabani (g'ildirak bilan aylanadi), yuqori/pastki richaglar, torsion val,
// amortizator, siqilish buferi, yarim o'q va sharnir chexollari. Haqiqiy BTR modeli koordinatalarida
// (x — ko'ndalang, z — old tomon), g'ildirak markazi c bo'yicha quriladi.
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.5, ...o });
const OLIVE = M(0x4d5636, { metalness: 0.35, roughness: 0.6 }), STEEL = M(0x8d9296, { metalness: 0.8, roughness: 0.35 });
const DARK = M(0x2d302c), RUBBER = M(0x161716, { metalness: 0, roughness: 0.9 });
const Y = new THREE.Vector3(0, 1, 0);

function rod(a, b, r, mat, seg = 10) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, d.normalize());
  return m;
}
function tag(o, part, list) { o.traverse((m) => { if (m.isMesh) { m.userData.part = part; m.castShadow = true; list.push(m); } }); return o; }

export function buildWheelStation(real, steer, spin, c, list) {
  const s = Math.sign(c.x) || 1;   // chap/o'ng
  const inX = -s;                   // ichkariga yo'nalish (x bo'yicha)

  /* Tormoz barabani va kolodkalar — spin guruhida (lokal x = g'ildirak o'qi) */
  const drum = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.13, 32, 1, true), M(0x5a5f62, { side: THREE.DoubleSide }));
  shell.rotation.z = Math.PI / 2; drum.add(shell);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.015, 32), M(0x4a4e50)); back.rotation.z = Math.PI / 2; back.position.x = 0.065 * inX; drum.add(back);
  for (let i = 0; i < 12; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.03), M(0x4a4e50)); const a = (i / 12) * Math.PI * 2; fin.position.set(0, Math.cos(a) * 0.25, Math.sin(a) * 0.25); fin.rotation.x = -a; drum.add(fin); }
  drum.position.x = 0.2 * inX * (Math.sign(spin.quaternion.x) >= 0 ? 1 : 1);
  spin.add(tag(drum, 'brakes', list));

  /* Kolodkalar va tormoz silindri — aylanmaydi (steer guruhida) */
  const shoes = new THREE.Group();
  for (const k of [-1, 1]) {
    const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20, Math.PI * 0.8), M(0x8a6a3a, { metalness: 0.1, roughness: 0.85 }));
    shoe.rotation.y = Math.PI / 2; shoe.rotation.x = k > 0 ? Math.PI * 0.6 : -Math.PI * 0.4; shoes.add(shoe);
  }
  const wcyl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 12), STEEL); wcyl.position.set(0, 0.17, 0); wcyl.rotation.x = Math.PI / 2; shoes.add(wcyl);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.01, 28), M(0x3b3f3c)); plate.rotation.z = Math.PI / 2; plate.position.x = 0.07 * inX; shoes.add(plate);
  shoes.position.x = 0.2 * inX;
  steer.add(tag(shoes, 'brakes', list));

  /* Osma — kuzovga mahkamlangan (real guruhida, dunyo koordinatalarida) */
  const sus = new THREE.Group();
  const kx = c.x + inX * 0.32, px = c.x + inX * 0.72;   // shkvoren (bo'g'in) va kuzov sharnirlari
  for (const [dy, w] of [[0.24, 0.18], [-0.2, 0.24]]) {        // yuqori va pastki richag (A shakl)
    for (const dz of [-w, w]) sus.add(rod([px, c.y + dy + 0.03, c.z + dz], [kx, c.y + dy, c.z], 0.028, OLIVE));
    const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, w * 2 + 0.06, 12), DARK); bush.rotation.x = Math.PI / 2; bush.position.set(px, c.y + dy + 0.03, c.z); sus.add(bush);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), STEEL); ball.position.set(kx, c.y + dy, c.z); sus.add(ball);
  }
  sus.add(rod([kx, c.y + 0.24, c.z], [kx, c.y - 0.2, c.z], 0.035, OLIVE));                       // burilish mushti (shkvoren)
  sus.add(rod([px, c.y - 0.17, c.z], [px, c.y - 0.17, c.z - 0.95], 0.03, STEEL, 12));           // bo'ylama torsion val
  const anchor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), OLIVE); anchor.position.set(px, c.y - 0.17, c.z - 0.95); sus.add(anchor);
  const shockA = [c.x + inX * 0.38, c.y - 0.16, c.z + 0.12], shockB = [c.x + inX * 0.62, c.y + 0.52, c.z + 0.2];
  sus.add(rod(shockA, [ (shockA[0] + shockB[0]) / 2, (shockA[1] + shockB[1]) / 2, (shockA[2] + shockB[2]) / 2 ], 0.032, STEEL));
  sus.add(rod([(shockA[0] + shockB[0]) / 2, (shockA[1] + shockB[1]) / 2, (shockA[2] + shockB[2]) / 2], shockB, 0.045, OLIVE, 14));
  const bump = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 12), RUBBER); bump.position.set(kx + inX * 0.12, c.y + 0.36, c.z); sus.add(bump);
  real.add(tag(sus, 'suspension', list));

  /* Yarim o'q va sharnir chexollari */
  const hs = new THREE.Group();
  const inner = [c.x + inX * (Math.abs(c.x) - 0.2), c.y - 0.03, c.z], outer = [c.x + inX * 0.3, c.y, c.z];
  hs.add(rod(inner, outer, 0.028, STEEL, 12));
  for (const [p, dir] of [[outer, inX], [inner, -inX]]) {
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 0.13, 14), RUBBER);
    boot.rotation.z = (dir > 0 ? -1 : 1) * Math.PI / 2; boot.position.set(p[0] + dir * 0.07, p[1], p[2]); hs.add(boot);
  }
  real.add(tag(hs, 'halfshafts', list));
}
