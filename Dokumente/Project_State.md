\# FinanceApp – Project State



\## 1. Ziel des Projekts

Eine persönliche Finance-App (Browser-basiert, lokal gespeichert), die:

\- einen ehrlichen Überblick über die finanzielle Situation gibt

\- nicht mit Bank-APIs verbunden ist

\- mit fixen Einnahmen, Ausgaben, Anlagen und Zielen arbeitet

\- verständliche Planung und Empfehlungen liefert



Kernprinzip: \*\*erklärbar, deterministisch, keine Magie\*\*.



---



\## 2. Technischer Stack

\- React + TypeScript

\- Vite

\- LocalStorage (AES-verschlüsselt)

\- Vitest für Tests

\- Keine Backend- oder Cloud-Abhängigkeiten



---



\## 3. Mentales Finanzmodell

Definiert in: `docs/FinApp4CP.md`



Wichtige Konzepte:

\- Monatsbasierte Planung (MonthKey "YYYY-MM")

\- Vier Geldtöpfe:

&nbsp; - Gebunden (fixe Verpflichtungen)

&nbsp; - Verplant (explizite Zielbeiträge)

&nbsp; - Investiert (Spar-/Investmentraten)

&nbsp; - Frei (verfügbarer Spielraum)

\- Forecast → Dashboard → Empfehlungen



---



\## 4. Aktueller Umsetzungsstand (funktionierend)



\### Planning / Forecast

\- Adapter:

&nbsp; - `fromRepositories.ts`

&nbsp; - `fromPersistedStore.ts`

\- Forecast:

&nbsp; - `forecast.ts`

&nbsp; - deterministisch

&nbsp; - keine Inflation, keine Renditen (MVP)

\- Selectors:

&nbsp; - Hero-Wert (Free)

&nbsp; - Shortfall-Events

&nbsp; - priorisierte Ziele

\- Alle relevanten Tests laufen (Vitest)



\### Dashboard

\- `DashboardPlanningPreview.tsx` eingebunden

\- Zeigt echte Zahlen aus persisted store

\- Income / Bound / Free funktionieren

\- Verplant \& Investiert aktuell 0 (korrekt für MVP)



---



\## 5. Datenhaltung

\- Persisted Store:

&nbsp; - Single key: `finance-app-store`

&nbsp; - Enthält incomes, expenses, assets, goals, categories, recommendations

\- Repository-Layer existiert weiterhin

\- Planning liest aktuell \*\*direkt aus persisted store\*\*, nicht aus Repositories



---



\## 6. Bekannte Vereinfachungen (bewusst)

\- Expenses werden MVP-mäßig als monatlich betrachtet

\- Ziele haben \*\*noch keine monatliche Sparrate\*\*

\- Keine automatische Zielverteilung

\- Keine Transaktionen

\- Keine Bank-Synchronisation



---



\## 7. Nächste sinnvolle Schritte (offen)

\- Ziel um `monthlyContribution?: number` erweitern

\- Verplant-Topf aktiv nutzbar machen

\- Explain-UI für „Warum diese Zahl?“

\- Empfehlungslogik auf Forecast aufbauen



