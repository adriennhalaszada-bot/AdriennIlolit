import { Switch, Route, Redirect, Router as WouterRouter, useLocation, Link } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useUser, useAuth } from '@clerk/react';
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState, Component } from "react";
import type { ReactNode } from "react";
import { useSyncUser, useGetMe, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";
import { useSeoHead } from "@/hooks/useSeoHead";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { Product } from "./pages/Product";
import { Profile } from "./pages/Profile";
import { Ilolit } from "./pages/Ilolit";
import { Dashboard } from "./pages/Dashboard";
import { DashboardListings } from "./pages/DashboardListings";
import { DashboardFavorites } from "./pages/DashboardFavorites";
import { DashboardTransactions } from "./pages/DashboardTransactions";
import { Messages } from "./pages/Messages";
import { Chat } from "./pages/Chat";
import { Sell } from "./pages/Sell";
import { Checkout } from "./pages/Checkout";
import { CheckoutSuccess, CheckoutCancel } from "./pages/CheckoutResult";
import { Notifications } from "./pages/Notifications";
import { SettingsProfile } from "./pages/SettingsProfile";
import { FAQ } from "./pages/FAQ";
import { Hirdetesfigyelo } from "./pages/Hirdetesfigyelo";
import { KedvencEladok } from "./pages/KedvencEladok";
import { UsernameSetup } from "./pages/UsernameSetup";
import { BeautyHome } from "./pages/beauty/BeautyHome";
import { ProvidersHome } from "./pages/ProvidersHome";
import { GeneralProviderRegister } from "./pages/GeneralProviderRegister";
import { GeneralProviderDashboard } from "./pages/GeneralProviderDashboard";
import { BeautyRegister } from "./pages/beauty/BeautyRegister";
import { BeautyDashboard } from "./pages/beauty/BeautyDashboard";
import { BeautyMyBookings } from "./pages/beauty/BeautyMyBookings";
import { BeautyProviderProfile } from "./pages/beauty/BeautyProviderProfile";
import { BeautyBookingRedirect } from "./pages/beauty/BeautyBooking";
import { EducationPage } from "./pages/EducationPage";
import { ShopPage } from "./pages/ShopPage";
import { BusinessCommissionDashboard } from "./pages/BusinessCommissionDashboard";
import { AdminCategoriesPage } from "./pages/AdminCategories";
import { AdminDisputes } from "./pages/AdminDisputes";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { InteractiveCalendarBookingApp } from "./pages/InteractiveCalendarBookingApp";
import { MediaManagerPage } from "./pages/MediaManagerPage";
import { BeautyDevRoadmap } from "./components/beauty/BeautyDevRoadmap";
import RealEstate from "./pages/RealEstate";
import RealEstateDashboard from "./pages/RealEstateDashboard";
import Vehicles from "./pages/Vehicles";
import VehiclesDashboard from "./pages/VehiclesDashboard";
import NotFound from "./pages/not-found";
import { UniversalSearch } from "./pages/UniversalSearch";
import { FavoritesProvider } from "./context/FavoritesContext";
import { SavedSearchesProvider } from "./context/SavedSearchesContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { ComparisonProvider } from "./context/ComparisonContext";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.warn("ErrorBoundary caught error:", error?.message, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center flex-col gap-4 p-8 text-center bg-background text-foreground">
          <p className="text-xl font-bold text-slate-900">Valami hiba történt.</p>
          <p className="text-muted-foreground text-sm max-w-md">
            Az oldal automatikusan visszaállítható. Kattints az alábbi gombra a folytatáshoz.
          </p>
          {this.state.error && (
            <pre className="text-xs bg-rose-50 text-rose-700 p-3 rounded-xl max-w-lg text-left overflow-auto border border-rose-200 font-mono">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow hover:bg-emerald-700 transition"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              🏠 Vissza a Főoldalra
            </button>
            <button
              className="px-4 py-2.5 rounded-xl border text-sm font-semibold hover:bg-muted transition"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Oldal frissítése
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

// Registers Clerk's getToken() as the Bearer token source for every API call.
// This replaces cookie-based auth with explicit fresh tokens, eliminating
// the ~7-second "frozen" window that occurs when the Clerk JWT cookie expires.
function ClerkTokenSetter() {
  try {
    const { getToken } = useAuth();
    useEffect(() => {
      setAuthTokenGetter(() => getToken());
      return () => setAuthTokenGetter(null);
    }, [getToken]);
  } catch (e) {
    console.warn("ClerkTokenSetter warning:", e);
  }
  return null;
}

function SyncUserWrapper({ children }: { children: React.ReactNode }) {
  try {
    const { isSignedIn, user } = useUser();
    const syncUser = useSyncUser();
    const [, navigate] = useLocation();

    useEffect(() => {
      if (isSignedIn && user) {
        syncUser.mutate(
          {
            data: {
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress || "",
              username: user.username || undefined,
              fullName: user.fullName || undefined,
              avatarUrl: user.imageUrl || undefined,
            }
          },
          {
            onSuccess(data) {
              if (data && data.usernameSet === false) {
                navigate("/username-setup");
              }
            },
            onError(err) {
              console.warn("User sync warning (non-fatal):", err);
            }
          }
        );
      }
    }, [isSignedIn, user?.id]);
  } catch (e) {
    console.warn("SyncUserWrapper warning:", e);
  }

  return <>{children}</>;
}

function SignInPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("janos.kiss@example.com");
  const [password, setPassword] = useState("DemoPass123!");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("ilolit_auth", "logged_in");
    window.dispatchEvent(new Event("ilolit_auth_change"));
    navigate("/dashboard");
  };

  const handleQuickLogin = (target: "/dashboard" | "/beauty/dashboard") => {
    localStorage.setItem("ilolit_auth", "logged_in");
    window.dispatchEvent(new Event("ilolit_auth_change"));
    navigate(target);
  };

  return (
    <Layout>
      <div className="flex min-h-[75vh] items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
        <div className="w-full max-w-md p-8 space-y-6 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-extrabold text-xl flex items-center justify-center mx-auto border-2 border-emerald-500">
              🔑
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">ILOLIT Bejelentkezés</h2>
            <p className="text-xs text-slate-500 font-medium">Lépj be a fiókodba a funkciók eléréséhez!</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">E-mail cím</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jelszó</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-6 rounded-2xl text-base shadow-md">
              Bejelentkezés ➔
            </Button>
          </form>

          <div className="relative border-t my-4 text-center">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Gyors Belépés Demó Fiókkal
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" type="button" onClick={() => handleQuickLogin("/dashboard")} className="rounded-2xl text-xs font-extrabold border-slate-300 hover:bg-slate-100 py-5">
              👤 Vendég Fiók
            </Button>
            <Button variant="outline" type="button" onClick={() => handleQuickLogin("/beauty/dashboard")} className="rounded-2xl text-xs font-extrabold border-emerald-300 text-emerald-700 hover:bg-emerald-50 py-5">
              💼 Szolgáltatói Fiók
            </Button>
          </div>

          <div className="text-center pt-3 border-t">
            <p className="text-xs text-slate-500 font-medium">
              Még nincs fiókod?{" "}
              <Link href="/auth/register" className="font-extrabold text-emerald-600 hover:underline">
                Regisztrálj most!
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SignUpPage() {
  return <RegisterPage />;
}

function UsernameGuardRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      <Component />
    </Route>
  );
}

function GlobalUsernameGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function UsernameSetupRoute() {
  return (
    <Route path="/username-setup">
      <UsernameSetup />
    </Route>
  );
}

function AppRouterInner() {
  useSeoHead();
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/universal-search" component={UniversalSearch} />
      <Route path="/search" component={Search} />
      <Route path="/marketplace" component={Search} />
      <Route path="/booking" component={InteractiveCalendarBookingApp} />
      <Route path="/providers/register" component={GeneralProviderRegister} />
      <Route path="/providers/dashboard" component={GeneralProviderDashboard} />
      <Route path="/providers" component={ProvidersHome} />
      <Route path="/szolgaltatasok" component={ProvidersHome} />

      <Route path="/real-estate" component={RealEstate} />
      <Route path="/realestate" component={RealEstate} />
      <Route path="/ingatlan" component={RealEstate} />
      <Route path="/ingatlanok" component={RealEstate} />
      <Route path="/real-estate/dashboard" component={RealEstateDashboard} />

      <Route path="/vehicles" component={Vehicles} />
      <Route path="/jarmuvek" component={Vehicles} />
      <Route path="/jarmu" component={Vehicles} />
      <Route path="/autok" component={Vehicles} />
      <Route path="/vehicles/dashboard" component={VehiclesDashboard} />

      <Route path="/education" component={EducationPage} />
      <Route path="/oktatas" component={EducationPage} />
      <Route path="/kurzusok" component={EducationPage} />
      {/* Keep the concrete dashboard routes before the dashboard root.
          These used to live behind a catch-all route, which left direct
          Cloudflare page loads such as /dashboard/listings completely blank. */}
      <Route path="/dashboard/listings" component={DashboardListings} />
      <Route path="/dashboard/favorites" component={DashboardFavorites} />
      <Route path="/dashboard/transactions" component={DashboardTransactions} />
      <Route path="/account" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/notifications" component={Hirdetesfigyelo} />
      <Route path="/hirdetesfigyelo" component={Hirdetesfigyelo} />
      <Route path="/messages" component={Messages} />
      <Route path="/messages/:id" component={Chat} />

      <Route path="/product/:id" component={Product} />
      <Route path="/sell" component={Sell} />
      <Route path="/sell/:id/edit" component={Sell} />
      <Route path="/profile" component={SettingsProfile} />
      <Route path="/settings/profile" component={SettingsProfile} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/shop/:shopId" component={ShopPage} />
      <Route path="/dashboard/commission" component={BusinessCommissionDashboard} />
      <Route path="/ilolit" component={Ilolit} />
      <Route path="/gyik" component={FAQ} />

      <Route path="/beauty" component={BeautyHome} />
      <Route path="/services" component={BeautyHome} />
      <Route path="/beauty/register" component={BeautyRegister} />
      <Route path="/beauty/dashboard" component={BeautyDashboard} />
      <Route path="/beauty/bookings" component={BeautyMyBookings} />
      <Route path="/beauty/:id/book/:serviceId" component={BeautyBookingRedirect} />
      <Route path="/beauty/:id" component={BeautyProviderProfile} />
      <Route path="/interactive-calendar" component={InteractiveCalendarBookingApp} />
      <Route path="/media-manager" component={MediaManagerPage} />
      <Route path="/beauty/roadmap" component={BeautyDevRoadmap} />
      <Route path="/admin/categories" component={AdminCategoriesPage} />
      <Route path="/admin/disputes" component={AdminDisputes} />

      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />

      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/auth/login" component={SignInPage} />
      <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
      <Route path="/auth/reset-password" component={ForgotPasswordPage} />

      <Route path="/auth/login/*?" component={SignInPage} />
      <Route path="/auth/register/*?" component={SignUpPage} />

      {/* Other routes */}
      <Route path="/:rest*">
        <SyncUserWrapper>
          <GlobalUsernameGuard>
            <Switch>
              <UsernameSetupRoute />
              <UsernameGuardRoute path="/dashboard/listings" component={DashboardListings} />
              <UsernameGuardRoute path="/dashboard/favorites" component={DashboardFavorites} />
              <UsernameGuardRoute path="/dashboard/transactions" component={DashboardTransactions} />
              <UsernameGuardRoute path="/messages" component={Messages} />
              <UsernameGuardRoute path="/messages/:id" component={Chat} />
              <UsernameGuardRoute path="/sell" component={Sell} />
              <UsernameGuardRoute path="/sell/:id/edit" component={Sell} />
              <UsernameGuardRoute path="/checkout" component={Checkout} />
              <UsernameGuardRoute path="/notifications" component={Hirdetesfigyelo} />
              <UsernameGuardRoute path="/hirdetesfigyelo" component={Hirdetesfigyelo} />
              <UsernameGuardRoute path="/kedvenc-eladok" component={KedvencEladok} />
              <UsernameGuardRoute path="/profile" component={SettingsProfile} />
              <UsernameGuardRoute path="/settings/profile" component={SettingsProfile} />

              <Route component={NotFound} />
            </Switch>
          </GlobalUsernameGuard>
        </SyncUserWrapper>
      </Route>
    </Switch>
  );
}

class SafeSyncUserWrapper extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn("SyncUserWrapper caught auth initialization issue, falling back to local mode:", error?.message);
  }
  render() {
    if (this.state.hasError) {
      return <>{this.props.children}</>;
    }
    return <SyncUserWrapper>{this.props.children}</SyncUserWrapper>;
  }
}

class SafeClerkTokenSetter extends Component<{}, { hasError: boolean }> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return <ClerkTokenSetter />;
  }
}

class SafeClerkProvider extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn("SafeClerkProvider caught auth initialization issue, falling back to public mode:", error?.message);
  }
  render() {
    if (this.state.hasError) {
      return <>{this.props.children}</>;
    }
    if (!clerkPubKey) {
      console.error("VITE_CLERK_PUBLISHABLE_KEY is not configured.");
      return <>{this.props.children}</>;
    }
    return (
      <ClerkProvider
        publishableKey={clerkPubKey}
        proxyUrl={clerkProxyUrl}
        signInUrl={`${basePath}/auth/login`}
        signUpUrl={`${basePath}/auth/register`}
      >
        <SafeClerkTokenSetter />
        {this.props.children}
      </ClerkProvider>
    );
  }
}

function AutoCacheInvalidator() {
  useEffect(() => {
    const CURRENT_VER = "v4.2_20260918_clerk_user_button";
    const saved = localStorage.getItem("ilolit_app_ver");
    if (saved !== CURRENT_VER) {
      localStorage.setItem("ilolit_app_ver", CURRENT_VER);
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      window.location.reload();
    }
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AutoCacheInvalidator />
        <FavoritesProvider>
          <SavedSearchesProvider>
            <NotificationsProvider>
              <ComparisonProvider>
                <WouterRouter base={basePath}>
                  <ErrorBoundary>
                    <SafeClerkProvider>
                      <AppRouterInner />
                    </SafeClerkProvider>
                  </ErrorBoundary>
                </WouterRouter>
                <Toaster />
              </ComparisonProvider>
            </NotificationsProvider>
          </SavedSearchesProvider>
        </FavoritesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}


export default App;
