import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import {
  useGetMyBeautyFavorites, getGetMyBeautyFavoritesQueryKey,
  useAddBeautyFavorite,
  useRemoveBeautyFavorite,
} from "@workspace/api-client-react";
import type { BeautyProvider, BeautyReview, BeautyServiceOffering } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/constants";
import { Star, MapPin, Phone, Instagram, Globe, Heart, Clock, Sparkles, CalendarDays, Video, Bell, SearchX } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getProfileTemplate, type ProfileTemplate } from "./templates/templateConfig";
import { TemplateBackdrop } from "./templates/TemplateBackdrop";
import { gradientText, gradientButton, glassCard, accentBadge, selectedPill, hexToRgba } from "./templates/glassStyles";
import { ServiceWatchdogModal } from "@/components/providers/ServiceWatchdogModal";
import { cn } from "@/lib/utils";
import { BeautyBookingWizard } from "@/components/beauty/BeautyBookingWizard";
import { getProviderProfile, type ProviderProfileRecord } from "@/lib/providerApi";

function videoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname === "vimeo.com" || url.hostname.endsWith(".vimeo.com")) {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
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
  const [storedProvider, setStoredProvider] = useState<ProviderProfileRecord | null>(null);
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);
  const [providerLoadError, setProviderLoadError] = useState(false);
  useEffect(() => {
    if (!id) {
      setIsLoadingProvider(false);
      setProviderLoadError(true);
      return;
    }
    let active = true;
    setIsLoadingProvider(true);
    setProviderLoadError(false);
    getProviderProfile(id)
      .then((value) => active && setStoredProvider(value))
      .catch(() => {
        if (active) {
          setStoredProvider(null);
          setProviderLoadError(true);
        }
      })
      .finally(() => active && setIsLoadingProvider(false));
    return () => { active = false; };
  }, [id]);

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

  const effectiveProvider: BeautyProvider | null = storedProvider ? {
    id: storedProvider.id,
    displayName: storedProvider.displayName,
    bio: storedProvider.bio,
    region: storedProvider.city,
    address: storedProvider.address || storedProvider.city,
    county: storedProvider.city,
    rating: 0,
    totalReviews: 0,
    isVerified: false,
    profileImageUrl: storedProvider.profileImages?.[0] || storedProvider.profileImage,
    coverImageUrl: storedProvider.profileImages?.[1] || storedProvider.profileImages?.[0] || storedProvider.profileImage,
    portfolio: (storedProvider.profileImages ?? (storedProvider.profileImage ? [storedProvider.profileImage] : [])).map((imageUrl, index) => ({
      id: `portfolio-${index + 1}`,
      imageUrl,
      title: `${storedProvider.displayName} portfólió ${index + 1}`,
    })),
    templateId: storedProvider.themeId === "gold" ? "template2" : storedProvider.themeId === "steel" ? "template3" : "template1",
    videoUrl: storedProvider.videoUrl,
    profession: storedProvider.subCategory || storedProvider.category,
    workingHours: Array.from(new Set(storedProvider.slots.map((slot) => slot.day))).map((day) => {
      const daySlots = storedProvider.slots.filter((slot) => slot.day === day && slot.isAvailable);
      return { day, hours: daySlots.length ? `${daySlots[0].startTime}–${daySlots[daySlots.length - 1].endTime}` : "Zárva" };
    }),
    services: storedProvider.services.map((service) => ({
      ...service,
      serviceType: "general",
      category: storedProvider.subCategory || storedProvider.category,
      isAvailable: service.isAvailable !== false,
    })),
  } as any : null;
  const reviews: BeautyReview[] = [];
  const theme = getProfileTemplate(effectiveProvider?.templateId);

  const [wizardService, setWizardService] = useState<any>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleOpenWizard = (service: any) => {
    setWizardService(service);
    setIsWizardOpen(true);
  };

  if (isLoadingProvider) {
    return <Layout><div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-slate-500">A szolgáltatói profil betöltése…</div></Layout>;
  }

  if (providerLoadError || !effectiveProvider) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <SearchX className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">A szolgáltatói profil nem található</h1>
          <p className="mt-2 text-sm text-slate-500">A profil nem létezik, nincs közzétéve, vagy már nem elérhető.</p>
          <Button asChild className="mt-6 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"><Link href="/providers">Vissza a szolgáltatókhoz</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
        <div className="bg-white text-slate-900 border-b border-slate-200 shadow-sm py-2.5 px-4">
          <div className="container mx-auto max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-600 text-white font-black text-xs px-3 py-1">
                ILOLIT SZOLGÁLTATÓI PROFIL
              </Badge>
              <span className="text-xs text-slate-600 font-bold hidden sm:inline">
                {effectiveProvider.displayName} • {effectiveProvider.county || effectiveProvider.region}
              </span>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Link href="/providers">
                <span>Vissza a szolgáltatókhoz</span>
              </Link>
            </Button>
          </div>
        </div>
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
          slots={storedProvider?.slots}
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
                disabled={availableServices.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl"
                onClick={() => availableServices[0] && onOpenWizard(availableServices[0])}
              >
                {availableServices.length > 0 ? "Időpont foglalása" : "Nincs foglalható szolgáltatás"}
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

        {/* Provider introduction video */}
        {(provider as any).videoUrl && (
          <div className="mb-10 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-500" />
              <span>Bemutatkozó videó</span>
            </h2>
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
              {videoEmbedUrl((provider as any).videoUrl) ? (
                <iframe
                  src={videoEmbedUrl((provider as any).videoUrl) ?? undefined}
                  title="Szolgáltatói Bemutatkozó Videó"
                  className="w-full h-full rounded-3xl border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={(provider as any).videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                >
                  A böngésződ nem támogatja a videólejátszást.
                </video>
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
  const [selectedId, setSelectedId] = useState<string | null>(services[0]?.id ?? null);
  const [isWatchdogOpen, setIsWatchdogOpen] = useState(false);

  const selectedService = services.find((service) => service.id === selectedId) ?? null;
  const requiredDepositAmount = selectedService ? (() => {
    const service = selectedService;
    const requiresDeposit = (service as any).requiresDeposit === true;
    const percentage = Number((service as any).depositPercentage || 0);
    return requiresDeposit ? Math.round((service.price * percentage) / 100) : 0;
  })() : 0;

  // Group services by category
  const categories = Array.from(new Set(services.map((s) => (s as any).category || "Egyéb")));

  const handleContinue = () => {
    if (!isSignedIn) {
      setLocation("/auth/login");
      return;
    }
    if (selectedService) onOpenWizard?.(selectedService);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500" /> Válassz szolgáltatást
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            A következő lépésben csak a szolgáltató valóban szabad időpontjai jelennek meg.
          </p>
        </div>
        {selectedService && (
          <Badge className="bg-rose-500 text-white font-bold">
            {selectedService.durationMinutes} perc
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
                  const isChecked = selectedId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-rose-500/10 border-rose-500 shadow-sm ring-2 ring-rose-500/30"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="provider-service"
                            checked={isChecked}
                            onChange={() => setSelectedId(s.id)}
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

      {selectedService && (
        <Card className="p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs opacity-90 block">Kiválasztott szolgáltatás:</span>
              <span className="font-extrabold text-sm">{selectedService.name}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-black">{formatPrice(selectedService.price)}</div>
              <div className="text-xs opacity-90 flex items-center justify-end gap-1 font-bold">
                <Clock className="w-3.5 h-3.5" /> {selectedService.durationMinutes} perc
              </div>
            </div>
          </div>
        </Card>
      )}

      {selectedService && (
        <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <CalendarDays className="h-5 w-5 text-emerald-600" /> Valós időpontok megtekintése
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">A rendszer a mentett munkaidőből levonja a már lefoglalt időpontokat, ezért csak foglalható időpontot enged kiválasztani.</p>
            <Button onClick={handleContinue} className="mt-4 w-full rounded-xl bg-emerald-600 py-5 font-extrabold text-white hover:bg-emerald-700">
              {isSignedIn ? "Dátum és szabad időpont kiválasztása" : "Jelentkezz be a foglaláshoz"}
            </Button>
            <p className="mt-2 text-center text-[10px] font-bold text-slate-500">
              {requiredDepositAmount > 0 ? `A megerősítéskor fizetendő előleg: ${formatPrice(requiredDepositAmount)}` : "Ehhez a szolgáltatáshoz nem szükséges online előleg."}
            </p>
          </div>

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
                  ⚡ Szolgáltatásfigyelő beállítása ➔
                </Button>
          </div>
        </div>
      )}

      <ServiceWatchdogModal
        isOpen={isWatchdogOpen}
        onClose={() => setIsWatchdogOpen(false)}
        providerName={provider.displayName}
        providerId={provider.id}
        requestedDate=""
        serviceName={selectedService?.name || "Kiválasztott szolgáltatás"}
      />
    </div>
  );
}
