"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/components/shared/presence-indicator";

interface PresenceState {
  user_id: string;
  name: string;
  status: "online" | "idle";
}

const supabase = createClient();

export function usePresence(userId: string | null, userName: string | null) {
  const [partnerStatus, setPartnerStatus] = useState<PresenceStatus>("offline");
  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);

  // Keep refs in sync without triggering effect re-runs
  userIdRef.current = userId;
  userNameRef.current = userName;

  useEffect(() => {
    if (!userId || !userName) return;

    const channel = supabase.channel("presence:app", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const entries = Object.entries(state);
        let found = false;
        for (const [key, presences] of entries) {
          if (key !== userIdRef.current && presences.length > 0) {
            setPartnerStatus(presences[0].status === "idle" ? "idle" : "online");
            found = true;
            break;
          }
        }
        if (!found) setPartnerStatus("offline");
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            name: userName,
            status: document.hidden ? "idle" : "online",
          } as PresenceState);
        }
      });

    function handleVisibilityChange() {
      const uid = userIdRef.current;
      const uname = userNameRef.current;
      if (!uid || !uname) return;

      channel.track({
        user_id: uid,
        name: uname,
        status: document.hidden ? "idle" : "online",
      } as PresenceState);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel.untrack();
      supabase.removeChannel(channel);
    };
    // Only re-run when userId/userName go from null → value (once)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userName]);

  return { partnerStatus };
}
