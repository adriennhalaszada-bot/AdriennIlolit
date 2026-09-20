import { useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { BeautyHeaderNav } from "@/components/beauty/BeautyHeaderNav";
import {
  useGetBeautyProvider,
  useGetBeautyProviderReviews,
  useGetMyBeautyFavorites, getGetMyBeautyFavoritesQueryKey,
  useAddBeautyFavorite,
  useRemoveBeautyFavorite,
  useGetBeautyAvailability, getGetBeautyAvailabilityQueryKey,
  useCreateBeautyBooking,
} from "@workspace/api-client-react";
import type { BeautyProvider, BeautyReview, BeautyServiceOffering } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useUserAccountStore } from "@/lib/userAccountStore";
import { formatPrice } from "@/lib/constants";
import { BEAUTY_SERVICE_TYPE_LABELS } from "@/lib/beautyConstants";
import { Star, MapPin, Phone, Instagram, Globe, Heart, Clock, CheckCircle2, ChevronDown, Sparkles, CalendarDays, Video, Bell, Play } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getProfileTemplate, type ProfileTemplate } from "./templates/templateConfig";
import { TemplateBackdrop } from "./templates/TemplateBackdrop";
import { gradientText, gradientButton, glassCard, accentBadge, selectedPill, hexToRgba } from "./templates/glassStyles";
import { ServiceWatchdogModal } from "@/components/providers/ServiceWatchdogModal";
import { cn } from "@/lib/utils";
import { BeautyBookingWizard } from "@/components/beauty/BeautyBookingWizard";
import { DEMO_GENERAL_PROVIDERS } from "@/data/allProvidersData";

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BeautyProviderProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  let isSignedIn = false;
  try {
    const userRes = useUser();
    isSignedIn = !!userRes?.isSignedIn;
  } catch (e) {
    isSignedIn = false;
  }
  const { toast } = useToast();
  const [reviewPage] = useState(1);

  const { data: provider, isLoading } = useGetBeautyProvider(id);
  const { data: reviewsData } = useGetBeautyProviderReviews(id, { page: reviewPage, limit: 10 });
  const { data: favorites } = useGetMyBeautyFavorites({
    query: { enabled: !!isSignedIn, queryKey: getGetMyBeautyFavoritesQueryKey() },
  });

  const addFavorite = useAddBeautyFavorite();
  const removeFavorite = useRemoveBeautyFavorite();

  const isFavorited = favorites?.some((f) => f.id === id);

  const toggleFavorite = () => {
    if (!isSignedIn) {
      setLocation("/auth/login");
      return;
    }
    if (isFavorited) {
      removeFavorite.mutate({ providerId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBeautyFavoritesQueryKey() });
          toast({ title: "Eltávolítva a kedvencekből" });
        }
      });
    } else {
      addFavorite.mutate({ providerId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBeautyFavoritesQueryKey() });
          toast({ title: "Hozzáadva a kedvencekhez ❤️" });
        }
      });
    }
  };

  // Fallback to mock provider instantly if API query is loading or ID is mock
  const isMockId = !id || id.startsWith("prov");
  const foundGeneralProvider = DEMO_GENERAL_PROVIDERS.find((p) => p.id === id);

  const MOCK_PROVIDER: BeautyProvider = foundGeneralProvider ? {
    id: foundGeneralProvider.id,
    displayName: foundGeneralProvider.name,
    bio: foundGeneralProvider.bio,
    region: foundGeneralProvider.address,
    address: foundGeneralProvider.address,
    county: foundGeneralProvider.city,
    rating: foundGeneralProvider.rating,
    totalReviews: foundGeneralProvider.reviewCount,
    isVerified: true,
    profileImageUrl: foundGeneralProvider.avatar,
    coverImageUrl: foundGeneralProvider.coverImage,
    phone: foundGeneralProvider.phone,
    templateId: foundGeneralProvider.templateId,
    videoUrl: (foundGeneralProvider as any).videoUrl,
    profession: foundGeneralProvider.profession,
    nextAvailable: foundGeneralProvider.nextSlot,
    workingHours: [
      { day: "Hétfő", hours: "08:00–17:00" },
      { day: "Kedd", hours: "08:00–17:00" },
      { day: "Szerda", hours: "08:00–17:00" },
      { day: "Csütörtök", hours: "08:00–17:00" },
      { day: "Péntek", hours: "08:00–16:00" },
      { day: "Szombat", hours: "Előzetes egyeztetéssel" },
      { day: "Vasárnap", hours: "Zárva" },
    ],
    services: foundGeneralProvider.services.map(s => ({
      id: s.id,
      serviceType: "general",
      name: s.name,
      price: s.price,
      durationMinutes: s.durationMinutes,
      description: s.description,
      category: foundGeneralProvider.profession,
      isAvailable: true,
      requiresDeposit: s.requiresDeposit,
      depositPercentage: s.depositPercentage,
    }))
  } as any : {
    id: id || "prov_1",
    displayName: "Glamour Nail & Lash Stúdió - Kovács Vanda",
    bio: "Prémium műköröm, gél lakk és szempilla építés 8 év tapasztalattal. Kizárólag magas minőségű, hipoallergén alapanyagokkal dolgozunk.",
    region: "Budapest V. kerület",
    county: "Budapest",
    rating: 4.9,
    totalReviews: 87,
    isVerified: true,
    profileImageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600",
    coverImageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200",
    instagramUrl: "https://instagram.com/glamour_nails_budapest",
    websiteUrl: "https://glamournails.hu",
    phone: "+36 30 123 4567",
    templateId: "glam_neon",
    services: [
      { id: "srv_1", serviceType: "nails", name: "Gél Lakk & Műkörmös (Kéz)", price: 8500, durationMinutes: 60, description: "Kombinált manikűr, gél lakk díszítéssel." },
      { id: "srv_2", serviceType: "nails", name: "Műköröm Építés S/M méret", price: 13500, durationMinutes: 90, description: "Zselés vagy akrilzselés műköröm építés." },
      { id: "srv_3", serviceType: "brows_lashes", name: "3D Dúsító Szempilla Építés", price: 16000, durationMinutes: 105, description: "Selyem szempillák 3D volume technikával." }
    ]
  } as unknown as BeautyProvider;

  // A demo/general service-provider ID must never be replaced by an empty or
  // partial beauty API response. These profiles are sourced from the unified
  // provider catalogue and have their own complete local representation.
  const effectiveProvider = isMockId ? MOCK_PROVIDER : (provider ?? MOCK_PROVIDER);
  const reviews = reviewsData?.items ?? [];
  const theme = getProfileTemplate(effectiveProvider.templateId);

  const [wizardService, setWizardService] = useState<any>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleOpenWizard = (service: any) => {
    setWizardService(service);
    setIsWizardOpen(true);
  };

  const isGeneralProvider = !!foundGeneralProvider || (id && (id.startsWith("prov-gen-") || id.startsWith("prov_")));

  return (
    <Layout>
      {isGeneralProvider ? (
        <div className="bg-slate-900 text-white border-b border-slate-800 shadow-md py-2.5 px-4">
          <div className="container mx-auto max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-600 text-white font-black text-xs px-3 py-1">
                💼 ILOLIT SZOLGÁLTATÓI BEMUTATKOZÓ OLDAL
              </Badge>
              <span className="text-xs text-slate-300 font-bold hidden sm:inline">
                {effectiveProvider.displayName} • {effectiveProvider.county || effectiveProvider.region}
              </span>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800">
              <Link href="/providers">
                <span>➔ Vissza az Összes Szolgáltatóhoz</span>
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <BeautyHeaderNav activeTab="home" />
      )}
      <TemplateBackdrop theme={theme}>
        <GlassProfile
          provider={effectiveProvider}
          theme={theme}
          isFavorited={!!isFavorited}
          onToggleFavorite={toggleFavorite}
          reviews={reviews}
          isSignedIn={!!isSignedIn}
          onOpenWizard={handleOpenWizard}
        />
      </TemplateBackdrop>

      {wizardService && (
        <BeautyBookingWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          provider={{
            id: effectiveProvider.id,
            displayName: effectiveProvider.displayName,
            address: effectiveProvider.address || effectiveProvider.region,
            phone: effectiveProvider.phone || undefined,
          }}
          service={{
            id: wizardService.id,
            name: wizardService.name,
            description: wizardService.description,
            price: wizardService.price,
            durationMinutes: wizardService.durationMinutes,
            requiresDeposit: wizardService.requiresDeposit === true,
            depositPercentage: wizardService.depositPercentage || 0,
          }}
        />
      )}
    </Layout>
  );
}

interface LayoutProps {
  provider: BeautyProvider;
  theme: ProfileTemplate;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  reviews: BeautyReview[];
  isSignedIn: boolean;
  onOpenWizard: (service: any) => void;
}

function GlassProfile({ provider, theme, isFavorited, onToggleFavorite, reviews, isSignedIn, onOpenWizard }: LayoutProps) {
  const services: BeautyServiceOffering[] = provider.services ?? [];
  const availableServices = services.filter((s) => s.isAvailable !== false);
  const portfolio = provider.portfolio ?? [];
  const workingHours = ((provider as any).workingHours ?? []) as Array<{ day: string; hours: string }>;
  const profession = (provider as any).profession as string | undefined;
  const nextAvailable = (provider as any).nextAvailable as string | undefined;
  const mainPhoto = provider.profileImageUrl ?? portfolio[0]?.imageUrl;
  const subPhotos = [portfolio[0]?.imageUrl, portfolio[1]?.imageUrl].filter(
    (p, i) => p && p !== mainPhoto,
  ).slice(0, 2) as string[];

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    availableServices.length === 1 ? availableServices[0].id : null,
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl" style={{ fontFamily: provider.fontFamily ? `"${provider.fontFamily}", sans-serif` : undefined }}>
      <div className="rounded-[32px] p-6 sm:p-10" style={glassCard(theme)}>
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-2" style={gradientText(theme)}>
            {provider.displayName}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {provider.county ? `${provider.county}, ${provider.region}` : provider.region}
          </p>
        </div>

        {/* Main: photos + info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-10">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 h-56 rounded-2xl overflow-hidden bg-muted shadow-sm" style={{ border: `1px solid ${hexToRgba(theme.primaryColor, 0.12)}` }}>
              {mainPhoto ? (
                <img src={mainPhoto} alt={provider.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">💄</div>
              )}
            </div>
            {(subPhotos.length > 0 ? subPhotos : [null, null]).map((src, i) => (
              <div key={i} className="h-28 rounded-2xl overflow-hidden bg-muted" style={{ border: `1px solid ${hexToRgba(theme.primaryColor, 0.12)}` }}>
                {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-2xl opacity-50">✨</div>
                )}
              </div>
            ))}
          </div>

          <div>
            {provider.isVerified && (
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3" style={accentBadge(theme)}>
                Ellenőrzött szolgáltató
              </span>
            )}
            <div className="flex items-center gap-2 mb-3 text-sm">
              <div className="flex items-center gap-0.5" style={{ color: theme.accentColor }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4" fill={i < Math.round(provider.rating) ? theme.accentColor : "none"} />
                ))}
              </div>
              <span className="font-semibold">{provider.rating > 0 ? provider.rating.toFixed(1) : "Új szolgáltató"}</span>
              {provider.totalReviews > 0 && <span className="text-muted-foreground">({provider.totalReviews} értékelés)</span>}
            </div>
            {provider.bio && <p className="text-sm leading-relaxed text-muted-foreground mb-4">{provider.bio}</p>}
            {profession && (
              <p className="text-sm font-bold text-emerald-700 mb-3">{profession}</p>
            )}
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className="flex items-center gap-2 hover:opacity-80">
                  <Phone className="w-3.5 h-3.5" /> {provider.phone}
                </a>
              )}
              {provider.instagramHandle && (
                <a href={`https://instagram.com/${provider.instagramHandle.replace("@", "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80">
                  <Instagram className="w-3.5 h-3.5" /> {provider.instagramHandle}
                </a>
              )}
              {provider.websiteUrl && (
                <a href={provider.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80">
                  <Globe className="w-3.5 h-3.5" /> Weboldal
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFavorite}
                style={isFavorited ? gradientButton(theme) : undefined}
              >
                <Heart className={`w-4 h-4 mr-2 ${isFavorited ? "fill-current" : ""}`} /> {isFavorited ? "Kedvenc" : "Kedvencekhez adás"}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl"
                onClick={() => onOpenWizard(availableServices[0] || { id: "s1", name: "Teljes kezelés", price: 8500, durationMinutes: 60, depositPercentage: 50 })}
              >
                Időpont foglalása
              </Button>
            </div>
          </div>
        </div>

        {workingHours.length > 0 && (
          <section className="mb-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 rounded-3xl border border-slate-200 bg-white/80 p-5 sm:p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-600" /> Nyitvatartás és elérhetőség
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {workingHours.map((entry) => (
                  <div key={entry.day} className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 text-sm">
                    <span className="font-semibold text-slate-600">{entry.day}</span>
                    <span className="font-bold text-slate-900">{entry.hours}</span>
                  </div>
                ))}
              </div>
            </div>
            {nextAvailable && (
              <div className="self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center min-w-44">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Következő szabad időpont</p>
                <p className="text-lg font-black text-emerald-900 mt-1">{nextAvailable}</p>
              </div>
            )}
          </section>
        )}

        {/* Multi-Service Selection & Intelligent Booking Engine */}
        <div className="mb-10">
          <MultiServiceBookingEngine
            services={availableServices}
            provider={provider}
            theme={theme}
            isSignedIn={isSignedIn}
            onOpenWizard={onOpenWizard}
          />
        </div>

        {/* Cloudflare Showcase Video Intro */}
        {(provider as any).videoUrl && (
          <div className="mb-10 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-500" />
              <span>Bemutatkozó Videó & Munkák (Cloudflare Stream)</span>
            </h2>
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
              {(provider as any).videoUrl.includes("youtube.com") || (provider as any).videoUrl.includes("youtu.be") ? (
                <iframe
                  src={(provider as any).videoUrl.replace("watch?v=", "embed/")}
                  title="Szolgáltatói Bemutatkozó Videó"
                  className="w-full h-full rounded-3xl border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-600/90 text-white flex items-center justify-center mx-auto shadow-lg">
                    <Play className="w-8 h-8 fill-white ml-1" />
                  </div>
                  <div className="text-sm font-extrabold text-white">Cloudflare Stream Bemutató Lejátszása</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    A videó a Cloudflare hálózatáról töltődik be nagy felbontásban.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-4">Portfólió</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {portfolio.map((item) => (
                <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-muted">
                  <img src={item.imageUrl} alt={item.title || "Portfólió kép"} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="text-lg font-bold mb-4">Értékelések {provider.totalReviews > 0 && `(${provider.totalReviews})`}</h2>
          {reviews.length === 0 && <p className="text-sm text-muted-foreground">Még nincs értékelés.</p>}
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl p-4" style={glassCard(theme)}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.customer?.fullName || r.customer?.username || "Vásárló"}</span>
                  <div className="flex items-center gap-0.5" style={{ color: theme.accentColor }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5" fill={i < r.rating ? theme.accentColor : "none"} />
                    ))}
                  </div>
                </div>
                {r.reviewText && <p className="text-sm text-muted-foreground mt-1.5">{r.reviewText}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MultiServiceBookingEngine({
  services,
  provider,
  theme,
  isSignedIn,
  onOpenWizard,
}: {
  services: BeautyServiceOffering[];
  provider: BeautyProvider;
  theme: ProfileTemplate;
  isSignedIn: boolean;
  onOpenWizard?: (service: any) => void;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useUserAccountStore();

  const [selectedIds, setSelectedIds] = useState<string[]>(
    services.length > 0 ? [services[0].id] : []
  );
  const [date, setDate] = useState<Date | undefined>(new Date(Date.now() + 86400000));
  const [selectedSlot, setSelectedSlot] = useState<{ id: string; startTime: string; endTime: string; duration: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [isWatchdogOpen, setIsWatchdogOpen] = useState(false);

  const dateKey = date ? toDateKey(date) : "";

  // Selected services calculation
  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDurationMinutes = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const requiredDepositAmount = selectedServices.reduce((sum, service) => {
    const requiresDeposit = (service as any).requiresDeposit === true;
    const percentage = Number((service as any).depositPercentage || 0);
    return requiresDeposit ? sum + Math.round((service.price * percentage) / 100) : sum;
  }, 0);

  // Group services by category
  const categories = Array.from(new Set(services.map((s) => (s as any).category || "Egyéb")));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setSelectedSlot(null);
  };

  // Mock slot data with start and end times to calculate exact duration
  const mockSlots = [
    { id: "slot-1", startTime: "09:00", endTime: "10:00", duration: 60 },
    { id: "slot-2", startTime: "10:00", endTime: "11:30", duration: 90 },
    { id: "slot-3", startTime: "11:30", endTime: "13:00", duration: 90 },
    { id: "slot-4", startTime: "14:00", endTime: "15:00", duration: 60 },
    { id: "slot-5", startTime: "15:00", endTime: "17:00", duration: 120 },
  ];

  const disablePastDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { before: today };
  }, []);

  const handleSubmit = () => {
    if (!isSignedIn) {
      setLocation("/auth/login");
      return;
    }
    if (!selectedSlot || selectedIds.length === 0) return;

    if (totalDurationMinutes > selectedSlot.duration) {
      toast({
        title: "Időtartam Túllépés!",
        description: `A kiválasztott ${totalDurationMinutes} perces csomag nem fér bele a ${selectedSlot.duration} perces idősávba.`,
        variant: "destructive",
      });
      return;
    }

    setDone(true);
    toast({
      title: "Sikeres Intelligens Foglalás! 🎉",
      description: `${selectedServices.length} szolgáltatás lefoglalva. Összesen: ${formatPrice(totalPrice)} (${totalDurationMinutes} perc).`,
    });
  };

  if (done) {
    return (
      <div className="rounded-3xl p-8 text-center" style={glassCard(theme)}>
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
        <h3 className="text-xl font-bold mb-1">Foglalási Kérés Elküldve!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          A szolgáltató értesítést kapott a(z) <strong>{currentUser?.nickname || "vendég"}</strong> becenevű foglalásról.
        </p>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl max-w-sm mx-auto mb-6 text-left text-xs space-y-2 border">
          <div className="flex justify-between font-bold">
            <span>Dátum & Idősáv:</span>
            <span>{dateKey} ({selectedSlot?.startTime} – {selectedSlot?.endTime})</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Választott Szolgáltatások:</span>
            <span>{selectedServices.map(s => s.name).join(", ")}</span>
          </div>
          <div className="flex justify-between text-emerald-600 font-extrabold text-sm pt-1 border-t">
            <span>Összesen:</span>
            <span>{formatPrice(totalPrice)} ({totalDurationMinutes} perc)</span>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/beauty/bookings">Foglalásaim Megtekintése</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500" /> 1. Válassz Szolgáltatásokat
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Több szolgáltatást is kijelölhetsz – a rendszer automatikusan kiszámítja az összesített időtartamot és árat!
          </p>
        </div>
        {selectedServices.length > 0 && (
          <Badge className="bg-rose-500 text-white font-bold">
            {selectedServices.length} kijelölve ({totalDurationMinutes} perc)
          </Badge>
        )}
      </div>

      {/* Services List Grouped by Category */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catServices = services.filter((s) => ((s as any).category || "Egyéb") === cat);
          return (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catServices.map((s) => {
                  const isChecked = selectedIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSelect(s.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-rose-500/10 border-rose-500 shadow-sm ring-2 ring-rose-500/30"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <div>
                            <div className="font-extrabold text-sm">{s.name}</div>
                            {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">{formatPrice(s.price)}</span>
                        <span className="text-slate-500 flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> {s.durationMinutes} perc
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Selection Summary Bar */}
      {selectedServices.length > 0 && (
        <Card className="p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs opacity-90 block">Kiválasztott Szolgáltatás-csomag:</span>
              <span className="font-extrabold text-sm">{selectedServices.map((s) => s.name).join(" + ")}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-black">{formatPrice(totalPrice)}</div>
              <div className="text-xs opacity-90 flex items-center justify-end gap-1 font-bold">
                <Clock className="w-3.5 h-3.5" /> {totalDurationMinutes} perc összesen
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Intelligent Date & Slot Picker */}
      {selectedServices.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-500" /> 2. Válassz Dátumot és Idősávot
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">Dátum Kiválasztása</h3>
              <Card className="p-2 w-fit border rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setSelectedSlot(null); }}
                  disabled={disablePastDates}
                />
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Intelligens Idősáv Ellenőrzés</h3>
              <p className="text-xs text-muted-foreground">
                Csak azok az idősávok foglalhatók, amelyekbe a kiválasztott {totalDurationMinutes} perces csomag belefér!
              </p>

              <div className="space-y-2">
                {mockSlots.map((slot) => {
                  const fits = slot.duration >= totalDurationMinutes;
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!fits}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        !fits
                          ? "opacity-40 bg-slate-100 dark:bg-slate-800/50 border-slate-200 cursor-not-allowed"
                          : isSelected
                            ? "bg-rose-500 text-white border-rose-500 shadow-md font-bold"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-extrabold">{slot.startTime} – {slot.endTime}</span>
                        <span className="text-xs opacity-80">({slot.duration} perces sáv)</span>
                      </div>

                      <div>
                        {fits ? (
                          <Badge variant="outline" className={`text-[10px] ${isSelected ? "border-white text-white" : "border-emerald-500 text-emerald-600"}`}>
                            ✓ Belefér ({totalDurationMinutes}m)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            ❌ Túl rövid ({slot.duration}m &lt; {totalDurationMinutes}m)
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Service Watchdog Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg space-y-2 border border-emerald-500/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-emerald-400 animate-bounce" />
                    <span>Nincs megfelelő szabad időpontod?</span>
                  </span>
                  <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px]">15 PERC PRIORITÁS</Badge>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  Állíts be Szolgáltatásfigyelőt! Amint lemond valaki egy időpontot vagy {provider.displayName} új helyet nyit, <strong>15 perces kizárólagos prioritással értesítünk</strong> Push/SMS üzenetben!
                </p>
                <Button
                  type="button"
                  onClick={() => setIsWatchdogOpen(true)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl text-xs mt-1 shadow-md"
                >
                  ⚡ Szolgáltatásfigyelő Aktiválása Erre a Napra ➔
                </Button>
              </div>

              {/* Confirmation Button */}
              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedSlot || selectedIds.length === 0}
                  className="w-full py-6 rounded-2xl text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20"
                >
                  {isSignedIn
                    ? requiredDepositAmount > 0
                      ? `Foglalási kérés · fizetendő előleg: ${formatPrice(requiredDepositAmount)}`
                      : `Foglalási kérés · ${formatPrice(totalPrice)}`
                    : "Jelentkezz be a foglaláshoz"}
                </Button>
                <div className="text-[10px] text-center font-bold text-slate-500 dark:text-slate-400">
                  {requiredDepositAmount > 0
                    ? "Az előleg csak a foglalás megerősítésekor fizetendő; a fennmaradó összeget a szolgáltatónál rendezed."
                    : "Ehhez a szolgáltatáshoz nem szükséges online előleg; a fizetés a szolgáltatónál történik."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ServiceWatchdogModal
        isOpen={isWatchdogOpen}
        onClose={() => setIsWatchdogOpen(false)}
        providerName={provider.displayName}
        providerId={provider.id}
        requestedDate={dateKey}
        serviceName={selectedServices.map((s) => s.name).join(" + ")}
      />
    </div>
  );
}
