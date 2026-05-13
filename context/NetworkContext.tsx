"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { syncEngine } from "@/lib/offline";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline";

type NetworkStatus = "online" | "unstable" | "reconnecting" | "offline" | "syncing";

interface NetworkCtx {
  status: NetworkStatus;
  isOnline: boolean;
  pendingSyncCount: number;
}

const NetworkContext = createContext<NetworkCtx>({
  status: "online",
  isOnline: true,
  pendingSyncCount: 0,
});

export const useNetwork = () => useContext(NetworkContext);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const [isOnline, setIsOnline] = useState(true);

  const pendingSyncCount = useLiveQuery(
    () => db.syncQueue.where("status").equals("pending").count(),
    []
  ) || 0;

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
      setStatus(navigator.onLine ? "online" : "offline");
    }

    const handleOnline = () => {
      setStatus("reconnecting");
      setIsOnline(true);
      
      // Attempt a lightweight heartbeat to confirm internet
      fetch('/api/healthcheck', { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          setStatus(pendingSyncCount > 0 ? "syncing" : "online");
        })
        .catch(() => {
          setStatus("unstable");
        });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Heartbeat for unstable detection
    const heartbeatInterval = setInterval(() => {
      if (isOnline && status === "online") {
        const start = Date.now();
        fetch('/manifest.json', { method: 'HEAD', cache: 'no-store' })
          .then(() => {
            const latency = Date.now() - start;
            if (latency > 3000) setStatus("unstable");
            else setStatus(pendingSyncCount > 0 ? "syncing" : "online");
          })
          .catch(() => setStatus("offline"));
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(heartbeatInterval);
    };
  }, [isOnline, pendingSyncCount, status]);

  // Update status when syncing
  useEffect(() => {
    if (isOnline && pendingSyncCount > 0 && status !== "syncing") {
      setStatus("syncing");
    } else if (isOnline && pendingSyncCount === 0 && status === "syncing") {
      setStatus("online");
    }
  }, [isOnline, pendingSyncCount, status]);

  return (
    <NetworkContext.Provider value={{ status, isOnline, pendingSyncCount }}>
      {children}
    </NetworkContext.Provider>
  );
}
