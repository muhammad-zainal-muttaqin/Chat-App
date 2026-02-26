import { useEffect, useRef } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const HEARTBEAT_INTERVAL = 2000; // 2 seconds (faster updates)

export function usePresence(token: string | null, deviceId: string | null) {
  const updatePresence = useMutation(api.users.updatePresence);
  const setOffline = useMutation(api.users.setOffline);
  const intervalRef = useRef<number | null>(null);

  // Store mutation functions in refs to avoid dependency issues
  const updatePresenceRef = useRef(updatePresence);
  const setOfflineRef = useRef(setOffline);

  // Keep refs updated
  useEffect(() => {
    updatePresenceRef.current = updatePresence;
    setOfflineRef.current = setOffline;
  }, [updatePresence, setOffline]);

  // Heartbeat effect
  useEffect(() => {
    if (!token || !deviceId) return;

    const sendHeartbeat = async () => {
      try {
        await updatePresenceRef.current({ token, deviceId });
      } catch (err) {
        console.error('Failed to send heartbeat:', err);
      }
    };

    // Initial heartbeat
    sendHeartbeat();

    // Setup interval for periodic heartbeat
    intervalRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, deviceId]);

  // Handle tab visibility change
  useEffect(() => {
    if (!token || !deviceId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume heartbeat when tab becomes visible
        updatePresenceRef.current({ token, deviceId }).catch(err => {
          console.error('Failed to send heartbeat on visibility change:', err);
        });
      }
    };

    const handleFocus = () => {
      updatePresenceRef.current({ token, deviceId }).catch(err => {
        console.error('Failed to send heartbeat on focus:', err);
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token, deviceId]);

  // Handle beforeunload (tab/browser close)
  useEffect(() => {
    if (!token || !deviceId) return;

    const handleBeforeUnload = () => {
      // Best effort to set offline - may not always complete
      setOfflineRef.current({ token, deviceId });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [token, deviceId]);
}
