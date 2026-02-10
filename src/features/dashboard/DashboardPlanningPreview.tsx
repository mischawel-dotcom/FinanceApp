import { useEffect, useState } from "react";
import { incomeRepository, expenseRepository, assetRepository, goalRepository } from "@data/repositories";
import type { DashboardModel } from "@/planning/planFacade";
import { buildDashboardModelFromRepositories } from "@/planning/planFacade";
import { formatCentsEUR } from "@/ui/formatMoney";
import { selectDashboardRecommendations } from "@/planning/recommendations";
import { useNavigate } from "react-router-dom";
import { handleRecommendationAction } from "./recommendationActions";

export default function DashboardPlanningPreview() {
  const navigate = useNavigate();
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



  const { heroFree, buckets, freeTimeline, shortfalls, goals, projection, domainGoals } = model;

  // Empfehlungen berechnen (max. 2, defensiv) – nutze domainGoals (Goal[])
  const recs = selectDashboardRecommendations(projection, domainGoals, heroFree) || [];

  // Find plannedCents und Breakdown für aktuellen Monat
  const plannedCents = projection.timeline[0]?.buckets.planned ?? 0;
  const plannedBreakdown = projection.timeline[0]?.plannedGoalBreakdownById ?? {};

  // Helper for breakdown UI
  const plannedGoalsList = goals
    .map(g => ({
      name: g.name,
      amount: plannedBreakdown[g.goalId] ?? 0,
    }))
    .filter(g => g.amount > 0);



  function onRecommendationAction(action: any) {
    handleRecommendationAction(action, { navigate });
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Planning Preview</h2>

      {/* Empfehlungen-Block */}
      <div data-testid="dashboard-recommendations">
        {recs.length > 0 && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Empfehlungen</div>
            <div style={{ display: "grid", gap: 8 }}>
              {recs.slice(0, 2).map((rec, i) => {
                let explanation = null;
                if (rec.type === "shortfall_risk" && rec.evidence?.month && typeof rec.evidence.amountCents === "number") {
                  explanation = `Im Monat ${rec.evidence.month} entsteht ein Fehlbetrag von ${formatCentsEUR(rec.evidence.amountCents)}.`;
                } else if (rec.type === "low_slack") {
                  explanation = "Dein freier Spielraum ist aktuell sehr gering.";
                } else if (rec.type === "goal_contrib_issue" && rec.evidence?.goalId) {
                  explanation = `Für das Ziel '${rec.evidence.goalId}' ist ein monatlicher Beitrag geplant, aber nicht eingeplant.`;
                }
                return (
                  <div
                    key={rec.id || i}
                    data-testid="dashboard-recommendation"
                    style={{ border: "1px solid #e0b200", borderRadius: 8, padding: 10, background: "#fffbe6" }}
                  >
                    {rec.type === "shortfall_risk" ? (
                      <span data-testid="dashboard-recommendation-badge" style={{ background: "#e57373", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 12, marginRight: 8 }}>Risiko</span>
                    ) : (
                      <span data-testid="dashboard-recommendation-badge" style={{ background: "#1976d2", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 12, marginRight: 8 }}>Hinweis</span>
                    )}
                    <b>{rec.title}</b>
                    <div style={{ fontSize: 14, marginTop: 4 }}>{rec.reason}</div>
                    {explanation && (
                      <div style={{ fontSize: 13, marginTop: 6, color: "#555" }} data-testid="dashboard-recommendation-explanation">
                        {explanation}
                      </div>
                    )}
                    {rec.action && (
                      <button
                        data-testid="dashboard-recommendation-action"
                        style={{ marginTop: 10, padding: "4px 14px", borderRadius: 6, border: "1px solid #1976d2", background: "#e3f2fd", color: "#1976d2", fontWeight: 600, cursor: "pointer" }}
                        onClick={() => handleRecommendationAction(rec.action!, { navigate })}
                      >
                        {rec.action.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

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
