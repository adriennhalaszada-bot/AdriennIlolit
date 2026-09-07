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
    </Layout>
  );
}
