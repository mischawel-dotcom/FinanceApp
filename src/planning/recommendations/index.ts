import { selectTopRecommendations } from "./select";
import type { PlanProjection } from "../types";
import type { Goal } from "../../domain/types";

export function selectDashboardRecommendations(projection: PlanProjection, goals: Goal[], heroFreeCents: number) {
  return selectTopRecommendations(projection, goals, heroFreeCents);
}
