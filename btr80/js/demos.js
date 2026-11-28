// "Qo'shimcha" bo'limi: dvigatelning mexanizmlari va tizimlarini alohida, ishlab turgan holda ko'rsatish.
// Har bir namoyishda faqat shu qismlar ko'rinadi, dvigatel uzluksiz ishlaydi, "Yoyilma" o'chiriladi.
//   show  — to'liq ko'rinadigan qismlar
//   xray  — yarim shaffof (ichidagi oqim yoki harakat ko'rinishi uchun)
//   faint — juda xira kontekst (dvigatel korpusi)
// labels: modeldagi detal nomi va uning chegaraviy qutisidagi nisbiy nuqta (0…1) bo'yicha yorliq.

export const STROKES = [
  ['Kiritish', "Porshen pastga yuradi, kiritish klapani ochiq: silindrga havo so'riladi."],
  ['Siqish', 'Ikkala klapan yopiq, porshen yuqoriga yuradi: havo siqilib, 500–700 °C gacha qiziydi.'],
  ["Ish yo'li", "Forsunka yonilg'i purkaydi, u qizigan havoda o'z-o'zidan alangalanadi; gazlar porshenni pastga itaradi."],
  ['Chiqarish', 'Chiqarish klapani ochiq, porshen yuqoriga yuradi: ishlatilgan gazlar silindrdan chiqariladi.'],
];

export const DEMOS = [
  {
    id: 'kshm',
    from: 'crank', // "Asosiy qismlar"dagi shu qismdan namoyishga o'tish tugmasi
    kind: 'Mexanizm',
    name: 'Krivoship-shatun mexanizmi',
    show: ['crank'], xray: [], faint: ['engine'],
    view: [0.55, 0.45, 1], // kamera yo'nalishi (ichki tizimda: x — old, y — yuqori, z — yon)
    desc: "Porshenning ilgarilama-qaytma harakatini tirsakli valning aylanma harakatiga aylantiradi. KamAZ-740 da 8 ta silindr ikki qatorda V-simon (90°) joylashgan, tirsakli valning har bir tirsagiga ikkita shatun ulangan.",
    live: 'strokes',
    list: [
      ["Qo'zg'aluvchan qismlar", "porshen, porshen halqalari, porshen barmog'i, shatun, tirsakli val, maxovik"],
      ["Qo'zg'almas qismlar", "silindrlar bloki, silindr gilzalari, silindrlar kallagi, karter"],
      ['Silindr diametri va porshen yo\'li', '120 × 120 mm'],
      ['Ishlash tartibi', '1-5-4-2-6-3-7-8'],
    ],
    note: "Bitta ish sikli tirsakli valning ikki aylanishida (720°) bajariladi. Pastdagi ko'rsatkich 1-silindrda hozir qaysi takt ketayotganini bildiradi.",
    labels: [
      { mesh: 'piston_0', at: [0.5, 1, 0.5], text: 'Porshen' },
      { mesh: 'rod_0', at: [0.5, 0.5, 0.5], text: 'Shatun' },
      { mesh: 'crank', at: [0.25, 0.5, 0.5], text: 'Tirsakli val' },
      { mesh: 'crank', at: [1, 0.95, 0.5], text: 'Maxovik' },
    ],
    fig: 'crank',
  },
  {
    id: 'gtm',
    from: 'valvetrain', // "Asosiy qismlar"dagi shu qismdan namoyishga o'tish tugmasi
    kind: 'Mexanizm',
    name: 'Gaz taqsimlash mexanizmi',
    show: ['valvetrain'], xray: ['crank'], faint: ['engine'],
    view: [0.3, 0.8, 1],
    desc: "Silindrlarga havo kiritish va ishlatilgan gazlarni chiqarish uchun klapanlarni o'z vaqtida ochib-yopadi. KamAZ-740 da klapanlar kallakda (yuqorida), taqsimlash vali esa blokda, silindr qatorlari orasida joylashgan.",
    live: 'valves',
    list: [
      ['Harakat yo\'li', "tirsakli val shesternyasi → taqsimlash vali → kulachok → turtkich → shtanga → koromislo → klapan"],
      ['Klapanni yopadi', 'klapan prujinasi'],
      ['Tezliklar nisbati', 'taqsimlash vali tirsakli valdan 2 marta sekin aylanadi'],
    ],
    note: "Tirsakli val ikki marta aylanganda har bir klapan bir marta ochiladi. Pastdagi ko'rsatkich 1-silindr klapanlarining holatini bildiradi.",
    labels: [
      { mesh: 'cam', at: [0.3, 0.5, 0.5], text: 'Taqsimlash vali' },
      { mesh: 'push_0', at: [0.5, 0.5, 0.5], text: 'Shtanga' },
      { mesh: 'valve_0', at: [0.5, 1, 0.5], text: 'Klapanlar' },
      { mesh: 'crank', at: [0.25, 0.2, 0.5], text: 'Tirsakli val' },
    ],
    fig: 'valvetrain',
  },
  {
    id: 'cool',
    from: 'radiator', // "Asosiy qismlar"dagi shu qismdan namoyishga o'tish tugmasi
    kind: 'Tizim',
    name: 'Sovutish tizimi',
    show: [], xray: ['radiator'], context: ['engine'], faint: [],
    view: [-0.25, 0.6, 1],
    desc: "Suyuqlik bilan sovitiladigan, majburiy aylanishli yopiq tizim. Nasos suyuqlikni dvigatel g'iloflari orqali haydaydi, suyuqlik qaysi doirada aylanishini esa termostat hal qiladi.",
    circuits: {
      small: {
        title: 'Kichik doira',
        when: "Dvigatel sovuq, suyuqlik 80 °C dan past. Termostat yopiq: suyuqlik radiatorga bormaydi, shuning uchun dvigatel tezroq qiziydi.",
        steps: ['Suyuqlik nasosi', "Silindrlar bloki g'ilofi", "Silindrlar kallagi g'ilofi", "Suv yig'uvchi quvurlar", 'Termostat (yopiq)', "Aylanib o'tish shlangi", 'yana suyuqlik nasosiga'],
      },
      large: {
        title: 'Katta doira',
        when: "Dvigatel qizigan: termostat 80 °C da ochila boshlaydi, 93 °C da to'liq ochiladi. Issiq suyuqlik radiatorda ventilyator haydagan havo bilan soviydi.",
        steps: ['Suyuqlik nasosi', "Silindrlar bloki g'ilofi", "Silindrlar kallagi g'ilofi", "Suv yig'uvchi quvurlar", 'Termostat (ochiq)', 'Yuqori shlang', 'Radiator: yuqori bakcha → o\'zak → pastki bakcha', 'Pastki shlang', 'yana suyuqlik nasosiga'],
      },
    },
    note: "Kengaytiruvchi bakcha suyuqlik qizib kengayganda ortiqchasini qabul qiladi va tizimni to'ldirib turadi. Ventilyator dvigateldan gidromufta orqali aylanadi.",
    fig: 'radiator',
  },
];
