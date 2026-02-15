FinanceApp – Release Notes

Version 2.4 – Planning Core Stabilization

🔒 Planning Core (v2.4 Stable)



Der Planning Core wurde strukturell abgesichert und als stabil markiert.



Garantien:



Cents-only Contract (Integer-basierte Geldberechnung)



Float / NaN / Infinity Guardrails aktiv



Mathematische Invarianten geprüft:



free = income − bound − planned − invested



Recurring korrekt:



zählt exakt einmal pro Monat



nicht vor Startdatum



nicht nach Enddatum



One-time korrekt:



zählt nur im Fälligkeitsmonat



keine Vergangenheit-Leaks



Forecast-Horizont stabil:



forecastMonths beeinflusst Monat 1 nicht



Integration-Pfad (Repository → Projection → Dashboard) abgesichert



Regression-Tests decken alle oben genannten Punkte ab.



🧠 Recommendation Engine



Determinismus abgesichert



Horizon-Stabilität garantiert



Keine widersprüchlichen Empfehlungen



Maximal 1–2 Empfehlungen gemäß Engine-Contract



Negativer Free korrekt erkannt und bewertet



🎨 UI/UX Verbesserungen



Neue Spalte „Wiederkehrend“ in der Ausgabenliste



Klare Sichtbarkeit von recurring vs. einmaligen Ausgaben



Keine Änderungen am Datenmodell



⚡ Performance \& Safety Review



buildPlanProjection Call-Frequenz geprüft



Kein unnötiges Recomputing festgestellt (2 Calls im Dev-Mode)



Keine Memoization notwendig



Dev-Logging wieder entfernt



🧩 Architektur-Status



Die App ist jetzt:



deterministisch



horizon-stabil



cents-rein



regression-gesichert



integration-getestet



UI-semantisch konsistent

