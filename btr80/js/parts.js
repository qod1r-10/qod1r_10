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
      { id: 'engine', name: 'KamAZ-7403 dvigateli', desc: "8 silindrli, V-simon, to'rt taktli, turbonaddivli, suyuqlik bilan sovutiladigan dizel dvigatel.", specs: [['Quvvat', '260 o.k.'], ['Silindrlar', '8 (V8)'], ['Ish hajmi', '10,85 l']] },
      { id: 'radiator', name: 'Sovutish tizimi', desc: "Dvigatel bo'limi tomidagi jalyuzlar ostidagi radiatorlar va ventilyatorlar dvigatelni sovutadi." },
      { id: 'gearbox', name: 'Ilashish muftasi va uzatmalar qutisi', desc: "Ikki diskli quruq ilashish muftasi va 5 pog'onali mexanik uzatmalar qutisi dvigatel bilan bir blokda o'rnatilgan.", specs: [['Uzatmalar', '5 old + 1 orqa']] },
      { id: 'transfer', name: 'Taqsimlash qutisi', desc: "Burovchi momentni oldingi va orqa ko'priklar o'rtasida taqsimlaydi. Ikki diapazonli, differensialni blokirovka qilish mumkin. Suv to'pi uchun quvvat olish qurilmasi shu yerda." },
      { id: 'shafts', name: 'Kardan uzatmalari', desc: "Taqsimlash qutisidan to'rtta ko'prikning bosh uzatmalariga burovchi momentni uzatuvchi vallar." },
      { id: 'fuel', name: "Yonilg'i baklari", desc: "Desant bo'limi bilan dvigatel bo'limi orasidagi to'siq yonida joylashgan baklar.", specs: [['Umumiy hajm', '≈300 l']] },
    ],
  },
  {
    id: 'yurish',
    name: 'Yurish qismi',
    desc: "8×8 g'ildirak formulasi. Bitta yoki ikkita g'ildirak ishdan chiqsa ham mashina harakatni davom ettira oladi.",
    parts: [
      { id: 'wheels', name: "G'ildiraklar (8 ta)", desc: "O'q tekkanda ham ishlay oladigan KI-80 shinalari. Markazlashtirilgan shina bosimini boshqarish tizimi bosimni yurish paytida o'zgartirish imkonini beradi.", specs: [["Shina o'lchami", '13.00-18'], ['Boshqariladigan', "1- va 2-ko'prik"]] },
      { id: 'axles', name: "Ko'priklar (4 ta)", desc: "Har bir ko'prikda bosh uzatma va differensial bor. Moment g'ildiraklarga g'ildirak reduktorlari orqali beriladi." },
      { id: 'suspension', name: 'Osma', desc: "Mustaqil torsionli osma, gidravlik amortizatorlar bilan. Notekis yo'lda ravon harakatni ta'minlaydi." },
    ],
  },
  {
    id: 'suzish',
    name: 'Suzish uskunalari',
    desc: "BTR-80 suv to'siqlarini oldindan tayyorgarliksiz suzib o'ta oladi.",
    parts: [
      { id: 'waterjet', name: "Suv to'pi (vodomyot)", desc: "Korpus orqasidagi suv-reaktiv harakatlantirgich. Suvda harakatlanish va burilish uchun ishlatiladi. Chiqish teshigi qopqoq bilan yopiladi.", specs: [['Suvdagi tezlik', '9–10 km/soat']] },
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
