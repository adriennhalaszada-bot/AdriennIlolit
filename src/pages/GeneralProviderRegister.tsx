import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Building, 
  MapPin, Phone, Mail, CreditCard, Star, Zap, Check, Lock 
} from "lucide-react";
import { ALL_PROVIDER_CATEGORIES } from "@/data/allProvidersData";
import { useToast } from "@/hooks/use-toast";
import { saveMyProviderProfile } from "@/lib/providerApi";

type SubscriptionTier = "FREE" | "BASIC" | "PRO" | "PREMIUM";

export function GeneralProviderRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(ALL_PROVIDER_CATEGORIES[0].name);
  const [profession, setProfession] = useState(ALL_PROVIDER_CATEGORIES[0].subcategories[0]);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  // Subscription state
  const [tier, setTier] = useState<SubscriptionTier>("PRO");

  // Subcategories for active category
  const selectedCategoryObj = ALL_PROVIDER_CATEGORIES.find(c => c.name === category);
  const subcategories = selectedCategoryObj ? selectedCategoryObj.subcategories : [];

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const found = ALL_PROVIDER_CATEGORIES.find(c => c.name === newCat);
    if (found && found.subcategories.length > 0) {
      setProfession(found.subcategories[0]);
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !phone.trim() || !email.trim()) {
      toast({
        title: "Hiányzó adatok!",
        description: "Kérjük töltsd ki a cégnevet, a telefonszámot és az e-mail címet!",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handleFinishRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveMyProviderProfile({
        displayName: businessName.trim(),
        category,
        subCategory: profession,
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        bio: bio.trim(),
        videoUrl: "",
        profileImage: "",
        profileImages: [],
        publishPortfolio: false,
        themeId: "emerald",
        services: [],
        slots: [],
        isPublished: false,
      });
      toast({
        title: "A szolgáltatói profilod elkészült",
        description: "Adataidat elmentettük a Cloudflare tárhelyre. Adj hozzá szolgáltatást és foglalható idősávot a publikáláshoz.",
      });
      setLocation("/providers/dashboard");
    } catch (error) {
      toast({
        title: "A profil létrehozása nem sikerült",
        description: error instanceof Error ? error.message : "Jelentkezz be újra, majd próbáld meg ismét.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="bg-slate-900 text-white py-12 px-4 border-b">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <Badge className="bg-emerald-600 text-white font-extrabold px-3 py-1 text-xs">
            💼 SZOLGÁLTATÓI ELŐFIZETÉS & BEIKTATÁS
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black">
            Regisztráld Saját Bemutatkozó Oldaladat
          </h1>
          <p className="text-slate-300 font-medium text-sm sm:text-base max-w-2xl mx-auto">
            Válassz ágazatot, hozd létre a profilodat, állíts be előleget és fogadj időpontokat azonnal az ILOLIT platformon!
          </p>

          {/* Steps Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-6 pt-6">
            <div className={`flex items-center gap-2 font-extrabold text-xs sm:text-sm ${step >= 1 ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${step >= 1 ? "border-emerald-500 bg-emerald-950 text-emerald-400" : "border-slate-700"}`}>1</span>
              <span>Alapadatok</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-slate-700" />
            <div className={`flex items-center gap-2 font-extrabold text-xs sm:text-sm ${step >= 2 ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${step >= 2 ? "border-emerald-500 bg-emerald-950 text-emerald-400" : "border-slate-700"}`}>2</span>
              <span>Csomag Választás</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-slate-700" />
            <div className={`flex items-center gap-2 font-extrabold text-xs sm:text-sm ${step >= 3 ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${step >= 3 ? "border-emerald-500 bg-emerald-950 text-emerald-400" : "border-slate-700"}`}>3</span>
              <span>Fizetés & Indítás</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-3">
              <Building className="w-5 h-5 text-emerald-600" />
              <span>1. Lépés: Szolgáltatói & Üzleti Adatok</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Business Name */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cég / Vállalkozás Neve *</label>
                <Input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Pl. Kovács & Társa Hegesztő Műhely, ZöldMancs Kutyakozmetika..."
                  className="mt-1 py-5 rounded-xl border-slate-300 dark:border-slate-700 font-bold"
                />
              </div>

              {/* Main Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Főkategória / Ágazat *</label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-background text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {ALL_PROVIDER_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specific Profession */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Szakma / Alszolgáltatás *</label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-background text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {subcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* City & Address */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Város *</label>
                <Input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pl. Budapest, Debrecen, Győr..."
                  className="mt-1 py-5 rounded-xl border-slate-300 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cím / Utca, Házszám</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Pl. Andrássy út 12."
                  className="mt-1 py-5 rounded-xl border-slate-300 dark:border-slate-700 font-bold"
                />
              </div>

              {/* Phone & Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Telefonszám *</label>
                <Input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+36 30 123 4567"
                  className="mt-1 py-5 rounded-xl border-slate-300 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">E-mail cím *</label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="szolgaltato@email.hu"
                  className="mt-1 py-5 rounded-xl border-slate-300 dark:border-slate-700 font-bold"
                />
              </div>

              {/* Bio */}
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bemutatkozó Szöveg</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Mutasd be a vállalkozásodat, tapasztalataidat, vállalt munkáidat..."
                  className="mt-1 rounded-xl border-slate-300 dark:border-slate-700 font-medium text-xs h-24"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-6 rounded-2xl text-sm shadow-md">
              Tovább a Csomag Választáshoz ➔
            </Button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                2. Lépés: Válassz Előfizetési Csomagot
              </h2>
              <p className="text-xs text-slate-500">
                Bármikor váltatsz csomagot a szolgáltatói irányítópulton!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* HAVI CSOMAG */}
              <Card
                onClick={() => setTier("MONTHLY" as any)}
                className={`p-6 rounded-3xl cursor-pointer transition border-2 flex flex-col justify-between ${
                  (tier as string) === "MONTHLY" || tier === "BASIC" || tier === "FREE"
                    ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-600 shadow-xl"
                    : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">HAVI DÍJ</Badge>
                    <span className="text-xs font-bold text-slate-400">Rugalmas Lemondás</span>
                  </div>
                  <h3 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">Havi Előfizetési Csomag</h3>
                  <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                    999 Ft <span className="text-xs text-slate-400 font-normal">/ hó</span>
                  </div>
                  <ul className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300 pt-3 border-t font-medium">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Saját bemutatkozó profil & egyedi arculat</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Korlátlan időpontfoglalások fogadása</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Előleg zárolási & fizetési rendszer</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Naptár, nyitvatartás & üzenetküldés</li>
                  </ul>
                </div>
              </Card>

              {/* ÉVES CSOMAG */}
              <Card
                onClick={() => setTier("YEARLY" as any)}
                className={`p-6 rounded-3xl cursor-pointer transition border-2 relative flex flex-col justify-between ${
                  (tier as string) === "YEARLY" || tier === "PRO" || tier === "PREMIUM"
                    ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500 shadow-xl"
                    : "border-slate-200 hover:border-amber-300"
                }`}
              >
                <Badge className="absolute -top-3 right-4 bg-amber-500 text-white font-extrabold text-[10px] px-3 py-1 rounded-full shadow">
                  ★ LEGJOBB ÉRTÉK (2 HÓNAP INGYEN)
                </Badge>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500 text-white font-extrabold text-[10px]">ÉVES DÍJ</Badge>
                    <span className="text-xs font-bold text-amber-600">~833 Ft / hó</span>
                  </div>
                  <h3 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">Éves Előfizetési Csomag</h3>
                  <div className="text-3xl font-black text-amber-700 dark:text-amber-400">
                    9.999 Ft <span className="text-xs text-slate-400 font-normal">/ év</span>
                  </div>
                  <ul className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300 pt-3 border-t font-medium">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> ⭐ <strong>KIEMELÉS a találati lista élén</strong></li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Saját bemutatkozó profil & egyedi arculat</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Korlátlan időpontfoglalások fogadása</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Előleg zárolási & fizetési rendszer</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> VIP Értesítések & Kiemelt támogatás</li>
                  </ul>
                </div>
              </Card>
            </div>

            <div className="flex gap-3 pt-4 max-w-3xl mx-auto">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-2xl font-extrabold">
                Vissza
              </Button>
              <Button type="button" onClick={() => setStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-6 rounded-2xl text-sm shadow-md">
                Tovább a Fizetéshez ({((tier as string) === "YEARLY" || tier === "PRO" || tier === "PREMIUM") ? "9.999 Ft / év" : "999 Ft / hó"}) ➔
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleFinishRegistration} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 max-w-xl mx-auto">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-3">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>3. Lépés: Profil létrehozása</span>
            </h2>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2 border text-xs font-bold">
              <div className="flex justify-between">
                <span>Vállalkozás:</span>
                <span className="text-emerald-700 dark:text-emerald-400">{businessName}</span>
              </div>
              <div className="flex justify-between">
                <span>Ágazat & Szakma:</span>
                <span>{category} · {profession}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm text-slate-900 dark:text-slate-100">
                <span>Választott Csomag:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {((tier as string) === "YEARLY" || tier === "PRO" || tier === "PREMIUM") ? "Éves Előfizetés (9.999 Ft / év)" : "Havi Előfizetés (999 Ft / hó)"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <strong>Most nem kérünk bankkártyaadatot és nem történik terhelés.</strong>
              <p className="mt-1 text-xs">A profilod piszkozatként jön létre. Előfizetés csak a biztonságos fizetési rendszer élesítése után, külön jóváhagyással indulhat.</p>
            </div>

            <Button type="submit" disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-6 rounded-2xl text-base shadow-lg">
              {isSaving ? "Profil mentése…" : "🚀 Profil létrehozása és beállítása ➔"}
            </Button>
          </form>
        )}
      </div>
    </Layout>
  );
}
