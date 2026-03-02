"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  const supabaseRef = useRef(createClient());

  const updatePartnerStatus = useCallback(
    (state: Record<string, PresenceState[]>) => {
      const entries = Object.entries(state);
      for (const [key, presences] of entries) {
        if (key !== userId && presences.length > 0) {
          setPartnerStatus(presences[0].status === "idle" ? "idle" : "online");
          return;
        }
      }
      setPartnerStatus("offline");
    },
    [userId]
  );

  useEffect(() => {
    if (!userId || !userName) return;

    const supabase = supabaseRef.current;

    // Clean up any existing channel first
    if (channelRef.current) {
      channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel("presence:app", {
      config: { presence: { key: userId } },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        updatePartnerStatus(state);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const joined = newPresences as unknown as PresenceState[];
        if (joined.some((p) => p.user_id !== userId)) {
          setPartnerStatus(joined[0].status === "idle" ? "idle" : "online");
        }
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const left = leftPresences as unknown as PresenceState[];
        if (left.some((p) => p.user_id !== userId)) {
          setPartnerStatus("offline");
        }
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
      channelRef.current = null;
    };
  }, [userId, userName, updatePartnerStatus]);

  return { partnerStatus };
}
