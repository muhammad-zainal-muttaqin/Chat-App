import { describe, expect, test, beforeEach } from 'bun:test';
import { encodeBase64 } from 'tweetnacl-util';
// Polyfill IndexedDB for Bun test environment
import 'fake-indexeddb/auto';

import {
  decryptMessage,
  derivePublicKeyFromPrivateKey,
  encryptMessage,
  encryptPaddedMessage,
  decryptPaddedMessage,
  decryptMessageAuto,
  generateKeyPair,
  isKeyPairConsistent,
  storeKeyPair,
  loadKeyPair,
  clearKeyPair,
  computeSafetyNumber,
  KeyPair,
} from '../src/lib/crypto';

function withMutedConsoleErrors(run: () => void) {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    run();
  } finally {
    console.error = originalConsoleError;
  }
}

// Clean IndexedDB before each test that uses it
async function cleanKeyDB() {
  await clearKeyPair();
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

  test('loadKeyPair returns null when no keys stored', async () => {
    await cleanKeyDB();
    const loaded = await loadKeyPair();
    expect(loaded).toBeNull();
  });

  test('storeKeyPair/loadKeyPair roundtrip works with encrypted IndexedDB', async () => {
    await cleanKeyDB();
    const keyPair = generateKeyPair();
    await storeKeyPair(keyPair);

    const loaded = await loadKeyPair();
    expect(loaded).not.toBeNull();
    expect(loaded!.publicKey).toBe(keyPair.publicKey);
    expect(loaded!.privateKey).toEqual(keyPair.privateKey);
    expect(isKeyPairConsistent(loaded!.publicKey, loaded!.privateKey)).toBe(true);

    await cleanKeyDB();
  });

  test('storeKeyPair rejects inconsistent key pair', async () => {
    const keyPairA = generateKeyPair();
    const keyPairB = generateKeyPair();

    const inconsistent: KeyPair = {
      publicKey: keyPairA.publicKey,
      privateKey: keyPairB.privateKey,
    };

    await expect(storeKeyPair(inconsistent)).rejects.toThrow('inconsistent');
  });

  test('clearKeyPair removes stored keys', async () => {
    await cleanKeyDB();
    const keyPair = generateKeyPair();
    await storeKeyPair(keyPair);

    let loaded = await loadKeyPair();
    expect(loaded).not.toBeNull();

    await clearKeyPair();
    loaded = await loadKeyPair();
    expect(loaded).toBeNull();
  });
});

describe('Message padding tests', () => {
  test('padded encrypt/decrypt roundtrip works', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const encrypted = encryptPaddedMessage('hello bob', bob.publicKey, alice.privateKey);
    const decrypted = decryptPaddedMessage(
      encrypted.ciphertext,
      encrypted.nonce,
      alice.publicKey,
      bob.privateKey
    );

    expect(decrypted).toBe('hello bob');
  });

  test('padded ciphertext is larger than unpadded', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const shortMsg = 'hi';
    const unpadded = encryptMessage(shortMsg, bob.publicKey, alice.privateKey);
    const padded = encryptPaddedMessage(shortMsg, bob.publicKey, alice.privateKey);

    // Padded ciphertext should be larger due to padding to 256 bytes
    const unpaddedBytes = atob(unpadded.ciphertext).length;
    const paddedBytes = atob(padded.ciphertext).length;
    expect(paddedBytes).toBeGreaterThan(unpaddedBytes);
  });

  test('decryptMessageAuto handles both padded and unpadded messages', () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    // Create a padded message
    const padded = encryptPaddedMessage('padded message', bob.publicKey, alice.privateKey);
    const decryptedPadded = decryptMessageAuto(
      padded.ciphertext,
      padded.nonce,
      alice.publicKey,
      bob.privateKey
    );
    expect(decryptedPadded).toBe('padded message');

    // Create an unpadded (legacy) message
    const unpadded = encryptMessage('legacy message', bob.publicKey, alice.privateKey);
    let decryptedUnpadded: string = '';
    withMutedConsoleErrors(() => {
      decryptedUnpadded = decryptMessageAuto(
        unpadded.ciphertext,
        unpadded.nonce,
        alice.publicKey,
        bob.privateKey
      );
    });
    expect(decryptedUnpadded).toBe('legacy message');
  });

  test('padded encrypt rejects empty message', () => {
    const alice = generateKeyPair();
    expect(() => encryptPaddedMessage('', alice.publicKey, alice.privateKey)).toThrow(
      'Cannot encrypt empty message'
    );
  });
});

describe('Safety number tests', () => {
  test('safety number is deterministic', async () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const num1 = await computeSafetyNumber(alice.publicKey, bob.publicKey);
    const num2 = await computeSafetyNumber(alice.publicKey, bob.publicKey);

    expect(num1).toBe(num2);
  });

  test('safety number is symmetric (order does not matter)', async () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const numAB = await computeSafetyNumber(alice.publicKey, bob.publicKey);
    const numBA = await computeSafetyNumber(bob.publicKey, alice.publicKey);

    expect(numAB).toBe(numBA);
  });

  test('safety number format is 6 groups of 5 digits', async () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();

    const num = await computeSafetyNumber(alice.publicKey, bob.publicKey);

    // Should match pattern: "XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX"
    expect(num).toMatch(/^\d{5}( \d{5}){5}$/);
  });

  test('different key pairs produce different safety numbers', async () => {
    const alice = generateKeyPair();
    const bob = generateKeyPair();
    const charlie = generateKeyPair();

    const numAB = await computeSafetyNumber(alice.publicKey, bob.publicKey);
    const numAC = await computeSafetyNumber(alice.publicKey, charlie.publicKey);

    expect(numAB).not.toBe(numAC);
  });
});
