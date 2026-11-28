---
description: ILOLIT kötelező fejlesztési irányelv – azonnali adatfrissítés, valós idejű eseményfeldolgozás, percenkénti Cloudflare Cron Trigger és automatikus hibaelhárítás.
alwaysApply: true
---

# ILOLIT – Kötelező Alapértelmezett Működési Elv

Minden jelenlegi és jövőben létrehozott ILOLIT modul, funkció, API-végpont és adminisztrációs eszköz kötelezően az alábbi architektúrára épül:

**Azonnali adatfrissítés + valós idejű eseményfeldolgozás + percenkénti Cloudflare Cron Trigger (`* * * * *`) + automatikus hibaelhárítás.**

## Kötelező megvalósítási szabályok

1. **Eseményvezérelt azonnali frissítés:**
   - Minden backend írási művelet (`POST`, `PUT`, `PATCH`, `DELETE`) azonnal hívja meg a `publishDomainEvent()` függvényt (`functions/_shared/realtimeAutomation.ts`).
   - A frontend automatikusan csatlakozik a `RealtimeSyncProvider` (`/api/system/events` SSE + `BroadcastChannel` + `invalidateQueriesByDomain`) rendszerhez; új modulnál add hozzá az új domain kulcsait a `DOMAIN_QUERY_PREFIXES` táblához (`src/lib/queryClient.ts`) és `inferRealtimeDomainFromUrl()`-hez (`lib/api-client-react/src/custom-fetch.ts`).
   - Ne legyen szükség manuális oldalfrissítésre (F5), újbóli bejelentkezésre vagy cache-törlésre.

2. **Azonnali időalapú lejárat- és jogosultság-ellenőrzés:**
   - Lejáratok (hirdetések, előfizetések, prémium jogok, kuponok) és visszavont jogosultságok érvénytelenségét mindig az aktuális időbélyeg alapján azonnal érvényesítsd — soha ne várj a következő Cron futásra.
   - Stripe fizetések kizárólag hitelesített webhookból és idempotens `markStripeEventProcessed()` védelemmel aktiválódhatnak azonnal.

3. **Percenkénti Cloudflare Cron Trigger (`workers/ilolit-cron/`):**
   - A központi Worker (`* * * * *`) kiegészítő, ellenőrző, helyreállító és időzített feladatokat futtat forgalomtól függetlenül, elosztott futási zárolással, idempotensen, szabályozott újrapróbálással.
   - Új háttérfeladatot mindig a `functions/_shared/realtimeAutomation.ts` központi nyilvántartásába vegyél fel, így automatikusan megjelenik a fejlesztői **Rendszerüzemeltetés → Háttérfolyamatok és Cloudflare automatizálás** felületen.

4. **Biztonság, adatvédelem és költségkontroll:**
   - Személyes adat soha nem kerülhet publikus eseményfolyamba vagy megosztott cache-be.
   - A `/admin/system-ops` és `/api/system/ops/*` végpontok kizárólag fejlesztői jogosultsággal érhetők el; kritikus fizetési/adatbiztonsági/jogosultsági feladatok nem tilthatók le.
   - Fizetős Cloudflare-szolgáltatás vagy csomagváltás bevezetése előtt mindig kérj előzetes jóváhagyást költségbecsléssel.
