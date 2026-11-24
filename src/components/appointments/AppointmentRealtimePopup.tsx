import { useLocation } from "wouter";
import { useUnifiedAppointments } from "@/context/UnifiedAppointmentsContext";
import { formatHuShortDate, NOTIFICATION_CATEGORY_LABELS } from "@/lib/appointments/types";
import { Button } from "@/components/ui/button";
import { Calendar, Car, CheckCircle2, Clock, Home, MapPin, Wrench, X } from "lucide-react";

/**
 * Global real-time modal (desktop/web) & bottom-sheet (mobile/active PWA/app) popup.
 * Displays immediately when a seller confirms, proposes a new time, or cancels an appointment.
 * Dismissing hides the modal while keeping the notification persisted in Értesítések & Riasztások.
 */
export function AppointmentRealtimePopup() {
  const [, setLocation] = useLocation();
  const { pendingPopups, dismissPopup, markNotificationRead } = useUnifiedAppointments();

  const current = pendingPopups[0];
  if (!current) return null;

  const isConfirmed = current.eventType === "APPOINTMENT_CONFIRMED";
  const isProposed = current.eventType === "APPOINTMENT_PROPOSED_NEW_TIME";
  const isVehicle = current.appointmentType === "VEHICLE_VIEWING";
  const isService = current.appointmentType === "SERVICE";

  const TypeIcon = isVehicle ? Car : isService ? Wrench : Home;
  const targetUrl =
    current.webUrl ||
    (current.appointmentId
      ? isVehicle
        ? `/appointments/vehicle/${current.appointmentId}`
        : isService
          ? "/dashboard/bookings/services"
          : `/appointments/property/${current.appointmentId}`
      : "/dashboard/bookings/properties");

  const handleOpenDetails = async () => {
    await dismissPopup(current.id);
    await markNotificationRead(current.id);
    setLocation(targetUrl);
  };

  const handleLater = async () => {
    await dismissPopup(current.id);
  };

  const headline = isConfirmed
    ? "Megtekintésed visszaigazolva"
    : isProposed
      ? "Új időpont elfogadásra vár"
      : current.title;

  const subtext = isConfirmed
    ? isVehicle
      ? "Jó hír! A hirdető elfogadta a jármű megtekintési kérelmedet."
      : isService
        ? "A szolgáltató visszaigazolta a lefoglalt időpontodat."
        : "Jó hír! A hirdető elfogadta az ingatlan megtekintési kérelmedet."
    : current.body;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ilolit-realtime-popup-title"
    >
      {/* Mobile bottom sheet -> Desktop centered modal */}
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        {/* Top drag bar on mobile */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <TypeIcon className="h-3.5 w-3.5" />
                {NOTIFICATION_CATEGORY_LABELS[current.category] || "Megtekintés"}
              </span>
              {pendingPopups.length > 1 && (
                <span className="text-[11px] font-semibold text-slate-500">
                  +{pendingPopups.length - 1} további
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleLater}
              aria-label="Bezárás"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="ilolit-realtime-popup-title"
                className="text-lg font-bold tracking-tight text-slate-950"
              >
                {headline}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{subtext}</p>
            </div>
          </div>

          {/* Preview card with photo, date, time, and short location (no exact address!) */}
          <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200">
              {current.coverImage ? (
                <img
                  src={current.coverImage}
                  alt={current.listingTitle || "Megtekintés"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <TypeIcon className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {current.listingTitle && (
                <p className="truncate text-sm font-bold text-slate-900">{current.listingTitle}</p>
              )}
              {(current.date || current.startTime) && (
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-800">
                  {current.date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      {formatHuShortDate(current.date)}
                    </span>
                  )}
                  {current.startTime && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      {current.startTime}
                    </span>
                  )}
                </div>
              )}
              {current.shortLocation && (
                <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {current.shortLocation}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="button"
              onClick={handleOpenDetails}
              className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Részletek megtekintése
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLater}
              className="h-11 rounded-xl border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Később
            </Button>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Az értesítés bezárás után is megmarad az Értesítések &amp; Riasztások menüben.
          </p>
        </div>
      </div>
    </div>
  );
}
