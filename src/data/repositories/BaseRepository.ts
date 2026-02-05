/**
 * BASE REPOSITORY IMPLEMENTATION
 * Generische localStorage-Implementierung für alle Repositories
 */

import type { BaseRepository, StorageService } from './interfaces';
import { storageService } from './storageService';

export abstract class BaseRepositoryImpl<T extends { id: string; createdAt: Date; updatedAt: Date }>
  implements BaseRepository<T>
{
  protected storage: StorageService;
  protected storageKey: string;

  constructor(storageKey: string, storage: StorageService = storageService) {
    this.storageKey = storageKey;
    this.storage = storage;
  }

  async getAll(): Promise<T[]> {
    const items = await this.storage.get<T[]>(this.storageKey);
    return items || [];
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.getAll();
    return items.find((item) => item.id === id) || null;
  }

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

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter((item) => item.id !== id);
    await this.storage.set(this.storageKey, filtered);
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
