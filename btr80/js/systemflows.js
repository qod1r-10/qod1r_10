// Moylash, ta'minlash va ishga tushirish tizimlaridagi oqimlar (ma'ruzalar 5/1 va 6/1 sxemalari bo'yicha).
// Koordinatalar model.js dagi ichki tizimda: x — old tomon, y — yuqori, z — chap/o'ng.
// Har bir tizimda ikkita doira/rejim bor; yorliqlar raqami paneldagi ro'yxat bilan bir xil.
import * as THREE from 'three';
import { makeFlow } from './coolflow.js';

const C = (h) => new THREE.Color(h);
const L = (n, text, pos, unit) => ({ n, text, pos, unit });

/* ---------------- MOYLASH ---------------- */
const OIL_HOT = C('#e0782a'), OIL = C('#f0a030'), OIL_COOL = C('#f7d66a'), OIL_DRAIN = C('#9a5f2a');
export function buildOilFlow() {
  const F = makeFlow('oilflow', ['main', 'rad']);
  for (const k of ['main', 'rad']) F.seg(k, [[-2.93, 0.53, 0], [-2.8, 0.545, 0], [-2.66, 0.6, 0]], OIL_DRAIN, OIL);
  // asosiy: nasosning moylash seksiyasi -> to'liq oqimli filtr -> bosh magistral -> podshipniklar, koromislolar
  F.seg('main', [[-2.58, 0.62, -0.03], [-2.55, 0.7, -0.4], [-2.55, 0.86, -0.52]], OIL, OIL);
  F.seg('main', [[-2.6, 0.9, -0.52], [-2.6, 1.07, -0.52], [-2.5, 1.07, -0.52], [-2.5, 0.92, -0.52]], OIL, OIL_COOL, 0.011);
  F.seg('main', [[-2.5, 1.1, -0.5], [-2.47, 1.02, -0.3], [-2.45, 0.93, 0.12]], OIL_COOL, OIL_COOL);
  F.seg('main', [[-2.45, 0.93, 0.12], [-2.9, 0.93, 0.12], [-3.3, 0.93, 0.12]], OIL_COOL, OIL_COOL, 0.015);
  for (const x of [-2.45, -2.66, -2.87, -3.08, -3.29]) F.seg('main', [[x, 0.93, 0.12], [x, 0.86, 0.07], [x, 0.79, 0.01]], OIL_COOL, OIL, 0.01);
  for (const x of [-2.55, -3.0]) F.seg('main', [[x, 0.93, 0.12], [x, 0.97, 0.07], [x, 1.0, 0.02]], OIL_COOL, OIL, 0.009);
  for (const s of [-1, 1]) {
    for (const x of [-2.6, -3.15]) F.seg('main', [[x, 0.93, 0.12], [x, 1.05, 0.18 * s + 0.02], [x, 1.2, 0.28 * s]], OIL_COOL, OIL, 0.01);
    F.seg('main', [[-2.5, 1.2, 0.28 * s], [-2.9, 1.21, 0.28 * s], [-3.27, 1.2, 0.28 * s]], OIL, OIL_HOT, 0.011);
    F.seg('main', [[-3.27, 1.2, 0.3 * s], [-3.33, 0.92, 0.28 * s], [-3.27, 0.62, 0.15 * s], [-3.0, 0.53, 0.04 * s]], OIL_HOT, OIL_DRAIN);
  }
  F.seg('main', [[-3.3, 0.93, 0.12], [-3.36, 1.15, 0.06], [-3.34, 1.38, 0.01]], OIL_COOL, OIL); // gidromufta
  F.seg('main', [[-2.87, 0.76, 0], [-2.87, 0.6, 0], [-2.86, 0.54, 0]], OIL_HOT, OIL_DRAIN, 0.011);
  // radiator: nasosning radiator seksiyasi -> markazdan qochma filtr -> moy radiatori -> issiqlik almashtirgich -> karter
  F.seg('rad', [[-2.7, 0.6, -0.04], [-2.95, 0.66, -0.35], [-3.1, 0.93, -0.47]], OIL_HOT, OIL_HOT);
  F.seg('rad', [[-3.1, 0.95, -0.47], [-3.1, 1.08, -0.47]], OIL_HOT, OIL_HOT, 0.011);
  F.seg('rad', [[-3.1, 1.02, -0.42], [-3.1, 0.88, -0.36], [-3.3, 1.05, -0.5], [-3.46, 1.3, -0.66]], OIL_HOT, OIL_HOT);
  F.seg('rad', [[-3.5, 1.3, -0.56], [-3.5, 1.36, -0.78], [-3.5, 1.42, -0.56], [-3.5, 1.48, -0.78], [-3.5, 1.54, -0.56], [-3.5, 1.6, -0.78], [-3.5, 1.62, -0.66]], OIL_HOT, OIL_COOL, 0.011);
  F.seg('rad', [[-3.46, 1.62, -0.66], [-3.25, 1.5, -0.5], [-3.0, 1.3, -0.35], [-2.98, 0.9, -0.38], [-3.04, 0.66, -0.44]], OIL_COOL, OIL_COOL);
  F.seg('rad', [[-3.06, 0.64, -0.44], [-2.74, 0.64, -0.44]], OIL_COOL, OIL_COOL, 0.015);
  F.seg('rad', [[-2.74, 0.64, -0.44], [-2.7, 0.56, -0.25], [-2.78, 0.53, -0.03]], OIL_COOL, OIL_DRAIN);
  const common = [L(1, 'Moy poddoni (karter)', [-3.0, 0.48, 0.22], 'u_engine'), L(2, "Moy qabul qilgich va moy nasosi", [-2.62, 0.55, 0.1], 'u_oilpump')];
  const labels = {
    main: [...common,
      L(3, "To'liq oqimli moy filtri", [-2.55, 1.15, -0.56], 'u_ff'),
      L(4, 'Bosh moy magistrali', [-2.72, 0.93, 0.18], 'u_engine'),
      L(5, "Tirsakli val o'zak va shatun podshipniklari", [-3.29, 0.76, 0.03], 'u_engine'),
      L(6, 'Taqsimlash vali podshipniklari', [-3.05, 1.04, 0.02], 'u_engine'),
      L(7, 'Koromislo vtulkalari, shtanga va turtkichlar', [-2.85, 1.24, 0.3], 'u_engine'),
      L(8, 'Ventilyator gidromuftasi', [-3.34, 1.44, 0.04], 'u_coupling'),
    ],
    rad: [...common,
      L(3, 'Markazdan qochma moy filtri', [-3.1, 1.16, -0.47], 'u_cf'),
      L(4, 'Moy radiatori', [-3.5, 1.72, -0.66], 'u_oilrad'),
      L(5, 'Moy issiqlik almashtirgichi', [-2.9, 0.56, -0.5], 'u_he'),
    ],
  };
  return { ...F, labels };
}

/* ---------------- TA'MINLASH ---------------- */
const FUEL = C('#ffd24a'), FUEL_P = C('#ff9a2a'), FUEL_HP = C('#ff3d24'), FUEL_RET = C('#b9a05a');
export function buildFuelFlow(ud) {
  const F = makeFlow('fuelflow', ['feed', 'ret']);
  const P = ud.fuelPaths || { hp: [], drain: [], ret: [] };
  for (const s of [-1, 1]) {
    F.seg('feed', [[-1.8, 1.55, 0.78 * s], [-1.8, 1.0, 0.75 * s], [-1.8, 0.87, 0.64 * s]], FUEL, FUEL);
    F.seg('feed', [[-1.8, 0.86, 0.62 * s], [-1.7, 0.85, 0.3 * s], [-1.62, 0.92, 0.04 * s]], FUEL, FUEL);
  }
  F.seg('feed', [[-1.62, 0.92, 0], [-1.85, 0.95, -0.25], [-2.05, 0.95, -0.32]], FUEL, FUEL);
  F.seg('feed', [[-2.05, 0.95, -0.32], [-2.06, 0.78, -0.33], [-2.04, 0.95, -0.3], [-2.2, 0.95, -0.12]], FUEL, FUEL, 0.011);
  F.seg('feed', [[-2.2, 1.06, -0.12], [-2.15, 1.1, 0.15], [-2.12, 1.05, 0.32]], FUEL_P, FUEL_P);
  F.seg('feed', [[-2.12, 1.05, 0.32], [-2.12, 1.28, 0.32]], FUEL_P, FUEL_P, 0.011);
  F.seg('feed', [[-2.12, 1.28, 0.32], [-2.3, 1.38, 0.15], [-2.45, 1.37, 0.02]], FUEL_P, FUEL_P);
  F.seg('feed', [[-2.44, 1.37, 0], [-2.6, 1.37, 0], [-2.78, 1.37, 0]], FUEL_P, FUEL_HP, 0.015);
  for (const pts of P.hp) F.seg('feed', pts, FUEL_HP, FUEL_HP, 0.008);
  for (const j of ud.injectors || []) F.seg('feed', [j.top, j.tip], FUEL_HP, FUEL_HP, 0.008);
  for (const pts of P.drain) F.seg('ret', pts, FUEL_RET, FUEL_RET, 0.008);
  for (const pts of P.ret) F.seg('ret', pts, FUEL_RET, FUEL_RET, 0.011);
  F.seg('ret', [[-2.7, 1.37, 0], [-2.42, 1.4, 0]], FUEL_RET, FUEL_RET, 0.01);
  const hp0 = P.hp[3] || P.hp[0], j0 = (ud.injectors || [])[0];
  const mid = hp0 ? hp0[2] : [-2.6, 1.55, 0];
  const injPos = j0 ? j0.top.toArray() : [-2.6, 1.2, 0.35];
  const labels = {
    feed: [
      L(1, "Yoqilg'i baklari (2 × 150 l)", [-1.8, 1.62, -0.78], 'u_tank_l'),
      L(2, "Yoqilg'i taqsimlash krani", [-1.62, 1.04, 0], 'u_kran'),
      L(3, "Dag'al tozalash filtri", [-2.05, 0.66, -0.32], 'u_coarse'),
      L(4, "Past bosimli nasos (PBYoN) va qo'l nasosi", [-2.2, 1.14, -0.12], 'u_prime'),
      L(5, 'Mayin tozalash filtri', [-2.12, 1.34, 0.32], 'u_fine'),
      L(6, "Yuqori bosimli yoqilg'i nasosi (YuBYoN)", [-2.62, 1.5, 0], 'u_tnvd'),
      L(7, 'Yuqori bosimli quvurlar', mid, 'u_hp'),
      L(8, 'Forsunkalar → silindr', injPos),
    ],
    ret: [
      L(1, 'Forsunkalar', injPos),
      L(2, 'Drenaj quvurlari', P.drain[0] ? P.drain[0][1] : [-2.8, 1.2, 0.35]),
      L(3, 'YuBYoN', [-2.62, 1.5, 0], 'u_tnvd'),
      L(4, 'Qaytarish quvuri', [-2.05, 1.6, 0.1]),
      L(5, "Yoqilg'i baklari", [-1.8, 1.62, 0.78], 'u_tank_r'),
    ],
  };
  return { ...F, labels };
}

/* ---------------- ISHGA TUSHIRISH (O'T OLDIRISH) ---------------- */
const AMP = C('#ffe14d'), AMP2 = C('#fff6b0');
export function buildStartFlow() {
  const F = makeFlow('startflow', ['starter', 'cold']);
  const cable = [[1.55, 0.95, -0.62], [1.3, 0.62, -0.5], [0.5, 0.5, 0.05], [-1.3, 0.5, 0.55], [-2.3, 0.56, 0.45], [-2.62, 0.74, 0.34]];
  for (const k of ['starter', 'cold']) F.seg(k, cable, AMP2, AMP, 0.016);
  F.seg('starter', [[-2.62, 0.72, 0.32], [-2.5, 0.62, 0.3], [-2.38, 0.6, 0.25]], AMP, AMP, 0.012);
  F.seg('cold', [[-2.3, 0.56, 0.45], [-2.7, 1.2, 0.35], [-3.05, 1.45, 0.2], [-3.25, 1.43, 0.16]], AMP, AMP, 0.01);
  F.seg('cold', [[-3.05, 1.45, 0.2], [-3.2, 1.47, 0], [-3.25, 1.43, -0.16]], AMP, AMP, 0.01);
  F.seg('cold', [[-2.12, 1.28, 0.32], [-2.6, 1.55, 0.12], [-3.0, 1.52, 0.02], [-3.15, 1.47, 0]], FUEL, FUEL, 0.009);
  const labels = {
    starter: [
      L(1, 'Akkumulyator batareyalari (24 V)', [1.55, 1.08, -0.77]),
      L(2, 'Kuch kabeli', [-0.4, 0.5, 0.3], 'u_cable'),
      L(3, 'Starter tortish relesi', [-2.5, 0.78, 0.33], 'u_starter'),
      L(4, 'Starter elektrodvigateli', [-2.68, 0.5, 0.33], 'u_starter'),
      L(5, 'Shesternya va maxovik tishli gardishi', [-2.33, 0.52, 0.2], 'u_starter'),
    ],
    cold: [
      L(1, 'Akkumulyator batareyalari (24 V)', [1.55, 1.08, -0.77]),
      L(2, "Elektromagnitli yoqilg'i klapani", [-3.15, 1.53, 0], 'u_efakel'),
      L(3, 'Alangali shamlar (kiritish kollektorlarida)', [-3.25, 1.47, 0.18], 'u_efakel'),
      L(4, "Mayin filtrdan yoqilg'i", [-2.6, 1.6, 0.12]),
    ],
  };
  return { ...F, labels };
}
