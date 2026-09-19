import { useEffect } from "react";
import { useLocation } from "wouter";

const BASE_URL = "https://ilolit.com";

/**
 * Routes that should NEVER be indexed by search engines.
 */
const NOINDEX_ROUTES = [
  "/auth/",
  "/dashboard",
  "/settings",
  "/admin",
  "/checkout",
  "/messages",
  "/notifications",
  "/username-setup",
  "/media-manager",
  "/sell",
  "/hirdetesfigyelo",
  "/kedvenc-eladok",
  "/interactive-calendar",
  "/beauty/register",
  "/beauty/dashboard",
  "/beauty/bookings",
  "/providers/dashboard",
  "/providers/register",
  "/real-estate/dashboard",
  "/vehicles/dashboard",
  "/dashboard/commission",
];

/**
 * SEO metadata per route (longest prefix wins).
 */
const SEO_ROUTES: Record<string, { title: string; description: string }> = {
  "/marketplace": {
    title: "Online Piactér | Új és használt termékek – ILOLIT",
    description: "Adj el és vásárolj új és használt termékeket biztonságosan az ILOLIT Piacterén. Ezrek ajánlatai egy helyen.",
  },
  "/search": {
    title: "Keresés | Termékek az ILOLIT Piacterén",
    description: "Keress az ILOLIT termékei között – új és használt cikkek széles választéka.",
  },
  "/beauty": {
    title: "Szépségipar | Szakemberek, beauty ajánlatok és termékek – ILOLIT",
    description: "Fedezd fel a szépségipar világát! Kozmetikusok, fodrászok, körömstyliszták és beauty szakemberek az ILOLIT-on.",
  },
  "/providers": {
    title: "Szolgáltatások | Szakemberkereső és időpontfoglalás – ILOLIT",
    description: "Keress ellenőrzött szakembert, kérj ajánlatot vagy foglalj időpontot – villanyszerelőtől festőig, minden egy helyen.",
  },
  "/real-estate": {
    title: "Eladó és kiadó ingatlanok – ILOLIT",
    description: "Böngéssz eladó és kiadó lakásokat, házakat, telkeket egyszerű kereséssel az ILOLIT Ingatlanbörséjén.",
  },
  "/vehicles": {
    title: "Eladó autók, motorok és járművek – ILOLIT",
    description: "Keress eladó autókat, motorokat és egyéb járműveket részletes szűrőkkel az ILOLIT Járműbörzéjén.",
  },
  "/education": {
    title: "ILOLIT Oktatás | Kurzusok, kvízek és digitális tanulás",
    description: "Tanulj az ILOLIT Oktatásban – interaktív kurzusok és kvízek digitális biztonságtól a szépségipari ismeretekig.",
  },
  "/gyik": {
    title: "Gyakran Ismételt Kérdések – ILOLIT",
    description: "Válaszok a leggyakoribb kérdésekre az ILOLIT platformról.",
  },
  "/ilolit": {
    title: "Rólunk – ILOLIT",
    description: "Ismerd meg az ILOLIT-ot: hat vertikum, egy platform.",
  },
};

const DEFAULT_META = {
  title: "ILOLIT | Minden, amire szükséged lehet – egy helyen",
  description: "Fedezd fel az ILOLIT világát: piactér, szépségipar, szolgáltatások, ingatlanok, járművek és interaktív oktatás egyetlen platformon.",
};

function isNoIndexRoute(location: string): boolean {
  return NOINDEX_ROUTES.some((prefix) => location.startsWith(prefix));
}

function getRouteMeta(location: string) {
  let matched = DEFAULT_META;
  let matchedLength = 0;
  for (const [prefix, meta] of Object.entries(SEO_ROUTES)) {
    if (location.startsWith(prefix) && prefix.length > matchedLength) {
      matched = meta;
      matchedLength = prefix.length;
    }
  }
  return matched;
}

function setMetaTag(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Dynamically updates <title>, <meta name="description">, <link rel="canonical">,
 * <meta name="robots">, and Open Graph tags on every route change.
 *
 * Automatically adds noindex for private/auth/dashboard routes.
 */
export function useSeoHead() {
  const [location] = useLocation();

  useEffect(() => {
    const noIndex = isNoIndexRoute(location);
    const meta = getRouteMeta(location);

    // Title
    document.title = meta.title;

    // Robots
    setMetaTag("robots", noIndex ? "noindex, follow" : "index, follow");

    // Meta description
    setMetaTag("description", noIndex ? "" : meta.description);

    // Canonical — don't set canonical on noindex pages
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (noIndex) {
      canonical?.remove();
    } else {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = `${BASE_URL}${location === "/" ? "/" : location.split("?")[0]}`;
    }

    // Open Graph
    if (!noIndex) {
      setMetaProperty("og:title", meta.title);
      setMetaProperty("og:description", meta.description);
      setMetaProperty("og:url", `${BASE_URL}${location === "/" ? "/" : location.split("?")[0]}`);
    }
  }, [location]);
}
