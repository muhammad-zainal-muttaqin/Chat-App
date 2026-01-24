// Type definition for Convex Error structure
interface ConvexError {
  data: unknown;
  message?: string;
}

// Custom error codes
export const AuthErrors = {
  USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',
  INVALID_PASSWORD: 'ERR_INVALID_PASSWORD',
} as const;

// Type guard to check if an error is a ConvexError-like object
function isConvexError(error: unknown): error is ConvexError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'data' in error
  );
}

/**
 * Extracts a user-friendly error message from an unknown error object.
 * Handles Convex errors, standard Errors, and other unknown types.
 */
export function getAuthErrorMessage(error: unknown): string {
  // Default fallback message
  let message = 'Login gagal. Silakan coba lagi.';

  // 1. Handle Convex Errors (checking data property)
  if (isConvexError(error)) {
    const errorData = error.data;
    if (typeof errorData === 'string') {
      if (errorData.includes(AuthErrors.USER_NOT_FOUND)) {
        return 'Email is not registered. Please sign up first.';
      }
      if (errorData.includes(AuthErrors.INVALID_PASSWORD)) {
        return 'Incorrect email or password.';
      }
      // Return raw message if it's a custom string but not one of our known codes
      // But filter out the generic "Server Error" wrapper if possible
      if (errorData !== 'Server Error Called by client') {
        return errorData;
      }
    }
  }

  // 2. Handle Standard Errors (checking message property)
  if (error instanceof Error) {
    // Sometimes the message itself contains the code if not properly wrapped
    if (error.message.includes(AuthErrors.USER_NOT_FOUND)) {
      return 'Email is not registered. Please sign up first.';
    }
    if (error.message.includes(AuthErrors.INVALID_PASSWORD)) {
      return 'Incorrect email or password.';
    }
    
    // Avoid showing the generic "Server Error Called by client"
    if (error.message !== 'Server Error Called by client') {
      return error.message;
    }
  }

  return message;
}
