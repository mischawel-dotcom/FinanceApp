import { Recommendation } from "./types";

export function scoreCandidate(candidate: Recommendation): Recommendation {
  let impact = 0, urgency = 0, simplicity = 0, robustness = 0;
  switch (candidate.type) {
    case "shortfall_risk":
      urgency = 10;
      impact = Math.min(10, 8 + Math.min(2, Math.abs(candidate.evidence?.amountCents ?? 0) / 10000));
      simplicity = 5;
      robustness = 8;
      break;
    case "low_slack":
      urgency = 6;
      impact = 6;
      simplicity = 8;
      robustness = 6;
      break;
    case "goal_contrib_issue":
      urgency = 4;
      impact = Math.min(7, (candidate.evidence?.amountCents ?? 0) / 10000 * 7);
      simplicity = 8;
      robustness = 6;
      break;
  }
  const total = impact * 0.35 + urgency * 0.35 + simplicity * 0.2 + robustness * 0.1;
  return {
    ...candidate,
    score: { impact, urgency, simplicity, robustness, total: Math.round(total * 100) / 100 },
  };
}
