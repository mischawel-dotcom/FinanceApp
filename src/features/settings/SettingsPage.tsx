import { useState, useRef } from 'react';
import { Card } from '@shared/components';
import { Button, Input } from '@shared/components';
import { downloadBackup, importBackup, getLastBackupDate, daysSinceLastBackup } from '@/shared/services/backupService';
import { useMinBuffer } from '@/shared/hooks/useMinBuffer';
import { useCurrency, getCurrencySymbol } from '@/shared/hooks/useCurrency';
import { useTheme } from '@/shared/hooks/useTheme';

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { minBufferEuro, setMinBufferEuro } = useMinBuffer();
  const [bufferInput, setBufferInput] = useState(String(minBufferEuro));
  const { currency, setCurrency } = useCurrency();
  const { theme, toggleTheme } = useTheme();

  const lastBackup = getLastBackupDate();
  const daysSince = daysSinceLastBackup();

  const handleExport = () => {
    setIsExporting(true);
    try {
      downloadBackup();
      setImportStatus({ type: 'success', message: 'Backup erfolgreich heruntergeladen.' });
    } catch {
      setImportStatus({ type: 'error', message: 'Fehler beim Erstellen des Backups.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importBackup(file);
      setImportStatus({
        type: 'success',
        message: `Backup erfolgreich wiederhergestellt (${result.keysRestored} Datensätze). Die Seite wird neu geladen…`,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: `Import fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBufferSave = () => {
    const val = parseFloat(bufferInput.replace(',', '.'));
    if (Number.isFinite(val) && val >= 0) {
      setMinBufferEuro(val);
      setImportStatus({ type: 'success', message: `Mindest-Puffer auf ${val.toFixed(0)} ${getCurrencySymbol()} gesetzt.` });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Einstellungen</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Persönliche Einstellungen und Datensicherung.
        </p>
      </div>

      {/* --- Darstellung --- */}
      <Card title="Darstellung">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Erscheinungsbild</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Wechsle zwischen hellem und dunklem Design.</div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={theme === 'dark' ? 'Zum Light Mode wechseln' : 'Zum Dark Mode wechseln'}
            >
              <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
              }`}>
                <span className="flex items-center justify-center h-full text-xs">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </span>
              </span>
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Währung</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">Alle Beträge werden in der gewählten Währung angezeigt.</div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrency('EUR')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currency === 'EUR'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                € EUR
              </button>
              <button
                onClick={() => setCurrency('CHF')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currency === 'CHF'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                CHF
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* --- Planung --- */}
      <Card title="Planung">
        <div>
          <label htmlFor="min-buffer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mindest-Puffer pro Monat ({getCurrencySymbol()})
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Wenn dein freier monatlicher Spielraum unter diesen Betrag fällt, wirst du gewarnt.
          </p>
          <div className="flex gap-2 items-center">
            <Input
              id="min-buffer"
              type="number"
              min="0"
              step="50"
              value={bufferInput}
              onChange={(e) => setBufferInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBufferSave()}
              className="max-w-[140px]"
            />
            <Button size="sm" onClick={handleBufferSave}>
              Speichern
            </Button>
          </div>
        </div>
      </Card>

      {/* --- Datensicherung --- */}
      <Card title="Datensicherung">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            daysSince === null ? 'bg-gray-400' : daysSince <= 7 ? 'bg-green-500' : daysSince <= 30 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {lastBackup
                ? `Letzte Sicherung: ${new Date(lastBackup).toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}`
                : 'Noch keine Sicherung erstellt'}
            </div>
            {daysSince !== null && daysSince > 7 && (
              <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                {daysSince} Tage seit der letzten Sicherung – ein neues Backup wird empfohlen.
              </div>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Sichert alle deine Daten als Datei in deinem <strong className="text-gray-700 dark:text-gray-300">Downloads-Ordner</strong>.
              Auf dem Handy findest du sie in der Dateien-App.
            </p>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Wird erstellt…' : 'Sicherung erstellen'}
            </Button>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Stelle deine Daten aus einer zuvor erstellten Sicherungsdatei wieder her.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="backup-file-input"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Sicherung laden
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Message */}
      {importStatus && (
        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            importStatus.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {importStatus.message}
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>Deine Daten werden lokal auf diesem Gerät gespeichert. Erstelle regelmäßig Sicherungen, damit du sie bei Bedarf wiederherstellen kannst – auch auf einem anderen Gerät.</p>
      </div>
    </div>
  );
}
