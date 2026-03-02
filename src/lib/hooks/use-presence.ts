"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PresenceStatus } from "@/components/shared/presence-indicator";

interface PresenceState {
  user_id: string;
  name: string;
  status: "online" | "idle";
}

export function usePresence(userId: string | null, userName: string | null) {
  const [partnerStatus, setPartnerStatus] = useState<PresenceStatus>("offline");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!userId || !userName) return;

    const channel = supabase.channel("presence:app", {
      config: { presence: { key: userId } },
    });

    channelRef.current = channel;

    function updatePartnerStatus(state: Record<string, PresenceState[]>) {
      // Find any presence entry that isn't the current user
      const entries = Object.entries(state);
      for (const [key, presences] of entries) {
        if (key !== userId && presences.length > 0) {
          setPartnerStatus(presences[0].status === "idle" ? "idle" : "online");
          return;
        }
      }
      setPartnerStatus("offline");
    }

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        updatePartnerStatus(state);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            name: userName,
            status: "online",
          } as PresenceState);
        }
      });

    // Idle detection via visibility change
    function handleVisibilityChange() {
      if (document.hidden) {
        channel.track({
          user_id: userId,
          name: userName,
          status: "idle",
        } as PresenceState);
      } else {
        channel.track({
          user_id: userId,
          name: userName,
          status: "online",
        } as PresenceState);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId, userName, supabase]);

  return { partnerStatus };
}
