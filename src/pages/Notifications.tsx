import { Layout } from "@/components/layout/Layout";
import { useGetNotifications } from "@workspace/api-client-react";

export function Notifications() {
  const { data, isLoading } = useGetNotifications({});

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Értesítések</h1>
        {isLoading ? <div>Betöltés...</div> : data?.items?.length ? (
          <div className="space-y-2">
            {data.items.map((n: any) => (
              <div key={n.id} className={`p-4 border rounded-xl ${!n.isRead ? 'bg-primary/5' : ''}`}>
                <div className="font-semibold">{n.title}</div>
                <div className="text-sm text-muted-foreground">{n.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">Nincsenek értesítések.</div>
        )}
      </div>
    </Layout>
  );
}
