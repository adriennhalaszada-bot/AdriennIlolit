import { Layout } from "@/components/layout/Layout";
import {
  useGetDashboardStats,
  useGetMe,
  useGetTransactions,
  useGetMyBeautyBookings,
} from "@workspace/api-client-react";
import { formatPrice } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Package, CalendarCheck, Heart, Bell, LogOut, Clock, ChevronRight, GraduationCap, Home as HomeIcon, BookmarkCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useClerk } from "@clerk/react";

export function Dashboard() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get("tab") as any) || "profile";
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "bookings" | "favorites" | "courses" | "listings" | "notifications">(initialTab);

  const { data: me } = useGetMe();
  const { data: stats } = useGetDashboardStats();

  const mockOrders = [
    { id: "ord_101", title: "Zara Elegáns Bőrdzseki M-es", price: 14500, date: "2026-08-18", status: "COMPLETED", statusLabel: "Teljesítve", seller: "HoldfényVándor_21" },
    { id: "ord_102", title: "Nike Air Force 1 Sárga Sneaker (38)", price: 22000, date: "2026-08-15", status: "PROCESSING", statusLabel: "Folyamatban", seller: "Molnár Balázs" },
    { id: "ord_103", title: "Sony WH-1000XM5 Fejhallgató", price: 95000, date: "2026-08-01", status: "RETURNED", statusLabel: "Visszaküldve", seller: "TechStore_HU" }
  ];

  const mockBookings = [
    { id: "b_1", providerName: "Glamour Nail & Lash Stúdió", serviceName: "Gél Lakk & Manikűr", date: "2026-08-25 14:00", price: 8500, status: "CONFIRMED", statusLabel: "Megerősítve" },
    { id: "b_2", providerName: "Chic Fodrászat", serviceName: "Balayage Festés & Vágás", date: "2026-09-02 10:30", price: 24000, status: "PENDING", statusLabel: "Várakozik" }
  ];

  const mockCourses = [
    { id: "c_1", title: "Mesteri Balayage & Színkeverési Technikák 2026", progress: 65, instructor: "Szabó Beatrix Wella Ambasszador", lastLesson: "Modul 3: Szőkítési alapszabályok" },
    { id: "c_2", title: "Digitális Piactéri Értékesítés és Vinted Stratégiák", progress: 100, instructor: "ILOLIT Akadémia", lastLesson: "Vizsga sikeresen teljesítve" }
  ];

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
                      <Input defaultValue={clerkUser?.fullName || (me as any)?.fullName || "Kovács Anna"} className="rounded-xl font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">E-mail cím</label>
                      <Input defaultValue={clerkUser?.primaryEmailAddress?.emailAddress || (me as any)?.email || "felhasznalo@ilolit.hu"} disabled className="rounded-xl bg-slate-50 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Telefonszám</label>
                      <Input defaultValue="+36 30 123 4567" className="rounded-xl font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Szállítási & Számlázási cím</label>
                      <Input defaultValue="1052 Budapest, Váci utca 12." className="rounded-xl font-semibold" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl px-6 cursor-pointer" onClick={() => toast({ title: "Adatok sikeresen frissítve!" })}>
                      Mentés
                    </Button>
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
                  {mockOrders.map((ord) => (
                    <div key={ord.id} className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">{ord.title}</span>
                          <Badge className={`text-[10px] font-extrabold rounded-lg ${
                            ord.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                            ord.status === "PROCESSING" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            {ord.statusLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Eladó: {ord.seller} · Dátum: {ord.date}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-600">{formatPrice(ord.price)}</span>
                      </div>
                    </div>
                  ))}
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
                  {mockBookings.map((b) => (
                    <div key={b.id} className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100">{b.providerName}</h4>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-extrabold mt-0.5">{b.serviceName}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" /> {b.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-emerald-600">{formatPrice(b.price)}</span>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs text-rose-600 border-rose-300 hover:bg-rose-50 font-extrabold cursor-pointer" onClick={() => toast({ title: "Foglalás törölve!" })}>
                          Lemondás
                        </Button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">🛒 Piactér</span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Sony WH-1000XM5 Fejhallgató</h4>
                      <p className="text-xs font-black text-emerald-600">95 000 Ft</p>
                    </div>
                    <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">💄 Szolgáltató</span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Glamour Nail & Lash Stúdió</h4>
                      <p className="text-xs font-semibold text-slate-500">1052 Budapest, Váci u.</p>
                    </div>
                  </div>
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
                  {mockCourses.map((course) => (
                    <div key={course.id} className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{course.title}</h4>
                          <p className="text-xs text-slate-500 font-medium">Oktató: {course.instructor}</p>
                        </div>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {course.progress}% kész
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${course.progress}%` }} />
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs text-slate-500 font-semibold">{course.lastLesson}</span>
                        <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer" asChild>
                          <Link href="/education">Folytatás ➔</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
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
                    <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Zara Elegáns Bőrdzseki M-es</h4>
                        <p className="text-xs text-slate-500 font-medium">Státusz: Aktív · Megtekintve: 42x</p>
                      </div>
                      <span className="text-sm font-black text-emerald-600">14 500 Ft</span>
                    </div>
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
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs font-bold text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">🔔 Új Ingatlan Érkezett a Mentett Keresésedből!</span>
                      <span className="text-[10px] text-emerald-600">10 perce</span>
                    </div>
                    <p className="font-medium">Budapest XI. kerület felújított tégla lakás megjelent a kínálatban.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 text-xs font-bold text-indigo-800 dark:text-indigo-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold">📅 Szolgáltatási Emlékeztető</span>
                      <span className="text-[10px] text-indigo-600">Tegnap</span>
                    </div>
                    <p className="font-medium">Holnap 14:00-kor időpontod van a Glamour Nail Stúdióban.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
