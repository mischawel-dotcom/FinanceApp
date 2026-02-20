import { useAppStore } from '@/app/store/useAppStore';
import { Button, Card } from '@shared/components';
import { formatCentsEUR } from '@/ui/formatMoney';
import { useState, useEffect } from 'react';

import type { Recommendation } from '@shared/types';

type ImpactFilter = 'all' | 'high' | 'medium' | 'low';

export default function RecommendationsPage() {
  const { recommendations, generateRecommendations, deleteRecommendation, expenses, expenseCategories, loadData } = useAppStore();
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (
      recommendations.length === 0 ||
      expenses.length === 0 ||
      expenseCategories.length === 0
    ) {
      loadData();
    }
  }, [recommendations.length, expenses.length, expenseCategories.length, loadData]);

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
            Intelligente Spar-Tipps basierend auf deinen Ausgaben
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
                ? 'Füge zunächst einige Ausgaben hinzu, um personalisierte Spar-Tipps zu erhalten.'
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
  );
}
