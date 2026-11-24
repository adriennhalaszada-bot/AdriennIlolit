import { Layout } from "@/components/layout/Layout";
import { NotificationsCenterSection } from "@/components/appointments/NotificationsCenterSection";

export function Notifications() {
  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/70 pb-20">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
            <NotificationsCenterSection />
          </div>
        </div>
      </div>
    </Layout>
  );
}
