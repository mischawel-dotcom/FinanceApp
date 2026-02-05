# Finance App

Moderne, modulare Finanz-Web-App für Privatpersonen.

## Features

- ✅ **Dashboard** - Überblick über Kennzahlen, Buchungen und Ziele
- ✅ **Einkommen** - Verwaltung von Einnahmen und Kategorien
- ✅ **Ausgaben** - Verwaltung mit Wichtigkeitsskala (1–6)
- ✅ **Anlagen** - Tracking von Vermögenswerten
- ✅ **Finanzielle Ziele** - Spar-Ziele definieren und verfolgen
- ✅ **Empfehlungen** - Intelligente Spar-Vorschläge
- ✅ **Reports** - Auswertungen und Export-Funktionen

## Tech-Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Charts**: Recharts
- **Persistenz**: localStorage (mit Repository-Pattern für späteren Backend-Austausch)

## Projekt-Struktur

```
src/
├── app/               # App-Konfiguration
│   ├── layout/        # AppShell, Navigation
│   ├── store/         # Zustand Store
│   └── AppRouter.tsx  # Route-Definitionen
├── features/          # Feature-Module
│   ├── dashboard/
│   ├── income/
│   ├── expenses/
│   ├── assets/
│   ├── goals/
│   ├── recommendations/
│   └── reports/
├── shared/            # Gemeinsame Komponenten & Types
│   └── types/         # Domain-Modelle
└── data/              # Persistenz-Schicht
    ├── repositories/  # Repository-Pattern
    └── seedData.ts    # Demo-Daten
```

## 🚀 Installation & Setup

```bash
# 1. Repository klonen
git clone https://github.com/mischawel-dotcom/FinanceApp.git
cd FinanceApp

# 2. Dependencies installieren
npm install

# 3. Environment-Variablen erstellen (optional)
cp .env.example .env

# 4. Dev-Server starten
npm run dev

# 5. Production Build
npm run build

# 6. Tests ausführen
npm test
npm run test:coverage
```

## ⚠️ Sicherheitshinweise

**WICHTIG: Dies ist eine MVP-Version mit LocalStorage-Persistierung.**

- ❌ **Keine Authentifizierung** implementiert (Single-User nur im eigenen Browser)
- ❌ **Keine Verschlüsselung** der Daten in LocalStorage
- ❌ **NICHT für Production** mit sensiblen Daten verwenden
- ✅ **Geeignet für:** Persönliches Finanz-Tracking, Demos, Entwicklung

### Geplante Security-Features (Phase 2)
- Backend mit PostgreSQL/MySQL
- OAuth2/JWT Authentifizierung
- Ende-zu-Ende Verschlüsselung
- Multi-User Support

## 📋 Bekannte Limitierungen

Siehe [FINDINGS.md](./FINDINGS.md) für detailliertes Security & Code Quality Review:
- Input-Validierung wird verbessert (Zod-Integration geplant)
- Error-Handling wird strukturiert
- Tests für Forms in Entwicklung

## 🤝 Contributing

Pull Requests sind willkommen! Für größere Änderungen bitte zuerst ein Issue öffnen.

## 📝 License

MIT

## Entwicklungs-Phasen

### ✅ Phase 1 - Architektur & Grundgerüst (ABGESCHLOSSEN)
- Tech-Stack definiert und konfiguriert
- Domain-Modelle (TypeScript Types)
- Repository-Pattern für Persistenz
- Router mit allen 7 Seiten
- Responsive AppShell mit Navigation
- Zustand Store mit Demo-Daten

### 🔜 Phase 2 - CRUD-Grundlagen (Nächste Phase)
- Wiederverwendbare UI-Komponenten
- CRUD für Einkommen & Ausgaben

### 🔜 Phase 3 - Anlagen & Ziele
### 🔜 Phase 4 - Empfehlungs-Engine
### 🔜 Phase 5 - Reports & Export
### 🔜 Phase 6 - Feinschliff & Mobile-Vorbereitung

## Architektur-Entscheidungen

### Vite vs Next.js
**Gewählt: Vite**
- Schnellerer Dev-Server
- Einfachere Konfiguration für SPA
- Keine SSR benötigt (Client-Only App)
- Leichtere spätere Umwandlung in Mobile-App

### Zustand vs Redux Toolkit
**Gewählt: Zustand**
- Minimaler Boilerplate
- Einfachere Lernkurve
- TypeScript-First
- Ausreichend für App-Größe

### localStorage vs IndexedDB
**Gewählt: localStorage (mit Repository-Pattern)**
- Einfacher Start
- Ausreichend für Datenmengen
- Repository-Pattern ermöglicht späteren Austausch
- Kein komplexes Setup nötig

## License

MIT
