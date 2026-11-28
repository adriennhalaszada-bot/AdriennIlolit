import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { useUnifiedAppointments } from "@/context/UnifiedAppointmentsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useRealtimeSync } from "@/context/RealtimeSyncContext";
import {
  APPOINTMENT_STATUS_META,
  formatHuDate,
  formatHuShortDate,
} from "@/lib/appointments/types";
import { PropertyViewingsSection } from "@/components/appointments/PropertyViewingsSection";
import { VehicleViewingsSection } from "@/components/appointments/VehicleViewingsSection";
import { UnifiedCalendarSection } from "@/components/appointments/UnifiedCalendarSection";
import { NotificationsCenterSection } from "@/components/appointments/NotificationsCenterSection";
import { formatPrice } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cancelProviderBooking, getMyProviderBookings, type ProviderBookingRecord } from "@/lib/providerBookingApi";
import {
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Heart,
  Home as HomeIcon,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";

export type DashboardTabId =
  | "profile"
  | "orders"
  | "bookings_services"
  | "bookings_properties"
  | "bookings_vehicles"
  | "bookings_test_drives"
  | "calendar"
  | "favorites"
  | "courses"
  | "listings"
  | "notifications";

interface DashboardProps {
  forcedTab?: DashboardTabId;
  highlightAppointmentId?: string;
  params?: Record<string, string | undefined>;
}

function resolveInitialTab(location: string, forcedTab?: DashboardTabId): DashboardTabId {
  if (forcedTab) return forcedTab;
  if (location.startsWith("/dashboard/bookings/properties") || location.startsWith("/appointments/property")) {
    return "bookings_properties";
  }
  if (location.startsWith("/dashboard/bookings/test-drives")) {
    return "bookings_test_drives";
  }
  if (location.startsWith("/dashboard/bookings/vehicles") || location.startsWith("/appointments/vehicle")) {
    return "bookings_vehicles";
  }
  if (location.startsWith("/dashboard/bookings/services")) {
    return "bookings_services";
  }
  if (location.startsWith("/dashboard/calendar")) {
    return "calendar";
  }
  if (location.startsWith("/dashboard/notifications")) {
    return "notifications";
  }
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab === "bookings") return "bookings_services";
  if (
    tab === "profile" ||
    tab === "orders" ||
    tab === "bookings_services" ||
    tab === "bookings_properties" ||
    tab === "bookings_vehicles" ||
    tab === "bookings_test_drives" ||
    tab === "calendar" ||
    tab === "favorites" ||
    tab === "courses" ||
    tab === "listings" ||
    tab === "notifications"
  ) {
    return tab;
  }
  return "profile";
}

export function Dashboard({ forcedTab, highlightAppointmentId }: DashboardProps = {}) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { data: me } = useGetMe();

  const {
    counts,
    nextUpcoming,
    unreadCount: unifiedUnread,
    refreshAll,
  } = useUnifiedAppointments();
  const { unreadCount: legacyUnread } = useNotifications();
  const { isDeveloper } = useRealtimeSync();
  const totalUnreadNotifications = unifiedUnread + legacyUnread;

  const [activeTab, setActiveTab] = useState<DashboardTabId>(() =>
    resolveInitialTab(location, forcedTab),
  );

  useEffect(() => {
    setActiveTab(resolveInitialTab(location, forcedTab));
  }, [location, forcedTab]);

  // Service bookings state (preserved 100% compatibility with provider booking API)
  const [bookings, setBookings] = useState<ProviderBookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getMyProviderBookings()
      .then((result) => {
        if (active) setBookings(result.items.filter((booking) => booking.role === "customer"));
      })
      .catch(() => {})
      .finally(() => active && setBookingsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const cancelBooking = async (booking: ProviderBookingRecord) => {
    try {
      const updated = await cancelProviderBooking(booking.id);
      setBookings((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      await refreshAll();
      toast({ title: "A foglalást lemondtad." });
    } catch (error) {
      toast({
        title: "A lemondás nem sikerült",
        description: error instanceof Error ? error.message : "Próbáld újra.",
        variant: "destructive",
      });
    }
  };

  const navigateTab = (tab: DashboardTabId) => {
    setActiveTab(tab);
    if (tab === "bookings_properties") setLocation("/dashboard/bookings/properties");
    else if (tab === "bookings_vehicles") setLocation("/dashboard/bookings/vehicles");
    else if (tab === "bookings_test_drives") setLocation("/dashboard/bookings/test-drives");
    else if (tab === "bookings_services") setLocation("/dashboard/bookings/services");
    else if (tab === "calendar") setLocation("/dashboard/calendar");
    else if (tab === "notifications") setLocation("/dashboard/notifications");
    else if (location !== "/dashboard") setLocation(`/dashboard?tab=${tab}`);
  };

  const serviceActiveCount =
    counts.service || bookings.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED").length;
  const totalBookingsActive = serviceActiveCount + counts.property + counts.vehicle;

  const isBookingsSectionActive =
    activeTab === "bookings_services" ||
    activeTab === "bookings_properties" ||
    activeTab === "bookings_vehicles" ||
    activeTab === "bookings_test_drives" ||
    activeTab === "calendar";

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/70 pb-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-7 md:flex-row">
            {/* Left Sidebar Navigation — Exact Requested Fiókom Menu Structure */}
            <aside className="w-full shrink-0 space-y-4 md:w-72">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-xl font-black text-emerald-700">
                  {clerkUser?.firstName ? clerkUser.firstName.substring(0, 1) : "I"}
                </div>
                <div className="mt-3">
                  <h3 className="text-base font-extrabold text-slate-950">
                    {clerkUser?.fullName || (me as any)?.fullName || "ILOLIT Felhasználó"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    @{clerkUser?.username || (me as any)?.username || "ilolit_user"}
                  </p>
                </div>
              </div>

              <nav
                aria-label="Fiókom menü"
                className="space-y-1 rounded-3xl border border-slate-200 bg-white p-3 text-sm font-bold shadow-xs"
              >
                {/* 1. Profilom & Adatok */}
                <SidebarButton
                  active={activeTab === "profile"}
                  icon={User}
                  label="Profilom & Adatok"
                  onClick={() => navigateTab("profile")}
                />

                {/* 2. Rendeléseim */}
                <SidebarButton
                  active={activeTab === "orders"}
                  icon={Package}
                  label="Rendeléseim"
                  onClick={() => navigateTab("orders")}
                />

                {/* 3. Foglalásaim + ALWAYS visible dedicated submenus with live counts */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span
                      className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
                        isBookingsSectionActive ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      <CalendarCheck className="h-4 w-4 text-emerald-600" />
                      Foglalásaim
                    </span>
                    {totalBookingsActive > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                        {totalBookingsActive}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    <SubMenuItem
                      active={activeTab === "bookings_services"}
                      icon={Wrench}
                      label="Szolgáltatási foglalásaim"
                      count={serviceActiveCount}
                      onClick={() => navigateTab("bookings_services")}
                    />
                    <SubMenuItem
                      active={activeTab === "bookings_properties"}
                      icon={Building2}
                      label="Ingatlan megtekintéseim"
                      count={counts.property}
                      emphasize={counts.property > 0 || counts.propertyProposed > 0}
                      onClick={() => navigateTab("bookings_properties")}
                    />
                    <SubMenuItem
                      active={activeTab === "bookings_vehicles"}
                      icon={Car}
                      label="Jármű megtekintéseim"
                      count={counts.vehicle + counts.sellerVehiclePending}
                      emphasize={counts.vehicle > 0 || counts.sellerVehiclePending > 0}
                      onClick={() => navigateTab("bookings_vehicles")}
                    />
                    <SubMenuItem
                      active={activeTab === "bookings_test_drives"}
                      icon={Clock}
                      label="Tesztvezetéseim"
                      onClick={() => navigateTab("bookings_test_drives")}
                    />
                    <SubMenuItem
                      active={activeTab === "calendar"}
                      icon={Calendar}
                      label="Naptáram"
                      onClick={() => navigateTab("calendar")}
                    />
                  </div>
                </div>

                {/* 4. Kedvenceim */}
                <SidebarButton
                  active={activeTab === "favorites"}
                  icon={Heart}
                  label="Kedvenceim"
                  onClick={() => navigateTab("favorites")}
                />

                {/* 5. Kurzusaim & Oktatás */}
                <SidebarButton
                  active={activeTab === "courses"}
                  icon={GraduationCap}
                  label="Kurzusaim & Oktatás"
                  onClick={() => navigateTab("courses")}
                />

                {/* 6. Hirdetéseim & Börze */}
                <SidebarButton
                  active={activeTab === "listings"}
                  icon={HomeIcon}
                  label="Hirdetéseim & Börze"
                  onClick={() => navigateTab("listings")}
                />

                {/* 7. Értesítések & Riasztások */}
                <SidebarButton
                  active={activeTab === "notifications"}
                  icon={Bell}
                  label="Értesítések & Riasztások"
                  badge={totalUnreadNotifications}
                  onClick={() => navigateTab("notifications")}
                />

                {/* Kizárólag fejlesztői jogosultsággal látható Rendszerüzemeltetés menü */}
                {isDeveloper && (
                  <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-2">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Rendszerüzemeltetés
                    </div>
                    <Link
                      href="/admin/system-ops"
                      className="mt-1 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-emerald-600 hover:text-white"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate">Háttérfolyamatok és Cloudflare automatizálás</span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </Link>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signOut({ redirectUrl: "/" });
                    } catch (error) {
                      console.error("Clerk sign-out failed:", error);
                    } finally {
                      localStorage.removeItem("ilolit_auth");
                      localStorage.removeItem("ilolit_user");
                      window.dispatchEvent(new Event("ilolit_auth_change"));
                      window.location.assign("/");
                    }
                  }}
                  className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Kijelentkezés</span>
                </button>
              </nav>
            </aside>

            {/* Main Content Area */}
            <main className="min-w-0 flex-1 space-y-6">
              {/* TOP BLOCK: "Következő megtekintésed" + Instant Status Overview */}
              <div className="space-y-4">
                {nextUpcoming && (
                  <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xs">
                    <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          {nextUpcoming.cover_image ? (
                            <img
                              src={nextUpcoming.cover_image}
                              alt={nextUpcoming.title}
                              className="h-full w-full object-cover"
                            />
                          ) : nextUpcoming.appointment_type === "VEHICLE_VIEWING" ? (
                            <Car className="h-7 w-7 text-slate-400" />
                          ) : nextUpcoming.appointment_type === "SERVICE" ? (
                            <Wrench className="h-7 w-7 text-slate-400" />
                          ) : (
                            <Building2 className="h-7 w-7 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                              Következő megtekintésed
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                              {nextUpcoming.appointment_type === "PROPERTY_VIEWING"
                                ? "Ingatlan"
                                : nextUpcoming.appointment_type === "VEHICLE_VIEWING"
                                  ? "Jármű"
                                  : "Szolgáltatás"}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                APPOINTMENT_STATUS_META[nextUpcoming.status].className
                              }`}
                            >
                              {APPOINTMENT_STATUS_META[nextUpcoming.status].label}
                            </span>
                          </div>

                          <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">
                            {nextUpcoming.title}
                          </h2>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            {nextUpcoming.approx_location && (
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                {nextUpcoming.approx_location}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                              <Clock className="h-3.5 w-3.5 text-emerald-600" />
                              {formatHuShortDate(nextUpcoming.date)} {nextUpcoming.start_time}
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                              {nextUpcoming.location_released ? (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  Pontos helyszín elérhető
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                                  Helyszín visszaigazolás után nyílik
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        asChild
                        className="h-11 shrink-0 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <Link href={nextUpcoming.web_url}>Megtekintés részletei</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* At-a-Glance Summary Strip (always visible on Fiókom overview) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => navigateTab("bookings_properties")}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                      activeTab === "bookings_properties"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        Ingatlan megtekintések
                      </p>
                      <p className="mt-1.5 text-lg font-black text-slate-950">{counts.property}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {counts.propertyConfirmed} visszaigazolva · {counts.propertyPending} függőben
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTab("bookings_vehicles")}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                      activeTab === "bookings_vehicles"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Car className="h-4 w-4 text-emerald-600" />
                        Jármű megtekintések
                      </p>
                      <p className="mt-1.5 text-lg font-black text-slate-950">{counts.vehicle}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {counts.vehicleConfirmed} visszaigazolva · {counts.vehiclePending} függőben
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTab("bookings_services")}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                      activeTab === "bookings_services"
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Wrench className="h-4 w-4 text-emerald-600" />
                        Szolgáltatások
                      </p>
                      <p className="mt-1.5 text-lg font-black text-slate-950">{serviceActiveCount}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        Aktív időpontfoglalások
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* ACTIVE PANEL CONTENT */}
              {activeTab === "bookings_properties" && (
                <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <PropertyViewingsSection highlightAppointmentId={highlightAppointmentId} />
                </Card>
              )}

              {activeTab === "bookings_vehicles" && (
                <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <VehicleViewingsSection bookingKindFilter="VIEWING" highlightAppointmentId={highlightAppointmentId} />
                </Card>
              )}

              {activeTab === "bookings_test_drives" && (
                <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <VehicleViewingsSection bookingKindFilter="TEST_DRIVE" highlightAppointmentId={highlightAppointmentId} />
                </Card>
              )}

              {activeTab === "calendar" && (
                <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <UnifiedCalendarSection />
                </Card>
              )}

              {activeTab === "notifications" && (
                <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <NotificationsCenterSection />
                </Card>
              )}

              {/* Szolgáltatási foglalásaim */}
              {activeTab === "bookings_services" && (
                <Card className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between border-b p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <Wrench className="h-5 w-5 text-emerald-600" />
                      Szolgáltatási foglalásaim
                    </CardTitle>
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                      <Link href="/providers">Szolgáltatók keresése</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 p-0 pt-2">
                    {bookingsLoading && (
                      <div className="flex justify-center gap-2 py-10 text-sm text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        Foglalások betöltése...
                      </div>
                    )}
                    {!bookingsLoading && bookings.length === 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                        <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                        <p className="font-bold text-slate-900">Még nincs szolgáltatási foglalásod</p>
                        <Button asChild variant="outline" className="mt-4 rounded-xl text-xs font-bold">
                          <Link href="/providers">Szolgáltatók keresése</Link>
                        </Button>
                      </div>
                    )}
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <h4 className="font-bold text-slate-950">{b.providerName}</h4>
                          <p className="mt-0.5 text-xs font-semibold text-slate-700">{b.serviceName}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Clock className="h-3.5 w-3.5 text-emerald-600" />
                            {formatHuDate(b.bookingDate)} · {b.bookingTime}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-black text-emerald-700">{formatPrice(b.price)}</span>
                          <Badge
                            variant="outline"
                            className={
                              b.status === "CONFIRMED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : b.status === "PENDING"
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-slate-200 bg-white text-slate-600"
                            }
                          >
                            {b.status === "CONFIRMED"
                              ? "Visszaigazolva"
                              : b.status === "PENDING"
                                ? "Visszaigazolásra vár"
                                : b.status === "CANCELLED"
                                  ? "Lemondva"
                                  : "Elutasítva"}
                          </Badge>
                          {b.depositAmount > 0 && (
                            <Badge
                              variant="outline"
                              className={
                                b.depositPayment?.status === "paid"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                  : "border-amber-200 bg-amber-50 text-amber-900"
                              }
                            >
                              {b.depositPayment?.status === "paid"
                                ? "Előleg kifizetve"
                                : `Előleg: ${formatPrice(b.depositAmount)}`}
                            </Badge>
                          )}
                          {(["PENDING", "CONFIRMED"] as string[]).includes(b.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                              onClick={() => cancelBooking(b)}
                            >
                              Lemondás
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Profilom & Adatok */}
              {activeTab === "profile" && (
                <Card className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <CardHeader className="border-b p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <User className="h-5 w-5 text-emerald-600" />
                      Profilom &amp; Adatok
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-0 pt-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Teljes név</label>
                        <Input
                          value={clerkUser?.fullName || (me as any)?.fullName || ""}
                          readOnly
                          className="rounded-xl font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">E-mail cím</label>
                        <Input
                          value={clerkUser?.primaryEmailAddress?.emailAddress || (me as any)?.email || ""}
                          readOnly
                          className="rounded-xl bg-slate-50 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Telefonszám</label>
                        <Input
                          value={clerkUser?.primaryPhoneNumber?.phoneNumber || ""}
                          readOnly
                          placeholder="Nincs megadva"
                          className="rounded-xl font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Szállítási &amp; Számlázási cím</label>
                        <Input value="" readOnly placeholder="Nincs megadva" className="rounded-xl font-semibold" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        asChild
                        className="rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"
                      >
                        <Link href="/settings/profile">Adatok szerkesztése</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rendeléseim */}
              {activeTab === "orders" && (
                <Card className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <CardHeader className="border-b p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <Package className="h-5 w-5 text-emerald-600" />
                      Rendeléseim (Piactér)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-0 pt-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                      <Package className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                      <p className="font-bold text-slate-900">Nincs megjeleníthető rendelés</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Itt kizárólag a valóban létrejött piactéri rendelések jelennek meg.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Kedvenceim */}
              {activeTab === "favorites" && (
                <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <CardHeader className="border-b p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <Heart className="h-5 w-5 text-emerald-600" />
                      Kedvenceim
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-0 pt-2">
                    <p className="text-sm text-slate-600">
                      Elmentett termékek, szolgáltatók, ingatlanok, járművek és kurzusok egy közös listában.
                    </p>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                      <Heart className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                      <p className="font-bold text-slate-900">A kedvenceid a külön kedvencek oldalon érhetők el</p>
                      <Button asChild variant="outline" className="mt-4 rounded-xl text-xs font-bold">
                        <Link href="/dashboard/favorites">Kedvencek megnyitása</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Kurzusaim & Oktatás */}
              {activeTab === "courses" && (
                <Card className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <CardHeader className="border-b p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                      Kurzusaim &amp; Oktatás
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-0 pt-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                      <GraduationCap className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                      <p className="font-bold text-slate-900">Nincs aktív kurzusod</p>
                      <Button asChild variant="outline" className="mt-4 rounded-xl text-xs font-bold">
                        <Link href="/education">Kurzusok megtekintése</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hirdetéseim & Börze */}
              {activeTab === "listings" && (
                <Card className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between border-b p-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <HomeIcon className="h-5 w-5 text-emerald-600" />
                      Hirdetéseim &amp; Börze
                    </CardTitle>
                    <Button
                      asChild
                      size="sm"
                      className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Link href="/sell">Új hirdetés</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6 p-0 pt-2">
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Ágazati irányítópultok
                      </h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Link
                          href="/real-estate/admin"
                          className="group block space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                              <Building2 className="h-4 w-4 text-emerald-600" />
                              Saját Ingatlan Admin
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                          </div>
                          <p className="text-xs text-slate-600">
                            Hirdetett ingatlanok, megtekintési idősávok és jóváhagyások.
                          </p>
                        </Link>

                        <Link
                          href="/vehicles/admin"
                          className="group block space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                              <Car className="h-4 w-4 text-emerald-600" />
                              Saját Járműadmin
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                          </div>
                          <p className="text-xs text-slate-600">
                            Járműhirdetések, megtekintési és tesztvezetési idősávok, kereskedői profil.
                          </p>
                        </Link>

                        <Link
                          href="/providers/dashboard"
                          className="group block space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                              <Wrench className="h-4 w-4 text-emerald-600" />
                              Szolgáltatói Admin
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                          </div>
                          <p className="text-xs text-slate-600">
                            Szolgáltatói naptár, árlista és beérkezett ügyfélfoglalások.
                          </p>
                        </Link>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-slate-200 pt-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Piactéri &amp; jármű hirdetéseim
                      </h4>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                        <p className="text-sm font-bold text-slate-900">
                          A hirdetéseid kezeléséhez nyisd meg a hirdetéskezelőt.
                        </p>
                        <Button asChild variant="outline" className="mt-3 rounded-xl text-xs font-bold">
                          <Link href="/dashboard/listings">Saját hirdetések</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SidebarButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-between rounded-2xl p-3 transition ${
        active
          ? "bg-emerald-600 font-extrabold text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-center gap-1.5">
        {badge !== undefined && badge > 0 && (
          <span
            className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
              active ? "bg-white/20 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {badge}
          </span>
        )}
        <ChevronRight className="h-4 w-4 opacity-50" />
      </span>
    </button>
  );
}

function SubMenuItem({
  active,
  icon: Icon,
  label,
  count,
  emphasize,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  count?: number;
  emphasize?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
        active
          ? "bg-emerald-600 font-bold text-white"
          : emphasize
            ? "bg-white font-bold text-slate-950 border border-emerald-200 hover:bg-emerald-50/60"
            : "text-slate-700 hover:bg-white"
      }`}
    >
      <span className="flex items-center gap-2 truncate">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white" : "text-emerald-600"}`} />
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && count > 0 && (
        <span
          className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
