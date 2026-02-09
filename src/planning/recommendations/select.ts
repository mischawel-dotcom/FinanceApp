import { Recommendation } from "./types";
import { ruleShortfallRisk, ruleLowSlack, ruleGoalContributionIssue } from "./rules";
import { scoreCandidate } from "./score";
import type { PlanProjection } from "../types";
import type { Goal } from "../../domain/types";

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
  const candidates = buildRecommendationCandidates(projection, goals, heroFreeCents).map(scoreCandidate);
  candidates.sort((a, b) => b.score.total - a.score.total);
  return candidates.slice(0, max);
}
