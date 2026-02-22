/**
 * Forecast Integration Test – 10 randomisierte Mutationsrunden
 *
 * Prüft nach jeder Änderung:
 *  1. Bucket-Invariante: free === income - bound - planned - invested
 *  2. Alle Werte sind ganzzahlige Cents (integer)
 *  3. Bound, planned, invested stimmen mit den Eingabedaten überein
 *  4. Goal-Capping: Beiträge stoppen wenn Ziel erreicht
 *  5. Lump-Sum: Nicht-monatliche Einkommen nur in Vorkommens-Monaten
 */

import { describe, it, expect } from 'vitest';
import { buildPlanProjection } from './forecast';
import type { PlanInput, PlanProjection, MonthKey } from './types';
import type {
  RecurringIncome,
  RecurringExpense,
  ReserveBucket,
  Goal,
  InvestmentPlan,
  Interval,
} from '../domain/types';

// ─── Helpers ──────────────────────────────────────────────

let idCounter = 0;
function uid(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInterval(): Interval {
  return pickRandom<Interval>(['monthly', 'quarterly', 'semi_yearly', 'yearly']);
}

// ─── Base Data Factory ──────────────────────────────────

function createBaseInput(): PlanInput {
  const incomes: RecurringIncome[] = [
    {
      id: uid('inc'),
      name: 'Gehalt',
      amount: 320000,
      interval: 'monthly',
      confidence: 'fixed',
      startDate: '2026-01-01',
    },
    {
      id: uid('inc'),
      name: 'Freelance',
      amount: 80000,
      interval: 'monthly',
      confidence: 'likely',
      startDate: '2026-01-15',
    },
    {
      id: uid('inc'),
      name: 'Weihnachtsgeld',
      amount: 300000,
      interval: 'yearly',
      confidence: 'fixed',
      startDate: '2026-12-01',
    },
  ];

  const expenses: RecurringExpense[] = [
    { id: uid('exp'), name: 'Miete', amount: 120000, interval: 'monthly', startDate: '2026-01-01' },
    { id: uid('exp'), name: 'Strom', amount: 9500, interval: 'monthly', startDate: '2026-01-01' },
    { id: uid('exp'), name: 'Internet', amount: 4000, interval: 'monthly', startDate: '2026-01-01' },
    { id: uid('exp'), name: 'Versicherung', amount: 240000, interval: 'yearly', startDate: '2026-03-01' },
    { id: uid('exp'), name: 'Spotify', amount: 1299, interval: 'monthly', startDate: '2026-01-01' },
  ];

  const goals: Goal[] = [
    {
      id: uid('goal'),
      name: 'Notgroschen',
      targetAmountCents: 1000000,
      currentAmountCents: 500000,
      monthlyContributionCents: 15000,
      priority: 1,
    },
    {
      id: uid('goal'),
      name: 'Urlaub 2026',
      targetAmountCents: 200000,
      currentAmountCents: 45000,
      monthlyContributionCents: 25000,
      priority: 3,
    },
  ];

  const investments: InvestmentPlan[] = [
    { id: uid('inv'), name: 'ETF Sparplan', monthlyContribution: 20000 },
    { id: uid('inv'), name: 'Aktien', monthlyContribution: 10000 },
  ];

  const reserves: ReserveBucket[] = [
    {
      id: uid('res'),
      name: 'KFZ Versicherung',
      targetAmount: 120000,
      monthlyContribution: 10000,
      currentAmount: 30000,
      interval: 'yearly',
      dueDate: '2026-11-01',
    },
    {
      id: uid('res'),
      name: 'GEZ',
      targetAmount: 5220,
      monthlyContribution: 1740,
      currentAmount: 0,
      interval: 'quarterly',
      dueDate: '2026-04-01',
    },
  ];

  return {
    incomes,
    expenses,
    reserves,
    goals,
    investments,
    knownPayments: [],
  };
}

// ─── Mutations ──────────────────────────────────────────

type MutationFn = (input: PlanInput) => string;

const mutations: MutationFn[] = [
  // Add a new monthly income
  (input) => {
    const amount = randomInt(5000, 100000);
    input.incomes.push({
      id: uid('inc'),
      name: 'Nebeneinnahme',
      amount,
      interval: 'monthly',
      confidence: 'likely',
      startDate: '2026-01-01',
    });
    return `+ Einkommen mtl. ${amount} ct`;
  },

  // Add a yearly income
  (input) => {
    const amount = randomInt(50000, 500000);
    const month = randomInt(1, 12).toString().padStart(2, '0');
    input.incomes.push({
      id: uid('inc'),
      name: 'Bonus',
      amount,
      interval: 'yearly',
      confidence: 'fixed',
      startDate: `2026-${month}-01`,
    });
    return `+ Einkommen jährl. ${amount} ct (Monat ${month})`;
  },

  // Add a quarterly income
  (input) => {
    const amount = randomInt(20000, 200000);
    const month = randomInt(1, 3).toString().padStart(2, '0');
    input.incomes.push({
      id: uid('inc'),
      name: 'Quartalsbonus',
      amount,
      interval: 'quarterly',
      confidence: 'likely',
      startDate: `2026-${month}-01`,
    });
    return `+ Einkommen quartal. ${amount} ct (Start ${month})`;
  },

  // Remove a random income (if >1)
  (input) => {
    if (input.incomes.length <= 1) return '(skip: nur 1 Einkommen)';
    const idx = randomInt(0, input.incomes.length - 1);
    const removed = input.incomes.splice(idx, 1)[0];
    return `- Einkommen "${removed.name}" entfernt`;
  },

  // Add a new expense
  (input) => {
    const amount = randomInt(1000, 50000);
    const interval = randomInterval();
    input.expenses.push({
      id: uid('exp'),
      name: 'Neue Ausgabe',
      amount,
      interval,
      startDate: '2026-01-01',
    });
    return `+ Ausgabe ${interval} ${amount} ct`;
  },

  // Remove a random expense (if >1)
  (input) => {
    if (input.expenses.length <= 1) return '(skip: nur 1 Ausgabe)';
    const idx = randomInt(0, input.expenses.length - 1);
    const removed = input.expenses.splice(idx, 1)[0];
    return `- Ausgabe "${removed.name}" entfernt`;
  },

  // Change a goal's monthly contribution
  (input) => {
    if (input.goals.length === 0) return '(skip: keine Ziele)';
    const goal = pickRandom(input.goals);
    const oldRate = goal.monthlyContributionCents ?? 0;
    goal.monthlyContributionCents = randomInt(5000, 40000);
    return `~ Ziel "${goal.name}" Rate ${oldRate} -> ${goal.monthlyContributionCents} ct`;
  },

  // Add a new goal
  (input) => {
    const target = randomInt(100000, 500000);
    const monthly = randomInt(5000, 30000);
    input.goals.push({
      id: uid('goal'),
      name: 'Neues Ziel',
      targetAmountCents: target,
      currentAmountCents: 0,
      monthlyContributionCents: monthly,
      priority: randomInt(1, 5) as 1 | 2 | 3 | 4 | 5,
    });
    return `+ Ziel target=${target} rate=${monthly} ct`;
  },

  // Remove a random goal (if >1)
  (input) => {
    if (input.goals.length <= 1) return '(skip: nur 1 Ziel)';
    const idx = randomInt(0, input.goals.length - 1);
    const removed = input.goals.splice(idx, 1)[0];
    return `- Ziel "${removed.name}" entfernt`;
  },

  // Add a new investment
  (input) => {
    const amount = randomInt(5000, 50000);
    input.investments.push({
      id: uid('inv'),
      name: 'Neue Anlage',
      monthlyContribution: amount,
    });
    return `+ Anlage ${amount} ct/Monat`;
  },

  // Remove a random investment (if >1)
  (input) => {
    if (input.investments.length <= 1) return '(skip: nur 1 Anlage)';
    const idx = randomInt(0, input.investments.length - 1);
    const removed = input.investments.splice(idx, 1)[0];
    return `- Anlage "${removed.name}" entfernt`;
  },

  // Change investment contribution
  (input) => {
    if (input.investments.length === 0) return '(skip: keine Anlagen)';
    const inv = pickRandom(input.investments);
    const old = inv.monthlyContribution;
    inv.monthlyContribution = randomInt(5000, 50000);
    return `~ Anlage "${inv.name}" ${old} -> ${inv.monthlyContribution} ct`;
  },

  // Change expense amount
  (input) => {
    if (input.expenses.length === 0) return '(skip: keine Ausgaben)';
    const exp = pickRandom(input.expenses);
    const old = exp.amount;
    exp.amount = randomInt(1000, 80000);
    return `~ Ausgabe "${exp.name}" ${old} -> ${exp.amount} ct`;
  },

  // Add a new reserve
  (input) => {
    const target = randomInt(50000, 300000);
    const interval = pickRandom<Interval>(['quarterly', 'yearly']);
    const months = interval === 'yearly' ? 12 : 3;
    const monthly = Math.ceil(target / months);
    const month = randomInt(1, 12).toString().padStart(2, '0');
    input.reserves.push({
      id: uid('res'),
      name: 'Neue Rücklage',
      targetAmount: target,
      monthlyContribution: monthly,
      currentAmount: 0,
      interval,
      dueDate: `2026-${month}-01`,
    });
    return `+ Rücklage ${interval} target=${target} monthly=${monthly} ct`;
  },

  // Remove a random reserve (if >1)
  (input) => {
    if (input.reserves.length <= 1) return '(skip: nur 1 Rücklage)';
    const idx = randomInt(0, input.reserves.length - 1);
    const removed = input.reserves.splice(idx, 1)[0];
    return `- Rücklage "${removed.name}" entfernt`;
  },

  // Change reserve contribution
  (input) => {
    if (input.reserves.length === 0) return '(skip: keine Rücklagen)';
    const res = pickRandom(input.reserves);
    const old = res.monthlyContribution;
    res.monthlyContribution = randomInt(1000, 30000);
    return `~ Rücklage "${res.name}" ${old} -> ${res.monthlyContribution} ct`;
  },
];

// ─── Verification ───────────────────────────────────────

function intervalMonths(interval: Interval): number {
  switch (interval) {
    case 'monthly': return 1;
    case 'quarterly': return 3;
    case 'semi_yearly': return 6;
    case 'yearly': return 12;
    default: return 1;
  }
}

function isOccurrenceMonth(month: MonthKey, startDate: string | undefined, interval: Interval): boolean {
  if (interval === 'monthly') return true;
  if (!startDate) return true;
  const [sYear, sMonth] = startDate.slice(0, 7).split('-').map(Number);
  const [mYear, mMonth] = month.split('-').map(Number);
  const diff = (mYear - sYear) * 12 + (mMonth - sMonth);
  if (diff < 0) return false;
  return diff % intervalMonths(interval) === 0;
}

function verifyProjection(input: PlanInput, projection: PlanProjection, label: string) {
  const investTotal = input.investments.reduce((s, i) => s + i.monthlyContribution, 0);
  const reserveTotal = input.reserves.reduce((s, r) => s + r.monthlyContribution, 0);

  for (const mp of projection.timeline) {
    const { month, income, buckets } = mp;
    const { bound, planned, invested, free } = buckets;

    // 1. All values must be finite integers
    expect(Number.isInteger(income), `${label} [${month}] income not integer: ${income}`).toBe(true);
    expect(Number.isInteger(bound), `${label} [${month}] bound not integer: ${bound}`).toBe(true);
    expect(Number.isInteger(planned), `${label} [${month}] planned not integer: ${planned}`).toBe(true);
    expect(Number.isInteger(invested), `${label} [${month}] invested not integer: ${invested}`).toBe(true);
    expect(Number.isInteger(free), `${label} [${month}] free not integer: ${free}`).toBe(true);

    // 2. Core invariant: free = income - bound - planned - invested
    expect(free).toBe(
      income - bound - planned - invested,
      // Custom message for better debugging
    );

    // 3. Invested must match total investment contributions
    expect(invested).toBe(investTotal);

    // 4. Verify income: sum of lump-sum recurring + one-time
    const expectedRecurringIncome = input.incomes
      .filter(i => {
        const startM = i.startDate ? i.startDate.slice(0, 7) : undefined;
        const endM = i.endDate ? i.endDate.slice(0, 7) : undefined;
        const isOneTime = i.startDate && i.endDate && i.startDate === i.endDate;
        if (isOneTime) return false;
        if (startM && month < startM) return false;
        if (endM && month > endM) return false;
        return isOccurrenceMonth(month, i.startDate, i.interval);
      })
      .reduce((s, i) => s + i.amount, 0);

    const expectedOneTimeIncome = input.incomes
      .filter(i => i.startDate && i.endDate && i.startDate === i.endDate && month === i.startDate.slice(0, 7))
      .reduce((s, i) => s + (typeof i.amountCents === 'number' ? i.amountCents : i.amount), 0);

    expect(income).toBe(
      expectedRecurringIncome + expectedOneTimeIncome,
    );

    // 5. Verify bound: sum of lump-sum expenses in occurrence months + reserves + known payments
    const expectedExpenses = input.expenses
      .filter(e => {
        const startM = e.startDate ? e.startDate.slice(0, 7) : undefined;
        const endM = e.endDate ? e.endDate.slice(0, 7) : undefined;
        if (startM && month < startM) return false;
        if (endM && month > endM) return false;
        return isOccurrenceMonth(month, e.startDate, e.interval);
      })
      .reduce((s, e) => s + e.amount, 0);

    const expectedPayments = (input.knownPayments ?? [])
      .filter(p => p.dueDate.slice(0, 7) === month)
      .reduce((s, p) => s + p.amount, 0);

    expect(bound).toBe(expectedExpenses + reserveTotal + expectedPayments);

    // 6. Planned must be >= 0
    expect(planned).toBeGreaterThanOrEqual(0);

    // 7. Planned breakdown must sum to planned
    const breakdownSum = Object.values(mp.plannedGoalBreakdownById ?? {}).reduce((a, b) => a + b, 0);
    expect(breakdownSum).toBe(planned);
  }
}

function verifyGoalCapping(input: PlanInput, projection: PlanProjection, label: string) {
  for (const goal of input.goals) {
    const id = goal.id;
    const targetCents = goal.targetAmountCents ?? Math.round((goal.targetAmount ?? 0) * 100);
    const currentCents = goal.currentAmountCents ?? Math.round((goal.currentAmount ?? 0) * 100);
    const remaining = Math.max(0, targetCents - currentCents);

    let totalContributed = 0;
    for (const mp of projection.timeline) {
      totalContributed += mp.plannedGoalBreakdownById?.[id] ?? 0;
    }

    expect(
      totalContributed <= remaining,
      `${label} Goal "${goal.name}" over-contributed: ${totalContributed} > remaining ${remaining}`,
    ).toBe(true);
  }
}

function verifyLumpSum(input: PlanInput, projection: PlanProjection, label: string) {
  for (const inc of input.incomes) {
    if (inc.interval === 'monthly') continue;
    const isOneTime = inc.startDate && inc.endDate && inc.startDate === inc.endDate;
    if (isOneTime) continue;

    for (const mp of projection.timeline) {
      const startM = inc.startDate ? inc.startDate.slice(0, 7) : undefined;
      if (startM && mp.month < startM) continue;

      const shouldOccur = isOccurrenceMonth(mp.month, inc.startDate, inc.interval);

      if (!shouldOccur) {
        // This income should NOT contribute to this month's income.
        // We can't directly check individual contributions, but we verify
        // the total income doesn't include it (done via verifyProjection #4).
      }
    }
  }
  // Lump-sum correctness is already verified in verifyProjection step 4.
  // This function serves as documentation of the intent.
}

// ─── Test Suite ─────────────────────────────────────────

describe('Forecast Integration: 10 Mutationsrunden', () => {
  const SETTINGS = { forecastMonths: 12, startMonth: '2026-02' as MonthKey };
  const ROUNDS = 10;
  const MUTATIONS_PER_ROUND = { min: 1, max: 3 };

  it('Base-Szenario: alle Invarianten gelten', () => {
    const input = createBaseInput();
    const projection = buildPlanProjection(input, SETTINGS);

    expect(projection.timeline).toHaveLength(12);
    verifyProjection(input, projection, 'Base');
    verifyGoalCapping(input, projection, 'Base');
    verifyLumpSum(input, projection, 'Base');
  });

  for (let round = 1; round <= ROUNDS; round++) {
    it(`Runde ${round}: Mutation + Verifikation`, () => {
      const input = createBaseInput();
      const changeLog: string[] = [];

      // Apply mutations for all previous rounds + this round (cumulative)
      const seed = round * 37;
      const rng = () => (seed * 16807 % 2147483647) / 2147483647;

      const numMutations = randomInt(MUTATIONS_PER_ROUND.min, MUTATIONS_PER_ROUND.max);
      for (let m = 0; m < numMutations; m++) {
        const mutation = pickRandom(mutations);
        const desc = mutation(input);
        changeLog.push(desc);
      }

      const projection = buildPlanProjection(input, SETTINGS);

      expect(projection.timeline).toHaveLength(12);
      verifyProjection(input, projection, `R${round} [${changeLog.join('; ')}]`);
      verifyGoalCapping(input, projection, `R${round}`);
    });
  }

  it('Stress: 30 Mutationen hintereinander', () => {
    const input = createBaseInput();

    for (let i = 0; i < 30; i++) {
      const mutation = pickRandom(mutations);
      mutation(input);
    }

    const projection = buildPlanProjection(input, SETTINGS);
    expect(projection.timeline).toHaveLength(12);
    verifyProjection(input, projection, 'Stress-30');
    verifyGoalCapping(input, projection, 'Stress-30');
  });

  it('Edge: Keine Einkommen -> free immer negativ oder 0', () => {
    const input = createBaseInput();
    input.incomes = [];

    const projection = buildPlanProjection(input, SETTINGS);
    for (const mp of projection.timeline) {
      expect(mp.income).toBe(0);
      expect(mp.buckets.free).toBeLessThanOrEqual(0);
    }
    verifyProjection(input, projection, 'NoIncome');
  });

  it('Edge: Keine Ausgaben/Ziele/Anlagen -> free === income', () => {
    const input = createBaseInput();
    input.expenses = [];
    input.goals = [];
    input.investments = [];
    input.reserves = [];

    const projection = buildPlanProjection(input, SETTINGS);
    for (const mp of projection.timeline) {
      expect(mp.buckets.bound).toBe(0);
      expect(mp.buckets.planned).toBe(0);
      expect(mp.buckets.invested).toBe(0);
      expect(mp.buckets.free).toBe(mp.income);
    }
  });

  it('Edge: Jährliches Einkommen erscheint nur im richtigen Monat', () => {
    const input: PlanInput = {
      incomes: [
        {
          id: 'yearly-nov',
          name: 'Bonus',
          amount: 500000,
          interval: 'yearly',
          confidence: 'fixed',
          startDate: '2026-11-01',
        },
      ],
      expenses: [],
      reserves: [],
      goals: [],
      investments: [],
    };

    const projection = buildPlanProjection(input, {
      forecastMonths: 12,
      startMonth: '2026-02' as MonthKey,
    });

    for (const mp of projection.timeline) {
      if (mp.month === '2026-11') {
        expect(mp.income).toBe(500000);
      } else {
        expect(mp.income).toBe(0);
      }
    }
  });

  it('Edge: Quartalseinkommen erscheint alle 3 Monate', () => {
    const input: PlanInput = {
      incomes: [
        {
          id: 'quarterly-mar',
          name: 'Quartalsbonus',
          amount: 120000,
          interval: 'quarterly',
          confidence: 'fixed',
          startDate: '2026-03-01',
        },
      ],
      expenses: [],
      reserves: [],
      goals: [],
      investments: [],
    };

    const projection = buildPlanProjection(input, {
      forecastMonths: 12,
      startMonth: '2026-01' as MonthKey,
    });

    const expectedMonths = ['2026-03', '2026-06', '2026-09', '2026-12'];
    for (const mp of projection.timeline) {
      if (expectedMonths.includes(mp.month)) {
        expect(mp.income).toBe(120000);
      } else {
        expect(mp.income).toBe(0);
      }
    }
  });

  it('Edge: Jährliche Ausgabe erscheint nur im Fälligkeitsmonat', () => {
    const input: PlanInput = {
      incomes: [
        { id: 'sal', name: 'Gehalt', amount: 500000, interval: 'monthly', confidence: 'fixed', startDate: '2026-01-01' },
      ],
      expenses: [
        { id: 'ins', name: 'Versicherung', amount: 240000, interval: 'yearly', startDate: '2026-06-01' },
      ],
      reserves: [],
      goals: [],
      investments: [],
    };

    const projection = buildPlanProjection(input, {
      forecastMonths: 12,
      startMonth: '2026-01' as MonthKey,
    });

    for (const mp of projection.timeline) {
      if (mp.month === '2026-06') {
        expect(mp.buckets.bound).toBe(240000);
        expect(mp.buckets.free).toBe(500000 - 240000);
      } else {
        expect(mp.buckets.bound).toBe(0);
        expect(mp.buckets.free).toBe(500000);
      }
    }
  });

  it('Edge: Quartalsausgabe erscheint alle 3 Monate', () => {
    const input: PlanInput = {
      incomes: [
        { id: 'sal', name: 'Gehalt', amount: 500000, interval: 'monthly', confidence: 'fixed', startDate: '2026-01-01' },
      ],
      expenses: [
        { id: 'q-exp', name: 'Quartalsgebühr', amount: 60000, interval: 'quarterly', startDate: '2026-02-01' },
      ],
      reserves: [],
      goals: [],
      investments: [],
    };

    const projection = buildPlanProjection(input, {
      forecastMonths: 12,
      startMonth: '2026-01' as MonthKey,
    });

    const expectedMonths = ['2026-02', '2026-05', '2026-08', '2026-11'];
    for (const mp of projection.timeline) {
      if (expectedMonths.includes(mp.month)) {
        expect(mp.buckets.bound).toBe(60000);
      } else {
        expect(mp.buckets.bound).toBe(0);
      }
    }
  });

  it('Edge: Reserve-Beitrag fließt jeden Monat in Bound', () => {
    const input: PlanInput = {
      incomes: [
        { id: 'sal', name: 'Gehalt', amount: 500000, interval: 'monthly', confidence: 'fixed', startDate: '2026-01-01' },
      ],
      expenses: [],
      reserves: [
        {
          id: 'res-kfz',
          name: 'KFZ Versicherung',
          targetAmount: 120000,
          monthlyContribution: 10000,
          currentAmount: 0,
          interval: 'yearly',
          dueDate: '2026-12-01',
        },
      ],
      goals: [],
      investments: [],
    };

    const projection = buildPlanProjection(input, {
      forecastMonths: 12,
      startMonth: '2026-01' as MonthKey,
    });

    for (const mp of projection.timeline) {
      expect(mp.buckets.bound).toBe(10000);
      expect(mp.buckets.free).toBe(500000 - 10000);
    }
  });

  it('Edge: Mehrere Rücklagen addieren sich in Bound', () => {
    const input: PlanInput = {
      incomes: [
        { id: 'sal', name: 'Gehalt', amount: 500000, interval: 'monthly', confidence: 'fixed', startDate: '2026-01-01' },
      ],
      expenses: [
        { id: 'miete', name: 'Miete', amount: 100000, interval: 'monthly', startDate: '2026-01-01' },
      ],
      reserves: [
        { id: 'res1', name: 'KFZ', targetAmount: 120000, monthlyContribution: 10000, interval: 'yearly', dueDate: '2026-12-01' },
        { id: 'res2', name: 'GEZ', targetAmount: 5220, monthlyContribution: 1740, interval: 'quarterly', dueDate: '2026-04-01' },
      ],
      goals: [],
      investments: [],
    };

    const projection = buildPlanProjection(input, {
      forecastMonths: 3,
      startMonth: '2026-01' as MonthKey,
    });

    const expectedBound = 100000 + 10000 + 1740;
    for (const mp of projection.timeline) {
      expect(mp.buckets.bound).toBe(expectedBound);
      expect(mp.buckets.free).toBe(500000 - expectedBound);
    }
    verifyProjection(input, projection, 'MultiReserve');
  });

  it('Edge: Reserve + Ausgabe + Ziel korrekt separiert', () => {
    const input: PlanInput = {
      incomes: [
        { id: 'sal', name: 'Gehalt', amount: 500000, interval: 'monthly', confidence: 'fixed', startDate: '2026-01-01' },
      ],
      expenses: [
        { id: 'miete', name: 'Miete', amount: 100000, interval: 'monthly', startDate: '2026-01-01' },
      ],
      reserves: [
        { id: 'res1', name: 'Versicherung', targetAmount: 60000, monthlyContribution: 5000, interval: 'yearly', dueDate: '2026-12-01' },
      ],
      goals: [
        { id: 'g1', name: 'Urlaub', targetAmountCents: 200000, currentAmountCents: 0, monthlyContributionCents: 20000, priority: 2 },
      ],
      investments: [
        { id: 'inv1', name: 'ETF', monthlyContribution: 15000 },
      ],
    };

    const projection = buildPlanProjection(input, {
      forecastMonths: 3,
      startMonth: '2026-01' as MonthKey,
    });

    for (const mp of projection.timeline) {
      // Bound = expense (100000) + reserve (5000)
      expect(mp.buckets.bound).toBe(105000);
      // Invested = ETF (15000)
      expect(mp.buckets.invested).toBe(15000);
      // Planned = goal contribution (capped, max 20000/month)
      expect(mp.buckets.planned).toBeLessThanOrEqual(20000);
      expect(mp.buckets.planned).toBeGreaterThanOrEqual(0);
    }
    verifyProjection(input, projection, 'MixedBuckets');
    verifyGoalCapping(input, projection, 'MixedBuckets');
  });

  it('Edge: Ziel-Capping stoppt bei Zielerreichung', () => {
    const input: PlanInput = {
      incomes: [
        { id: 'sal', name: 'Gehalt', amount: 500000, interval: 'monthly', confidence: 'fixed' },
      ],
      expenses: [],
      reserves: [],
      goals: [
        {
          id: 'g-cap',
          name: 'Kleines Ziel',
          targetAmountCents: 50000,
          currentAmountCents: 40000,
          monthlyContributionCents: 10000,
          priority: 1,
        },
      ],
      investments: [],
    };

    const projection = buildPlanProjection(input, SETTINGS);

    // Only 10000 remaining → 1 month of contribution
    let totalPlanned = 0;
    for (const mp of projection.timeline) {
      totalPlanned += mp.buckets.planned;
    }
    expect(totalPlanned).toBe(10000);

    // First month: 10000, rest: 0
    expect(projection.timeline[0].buckets.planned).toBe(10000);
    expect(projection.timeline[1].buckets.planned).toBe(0);
  });
});
