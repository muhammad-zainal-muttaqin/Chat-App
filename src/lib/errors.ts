// Type definition for Convex Error structure
interface ConvexError {
  data: unknown;
  message?: string;
}

// Custom error codes
export const AuthErrors = {
  USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',
  INVALID_PASSWORD: 'ERR_INVALID_PASSWORD',
  KEY_DECRYPT_FAILED: 'ERR_KEY_DECRYPT_FAILED',
  DUPLICATE_PUBLIC_KEY: 'ERR_DUPLICATE_PUBLIC_KEY',
} as const;

// Type guard to check if an error is a ConvexError-like object
function isConvexError(error: unknown): error is ConvexError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'data' in error
  );
}

function extractRequestId(text: string): string | null {
  const match = text.match(/Request ID:\s*([a-zA-Z0-9]+)/i);
  return match?.[1] ?? null;
}

function isInternalConvexMessage(text: string): boolean {
  return text.includes('[CONVEX') || text.includes('Server Error Called by client');
}

function toSafeServerMessage(text: string): string {
  const requestId = extractRequestId(text);
  return requestId
    ? `Terjadi gangguan server. Coba lagi. (Ref: ${requestId})`
    : 'Terjadi gangguan server. Coba lagi dalam beberapa saat.';
}

function mapKnownAuthCode(text: string): string | null {
  if (text.includes(AuthErrors.USER_NOT_FOUND)) {
    return 'Email belum terdaftar. Silakan daftar terlebih dahulu.';
  }
  if (text.includes(AuthErrors.INVALID_PASSWORD)) {
    return 'Email atau password salah.';
  }
  if (text.includes(AuthErrors.KEY_DECRYPT_FAILED)) {
    return 'Gagal membuka kunci enkripsi. Cek password Anda.';
  }
  if (text.includes(AuthErrors.DUPLICATE_PUBLIC_KEY)) {
    return 'Kunci keamanan bentrok. Silakan login ulang.';
  }
  if (text.toLowerCase().includes('not authenticated')) {
    return 'Sesi Anda berakhir. Silakan login ulang.';
  }
  return null;
}

/**
 * Extracts a user-friendly error message from an unknown error object.
 * Handles Convex errors, standard Errors, and other unknown types.
 */
export function getAuthErrorMessage(error: unknown): string {
  const defaultMessage = 'Login gagal. Silakan coba lagi.';

  if (typeof error === 'string') {
    return mapKnownAuthCode(error) ??
      (isInternalConvexMessage(error) ? toSafeServerMessage(error) : error || defaultMessage);
  }

  // 1. Handle Convex Errors (checking data property)
  if (isConvexError(error)) {
    const errorData = error.data;
    if (typeof errorData === 'string') {
      return mapKnownAuthCode(errorData) ??
        (isInternalConvexMessage(errorData) ? toSafeServerMessage(errorData) : errorData || defaultMessage);
    }
  }

  // 2. Handle Standard Errors and Error-like objects (checking message property)
  const errorMessage = (error as any)?.message;
  if (typeof errorMessage === 'string') {
    return mapKnownAuthCode(errorMessage) ??
      (isInternalConvexMessage(errorMessage) ? toSafeServerMessage(errorMessage) : errorMessage || defaultMessage);
  }

  return defaultMessage;
}
