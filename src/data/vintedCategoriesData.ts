export interface CategoryNode {
  id: string;
  name: string;
  subcategories?: CategoryNode[];
}

export const VINTED_CATEGORY_TREE: CategoryNode[] = [
  {
    id: "dizajnermarkak",
    name: "DIZÁJNERMÁRKÁK",
    subcategories: [
      {
        id: "dizajner-ferfi",
        name: "Férfi kollekció",
        subcategories: [
          { id: "dizajner-ferfi-cipo", name: "Cipők & Sneakerek" },
          { id: "dizajner-ferfi-kieg", name: "Kiegészítők & Órák" },
          { id: "dizajner-ferfi-ruha", name: "Ruházat & Öltönyök" }
        ]
      },
      {
        id: "dizajner-noi",
        name: "Női kollekció",
        subcategories: [
          { id: "dizajner-noi-cipo", name: "Cipők & Sarkak" },
          { id: "dizajner-noi-ekszer", name: "Ékszerek & Órák" },
          { id: "dizajner-noi-ruha", name: "Ruhák & Kabátok" },
          { id: "dizajner-noi-taska", name: "Táskák & Retikülök" }
        ]
      }
    ]
  },
  {
    id: "elektronika",
    name: "ELEKTRONIKA",
    subcategories: [
      {
        id: "elektronika-audio",
        name: "Audio & Hangtechnika",
        subcategories: [
          { id: "elektronika-audio-fülhallygato", name: "Fülhallgatók" },
          { id: "elektronika-audio-hangszoro", name: "Hangszórók & Soundbar" },
          { id: "elektronika-audio-mikrofon", name: "Mikrofonok" }
        ]
      },
      {
        id: "elektronika-foto",
        name: "Fotózás & Videó",
        subcategories: [
          { id: "elektronika-foto-kamera", name: "Fényképezőgépek" },
          { id: "elektronika-foto-objektiv", name: "Objektívek" },
          { id: "elektronika-foto-állvány", name: "Állványok & Vaku" }
        ]
      },
      {
        id: "elektronika-gaming",
        name: "Konzolok & Játékok",
        subcategories: [
          { id: "elektronika-gaming-jatek", name: "Konzol játékok" },
          { id: "elektronika-gaming-konzol", name: "Konzolok (PlayStation/Xbox/Nintendo)" },
          { id: "elektronika-gaming-kontroller", name: "Kontrollerek & Kiegészítők" }
        ]
      },
      {
        id: "elektronika-telefon",
        name: "Okostelefonok & Kiegészítők",
        subcategories: [
          { id: "elektronika-telefon-készülék", name: "Mobiltelefonok" },
          { id: "elektronika-telefon-tok", name: "Tokok & Üvegfóliák" },
          { id: "elektronika-telefon-töltő", name: "Töltők & Powerbankok" }
        ]
      }
    ]
  },
  {
    id: "ferfi",
    name: "FÉRFI",
    subcategories: [
      {
        id: "ferfi-cipo",
        name: "Cipők",
        subcategories: [
          { id: "ferfi-cipo-bakancs", name: "Bakancsok & Csizmák" },
          { id: "ferfi-cipo-elegans", name: "Elegáns cipők" },
          { id: "ferfi-cipo-papucs", name: "Papucsok & Szandálok" },
          { id: "ferfi-cipo-sport", name: "Sportcipők & Edzőcipők" }
        ]
      },
      {
        id: "ferfi-kiegkeszitok",
        name: "Kiegészítők",
        subcategories: [
          { id: "ferfi-kieg-napszemuve", name: "Napszemüvegek" },
          { id: "ferfi-kieg-ora", name: "Órák" },
          { id: "ferfi-kieg-sapka", name: "Sapkák & Sálak" },
          { id: "ferfi-kieg-ov", name: "Övek & Pénztárcák" }
        ]
      },
      {
        id: "ferfi-ruhazat",
        name: "Ruházat",
        subcategories: [
          { id: "ferfi-ruha-farmer", name: "Farmerok" },
          { id: "ferfi-ruha-ing", name: "Ingék" },
          { id: "ferfi-ruha-kabat", name: "Kabátok & Dzsekik" },
          { id: "ferfi-ruha-nadrag", name: "Nadrágok & Rövidnadrágok" },
          { id: "ferfi-ruha-pulover", name: "Pulóverek & Pulóverek" },
          { id: "ferfi-ruha-poló", name: "Pólók & Trikók" }
        ]
      }
    ]
  },
  {
    id: "gyerek",
    name: "GYEREK",
    subcategories: [
      {
        id: "gyerek-baba",
        name: "Babaruha & Kellékek",
        subcategories: [
          { id: "gyerek-baba-bodik", name: "Bodik & Rúgdalózók" },
          { id: "gyerek-baba-kocsi", name: "Babakocsik & Hordozók" },
          { id: "gyerek-baba-pelenka", name: "Pelenkázás & Ápolás" }
        ]
      },
      {
        id: "gyerek-jatek",
        name: "Játékok",
        subcategories: [
          { id: "gyerek-jatek-lego", name: "Építőjátékok & LEGO" },
          { id: "gyerek-jatek-pluss", name: "Plüssfigurák" },
          { id: "gyerek-jatek-tarsas", name: "Társasjátékok & Kirakós" }
        ]
      },
      {
        id: "gyerek-ruha",
        name: "Gyerekruházat & Cipők",
        subcategories: [
          { id: "gyerek-ruha-cipo", name: "Gyerekcipők" },
          { id: "gyerek-ruha-fiu", name: "Fiú ruhák" },
          { id: "gyerek-ruha-lany", name: "Lány ruhák" }
        ]
      }
    ]
  },
  {
    id: "hobbi",
    name: "HOBBI & SZABADIDŐ",
    subcategories: [
      {
        id: "hobbi-alkotas",
        name: "Kézművesség & Kreatív",
        subcategories: [
          { id: "hobbi-fonal", name: "Fonalak & Kötés" },
          { id: "hobbi-festes", name: "Festékek & Rajzeszközök" },
          { id: "hobbi-varras", name: "Varrás & Kellékek" }
        ]
      },
      {
        id: "hobbi-zene",
        name: "Hangszerek & Zene",
        subcategories: [
          { id: "hobbi-zene-gitár", name: "Gitárok & Kiegészítők" },
          { id: "hobbi-zene-kottat", name: "Kották & Könyvek" },
          { id: "hobbi-zene-zongora", name: "Billentyűs hangszerek" }
        ]
      }
    ]
  },
  {
    id: "konyvek",
    name: "KÖNYVEK & MAGAZINOK",
    subcategories: [
      {
        id: "konyv-szepirodalom",
        name: "Szépirodalom",
        subcategories: [
          { id: "konyv-szep-krimi", name: "Krimik & Thrillerek" },
          { id: "konyv-szep-romantikus", name: "Romantikus regények" },
          { id: "konyv-szep-scifi", name: "Sci-Fi & Fantasy" }
        ]
      },
      {
        id: "konyv-ismeretterjeszto",
        name: "Ismeretterjesztő & Szakkönyvek",
        subcategories: [
          { id: "konyv-eletmod", name: "Életmód & Egészség" },
          { id: "konyv-gasztro", name: "Szakácskönyvek & Gasztronómia" },
          { id: "konyv-tudomany", name: "Tudomány & Történelem" }
        ]
      }
    ]
  },
  {
    id: "noi",
    name: "NŐI",
    subcategories: [
      {
        id: "noi-cipo",
        name: "Cipők",
        subcategories: [
          { id: "noi-cipo-balerina", name: "Balerinák & Lapos cipők" },
          { id: "noi-cipo-csizma", name: "Csizmák & Bokacsizmák" },
          { id: "noi-cipo-magassarku", name: "Magassarkúak" },
          { id: "noi-cipo-sneaker", name: "Sneakerek & Sportcipők" }
        ]
      },
      {
        id: "noi-ekszer",
        name: "Ékszerek & Kiegészítők",
        subcategories: [
          { id: "noi-ekszer-fülbevalo", name: "Fülbevalók" },
          { id: "noi-ekszer-nyaklanc", name: "Nyakláncok" },
          { id: "noi-ekszer-orak", name: "Karórák" },
          { id: "noi-ekszer-gyuruk", name: "Gyűrűk & Karkötők" }
        ]
      },
      {
        id: "noi-ruhazat",
        name: "Ruházat",
        subcategories: [
          { id: "noi-ruha-bluz", name: "Blúzok & Ingek" },
          { id: "noi-ruha-farmer", name: "Farmerok & Nadrágok" },
          { id: "noi-ruha-kabat", name: "Kabátok & Dzsekik" },
          { id: "noi-ruha-pulover", name: "Pulóverek & Kardigánok" },
          { id: "noi-ruha-ruhak", name: "Ruhák & Szoknyák" },
          { id: "noi-ruha-polo", name: "Pólók & Tetejék" }
        ]
      },
      {
        id: "noi-taskak",
        name: "Táskák",
        subcategories: [
          { id: "noi-taska-hatizsak", name: "Hátizsákok" },
          { id: "noi-taska-retikul", name: "Kézitáskák & Retikülök" },
          { id: "noi-taska-valltaska", name: "Válltáskák & Shopperek" }
        ]
      }
    ]
  },
  {
    id: "otthon",
    name: "OTTHON & LAKBERENDEZÉS",
    subcategories: [
      {
        id: "otthon-dekor",
        name: "Dekoráció & Gyertyák",
        subcategories: [
          { id: "otthon-dekor-gyertya", name: "Gyertyák & Illatosítók" },
          { id: "otthon-dekor-kep", name: "Képek & Képkeretek" },
          { id: "otthon-dekor-vaza", name: "Vázák & Kaspók" }
        ]
      },
      {
        id: "otthon-textil",
        name: "Lakástextil",
        subcategories: [
          { id: "otthon-textil-agynemu", name: "Ágyneműk & Huzatok" },
          { id: "otthon-textil-fuggony", name: "Függönyök & Sötétítők" },
          { id: "otthon-textil-parna", name: "Díszpárnák & Takarók" }
        ]
      }
    ]
  },
  {
    id: "sport",
    name: "SPORT & FITNESS",
    subcategories: [
      {
        id: "sport-felszereles",
        name: "Sportfelszerelés",
        subcategories: [
          { id: "sport-bringa", name: "Kerékpározás & Kiegészítők" },
          { id: "sport-fitnesz", name: "Fitnesz & Súlyzók" },
          { id: "sport-joga", name: "Jóga & Pilates matracok" }
        ]
      },
      {
        id: "sport-ruhazat",
        name: "Sportruházat",
        subcategories: [
          { id: "sport-ruha-ferfi", name: "Férfi sportruházat" },
          { id: "sport-ruha-noi", name: "Női sportruházat" },
          { id: "sport-ruha-cipo", name: "Futó- & Edzőcipők" }
        ]
      }
    ]
  }
];

/**
 * Sorts category nodes and all their children alphabetically at every level.
 */
export function sortCategoriesAlphabetically(nodes: CategoryNode[]): CategoryNode[] {
  return [...nodes]
    .sort((a, b) => a.name.localeCompare(b.name, "hu"))
    .map((node) => ({
      ...node,
      subcategories: node.subcategories ? sortCategoriesAlphabetically(node.subcategories) : undefined,
    }));
}
