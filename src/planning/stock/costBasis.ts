// Minimaltyp für PlanInput.assets (kein voller Asset-Typ nötig)
import type { AssetCostBasisPoint } from "@/planning/types";

type AssetLikeForCostBasis = {
  id?: string;
  costBasisCents?: number;
  monthlyContributionCents?: number;
};

export function computeAssetCostBasisTimeline(
  assets: AssetLikeForCostBasis[] | undefined,
  monthKeys: string[]
): Record<string, AssetCostBasisPoint[]> {
  if (!assets || assets.length === 0) return {};
  const result: Record<string, AssetCostBasisPoint[]> = {};
  for (const a of assets) {
    if (!a.id) continue;
    const points: AssetCostBasisPoint[] = [];
    let costBasis = a.costBasisCents ?? 0;
    const monthly = a.monthlyContributionCents ?? 0;
    for (const month of monthKeys) {
      points.push({ month, costBasisCents: costBasis });
      costBasis += monthly;
    }
    result[a.id] = points;
  }
  return result;
}
