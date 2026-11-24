import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { realEstateApi } from "@/lib/realEstate/api";
import {
  COMFORT_LEVELS,
  DESCRIPTION_GUIDANCE_TIPS,
  ENERGY_RATINGS,
  FLOOR_OPTIONS,
  HEATING_TYPES,
  INSULATION_OPTIONS,
  ORIENTATIONS,
  PARKING_OPTIONS,
  PROPERTY_CATEGORIES,
  PROPERTY_CONDITIONS,
  SALE_FEE_TIERS,
  VIEWS,
  calculateRealEstateListingFee,
  formatHuf,
  getCategoryConfig,
  getCategoryLabel,
  getConditionLabel,
  getSubtypeLabel,
} from "@/lib/realEstate/config";
import type {
  ExactAddress,
  PropertyCategory,
  PropertyCondition,
  PropertyPhoto,
  PropertySpecs,
  RentalTerms,
  SustainabilityInfo,
  TransactionType,
} from "@/lib/realEstate/types";
import { AddressAutocompleteField } from "@/components/realestate/AddressAutocompleteField";
import { RealEstateMediaUploader } from "@/components/realestate/RealEstateMediaUploader";
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  Info,
  Leaf,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
} from "lucide-react";

const WIZARD_STEPS = [
  { id: 0, title: "Ügylet és ár", icon: Home },
  { id: 1, title: "Cím", icon: MapPin },
  { id: 2, title: "Alapadatok", icon: Building2 },
  { id: 3, title: "Fenntarthatóság", icon: Leaf },
  { id: 4, title: "Leírás és fotók", icon: Camera },
  { id: 5, title: "Összegzés és díj", icon: CreditCard },
];

export default function RealEstateCreateWizard() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const [, setLocation] = useLocation();
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [transactionType, setTransactionType] = useState<TransactionType>("sale");
  const [category, setCategory] = useState<PropertyCategory>("apartment");
  const [subtype, setSubtype] = useState<string>("tegla");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<string>("");

  // Step 2
  const [exactAddress, setExactAddress] = useState<ExactAddress>({
    country: "Magyarország",
    postalCode: "",
    city: "",
    district: "",
    neighborhood: "",
    streetName: "",
    streetType: "utca",
    houseNumber: "",
    floorDoor: "",
    parcelNumber: "",
    latitude: null,
    longitude: null,
    showPublicStreet: false,
    viewingInstructions: "",
  });

  // Step 3
  const [specs, setSpecs] = useState<PropertySpecs>({
    condition: "good",
    hasElevator: false,
    hasGardenAccess: false,
    isAttic: false,
    isAccessible: false,
    hasAirConditioning: false,
  });
  const [rentalTerms, setRentalTerms] = useState<RentalTerms>({
    availableImmediately: true,
    furnished: "",
    equipped: "",
    petsAllowed: "",
    smokingAllowed: "",
    utilitiesIncluded: false,
  });

  // Step 4
  const [sustainability, setSustainability] = useState<SustainabilityInfo>({
    hasSolarPanel: false,
    hasHeatPump: false,
    hasModernWindows: false,
  });

  // Step 5
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [floorPlans, setFloorPlans] = useState<PropertyPhoto[]>([]);
  const [videoUrl, setVideoUrl] = useState("");

  const { data: existingProp } = useQuery({
    queryKey: ["real-estate-edit", id],
    queryFn: () => realEstateApi.getProperty(id || ""),
    enabled: Boolean(isEdit && id && isSignedIn),
  });

  useEffect(() => {
    if (!existingProp) return;
    setTransactionType(existingProp.transactionType);
    setCategory(existingProp.category);
    setSubtype(existingProp.subtype || "");
    setTitle(existingProp.title || "");
    setPrice(String(existingProp.price || ""));
    if (existingProp.exactAddress) setExactAddress(existingProp.exactAddress);
    if (existingProp.specs) setSpecs(existingProp.specs);
    if (existingProp.rentalTerms) setRentalTerms(existingProp.rentalTerms);
    if (existingProp.sustainability) setSustainability(existingProp.sustainability);
    setDescription(existingProp.description || "");
    setPhotos(existingProp.photos || []);
    setFloorPlans(existingProp.floorPlans || []);
    setVideoUrl(existingProp.videoUrl || "");
  }, [existingProp]);

  const categoryCfg = useMemo(() => getCategoryConfig(category), [category]);
  const numericPrice = Math.max(0, Math.round(Number(price) || 0));
  const feeCalc = useMemo(
    () => calculateRealEstateListingFee(transactionType, numericPrice),
    [transactionType, numericPrice],
  );

  const handleCategoryChange = (nextCat: PropertyCategory) => {
    setCategory(nextCat);
    const cfg = getCategoryConfig(nextCat);
    setSubtype(cfg.subtypes[0]?.value || "");
  };

  const validateCurrentStep = (): boolean => {
    if (step === 0) {
      if (title.trim().length < 5) {
        toast({ title: "A hirdetés címe legalább 5 karakter legyen.", variant: "destructive" });
        return false;
      }
      if (!numericPrice || numericPrice < 1000) {
        toast({ title: "Adj meg érvényes árat (legalább 1 000 Ft).", variant: "destructive" });
        return false;
      }
    }
    if (step === 1) {
      if (!exactAddress.postalCode.trim() || !exactAddress.city.trim()) {
        toast({
          title: "Hiányzó címadatok",
          description: "Az irányítószám és a település megadása kötelező.",
          variant: "destructive",
        });
        return false;
      }
      if (exactAddress.city.trim().toLowerCase() === "budapest" && !exactAddress.district) {
        toast({ title: "Budapest esetén a kerület megadása kötelező.", variant: "destructive" });
        return false;
      }
    }
    if (step === 4) {
      if (description.trim().length < 20) {
        toast({ title: "Az ingatlan bemutatása legalább 20 karakter legyen.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = (submitForPayment: boolean) => ({
    ownerName: user?.fullName || user?.username || "ILOLIT hirdető",
    transactionType,
    category,
    subtype,
    title: title.trim(),
    description: description.trim(),
    price: numericPrice,
    exactAddress,
    specs,
    sustainability,
    rentalTerms: transactionType === "rent" ? { ...rentalTerms, monthlyRent: numericPrice } : undefined,
    photos,
    floorPlans,
    videoUrl,
    submitForPayment,
  });

  const handleSave = async (mode: "draft" | "pay" | "test") => {
    if (!isSignedIn) {
      toast({ title: "A hirdetésfeladáshoz jelentkezz be.", variant: "destructive" });
      return;
    }
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    try {
      let savedId = id || "";
      if (isEdit && id) {
        const updated = await realEstateApi.updateProperty(id, buildPayload(mode === "pay"));
        savedId = updated.id;
      } else {
        const created = await realEstateApi.createProperty(buildPayload(mode === "pay"));
        savedId = created.id;
      }

      if (mode === "test") {
        await realEstateApi.testActivateProperty(savedId);
        toast({
          title: "Teszt aktiválás kész (fizetés nélkül)",
          description: "Megnyitjuk a Saját Ingatlan Admin felületet.",
        });
        setLocation(`/real-estate/admin/${savedId}`);
        return;
      }

      if (mode === "draft" || (isEdit && existingProp?.status === "ACTIVE")) {
        toast({ title: isEdit ? "Módosítások mentve" : "Hirdetés piszkozatként elmentve" });
        setLocation(`/real-estate/admin/${savedId}`);
        return;
      }

      // Trigger mandatory Stripe payment checkout for activation
      const checkout = await realEstateApi.startListingCheckout(savedId);
      if (checkout.activated) {
        toast({ title: "Ingatlanhirdetés aktiválva – megnyitjuk a Saját Ingatlan Admint" });
        setLocation(`/real-estate/admin/${savedId}`);
        return;
      }
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }
      toast({ title: "Hirdetés mentve (fizetésre vár)", description: "A Saját Ingatlan Adminban tudod befejezni a fizetést." });
      setLocation(`/real-estate/admin/${savedId}`);
    } catch (err: any) {
      toast({
        title: "Mentési / fizetési hiba",
        description: err?.message || "Ellenőrizd a megadott adatokat, és próbáld újra.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15";

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Home className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-2xl font-black text-slate-950">Ingatlanhirdetés feladása</h1>
          <p className="mt-2 text-sm text-slate-600">
            A hirdetésfeladáshoz és a Saját Ingatlan Admin eléréséhez jelentkezz be az ILOLIT fiókodba.
          </p>
          <Button asChild className="mt-6 h-11 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700">
            <Link href="/auth/login">Bejelentkezés</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-20">
        {/* Top bar */}
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Link
              href={isEdit && id ? `/real-estate/admin/${id}` : "/real-estate"}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              {isEdit ? "Vissza a Saját Ingatlan Adminba" : "Vissza az ingatlanokhoz"}
            </Link>
            <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              {isEdit ? "Ingatlanhirdetés szerkesztése" : "Új ingatlanhirdetés feladása"}
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Professzionális ingatlan-adatlap · Védett lakcímkezelés · Aktiválás után Saját Ingatlan Admin és
              megtekintési időpontkezelő
            </p>

            {/* Step progress bar */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {WIZARD_STEPS.map((s) => {
                const Icon = s.icon;
                const done = s.id < step;
                const active = s.id === step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => (s.id < step || isEdit ? setStep(s.id) : undefined)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : done
                        ? "cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            {/* ── STEP 0: Transaction type, category, subtype, price & live fee ── */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">1. Ügylet típusa és ingatlankategória</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    A választás alapján a későbbi mezők és a hirdetési díj automatikusan igazodnak.
                  </p>
                </div>

                {/* Eladó / Kiadó */}
                <div>
                  <span className="block text-xs font-bold text-slate-700">Ügylet típusa *</span>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {[
                      { value: "sale", label: "Eladó", desc: "Ingatlan értékesítése vételárral" },
                      { value: "rent", label: "Kiadó", desc: "Hosszú távú kiadás havi bérleti díjjal" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTransactionType(opt.value as TransactionType)}
                        className={`rounded-2xl border-2 p-4 text-left transition ${
                          transactionType === opt.value
                            ? "border-emerald-600 bg-emerald-50/70"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-sm font-bold text-slate-950">{opt.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main categories (10) */}
                <div>
                  <span className="block text-xs font-bold text-slate-700">Ingatlan fő kategóriája *</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {PROPERTY_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleCategoryChange(c.value)}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                          category === c.value
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic subtypes */}
                <div>
                  <span className="block text-xs font-bold text-slate-700">
                    {categoryCfg.label} altípusa *
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categoryCfg.subtypes.map((sub) => (
                      <button
                        key={sub.value}
                        type="button"
                        onClick={() => setSubtype(sub.value)}
                        className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                          subtype === sub.value
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title & Price */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
                    Hirdetés címe *
                    <input
                      type="text"
                      maxLength={140}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={
                        transactionType === "rent"
                          ? "pl. Világos, erkélyes 2 szobás lakás Angyalföldön"
                          : "pl. Felújított, panorámás 3 szobás téglalakás csendes utcában"
                      }
                      className={inputCls}
                      required
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
                    {transactionType === "rent" ? "Havi bérleti díj (Ft / hó) *" : "Vételár (Ft) *"}
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={transactionType === "rent" ? "pl. 240000" : "pl. 59000000"}
                      className={inputCls}
                      required
                    />
                  </label>
                </div>

                {/* Transparent automatic ILOLIT listing fee box */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900/70">
                        Ingatlan hirdetési ára
                      </p>
                      <p className="mt-0.5 text-xl font-black text-slate-950">
                        {numericPrice > 0 ? formatHuf(numericPrice) : "Add meg az árat"}
                        {transactionType === "rent" && numericPrice > 0 ? " / hó" : ""}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900/70">
                        ILOLIT hirdetési díj
                      </p>
                      <p className="mt-0.5 text-2xl font-black text-emerald-700">{formatHuf(feeCalc.fee)}</p>
                      <p className="text-[11px] font-semibold text-emerald-900/80">{feeCalc.tierLabel}</p>
                    </div>
                  </div>
                  <p className="mt-3 border-t border-emerald-200/80 pt-3 text-xs text-emerald-950/80">
                    A hirdetési díjat a rendszer automatikusan számolja az ingatlan ára alapján. A sikeres fizetés
                    után aktiválódik a hirdetésed, és automatikusan megnyílik a <strong>Saját Ingatlan Admin</strong>{" "}
                    felület a megtekintési időpontok kezeléséhez.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 1: Structured Address ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">2. Cím megadása</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Add meg az ingatlan teljes címét a rendszer számára. A pontos cím védett marad.
                  </p>
                </div>
                <AddressAutocompleteField
                  value={exactAddress}
                  onChange={setExactAddress}
                  showParcelNumber={true}
                />
              </div>
            )}

            {/* ── STEP 2: Property Specs, Condition & Rental Extra Fields ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">3. Ingatlan alapadatai és állapota</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    A mezők a kiválasztott ingatlantípushoz ({categoryCfg.label}) igazodnak.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Hasznos alapterület (m²)
                    <input
                      type="number"
                      min={1}
                      value={specs.usableAreaSqm ?? ""}
                      onChange={(e) => setSpecs({ ...specs, usableAreaSqm: e.target.value ? Number(e.target.value) : null })}
                      placeholder="pl. 68"
                      className={inputCls}
                    />
                  </label>

                  {(categoryCfg.hasPlotArea || category === "other") && (
                    <label className="block text-xs font-bold text-slate-700">
                      Telekterület (m²)
                      <input
                        type="number"
                        min={1}
                        value={specs.plotAreaSqm ?? ""}
                        onChange={(e) => setSpecs({ ...specs, plotAreaSqm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="pl. 650"
                        className={inputCls}
                      />
                    </label>
                  )}

                  {categoryCfg.hasRooms && (
                    <label className="block text-xs font-bold text-slate-700">
                      Erkély / terasz mérete (m²)
                      <input
                        type="number"
                        min={0}
                        value={specs.balconyAreaSqm ?? ""}
                        onChange={(e) => setSpecs({ ...specs, balconyAreaSqm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="pl. 8"
                        className={inputCls}
                      />
                    </label>
                  )}

                  {categoryCfg.hasRooms && (
                    <>
                      <label className="block text-xs font-bold text-slate-700">
                        Szobák száma
                        <input
                          type="number"
                          min={0}
                          value={specs.rooms ?? ""}
                          onChange={(e) => setSpecs({ ...specs, rooms: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 2"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Félszobák száma
                        <input
                          type="number"
                          min={0}
                          value={specs.halfRooms ?? ""}
                          onChange={(e) => setSpecs({ ...specs, halfRooms: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 1"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Fürdőszobák száma
                        <input
                          type="number"
                          min={0}
                          value={specs.bathrooms ?? ""}
                          onChange={(e) => setSpecs({ ...specs, bathrooms: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 1"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        WC-k száma
                        <input
                          type="number"
                          min={0}
                          value={specs.toilets ?? ""}
                          onChange={(e) => setSpecs({ ...specs, toilets: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 1"
                          className={inputCls}
                        />
                      </label>
                    </>
                  )}

                  {categoryCfg.hasFloor && (
                    <label className="block text-xs font-bold text-slate-700">
                      Emelet
                      <select
                        value={specs.floor || ""}
                        onChange={(e) => setSpecs({ ...specs, floor: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">Válassz...</option>
                        {FLOOR_OPTIONS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {category !== "land" && category !== "agricultural" && (
                    <>
                      <label className="block text-xs font-bold text-slate-700">
                        Épület szintjeinek száma
                        <input
                          type="text"
                          value={specs.buildingLevels || ""}
                          onChange={(e) => setSpecs({ ...specs, buildingLevels: e.target.value })}
                          placeholder="pl. 4"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Belmagasság (cm)
                        <input
                          type="number"
                          min={180}
                          max={800}
                          value={specs.ceilingHeightCm ?? ""}
                          onChange={(e) => setSpecs({ ...specs, ceilingHeightCm: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 270"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Építés éve
                        <input
                          type="number"
                          min={1800}
                          max={2035}
                          value={specs.yearBuilt ?? ""}
                          onChange={(e) => setSpecs({ ...specs, yearBuilt: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 2018"
                          className={inputCls}
                        />
                      </label>
                    </>
                  )}

                  <label className="block text-xs font-bold text-slate-700">
                    Ingatlan állapota
                    <select
                      value={specs.condition || "good"}
                      onChange={(e) => setSpecs({ ...specs, condition: e.target.value as PropertyCondition })}
                      className={inputCls}
                    >
                      {PROPERTY_CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </label>

                  {categoryCfg.hasRooms && (
                    <>
                      <label className="block text-xs font-bold text-slate-700">
                        Komfortfokozat
                        <select
                          value={specs.comfortLevel || ""}
                          onChange={(e) => setSpecs({ ...specs, comfortLevel: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">Válassz...</option>
                          {COMFORT_LEVELS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Tájolás
                        <select
                          value={specs.orientation || ""}
                          onChange={(e) => setSpecs({ ...specs, orientation: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">Válassz...</option>
                          {ORIENTATIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Kilátás
                        <select
                          value={specs.view || ""}
                          onChange={(e) => setSpecs({ ...specs, view: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">Válassz...</option>
                          {VIEWS.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

                  <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
                    Parkolás
                    <select
                      value={specs.parking || ""}
                      onChange={(e) => setSpecs({ ...specs, parking: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Válassz...</option>
                      {PARKING_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Boolean feature flags */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-5">
                  {[
                    { key: "hasElevator", label: "Lift" },
                    { key: "hasGardenAccess", label: "Kertkapcsolat" },
                    { key: "isAttic", label: "Tetőtéri" },
                    { key: "isAccessible", label: "Akadálymentesített" },
                    { key: "hasAirConditioning", label: "Légkondicionáló" },
                  ].map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean((specs as any)[item.key])}
                        onChange={(e) => setSpecs({ ...specs, [item.key]: e.target.checked })}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>

                {/* Extra rental-only fields */}
                {transactionType === "rent" && (
                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Kiadó ingatlan további feltételei</h3>
                      <p className="text-xs text-slate-500">Albérlet / bérbeadás esetén fontos adatok a bérlőknek.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <label className="block text-xs font-bold text-slate-700">
                        Kaució összege (Ft)
                        <input
                          type="number"
                          min={0}
                          value={rentalTerms.depositAmount ?? ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, depositAmount: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 480000"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Minimum bérleti idő (hónap)
                        <input
                          type="number"
                          min={1}
                          value={rentalTerms.minRentalMonths ?? ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, minRentalMonths: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 12"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Maximális lakók száma
                        <input
                          type="number"
                          min={1}
                          value={rentalTerms.maxOccupants ?? ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, maxOccupants: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 2"
                          className={inputCls}
                        />
                      </label>

                      <label className="block text-xs font-bold text-slate-700">
                        Bútorozott-e?
                        <select
                          value={rentalTerms.furnished || ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, furnished: e.target.value as any })}
                          className={inputCls}
                        >
                          <option value="">Válassz...</option>
                          <option value="yes">Bútorozott</option>
                          <option value="partial">Részben bútorozott</option>
                          <option value="no">Bútorozatlan</option>
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Gépesített-e?
                        <select
                          value={rentalTerms.equipped || ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, equipped: e.target.value as any })}
                          className={inputCls}
                        >
                          <option value="">Válassz...</option>
                          <option value="yes">Gépesített</option>
                          <option value="partial">Részben gépesített</option>
                          <option value="no">Gépesítetlen</option>
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Kisállat engedélyezett?
                        <select
                          value={rentalTerms.petsAllowed || ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, petsAllowed: e.target.value as any })}
                          className={inputCls}
                        >
                          <option value="">Válassz...</option>
                          <option value="yes">Igen</option>
                          <option value="negotiable">Megbeszélés szerint</option>
                          <option value="no">Nem</option>
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Dohányzás engedélyezett?
                        <select
                          value={rentalTerms.smokingAllowed || ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, smokingAllowed: e.target.value as any })}
                          className={inputCls}
                        >
                          <option value="">Válassz...</option>
                          <option value="no">Nem</option>
                          <option value="balcony_only">Csak erkélyen / udvaron</option>
                          <option value="yes">Igen</option>
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Közös költség (Ft / hó)
                        <input
                          type="number"
                          min={0}
                          value={rentalTerms.commonCost ?? ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, commonCost: e.target.value ? Number(e.target.value) : null })}
                          placeholder="pl. 18000"
                          className={inputCls}
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-700">
                        Parkolási lehetőség részletei
                        <input
                          type="text"
                          value={rentalTerms.parkingDetails || ""}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, parkingDetails: e.target.value })}
                          placeholder="pl. Teremgarázs bérelhető"
                          className={inputCls}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                      <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(rentalTerms.availableImmediately)}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, availableImmediately: e.target.checked })}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        Azonnal költözhető
                      </label>
                      {!rentalTerms.availableImmediately && (
                        <label className="flex items-center gap-2 font-semibold text-slate-700">
                          Költözés dátuma:
                          <input
                            type="date"
                            value={rentalTerms.availableFromDate || ""}
                            onChange={(e) => setRentalTerms({ ...rentalTerms, availableFromDate: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
                          />
                        </label>
                      )}
                      <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(rentalTerms.utilitiesIncluded)}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, utilitiesIncluded: e.target.checked })}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        Rezsi benne van a bérleti díjban
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Sustainability & Utilities (Optional) ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                    <Leaf className="h-5 w-5 text-emerald-600" />
                    4. Fenntarthatóság és rezsi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Minden mező opcionális – csak azokat töltsd ki, amelyek rendelkezésre állnak.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Fűtés típusa
                    <select
                      value={sustainability.heatingType || ""}
                      onChange={(e) => setSustainability({ ...sustainability, heatingType: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Válassz...</option>
                      {HEATING_TYPES.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Energetikai tanúsítvány besorolása
                    <select
                      value={sustainability.energyRating || ""}
                      onChange={(e) => setSustainability({ ...sustainability, energyRating: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Válassz...</option>
                      {ENERGY_RATINGS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Átlagos gázfogyasztás
                    <input
                      type="text"
                      value={sustainability.avgGasConsumption || ""}
                      onChange={(e) => setSustainability({ ...sustainability, avgGasConsumption: e.target.value })}
                      placeholder="pl. 85 m³ / hó vagy 12 000 Ft / hó"
                      className={inputCls}
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Átlagos áramfogyasztás
                    <input
                      type="text"
                      value={sustainability.avgElectricityConsumption || ""}
                      onChange={(e) => setSustainability({ ...sustainability, avgElectricityConsumption: e.target.value })}
                      placeholder="pl. 180 kWh / hó vagy 8 500 Ft / hó"
                      className={inputCls}
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Becsült havi rezsi (Ft / hó)
                    <input
                      type="number"
                      min={0}
                      value={sustainability.estimatedMonthlyUtilities ?? ""}
                      onChange={(e) => setSustainability({ ...sustainability, estimatedMonthlyUtilities: e.target.value ? Number(e.target.value) : null })}
                      placeholder="pl. 35000"
                      className={inputCls}
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Közös költség (Ft / hó)
                    <input
                      type="number"
                      min={0}
                      value={sustainability.commonCost ?? ""}
                      onChange={(e) => setSustainability({ ...sustainability, commonCost: e.target.value ? Number(e.target.value) : null })}
                      placeholder="pl. 18500"
                      className={inputCls}
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
                    Szigetelés
                    <select
                      value={sustainability.insulation || ""}
                      onChange={(e) => setSustainability({ ...sustainability, insulation: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Válassz...</option>
                      {INSULATION_OPTIONS.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
                  {[
                    { key: "hasSolarPanel", label: "Napelem" },
                    { key: "hasHeatPump", label: "Hőszivattyú" },
                    { key: "hasModernWindows", label: "Korszerű nyílászárók" },
                  ].map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean((sustainability as any)[item.key])}
                        onChange={(e) => setSustainability({ ...sustainability, [item.key]: e.target.checked })}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>

                <label className="block text-xs font-bold text-slate-700">
                  Egyéb energiahatékonysági jellemző
                  <input
                    type="text"
                    value={sustainability.otherEnergyFeatures || ""}
                    onChange={(e) => setSustainability({ ...sustainability, otherEnergyFeatures: e.target.value })}
                    placeholder="pl. Hővisszanyerős szellőztetés, okos termosztát"
                    className={inputCls}
                  />
                </label>
              </div>
            )}

            {/* ── STEP 4: Description + Photos + Floorplans ── */}
            {step === 4 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      5. Ingatlan bemutatása
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Írd le pontosan, valós adatok alapján az ingatlan előnyeit és környezetét.
                    </p>
                  </div>

                  {/* Structured writing tips */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Info className="h-4 w-4 text-emerald-600" />
                      Mit érdemes megemlíteni a bemutatásban?
                    </p>
                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {DESCRIPTION_GUIDANCE_TIPS.map((tip) => (
                        <div key={tip.key} className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs">
                          <span className="font-bold text-slate-900">{tip.title}: </span>
                          <span className="text-slate-600">{tip.hint}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="block text-xs font-bold text-slate-700">
                    Ingatlan részletes leírása *
                    <textarea
                      rows={7}
                      maxLength={8000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mutasd be az ingatlan elrendezését, műszaki állapotát, a környéket és a költözhetőséget..."
                      className={inputCls}
                      required
                    />
                    <span className="mt-1 block text-right text-[11px] font-normal text-slate-400">
                      {description.length} / 8000 karakter
                    </span>
                  </label>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <RealEstateMediaUploader
                    photos={photos}
                    onPhotosChange={setPhotos}
                    floorPlans={floorPlans}
                    onFloorPlansChange={setFloorPlans}
                    videoUrl={videoUrl}
                    onVideoChange={setVideoUrl}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 5: Summary, Pricing Tier & Payment ── */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">6. Összegzés és hirdetési díj</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Ellenőrizd az adatokat. A sikeres fizetés után a hirdetés azonnal aktívvá válik, és megnyílik a
                    Saját Ingatlan Admin.
                  </p>
                </div>

                {/* Summary grid */}
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-xs font-bold text-slate-500">Hirdetés címe</span>
                    <p className="mt-0.5 font-bold text-slate-950">{title}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500">Ügylet / kategória</span>
                    <p className="mt-0.5 font-bold text-slate-950">
                      {transactionType === "rent" ? "Kiadó" : "Eladó"} · {getCategoryLabel(category)}
                      {subtype ? ` (${getSubtypeLabel(category, subtype)})` : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500">Publikus helyszín</span>
                    <p className="mt-0.5 font-bold text-slate-950">
                      {exactAddress.city}
                      {exactAddress.district ? `, ${exactAddress.district}` : ""}
                      {exactAddress.neighborhood ? `, ${exactAddress.neighborhood}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      Pontos cím ({exactAddress.streetName} {exactAddress.streetType} {exactAddress.houseNumber}) rejtve marad.
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500">Műszaki adatok / fotók</span>
                    <p className="mt-0.5 font-bold text-slate-950">
                      {specs.usableAreaSqm ? `${specs.usableAreaSqm} m²` : "—"} ·{" "}
                      {getConditionLabel(specs.condition)} · {photos.length} fotó, {floorPlans.length} alaprajz
                    </p>
                  </div>
                </div>

                {/* Mandatory Fee Breakdown */}
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Ingatlan hirdetési ára
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {formatHuf(numericPrice)}
                        {transactionType === "rent" ? " / hó" : ""}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        ILOLIT hirdetési díj
                      </p>
                      <p className="mt-1 text-3xl font-black text-emerald-700">{formatHuf(feeCalc.fee)}</p>
                      <p className="text-xs font-semibold text-emerald-900/80">{feeCalc.tierLabel}</p>
                    </div>
                  </div>

                  {transactionType === "sale" && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-emerald-200 pt-4 text-xs sm:grid-cols-4">
                      {SALE_FEE_TIERS.map((tier) => (
                        <div
                          key={tier.range}
                          className={`rounded-xl border p-2.5 ${
                            feeCalc.fee === tier.fee
                              ? "border-emerald-600 bg-white font-bold text-emerald-800"
                              : "border-emerald-200/60 bg-white/50 text-slate-500"
                          }`}
                        >
                          <p className="text-[11px]">{tier.range}</p>
                          <p className="mt-0.5 font-black">{formatHuf(tier.fee)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-start gap-2 text-xs text-emerald-950/80">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>
                      A díj tartalmazza a hirdetés aktiválását és a teljes <strong>Saját Ingatlan Admin</strong>{" "}
                      felületet (megtekintési időpontkezelő, SMS-ellenőrzött érdeklődő-jóváhagyás, védett címmegosztás
                      és statisztikák).
                    </span>
                  </div>
                </div>

                {/* Final submit buttons */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleSave("draft")}
                    className="h-12 rounded-xl border-slate-300 px-5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isEdit && existingProp?.status === "ACTIVE" ? "Módosítások mentése" : "Mentés piszkozatként"}
                  </Button>

                  {!(isEdit && existingProp?.status === "ACTIVE") && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => handleSave("test")}
                        className="h-12 rounded-xl border-emerald-300 bg-emerald-50 px-5 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Teszt aktiválás (fizetés nélkül)
                      </Button>

                      <Button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSave("pay")}
                        className="h-12 flex-1 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        {submitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        {feeCalc.fee > 0
                          ? `Fizetés és aktiválás (${formatHuf(feeCalc.fee)})`
                          : "Hirdetés aktiválása"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || submitting}
                onClick={goPrev}
                className="rounded-xl border-slate-300 text-xs font-bold"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Előző lépés
              </Button>
              {step < WIZARD_STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Tovább
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <span className="text-xs font-semibold text-slate-500">Utolsó lépés</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
