import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@shared/components';
import { formatCentsEUR } from '@/ui/formatMoney';
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
        <h1 className="text-3xl font-bold text-gray-900">Finanzplanung</h1>
        <Card><div className="text-center py-12 text-gray-500">Berechne Prognose...</div></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Finanzplanung</h1>
        <Card><div className="text-center py-12 text-danger-600">Fehler: {error}</div></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzplanung</h1>
          <p className="text-gray-600 mt-1">Cashflow-Prognose, Budgetverteilung und Handlungsempfehlungen</p>
        </div>
      </div>

      {/* Monats-Übersicht: 4 Töpfe */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="text-sm text-gray-600">Einkommen</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCentsEUR(currentIncome)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Gebunden</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCentsEUR(currentBuckets.bound)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Verplant</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCentsEUR(currentBuckets.planned)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Investiert</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCentsEUR(currentBuckets.invested)}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Frei verfügbar</div>
          <div className={`text-xl font-bold mt-1 ${currentBuckets.free >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {formatCentsEUR(currentBuckets.free)}
          </div>
        </Card>
      </div>

      {/* Empfehlungen */}
      {recommendations.length > 0 && (
        <Card title="Handlungsempfehlungen">
          <div className="space-y-4">
            {recommendations.map((rec, i) => {
              let explanation: string | null = null;
              if (rec.type === 'shortfall_risk' && rec.evidence?.month && typeof rec.evidence.amountCents === 'number') {
                explanation = `Im Monat ${rec.evidence.month} entsteht ein Fehlbetrag von ${formatCentsEUR(rec.evidence.amountCents)}.`;
              } else if (rec.type === 'low_slack') {
                explanation = `Dein freier Spielraum beträgt aktuell nur ${formatCentsEUR(rec.evidence?.amountCents ?? 0)}.`;
              } else if (rec.type === 'goal_contrib_issue' && rec.evidence?.goalId) {
                explanation = `Für das Ziel "${rec.evidence.goalId}" ist ein Beitrag geplant, der nicht gedeckt ist.`;
              }

              return (
                <div
                  key={rec.id || i}
                  className={`p-4 rounded-lg border ${
                    rec.type === 'shortfall_risk'
                      ? 'border-danger-200 bg-danger-50'
                      : 'border-primary-200 bg-primary-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          rec.type === 'shortfall_risk'
                            ? 'bg-danger-500 text-white'
                            : 'bg-primary-500 text-white'
                        }`}>
                          {rec.type === 'shortfall_risk' ? 'Risiko' : 'Hinweis'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                      <p className="text-sm text-gray-700 mt-1">{rec.reason}</p>
                      {explanation && (
                        <p className="text-sm text-gray-600 mt-2">{explanation}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      {rec.type === 'shortfall_risk' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/expenses')}>
                          Ausgaben prüfen
                        </Button>
                      )}
                      {rec.type === 'low_slack' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/income')}>
                          Einnahmen prüfen
                        </Button>
                      )}
                      {rec.type === 'goal_contrib_issue' && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/goals')}>
                          Ziele prüfen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Shortfalls */}
      {shortfalls.length > 0 && (
        <Card title="Fehlbeträge im Prognosezeitraum">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Monat</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Fehlbetrag</th>
                </tr>
              </thead>
              <tbody>
                {shortfalls.map((s) => (
                  <tr key={s.month} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-900">{s.month}</td>
                    <td className="py-2 px-3 text-right font-semibold text-danger-600">{formatCentsEUR(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Timeline-Chart: Frei verfügbar über Zeit */}
      <Card title="Cashflow-Prognose: Frei verfügbar (24 Monate)">
        {timelineChartData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Keine Prognosedaten verfügbar</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineChartData}>
                <XAxis dataKey="month" fontSize={11} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={12} tickFormatter={(v: number) => `${(v / 100).toFixed(0)}€`} />
                <Tooltip formatter={(value: number) => formatCentsEUR(value)} />
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
      </Card>

      {/* Bucket-Verteilung aktueller Monat */}
      <Card title={`Budgetverteilung (${timeline[0]?.month ?? 'aktuell'})`}>
        <div className="space-y-3">
          {[
            { label: 'Gebunden (Fixkosten, Reserven)', value: currentBuckets.bound, color: 'bg-red-400' },
            { label: 'Verplant (Ziel-Beiträge)', value: currentBuckets.planned, color: 'bg-blue-400' },
            { label: 'Investiert (Monatl. Sparraten)', value: currentBuckets.invested, color: 'bg-purple-400' },
            { label: 'Frei verfügbar', value: currentBuckets.free, color: currentBuckets.free >= 0 ? 'bg-green-400' : 'bg-red-600' },
          ].map((bucket) => {
            const total = currentIncome > 0 ? currentIncome : 1;
            const pct = Math.max(0, Math.min(100, (Math.abs(bucket.value) / total) * 100));
            return (
              <div key={bucket.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{bucket.label}</span>
                  <span className="font-semibold">{formatCentsEUR(bucket.value)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${bucket.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Timeline-Tabelle */}
      <Card title="Monatliche Timeline (Detail)">
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Monat</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Einkommen</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Gebunden</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Verplant</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Investiert</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Frei</th>
              </tr>
            </thead>
            <tbody>
              {timeline.slice(0, 24).map((m) => (
                <tr key={m.month} className={`border-b border-gray-100 ${m.buckets.free < 0 ? 'bg-danger-50' : ''}`}>
                  <td className="py-2 px-3 font-medium text-gray-900">{m.month}</td>
                  <td className="py-2 px-3 text-right">{formatCentsEUR(m.income)}</td>
                  <td className="py-2 px-3 text-right">{formatCentsEUR(m.buckets.bound)}</td>
                  <td className="py-2 px-3 text-right">{formatCentsEUR(m.buckets.planned)}</td>
                  <td className="py-2 px-3 text-right">{formatCentsEUR(m.buckets.invested)}</td>
                  <td className={`py-2 px-3 text-right font-semibold ${m.buckets.free >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {formatCentsEUR(m.buckets.free)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Kontext-Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center py-4">
            <div className="text-sm text-gray-600 mb-3">Einnahmen erhöhen?</div>
            <Button variant="secondary" onClick={() => navigate('/income')}>Einkommen verwalten</Button>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <div className="text-sm text-gray-600 mb-3">Ausgaben reduzieren?</div>
            <Button variant="secondary" onClick={() => navigate('/expenses')}>Ausgaben verwalten</Button>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <div className="text-sm text-gray-600 mb-3">Ziele anpassen?</div>
            <Button variant="secondary" onClick={() => navigate('/goals')}>Ziele verwalten</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
