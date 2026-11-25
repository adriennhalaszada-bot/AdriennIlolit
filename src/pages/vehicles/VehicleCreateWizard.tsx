import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { vehiclesApi } from "@/lib/vehicles/api";
import {
  CAMPER_BASE_VEHICLE_BRANDS,
  getBrandsForCategory,
  getModelsForCategoryAndBrand,
  mergeCustomCatalogEntries,
  validateVehicleCombination,
  WATERCRAFT_ENGINE_BRANDS,
} from "@/lib/vehicles/catalog";
import {
  CATEGORY_BODY_TYPES,
  CLIMATE_OPTIONS,
  CONDITION_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
  DRIVE_OPTIONS,
  EQUIPMENT_GROUPS,
  EURO_CLASSES,
  EXTERIOR_COLORS,
  FACTORY_BODY_DESIGNATIONS,
  FUEL_OPTIONS,
  PHOTO_GUIDE_SHOTS,
  TRANSMISSION_OPTIONS,
  UPHOLSTERY_TYPES,
  VEHICLE_CATEGORIES,
  VEHICLE_COLLECTIONS,
  formatHuf,
  getCategoryLabel,
  getConditionLabel,
  getFuelLabel,
  getTransmissionLabel,
} from "@/lib/vehicles/config";
import type {
  ClimateType,
  DocumentStatus,
  DriveType,
  FuelCategory,
  PowertrainSystem,
  SellerAccountType,
  TransmissionType,
  VehicleCategory,
  VehicleCategorySpecificSpecs,
  VehicleCollectionFilter,
  VehicleCondition,
  VehicleConditionDeclarations,
  VehicleDocument,
  VehicleEvSpecs,
  VehiclePhoto,
} from "@/lib/vehicles/types";
import { findCityCoords, getCarYears } from "@/data/carData";
import { getFormattedCitySuggestions } from "@/lib/locationFilter";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Car,
  FileText,
  Loader2,
  RotateCw,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
} from "lucide-react";

const STEPS = [
  { id: 0, title: "1. Kategória" },
  { id: 1, title: "2. Márka és típus" },
  { id: 2, title: "3. Általános adatok" },
  { id: 3, title: "4. Műszaki adatok" },
  { id: 4, title: "5. Állapot és előélet" },
  { id: 5, title: "6. Felszereltség" },
  { id: 6, title: "7. Vételár" },
  { id: 7, title: "8. Fotók és iratok" },
  { id: 8, title: "9. Helyszín és időpont" },
  { id: 9, title: "10. Előnézet" },
  { id: 10, title: "11. Hirdetési díj" },
  { id: 11, title: "12. Közzététel" },
];

const DRAFT_KEY = "ilolit_vehicle_wizard_draft_v1";

/**
 * Strips EXIF / GPS metadata client-side by re-rendering image onto canvas before upload (#46).
 */
async function stripExifAndEncodeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Fájl olvasási hiba"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Érvénytelen képfájl"));
      img.onload = () => {
        const maxDim = 1600;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function VehicleCreateWizard() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const [, setLocation] = useLocation();
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();

  const { data: customCatData } = useQuery({
    queryKey: ["vehicles-custom-catalog"],
    queryFn: () => vehiclesApi.getCustomCatalog(),
  });
  const { data: pricingCfg } = useQuery({
    queryKey: ["vehicles-pricing-config"],
    queryFn: () => vehiclesApi.getPricingConfig(),
  });
  const { data: existingVehicle } = useQuery({
    queryKey: ["vehicle-edit", id],
    queryFn: () => vehiclesApi.getVehicle(id || ""),
    enabled: Boolean(isEdit && id && isSignedIn),
  });

  const catalog = useMemo(
    () => mergeCustomCatalogEntries(customCatData?.items || []),
    [customCatData?.items],
  );

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Category & seller type
  const [category, setCategory] = useState<VehicleCategory>("passenger_car");
  const [collections, setCollections] = useState<VehicleCollectionFilter[]>(["used"]);
  const [sellerType, setSellerType] = useState<SellerAccountType>("private");
  const [dealerCompanyName, setDealerCompanyName] = useState("");

  // Step 2: Cascading Brand -> Model -> Type -> Generation -> Body -> Engine -> Trim
  const [brand, setBrand] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [model, setModel] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [typeVariant, setTypeVariant] = useState("");
  const [generation, setGeneration] = useState("");
  const [bodyType, setBodyType] = useState("Ferdehátú");
  const [factoryBodyDesignation, setFactoryBodyDesignation] = useState("");
  const [trimLevel, setTrimLevel] = useState("");
  const [missingBrandReported, setMissingBrandReported] = useState(false);

  // Step 3: General
  const [manufactureYear, setManufactureYear] = useState(String(new Date().getFullYear() - 4));
  const [modelYear, setModelYear] = useState("");
  const [firstRegistration, setFirstRegistration] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [condition, setCondition] = useState<VehicleCondition>("megkimelt");
  const [doors, setDoors] = useState("5");
  const [seats, setSeats] = useState("5");
  const [exteriorColor, setExteriorColor] = useState("Fehér");
  const [interiorColor, setInteriorColor] = useState("Fekete");
  const [upholstery, setUpholstery] = useState("Szövet");
  const [metallicPaint, setMetallicPaint] = useState(false);
  const [curbWeightKg, setCurbWeightKg] = useState("");
  const [grossWeightKg, setGrossWeightKg] = useState("");
  const [trunkVolumeL, setTrunkVolumeL] = useState("");
  const [fuelTankL, setFuelTankL] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 4: Technical + EV + Category-specific
  const [fuelType, setFuelType] = useState<FuelCategory>("benzin");
  const [powertrainSystem, setPowertrainSystem] = useState<PowertrainSystem>("belsoegesu");
  const [engineVariant, setEngineVariant] = useState("");
  const [engineCode, setEngineCode] = useState("");
  const [displacementCc, setDisplacementCc] = useState("");
  const [powerKw, setPowerKw] = useState("");
  const [powerHp, setPowerHp] = useState("");
  const [systemPowerKw, setSystemPowerKw] = useState("");
  const [systemPowerHp, setSystemPowerHp] = useState("");
  const [cylinders, setCylinders] = useState("4");
  const [transmission, setTransmission] = useState<TransmissionType>("manualis");
  const [gearsCount, setGearsCount] = useState("6");
  const [driveType, setDriveType] = useState<DriveType | "">("elso");
  const [climateType, setClimateType] = useState<ClimateType | "">("automata");
  const [euroClass, setEuroClass] = useState("Euro 6");
  const [factoryConsumptionL, setFactoryConsumptionL] = useState("");
  const [co2EmissionsGkm, setCo2EmissionsGkm] = useState("");
  const [evSpecs, setEvSpecs] = useState<VehicleEvSpecs>({});
  const [catSpecs, setCatSpecs] = useState<VehicleCategorySpecificSpecs>({});

  // Step 5: Condition declarations & History / Documents
  const [condDecl, setCondDecl] = useState<VehicleConditionDeclarations>({});
  const [docStatus, setDocStatus] = useState<DocumentStatus>("ervenyes_magyar");
  const [motValidUntil, setMotValidUntil] = useState("");
  const [deregistered, setDeregistered] = useState(false);
  const [temporarilyDeregistered, setTemporarilyDeregistered] = useState(false);
  const [firstOwner, setFirstOwner] = useState(false);
  const [ownersCount, setOwnersCount] = useState("");
  const [hasServiceBook, setHasServiceBook] = useState(false);
  const [hasDigitalServiceBook, setHasDigitalServiceBook] = useState(false);
  const [hasServiceInvoices, setHasServiceInvoices] = useState(false);
  const [timingBeltChanged, setTimingBeltChanged] = useState("");
  const [lastOilChange, setLastOilChange] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [lastServiceKm, setLastServiceKm] = useState("");
  const [warranty, setWarranty] = useState("");
  const [keysCount, setKeysCount] = useState("2");
  const [vin, setVin] = useState("");
  const [vinPublicVisible, setVinPublicVisible] = useState(false);
  const [financingEncumbrance, setFinancingEncumbrance] = useState("");
  const [hasJszpReport, setHasJszpReport] = useState(false);

  // Step 6: Searchable Equipment IDs
  const [equipment, setEquipment] = useState<string[]>(["abs", "esp", "isofix", "elektromos_ablak"]);

  // Step 7: Price & Sales terms
  const [priceHuf, setPriceHuf] = useState("");
  const [netPriceHuf, setNetPriceHuf] = useState("");
  const [grossPriceHuf, setGrossPriceHuf] = useState("");
  const [vatStatus, setVatStatus] = useState<"maganszemely" | "afas_brutto" | "netto_plusz_afa" | "afa_mentes">("maganszemely");
  const [negotiable, setNegotiable] = useState(true);
  const [tradeInPossible, setTradeInPossible] = useState(false);
  const [exchangePossible, setExchangePossible] = useState(false);
  const [financingAvailable, setFinancingAvailable] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState("");
  const [promotionalPriceHuf, setPromotionalPriceHuf] = useState("");
  const [rentable, setRentable] = useState(false);
  const [dailyRentHuf, setDailyRentHuf] = useState("");

  // Step 8: Photos (20+), Video, Documents (JSZP / inspection)
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Step 9: Protected Location, Inquiry Preferences, Test Drive Settings
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [locationInstructions, setLocationInstructions] = useState("");
  const [publicDealershipAddress, setPublicDealershipAddress] = useState("");
  const [ownerPhoneShareMode, setOwnerPhoneShareMode] = useState<"none" | "approved_only" | "public_dealer">("none");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [acceptDealerPurchaseOffers, setAcceptDealerPurchaseOffers] = useState(false);
  const [acceptConsignmentOffers, setAcceptConsignmentOffers] = useState(false);
  const [acceptBrokerServiceOffers, setAcceptBrokerServiceOffers] = useState(false);
  const [noUnsolicitedCommercial, setNoUnsolicitedCommercial] = useState(true);
  const [testDriveEnabled, setTestDriveEnabled] = useState(true);
  const [testDriveDuration, setTestDriveDuration] = useState("30");
  const [testDriveLicense, setTestDriveLicense] = useState("B");
  const [testDriveSellerPresent, setTestDriveSellerPresent] = useState(true);
  const [testDriveConditions, setTestDriveConditions] = useState("");

  // Hydrate existing listing in edit mode
  useEffect(() => {
    if (!existingVehicle) return;
    setCategory(existingVehicle.category);
    setCollections(existingVehicle.collections || []);
    setSellerType(existingVehicle.sellerType);
    setDealerCompanyName(existingVehicle.dealerCompanyName || "");
    setBrand(existingVehicle.brand);
    setModel(existingVehicle.model);
    setTypeVariant(existingVehicle.typeVariant || "");
    setGeneration(existingVehicle.generation || "");
    setBodyType(existingVehicle.bodyType || "");
    setFactoryBodyDesignation(existingVehicle.factoryBodyDesignation || "");
    setTrimLevel(existingVehicle.trimLevel || "");
    setManufactureYear(String(existingVehicle.manufactureYear || ""));
    setMileageKm(existingVehicle.mileageKm != null ? String(existingVehicle.mileageKm) : "");
    setCondition(existingVehicle.condition);
    setFuelType(existingVehicle.fuelType);
    setPowertrainSystem(existingVehicle.powertrainSystem);
    setEngineVariant(existingVehicle.engineVariant || "");
    setDisplacementCc(existingVehicle.displacementCc != null ? String(existingVehicle.displacementCc) : "");
    setPowerKw(existingVehicle.powerKw != null ? String(existingVehicle.powerKw) : "");
    setPowerHp(existingVehicle.powerHp != null ? String(existingVehicle.powerHp) : "");
    setTransmission(existingVehicle.transmission);
    setDriveType(existingVehicle.driveType || "");
    setClimateType(existingVehicle.climateType || "");
    setEuroClass(existingVehicle.euroClass || "");
    if (existingVehicle.evSpecs) setEvSpecs(existingVehicle.evSpecs);
    if (existingVehicle.categorySpecs) setCatSpecs(existingVehicle.categorySpecs);
    setCondDecl(existingVehicle.conditionDeclarations || {});
    setDocStatus(existingVehicle.history?.documentStatus || "ervenyes_magyar");
    setMotValidUntil(existingVehicle.history?.motValidUntil || "");
    setEquipment(existingVehicle.equipment || []);
    setPriceHuf(String(existingVehicle.pricing?.priceHuf || ""));
    setVatStatus(existingVehicle.pricing?.vatStatus || "maganszemely");
    setNegotiable(Boolean(existingVehicle.pricing?.negotiable));
    setTitle(existingVehicle.title || "");
    setDescription(existingVehicle.description || "");
    setPhotos(existingVehicle.photos || []);
    setVideoUrl(existingVehicle.videoUrl || "");
    setDocuments(existingVehicle.documents || []);
    setPostalCode(existingVehicle.publicLocation?.postalCode || "");
    setCity(existingVehicle.publicLocation?.city || "");
    setDistrict(existingVehicle.publicLocation?.district || "");
    setExactAddress(existingVehicle.protectedLocation?.exactAddress || "");
    setMeetingPlace(existingVehicle.protectedLocation?.meetingPlace || "");
    setLocationInstructions(existingVehicle.protectedLocation?.instructions || "");
    setAcceptDealerPurchaseOffers(Boolean(existingVehicle.inquiryPreferences?.acceptDealerPurchaseOffers));
    setAcceptConsignmentOffers(Boolean(existingVehicle.inquiryPreferences?.acceptConsignmentOffers));
    setAcceptBrokerServiceOffers(Boolean(existingVehicle.inquiryPreferences?.acceptBrokerServiceOffers));
    setNoUnsolicitedCommercial(existingVehicle.inquiryPreferences?.noUnsolicitedCommercial !== false);
    setTestDriveEnabled(Boolean(existingVehicle.testDriveSettings?.enabled));
  }, [existingVehicle]);

  // Auto-save unfinished wizard locally as draft (#21)
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.category) setCategory(d.category);
        if (d.brand) setBrand(d.brand);
        if (d.model) setModel(d.model);
        if (d.typeVariant) setTypeVariant(d.typeVariant);
        if (d.priceHuf) setPriceHuf(d.priceHuf);
        if (d.city) setCity(d.city);
      }
    } catch {
      // ignore
    }
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ category, brand, model, typeVariant, priceHuf, city, savedAt: Date.now() }),
      );
    } catch {
      // ignore
    }
  }, [isEdit, category, brand, model, typeVariant, priceHuf, city]);

  const effectiveBrand = brand === "__OTHER__" ? manualBrand.trim() : brand;
  const effectiveModel = model === "__OTHER__" ? manualModel.trim() : model;

  const brands = useMemo(() => getBrandsForCategory(category, catalog), [category, catalog]);
  const models = useMemo(
    () => (effectiveBrand ? getModelsForCategoryAndBrand(category, effectiveBrand, catalog) : []),
    [category, effectiveBrand, catalog],
  );
  const selectedModelObj = useMemo(
    () => models.find((m) => m.model === effectiveModel),
    [models, effectiveModel],
  );
  const availableTypes = selectedModelObj?.types || [];
  const selectedTypeObj = useMemo(
    () => availableTypes.find((t) => t.typeName === typeVariant),
    [availableTypes, typeVariant],
  );
  const availableEngines = selectedTypeObj?.engines || [];

  const comboValidation = useMemo(
    () =>
      validateVehicleCombination({
        category,
        brand: effectiveBrand,
        model: effectiveModel,
        typeVariant,
        manufactureYear: Number(manufactureYear) || undefined,
        fuelType,
        catalog,
      }),
    [category, effectiveBrand, effectiveModel, typeVariant, manufactureYear, fuelType, catalog],
  );

  const isEvOrPhev = fuelType === "elektromos" || fuelType === "plug_in_hibrid" || powertrainSystem === "tisztan_elektromos" || powertrainSystem === "plug_in_hibrid";
  const isHybrid = ["hibrid_benzin", "hibrid_dizel", "enyhe_hibrid", "teljes_hibrid", "plug_in_hibrid"].includes(fuelType);

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const next: VehiclePhoto[] = [...photos];
      for (const file of Array.from(files).slice(0, Math.max(0, 25 - photos.length))) {
        const cleanDataUrl = await stripExifAndEncodeImage(file);
        next.push({
          id: crypto.randomUUID(),
          url: cleanDataUrl,
          rotation: 0,
          isCover: next.length === 0,
          order: next.length,
        });
      }
      setPhotos(next);
      toast({ title: `${files.length} fotó feldolgozva (GPS/EXIF adatok eltávolítva).` });
    } catch (err: any) {
      toast({ title: err?.message || "Képfeldolgozási hiba.", variant: "destructive" });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleUploadDocument = async (file: File | null, docType: VehicleDocument["docType"]) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDocuments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: file.name,
          docType,
          url: String(reader.result),
          uploadedAt: new Date().toISOString(),
        },
      ]);
      if (docType === "jszp") setHasJszpReport(true);
      toast({ title: `Dokumentum csatolva: ${file.name}` });
    };
    reader.readAsDataURL(file);
  };

  const buildPayload = (publish: boolean) => {
    const coords = findCityCoords(city);
    const autoTitle =
      title.trim() ||
      `${effectiveBrand} ${effectiveModel} ${typeVariant || ""} ${engineVariant || ""} ${trimLevel || ""}`
        .replace(/\s+/g, " ")
        .trim();
    return {
      ownerName: user?.fullName || user?.username || "ILOLIT hirdető",
      sellerType,
      dealerCompanyName: sellerType !== "private" ? dealerCompanyName.trim() : undefined,
      category,
      collections,
      brand: effectiveBrand,
      model: effectiveModel,
      typeVariant: typeVariant.trim(),
      generation: generation.trim() || selectedTypeObj?.generation || undefined,
      factoryBodyDesignation: factoryBodyDesignation || undefined,
      bodyType,
      trimLevel: trimLevel.trim() || undefined,
      manufactureYear: Number(manufactureYear) || new Date().getFullYear(),
      modelYear: modelYear ? Number(modelYear) : null,
      firstRegistration: firstRegistration || undefined,
      mileageKm: mileageKm !== "" ? Number(mileageKm) : null,
      condition,
      doors: doors ? Number(doors) : null,
      seats: seats ? Number(seats) : null,
      exteriorColor,
      interiorColor,
      upholstery,
      metallicPaint,
      curbWeightKg: curbWeightKg ? Number(curbWeightKg) : null,
      grossWeightKg: grossWeightKg ? Number(grossWeightKg) : null,
      trunkVolumeL: trunkVolumeL ? Number(trunkVolumeL) : null,
      fuelTankL: fuelTankL ? Number(fuelTankL) : null,
      fuelType,
      powertrainSystem,
      engineVariant: engineVariant.trim() || undefined,
      engineCode: engineCode.trim() || undefined,
      displacementCc: displacementCc ? Number(displacementCc) : null,
      powerKw: powerKw ? Number(powerKw) : powerHp ? Math.round(Number(powerHp) / 1.35962) : null,
      powerHp: powerHp ? Number(powerHp) : powerKw ? Math.round(Number(powerKw) * 1.35962) : null,
      systemPowerKw: systemPowerKw ? Number(systemPowerKw) : null,
      systemPowerHp: systemPowerHp ? Number(systemPowerHp) : null,
      cylinders: cylinders ? Number(cylinders) : null,
      transmission,
      gearsCount: gearsCount ? Number(gearsCount) : null,
      driveType,
      climateType,
      euroClass,
      factoryConsumptionL: factoryConsumptionL ? Number(factoryConsumptionL) : null,
      co2EmissionsGkm: co2EmissionsGkm ? Number(co2EmissionsGkm) : null,
      evSpecs: isEvOrPhev ? evSpecs : undefined,
      categorySpecs: category !== "passenger_car" ? catSpecs : undefined,
      conditionDeclarations: condDecl,
      history: {
        documentStatus: docStatus,
        motValidUntil: motValidUntil || undefined,
        deregistered,
        temporarilyDeregistered,
        firstOwner,
        ownersCount: ownersCount ? Number(ownersCount) : null,
        hasServiceBook,
        hasDigitalServiceBook,
        hasServiceInvoices,
        timingBeltChanged: timingBeltChanged || undefined,
        lastOilChange: lastOilChange || undefined,
        lastServiceDate: lastServiceDate || undefined,
        lastServiceKm: lastServiceKm ? Number(lastServiceKm) : null,
        warranty: warranty || undefined,
        keysCount: keysCount ? Number(keysCount) : null,
        vin: vin.trim() || undefined,
        vinPublicVisible,
        financingEncumbrance: financingEncumbrance || undefined,
        hasJszpReport,
        hasInspectionReport: documents.some((d) => d.docType === "allapotfelmeres"),
      },
      equipment,
      pricing: {
        priceHuf: Math.max(0, Math.round(Number(priceHuf) || 0)),
        netPriceHuf: netPriceHuf ? Number(netPriceHuf) : null,
        grossPriceHuf: grossPriceHuf ? Number(grossPriceHuf) : null,
        vatStatus,
        negotiable,
        tradeInPossible,
        exchangePossible,
        financingAvailable,
        warrantyMonths: warrantyMonths ? Number(warrantyMonths) : null,
        promotionalPriceHuf: promotionalPriceHuf ? Number(promotionalPriceHuf) : null,
        rentable,
        dailyRentHuf: dailyRentHuf ? Number(dailyRentHuf) : null,
      },
      title: autoTitle,
      description: description.trim(),
      photos,
      videoUrl: videoUrl.trim() || undefined,
      documents,
      publicLocation: {
        country: "Magyarország",
        postalCode: postalCode.trim(),
        city: city.trim() || "Budapest",
        district: district.trim() || undefined,
        approxLatitude: coords?.lat ?? null,
        approxLongitude: coords?.lng ?? null,
        publicDealershipAddress: sellerType !== "private" ? publicDealershipAddress.trim() || undefined : undefined,
      },
      protectedLocation: {
        exactAddress: exactAddress.trim(),
        meetingPlace: meetingPlace.trim() || undefined,
        instructions: locationInstructions.trim() || undefined,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      },
      ownerPhoneShareMode,
      ownerPhone: ownerPhoneShareMode !== "none" ? ownerPhone.trim() : "",
      inquiryPreferences: {
        acceptDealerPurchaseOffers,
        acceptConsignmentOffers,
        acceptBrokerServiceOffers,
        noUnsolicitedCommercial,
      },
      testDriveSettings: {
        enabled: testDriveEnabled,
        durationMinutes: Number(testDriveDuration) || 30,
        requiredLicenseCategory: testDriveLicense,
        sellerPresentRequired: testDriveSellerPresent,
        licenseInspectionOnSite: true,
        additionalConditions: testDriveConditions.trim() || undefined,
      },
      publish,
    };
  };

  const handleSave = async (publish: boolean) => {
    if (!isSignedIn) {
      toast({ title: "A hirdetésfeladáshoz jelentkezz be.", variant: "destructive" });
      return;
    }
    if (!effectiveBrand || !effectiveModel) {
      toast({ title: "A márka és a modell megadása kötelező.", variant: "destructive" });
      setStep(1);
      return;
    }
    if (!comboValidation.valid) {
      toast({ title: comboValidation.error || "Érvénytelen gyári kombináció.", variant: "destructive" });
      return;
    }
    if (publish && (!priceHuf || Number(priceHuf) < 10000)) {
      toast({ title: "Add meg a jármű vételárát forintban.", variant: "destructive" });
      setStep(6);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(publish);
      const saved = isEdit && id ? await vehiclesApi.updateVehicle(id, payload) : await vehiclesApi.createVehicle(payload);
      localStorage.removeItem(DRAFT_KEY);
      toast({
        title: publish ? "Járműhirdetés közzétéve!" : "Hirdetés piszkozatként elmentve",
        description: "Megnyitjuk a Saját Járműadmin felületet.",
      });
      setLocation(`/vehicles/admin/${saved.id}`);
    } catch (err: any) {
      toast({ title: err?.message || "Mentési hiba.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15";

  if (!isSignedIn) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
          <Car className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-950">Járműhirdetés feladása</h1>
          <p className="text-sm text-slate-600">
            A járműhirdetés feladásához és a Saját Járműadmin használatához jelentkezz be az ILOLIT fiókodba.
          </p>
          <Button asChild className="rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700">
            <Link href="/auth/login">Bejelentkezés</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-20">
        {/* Progress Header */}
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-4">
            <Link href="/vehicles" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700">
              <ArrowLeft className="h-4 w-4" />
              Vissza a Járművekhez
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-950">
                  {isEdit ? "Járműhirdetés szerkesztése" : "Hirdetés feladása – ILOLIT Járművek"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  A félbehagyott hirdetés automatikusan piszkozatként mentésre kerül.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleSave(false)}
                className="rounded-xl border-slate-300 text-xs font-bold"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Mentés piszkozatként
              </Button>
            </div>

            {/* 12-Step Progress Indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
              {STEPS.map((s) => {
                const active = step === s.id;
                const done = s.id < step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(s.id)}
                    className={`rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold transition truncate ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {done && <Check className="inline h-3 w-3 mr-1" />}
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-6">
            {!comboValidation.valid && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{comboValidation.error}</span>
              </div>
            )}

            {/* STEP 0: Category */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-slate-950">1. Járműkategória kiválasztása</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {VEHICLE_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setCategory(c.value);
                        setBrand("");
                        setModel("");
                        setTypeVariant("");
                        setBodyType(CATEGORY_BODY_TYPES[c.value]?.[0] || "Egyéb");
                      }}
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        category === c.value
                          ? "border-emerald-600 bg-emerald-50/70"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-black text-slate-950">{c.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{c.description}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-700">Hirdető típusa</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "private" as SellerAccountType, label: "Magánszemély" },
                      { id: "dealer" as SellerAccountType, label: "Kereskedő" },
                      { id: "verified_business" as SellerAccountType, label: "Ellenőrzött vállalkozás" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSellerType(st.id)}
                        className={`rounded-xl border px-4 py-2 text-xs font-bold ${
                          sellerType === st.id
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                  {sellerType !== "private" && (
                    <label className="block max-w-md text-xs font-bold text-slate-700 pt-2">
                      Kereskedés / cégnév
                      <input type="text" value={dealerCompanyName} onChange={(e) => setDealerCompanyName(e.target.value)} placeholder="pl. Dunakanyar Autóház Kft." className={inputCls} />
                    </label>
                  )}
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-700">Kiemelt keresési gyűjtőkategóriák (opcionális)</p>
                  <div className="flex flex-wrap gap-2">
                    {VEHICLE_COLLECTIONS.map((col) => {
                      const on = collections.includes(col.value);
                      return (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() =>
                            setCollections((prev) => (on ? prev.filter((x) => x !== col.value) : [...prev, col.value]))
                          }
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            on ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {col.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Cascading Brand -> Model -> Type -> Generation -> Body -> Engine */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-950">
                  2. Márka, modell, típus és generáció ({getCategoryLabel(category)})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="text-xs font-bold text-slate-700">
                    Márka *
                    <select
                      value={brand}
                      onChange={(e) => {
                        setBrand(e.target.value);
                        setModel("");
                        setTypeVariant("");
                        setGeneration("");
                      }}
                      className={inputCls}
                    >
                      <option value="">Válassz márkát...</option>
                      {brands.map((b) => (
                        <option key={b.brand} value={b.brand}>{b.brand}</option>
                      ))}
                      <option value="__OTHER__">Egyéb márka (manuális megadás / bejelentés)</option>
                    </select>
                  </label>

                  {brand === "__OTHER__" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Egyéb márka neve *
                        <input type="text" value={manualBrand} onChange={(e) => setManualBrand(e.target.value)} placeholder="Add meg a márka nevét" className={inputCls} />
                      </label>
                      {manualBrand.trim() && !missingBrandReported && (
                        <button
                          type="button"
                          onClick={async () => {
                            await vehiclesApi.reportMissingBrand({ category, brandName: manualBrand.trim(), modelName: manualModel.trim() || undefined });
                            setMissingBrandReported(true);
                            toast({ title: "Hiányzó márka bejelentve az ILOLIT katalógus csapatnak." });
                          }}
                          className="text-xs font-bold text-emerald-700 underline"
                        >
                          Hiányzó márka bejelentése a katalógusba
                        </button>
                      )}
                    </div>
                  )}

                  <label className="text-xs font-bold text-slate-700">
                    Modellcsalád *
                    {models.length > 0 && brand !== "__OTHER__" ? (
                      <select
                        value={model}
                        onChange={(e) => {
                          setModel(e.target.value);
                          setTypeVariant("");
                          setGeneration("");
                        }}
                        className={inputCls}
                      >
                        <option value="">Válassz modellt...</option>
                        {models.map((m) => (
                          <option key={m.model} value={m.model}>{m.model}</option>
                        ))}
                        <option value="__OTHER__">Egyéb / nem szerepel a listában</option>
                      </select>
                    ) : (
                      <input type="text" value={manualModel} onChange={(e) => { setModel("__OTHER__"); setManualModel(e.target.value); }} placeholder="pl. Swift, Astra, 3CX..." className={inputCls} />
                    )}
                  </label>

                  {model === "__OTHER__" && brand !== "__OTHER__" && (
                    <label className="text-xs font-bold text-slate-700">
                      Modell neve (manuális) *
                      <input type="text" value={manualModel} onChange={(e) => setManualModel(e.target.value)} className={inputCls} />
                    </label>
                  )}

                  <label className="text-xs font-bold text-slate-700">
                    Típus / generáció
                    {availableTypes.length > 0 ? (
                      <select
                        value={typeVariant}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTypeVariant(val);
                          const tObj = availableTypes.find((t) => t.typeName === val);
                          if (tObj?.generation) setGeneration(tObj.generation);
                          if (tObj?.bodyTypes?.[0]) setBodyType(tObj.bodyTypes[0]);
                          if (tObj?.allowedFuels?.[0]) setFuelType(tObj.allowedFuels[0]);
                        }}
                        className={inputCls}
                      >
                        <option value="">Válassz típust / generációt...</option>
                        {availableTypes.map((t) => (
                          <option key={t.typeName} value={t.typeName}>
                            {t.typeName} ({t.yearFrom}–{t.yearTo || "napjainkig"})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={typeVariant} onChange={(e) => setTypeVariant(e.target.value)} placeholder="pl. Golf VII, Astra H, 320d, E 220 d" className={inputCls} />
                    )}
                  </label>

                  <label className="text-xs font-bold text-slate-700">
                    Gyártási év *
                    <select value={manufactureYear} onChange={(e) => setManufactureYear(e.target.value)} className={inputCls}>
                      {getCarYears().concat(Array.from({ length: 20 }, (_, i) => 1969 - i)).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-bold text-slate-700">
                    Kivitel *
                    <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={inputCls}>
                      {(CATEGORY_BODY_TYPES[category] || ["Egyéb"]).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>

                  {category === "passenger_car" && (
                    <label className="text-xs font-bold text-slate-700">
                      Gyári típusmegnevezés (opcionális)
                      <select value={factoryBodyDesignation} onChange={(e) => setFactoryBodyDesignation(e.target.value)} className={inputCls}>
                        <option value="">Nincs / nem releváns</option>
                        {FACTORY_BODY_DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                  )}

                  {availableEngines.length > 0 && (
                    <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                      Gyári motorváltozat gyorsválasztó (automatikusan kitölti a műszaki adatokat)
                      <select
                        value={engineVariant}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEngineVariant(val);
                          const eng = availableEngines.find((x) => x.engineVariant === val);
                          if (eng) {
                            setFuelType(eng.fuelType);
                            setPowerKw(String(eng.powerKw));
                            setPowerHp(String(eng.powerHp));
                            if (eng.systemPowerKw) setSystemPowerKw(String(eng.systemPowerKw));
                            if (eng.systemPowerHp) setSystemPowerHp(String(eng.systemPowerHp));
                            if (eng.displacementCc) setDisplacementCc(String(eng.displacementCc));
                            if (eng.engineCode) setEngineCode(eng.engineCode);
                            if (eng.transmissions[0]) setTransmission(eng.transmissions[0]);
                            if (eng.drives[0]) setDriveType(eng.drives[0]);
                          }
                        }}
                        className={inputCls}
                      >
                        <option value="">Válassz gyári motorváltozatot...</option>
                        {availableEngines.map((eng) => (
                          <option key={eng.engineVariant} value={eng.engineVariant}>
                            {eng.engineVariant} – {eng.powerKw} kW / {eng.powerHp} LE
                            {eng.systemPowerHp ? ` (rendszerteljesítmény: ${eng.systemPowerHp} LE)` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="text-xs font-bold text-slate-700">
                    Felszereltségi szint (pl. Highline, Titanium, GLX, M Sport)
                    <input type="text" value={trimLevel} onChange={(e) => setTrimLevel(e.target.value)} className={inputCls} />
                  </label>

                  {category === "camper_caravan" && (
                    <label className="text-xs font-bold text-slate-700">
                      Alapjármű márkája és típusa (lakóautónál)
                      <select
                        value={catSpecs.baseVehicleBrand || ""}
                        onChange={(e) => setCatSpecs((s) => ({ ...s, baseVehicleBrand: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="">Válassz alapjárművet...</option>
                        {CAMPER_BASE_VEHICLE_BRANDS.map((bv) => <option key={bv} value={bv}>{bv}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: General data (#22) */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-950">3. Általános járműadatok</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="text-xs font-bold text-slate-700 sm:col-span-3">
                    Hirdetés címe (üresen hagyva automatikusan összeállítjuk)
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${effectiveBrand} ${effectiveModel} ${typeVariant}`.trim()} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Évjárat / modellév
                    <input type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} placeholder={manufactureYear} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Első forgalomba helyezés (év-hó)
                    <input type="month" value={firstRegistration} onChange={(e) => setFirstRegistration(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Kilométeróra-állás (km)
                    <input type="number" min={0} value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} placeholder="pl. 124500" className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Állapot *
                    <select value={condition} onChange={(e) => setCondition(e.target.value as VehicleCondition)} className={inputCls}>
                      {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Ajtók száma
                    <input type="number" min={0} max={6} value={doors} onChange={(e) => setDoors(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Szállítható személyek száma
                    <input type="number" min={1} max={60} value={seats} onChange={(e) => setSeats(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Külső szín
                    <select value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)} className={inputCls}>
                      {EXTERIOR_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Kárpit színe
                    <input type="text" value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Kárpit típusa
                    <select value={upholstery} onChange={(e) => setUpholstery(e.target.value)} className={inputCls}>
                      {UPHOLSTERY_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Saját tömeg (kg)
                    <input type="number" min={0} value={curbWeightKg} onChange={(e) => setCurbWeightKg(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Megengedett legnagyobb össztömeg (kg)
                    <input type="number" min={0} value={grossWeightKg} onChange={(e) => setGrossWeightKg(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Csomagtartó (liter) / Üzemanyagtartály (l)
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <input type="number" min={0} value={trunkVolumeL} onChange={(e) => setTrunkVolumeL(e.target.value)} placeholder="Csomagtér l" className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs" />
                      <input type="number" min={0} value={fuelTankL} onChange={(e) => setFuelTankL(e.target.value)} placeholder="Tank l" className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs" />
                    </div>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 sm:col-span-3">
                    <input type="checkbox" checked={metallicPaint} onChange={(e) => setMetallicPaint(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    Metálfényezés
                  </label>
                  <label className="text-xs font-bold text-slate-700 sm:col-span-3">
                    Részletes hirdetői leírás
                    <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Írd le a jármű előéletét, szervizelését, felszereltségét és esetleges hibáit." className={inputCls} />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: Technical + EV + Category-specific (#23-#25 & #13-#20) */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-slate-950">4. Műszaki adatok</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="text-xs font-bold text-slate-700">
                    Üzemanyag *
                    <select
                      value={fuelType}
                      onChange={(e) => {
                        const val = e.target.value as FuelCategory;
                        setFuelType(val);
                        const match = FUEL_OPTIONS.find((f) => f.value === val);
                        if (match) setPowertrainSystem(match.defaultPowertrain);
                      }}
                      className={inputCls}
                    >
                      {FUEL_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Hengerűrtartalom (cm³)
                    <input type="number" min={0} value={displacementCc} onChange={(e) => setDisplacementCc(e.target.value)} placeholder="pl. 1968" className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Motorkód / motorváltozat
                    <input type="text" value={engineCode} onChange={(e) => setEngineCode(e.target.value)} placeholder="pl. CRLB / 2.0 TDI" className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Motor teljesítménye (kW)
                    <input
                      type="number"
                      min={0}
                      value={powerKw}
                      onChange={(e) => {
                        setPowerKw(e.target.value);
                        if (e.target.value) setPowerHp(String(Math.round(Number(e.target.value) * 1.35962)));
                      }}
                      placeholder="pl. 110"
                      className={inputCls}
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Motor teljesítménye (LE)
                    <input
                      type="number"
                      min={0}
                      value={powerHp}
                      onChange={(e) => {
                        setPowerHp(e.target.value);
                        if (e.target.value) setPowerKw(String(Math.round(Number(e.target.value) / 1.35962)));
                      }}
                      placeholder="pl. 150"
                      className={inputCls}
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Hengerek száma
                    <input type="number" min={0} max={16} value={cylinders} onChange={(e) => setCylinders(e.target.value)} className={inputCls} />
                  </label>

                  {isHybrid && (
                    <>
                      <label className="text-xs font-bold text-emerald-800">
                        Hibrid rendszerteljesítmény (kW)
                        <input type="number" min={0} value={systemPowerKw} onChange={(e) => setSystemPowerKw(e.target.value)} className={inputCls} />
                      </label>
                      <label className="text-xs font-bold text-emerald-800">
                        Hibrid rendszerteljesítmény (LE)
                        <input type="number" min={0} value={systemPowerHp} onChange={(e) => setSystemPowerHp(e.target.value)} className={inputCls} />
                      </label>
                    </>
                  )}

                  <label className="text-xs font-bold text-slate-700">
                    Sebességváltó *
                    <select value={transmission} onChange={(e) => setTransmission(e.target.value as TransmissionType)} className={inputCls}>
                      {TRANSMISSION_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Sebességfokozatok száma
                    <input type="number" min={1} max={12} value={gearsCount} onChange={(e) => setGearsCount(e.target.value)} className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Hajtás
                    <select value={driveType} onChange={(e) => setDriveType(e.target.value as DriveType)} className={inputCls}>
                      <option value="">Válassz...</option>
                      {DRIVE_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Klíma fajtája
                    <select value={climateType} onChange={(e) => setClimateType(e.target.value as ClimateType)} className={inputCls}>
                      {CLIMATE_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Környezetvédelmi osztály
                    <select value={euroClass} onChange={(e) => setEuroClass(e.target.value)} className={inputCls}>
                      {EURO_CLASSES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Gyári fogyasztás (l/100 km)
                    <input type="number" step="0.1" value={factoryConsumptionL} onChange={(e) => setFactoryConsumptionL(e.target.value)} placeholder="pl. 5.4" className={inputCls} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    CO₂-kibocsátás (g/km)
                    <input type="number" min={0} value={co2EmissionsGkm} onChange={(e) => setCo2EmissionsGkm(e.target.value)} placeholder="pl. 122" className={inputCls} />
                  </label>
                </div>

                {/* EV & PHEV specialized block (#25) */}
                {isEvOrPhev && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-emerald-950">Elektromos és tölthető hibrid adatok</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <label className="font-bold text-slate-700">
                        Akkumulátorkapacitás (kWh)
                        <input type="number" step="0.1" value={evSpecs.batteryCapacityKwh ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, batteryCapacityKwh: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        Hasznos kapacitás (kWh)
                        <input type="number" step="0.1" value={evSpecs.usableBatteryKwh ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, usableBatteryKwh: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        Akkumulátor állapota – SoH (%)
                        <input type="number" min={0} max={100} value={evSpecs.batterySohPercent ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, batterySohPercent: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        Gyári WLTP hatótáv (km)
                        <input type="number" min={0} value={evSpecs.wltpRangeKm ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, wltpRangeKm: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        Tapasztalati autópályás hatótáv (km)
                        <input type="number" min={0} value={evSpecs.highwayRangeKm ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, highwayRangeKm: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        Tapasztalati téli / városi hatótáv (km)
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <input type="number" placeholder="Téli" value={evSpecs.winterRangeKm ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, winterRangeKm: e.target.value ? Number(e.target.value) : null }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                          <input type="number" placeholder="Városi" value={evSpecs.cityRangeKm ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, cityRangeKm: e.target.value ? Number(e.target.value) : null }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                        </div>
                      </label>
                      <label className="font-bold text-slate-700">
                        Elektromos fogyasztás (kWh/100 km)
                        <input type="number" step="0.1" value={evSpecs.consumptionKwhPer100km ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, consumptionKwhPer100km: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        AC töltés (csatlakozó / kW)
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <input type="text" placeholder="Type 2" value={evSpecs.acConnector || ""} onChange={(e) => setEvSpecs((s) => ({ ...s, acConnector: e.target.value }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                          <input type="number" placeholder="11 kW" value={evSpecs.acPowerKw ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, acPowerKw: e.target.value ? Number(e.target.value) : null }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                        </div>
                      </label>
                      <label className="font-bold text-slate-700">
                        DC gyorstöltés (csatlakozó / kW)
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <input type="text" placeholder="CCS" value={evSpecs.dcConnector || ""} onChange={(e) => setEvSpecs((s) => ({ ...s, dcConnector: e.target.value }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                          <input type="number" placeholder="170 kW" value={evSpecs.dcPowerKw ?? ""} onChange={(e) => setEvSpecs((s) => ({ ...s, dcPowerKw: e.target.value ? Number(e.target.value) : null }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                        </div>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs pt-1">
                      {[
                        { k: "hasHeatPump", l: "Hőszivattyú" },
                        { k: "hasBatteryPreconditioning", l: "Akkumulátor-előfűtés" },
                        { k: "chargingCableIncluded", l: "Töltőkábel tartozék" },
                        { k: "hasGreenPlate", l: "Zöld rendszám" },
                        { k: "hasBatteryHealthReport", l: "Akkumulátor-állapotfelmérés rendelkezésre áll" },
                      ].map((f) => (
                        <label key={f.k} className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                          <input type="checkbox" checked={Boolean((evSpecs as any)[f.k])} onChange={(e) => setEvSpecs((s) => ({ ...s, [f.k]: e.target.checked }))} className="h-4 w-4 accent-emerald-600" />
                          {f.l}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category-specific fields for Motorcycle, Commercial, Machinery, Agri, Camper, Trailer, Watercraft */}
                {category !== "passenger_car" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                    <h3 className="text-sm font-bold text-slate-900">
                      Kategória-specifikus műszaki adatok ({getCategoryLabel(category)})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {category === "motorcycle_quad" && (
                        <>
                          <label className="font-bold text-slate-700">
                            Motor működése
                            <select value={catSpecs.strokeType || ""} onChange={(e) => setCatSpecs((s) => ({ ...s, strokeType: e.target.value as any }))} className={inputCls}>
                              <option value="">Válassz...</option>
                              <option value="negyutemu">Négyütemű</option>
                              <option value="ketutemu">Kétütemű</option>
                            </select>
                          </label>
                          <label className="font-bold text-slate-700">
                            Jogosítványkategória
                            <input type="text" value={catSpecs.licenseCategory || ""} onChange={(e) => setCatSpecs((s) => ({ ...s, licenseCategory: e.target.value }))} placeholder="pl. AM, A1, A2, A" className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Üzemóra / Ülésmagasság (mm)
                            <div className="grid grid-cols-2 gap-1 mt-1">
                              <input type="number" placeholder="Üzemóra" value={catSpecs.operatingHours ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, operatingHours: e.target.value ? Number(e.target.value) : null }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                              <input type="number" placeholder="Ülés mm" value={catSpecs.seatHeightMm ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, seatHeightMm: e.target.value ? Number(e.target.value) : null }))} className="rounded-lg border border-slate-300 px-2 py-1.5" />
                            </div>
                          </label>
                        </>
                      )}
                      {(category === "light_commercial" || category === "heavy_commercial" || category === "trailer") && (
                        <>
                          <label className="font-bold text-slate-700">
                            Terhelhetőség (kg)
                            <input type="number" value={catSpecs.payloadKg ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, payloadKg: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Raktér térfogata (m³) / Felépítmény
                            <input type="text" value={catSpecs.superstructure || ""} onChange={(e) => setCatSpecs((s) => ({ ...s, superstructure: e.target.value }))} placeholder="pl. 13 m³ zárt / billencs" className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Tengelyek száma / konfiguráció
                            <input type="text" value={catSpecs.axleConfig || ""} onChange={(e) => setCatSpecs((s) => ({ ...s, axleConfig: e.target.value }))} placeholder="pl. 2 tengely / 4x2 / fékezett" className={inputCls} />
                          </label>
                        </>
                      )}
                      {(category === "machinery" || category === "agricultural") && (
                        <>
                          <label className="font-bold text-slate-700">
                            Üzemóra
                            <input type="number" value={catSpecs.operatingHours ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, operatingHours: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Üzemi tömeg (kg) / Emelési kapacitás (kg)
                            <input type="number" value={catSpecs.operatingWeightKg ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, operatingWeightKg: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Tartozékok / TLT / GPS
                            <input type="text" value={catSpecs.attachments || ""} onChange={(e) => setCatSpecs((s) => ({ ...s, attachments: e.target.value }))} placeholder="pl. 3 kanál, raklapvilla, 540/1000 TLT" className={inputCls} />
                          </label>
                        </>
                      )}
                      {category === "camper_caravan" && (
                        <>
                          <label className="font-bold text-slate-700">
                            Fekvőhelyek száma
                            <input type="number" value={catSpecs.sleepingPlaces ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, sleepingPlaces: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Utazóhelyek száma
                            <input type="number" value={catSpecs.travelPlaces ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, travelPlaces: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Víztartály (liter)
                            <input type="number" value={catSpecs.waterTankL ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, waterTankL: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                          </label>
                        </>
                      )}
                      {category === "watercraft" && (
                        <>
                          <label className="font-bold text-slate-700">
                            Motor gyártója
                            <select value={catSpecs.boatEngineBrand || ""} onChange={(e) => setCatSpecs((s) => ({ ...s, boatEngineBrand: e.target.value }))} className={inputCls}>
                              <option value="">Válassz...</option>
                              {WATERCRAFT_ENGINE_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </label>
                          <label className="font-bold text-slate-700">
                            Férőhely / kabinok száma
                            <input type="number" value={catSpecs.personCapacity ?? ""} onChange={(e) => setCatSpecs((s) => ({ ...s, personCapacity: e.target.value ? Number(e.target.value) : null }))} className={inputCls} />
                          </label>
                          <label className="font-bold text-slate-700">
                            Kikötő helye
                            <input type="text" value={catSpecs.harborLocation || ""} onChange={(e) => setCatSpecs((s) => ({ ...s, harborLocation: e.target.value }))} placeholder="pl. Balatonfüred" className={inputCls} />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Condition & History / JSZP (#26, #27) */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-slate-950">5. Állapot, okmányok és előélet</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <label className="font-bold text-slate-700">
                    Okmányok jellege *
                    <select value={docStatus} onChange={(e) => setDocStatus(e.target.value as DocumentStatus)} className={inputCls}>
                      {DOCUMENT_STATUS_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </label>
                  <label className="font-bold text-slate-700">
                    Műszaki vizsga lejárata
                    <input type="month" value={motValidUntil} onChange={(e) => setMotValidUntil(e.target.value)} className={inputCls} />
                  </label>
                  <label className="font-bold text-slate-700">
                    Kulcsok száma / Tulajdonosok száma
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <input type="number" placeholder="Kulcs db" value={keysCount} onChange={(e) => setKeysCount(e.target.value)} className="rounded-xl border border-slate-300 px-2.5 py-2" />
                      <input type="number" placeholder="Tulaj db" value={ownersCount} onChange={(e) => setOwnersCount(e.target.value)} className="rounded-xl border border-slate-300 px-2.5 py-2" />
                    </div>
                  </label>
                  <label className="font-bold text-slate-700">
                    Utolsó szerviz dátuma / km
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <input type="date" value={lastServiceDate} onChange={(e) => setLastServiceDate(e.target.value)} className="rounded-xl border border-slate-300 px-2 py-2" />
                      <input type="number" placeholder="km" value={lastServiceKm} onChange={(e) => setLastServiceKm(e.target.value)} className="rounded-xl border border-slate-300 px-2 py-2" />
                    </div>
                  </label>
                  <label className="font-bold text-slate-700">
                    Vezérléscsere / Utolsó olajcsere
                    <input type="text" value={timingBeltChanged} onChange={(e) => setTimingBeltChanged(e.target.value)} placeholder="pl. 180 000 km-nél cserélve" className={inputCls} />
                  </label>
                  <label className="font-bold text-slate-700">
                    Alvázszám (opcionális, adatvédelemmel)
                    <input type="text" maxLength={17} value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="17 karakteres VIN" className={inputCls} />
                  </label>
                </div>

                {vin && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={vinPublicVisible} onChange={(e) => setVinPublicVisible(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    Az alvázszám megjelenhet a publikus adatlapon (alapértelmezetten elrejtve)
                  </label>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
                  <p className="font-bold text-slate-900">Hirdetői állapotnyilatkozatok (a nyilatkozat hirdetői állításként jelenik meg)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { k: "damageFreeClaimed", l: "Sérülésmentességre vonatkozó hirdetői nyilatkozat" },
                      { k: "previousDamage", l: "Korábbi sérülés" },
                      { k: "repairedBodyPanel", l: "Javított karosszériaelem" },
                      { k: "rustPresent", l: "Rozsdásodás" },
                      { k: "hailDamage", l: "Jégkár" },
                      { k: "knownTechnicalFault", l: "Ismert műszaki hiba" },
                      { k: "aestheticDefect", l: "Esztétikai hiba" },
                      { k: "unknownHistory", l: "Ismeretlen előélet" },
                    ].map((item) => (
                      <label key={item.k} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean((condDecl as any)[item.k])}
                          onChange={(e) => setCondDecl((d) => ({ ...d, [item.k]: e.target.checked }))}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        {item.l}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs">
                  {[
                    { val: firstOwner, set: setFirstOwner, l: "Első tulajdonos" },
                    { val: hasServiceBook, set: setHasServiceBook, l: "Szervizkönyv" },
                    { val: hasDigitalServiceBook, set: setHasDigitalServiceBook, l: "Digitális szervizkönyv" },
                    { val: hasServiceInvoices, set: setHasServiceInvoices, l: "Szervizszámlák" },
                    { val: deregistered, set: setDeregistered, l: "Forgalomból kivont" },
                    { val: temporarilyDeregistered, set: setTemporarilyDeregistered, l: "Ideiglenesen kivont" },
                  ].map((item) => (
                    <label key={item.l} className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                      {item.l}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: Searchable Equipment (#28-#33) */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-black text-slate-950">6. Részletes felszereltség</h2>
                  <span className="text-xs font-bold text-emerald-700">{equipment.length} kiválasztva (mind külön kereshető)</span>
                </div>
                {EQUIPMENT_GROUPS.map((grp) => (
                  <div key={grp.id} className="space-y-2 rounded-xl border border-slate-200 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{grp.label}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {grp.items.map((it) => {
                        const on = equipment.includes(it.id);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() =>
                              setEquipment((prev) => (on ? prev.filter((x) => x !== it.id) : [...prev, it.id]))
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                              on
                                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {it.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 6: Price & Sales terms (#34) */}
            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-950">7. Vételár és értékesítési feltételek</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <label className="font-bold text-slate-700">
                    Vételár (ténylegesen fizetendő bruttó Ft) *
                    <input type="number" min={10000} step={10000} value={priceHuf} onChange={(e) => setPriceHuf(e.target.value)} placeholder="pl. 5990000" className={inputCls} />
                  </label>
                  <label className="font-bold text-slate-700">
                    ÁFA-státusz
                    <select value={vatStatus} onChange={(e) => setVatStatus(e.target.value as any)} className={inputCls}>
                      <option value="maganszemely">Magánszemély (ÁFA-mentes)</option>
                      <option value="afas_brutto">ÁFA-s bruttó ár (vállalkozástól)</option>
                      <option value="netto_plusz_afa">Nettó + ÁFA (bruttó kiírva)</option>
                      <option value="afa_mentes">ÁFA-mentes (különbözeti)</option>
                    </select>
                  </label>
                  <label className="font-bold text-slate-700">
                    Akciós ár (Ft, opcionális)
                    <input type="number" value={promotionalPriceHuf} onChange={(e) => setPromotionalPriceHuf(e.target.value)} className={inputCls} />
                  </label>
                  {vatStatus !== "maganszemely" && (
                    <>
                      <label className="font-bold text-slate-700">
                        Nettó ár (Ft)
                        <input type="number" value={netPriceHuf} onChange={(e) => setNetPriceHuf(e.target.value)} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        Bruttó ár (Ft)
                        <input type="number" value={grossPriceHuf} onChange={(e) => setGrossPriceHuf(e.target.value)} className={inputCls} />
                      </label>
                    </>
                  )}
                  <label className="font-bold text-slate-700">
                    Garancia (hónap, opcionális)
                    <input type="number" min={0} value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} placeholder="pl. 12" className={inputCls} />
                  </label>
                </div>

                <div className="flex flex-wrap gap-4 text-xs pt-2">
                  {[
                    { val: negotiable, set: setNegotiable, l: "Alkuképes ár" },
                    { val: tradeInPossible, set: setTradeInPossible, l: "Beszámítás lehetséges" },
                    { val: exchangePossible, set: setExchangePossible, l: "Csere lehetséges" },
                    { val: financingAvailable, set: setFinancingAvailable, l: "Finanszírozás lehetséges" },
                    { val: rentable, set: setRentable, l: "Bérelhető jármű" },
                  ].map((o) => (
                    <label key={o.l} className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={o.val} onChange={(e) => o.set(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                      {o.l}
                    </label>
                  ))}
                </div>
                {rentable && (
                  <label className="block max-w-xs text-xs font-bold text-slate-700">
                    Napi bérleti díj (Ft / nap)
                    <input type="number" value={dailyRentHuf} onChange={(e) => setDailyRentHuf(e.target.value)} className={inputCls} />
                  </label>
                )}
              </div>
            )}

            {/* STEP 7: Photos (20+), Video, JSZP / Inspection Documents (#53) */}
            {step === 7 && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-slate-950">8. Fotók, videók és dokumentumok</h2>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-emerald-700" />
                    Magyar fotózási útmutató (akár 25 fotó feltölthető; a GPS-helyadatokat automatikusan eltávolítjuk)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PHOTO_GUIDE_SHOTS.map((shot) => (
                      <span key={shot} className="rounded-md bg-white border border-emerald-200 px-2 py-0.5 text-[11px] text-slate-700">
                        {shot}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Tilos a fotókat úgy módosítani, hogy a jármű tényleges hibái vagy sérülései eltűnjenek.
                  </p>
                </div>

                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 cursor-pointer hover:border-emerald-500 transition">
                  {uploadingPhotos ? <Loader2 className="h-6 w-6 animate-spin text-emerald-600" /> : <Upload className="h-6 w-6 text-emerald-600" />}
                  <span className="mt-2 text-xs font-bold text-slate-800">
                    Kattints több járműfotó egyszerre történő feltöltéséhez ({photos.length} / 25)
                  </span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPhotos(e.target.files)} />
                </label>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {photos.map((p, idx) => (
                      <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-2 space-y-2">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-slate-100">
                          <img src={p.url} alt="" style={{ transform: `rotate(${p.rotation || 0}deg)` }} className="h-full w-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute left-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Borítókép
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={p.caption || ""}
                          onChange={(e) =>
                            setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)))
                          }
                          placeholder="Képaláírás"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                        />
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setPhotos((prev) => [p, ...prev.filter((x) => x.id !== p.id)].map((x, i) => ({ ...x, isCover: i === 0, order: i })))
                            }
                            className="inline-flex items-center gap-0.5 text-emerald-700 font-bold"
                            title="Borítóképnek"
                          >
                            <Star className="h-3 w-3" /> Borító
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, rotation: ((x.rotation || 0) + 90) % 360 } : x)))
                            }
                            className="text-slate-600"
                            title="Forgatás 90°"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                            className="text-rose-600"
                            title="Törlés"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                  <label className="font-bold text-slate-700">
                    Videó link (opcionális)
                    <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                  </label>
                  <div className="space-y-2">
                    <span className="block font-bold text-slate-700">
                      JSZP előéleti adatlap / állapotfelmérés / szervizkönyv feltöltése (PDF vagy kép)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        JSZP adatlap feltöltése
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleUploadDocument(e.target.files?.[0] || null, "jszp")} />
                      </label>
                      <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        Állapotfelmérés feltöltése
                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => handleUploadDocument(e.target.files?.[0] || null, "allapotfelmeres")} />
                      </label>
                    </div>
                    {documents.length > 0 && (
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        {documents.map((d) => (
                          <li key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1">
                            <span>{d.name}</span>
                            <button type="button" onClick={() => setDocuments((p) => p.filter((x) => x.id !== d.id))} className="text-rose-600 font-bold">
                              Törlés
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: Location, Inquiry Preferences & Test Drive Settings (#43, #46, #47) */}
            {step === 8 && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-slate-950">9. Megtekintési helyszín, megkeresések és tesztvezetés</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <label className="font-bold text-slate-700">
                    Irányítószám
                    <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="pl. 1117" className={inputCls} />
                  </label>
                  <label className="font-bold text-slate-700">
                    Település (nyilvános) *
                    <input type="text" list="wizard-hu-cities" value={city} onChange={(e) => setCity(e.target.value)} placeholder="pl. Budapest, Győr" className={inputCls} />
                    <datalist id="wizard-hu-cities">
                      {getFormattedCitySuggestions().map((c) => <option key={c.city} value={c.city}>{c.label}</option>)}
                    </datalist>
                  </label>
                  <label className="font-bold text-slate-700">
                    Kerület / városrész (opcionális)
                    <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="pl. XI. kerület" className={inputCls} />
                  </label>
                  <label className="font-bold text-slate-700 sm:col-span-2">
                    Védett pontos cím (magánhirdetőnél sosem nyilvános – csak jóváhagyott érdeklődőnek nyílik meg)
                    <input type="text" value={exactAddress} onChange={(e) => setExactAddress(e.target.value)} placeholder="Utca, házszám" className={inputCls} />
                  </label>
                  <label className="font-bold text-slate-700">
                    Külön találkozási hely (opcionális)
                    <input type="text" value={meetingPlace} onChange={(e) => setMeetingPlace(e.target.value)} placeholder="pl. benzinkút, bevásárlóközpont parkoló" className={inputCls} />
                  </label>
                  {sellerType !== "private" && (
                    <label className="font-bold text-slate-700 sm:col-span-3">
                      Nyilvános autókereskedési telephely címe
                      <input type="text" value={publicDealershipAddress} onChange={(e) => setPublicDealershipAddress(e.target.value)} className={inputCls} />
                    </label>
                  )}
                </div>

                {/* Seller Inquiry Preferences (#43) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
                  <p className="font-bold text-slate-900">Kereskedői és közvetítői megkeresések szabályozása</p>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input type="checkbox" checked={acceptDealerPurchaseOffers} onChange={(e) => setAcceptDealerPurchaseOffers(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    Fogadok kereskedői vételi ajánlatokat.
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input type="checkbox" checked={acceptConsignmentOffers} onChange={(e) => setAcceptConsignmentOffers(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    Fogadok bizományosi értékesítési ajánlatokat.
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input type="checkbox" checked={acceptBrokerServiceOffers} onChange={(e) => setAcceptBrokerServiceOffers(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    Fogadok közvetítői szolgáltatásra vonatkozó ajánlatokat.
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                    <input type="checkbox" checked={noUnsolicitedCommercial} onChange={(e) => setNoUnsolicitedCommercial(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    Nem kérek üzletszerzési célú megkereséseket.
                  </label>
                </div>

                {/* Separate Test Drive Settings (#47) */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 text-xs">
                  <label className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer">
                    <input type="checkbox" checked={testDriveEnabled} onChange={(e) => setTestDriveEnabled(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    Tesztvezetés engedélyezése (a megtekintéstől elkülönítve kérhető)
                  </label>
                  {testDriveEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <label className="font-bold text-slate-700">
                        Időtartam (perc)
                        <input type="number" min={15} max={120} value={testDriveDuration} onChange={(e) => setTestDriveDuration(e.target.value)} className={inputCls} />
                      </label>
                      <label className="font-bold text-slate-700">
                        Szükséges jogosítványkategória
                        <input type="text" value={testDriveLicense} onChange={(e) => setTestDriveLicense(e.target.value)} placeholder="B / A / C" className={inputCls} />
                      </label>
                      <label className="flex items-center gap-2 font-semibold text-slate-700 self-end pb-2">
                        <input type="checkbox" checked={testDriveSellerPresent} onChange={(e) => setTestDriveSellerPresent(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                        Hirdető jelenléte kötelező
                      </label>
                      <label className="font-bold text-slate-700 sm:col-span-3">
                        Egyéb tesztvezetési feltételek (a helyszínen érvényes jogosítvány bemutatása szükséges)
                        <input type="text" value={testDriveConditions} onChange={(e) => setTestDriveConditions(e.target.value)} placeholder="pl. Csak tapasztalt vezetőnek, száraz úton." className={inputCls} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 9: Preview */}
            {step === 9 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-950">10. Hirdetés előnézete</h2>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-700">{getCategoryLabel(category)}</span>
                      <h3 className="text-xl font-black text-slate-950">
                        {title.trim() || `${effectiveBrand} ${effectiveModel} ${typeVariant}`.trim()}
                      </h3>
                      <p className="text-xs text-slate-600">{city || "Település nincs megadva"} · {manufactureYear} · {mileageKm ? `${Number(mileageKm).toLocaleString("hu-HU")} km` : "—"}</p>
                    </div>
                    <p className="text-2xl font-black text-emerald-700">{formatHuf(Number(priceHuf) || 0)}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200"><span className="text-slate-400 block">Üzemanyag</span><strong>{getFuelLabel(fuelType)}</strong></div>
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200"><span className="text-slate-400 block">Sebességváltó</span><strong>{getTransmissionLabel(transmission)}</strong></div>
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200"><span className="text-slate-400 block">Állapot</span><strong>{getConditionLabel(condition)}</strong></div>
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200"><span className="text-slate-400 block">Fotók / Felszereltség</span><strong>{photos.length} fotó · {equipment.length} tétel</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 10: Listing fee (#35 — centrally configurable, never invented) */}
            {step === 10 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-slate-950">11. Hirdetési díj és fizetés</h2>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-slate-900">ILOLIT Járműhirdetési díjszabás</p>
                      <p className="text-xs text-slate-600">
                        {pricingCfg?.enabled
                          ? `Aktív díjszabás (${pricingCfg.defaultDurationDays} napos hirdetési időszak).`
                          : "A központi díjszabás jelenleg bevezetési (0 Ft-os) állapotban van – a végleges díjszabás üzleti döntés után aktiválható a Saját Járműadminban."}
                      </p>
                    </div>
                    <p className="text-2xl font-black text-emerald-700">
                      {pricingCfg?.enabled
                        ? formatHuf(
                            sellerType === "private"
                              ? pricingCfg.categoryBaseFees?.[category]?.privateFeeHuf || 0
                              : pricingCfg.categoryBaseFees?.[category]?.dealerFeeHuf || 0,
                          )
                        : "0 Ft"}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-950 pt-2 border-t border-emerald-200">
                    A hirdetés tartalmazza a teljes <strong>Saját Járműadmin</strong> felületet, a megtekintési
                    időpontkezelést és a tesztvezetés-szervezést a meghatározott hirdetési időszakban.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 11: Publish */}
            {step === 11 && (
              <div className="space-y-4 text-center py-4">
                <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
                <h2 className="text-xl font-black text-slate-950">12. Készen áll a közzétételre</h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                  A közzététel után azonnal megnyílik a <strong>Saját Járműadmin</strong>, ahol egyedi és ismétlődő
                  megtekintési, illetve tesztvezetési időpontokat állíthatsz be.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Button type="button" variant="outline" disabled={submitting} onClick={() => handleSave(false)} className="rounded-xl text-xs font-bold">
                    Mentés piszkozatként
                  </Button>
                  <Button
                    type="button"
                    disabled={submitting || !comboValidation.valid}
                    onClick={() => handleSave(true)}
                    className="rounded-xl bg-emerald-600 px-8 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Hirdetés közzététele
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0}
                onClick={() => {
                  setStep((s) => Math.max(0, s - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-xl text-xs font-bold"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Előző lépés
              </Button>
              {step < STEPS.length - 1 && (
                <Button
                  type="button"
                  onClick={() => {
                    setStep((s) => Math.min(STEPS.length - 1, s + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Következő lépés
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
