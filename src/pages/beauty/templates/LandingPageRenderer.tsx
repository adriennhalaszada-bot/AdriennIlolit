import React from "react";
import type { ProfileTemplate } from "./templateConfig";
import type { BeautyProvider } from "@workspace/api-client-react";
import {
  MapPin,
  ShieldCheck,
  Navigation,
  ImageIcon,
  Video,
  Calendar,
  Lock,
  EyeOff,
  Star,
  Check,
  Sparkles,
  Phone,
  Clock,
  Heart,
  Award,
  ChevronRight,
  Sparkle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface LandingPageRendererProps {
  template: ProfileTemplate;
  provider: BeautyProvider;
  selectedServiceId: string;
  setSelectedServiceId: (id: string) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedTime: string;
  setSelectedTime: (t: string) => void;
  setShowCalendarModal: (show: boolean) => void;
  bookedTimeSlotsForSelectedDate: string[];
  bookingConfirmed: boolean;
  setBookingConfirmed: (conf: boolean) => void;
  clientName: string;
  setClientName: (name: string) => void;
  clientEmail: string;
  setClientEmail: (email: string) => void;
  handleCustomerBookingSubmit: (e: React.FormEvent) => void;
  waitlistName: string;
  setWaitlistName: (name: string) => void;
  waitlistPhone: string;
  setWaitlistPhone: (phone: string) => void;
  waitlistDate: string;
  setWaitlistDate: (d: string) => void;
  waitlistTimeSlot: string;
  setWaitlistTimeSlot: (s: string) => void;
  waitlistSubscribed: boolean;
  handleWaitlistSubmit: (e: React.FormEvent) => void;
  isSlotAvailableForWaitlist: boolean;
  activeSlotsForSelectedDate?: string[];
  isPreviewMode?: boolean;
  onApplyTemplateInPreview?: () => void;
}

export const LandingPageRenderer: React.FC<LandingPageRendererProps> = ({
  template,
  provider,
  selectedServiceId,
  setSelectedServiceId,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  setShowCalendarModal,
  bookedTimeSlotsForSelectedDate,
  bookingConfirmed,
  setBookingConfirmed,
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  handleCustomerBookingSubmit,
  waitlistName,
  setWaitlistName,
  waitlistPhone,
  setWaitlistPhone,
  waitlistDate,
  setWaitlistDate,
  waitlistTimeSlot,
  setWaitlistTimeSlot,
  waitlistSubscribed,
  handleWaitlistSubmit,
  isSlotAvailableForWaitlist,
  activeSlotsForSelectedDate,
  isPreviewMode = false,
  onApplyTemplateInPreview,
}) => {
  const fontStyle = provider.fontFamily ? { fontFamily: `"${provider.fontFamily}", sans-serif` } : {};

  // Common Booking Form Component supporting light and dark themes
  const renderBookingForm = (themeMode: "light" | "dark" = "light") => {
    const isLight = themeMode === "light";

    return (
      <div
        id="booking-calendar-section"
        className={`p-6 sm:p-8 rounded-3xl border shadow-xl my-10 transition ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-slate-900/95 backdrop-blur border-white/20 text-white shadow-2xl"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <span>📅</span> Vevői Időpontfoglaló Naptár
          </h2>
          <Badge
            variant="outline"
            className={
              isLight
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 text-xs px-3 py-1 font-bold"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-3 py-1 font-bold"
            }
          >
            🔒 100% Diszkrét Adatvédelem
          </Badge>
        </div>

        <div
          className={`p-3.5 mb-6 rounded-2xl text-xs flex items-center gap-2 border ${
            isLight
              ? "bg-slate-50 border-slate-200 text-slate-700"
              : "bg-slate-950/80 border-violet-500/30 text-slate-300"
          }`}
        >
          <EyeOff className={`w-4 h-4 flex-shrink-0 ${isLight ? "text-violet-600" : "text-violet-400"}`} />
          <span>Adatvédelmi garancia: Más vevők adatait teljes mértékben rejtjük a védelmedben!</span>
        </div>

        {bookingConfirmed ? (
          <div
            className={`p-8 rounded-2xl text-center border shadow-2xl ${
              isLight ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-emerald-950/90 border-emerald-500 text-white"
            }`}
          >
            <div className="text-5xl mb-3">🎉</div>
            <h4 className="text-xl font-black mb-2">Foglalási kérés sikeresen rögzítve!</h4>
            <p className="text-sm mb-2">
              Foglaló neve: <span className="font-bold">{clientName}</span> ({clientEmail})
            </p>
            <p className="text-xs mb-4">
              Kiválasztott időpont: <span className="font-extrabold">{selectedDate} - {selectedTime}</span>
            </p>

            {/* 1.3 Google Calendar Szinkronizáció Gomb */}
            <div className="mb-6">
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Foglalás: " + (provider.displayName || "Szalon"))}&dates=${(selectedDate || "2026-08-11").replace(/-/g, "")}T100000Z/${(selectedDate || "2026-08-11").replace(/-/g, "")}T110000Z&details=${encodeURIComponent("Beauty Lolit időpontfoglalás a(z) " + (provider.displayName || "Szalon") + " szalonban.")}&location=${encodeURIComponent(provider.address || (provider as any).district || "Budapest")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>📅 Hozzáadás Google Naptáramhoz (Google Calendar Sync) →</span>
              </a>
            </div>

            <Button
              onClick={() => {
                setBookingConfirmed(false);
                setClientName("");
                setClientEmail("");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
            >
              Újabb időpont foglalása
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCustomerBookingSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className={`text-xs font-bold block uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                1. Válassz szolgáltatást:
              </label>
              {(provider.services || []).map((s: any) => {
                const isSelected = selectedServiceId === s.id || (!selectedServiceId && s === (provider.services || [])[0]);
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedServiceId(s.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? isLight
                          ? "bg-violet-50 border-violet-500 ring-2 ring-violet-500/20 text-slate-900 shadow-md font-bold"
                          : "bg-violet-600/40 border-violet-400 ring-2 ring-violet-400/20 text-white shadow-md"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-800 hover:border-violet-300"
                        : "bg-slate-800/60 border-white/10 text-slate-200 hover:border-violet-400"
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-bold uppercase flex items-center gap-1 ${isLight ? "text-violet-700" : "text-violet-300"}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {s.type}
                      </div>
                      <div className="font-bold text-base">{s.name}</div>
                      <div className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>{s.duration} perc</div>
                    </div>
                    <div className={`font-extrabold text-lg ${isLight ? "text-violet-700" : "text-violet-300"}`}>
                      {(s.price || 0).toLocaleString()} Ft
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/10"}`}>
              <div>
                <label className={`text-xs font-bold mb-2 flex items-center justify-between ${isLight ? "text-slate-800" : "text-amber-300"}`}>
                  <span>2. Válassz napot a naptárból:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(true)}
                  className={`w-full text-xs rounded-xl p-3 font-extrabold flex items-center justify-between transition cursor-pointer border shadow ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 hover:bg-slate-100"
                      : "bg-slate-900 border-amber-500/40 text-white hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-violet-600" />
                    {selectedDate || new Date().toISOString().split('T')[0]}
                  </span>
                  <span className="bg-violet-600 text-white text-[11px] px-2.5 py-0.5 rounded-md font-black">
                    Felugró Naptár 📅
                  </span>
                </button>
              </div>

              <div>
                <label className={`text-xs font-bold mb-2 block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  3. Válassz szabad idősávot ({selectedDate}):
                </label>

                {(() => {
                  const displaySlots = activeSlotsForSelectedDate || [];

                  if (displaySlots.length === 0) {
                    return (
                      <div className={`p-4 rounded-xl border text-xs font-bold text-center ${
                        isLight ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-rose-950/40 border-rose-800 text-rose-200"
                      }`}>
                        ⚠️ A szolgáltató erre a napra ({selectedDate}) még nem hirdetett meg szabad időpontokat!
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {displaySlots.map((t) => {
                        const isBooked = bookedTimeSlotsForSelectedDate.includes(t);
                        const isSelected = selectedTime === t;

                        if (isBooked) {
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled
                              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed flex items-center justify-center gap-1 opacity-70"
                            >
                              <Lock className="w-3.5 h-3.5" /> {t} (Foglalt)
                            </button>
                          );
                        }

                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTime(t)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition border flex items-center justify-center gap-1 cursor-pointer ${
                              isSelected
                                ? "bg-violet-600 text-white border-violet-600 shadow-md ring-2 ring-violet-400"
                                : isLight
                                ? "bg-white text-slate-900 border-slate-300 hover:border-violet-500 hover:bg-violet-50"
                                : "bg-slate-900 text-slate-100 border-slate-700 hover:border-violet-400 hover:bg-slate-800"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 text-emerald-500" /> 🟢 {t}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className={`p-5 rounded-2xl border space-y-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/10"}`}>
              <label className={`text-xs font-bold block uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                4. Add meg a kapcsolattartási adataidat:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs mb-1 block font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}>Teljes Neved *</label>
                  <Input
                    required
                    placeholder="pl. Kovács Anna"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className={isLight ? "bg-white border-slate-300 text-slate-900 text-xs" : "bg-slate-900 border-white/20 text-white text-xs"}
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}>E-mail címed *</label>
                  <Input
                    required
                    type="email"
                    placeholder="pl. anna@example.hu"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className={isLight ? "bg-white border-slate-300 text-slate-900 text-xs" : "bg-slate-900 border-white/20 text-white text-xs"}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl text-sm shadow-xl cursor-pointer transition"
              >
                ✓ FOGLALÁSI KÉRÉS BEKÜLDÉSE (JÓVÁHAGYÁSRA) →
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  };

  // Common Waitlist Component supporting light and dark themes
  const renderWaitlistForm = (themeMode: "light" | "dark" = "light") => {
    const isLight = themeMode === "light";

    return (
      <div
        id="waitlist-section"
        className={`p-6 sm:p-8 border-2 rounded-3xl shadow-xl my-10 transition ${
          isLight ? "bg-amber-50/90 border-amber-300 text-amber-950" : "bg-slate-950 border-amber-500/40 text-white shadow-2xl"
        }`}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            <h3 className="text-xl font-black">Push Szolgáltatásfigyelő & Várólista</h3>
          </div>
          <Badge className={isLight ? "bg-amber-200 text-amber-900 font-bold" : "bg-amber-500/20 text-amber-300 font-bold"}>
            🔔 Azonnali Push Értesítés Megüresedéskor
          </Badge>
        </div>

        <p className={`text-xs mb-4 ${isLight ? "text-amber-900/80" : "text-slate-300"}`}>
          Ha nem találsz neked megfelelő szabad időpontot, iratkozz fel az alábbi idősávra! Amint valaki lemondja a foglalását, azonnal Push értesítést kapsz!
        </p>

        {waitlistSubscribed ? (
          <div className={`p-6 border rounded-2xl text-center ${isLight ? "bg-emerald-100 border-emerald-400 text-emerald-950" : "bg-emerald-950 border-emerald-500 text-white"}`}>
            <div className="text-4xl mb-2">🔔</div>
            <h4 className="font-extrabold text-base mb-1">Sikeresen feliratkoztál a Szolgáltatásfigyelőre!</h4>
            <p className="text-xs">
              Értesítünk amint megüresedik egy hely ezen a napon: <span className="font-bold">{waitlistDate}</span> ({waitlistTimeSlot} idősávban).
            </p>
          </div>
        ) : (
          <form onSubmit={handleWaitlistSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold mb-1 flex items-center justify-between">
                  <span>📅 Kívánt Dátum:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(true)}
                  className={`w-full text-xs rounded-xl p-2.5 font-bold flex items-center justify-between cursor-pointer border ${
                    isLight ? "bg-white border-amber-300 text-slate-900" : "bg-slate-900 border-amber-500/40 text-white"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    {waitlistDate || new Date().toISOString().split('T')[0]}
                  </span>
                  <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-md font-black">
                    Felugró Naptár 📅
                  </span>
                </button>
              </div>
              <div>
                <label className="text-[11px] font-bold mb-1 flex items-center gap-1">⏰ Idősáv vagy pontos idő:</label>
                <select
                  value={waitlistTimeSlot}
                  onChange={(e) => setWaitlistTimeSlot(e.target.value)}
                  className={`w-full text-xs rounded-xl p-2.5 font-bold outline-none cursor-pointer border ${
                    isLight ? "bg-white border-amber-300 text-slate-900" : "bg-slate-900 border-white/20 text-amber-300"
                  }`}
                >
                  <option value="all">⏰ Bármely idősáv (08:00 - 20:00)</option>
                  <option value="morning">🌅 Délelőtt (08:00 - 12:00)</option>
                  <option value="afternoon">☀️ Délután (12:00 - 17:00)</option>
                  <option value="evening">🌙 Este (17:00 - 20:00)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                required
                placeholder="Neved *"
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                className={isLight ? "bg-white border-amber-300 text-slate-900 text-xs" : "bg-slate-900 border-white/20 text-white text-xs"}
              />
              <Input
                required
                placeholder="Telefonszámod vagy E-mailed *"
                value={waitlistPhone}
                onChange={(e) => setWaitlistPhone(e.target.value)}
                className={isLight ? "bg-white border-amber-300 text-slate-900 text-xs" : "bg-slate-900 border-white/20 text-white text-xs"}
              />
            </div>

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3.5 rounded-xl text-xs shadow-md">
              🔔 FELIRATKOZÁS PUSH ÉRTESÍTÉSRE →
            </Button>
          </form>
        )}
      </div>
    );
  };

  // Reusable Media Section (6-8 Portfolio Photos + Presentation Video)
  const renderMediaSection = (themeMode: "light" | "dark" = "light") => {
    const isLight = themeMode === "light";
    const defaultImages =
      (provider as any).portfolioImages && (provider as any).portfolioImages.length > 0
        ? (provider as any).portfolioImages.slice(0, 8)
        : [
            "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&h=600&fit=crop",
          ];

    return (
      <div className="space-y-8 my-8">
        {/* Presentation Video Section */}
        <div className={`p-6 sm:p-8 rounded-3xl border ${isLight ? "bg-white border-slate-200 shadow-lg text-slate-900" : "bg-slate-900 border-slate-800 text-white shadow-2xl"}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Video className={`w-5 h-5 ${isLight ? "text-violet-600" : "text-amber-400"}`} /> 🎬 Bemutatkozó Videónk
            </h3>
            <Badge className={isLight ? "bg-violet-100 text-violet-800 font-bold" : "bg-amber-500/20 text-amber-300 font-bold"}>
              HD Szalon Videó
            </Badge>
          </div>
          <div className="aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-inner">
            <iframe
              src={(provider as any).videoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ"}
              className="w-full h-full border-0"
              allowFullScreen
              title="Szalon Bemutató Videó"
            />
          </div>
        </div>

        {/* 6-8 Photo Gallery Grid */}
        <div className={`p-6 sm:p-8 rounded-3xl border ${isLight ? "bg-white border-slate-200 shadow-lg text-slate-900" : "bg-slate-900 border-slate-800 text-white shadow-2xl"}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black flex items-center gap-2">
              <ImageIcon className={`w-5 h-5 ${isLight ? "text-violet-600" : "text-amber-400"}`} /> 📸 Munkáink Portfólió Galériája ({defaultImages.length} fotó)
            </h3>
            <span className={`text-xs font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Előtte-Utána Eredmények</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {defaultImages.map((imgUrl: string, idx: number) => (
              <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition cursor-pointer">
                <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex items-end">
                  <span className="text-white text-[11px] font-bold">Minta #{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const styleId = template.id;

  // TEMPLATE #1: Aura Atelier (Light 1/8)
  if (styleId === 1) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-6 sm:p-12 shadow-xl border border-slate-200">
            <div className="space-y-5">
              <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-xs px-3 py-1 font-extrabold uppercase">
                ✨ Sablon #1 – Modern Split-Screen Couture
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">{provider.displayName}</h1>
              <div className="flex items-center gap-3 text-sm font-semibold text-violet-700">
                <span className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg font-extrabold">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> 5.0 (48 értékelés)
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-4 h-4 text-violet-600" /> {(provider as any).district || "Budapest"} | {provider.address}
                </span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{provider.bio}</p>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img src={provider.profileImageUrl || template.bgImage || ""} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #2: Élégance Couture (Light 2/8)
  if (styleId === 2) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="bg-white border-2 border-stone-300 p-6 sm:p-12 text-center space-y-6 shadow-2xl">
            <div className="border-b-2 border-stone-900 pb-4">
              <span className="tracking-[0.3em] uppercase text-xs font-black text-amber-800">Sablon #2 – Editorial High-Fashion Magazine</span>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-900 mt-1 uppercase">{provider.displayName}</h1>
            </div>
            <p className="text-xs text-stone-700 italic max-w-xl mx-auto">{provider.bio}</p>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #3: Solstice Sanctuary (Light 3/8)
  if (styleId === 3) {
    return (
      <div className="min-h-screen bg-emerald-50/50 text-slate-900 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-lg space-y-4">
            <Badge className="bg-emerald-700 text-emerald-100 text-xs px-3 py-1 font-bold">🌿 Sablon #3 – Scandinavian Bento Grid</Badge>
            <h1 className="text-3xl sm:text-5xl font-black">{provider.displayName}</h1>
            <p className="text-emerald-100 text-sm leading-relaxed">{provider.bio}</p>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #4: Lumière Studio (Light 4/8)
  if (styleId === 4) {
    return (
      <div className="min-h-screen bg-amber-50/30 text-stone-900 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="bg-white p-8 sm:p-12 rounded-[36px] border border-amber-200 shadow-xl text-center space-y-4">
            <Badge className="bg-amber-100 text-amber-900 text-xs px-4 py-1 font-extrabold uppercase">✨ Sablon #4 – Glassmorphism Luxury Stack</Badge>
            <h1 className="text-4xl sm:text-6xl font-black text-amber-950">{provider.displayName}</h1>
            <p className="text-amber-900/80 text-sm max-w-xl mx-auto">{provider.bio}</p>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #5: Minimalist Arch (Light 5/8)
  if (styleId === 5) {
    return (
      <div className="min-h-screen bg-white text-slate-950 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="border-b-4 border-slate-950 pb-10 space-y-4">
            <Badge variant="outline" className="text-xs border-slate-950 text-slate-950 font-black px-3 py-1 uppercase tracking-widest">
              Sablon #5 – Architectural Monospaced Studio
            </Badge>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase">{provider.displayName}</h1>
            <p className="text-slate-700 text-base max-w-2xl font-medium leading-relaxed">{provider.bio}</p>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #6: Harmonie Aesthetic (Light 6/8)
  if (styleId === 6) {
    return (
      <div className="min-h-screen bg-purple-50/40 text-slate-900 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="bg-white p-8 sm:p-12 rounded-[36px] border border-purple-200 shadow-xl flex flex-col md:flex-row items-center gap-8">
            <img src={provider.profileImageUrl || template.bgImage || ""} className="w-44 h-44 rounded-full object-cover border-4 border-white shadow-xl" />
            <div className="space-y-3 text-center md:text-left">
              <Badge className="bg-purple-600 text-white text-xs px-3 py-1 font-bold">🌸 Sablon #6 – Asymmetric Boutique Story</Badge>
              <h1 className="text-3xl sm:text-5xl font-black text-purple-950">{provider.displayName}</h1>
              <p className="text-purple-900/80 text-sm">{provider.bio}</p>
            </div>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #7: Ophelia Beauty House (Light 7/8)
  if (styleId === 7) {
    return (
      <div className="min-h-screen bg-rose-50/20 text-rose-950 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="bg-gradient-to-br from-rose-600 to-amber-700 text-white p-8 sm:p-14 rounded-[40px] shadow-2xl space-y-3">
            <Badge className="bg-white/20 backdrop-blur text-white text-xs px-3 py-1 font-bold w-fit">🏺 Sablon #7 – Mediterranean Panorama Resort</Badge>
            <h1 className="text-4xl sm:text-6xl font-black">{provider.displayName}</h1>
            <p className="text-rose-100 text-sm max-w-xl">{provider.bio}</p>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #8: Botanica Oasis (Light 8/8)
  if (styleId === 8) {
    return (
      <div className="min-h-screen bg-teal-50/40 text-teal-950 p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="bg-teal-900 text-white p-8 sm:p-12 rounded-[36px] shadow-xl space-y-4">
            <Badge className="bg-teal-700 text-teal-100 text-xs px-3 py-1 font-bold">🌿 Sablon #8 – Botanical Category Menu</Badge>
            <h1 className="text-3xl sm:text-5xl font-black">{provider.displayName}</h1>
            <p className="text-teal-100 text-sm max-w-xl">{provider.bio}</p>
          </div>

          {renderMediaSection("light")}
          {renderBookingForm("light")}
          {renderWaitlistForm("light")}
        </div>
      </div>
    );
  }

  // TEMPLATE #9: Velours Royal (Dark 1/2)
  if (styleId === 9) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8" style={fontStyle}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-8 sm:p-14 rounded-[40px] border border-amber-500/40 shadow-2xl text-center space-y-4">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-4 py-1 font-extrabold uppercase">
              👑 Sablon #9 – Royal Midnight Lounge (Sötét Téma 1/2)
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-black text-amber-200">{provider.displayName}</h1>
            <p className="text-slate-300 text-sm max-w-xl mx-auto">{provider.bio}</p>
          </div>

          {renderMediaSection("dark")}
          {renderBookingForm("dark")}
          {renderWaitlistForm("dark")}
        </div>
      </div>
    );
  }

  // TEMPLATE #10: Obsidian Chic (Dark 2/2)
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8" style={fontStyle}>
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="bg-gradient-to-br from-zinc-900 via-rose-950 to-zinc-950 p-8 sm:p-14 rounded-[40px] border border-rose-500/40 shadow-2xl space-y-4">
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-xs px-3 py-1 font-bold">🖤 Sablon #10 – Cyberpunk Glass Grid (Sötét Téma 2/2)</Badge>
          <h1 className="text-4xl sm:text-6xl font-black text-rose-200">{provider.displayName}</h1>
          <p className="text-zinc-300 text-sm max-w-xl">{provider.bio}</p>
        </div>


        {renderBookingForm()}
        {renderWaitlistForm()}
      </div>
    </div>
  );
};

