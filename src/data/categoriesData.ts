export interface CategoryNode {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  parentId: string | null;
  slug?: string;
  icon?: string;
  count?: string;
  children?: CategoryNode[];
}

export interface CategorySuggestion {
  id: string;
  sellerName?: string;
  sellerEmail?: string;
  suggestedLevel1: string;
  suggestedLevel2?: string;
  suggestedLevel3?: string;
  notes?: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

/**
 * Sorts array of categories at any level strictly using Hungarian ABC rules (localeCompare 'hu')
 */
export function sortCategoriesABC(items: CategoryNode[]): CategoryNode[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "hu", { sensitivity: "base" })).map(item => ({
    ...item,
    children: item.children ? sortCategoriesABC(item.children) : undefined,
  }));
}

/**
 * Raw SEED Taxonomy Data: Exactly 3 Levels (Level 1: Fő, Level 2: Al, Level 3: Al-al)
 * Fully AI-Free and Hungarian ABC sorted.
 */
export const RAW_CATEGORY_TREE: CategoryNode[] = [
  {
    id: "cat_ingatlan",
    name: "INGATLANOK",
    level: 1,
    parentId: null,
    icon: "🏡",
    count: "42 300",
    children: [
      {
        id: "cat_ingatlan_elado",
        name: "ELADÓ INGATLANOK",
        level: 2,
        parentId: "cat_ingatlan",
        children: [
          { id: "cat_ingatlan_elado_lakas", name: "Eladó lakások (Paneltömb, Tégla, Új építésű)", level: 3, parentId: "cat_ingatlan_elado" },
          { id: "cat_ingatlan_elado_haz", name: "Eladó családi házak és ikerházak", level: 3, parentId: "cat_ingatlan_elado" },
          { id: "cat_ingatlan_elado_telek", name: "Építési telkek és mezőgazdasági földek", level: 3, parentId: "cat_ingatlan_elado" },
          { id: "cat_ingatlan_elado_nyaralo", name: "Nyaralók és hétvégi házak (Balaton, Dunakanyar)", level: 3, parentId: "cat_ingatlan_elado" },
        ],
      },
      {
        id: "cat_ingatlan_kiado",
        name: "KIADÓ INGATLANOK & ALBI",
        level: 2,
        parentId: "cat_ingatlan",
        children: [
          { id: "cat_ingatlan_kiado_lakas", name: "Kiadó lakások (Garzon, Hosszú távú, Diáklakás)", level: 3, parentId: "cat_ingatlan_kiado" },
          { id: "cat_ingatlan_kiado_szoba", name: "Kiadó szobák és társbérletek", level: 3, parentId: "cat_ingatlan_kiado" },
          { id: "cat_ingatlan_kiado_iroda", name: "Irodák, üzlethelyiségek és raktárak", level: 3, parentId: "cat_ingatlan_kiado" },
          { id: "cat_ingatlan_kiado_garazs", name: "Garázsok és beállók", level: 3, parentId: "cat_ingatlan_kiado" },
        ],
      },
    ],
  },
  {
    id: "cat_jarmuvek",
    name: "JÁRMŰVEK ÉS AUTO",
    level: 1,
    parentId: null,
    icon: "🚗",
    count: "95 800",
    children: [
      {
        id: "cat_jarmuvek_szemelyauto",
        name: "SZEMÉLYAUTÓK",
        level: 2,
        parentId: "cat_jarmuvek",
        children: [
          { id: "cat_jarmuvek_szemelyauto_benzines", name: "Benzines személyautók", level: 3, parentId: "cat_jarmuvek_szemelyauto" },
          { id: "cat_jarmuvek_szemelyauto_dizel", name: "Dízel autó kocsik", level: 3, parentId: "cat_jarmuvek_szemelyauto" },
          { id: "cat_jarmuvek_szemelyauto_elektromos", name: "Elektromos és hibrid autók", level: 3, parentId: "cat_jarmuvek_szemelyauto" },
          { id: "cat_jarmuvek_szemelyauto_suv", name: "SUV, Crossover és Terepjárók", level: 3, parentId: "cat_jarmuvek_szemelyauto" },
        ],
      },
      {
        id: "cat_jarmuvek_motorkerekpar",
        name: "MOTORKERÉKPÁROK ÉS ROBOGÓK",
        level: 2,
        parentId: "cat_jarmuvek",
        children: [
          { id: "cat_jarmuvek_motorkerekpar_robogo", name: "Robogók (50cc, 125cc)", level: 3, parentId: "cat_jarmuvek_motorkerekpar" },
          { id: "cat_jarmuvek_motorkerekpar_tura", name: "Túra és sportmotorok", level: 3, parentId: "cat_jarmuvek_motorkerekpar" },
          { id: "cat_jarmuvek_motorkerekpar_quad", name: "Quadok és ATV-k", level: 3, parentId: "cat_jarmuvek_motorkerekpar" },
        ],
      },
      {
        id: "cat_jarmuvek_alkatreszek",
        name: "ALKATRÉSZEK ÉS GUMIABRONCSOK",
        level: 2,
        parentId: "cat_jarmuvek",
        children: [
          { id: "cat_jarmuvek_alkatreszek_gumi", name: "Gumiabroncsok és felnik (Téli, Nyári, Alufelni)", level: 3, parentId: "cat_jarmuvek_alkatreszek" },
          { id: "cat_jarmuvek_alkatreszek_motor", name: "Motoralkatrészek és fékek", level: 3, parentId: "cat_jarmuvek_alkatreszek" },
          { id: "cat_jarmuvek_alkatreszek_multimedia", name: "Autóhifi, GPS és elektronika", level: 3, parentId: "cat_jarmuvek_alkatreszek" },
        ],
      },
    ],
  },
  {
    id: "cat_oktatas",
    name: "ILOLIT OKTATÁS ÉS KURZUSOK",
    level: 1,
    parentId: null,
    icon: "🎓",
    count: "15 200",
    children: [
      {
        id: "cat_oktatas_tanfolyamok",
        name: "ONLINE KURZUSOK ÉS VIDEÓK",
        level: 2,
        parentId: "cat_oktatas",
        children: [
          { id: "cat_oktatas_tanfolyamok_it", name: "IT, Programozás és Webfejlesztés", level: 3, parentId: "cat_oktatas_tanfolyamok" },
          { id: "cat_oktatas_tanfolyamok_business", name: "Üzlet, Marketing és Pénzügy", level: 3, parentId: "cat_oktatas_tanfolyamok" },
          { id: "cat_oktatas_tanfolyamok_szepseg", name: "Szépségápolási és Smink Tanfolyamok", level: 3, parentId: "cat_oktatas_tanfolyamok" },
        ],
      },
      {
        id: "cat_oktatas_maganora",
        name: "MAGÁNÓRÁK ÉS NYELVOKTATÁS",
        level: 2,
        parentId: "cat_oktatas",
        children: [
          { id: "cat_oktatas_maganora_angol", name: "Angol és Német nyelvórák", level: 3, parentId: "cat_oktatas_maganora" },
          { id: "cat_oktatas_maganora_matek", name: "Matematika és Fizika korrepetálás", level: 3, parentId: "cat_oktatas_maganora" },
          { id: "cat_oktatas_maganora_zene", name: "Zeneórák (Gitár, Zongora, Ének)", level: 3, parentId: "cat_oktatas_maganora" },
        ],
      },
    ],
  },
  {
    id: "cat_elektronika",
    name: "ELEKTRONIKA",
    level: 1,
    parentId: null,
    icon: "💻",
    count: "189 400",
    children: [
      {
        id: "cat_elektronika_audio",
        name: "AUDIO ÉS HANG",
        level: 2,
        parentId: "cat_elektronika",
        children: [
          { id: "cat_elektronika_audio_fejhallgato", name: "Fejhallgatók és fülhallgatók (Bluetooth, Over-ear, Vezetékes)", level: 3, parentId: "cat_elektronika_audio" },
          { id: "cat_elektronika_audio_hangszorok", name: "Hangszórók (Bluetooth, Otthoni, Subwoofer)", level: 3, parentId: "cat_elektronika_audio" },
          { id: "cat_elektronika_audio_lemezzatyszo", name: "Lemezjátszók és hifiberendezések", level: 3, parentId: "cat_elektronika_audio" },
          { id: "cat_elektronika_audio_mikrofon", name: "Mikrofonok és stúdióeszközök", level: 3, parentId: "cat_elektronika_audio" },
        ],
      },
      {
        id: "cat_elektronika_fenykepezo",
        name: "FÉNYKÉPEZŐGÉPEK",
        level: 2,
        parentId: "cat_elektronika",
        children: [
          { id: "cat_elektronika_fenykepezo_dronok", name: "Drónok és videokamerák", level: 3, parentId: "cat_elektronika_fenykepezo" },
          { id: "cat_elektronika_fenykepezo_kompakt", name: "Kompakt fényképezőgépek", level: 3, parentId: "cat_elektronika_fenykepezo" },
          { id: "cat_elektronika_fenykepezo_objektiv", name: "Objektívek és lencsék", level: 3, parentId: "cat_elektronika_fenykepezo" },
          { id: "cat_elektronika_fenykepezo_tukorreflex", name: "Tükörreflexes gépek", level: 3, parentId: "cat_elektronika_fenykepezo" },
        ],
      },
      {
        id: "cat_elektronika_jatekonzol",
        name: "JÁTÉKKONZOLOK",
        level: 2,
        parentId: "cat_elektronika",
        children: [
          { id: "cat_elektronika_jatekonzol_konzolok", name: "Asztali és hordozható konzolok", level: 3, parentId: "cat_elektronika_jatekonzol" },
          { id: "cat_elektronika_jatekonzol_szoftverek", name: "Játékszoftverek és kártyák", level: 3, parentId: "cat_elektronika_jatekonzol" },
          { id: "cat_elektronika_jatekonzol_kontrollerek", name: "Kontrollerek és kiegészítők", level: 3, parentId: "cat_elektronika_jatekonzol" },
        ],
      },
      {
        id: "cat_elektronika_mobil",
        name: "MOBIL ESZKÖZÖK",
        level: 2,
        parentId: "cat_elektronika",
        children: [
          { id: "cat_elektronika_mobil_android", name: "Android telefonok", level: 3, parentId: "cat_elektronika_mobil" },
          { id: "cat_elektronika_mobil_iphone", name: "iPhone-ok", level: 3, parentId: "cat_elektronika_mobil" },
          { id: "cat_elektronika_mobil_powerbank", name: "Külső akkumulátorok", level: 3, parentId: "cat_elektronika_mobil" },
          { id: "cat_elektronika_mobil_okosora", name: "Okosórák és fitneszkarkötők", level: 3, parentId: "cat_elektronika_mobil" },
          { id: "cat_elektronika_mobil_tokok", name: "Telefontokok és fóliák", level: 3, parentId: "cat_elektronika_mobil" },
          { id: "cat_elektronika_mobil_toltok", name: "Töltők és adatkábelek", level: 3, parentId: "cat_elektronika_mobil" },
        ],
      },
      {
        id: "cat_elektronika_szamitogep",
        name: "SZÁMÍTÓGÉPEK ÉS DIGITÁLIS",
        level: 2,
        parentId: "cat_elektronika",
        children: [
          { id: "cat_elektronika_szamitogep_alkatresz", name: "Asztali számítógépek és alkatrészek (Alaplapok, Grafikus kártyák, CPU)", level: 3, parentId: "cat_elektronika_szamitogep" },
          { id: "cat_elektronika_szamitogep_ebook", name: "Ebook-olvasók és egyéb digitális eszközök", level: 3, parentId: "cat_elektronika_szamitogep" },
          { id: "cat_elektronika_szamitogep_laptop", name: "Laptopok és notebookok", level: 3, parentId: "cat_elektronika_szamitogep" },
          { id: "cat_elektronika_szamitogep_monitor", name: "Monitorok és kijelzők", level: 3, parentId: "cat_elektronika_szamitogep" },
          { id: "cat_elektronika_szamitogep_nyomtato", name: "Nyomtatók és szkennerek", level: 3, parentId: "cat_elektronika_szamitogep" },
          { id: "cat_elektronika_szamitogep_tablet", name: "Tablet-ek", level: 3, parentId: "cat_elektronika_szamitogep" },
        ],
      },
    ],
  },
  {
    id: "cat_ferfi",
    name: "FÉRFI",
    level: 1,
    parentId: null,
    icon: "👔",
    count: "680 450",
    children: [
      {
        id: "cat_ferfi_dizajnermarkak",
        name: "Dizájnermárkák",
        level: 2,
        parentId: "cat_ferfi",
        children: [
          { id: "cat_ferfi_dizajner_cipok", name: "Cipők & Sneakerek", level: 3, parentId: "cat_ferfi_dizajnermarkak" },
          { id: "cat_ferfi_dizajner_kiegeszitok", name: "Kiegészítők & Órák", level: 3, parentId: "cat_ferfi_dizajnermarkak" },
          { id: "cat_ferfi_dizajner_ruhazat", name: "Ruházat & Öltönyök", level: 3, parentId: "cat_ferfi_dizajnermarkak" },
        ],
      },
      {
        id: "cat_ferfi_cipok",
        name: "CIPŐK",
        level: 2,
        parentId: "cat_ferfi",
        children: [
          { id: "cat_ferfi_cipok_csizma", name: "Csizmák és bokacsizmák", level: 3, parentId: "cat_ferfi_cipok" },
          { id: "cat_ferfi_cipok_lakk", name: "Lakkcipők és irodai cipők", level: 3, parentId: "cat_ferfi_cipok" },
          { id: "cat_ferfi_cipok_sport", name: "Sportcipők és sneaker-ek", level: 3, parentId: "cat_ferfi_cipok" },
          { id: "cat_ferfi_cipok_szandal", name: "Szandálok és papucsok", level: 3, parentId: "cat_ferfi_cipok" },
          { id: "cat_ferfi_cipok_szlipper", name: "Szlipperek és balerinák", level: 3, parentId: "cat_ferfi_cipok" },
        ],
      },
      {
        id: "cat_ferfi_felsoruhazat",
        name: "FELSŐRUHÁZAT",
        level: 2,
        parentId: "cat_ferfi",
        children: [
          { id: "cat_ferfi_felsoruhazat_garbo", name: "Garbók ★", level: 3, parentId: "cat_ferfi_felsoruhazat" },
          { id: "cat_ferfi_felsoruhazat_ing", name: "Ingek", level: 3, parentId: "cat_ferfi_felsoruhazat" },
          { id: "cat_ferfi_felsoruhazat_kabat", name: "Kabátok és dzsekik", level: 3, parentId: "cat_ferfi_felsoruhazat" },
          { id: "cat_ferfi_felsoruhazat_oltony", name: "Öltönyök és blézerek", level: 3, parentId: "cat_ferfi_felsoruhazat" },
          { id: "cat_ferfi_felsoruhazat_polo", name: "Pólók és trikók", level: 3, parentId: "cat_ferfi_felsoruhazat" },
          { id: "cat_ferfi_felsoruhazat_pulever", name: "Pulóverek és kardigánok", level: 3, parentId: "cat_ferfi_felsoruhazat" },
          { id: "cat_ferfi_felsoruhazat_tanktop", name: "Tank-topok és sportpólók", level: 3, parentId: "cat_ferfi_felsoruhazat" },
        ],
      },
      {
        id: "cat_ferfi_kezitaskak",
        name: "KÉZITÁSKÁK ÉS PÉNZTÁRCÁK",
        level: 2,
        parentId: "cat_ferfi",
        children: [
          { id: "cat_ferfi_kezitaskak_aktataska", name: "Aktatáskák és bőrtáskák", level: 3, parentId: "cat_ferfi_kezitaskak" },
          { id: "cat_ferfi_kezitaskak_hatizsak", name: "Hátizsákok", level: 3, parentId: "cat_ferfi_kezitaskak" },
          { id: "cat_ferfi_kezitaskak_kezitaska", name: "Kézitáskák és sporttáskák", level: 3, parentId: "cat_ferfi_kezitaskak" },
          { id: "cat_ferfi_kezitaskak_ovtaska", name: "Övtáskák", level: 3, parentId: "cat_ferfi_kezitaskak" },
          { id: "cat_ferfi_kezitaskak_penztarca", name: "Pénztárcák és kártyatartók", level: 3, parentId: "cat_ferfi_kezitaskak" },
        ],
      },
      {
        id: "cat_ferfi_nadragok",
        name: "NADRÁGOK",
        level: 2,
        parentId: "cat_ferfi",
        children: [
          { id: "cat_ferfi_nadragok_irodai", name: "Irodai és öltönynadrágok", level: 3, parentId: "cat_ferfi_nadragok" },
          { id: "cat_ferfi_nadragok_farmer", name: "Jeans és farmernadrágok", level: 3, parentId: "cat_ferfi_nadragok" },
          { id: "cat_ferfi_nadragok_jogging", name: "Jogging és melegítőnadrágok", level: 3, parentId: "cat_ferfi_nadragok" },
          { id: "cat_ferfi_nadragok_rovid", name: "Rövidnadrágok", level: 3, parentId: "cat_ferfi_nadragok" },
          { id: "cat_ferfi_nadragok_vaszon", name: "Vászon- és kordnadrágok", level: 3, parentId: "cat_ferfi_nadragok" },
        ],
      },
      {
        id: "cat_ferfi_szepsegapolas",
        name: "SZÉPSÉGÁPOLÁS",
        level: 2,
        parentId: "cat_ferfi",
        children: [
          { id: "cat_ferfi_szepseg_arcapolas", name: "Arcápolás és borotválkozás", level: 3, parentId: "cat_ferfi_szepsegapolas" },
          { id: "cat_ferfi_szepseg_kiegeszitok", name: "Férfi kiegészítők", level: 3, parentId: "cat_ferfi_szepsegapolas" },
          { id: "cat_ferfi_szepseg_parfum", name: "Parfümök és illatok", level: 3, parentId: "cat_ferfi_szepsegapolas" },
        ],
      },
    ],
  },
  {
    id: "cat_gyerek",
    name: "GYEREK",
    level: 1,
    parentId: null,
    icon: "👶",
    count: "412 800",
    children: [
      {
        id: "cat_gyerek_csecsemo",
        name: "CSECSEMŐK (0–12 hónap)",
        level: 2,
        parentId: "cat_gyerek",
        children: [
          { id: "cat_gyerek_csecsemo_alaruha", name: "Aláruha, body és trikók (Bodik, Kezeslábasok)", level: 3, parentId: "cat_gyerek_csecsemo" },
          { id: "cat_gyerek_csecsemo_cipok", name: "Cipők és melegítők (Csecsemő cipők, Sapkák, Kesztyűk)", level: 3, parentId: "cat_gyerek_csecsemo" },
          { id: "cat_gyerek_csecsemo_felsoruhazat", name: "Felsőruházat (Blúzok, Garbók, Hoodi-k, Pulóverek)", level: 3, parentId: "cat_gyerek_csecsemo" },
          { id: "cat_gyerek_csecsemo_furdoruha", name: "Fürdőruha és alvás (Hálóruhák, Pizsamák, Hálózsákok)", level: 3, parentId: "cat_gyerek_csecsemo" },
          { id: "cat_gyerek_csecsemo_kabatok", name: "Kabátok és dzsekik (Bélelt, Esőkabátok, Steppelt)", level: 3, parentId: "cat_gyerek_csecsemo" },
          { id: "cat_gyerek_csecsemo_nadragok", name: "Nadrágok és alsórész (Jogging, Pamut, Rövidnadrágok)", level: 3, parentId: "cat_gyerek_csecsemo" },
        ],
      },
      {
        id: "cat_gyerek_fiuk",
        name: "FIÚK (2–15 év)",
        level: 2,
        parentId: "cat_gyerek",
        children: [
          { id: "cat_gyerek_fiuk_alaruha", name: "Aláruha és fehérnemű (Boxer, Slip, Trikók, Zoknik)", level: 3, parentId: "cat_gyerek_fiuk" },
          { id: "cat_gyerek_fiuk_cipok", name: "Cipők (Csizmák, Lakkcipők, Papucsok, Sportcipők)", level: 3, parentId: "cat_gyerek_fiuk" },
          { id: "cat_gyerek_fiuk_felsoruhazat", name: "Felsőruházat (Ingek, Garbók, Pulóverek, Pólók)", level: 3, parentId: "cat_gyerek_fiuk" },
          { id: "cat_gyerek_fiuk_furdoruha", name: "Fürdőruha és alvás (Úszónadrágok, Pizsamák, Köntösök)", level: 3, parentId: "cat_gyerek_fiuk" },
          { id: "cat_gyerek_fiuk_kabatok", name: "Kabátok és dzsekik (Bomber, Esőkabátok, Télikabátok)", level: 3, parentId: "cat_gyerek_fiuk" },
          { id: "cat_gyerek_fiuk_nadragok", name: "Nadrágok és rövidnadrág (Farmer, Melegítő, Cargo)", level: 3, parentId: "cat_gyerek_fiuk" },
        ],
      },
      {
        id: "cat_gyerek_lanyok",
        name: "LÁNYOK (2–15 év)",
        level: 2,
        parentId: "cat_gyerek",
        children: [
          { id: "cat_gyerek_lanyok_alaruha", name: "Aláruha és fehérnemű (Bodik, Lányka alsónemű, Zoknik)", level: 3, parentId: "cat_gyerek_lanyok" },
          { id: "cat_gyerek_lanyok_cipok", name: "Cipők (Balerinák, Csizmák, Lakkcipők, Szandálok)", level: 3, parentId: "cat_gyerek_lanyok" },
          { id: "cat_gyerek_lanyok_felsoruhazat", name: "Felsőruházat (Blúzok, Garbók, Pulóverek, Topok)", level: 3, parentId: "cat_gyerek_lanyok" },
          { id: "cat_gyerek_lanyok_furdoruha", name: "Fürdőruha és alvás (Bikinik, Pizsamák, Köntösök)", level: 3, parentId: "cat_gyerek_lanyok" },
          { id: "cat_gyerek_lanyok_kabatok", name: "Kabátok és dzsekik (Parkák, Steppelt, Télikabátok)", level: 3, parentId: "cat_gyerek_lanyok" },
          { id: "cat_gyerek_lanyok_nadragok", name: "Nadrágok és rövidnadrág (Farmer, Leggings, Melegítő)", level: 3, parentId: "cat_gyerek_lanyok" },
          { id: "cat_gyerek_lanyok_ruha", name: "Ruha és szoknya (Egyberuhák, Maxiruhák, Szoknyák)", level: 3, parentId: "cat_gyerek_lanyok" },
        ],
      },
    ],
  },
  {
    id: "cat_hobbi",
    name: "HOBBI ÉS GYŰJTEMÉNYEK",
    level: 1,
    parentId: null,
    icon: "🎯",
    count: "95 300",
    children: [
      {
        id: "cat_hobbi_gyujthato_kartyak",
        name: "GYŰJTHETŐ KÁRTYÁK",
        level: 2,
        parentId: "cat_hobbi",
        children: [
          { id: "cat_hobbi_gyujthato_kartyak_kereskedelmi", name: "Kereskedelmi kártyajátékok", level: 3, parentId: "cat_hobbi_gyujthato_kartyak" },
          { id: "cat_hobbi_gyujthato_kartyak_parti", name: "Parti- és tréfakártyák", level: 3, parentId: "cat_hobbi_gyujthato_kartyak" },
          { id: "cat_hobbi_gyujthato_kartyak_sport", name: "Sportkártyák", level: 3, parentId: "cat_hobbi_gyujthato_kartyak" },
        ],
      },
      {
        id: "cat_hobbi_jatekfigurak",
        name: "JÁTÉKFIGURÁK ÉS MODELLEK",
        level: 2,
        parentId: "cat_hobbi",
        children: [
          { id: "cat_hobbi_jatekfigurak_akcio", name: "Akciófigurák és babák", level: 3, parentId: "cat_hobbi_jatekfigurak" },
          { id: "cat_hobbi_jatekfigurak_epitheto", name: "Építhető modellek és miniatúrák", level: 3, parentId: "cat_hobbi_jatekfigurak" },
          { id: "cat_hobbi_jatekfigurak_makettek", name: "Makettek", level: 3, parentId: "cat_hobbi_jatekfigurak" },
          { id: "cat_hobbi_jatekfigurak_pluss", name: "Plüssállatok", level: 3, parentId: "cat_hobbi_jatekfigurak" },
        ],
      },
      {
        id: "cat_hobbi_lego",
        name: "LEGO ÉS ÉPÍTŐSZETTEK",
        level: 2,
        parentId: "cat_hobbi",
        children: [
          { id: "cat_hobbi_lego_egyeb", name: "Egyéb építőkészletek", level: 3, parentId: "cat_hobbi_lego" },
          { id: "cat_hobbi_lego_city", name: "LEGO City", level: 3, parentId: "cat_hobbi_lego" },
          { id: "cat_hobbi_lego_classic", name: "LEGO Classic és Creator", level: 3, parentId: "cat_hobbi_lego" },
          { id: "cat_hobbi_lego_starwars", name: "LEGO Star Wars", level: 3, parentId: "cat_hobbi_lego" },
          { id: "cat_hobbi_lego_technic", name: "LEGO Technic", level: 3, parentId: "cat_hobbi_lego" },
        ],
      },
    ],
  },
  {
    id: "cat_konyvek",
    name: "KÖNYVEK ÉS MÉDIA",
    level: 1,
    parentId: null,
    icon: "📚",
    count: "154 200",
    children: [
      {
        id: "cat_konyvek_dvd",
        name: "DVD ÉS BLU-RAY",
        level: 2,
        parentId: "cat_konyvek",
        children: [
          { id: "cat_konyvek_dvd_doksi", name: "Dokumentumfilmek és oktatófilmek", level: 3, parentId: "cat_konyvek_dvd" },
          { id: "cat_konyvek_dvd_filmek", name: "Filmek és mozifilmek", level: 3, parentId: "cat_konyvek_dvd" },
          { id: "cat_konyvek_dvd_sorozatok", name: "Sorozatok és box-készletek", level: 3, parentId: "cat_konyvek_dvd" },
        ],
      },
      {
        id: "cat_konyvek_konyvek",
        name: "KÖNYVEK",
        level: 2,
        parentId: "cat_konyvek",
        children: [
          { id: "cat_konyvek_konyvek_ekonyv", name: "E-könyvek és digitális kiadványok (Kindle, Ebook-olvasó)", level: 3, parentId: "cat_konyvek_konyvek" },
          { id: "cat_konyvek_konyvek_gyerek", name: "Gyerekkönyvek és mesekönyvek", level: 3, parentId: "cat_konyvek_konyvek" },
          { id: "cat_konyvek_konyvek_hangos", name: "Hangoskönyvek (CD/letöltés)", level: 3, parentId: "cat_konyvek_konyvek" },
          { id: "cat_konyvek_konyvek_vallas", name: "Hiteles és vallásos könyvek", level: 3, parentId: "cat_konyvek_konyvek" },
          { id: "cat_konyvek_konyvek_ismeret", name: "Ismeretterjesztő könyvek", level: 3, parentId: "cat_konyvek_konyvek" },
          { id: "cat_konyvek_konyvek_regeny", name: "Regények és szépirodalom", level: 3, parentId: "cat_konyvek_konyvek" },
          { id: "cat_konyvek_konyvek_tankonyv", name: "Tankönyvek és szakkönyvek", level: 3, parentId: "cat_konyvek_konyvek" },
        ],
      },
      {
        id: "cat_konyvek_zenei",
        name: "ZENEI MÉDIA",
        level: 2,
        parentId: "cat_konyvek",
        children: [
          { id: "cat_konyvek_zenei_bakelit", name: "Bakelit lemezek", level: 3, parentId: "cat_konyvek_zenei" },
          { id: "cat_konyvek_zenei_cd", name: "CD-k és kazetták", level: 3, parentId: "cat_konyvek_zenei" },
          { id: "cat_konyvek_zenei_kotta", name: "Kotta és hangjegyek", level: 3, parentId: "cat_konyvek_zenei" },
        ],
      },
    ],
  },
  {
    id: "cat_noi",
    name: "NŐI",
    level: 1,
    parentId: null,
    icon: "👗",
    count: "1 245 780",
    children: [
      { id: "cat_noi_minden", name: "Minden", level: 2, parentId: "cat_noi" },
      {
        id: "cat_noi_dizajnermarkak",
        name: "Dizájnermárkák",
        level: 2,
        parentId: "cat_noi",
        children: [
          { id: "cat_noi_dizajner_cipok", name: "Cipők & Sarkak", level: 3, parentId: "cat_noi_dizajnermarkak" },
          { id: "cat_noi_dizajner_ekszerek", name: "Ékszerek & Órák", level: 3, parentId: "cat_noi_dizajnermarkak" },
          { id: "cat_noi_dizajner_ruhak", name: "Ruhák & Kabátok", level: 3, parentId: "cat_noi_dizajnermarkak" },
          { id: "cat_noi_dizajner_taskak", name: "Táskák & Retikülök", level: 3, parentId: "cat_noi_dizajnermarkak" },
        ],
      },
      {
        id: "cat_noi_cipok",
        name: "Cipők",
        level: 2,
        parentId: "cat_noi",
        children: [
          { id: "cat_noi_cipok_minden", name: "Minden", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_balerina", name: "Balerinák", level: 3, parentId: "cat_noi_cipok" },
          {
            id: "cat_noi_cipok_csizmak",
            name: "Csizmák",
            level: 3,
            parentId: "cat_noi_cipok",
            children: [
              { id: "cat_noi_cipok_csizmak_bokacsizma", name: "Bokacsizmák", level: 3, parentId: "cat_noi_cipok_csizmak" },
              { id: "cat_noi_cipok_csizmak_combcsizma", name: "Combcsizmák", level: 3, parentId: "cat_noi_cipok_csizmak" },
              { id: "cat_noi_cipok_csizmak_gumicsizma", name: "Gumicsizmák", level: 3, parentId: "cat_noi_cipok_csizmak" },
              { id: "cat_noi_cipok_csizmak_magasszaru", name: "Magasszárú csizma", level: 3, parentId: "cat_noi_cipok_csizmak" },
              { id: "cat_noi_cipok_csizmak_munkabakancs", name: "Munkabakancsok", level: 3, parentId: "cat_noi_cipok_csizmak" },
              { id: "cat_noi_cipok_csizmak_teli", name: "Téli csizmák", level: 3, parentId: "cat_noi_cipok_csizmak" },
              { id: "cat_noi_cipok_csizmak_terdcsizma", name: "Térdcsizmák", level: 3, parentId: "cat_noi_cipok_csizmak" },
            ]
          },
          { id: "cat_noi_cipok_edzo_sneaker", name: "Edzőcipők és sneakerek", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_espadrilles", name: "Espadrilles cipők", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_flipflop", name: "Flipflopok és papucsok", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_fuzos", name: "Fűzős cipők", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_klumpa", name: "Klumpák és papucscipők", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_magassarku", name: "Magas sarkú cipők", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_mamusz", name: "Mamuszok", level: 3, parentId: "cat_noi_cipok" },
          { id: "cat_noi_cipok_maryjane", name: "Mary Jane-ek", level: 3, parentId: "cat_noi_cipok" },
          {
            id: "cat_noi_cipok_sportcipok",
            name: "Sportcipők",
            level: 3,
            parentId: "cat_noi_cipok",
            children: [
              { id: "cat_noi_cipok_sport_belteri_edzo", name: "Beltéri edzőcipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_belteri_foci", name: "Beltéri focicipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_foci", name: "Focicipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_futo", name: "Futócipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_golf", name: "Golfcipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_gorkorcsolya", name: "Görkorcsolyák", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_jegkorcsolya", name: "Jégkorcsolyák", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_kerekparos", name: "Kerékpáros cipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_kosarlabda", name: "Kosárlabdacipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_maszo", name: "Mászócipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_motoros", name: "Motoros csizmák", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_sicipo", name: "Sícipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_snowboard", name: "Snowboardbakancsok", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_tanccipo", name: "Tánccipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_tenisz", name: "Teniszcipő", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_turabakancs", name: "Túrabakancsok és -cipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
              { id: "cat_noi_cipok_sport_uszocipo", name: "Úszócipők", level: 3, parentId: "cat_noi_cipok_sportcipok" },
            ]
          },
          {
            id: "cat_noi_cipok_szandatok",
            name: "Szandálok",
            level: 3,
            parentId: "cat_noi_cipok",
            children: [
              { id: "cat_noi_cipok_szandal_lapos", name: "Lapos szandálok", level: 3, parentId: "cat_noi_cipok_szandatok" },
              { id: "cat_noi_cipok_szandal_magassarku", name: "Magas sarkú szandálok", level: 3, parentId: "cat_noi_cipok_szandatok" },
            ]
          },
          { id: "cat_noi_cipok_vitorlas", name: "Vitorláscipők, loaferek és mokaszinek", level: 3, parentId: "cat_noi_cipok" },
        ],
      },
      {
        id: "cat_noi_kiegeszitok",
        name: "Kiegészítők",
        level: 2,
        parentId: "cat_noi",
        children: [
          { id: "cat_noi_kieg_minden", name: "Minden", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_ekszerek", name: "Ékszerek", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_egyeb", name: "Egyéb kiegészítők", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_esernyok", name: "Esernyők", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_fejkendok", name: "Fejkendők", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_hajbavalok", name: "Hajbavalók", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_kalapok", name: "Kalapok és sapkák", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_karorak", name: "Karórák", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_kendok", name: "Kendők és sálak", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_kesztyuk", name: "Kesztyűk", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_kulcstarto", name: "Kulcstartó", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_napszemuvegek", name: "Napszemüvegek", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_ovek", name: "Övek", level: 3, parentId: "cat_noi_kiegeszitok" },
          { id: "cat_noi_kieg_zsebkendok", name: "Zsebkendők", level: 3, parentId: "cat_noi_kiegeszitok" },
        ],
      },
      {
        id: "cat_noi_ruhak",
        name: "Ruhák",
        level: 2,
        parentId: "cat_noi",
        children: [
          { id: "cat_noi_ruhak_minden", name: "Minden", level: 3, parentId: "cat_noi_ruhak" },
          { id: "cat_noi_ruhak_egyeb", name: "Egyéb ruházat", level: 3, parentId: "cat_noi_ruhak" },
          {
            id: "cat_noi_ruhak_farmerok",
            name: "Farmerok",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_farmer_boyfriend", name: "Boyfriend farmerok", level: 3, parentId: "cat_noi_ruhak_farmerok" },
              { id: "cat_noi_farmer_egyeb", name: "Egyéb", level: 3, parentId: "cat_noi_ruhak_farmerok" },
              { id: "cat_noi_farmer_egyenes", name: "Egyenes szárú farmerok", level: 3, parentId: "cat_noi_ruhak_farmerok" },
              { id: "cat_noi_farmer_magasdereku", name: "Magas derekú farmerok", level: 3, parentId: "cat_noi_ruhak_farmerok" },
              { id: "cat_noi_farmer_rovid", name: "Rövid szabású farmerok", level: 3, parentId: "cat_noi_ruhak_farmerok" },
              { id: "cat_noi_farmer_szakadt", name: "Szakadt farmerok", level: 3, parentId: "cat_noi_ruhak_farmerok" },
              { id: "cat_noi_farmer_szukszaru", name: "Szűk szárú farmerok", level: 3, parentId: "cat_noi_ruhak_farmerok" },
              { id: "cat_noi_farmer_trapez", name: "Trapéznadrágok", level: 3, parentId: "cat_noi_ruhak_farmerok" },
            ]
          },
          {
            id: "cat_noi_ruhak_fehernemu",
            name: "Fehérnemű és éjszakai viselet",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_fehernemu_alakformalo", name: "Alakformáló fehérneműk", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_bugyik", name: "Bugyik", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_egyeb", name: "Egyéb", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_ejszakai", name: "Éjszakai ruházat", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_kiegeszitok", name: "Fehérnemű kiegészítők", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_harisnyak", name: "Harisnyák és harisnyazoknik", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_kontosok", name: "Köntösök", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_melltartok", name: "Melltartók", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_szettek", name: "Szettek", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
              { id: "cat_noi_fehernemu_zoknik", name: "Zoknik", level: 3, parentId: "cat_noi_ruhak_fehernemu" },
            ]
          },
          {
            id: "cat_noi_ruhak_felsok",
            name: "Felsők és pólók",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_felsok_galleros", name: "Galléros pólók", level: 3, parentId: "cat_noi_ruhak_felsok" },
              { id: "cat_noi_felsok_ingek", name: "Ingek", level: 3, parentId: "cat_noi_ruhak_felsok" },
              { id: "cat_noi_felsok_mellenyek", name: "Mellények és ujjatlan pólók", level: 3, parentId: "cat_noi_ruhak_felsok" },
              { id: "cat_noi_felsok_polok", name: "Pólók", level: 3, parentId: "cat_noi_ruhak_felsok" },
            ]
          },
          { id: "cat_noi_ruhak_jelmezek", name: "Jelmezek és különleges öltözékek", level: 3, parentId: "cat_noi_ruhak" },
          {
            id: "cat_noi_ruhak_kabatok",
            name: "Kabátok és dzsekik",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_kabatok_dzsekik", name: "Dzsekik", level: 3, parentId: "cat_noi_ruhak_kabatok" },
              { id: "cat_noi_kabatok_kabatok", name: "Kabátok", level: 3, parentId: "cat_noi_ruhak_kabatok" },
              { id: "cat_noi_kabatok_mellenyek", name: "Mellények", level: 3, parentId: "cat_noi_ruhak_kabatok" },
              { id: "cat_noi_kabatok_poncsok", name: "Poncsók", level: 3, parentId: "cat_noi_ruhak_kabatok" },
            ]
          },
          { id: "cat_noi_ruhak_kezeslabasok", name: "Kezeslábasok és playsuitok", level: 3, parentId: "cat_noi_ruhak" },
          {
            id: "cat_noi_ruhak_kismama",
            name: "Kismamaruházat",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_kismama_alsonemu", name: "Kismama alsónemű", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_kezeslabas", name: "Kismama kezeslábasok és playsuitok", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_rovidnadrag", name: "Kismama rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_felsok", name: "Kismamafelsők", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_kabatok", name: "Kismamakabátok és -dzsekik", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_nadragok", name: "Kismamanadrágok", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_puloverek", name: "Kismamapulóverek és -melegítők", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_ruhak", name: "Kismamaruhák", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_szoknyak", name: "Kismamaszoknyák", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_uszoruha", name: "Kismama úszóruházat és strandruházat", level: 3, parentId: "cat_noi_ruhak_kismama" },
              { id: "cat_noi_kismama_sportruha", name: "Sportruhák", level: 3, parentId: "cat_noi_ruhak_kismama" },
            ]
          },
          {
            id: "cat_noi_ruhak_nadragok",
            name: "Nadrágok és leggingsek",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_nadrag_boszaru", name: "Bő szárú nadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_bornadrag", name: "Bőrnadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_egyeb", name: "Egyéb nadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_egyenes", name: "Egyenes szárú nadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_haremnadrag", name: "Háremnadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_leggingsek", name: "Leggingsek", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_rovid_chino", name: "Rövid szabású nadrágok és chino fazonú nadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_testre_szabott", name: "Testre szabott nadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
              { id: "cat_noi_nadrag_vekony", name: "Vékony szabású nadrágok", level: 3, parentId: "cat_noi_ruhak_nadragok" },
            ]
          },
          {
            id: "cat_noi_ruhak_puloverek",
            name: "Pulóverek és melegítők",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_pulover_bolero", name: "Bolerók", level: 3, parentId: "cat_noi_ruhak_puloverek" },
              { id: "cat_noi_pulover_egyeb", name: "Egyéb pulóverek és melegítők", level: 3, parentId: "cat_noi_ruhak_puloverek" },
              { id: "cat_noi_pulover_kapucnis", name: "Kapucnis- és melegítőfelső", level: 3, parentId: "cat_noi_ruhak_puloverek" },
              { id: "cat_noi_pulover_kardigan", name: "Kardigánok", level: 3, parentId: "cat_noi_ruhak_puloverek" },
              { id: "cat_noi_pulover_kimono", name: "Kimonók", level: 3, parentId: "cat_noi_ruhak_puloverek" },
              { id: "cat_noi_pulover_melegito", name: "Melegítők", level: 3, parentId: "cat_noi_ruhak_puloverek" },
              { id: "cat_noi_pulover_melleny", name: "Mellények", level: 3, parentId: "cat_noi_ruhak_puloverek" },
              { id: "cat_noi_pulover_minden", name: "Minden", level: 3, parentId: "cat_noi_ruhak_puloverek" },
            ]
          },
          {
            id: "cat_noi_ruhak_rovidnadragok",
            name: "Rövidnadrágok és rövid szabású nadrágok",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_rovid_alacsonydereku", name: "Alacsony derekú rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_bor", name: "Bőr rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_cargo", name: "Cargo rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_csipke", name: "Csipke rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_egyeb", name: "Egyéb rövidnadrágok és rövid szárú nadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_farmer", name: "Farmer rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_magasdereku", name: "Magas derekú rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_szabasu", name: "Rövid szabású", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
              { id: "cat_noi_rovid_terdig", name: "Térdig érő rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_rovidnadragok" },
            ]
          },
          {
            id: "cat_noi_ruhak_egyberuhak",
            name: "Ruhák",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_ruha_alkalmi", name: "Alkalmi/munkaruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_egyeb", name: "Egyéb ruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_farmer", name: "Farmerruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_hetkoznapi", name: "Hétköznapi ruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_hosszu", name: "Hosszú ruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_kis_fekete", name: "Kis fekete ruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_midi", name: "Midiruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_mini", name: "Miniruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_nyari", name: "Nyári ruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_pant_nelkuli", name: "Pánt nélküli ruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_kulonleges", name: "Ruhák különleges alkalmakra", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
              { id: "cat_noi_ruha_teli", name: "Téli ruhák", level: 3, parentId: "cat_noi_ruhak_egyberuhak" },
            ]
          },
          {
            id: "cat_noi_ruhak_sportruhazat",
            name: "Sportruházat",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_sport_egyeb", name: "Egyéb sportruházat", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_felsok", name: "Felsők és pólók", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_felsoruhazat", name: "Felsőruházat", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_kapucnis", name: "Kapucnis pulóverek", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_melegitoszettek", name: "Melegítőszettek", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_mezek", name: "Mezek", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_nadragok", name: "Nadrágok", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_rovidnadragok", name: "Rövidnadrágok", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
              { id: "cat_noi_sport_kiegeszitok", name: "Sportkiegészítők", level: 3, parentId: "cat_noi_ruhak_sportruhazat" },
            ]
          },
          {
            id: "cat_noi_ruhak_szoknyak",
            name: "Szoknyák",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_szoknya_aszimmetrikus", name: "Aszimmetrikus szoknyák", level: 3, parentId: "cat_noi_ruhak_szoknyak" },
              { id: "cat_noi_szoknya_maxi", name: "Maxi szoknyák", level: 3, parentId: "cat_noi_ruhak_szoknyak" },
              { id: "cat_noi_szoknya_midi", name: "Midi szoknyák", level: 3, parentId: "cat_noi_ruhak_szoknyak" },
              { id: "cat_noi_szoknya_mini", name: "Miniszoknyák", level: 3, parentId: "cat_noi_ruhak_szoknyak" },
              { id: "cat_noi_szoknya_terdig", name: "Térdig érő szoknyák", level: 3, parentId: "cat_noi_ruhak_szoknyak" },
            ]
          },
          {
            id: "cat_noi_ruhak_uszoruhazat",
            name: "Úszóruházat",
            level: 3,
            parentId: "cat_noi_ruhak",
            children: [
              { id: "cat_noi_uszo_bikinik", name: "Bikinik és tankinik", level: 3, parentId: "cat_noi_ruhak_uszoruhazat" },
              { id: "cat_noi_uszo_egyeb", name: "Egyéb úszóruházat és strandruházat", level: 3, parentId: "cat_noi_ruhak_uszoruhazat" },
              { id: "cat_noi_uszo_egyreszesek", name: "Egyrészesek", level: 3, parentId: "cat_noi_ruhak_uszoruhazat" },
              { id: "cat_noi_uszo_strandtunikak", name: "Strandtunikák és szárongok", level: 3, parentId: "cat_noi_ruhak_uszoruhazat" },
            ]
          },
          { id: "cat_noi_ruhak_oltonyok", name: "Öltönyök és zakók", level: 3, parentId: "cat_noi_ruhak" },
        ],
      },
      {
        id: "cat_noi_szepsegapolas",
        name: "Szépségápolás",
        level: 2,
        parentId: "cat_noi",
        children: [
          { id: "cat_noi_szepseg_minden", name: "Minden", level: 3, parentId: "cat_noi_szepsegapolas" },
          { id: "cat_noi_szepseg_arcapolas", name: "Arcápolás", level: 3, parentId: "cat_noi_szepsegapolas" },
          { id: "cat_noi_szepseg_egyeb", name: "Egyéb szépségápolási termékek", level: 3, parentId: "cat_noi_szepsegapolas" },
          { id: "cat_noi_szepseg_hajapolas", name: "Hajápolás", level: 3, parentId: "cat_noi_szepsegapolas" },
          { id: "cat_noi_szepseg_kezapolas", name: "Kézápolás", level: 3, parentId: "cat_noi_szepsegapolas" },
          { id: "cat_noi_szepseg_koromapolas", name: "Körömápolás", level: 3, parentId: "cat_noi_szepsegapolas" },
          { id: "cat_noi_szepseg_parfum", name: "Parfüm", level: 3, parentId: "cat_noi_szepsegapolas" },
          { id: "cat_noi_szepseg_smink", name: "Smink", level: 3, parentId: "cat_noi_szepsegapolas" },
          {
            id: "cat_noi_szepseg_eszkozok",
            name: "Szépségápolási eszközök",
            level: 3,
            parentId: "cat_noi_szepsegapolas",
            children: [
              { id: "cat_noi_szepseg_eszkoz_arc", name: "Arcápolási eszközök", level: 3, parentId: "cat_noi_szepseg_eszkozok" },
              { id: "cat_noi_szepseg_eszkoz_haj", name: "Hajformázó eszközök", level: 3, parentId: "cat_noi_szepseg_eszkozok" },
              { id: "cat_noi_szepseg_eszkoz_korom", name: "Körömápolási eszközök", level: 3, parentId: "cat_noi_szepseg_eszkozok" },
              { id: "cat_noi_szepseg_eszkoz_smink", name: "Sminkeszközök", level: 3, parentId: "cat_noi_szepseg_eszkozok" },
              { id: "cat_noi_szepseg_eszkoz_test", name: "Testápolási eszközök", level: 3, parentId: "cat_noi_szepseg_eszkozok" },
            ]
          },
          { id: "cat_noi_szepseg_testapolas", name: "Testápolás", level: 3, parentId: "cat_noi_szepsegapolas" },
        ],
      },
      {
        id: "cat_noi_taskak",
        name: "Táskák",
        level: 2,
        parentId: "cat_noi",
        children: [
          { id: "cat_noi_taska_minden", name: "Minden", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_aktataska", name: "Aktatáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_bevasarlo", name: "Bevásárlótáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_bucket", name: "Bucket táskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_hatizsak", name: "Hátizsákok", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_hobo", name: "Hobo táskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_karkotok", name: "Karkötők", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_kezitaska", name: "Kézitáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_ovtaska", name: "Övtáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_oldaltaska", name: "Oldaltáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_penztarca", name: "Pénztárcák és irattárcák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_poggyasz", name: "Poggyász és bőröndök", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_retikulok", name: "Retikülök", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_ruhazsakok", name: "Ruhazsákok", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_sminktaska", name: "Sminktáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_sporttaska", name: "Sporttáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_strandtaska", name: "Strandtáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_utazotaska", name: "Utazótáskák", level: 3, parentId: "cat_noi_taskak" },
          { id: "cat_noi_taska_valltaska", name: "Válltáskák", level: 3, parentId: "cat_noi_taskak" },
        ],
      },
    ],
  },
  {
    id: "cat_otthon",
    name: "OTTHON",
    level: 1,
    parentId: null,
    icon: "🏠",
    count: "215 900",
    children: [
      {
        id: "cat_otthon_butorok",
        name: "BÚTOROK",
        level: 2,
        parentId: "cat_otthon",
        children: [
          { id: "cat_otthon_butorok_agyak", name: "Ágyak és matracok", level: 3, parentId: "cat_otthon_butorok" },
          { id: "cat_otthon_butorok_asztalok", name: "Asztalok és íróasztalok", level: 3, parentId: "cat_otthon_butorok" },
          { id: "cat_otthon_butorok_fotelek", name: "Fotelek és kanapék", level: 3, parentId: "cat_otthon_butorok" },
          { id: "cat_otthon_butorok_székek", name: "Székek", level: 3, parentId: "cat_otthon_butorok" },
          { id: "cat_otthon_butorok_szekrenyek", name: "Szekrények és komódok", level: 3, parentId: "cat_otthon_butorok" },
        ],
      },
      {
        id: "cat_otthon_konyha",
        name: "KONYHA ÉS ÉTKEZÉS",
        level: 2,
        parentId: "cat_otthon",
        children: [
          { id: "cat_otthon_konyha_edenyek", name: "Edények és serpenyők", level: 3, parentId: "cat_otthon_konyha" },
          { id: "cat_otthon_konyha_evooeszkozek", name: "Evőeszközök és konyhai eszközök", level: 3, parentId: "cat_otthon_konyha" },
          { id: "cat_otthon_konyha_poharak", name: "Poharak és bögrék", level: 3, parentId: "cat_otthon_konyha" },
          { id: "cat_otthon_konyha_tanyerok", name: "Tányérok és tálak", level: 3, parentId: "cat_otthon_konyha" },
        ],
      },
      {
        id: "cat_otthon_lakberendezes",
        name: "LAKBERENDEZÉS",
        level: 2,
        parentId: "cat_otthon",
        children: [
          { id: "cat_otthon_lakberendezes_agynemu", name: "Ágynemű és párnák", level: 3, parentId: "cat_otthon_lakberendezes" },
          { id: "cat_otthon_lakberendezes_dekoracio", name: "Dekoráció és dísztárgyak", level: 3, parentId: "cat_otthon_lakberendezes" },
          { id: "cat_otthon_lakberendezes_kepek", name: "Képek, keretek és poszterek", level: 3, parentId: "cat_otthon_lakberendezes" },
          { id: "cat_otthon_lakberendezes_szonyegek", name: "Szőnyegek és futók", level: 3, parentId: "cat_otthon_lakberendezes" },
          { id: "cat_otthon_lakberendezes_vilagitas", name: "Világítás és lámpák", level: 3, parentId: "cat_otthon_lakberendezes" },
        ],
      },
    ],
  },
  {
    id: "cat_sport",
    name: "SPORT",
    level: 1,
    parentId: null,
    icon: "⚽",
    count: "128 500",
    children: [
      {
        id: "cat_sport_edzes",
        name: "EDZÉS ÉS FITNESZ",
        level: 2,
        parentId: "cat_sport",
        children: [
          { id: "cat_sport_edzes_gumik", name: "Edzőszalagok és ellenállási gumik", level: 3, parentId: "cat_sport_edzes" },
          { id: "cat_sport_edzes_szonyegek", name: "Fitness szőnyegek", level: 3, parentId: "cat_sport_edzes" },
          { id: "cat_sport_edzes_joga", name: "Jóga- és pilateskellékek", level: 3, parentId: "cat_sport_edzes" },
          { id: "cat_sport_edzes_sulyzok", name: "Súlyzók és kettlebellek", level: 3, parentId: "cat_sport_edzes" },
        ],
      },
      {
        id: "cat_sport_kerekpar",
        name: "KERÉKPÁROZÁS",
        level: 2,
        parentId: "cat_sport",
        children: [
          { id: "cat_sport_kerekpar_alkatreszek", name: "Kerékpár-részek és alkatrészek", level: 3, parentId: "cat_sport_kerekpar" },
          { id: "cat_sport_kerekpar_kerekparok", name: "Kerékpárok (minden típus)", level: 3, parentId: "cat_sport_kerekpar" },
          { id: "cat_sport_kerekpar_ruhazat", name: "Kerékpáros ruházat", level: 3, parentId: "cat_sport_kerekpar" },
          { id: "cat_sport_kerekpar_sisakok", name: "Sisakok és védőfelszerelések", level: 3, parentId: "cat_sport_kerekpar" },
        ],
      },
      {
        id: "cat_sport_labdajatekok",
        name: "LABDAJÁTÉKOK",
        level: 2,
        parentId: "cat_sport",
        children: [
          { id: "cat_sport_labdajatekok_foci", name: "Futball és futsal", level: 3, parentId: "cat_sport_labdajatekok" },
          { id: "cat_sport_labdajatekok_kezi", name: "Kézilabda", level: 3, parentId: "cat_sport_labdajatekok" },
          { id: "cat_sport_labdajatekok_kosar", name: "Kosárlabda", level: 3, parentId: "cat_sport_labdajatekok" },
          { id: "cat_sport_labdajatekok_roplabda", name: "Röplabda és strandröplabda", level: 3, parentId: "cat_sport_labdajatekok" },
          { id: "cat_sport_labdajatekok_tenisz", name: "Tenisz és asztalitenisz", level: 3, parentId: "cat_sport_labdajatekok" },
        ],
      },
      {
        id: "cat_sport_sportruhazat",
        name: "SPORTRUHÁZAT",
        level: 2,
        parentId: "cat_sport",
        children: [
          { id: "cat_sport_sportruhazat_ferfi", name: "Férfi sportruházat (felső+alsó)", level: 3, parentId: "cat_sport_sportruhazat" },
          { id: "cat_sport_sportruhazat_gyerek", name: "Gyerek sportruházat", level: 3, parentId: "cat_sport_sportruhazat" },
          { id: "cat_sport_sportruhazat_noi", name: "Női sportruházat (felső+alsó)", level: 3, parentId: "cat_sport_sportruhazat" },
          { id: "cat_sport_sportruhazat_szoknyak", name: "Sportszoknyák és leggings", level: 3, parentId: "cat_sport_sportruhazat" },
        ],
      },
    ],
  },
];

/**
 * Returns the complete category tree strictly ABC sorted at Level 1, Level 2, and Level 3
 */
export function getSortedCategoryTree(): CategoryNode[] {
  return RAW_CATEGORY_TREE;
}

/**
 * Flatten tree for easy querying
 */
export function getFlatCategoryList(nodes: CategoryNode[] = getSortedCategoryTree()): CategoryNode[] {
  let list: CategoryNode[] = [];
  for (const n of nodes) {
    const { children, ...flatNode } = n;
    list.push(flatNode);
    if (children && children.length > 0) {
      list = list.concat(getFlatCategoryList(children));
    }
  }
  return list;
}
