import { Recommendation } from "./types";
import { ruleShortfallRisk, ruleLowSlack, ruleGoalContributionIssue } from "./rules";
import { scoreCandidate } from "./score";
import type { PlanProjection } from "../types";
import type { Goal } from "../../domain/types";

type ActionKind = NonNullable<Recommendation["action"]>["kind"];
type ActionIntent = NonNullable<Recommendation["action"]>["intent"];
type ActionPayload = NonNullable<Recommendation["action"]>["payload"];

function makeAction(
  kind: ActionKind,
  intent: ActionIntent,
  label: string,
  payload?: ActionPayload
): Recommendation["action"] {
  return payload ? { kind, intent, label, payload } : { kind, intent, label };
}

export function buildRecommendationCandidates(projection: PlanProjection, goals: Goal[], heroFreeCents: number): Recommendation[] {
  const candidates: Recommendation[] = [];
  const shortfall = ruleShortfallRisk(projection);
  if (shortfall) candidates.push(shortfall);
  const lowSlack = ruleLowSlack(projection, heroFreeCents);
  if (lowSlack) candidates.push(lowSlack);
  candidates.push(...ruleGoalContributionIssue(projection, goals));
  return candidates;
}

export function selectTopRecommendations(projection: PlanProjection, goals: Goal[], heroFreeCents: number, max: number = 2): Recommendation[] {
  const candidates = buildRecommendationCandidates(projection, goals, heroFreeCents)
    .map((rec) => {
      let action;
      if (rec.type === "shortfall_risk" || rec.type === "low_slack") {
        action = makeAction("open_planning", "planning", "Ansehen");
      } else if (rec.type === "goal_contrib_issue") {
        const goalId = rec.evidence?.goalId;
        action = goalId
          ? makeAction("open_goal", "goals", "Zum Ziel", { goalId })
          : undefined;
      }
      return { ...rec, action };
    })
    .map(scoreCandidate);
  candidates.sort((a, b) => b.score.total - a.score.total);
  return candidates.slice(0, max);
}
