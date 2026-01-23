import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

// Key pair interface
export interface KeyPair {
  publicKey: string; // Base64
  privateKey: Uint8Array; // Keep as bytes, never serialize
}

// Initialize crypto (no-op for tweetnacl, but kept for API compatibility)
export async function initCrypto(): Promise<void> {
  // tweetnacl is synchronous, no initialization needed
  return Promise.resolve();
}

// Generate new X25519 key pair
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: keyPair.secretKey,
  };
}

// Convert base64 public key to Uint8Array
export function publicKeyFromBase64(base64: string): Uint8Array {
  return decodeBase64(base64);
}

// Encrypted message interface
export interface EncryptedMessage {
  ciphertext: string; // Base64
  nonce: string; // Base64
}

// Encrypt a message
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderPrivateKey: Uint8Array,
  providedNonce?: string // Base64
): EncryptedMessage {
  // Use provided nonce or generate random nonce
  const nonce = providedNonce
    ? decodeBase64(providedNonce)
    : nacl.randomBytes(nacl.box.nonceLength);

  // Convert plaintext to bytes
  const message = decodeUTF8(plaintext);

  // Convert recipient public key from base64
  const recipientPubKeyBytes = decodeBase64(recipientPublicKey);

  // Encrypt
  const ciphertext = nacl.box(
    message,
    nonce,
    recipientPubKeyBytes,
    senderPrivateKey
  );

  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
  };
}

// Decrypt a message
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: Uint8Array
): string {
  try {
    // Convert from base64
    const ciphertextBytes = decodeBase64(ciphertext);
    const nonceBytes = decodeBase64(nonce);
    const senderPubKeyBytes = decodeBase64(senderPublicKey);

    // Decrypt
    const decrypted = nacl.box.open(
      ciphertextBytes,
      nonceBytes,
      senderPubKeyBytes,
      recipientPrivateKey
    );

    if (!decrypted) {
      throw new Error('Decryption failed - invalid ciphertext or wrong keys');
    }

    return encodeUTF8(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

// Storage keys - use localStorage instead of sessionStorage for persistence
const PRIVATE_KEY_STORAGE_KEY = 'privacy_chat_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'privacy_chat_public_key';

// Store keys securely (using IndexedDB would be better in production)
export function storeKeyPair(keyPair: KeyPair): void {
  // Store private key as base64 (in production, use encrypted IndexedDB)
  const privateKeyBase64 = encodeBase64(keyPair.privateKey);
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKeyBase64);
  localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);
}

// Load stored key pair
export function loadKeyPair(): KeyPair | null {
  const privateKeyBase64 = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  const publicKey = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);

  if (!privateKeyBase64 || !publicKey) return null;

  return {
    publicKey,
    privateKey: decodeBase64(privateKeyBase64),
  };
}

// Clear stored keys (on logout)
export function clearKeyPair(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
  localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
}

// Get or generate key pair
export function getOrCreateKeyPair(): KeyPair {
  const existing = loadKeyPair();
  if (existing) return existing;

  const newKeyPair = generateKeyPair();
  storeKeyPair(newKeyPair);
  return newKeyPair;
}
