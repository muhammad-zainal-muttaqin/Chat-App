import { describe, expect, test } from 'bun:test';
import { encodeBase64 } from 'tweetnacl-util';
import {
  decryptMessage,
  derivePublicKeyFromPrivateKey,
  encryptMessage,
  generateKeyPair,
  isKeyPairConsistent,
  loadKeyPair,
} from '../src/lib/crypto';

const PRIVATE_KEY_STORAGE_KEY = 'privacy_chat_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'privacy_chat_public_key';

function withMockStorage(run: (storage: Storage) => void) {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };

  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });

  try {
    run(mockStorage);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  }
}

function withMutedConsoleErrors(run: () => void) {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    run();
  } finally {
    console.error = originalConsoleError;
  }
}

describe('E2EE smoke tests', () => {
  test('encrypt/decrypt roundtrip works between two users', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const encrypted = encryptMessage('hello bob', bob.publicKey, alice.privateKey);
    const decrypted = decryptMessage(
      encrypted.ciphertext,
      encrypted.nonce,
      alice.publicKey,
      bob.privateKey
    );

    expect(decrypted).toBe('hello bob');
  });

  test('decrypt fails when sender public key is wrong', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const charlie = generateKeyPair();

    const encrypted = encryptMessage('private message', bob.publicKey, alice.privateKey);

    withMutedConsoleErrors(() => {
      expect(() =>
        decryptMessage(encrypted.ciphertext, encrypted.nonce, charlie.publicKey, bob.privateKey)
      ).toThrow('Failed to decrypt message');
    });
  });

  test('encrypt rejects invalid recipient key and invalid nonce', () => {
    const alice = generateKeyPair();
    const invalidPublicKey = encodeBase64(new Uint8Array(10));
    const invalidNonce = encodeBase64(new Uint8Array([1, 2, 3]));

    expect(() => encryptMessage('x', invalidPublicKey, alice.privateKey)).toThrow(
      'Public key has invalid length'
    );
    expect(() => encryptMessage('x', alice.publicKey, alice.privateKey, invalidNonce)).toThrow(
      'Nonce has invalid length'
    );
  });

  test('decrypt rejects too-short ciphertext payload', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const shortCiphertext = encodeBase64(new Uint8Array(5));

    withMutedConsoleErrors(() => {
      expect(() =>
        decryptMessage(shortCiphertext, encodeBase64(new Uint8Array(24)), alice.publicKey, bob.privateKey)
      ).toThrow('Failed to decrypt message');
    });
  });

  test('keypair consistency checks detect tampering', () => {
    const keyPair = generateKeyPair();
    const derivedPublicKey = derivePublicKeyFromPrivateKey(keyPair.privateKey);
    expect(derivedPublicKey).toBe(keyPair.publicKey);
    expect(isKeyPairConsistent(keyPair.publicKey, keyPair.privateKey)).toBe(true);

    const tamperedPrivateKey = new Uint8Array(keyPair.privateKey);
    tamperedPrivateKey[0] = tamperedPrivateKey[0] ^ 0xff;
    expect(isKeyPairConsistent(keyPair.publicKey, tamperedPrivateKey)).toBe(false);
  });

  test('loadKeyPair clears corrupted local keypair data', () => {
    withMockStorage((storage) => {
      const keyPairA = generateKeyPair();
      const keyPairB = generateKeyPair();

      storage.setItem(PRIVATE_KEY_STORAGE_KEY, encodeBase64(keyPairA.privateKey));
      storage.setItem(PUBLIC_KEY_STORAGE_KEY, keyPairB.publicKey);

      let loaded = null;
      withMutedConsoleErrors(() => {
        loaded = loadKeyPair();
      });
      expect(loaded).toBeNull();
      expect(storage.getItem(PRIVATE_KEY_STORAGE_KEY)).toBeNull();
      expect(storage.getItem(PUBLIC_KEY_STORAGE_KEY)).toBeNull();
    });
  });
});
