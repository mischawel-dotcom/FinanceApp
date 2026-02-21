const APP_KEYS_PREFIX = 'finance-app';
const BACKUP_TIMESTAMP_KEY = 'finance-app-last-backup';

interface BackupData {
  version: 1;
  createdAt: string;
  entries: Record<string, string>;
}

export function exportBackup(): BackupData {
  const entries: Record<string, string> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(APP_KEYS_PREFIX)) {
      entries[key] = localStorage.getItem(key)!;
    }
  }

  const backup: BackupData = {
    version: 1,
    createdAt: new Date().toISOString(),
    entries,
  };

  localStorage.setItem(BACKUP_TIMESTAMP_KEY, backup.createdAt);
  return backup;
}

export function downloadBackup() {
  const backup = exportBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-app-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ keysRestored: number }> {
  const text = await file.text();
  const backup: BackupData = JSON.parse(text);

  if (!backup.version || !backup.entries || typeof backup.entries !== 'object') {
    throw new Error('Ungültiges Backup-Format');
  }

  const keys = Object.keys(backup.entries).filter((k) => k.startsWith(APP_KEYS_PREFIX));

  for (const key of keys) {
    localStorage.setItem(key, backup.entries[key]);
  }

  return { keysRestored: keys.length };
}

export function getLastBackupDate(): string | null {
  return localStorage.getItem(BACKUP_TIMESTAMP_KEY);
}

export function daysSinceLastBackup(): number | null {
  const last = getLastBackupDate();
  if (!last) return null;
  const diff = Date.now() - new Date(last).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
