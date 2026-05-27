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

// --- IndexedDB-backed encrypted key storage ---
// Private keys are encrypted with a random AES-256-GCM key.
// The wrapping key is stored as a CryptoKey object in IndexedDB,
// which is origin-bound and not readable by JavaScript in other origins.
const IDB_DB_NAME = 'privachat_keys';
const IDB_STORE_NAME = 'keypair';
const IDB_VERSION = 1;

// Legacy localStorage keys (for migration cleanup)
const PRIVATE_KEY_STORAGE_KEY = 'privacy_chat_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'privacy_chat_public_key';

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(store: IDBObjectStore, key: IDBValidKey): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(store: IDBObjectStore, key: IDBValidKey, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbClear(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// One-time migration: remove old localStorage keys if they exist
function cleanupLegacyStorage(): void {
  try {
    const maybeLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
    if (maybeLocalStorage) {
      maybeLocalStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
      maybeLocalStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

// Store key pair in encrypted IndexedDB
export async function storeKeyPair(keyPair: KeyPair): Promise<void> {
  assertByteLength(keyPair.privateKey, PRIVATE_KEY_LENGTH, 'Private key');
  if (!isKeyPairConsistent(keyPair.publicKey, keyPair.privateKey)) {
    throw new Error('Refusing to store inconsistent key pair');
  }

  // Generate a random AES-256-GCM key for wrapping the private key
  const wrappingKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Encrypt the private key bytes
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedPrivateKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    keyPair.privateKey as unknown as BufferSource
  );

  const db = await openKeyDB();
  const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
  const store = tx.objectStore(IDB_STORE_NAME);
  await idbPut(store, 'publicKey', keyPair.publicKey);
  await idbPut(store, 'encryptedPrivateBytes', new Uint8Array(encryptedPrivateKey));
  await idbPut(store, 'wrappingKey', wrappingKey);
  await idbPut(store, 'iv', iv);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  // Clean up any legacy localStorage keys
  cleanupLegacyStorage();
}

// Load key pair from encrypted IndexedDB
export async function loadKeyPair(): Promise<KeyPair | null> {
  // Clean up legacy localStorage keys on first access
  cleanupLegacyStorage();

  try {
    const db = await openKeyDB();
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const store = tx.objectStore(IDB_STORE_NAME);

    const publicKey = (await idbGet(store, 'publicKey')) as string | null;
    const encryptedPrivateBytes = (await idbGet(store, 'encryptedPrivateBytes')) as Uint8Array | null;
    const wrappingKey = (await idbGet(store, 'wrappingKey')) as CryptoKey | null;
    const iv = (await idbGet(store, 'iv')) as Uint8Array | null;

    db.close();

    if (!publicKey || !encryptedPrivateBytes || !wrappingKey || !iv) {
      return null;
    }

    const privateKeyBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      wrappingKey,
      encryptedPrivateBytes as unknown as BufferSource
    );

    const privateKey = new Uint8Array(privateKeyBytes);
    assertByteLength(privateKey, PRIVATE_KEY_LENGTH, 'Private key');
    publicKeyFromBase64(publicKey); // validates length

    if (!isKeyPairConsistent(publicKey, privateKey)) {
      throw new Error('Stored key pair is inconsistent');
    }

    return { publicKey, privateKey };
  } catch (error) {
    console.error('Failed to load key pair from IndexedDB:', error);
    await clearKeyPair(); // Clear corrupted data
    return null;
  }
}

// Clear stored keys (on logout)
export async function clearKeyPair(): Promise<void> {
  // Also clean legacy localStorage
  cleanupLegacyStorage();

  try {
    const db = await openKeyDB();
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    await idbClear(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore errors on cleanup
  }
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
export async function getOrCreateKeyPair(): Promise<KeyPair> {
  const existing = await loadKeyPair();
  if (existing) return existing;

  const newKeyPair = generateKeyPair();
  await storeKeyPair(newKeyPair);
  return newKeyPair;
}

// --- Safety numbers for key verification ---
// Computes a deterministic safety number from two public keys.
// Users can compare these out-of-band to verify each other's identity.
export async function computeSafetyNumber(
  publicKeyA: string,
  publicKeyB: string
): Promise<string> {
  // Sort keys deterministically so both parties compute the same number
  const sorted = [publicKeyA, publicKeyB].sort();
  const keyA = decodeBase64Strict(sorted[0], 'Public key A');
  const keyB = decodeBase64Strict(sorted[1], 'Public key B');

  const combined = new Uint8Array(keyA.length + keyB.length);
  combined.set(keyA, 0);
  combined.set(keyB, keyA.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = new Uint8Array(hashBuffer);

  // Format as groups of 5 digits for easy verbal comparison
  const numericHash = Array.from(hashArray)
    .map(b => b.toString().padStart(3, '0'))
    .join('');
  return numericHash.slice(0, 30).replace(/(\d{5})/g, '$1 ').trim();
}

// --- Message padding (PKCS#7) to hide plaintext length from server ---
const PADDING_BLOCK_SIZES = [256, 512, 1024, 2048];
const MAX_MESSAGE_BYTES = 2048;

function padMessage(message: Uint8Array): Uint8Array {
  const len = message.length;
  const targetSize = PADDING_BLOCK_SIZES.find(s => len < s) ?? MAX_MESSAGE_BYTES;
  if (len > MAX_MESSAGE_BYTES) {
    throw new Error(`Message too long: max ${MAX_MESSAGE_BYTES} bytes`);
  }
  const padLength = targetSize - len;
  const padded = new Uint8Array(targetSize);
  padded.set(message);
  for (let i = len; i < targetSize; i++) {
    padded[i] = padLength;
  }
  return padded;
}

function unpadMessage(padded: Uint8Array): Uint8Array {
  if (padded.length === 0) throw new Error('Cannot unpad empty message');
  const padLength = padded[padded.length - 1];
  if (padLength === 0 || padLength > padded.length) throw new Error('Invalid padding');
  for (let i = padded.length - padLength; i < padded.length; i++) {
    if (padded[i] !== padLength) throw new Error('Invalid padding');
  }
  return padded.slice(0, padded.length - padLength);
}

// Encrypt with padding (hides message length)
export function encryptPaddedMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderPrivateKey: Uint8Array,
  providedNonce?: string
): EncryptedMessage {
  if (!plaintext) throw new Error('Cannot encrypt empty message');
  assertByteLength(senderPrivateKey, PRIVATE_KEY_LENGTH, 'Sender private key');

  const recipientPubKeyBytes = publicKeyFromBase64(recipientPublicKey);
  const nonce = providedNonce
    ? decodeBase64Strict(providedNonce, 'Nonce')
    : nacl.randomBytes(NONCE_LENGTH);
  assertByteLength(nonce, NONCE_LENGTH, 'Nonce');

  const messageBytes = decodeUTF8(plaintext);
  const paddedBytes = padMessage(messageBytes);

  const ciphertext = nacl.box(paddedBytes, nonce, recipientPubKeyBytes, senderPrivateKey);
  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
  };
}

// Decrypt with unpadding
export function decryptPaddedMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: Uint8Array
): string {
  try {
    assertByteLength(recipientPrivateKey, PRIVATE_KEY_LENGTH, 'Recipient private key');
    const ciphertextBytes = decodeBase64Strict(ciphertext, 'Ciphertext');
    const nonceBytes = decodeBase64Strict(nonce, 'Nonce');
    const senderPubKeyBytes = publicKeyFromBase64(senderPublicKey);
    assertByteLength(nonceBytes, NONCE_LENGTH, 'Nonce');
    if (ciphertextBytes.length < MIN_CIPHERTEXT_LENGTH) {
      throw new Error('Ciphertext is too short');
    }
    const decrypted = nacl.box.open(ciphertextBytes, nonceBytes, senderPubKeyBytes, recipientPrivateKey);
    if (!decrypted) throw new Error('Decryption failed - invalid ciphertext or wrong keys');
    const unpadded = unpadMessage(decrypted);
    return encodeUTF8(unpadded);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

// Auto-decrypt: try padded first, fall back to unpadded (backward compat)
export function decryptMessageAuto(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: Uint8Array
): string {
  try {
    return decryptPaddedMessage(ciphertext, nonce, senderPublicKey, recipientPrivateKey);
  } catch {
    // Fallback: try without padding (legacy messages)
    return decryptMessage(ciphertext, nonce, senderPublicKey, recipientPrivateKey);
  }
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
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 600000,
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

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassword(password, salt);

  const encrypted = await crypto.subtle.encrypt(
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

    const decrypted = await crypto.subtle.decrypt(
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
