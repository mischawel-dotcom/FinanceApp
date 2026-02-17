import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/app/store/useAppStore";
const DEBUG = import.meta.env.DEV && import.meta.env.VITE_DEBUG === "1";

import type { DashboardModel } from "@/planning/planFacade";
import { buildDashboardModelFromRepositories } from "@/planning/planFacade";
import { formatCentsEUR } from "@/ui/formatMoney";
import { selectDashboardRecommendations } from "@/planning/recommendations";
import { useNavigate } from "react-router-dom";
import { handleRecommendationAction } from "./recommendationActions";
import type { Goal } from "../../domain/types";

// Accepts optional onFlowKpis callback to send current month KPIs to parent

export default function DashboardPlanningPreview({ onFlowKpis }: { onFlowKpis?: (kpis: { incomeCents: number; boundCents: number; plannedCents: number; investedCents: number; freeCents: number }) => void }) {
  const navigate = useNavigate();
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Store goals immer auf Top-Level holen (Hook order fix)
  const storeGoalsRaw = useAppStore((s) => s.goals);
  const storeGoals = Array.isArray(storeGoalsRaw) ? storeGoalsRaw : [];

  // Explicitly type arrays and remove unused
  type Shortfall = { month: string; amount: number };
  const shortfalls: Shortfall[] = [];
  type GoalSummary = {
    goalId: string;
    name: string;
    priority: number;
    etaMonth?: string;
    reachable: boolean;
  };
  const goals: GoalSummary[] = [];
  // DomainGoal type is imported from planning/types or domain/types
  const domainGoals: Goal[] = [];
  const projection = model?.projection;
  const flowKpis = useMemo(() => {
    if (model && model.projection) {
      const { projection } = model;
      const currentMonth = projection.timeline[0];
      if (currentMonth) {
        const incomeCents = currentMonth.income;
        const boundCents = currentMonth.buckets.bound;
        const plannedCents = currentMonth.buckets.planned;
        const investedCents = currentMonth.buckets.invested;
        const freeCents = currentMonth.buckets.free;
        return {
          incomeCents,
          boundCents,
          plannedCents,
          investedCents,
          freeCents,
          expensesCents: boundCents + plannedCents + investedCents,
          savingRate: incomeCents > 0 ? (plannedCents + investedCents) / incomeCents : 0,
        };
      }
    }
    return {
      incomeCents: 0,
      boundCents: 0,
      plannedCents: 0,
      investedCents: 0,
      freeCents: 0,
      expensesCents: 0,
      savingRate: 0,
    };
  }, [model]);

  // useEffect always runs, but only calls callback if present
  useEffect(() => {
    if (!onFlowKpis) return;
    onFlowKpis(flowKpis);
  }, [onFlowKpis, flowKpis]);

  useEffect(() => {
    (async () => {
      try {
        if (DEBUG) {
          // ...removed debug log...
        }
        // Fetch all planning-relevant arrays
        // fetch only what is needed for buildDashboardModelFromRepositories
        if (DEBUG) {
          // ...removed debug log...
        }
        if (DEBUG) {
          // ...removed debug logs and localStorage debug checks...
        }
        const m = await buildDashboardModelFromRepositories({ forecastMonths: 24 });
        setModel(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) return <div style={{ padding: 16 }}>❌ Fehler: {error}</div>;
  if (!model) return <div style={{ padding: 16 }}>Loading planning…</div>;


  // Robust guard für aktuellen Monat + Empfehlungen berechnen (max. 2, defensiv) – nutze domainGoals (Goal[])
  const current = projection?.timeline?.[0];
  const currentBuckets = current?.buckets ?? { bound: 0, planned: 0, invested: 0, free: 0 };
  const heroFreeCents = currentBuckets.free ?? 0;
  const dashboardRecommendations = projection
    ? selectDashboardRecommendations(projection, domainGoals, heroFreeCents) || []
    : [];

  // Find plannedCents und Breakdown für aktuellen Monat
  const plannedCents = currentBuckets.planned;
  const plannedBreakdown = current?.plannedGoalBreakdownById ?? {};

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

      {/* Empfehlungen-Block */}
      <div data-testid="dashboard-recommendations">
        {dashboardRecommendations.length > 0 && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Empfehlungen</div>
            <div style={{ display: "grid", gap: 8 }}>
              {dashboardRecommendations.slice(0, 2).map((rec, i) => {
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
        <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCentsEUR(currentBuckets.free)}</div>

      </div>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>4 Töpfe (aktueller Monat)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>Gebunden: <b>{formatCentsEUR(currentBuckets.bound)}</b></div>
          <div>
            Verplant: <b>{formatCentsEUR(plannedCents)}</b>
            <span style={{ marginLeft: 8 }}>
              <button
                style={{ fontSize: 12, padding: '2px 6px', borderRadius: 6, border: '1px solid #aaa', background: '#f9f9f9', cursor: 'pointer' }}
                onClick={() => setShowBreakdown(v => !v)}
              >Details</button>
            </span>
          </div>
          <div>Investiert (Monat): <b>{formatCentsEUR(currentBuckets.invested)}</b></div>
          <div>Frei: <b>{formatCentsEUR(currentBuckets.free)}</b></div>
        </div>
        <div style={{ fontSize: '0.9em', color: '#6b7280', marginTop: 8 }}>
          Hinweis: Vermögens-Bestand (Assets) ist separat und nicht Teil der 4 Cashflow-Töpfe. Bestand siehe Vermögen/Anlagen.
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

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Timeline (Free)</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, maxHeight: 220, overflow: "auto" }}>
          {(() => {
            const timeline = projection?.timeline ?? [];
            if (timeline.length === 0) {
              return <div style={{ opacity: 0.7 }}>Keine Timeline-Daten.</div>;
            }
            return timeline.slice(0, 12).map((item) => (
              <div key={item.month}>
                {item.month}: {formatCentsEUR(item.buckets?.free ?? 0)}
              </div>
            ));
          })()}
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #3333", borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Top Ziele (priorisiert)</div>
        {(() => {
          if (storeGoals.length === 0) {
            return <div style={{ opacity: 0.7 }}>Keine Ziele gefunden.</div>;
          }
          // Sortiere nach Priorität
          const priorityOrder: Record<'critical' | 'high' | 'medium' | 'low', number> = { critical: 0, high: 1, medium: 2, low: 3 };
          const sortedGoals = [...storeGoals].sort((a, b) => {
            return priorityOrder[a.priority as 'critical' | 'high' | 'medium' | 'low'] - priorityOrder[b.priority as 'critical' | 'high' | 'medium' | 'low'];
          });
          return (
            <div style={{ display: "grid", gap: 6 }}>
              {sortedGoals.slice(0, 3).map((tg) => {
                const goal = storeGoals.find(g => g.goalId === tg.goalId);
                if (!goal) return null;
                const currentCents = typeof goal.currentAmountCents === 'number' && Number.isFinite(goal.currentAmountCents) ? goal.currentAmountCents : 0;
                const targetCents = typeof goal.targetAmountCents === 'number' && Number.isFinite(goal.targetAmountCents) ? goal.targetAmountCents : 0;
                const monthlyCents = typeof goal.monthlyContributionCents === 'number' && Number.isFinite(goal.monthlyContributionCents) ? goal.monthlyContributionCents : 0;
                const targetDate = goal.targetDate ? (typeof goal.targetDate === 'string' ? new Date(goal.targetDate) : goal.targetDate) : undefined;
                const dateString = targetDate ? `${targetDate.getDate().toString().padStart(2, '0')}.${(targetDate.getMonth()+1).toString().padStart(2, '0')}.${targetDate.getFullYear()}` : '—';
                return (
                  <div key={goal.goalId || goal.id}>
                    <b>{goal.name}</b> (Prio {goal.priority})<br />
                    Fortschritt: {formatCentsEUR(currentCents)} / {formatCentsEUR(targetCents)}<br />
                    Monatliche Sparrate: {formatCentsEUR(monthlyCents)}<br />
                    Zieldatum: {dateString}
                  </div>
                );
              })}
            </div>
          );
        })()}
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
