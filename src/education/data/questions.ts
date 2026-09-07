export type AgeGroup = "kids" | "teens" | "adults" | "math4";

export interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface Tile {
  id: string;
  category: string;
  emoji: string;
  color: string;
  shadow: string;
  questions: Question[];
  apiTopic?: string;
  apiTopicTitle?: string;
}

const DW_TILES: Tile[] = [
  {
    id: "phishing",
    category: "Adathalászat",
    emoji: "🎣",
    color: "#E11D48",
    shadow: "#B91C1C",
    apiTopic: "phishing",
    apiTopicTitle: "Adathalászat és online biztonság",
    questions: [],
  },
  {
    id: "cyberbully",
    category: "Kiberbántalmazás",
    emoji: "🛡️",
    color: "#7C3AED",
    shadow: "#6D28D9",
    apiTopic: "cyberbully",
    apiTopicTitle: "Kiberbántalmazás és online zaklatás",
    questions: [],
  },
  {
    id: "screentime",
    category: "Képernyőidő",
    emoji: "⏱️",
    color: "#059669",
    shadow: "#047857",
    apiTopic: "screentime",
    apiTopicTitle: "Képernyőidő és digitális egészség",
    questions: [],
  },
  {
    id: "footprint",
    category: "Digitális Lábnyom",
    emoji: "👣",
    color: "#2563EB",
    shadow: "#1D4ED8",
    apiTopic: "footprint",
    apiTopicTitle: "Digitális lábnyom és online adatvédelem",
    questions: [],
  },
  {
    id: "social",
    category: "Közösségi Média",
    emoji: "📱",
    color: "#D97706",
    shadow: "#B45309",
    apiTopic: "social",
    apiTopicTitle: "Közösségi média és FOMO",
    questions: [],
  },
];

export const TILES: Record<AgeGroup, Tile[]> = {
  kids: [
    {
      id: "animals",
      category: "Állatok",
      emoji: "🐘",
      color: "#58cc02",
      shadow: "#46a302",
      questions: [
        { question: "Melyik a legnagyobb szárazföldi állat?", options: ["Ló", "Elefánt", "Zsiráf", "Víziló"], correct: 1, explanation: "Az elefánt a legnagyobb szárazföldi állat — egy felnőtt akár 6 tonnát is nyomhat!" },
        { question: "Hány lába van a póknak?", options: ["4", "6", "8", "10"], correct: 2, explanation: "A pókok ízeltlábúak és 8 lábuk van — ez különbözteti meg őket a rovaroktól." },
        { question: "Melyik állat képes lebegni a víz felszínén mozgás nélkül?", options: ["Pingvin", "Delfin", "Medúza", "Bálna"], correct: 2, explanation: "A medúza testének 95%-a víz, ezért tökéletesen lebeg!" },
        { question: "Melyik madár nem tud repülni?", options: ["Galamb", "Sas", "Strucc", "Fecske"], correct: 2, explanation: "A strucc a világ legnagyobb madara, de nem tud repülni — viszont 70 km/h-ra is képes futni!" },
        { question: "Mi a pillangó átalakulásának sorrendje?", options: ["Tojás → Báb → Lárva → Pillangó", "Tojás → Lárva → Báb → Pillangó", "Lárva → Tojás → Báb → Pillangó", "Báb → Lárva → Tojás → Pillangó"], correct: 1, explanation: "A teljes átalakulás: tojás, hernyó (lárva), báb, majd pillangó. Ezt hívják metamorfózisnak!" },
      ],
    },
    {
      id: "space",
      category: "Világűr",
      emoji: "🚀",
      color: "#1cb0f6",
      shadow: "#0d8bbf",
      questions: [
        { question: "Melyik bolygó a Naprendszer legnagyobb bolygója?", options: ["Szaturnusz", "Neptunusz", "Jupiter", "Uránusz"], correct: 2, explanation: "A Jupiter akkora, hogy beleférne 1300 Föld — ez a Naprendszer legnagyobb bolygója!" },
        { question: "Hány bolygó van a Naprendszerben?", options: ["7", "8", "9", "10"], correct: 1, explanation: "2006 óta 8 bolygót tartunk számon, miután a Plútót törpebolygóvá minősítették." },
        { question: "Mi a Nap?", options: ["Bolygó", "Hold", "Csillag", "Üstökös"], correct: 2, explanation: "A Nap egy csillag — egy hatalmas, forró gázmag, amelynek tömege a Naprendszer tömegének 99,8%-a!" },
        { question: "Milyen színű az égbolt a Marson?", options: ["Kék", "Zöld", "Narancsvörös", "Sárga"], correct: 2, explanation: "A Mars égboltja narancsvörös a vasoxid (rozsda) miatt, amely a porban van." },
        { question: "Mi a Hold?", options: ["Bolygó", "Csillag", "Természetes hold", "Üstökös"], correct: 2, explanation: "A Hold a Föld egyetlen természetes holdja — körülbelül 384 000 km-re van tőlünk." },
      ],
    },
    {
      id: "math",
      category: "Matek",
      emoji: "🔢",
      color: "#ff9600",
      shadow: "#cc7800",
      questions: [
        { question: "Mennyi 7 × 8?", options: ["54", "56", "58", "64"], correct: 1, explanation: "7 × 8 = 56. Trükk: 7 × 7 = 49, plus még egy 7: 49 + 7 = 56!" },
        { question: "Melyik szám osztható 3-mal?", options: ["16", "22", "27", "31"], correct: 2, explanation: "27 osztható 3-mal: 27 ÷ 3 = 9. Ellenőrzés: 9 × 3 = 27 ✓" },
        { question: "Mi a háromszög belső szögeinek összege?", options: ["90°", "180°", "270°", "360°"], correct: 1, explanation: "Minden háromszög belső szögeinek összege mindig 180°." },
        { question: "Mennyi a π (pi) közelítő értéke?", options: ["2,14", "3,14", "4,14", "3,41"], correct: 1, explanation: "Pi ≈ 3,14159... Ez az arány az átmérő és a kerület között minden körben." },
        { question: "Ha van 3 almád és kapsz még 5-öt, de elajándékozol 2-t, hány marad?", options: ["4", "5", "6", "7"], correct: 2, explanation: "3 + 5 - 2 = 6. Előbb add össze, majd vond le!" },
      ],
    },
    {
      id: "nature",
      category: "Természet",
      emoji: "🌿",
      color: "#ff4b4b",
      shadow: "#cc3b3b",
      questions: [
        { question: "Mi segíti a növények táplálkozását?", options: ["Hold", "Szél", "Nap", "Eső"], correct: 2, explanation: "A fotoszintézis során a növények napfénnyel, vízzel és CO₂-vel cukrot állítanak elő." },
        { question: "Melyik a leghosszabb folyó a Földön?", options: ["Amazonas", "Nílus", "Jangce", "Missisipi"], correct: 1, explanation: "A Nílus kb. 6 650 km hosszú — Afrika és a világ leghosszabb folyója." },
        { question: "Hány kontinense van a Földnek?", options: ["5", "6", "7", "8"], correct: 2, explanation: "A 7 kontinens: Afrika, Antarktika, Ázsia, Ausztrália, Európa, Észak-Amerika, Dél-Amerika." },
        { question: "Mi a Föld legnagyobb óceánja?", options: ["Atlanti", "Indiai", "Csendes", "Sarkvidéki"], correct: 2, explanation: "A Csendes-óceán a Föld felszínének közel felét borítja!" },
        { question: "Mit lélegzünk be, ami elengedhetetlen az élethez?", options: ["CO₂", "Nitrogén", "Oxigén", "Hélium"], correct: 2, explanation: "Az oxigén (O₂) létfontosságú — sejtjeink ezt használják az energia előállításához." },
      ],
    },
    {
      id: "words",
      category: "Szavak",
      emoji: "📚",
      color: "#ce82ff",
      shadow: "#9c5acc",
      questions: [
        { question: "Mi a 'szinonima' szó jelentése?", options: ["Ellentétes értelmű szó", "Azonos értelmű szó", "Összetett szó", "Idegen szó"], correct: 1, explanation: "A szinonima azonos vagy hasonló jelentésű szavak — pl. boldog = örömteli." },
        { question: "Mi a mondat végén álló írásjel neve?", options: ["Pontosvessző", "Kettőspont", "Pont", "Vesszős"], correct: 2, explanation: "A mondat végét ponttal (.), kérdőjellel (?) vagy felkiáltójellel (!) jelezzük." },
        { question: "Melyik szófaj fejez ki cselekvést?", options: ["Főnév", "Melléknév", "Ige", "Névmás"], correct: 2, explanation: "Az ige cselekvést, történést vagy létezést fejez ki. Pl. fut, eszik, van." },
        { question: "Mi az ellentéte a 'boldog' szónak?", options: ["Szomorú", "Vidám", "Mérges", "Álmos"], correct: 0, explanation: "A boldog ellentéte szomorú — ezeket antonimáknak nevezzük." },
        { question: "Mi a mese műfajának jellemzője?", options: ["Valós esemény", "Csodás elemek, tanulság", "Tudományos tény", "Újsághír"], correct: 1, explanation: "A mesékben csodás elemek vannak (varázslat, fantáziaalakoks) és mindig van tanulság." },
      ],
    },
    ...DW_TILES,
  ],

  teens: [
    {
      id: "science",
      category: "Tudomány",
      emoji: "🔬",
      color: "#58cc02",
      shadow: "#46a302",
      questions: [
        { question: "Mi a DNS rövidítés feloldása?", options: ["Digitális Nettó Szám", "Dezoxiribonukleinsav", "Dinamikus Neurális Szisztéma", "Differenciális Numerikus Sorozat"], correct: 1, explanation: "A DNS (dezoxiribonukleinsav) az örökletes információ hordozója — egy dupla hélix szerkezetű molekula." },
        { question: "Mi az atomnak az az összetevője, amely negatív töltésű?", options: ["Proton", "Neutron", "Elektron", "Kvark"], correct: 2, explanation: "Az elektronok negatív töltésűek és az atommag körül keringenek, míg a protonok pozitívak, a neutronok semlegesek." },
        { question: "Mi a fotoszintézis vegyi egyenlete alapján termelt anyag?", options: ["CO₂", "Glükóz", "Víz", "Nitrogén"], correct: 1, explanation: "6CO₂ + 6H₂O + fény → C₆H₁₂O₆ (glükóz) + 6O₂. A napenergiát kémiai energiává alakítja." },
        { question: "Melyik bolygónak van a legtöbb holdja?", options: ["Jupiter", "Szaturnusz", "Uránusz", "Neptunusz"], correct: 1, explanation: "A Szaturnusznak 2023-as adatok szerint 146 ismert holdja van — a legtöbb a Naprendszerben." },
        { question: "Mi a relatív atomtömeg mértékegysége?", options: ["Gramm", "Dalton", "Mol", "Newton"], correct: 1, explanation: "A Dalton (Da) vagy atomtömeg-egység a relatív atomtömeg mértékegysége." },
      ],
    },
    {
      id: "history",
      category: "Történelem",
      emoji: "🏛️",
      color: "#ff9600",
      shadow: "#cc7800",
      questions: [
        { question: "Mikor ért véget a 2. világháború?", options: ["1943", "1944", "1945", "1946"], correct: 2, explanation: "A 2. világháború 1945-ben ért véget: Európában május 8-án (V-E Day), a Csendes-óceánon szeptember 2-án (V-J Day)." },
        { question: "Ki írta az Emberi Jogok Egyetemes Nyilatkozatát?", options: ["ENSZ", "NATO", "EU", "USA"], correct: 0, explanation: "Az ENSZ 1948-ban fogadta el az Emberi Jogok Egyetemes Nyilatkozatát." },
        { question: "Melyik kultúra építette a Machu Picchut?", options: ["Azték", "Maja", "Inka", "Olmék"], correct: 2, explanation: "A Machu Picchut az inkák építették kb. 1450-ben, és az Andok 2 430 méterén helyezkedik el." },
        { question: "Mikor volt az Ipari Forradalom?", options: ["1500-1600", "1700-1800", "1800-1900", "1900-1950"], correct: 1, explanation: "Az Ipari Forradalom nagyjából 1760-1840 között zajlott, főleg Angliából kiindulva." },
        { question: "Ki volt az első ember a Holdon?", options: ["Yuri Gagarin", "Buzz Aldrin", "Neil Armstrong", "Michael Collins"], correct: 2, explanation: "Neil Armstrong 1969. július 20-án lépett először a Hold felszínére az Apollo 11 küldetésen." },
      ],
    },
    {
      id: "tech",
      category: "Technológia",
      emoji: "💻",
      color: "#1cb0f6",
      shadow: "#0d8bbf",
      questions: [
        { question: "Mit jelent a 'HTTP' rövidítés?", options: ["HyperText Transfer Protocol", "High Tech Transfer Process", "Home Terminal Technology Protocol", "Hybrid Text Technology Platform"], correct: 0, explanation: "HTTP = HyperText Transfer Protocol — az alapprotokoll, amivel a webböngésző kommunikál a szerverrel." },
        { question: "Mi az algoritmus?", options: ["Matematikai képlet", "Lépéssorozat egy feladat megoldásához", "Programozási nyelv", "Számítógépes vírus"], correct: 1, explanation: "Az algoritmus egymást követő utasítások sorozata, amelyek egy konkrét feladatot oldanak meg." },
        { question: "Melyik programozási paradigma jellemzője az objektumok használata?", options: ["Funkcionális", "Imperatív", "Objektumorientált", "Deklaratív"], correct: 2, explanation: "Az OOP (objektumorientált programozás) adatokat és metódusokat objektumokba szervez." },
        { question: "Mi a 'bit' és 'byte' kapcsolata?", options: ["1 byte = 4 bit", "1 byte = 8 bit", "1 byte = 16 bit", "1 byte = 2 bit"], correct: 1, explanation: "1 byte = 8 bit. A bit a legkisebb adategység (0 vagy 1), a byte 8 bitből áll." },
        { question: "Mi az AI egy valós alkalmazása?", options: ["Számítások elvégzése", "Arcfelismerés", "Adattárolás", "Energiatermelés"], correct: 1, explanation: "Az arcfelismerés mesterséges intelligenciát (gépi tanulást) használ, pl. telefonok feloldásánál." },
      ],
    },
    {
      id: "geo",
      category: "Földrajz",
      emoji: "🌍",
      color: "#ff4b4b",
      shadow: "#cc3b3b",
      questions: [
        { question: "Melyik az Európai Unió legkisebb tagállama?", options: ["Málta", "Luxemburg", "Ciprus", "Lichtenstein"], correct: 0, explanation: "Málta az EU legkisebb tagállama, 316 km² területével és kb. 500 000 lakossal." },
        { question: "Melyik folyó átszeli a legtöbb országot Európában?", options: ["Rajna", "Duna", "Volga", "Temze"], correct: 1, explanation: "A Duna 10 országon folyik át — ez a rekord Európában." },
        { question: "Hol van a világ legmagasabb hegycsúcsa?", options: ["Tibet", "Nepál-Kína határán", "India", "Pakisztán"], correct: 1, explanation: "A Mount Everest (8 849 m) a Nepál-Kína határon van a Himalájában." },
        { question: "Melyik ország fővárosa Szöul?", options: ["Japán", "Kína", "Dél-Korea", "Észak-Korea"], correct: 2, explanation: "Szöul Dél-Korea fővárosa és egyben legnépesebb városa (kb. 10 millió lakos)." },
        { question: "Mit jelent a 'GDP' rövidítés?", options: ["Global Data Protocol", "Gross Domestic Product", "General Development Plan", "Governmental Data Policy"], correct: 1, explanation: "GDP = Gross Domestic Product = Bruttó hazai termék. Egy ország gazdasági teljesítményét méri." },
      ],
    },
    {
      id: "critical",
      category: "Kritikus gondolkodás",
      emoji: "🧠",
      color: "#ce82ff",
      shadow: "#9c5acc",
      questions: [
        { question: "Mi a logikai érvelés hibája, ha valaki tekintélyre hivatkozik tényként?", options: ["Ad hominem", "Strawman", "Argumentum ad auctoritatem", "False dichotomy"], correct: 2, explanation: "Az Argumentum ad auctoritatem (tekintélyre hivatkozás) tévkövetkeztetés, ha a tekintély nem szaktekintély." },
        { question: "Mi jellemzi a konfirmációs torzítást?", options: ["Minden forrást egyenlően értékelünk", "Saját nézeteinket megerősítő info keresése", "Mások véleményét mindig elfogadjuk", "Logikai szabályok szigorú betartása"], correct: 1, explanation: "A konfirmációs torzítás: hajlamosak vagyunk a saját nézeteinket alátámasztó információkat keresni és értékelni." },
        { question: "Mi a különbség a deduktív és induktív következtetés között?", options: ["Nincs különbség", "Deduktív: általánostól az egyedi felé, induktív: egyeditől az általános felé", "Deduktív: egyeditől általánosig, induktív: általánostól egyediig", "Deduktív tény, induktív vélemény"], correct: 1, explanation: "Deduktív: ha az általános igaz, az egyedi is igaz. Induktív: egyedi megfigyelésekből általánosítunk." },
        { question: "Mi a 'post hoc ergo propter hoc' tévkövetkeztetés?", options: ["Ha X után Y, akkor X okozta Y-t", "Ha X igaz, Y is igaz", "Ha X hamis, Y is hamis", "Ha X és Y egyszerre van, az véletlen"], correct: 0, explanation: "Post hoc = időbeli sorrend nem jelent ok-okozati összefüggést. Pl. 'kakasszó után felkel a Nap.'" },
        { question: "Mi az 'Occam borotvája' elve?", options: ["A bonyolultabb magyarázat jobb", "A legegyszerűbb magyarázatot kell előnyben részesíteni", "Minden állítást bizonyítani kell", "A régi elméletek mindig jobbak"], correct: 1, explanation: "Occam borotvája: a felesleges feltételezések elkerülése — a legegyszerűbb magyarázat az elfogadhatóbb." },
      ],
    },
    ...DW_TILES,
  ],

  adults: [
    {
      id: "philosophy",
      category: "Filozófia",
      emoji: "🤔",
      color: "#58cc02",
      shadow: "#46a302",
      questions: [
        { question: "Mi Descartes leghíresebb mondása?", options: ["Veni, vidi, vici", "Cogito, ergo sum", "Sapere aude", "Carpe diem"], correct: 1, explanation: "Cogito, ergo sum = Gondolkodom, tehát vagyok. Descartes egyetlen kétségtelen alapigazságként fogalmazta meg." },
        { question: "Mi Kant kategorikus imperatívusza?", options: ["Cselekedj, hogy maximád általános törvénnyé válhasson", "Cselekedj saját érdekeidnek megfelelően", "Kövess mások példáját", "A boldogság az egyetlen cél"], correct: 0, explanation: "Kant: Cselekedj csak olyan maxima szerint, amelyet egyben általános törvénnyé is akarhatsz." },
        { question: "Mi a szofizmus?", options: ["Tudományos módszer", "Látszólag helyes, de valójában hibás érvelés", "Etikai rendszer", "Politikai elmélet"], correct: 1, explanation: "A szofizmus félrevezető érvelés — ügyesen meggyőzőnek tűnik, de logikailag hibás." },
        { question: "Ki foglalkozott az 'Übermensch' fogalmával?", options: ["Marx", "Hegel", "Nietzsche", "Schopenhauer"], correct: 2, explanation: "Friedrich Nietzsche az Übermensch (Felső-ember) koncepcióját dolgozta ki mint az emberi önmeghaladás ideálját." },
        { question: "Mi Platon barlang allegóriájának lényege?", options: ["Az emberek barlanglakók voltak", "Az érzékelés valóságtól való eltávolodása", "A tudás velünk született", "A demokrácia hibái"], correct: 1, explanation: "Platón barlanghasonlata: az érzékelés csak árnyék; az igazi valóság az ideák világa, amelyet a legtöbben nem látnak." },
      ],
    },
    {
      id: "economics",
      category: "Gazdaság",
      emoji: "📈",
      color: "#1cb0f6",
      shadow: "#0d8bbf",
      questions: [
        { question: "Mi az infláció?", options: ["Az árszínvonal általános csökkenése", "Az árszínvonal általános emelkedése", "A kamatláb növekedése", "A GDP csökkenése"], correct: 1, explanation: "Az infláció az általános árszínvonal tartós emelkedése, amely csökkenti a pénz vásárlóerejét." },
        { question: "Mi a 'láthatatlan kéz' fogalma Smithnél?", options: ["Állami beavatkozás a piacba", "A piac önszabályozó mechanizmusa", "A monopolvállalatok hatalma", "A bankok titkos irányítása"], correct: 1, explanation: "Adam Smith 'láthatatlan kéze': az egyéni önérdek a piac mechanizmusán keresztül közvetlen szándék nélkül is közjóhoz vezet." },
        { question: "Mi a GDP és GNP közötti különbség?", options: ["Nincs különbség", "GDP: belföldön megtermelt; GNP: az ország állampolgárai által termelt", "GDP: éves, GNP: havi mutató", "GDP: reál, GNP: nominális értéken"], correct: 1, explanation: "GDP: egy ország területén megtermelt érték. GNP: az ország állampolgárai által bárhol megtermelt érték." },
        { question: "Mi a monetáris politika célja?", options: ["Adók szabályozása", "A pénzmennyiség és kamatok kezelése", "Költségvetési kiadások irányítása", "Vámok meghatározása"], correct: 1, explanation: "A monetáris politika (pl. jegybank) a pénzmennyiséget és kamatokat szabályozza az infláció és növekedés befolyásolásához." },
        { question: "Mi a Keynes-féle multiplikátor hatás?", options: ["Minden befektetés veszteséget okoz", "Egy kiadás többszörös GDP-növekedést generál", "A tőke értékét szorozni kell", "Kamatszámítási módszer"], correct: 1, explanation: "A multiplikátor hatás: az állami kiadás növekedése annál nagyobb GDP-növekedést generál, ahányszor a pénz körforog." },
      ],
    },
    {
      id: "adscience",
      category: "Tudomány",
      emoji: "⚛️",
      color: "#ff9600",
      shadow: "#cc7800",
      questions: [
        { question: "Mi a Schrödinger macska gondolatkísérlet lényege?", options: ["Macskák intelligenciájáról szól", "A kvantum-szuperpozíció paradoxona — az állat egyszerre élő és halott", "A relativitáselmélet illusztrációja", "Etikai kísérlet az állatkísérletekről"], correct: 1, explanation: "Schrödinger macskája a kvantummechanika szuperpozíciójának paradoxonát illusztrálja — megfigyelés előtt a rendszer egyszerre van több állapotban." },
        { question: "Mi az Általános Relativitáselmélet szerint a gravitáció?", options: ["Taszítóerő", "A téridő görbülése", "Elektromágneses erő", "Atomokon belüli erő"], correct: 1, explanation: "Einstein szerint a gravitáció a téridő görbülete — a tömeg és energia meggörbíti a körülöttük lévő téridőt." },
        { question: "Mi az entrópia fogalma a termodinamikában?", options: ["Energia mennyisége", "A rendszer rendezetlenségének mértéke", "Hőmérséklet változása", "A mozgási energia"], correct: 1, explanation: "Az entrópia a rendezetlenség mértéke. A termodinamika 2. törvénye szerint zárt rendszerben az entrópia mindig nő." },
        { question: "Mi a CRISPR-Cas9?", options: ["Egy számítógépes processzor", "DNS-szerkesztési technológia", "Kvantum-számítógép", "Mesterséges intelligencia"], correct: 1, explanation: "A CRISPR-Cas9 forradalmi génszerkesztési technika, amely pontosan vágja ki és módosítja a DNS-szekvenciákat." },
        { question: "Mi a Fermi-paradoxon?", options: ["Nukleáris reakciók paradoxona", "Az értelmes fejlett civilizációk létezése vs. a csend ellentmondása", "A fekete lyukak paradoxona", "A végtelen számítás paradoxona"], correct: 1, explanation: "A Fermi-paradoxon: ha a Tejútrendszerben valószínűsíthetően sok fejlett civilizáció van, miért nem hallunk róluk?" },
      ],
    },
    {
      id: "psychology",
      category: "Pszichológia",
      emoji: "🧠",
      color: "#ff4b4b",
      shadow: "#cc3b3b",
      questions: [
        { question: "Mi a kognitív disszonancia?", options: ["Két azonos gondolat", "Ellentétes hiedelmek/cselekedetek okozta belső feszültség", "Emlékezetvesztés", "Szociális szorongás"], correct: 1, explanation: "A kognitív disszonancia a saját hiedelmeinkkel ellentétes cselekedetek okozta belső feszültség." },
        { question: "Mi Maslow szükséglethierarchiájában a legfelső szint?", options: ["Biztonsági igény", "Szociális igény", "Önmegvalósítás", "Elismerés"], correct: 2, explanation: "Maslow piramisának tetején az önmegvalósítás áll — a bennünk rejlő potenciál teljes kibontakoztatása." },
        { question: "Mi a Dunning-Kruger hatás?", options: ["A szakértők alulértékelik képességeiket", "A kevés tudással rendelkezők túlbecsülik kompetenciájukat", "Mindenki egyformán értékeli képességeit", "A tapasztaltabbak jobban teljesítenek csoportban"], correct: 1, explanation: "A Dunning-Kruger hatás: a korlátozott tudásúak hajlamosak saját kompetenciájukat felülbecsülni." },
        { question: "Mi a Stanford börtönkísérlet fő tanulsága?", options: ["A bűnözők javíthatók", "A szituáció hatalma felülírhatja az egyéni erkölcsöt", "A börtönök hatékony büntetési eszközök", "A hatóságok mindig igazságosak"], correct: 1, explanation: "Zimbardo kísérlete megmutatta, hogy a szituáció (szerepek) milyen erősen befolyásolják az emberi viselkedést." },
        { question: "Mi a 'flow' állapot Csíkszentmihályi szerint?", options: ["Teljesen passzív pihenés", "Teljes bevonódás és tökéletes összpontosítás", "Meditáció közben elért tudatállapot", "Versengési szorongás"], correct: 1, explanation: "A 'flow' a teljes bevonódás állapota, amelyben az időérzék elvész és a teljesítmény csúcsra jár." },
      ],
    },
    {
      id: "climate",
      category: "Klíma & Jövő",
      emoji: "🌱",
      color: "#ce82ff",
      shadow: "#9c5acc",
      questions: [
        { question: "Mi az üvegházhatás mechanizmusa?", options: ["A Nap megmelegíti a Földet, az üvegházak befogják a hőt", "Bizonyos gázok a Föld felszínéről visszavert hőt elnyelik és visszasugározzák", "Az ózonréteg felmelegíti a légkört", "A városok hőszigete melegíti a légkört"], correct: 1, explanation: "A CO₂, metán és más gázok a Föld felszínéről visszavert hőenergiát elnyelik és a Föld felé visszasugározzák." },
        { question: "Mi a 'nettó nulla kibocsátás' cél lényege?", options: ["Teljesen megszüntetni minden kibocsátást", "Annyi CO₂-t kötni meg, amennyit kibocsátunk", "Csak megújuló energiát használni", "Az ipar teljes leállítása"], correct: 1, explanation: "Nettó nulla: a kibocsátott és megkötött CO₂ mennyisége egyensúlyban van, így a légköri koncentráció nem nő." },
        { question: "Mi a biodiverzitás csökkenésének egyik fő oka?", options: ["Globális lehűlés", "Élőhelyek pusztulása", "Napkitörések", "Tengerszint csökkenése"], correct: 1, explanation: "Az élőhelyek pusztulása (erdőirtás, urbanizáció, mezőgazdaság) a biodiverzitás csökkenésének vezető oka." },
        { question: "Mi az ESG rövidítés a vállalatirányításban?", options: ["Economy, Society, Governance", "Environmental, Social, Governance", "Energy, Security, Growth", "Ethical, Sustainable, Global"], correct: 1, explanation: "ESG = Environmental (Környezet), Social (Társadalom), Governance (Vállalatirányítás) — fenntarthatósági keretrendszer." },
        { question: "Mi a körkörös gazdaság alapelve?", options: ["Minél több termelés, annál jobb", "Termelés → Fogyasztás → Újrahasznosítás, nulla hulladék", "A természeti erőforrások korlátlan kiaknázása", "Csak megújuló energia használata"], correct: 1, explanation: "A körkörös gazdaság célja, hogy az anyagok és termékek a lehető legtovább forgásban maradjanak, minimalizálva a hulladékot." },
      ],
    },
    ...DW_TILES,
  ],

  math4: [
    {
      id: "m4-digits",
      category: "Írd le számjegyekkel!",
      emoji: "🔢",
      color: "#3B82F6",
      shadow: "#1D4ED8",
      questions: [
        {
          question: "Melyik szám ez: »háromszáztizenöt«?",
          options: ["315", "305", "350", "135"],
          correct: 0,
          explanation: "Háromszáz = 300, tizen = 10, öt = 5 → 300 + 10 + 5 = 315.",
        },
        {
          question: "Melyik szám ez: »hatszáznegyvenegy«?",
          options: ["614", "641", "416", "461"],
          correct: 1,
          explanation: "Hatszáz = 600, negyven = 40, egy = 1 → 600 + 40 + 1 = 641.",
        },
        {
          question: "Melyik szám ez: »kétezer-ötszáznyolcvan«?",
          options: ["2508", "2850", "2580", "5280"],
          correct: 2,
          explanation: "Kétezer = 2 000, ötszáz = 500, nyolcvan = 80 → 2 000 + 500 + 80 = 2 580.",
        },
        {
          question: "Melyik szám ez: »huszonhétezer-négyszáztíz«?",
          options: ["27 041", "27 410", "24 710", "72 410"],
          correct: 1,
          explanation: "Huszonhétezer = 27 000, négyszáz = 400, tíz = 10 → 27 000 + 400 + 10 = 27 410.",
        },
        {
          question: "Melyik szám ez: »százezer-háromszázhuszonöt«?",
          options: ["103 025", "100 235", "100 325", "130 025"],
          correct: 2,
          explanation: "Százezer = 100 000, háromszáz = 300, huszonöt = 25 → 100 000 + 300 + 25 = 100 325.",
        },
      ],
    },
    {
      id: "m4-name",
      category: "Hogy hívják?",
      emoji: "🗣️",
      color: "#8B5CF6",
      shadow: "#6D28D9",
      questions: [
        {
          question: "Hogy olvassuk a 427-et?",
          options: ["Négyszázhuszonhét", "Négyszázkettő-hét", "Négyszázkettő-hét", "Négyszázhuszonkettő"],
          correct: 0,
          explanation: "400 = négyszáz, 20 = húsz, 7 = hét → négyszázhuszonhét.",
        },
        {
          question: "Hogy olvassuk az 1 005-öt?",
          options: ["Ezerötszáz", "Ezerötven", "Ezeröt", "Százezres"],
          correct: 2,
          explanation: "1 000 = ezer, 5 = öt → ezeröt. A nullákat nem olvassuk ki önállóan!",
        },
        {
          question: "Hogy olvassuk a 3 040-et?",
          options: ["Háromezer-negyvenöt", "Háromszáznegyven", "Háromezer-negyven", "Háromezernégyszáz"],
          correct: 2,
          explanation: "3 000 = háromezer, 40 = negyven → háromezer-negyven.",
        },
        {
          question: "Hogy olvassuk a 15 900-at?",
          options: ["Tizenötezer-kilencszáz", "Százötvenkilencezer", "Tizenötezer-kilencszázas", "Tizennégyezer-kilencszáz"],
          correct: 0,
          explanation: "15 000 = tizenötezer, 900 = kilencszáz → tizenötezer-kilencszáz.",
        },
        {
          question: "Hogy olvassuk a 200 010-et?",
          options: ["Kétszázezres-tíz", "Kétszázezer-tíz", "Kétmillió-tíz", "Kétszáz-tíz"],
          correct: 1,
          explanation: "200 000 = kétszázezer, 10 = tíz → kétszázezer-tíz.",
        },
      ],
    },
    {
      id: "m4-placevalue",
      category: "Helyiértékek",
      emoji: "📊",
      color: "#10B981",
      shadow: "#047857",
      questions: [
        {
          question: "A 6 743-ban melyik szám áll a százas helyiértéken?",
          options: ["6", "7", "4", "3"],
          correct: 1,
          explanation: "6 743: hatezres → 6, százas → 7, tízes → 4, egyes → 3. A százas helyiértéken a 7 áll.",
        },
        {
          question: "A 28 571-ben melyik szám áll az ezres helyiértéken?",
          options: ["2", "8", "5", "7"],
          correct: 1,
          explanation: "28 571: tízezres → 2, ezres → 8, százas → 5, tízes → 7, egyes → 1.",
        },
        {
          question: "Mekkora értéket képvisel a 4-es a 4 329-ben?",
          options: ["4", "40", "400", "4 000"],
          correct: 3,
          explanation: "A 4 az ezres helyiértéken áll → értéke 4 × 1 000 = 4 000.",
        },
        {
          question: "Hány tízes van a 850-ben?",
          options: ["5", "8", "85", "50"],
          correct: 2,
          explanation: "850 = 85 × 10, tehát 85 tízes van benne.",
        },
        {
          question: "A 73 206-ban a 2-es melyik helyiértéken áll?",
          options: ["Egyes", "Tízes", "Százas", "Ezres"],
          correct: 2,
          explanation: "73 206: tízezres → 7, ezres → 3, százas → 2, tízes → 0, egyes → 6. A 2 a százas helyiértéken van.",
        },
      ],
    },
    {
      id: "m4-rounding",
      category: "Kerekítés",
      emoji: "🎯",
      color: "#F59E0B",
      shadow: "#B45309",
      questions: [
        {
          question: "Kerekítsd tízesre: 347 ≈ ?",
          options: ["300", "340", "350", "400"],
          correct: 2,
          explanation: "A 347 tízes jegye 4, egyes jegye 7 → 7 ≥ 5, felfelé kerekítünk → 350.",
        },
        {
          question: "Kerekítsd százasra: 1 263 ≈ ?",
          options: ["1 200", "1 300", "1 000", "1 260"],
          correct: 1,
          explanation: "1 263: százas jegye 2, tízes jegye 6 → 6 ≥ 5, felfelé kerekítünk → 1 300.",
        },
        {
          question: "Kerekítsd ezresre: 4 499 ≈ ?",
          options: ["4 000", "4 500", "5 000", "4 400"],
          correct: 0,
          explanation: "4 499: ezres jegye 4, százas jegye 4 → 4 < 5, lefelé kerekítünk → 4 000.",
        },
        {
          question: "Kerekítsd tízesre: 895 ≈ ?",
          options: ["890", "800", "900", "880"],
          correct: 2,
          explanation: "895: tízes jegye 9, egyes jegye 5 → 5 ≥ 5, felfelé kerekítünk: 900.",
        },
        {
          question: "Melyik szám kerekíthető 5 000-re (ezresre)?",
          options: ["4 390", "5 612", "4 512", "5 501"],
          correct: 2,
          explanation: "4 512: százas jegye 5 → 5 ≥ 5, felfelé → 5 000. A többi más ezresre kerekül.",
        },
      ],
    },
    {
      id: "m4-compare",
      category: "Összehasonlítás",
      emoji: "⚖️",
      color: "#EF4444",
      shadow: "#B91C1C",
      questions: [
        {
          question: "Melyik a nagyobb szám: 3 456 vagy 3 546?",
          options: ["3 456", "3 546", "Egyenlők", "Nem dönthető el"],
          correct: 1,
          explanation: "Az ezres és tízezer helyen egyeznek, a százas helyen: 4 < 5 → 3 546 > 3 456.",
        },
        {
          question: "Rendezd növekvő sorba: 1 020 ; 1 200 ; 1 002",
          options: [
            "1 002 < 1 020 < 1 200",
            "1 020 < 1 002 < 1 200",
            "1 200 < 1 020 < 1 002",
            "1 002 < 1 200 < 1 020",
          ],
          correct: 0,
          explanation: "Százas jegyek: 0, 0, 2 → de tízes: 1 002 tízes=0 < 1 020 tízes=2. Így: 1 002 < 1 020 < 1 200.",
        },
        {
          question: "Melyik szám illeszkedik: 6 780 < ? < 6 800",
          options: ["6 750", "6 790", "6 800", "6 810"],
          correct: 1,
          explanation: "6 790 nagyobb 6 780-nál és kisebb 6 800-nál, tehát illeszkedik a feltételre.",
        },
        {
          question: "Igaz-e? 99 999 < 100 000",
          options: ["Igen, igaz", "Nem, hamis", "Egyenlők", "Nem dönthető el"],
          correct: 0,
          explanation: "99 999 ötjegyű szám, 100 000 hatjegyű → minden hatjegyű szám nagyobb minden ötjegyűnél.",
        },
        {
          question: "Hány egész szám van 500 és 503 között (a határokat nem beleértve)?",
          options: ["1", "2", "3", "4"],
          correct: 1,
          explanation: "500 < 501 < 502 < 503 → a határok között 501 és 502 van, tehát 2 egész szám.",
        },
      ],
    },
    {
      id: "m4-expand",
      category: "Bontsd fel!",
      emoji: "🧩",
      color: "#EC4899",
      shadow: "#BE185D",
      questions: [
        {
          question: "467 = 4 × 100 + 6 × 10 + ? × 1",
          options: ["4", "6", "7", "0"],
          correct: 2,
          explanation: "467 bontva: 4 × 100 = 400, 6 × 10 = 60, 7 × 1 = 7 → 400 + 60 + 7 = 467.",
        },
        {
          question: "Mi a helyes bontás? 5 308 = ?",
          options: [
            "5 × 1 000 + 3 × 100 + 0 × 10 + 8",
            "5 × 1 000 + 3 × 10 + 8",
            "5 × 100 + 3 × 10 + 8",
            "5 × 10 000 + 3 × 100 + 8",
          ],
          correct: 0,
          explanation: "5 308 = 5×1 000 + 3×100 + 0×10 + 8×1 = 5 000 + 300 + 0 + 8.",
        },
        {
          question: "Mennyi: 3 × 10 000 + 7 × 1 000 + 2 × 100 + 5?",
          options: ["37 025", "37 205", "37 250", "30 725"],
          correct: 1,
          explanation: "30 000 + 7 000 + 200 + 5 = 37 205.",
        },
        {
          question: "12 430 hány ezrest tartalmaz?",
          options: ["1", "2", "12", "4"],
          correct: 2,
          explanation: "12 430 = 12 × 1 000 + 430 → 12 ezrest tartalmaz.",
        },
        {
          question: "Pótold a hiányzó számot! 6 _ 09 = 6 000 + 200 + 9",
          options: ["0", "2", "9", "1"],
          correct: 1,
          explanation: "6 000 + 200 + 9 = 6 209. A százas jegy 2, tehát a hiányzó számjegy 2.",
        },
      ],
    },
  ],
};
