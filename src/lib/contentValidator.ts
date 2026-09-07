/**
 * Content Validator Utility for Marketplace Overhaul
 * Blacklist-based validator for forbidden products and categories.
 */

export interface ValidationResult {
  isValid: boolean;
  forbiddenKeyword?: string;
  errorMessage?: string;
}

export const FORBIDDEN_KEYWORDS: { category: string; keywords: string[] }[] = [
  {
    category: "Dohányáru és e-cigaretta",
    keywords: ["dohány", "cigaretta", "cigaretta", "e-cigaretta", "vape", "nikotin", "snus", "iqos", "heets", "szivar", "pipadohány"],
  },
  {
    category: "Alkohol és szeszesitalok",
    keywords: ["alkohol", "pálinka", "whisky", "vodka", "gin", "rum", "sör", "bor", "szeszesital", "pesgő", "liqueur", "konyak"],
  },
  {
    category: "Kábítószer és kapcsolódó eszközök",
    keywords: ["kábítószer", "drog", "marihuána", "fű", "cbd", "thc", "fűszívó", "bong", "kender", "kristály", "extasy"],
  },
  {
    category: "Pirotechnika és robbanóanyag",
    keywords: ["pirotechnika", "tűzijáték", "petárda", "robbanóanyag", "dinamit", "rakéta", "görögtűz", "füstbomba"],
  },
  {
    category: "Lőfegyver, lőszer és önvédelmi eszközök",
    keywords: ["fegyver", "lőfegyver", "pisztoly", "puska", "lőszer", "töltény", "gázspray", "vipera", "sokkoló", "boxer", "légpuska"],
  },
  {
    category: "Gyógyszer és receptköteles termékek",
    keywords: ["gyógyszer", "vényköteles", "antibiotikum", "szteroid", "anabolika", "altató", "nyugtató", "fájdalomcsillapító", "retinoid"],
  },
  {
    category: "Hamisított márkás áru",
    keywords: ["hamis", "hamisított", "replica", "replika", "másolat", "fake", "1:1 kopia", "1:1 replica", "utánzat"],
  },
  {
    category: "Élő állatok",
    keywords: ["élő állat", "kutya", "kiskutya", "macska", "kismacska", "kölyökkutya", "hüllő", "kígyó", "papagáj", "ló"],
  },
  {
    category: "Emberi szövet, vér és szervek",
    keywords: ["emberi vér", "szerv", "szervátültetés", "emberi szövet", "őssejt", "anyatej"],
  },
  {
    category: "Szerzői jogot sértő tartalom",
    keywords: ["warez", "tört szoftver", "crack", "torrent", "tört játék", "illegális licenc", "tört windows"],
  },
];

/**
 * Validates title, description, and category against forbidden keywords blacklist
 */
export function validateListingContent(
  title: string,
  description: string,
  categoryName?: string
): ValidationResult {
  const combinedText = `${title} ${description} ${categoryName || ""}`.toLowerCase();

  for (const group of FORBIDDEN_KEYWORDS) {
    for (const kw of group.keywords) {
      if (combinedText.includes(kw.toLowerCase())) {
        return {
          isValid: false,
          forbiddenKeyword: kw,
          errorMessage: `A hirdetés tiltott elemet tartalmaz (${group.category}: "${kw}"). A jogszabályok értelmében ilyen termék feladása nem engedélyezett a piactéren.`,
        };
      }
    }
  }

  return { isValid: true };
}
