import { useEffect, useState } from "react";
import { incomeRepository, expenseRepository, assetRepository, goalRepository } from "@data/repositories";
import type { DashboardModel } from "@/planning/planFacade";
import { buildDashboardModelFromRepositories } from "@/planning/planFacade";
import { formatCentsEUR } from "@/ui/formatMoney";

export default function DashboardPlanningPreview() {
    const [showBreakdown, setShowBreakdown] = useState(false);
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // --- Temporary debugging: check repository data ---
      try {
        const incomes = await incomeRepository.getAll();
        const expenses = await expenseRepository.getAll();
        const assets = await assetRepository.getAll();
        const goals = await goalRepository.getAll();
        console.log("[DEBUG] Repository counts:", {
          incomes: incomes.length,
          expenses: expenses.length,
          assets: assets.length,
          goals: goals.length,
        });
        if (incomes.length > 0) {
          console.log("[DEBUG] Sample income:", incomes[0]);
        }
        // --- End temporary debugging ---
        const m = await buildDashboardModelFromRepositories({ forecastMonths: 24 });
        setModel(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) return <div style={{ padding: 16 }}>❌ Fehler: {error}</div>;
  if (!model) return <div style={{ padding: 16 }}>Loading planning…</div>;

  const { heroFree, buckets, freeTimeline, shortfalls, goals, projection } = model;

  // Find current month in projection
  const currentMonth = projection.timeline[0]?.month;
  const plannedCents = projection.timeline[0]?.buckets.planned ?? 0;
  const plannedBreakdown = projection.timeline[0]?.plannedGoalBreakdownById ?? {};

  // Helper for breakdown UI
  const plannedGoalsList = goals
    .map(g => ({
      name: g.name,
      amount: plannedBreakdown[g.goalId] ?? 0,
    }))
    .filter(g => g.amount > 0);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Planning Preview</h2>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Verfügbar (aktueller Monat)</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCentsEUR(heroFree)}</div>
      </div>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>4 Töpfe (aktueller Monat)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>Gebunden: <b>{formatCentsEUR(buckets.bound)}</b></div>
          <div>
            Verplant: <b>{formatCentsEUR(plannedCents)}</b>
            <span style={{ marginLeft: 8 }}>
              <button
                style={{ fontSize: 12, padding: '2px 6px', borderRadius: 6, border: '1px solid #aaa', background: '#f9f9f9', cursor: 'pointer' }}
                onClick={() => setShowBreakdown(v => !v)}
              >Details</button>
            </span>
          </div>
          <div>Investiert: <b>{formatCentsEUR(buckets.invested)}</b></div>
          <div>Frei: <b>{formatCentsEUR(buckets.free)}</b></div>
        </div>
        {/* Breakdown Popover/Details */}
        {showBreakdown && (
          <div style={{ marginTop: 12, border: '1px solid #ccc', borderRadius: 8, background: '#fff', padding: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Verplant Breakdown</div>
            {plannedGoalsList.length === 0 ? (
              <div style={{ color: '#888' }}>Keine geplanten Zielbeiträge im aktuellen Monat.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {plannedGoalsList.map(g => (
                  <li key={g.name} style={{ marginBottom: 2 }}>
                    {g.name}: <b>{formatCentsEUR(g.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
  // State for breakdown popover
  const [showBreakdown, setShowBreakdown] = useState(false);

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Timeline (Free)</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, maxHeight: 220, overflow: "auto" }}>
          {freeTimeline.slice(0, 12).map((m) => (
            <div key={m.month}>
              {m.month}: {formatCentsEUR(m.free)}
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
                {s.month}: <b>{formatCentsEUR(s.amount)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
