import { ALL_HUNGARIAN_SETTLEMENTS, SettlementCoords } from "./allHungarianSettlements";

export interface BrandData {
  name: string;
  fuels: string[];
  models: string[];
}

export const CAR_BRANDS_DATA: Record<string, BrandData> = {
  "ABARTH": {
    name: "ABARTH",
    fuels: ["Elektromos", "Benzin"],
    models: ["600", "124", "595", "695", "500", "Punto"]
  },
  "ALFA ROMEO": {
    name: "ALFA ROMEO",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["Junior", "Tonale", "Stelvio", "Giulia", "4C", "8C", "Mito", "Brera", "159", "GT", "147", "166", "156", "146", "145", "155", "164", "75", "90", "33", "Alfasud", "Alfa 6", "Giulietta", "Sprint", "GTV", "Alfetta", "Spider"]
  },
  "ALPINE": {
    name: "ALPINE",
    fuels: ["Elektromos", "Benzin"],
    models: ["A390", "A290", "A110"]
  },
  "ASIA MOTORS": {
    name: "ASIA MOTORS",
    fuels: ["Dízel", "Benzin"],
    models: ["Rocsta"]
  },
  "ASTON MARTIN": {
    name: "ASTON MARTIN",
    fuels: ["Benzin"],
    models: ["DB12", "DBX", "DB11", "Cygnet", "Rapide", "DBS", "Vantage", "DB9", "Vanquish", "V8", "DB7", "Virage"]
  },
  "AUDI": {
    name: "AUDI",
    fuels: ["Elektromos", "Elektro-benzin", "Elektro-diesel", "Etanol", "Dízel", "Benzin"],
    models: ["A6 e-tron", "Q6 e-tron", "Q8 e-tron", "e-tron GT", "Q4 e-tron", "e-tron", "Q8", "Q2", "Q3", "A1", "A7", "Q5", "A5", "R8", "Q7", "A2", "TT", "A3", "A4", "A6", "A8", "Cabriolet", "V8", "90", "200", "Coupé", "Quattro", "80", "100"]
  },
  "AUSTIN": {
    name: "AUSTIN",
    fuels: ["Dízel", "Benzin"],
    models: ["Montego", "Maestro", "Metro", "Allegro", "Mini"]
  },
  "AUTOBIANCHI": {
    name: "AUTOBIANCHI",
    fuels: ["Benzin"],
    models: ["A112"]
  },
  "BENTLEY": {
    name: "BENTLEY",
    fuels: ["Elektro-benzin", "Etanol", "Dízel", "Benzin"],
    models: ["Bentayga", "Flying Spur", "Mulsanne", "Arnage", "Brooklands", "Continental"]
  },
  "BMW": {
    name: "BMW",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["i5", "iX2", "XM", "i7", "iX1", "i4", "iX", "iX3", "X7", "X2", "6-os sorozat GT", "2-es sorozat", "2-es sorozat Tourer", "i8", "X4", "3-as sorozat GT", "4-es sorozat", "5-ös sorozat GT", "X1", "X6", "1-es sorozat", "X3", "Z4", "X5", "Z8", "Z3", "8-as sorozat", "Z1", "7-es sorozat", "3-as sorozat", "6-os sorozat", "5-ös sorozat"]
  },
  "BUGATTI": {
    name: "BUGATTI",
    fuels: ["Benzin"],
    models: ["Veyron"]
  },
  "BUICK": {
    name: "BUICK",
    fuels: ["Benzin"],
    models: ["Park Avenue"]
  },
  "BYD": {
    name: "BYD",
    fuels: ["Elektromos", "Benzin"],
    models: ["Dolphin G", "Atto 2", "Dolphin Surf", "Seal 6", "Sealion 7", "Seal U", "Dolphin", "Seal", "Atto 3", "Han", "Tang"]
  },
  "CADILLAC": {
    name: "CADILLAC",
    fuels: ["Etanol", "Dízel", "Benzin"],
    models: ["CT6", "XT5", "ATS", "BLS", "Escalade", "STS", "SRX", "XLR", "CTS", "Eldorado", "Seville"]
  },
  "CARVER": {
    name: "CARVER",
    fuels: ["Benzin"],
    models: ["One"]
  },
  "CHANGAN": {
    name: "CHANGAN",
    fuels: ["Elektromos"],
    models: ["Deepal S05", "Deepal S07"]
  },
  "CHERY": {
    name: "CHERY",
    fuels: ["Benzin"],
    models: ["Tiggo 4", "Tiggo 7"]
  },
  "CHEVROLET": {
    name: "CHEVROLET",
    fuels: ["Elektro-benzin", "Dízel", "Benzin"],
    models: ["Trax", "Orlando", "Volt", "Spark", "Cruze", "HHR", "Aveo", "Captiva", "Epica", "Evanda", "Kalos", "Lacetti", "Matiz", "Nubira", "Tacuma", "TrailBlazer", "Tahoe", "Alero", "Camaro", "Trans Sport", "Blazer", "Corvette", "Caprice", "Lumina", "Beretta", "Corsica"]
  },
  "CHRYSLER": {
    name: "CHRYSLER",
    fuels: ["Dízel", "Benzin"],
    models: ["Grand Voyager", "300C", "Crossfire", "Sebring", "PT Cruiser", "300M", "New Yorker", "Stratus", "Neon", "Viper", "Vision", "Daytona", "Saratoga", "ES", "GS", "GTS", "Le Baron", "Voyager"]
  },
  "CITROEN": {
    name: "CITROEN",
    fuels: ["Elektromos", "Elektro-benzin", "Aardgas", "Dízel", "Benzin"],
    models: ["C5 X", "C5 Aircross", "C4 SpaceTourer", "C3 Aircross", "C4 Cactus", "C4 Aircross", "Jumper", "Jumpy", "DS4", "DS5", "DS3", "C-Zero", "C3 Picasso", "Nemo", "C-Crosser", "C4 Picasso", "C6", "C1", "C4", "C2", "C3", "C8", "C5", "Xsara Picasso", "Berlingo", "Xsara", "Saxo", "Evasion", "Xantia", "ZX", "XM", "AX", "Axel", "BX", "GSA", "Visa", "LNA", "CX", "2CV", "Dyane"]
  },
  "DONGFENG": {
    name: "DONGFENG",
    fuels: ["Elektromos", "Elektro-benzin (PHEV/HEV)", "Benzin"],
    models: ["Shine E3", "Shine GS", "S3", "T5 EVO", "U-Tour", "DF6", "Mage", "Z9 GT", "T5 EVO HEV", "U-Tour HEV", "U-Tour V9 PHEV", "Box E1", "T5 EVO EV", "S7 REEV", "Voyah Passion PHEV", "Voyah Free REV 318", "Voyah Free BEV", "Voyah Dream PHEV", "Voyah Dream BEV", "MHero 917"]
  },
  "FERRARI": {
    name: "FERRARI",
    fuels: ["Benzin"],
    models: ["12Cilindri", "Purosangue", "296", "F8", "Roma", "SF90", "Portofino", "812", "GTC4", "488", "LaFerrari", "F12", "FF", "458", "California", "599", "612", "F430", "575M", "Enzo", "360", "550", "F50", "456", "F355", "512", "348", "Mondial", "F40"]
  },
  "FIAT": {
    name: "FIAT",
    fuels: ["Elektromos", "Aardgas", "Dízel", "Benzin"],
    models: ["Grande Panda", "124", "Fullback", "500X", "500L", "Ducato", "Scudo", "Strada", "Fiorino", "Qubo", "500", "Sedici", "600", "Idea", "Doblò", "Stilo", "Multipla", "Seicento", "Palio", "Marea", "Barchetta", "Brava", "Bravo", "Coupé", "Punto", "Ulysse", "Cinquecento", "Tempra", "Tipo", "Croma", "Regata", "Uno", "Argenta", "Panda", "Ritmo", "X 1/9", "131", "127", "132", "126"]
  },
  "FIREFLY": {
    name: "FIREFLY",
    fuels: ["Elektromos"],
    models: ["Firefly"]
  },
  "FISKER": {
    name: "FISKER",
    fuels: ["Elektromos", "Elektro-benzin (PHEV)"],
    models: ["Ocean", "Karma"]
  },
  "FORD": {
    name: "FORD",
    fuels: ["Elektromos", "Elektro-benzin", "Aardgas", "Etanol", "LPG", "Dízel", "Benzin"],
    models: ["Bronco", "Explorer EV", "Mustang Mach-E", "Edge", "Ka+", "EcoSport", "Tourneo Connect", "Tourneo Courier", "Transit Courier", "Tourneo Custom", "B-MAX", "Transit", "Transit Custom", "Ranger", "Kuga", "Transit Connect", "S-MAX", "C-MAX", "Tourneo", "Fusion", "Cougar", "Expedition", "Focus", "Ka", "Puma", "Taurus", "Explorer", "Galaxy", "Mustang", "Windstar", "Probe", "Thunderbird", "Maverick", "Mondeo", "Scorpio", "Orion", "Sierra", "Escort", "Taunus", "Capri", "Granada", "Fiesta"]
  },
  "FSO": {
    name: "FSO",
    fuels: ["Dízel", "Benzin"],
    models: ["Caro", "Celina", "Classic", "Prima", "Polonez"]
  },
  "GALLOPER": {
    name: "GALLOPER",
    fuels: ["Dízel", "Benzin"],
    models: ["Galloper"]
  },
  "GEELY": {
    name: "GEELY",
    fuels: ["Elektromos", "Benzin"],
    models: ["E5", "Starray"]
  },
  "GENESIS": {
    name: "GENESIS",
    fuels: ["Elektromos"],
    models: ["G80", "GV60", "GV70"]
  },
  "HONDA": {
    name: "HONDA",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["e:Ny1", "e", "ZR-V", "CR-Z", "Insight", "FR-V", "Stream", "HR-V", "Logo", "S2000", "CR-V", "Aerodeck", "Shuttle", "CRX", "NSX", "Concerto", "Legend", "Integra", "Jazz", "Quintet", "Civic", "Prelude", "Accord"]
  },
  "HONGQI": {
    name: "HONGQI",
    fuels: ["Elektromos"],
    models: ["EH7", "EHS7", "E-HS9"]
  },
  "HUMMER": {
    name: "HUMMER",
    fuels: ["Benzin"],
    models: ["H3", "H2"]
  },
  "HYUNDAI": {
    name: "HYUNDAI",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["Ioniq 9", "Inster", "Bayon", "Kona", "Ioniq", "H300", "i40", "Veloster", "Genesis", "ix20", "ix35", "i10", "i20", "i30", "Grandeur", "Tucson", "Getz", "Matrix", "Terracan", "Elantra", "Santa Fe", "Trajet", "Accent", "XG", "Atos", "Satellite", "Coupé", "Lantra", "Scoupé", "Excel", "Sonata", "Stellar", "Pony", "Nexo", "Ioniq 6", "Ioniq 5"]
  },
  "INFINITI": {
    name: "INFINITI",
    fuels: ["Dízel", "Benzin"],
    models: ["QX30", "Q30", "Q70", "Q50", "Q60", "QX50", "QX70", "M", "EX", "FX", "G"]
  },
  "INNOCENTI": {
    name: "INNOCENTI",
    fuels: ["Benzin"],
    models: ["90/120"]
  },
  "IVECO": {
    name: "IVECO",
    fuels: ["Aardgas", "Dízel", "Benzin"],
    models: ["Daily"]
  },
  "JAC": {
    name: "JAC",
    fuels: ["Elektromos"],
    models: ["E-S2", "iEV7S"]
  },
  "JAECOO": {
    name: "JAECOO",
    fuels: ["Elektromos", "Benzin"],
    models: ["8", "5", "7"]
  },
  "JAGUAR": {
    name: "JAGUAR",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["I-Pace", "E-Pace", "F-Pace", "XE", "F-type", "XF", "X-Type", "S-Type", "XK", "XJ", "XJS"]
  },
  "JEEP": {
    name: "JEEP",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["Avenger", "Renegade", "Patriot", "Commander", "Compass", "Grand Cherokee", "Wrangler", "Cherokee"]
  },
  "JOSSE": {
    name: "JOSSE",
    fuels: ["Benzin"],
    models: ["Indigo"]
  },
  "KGM": {
    name: "KGM",
    fuels: ["Elektromos", "Benzin"],
    models: ["Actyon", "Torres"]
  },
  "KIA": {
    name: "KIA",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["EV2", "EV4", "EV5", "EV3", "EV9", "EV6", "K4", "Seltos", "PV5", "ProCeed", "XCeed", "Stinger", "Stonic", "Niro", "Optima", "Soul", "Venga", "Ceed", "Cerato", "Picanto", "Opirus", "Sorento", "Magentis", "Mentor", "Carens", "Rio", "Carnival", "Joice", "Shuma", "Clarus", "Pride", "Sportage", "Sephia"]
  },
  "LADA": {
    name: "LADA",
    fuels: ["Dízel", "Benzin"],
    models: ["Priora", "Kalina", "111", "112", "110", "Samara", "2100-as sorozat", "Niva", "1200"]
  },
  "LAMBORGHINI": {
    name: "LAMBORGHINI",
    fuels: ["Benzin"],
    models: ["Urus", "Huracán", "Aventador", "Gallardo", "Murciélago", "Diablo"]
  },
  "LANCIA": {
    name: "LANCIA",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["Ypsilon", "Voyager", "Musa", "Phedra", "Thesis", "Lybra", "Dedra", "Thema", "Delta", "Flavia", "Kappa", "Zeta", "Prisma", "A112", "Gamma", "Trevi", "Monte Carlo", "HPE", "Beta"]
  },
  "LAND ROVER": {
    name: "LAND ROVER",
    fuels: ["Elektro-benzin", "Dízel", "Benzin"],
    models: ["Range Rover Velar", "Discovery Sport", "Range Rover Evoque", "Range Rover Sport", "Freelander", "Defender", "Discovery", "Range Rover"]
  },
  "LANDWIND": {
    name: "LANDWIND",
    fuels: ["Dízel", "Benzin"],
    models: ["CV9", "Landwind"]
  },
  "LEAPMOTOR": {
    name: "LEAPMOTOR",
    fuels: ["Elektromos", "Benzin"],
    models: ["B03X", "B05", "B10", "C10", "T03"]
  },
  "LEXUS": {
    name: "LEXUS",
    fuels: ["Elektromos", "Dízel", "Benzin/Hibrid"],
    models: ["RZ", "LBX", "UX", "ES", "LC", "RC", "NX", "CT", "SC", "RX", "IS", "GS", "LS"]
  },
  "LIGHTYEAR": {
    name: "LIGHTYEAR",
    fuels: ["Elektromos"],
    models: ["0"]
  },
  "LINCOLN": {
    name: "LINCOLN",
    fuels: ["Benzin"],
    models: ["Navigator", "Town Car", "Mark VIII", "Continental"]
  },
  "LOTUS": {
    name: "LOTUS",
    fuels: ["Elektromos", "Benzin"],
    models: ["Emeya", "Eletre", "Emira", "Evora", "Europa", "Exige", "Elise", "Esprit"]
  },
  "LUCID": {
    name: "LUCID",
    fuels: ["Elektromos"],
    models: ["Gravity", "Air"]
  },
  "LYNK & CO": {
    name: "LYNK & CO",
    fuels: ["Elektromos", "Benzin"],
    models: ["08", "02", "01"]
  },
  "MARCOS": {
    name: "MARCOS",
    fuels: ["Benzin"],
    models: ["LM 500", "Mantara"]
  },
  "MASERATI": {
    name: "MASERATI",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["MCPura", "Grecale", "MC20", "Levante", "GranCabrio", "GranTurismo", "Coupé", "Spyder", "3200 GT", "Quattroporte", "Ghibli"]
  },
  "MAYBACH": {
    name: "MAYBACH",
    fuels: ["Benzin"],
    models: ["57", "62"]
  },
  "MAZDA": {
    name: "MAZDA",
    fuels: ["Elektromos", "LPG", "Dízel", "Benzin"],
    models: ["MX-30", "6e", "CX-6e", "CX-80", "CX-60", "CX-30", "CX-3", "CX-5", "CX-9", "CX-7", "5", "2", "3", "RX-8", "6", "Tribute", "Premacy", "Demio", "MPV", "Xedos 9", "Xedos 6", "MX-3", "MX-6", "MX-5", "RX-7", "626", "929", "121", "323"]
  },
  "MCLAREN": {
    name: "MCLAREN",
    fuels: ["Benzin"],
    models: ["GTS", "750S", "Artura", "765LT", "GT", "600LT", "720S", "570GT", "540C", "570S", "675LT", "650S", "12c"]
  },
  "MEGA": {
    name: "MEGA",
    fuels: ["Dízel", "Benzin"],
    models: ["Tjaffer"]
  },
  "MERCEDES-BENZ": {
    name: "MERCEDES-BENZ",
    fuels: ["Elektromos", "Elektro-benzin", "Elektro-diesel", "Aardgas", "Dízel", "Benzin"],
    models: ["EQE SUV", "EQT", "EQE", "EQS SUV", "EQA", "EQB", "EQS", "EQV", "EQC", "T-osztály", "CLE", "GLB", "AMG GT 4-Door", "X-osztály", "SLC", "GLC", "GLE", "GLS", "AMG GT", "GLA", "CLA", "Citan", "Sprinter", "SLS AMG", "Vito", "CLC", "GLK", "GL", "R-osztály", "B-osztály", "CLS", "SLR McLaren", "Viano", "Vaneo", "M-osztály", "A-osztály", "CLK", "CL", "SLK", "V-osztály", "C-osztály", "E-osztály", "190-as sorozat", "G-osztály", "SL", "S-osztály", "200-as sorozat"]
  },
  "MERCURY": {
    name: "MERCURY",
    fuels: ["Benzin"],
    models: ["Villager", "Sable", "Grand Marquis"]
  },
  "MG": {
    name: "MG",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["4", "4 Urban", "Cyberster", "Marvel R", "S9", "S5", "S6", "3", "HS", "5", "EHS", "TF", "ZR", "ZS", "ZT", "F", "RV8"]
  },
  "MHERO": {
    name: "MHERO",
    fuels: ["Elektromos"],
    models: ["1"]
  },
  "MINI": {
    name: "MINI",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["Aceman", "Cooper", "Paceman", "Roadster", "Coupé", "Countryman", "Clubman", "Cabrio", "Mini"]
  },
  "MITSUBISHI": {
    name: "MITSUBISHI",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["i-MiEV", "Eclipse Cross", "L200", "ASX", "Outlander Sport", "Grandis", "Outlander", "Pajero Sport", "Lancer Evolution", "Pajero Pinin", "Space Star", "Carisma", "Space Gear", "3000 GT", "Eclipse", "Sigma", "Space Runner", "Pajero", "Space Wagon", "Lancer F", "Cordia", "Starion", "Tredia", "Galant", "Sapporo", "Colt", "Lancer", "Celeste"]
  },
  "MORGAN": {
    name: "MORGAN",
    fuels: ["Benzin"],
    models: ["Plus Four", "Plus Six", "3 Wheeler", "Roadster", "Aero", "4/4", "Plus 8", "Plus 4"]
  },
  "MORRIS": {
    name: "MORRIS",
    fuels: ["Benzin"],
    models: ["Ital", "Marina"]
  },
  "NIO": {
    name: "NIO",
    fuels: ["Elektromos"],
    models: ["EL8", "EL6", "EL7", "ET5", "ET7"]
  },
  "NISSAN": {
    name: "NISSAN",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["Ariya", "Leaf", "Townstar", "Interstar", "NV300", "Pulsar", "NV400", "Evalia", "NV200", "Primastar", "Cube", "Juke", "Navara", "370Z", "GT-R", "Pixo", "Qashqai", "Note", "Murano", "350Z", "X-Trail", "Almera Tino", "Pathfinder", "Almera", "Maxima QX", "Terrano II", "Serena", "100 NX", "Primera", "200 SX", "Maxima", "Terrano", "300 ZX", "Bluebird", "Patrol", "Silvia", "Laurel", "Micra", "Prairie", "Stanza", "Cherry", "Sunny"]
  },
  "NOBLE": {
    name: "NOBLE",
    fuels: ["Benzin"],
    models: ["M12", "M400"]
  },
  "OMODA": {
    name: "OMODA",
    fuels: ["Elektromos", "Benzin"],
    models: ["5", "9"]
  },
  "OPEL": {
    name: "OPEL",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["Ampera-e", "Ampera", "Crossland", "Grandland", "Karl", "Adam", "Cascada", "Combo", "Mokka", "Movano", "Vivaro", "Insignia", "Antara", "GT", "Meriva", "Signum", "Tour", "Speedster", "Agila", "Zafira", "Sintra", "Tigra", "Frontera", "Monterey", "Astra", "Calibra", "Vectra", "Omega", "Corsa", "Commodore", "Kadett", "Monza", "Senator", "Rekord", "Ascona", "Manta"]
  },
  "PEUGEOT": {
    name: "PEUGEOT",
    fuels: ["Elektromos", "Elektro-benzin", "Etanol", "Aardgas", "Dízel", "Benzin"],
    models: ["Ion", "108", "208", "2008", "308", "508", "3008", "Partner", "408", "Rifter", "Boxer", "Expert", "RCZ", "5008", "Bipper", "4007", "207", "1007", "107", "407", "807", "307", "607", "206", "406", "806", "306", "106", "605", "405", "309", "205", "104", "505", "305", "504", "604"]
  },
  "PGO": {
    name: "PGO",
    fuels: ["Benzin"],
    models: ["Speedster 2"]
  },
  "POLESTAR": {
    name: "POLESTAR",
    fuels: ["Elektromos", "Elektro-benzin (PHEV)"],
    models: ["2", "3", "4", "5", "1"]
  },
  "PONTIAC": {
    name: "PONTIAC",
    fuels: ["Benzin"],
    models: ["Bonneville", "Firebird", "Grand Prix", "Trans Sport"]
  },
  "PORSCHE": {
    name: "PORSCHE",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["Taycan", "Panamera", "Cayenne", "718", "918", "Macan", "Cayman", "Carrera GT", "Boxster", "968", "944", "911", "928", "924"]
  },
  "PRINCESS": {
    name: "PRINCESS",
    fuels: ["Benzin"],
    models: ["2000"]
  },
  "RENAULT": {
    name: "RENAULT",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["Zoe", "Twizy", "Rafale", "Symbioz", "Austral", "Arkana", "Express", "Talisman", "Kadjar", "Captur", "Fluence", "Master", "Trafic", "Wind", "Koleos", "Modus", "Vel Satis", "Avantime", "Scénic", "Kangoo", "Mégane", "Sport Spider", "Laguna", "Nevada", "Twingo", "Safrane", "Alpine A610", "Clio", "19", "21", "Alpine", "Espace", "25", "11", "9", "Fuego", "14", "30", "18", "20", "Alpine A310", "4", "5"]
  },
  "ROLLS-ROYCE": {
    name: "ROLLS-ROYCE",
    fuels: ["Elektromos", "Benzin"],
    models: ["Spectre", "Cullinan", "Dawn", "Wraith", "Ghost", "Phantom", "Corniche", "Park Ward", "Silver Seraph", "Silver Spur"]
  },
  "ROVER": {
    name: "ROVER",
    fuels: ["Dízel", "Benzin"],
    models: ["CityRover", "Streetwise", "25", "45", "75", "Tourer", "600-as sorozat", "400-as sorozat", "Estate", "Mini", "100-as sorozat", "800-as sorozat", "200-as sorozat", "SD1"]
  },
  "SAAB": {
    name: "SAAB",
    fuels: ["Etanol", "Dízel", "Benzin"],
    models: ["9-4X", "9-7X", "9-3", "9-5", "9000", "90", "900", "99"]
  },
  "SEAT": {
    name: "SEAT",
    fuels: ["Elektromos", "Elektro-benzin", "Dízel", "Benzin"],
    models: ["Tarraco", "Arona", "Ateca", "Mii", "Exeo", "Altea", "Leon", "Arosa", "Alhambra", "Cordoba", "Toledo", "Marbella", "Malaga", "Fura", "Ibiza", "Ronda"]
  },
  "SERES": {
    name: "SERES",
    fuels: ["Elektromos"],
    models: ["3"]
  },
  "SKODA": {
    name: "SKODA",
    fuels: ["Elektromos", "Elektro-benzin", "Aardgas", "Dízel", "Benzin"],
    models: ["Epiq", "Peaq", "Elroq", "Enyaq", "Superb", "Octavia", "Kamiq", "Scala", "Karoq", "Kodiaq", "Rapid", "Citigo", "Yeti", "Roomster", "Fabia", "Felicia", "Forman", "Favorit", "100-as sorozat"]
  },
  "SMART": {
    name: "SMART",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["#5", "#3", "#1", "forfour", "fortwo", "roadster", "crossblade", "city-coupé"]
  },
  "SPECTRE": {
    name: "SPECTRE",
    fuels: ["Benzin"],
    models: ["R42"]
  },
  "SSANGYONG": {
    name: "SSANGYONG",
    fuels: ["Dízel", "Benzin"],
    models: ["XLV", "Tivoli", "Actyon", "Kyron", "Rodius", "Rexton", "Korando", "Musso"]
  },
  "SUBARU": {
    name: "SUBARU",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["E-Outback", "Solterra", "Uncharted", "Crosstrek", "Levorg", "BRZ", "XV", "Trezia", "WRX", "Tribeca", "G3X Justy", "Outback", "Forester", "E-Wagon", "Impreza", "SVX", "Vivio", "Legacy", "Justy", "Mini Jumbo", "L-Series"]
  },
  "SUZUKI": {
    name: "SUZUKI",
    fuels: ["Elektromos", "Dízel", "Benzin"],
    models: ["e Vitara", "Swace", "Across", "Celerio", "S-Cross", "Kizashi", "Splash", "SX4", "Ignis", "Liana", "Grand Vitara", "Jimny", "Wagon R+", "X-90", "Baleno", "Cappuccino", "Samurai", "Vitara", "Swift", "SA 310", "SJ", "Alto", "SC"]
  },
  "TALBOT": {
    name: "TALBOT",
    fuels: ["Dízel", "Benzin"],
    models: ["Samba", "Matra Murena", "Tagora", "Solara", "1100", "1510", "Horizon", "Matra Rancho", "Sunbeam"]
  },
  "TESLA": {
    name: "TESLA",
    fuels: ["Elektromos"],
    models: ["Model Y", "Model 3", "Model X", "Model S", "Roadster"]
  },
  "THINK": {
    name: "THINK",
    fuels: ["Elektromos"],
    models: ["City"]
  },
  "TOYOTA": {
    name: "TOYOTA",
    fuels: ["Elektromos", "Hidrogén", "Dízel", "Benzin/Hibrid"],
    models: ["bZ4X", "Mirai", "C-HR+", "Corolla Cross", "GR86", "Highlander", "Yaris Cross", "Proace City", "C-HR", "Proace", "GT86", "Hilux", "Prius+", "Verso-S", "iQ", "Urban Cruiser", "Land Cruiser V8", "Auris", "Verso", "Aygo", "Corolla Verso", "Avensis Verso", "Prius", "RAV4", "Yaris", "Yaris Verso", "Land Cruiser 100", "Avensis", "Land Cruiser 90", "Paseo", "Picnic", "Funcruiser", "4Runner", "Previa", "MR2", "Camry", "Supra", "Carina", "Celica", "Corolla", "Crown", "Land Cruiser", "Starlet", "Corona", "Tercel", "Cressida"]
  },
  "TRIUMPH": {
    name: "TRIUMPH",
    fuels: ["Benzin"],
    models: ["Acclaim", "Stag"]
  },
  "TVR": {
    name: "TVR",
    fuels: ["Benzin"],
    models: ["Sagaris", "Tuscan", "Chimaera", "Griffith"]
  },
  "VINFAST": {
    name: "VINFAST",
    fuels: ["Elektromos"],
    models: ["VF6", "VF8", "VF9"]
  },
  "VOLKSWAGEN": {
    name: "VOLKSWAGEN",
    fuels: ["Elektromos", "Benzin", "Dízel", "PHEV"],
    models: ["ID. Cross", "ID. Polo", "ID.7", "ID.5", "ID. Buzz", "ID.3", "ID.4", "Tayron", "Taigo", "T-Cross", "Arteon", "T-Roc", "Golf Sportsvan", "XL1", "CC", "Transporter", "Amarok", "Beetle", "Crafter", "Up", "Tiguan", "Eos", "Fox", "Golf Plus", "Caddy", "Multivan", "Touran", "Phaeton", "Touareg", "Bora", "Lupo", "New Beetle", "Sharan", "Vento", "Corrado", "Santana", "Jetta", "Passat", "Derby", "Scirocco", "Polo", "Golf"]
  },
  "VOLVO": {
    name: "VOLVO",
    fuels: ["Elektromos", "Benzin", "Dízel", "PHEV"],
    models: ["EX60", "ES90", "EC40", "EX40", "EX90", "EX30", "C40", "XC40", "V60", "XC60", "C30", "V50", "XC70", "XC90", "S60", "C70", "S80", "S70", "S90", "V70", "V90", "S40", "V40", "850", "460", "940", "960", "440", "480", "780", "740", "240", "340", "360", "760", "244/245", "264/265", "343/345", "66"]
  },
  "VOYAH": {
    name: "VOYAH",
    fuels: ["Elektro-benzin (PHEV)"],
    models: ["Courage", "Free", "Dreamer"]
  },
  "XPENG": {
    name: "XPENG",
    fuels: ["Elektromos"],
    models: ["L03", "P7+", "G6", "G9", "P7"]
  },
  "YUGO": {
    name: "YUGO",
    fuels: ["Benzin"],
    models: ["Sana", "45A/55A/65A", "45/55", "GTL", "1100/1300"]
  },
  "ZEEKR": {
    name: "ZEEKR",
    fuels: ["Elektromos"],
    models: ["7GT", "7X", "001", "X"]
  }
};

/**
 * Returns list of all car brands sorted alphabetically
 */
export const getCarBrands = (): string[] => {
  return Object.keys(CAR_BRANDS_DATA).sort((a, b) => a.localeCompare(b));
};

/**
 * Returns models for a given brand name (strictly cascading subclass)
 */
export const getModelsForBrand = (brand: string): string[] => {
  if (!brand || brand === "all") return [];
  const normalized = brand.trim().toUpperCase();
  // Match key directly or case-insensitively
  const matchedKey = Object.keys(CAR_BRANDS_DATA).find(
    (k) => k.toUpperCase() === normalized
  );
  return matchedKey ? CAR_BRANDS_DATA[matchedKey].models : [];
};

/**
 * Returns fuel types available for a given brand, or all unique fuel types across all brands
 */
export const getFuelTypesForBrand = (brand?: string): string[] => {
  if (brand && brand !== "all") {
    const normalized = brand.trim().toUpperCase();
    const matchedKey = Object.keys(CAR_BRANDS_DATA).find(
      (k) => k.toUpperCase() === normalized
    );
    if (matchedKey && CAR_BRANDS_DATA[matchedKey].fuels.length > 0) {
      return CAR_BRANDS_DATA[matchedKey].fuels;
    }
  }

  // Fallback / all unique fuel types
  const fuelSet = new Set<string>();
  Object.values(CAR_BRANDS_DATA).forEach((b) => {
    b.fuels.forEach((f) => fuelSet.add(f));
  });
  return Array.from(fuelSet).sort((a, b) => a.localeCompare(b));
};

/**
 * Dynamic Year Generator:
 * Generates array of years from 1970 to CURRENT YEAR (e.g. 2026, 2027, 2028 dynamically as time progresses).
 */
export const getCarYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 1970; year--) {
    years.push(year);
  }
  return years;
};

/**
 * Common price options for -tól -ig filtering in Ft
 */
export const CAR_PRICE_OPTIONS = [
  { value: 0, label: "0 Ft" },
  { value: 500000, label: "500 000 Ft" },
  { value: 1000000, label: "1 000 000 Ft" },
  { value: 2000000, label: "2 000 000 Ft" },
  { value: 3000000, label: "3 000 000 Ft" },
  { value: 5000000, label: "5 000 000 Ft" },
  { value: 7500000, label: "7 500 000 Ft" },
  { value: 10000000, label: "10 000 000 Ft" },
  { value: 15000000, label: "15 000 000 Ft" },
  { value: 20000000, label: "20 000 000 Ft" },
  { value: 30000000, label: "30 000 000 Ft" },
  { value: 50000000, label: "50 000 000 Ft" },
  { value: 100000000, label: "100 000 000 Ft" }
];

/**
 * Hungarian 19 County Seats + Budapest (Megyeszékhelyek)
 */
export const HUNGARIAN_COUNTY_SEATS = [
  "Budapest",
  "Békéscsaba",
  "Debrecen",
  "Eger",
  "Győr",
  "Kaposvár",
  "Kecskemét",
  "Miskolc",
  "Nyíregyháza",
  "Pécs",
  "Salgótarján",
  "Szeged",
  "Szekszárd",
  "Székesfehérvár",
  "Szolnok",
  "Szombathely",
  "Tatabánya",
  "Veszprém",
  "Zalaegerszeg"
];

/**
 * Common Hungarian city search aliases and short abbreviations
 */
const CITY_ALIASES: Record<string, string> = {
  "bp": "Budapest",
  "bpest": "Budapest",
  "pest": "Budapest",
  "szfv": "Székesfehérvár",
  "fehervar": "Székesfehérvár",
  "feher-var": "Székesfehérvár",
  "fehérvár": "Székesfehérvár",
  "fured": "Balatonfüred",
  "füred": "Balatonfüred",
  "almadi": "Balatonalmádi",
  "almádi": "Balatonalmádi",
  "veszprem": "Veszprém",
  "vszpr": "Veszprém",
  "palota": "Várpalota",
  "siofok": "Siófok"
};

/**
 * Extensive Hungarian Cities Coordinates for distance calculations (Lat, Lng)
 * Contains ALL ~4,500+ Hungarian settlements (cities, towns, villages, nagyközségek, etc.)
 */
export const HUNGARIAN_CITIES: Record<string, SettlementCoords> = ALL_HUNGARIAN_SETTLEMENTS;

/** Fast O(1) normalized city lookup map */
const NORMALIZED_CITY_MAP: Record<string, { name: string; lat: number; lng: number }> = (() => {
  const map: Record<string, { name: string; lat: number; lng: number }> = {};
  for (const [cityName, coords] of Object.entries(ALL_HUNGARIAN_SETTLEMENTS)) {
    const norm = cityName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    map[norm] = { name: cityName, lat: coords.lat, lng: coords.lng };
  }
  return map;
})();

export const RADIUS_OPTIONS = [
  { value: 0, label: "Pontos település (+0 km)" },
  { value: 5, label: "+ 5 km" },
  { value: 10, label: "+ 10 km" },
  { value: 25, label: "+ 25 km" },
  { value: 50, label: "+ 50 km" },
  { value: 150, label: "+ 150 km" },
  { value: 200, label: "+ 200 km" },
  { value: 500, label: "+ 500 km (Országos)" }
];

/**
 * Normalizes city string by removing accents and lowercasing for accurate search matching
 */
export const normalizeCityString = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

/**
 * Extracts city name from a location string e.g. "Budapest, XI. kerület" -> "Budapest"
 * or "Bajót (Komárom-Esztergom)" -> "Bajót"
 */
export const extractCityName = (loc: string): string => {
  if (!loc) return "";
  const firstPart = loc.split(",")[0].trim();
  return firstPart.replace(/\s*\(.*?\)/g, "").trim();
};

/**
 * Smartly finds coordinates for a city input (handles accents, aliases, prefixes & substrings)
 */
export const findCityCoords = (cityInput: string): { name: string; lat: number; lng: number } | null => {
  const rawClean = extractCityName(cityInput);
  const normInput = normalizeCityString(rawClean);
  if (!normInput) return null;

  // 1. Check aliases first (e.g. bp, szfv, fured, almadi, veszprem)
  if (CITY_ALIASES[normInput]) {
    const aliasTarget = CITY_ALIASES[normInput];
    const entry = HUNGARIAN_CITIES[aliasTarget];
    if (entry) return { name: aliasTarget, lat: entry.lat, lng: entry.lng };
  }

  // 2. O(1) Exact normalized match across all 4,500+ settlements
  if (NORMALIZED_CITY_MAP[normInput]) {
    return NORMALIZED_CITY_MAP[normInput];
  }

  // 3. StartsWith match (e.g. "Veszp" -> Veszprém)
  if (normInput.length >= 3) {
    const startsMatch = Object.entries(NORMALIZED_CITY_MAP).find(([normName]) => {
      return normName.startsWith(normInput);
    });
    if (startsMatch) return startsMatch[1];
  }

  // 4. Includes match (e.g. "almádi" -> Balatonalmádi)
  if (normInput.length >= 3) {
    const includesMatch = Object.entries(NORMALIZED_CITY_MAP).find(([normName]) => {
      return normName.includes(normInput);
    });
    if (includesMatch) return includesMatch[1];
  }

  return null;
};

/**
 * Calculates distance in kilometers between two locations using Haversine formula
 */
export const calculateLocationDistance = (locA: string, locB: string): number | null => {
  const cityA = extractCityName(locA);
  const cityB = extractCityName(locB);

  if (!cityA || !cityB) return null;
  if (normalizeCityString(cityA) === normalizeCityString(cityB)) return 0;

  const coordA = findCityCoords(cityA);
  const coordB = findCityCoords(cityB);

  if (!coordA || !coordB) return null;

  const R = 6371; // km
  const dLat = (coordB.lat - coordA.lat) * (Math.PI / 180);
  const dLon = (coordB.lng - coordA.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coordA.lat * (Math.PI / 180)) *
      Math.cos(coordB.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};



