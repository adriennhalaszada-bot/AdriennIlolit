import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { ALL_PROVIDER_CATEGORIES } from "@/data/allProvidersData";
import { Sparkles, Eye, Briefcase, CalendarDays, Bell, Check, X, Video, ShieldCheck, Clock, Settings, Palette, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/constants";
import { getMyProviderProfile, saveMyProviderProfile } from "@/lib/providerApi";
import { getMyProviderBookings, respondToProviderBooking, type ProviderBookingRecord } from "@/lib/providerBookingApi";

export function GeneralProviderDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [publishPortfolio, setPublishPortfolio] = useState(false);
  const [themeId, setThemeId] = useState("emerald");

  // Services list
  const [services, setServices] = useState<Array<{ id: string; name: string; price: number; durationMinutes: number; deposit: number }>>([]);

  const [newSrvName, setNewSrvName] = useState("");
  const [newSrvPrice, setNewSrvPrice] = useState("");
  const [newSrvDuration, setNewSrvDuration] = useState("60");

  // Interactive Custom Slots State
  const [selectedDay, setSelectedDay] = useState("Hétfő");
  const [customSlots, setCustomSlots] = useState<{ id: string; day: string; startTime: string; endTime: string; isAvailable: boolean }[]>([]);

  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00");
  const selectedCategory = ALL_PROVIDER_CATEGORIES.find((item) => item.name === category);
  const canPublish = Boolean(
    displayName.trim() && category && subCategory && city.trim() && phone.trim() && email.trim() &&
    services.length > 0 && customSlots.some((slot) => slot.isAvailable),
  );

  useEffect(() => {
    let active = true;
    getMyProviderProfile()
      .then((profile) => {
        if (!active || !profile?.displayName) return;
        setProviderId(profile.id || null);
        setDisplayName(profile.displayName);
        setCategory(profile.category);
        setSubCategory(profile.subCategory);
        setCity(profile.city);
        setAddress(profile.address);
        setPhone(profile.phone);
        setEmail(profile.email);
        setBio(profile.bio);
        setVideoUrl(profile.videoUrl);
        setProfileImages(profile.profileImages?.length ? profile.profileImages : profile.profileImage ? [profile.profileImage] : []);
        setPublishPortfolio(profile.publishPortfolio === true);
        setThemeId(profile.themeId);
        setServices(profile.services.map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
          deposit: service.requiresDeposit
            ? Math.round(service.price * Number(service.depositPercentage || 0) / 100)
            : 0,
        })));
        setCustomSlots(profile.slots);
      })
      .catch(() => {})
      .finally(() => active && setIsLoadingProfile(false));
    return () => { active = false; };
  }, []);

  const handleSaveProfile = async () => {
    if (!displayName.trim() || !category || !subCategory || !city.trim() || !phone.trim() || !email.trim()) {
      toast({ title: "Hiányzó kötelező adatok", description: "A név, kategória, szakterület, település, telefonszám és e-mail-cím kötelező.", variant: "destructive" });
      return;
    }
    if (!services.length || !customSlots.some((slot) => slot.isAvailable)) {
      toast({ title: "A profil még nem publikálható", description: "Adj hozzá legalább egy szolgáltatást és egy aktív, foglalható idősávot.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const saved = await saveMyProviderProfile({
        displayName, category, subCategory, city, address, phone, email, bio,
        videoUrl, profileImage: profileImages[0] || "", profileImages, publishPortfolio, themeId, slots: customSlots,
        services: services.map((service) => ({
          ...service,
          requiresDeposit: service.deposit > 0,
          depositPercentage: service.price > 0 ? Math.round(service.deposit / service.price * 100) : 0,
          isAvailable: true,
        })),
        isPublished: canPublish,
      });
      setProviderId(saved.id || null);
      toast({ title: "A szolgáltatói adatok mentve", description: "A profil, az árlista és az idősávok tartósan a Cloudflare tárhelyre kerültek." });
    } catch (error) {
      toast({ title: "A mentés nem sikerült", description: error instanceof Error ? error.message : "Ismeretlen hiba történt.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSlotStart >= newSlotEnd) {
      toast({ title: "Hibás idősáv", description: "A befejezési időnek későbbinek kell lennie a kezdésnél.", variant: "destructive" });
      return;
    }
    if (customSlots.some((slot) => slot.day === selectedDay && slot.startTime === newSlotStart && slot.endTime === newSlotEnd)) {
      toast({ title: "Ez az idősáv már létezik", variant: "destructive" });
      return;
    }
    const newSlot = {
      id: `slot-${Date.now()}`,
      day: selectedDay,
      startTime: newSlotStart,
      endTime: newSlotEnd,
      isAvailable: true,
    };
    setCustomSlots([...customSlots, newSlot]);
    toast({ title: "Új Idősáv Hozzáadva! 🟢", description: `${selectedDay}: ${newSlotStart} - ${newSlotEnd}` });
  };

  const handleToggleSlotStatus = (id: string) => {
    setCustomSlots(customSlots.map(s => s.id === id ? { ...s, isAvailable: !s.isAvailable } : s));
  };

  const handleDeleteSlot = (id: string) => {
    setCustomSlots(customSlots.filter(s => s.id !== id));
    toast({ title: "Idősáv Törölve" });
  };

  const handleAutoGenerateSlots = () => {
    const hours = ["08:00", "09:30", "11:00", "13:00", "14:30", "16:00", "17:30"];
    const generated = hours.slice(0, hours.length - 1).map((h, i) => ({
      id: `gen-${Date.now()}-${i}`,
      day: selectedDay,
      startTime: h,
      endTime: hours[i + 1],
      isAvailable: true,
    }));
    setCustomSlots([...customSlots.filter(s => s.day !== selectedDay), ...generated]);
    toast({ title: "Idősávok Automatizált Generálása Kész! ⚡", description: `${selectedDay}: ${generated.length} új idősáv hozva létre.` });
  };

  const [bookings, setBookings] = useState<ProviderBookingRecord[]>([]);

  useEffect(() => {
    let active = true;
    getMyProviderBookings()
      .then(({ items }) => active && setBookings(items.filter((booking) => booking.role === "provider")))
      .catch(() => {})
      .finally(() => active && setIsLoadingBookings(false));
    return () => { active = false; };
  }, []);

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(newSrvPrice);
    const duration = Number(newSrvDuration);
    if (!newSrvName.trim() || !Number.isFinite(price) || price < 0 || !Number.isFinite(duration) || duration < 5) {
      toast({ title: "Hibás szolgáltatási adat", description: "Adj meg nevet, érvényes árat és legalább 5 perces időtartamot.", variant: "destructive" });
      return;
    }
    const srv = {
      id: `s-${Date.now()}`,
      name: newSrvName.trim(),
      price: Math.round(price),
      durationMinutes: Math.round(duration),
      deposit: Math.round(price * 0.2),
    };
    setServices([...services, srv]);
    setNewSrvName("");
    setNewSrvPrice("");
    toast({ title: "Szolgáltatás Hozzáadva!", description: srv.name });
  };

  const handleBookingAction = async (id: string, action: "CONFIRMED" | "REJECTED") => {
    try {
      const updated = await respondToProviderBooking(id, action);
      setBookings((current) => current.map((booking) => booking.id === id ? updated : booking));
      toast({
        title: action === "CONFIRMED" ? "Foglalás visszaigazolva" : "Foglalás elutasítva",
        description: "A foglalás állapota tartósan mentve.",
      });
    } catch (error) {
      toast({ title: "A foglalás frissítése nem sikerült", description: error instanceof Error ? error.message : "Ismeretlen hiba történt.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      {/* Subnav Header for Providers */}
      <div className="bg-slate-900 text-white py-4 px-4 border-b border-slate-800">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-600 text-white font-black text-xs px-3 py-1">
              💼 ILOLIT SZOLGÁLTATÓI PORTÁL
            </Badge>
            <span className="text-xs text-slate-400 font-bold hidden sm:inline">
              Ágazati Irányítópult & Időpontkezelő
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="rounded-xl border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800">
              <Link href="/providers">
                <span>➔ Vissza a Szolgáltatókhoz</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Profile Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-500/40 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <Badge variant="outline" className="text-emerald-300 border-emerald-400 font-extrabold text-[10px]">
                {category} • {subCategory}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">{displayName}</h1>
            <p className="text-xs text-slate-300 font-medium">
              {city ? `📍 ${city}${address ? `, ${address}` : ""}` : "A profil adatai még nincsenek kitöltve"}{phone ? ` • 📞 ${phone}` : ""}
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs py-5 px-6 shadow-lg whitespace-nowrap"
          >
            <Link href={providerId ? `/providers/${providerId}` : "/provider-dashboard"}>
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" /> 👁️ Saját Bemutatkozó Oldal (Vevő Nézet) ➔
              </span>
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs text-slate-700">
            {isLoadingProfile ? "A korábban mentett szolgáltatói adatok betöltése…" : canPublish ? "A profil publikálható: minden kötelező adat, szolgáltatás és aktív idősáv rendelkezésre áll." : "A publikáláshoz töltsd ki a kötelező adatokat, majd adj hozzá szolgáltatást és aktív idősávot."}
          </div>
          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={isLoadingProfile || isSavingProfile}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl"
          >
            {isSavingProfile ? "Mentés folyamatban…" : "Minden módosítás mentése"}
          </Button>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl gap-1">
            <TabsTrigger value="bookings" className="py-3 rounded-xl font-bold text-xs sm:text-sm">
              1. 📩 Foglalások ({bookings.filter(b => b.status === "PENDING").length} új)
            </TabsTrigger>
            <TabsTrigger value="services" className="py-3 rounded-xl font-bold text-xs sm:text-sm">
              2. 🛠️ Szolgáltatások ({services.length})
            </TabsTrigger>
            <TabsTrigger value="profile" className="py-3 rounded-xl font-bold text-xs sm:text-sm">
              3. ⚙️ Profil & Képek
            </TabsTrigger>
            <TabsTrigger value="theme" className="py-3 rounded-xl font-bold text-xs sm:text-sm">
              4. 🎨 Sablon & Arculat
            </TabsTrigger>
            <TabsTrigger value="calendar" className="py-3 rounded-xl font-bold text-xs sm:text-sm">
              5. 📅 Idősávok & Naptár
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Bookings Management */}
          <TabsContent value="bookings" className="space-y-4">
            <Card className="p-6 rounded-3xl space-y-4 border">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-emerald-600" />
                    <span>Beérkezett Foglalási Kérések</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A beérkezett foglalási kérések elfogadása vagy elutasítása.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {isLoadingBookings && <p className="text-sm text-slate-500">Foglalások betöltése…</p>}
                {!isLoadingBookings && bookings.length === 0 && <p className="text-sm text-slate-500">Még nem érkezett foglalási kérés.</p>}
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`font-black text-[10px] ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-600 text-white"
                            : b.status === "CANCELLED" || b.status === "REJECTED"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-500 text-slate-950 animate-pulse"
                          }`}
                        >
                          {b.status === "CONFIRMED" ? "🟢 VISSZAIGAZOLVA" : b.status === "REJECTED" ? "🔴 ELUTASÍTVA" : b.status === "CANCELLED" ? "⚪ LEMONDVA" : "⏳ VISSZAIGAZOLÁSRA VÁR"}
                        </Badge>
                        <span className="text-xs font-bold text-slate-400">📅 {b.bookingDate} • {b.bookingTime}</span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{b.serviceName}</h3>
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
                        <span>👤 <strong>{b.customerName}</strong></span>
                        <span>📞 {b.customerPhone}</span>
                        <span className="font-extrabold text-emerald-600">{formatPrice(b.price)}</span>
                      </div>
                    </div>

                    {b.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleBookingAction(b.id, "CONFIRMED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs py-4 px-4 gap-1.5 shadow-md"
                        >
                          <Check className="w-4 h-4" /> Visszaigazolás (Elfogadás)
                        </Button>
                        <Button
                          onClick={() => handleBookingAction(b.id, "REJECTED")}
                          variant="outline"
                          className="border-rose-300 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs py-4 px-4 gap-1.5"
                        >
                          <X className="w-4 h-4" /> Elutasítás
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: Services Management */}
          <TabsContent value="services" className="space-y-4">
            <Card className="p-6 rounded-3xl space-y-6 border">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Szolgáltatások & Árlista Kezelése
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adatokat és árakat tetszőlegesen módosíthatsz.
                </p>
              </div>

              {/* Add New Service Form */}
              <form onSubmit={handleAddService} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-3">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Új Szolgáltatás Hozzáadása
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    required
                    placeholder="Szolgáltatás neve (pl. Kapu szerelés)"
                    value={newSrvName}
                    onChange={(e) => setNewSrvName(e.target.value)}
                    className="py-4 text-xs font-bold rounded-xl"
                  />
                  <Input
                    required
                    type="number"
                    placeholder="Ár (Ft)"
                    value={newSrvPrice}
                    onChange={(e) => setNewSrvPrice(e.target.value)}
                    className="py-4 text-xs font-bold rounded-xl"
                  />
                  <Input
                    type="number"
                    placeholder="Időtartam (perc)"
                    value={newSrvDuration}
                    onChange={(e) => setNewSrvDuration(e.target.value)}
                    className="py-4 text-xs font-bold rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs py-4">
                  + Szolgáltatás Mentése
                </Button>
              </form>

              {/* Existing Services List */}
              <div className="space-y-2">
                {services.map((srv) => (
                  <div key={srv.id} className="p-4 rounded-2xl border flex items-center justify-between bg-white dark:bg-slate-900">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{srv.name}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        ⏱️ {srv.durationMinutes} perc • Előleg: {formatPrice(srv.deposit)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-600 text-sm">{formatPrice(srv.price)}</span>
                      <button
                        onClick={() => setServices(services.filter((s) => s.id !== srv.id))}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: Profile & Cloudflare Media */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="p-6 rounded-3xl space-y-6 border">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Profil Adatok & Cloudflare Kép/Videó Feltöltés
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  A képek közvetlenül a Cloudflare R2 saját tárhelyedre töltődnek fel.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vállalkozás Neve *</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Saját vállalkozásod neve" className="py-4 text-xs font-bold rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Telefonszám *</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36…" className="py-4 text-xs font-bold rounded-xl mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Főkategória *</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory(""); }} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs font-bold">
                    <option value="">Válassz főkategóriát</option>
                    {ALL_PROVIDER_CATEGORIES.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Szakterület *</label>
                  <select value={subCategory} disabled={!selectedCategory} onChange={(e) => setSubCategory(e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-xs font-bold disabled:opacity-50">
                    <option value="">Válassz szakterületet</option>
                    {selectedCategory?.subcategories.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kapcsolattartási e-mail *</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vallalkozas@pelda.hu" className="py-4 text-xs font-bold rounded-xl mt-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Város & Megye</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} className="py-4 text-xs font-bold rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pontos Cím</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="py-4 text-xs font-bold rounded-xl mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bemutatkozó Szöveg (Bio)</label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 text-xs font-medium rounded-xl h-24" />
              </div>

              {/* Cloudflare Video Stream URL */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-emerald-600" />
                  <span>Bemutatkozó Videó (Cloudflare Stream / YouTube / Vimeo URL)</span>
                </label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="py-4 text-xs font-mono rounded-xl bg-white dark:bg-slate-900"
                />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  A vevők a profiloldaladon HD felbontásban megtekinthetik a bemutatkozó videódat és munkáidat!
                </p>
              </div>

              {/* Cloudflare Image Uploader */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Profil & Portfólió Képek (Cloudflare R2 Storage)</label>
                <ImageUploader value={profileImages} onChange={setProfileImages} maxImages={6} />
                <p className="text-[11px] text-slate-500">Az első kép a profil főképe, a további képek a nyilvános portfólióban jelennek meg. Legfeljebb 6 kép tölthető fel.</p>
                <label className="flex items-start gap-2 rounded-xl border bg-slate-50 p-3 text-xs text-slate-700">
                  <input type="checkbox" checked={publishPortfolio} onChange={(e) => setPublishPortfolio(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span><strong>A teljes képgaléria nyilvános közzététele.</strong> Kikapcsolva csak az első profilkép látható, a többi feltöltött kép privát marad.</span>
                </label>
              </div>

              <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-5 rounded-2xl text-xs shadow-md">
                Profil Módosítások Mentése ➔
              </Button>
            </Card>
          </TabsContent>

          {/* TAB 4: Template Selector */}
          <TabsContent value="theme" className="space-y-4">
            <Card className="p-6 rounded-3xl space-y-6 border">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-emerald-600" />
                  <span>Saját Bemutatkozó Sablon & Arculat Választó</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Válassz a vállalkozásod ágazatához illeszkedő vizuális sablont!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setThemeId("steel")}
                  className={`p-5 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    themeId === "steel" ? "border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900 shadow-xl" : "border-slate-200"
                  }`}
                >
                  <div className="space-y-2">
                    <Badge className="bg-slate-700 text-white font-extrabold text-[10px]">FÉMES / IPARI</Badge>
                    <h3 className="font-extrabold text-base">Industrial Steel</h3>
                    <p className="text-xs opacity-80 font-medium">Ideális lakatos, kovács, hegesztő és fémipari vállalkozásoknak.</p>
                  </div>
                </div>

                <div
                  onClick={() => setThemeId("emerald")}
                  className={`p-5 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    themeId === "emerald" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 ring-2 ring-emerald-600 shadow-xl" : "border-slate-200"
                  }`}
                >
                  <div className="space-y-2">
                    <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">MODERN ZÖLD</Badge>
                    <h3 className="font-extrabold text-base text-emerald-900 dark:text-emerald-100">Emerald Modern</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Letisztult és bizalmat keltő modern arculat.</p>
                  </div>
                </div>

                <div
                  onClick={() => setThemeId("gold")}
                  className={`p-5 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    themeId === "gold" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/60 ring-2 ring-amber-500 shadow-xl" : "border-slate-200"
                  }`}
                >
                  <div className="space-y-2">
                    <Badge className="bg-amber-500 text-white font-extrabold text-[10px]">ELEGÁNS ARANY</Badge>
                    <h3 className="font-extrabold text-base text-amber-950 dark:text-amber-100">Elegant Gold</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Prémium exkluzív megjelenés VIP szolgáltatóknak.</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 5: Calendar & Interactive Slot Manager */}
          <TabsContent value="calendar" className="space-y-4">
            <Card className="p-6 rounded-3xl space-y-6 border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-emerald-600" />
                    <span>Saját Idősávok & Nyitvatartás Meghatározása</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hozz létre saját idősávokat tetszőleges kezdési és befejezési időponttal, kapcsold ki a foglalt vagy szünet idősávokat!
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleAutoGenerateSlots}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs py-5 px-5 gap-2 shadow-md whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>⚡ 1-Kattintásos Automata Generálás ({selectedDay})</span>
                </Button>
              </div>

              {/* Days Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Válassz Napot az Idősávok Szerkesztéséhez:</label>
                <div className="flex flex-wrap gap-2">
                  {["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"].map((day) => {
                    const count = customSlots.filter((s) => s.day === day).length;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2.5 rounded-2xl border text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          selectedDay === day
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400"
                        }`}
                      >
                        <span>{day}</span>
                        <Badge className={`text-[10px] ${selectedDay === day ? "bg-white text-emerald-950" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
                          {count} sáv
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Slot Form */}
              <form onSubmit={handleAddSlot} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-3">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Új Egyedi Idősáv Hozzáadása ({selectedDay})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Kezdési Idő</label>
                    <Input
                      type="time"
                      value={newSlotStart}
                      onChange={(e) => setNewSlotStart(e.target.value)}
                      className="py-4 text-xs font-bold rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Befejezési Idő</label>
                    <Input
                      type="time"
                      value={newSlotEnd}
                      onChange={(e) => setNewSlotEnd(e.target.value)}
                      className="py-4 text-xs font-bold rounded-xl mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs py-5">
                      + Idősáv Mentése
                    </Button>
                  </div>
                </div>
              </form>

              {/* List of Slots for Selected Day */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>{selectedDay}i Idősávjaid ({customSlots.filter((s) => s.day === selectedDay).length} db)</span>
                  <span className="text-slate-400 font-normal">Kattints a státusz váltásához vagy törléshez</span>
                </div>

                {customSlots.filter((s) => s.day === selectedDay).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed text-slate-500 text-xs">
                    Még nincs létrehozott idősáv erre a napra ({selectedDay}). Hozz létre egyet a fenti űrlappal vagy kattints az automata generálásra!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {customSlots.filter((s) => s.day === selectedDay).map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                          slot.isAvailable
                            ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 opacity-60"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span>{slot.startTime} – {slot.endTime}</span>
                          </div>
                          <div className="text-[10px] font-extrabold">
                            {slot.isAvailable ? (
                              <span className="text-emerald-700 dark:text-emerald-400">🟢 Szabad / Foglalható</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">🔴 Foglalt / Szünet</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleSlotStatus(slot.id)}
                            className="text-[10px] font-bold rounded-xl py-1 px-2 border-slate-300"
                            title="Státusz váltása"
                          >
                            {slot.isAvailable ? "Zárás" : "Nyitás"}
                          </Button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100 transition"
                            title="Törlés"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
