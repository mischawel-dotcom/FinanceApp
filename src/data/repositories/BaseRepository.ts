
/**
 * BaseRepositoryImpl<T>
 * Generische Implementierung eines Repositories für lokale Persistenz (z.B. localStorage).
 * Erlaubt CRUD-Operationen für beliebige Entitätstypen mit id, createdAt, updatedAt.
 *
 * @template T - Entitätstyp mit id, createdAt, updatedAt
 * @example
 *   const repo = new BaseRepositoryImpl<User>('users');
 *   await repo.create({ name: 'Max' });
 */

import type { BaseRepository, StorageService } from './interfaces';
import { storageService } from './storageService';


export abstract class BaseRepositoryImpl<T extends { id: string; createdAt: Date; updatedAt: Date }>
  implements BaseRepository<T>
{
  protected storage: StorageService;
  protected storageKey: string;

  /**
   * Erstellt ein neues Repository.
   * @param storageKey Schlüssel für die Persistenz (z.B. localStorage-Key)
   * @param storage (Optional) StorageService-Implementierung (z.B. für Tests)
   */
  constructor(storageKey: string, storage: StorageService = storageService) {
    this.storageKey = storageKey;
    this.storage = storage;
  }

  /**
   * Gibt alle gespeicherten Entitäten zurück.
   * @returns Promise mit Array aller Entitäten
   */
  async getAll(): Promise<T[]> {
    const items = await this.storage.get<T[]>(this.storageKey);
    return items || [];
  }

  /**
   * Sucht eine Entität anhand der ID.
   * @param id Die ID der Entität
   * @returns Promise mit Entität oder null
   */
  async getById(id: string): Promise<T | null> {
    const items = await this.getAll();
    return items.find((item) => item.id === id) || null;
  }

  /**
   * Legt eine neue Entität an.
   * @param data Die Entität ohne id, createdAt, updatedAt
   * @returns Promise mit der neu angelegten Entität
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const items = await this.getAll();
    const newItem = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as T;

    items.push(newItem);
    await this.storage.set(this.storageKey, items);
    return newItem;
  }

  /**
   * Aktualisiert eine Entität.
   * @param id Die ID der Entität
   * @param data Die zu aktualisierenden Felder
   * @returns Promise mit der aktualisierten Entität
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const items = await this.getAll();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`Item with id ${id} not found in ${this.storageKey}`);
    }

    const updatedItem = {
      ...items[index],
      ...data,
      id, // ID nicht überschreiben
      updatedAt: new Date(),
    };

    items[index] = updatedItem;
    await this.storage.set(this.storageKey, items);
    return updatedItem;
  }

  /**
   * Löscht eine Entität anhand der ID.
   * @param id Die ID der zu löschenden Entität
   */
  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter((item) => item.id !== id);
    await this.storage.set(this.storageKey, filtered);
  }

  /**
   * Löscht alle Entitäten.
   */
  async clear(): Promise<void> {
    await this.storage.set(this.storageKey, []);
  }

  /**
   * Generiert eine eindeutige ID für neue Entitäten.
   * @returns String-ID
   */
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
