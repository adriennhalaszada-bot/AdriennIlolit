import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { BeautyHeaderNav } from "@/components/beauty/BeautyHeaderNav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { HU_COUNTIES, HU_CITIES_BY_COUNTY } from "@/lib/beautyConstants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { getMyProviderProfile, saveMyProviderProfile } from "@/lib/providerApi";
import { confirmProviderSubscription, type SubscriptionPlan } from "@/lib/billingApi";
import { Badge } from "@/components/ui/badge";
import { ALL_PROVIDER_CATEGORIES } from "@/data/allProvidersData";

const BEAUTY_SPECIALTIES = ALL_PROVIDER_CATEGORIES.find((category) => category.id === "beauty_health")?.subcategories ?? [];

const schema = z.object({
  displayName: z.string().min(2, "Legalább 2 karakter").max(80, "Max. 80 karakter"),
  specialty: z.string().min(1, "Válassz szakterületet"),
  bio: z.string().max(2000, "Max. 2000 karakter").optional(),
  profileImageUrl: z.string().optional(),
  region: z.string().min(1, "Kötelező"),
  county: z.string().min(1, "Kötelező"),
  address: z.string().optional(),
  phone: z.string().min(6, "Adj meg egy elérhető telefonszámot"),
});

const SUBSCRIPTION_TIERS: Array<{
  id: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  badge: string;
}> = [
  { id: "monthly", name: "Havi előfizetés", price: "999 Ft", period: "/ hó", badge: "Rugalmas" },
  { id: "yearly", name: "Éves előfizetés", price: "9 999 Ft", period: "/ év", badge: "2 hónap kedvezmény" },
];

export function BeautyRegister() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTier, setSelectedTier] = useState<SubscriptionPlan>("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      specialty: "",
      bio: "",
      profileImageUrl: "",
      region: "",
      county: "",
      address: "",
      phone: "",
    },
  });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const payment = params.get("payment");
    const load = payment === "success" && sessionId
      ? confirmProviderSubscription(sessionId).then((result) => {
          if (!result.active) throw new Error("A Stripe még nem igazolta vissza a fizetést.");
          toast({ title: "Sikeres előfizetés", description: "A szolgáltatói fiókod aktív." });
          if (active) setLocation("/providers/dashboard");
          return null;
        })
      : payment === "cancelled"
      ? Promise.resolve(null)
      : getMyProviderProfile()
      .then((profile) => {
        if (!active || !profile?.exists) return profile;
        if (profile.subscription?.status === "active" || profile.subscription?.status === "trialing") {
          setLocation("/providers/dashboard");
          return profile;
        }
        const savedSpecialty = BEAUTY_SPECIALTIES.includes(profile.subCategory) ? profile.subCategory : "";
        form.reset({
          displayName: profile.displayName || "",
          specialty: savedSpecialty,
          bio: profile.bio || "",
          profileImageUrl: profile.profileImage || "",
          region: profile.region || "",
          county: profile.city || "",
          address: profile.address || "",
          phone: profile.phone || "",
        });
        setStep(savedSpecialty && profile.region ? 2 : 1);
        return profile;
      });
    if (payment === "cancelled") {
      toast({ title: "A fizetés megszakadt", description: "Nem történt terhelés; az adataidat újra ellenőrizheted." });
      setStep(2);
    }
    load
      .catch((error: any) => {
        if (payment === "success") toast({ title: "A fizetés ellenőrzése sikertelen", description: error?.message, variant: "destructive" });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setLocation, toast]);

  const profileImageUrl = form.watch("profileImageUrl");
  const region = form.watch("region");
  const cityOptions = region ? HU_CITIES_BY_COUNTY[region] ?? [] : [];

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "A profil mentéséhez jelentkezz be ellenőrzött e-mail-címmel.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveMyProviderProfile({
        displayName: data.displayName,
        category: "Szépség- és egészségipar",
        subCategory: data.specialty,
        city: data.county,
        region: data.region,
        address: data.address || "",
        phone: data.phone,
        email,
        bio: data.bio || "",
        videoUrl: "",
        profileImage: data.profileImageUrl || "",
        profileImages: data.profileImageUrl ? [data.profileImageUrl] : [],
        publishPortfolio: false,
        themeId: "emerald",
        services: [],
        slots: [],
        isPublished: false,
      });
      toast({
        title: "A szépségipari szolgáltatói fiókod elkészült",
        description: "Most add hozzá a szolgáltatásaidat, képeidet, videódat és foglalható időpontjaidat.",
      });
      setLocation("/providers/dashboard");
    } catch (err: any) {
      toast({
        title: "Hiba történt",
        description: err?.message || "Nem sikerült létrehozni a profilt. Próbáld újra.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-xl">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <BeautyHeaderNav activeTab="register" />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => (step === 2 ? setStep(1) : setLocation("/beauty"))} className="gap-2 font-bold text-slate-600">
            <ArrowLeft className="w-4 h-4" /> {step === 2 ? "Vissza az adatokhoz" : "Vissza a kezdőlapra"}
          </Button>
          <div className="flex items-center gap-2 font-extrabold text-xs">
            <span className={`px-3 py-1 rounded-full ${step === 1 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>1. Profil Adatok</span>
            <span className={`px-3 py-1 rounded-full ${step === 2 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>2. Ellenőrzés</span>
          </div>
        </div>

        {step === 1 ? (
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2 border-b pb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                <Sparkles className="w-4 h-4" /> Szolgáltatói Fiók Regisztráció
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Hozd létre saját szépségipari profilodat!</h1>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                Csatlakozz az ILOLIT platformhoz, állítsd be szolgáltatásaidat, és fogadj időpontokat fizetős előleggel.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(() => setStep(2))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Szalon / Szolgáltató Neve *</FormLabel>
                      <FormControl>
                        <Input placeholder="Pl. Kata Hajstúdió & Balayage Bar" className="rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Szakterület *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Válaszd ki a fő szakterületedet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BEAUTY_SPECIALTIES.map((specialty) => (
                            <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Megye *</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(val); form.setValue("county", ""); }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Válassz megyét" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HU_COUNTIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="county"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Város *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!region}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder={region ? "Válassz várost" : "Válassz előbb megyét"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cityOptions.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Pontos Cím (Utca, házszám)</FormLabel>
                        <FormControl>
                          <Input placeholder="Pl. Váci utca 18." className="rounded-xl" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-slate-700">Telefonszám *</FormLabel>
                        <FormControl>
                          <Input placeholder="Pl. +36 20 123 4567" className="rounded-xl" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Bemutatkozás (Bio)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Írj pár mondatot a szalonról, tapasztalatodról és a szolgáltatásaidról..." className="rounded-xl min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel className="font-bold text-slate-700">Profil / Szalon Kép</FormLabel>
                  <ImageUploader
                    value={profileImageUrl ? [profileImageUrl] : []}
                    onChange={(urls) => form.setValue("profileImageUrl", urls[0] || "")}
                    maxImages={1}
                    folder="beauty"
                  />
                </div>

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                  Adatok ellenőrzése ➔
                </Button>
              </form>
            </Form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2 border-b pb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Profil létrehozása</h2>
              <p className="text-sm text-slate-500">
                Először ingyenesen létrehozzuk a szerkeszthető vállalkozói profilodat. Fizetés csak a nyilvános közzététel aktiválásakor szükséges.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {SUBSCRIPTION_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`rounded-2xl border p-5 text-left transition ${selectedTier === tier.id ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20 dark:bg-emerald-950/30" : "border-slate-200 hover:border-emerald-300 dark:border-slate-700"}`}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{tier.name}</span>
                    <Badge variant="outline">{tier.badge}</Badge>
                  </div>
                  <div><span className="text-3xl font-black">{tier.price}</span><span className="ml-1 text-sm text-slate-500">{tier.period}</span></div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selectedTier === tier.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                      {selectedTier === tier.id && <Check className="h-3 w-3" />}
                    </span>
                    {selectedTier === tier.id ? "Kiválasztva" : "Kiválasztás"}
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100">Szerkeszthető szolgáltatói admin</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {form.getValues("specialty")} · {form.getValues("county")}, {form.getValues("region")}. A következő oldalon szolgáltatásokat, árakat, idősávokat, képeket, videót, betűtípust és megjelenést állíthatsz be.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-2xl font-bold py-6 px-6">
                Vissza
              </Button>
              <Button disabled={isSaving} onClick={form.handleSubmit(onSubmit)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Profil létrehozása...</> : "Szolgáltatói profil létrehozása"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
