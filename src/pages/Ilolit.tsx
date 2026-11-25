import { Layout } from "@/components/layout/Layout";
import { ShieldCheck, Truck, CreditCard, RotateCcw } from "lucide-react";

export function Ilolit() {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-ilolit text-ilolit-foreground py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <ShieldCheck className="w-20 h-20 mx-auto" />
          <h1 className="text-4xl md:text-5xl font-bold">Ilolit Vásárlóvédelem</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Vásárolj magabiztosan. Ha a termék nem érkezik meg, sérült, vagy jelentősen eltér a leírtaktól, az Ilolit garantálja a pénzvisszafizetést.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 container mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-center mb-16">Mit takar az Ilolit díja?</h2>
        
        <div className="grid md:grid-cols-3 gap-12">
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-ilolit/10 text-ilolit rounded-2xl flex items-center justify-center mx-auto">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold">Pénzvisszafizetési garancia</h3>
            <p className="text-muted-foreground">
              Visszakapod a pénzed, ha a termék nem érkezik meg, sérült, vagy jelentősen eltér a hirdetésben leírtaktól.
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-ilolit/10 text-ilolit rounded-2xl flex items-center justify-center mx-auto">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold">Biztonságos fizetés</h3>
            <p className="text-muted-foreground">
              A fizetésed biztonságban van. Az eladó csak azután kapja meg a pénzt, hogy megerősítetted: minden rendben a termékkel.
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-ilolit/10 text-ilolit rounded-2xl flex items-center justify-center mx-auto">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold">Nyomon követett szállítás</h3>
            <p className="text-muted-foreground">
              Integrált szállítási megoldások nyomon követéssel, így mindig tudod, merre jár a csomagod.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center space-y-8">
          <h2 className="text-3xl font-bold">Mennyibe kerül?</h2>
          <div className="bg-background rounded-3xl p-8 shadow-sm border">
            <p className="text-lg text-muted-foreground mb-4">Az Ilolit díja automatikusan hozzáadódik a kosárhoz fizetéskor.</p>
            <div className="text-4xl font-bold text-foreground mb-2">A vételár 5%-a</div>
            <p className="text-sm text-muted-foreground">Minimum 200 Ft, maximum 5 000 Ft</p>
          </div>
        </div>
      </section>

      {/* Claim Process */}
      <section className="py-20 px-4 container mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-12">Hogyan működik a visszatérítés?</h2>
        
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {[
            { step: 1, title: "Jelentsd a problémát", desc: "A kézbesítéstől számított 2 napon belül jelezd, ha gond van a termékkel." },
            { step: 2, title: "Vizsgálat", desc: "Csapatunk megvizsgálja az esetet a beküldött bizonyítékok alapján." },
            { step: 3, title: "Visszatérítés", desc: "Jogos panasz esetén visszatérítjük a teljes összeget, beleértve a szállítási és Ilolit díjat is." }
          ].map((item) => (
            <div key={item.step} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-ilolit text-ilolit-foreground font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                {item.step}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-muted/50 border group-hover:bg-muted transition-colors">
                <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ILOLIT Ingatlan – ÁSZF & Közösségi szabályzat (#12, #11, #17, #24, #25) */}
      <section id="ingatlan-szabalyzat" className="border-t border-slate-200 bg-slate-50 py-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              ILOLIT Ingatlan · ÁSZF és Közösségi Szabályzat
            </span>
            <h2 className="text-2xl font-black text-slate-950">Te döntöd el, kit fogadsz.</h2>
            <p className="text-sm text-slate-600">
              A magánhirdető szabályozhatja, fogad-e ingatlanközvetítői megkeresést. A személyes megtekintés
              ellenőrzött telefonszámhoz és hirdetői jóváhagyáshoz kötött. Ellenőrzött elérhetőség, hirdetői
              jóváhagyás és visszaélés elleni védelem.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 text-sm text-slate-700">
            <h3 className="text-base font-bold text-slate-950">
              Kéretlen üzletszerzés és közvetítői megkeresések tilalma
            </h3>
            <p className="font-semibold text-slate-900 leading-relaxed">
              Az ingatlanmegtekintési rendszer nem használható kéretlen ingatlanközvetítői megbízásszerzésre,
              szolgáltatásértékesítésre, tömeges üzletszerzésre vagy más, a hirdető által nem kért kereskedelmi
              megkeresésre.
            </p>
            <p className="text-xs leading-relaxed text-slate-600">
              A szabály megsértése a foglalási jogosultság korlátozását vagy a fiók felfüggesztését eredményezheti.
              Minden bejelentést moderálunk; egyetlen tulajdonosi bejelentés önmagában nem vezet automatikus végleges
              tiltáshoz. Ismétlődő vagy igazolt visszaélés esetén fokozatos szankciórendszert alkalmazunk:
              (1) Figyelmeztetés, (2) Ideiglenes foglalási korlátozás, (3) Hosszabb idejű korlátozás,
              (4) Fiók felfüggesztése / tiltása.
            </p>
            <p className="text-xs leading-relaxed text-slate-600 border-t border-slate-100 pt-3">
              <strong>Ingatlanközvetítői üzleti fiók:</strong> Az ingatlanközvetítők számára a platform szabályos
              üzleti fiókos útvonalat biztosít, amelyen keresztül saját hirdetéseket kezelhetnek, ügyfeleiket
              képviselhetik, és kizárólag olyan hirdetőket kereshetnek meg, akik engedélyezték a közvetítői
              kapcsolatfelvételt.
            </p>
          </div>

          {/* ILOLIT SafeVisit – Adatvédelmi tájékoztató (GDPR Art. 5, 6, 13, 25, 32) */}
          <div id="safevisit-adatvedelem" className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 text-sm text-slate-700">
            <h3 className="text-base font-bold text-slate-950">
              ILOLIT SafeVisit – Adatvédelmi tájékoztató (GDPR 5., 6., 13., 25. és 32. cikk)
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">
              Az <strong>ILOLIT SafeVisit – Biztonságosabb ingatlanmegtekintés</strong> funkció az ingatlanhirdetés
              alapdíjának része, külön díjfizetés nélkül. A rendszer a beépített és alapértelmezett adatvédelem
              (GDPR 25. cikk) és az adatminimalizálás (GDPR 5. cikk) elveit követi.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs leading-relaxed text-slate-600">
              <li>
                <strong>Kezelt adatok köre és jogalap (GDPR 6. és 13. cikk):</strong> az érdeklődő neve, SMS-ben
                ellenőrzött telefonszámának ténye, a kötelező nyilatkozatok elfogadásának időbélyege, a jóváhagyott
                időpont, valamint az egyszer használatos megtekintési kód státusza és ellenőrzési időbélyege. A
                kezelés jogalapja a megtekintési szolgáltatás teljesítése (szerződés teljesítése) és a felek személy-
                és vagyonbiztonságához, valamint a visszaélések megelőzéséhez fűződő jogos érdek.
              </li>
              <li>
                <strong>Adatbiztonság (GDPR 32. cikk):</strong> az egyedi 6 jegyű megtekintési kódok és QR-tokenek
                AES-256-GCM titkosítással és SHA-256 hash-sel tárolódnak, időablakhoz kötöttek, egyszer használatosak,
                és lemondás vagy visszavonás esetén automatikusan érvénytelenné válnak. A QR-kód kizárólag véletlenszerű
                azonosító tokent tartalmaz, személyes adatot nem.
              </li>
              <li>
                <strong>Tiltott okmányadatok:</strong> az ILOLIT soha nem kér és nem tárol fényképes igazolványról
                készült fotót, másolatot, okmányszámot, születési adatot, anyja nevét, lakcímkártyát vagy biometrikus
                adatot. A hirdető számára is tilos az igazolvány lefényképezése vagy lemásolása.
              </li>
              <li>
                <strong>Adatkezelői szerepek elhatárolása:</strong> az ILOLIT a foglalási folyamatot, a visszaigazolást,
                a megtekintési kód kiállítását és a visszaélés-bejelentések kezelését biztosítja. A személyes
                megtekintés feltételeinek meghatározásáért, a helyszíni szemrevételezéses igazolvány-ellenőrzésért és a
                belépés engedélyezéséért minden esetben önállóan a magánhirdető (tulajdonos / jogosult) felel.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}
