import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { UnifiedModuleHeader } from "@/components/shared/UnifiedModuleHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Home,
  MapPin,
  SlidersHorizontal,
  Phone,
  Mail,
  PlusCircle,
  X,
  Building,
  Info,
  Maximize,
  Sparkles,
  DollarSign,
  Calendar,
  Lock,
  CheckCircle,
  Video
} from "lucide-react";
import {
  getRealEstateSlots,
  saveRealEstateSlots,
  getRealEstateBookings,
  saveRealEstateBookings,
  sendSimulatedSMS,
  RealEstateSlot,
  RealEstateBooking
} from "@/lib/smsSim";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { DEFAULT_LOCATION_STATE, LocationSearchState, applyLocationFilter, getCalculatedDistance } from "@/lib/locationFilter";
import { useLocationQueryState } from "@/hooks/useLocationQueryState";
import { RealEstateMapSearch } from "@/components/realestate/RealEstateMapSearch";
import { MortgageCalculator } from "@/components/realestate/MortgageCalculator";
import { NeighborhoodInfoSection } from "@/components/realestate/NeighborhoodInfoSection";
import { ListingHistorySection } from "@/components/realestate/ListingHistorySection";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { ReportProblemModal } from "@/components/shared/ReportProblemModal";

interface RealEstateItem {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  location: string;
  type: "apartment" | "house" | "land" | "commercial";
  typeLabel: string;
  transaction: "sale" | "rent";
  transactionLabel: string;
  area: number; // m²
  rooms: number;
  description: string;
  image: string;
  seller: string;
}

export const MOCK_PROPERTIES: RealEstateItem[] = [
  {
    id: "prop-miskolc-1",
    title: "Miskolc belvárosi 3 szobás téglalakás",
    price: "34 900 000 Ft",
    priceNum: 34900000,
    location: "Miskolc",
    type: "apartment",
    typeLabel: "Lakás",
    transaction: "sale",
    transactionLabel: "Eladó",
    area: 68,
    rooms: 3,
    description: "Miskolc Belvárosában, a sétálóutcától pár percre található, erkélyes, felújított tégla építésű lakás csendes zöldövezeti környéken.",
    image: "/real_estate_budapest.jpg",
    seller: "Tóth Ágnes (Miskolc Ingatlan)"
  },
  {
    id: "prop-kazinc-1",
    title: "Kazincbarcikai kertes családi ház",
    price: "28 500 000 Ft",
    priceNum: 28500000,
    location: "Kazincbarcika",
    type: "house",
    typeLabel: "Családi ház",
    transaction: "sale",
    transactionLabel: "Eladó",
    area: 110,
    rooms: 4,
    description: "Kazincbarcika csendes részén (~22 km Miskolctól) található jó állapotú családi ház rendezett telekkel és garázzsal.",
    image: "/real_estate_suburb.jpg",
    seller: "Borsod Real Estate"
  },
  {
    id: "prop-debrecen-1",
    title: "Debrecen Nagyerdő luxus családi villa",
    price: "145 000 000 Ft",
    priceNum: 145000000,
    location: "Debrecen",
    type: "house",
    typeLabel: "Családi ház",
    transaction: "sale",
    transactionLabel: "Eladó",
    area: 190,
    rooms: 5,
    description: "Debrecen legkedveltebb részén, a Nagyerdőn épült exkluzív kivitelezésű, dupla garázsos családi villa szaunával és medencével.",
    image: "/real_estate_suburb.jpg",
    seller: "Debrecen Luxury Homes"
  },
  {
    id: "prop-1",
    title: "Luxus panorámás penthause lakás",
    price: "245 000 000 Ft",
    priceNum: 245000000,
    location: "Budapest, I. kerület",
    type: "apartment",
    typeLabel: "Lakás",
    transaction: "sale",
    transactionLabel: "Eladó",
    area: 120,
    rooms: 4,
    description: "Kivételes hangulatú, minimál stílusban berendezett luxus lakás a budai Vár tövében. Hatalmas üvegfelületek, panorámás terasz a Dunára és a Lánchídra. Okosotthon rendszer, beépített prémium gépek, portaszolgálat és saját teremgarázs hely tartozik hozzá.",
    image: "/real_estate_budapest.jpg",
    seller: "Kovács Katalin (Prémium Agent)"
  },
  {
    id: "prop-2",
    title: "Modern skandináv stílusú családi ház",
    price: "165 000 000 Ft",
    priceNum: 165000000,
    location: "Telki, Kertváros",
    type: "house",
    typeLabel: "Családi ház",
    transaction: "sale",
    transactionLabel: "Eladó",
    area: 185,
    rooms: 5,
    description: "Új építésű, AA+ energetikai besorolású családi ház gyönyörűen parkosított kerttel, napelemes rendszerrel és hőszivattyús fűtéssel. Kiváló elosztás, amerikai konyhás nappali, 4 hálószoba és dupla garázs.",
    image: "/real_estate_suburb.jpg",
    seller: "Nagy Péter (Lolit Real Estate)"
  },
  {
    id: "prop-3",
    title: "Felújított nádtetős balatoni parasztház",
    price: "98 000 000 Ft",
    priceNum: 98000000,
    location: "Tihany, Ófalu",
    type: "house",
    typeLabel: "Parasztház",
    transaction: "sale",
    transactionLabel: "Eladó",
    area: 95,
    rooms: 3,
    description: "Autentikus tihanyi kőből épült, teljes körűen felújított nádtetős parasztház. Gondozott levendulás kerttel, borospincével és balatoni panorámával. Kiválóan alkalmas nyaralónak vagy kiadásra is.",
    image: "/real_estate_balaton.jpg",
    seller: "Varga Zoltán (Balaton-Home Kft.)"
  },
  {
    id: "prop-4",
    title: "Fiatalos garzon a belvárosban",
    price: "220 000 Ft / hó",
    priceNum: 220000,
    location: "Budapest, VII. kerület",
    type: "apartment",
    typeLabel: "Lakás",
    transaction: "rent",
    transactionLabel: "Kiadó",
    area: 38,
    rooms: 1,
    description: "Csendes belső udvarra néző, teljesen felújított és gépesített dizájn-garzon hosszútávra kiadó. Alacsony rezsiköltség, kiváló közlekedés (M2 metró, 4-6 villamos percekre).",
    image: "/real_estate_budapest.jpg", // fallback
    seller: "Kiss Mária (Tulajdonos)"
  }
];

export const REAL_ESTATE_ITEMS = MOCK_PROPERTIES;

export default function RealEstate() {
  const [selectedProperty, setSelectedProperty] = useState<RealEstateItem | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Real Estate Slots & Bookings DB simulation
  const [allSlots, setAllSlots] = useState<RealEstateSlot[]>([]);
  const [allBookings, setAllBookings] = useState<RealEstateBooking[]>([]);

  // Booking details form states
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState("Hétfő");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Auto open property detail modal if ?id=... or ?selected=... is present in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const targetId = searchParams.get("id") || searchParams.get("selected");
    if (targetId) {
      const found = MOCK_PROPERTIES.find((p) => p.id === targetId);
      if (found) {
        setSelectedProperty(found);
      }
    }
  }, []);

  // Sync database when modal opens/changes
  useEffect(() => {
    setAllSlots(getRealEstateSlots());
    setAllBookings(getRealEstateBookings());
    
    // Clear booking state on property swap
    setSelectedSlotId(null);
    setOtpSent(false);
    setBookingSuccess(false);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
  }, [selectedProperty]);

  // Handle slot reservation
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId || !selectedProperty) return;

    // Generate simulated 4-digit OTP code
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setOtpSent(true);

    // Send Simulated SMS
    sendSimulatedSMS(
      clientPhone,
      `ILOLIT: A megerősítő kódod az időpontfoglaláshoz: ${otp}. Kérjük írd be a kódot a böngészőben a visszaigazoláshoz!`
    );
  };

  // Verify OTP & Save Booking
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput !== generatedOtp) {
      alert("Hibás megerősítő kód! Kérjük ellenőrizd a kapott szimulált SMS-t.");
      return;
    }

    if (!selectedSlotId || !selectedProperty) return;

    const selectedSlot = allSlots.find(s => s.id === selectedSlotId);
    if (!selectedSlot) return;

    const newBooking: RealEstateBooking = {
      id: `booking-${Date.now()}`,
      propertyId: selectedProperty.id,
      propertyName: selectedProperty.title,
      slotId: selectedSlotId,
      slotTime: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
      slotDay: selectedSlot.day,
      clientName: clientName,
      clientPhone: clientPhone,
      clientEmail: clientEmail,
      status: "pending", // Pending seller approval
      otpCode: generatedOtp,
      createdAt: new Date().toISOString()
    };

    // Save Booking
    const updatedBookings = [...allBookings, newBooking];
    setAllBookings(updatedBookings);
    saveRealEstateBookings(updatedBookings);

    // Mark slot as booked (isAvailable = false) to prevent double booking
    const updatedSlots = allSlots.map(s => s.id === selectedSlotId ? { ...s, isAvailable: false } : s);
    setAllSlots(updatedSlots);
    saveRealEstateSlots(updatedSlots);

    setBookingSuccess(true);
    setOtpSent(false);

    // Send Simulated SMS acknowledging submission
    sendSimulatedSMS(
      clientPhone,
      `ILOLIT: A foglalási igényedet sikeresen regisztráltuk a(z) ${selectedProperty.title} ingatlanra (${selectedSlot.day} ${selectedSlot.startTime}-${selectedSlot.endTime}). Amint az eladó jóváhagyja, újabb SMS-t kapsz!`
    );
  };
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [transFilter, setTransFilter] = useState<string>("all");
  const [priceMax, setPriceMax] = useState<number>(300000000);
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryText, setInquiryText] = useState("");
  // Location search (dual-mode)
  const [locationState, setLocationState] = useLocationQueryState(DEFAULT_LOCATION_STATE);

  const filteredProperties = useMemo(() => {
    return MOCK_PROPERTIES.map((p) => {
      const { matches, distanceKm } = applyLocationFilter(p.location, locationState);
      const computedDist = locationState.cityInput ? getCalculatedDistance(locationState.cityInput, p.location) : null;
      return { property: p, matches, dist: distanceKm ?? computedDist };
    }).filter(({ property: p, matches }) => {
      if (!matches) return false;
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "all" || p.type === typeFilter;
      const matchesTrans = transFilter === "all" || p.transaction === transFilter;
      const matchesPrice = p.priceNum <= priceMax;

      return matchesSearch && matchesType && matchesTrans && matchesPrice;
    }).sort((a, b) => {
      if (locationState.mode === "radius") {
        const dA = a.dist ?? 999;
        const dB = b.dist ?? 999;
        return dA - dB;
      }
      return 0;
    }).map(({ property, dist }) => ({ ...property, computedDistance: dist }));
  }, [searchQuery, typeFilter, transFilter, priceMax, locationState]);

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySent(true);
    setTimeout(() => {
      setInquirySent(false);
      setInquiryText("");
      setSelectedProperty(null);
    }, 2500);
  };

  return (
    <Layout>
      <UnifiedModuleHeader
        title="Ingatlanok & Lakhatás"
        subtitle="Eladó és kiadó lakások, családi házak, telkek és üzleti ingatlanok közvetlenül a hirdetőktől és minősített ingatlanirodáktól."
        moduleKey="realestate"
        searchPlaceholder="Keresés város, kerület vagy kulcsszó alapján (pl. Váci utca, erkélyes, Telki)"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        locationValue={locationState.cityInput}
        onLocationChange={(val) => setLocationState((prev) => ({ ...prev, cityInput: val }))}
      />

      {/* Filter and Content Grid */}
      <section className="py-8 px-4 container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                Szűrők
              </span>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setTransFilter("all");
                  setPriceMax(300000000);
                  setLocationState(DEFAULT_LOCATION_STATE);
                }}
                className="text-xs font-extrabold text-emerald-600 hover:underline"
              >
                Alaphelyzet
              </button>
            </div>

            {/* Location Search Widget */}
            <div className="border-b pb-4">
              <LocationSearchWidget
                value={locationState}
                onChange={setLocationState}
                accentColor="emerald"
                compact={true}
                label="Helyszín szűrő"
              />
            </div>

            {/* Keyword Search */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Keresőszó / Kulcsszó</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="luxus, kertes, felújított..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Kategória</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransFilter("all")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition ${
                    transFilter === "all"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Összes
                </button>
                <button
                  onClick={() => setTransFilter("sale")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition ${
                    transFilter === "sale"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Eladó
                </button>
                <button
                  onClick={() => setTransFilter("rent")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition ${
                    transFilter === "rent"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Kiadó
                </button>
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Típus</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">Összes ingatlantípus</option>
                <option value="apartment">Lakás / Garzon</option>
                <option value="house">Családi ház / Parasztház</option>
                <option value="land">Telek</option>
                <option value="commercial">Ipari / Iroda</option>
              </select>
            </div>

            {/* Price Max Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <span>Max ár</span>
                <span className="text-emerald-600">
                  {priceMax >= 300000000 ? "Bármennyi" : `${(priceMax / 1000000).toLocaleString()} M Ft`}
                </span>
              </div>
              <input
                type="range"
                min="50000"
                max="300000000"
                step="50000"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Properties Grid */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400">
                Találatok száma: <strong className="text-slate-900 dark:text-white font-black">{filteredProperties.length} db</strong>
              </span>

              {/* View Switcher: List vs Map */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  📋 Lista Nézet
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    viewMode === "map"
                      ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  🗺️ Térképes Nézet
                </button>
              </div>
            </div>

            {viewMode === "map" ? (
              <RealEstateMapSearch
                properties={filteredProperties.map((p, idx) => ({
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  priceNum: p.priceNum,
                  location: p.location,
                  typeLabel: p.typeLabel,
                  area: p.area,
                  rooms: p.rooms,
                  image: p.image,
                  lat: 48.1035 + ((idx * 0.015) % 0.1),
                  lng: 20.7784 + ((idx * 0.02) % 0.1)
                }))}
                currentCity={locationState.selectedCity || "Miskolc"}
                onSelectProperty={(prop) => {
                  const found = filteredProperties.find((p) => p.id === prop.id);
                  if (found) setSelectedProperty(found);
                }}
              />
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 border border-dashed rounded-3xl">
                <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200">Nincs a szűrésnek megfelelő ingatlan</h3>
                <p className="text-xs text-slate-500 mt-1">Próbálj meg tágabb szűrési feltételeket megadni!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProperties.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProperty(prop)}
                    className="group bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-500 transition cursor-pointer flex flex-col"
                  >
                    {/* Cover image */}
                    <div className="relative aspect-video overflow-hidden bg-slate-100">
                      <img
                        src={prop.image}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      <Badge className="absolute top-3 left-3 bg-emerald-600 text-white font-extrabold text-xs shadow-md">
                        {prop.transactionLabel}
                      </Badge>
                      <Badge className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur text-white font-bold text-xs">
                        {prop.typeLabel}
                      </Badge>
                    </div>

                    {/* Content info */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            {prop.location}
                            {(prop as any).computedDistance !== null && (prop as any).computedDistance !== undefined ? ` · 📍 ${(prop as any).computedDistance} km` : ""}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 transition leading-snug">
                          {prop.title}
                        </h3>
                      </div>

                      {/* Badges and Price row */}
                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">📐 {prop.area} m²</span>
                          <span>•</span>
                          <span>🛏️ {prop.rooms} szoba</span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {prop.price}
                          </span>
                          <span className="text-xs font-extrabold text-slate-400 hover:text-emerald-600 transition flex items-center gap-0.5">
                            Részletek <Maximize className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Property Details Dialog Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Image Header */}
            <div className="relative aspect-video bg-slate-100 shrink-0">
              <img
                src={selectedProperty.image}
                alt={selectedProperty.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80";
                }}
              />
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur hover:bg-black/70 text-white rounded-full flex items-center justify-center transition border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <Badge className="absolute top-4 left-4 bg-emerald-600 text-white font-black text-sm px-3 py-1 shadow-md">
                {selectedProperty.transactionLabel}
              </Badge>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
              
              {/* Header Title / Price */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {selectedProperty.location}
                    </span>
                    <VerificationBadge
                      verifications={{
                        email: true,
                        phone: true,
                        identity: true,
                        business: true,
                        sellerStatus: true,
                      }}
                      size="sm"
                    />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {selectedProperty.title}
                  </h2>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {selectedProperty.price}
                  </div>
                  <span className="text-xs font-bold text-slate-400">{selectedProperty.typeLabel} kategória</span>
                </div>
              </div>

              {/* Hirdetés történet (Feature 17) */}
              <ListingHistorySection
                daysAgo={12}
                priceChangePercent={-5}
                originalPrice={Math.round(selectedProperty.priceNum * 1.05)}
                currentPrice={selectedProperty.priceNum}
              />

              {/* Grid details */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 text-center">
                <div>
                  <div className="text-xs text-slate-400 font-bold">Terület</div>
                  <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-0.5">📐 {selectedProperty.area} m²</div>
                </div>
                <div className="border-x">
                  <div className="text-xs text-slate-400 font-bold">Szobák száma</div>
                  <div className="text-lg font-black text-slate-800 dark:text-slate-200 mt-0.5">🛏️ {selectedProperty.rooms} db</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold">Hirdető</div>
                  <div className="text-xs font-extrabold text-emerald-600 truncate mt-1.5" title={selectedProperty.seller}>
                    👤 {selectedProperty.seller.split(" ")[0]}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Hirdetés Leírása</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedProperty.description}
                </p>
              </div>

              {/* Környéki információk / POI (Feature 16) */}
              <NeighborhoodInfoSection locationName={selectedProperty.location} />

              {/* Hitel / Havi költség kalkulátor (Feature 15) */}
              <MortgageCalculator propertyPrice={selectedProperty.priceNum} />

              {/* Booking Scheduler Widget */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Személyes vagy Videós Megtekintés Foglalása
                </h3>

                {bookingSuccess ? (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-3xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                      <CheckCircle className="w-5 h-5" />
                      Foglalási Igény Sikeresen Rögzítve!
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold leading-relaxed">
                      Az időpontod állapota: <span className="font-black underline">Függőben</span>. Az eladó kapott egy értesítést, és amint jóváhagyja a találkozót, azonnal megkapod a visszaigazoló SMS-t a megadott számodra: <strong>{clientPhone}</strong>.
                    </p>
                    <Button 
                      type="button" 
                      onClick={() => setBookingSuccess(false)}
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl font-bold text-xs mt-1"
                    >
                      Új foglalás indítása
                    </Button>
                  </div>
                ) : otpSent ? (
                  <form onSubmit={handleVerifyOtp} className="p-5 bg-amber-50/40 dark:bg-slate-900/60 border border-amber-300 dark:border-slate-800 rounded-3xl space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1">
                        🔑 SMS OTP Visszaigazolás szükséges
                      </span>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Küldtünk egy 4-jegyű megerősítő kódot a(z) <strong>{clientPhone}</strong> telefonszámra.
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        (Mivel ez egy szimuláció, a kód megjelent a képernyő jobb felső sarkában kapott SMS értesítésben!)
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">4-Jegyű Ellenőrző Kód</label>
                      <input
                        type="text"
                        placeholder="Pl.: 1234"
                        maxLength={4}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        className="w-full p-2 border rounded-xl text-center text-sm font-black tracking-widest bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOtpSent(false)}
                        className="rounded-xl font-bold text-xs"
                      >
                        Vissza
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl font-extrabold text-xs bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        Kód Megerősítése
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Day selector tabs */}
                    <div className="flex flex-wrap gap-1.5 border-b pb-2">
                      {["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"].map((day) => {
                        const count = allSlots.filter(s => s.propertyId === selectedProperty.id && s.day === day && s.isAvailable).length;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => { setSelectedDayTab(day); setSelectedSlotId(null); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              selectedDayTab === day
                                ? "bg-emerald-600 text-white font-black"
                                : count > 0
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                                : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            <span>{day}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                              selectedDayTab === day ? "bg-white text-emerald-700" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Slots List for selected day */}
                    {allSlots.filter(s => s.propertyId === selectedProperty.id && s.day === selectedDayTab && s.isAvailable).length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                        Nincsenek szabad időpontok erre a napra. Válassz egy másik napot!
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3.5">
                        {allSlots
                          .filter(s => s.propertyId === selectedProperty.id && s.day === selectedDayTab && s.isAvailable)
                          .map((slot) => {
                            const isSelected = selectedSlotId === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setSelectedSlotId(slot.id)}
                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition ${
                                  isSelected
                                    ? "border-emerald-600 bg-emerald-50/15 ring-2 ring-emerald-500"
                                    : "bg-white dark:bg-slate-950 hover:border-slate-300"
                                }`}
                              >
                                <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1">
                                  ⏰ {slot.startTime} – {slot.endTime}
                                </span>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold shrink-0">
                                    {slot.typeLabel}
                                  </Badge>
                                  {slot.isVideoTour && (
                                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[9px] px-1 py-0 font-black shrink-0">
                                      <Video className="w-2 h-2 mr-0.5 inline" /> Videó
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}

                    {/* Booking Form Details (only visible once slot is selected) */}
                    {selectedSlotId && (
                      <form onSubmit={handleBookingSubmit} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
                        <div className="border-b pb-1.5 flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase text-emerald-600">Személyes adatok megadása</h4>
                          <span className="text-[10px] font-black text-slate-400">Lépés 1 / 2</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Teljes Név</label>
                            <input
                              type="text"
                              placeholder="Kovács Péter"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              className="w-full p-2.5 border rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Telefonszám (SMS Értesítésekhez)</label>
                            <input
                              type="tel"
                              placeholder="Pl.: +36 30 123 4567"
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              className="w-full p-2.5 border rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">E-mail Cím</label>
                          <input
                            type="email"
                            placeholder="peter@example.hu"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full p-2.5 border rounded-xl text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Időpont Foglalása & SMS OTP Igénylése
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Inquiry form */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  Kapcsolatfelvétel a hirdetővel
                </h3>

                {inquirySent ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm font-extrabold text-center flex items-center justify-center gap-2">
                    <span>✨ Az érdeklődést elküldtük a hirdetőnek! Hamarosan válaszol.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendInquiry} className="space-y-3">
                    <textarea
                      placeholder="Írj üzenetet a hirdetőnek (pl.: Mikor tekinthető meg az ingatlan?)..."
                      value={inquiryText}
                      onChange={(e) => setInquiryText(e.target.value)}
                      required
                      rows={3}
                      className="w-full p-4 border rounded-2xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-3 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedProperty(null)}
                        className="rounded-xl font-bold text-xs"
                      >
                        Mégse
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Üzenet küldése
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Report Problem Action */}
              <div className="pt-3 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 transition flex items-center gap-1.5"
                >
                  <Info className="w-3.5 h-3.5" /> Probléma jelentése
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {selectedProperty && (
        <ReportProblemModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetTitle={selectedProperty.title}
          targetId={selectedProperty.id}
          targetType="hirdetes"
        />
      )}
    </Layout>
  );
}
