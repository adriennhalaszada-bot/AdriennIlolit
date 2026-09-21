import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/Layout";
import {
  useCreateListing, useUpdateListing, useGetListing, getGetListingQueryKey,
  useGetCategories, getGetCategoriesQueryKey,
  useGetMe, getGetMeQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONDITIONS } from "@/lib/constants";
import { Textarea } from "@/components/ui/textarea";
import { Gavel, Handshake, ShoppingBag, Truck, MapPin, Package, ChevronRight, ChevronLeft, Check, Tag, Star, X } from "lucide-react";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { cn } from "@/lib/utils";
import { validateListingContent } from "@/lib/contentValidator";
import { getSortedCategoryTree } from "@/data/categoriesData";

const COLORS = [
  { value: "fehér", label: "Fehér", hex: "#F9FAFB", border: true },
  { value: "fekete", label: "Fekete", hex: "#111827" },
  { value: "szürke", label: "Szürke", hex: "#9CA3AF" },
  { value: "sötétkék", label: "Sötétkék", hex: "#1e3a5f" },
  { value: "piros", label: "Piros", hex: "#EF4444" },
  { value: "kék", label: "Kék", hex: "#3B82F6" },
  { value: "zöld", label: "Zöld", hex: "#22C55E" },
  { value: "sárga", label: "Sárga", hex: "#EAB308" },
  { value: "rózsaszín", label: "Rózsaszín", hex: "#EC4899" },
  { value: "lila", label: "Lila", hex: "#A855F7" },
  { value: "narancssárga", label: "Narancssárga", hex: "#F97316" },
  { value: "barna", label: "Barna", hex: "#92400E" },
  { value: "bézs", label: "Bézs", hex: "#D4B896" },
  { value: "arany", label: "Arany", hex: "#D97706" },
];

const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "34", "36", "38", "40", "42", "44", "46", "48", "50"];
const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"];

const SHIPPING_MODES = [
  { value: "loloit_shipping", label: "Lolit Foxpost", description: "Csomagautomatás feladás és átvétel, nyomkövetéssel", price: "990–1290 Ft", icon: Package },
  { value: "own_courier", label: "Lolit GLS / Magyar Posta", description: "Házhoz szállítás vagy postai feladás", price: "890–1590 Ft", icon: Truck },
  { value: "local_pickup", label: "Személyes átvétel", description: "Egyezz meg a vevővel a helyszínben", price: "Ingyenes", icon: MapPin },
];

const SHIPPING_SIZES = [
  { value: "S", label: "S méret", description: "Kis csomag, pl. ruha, kiegészítő" },
  { value: "M", label: "M méret", description: "Közepes csomag, pl. cipő, táska" },
  { value: "L", label: "L méret", description: "Nagy csomag, pl. kabát, kis háztartási cikk" },
  { value: "XL", label: "XL méret", description: "Extra nagy csomag, pl. bútor, gép" },
];

const LISTING_TYPES = [
  { value: "DIRECT", label: "🛒 Fix áras eladás", description: "Azonnali vásárlás rögzített áron", icon: ShoppingBag },
  { value: "AUCTION", label: "🔨 Licit (Aukció)", description: "Kezdőár megadása, a vevők licitálnak az aukción", icon: Gavel },
  { value: "NEGOTIABLE", label: "🤝 Lolit Deal (Alkudható / Lolit díj)", description: "Alkudható ár, a vevők ajánlatot tehetnek a termékedre", icon: Handshake },
];

const POPULAR_BRANDS = [
  "Zara", "H&M", "Mango", "Reserved", "Massimo Dutti", "Tommy Hilfiger",
  "Calvin Klein", "Levis", "Nike", "Adidas", "Puma", "New Balance",
  "Guess", "Ralph Lauren", "Michael Kors", "Apple", "Samsung", "Sony",
  "IKEA", "Zara Home", "Pull&Bear", "Bershka",
];

const CLOTHING_SLUGS = ["noi-ruha", "ferfi-ruha", "gyerekruha", "cipo", "kiegeszitok", "baba-felszereles", "sport-es-szabadido"];

const schema = z.object({
  title: z.string().min(3, "Legalább 3 karakter").max(100, "Max. 100 karakter"),
  description: z.string().min(10, "Legalább 10 karakter").max(5000, "Max. 5000 karakter"),
  price: z.coerce.number().min(100, "Minimum 100 Ft").max(1000000, "Maximum 1.000.000 Ft").optional(),
  condition: z.enum(["NEW_WITH_TAG", "NEW_WITHOUT_TAG", "VERY_GOOD", "GOOD", "ACCEPTABLE"]),
  categoryId: z.string().min(1, "Kötelező"),
  subcategoryId: z.string().nullable().optional(),
  listingType: z.enum(["DIRECT", "AUCTION", "NEGOTIABLE"]).default("DIRECT"),
  brand: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  shippingModes: z.array(z.string()).default([]),
  bundleDiscountPercent: z.coerce.number().min(1).max(50).nullable().optional(),
  images: z.array(z.string()).default([]),
  auctionStartingPrice: z.coerce.number().min(0).optional(),
  auctionMinBidIncrement: z.coerce.number().min(1).optional(),
  auctionEndsAt: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.listingType === "AUCTION") {
    if (data.auctionStartingPrice == null || data.auctionStartingPrice < 100) {
      ctx.addIssue({ code: "custom", path: ["auctionStartingPrice"], message: "Minimum 100 Ft" });
    }
    if (!data.auctionEndsAt) {
      ctx.addIssue({ code: "custom", path: ["auctionEndsAt"], message: "Kötelező megadni az aukció végét" });
    }
  } else if (data.price == null) {
    ctx.addIssue({ code: "custom", path: ["price"], message: "Minimum 100 Ft" });
  }
});

const STEPS = [
  { id: 0, label: "Fotók", icon: "📸" },
  { id: 1, label: "Alapadatok", icon: "📝" },
  { id: 2, label: "Részletek", icon: "🏷️" },
  { id: 3, label: "Szállítás", icon: "📦" },
];

function LolitTopModal({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selected, setSelected] = useState<"1" | "7" | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);

  const handleSkip = () => {
    onClose();
    setLocation(`/product/${listingId}`);
  };

  const handlePromote = async () => {
    if (!selected || isStartingPayment) return;
    setIsStartingPayment(true);
    try {
      const result = await customFetch<{ checkoutUrl: string }>("/api/billing/listing-promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, days: Number(selected) }),
      });
      if (!result.checkoutUrl) throw new Error("A Stripe fizetési oldal nem indítható.");
      window.location.assign(result.checkoutUrl);
    } catch (error: any) {
      toast({ title: "A kiemelés nem indítható", description: error?.message || "Próbáld újra később.", variant: "destructive" });
      setIsStartingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="font-bold text-lg">Lolit Top kiemelés</h2>
          </div>
          <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Tűnj ki a többi hirdetés közül! A kiemelt termékek jobban láthatók a keresési találatok és a hírfolyam között.
        </p>

        <div className="space-y-3 mb-6">
          {[
            { key: "1", days: "1 nap", price: "199 Ft", daily: "199 Ft/nap" },
            { key: "7", days: "7 nap", price: "990 Ft", daily: "141 Ft/nap", popular: true },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelected(opt.key as "1" | "7")}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                selected === opt.key ? "border-amber-400 bg-amber-50" : "border-border hover:border-amber-300"
              )}
            >
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {opt.days}
                  {opt.popular && (
                    <span className="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-bold">
                      Legnépszerűbb
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{opt.daily}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{opt.price}</div>
                <div className={cn("w-5 h-5 rounded-full border-2 ml-auto mt-1 flex items-center justify-center",
                  selected === opt.key ? "border-amber-400 bg-amber-400" : "border-muted-foreground"
                )}>
                  {selected === opt.key && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleSkip}>
            Kihagyom
          </Button>
          <Button
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-black font-semibold"
            disabled={!selected || isStartingPayment}
            onClick={handlePromote}
          >
            <Star className="w-4 h-4 mr-1" /> {isStartingPayment ? "Stripe megnyitása…" : "Kiemelem"}
          </Button>
        </div>
        <p className="text-[11px] text-center text-muted-foreground mt-3">Biztonságos bankkártyás fizetés a Stripe oldalán.</p>
      </div>
    </div>
  );
}

export function Sell() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const [step, setStep] = useState(0);
  const [customSize, setCustomSize] = useState("");
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [bundleEnabled, setBundleEnabled] = useState(false);
  const [shippingSize, setShippingSize] = useState("");
  const [courierPrice, setCourierPrice] = useState("");
  const [showLolitTop, setShowLolitTop] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");

  const { data: listing } = useGetListing(id || "", {
    query: { enabled: isEdit, queryKey: getGetListingQueryKey(id || "") }
  });

  const { data: allCategories } = useGetCategories({
    query: { queryKey: getGetCategoriesQueryKey() }
  });

  const createListing = useCreateListing();
  const updateListing = useUpdateListing();

  const { data: me } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });
  const username = (me as any)?.username;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      price: "" as unknown as number,
      condition: "VERY_GOOD" as const,
      categoryId: "",
      subcategoryId: null as string | null,
      listingType: "DIRECT" as const,
      brand: "",
      size: "",
      color: "",
      shippingModes: [] as string[],
      bundleDiscountPercent: null as number | null,
      images: [] as string[],
      auctionStartingPrice: undefined,
      auctionMinBidIncrement: 100,
      auctionEndsAt: "",
    },
    values: isEdit && listing ? {
      title: listing?.title || "",
      description: listing?.description || "",
      price: listing?.price ?? ("" as unknown as number),
      condition: (listing?.condition || "VERY_GOOD") as any,
      categoryId: listing?.categoryId || "",
      subcategoryId: (listing as any)?.subcategoryId || null,
      listingType: ((listing as any)?.listingType || "DIRECT") as any,
      brand: listing?.brand || "",
      size: listing?.size || "",
      color: listing?.color || "",
      shippingModes: (listing as any)?.shippingModes || [],
      bundleDiscountPercent: (listing as any)?.bundleDiscountPercent || null,
      images: listing?.images?.map((i: any) => i.url) || [],
      auctionStartingPrice: undefined,
      auctionMinBidIncrement: 100,
      auctionEndsAt: "",
    } : undefined,
  });

  const listingType = form.watch("listingType");
  const shippingModes = form.watch("shippingModes") as string[];
  const selectedColor = form.watch("color");
  const selectedCategoryId = form.watch("categoryId");

  // The categories endpoint can return either a plain array or a paginated
  // object.  Older mobile sessions may also have a non-array response cached.
  // Never call Array methods on the raw response directly.
  const apiCategoryItems = Array.isArray(allCategories)
    ? allCategories
    : Array.isArray((allCategories as any)?.items)
      ? (allCategories as any).items
      : Array.isArray((allCategories as any)?.data)
        ? (allCategories as any).data
        : [];
  const categories = apiCategoryItems.length > 0
    ? apiCategoryItems
    : getSortedCategoryTree().map((category) => ({
        ...category,
        subcategories: category.children ?? [],
      }));

  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);
  const subcategories: any[] = (selectedCategory as any)?.subcategories ?? [];
  const selectedSubcategoryId = form.watch("subcategoryId");
  const selectedSubcategory = subcategories.find((c: any) => c.id === selectedSubcategoryId);
  const showSize = CLOTHING_SLUGS.includes(selectedCategory?.slug ?? "");
  const isShoeCategory = selectedCategory?.slug === "cipo";

  const toggleShippingMode = (mode: string) => {
    const current = shippingModes || [];
    if (current.includes(mode)) {
      form.setValue("shippingModes", current.filter((m) => m !== mode));
    } else {
      form.setValue("shippingModes", [...current, mode]);
    }
  };

  const validateStep = async (currentStep: number): Promise<boolean> => {
    if (currentStep === 1) {
      return await form.trigger(["title", "condition", "categoryId"]);
    }
    if (currentStep === 2) {
      if (listingType === "AUCTION") {
        return await form.trigger(["description", "auctionStartingPrice", "auctionEndsAt"]);
      }
      return await form.trigger(["description", "price"]);
    }
    return true;
  };

  const goNext = async () => {
    const valid = await validateStep(step);
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = (data: any) => {
    // 1. Blacklist Validator for forbidden items/keywords
    const validation = validateListingContent(data.title, data.description, selectedCategory?.name);
    if (!validation.isValid) {
      toast({
        title: "⚠️ Tiltott tartalom észlelve!",
        description: validation.errorMessage,
        variant: "destructive",
      });
      return;
    }

    const { images, auctionStartingPrice, auctionMinBidIncrement, auctionEndsAt, subcategoryId, ...rest } = data;
    const payload: any = {
      ...rest,
      images,
      videoUrl: videoUrl || undefined,
      subcategoryId: subcategoryId || null,
      categoryName: selectedCategory?.name || undefined,
      categorySlug: selectedCategory?.slug || undefined,
      subcategoryName: selectedSubcategory?.name || undefined,
      subcategorySlug: selectedSubcategory?.slug || undefined,
      brand: rest.brand || undefined,
      size: rest.size || undefined,
      color: rest.color || undefined,
      bundleDiscountPercent: bundleEnabled ? (rest.bundleDiscountPercent ?? 10) : null,
    };
    if (data.listingType === "AUCTION") {
      payload.auctionStartingPrice = auctionStartingPrice;
      payload.auctionMinBidIncrement = auctionMinBidIncrement ?? 100;
      payload.auctionEndsAt = auctionEndsAt;
    }

    if (isEdit) {
      updateListing.mutate({ id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetListingQueryKey(id!) });
          if (username) {
            queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/listings`] });
          }
          toast({ title: "Hirdetés mentve!" });
          setLocation(`/product/${id}`);
        },
        onError: (err: any) => {
          toast({
            title: "Nem sikerült menteni",
            description: err?.response?.data?.error || err?.message || "Ismeretlen hiba történt.",
            variant: "destructive",
          });
        },
      });
    } else {
      createListing.mutate({ data: payload }, {
        onSuccess: (res) => {
          if (username) {
            queryClient.invalidateQueries({ queryKey: [`/api/users/${username}/listings`] });
          }
          setCreatedListingId(res.id);
          setShowLolitTop(true);
        },
        onError: (err: any) => {
          toast({
            title: "Nem sikerült feladni a hirdetést",
            description: err?.response?.data?.error || err?.message || "Ismeretlen hiba történt.",
            variant: "destructive",
          });
        },
      });
    }
  };

  return (
    <Layout>
      {showLolitTop && createdListingId && (
        <LolitTopModal
          listingId={createdListingId}
          onClose={() => setShowLolitTop(false)}
        />
      )}

      <div className={cn(
        "container mx-auto px-4 py-8 max-w-2xl",
        isEdit ? "pb-28 sm:pb-8" : "pb-24 sm:pb-8"
      )}>
        <h1 className="text-2xl font-bold mb-2">{isEdit ? "Hirdetés szerkesztése" : "Új hirdetés feladása"}</h1>

        {/* Magánszemély hirdetési keret (Max 50 termék) */}
        <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-4 rounded-2xl flex items-center justify-between mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛍️</span>
            <div>
              <h3 className="font-extrabold text-xs text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                Magánszemély Hirdetési Keret
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Egy magánszemély maximum 50 terméket hirdethet meg egyszerre (100% ingyenesen).
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black bg-purple-600 text-white px-3 py-1 rounded-xl">
              1 / 50 aktív
            </span>
          </div>
        </div>

        {/* Step indicator */}
        {!isEdit && (
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  onClick={() => i < step ? setStep(i) : undefined}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-1 justify-center",
                    i === step ? "bg-primary text-white" :
                    i < step ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30" :
                    "bg-muted text-muted-foreground cursor-default"
                  )}
                >
                  <span>{s.icon}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-4 h-0.5 flex-shrink-0", i < step ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── STEP 0: Photos & Video ── */}
            {(step === 0 || isEdit) && (
              <div className={isEdit ? "" : "space-y-4"}>
                {!isEdit && <h2 className="text-lg font-semibold">📸 Fotók és Videó</h2>}
                <FormField control={form.control} name="images" render={({ field }) => (
                  <FormItem>
                    {isEdit && <FormLabel>Média feltöltése (Max. 5 fotó + 10mp videó)</FormLabel>}
                    <FormControl>
                      <ImageUploader
                        value={field.value as string[]}
                        onChange={field.onChange}
                        maxImages={5}
                        videoUrl={videoUrl}
                        onVideoChange={setVideoUrl}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── STEP 1: Basics ── */}
            {(step === 1 || isEdit) && (
              <div className="space-y-4">
                {!isEdit && <h2 className="text-lg font-semibold">📝 Alapadatok</h2>}

                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cím</FormLabel>
                    <FormControl><Input placeholder="Add meg a termék nevét..." maxLength={100} {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/100</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="condition" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Állapot</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Válassz állapotot" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(CONDITIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Category → Subcategory cascading */}
                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fő kategória</FormLabel>
                    <Select onValueChange={(v) => { field.onChange(v); form.setValue("subcategoryId", null); }} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Válassz kategóriát" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {subcategories.length > 0 && (
                  <FormField control={form.control} name="subcategoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alkategória <span className="text-muted-foreground font-normal">(opcionális)</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Válassz alkategóriát" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {subcategories.map((sc: any) => (
                            <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
            )}

            {/* ── STEP 2: Details + Price ── */}
            {(step === 2 || isEdit) && (
              <div className="space-y-5">
                {!isEdit && <h2 className="text-lg font-semibold">🏷️ Részletek & Ár</h2>}

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leírás</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Írd le a termék állapotát, méretét, anyagát, színét..." rows={4} maxLength={5000} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/5000</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Price */}
                {listingType !== "AUCTION" && (
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vételár (Ft)</FormLabel>
                      <FormControl><Input type="number" min={100} max={1000000} placeholder="pl. 2500" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">Minimum 100 Ft · Maximum 1.000.000 Ft</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {/* Listing type */}
                {!isEdit && (
                  <FormField control={form.control} name="listingType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hirdetés típusa</FormLabel>
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        {LISTING_TYPES.map(({ value, label, description, icon: Icon }) => (
                          <button key={value} type="button" onClick={() => field.onChange(value)}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all",
                              field.value === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                            )}
                          >
                            <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", field.value === value ? "text-primary" : "text-muted-foreground")} />
                            <div>
                              <div className="font-semibold text-sm">{label}</div>
                              <div className="text-xs text-muted-foreground">{description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )} />
                )}

                {listingType === "AUCTION" && (
                  <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                      <Gavel className="w-4 h-4" /> Aukció beállítások
                    </h3>
                    <FormField control={form.control} name="auctionStartingPrice" render={({ field }) => (
                      <FormItem><FormLabel>Kezdőár (Ft)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="auctionMinBidIncrement" render={({ field }) => (
                      <FormItem><FormLabel>Minimális emelés (Ft)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="auctionEndsAt" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aukció vége</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* Brand */}
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Márka <span className="text-muted-foreground font-normal">(opcionális)</span></FormLabel>
                    <FormControl>
                      <Input list="brand-suggestions" placeholder="Pl. Zara, Nike, H&M, Samsung..." {...field} />
                    </FormControl>
                    <datalist id="brand-suggestions">
                      {POPULAR_BRANDS.map(b => <option key={b} value={b} />)}
                    </datalist>
                    {field.value && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {POPULAR_BRANDS.filter(b => b.toLowerCase().startsWith(field.value?.toLowerCase() || "")).slice(0, 6).map(b => (
                          <button key={b} type="button" onClick={() => field.onChange(b)}
                            className="text-xs px-2 py-0.5 bg-muted rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Size – only for clothing/shoes categories */}
                {showSize && (
                  <FormField control={form.control} name="size" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Méret <span className="text-muted-foreground font-normal">(opcionális)</span></FormLabel>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(isShoeCategory ? SHOE_SIZES : SIZES).map(s => (
                          <button key={s} type="button"
                            onClick={() => { field.onChange(field.value === s ? "" : s); setShowCustomSize(false); }}
                            className={cn(
                              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
                              field.value === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                        <button type="button" onClick={() => setShowCustomSize(!showCustomSize)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
                            showCustomSize ? "border-primary bg-primary/10 text-primary" : "border-dashed border-border hover:border-primary/40 text-muted-foreground"
                          )}>
                          + Egyéni
                        </button>
                      </div>
                      {showCustomSize && (
                        <div className="flex gap-2 mt-2">
                          <Input placeholder="Egyéni méret (pl. 38/M)" value={customSize} onChange={e => setCustomSize(e.target.value)} className="flex-1" />
                          <Button type="button" size="sm" onClick={() => { if (customSize.trim()) { field.onChange(customSize.trim()); setShowCustomSize(false); } }}>OK</Button>
                        </div>
                      )}
                      {field.value && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Kiválasztva:</span>
                          <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">{field.value}</span>
                          <button type="button" onClick={() => field.onChange("")} className="text-xs text-muted-foreground hover:text-foreground">× Törlés</button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {/* Color picker */}
                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Szín <span className="text-muted-foreground font-normal">(opcionális)</span></FormLabel>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {COLORS.map(c => (
                        <button key={c.value} type="button" title={c.label}
                          onClick={() => field.onChange(field.value === c.value ? "" : c.value)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                            field.value === c.value ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105",
                            c.border ? "border border-gray-200" : ""
                          )}
                          style={{ backgroundColor: c.hex }}
                        >
                          {field.value === c.value && (
                            <Check className={cn("w-4 h-4", ["#111827", "#1e3a5f", "#92400E"].includes(c.hex) ? "text-white" : "text-gray-800")} />
                          )}
                        </button>
                      ))}
                    </div>
                    {field.value && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: COLORS.find(c => c.value === field.value)?.hex }} />
                        <span className="text-sm font-medium">{COLORS.find(c => c.value === field.value)?.label}</span>
                        <button type="button" onClick={() => field.onChange("")} className="text-xs text-muted-foreground hover:text-foreground">× Törlés</button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── STEP 3: Shipping ── */}
            {(step === 3 || isEdit) && (
              <div className="space-y-5">
                {!isEdit && <h2 className="text-lg font-semibold">📦 Szállítás</h2>}

                {/* Shipping modes */}
                <FormField control={form.control} name="shippingModes" render={() => (
                  <FormItem>
                    <FormLabel>Szállítási mód <span className="text-muted-foreground font-normal">(több is választható)</span></FormLabel>
                    <div className="space-y-2 mt-1">
                      {SHIPPING_MODES.map(({ value, label, description, price, icon: Icon }) => {
                        const isSelected = shippingModes?.includes(value);
                        return (
                          <button key={value} type="button" onClick={() => toggleShippingMode(value)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", isSelected ? "bg-primary/10" : "bg-muted")}>
                              <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{label}</div>
                              <div className="text-xs text-muted-foreground truncate">{description}</div>
                            </div>
                            <div className={cn("text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0", isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                              {price}
                            </div>
                            <div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted-foreground")}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Custom courier price – when GLS/Magyar Posta selected */}
                {shippingModes?.includes("own_courier") && (
                  <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                    <label className="text-sm font-medium">Futárszolgálat díja (Ft)</label>
                    <Input
                      type="number"
                      placeholder="pl. 1590"
                      value={courierPrice}
                      onChange={e => setCourierPrice(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Lolit GLS házhoz: 1590 Ft · Lolit Magyar Posta: 890 vagy 1190 Ft</p>
                  </div>
                )}

                {/* Shipping size selector */}
                {shippingModes?.length > 0 && !shippingModes?.includes("local_pickup") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Szállítási méret</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SHIPPING_SIZES.map(s => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setShippingSize(shippingSize === s.value ? "" : s.value)}
                          className={cn(
                            "flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all",
                            shippingSize === s.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-lg font-bold text-sm flex items-center justify-center flex-shrink-0",
                            shippingSize === s.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {s.value}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{s.label}</div>
                            <div className="text-xs text-muted-foreground">{s.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bundle discount */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" /> Bundle kedvezmény
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Kedvezmény ha valaki több termékedet veszi meg</div>
                    </div>
                    <button type="button" onClick={() => setBundleEnabled(!bundleEnabled)}
                      className={cn("w-10 h-6 rounded-full transition-all flex-shrink-0 relative", bundleEnabled ? "bg-primary" : "bg-muted")}
                    >
                      <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all", bundleEnabled ? "left-[18px]" : "left-0.5")} />
                    </button>
                  </div>
                  {bundleEnabled && (
                    <FormField control={form.control} name="bundleDiscountPercent" render={({ field }) => (
                      <FormItem>
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-sm">Kedvezmény mértéke</FormLabel>
                            <span className="text-lg font-bold text-primary">{field.value || 10}%</span>
                          </div>
                          <FormControl>
                            <input type="range" min={5} max={50} step={5} value={field.value || 10}
                              onChange={e => field.onChange(parseInt(e.target.value))} className="w-full accent-primary" />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>5%</span><span>25%</span><span>50%</span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            {!isEdit ? (
              <div className="sticky bottom-0 z-30 -mx-4 flex gap-3 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-2 sm:shadow-none">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={goPrev} className="flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Vissza
                  </Button>
                )}
                {step < 3 ? (
                  <Button type="button" onClick={goNext} className="flex-1 flex items-center gap-2">
                    Tovább <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" disabled={createListing.isPending}>
                    {createListing.isPending ? "Feltöltés..." : "Hirdetés feladása ✓"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
                <div className="mx-auto max-w-2xl">
                  <Button type="submit" className="w-full min-h-12 text-base font-bold" disabled={updateListing.isPending}>
                    {updateListing.isPending ? "Mentés..." : "Módosítások mentése"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>
    </Layout>
  );
}
