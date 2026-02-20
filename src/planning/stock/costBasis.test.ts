import { describe, it, expect } from "vitest";
import { computeAssetCostBasisTimeline } from "./costBasis";

describe("computeAssetCostBasisTimeline", () => {
  it("builds deterministic cumulative cost-basis timeline", () => {
    const assets = [
      {
        id: "a1",
        costBasisCents: 1000,
        monthlyContributionCents: 500,
      },
    ];

    const months = ["2026-01", "2026-02", "2026-03"];

    const result = computeAssetCostBasisTimeline(assets, months);

    expect(result["a1"]).toHaveLength(3);

    expect(result["a1"][0]).toEqual({
      month: "2026-01",
      costBasisCents: 1000,
    });

    expect(result["a1"][1]).toEqual({
      month: "2026-02",
      costBasisCents: 1500,
    });

    expect(result["a1"][2]).toEqual({
      month: "2026-03",
      costBasisCents: 2000,
    });
  });

  it("returns empty object when assets undefined", () => {
    const result = computeAssetCostBasisTimeline(undefined, ["2026-01"]);
    expect(result).toEqual({});
  });

  it("skips assets without id", () => {
    const assets = [
      {
        costBasisCents: 1000,
        monthlyContributionCents: 500,
      } as any,
    ];

    const result = computeAssetCostBasisTimeline(assets, ["2026-01"]);
    expect(result).toEqual({});
  });
});
