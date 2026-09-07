import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { BeautyHeaderNav } from "@/components/beauty/BeautyHeaderNav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useRegisterBeautyProvider,
  useGetMyBeautyProvider, getGetMyBeautyProviderQueryKey,
  useSyncUser,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { HU_COUNTIES, HU_CITIES_BY_COUNTY } from "@/lib/beautyConstants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowLeft, Check, CreditCard, ShieldCheck, Star, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  displayName: z.string().min(2, "Legalább 2 karakter").max(80, "Max. 80 karakter"),
  bio: z.string().max(2000, "Max. 2000 karakter").optional(),
  profileImageUrl: z.string().optional(),
  region: z.string().min(1, "Kötelező"),
  county: z.string().min(1, "Kötelező"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const SUBSCRIPTION_TIERS = [
  {
    id: "monthly",
    name: "HAVI ELŐFIZETÉS",
    price: "999 Ft",
    period: "/ hó",
    color: "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
    badge: "HAVI DÍJ",
    popular: false,
    features: [
      "Saját profil arculat & Egyedi sablonok",
      "Korlátlan időpontfoglalás fogadás",
      "Előleg zárolás & automatikus elfogadás",
      "Korlátlan szolgáltatások & árak kezelése",
      "Naptár, nyitvatartás & ügyfél üzenetküldés"
    ]
  },
  {
    id: "yearly",
    name: "ÉVES ELŐFIZETÉS",
    price: "9.999 Ft",
    period: "/ év (kb. 833 Ft/hó)",
    color: "border-amber-500 bg-amber-50/60 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
    badge: "2 HÓNAP INGYEN",
    popular: true,
    features: [
      "⭐ KIEMELÉS a találati lista élén",
      "Saját profil arculat & VIP sablonok",
      "Korlátlan időpontfoglalás fogadás",
      "Előleg zárolás & automatikus elfogadás",
      "Korlátlan szolgáltatások & árak kezelése",
      "VIP Értesítések & Kiemelt támogatás"
    ]
  }
];

export function BeautyRegister() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTier, setSelectedTier] = useState<string>("pro");

  const { data: existingProvider, isLoading } = useGetMyBeautyProvider({
    query: { queryKey: getGetMyBeautyProviderQueryKey() },
  });
  const registerProvider = useRegisterBeautyProvider();
  const syncUser = useSyncUser();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      bio: "",
      profileImageUrl: "",
      region: "",
      county: "",
      address: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (existingProvider) {
      setLocation("/beauty/dashboard");
    }
  }, [existingProvider, setLocation]);

  const profileImageUrl = form.watch("profileImageUrl");
  const region = form.watch("region");
  const cityOptions = region ? HU_CITIES_BY_COUNTY[region] ?? [] : [];

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      if (user) {
        await syncUser.mutateAsync({
          data: {
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            username: user.username || undefined,
            fullName: user.fullName || undefined,
            avatarUrl: user.imageUrl || undefined,
          },
        });
      }
      await registerProvider.mutateAsync({
        data: {
          ...data,
          bio: data.bio || undefined,
          profileImageUrl: data.profileImageUrl || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetMyBeautyProviderQueryKey() });
      toast({
        title: "🎉 Profil sikeresen regisztrálva!",
        description: `Kiválasztott csomag: ${selectedTier.toUpperCase()}`,
      });
      setLocation("/beauty/dashboard");
    } catch (err: any) {
      toast({
        title: "Hiba történt",
        description: err?.response?.data?.error || "Nem sikerült létrehozni a profilt. Próbáld újra.",
        variant: "destructive",
      });
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
            <span className={`px-3 py-1 rounded-full ${step === 2 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>2. Előfizetés & Fizetés</span>
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
                        <FormLabel className="font-bold text-slate-700">Telefonszám</FormLabel>
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
                  />
                </div>

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                  Folytatás az Előfizetési Csomagokhoz ➔
                </Button>
              </form>
            </Form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2 border-b pb-6">
              <h2 className="text-2xl font-black text-slate-900">Válassz Előfizetési Csomagot</h2>
              <p className="text-sm text-slate-500">
                A csomagok bármikor módosíthatók vagy lemondhatók a szolgáltatói vezérlőpultról.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUBSCRIPTION_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`border rounded-3xl p-5 cursor-pointer transition-all relative flex flex-col justify-between ${tier.color} ${
                    selectedTier === tier.id ? "ring-2 ring-emerald-600 scale-[1.02] shadow-lg" : "hover:border-emerald-400"
                  }`}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-3 right-4 bg-indigo-600 text-white font-black text-[10px] px-3 py-1 rounded-full shadow">
                      ★ LEGPOPULÁRISABB
                    </Badge>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-extrabold text-lg">{tier.name}</h3>
                      <Badge variant="outline" className="font-bold rounded-lg">{tier.badge}</Badge>
                    </div>
                    <div className="my-3">
                      <span className="text-3xl font-black">{tier.price}</span>
                      <span className="text-xs text-slate-500 font-bold ml-1">{tier.period}</span>
                    </div>
                    <ul className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300 mt-4">
                      {tier.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      {selectedTier === tier.id ? "✓ Kiválasztva" : "Kattints a kiválasztáshoz"}
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTier === tier.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                      {selectedTier === tier.id && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Bankkártyás Fizetés (Stripe Checkout)
                </span>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">Biztonságos SSL</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Input placeholder="Kártyaszám: **** **** **** 4242" className="rounded-xl text-xs" defaultValue="4242 •••• •••• 4242" />
                <Input placeholder="MM/YY" className="rounded-xl text-xs" defaultValue="12/28" />
                <Input placeholder="CVC" className="rounded-xl text-xs" defaultValue="123" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-2xl font-bold py-6 px-6">
                Vissza
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl py-6 text-base shadow-md">
                Fizetés & Szolgáltatói Fiók Létrehozása ➔
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
