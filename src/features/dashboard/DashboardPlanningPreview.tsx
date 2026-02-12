import { useEffect, useState } from "react";
const DEBUG = import.meta.env.DEV && import.meta.env.VITE_DEBUG === "1";
import { incomeRepository, expenseRepository, assetRepository, goalRepository } from "@data/repositories";
import type { DashboardModel } from "@/planning/planFacade";
import { buildDashboardModelFromRepositories } from "@/planning/planFacade";
import { formatCentsEUR } from "@/ui/formatMoney";
import { selectDashboardRecommendations } from "@/planning/recommendations";
import { useNavigate } from "react-router-dom";
import { handleRecommendationAction } from "./recommendationActions";

export default function DashboardPlanningPreview() {
  const navigate = useNavigate();
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    (async () => {
      // --- Debug actual planning input ---
      try {
        if (DEBUG) {
          console.log('[DEBUG] before fetch');
        }
        // Fetch all planning-relevant arrays
        const incomes = await incomeRepository.getAll();
        const expenses = await expenseRepository.getAll();
        const assets = await assetRepository.getAll();
        const goals = await goalRepository.getAll();
        const investments = (typeof assetRepository.getInvestments === 'function') ? await assetRepository.getInvestments() : [];
        const reserves = (typeof assetRepository.getReserves === 'function') ? await assetRepository.getReserves() : [];
        // Compose the input object as used in planning (simulate what planFacade would do)
        const input = {
          incomes,
          expenses,
          goals,
          investments,
          reserves
        };
        if (DEBUG) {
          console.log('[DEBUG] planning input counts:', {
            incomes: input.incomes?.length ?? 0,
            expenses: input.expenses?.length ?? 0,
            goals: input.goals?.length ?? 0,
            investments: input.investments?.length ?? 0,
            reserves: input.reserves?.length ?? 0
          });
        }
        if (DEBUG) {
          console.log('[DEBUG] after fetch counts', {
            incomes: incomes.length,
            expenses: expenses.length,
            goals: goals.length,
            investments: investments.length,
            reserves: reserves.length
          });
          console.log('[DEBUG] after fetch sample', {
            income0: incomes[0]?.id ?? "n/a",
            expense0: expenses[0]?.id ?? "n/a",
            goal0: goals[0]?.id ?? "n/a",
            investment0: investments[0]?.id ?? "n/a",
            reserve0: reserves[0]?.id ?? "n/a"
          });
          // Log localStorage keys and sample
          const lsKeys = Object.keys(window.localStorage);
          console.log('[DEBUG] localStorage keys', lsKeys);
          if (lsKeys.length > 0) {
            console.log('[DEBUG] localStorage key samples', lsKeys.slice(0,5).map(k => ({ k, len: (localStorage.getItem(k) ?? '').length })));
          }
          // finance-app-store encryption/structure check
          const raw = localStorage.getItem("finance-app-store");
          console.log("[DEBUG] finance-app-store raw head", raw ? raw.slice(0, 80) : null);
          console.log("[DEBUG] finance-app-store looksEncrypted", raw ? raw.startsWith("U2FsdGVkX1") : false);
          if (raw && !raw.startsWith("U2FsdGVkX1")) {
            try {
              const obj = JSON.parse(raw);
              console.log("[DEBUG] finance-app-store json topKeys", Object.keys(obj));
              if (obj && typeof obj === 'object' && obj.state) {
                console.log("[DEBUG] finance-app-store state topKeys", Object.keys(obj.state));
              }
            } catch (err) {
              console.log("[DEBUG] finance-app-store JSON.parse error", err);
            }
          }
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

        {/* DEV-ONLY DEBUG BLOCK: Forecast input values (planInput) */}
            {import.meta.env.DEV && model?.projection?.settings?._input && (
              <pre style={{ marginTop: 12, fontSize: 13, background: '#f6f6f6', padding: 8, borderRadius: 6 }} data-testid="dashboard-debug-raw">
                {(() => {
                  // Use the exact input object passed to forecast
                  const input = model.projection.settings._input;
                  const month = input.month;
                  const incomes = input.incomes || [];
                  const expenses = input.expenses || [];
                  const goals = input.goals || [];
                  const investments = input.investments || [];
                  const reserves = input.reserves || [];
                  // Sums
                  const sumIncomeCents = incomes.reduce((sum, i) => sum + (typeof i.amount === 'number' ? i.amount : 0), 0);
                  const sumExpenseCents = expenses.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0);
                  return [
                    `month: ${month}`,
                    `incomes.length: ${incomes.length}`,
                    `expenses.length: ${expenses.length}`,
                    `goals.length: ${goals.length}`,
                    `investments.length: ${investments.length}`,
                    `reserves.length: ${reserves.length}`,
                    '',
                    `sumIncomeCents: ${sumIncomeCents}`,
                    `sumExpenseCents: ${sumExpenseCents}`
                  ].join('\n');
                })()}
              </pre>
            )}
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
