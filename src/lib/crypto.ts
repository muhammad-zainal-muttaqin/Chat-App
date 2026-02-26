import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

// Key pair interface
export interface KeyPair {
  publicKey: string; // Base64
  privateKey: Uint8Array; // Keep as bytes, never serialize
}

const PUBLIC_KEY_LENGTH = nacl.box.publicKeyLength;
const PRIVATE_KEY_LENGTH = nacl.box.secretKeyLength;
const NONCE_LENGTH = nacl.box.nonceLength;
const MIN_CIPHERTEXT_LENGTH = nacl.box.overheadLength;

function decodeBase64Strict(value: string, fieldName: string): Uint8Array {
  try {
    return decodeBase64(value);
  } catch {
    throw new Error(`${fieldName} is not valid base64`);
  }
}

function assertByteLength(bytes: Uint8Array, expected: number, fieldName: string): void {
  if (bytes.length !== expected) {
    throw new Error(`${fieldName} has invalid length`);
  }
}

export function derivePublicKeyFromPrivateKey(privateKey: Uint8Array): string {
  assertByteLength(privateKey, PRIVATE_KEY_LENGTH, 'Private key');
  const derived = nacl.box.keyPair.fromSecretKey(privateKey);
  return encodeBase64(derived.publicKey);
}

export function isKeyPairConsistent(publicKey: string, privateKey: Uint8Array): boolean {
  try {
    return derivePublicKeyFromPrivateKey(privateKey) === publicKey;
  } catch {
    return false;
  }
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
  const publicKey = decodeBase64Strict(base64, 'Public key');
  assertByteLength(publicKey, PUBLIC_KEY_LENGTH, 'Public key');
  return publicKey;
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
  if (!plaintext) {
    throw new Error('Cannot encrypt empty message');
  }

  assertByteLength(senderPrivateKey, PRIVATE_KEY_LENGTH, 'Sender private key');

  const recipientPubKeyBytes = publicKeyFromBase64(recipientPublicKey);

  // Use provided nonce or generate random nonce
  const nonce = providedNonce
    ? decodeBase64Strict(providedNonce, 'Nonce')
    : nacl.randomBytes(NONCE_LENGTH);
  assertByteLength(nonce, NONCE_LENGTH, 'Nonce');

  // Convert plaintext to bytes
  const message = decodeUTF8(plaintext);

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
    assertByteLength(recipientPrivateKey, PRIVATE_KEY_LENGTH, 'Recipient private key');

    // Convert from base64
    const ciphertextBytes = decodeBase64Strict(ciphertext, 'Ciphertext');
    const nonceBytes = decodeBase64Strict(nonce, 'Nonce');
    const senderPubKeyBytes = publicKeyFromBase64(senderPublicKey);

    assertByteLength(nonceBytes, NONCE_LENGTH, 'Nonce');

    if (ciphertextBytes.length < MIN_CIPHERTEXT_LENGTH) {
      throw new Error('Ciphertext is too short');
    }

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

function canUseStorage(storage: Storage | undefined): storage is Storage {
  if (!storage) return false;
  try {
    const probeKey = '__privacy_chat_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function getSessionStorageSafe(): Storage | undefined {
  const maybeSessionStorage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  return canUseStorage(maybeSessionStorage) ? maybeSessionStorage : undefined;
}

function getLocalStorageSafe(): Storage | undefined {
  const maybeLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  return canUseStorage(maybeLocalStorage) ? maybeLocalStorage : undefined;
}

function getPreferredKeyStorage(): Storage | null {
  return getSessionStorageSafe() ?? getLocalStorageSafe() ?? null;
}

// Store keys securely (using IndexedDB would be better in production)
export function storeKeyPair(keyPair: KeyPair): void {
  assertByteLength(keyPair.privateKey, PRIVATE_KEY_LENGTH, 'Private key');
  if (!isKeyPairConsistent(keyPair.publicKey, keyPair.privateKey)) {
    throw new Error('Refusing to store inconsistent key pair');
  }

  const storage = getPreferredKeyStorage();
  if (!storage) {
    throw new Error('No browser storage available for key persistence');
  }

  // Store private key as base64 (in production, use encrypted IndexedDB)
  const privateKeyBase64 = encodeBase64(keyPair.privateKey);
  storage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKeyBase64);
  storage.setItem(PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);

  // If we are using sessionStorage, clear old localStorage copies.
  const localStorageSafe = getLocalStorageSafe();
  if (localStorageSafe && storage !== localStorageSafe) {
    localStorageSafe.removeItem(PRIVATE_KEY_STORAGE_KEY);
    localStorageSafe.removeItem(PUBLIC_KEY_STORAGE_KEY);
  }
}

// Load stored key pair
export function loadKeyPair(): KeyPair | null {
  const preferredStorage = getPreferredKeyStorage();
  const fallbackLocalStorage = getLocalStorageSafe();

  const privateKeyBase64 = preferredStorage?.getItem(PRIVATE_KEY_STORAGE_KEY) ?? null;
  const publicKey = preferredStorage?.getItem(PUBLIC_KEY_STORAGE_KEY) ?? null;

  let resolvedPrivateKey = privateKeyBase64;
  let resolvedPublicKey = publicKey;

  // Migration path: pull old keys from localStorage if preferred storage is sessionStorage.
  if ((!resolvedPrivateKey || !resolvedPublicKey) && fallbackLocalStorage) {
    resolvedPrivateKey = fallbackLocalStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    resolvedPublicKey = fallbackLocalStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
    if (resolvedPrivateKey && resolvedPublicKey && preferredStorage && preferredStorage !== fallbackLocalStorage) {
      preferredStorage.setItem(PRIVATE_KEY_STORAGE_KEY, resolvedPrivateKey);
      preferredStorage.setItem(PUBLIC_KEY_STORAGE_KEY, resolvedPublicKey);
      fallbackLocalStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
      fallbackLocalStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
    }
  }

  if (!resolvedPrivateKey || !resolvedPublicKey) return null;

  try {
    const privateKey = decodeBase64Strict(resolvedPrivateKey, 'Private key');
    const decodedPublicKey = publicKeyFromBase64(resolvedPublicKey);

    assertByteLength(privateKey, PRIVATE_KEY_LENGTH, 'Private key');
    assertByteLength(decodedPublicKey, PUBLIC_KEY_LENGTH, 'Public key');

    if (!isKeyPairConsistent(resolvedPublicKey, privateKey)) {
      throw new Error('Stored key pair is inconsistent');
    }

    return {
      publicKey: resolvedPublicKey,
      privateKey,
    };
  } catch (error) {
    console.error('Invalid local key pair detected. Clearing corrupted keys.', error);
    clearKeyPair();
    return null;
  }
}

// Clear stored keys (on logout)
export function clearKeyPair(): void {
  const sessionStorageSafe = getSessionStorageSafe();
  const localStorageSafe = getLocalStorageSafe();
  sessionStorageSafe?.removeItem(PRIVATE_KEY_STORAGE_KEY);
  sessionStorageSafe?.removeItem(PUBLIC_KEY_STORAGE_KEY);
  localStorageSafe?.removeItem(PRIVATE_KEY_STORAGE_KEY);
  localStorageSafe?.removeItem(PUBLIC_KEY_STORAGE_KEY);
}

// Device ID for session binding (prevents session hijacking)
const DEVICE_ID_STORAGE_KEY = 'privacy_chat_device_id';

// Generate a unique device ID
function generateDeviceId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Get or create device ID (persists across sessions on same device)
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

// Get current device ID (returns null if not set)
export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_STORAGE_KEY);
}

// Clear device ID (should rarely be used - only on full account reset)
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_STORAGE_KEY);
}

// Get or generate key pair
export function getOrCreateKeyPair(): KeyPair {
  const existing = loadKeyPair();
  if (existing) return existing;

  const newKeyPair = generateKeyPair();
  storeKeyPair(newKeyPair);
  return newKeyPair;
}

// Derive a key from password using PBKDF2
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!password) {
    throw new Error('Password is required');
  }
  if (salt.length !== 16) {
    throw new Error('Salt must be 16 bytes');
  }

  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt private key with password
export async function encryptPrivateKeyWithPassword(privateKey: Uint8Array, password: string): Promise<string> {
  assertByteLength(privateKey, PRIVATE_KEY_LENGTH, 'Private key');

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassword(password, salt);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    privateKey as unknown as BufferSource
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return encodeBase64(combined);
}

// Decrypt private key with password
export async function decryptPrivateKeyWithPassword(encryptedBase64: string, password: string): Promise<Uint8Array> {
  try {
    const combined = decodeBase64Strict(encryptedBase64, 'Encrypted private key');
    if (combined.length <= 28) {
      throw new Error('Encrypted private key payload is too short');
    }

    // Extract parts
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const key = await deriveKeyFromPassword(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    const decryptedKey = new Uint8Array(decrypted);
    assertByteLength(decryptedKey, PRIVATE_KEY_LENGTH, 'Decrypted private key');
    return decryptedKey;
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
    throw new Error('Password salah atau data korup');
  }
}
