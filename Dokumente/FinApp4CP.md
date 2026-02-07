# FinApp4CP – Copilot & Concept Guide for FinanceApp

## Zweck dieses Dokuments

Dieses Dokument ist die **verbindliche konzeptionelle Referenz** für die Entwicklung der FinanceApp.
Es richtet sich primär an **GitHub Copilot**, sekundär an menschliche Entwickler.

Es definiert:
- das **mentale Finanzmodell** (fachliche Wahrheit)
- das **Dashboard** (sichtbare Verdichtung)
- die **Empfehlungslogik** (erklärbare Handlungsableitung)
- die **Planungs- & Forecast-Schicht** (zentrale Recheninstanz)

Copilot darf **innerhalb** dieser Leitplanken kreativ helfen – **außerhalb nicht**.

---

## Produktrolle & Zielgruppe

### Was diese App ist
- Eine **Finanz-Planungs-App**
- Ein persönlicher **Finanz-Copilot**
- Ein System zur **Entscheidungsunterstützung**
- Vorwärtsgerichtet (Planung, Ziele, Szenarien)

### Was diese App nicht ist
- ❌ Banking-App
- ❌ Transaktions- oder Buchhaltungs-App
- ❌ Budget-Tracking-Tool auf Buchungsebene
- ❌ Investment-Trading-App

**Kontostände und Transaktionen sind nicht die Wahrheit – Planung ist es.**

---

## 🧠 Mentales Finanzmodell

### Grundprinzip
> Alles Geld hat eine Aufgabe – jetzt oder in der Zukunft.

Die App arbeitet ausschließlich mit **Planwerten**, nicht mit historischen Buchungen.

### Zentrale Konzepte
- **Einkommen**: regelmäßig, planbar, mit Sicherheitseinschätzung
- **Fixe Ausgaben**: verpflichtend, zeitlich normiert (monatlich)
- **Rücklagen**: erwartbare, unregelmäßige Kosten (Pflichtpolster)
- **Ziele**: zukünftige Vorhaben mit Betrag, optionalem Datum & Priorität
- **Anlagen**: gebundenes Geld mit Ertragserwartung
- **Verfügbares Geld**: Betrag, der nach allen Verpflichtungen wirklich frei ist

### Zeit als Kerndimension
- Monat = kleinste Wahrheitseinheit
- Alle Berechnungen erfolgen auf Zeitachsen
- Szenarien statt Momentaufnahmen

### No-Gos
- ❌ Transaktionen
- ❌ automatische Kategorisierung
- ❌ rückwärtsgerichtete Analyse
- ❌ scheinbar exakte Vorhersagen

---

## 🧭 Dashboard

### Zweck
Das Dashboard beantwortet in unter 30 Sekunden:

1. Wie ist meine finanzielle Lage?
2. Was ist gebunden / verplant / investiert?
3. Was ist wirklich frei?
4. Bin ich auf Kurs mit meinen Zielen?

### Zentrale Elemente
- **Hero-Zone**: verfügbarer Monats-Spielraum
- **Vier Geld-Töpfe**: gebunden, verplant, investiert, frei
- **Zeitachsen-Forecast** (12–24 Monate)
- **Priorisierte Ziele** (max. 3)
- **Maximal 1–2 Empfehlungen**

### Regeln
- ❌ keine Tabellen
- ❌ keine Transaktionslisten
- ❌ keine Detailkonfiguration
- ✔️ nur abgeleitete Wahrheiten anzeigen

---

## 🧮 Planning & Forecast Layer (Core Principle)

Die FinanceApp besitzt eine **zentrale Planungs- und Forecast-Schicht**.

Diese Schicht:
- erzeugt aus Domain-Daten eine **zeitbasierte Plan-Projektion**
- arbeitet ausschließlich mit **Monaten** als Zeiteinheit
- normiert alle periodischen Werte auf Monatsbasis
- simuliert zukünftige Zustände über einen festen Horizont (z. B. 24 Monate)

**Wichtig:**
- Dashboard **und** Empfehlungslogik arbeiten ausschließlich auf dieser Plan-Projektion
- UI-Komponenten enthalten **keine Berechnungslogik**
- Persistence (z. B. localStorage) speichert nur Domain-Daten, keine Projektionen

Änderungen am Plan erfolgen über:
- Anpassung der Domain-Daten oder
- explizite Szenarien („Was-wäre-wenn“)

---

## 💡 Empfehlungslogik

### Grundpipeline
1. **Plan-Zustand berechnen** (via Forecast-Schicht)
2. **Empfehlungs-Kandidaten erzeugen** (Regeln erkennen Probleme, Risiken, Chancen)
3. **Scoring & Auswahl**
   - max. 1–2 Empfehlungen
   - Kriterien: Impact, Dringlichkeit, Robustheit, Einfachheit

Jede Empfehlung muss **erklärbar** sein:
**Ursache → Änderung → Effekt**

### Prioritäten
1. Stabilität & Sicherheit
2. Ziel-Machbarkeit
3. Optimierung (nur bei stabilem Plan)

### No-Gos
- ❌ Besserwisser-Ton
- ❌ aggressive Umschichtungen
- ❌ intransparente Logik

---

## Architektur-Prinzipien

- Domain-Modelle sind die **Single Source of Truth**
- Forecast-/Planning-Schicht ist die **zentrale Recheninstanz**
- UI rendert nur **abgeleitete Werte**
- Empfehlungslogik arbeitet **auf Projektionen**, nicht auf Rohdaten

---

## Sprach- & Begriffsregeln

### Bevorzugt
- verfügbar
- gebunden
- verplant
- investiert
- Ziel
- Rücklage
- Spielraum
- Planwert

### Vermeiden
- Transaktion
- Kategorie
- Buchung
- Saldo-Analyse
- Budget (buchhalterisch)

---

## Copilot Quick Rules – Snippets for New Files

### TypeScript / React

```ts
/**
 * Copilot Quick Rules – FinanceApp
 *
 * - Planning app, not banking app
 * - No transactions, no categories
 * - Everything is monthly-normalized
 * - Free money ≠ account balance
 * - UI renders only derived values
 * - Max 1–2 explainable recommendations
 *
 * See FinApp4CP.md
 */
```

### Domain / Planning / Engine

```ts
/**
 * Copilot Quick Rules – Domain / Planning
 *
 * - Work on planning data only
 * - Time (months) is the primary dimension
 * - No UI or persistence logic here
 * - Calculations must be deterministic
 *
 * See FinApp4CP.md
 */
```

### UI / Dashboard

```ts
/**
 * Copilot Quick Rules – UI
 *
 * - UI shows derived truth only
 * - No calculations in components
 * - Dashboard follows defined layout & limits
 *
 * See FinApp4CP.md
 */
```

---

## Abschluss

Wenn ein Vorschlag nicht klar zum:
- mentalen Finanzmodell
- Dashboard
- Planning-/Forecast-Prinzip
- oder zur Empfehlungslogik

passt, dann ist er **nicht Teil dieser App**.

Im Zweifel gilt:
> Klarheit vor Vollständigkeit.
