import { useState } from "react";
import { X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VehicleListing } from "@/lib/vehicles/types";
import {
  EQUIPMENT_LABEL_MAP,
  formatHuf,
  formatKm,
  formatPower,
  getConditionLabel,
  getDriveLabel,
  getFuelLabel,
  getTransmissionLabel,
} from "@/lib/vehicles/config";

interface VehicleComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: VehicleListing[];
  distances?: Record<string, number | null>;
  onRemoveVehicle: (id: string) => void;
  onSelectVehicleDetail?: (vehicle: VehicleListing) => void;
}

export function VehicleComparisonModal({
  isOpen,
  onClose,
  vehicles,
  distances = {},
  onRemoveVehicle,
  onSelectVehicleDetail,
}: VehicleComparisonModalProps) {
  const [differencesOnly, setDifferencesOnly] = useState(false);

  if (!isOpen) return null;

  const hasElectric = vehicles.some(
    (v) => v.fuelType === "elektromos" || v.fuelType === "plug_in_hibrid" || Boolean(v.evSpecs?.batteryCapacityKwh),
  );

  const rows: Array<{
    key: string;
    label: string;
    raw: (v: VehicleListing) => string;
    highlight?: boolean;
  }> = [
    { key: "price", label: "Vételár", raw: (v) => formatHuf(v.pricing?.priceHuf), highlight: true },
    { key: "year", label: "Évjárat", raw: (v) => (v.manufactureYear ? `${v.manufactureYear}` : "—") },
    { key: "mileage", label: "Kilométeróra-állás", raw: (v) => formatKm(v.mileageKm) },
    { key: "power", label: "Teljesítmény", raw: (v) => formatPower(v.systemPowerKw || v.powerKw, v.systemPowerHp || v.powerHp) },
    { key: "cc", label: "Hengerűrtartalom", raw: (v) => (v.displacementCc ? `${v.displacementCc} cm³` : "—") },
    { key: "fuel", label: "Üzemanyag", raw: (v) => getFuelLabel(v.fuelType) },
    { key: "trans", label: "Sebességváltó", raw: (v) => getTransmissionLabel(v.transmission) },
    { key: "drive", label: "Hajtás", raw: (v) => getDriveLabel(v.driveType) },
    {
      key: "consumption",
      label: "Fogyasztás",
      raw: (v) =>
        v.evSpecs?.consumptionKwhPer100km
          ? `${v.evSpecs.consumptionKwhPer100km} kWh/100 km`
          : v.factoryConsumptionL
            ? `${v.factoryConsumptionL} l/100 km`
            : "—",
    },
    { key: "condition", label: "Állapot", raw: (v) => getConditionLabel(v.condition) },
    { key: "mot", label: "Műszaki vizsga", raw: (v) => v.history?.motValidUntil || "—" },
    {
      key: "warranty",
      label: "Garancia",
      raw: (v) =>
        v.pricing?.warrantyMonths
          ? `${v.pricing.warrantyMonths} hónap`
          : v.history?.warranty || "—",
    },
    {
      key: "distance",
      label: "Távolság / Település",
      raw: (v) => {
        const d = distances[v.id];
        return d !== undefined && d !== null ? `${v.publicLocation.city} (${d} km)` : v.publicLocation.city || "—";
      },
    },
    ...(hasElectric
      ? [
          {
            key: "ev_bat",
            label: "Akkumulátor",
            raw: (v: VehicleListing) => (v.evSpecs?.batteryCapacityKwh ? `${v.evSpecs.batteryCapacityKwh} kWh` : "—"),
          },
          {
            key: "ev_soh",
            label: "Akkumulátor állapota (SoH)",
            raw: (v: VehicleListing) => (v.evSpecs?.batterySohPercent ? `${v.evSpecs.batterySohPercent}%` : "—"),
          },
          {
            key: "ev_range",
            label: "WLTP hatótáv",
            raw: (v: VehicleListing) => (v.evSpecs?.wltpRangeKm ? `${v.evSpecs.wltpRangeKm} km` : "—"),
          },
          {
            key: "ev_dc",
            label: "DC töltési teljesítmény",
            raw: (v: VehicleListing) => (v.evSpecs?.dcPowerKw ? `${v.evSpecs.dcPowerKw} kW` : "—"),
          },
        ]
      : []),
    {
      key: "equipment",
      label: "Felszereltség",
      raw: (v) =>
        v.equipment && v.equipment.length > 0
          ? `${v.equipment.length} tétel (${v.equipment
              .slice(0, 5)
              .map((id) => EQUIPMENT_LABEL_MAP[id] || id)
              .join(", ")}${v.equipment.length > 5 ? "…" : ""})`
          : "—",
    },
  ];

  const visibleRows = differencesOnly
    ? rows.filter((row) => {
        if (vehicles.length <= 1) return true;
        const vals = new Set(vehicles.map((v) => row.raw(v)));
        return vals.size > 1;
      })
    : rows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Járművek összehasonlítása</h2>
              <p className="text-xs text-slate-500">
                Egyszerre akár 4 jármű részletes összevetése ({vehicles.length} kiválasztva)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={differencesOnly}
                onChange={(e) => setDifferencesOnly(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Csak az eltérések megjelenítése
            </label>
            <button
              type="button"
              onClick={onClose}
              aria-label="Bezárás"
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="p-5 overflow-x-auto overflow-y-auto flex-1">
          {vehicles.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm font-semibold">
              Nincs kiválasztva összehasonlítandó jármű.
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[680px]">
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-48 align-bottom">
                    Paraméter
                  </th>
                  {vehicles.map((v) => (
                    <th key={v.id} className="p-2.5 text-left align-top min-w-[190px]">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => onRemoveVehicle(v.id)}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          title="Eltávolítás"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="aspect-[16/10] rounded-lg overflow-hidden bg-slate-200">
                          {v.photos?.[0]?.url ? (
                            <img src={v.photos[0].url} alt={v.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              Nincs fotó
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-950 line-clamp-2 pr-4">{v.title}</h4>
                        {onSelectVehicleDetail && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onClose();
                              onSelectVehicleDetail(v);
                            }}
                            className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8"
                          >
                            Adatlap megnyitása
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, idx) => (
                  <tr key={row.key} className={idx % 2 === 0 ? "bg-slate-50/70" : "bg-white"}>
                    <td className="p-3 text-xs font-bold text-slate-600 border-t border-slate-200">{row.label}</td>
                    {vehicles.map((v) => (
                      <td
                        key={v.id}
                        className={`p-3 text-xs border-t border-slate-200 ${
                          row.highlight ? "font-black text-emerald-700 text-sm" : "font-semibold text-slate-900"
                        }`}
                      >
                        {row.raw(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
