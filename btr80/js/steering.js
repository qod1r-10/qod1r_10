// Rul boshqarmasi: rul mexanizmi (reduktor), soshka, bo'ylama tortqi, gidrokuchaytirgich silindri,
// 1- va 2-ko'priklarning ko'ndalang tortqilari va burilish richaglari, ular orasidagi oraliq richag.
// Haqiqiy BTR modeli koordinatalarida: x — ko'ndalang, z — old tomon. update(steer) bilan harakatlanadi.
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.45, ...o });
const OLIVE = M(0x56603f, { metalness: 0.35, roughness: 0.6 }), STEEL = M(0x9aa0a4, { metalness: 0.8, roughness: 0.3 }), DARK = M(0x2c2f2c);
const Y = new THREE.Vector3(0, 1, 0);

function rodMesh(r, mat) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat); }
function setRod(m, a, b) {
  const d = b.clone().sub(a);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.scale.set(1, d.length(), 1);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
}
const ball = (r = 0.03) => new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), STEEL);

export function buildSteering(axleZ) {
  const g = new THREE.Group();
  const [z1, z2] = axleZ;           // old ikki ko'prik
  const KX = 0.82, YT = 0.5;        // burilish richaglari uchi, tortqilar balandligi
  const GB = new THREE.Vector3(0.5, 0.78, 2.72); // rul mexanizmi (haydovchi ostida, chapda)

  // rul mexanizmi korpusi va gidronasos
  const gbox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.22), OLIVE); gbox.position.copy(GB); g.add(gbox);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16), DARK); pump.rotation.z = Math.PI / 2; pump.position.set(0.32, 0.95, 2.95); g.add(pump);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.32, 0.95, 2.95), new THREE.Vector3(0.42, 0.85, 2.85), GB.clone().add(new THREE.Vector3(-0.05, 0.05, 0.05))]), 20, 0.012, 6), DARK); g.add(hose);

  // harakatlanuvchi qismlar
  const pitman = rodMesh(0.025, OLIVE), drag = rodMesh(0.022, STEEL), booster = rodMesh(0.045, OLIVE), boosterRod = rodMesh(0.018, STEEL);
  const link12 = rodMesh(0.022, STEEL), idler = rodMesh(0.025, OLIVE);
  const tie = [rodMesh(0.022, STEEL), rodMesh(0.022, STEEL)];
  const arms = [[rodMesh(0.024, OLIVE), rodMesh(0.024, OLIVE)], [rodMesh(0.024, OLIVE), rodMesh(0.024, OLIVE)]];
  const joints = Array.from({ length: 8 }, () => ball());
  [pitman, drag, booster, boosterRod, link12, idler, ...tie, ...arms.flat(), ...joints].forEach((m) => g.add(m));

  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  function update(steer) {
    const a = steer;                                   // g'ildirak burilish burchagi (rad)
    // soshka: rul mexanizmidan pastga, burilishga qarab oldinga-orqaga tebranadi
    const pTop = GB.clone().add(v(0, -0.1, 0));
    const pEnd = pTop.clone().add(v(0, -0.2 * Math.cos(a * 1.4), 0.2 * Math.sin(a * 1.4)));
    setRod(pitman, pTop, pEnd);
    // 1-ko'prik chap burilish richagi (bo'ylama tortqi shunga ulanadi)
    const k1 = v(KX, YT, z1), arm1End = k1.clone().add(v(Math.sin(a) * 0.04, 0.12, -0.18 * Math.cos(a) - 0.0));
    setRod(drag, pEnd, arm1End);
    // gidrokuchaytirgich: bo'ylama tortqiga parallel silindr va shtok
    const bA = pEnd.clone().lerp(arm1End, 0.25).add(v(-0.1, 0, 0)), bB = pEnd.clone().lerp(arm1End, 0.75).add(v(-0.1, 0, 0));
    setRod(booster, bA, bA.clone().lerp(bB, 0.55)); setRod(boosterRod, bA.clone().lerp(bB, 0.55), bB);
    // ko'ndalang tortqilar va burilish richaglari (har ikkala ko'prikda)
    [[z1, a, 0], [z2, a * 0.55, 1]].forEach(([z, ang, i]) => {
      const L = v(KX, YT, z), R = v(-KX, YT, z);
      const lEnd = L.clone().add(v(-0.18 * Math.sin(0.25 + ang) * 0 - 0.04, 0, -0.2)).add(v(Math.sin(ang) * 0.12, 0, 0));
      const rEnd = R.clone().add(v(0.04, 0, -0.2)).add(v(Math.sin(ang) * 0.12, 0, 0));
      setRod(arms[i][0], L, lEnd); setRod(arms[i][1], R, rEnd); setRod(tie[i], lEnd, rEnd);
      joints[i * 2].position.copy(lEnd); joints[i * 2 + 1].position.copy(rEnd);
    });
    // oraliq richag va 1-2 ko'priklar orasidagi tortqi
    const idTop = v(0.62, 0.62, (z1 + z2) / 2), idEnd = idTop.clone().add(v(0, -0.14, Math.sin(a) * 0.12));
    setRod(idler, idTop, idEnd);
    const k2arm = v(KX, YT + 0.1, z2 - 0.15 + Math.sin(a * 0.55) * 0.05);
    setRod(link12, arm1End.clone().add(v(0, -0.06, -0.02)), k2arm);
    joints[4].position.copy(pEnd); joints[5].position.copy(arm1End); joints[6].position.copy(idEnd); joints[7].position.copy(k2arm);
  }
  update(0);
  g.traverse((m) => { if (m.isMesh) { m.userData.part = 'steering'; m.castShadow = true; } });
  return { group: g, update };
}
