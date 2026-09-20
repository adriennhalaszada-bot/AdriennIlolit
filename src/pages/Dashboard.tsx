import { Layout } from "@/components/layout/Layout";
import {
  useGetMe,
} from "@workspace/api-client-react";
import { formatPrice } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Package, CalendarCheck, Heart, Bell, LogOut, Clock, ChevronRight, GraduationCap, Home as HomeIcon, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useClerk } from "@clerk/react";
import { cancelProviderBooking, getMyProviderBookings, type ProviderBookingRecord } from "@/lib/providerBookingApi";

export function Dashboard() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get("tab") as any) || "profile";
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "bookings" | "favorites" | "courses" | "listings" | "notifications">(initialTab);

  const { data: me } = useGetMe();
  const [bookings, setBookings] = useState<ProviderBookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getMyProviderBookings().then((result) => {
      if (active) setBookings(result.items.filter((booking) => booking.role === "customer"));
    }).catch(() => {}).finally(() => active && setBookingsLoading(false));
    return () => { active = false; };
  }, []);

  const cancelBooking = async (booking: ProviderBookingRecord) => {
    try {
      const updated = await cancelProviderBooking(booking.id);
      setBookings((items) => items.map((item) => item.id === updated.id ? updated : item));
      toast({ title: "A foglalást lemondtad." });
    } catch (error) {
      toast({ title: "A lemondás nem sikerült", description: error instanceof Error ? error.message : "Próbáld újra.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar Navigation */}
          <aside className="w-full md:w-64 space-y-2 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 font-black text-2xl flex items-center justify-center mx-auto border-2 border-emerald-500 shadow-sm">
                {clerkUser?.firstName ? clerkUser.firstName.substring(0, 1) : "I"}
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
                  {clerkUser?.fullName || (me as any)?.fullName || "ILOLIT Felhasználó"}
                </h3>
                <p className="text-xs text-slate-500 font-bold">@{clerkUser?.username || (me as any)?.username || "ilolit_user"}</p>
              </div>
            </div>

            <nav className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 space-y-1 shadow-sm font-bold text-sm">
              {[
                { id: "profile", label: "Profilom & Adatok", icon: User },
                { id: "orders", label: "Rendeléseim", icon: Package },
                { id: "bookings", label: "Foglalásaim", icon: CalendarCheck },
                { id: "favorites", label: "Kedvenceim", icon: Heart },
                { id: "courses", label: "Kurzusaim & Oktatás", icon: GraduationCap },
                { id: "listings", label: "Hirdetéseim & Börze", icon: HomeIcon },
                { id: "notifications", label: "Értesítések & Riasztások", icon: Bell },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                    activeTab === item.id
                      ? "bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-600/20"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}

              <button
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
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold transition-all mt-4 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Kijelentkezés</span>
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 space-y-6">
            {/* Profilom Tab */}
            {activeTab === "profile" && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <CardHeader className="p-0 border-b pb-4">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" /> Profilom & Fiókbeállítások
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Teljes név</label>
                      <Input value={clerkUser?.fullName || (me as any)?.fullName || ""} readOnly className="rounded-xl font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">E-mail cím</label>
                      <Input value={clerkUser?.primaryEmailAddress?.emailAddress || (me as any)?.email || ""} readOnly className="rounded-xl bg-slate-50 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Telefonszám</label>
                      <Input value={clerkUser?.primaryPhoneNumber?.phoneNumber || ""} readOnly placeholder="Nincs megadva" className="rounded-xl font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Szállítási & Számlázási cím</label>
                      <Input value="" readOnly placeholder="Nincs megadva" className="rounded-xl font-semibold" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-6 cursor-pointer"><Link href="/settings/profile">Adatok szerkesztése</Link></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rendeléseim Tab */}
            {activeTab === "orders" && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <CardHeader className="p-0 border-b pb-4">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" /> Rendeléseim (Piactér)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3 pt-2">
                  <div className="rounded-2xl border bg-slate-50 p-8 text-center dark:bg-slate-800/50"><Package className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p className="font-extrabold">Nincs megjeleníthető rendelés</p><p className="mt-1 text-xs text-muted-foreground">Itt kizárólag a valóban létrejött piactéri rendelések fognak megjelenni.</p></div>
                </CardContent>
              </Card>
            )}

            {/* Foglalásaim Tab */}
            {activeTab === "bookings" && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <CardHeader className="p-0 border-b pb-4">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-emerald-600" /> Időpontfoglalásaim (Szolgáltatások)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3 pt-2">
                  {bookingsLoading && <div className="flex justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Foglalások betöltése…</div>}
                  {!bookingsLoading && bookings.length === 0 && <div className="rounded-2xl border bg-slate-50 p-8 text-center dark:bg-slate-800/50"><CalendarCheck className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p className="font-extrabold">Még nincs foglalásod</p><Button asChild variant="outline" className="mt-4 rounded-xl"><Link href="/providers">Szolgáltatók keresése</Link></Button></div>}
                  {bookings.map((b) => (
                    <div key={b.id} className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100">{b.providerName}</h4>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-extrabold mt-0.5">{b.serviceName}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" /> {b.bookingDate} · {b.bookingTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-emerald-600">{formatPrice(b.price)}</span>
                        <Badge variant="outline">{b.status === "CONFIRMED" ? "Megerősítve" : b.status === "PENDING" ? "Válaszra vár" : b.status === "CANCELLED" ? "Lemondva" : "Elutasítva"}</Badge>
                        {(["PENDING", "CONFIRMED"] as string[]).includes(b.status) && <Button variant="outline" size="sm" className="rounded-xl text-xs text-rose-600 border-rose-300 hover:bg-rose-50 font-extrabold cursor-pointer" onClick={() => cancelBooking(b)}>
                          Lemondás
                        </Button>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Kedvencek Tab */}
            {activeTab === "favorites" && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <CardHeader className="p-0 border-b pb-4">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" /> Universal Kedvenceim
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3 pt-2">
                  <p className="text-sm text-slate-600 font-medium">Elmentett termékek, szolgáltatók, ingatlanok és kurzusok egy közös listában.</p>
                  <div className="rounded-2xl border bg-slate-50 p-8 text-center dark:bg-slate-800/40"><Heart className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p className="font-extrabold">A kedvenceid a külön kedvencek oldalon érhetők el</p><Button asChild variant="outline" className="mt-4 rounded-xl"><Link href="/dashboard/favorites">Kedvencek megnyitása</Link></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Kurzusaim Tab */}
            {activeTab === "courses" && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <CardHeader className="p-0 border-b pb-4">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-600" /> Kurzusaim (ILOLIT Oktatás)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4 pt-2">
                  <div className="rounded-2xl border bg-slate-50 p-8 text-center dark:bg-slate-800/40"><GraduationCap className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p className="font-extrabold">Nincs aktív kurzusod</p><Button asChild variant="outline" className="mt-4 rounded-xl"><Link href="/education">Kurzusok megtekintése</Link></Button></div>
                </CardContent>
              </Card>
            )}

            {/* Hirdetéseim & Szolgáltatói Kezelőpultok Tab */}
            {activeTab === "listings" && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <CardHeader className="p-0 border-b pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <HomeIcon className="w-5 h-5 text-amber-500" /> Saját Hirdetéseim & Szolgáltatói Portáljaim
                  </CardTitle>
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl">
                    <Link href="/sell">+ Új Hirdetés</Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0 pt-2 space-y-6">
                  {/* Quick-Access Vertical Dashboards */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Ágazati Irányítópultok & Kezelők</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Link href="/real-estate/dashboard" className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition space-y-2 block group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-800 flex items-center gap-1">🏢 Ingatlan Kezelőpult</span>
                          <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">Hirdetett ingatlanok, megtekintési idősávok és vevőjelölti időpontok.</p>
                      </Link>

                      <Link href="/vehicles/dashboard" className="p-4 rounded-2xl border border-slate-200 hover:border-slate-800 bg-slate-100/50 hover:bg-slate-100 transition space-y-2 block group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1">🚗 Jármű Kezelőpult</span>
                          <ChevronRight className="w-4 h-4 text-slate-700 group-hover:translate-x-1 transition" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">Autó/motor hirdetések, tesztvezetés foglalások és ajánlatok.</p>
                      </Link>

                      <Link href="/beauty/dashboard" className="p-4 rounded-2xl border border-slate-200 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-50 transition space-y-2 block group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-rose-800 flex items-center gap-1">💄 Szépségápolási Admin</span>
                          <ChevronRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">Szalon naptár, szolgáltatás árlista, munkatársak és NAV nyugta.</p>
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Aktív Piactéri & Ágazati Hirdetéseim</h4>
                    <div className="rounded-2xl border bg-slate-50 p-6 text-center dark:bg-slate-800/40"><p className="text-sm font-extrabold">A hirdetéseid kezeléséhez nyisd meg a piactéri hirdetéskezelőt.</p><Button asChild variant="outline" className="mt-3 rounded-xl"><Link href="/dashboard/listings">Saját hirdetések</Link></Button></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Értesítések Tab */}
            {activeTab === "notifications" && (
              <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                <CardHeader className="p-0 border-b pb-4">
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" /> Értesítések & Mentett Keresések
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3 pt-2">
                  <div className="rounded-2xl border bg-slate-50 p-8 text-center dark:bg-slate-800/40"><Bell className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p className="font-extrabold">Valódi értesítéseid az értesítési központban láthatók</p><Button asChild variant="outline" className="mt-4 rounded-xl"><Link href="/notifications">Értesítések megnyitása</Link></Button></div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
