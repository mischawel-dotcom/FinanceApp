import { describe, it, expect, beforeEach, vi } from "vitest";
import { GoalRepositoryImpl } from "../../data/repositories";

describe("GoalRepositoryImpl legacy goal repair", () => {
  const storageKey = "finance-app:goals";
  let repo: GoalRepositoryImpl;
  let mockStorage: any;

  beforeEach(() => {
    // Mock storage with legacy and new goals
    let store: any = {};
    mockStorage = {
      get: vi.fn((key) => Promise.resolve(store[key] || [])),
      set: vi.fn((key, value) => {
        store[key] = value;
        return Promise.resolve();
      }),
    };
    repo = new GoalRepositoryImpl();
    // @ts-ignore
    repo.storage = mockStorage;
    // @ts-ignore
    repo.storageKey = storageKey;
  });

  it("repairs legacy goals with euros fields", async () => {
    const legacyGoal: any = {
      id: "1",
      name: "Legacy Goal",
      targetAmount: 123.45,
      currentAmount: 10,
      monthlyContribution: 5.5,
    };
    const newGoal = {
      id: "2",
      name: "New Goal",
      targetAmountCents: 10000,
      currentAmountCents: 500,
      monthlyContributionCents: 100,
    };
    mockStorage.get.mockResolvedValueOnce([legacyGoal, newGoal]);
    const result = await repo.getAll();
    // Legacy goal should be repaired
    expect(result[0].targetAmountCents).toBe(12345);
    expect(result[0].currentAmountCents).toBe(1000);
    expect(result[0].monthlyContributionCents).toBe(550);
    expect(result[0].targetAmount).toBeUndefined();
    expect(result[0].currentAmount).toBeUndefined();
    expect(result[0].monthlyContribution).toBeUndefined();
    // New goal should be unchanged
    expect(result[1]).toEqual(newGoal);
    // Should persist repaired data
    expect(mockStorage.set).toHaveBeenCalledWith(storageKey, expect.any(Array));
  });

  it("does not persist if no repair needed", async () => {
    const newGoal = {
      id: "2",
      name: "New Goal",
      targetAmountCents: 10000,
      currentAmountCents: 500,
      monthlyContributionCents: 100,
    };
    mockStorage.get.mockResolvedValueOnce([newGoal]);
    await repo.getAll();
    expect(mockStorage.set).not.toHaveBeenCalled();
  });
});
