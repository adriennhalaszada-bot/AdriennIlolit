import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { UnifiedModuleHeader } from "@/components/shared/UnifiedModuleHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Car,
  MapPin,
  SlidersHorizontal,
  Phone,
  Mail,
  PlusCircle,
  X,
  Info,
  Maximize,
  Sparkles,
  Calendar,
  Lock,
  CheckCircle,
  RotateCcw,
  Navigation,
  ShieldAlert,
  Users,
  Scale
} from "lucide-react";
import { VehicleFinancingCalculator } from "@/components/vehicles/VehicleFinancingCalculator";
import { VehicleComparisonBar, ComparisonVehicle } from "@/components/vehicles/VehicleComparisonBar";
import { VehicleComparisonModal } from "@/components/vehicles/VehicleComparisonModal";
import { TestDriveRequestModal } from "@/components/vehicles/TestDriveRequestModal";
import {
  getVehicleSlots,
  saveVehicleSlots,
  getVehicleBookings,
  saveVehicleBookings,
  sendSimulatedSMS,
  VehicleSlot,
  VehicleBooking
} from "@/lib/smsSim";
import {
  CAR_BRANDS_DATA,
  getCarBrands,
  getModelsForBrand,
  getFuelTypesForBrand,
  getCarYears,
  CAR_PRICE_OPTIONS,
  HUNGARIAN_CITIES,
  HUNGARIAN_COUNTY_SEATS,
  RADIUS_OPTIONS,
  calculateLocationDistance,
  extractCityName,
  findCityCoords,
  normalizeCityString
} from "@/data/carData";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { DEFAULT_LOCATION_STATE, LocationSearchState, applyLocationFilter, getCalculatedDistance } from "@/lib/locationFilter";
import { useLocationQueryState } from "@/hooks/useLocationQueryState";

export interface VehicleItem {
  id: string;
  title: string;
  brand: string;
  model: string;
  price: string;
  priceNum: number;
  year: number;
  color: string;
  fuel: string;
  fuelLabel: string;
  gearbox: "manualis" | "automata";
  gearboxLabel: string;
  mileage: number; // km
  bodyStyle: "sedan" | "kombi" | "suv" | "ferdehatu" | "coupe" | "cabrio" | "pick-up";
  bodyStyleLabel: string;
  seats: number;
  sellerType: "magan" | "kereskedes";
  sellerTypeLabel: string;
  location: string;
  description: string;
  image: string;
  seller: string;
}

export const MOCK_VEHICLES: VehicleItem[] = [
  {
    id: "car-miskolc-audi",
    title: "Audi A4 Avant 2.0 TDI S-Line",
    brand: "AUDI",
    model: "A4",
    price: "6 490 000 Ft",
    priceNum: 6490000,
    year: 2018,
    color: "Fekete",
    fuel: "Dízel",
    fuelLabel: "Dízel",
    gearbox: "automata",
    gearboxLabel: "Automata (S-Tronic)",
    mileage: 115000,
    bodyStyle: "kombi",
    bodyStyleLabel: "Kombi",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Miskolc",
    description: "Gyári S-Line kivitelű Audi A4 Miskolcon megtekinthető. Rendszeresen karbantartott, garázsban tartott autó.",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60",
    seller: "Miskolci Tulajdonos"
  },
  {
    id: "car-abarth-500",
    title: "Abarth 595 Turismo 1.4 T-Jet",
    brand: "ABARTH",
    model: "595",
    price: "5 690 000 Ft",
    priceNum: 5690000,
    year: 2019,
    color: "Sárga",
    fuel: "Benzin",
    fuelLabel: "Benzin",
    gearbox: "manualis",
    gearboxLabel: "Manuális (5 fokozatú)",
    mileage: 41000,
    bodyStyle: "ferdehatu",
    bodyStyleLabel: "Ferdehátú",
    seats: 4,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Veszprém",
    description: "Gyári Monza kipufogórendszerrel rendelkező méregzsák 165 lóerővel! Veszprémi garázsban tartott, hibátlan élményautó.",
    image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=60",
    seller: "Nagy Balázs (Tulajdonos)"
  },
  {
    id: "car-hilux-herend",
    title: "Toyota Hilux 2.4 D-4D Double Cab 4x4",
    brand: "TOYOTA",
    model: "Hilux",
    price: "9 800 000 Ft",
    priceNum: 9800000,
    year: 2020,
    color: "Fehér",
    fuel: "Dízel",
    fuelLabel: "Dízel",
    gearbox: "manualis",
    gearboxLabel: "Manuális (6 fokozatú)",
    mileage: 68000,
    bodyStyle: "pick-up",
    bodyStyleLabel: "Pick-up",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Herend",
    description: "Munkára és túrázásra tökéletes Hilux Herendről (~12 km Veszprémtől). Platóbéléssel, vonóhoroggal és kapcsolható 4x4 hajtással.",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60",
    seller: "Veszprémi Erdőgazdaság"
  },
  {
    id: "car-bmw-x5-fured",
    title: "BMW X5 xDrive30d M Sport",
    brand: "BMW",
    model: "X5",
    price: "18 900 000 Ft",
    priceNum: 18900000,
    year: 2021,
    color: "Kék",
    fuel: "Dízel",
    fuelLabel: "Mild Hibrid Dízel",
    gearbox: "automata",
    gearboxLabel: "Automata (8 fokozatú)",
    mileage: 52000,
    bodyStyle: "suv",
    bodyStyleLabel: "SUV",
    seats: 7,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Balatonfüred",
    description: "Gyönyörű Balatonfüredi garázsban tartott X5 M Sport (~15 km Veszprémtől) 7 üléssel. Lézer fényszóró, légrugózás, panorámatető.",
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=60",
    seller: "Tóth Gábor (Tulajdonos)"
  },
  {
    id: "car-opel-varpalota",
    title: "Opel Astra K 1.6 CDTI Innovation",
    brand: "OPEL",
    model: "Astra",
    price: "3 990 000 Ft",
    priceNum: 3990000,
    year: 2017,
    color: "Ezüst",
    fuel: "Dízel",
    fuelLabel: "Dízel",
    gearbox: "manualis",
    gearboxLabel: "Manuális (6 fokozatú)",
    mileage: 135000,
    bodyStyle: "ferdehatu",
    bodyStyleLabel: "Ferdehátú",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Várpalota",
    description: "Megbízható 1.6-os dízel Astra Várpalotáról (~22 km Veszprémtől). AGR ergonomikus sportülések, LED Matrix fényszóró.",
    image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=60",
    seller: "Szabó Ferenc"
  },
  {
    id: "car-alfa-giulia",
    title: "Alfa Romeo Giulia 2.0 Turbo Veloce Q4",
    brand: "ALFA ROMEO",
    model: "Giulia",
    price: "9 490 000 Ft",
    priceNum: 9490000,
    year: 2019,
    color: "Piros",
    fuel: "Benzin",
    fuelLabel: "Benzin",
    gearbox: "automata",
    gearboxLabel: "Automata (8 fokozatú)",
    mileage: 72000,
    bodyStyle: "sedan",
    bodyStyleLabel: "Sedan",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Székesfehérvár",
    description: "Sportos, 280 lóerős összkerekes Veloce Giulia Rosso Alfa színben (~45 km Veszprémtől). Bőr sportülések, Harman Kardon hifi.",
    image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=60",
    seller: "Varga Dániel (Tulajdonos)"
  },
  {
    id: "car-ford-kuga-siofok",
    title: "Ford Kuga 2.0 TDCi Titanium 4x4",
    brand: "FORD",
    model: "Kuga",
    price: "5 450 000 Ft",
    priceNum: 5450000,
    year: 2018,
    color: "Fehér",
    fuel: "Dízel",
    fuelLabel: "Dízel",
    gearbox: "automata",
    gearboxLabel: "Automata (PowerShift)",
    mileage: 112000,
    bodyStyle: "suv",
    bodyStyleLabel: "SUV",
    seats: 5,
    sellerType: "kereskedes",
    sellerTypeLabel: "Kereskedés",
    location: "Siófok",
    description: "Megkímélt Siófoki Kuga 4x4 (~40 km Veszprémtől). Fűthető szélvédő és ülések, parkolóasszisztens, elektromos csomagtérajtó.",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
    seller: "Siófok Car Center"
  },

  {
    id: "car-audi-q5",
    title: "Audi Q5 50 TFSIe Hybrid Quattro",
    brand: "AUDI",
    model: "Q5",
    price: "16 450 000 Ft",
    priceNum: 16450000,
    year: 2020,
    color: "Szürke",
    fuel: "Elektro-benzin",
    fuelLabel: "Elektro-benzin (PHEV)",
    gearbox: "automata",
    gearboxLabel: "Automata (S-Tronic)",
    mileage: 62000,
    bodyStyle: "suv",
    bodyStyleLabel: "SUV",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Győr",
    description: "Sérülésmentes Audi Q5 Plug-in hibrid Győrből (~75 km Veszprémtől). Zöld rendszámos, 45-50 km tisztán elektromos hatótáv.",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60",
    seller: "Molnár István (Tulajdonos)"
  },
  {
    id: "car-toyota-auris",
    title: "Toyota Auris 1.8 Hybrid Executive",
    brand: "TOYOTA",
    model: "Auris",
    price: "4 890 000 Ft",
    priceNum: 4890000,
    year: 2018,
    color: "Ezüst",
    fuel: "Benzin/Hibrid",
    fuelLabel: "Benzin/Hibrid",
    gearbox: "automata",
    gearboxLabel: "Automata (e-CVT)",
    mileage: 85000,
    bodyStyle: "ferdehatu",
    bodyStyleLabel: "Ferdehátú",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Budapest, III. kerület",
    description: "Rendszeresen márkaszervizben karbantartott Toyota Auris Hybrid Budapestről (~110 km Veszprémtől). Alacsony, 4.2 literes fogyasztás.",
    image: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop&q=60",
    seller: "Kovács Péter (Tulajdonos)"
  },
  {
    id: "car-1",
    title: "Tesla Model 3 Standard Range Plus",
    brand: "TESLA",
    model: "Model 3",
    price: "11 990 000 Ft",
    priceNum: 11990000,
    year: 2021,
    color: "Fehér",
    fuel: "Elektromos",
    fuelLabel: "Elektromos",
    gearbox: "automata",
    gearboxLabel: "Automata",
    mileage: 48000,
    bodyStyle: "sedan",
    bodyStyleLabel: "Sedan",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Budapest, XI. kerület",
    description: "Kitűnő állapotú, garázsban tartott Tesla Model 3 eladó Budapestről (~105 km Veszprémtől). Akkumulátor állapota 94%.",
    image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=60",
    seller: "Kovács Tamás (Tulajdonos)"
  },
  {
    id: "car-peugeot-3008",
    title: "Peugeot 3008 1.5 BlueHDi GT Line",
    brand: "PEUGEOT",
    model: "3008",
    price: "7 950 000 Ft",
    priceNum: 7950000,
    year: 2020,
    color: "Gyöngyházfehér",
    fuel: "Dízel",
    fuelLabel: "Dízel",
    gearbox: "automata",
    gearboxLabel: "Automata (EAT8)",
    mileage: 94000,
    bodyStyle: "suv",
    bodyStyleLabel: "SUV",
    seats: 5,
    sellerType: "kereskedes",
    sellerTypeLabel: "Kereskedés",
    location: "Kecskemét, AutoPark",
    description: "i-Cockpit digitális műszerfallal és panorámatetővel felszerelt Peugeot 3008 SUV Kecskemétről (~150 km Veszprémtől).",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
    seller: "Kecskemét Premium Car Kft."
  },
  {
    id: "car-4",
    title: "Volkswagen Golf VII 1.4 TSI BMT",
    brand: "VOLKSWAGEN",
    model: "Golf",
    price: "4 390 000 Ft",
    priceNum: 4390000,
    year: 2017,
    color: "Kék",
    fuel: "Benzin",
    fuelLabel: "Benzin",
    gearbox: "manualis",
    gearboxLabel: "Manuális (6 fokozatú)",
    mileage: 98000,
    bodyStyle: "ferdehatu",
    bodyStyleLabel: "Ferdehátú",
    seats: 5,
    sellerType: "magan",
    sellerTypeLabel: "Magánszemély",
    location: "Szeged",
    description: "Rendszeresen karbantartott 1.4 TSI Golf Szegedről (~220 km Veszprémtől). Kétzónás digitális klíma, tempomat.",
    image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=60",
    seller: "Horváth Anna (Tulajdonos)"
  },
  {
    id: "car-2",
    title: "BMW 320d Touring M Sport",
    brand: "BMW",
    model: "3-as sorozat",
    price: "7 890 000 Ft",
    priceNum: 7890000,
    year: 2018,
    color: "Fekete",
    fuel: "Dízel",
    fuelLabel: "Dízel",
    gearbox: "automata",
    gearboxLabel: "Automata (8 fokozatú)",
    mileage: 125000,
    bodyStyle: "kombi",
    bodyStyleLabel: "Kombi",
    seats: 5,
    sellerType: "kereskedes",
    sellerTypeLabel: "Kereskedés",
    location: "Debrecen, Autócity",
    description: "Gyári M Sport kivitelű BMW 320d kombi Debrecenből (~330 km Veszprémtől). Head-Up display, sávtartó asszisztens.",
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=60",
    seller: "Debrecen Autó Kft. (Kereskedés)"
  }
];

export const VEHICLE_ITEMS = MOCK_VEHICLES.map((c) => ({
  id: c.id,
  title: c.title,
  brand: c.brand,
  model: c.model,
  price: c.priceNum,
  originalPrice: Math.round(c.priceNum * 1.05),
  year: c.year,
  mileageKm: c.mileage,
  engine: c.fuelLabel,
  powerHp: 190,
  fuel: c.fuel,
  transmission: c.gearboxLabel,
  color: c.color,
  warranty: true,
  location: c.location,
  image: c.image
}));

export default function Vehicles() {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);

  // Auto open vehicle detail modal if ?id=... or ?selected=... is present in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const targetId = searchParams.get("id") || searchParams.get("selected");
    if (targetId) {
      const found = MOCK_VEHICLES.find((v) => v.id === targetId);
      if (found) {
        setSelectedVehicle(found);
      }
    }
  }, []);

  // Comparison & Test Drive States
  const [comparisonList, setComparisonList] = useState<ComparisonVehicle[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isTestDriveModalOpen, setIsTestDriveModalOpen] = useState(false);

  const handleToggleComparison = (vehicle: VehicleItem) => {
    const compVehicle: ComparisonVehicle = {
      id: vehicle.id,
      title: vehicle.title,
      price: vehicle.price,
      priceNum: vehicle.priceNum,
      year: vehicle.year,
      km: vehicle.mileage,
      fuel: vehicle.fuelLabel,
      transmission: vehicle.gearboxLabel,
      image: vehicle.image,
      seller: vehicle.seller,
      location: vehicle.location,
    };

    setComparisonList((prev) => {
      const exists = prev.some((v) => v.id === compVehicle.id);
      if (exists) {
        return prev.filter((v) => v.id !== compVehicle.id);
      }
      if (prev.length >= 4) {
        alert("Maximum 4 járművet választhatsz ki összehasonlításra!");
        return prev;
      }
      return [...prev, compVehicle];
    });
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [gearboxFilter, setGearboxFilter] = useState("all");
  const [bodyFilter, setBodyFilter] = useState("all");

  // Location search state (dual-mode: city-exact or radius)
  const [locationState, setLocationState] = useLocationQueryState(DEFAULT_LOCATION_STATE);

  // Price -tól -ig
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(100000000);

  // Dynamic Year -tól -ig (1970 to Current Year)
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => getCarYears(), []);
  const [yearMin, setYearMin] = useState<number>(1970);
  const [yearMax, setYearMax] = useState<number>(currentYear);

  // Seats Filter (Ülések száma)
  const [seatsFilter, setSeatsFilter] = useState("all");

  const [mileageMax, setMileageMax] = useState<number>(600000);
  const [sellerTypeFilter, setSellerTypeFilter] = useState("all");

  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryText, setInquiryText] = useState("");

  // Slots & Bookings states
  const [allSlots, setAllSlots] = useState<VehicleSlot[]>([]);
  const [allBookings, setAllBookings] = useState<VehicleBooking[]>([]);

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

  // All brand list sorted
  const brandsList = useMemo(() => getCarBrands(), []);

  // Available models dynamically filtered by brand
  const availableModels = useMemo(() => {
    return getModelsForBrand(brandFilter);
  }, [brandFilter]);

  // Available fuel types dynamically filtered by brand
  const availableFuels = useMemo(() => {
    return getFuelTypesForBrand(brandFilter);
  }, [brandFilter]);

  // Recognized city (for badge display)
  const recognizedCity = useMemo(() => {
    if (!locationState.cityInput.trim()) return null;
    return findCityCoords(locationState.cityInput);
  }, [locationState.cityInput]);

  // Reset model filter when brand changes
  const handleBrandChange = (newBrand: string) => {
    setBrandFilter(newBrand);
    setModelFilter("all");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setBrandFilter("all");
    setModelFilter("all");
    setFuelFilter("all");
    setGearboxFilter("all");
    setBodyFilter("all");
    setLocationState(DEFAULT_LOCATION_STATE);
    setPriceMin(0);
    setPriceMax(100000000);
    setYearMin(1970);
    setYearMax(currentYear);
    setSeatsFilter("all");
    setMileageMax(600000);
    setSellerTypeFilter("all");
  };

  // Sync slots database
  useEffect(() => {
    setAllSlots(getVehicleSlots());
    setAllBookings(getVehicleBookings());

    setSelectedSlotId(null);
    setOtpSent(false);
    setBookingSuccess(false);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
  }, [selectedVehicle]);

  const filteredVehicles = useMemo(() => {
    return MOCK_VEHICLES.map((v) => {
      const { matches, distanceKm } = applyLocationFilter(v.location, locationState);
      const computedDist = locationState.cityInput ? getCalculatedDistance(locationState.cityInput, v.location) : null;
      return { vehicle: v, matches, dist: distanceKm ?? computedDist };
    }).filter(({ vehicle: v, matches }) => {
      if (!matches) return false;

      const matchesSearch =
        searchQuery === "" ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBrand =
        brandFilter === "all" ||
        v.brand.toUpperCase() === brandFilter.toUpperCase();

      const matchesModel =
        modelFilter === "all" ||
        v.model.toLowerCase() === modelFilter.toLowerCase();

      const matchesFuel =
        fuelFilter === "all" ||
        v.fuel.toLowerCase().includes(fuelFilter.toLowerCase()) ||
        v.fuelLabel.toLowerCase().includes(fuelFilter.toLowerCase());

      const matchesGearbox =
        gearboxFilter === "all" || v.gearbox === gearboxFilter;

      const matchesBody =
        bodyFilter === "all" || v.bodyStyle === bodyFilter;

      const matchesPrice =
        v.priceNum >= priceMin && (priceMax === 100000000 || v.priceNum <= priceMax);

      const matchesYear =
        v.year >= yearMin && v.year <= yearMax;

      const matchesSeats =
        seatsFilter === "all" ||
        (seatsFilter === "8" ? v.seats >= 8 : v.seats.toString() === seatsFilter);

      const matchesMileage =
        v.mileage <= mileageMax;

      const matchesSeller =
        sellerTypeFilter === "all" || v.sellerType === sellerTypeFilter;

      return (
        matchesSearch &&
        matchesBrand &&
        matchesModel &&
        matchesFuel &&
        matchesGearbox &&
        matchesBody &&
        matchesPrice &&
        matchesYear &&
        matchesSeats &&
        matchesMileage &&
        matchesSeller
      );
    }).sort((a, b) => {
      if (locationState.mode === "radius") {
        const dA = a.dist ?? 999;
        const dB = b.dist ?? 999;
        return dA - dB;
      }
      return 0;
    }).map(({ vehicle }) => vehicle);
  }, [
    searchQuery,
    brandFilter,
    modelFilter,
    fuelFilter,
    gearboxFilter,
    bodyFilter,
    priceMin,
    priceMax,
    yearMin,
    yearMax,
    seatsFilter,
    mileageMax,
    sellerTypeFilter,
    locationState,
  ]);

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySent(true);
    setTimeout(() => {
      setInquirySent(false);
      setInquiryText("");
      setSelectedVehicle(null);
    }, 2500);
  };

  // Submit testdrive reservation
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId || !selectedVehicle) return;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setOtpSent(true);

    sendSimulatedSMS(
      clientPhone,
      `ILOLIT megerősítő kód a tesztvezetés foglalásodhoz: ${otp}. Írd be a böngészőbe a visszaigazoláshoz!`
    );
  };

  // Verify OTP & Save
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput !== generatedOtp) {
      alert("Hibás megerősítő kód! Kérjük ellenőrizd a kapott szimulált SMS-t.");
      return;
    }

    if (!selectedSlotId || !selectedVehicle) return;

    const selectedSlot = allSlots.find((s) => s.id === selectedSlotId);
    if (!selectedSlot) return;

    const newBooking: VehicleBooking = {
      id: `v-booking-${Date.now()}`,
      vehicleId: selectedVehicle.id,
      vehicleName: selectedVehicle.title,
      slotId: selectedSlotId,
      slotTime: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
      slotDay: selectedSlot.day,
      clientName: clientName,
      clientPhone: clientPhone,
      clientEmail: clientEmail,
      status: "pending",
      otpCode: generatedOtp,
      createdAt: new Date().toISOString()
    };

    const updatedBookings = [...allBookings, newBooking];
    setAllBookings(updatedBookings);
    saveVehicleBookings(updatedBookings);

    const updatedSlots = allSlots.map((s) => (s.id === selectedSlotId ? { ...s, isAvailable: false } : s));
    setAllSlots(updatedSlots);
    saveVehicleSlots(updatedSlots);

    setBookingSuccess(true);
    setOtpSent(false);

    sendSimulatedSMS(
      clientPhone,
      `ILOLIT: Tesztvezetés / Megtekintés igénylés elküldve a(z) ${selectedVehicle.title} járműre (${selectedSlot.day} ${selectedSlot.startTime}-${selectedSlot.endTime}). Várd az eladó jóváhagyó SMS értesítését!`
    );
  };

  return (
    <Layout>
      <UnifiedModuleHeader
        title="Járművek & Autóbörze"
        subtitle="Böngéssz eladó személyautók, motorkerékpárok és alkatrészek között, hasonlíts össze járműveket és foglalj megtekintési időpontot."
        moduleKey="vehicles"
        searchPlaceholder="Keresés márka, modell vagy kulcsszó alapján (pl. Audi A4, BMW 320i, 4x4)"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        locationValue={locationState.cityInput}
        onLocationChange={(val) => setLocationState((prev) => ({ ...prev, cityInput: val }))}
      />

      {/* Main content grid */}
      <section className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Hasznaltauto-style detailed filter sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Részletes Szűrők
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition"
                title="Alaphelyzetbe"
              >
                <RotateCcw className="w-3 h-3" />
                Alaphelyzet
              </button>
            </div>

            <div className="space-y-4">
              
              {/* HELYSZÍN SZŰRŐ – dual mode: Település / Távolság */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <LocationSearchWidget
                  value={locationState}
                  onChange={setLocationState}
                  accentColor="blue"
                  compact={true}
                  label="Helyszín szűrő"
                />
              </div>

              {/* 1. FŐKATEGÓRIA: Márka */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>1. Főkategória (Márka)</span>
                  <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-extrabold">
                    {brandsList.length} márka
                  </span>
                </label>
                <select
                  value={brandFilter}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="all">Minden márka (Összes)</option>
                  {brandsList.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. ALKATEGÓRIA: Modell (Cascading selection) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>2. Alkategória (Modell)</span>
                  {brandFilter !== "all" && (
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-extrabold">
                      {availableModels.length} modell
                    </span>
                  )}
                </label>
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  disabled={brandFilter === "all"}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                    brandFilter === "all"
                      ? "bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer"
                  }`}
                >
                  {brandFilter === "all" ? (
                    <option value="all">Válassz előbb márkát!</option>
                  ) : (
                    <>
                      <option value="all">Összes {brandFilter} modell</option>
                      {availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {brandFilter !== "all" && availableModels.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-semibold">
                    Ehhez a márkához még nincs egyedi modell rögzítve.
                  </p>
                )}
              </div>

              {/* 3. HARMADIK SZŰRŐ: Üzemanyag */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Üzemanyag típus
                </label>
                <select
                  value={fuelFilter}
                  onChange={(e) => setFuelFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="all">Összes üzemanyag</option>
                  {availableFuels.map((fuel) => (
                    <option key={fuel} value={fuel}>
                      {fuel}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. ÁR SZERINTI SZŰRÉS (-TÓL -IG) */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ár szűrés (Ft) (-tól -ig)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400">Ár -tól</span>
                    <select
                      value={priceMin}
                      onChange={(e) => setPriceMin(Number(e.target.value))}
                      className="w-full px-2 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {CAR_PRICE_OPTIONS.map((opt) => (
                        <option key={`min-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400">Ár -ig</span>
                    <select
                      value={priceMax}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      className="w-full px-2 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value={100000000}>Nincs limit</option>
                      {CAR_PRICE_OPTIONS.filter(o => o.value > 0).map((opt) => (
                        <option key={`max-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. ÉVJÁRAT SZŰRÉS (1970 - DINAMIKUS AKTUÁLIS ÉVIG) */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Évjárat (-tól -ig)
                  </label>
                  <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                    1970 – {currentYear}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400">Évjárat -tól</span>
                    <select
                      value={yearMin}
                      onChange={(e) => setYearMin(Number(e.target.value))}
                      className="w-full px-2 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {availableYears.map((yr) => (
                        <option key={`ymin-${yr}`} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400">Évjárat -ig</span>
                    <select
                      value={yearMax}
                      onChange={(e) => setYearMax(Number(e.target.value))}
                      className="w-full px-2 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {availableYears.map((yr) => (
                        <option key={`ymax-${yr}`} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ÜLÉSEK SZÁMA SZŰRŐ */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Ülések száma
                  </span>
                  {seatsFilter !== "all" && (
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-extrabold">
                      {seatsFilter} ülés
                    </span>
                  )}
                </label>
                <select
                  value={seatsFilter}
                  onChange={(e) => setSeatsFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="all">Bármennyi ülés</option>
                  <option value="2">2 ülés</option>
                  <option value="4">4 ülés</option>
                  <option value="5">5 ülés</option>
                  <option value="7">7 ülés</option>
                  <option value="8">8+ ülés</option>
                </select>
              </div>

              {/* Sebességváltó */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Sebességváltó</label>
                <select
                  value={gearboxFilter}
                  onChange={(e) => setGearboxFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Összes váltó</option>
                  <option value="manualis">Manuális</option>
                  <option value="automata">Automata</option>
                </select>
              </div>

              {/* Kivitel */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Kivitel</label>
                <select
                  value={bodyFilter}
                  onChange={(e) => setBodyFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Összes kivitel</option>
                  <option value="sedan">Sedan</option>
                  <option value="kombi">Kombi</option>
                  <option value="suv">SUV / Terepjáró</option>
                  <option value="ferdehatu">Ferdehátú</option>
                  <option value="coupe">Coupé</option>
                  <option value="cabrio">Cabriolet</option>
                  <option value="pick-up">Pick-up</option>
                </select>
              </div>

              {/* Max futás */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                  <span>Max futás (km)</span>
                  <span className="text-blue-600 font-extrabold">{mileageMax.toLocaleString()} km</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="600000"
                  step="10000"
                  value={mileageMax}
                  onChange={(e) => setMileageMax(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Eladó típusa */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Eladó típusa</label>
                <select
                  value={sellerTypeFilter}
                  onChange={(e) => setSellerTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Mindegy</option>
                  <option value="magan">Magánszemély</option>
                  <option value="kereskedes">Kereskedés</option>
                </select>
              </div>

            </div>
          </div>

          {/* Vehicles listings grid */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Keress márka, típus vagy kulcsszavak szerint (pl.: Veszprém, Auris, 3008, M Sport)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-none focus:outline-none font-medium text-sm bg-transparent text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Applied filters bar */}
            {(brandFilter !== "all" || modelFilter !== "all" || fuelFilter !== "all" || locationState.cityInput.trim() !== "" || seatsFilter !== "all" || priceMin > 0 || priceMax < 100000000 || yearMin > 1970 || yearMax < currentYear) && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl text-xs">
                <span className="font-black text-blue-900 dark:text-blue-300 uppercase text-[10px] tracking-wider">Aktív szűrők:</span>
                {locationState.cityInput.trim() !== "" && (
                  <Badge variant="secondary" className="bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold border border-rose-300/50 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-600" />
                    Település: {locationState.cityInput} {locationState.mode === "city" ? "(Pontos)" : `(+${locationState.customRadiusKm ?? locationState.radiusKm} km)`}
                    <X className="w-3 h-3 cursor-pointer text-rose-500 hover:text-rose-700 ml-1" onClick={() => setLocationState(prev => ({ ...prev, cityInput: "" }))} />
                  </Badge>
                )}
                {brandFilter !== "all" && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Márka: {brandFilter}
                    <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => handleBrandChange("all")} />
                  </Badge>
                )}
                {modelFilter !== "all" && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Modell: {modelFilter}
                    <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setModelFilter("all")} />
                  </Badge>
                )}
                {fuelFilter !== "all" && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Üzemanyag: {fuelFilter}
                    <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setFuelFilter("all")} />
                  </Badge>
                )}
                {seatsFilter !== "all" && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Ülések: {seatsFilter} ülés
                    <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setSeatsFilter("all")} />
                  </Badge>
                )}
                {(priceMin > 0 || priceMax < 100000000) && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Ár: {(priceMin / 1000000).toFixed(1)}M – {priceMax === 100000000 ? "Max" : `${(priceMax / 1000000).toFixed(1)}M`} Ft
                  </Badge>
                )}
                {(yearMin > 1970 || yearMax < currentYear) && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Évjárat: {yearMin} – {yearMax}
                  </Badge>
                )}
                <button
                  onClick={handleResetFilters}
                  className="ml-auto text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Összes törlése
                </button>
              </div>
            )}

            {/* Results count & radius indicator */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Összesen {filteredVehicles.length} db járművet találtunk</span>
              {locationState.cityInput.trim() !== "" && (
                <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-rose-500" />
                  Középpont: {locationState.cityInput} {locationState.mode === "city" ? "(Pontos)" : `(+${locationState.customRadiusKm ?? locationState.radiusKm} km)`}
                </span>
              )}
            </div>

            {/* Grid List */}
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed rounded-3xl space-y-3 p-6">
                <Car className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">
                  Nincs a szűrésnek megfelelő jármű
                  {locationState.cityInput.trim() !== "" && ` ezen a környéken (${locationState.cityInput} +${locationState.customRadiusKm ?? locationState.radiusKm} km)`}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Próbáld meg növelni a hatósugarat (pl.: +50 km vagy +150 km) vagy kiválasztani egy közeli megyeszékhelyet!
                </p>
                <Button onClick={handleResetFilters} variant="outline" size="sm" className="rounded-xl font-bold text-xs mt-2">
                  Szűrők alaphelyzetbe állítása
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredVehicles.map((car) => {
                  const distFromCenter = locationState.cityInput.trim() !== "" ? calculateLocationDistance(locationState.cityInput, car.location) : null;
                  return (
                    <div
                      key={car.id}
                      onClick={() => setSelectedVehicle(car)}
                      className="group bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-500 transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Image cover */}
                        <div className="relative aspect-video overflow-hidden bg-slate-100">
                          <img
                            src={car.image}
                            alt={car.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60";
                            }}
                          />
                          <Badge className="absolute top-3 left-3 bg-blue-600 text-white font-extrabold text-xs shadow-md">
                            {car.year}
                          </Badge>
                          <Badge className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur text-white font-bold text-xs">
                            {car.fuelLabel}
                          </Badge>
                        </div>

                        {/* Content block */}
                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-extrabold">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{car.location}</span>
                              {distFromCenter !== null && (
                                <span className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full font-black border border-rose-200/50">
                                  {distFromCenter === 0 ? "Helyben" : `${distFromCenter} km`}
                                </span>
                              )}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 uppercase text-[10px] font-black tracking-wider">
                              {car.brand} • {car.model}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-blue-600 transition leading-snug">
                            {car.title}
                          </h3>
                          
                          {/* Specs badges including Seats */}
                          <div className="flex flex-wrap gap-2 pt-1.5">
                            <Badge variant="outline" className="text-[10px] font-bold">⚙️ {car.gearboxLabel}</Badge>
                            <Badge variant="outline" className="text-[10px] font-bold">🛣️ {car.mileage.toLocaleString()} km</Badge>
                            <Badge variant="outline" className="text-[10px] font-bold bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200">
                              🪑 {car.seats} ülés
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Price footer */}
                      <div className="px-5 pb-5 pt-3 border-t flex items-center justify-between border-slate-100 dark:border-slate-800 gap-2">
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                          {car.price}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComparison(car);
                            }}
                            className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border transition flex items-center gap-1 ${
                              comparisonList.some((c) => c.id === car.id)
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500"
                            }`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                            {comparisonList.some((c) => c.id === car.id) ? "Kiválasztva" : "+ Összehasonlít"}
                          </button>
                          <span className="text-xs font-extrabold text-slate-400 hover:text-blue-600 transition flex items-center gap-0.5">
                            Részletek <Maximize className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Vehicle details dialog modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Image Header */}
            <div className="relative aspect-video bg-slate-100 shrink-0">
              <img
                src={selectedVehicle.image}
                alt={selectedVehicle.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60";
                }}
              />
              <button
                onClick={() => setSelectedVehicle(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur hover:bg-black/70 text-white rounded-full flex items-center justify-center transition border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <Badge className="absolute top-4 left-4 bg-blue-600 text-white font-black text-sm px-3 py-1 shadow-md">
                {selectedVehicle.year}
              </Badge>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
              
              {/* Header Title / Price */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-blue-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {selectedVehicle.location} • {selectedVehicle.brand} ({selectedVehicle.model})
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {selectedVehicle.title}
                  </h2>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {selectedVehicle.price}
                  </div>
                  <span className="text-xs font-bold text-slate-400">{selectedVehicle.sellerTypeLabel} hirdetés</span>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">Futott km</div>
                  <div className="font-black text-slate-800 dark:text-slate-200 mt-0.5">🛣️ {selectedVehicle.mileage.toLocaleString()}</div>
                </div>
                <div className="border-x">
                  <div className="text-[10px] text-slate-400 font-bold">Sebességváltó</div>
                  <div className="font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate px-1" title={selectedVehicle.gearboxLabel}>
                    ⚙️ {selectedVehicle.gearboxLabel.split(" ")[0]}
                  </div>
                </div>
                <div className="border-r">
                  <div className="text-[10px] text-slate-400 font-bold">Ülések száma</div>
                  <div className="font-black text-blue-600 dark:text-blue-400 mt-0.5">🪑 {selectedVehicle.seats} ülés</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">Üzemanyag</div>
                  <div className="font-extrabold text-blue-600 truncate mt-0.5" title={selectedVehicle.fuelLabel}>
                    ⚡ {selectedVehicle.fuelLabel}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Jármű Leírása</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedVehicle.description}
                </p>
              </div>

              {/* Action row: Tesztvezetést kérek */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                    Személyes próbaút az eladóval
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Kérj egyedi tesztvezetési időpontot a jármű kipróbálásához!
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsTestDriveModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shrink-0"
                >
                  <Car className="w-4 h-4 mr-1.5" /> Tesztvezetést kérek
                </Button>
              </div>

              {/* Havi Finanszírozási Becslés (Feature 18) */}
              <VehicleFinancingCalculator vehiclePrice={selectedVehicle.priceNum} />

              {/* Testdrive / Viewing Calendar Scheduler Widget */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Tesztvezetés vagy Megtekintés Foglalása
                </h3>

                {bookingSuccess ? (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-3xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                      <CheckCircle className="w-5 h-5" />
                      Foglalás Sikeresen Rögzítve!
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold leading-relaxed">
                      Az időpontod státusza: <span className="font-black underline">Függőben</span>. Az eladó megkapta a kérést, és a jóváhagyás után azonnal SMS visszaigazolást kapsz a számodra: <strong>{clientPhone}</strong>.
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
                        Küldtünk egy 4-jegyű kódot a(z) <strong>{clientPhone}</strong> telefonszámra.
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        (Mivel ez egy szimuláció, a kódot a jobb felső sarokban felugró SMS-ben látod!)
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
                        className="w-full p-2 border rounded-xl text-center text-sm font-black tracking-widest bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                    {/* Day tabs */}
                    <div className="flex flex-wrap gap-1.5 border-b pb-2">
                      {["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"].map((day) => {
                        const count = allSlots.filter((s) => s.vehicleId === selectedVehicle.id && s.day === day && s.isAvailable).length;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => { setSelectedDayTab(day); setSelectedSlotId(null); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              selectedDayTab === day
                                ? "bg-blue-600 text-white font-black"
                                : count > 0
                                ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                                : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            <span>{day}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                              selectedDayTab === day ? "bg-white text-blue-700" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Slots List for day */}
                    {allSlots.filter((s) => s.vehicleId === selectedVehicle.id && s.day === selectedDayTab && s.isAvailable).length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                        Nincsenek szabad időpontok tesztvezetésre ezen a napon.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3.5">
                        {allSlots
                          .filter((s) => s.vehicleId === selectedVehicle.id && s.day === selectedDayTab && s.isAvailable)
                          .map((slot) => {
                            const isSelected = selectedSlotId === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setSelectedSlotId(slot.id)}
                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-50/15 ring-2 ring-blue-500"
                                    : "bg-white dark:bg-slate-950 hover:border-slate-300"
                                }`}
                              >
                                <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1">
                                  ⏰ {slot.startTime} – {slot.endTime}
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold self-start">
                                  {slot.typeLabel}
                                </Badge>
                              </button>
                            );
                          })}
                      </div>
                    )}

                    {/* Form info */}
                    {selectedSlotId && (
                      <form onSubmit={handleBookingSubmit} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
                        <div className="border-b pb-1.5 flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase text-blue-600">Adatok megadása</h4>
                          <span className="text-[10px] font-black text-slate-400">Lépés 1 / 2</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Név</label>
                            <input
                              type="text"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              placeholder="Minta Péter"
                              className="w-full p-2.5 border rounded-xl text-xs bg-white dark:bg-slate-950 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Telefonszám</label>
                            <input
                              type="tel"
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="Pl.: +36 30 123 4567"
                              className="w-full p-2.5 border rounded-xl text-xs bg-white dark:bg-slate-950 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Email</label>
                          <input
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="minta@example.hu"
                            className="w-full p-2.5 border rounded-xl text-xs bg-white dark:bg-slate-950 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25"
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
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Kapcsolatfelvétel a hirdetővel
                </h3>

                {inquirySent ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800/60 rounded-2xl text-blue-850 dark:text-blue-300 text-sm font-extrabold text-center flex items-center justify-center gap-2">
                    <span>✨ Az érdeklődést elküldtük a hirdetőnek! Hamarosan válaszol.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendInquiry} className="space-y-3">
                    <textarea
                      placeholder="Írj üzenetet a hirdetőnek (pl.: Mikor tekinthető meg a jármű?)..."
                      value={inquiryText}
                      onChange={(e) => setInquiryText(e.target.value)}
                      required
                      rows={3}
                      className="w-full p-4 border rounded-2xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-3 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedVehicle(null)}
                        className="rounded-xl font-bold text-xs"
                      >
                        Mégse
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl font-extrabold text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Üzenet küldése
                      </Button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Floating Comparison Bar (Feature 19) */}
      <VehicleComparisonBar
        selectedVehicles={comparisonList}
        onRemoveVehicle={(id) => setComparisonList((prev) => prev.filter((v) => v.id !== id))}
        onClearAll={() => setComparisonList([])}
        onOpenModal={() => setIsComparisonModalOpen(true)}
      />

      {/* Comparison Modal */}
      <VehicleComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        vehicles={comparisonList}
        onRemoveVehicle={(id) => setComparisonList((prev) => prev.filter((v) => v.id !== id))}
        onSelectVehicleDetail={(compV) => {
          const found = MOCK_VEHICLES.find((v) => v.id === compV.id);
          if (found) setSelectedVehicle(found);
        }}
      />

      {/* Test Drive Request Modal (Feature 21) */}
      <TestDriveRequestModal
        isOpen={isTestDriveModalOpen}
        onClose={() => setIsTestDriveModalOpen(false)}
        vehicleTitle={selectedVehicle?.title || ""}
        sellerName={selectedVehicle?.seller}
      />
    </Layout>
  );
}
