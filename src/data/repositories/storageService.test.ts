import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from './storageService';

const TEST_KEY = 'test:secure';
const TEST_DATA = { foo: 'bar', num: 42, nested: { a: 1 } };

describe('LocalStorageService Encryption', () => {
  beforeEach(async () => {
    await storageService.remove(TEST_KEY);
  });

  it('verschlüsselt und entschlüsselt Daten korrekt', async () => {
    await storageService.set(TEST_KEY, TEST_DATA);
    const result = await storageService.get<typeof TEST_DATA>(TEST_KEY);
    expect(result).toEqual(TEST_DATA);
  });

  it('gibt null zurück, wenn Key nicht existiert', async () => {
    const result = await storageService.get(TEST_KEY + ':notfound');
    expect(result).toBeNull();
  });

  it('Daten sind im localStorage nicht im Klartext', async () => {
    await storageService.set(TEST_KEY, TEST_DATA);
    const raw = localStorage.getItem(TEST_KEY);
    expect(raw).not.toContain('foo');
    expect(raw).not.toContain('bar');
    expect(raw).not.toContain('42');
  });
});
