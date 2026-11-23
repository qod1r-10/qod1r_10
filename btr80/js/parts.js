// BTR-80 qismlari: o'ng paneldagi ro'yxat va 3D modeldagi obyektlar shu id'lar orqali bog'lanadi.

export const VEHICLE = {
  name: 'BTR-80',
  full: 'Zirhli transportyor BTR-80',
  desc: "Sakkiz g'ildirakli (8×8) suzuvchi zirhli transportyor. Motoatchilar bo'linmasini jang maydoniga olib borish, ularni o'q bilan qo'llab-quvvatlash va o'qotar quroldan himoya qilish uchun mo'ljallangan. 1984-yilda qurollanishga qabul qilingan.",
  specs: [
    ['Ekipaj', '3 + 7 desant'],
    ['Jangovar massa', '13,6 t'],
    ["O'lchamlari", '7,65 × 2,90 × 2,41 m'],
    ['Dvigatel', 'KamAZ-7403, 260 o.k.'],
    ['Eng katta tezlik', '80 km/soat, suvda 9'],
    ['Yurish zaxirasi', '600 km'],
    ["G'ildirak formulasi", '8×8'],
    ['Qurollanish', '14,5 mm KPVT, 7,62 mm PKT'],
  ],
};

export const CATEGORIES = [
  {
    id: 'korpus',
    name: 'Zirhli korpus',
    desc: "Payvandlangan po'lat zirh listlaridan yasalgan germetik korpus. Ichki qismi boshqaruv, jangovar, desant va dvigatel-transmissiya bo'limlariga bo'lingan.",
    parts: [
      { id: 'hull', name: 'Korpus', desc: "Qiya joylashtirilgan zirh listlari o'q va snaryad parchalariga chidamlilikni oshiradi. Korpus germetik bo'lgani uchun mashina suzib o'ta oladi.", specs: [['Material', "Zirhli po'lat"], ['Turi', 'Payvandlangan, germetik']] },
      { id: 'hatch_front', name: 'Haydovchi va komandir lyuklari', desc: "Boshqaruv bo'limi tomidagi ikki lyuk. Ekipaj mashinaga shu lyuklar orqali chiqadi va tushadi." },
      { id: 'hatch_roof', name: "Desant bo'limi lyuklari", desc: "Desant bo'limi tomidagi lyuklar. Desantchilar ular orqali chiqadi va yuqoriga qarab o't ochishi mumkin." },
      { id: 'side_doors', name: 'Yon eshiklar', desc: "Ikkinchi va uchinchi ko'priklar orasida, har ikki yonda joylashgan. Yuqori qismi yonga, pastki qismi pastga ochilib zinapoya bo'ladi. Desantchilar g'ildiraklar panasida chiqadi." },
      { id: 'vision', name: 'Kuzatish oynalari va priborlari', desc: "Haydovchi va komandir oldidagi o'q o'tmaydigan oynalar jangda zirhli qopqoqlar bilan yopiladi. Korpus yonlaridagi periskopik priborlar orqali atrof kuzatiladi." },
    ],
  },
  {
    id: 'qurol',
    name: 'Qurollanish',
    desc: "Bir kishilik konussimon minorada 14,5 mm KPVT va u bilan juftlashtirilgan 7,62 mm PKT pulemyotlari o'rnatilgan.",
    parts: [
      { id: 'turret', name: 'Minora', desc: "360° buriladigan konussimon minora. Ichida o'q otuvchining joyi, nishonga olish va burish mexanizmlari joylashgan.", specs: [['Burilish', '360°'], ["Ko'tarish burchagi", '−4° … +60°']] },
      { id: 'kpvt', name: '14,5 mm KPVT pulemyoti', desc: "Yirik kalibrli asosiy pulemyot. Yengil zirhlangan texnika, o'q otish nuqtalari va past uchayotgan havo nishonlariga qarshi qo'llaniladi.", specs: [['Kalibr', '14,5×114 mm'], ["O'q-dorilar", '500 ta']] },
      { id: 'pkt', name: '7,62 mm PKT pulemyoti', desc: "KPVT bilan juftlashtirilgan pulemyot. Tirik kuch va himoyalanmagan nishonlarni yo'q qilish uchun.", specs: [['Kalibr', '7,62×54 mm'], ["O'q-dorilar", '2000 ta']] },
      { id: 'sight', name: '1PZ-2 nishon qurilmasi', desc: "Periskopik optik nishon. Yer va havo nishonlariga o'q otishda pulemyotlarni nishonga olish uchun.", specs: [['Kattalashtirish', '1,2× va 4×']] },
      { id: 'smoke', name: '902V «Tucha» tutun granata otgichlari', desc: "Minoraning orqa qismidagi 6 ta otgich. Tutun pardasi hosil qilib, mashinani dushman kuzatuvidan yashiradi.", specs: [['Soni', '6 ta'], ['Kalibr', '81 mm']] },
    ],
  },
  {
    id: 'dvigatel',
    name: "Dvigatel-transmissiya bo'limi",
    desc: "Korpusning orqa qismida joylashgan. Dvigatel, uning tizimlari va kuchni g'ildiraklarga uzatuvchi agregatlardan iborat.",
    parts: [
      { id: 'engine', name: 'KamAZ-740 dvigateli', desc: "8 silindrli, V-simon, to'rt taktli, turbonaddivli, suyuqlik bilan sovutiladigan dizel dvigatel.", specs: [['Quvvat', '260 o.k.'], ['Silindrlar', '8 (V8)'], ['Ish hajmi', '10,85 l']] },
      { id: 'crank', name: 'Krivoship-shatun mexanizmi', desc: "Porshenning ilgarilama-qaytma harakatini tirsakli valning aylanma harakatiga aylantiradi. Qo'zg'aluvchan qismlari: porshen, porshen halqalari va barmog'i, shatun, tirsakli val, maxovik. Qo'zg'almas qismlari: silindrlar bloki, karter, silindr kallagi.", specs: [['Silindrlar', '8, V-simon 90°'], ['Diametr × porshen yo\'li', '120 × 120 mm']] },
      { id: 'valvetrain', name: 'Gaz taqsimlash mexanizmi', desc: "Silindrlarga havo kiritish va ishlatilgan gazlarni chiqarish uchun klapanlarni o'z vaqtida ochib-yopadi. Taqsimlash vali harakatni tirsakli valdan oladi va undan 2 marta sekin aylanadi.", specs: [['Klapanlar', 'kirituvchi va chiqaruvchi, 16 ta'], ['Taqsimlash vali', 'tirsakli valdan 2 marta sekin']] },
      { id: 'radiator', name: 'Sovutish tizimi', desc: "Suyuqlik bilan sovitiladigan yopiq tizim. Suyuqlik nasosi sovitish suyuqligini dvigatel g'ilofi orqali haydaydi; termostat dvigatel qizigunga qadar uni kichik doirada aylantiradi, qizigach radiatorga (katta doiraga) yo'naltiradi. Radiator dvigatel bo'limi tomidagi jalyuzlar ostida yotadi, uni gidromufta orqali yuritiladigan ventilyator havo bilan sovitadi. Kengaytiruvchi bakcha suyuqlik hajmining o'zgarishini qoplaydi, moy radiatori esa dvigatel moyini sovitadi.", specs: [['Sovutish suyuqligi', '48 l antifriz'], ["Me'yoriy harorat", '85–95 °C'], ['Doiralar', 'kichik va katta']] },
      { id: 'gearbox', name: 'Ilashish muftasi va uzatmalar qutisi', desc: "Ikki diskli quruq ilashish muftasi va 5 pog'onali mexanik uzatmalar qutisi dvigatel bilan bir blokda o'rnatilgan. Barcha uzatmalarda shesternyalar doimiy ilashishda, 2–5-uzatmalarda sinxronizatorlar bor: ular uzatmalarni shovqinsiz ulaydi; yurgizish rejimida ulangan juftlik yorishadi.", specs: [['Uzatmalar', '5 old + 1 orqa']] },
      { id: 'transfer', name: 'Taqsimlash qutisi', desc: "Burovchi momentni oldingi va orqa ko'priklar o'rtasida taqsimlaydi. Ikki diapazonli, differensialni blokirovka qilish mumkin. Suv to'pi uchun quvvat olish qurilmasi shu yerda." },
      { id: 'shafts', name: 'Kardan uzatmalari', desc: "Taqsimlash qutisidan to'rtta ko'prikka, chig'ir reduktoriga va suv otgich harakatlantirgichiga burovchi momentni uzatuvchi vallar. Uzun vallar oraliq tayanchlarga o'rnatilgan, sharnirlarda krestovinalar bor." },
      { id: 'fuel', name: "Yonilg'i baklari", desc: "Desant bo'limi bilan dvigatel bo'limi orasidagi to'siq yonida joylashgan baklar.", specs: [['Umumiy hajm', '≈300 l']] },
    ],
  },
  {
    id: 'yurish',
    name: 'Yurish qismi',
    desc: "8×8 g'ildirak formulasi. Bitta yoki ikkita g'ildirak ishdan chiqsa ham mashina harakatni davom ettira oladi.",
    parts: [
      { id: 'wheels', name: "G'ildiraklar (8 ta)", desc: "O'q tekkanda ham ishlay oladigan KI-80 shinalari. Markazlashtirilgan shina bosimini boshqarish tizimi bosimni yurish paytida o'zgartirish imkonini beradi.", specs: [["Shina o'lchami", '13.00-18'], ['Boshqariladigan', "1- va 2-ko'prik"]] },
      { id: 'axles', name: "Ko'priklar (4 ta)", desc: "Har bir ko'prikda bosh uzatma (yetaklovchi shesternya va yetaklanuvchi tishli g'ildirak) hamda differensial bor. Differensial burilishda chap va o'ng g'ildiraklarning har xil tezlikda aylanishiga imkon beradi. Moment g'ildiraklarga g'ildirak reduktorlari orqali beriladi." },
      { id: 'suspension', name: 'Osma', desc: "Mustaqil torsionli osma, gidravlik amortizatorlar bilan. Notekis yo'lda ravon harakatni ta'minlaydi." },
    ],
  },
  {
    id: 'suzish',
    name: 'Suzish uskunalari',
    desc: "BTR-80 suv to'siqlarini oldindan tayyorgarliksiz suzib o'ta oladi.",
    parts: [
      { id: 'waterjet', name: "Suv otgich harakatlantirgichi", desc: "Korpus orqasidagi suv-reaktiv harakatlantirgich. Suvda harakatlanish va burilish uchun ishlatiladi. Chiqish teshigi qopqoq bilan yopiladi.", specs: [['Suvdagi tezlik', '9–10 km/soat']] },
      { id: 'trimvane', name: "To'lqin qaytargich shit", desc: "Suvga kirishdan oldin oldinga ochiladi va to'lqin korpusning old qismini bosib ketishiga yo'l qo'ymaydi." },
    ],
  },
  {
    id: 'boshqaruv',
    name: "Boshqaruv bo'limi",
    desc: "Korpusning old qismida ekipaj ish o'rinlari joylashgan.",
    parts: [
      { id: 'driver', name: "Haydovchi o'rni", desc: "Chap tomonda. Gidrokuchaytirgichli rul, pedallar, nazorat-o'lchov asboblari va shina bosimini boshqarish pulti shu yerda." },
      { id: 'commander', name: "Komandir o'rni", desc: "O'ng tomonda. Komandir radiostansiya orqali aloqani boshqaradi va kuzatish priborlari bilan vaziyatni kuzatadi." },
      { id: 'gunner', name: "O'q otuvchi o'rni", desc: "Minora ostidagi osma o'rindiq. O'q otuvchi minora bilan birga buriladi." },
    ],
  },
  {
    id: 'desant',
    name: "Desant bo'limi",
    desc: "Korpusning o'rta qismida 7 nafar desantchi joylashadi.",
    parts: [
      { id: 'troop_seats', name: "Desantchilar o'rindiqlari", desc: "O'rindiqlar korpus o'rtasida orqama-orqa joylashgan. Desantchilar yonga qarab o'tirib, ambrazuralardan o't ochadi." },
      { id: 'fire', name: "O't o'chirgichlar", desc: "Qo'l o't o'chirgichlari boshqaruv va desant bo'limlarida mahkamlangan. Dvigatel bo'limi uchun esa ballonli avtomatik yong'inga qarshi tizim o'rnatilgan." },
      { id: 'firing_ports', name: "Ambrazuralar (o'q otish teshiklari)", desc: "Korpus yonlaridagi teshiklar. Desantchilar ular orqali shaxsiy qurolidan mashina ichidan turib o't ochadi." },
    ],
  },
  {
    id: 'elektr',
    name: 'Elektr jihozlari va aloqa',
    desc: "Elektr ta'minoti, yoritish, aloqa hamda ommaviy qirg'in qurolidan himoya tizimlari.",
    parts: [
      { id: 'radio', name: 'R-163-50U radiostansiyasi', desc: "UQT diapazonidagi radiostansiya bo'linma va yuqori komandir bilan aloqani ta'minlaydi. Ekipaj ichki aloqasi R-174 qurilmasi orqali." },
      { id: 'antenna', name: 'Antenna', desc: "Radiostansiyaning egiluvchan tayoqcha antennasi korpus tomida o'rnatilgan." },
      { id: 'lights', name: 'Faralar va yoritish', desc: "Oldingi faralar, gabarit chiroqlari va tunda harakatlanish uchun infraqizil yoritgichlar." },
      { id: 'battery', name: 'Akkumulyator batareyalari', desc: "Dvigatelni ishga tushirish va generator ishlamaganda iste'molchilarni elektr bilan ta'minlash uchun.", specs: [['Kuchlanish', '24 V']] },
      { id: 'fvu', name: 'Filtr-ventilyatsiya qurilmasi', desc: "Ekipaj va desantni ommaviy qirg'in qurolidan himoya qiladi: havoni tozalaydi va ichkarida ortiqcha bosim hosil qiladi." },
    ],
  },
];

// Kafedra ma'ruzalaridan olingan rasmlar: [fayl, sarlavha, belgilar, manba]
const M31 = "Ma'ruza: «Dvigatellarning umumiy tuzilishi va ishlashi»";
const M41 = "Ma'ruza: «Sovitish tizimining umumiy tuzilishi va ishlashi»";
const M61 = "Ma'ruza: «Ta'minlash tizimining umumiy tuzilishi va ishlashi»";
const M71 = "Ma'ruza: «Elektr energiyasining manbalari va iste'molchilari»";
const M82 = "Ma'ruza: «Transmissiyaning vazifasi va umumiy tuzilishi»";
export const FIGS = {
  _vehicle: [
    ['btr80_umumiy.jpg', "BTR-80 zirhli transportyorining umumiy ko'rinishi", '', "Ma'ruza: «Jangovar mashinalar va avtomobillarning umumiy tuzilishi»"],
    ['btr80_kesim_muzey.jpg', "BTR-80 ning qirqimi (muzey eksponati)", "Korpusning yon devori olib tashlangan: dvigatel-transmissiya bo'limi, desant bo'limi va yurish qismi ko'rinadi.", "Internetdagi ochiq manbalardan"],
    ['btr80_joylashuv.jpg', "BTR-80 ichki joylashuvi", "Old tomonda boshqaruv bo'limi, o'rtada desant bo'limi, orqada dvigatel (Motor), uzatmalar qutisi (Váltó) va taqsimlash qutisi (Osztóház).", "Internetdagi ochiq manbalardan"],
  ],
  _flow: [['transmissiya_btr80.jpg', 'BTR-80 zirhli mashina transmissiyasi sxemasi', "1-chig'ir reduktori; 2-chig'ir yuritmasining old kardan vali; 3-g'ildirak reduktori yuritmasining kardan vali; 4-g'ildirak reduktori; 5-chig'ir yuritmasining orqa kardan vali; 6-uchinchi ko'prik yuritmasi kardan vali; 7-oraliq kardan vali; 8-suv otgich harakatlantirgich yuritmasining old kardan vali; 9-oraliq tayanch; 10-uzatmalar qutisi; 11-suv otgich yuritmasining orqa kardan vali; 12-ilashish muftasi; 13-suv otgich harakatlantirgichi reduktori; 14-taroqsimon vint vali; 15-dvigatel; 16-taroqsimon vint; 17-to'rtinchi ko'prik; 18-to'rtinchi ko'prik yuritmasining orqa kardan vali; 19-oraliq tayanch; 20-uchinchi ko'prik; 21-to'rtinchi ko'prik yuritmasining old kardan vali; 22-taqsimlash qutisi; 23-ikkinchi ko'prik yuritmasining kardan vali; 24-ikkinchi ko'prik; 25-birinchi ko'prik yuritmasining orqa kardan vali; 26-oraliq tayanch; 27-birinchi ko'prik yuritmasining old kardan vali; 28-birinchi ko'prik.", 'Tarqatma material, transmissiya']],
  engine: [['btr80_dvigatel_joyi.jpg', "BTR-80 da dvigatelning joylashuvi", "Dvigatel yonilg'i yonishidan hosil bo'lgan issiqlik energiyasini mexanik ishga aylantiradi. Korpusning orqa qismida bo'ylama joylashgan, maxovigi oldinga qaragan.", "Internetdagi ochiq manbalardan"], ['dvigatel_tuzilishi.jpg', "To'rt taktli dvigatelning tuzilishi", "1-silindrlar blokining qistirmasi; 2-gaz taqsimlash valining yuritmasi; 3-silindr gilzasi; 4-taqsimlash vali; 5-gidrokompensator; 6-silindrlar kallagi; 7-klapanlar; 8-porshen; 9-porshen xalqalari; 10-shatun; 11-maxovik; 12-tirsakli val; 13-sovitish suyuqligi; 14-moy nasosi; 15-silindrlar bloki; 16-porshen barmog'i.", M31]],
  crank: [
    ['kshm.jpg', 'Krivoship-shatunli mexanizm sxemasi', "1-silindr; 2-maxovik; 3-shatun podshipnigi; 4-tirsakli val; 5-tirsak (krivoship); 6-o'zak podshipnik; 7-shatun.", M31],
    ['tirsakli_val.jpg', 'Tirsakli val va maxovik', "1-shatun bo'yinchasi; 2-tirsak (krivoship); 3-o'zak bo'yinchasi; 4-maxovik.", M31],
  ],
  valvetrain: [['gtm.jpg', 'KSHM va klapanlari yuqorida joylashgan GTM sxemasi', "1-taqsimlash vali shesternyasi; 2-taqsimlash vali; 3-turtkich; 4-shtanga; 5-rostlovchi vint; 6-koromislo; 7-koromislo o'qi; 8-prujina; 9-klapan; 10-yo'naltiruvchi vtulka; 11-porshen; 12-shatun; 13-maxovik; 14-tirsakli val; 15-tirsakli valdan taqsimlash valiga harakat uzatuvchi shesternyalar.", M31]],
  radiator: [['sovutish_btr80.jpg', 'BTR-80 jangovar mashinasining sovitish tizimi sxemasi', "1-ventilyator kojuxi; 2-kojux qamragichi; 3-radiatorning quyish bo'g'izi; 4-kengaytiruvchi bakchaning quyish bo'g'izi; 5-kengaytiruvchi bakcha; 6-gidromufta; 7-gidromuftaning yetaklanuvchi vali; 8-radiatorga suv uzatuvchi shlang; 9-ventilyator yuritmasining muftasi; 10-moy radiatori; 11-radiator; 12-ventilyator kojuxi yo'naltirgichi; 13-radiatorni mahkamlash xomuti; 14-ventilyator; 15 va 16-ventilyator va radiatorning tayanchlari; 17-radiatordan suv uzatuvchi shlang; 18-kengaytiruvchi bakchani mahkamlash xomuti; 19-to'kish kranini boshqarish tortqisi; 20-gidromuftani qo'shish dastagi; 21-suyuqlikni suv nasosiga uzatuvchi patrubok; 22-suv issiqlik almashtirgichi; 23-issiqlik almashtirgichga uzatuvchi patrubok; 24-to'kish shlangi; 25-issiqlik almashtirgichdan uzatuvchi patrubok; 26-moy issiqlik almashtirgichi; 27-yuqori chap moy radiatoriga uzatuvchi shlang.", M41]],
  fuel: [['yonilgi_baklari.jpg', "Yonilg'i baklari va yonilg'i quvurlari", '', M61]],
  gearbox: [
    ['ilashish_btr80.jpg', 'BTR-80 jangovar mashinasining ilashish muftasi', "1-yetaklanuvchi disk; 2-o'rta yetakchi disk; 3-o'rnatuvchi vtulka; 4-siquvchi disk; 5-itaruvchi richag vilkasi; 6-itaruvchi richag; 7-tirak xalqa prujinasi; 8-muftani moylash shlangi; 9-prujina sirtmog'i; 10-tirak podshipnik; 11-prujina; 12-uzish muftasi; 13-uzish vilkasi; 14-tirak xalqa; 15-vilka valigi; 16 va 23-bosuvchi prujinalar; 17-kojux; 18-teploizolyatsion shayba; 19-kojuxni mahkamlash bolti; 20-karter; 21-maxovik; 22-friksion qoplama; 24-uzatmalar qutisining birlamchi vali; 25-dempfer diski; 26-dempfer prujinasi; 27-dempfer xalqasi; 28-richagli mexanizm.", M82],
    ['uzatmalar_btr80.jpg', 'BTR-80 mashinasining uzatmalar qutisi', "Barcha uzatmalarda doimiy ilashishdagi shesternyalar, 2-, 3-, 4- va 5-uzatmalarda sinxronizatorlar. Asosiy belgilar: 16-orqa harakat shesternyalar bloki; 30-ikkilamchi val; 42-oraliq val; 43-uzatmalar qutisi karteri; 46-ilashish muftasi karteri; 50-birlamchi val; 51-moy sathini ko'rsatkich; 55-magnitli tiqin.", M82],
    ['sinxronizator.jpg', 'Inersion sinxronizator', "a-tuzilmasi; b-detallari; 1-yetaklovchi val shesternyasi; 2-blokirovkalovchi konusli xalqa; 3-mufta; 4-vilka; 5-prujinali xalqa; 6-uzatma shesternyasi; 7-polzun; 8-gupchak; 9-gupchakning bo'ylama ariqchasi; 10-UQ ning ikkilamchi vali; 11-blokirovka xalqasining chetidagi ariqchalar.", M82],
  ],
  transfer: [['taqsimlash.jpg', 'Taqsimlash qutisi', "1-yetakchi val; 2-yetaklanuvchi shesternya; 3-to'g'ri va pasaytiruvchi uzatmani ulash vilkasi; 4-orqa ko'prikka keltirish vali; 6-spidometrning yetakchi shesternyasi; 7-spidometrning yetaklanuvchi shesternyasi; 19-oldingi ko'prikni ulash vilkasi; 21-oldingi ko'prikni ulash dastagi; 22-to'g'ri va pasaytiruvchi uzatmani ulash dastagi; 39-oldingi ko'prikni ulash shesternyasi; 43-oldingi ko'prikka keltirish vali; 56-oraliq val.", M82]],
  shafts: [
    ['transmissiya_btr80.jpg', 'BTR-80 zirhli mashina transmissiyasi sxemasi', "2, 5-chig'ir yuritmasining kardan vallari; 3-g'ildirak reduktori yuritmasining kardan vali; 6-uchinchi ko'prik yuritmasi kardan vali; 7-oraliq kardan vali; 8, 11-suv otgich harakatlantirgich yuritmasining kardan vallari; 18, 21-to'rtinchi ko'prik yuritmasining kardan vallari; 23-ikkinchi ko'prik yuritmasining kardan vali; 25, 27-birinchi ko'prik yuritmasining kardan vallari.", 'Tarqatma material, transmissiya'],
    ['kardan.jpg', 'Yuk avtomobilining asosiy va oraliq kardan vallari', "1-oraliq kardan val; 2-qaytaruvchi halqa; 3-rezina salnik; 4-asosiy kardan val; 5-flanets; 6-salnik; 7-vilka; 8 va 13-moydon; 9-gardish; 10-rezina yostiq; 11 va 12-qaytargich shayba; 14-krestovina; 15-saqlagich klapan.", M82],
  ],
  axles: [
    ['koprik_btr80.jpg', 'BTR-80 yetakchi ko\'prigi (qirqim)', '', M82],
    ['differensial.jpg', 'Asosiy uzatma va differensial', "1-yarim o'q; 2-yetaklovchi shesternya; 3-yetaklanuvchi shesternya; 4-yarim o'q shesternyasi; 5-satellit.", M82],
  ],
  troop_seats: [['btr80_ichki_maket.jpg', "BTR-80 ichki qismi (maket)", "Desantchilar o'rindiqlari, haydovchi va komandir o'rinlari, rul hamda patron qutilarining joylashuvi.", "Internetdagi ochiq manbalardan"]],
  driver: [['btr80_ichki_maket.jpg', "BTR-80 ichki qismi (maket)", "Haydovchi o'rni va rul, uning yonida komandir o'rni.", "Internetdagi ochiq manbalardan"]],
  battery: [
    ['akkumulyator.jpg', 'Akkumulyatorlar batareyasi', "1-musbat klemma; 2-manfiy klemma; 3-quyish bo'g'izi tiqini; 4-qopqoq; 5-quyish bo'g'izi; 6-elementlararo birikma; 7-separator; 8-korpus; 9-manfiy plastina; 10-musbat plastina.", M71],
    ['generator.jpg', "37.3701 o'zgaruvchan tok generatori", "Generator mexanik energiyani elektr energiyaga aylantiradi va harakatni tasma orqali tirsakli valdan oladi.", M71],
  ],
  lights: [['fara.jpg', 'Elektr fara va lampochkalar', "1-nur tarqatgich; 2-lampochka; 3-korpus; 4-patron; 5-simlar; 6-qaytargich; 7-bir kontaktli lampochka; 8-ikki kontaktli lampochka.", M71]],
};
