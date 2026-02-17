import { buildPlanProjection } from '../forecast';
// Minimal PlanningInput fixture for regression
const baseInput = {
  incomes: [
    {
      id: 'income1',
      name: 'Job',
      amount: 20000, // 200,00 €
      interval: 'monthly',
      startDate: '2026-02-01',
      endDate: undefined,
    },
  ],
  expenses: [],
  goals: [],
  reserves: [],
  investments: [],
  assets: [
    {
      id: 'a1',
      name: 'ETF',
      monthlyContributionCents: 1000, // 10,00 €
      currentValue: 0,
      initialInvestment: 0,
    },
    {
      id: 'a2',
      name: 'Aktie',
      monthlyContributionCents: 2500, // 25,00 €
      currentValue: 100000000, // 1.000.000,00 €
      initialInvestment: 50000000, // 500.000,00 €
    },
  ],
  knownPayments: [],
};

describe('investedFromAssets regression', () => {
  it('investedCents is sum of asset monthlyContributionCents, stock values do not affect invested/free', () => {
    const input = JSON.parse(JSON.stringify(baseInput));
    const settings = { forecastMonths: 1, startMonth: '2026-02' as const };
    const projection = buildPlanProjection(input, settings);
    const timeline = projection.timeline;

    type TimelineMonth = {
      month: string;
      income: number;
      buckets: { invested: number; free: number };
    };

    const feb = (timeline as TimelineMonth[]).find(m => m.month === '2026-02');
    expect(feb).toBeDefined();
    const investedCents = feb!.buckets.invested;
    const freeCents = feb!.buckets.free;
    // 1) Invested = 1000 + 2500 = 3500
    expect(investedCents).toBe(3500);
    // 2) Free = 20000 - 0 - 0 - 3500 = 16500
    expect(freeCents).toBe(16500);
    // 3) Cents-only
    expect(Number.isFinite(investedCents)).toBe(true);
    expect(Number.isInteger(investedCents)).toBe(true);
    expect(Number.isFinite(freeCents)).toBe(true);
    expect(Number.isInteger(freeCents)).toBe(true);
    // 4) Stock-Trennung: Ändere nur currentValue/initialInvestment
    input.assets[0].currentValue = 99999999;
    input.assets[1].currentValue = 123456789;
    input.assets[1].initialInvestment = 99999999;
    const projection2 = buildPlanProjection(input, settings);
    const timeline2 = projection2.timeline;
    const feb2 = (timeline2 as TimelineMonth[]).find(m => m.month === '2026-02');
    expect(feb2!.buckets.invested).toBe(3500);
    expect(feb2!.buckets.free).toBe(16500);
  });
});
