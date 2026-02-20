import { PlanningPlanningRecommendation } from "./types";
import type { PlanProjection } from "../types";
import type { Goal } from "../../domain/types";

// --- Rule: Shortfall Risk ---
export function ruleShortfallRisk(projection: PlanProjection): PlanningRecommendation | null {
  for (const mp of projection.timeline) {
    if (mp.buckets.free < 0) {
      return {
        id: `shortfall_risk_${mp.month}`,
        type: "shortfall_risk",
        title: "Budget-Lücke vermeiden",
        reason: `Im Monat ${mp.month} ist dein freier Betrag negativ (${(mp.buckets.free / 100).toFixed(2)} €).`,
        evidence: { month: mp.month, amountCents: mp.buckets.free },
        actions: [
          { label: "Fixkosten prüfen", kind: "navigate" },
          { label: "Sparraten reduzieren", kind: "adjust_value" },
          { label: "Einnahmen erhöhen", kind: "navigate" },
        ],
        score: { impact: 0, urgency: 0, simplicity: 0, robustness: 0, total: 0 },
      };
    }
  }
  return null;
}

// --- Rule: Low Slack ---
export function ruleLowSlack(_projection: PlanProjection, heroFreeCents: number): PlanningRecommendation | null {
  if (heroFreeCents <= 0 || heroFreeCents < 1000) {
    return {
      id: `low_slack`,
      type: "low_slack",
      title: "Mehr Monats-Puffer aufbauen",
      reason: "Dein verfügbarer Monats-Spielraum ist sehr klein.",
      evidence: { amountCents: heroFreeCents },
      actions: [
        { label: "Puffer erhöhen", kind: "adjust_value" },
      ],
      score: { impact: 0, urgency: 0, simplicity: 0, robustness: 0, total: 0 },
    };
  }
  return null;
}

// --- Rule: Goal Contribution Issue ---
export function ruleGoalContributionIssue(projection: PlanProjection, goals: Goal[]): PlanningRecommendation[] {
  const recs: PlanningRecommendation[] = [];
  const first = projection.timeline[0];
  if (!first) return recs;
  for (const goal of goals) {
    // Use monthlyContribution if present, else fallback to 0
    const monthlyCents = (goal as any).monthlyContribution ?? 0;
    if (monthlyCents > 0) {
      const planned = first.plannedGoalBreakdownById?.[goal.id];
      if (!planned || planned <= 0) {
        recs.push({
          id: `goal_contrib_issue_${goal.id}`,
          type: "goal_contrib_issue",
          title: "Sparrate fürs Ziel aktivieren",
          reason: "Für das Ziel wird aktuell keine monatliche Sparrate eingeplant.",
          evidence: { goalId: goal.id, amountCents: monthlyCents },
          actions: [
            { label: "Sparrate anpassen", kind: "adjust_value", payload: { goalId: goal.id } },
          ],
          score: { impact: 0, urgency: 0, simplicity: 0, robustness: 0, total: 0 },
        });
      }
    }
  }
  return recs;
}
