import { useState, useEffect, useCallback } from 'preact/hooks';
import {
  KeyPair,
  loadKeyPair,
  storeKeyPair,
  generateKeyPair,
  clearKeyPair,
  encryptMessage,
  decryptMessage,
  EncryptedMessage,
} from '../lib/crypto';

export function useEncryption() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);

  // Load key pair on mount
  useEffect(() => {
    const stored = loadKeyPair();
    if (stored) {
      setKeyPair(stored);
    }
  }, []);

  // Generate and store new key pair
  const generateKeys = useCallback(() => {
    const newKeyPair = generateKeyPair();
    storeKeyPair(newKeyPair);
    setKeyPair(newKeyPair);
    return newKeyPair;
  }, []);

  // Clear keys on logout
  const clearKeys = useCallback(() => {
    clearKeyPair();
    setKeyPair(null);
  }, []);

  // Encrypt a message for recipient
  const encrypt = useCallback(
    (plaintext: string, recipientPublicKey: string, specificNonce?: string): EncryptedMessage | null => {
      if (!keyPair) return null;
      return encryptMessage(plaintext, recipientPublicKey, keyPair.privateKey, specificNonce);
    },
    [keyPair]
  );

  // Decrypt a message from sender
  const decrypt = useCallback(
    (ciphertext: string, nonce: string, senderPublicKey: string): string | null => {
      if (!keyPair) return null;
      try {
        return decryptMessage(ciphertext, nonce, senderPublicKey, keyPair.privateKey);
      } catch {
        return null;
      }
    },
    [keyPair]
  );

  return {
    keyPair,
    publicKey: keyPair?.publicKey ?? null,
    hasKeys: keyPair !== null,
    generateKeys,
    clearKeys,
    encrypt,
    decrypt,
  };
}
