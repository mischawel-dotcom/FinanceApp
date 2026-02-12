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
    const plaintext = JSON.stringify(TEST_DATA);
    // a) raw ist definiert und ein string
    expect(typeof raw).toBe('string');
    expect(raw).toBeDefined();
    // b) raw ist NICHT gleich dem Klartext JSON
    expect(raw).not.toBe(plaintext);
    // c) raw enthält den typischen Salted-Prefix (falls CryptoJS/OpenSSL salted)
    expect(raw?.startsWith('U2FsdGVkX1')).toBe(true);
    // d) raw.length > Klartext-Länge
    expect(raw!.length).toBeGreaterThan(plaintext.length);
  });
});
