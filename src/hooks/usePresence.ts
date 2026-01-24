import { useEffect, useRef } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function usePresence(token: string | null) {
  const updatePresence = useMutation(api.users.updatePresence);
  const setOffline = useMutation(api.users.setOffline);
  const intervalRef = useRef<number | null>(null);

  // Heartbeat effect
  useEffect(() => {
    if (!token) return;

    // Initial heartbeat
    updatePresence({ token });

    // Setup interval for periodic heartbeat
    intervalRef.current = window.setInterval(() => {
      updatePresence({ token });
    }, HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, updatePresence]);

  // Handle tab visibility change
  useEffect(() => {
    if (!token) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume heartbeat when tab becomes visible
        updatePresence({ token });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, updatePresence]);

  // Handle beforeunload (tab/browser close)
  useEffect(() => {
    if (!token) return;

    const handleBeforeUnload = () => {
      // Best effort to set offline - may not always complete
      setOffline({ token });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [token, setOffline]);
}
