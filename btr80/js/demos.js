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
      ['Harakatlanuvchi qismlar', "porshen, porshen halqalari, porshen barmog'i, shatun, ishqalanish podshipniklari (vkladishlar), tirsakli val, maxovik"],
      ['Harakatsiz qismlar', "silindrlar bloki, blok kallagi, gilzalar, karter"],
      ['Silindr diametri va porshen yo\'li', '120 × 120 mm'],
      ['Ishlash tartibi', '1-5-4-2-6-3-7-8'],
    ],
    note: "Bitta ish sikli tirsakli valning ikki aylanishida (720°) bajariladi: har bir taktda porshen bir chetki nuqtadan (YuChN yoki PChN) ikkinchisiga yuradi. Yuqoridagi ko'rsatkich 1-silindrda hozir qaysi takt ketayotganini bildiradi.",
    labels: [
      { n: 1, mesh: 'piston_0', at: [0.5, 1, 0.5], text: 'Porshen (halqalari va barmog\'i bilan)' },
      { n: 2, mesh: 'rod_0', at: [0.5, 0.5, 0.5], text: 'Shatun' },
      { n: 3, mesh: 'crank', at: [0.25, 0.5, 0.5], text: 'Tirsakli val' },
      { n: 4, mesh: 'crank', at: [1, 0.95, 0.5], text: 'Maxovik' },
      { n: 5, gas: 0, text: "Silindr ichidagi gaz: ko'k — havo, oq — siqilgan havo, sariq-qizil — yonish, kulrang — ishlatilgan gazlar" },
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
      ['Tuzilishi', "taqsimlash vali (mushtchalar bilan), turtqichlar, shtanga, koromislo (o'qi bilan), prujina, qulflar, klapanlar, yuritma shesternyasi"],
      ['Harakat yo\'li', "yuritma shesternyasi → taqsimlash vali mushtchasi → turtqich → shtanga → koromislo → klapan"],
      ['Klapanni yopadi', 'klapan prujinasi (mushtcha turtqichni surmay qo\'yganda)'],
      ['Tezliklar nisbati', 'taqsimlash vali tirsakli valdan 2 marta sekin aylanadi'],
    ],
    note: "Tirsakli val ikki marta aylanganda har bir klapan bir marta ochiladi. Pastdagi ko'rsatkich 1-silindr klapanlarining holatini bildiradi.",
    labels: [
      { n: 1, mesh: 'crank', at: [0.25, 0.2, 0.5], text: 'Tirsakli val (harakat manbai)' },
      { n: 2, mesh: 'cam', at: [0.3, 0.5, 0.5], text: 'Taqsimlash vali va kulachoklar' },
      { n: 3, mesh: 'push_0', at: [0.5, 0.5, 0.5], text: 'Turtkich va shtanga' },
      { n: 4, mesh: 'valve_0', at: [0.5, 1, 0.5], text: 'Koromislo va klapanlar' },
      { n: 5, gas: 0, text: "Silindr ichidagi gaz: klapan ochilganda havo kiradi yoki gaz chiqadi" },
    ],
    fig: 'valvetrain',
  },
  {
    id: 'cool',
    from: 'radiator', // "Asosiy qismlar"dagi shu qismdan namoyishga o'tish tugmasi
    kind: 'Tizim',
    name: 'Sovutish tizimi',
    show: [], xray: ['radiator'], context: ['engine'], faint: [],
    swatches: [['#ff3b1f', 'issiq'], ['#ffb02e', 'iliq'], ['#2f9bff', 'radiatorda sovigan']],
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
  {
    id: 'oil',
    from: 'oil',
    kind: 'Tizim',
    name: 'Moylash tizimi',
    show: ['oil'], xray: [], context: ['engine'], faint: ['crank', 'valvetrain'],
    view: [0.15, 0.55, -1],
    swatches: [['#e0782a', 'issiq moy'], ['#f7d66a', 'sovigan, tozalangan moy'], ['#9a5f2a', 'karterga qaytayotgan moy']],
    desc: "Ishqalanuvchi detallarga moy uzatib, ularning yeyilishini kamaytiradi, sovitadi va tozalaydi. KamAZ-7403 da moylash kombinatsiyalangan: asosiy podshipniklar bosim bilan, silindr devorlari va boshqa detallar sachratib moylanadi.",
    circuits: {
      main: {
        title: 'Bosim bilan moylash',
        when: "Moy nasosining moylash seksiyasi moyni poddondan so'rib, to'liq oqimli filtr orqali bosh moy magistraliga haydaydi. Magistraldan moy podshipniklar va koromislolarga boradi, so'ng karterga oqib tushadi.",
        steps: ['Moy poddoni (karter)', 'Moy qabul qilgich va moy nasosi', "To'liq oqimli moy filtri", 'Bosh moy magistrali', "Tirsakli val o'zak va shatun podshipniklari", 'Taqsimlash vali podshipniklari', 'Koromislo vtulkalari, shtanga va turtkichlar', 'Ventilyator gidromuftasi', 'moy karterga oqib tushadi'],
      },
      rad: {
        title: 'Sovitish va tozalash',
        when: "Nasosning radiator seksiyasi moyni markazdan qochma filtrga, moy radiatoriga va issiqlik almashtirgichga yuboradi, keyin moy karterga qaytadi. Kran yopilsa, moy radiatorga bormaydi.",
        steps: ['Moy poddoni (karter)', 'Moy qabul qilgich va moy nasosi', 'Markazdan qochma moy filtri', 'Moy radiatori', 'Moy issiqlik almashtirgichi', 'moy karterga qaytadi'],
      },
    },
    list: [
      ['Tizim sig\'imi', '28 l'],
      ['Moy bosimi', '4–4,5 kgk/sm² (2600 ayl/daq), salt ishlashda kamida 1 kgk/sm²'],
      ['Moy', 'M-10G₂K'],
    ],
    note: "Nazorat: moy bosimi va harorati haydovchi asboblar panelidagi ko'rsatkichlarda kuzatiladi; moy harorati 90 °C dan oshsa yoki bosim tushsa, ogohlantiruvchi chiroq yonadi.",
    fig: 'oil',
  },
  {
    id: 'fuel',
    from: 'fuel',
    kind: 'Tizim',
    name: "Ta'minlash tizimi",
    show: ['fuel'], xray: ['crank'], context: ['engine'], faint: [],
    view: [0.35, 0.7, 1],
    swatches: [['#ffd24a', 'past bosim'], ['#ff3d24', 'yuqori bosim'], ['#b9a05a', 'qaytayotgan yoqilg\'i']],
    live: 'strokes',
    desc: "Yoqilg'ini saqlaydi, tozalaydi va dvigatel silindrlariga ishlash tartibiga mos ravishda, o'z vaqtida, yuqori bosim bilan, aniq miqdorda purkab beradi. Yoqilg'i: dizel (yozgi L, qishki Z, arktik A).",
    circuits: {
      feed: {
        title: "Yoqilg'i yo'li",
        when: "Bakdagi yoqilg'i kran va dag'al filtr orqali past bosimli nasosga, u yerdan mayin filtr orqali YuBYoN ga keladi. YuBYoN uni yuqori bosim bilan quvurlar orqali forsunkalarga haydaydi, forsunka silindrga to'zitib purkaydi.",
        steps: ["Yoqilg'i baklari (2 × 150 l)", "Yoqilg'i taqsimlash krani", "Dag'al tozalash filtri", "Past bosimli nasos (PBYoN) va qo'l nasosi", 'Mayin tozalash filtri', "Yuqori bosimli yoqilg'i nasosi (YuBYoN)", 'Yuqori bosimli quvurlar', 'Forsunkalar → silindr'],
      },
      ret: {
        title: 'Ortiqcha yoqilg\'i qaytishi',
        when: "Forsunkalardan sizib chiqqan va YuBYoN dan ortib qolgan yoqilg'i drenaj quvurlari orqali yig'ilib, baklarga qaytariladi.",
        steps: ['Forsunkalar', 'Drenaj quvurlari', 'YuBYoN', 'Qaytarish quvuri', "Yoqilg'i baklari"],
      },
    },
    list: [
      ['Baklar sig\'imi', '300 l (2 × 150 l)'],
      ['YuBYoN', "plunjerli, 8 seksiyali; aylanishlar rostlagichi va ilgarilatish muftasi bilan"],
      ['Silindrlarga uzatish tartibi', '1-5-4-2-6-3-7-8'],
      ['Forsunka', "yopiq turdagi, ko'p teshikli, ignali"],
    ],
    note: "Silindrdagi sariq konus — forsunka purkayotgan yoqilg'i. U siqish taktining oxirida, siqilib qizigan havoga purkaladi.",
    fig: 'fuel',
  },
  {
    id: 'start',
    from: 'starter',
    kind: 'Tizim',
    name: "O't oldirish (ishga tushirish) tizimi",
    show: ['starter'], xray: ['battery', 'crank'], context: ['engine'], faint: [],
    view: [0.1, 0.5, 1],
    focus: [[-3.4, 0.45, -0.5], [-1.9, 1.6, 0.6]], // kamera dvigatel atrofiga qaratiladi (akkumulyator oldinda, kabel bo'ylab)
    swatches: [['#ffe14d', 'elektr toki'], ['#ffd24a', 'yoqilg\'i']],
    live: 'strokes',
    desc: "KamAZ-7403 dizel dvigatelida uchqun (svecha) yo'q: siqish taktining oxirida havo 500–700 °C gacha qiziydi va forsunka purkagan yoqilg'i unda o'z-o'zidan alangalanadi. Dvigatelni o't oldirish uchun uni starter bilan aylantirish kerak; sovuq havoda elektrofakel havoni oldindan qizdiradi.",
    circuits: {
      starter: {
        title: 'Starter bilan ishga tushirish',
        when: "Kalit burilganda akkumulyatordan tok tortish relesiga boradi: rele shesternyani maxovik gardishiga kiritadi va starter dvigatelini ulaydi. Starter tirsakli valni aylantiradi, silindrlarda havo siqilib, purkalgan yoqilg'i o'z-o'zidan alangalanadi.",
        steps: ['Akkumulyator batareyalari (24 V)', 'Kuch kabeli', 'Starter tortish relesi', 'Starter elektrodvigateli', 'Shesternya va maxovik tishli gardishi'],
      },
      cold: {
        title: 'Sovuq havoda: elektrofakel',
        when: "Sovuq havoda elektromagnitli klapan ochilib, alangali shamlarga yoqilg'i beriladi; shamlar uni yoqib, kiritish kollektoridagi havoni qizdiradi. Qizigan havo silindrda yaxshiroq alangalanadi.",
        steps: ['Akkumulyator batareyalari (24 V)', "Elektromagnitli yoqilg'i klapani", 'Alangali shamlar (kiritish kollektorlarida)', "Mayin filtrdan yoqilg'i"],
      },
    },
    note: "Yuqoridagi ko'rsatkichda 1-silindrdagi takt: «Ish yo'li» boshida silindr qizarib yonadi — bu siqilishdan o'z-o'zidan alangalanish.",
    fig: 'battery',
  },
];

