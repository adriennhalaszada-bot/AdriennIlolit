import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { useLocation, useSearch } from "wouter";

export function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <CheckCircle2 className="w-16 h-16 text-ilolit mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sikeres fizetés!</h1>
        <p className="text-muted-foreground mb-8">
          A megrendelésed rögzítve. Az eladó értesítést kapott és hamarosan
          felkészíti a csomagot.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => setLocation("/dashboard/transactions")}>
            Tranzakcióim
          </Button>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Vissza a főoldalra
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export function CheckoutCancel() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const txId = new URLSearchParams(search).get("tx");
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fizetés megszakítva</h1>
        <p className="text-muted-foreground mb-8">
          A fizetési folyamat megszakadt. A kosárban lévő termékek megmaradtak,
          bármikor visszatérhetsz a fizetéshez.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {txId && (
            <Button onClick={() => setLocation("/dashboard/transactions")}>
              Tranzakcióim
            </Button>
          )}
          <Button variant="outline" onClick={() => setLocation("/")}>
            Vissza a főoldalra
          </Button>
        </div>
      </div>
    </Layout>
  );
}
