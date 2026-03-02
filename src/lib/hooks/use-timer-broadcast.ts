"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TimerState {
  user_id: string;
  mode: string;
  seconds_left: number;
  is_running: boolean;
}

interface PartnerTimer {
  mode: string;
  secondsLeft: number;
  isRunning: boolean;
}

export function useTimerBroadcast(userId: string | null) {
  const [partnerTimer, setPartnerTimer] = useState<PartnerTimer | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel("timer:status");
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "timer_update" }, ({ payload }) => {
        const data = payload as TimerState;
        if (data.user_id !== userId) {
          setPartnerTimer({
            mode: data.mode,
            secondsLeft: data.seconds_left,
            isRunning: data.is_running,
          });

          // Clear partner timer after 30s of no updates if they were running
          // This handles the case where they close the tab
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const broadcast = useCallback(
    (state: { mode: string; secondsLeft: number; isRunning: boolean }) => {
      if (!channelRef.current || !userId) return;
      channelRef.current.send({
        type: "broadcast",
        event: "timer_update",
        payload: {
          user_id: userId,
          mode: state.mode,
          seconds_left: state.secondsLeft,
          is_running: state.isRunning,
        } as TimerState,
      });
    },
    [userId]
  );

  return { partnerTimer, broadcast };
}
