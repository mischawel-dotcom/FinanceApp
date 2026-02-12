export type RecommendationActionKind =
  | "open_planning"
  | "open_goal"
  | "open_goals"
  | "open_income"
  | "open_expenses";

export interface RecommendationAction {
  kind: RecommendationActionKind;
  label: string;
  payload?: { goalId?: string };
}

export function handleRecommendationAction(
  action: any,
  deps: { navigate: (to: string) => void }
): void {
  // Neu: generisches navigate mit Query-String
  if (action.kind === "navigate" && action.payload?.path) {
    let url = action.payload.path;
    if (action.payload.query && typeof action.payload.query === "object") {
      const params = Object.entries(action.payload.query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      if (params) url += `?${params}`;
    }
    deps.navigate(url);
    return;
  }
  // Fallback: legacy switch
  switch (action.kind) {
    case "open_planning":
      deps.navigate("/planning");
      break;
    case "open_goal":
      if (action.payload?.goalId) {
        deps.navigate(`/goals/${action.payload.goalId}`);
      }
      break;
    case "open_goals":
      deps.navigate("/goals");
      break;
    case "open_income":
      deps.navigate("/income");
      break;
    case "open_expenses":
      deps.navigate("/expenses");
      break;
    default: {
      // Robust: handle intent-based navigation
      if (action && typeof action === 'object') {
        if (action.intent === "expenses") {
          deps.navigate("/expenses");
          return;
        }
        if (action.intent === "income") {
          deps.navigate("/income");
          return;
        }
        if (action.intent === "planning") {
          deps.navigate("/");
          return;
        }
        if (action.kind === "navigate" && action.payload?.path) {
          let url = action.payload.path;
          if (action.payload.query && typeof action.payload.query === "object") {
            const params = Object.entries(action.payload.query)
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
              .join("&");
            if (params) url += `?${params}`;
          }
          deps.navigate(url);
          return;
        }
      }
      // DEV: warn once per unknown action type
      if (process.env.NODE_ENV === "development") {
        if (!window.__warnedUnknownRecActions) window.__warnedUnknownRecActions = new Set();
        const key = action && (action.kind || action.intent || typeof action);
        if (!window.__warnedUnknownRecActions.has(key)) {
          // eslint-disable-next-line no-console
          console.warn("Unknown recommendation action", key, action);
          window.__warnedUnknownRecActions.add(key);
        }
      }
      // Always return silently for unknown actions
      return;
    }
  }
}
