/**
 * LOCAL STORAGE SERVICE
 * Konkrete Implementierung für localStorage
 */


import type { StorageService } from './interfaces';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

// TODO: Für MVP statischer Key, später aus .env oder User-Passwort ableiten
const ENCRYPTION_KEY = 'finance-app-demo-key-2026';

class LocalStorageService implements StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      // Entschlüsseln
      const bytes = AES.decrypt(encrypted, ENCRYPTION_KEY);
      const decrypted = bytes.toString(Utf8);
      if (!decrypted) return null;
      return JSON.parse(decrypted, this.dateReviver) as T;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      // Serialisieren und verschlüsseln
      const plain = JSON.stringify(value);
      const encrypted = AES.encrypt(plain, ENCRYPTION_KEY).toString();
      localStorage.setItem(key, encrypted);
    } catch (error: any) {
      if (error && error.name === 'QuotaExceededError') {
        console.error(`localStorage Quota überschritten (${key})`);
        throw new Error('localStorage Quota überschritten: Bitte löschen Sie alte Daten oder leeren Sie den Speicher.');
      }
      console.error(`Error writing to localStorage (${key}):`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Hilfsfunktion: Date-Strings beim Parsen wieder in Date-Objekte umwandeln
  private dateReviver(_key: string, value: unknown): unknown {
    if (typeof value === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (datePattern.test(value)) {
        return new Date(value);
      }
    }
    return value;
  }
}

export const storageService = new LocalStorageService();
