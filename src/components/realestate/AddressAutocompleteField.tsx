import { useState } from "react";
import { CheckCircle2, Loader2, Lock, MapPin, Search } from "lucide-react";
import { getFormattedCitySuggestions } from "@/lib/locationFilter";
import { findCityCoords } from "@/data/carData";
import { BUDAPEST_DISTRICTS, STREET_TYPES } from "@/lib/realEstate/config";
import type { ExactAddress } from "@/lib/realEstate/types";

interface AddressAutocompleteFieldProps {
  value: ExactAddress;
  onChange: (next: ExactAddress) => void;
  showParcelNumber?: boolean;
}

export function AddressAutocompleteField({
  value,
  onChange,
  showParcelNumber = true,
}: AddressAutocompleteFieldProps) {
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);
  const suggestions = getFormattedCitySuggestions();

  const update = (patch: Partial<ExactAddress>) => {
    const merged = { ...value, ...patch };
    // Auto-fill city coordinates as baseline if lat/lng not set yet
    if (patch.city && (merged.latitude === null || merged.longitude === null)) {
      const coords = findCityCoords(patch.city);
      if (coords) {
        merged.latitude = coords.lat;
        merged.longitude = coords.lng;
      }
    }
    onChange(merged);
  };

  const isBudapest = value.city.trim().toLowerCase() === "budapest";

  const lookupCoordinates = async () => {
    const queryParts = [
      value.postalCode,
      value.city,
      value.district,
      `${value.streetName} ${value.streetType}`.trim(),
      value.houseNumber,
      value.country || "Magyarország",
    ].filter(Boolean);
    if (queryParts.length < 2) {
      setGeocodeStatus("Add meg legalább a települést és az utcát a koordináták meghatározásához.");
      return;
    }

    setGeocoding(true);
    setGeocodeStatus(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=hu&q=${encodeURIComponent(
        queryParts.join(", "),
      )}`;
      const res = await fetch(url, { headers: { "Accept-Language": "hu" } });
      if (!res.ok) throw new Error("A címkereső jelenleg nem elérhető.");
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
        const lat = Number(data[0].lat);
        const lng = Number(data[0].lon);
        onChange({ ...value, latitude: lat, longitude: lng });
        setGeocodeStatus(`Koordináták rögzítve (${lat.toFixed(5)}, ${lng.toFixed(5)}).`);
      } else {
        const fallback = findCityCoords(value.city);
        if (fallback) {
          onChange({ ...value, latitude: fallback.lat, longitude: fallback.lng });
          setGeocodeStatus("A pontos házszám nem található a térképen, a település koordinátáit rögzítettük.");
        } else {
          setGeocodeStatus("Nem sikerült pontos koordinátát találni, ellenőrizd a címet.");
        }
      }
    } catch {
      const fallback = findCityCoords(value.city);
      if (fallback) {
        onChange({ ...value, latitude: fallback.lat, longitude: fallback.lng });
        setGeocodeStatus("A település koordinátái rögzítve lettek.");
      } else {
        setGeocodeStatus("A térképes címellenőrzés most nem elérhető.");
      }
    } finally {
      setGeocoding(false);
    }
  };

  const fieldCls =
    "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15";

  return (
    <div className="space-y-5">
      {/* Privacy assurance banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div className="space-y-1 text-xs leading-relaxed text-emerald-950">
          <p className="font-bold">A pontos lakcím nem jelenik meg nyilvánosan</p>
          <p className="text-emerald-900/80">
            A publikus hirdetésben alapértelmezés szerint kizárólag a település, kerület és városrész látható. A
            házszám, emelet, ajtó és pontos térképpont kizárólag ellenőrzött telefonszámú érdeklődő számára, a te
            jóváhagyásod után válik hozzáférhetővé.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold text-slate-700">
          Ország *
          <input
            type="text"
            value={value.country}
            onChange={(e) => update({ country: e.target.value })}
            placeholder="Magyarország"
            className={fieldCls}
            required
          />
        </label>

        <label className="block text-xs font-bold text-slate-700">
          Irányítószám *
          <input
            type="text"
            value={value.postalCode}
            onChange={(e) => update({ postalCode: e.target.value.replace(/[^\dA-Za-z\- ]/g, "").slice(0, 10) })}
            placeholder="pl. 1134"
            className={fieldCls}
            required
          />
        </label>

        <label className="block text-xs font-bold text-slate-700">
          Település *
          <input
            type="text"
            list="ilolit-re-settlements"
            value={value.city}
            onChange={(e) => {
              const cityVal = e.target.value;
              update({
                city: cityVal,
                district: cityVal.trim().toLowerCase() === "budapest" ? value.district : "",
              });
            }}
            placeholder="pl. Budapest, Miskolc, Debrecen"
            className={fieldCls}
            required
          />
          <datalist id="ilolit-re-settlements">
            {suggestions.map((s) => (
              <option key={s.city} value={s.city}>
                {s.label}
              </option>
            ))}
          </datalist>
        </label>

        {isBudapest ? (
          <label className="block text-xs font-bold text-slate-700">
            Budapest kerület *
            <select
              value={value.district || ""}
              onChange={(e) => update({ district: e.target.value })}
              className={fieldCls}
              required
            >
              <option value="">Válassz kerületet</option>
              {BUDAPEST_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-xs font-bold text-slate-700">
            Városrész / környék (opcionális)
            <input
              type="text"
              value={value.neighborhood || ""}
              onChange={(e) => update({ neighborhood: e.target.value })}
              placeholder="pl. Belváros, Nagyerdő, Avas"
              className={fieldCls}
            />
          </label>
        )}

        {isBudapest && (
          <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
            Városrész (opcionális, nyilvánosan megjelenik)
            <input
              type="text"
              value={value.neighborhood || ""}
              onChange={(e) => update({ neighborhood: e.target.value })}
              placeholder="pl. Angyalföld, Újlipótváros, Zugló"
              className={fieldCls}
            />
          </label>
        )}

        <label className="block text-xs font-bold text-slate-700">
          Közterület neve (opcionális)
          <input
            type="text"
            value={value.streetName}
            onChange={(e) => update({ streetName: e.target.value })}
            placeholder="pl. Váci, Kossuth Lajos"
            className={fieldCls}
          />
        </label>

        <label className="block text-xs font-bold text-slate-700">
          Közterület jellege (opcionális)
          <select
            value={value.streetType}
            onChange={(e) => update({ streetType: e.target.value })}
            className={fieldCls}
          >
            <option value="">Nincs megadva</option>
            {STREET_TYPES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>

        {/* Public visibility toggle for street name & type */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:col-span-2">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-xs">
              <span className="font-bold text-slate-900">
                Közterület neve és jellege láthatósága a publikus hirdetésben
              </span>
              <p className="mt-0.5 text-slate-500">
                Te döntöd el, hogy a közterület megjelenjen-e nyilvánosan (házszám nélkül), vagy rejtve maradjon.
              </p>
            </div>
            <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => update({ showPublicStreet: false })}
                className={`rounded-lg px-3 py-1.5 transition ${
                  !value.showPublicStreet
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Rejtve marad
              </button>
              <button
                type="button"
                onClick={() => update({ showPublicStreet: true })}
                className={`rounded-lg px-3 py-1.5 transition ${
                  value.showPublicStreet
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Megjelenhet
              </button>
            </div>
          </div>
        </div>

        <label className="block text-xs font-bold text-slate-700">
          Házszám (opcionális – rejtve marad)
          <input
            type="text"
            value={value.houseNumber}
            onChange={(e) => update({ houseNumber: e.target.value })}
            placeholder="pl. 14/B"
            className={fieldCls}
          />
        </label>

        <label className="block text-xs font-bold text-slate-700">
          Emelet / ajtó (opcionális, rejtve marad)
          <input
            type="text"
            value={value.floorDoor || ""}
            onChange={(e) => update({ floorDoor: e.target.value })}
            placeholder="pl. 3. emelet 12."
            className={fieldCls}
          />
        </label>

        {showParcelNumber && (
          <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
            Helyrajzi szám (opcionális, pl. teleknél vagy külterületnél, rejtve marad)
            <input
              type="text"
              value={value.parcelNumber || ""}
              onChange={(e) => update({ parcelNumber: e.target.value })}
              placeholder="pl. 12345/2"
              className={fieldCls}
            />
          </label>
        )}
      </div>

      {/* Viewing instructions (only shown after approval) */}
      <label className="block text-xs font-bold text-slate-700">
        Instrukció a jóváhagyott megtekintéshez (opcionális – csak jóváhagyás után látható)
        <textarea
          rows={2}
          value={value.viewingInstructions || ""}
          onChange={(e) => update({ viewingInstructions: e.target.value })}
          placeholder="pl. Kapucsengő: 12-es, parkolás a belső udvarban vagy a szemközti utcában."
          className={fieldCls}
        />
      </label>

      {/* Coordinate lookup */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin className="h-4 w-4 text-emerald-600" />
          {value.latitude !== null && value.longitude !== null ? (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Koordináták rögzítve ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)})
            </span>
          ) : (
            <span>Koordináták még nincsenek meghatározva (a hozzávetőleges térképhez szükséges).</span>
          )}
        </div>
        <button
          type="button"
          onClick={lookupCoordinates}
          disabled={geocoding}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Cím koordináták ellenőrzése
        </button>
      </div>
      {geocodeStatus && <p className="text-xs font-medium text-slate-600">{geocodeStatus}</p>}
    </div>
  );
}
