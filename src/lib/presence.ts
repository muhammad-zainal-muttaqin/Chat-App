// Offline threshold: 5 minutes (increased to handle client-server clock skew)
const OFFLINE_THRESHOLD = 5 * 60 * 1000;

export interface PresenceInfo {
  lastSeenAt: number | null;
  isOnline: boolean;
}

/**
 * Check if user is considered online based on last seen timestamp
 */
export function isUserOnline(presence: any | null | undefined): boolean {
  if (!presence) return false;
  
  // Prefer the server-calculated status if available
  if (typeof presence.isOnline === 'boolean') {
    return presence.isOnline;
  }

  // Fallback to client-side check (less reliable due to clock skew)
  if (!presence.lastSeenAt) return false;
  const timeSinceLastSeen = Date.now() - presence.lastSeenAt;
  return timeSinceLastSeen < OFFLINE_THRESHOLD;
}

/**
 * Format last seen timestamp to human readable string
 */
export function formatLastSeen(lastSeenAt: number | null | undefined): string {
  if (!lastSeenAt) return 'Offline';

  const now = Date.now();
  const diff = now - lastSeenAt;

  // Within threshold = online
  if (diff < OFFLINE_THRESHOLD) {
    return 'Online';
  }

  // Format relative time
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  if (hours < 24) return `Last seen ${hours}h ago`;
  if (days < 7) return `Last seen ${days}d ago`;

  // More than a week, show date
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString()}`;
}
