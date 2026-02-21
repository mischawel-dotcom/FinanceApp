import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@shared/components';
import { formatCents } from '@/ui/formatMoney';
import { buildDashboardModelFromRepositories } from '@/planning/planFacade';
import type { DashboardModel } from '@/planning/planFacade';
import { selectDashboardRecommendations } from '@/planning/recommendations';
import type { Goal } from '../../domain/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

function CollapsibleSection({ title, defaultOpen = false, children }: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between lg:pointer-events-none"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className="text-gray-400 dark:text-gray-500 lg:hidden transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}>
          ▼
        </span>
      </button>
      <div className={`${isOpen ? 'block' : 'hidden'} lg:block mt-4`}>
        {children}
      </div>
    </Card>
  );
}

export default function PlanningPage() {
  const navigate = useNavigate();
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const m = await buildDashboardModelFromRepositories({ forecastMonths: 24 });
        setModel(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const projection = model?.projection;
  const timeline = useMemo(() => projection?.timeline ?? [], [projection]);
  const currentBuckets = timeline[0]?.buckets ?? { bound: 0, planned: 0, invested: 0, free: 0 };
  const currentIncome = timeline[0]?.income ?? 0;

  const recommendations = useMemo(() => {
    if (!projection) return [];
    const domainGoals: Goal[] = model?.domainGoals ?? [];
    const heroFree = currentBuckets.free;
    return selectDashboardRecommendations(projection, domainGoals, heroFree) || [];
  }, [projection, model, currentBuckets.free]);

  const shortfalls = model?.shortfalls ?? [];

  const timelineChartData = useMemo(() => {
    return timeline.slice(0, 24).map((m) => ({
      month: m.month,
      free: m.buckets.free,
      bound: m.buckets.bound,
      planned: m.buckets.planned,
      invested: m.buckets.invested,
    }));
  }, [timeline]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finanzplanung</h1>
        <Card><div className="text-center py-12 text-gray-500 dark:text-gray-400">Berechne Prognose...</div></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finanzplanung</h1>
        <Card><div className="text-center py-12 text-danger-600">Fehler: {error}</div></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Finanzplanung</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm lg:text-base">Cashflow-Prognose und Budgetverteilung</p>
      </div>

      {/* KPI Grid – compact on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
        <Card>
          <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Einkommen</div>
          <div className="text-base lg:text-xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCents(currentIncome)}</div>
        </Card>
        <Card>
          <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Gebunden</div>
          <div className="text-base lg:text-xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCents(currentBuckets.bound)}</div>
        </Card>
        <Card>
          <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Verplant</div>
          <div className="text-base lg:text-xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCents(currentBuckets.planned)}</div>
        </Card>
        <Card>
          <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Investiert</div>
          <div className="text-base lg:text-xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCents(currentBuckets.invested)}</div>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Frei verfügbar</div>
          <div className={`text-base lg:text-xl font-bold mt-0.5 ${currentBuckets.free >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatCents(currentBuckets.free)}
          </div>
        </Card>
      </div>

      {/* Empfehlungen – always visible */}
      {recommendations.length > 0 && (
        <Card title="Handlungsempfehlungen">
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              let explanation: string | null = null;
              if (rec.type === 'shortfall_risk' && rec.evidence?.month && typeof rec.evidence.amountCents === 'number') {
                explanation = `Im Monat ${rec.evidence.month} entsteht ein Fehlbetrag von ${formatCents(rec.evidence.amountCents)}.`;
              } else if (rec.type === 'low_slack') {
                explanation = `Dein freier Spielraum beträgt aktuell nur ${formatCents(rec.evidence?.amountCents ?? 0)}.`;
              } else if (rec.type === 'goal_contrib_issue' && rec.evidence?.goalId) {
                explanation = `Für das Ziel "${rec.evidence.goalId}" ist ein Beitrag geplant, der nicht gedeckt ist.`;
              }

              return (
                <div
                  key={rec.id || i}
                  className={`p-3 lg:p-4 rounded-lg border ${
                    rec.type === 'shortfall_risk'
                      ? 'border-danger-200 bg-danger-50 dark:border-danger-500/30 dark:bg-danger-500/10'
                      : 'border-primary-200 bg-primary-50 dark:border-primary-500/30 dark:bg-primary-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded mb-1 ${
                        rec.type === 'shortfall_risk'
                          ? 'bg-danger-500 text-white'
                          : 'bg-primary-500 text-white'
                      }`}>
                        {rec.type === 'shortfall_risk' ? 'Risiko' : 'Hinweis'}
                      </span>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base">{rec.title}</h3>
                      <p className="text-xs lg:text-sm text-gray-700 dark:text-gray-300 mt-1">{rec.reason}</p>
                      {explanation && (
                        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">{explanation}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {rec.type === 'shortfall_risk' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/expenses')}>Prüfen</Button>
                      )}
                      {rec.type === 'low_slack' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/income')}>Prüfen</Button>
                      )}
                      {rec.type === 'goal_contrib_issue' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/goals')}>Prüfen</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Shortfalls – always visible if present */}
      {shortfalls.length > 0 && (
        <Card title="Fehlbeträge">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {shortfalls.map((s) => (
              <div key={s.month} className="flex justify-between py-2">
                <span className="text-sm text-gray-900 dark:text-white">{s.month}</span>
                <span className="text-sm font-semibold text-danger-600">{formatCents(s.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Budgetverteilung – collapsible on mobile, default open */}
      <CollapsibleSection title={`Budgetverteilung (${timeline[0]?.month ?? 'aktuell'})`} defaultOpen>
        <div className="space-y-3">
          {[
            { label: 'Gebunden', value: currentBuckets.bound, color: 'bg-red-400' },
            { label: 'Verplant', value: currentBuckets.planned, color: 'bg-blue-400' },
            { label: 'Investiert', value: currentBuckets.invested, color: 'bg-purple-400' },
            { label: 'Frei', value: currentBuckets.free, color: currentBuckets.free >= 0 ? 'bg-green-400' : 'bg-red-600' },
          ].map((bucket) => {
            const total = currentIncome > 0 ? currentIncome : 1;
            const pct = Math.max(0, Math.min(100, (Math.abs(bucket.value) / total) * 100));
            return (
              <div key={bucket.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{bucket.label}</span>
                  <span className="font-semibold">{formatCents(bucket.value)} <span className="text-gray-400 dark:text-gray-500 text-xs">({pct.toFixed(0)}%)</span></span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${bucket.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Cashflow Chart – collapsible on mobile, default collapsed */}
      <CollapsibleSection title="Cashflow-Prognose (24 Monate)">
        {timelineChartData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Keine Prognosedaten</div>
        ) : (
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineChartData}>
                <XAxis dataKey="month" fontSize={10} angle={-45} textAnchor="end" height={50} />
                <YAxis fontSize={11} tickFormatter={(v: number) => `${(v / 100).toFixed(0)}€`} />
                <Tooltip formatter={(value: number) => formatCents(value)} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Bar dataKey="free" name="Frei verfügbar" radius={[3, 3, 0, 0]}>
                  {timelineChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.free >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CollapsibleSection>

      {/* Timeline Detail – collapsible on mobile, default collapsed */}
      <CollapsibleSection title="Monatliche Timeline">
        <div className="overflow-x-auto max-h-72 lg:max-h-96">
          <table className="min-w-full text-xs lg:text-sm">
            <thead className="sticky top-0 bg-white dark:bg-gray-800">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 lg:px-3 font-medium text-gray-600 dark:text-gray-400">Monat</th>
                <th className="text-right py-2 px-2 lg:px-3 font-medium text-gray-600 dark:text-gray-400">Eink.</th>
                <th className="text-right py-2 px-2 lg:px-3 font-medium text-gray-600 dark:text-gray-400">Geb.</th>
                <th className="text-right py-2 px-2 lg:px-3 font-medium text-gray-600 dark:text-gray-400">Verpl.</th>
                <th className="text-right py-2 px-2 lg:px-3 font-medium text-gray-600 dark:text-gray-400">Inv.</th>
                <th className="text-right py-2 px-2 lg:px-3 font-medium text-gray-600 dark:text-gray-400">Frei</th>
              </tr>
            </thead>
            <tbody>
              {timeline.slice(0, 24).map((m) => (
                <tr key={m.month} className={`border-b border-gray-100 dark:border-gray-700 ${m.buckets.free < 0 ? 'bg-danger-50 dark:bg-danger-500/10' : ''}`}>
                  <td className="py-1.5 px-2 lg:px-3 font-medium text-gray-900 dark:text-white">{m.month}</td>
                  <td className="py-1.5 px-2 lg:px-3 text-right">{formatCents(m.income)}</td>
                  <td className="py-1.5 px-2 lg:px-3 text-right">{formatCents(m.buckets.bound)}</td>
                  <td className="py-1.5 px-2 lg:px-3 text-right">{formatCents(m.buckets.planned)}</td>
                  <td className="py-1.5 px-2 lg:px-3 text-right">{formatCents(m.buckets.invested)}</td>
                  <td className={`py-1.5 px-2 lg:px-3 text-right font-semibold ${m.buckets.free >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {formatCents(m.buckets.free)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Kontext-Links – compact on mobile */}
      <div className="flex flex-wrap gap-2 lg:grid lg:grid-cols-3 lg:gap-4">
        <Button variant="secondary" className="flex-1 lg:flex-none" onClick={() => navigate('/income')}>💰 Einkommen</Button>
        <Button variant="secondary" className="flex-1 lg:flex-none" onClick={() => navigate('/expenses')}>💸 Ausgaben</Button>
        <Button variant="secondary" className="flex-1 lg:flex-none" onClick={() => navigate('/goals')}>🎯 Ziele</Button>
      </div>
    </div>
  );
}
