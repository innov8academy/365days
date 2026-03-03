"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/components/shared/presence-indicator";

interface PresenceState {
  user_id: string;
  name: string;
  status: "online" | "idle";
  last_active: string; // ISO timestamp
}

// How often to re-track presence (keeps state fresh, detects stale connections)
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

// How long before inactivity within the tab marks user as idle
const IDLE_TIMEOUT_MS = 5 * 60_000; // 5 minutes

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

const supabase = createClient();

export function usePresence(userId: string | null, userName: string | null) {
  const [partnerStatus, setPartnerStatus] = useState<PresenceStatus>("offline");
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);

  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);
  const lastActivityRef = useRef(Date.now());
  const isIdleRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  userIdRef.current = userId;
  userNameRef.current = userName;

  const getCurrentStatus = useCallback((): "online" | "idle" => {
    if (document.hidden) return "idle";
    if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) return "idle";
    return "online";
  }, []);

  const trackPresence = useCallback(() => {
    const channel = channelRef.current;
    const uid = userIdRef.current;
    const uname = userNameRef.current;
    if (!channel || !uid || !uname) return;

    const status = getCurrentStatus();
    isIdleRef.current = status === "idle";

    channel.track({
      user_id: uid,
      name: uname,
      status,
      last_active: new Date().toISOString(),
    } as PresenceState);
  }, [getCurrentStatus]);

  useEffect(() => {
    if (!userId || !userName) return;

    const channel = supabase.channel("presence:app", {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const entries = Object.entries(state);
        let found = false;
        for (const [key, presences] of entries) {
          if (key !== userIdRef.current && presences.length > 0) {
            const p = presences[0];
            setPartnerStatus(p.status === "idle" ? "idle" : "online");
            setPartnerLastSeen(p.last_active);
            found = true;
            break;
          }
        }
        if (!found) {
          setPartnerStatus("offline");
          // Keep last known lastSeen — don't clear it
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            name: userName,
            status: getCurrentStatus(),
            last_active: new Date().toISOString(),
          } as PresenceState);
        }
      });

    // --- Heartbeat: re-track every 30s to keep presence fresh ---
    const heartbeatInterval = setInterval(() => {
      trackPresence();
    }, HEARTBEAT_INTERVAL_MS);

    // --- Activity-based idle detection ---
    function handleActivity() {
      lastActivityRef.current = Date.now();
      // If user was idle and becomes active, re-track immediately
      if (isIdleRef.current) {
        trackPresence();
      }
    }

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    // --- Tab visibility change ---
    function handleVisibilityChange() {
      if (!document.hidden) {
        lastActivityRef.current = Date.now();
      }
      trackPresence();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // --- Idle check interval (check if user went AFK with tab open) ---
    const idleCheckInterval = setInterval(() => {
      const wasIdle = isIdleRef.current;
      const isNowIdle = getCurrentStatus() === "idle";
      if (!wasIdle && isNowIdle) {
        trackPresence();
      }
    }, 30_000); // Check every 30s

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(idleCheckInterval);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userName]);

  return { partnerStatus, partnerLastSeen };
}
