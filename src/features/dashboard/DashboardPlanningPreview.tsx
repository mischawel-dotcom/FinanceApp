import { useEffect, useState } from "react";
import type { DashboardModel } from "@/planning/planFacade";
import { buildDashboardModelFromRepositories } from "@/planning/planFacade";

function fmt(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export default function DashboardPlanningPreview() {
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await buildDashboardModelFromRepositories({ forecastMonths: 24 });
        setModel(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) return <div style={{ padding: 16 }}>❌ Fehler: {error}</div>;
  if (!model) return <div style={{ padding: 16 }}>Loading planning…</div>;

  const { heroFree, buckets, freeTimeline, shortfalls, goals } = model;

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Planning Preview</h2>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Verfügbar (aktueller Monat)</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(heroFree)}</div>
      </div>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>4 Töpfe (aktueller Monat)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>Gebunden: <b>{fmt(buckets.bound)}</b></div>
          <div>Verplant: <b>{fmt(buckets.planned)}</b></div>
          <div>Investiert: <b>{fmt(buckets.invested)}</b></div>
          <div>Frei: <b>{fmt(buckets.free)}</b></div>
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Timeline (Free)</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, maxHeight: 220, overflow: "auto" }}>
          {freeTimeline.slice(0, 12).map((m) => (
            <div key={m.month}>
              {m.month}: {fmt(m.free)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Top Ziele (priorisiert)</div>
        {goals.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Keine Ziele gefunden.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {goals.map((g) => (
              <div key={g.goalId}>
                <b>{g.name}</b> (Prio {g.priority}) — {g.reachable ? "erreichbar" : "nicht erreichbar"}
                {g.etaMonth ? `, ETA ${g.etaMonth}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Shortfalls</div>
        {shortfalls.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Keine Shortfalls im Horizont.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {shortfalls.slice(0, 6).map((s) => (
              <div key={s.month}>
                {s.month}: <b>{fmt(s.amount)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
