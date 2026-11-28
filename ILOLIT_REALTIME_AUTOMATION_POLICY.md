# ILOLIT – Állandó Fejlesztési Irányelv: Azonnali Adatfrissítés és Cloudflare Automatizálás

Az ILOLIT platform valamennyi jelenlegi és jövőben létrehozott moduljára, API-végpontjára és felhasználói felületére kötelezően érvényes az alábbi alapelv:

> **Azonnali adatfrissítés + valós idejű eseményfeldolgozás + percenkénti Cloudflare Cron Trigger (`* * * * *`) + automatikus hibaelhárítás.**

## Kötelező szabályok minden új és módosított modulnál

1. **Azonnali adatfrissítés alapértelmezésként**
   - Minden írási API-végpont (`POST`, `PUT`, `PATCH`, `DELETE`) köteles sikeres adattárolás után azonnal meghívni a `publishDomainEvent(env, { domain, action, entityId, targetUserIds })` függvényt (`functions/_shared/realtimeAutomation.ts`).
   - A felhasználónak soha nem lehet szüksége manuális oldalfrissítésre (F5), újbóli bejelentkezésre vagy manuális gyorsítótár-ürítésre.
   - Kliensoldalon minden adatlekérdezés a központi `queryClient` (`src/lib/queryClient.ts`) és a `RealtimeSyncProvider` (`src/context/RealtimeSyncContext.tsx`) alá tartozik; mutációk után célzott tartomány-invalidálás történik (`invalidateQueriesByDomain`).

2. **Azonnali lejárat- és jogosultság-érvényesítés (soha ne várjon Cronra!)**
   - Lejárt hirdetések (`expiresAt <= now`), előre időzített hirdetések (`scheduledPublishAt > now`), előfizetések (`currentPeriodEnd <= now`), kuponkódok és visszavont jogosultságok érvénytelenségét az API-k az aktuális időbélyeg alapján **azonnal** megállapítják.
   - Sikeres Stripe-fizetés vagy előfizetés-módosítás a hitelesített webhook (`/api/billing/stripe-webhook`) feldolgozásakor **azonnal** érvénybe lép, `markStripeEventProcessed` idempotencia-védelemmel.

3. **Cloudflare Cron Trigger (`* * * * *`) – kiegészítő, helyreállító és ütemezett motor**
   - A központi Cloudflare Cron Worker (`workers/ilolit-cron/wrangler.jsonc`, `workers/ilolit-cron/src/index.ts`) percenként (`* * * * *`), napi 24 órában, forgalomtól és admin belépéstől függetlenül fut.
   - Minden új ütemezett vagy konzisztencia-ellenőrző feladatot a `functions/_shared/realtimeAutomation.ts` `AUTOMATION_JOB_DEFINITIONS` listájába kell felvenni.
   - Minden háttérfeladat kötelezően idempotens, elosztott futási zárolással (`AUTOMATION_LOCK_KEY`) védett, egymástól izolált hibakezeléssel és szabályozott újrapróbálási sorral (`enqueueRetryTask`).

4. **Gyorsítótárazás és adatvédelem**
   - Dinamikus API-válaszok: `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` és `CDN-Cache-Control: no-store`.
   - Statikus hashelt Vite assetek (`/assets/*`): `public, max-age=31536000, immutable`.
   - Publikus eseménybusz (`GET /api/system/events`) SOHA nem tartalmazhat személyes adatot (PII, pontos cím, telefonszám, üzenettartalom).
   - A **Rendszerüzemeltetés → Háttérfolyamatok és Cloudflare automatizálás** felület (`/admin/system-ops`) és `/api/system/ops/*` végpontok kizárólag szerveroldalon ellenőrzött fejlesztői jogosultsággal érhetők el; kritikus folyamatok nem tilthatók le.

5. **Költségkontroll**
   - Fizetős Cloudflare-szolgáltatás (pl. Workers Paid, Queues, Durable Objects) bevezetése vagy csomagváltás előtt kötelező a tulajdonos jóváhagyását kérni, a várható havi költségek bemutatásával.
