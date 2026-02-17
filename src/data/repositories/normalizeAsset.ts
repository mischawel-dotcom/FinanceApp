import { euroInputToCentsSafe } from '@shared/utils/money';

export function normalizeAsset(raw: any) {
  // costBasisCents
  let costBasisCents = 0;
  if (Number.isFinite(raw.costBasisCents)) {
    costBasisCents = raw.costBasisCents;
  } else if (Number.isFinite(raw.valueCents)) {
    costBasisCents = raw.valueCents;
  } else if (raw.costBasis !== undefined) {
    costBasisCents = euroInputToCentsSafe(raw.costBasis);
  } else if (Number.isFinite(raw.currentValue)) {
    costBasisCents = Math.round(raw.currentValue * 100);
  } else if (Number.isFinite(raw.initialInvestment)) {
    costBasisCents = Math.round(raw.initialInvestment * 100);
  }

  // monthlyContributionCents
  let monthlyContributionCents = 0;
  if (Number.isFinite(raw.monthlyContributionCents)) {
    monthlyContributionCents = raw.monthlyContributionCents;
  } else if (raw.monthlyContribution !== undefined) {
    monthlyContributionCents = euroInputToCentsSafe(raw.monthlyContribution);
  }

  // marketValueCents
  let marketValueCents: number | undefined = undefined;
  if (Number.isFinite(raw.marketValueCents)) {
    marketValueCents = raw.marketValueCents;
  } else if (raw.marketValue !== undefined) {
    const mv = euroInputToCentsSafe(raw.marketValue);
    marketValueCents = Number.isFinite(mv) ? mv : undefined;
  }

  return {
    ...raw,
    costBasisCents,
    monthlyContributionCents,
    ...(marketValueCents !== undefined ? { marketValueCents } : {}),
  };
}
