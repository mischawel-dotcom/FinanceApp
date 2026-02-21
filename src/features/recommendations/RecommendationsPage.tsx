import { useAppStore } from '@/app/store/useAppStore';
import { Button, Card } from '@shared/components';
import { formatCentsEUR } from '@/ui/formatMoney';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildDashboardModelFromRepositories } from '@/planning/planFacade';
import type { DashboardModel } from '@/planning/planFacade';
import { selectDashboardRecommendations } from '@/planning/recommendations';
import type { PlanningRecommendation } from '@/planning/recommendations/types';
import type { Goal } from '../../domain/types';

import type { Recommendation } from '@shared/types';

type ImpactFilter = 'all' | 'high' | 'medium' | 'low';

export default function RecommendationsPage() {
  const { recommendations, generateRecommendations, deleteRecommendation, expenses, expenseCategories, loadData } = useAppStore();
  const navigate = useNavigate();
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // --- Planning-based Budget Health ---
  const [planModel, setPlanModel] = useState<DashboardModel | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    if (
      recommendations.length === 0 ||
      expenses.length === 0 ||
      expenseCategories.length === 0
    ) {
      loadData();
    }
  }, [recommendations.length, expenses.length, expenseCategories.length, loadData]);

  useEffect(() => {
    (async () => {
      try {
        const m = await buildDashboardModelFromRepositories({ forecastMonths: 24 });
        setPlanModel(m);
      } catch {
        // Planning data unavailable – section will be hidden
      } finally {
        setPlanLoading(false);
      }
    })();
  }, []);

  const budgetHealthRecs: PlanningRecommendation[] = useMemo(() => {
    if (!planModel?.projection) return [];
    const domainGoals: Goal[] = planModel.domainGoals ?? [];
    const heroFree = planModel.projection.timeline[0]?.buckets.free ?? 0;
    return selectDashboardRecommendations(planModel.projection, domainGoals, heroFree) || [];
  }, [planModel]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateRecommendations();
    setIsGenerating(false);
  };

  const filteredRecommendations = impactFilter === 'all' 
    ? recommendations 
    : recommendations.filter((rec) => rec.impact === impactFilter);

  const totalSavings = filteredRecommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-danger-100 text-danger-800 border-danger-200';
      case 'medium':
        return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'Hoch';
      case 'medium':
        return 'Mittel';
      case 'low':
        return 'Niedrig';
      default:
        return impact;
    }
  };

  const getTypeLabel = (type: Recommendation['type']) => {
    switch (type as string) {
      case 'eliminate-expense':
        return '🚫 Eliminieren';
      case 'reduce-expense':
        return '📉 Reduzieren';
      case 'switch-category':
        return '🔄 Wechseln';
      case 'general':
        return '💡 Allgemein';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empfehlungen</h1>
          <p className="text-gray-600 mt-1">
            Budget-Gesundheit und intelligente Spar-Tipps
          </p>
        </div>
        <Button 
          onClick={handleGenerate} 
          isLoading={isGenerating}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generiere...' : '🔄 Neu berechnen'}
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════
         SECTION 1: Budget-Gesundheit (Source: Planning/Forecast)
         Single Source of Truth for cashflow health
         ══════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-lg">🏦</span> Budget-Gesundheit
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Basierend auf deiner vollständigen Cashflow-Prognose (Einkommen, Fixkosten, Ziele, Anlagen)
        </p>

        {planLoading ? (
          <Card>
            <div className="text-center py-8 text-gray-500">Berechne Prognose...</div>
          </Card>
        ) : budgetHealthRecs.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-semibold text-success-600 mb-1">Budget ist gesund</h3>
              <p className="text-sm text-gray-600">
                Keine Fehlbeträge oder Engpässe in deiner Cashflow-Prognose erkannt.
              </p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/planning')}>
                Zur Finanzplanung →
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {budgetHealthRecs.map((rec) => {
              let explanation: string | null = null;
              if (rec.type === 'shortfall_risk' && rec.evidence?.month && typeof rec.evidence.amountCents === 'number') {
                explanation = `Im Monat ${rec.evidence.month} entsteht ein Fehlbetrag von ${formatCentsEUR(rec.evidence.amountCents)}.`;
              } else if (rec.type === 'low_slack') {
                explanation = `Dein freier Spielraum beträgt aktuell nur ${formatCentsEUR(rec.evidence?.amountCents ?? 0)}.`;
              } else if (rec.type === 'goal_contrib_issue') {
                explanation = `Für dieses Ziel ist ein Beitrag geplant, der nicht gedeckt ist.`;
              }

              return (
                <Card key={rec.id}>
                  <div
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
                          <span className="text-xs text-gray-400">Quelle: Finanzplanung</span>
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
                        <Button size="sm" variant="ghost" onClick={() => navigate('/planning')}>
                          Details →
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
         SECTION 2: Ausgaben-Optimierung (Source: RecommendationService)
         Pattern-based expense analysis
         ══════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-lg">📊</span> Ausgaben-Optimierung
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Analysiert deine Ausgabenmuster der letzten 3 Monate nach Kategorien und Wichtigkeit
        </p>

        {/* Summary Card */}
        {filteredRecommendations.length > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Gesamtes Einsparpotenzial</div>
                <div className="text-3xl font-bold text-success-600 mt-1">
                  {formatCentsEUR(totalSavings)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {filteredRecommendations.length} Empfehlung{filteredRecommendations.length !== 1 ? 'en' : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-2">Nach Impact filtern</div>
                <div className="flex gap-2" role="group" aria-label="Impact Filter">
                  <button
                    onClick={() => setImpactFilter('all')}
                    type="button"
                    aria-pressed={impactFilter === 'all'}
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      impactFilter === 'all'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    onClick={() => setImpactFilter('high')}
                    type="button"
                    aria-pressed={impactFilter === 'high'}
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      impactFilter === 'high'
                        ? 'bg-danger-600 text-white border-danger-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-danger-300'
                    }`}
                  >
                    Hoch
                  </button>
                  <button
                    onClick={() => setImpactFilter('medium')}
                    type="button"
                    aria-pressed={impactFilter === 'medium'}
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      impactFilter === 'medium'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                    }`}
                  >
                    Mittel
                  </button>
                  <button
                    onClick={() => setImpactFilter('low')}
                    type="button"
                    aria-pressed={impactFilter === 'low'}
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      impactFilter === 'low'
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Niedrig
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Recommendations List */}
        {filteredRecommendations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {recommendations.length === 0 
                  ? 'Noch keine Empfehlungen' 
                  : 'Keine Empfehlungen für diesen Filter'}
              </h3>
              <p className="text-gray-600">
                {recommendations.length === 0
                  ? 'Klicke auf "Neu berechnen", um personalisierte Spar-Tipps zu erhalten.'
                  : 'Versuche einen anderen Filter oder generiere neue Empfehlungen.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((rec) => (
              <Card key={rec.id}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {getTypeLabel(rec.type)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getImpactColor(rec.impact)}`}>
                          {getImpactLabel(rec.impact)} Impact
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{rec.title}</h3>
                      <p className="text-gray-700">{rec.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm text-gray-600">Einsparpotenzial</div>
                      <div className="text-2xl font-bold text-success-600">
                        {formatCentsEUR(rec.potentialSavings)}
                      </div>
                    </div>
                  </div>

                  {/* Explanation (Expandable) */}
                  <div>
                    <button
                      onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      {expandedId === rec.id ? '▼' : '▶'} Wie wurde das berechnet?
                    </button>
                    {expandedId === rec.id && (
                      <div className="mt-3 p-4 bg-primary-50 rounded-lg border border-primary-100">
                        <p className="text-sm text-gray-700 leading-relaxed">{rec.explanation}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Erstellt: {new Date(rec.createdAt).toLocaleDateString('de-DE')}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecommendation(rec.id)}
                    >
                      Erledigt / Ignorieren
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
