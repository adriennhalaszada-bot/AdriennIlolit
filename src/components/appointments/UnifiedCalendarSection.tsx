import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useUnifiedAppointments } from "@/context/UnifiedAppointmentsContext";
import {
  APPOINTMENT_STATUS_META,
  formatHuDate,
  type UnifiedAppointment,
  type UnifiedAppointmentType,
} from "@/lib/appointments/types";
import { Building2, Calendar as CalendarIcon, Car, ChevronLeft, ChevronRight, Clock, MapPin, Wrench } from "lucide-react";

const WEEKDAYS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const MONTHS_HU = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
];

const TYPE_META: Record<UnifiedAppointmentType, { label: string; icon: any }> = {
  PROPERTY_VIEWING: { label: "Ingatlan", icon: Building2 },
  VEHICLE_VIEWING: { label: "Jármű", icon: Car },
  SERVICE: { label: "Szolgáltatás", icon: Wrench },
};

export function UnifiedCalendarSection() {
  const { appointments } = useUnifiedAppointments();
  const [typeFilter, setTypeFilter] = useState<"ALL" | UnifiedAppointmentType>("ALL");
  const now = new Date();
  const [monthCursor, setMonthCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const buyerAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.role === "buyer" && a.status !== "CANCELLED" && a.status !== "REJECTED")
        .filter((a) => typeFilter === "ALL" || a.appointment_type === typeFilter)
        .sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`)),
    [appointments, typeFilter],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, UnifiedAppointment[]>();
    for (const item of buyerAppointments) {
      if (!item.date) continue;
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [buyerAppointments]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(monthCursor.year, monthCursor.month, 1);
    const daysInMonth = new Date(monthCursor.year, monthCursor.month + 1, 0).getDate();
    // Monday = 0 ... Sunday = 6
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const cells: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < startOffset; i += 1) cells.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d += 1) {
      const mm = String(monthCursor.month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push({ iso: `${monthCursor.year}-${mm}-${dd}`, day: d });
    }
    return cells;
  }, [monthCursor]);

  const visibleAgenda = selectedDay
    ? byDate.get(selectedDay) || []
    : buyerAppointments.filter((a) => a.date >= new Date().toISOString().slice(0, 10));

  const shiftMonth = (delta: number) => {
    const next = new Date(monthCursor.year, monthCursor.month + delta, 1);
    setMonthCursor({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDay(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <CalendarIcon className="h-5 w-5 text-emerald-600" />
            Naptáram
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Ingatlanmegtekintések, járműmegtekintések és szolgáltatási foglalások egységes nézetben.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: "Összes" },
            { id: "PROPERTY_VIEWING", label: "Ingatlan" },
            { id: "VEHICLE_VIEWING", label: "Jármű" },
            { id: "SERVICE", label: "Szolgáltatás" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTypeFilter(f.id as any)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                typeFilter === f.id
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtle legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Building2 className="h-3.5 w-3.5 text-emerald-700" /> Ingatlan
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Car className="h-3.5 w-3.5 text-slate-700" /> Jármű
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Wrench className="h-3.5 w-3.5 text-slate-500" /> Szolgáltatás
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Month Grid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Előző hónap"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-black text-slate-900">
              {monthCursor.year}. {MONTHS_HU[monthCursor.month]}
            </h3>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              aria-label="Következő hónap"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              if (!cell.iso || !cell.day) {
                return <div key={`empty-${idx}`} className="h-12 rounded-xl" />;
              }
              const dayEvents = byDate.get(cell.iso) || [];
              const isSelected = selectedDay === cell.iso;
              const isToday = cell.iso === new Date().toISOString().slice(0, 10);

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : cell.iso)}
                  className={`flex h-12 flex-col items-center justify-center rounded-xl border text-xs transition ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-600 font-bold text-white"
                      : dayEvents.length > 0
                        ? "border-emerald-200 bg-emerald-50/70 font-bold text-slate-900 hover:border-emerald-400"
                        : isToday
                          ? "border-slate-300 bg-slate-50 font-bold text-slate-900"
                          : "border-transparent text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{cell.day}</span>
                  {dayEvents.length > 0 && (
                    <span className="mt-0.5 flex items-center gap-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.appointment_id}
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected
                              ? "bg-white"
                              : ev.appointment_type === "PROPERTY_VIEWING"
                                ? "bg-emerald-600"
                                : ev.appointment_type === "VEHICLE_VIEWING"
                                  ? "bg-slate-800"
                                  : "bg-slate-400"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agenda Panel */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              {selectedDay ? formatHuDate(selectedDay) : "Közelgő időpontok"}
            </h3>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Összes közelgő
              </button>
            )}
          </div>

          {visibleAgenda.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              Nincs aktív időpont ebben a nézetben.
            </div>
          ) : (
            visibleAgenda.map((item) => {
              const typeMeta = TYPE_META[item.appointment_type];
              const TypeIcon = typeMeta.icon;
              const statusMeta = APPOINTMENT_STATUS_META[item.status];
              return (
                <Link
                  key={item.appointment_id}
                  href={item.web_url}
                  className="block rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-emerald-400"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                      <TypeIcon className="h-3.5 w-3.5 text-emerald-700" />
                      {typeMeta.label}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-bold text-slate-950">{item.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      {formatHuDate(item.date)} · {item.start_time}
                    </span>
                    {item.approx_location && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {item.approx_location}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
