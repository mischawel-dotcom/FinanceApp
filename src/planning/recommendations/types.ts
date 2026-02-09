export type RecommendationType =
  | "shortfall_risk"
  | "low_slack"
  | "goal_contrib_issue";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  reason: string;
  evidence?: {
    month?: string;
    amountCents?: number;
    goalId?: string;
  };
  actions: Array<{
    label: string;
    kind: "navigate" | "adjust_value";
    payload?: any;
  }>;
  score: {
    impact: number;
    urgency: number;
    simplicity: number;
    robustness: number;
    total: number;
  };
}

import type { PlanProjection } from '../types';
import type { Goal } from '../../domain/types';

export type RecommendationContext = {
  projection: PlanProjection;
  heroFreeCents: number;
  goals: Goal[];
};
