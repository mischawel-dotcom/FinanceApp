import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/app/store/useAppStore";
const DEBUG = import.meta.env.DEV && import.meta.env.VITE_DEBUG === "1";

import type { DashboardModel } from "@/planning/planFacade";
import { buildDashboardModelFromRepositories } from "@/planning/planFacade";
import { formatCents } from "@/ui/formatMoney";
import { selectDashboardRecommendations } from "@/planning/recommendations";
import { useNavigate } from "react-router-dom";
import { handleRecommendationAction } from "./recommendationActions";

// Accepts optional onFlowKpis callback to send current month KPIs to parent

export default function DashboardPlanningPreview({ onFlowKpis }: { onFlowKpis?: (kpis: { incomeCents: number; boundCents: number; plannedCents: number; investedCents: number; freeCents: number }) => void }) {
  const navigate = useNavigate();
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Store goals immer auf Top-Level holen (Hook order fix)
  const storeGoalsRaw = useAppStore((s) => s.goals);
  const storeGoals = Array.isArray(storeGoalsRaw) ? storeGoalsRaw : [];

  type Shortfall = { month: string; amount: number };
  const shortfalls: Shortfall[] = [];
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
    ? selectDashboardRecommendations(projection, storeGoals as any, heroFreeCents) || []
    : [];

  // Find plannedCents und Breakdown für aktuellen Monat
  const plannedCents = currentBuckets.planned;
  const plannedBreakdown = current?.plannedGoalBreakdownById ?? {};

  // Helper for breakdown UI – use storeGoals (actual goals from store)
  const plannedGoalsList = storeGoals
    .map(g => ({
      name: g.name,
      amount: plannedBreakdown[((g as any).goalId ?? g.id)] ?? 0,
    }))
    .filter(g => g.amount > 0);





  return (
    <div className="p-4 grid gap-3 text-gray-900 dark:text-gray-100">
      <h2 className="text-lg font-semibold">Planning Preview</h2>

      {/* Empfehlungen-Block */}
      <div data-testid="dashboard-recommendations">
        {dashboardRecommendations.length > 0 && (
          <>
            <div className="font-semibold mb-2">Empfehlungen</div>
            <div className="grid gap-2">
              {dashboardRecommendations.slice(0, 2).map((rec, i) => {
                let explanation = null;
                if (rec.type === "shortfall_risk" && rec.evidence?.month && typeof rec.evidence.amountCents === "number") {
                  explanation = `Im Monat ${rec.evidence.month} entsteht ein Fehlbetrag von ${formatCents(rec.evidence.amountCents)}.`;
                } else if (rec.type === "low_slack") {
                  explanation = "Dein freier Spielraum ist aktuell sehr gering.";
                } else if (rec.type === "goal_contrib_issue" && rec.evidence?.goalId) {
                  explanation = `Für das Ziel '${rec.evidence.goalId}' ist ein monatlicher Beitrag geplant, aber nicht eingeplant.`;
                }
                return (
                  <div
                    key={rec.id || i}
                    data-testid="dashboard-recommendation"
                    className="border border-yellow-400 dark:border-yellow-600 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20"
                  >
                    {rec.type === "shortfall_risk" ? (
                      <span data-testid="dashboard-recommendation-badge" className="inline-block bg-red-400 text-white rounded px-2 py-0.5 text-xs mr-2">Risiko</span>
                    ) : (
                      <span data-testid="dashboard-recommendation-badge" className="inline-block bg-blue-600 text-white rounded px-2 py-0.5 text-xs mr-2">Hinweis</span>
                    )}
                    <b>{rec.title}</b>
                    <div className="text-sm mt-1">{rec.reason}</div>
                    {explanation && (
                      <div className="text-sm mt-1.5 text-gray-600 dark:text-gray-400" data-testid="dashboard-recommendation-explanation">
                        {explanation}
                      </div>
                    )}
                    {rec.action && (
                      <button
                        data-testid="dashboard-recommendation-action"
                        className="mt-2.5 px-3 py-1 rounded-md border border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-sm cursor-pointer"
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

      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="text-xs text-gray-500 dark:text-gray-400">Verfügbar (aktueller Monat)</div>
        <div className="text-3xl font-bold mt-1">{formatCents(currentBuckets.free)}</div>
      </div>

      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="font-semibold mb-2">4 Töpfe (aktueller Monat)</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Gebunden: <b>{formatCents(currentBuckets.bound)}</b></div>
          <div>
            Verplant: <b>{formatCents(plannedCents)}</b>
            <button
              className="ml-2 text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => setShowBreakdown(v => !v)}
            >Details</button>
          </div>
          <div>Investiert: <b>{formatCents(currentBuckets.invested)}</b></div>
          <div>Frei: <b>{formatCents(currentBuckets.free)}</b></div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Hinweis: Vermögens-Bestand (Assets) ist separat und nicht Teil der 4 Cashflow-Töpfe.
        </div>
        {showBreakdown && (
          <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 p-2">
            <div className="font-semibold mb-1 text-sm">Verplant Breakdown</div>
            {plannedGoalsList.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">Keine geplanten Zielbeiträge im aktuellen Monat.</div>
            ) : (
              <ul className="list-none p-0 m-0 text-sm">
                {plannedGoalsList.map(g => (
                  <li key={g.name} className="mb-0.5">
                    {g.name}: <b>{formatCents(g.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="font-semibold mb-2">Timeline (Free)</div>
        <div className="font-mono text-xs max-h-56 overflow-auto">
          {(() => {
            const timeline = projection?.timeline ?? [];
            if (timeline.length === 0) {
              return <div className="text-gray-500 dark:text-gray-400">Keine Timeline-Daten.</div>;
            }
            return timeline.slice(0, 12).map((item) => (
              <div key={item.month}>
                {item.month}: {formatCents(item.buckets?.free ?? 0)}
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="font-semibold mb-2">Top Ziele (priorisiert)</div>
        {(() => {
          if (storeGoals.length === 0) {
            return <div className="text-gray-500 dark:text-gray-400">Keine Ziele gefunden.</div>;
          }
          const priorityOrder: Record<'critical' | 'high' | 'medium' | 'low', number> = { critical: 0, high: 1, medium: 2, low: 3 };
          const sortedGoals = [...storeGoals].sort((a, b) => {
            return priorityOrder[a.priority as 'critical' | 'high' | 'medium' | 'low'] - priorityOrder[b.priority as 'critical' | 'high' | 'medium' | 'low'];
          });
          return (
            <div className="grid gap-1.5 text-sm">
              {sortedGoals.slice(0, 3).map((tg) => {
                const goal = storeGoals.find(g => g.id === tg.id);
                if (!goal) return null;
                const currentCents = Math.round((goal.currentAmount ?? 0) * 100);
                const targetCents = Math.round((goal.targetAmount ?? 0) * 100);
                const monthlyCents = typeof goal.monthlyContributionCents === 'number' && Number.isFinite(goal.monthlyContributionCents) ? goal.monthlyContributionCents : 0;
                const targetDate = goal.targetDate ? (typeof goal.targetDate === 'string' ? new Date(goal.targetDate) : goal.targetDate) : undefined;
                const dateString = targetDate ? `${targetDate.getDate().toString().padStart(2, '0')}.${(targetDate.getMonth()+1).toString().padStart(2, '0')}.${targetDate.getFullYear()}` : '—';
                return (
                  <div key={goal.id}>
                    <b>{goal.name}</b> (Prio {goal.priority})<br />
                    Fortschritt: {formatCents(currentCents)} / {formatCents(targetCents)}<br />
                    Sparrate: {formatCents(monthlyCents)} · Zieldatum: {dateString}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="font-semibold mb-2">Shortfalls</div>
        {shortfalls.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">Keine Shortfalls im Horizont.</div>
        ) : (
          <div className="grid gap-1.5 text-sm">
            {shortfalls.slice(0, 6).map((s) => (
              <div key={s.month}>
                {s.month}: <b>{formatCents(s.amount)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
