"use client";

import { useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";
import { getToday, getYesterday } from "@/lib/dates";

const supabase = createClient();

// Reusable fetcher functions
async function fetchTodayTasks() {
  const today = getToday();
  const { data } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("date", today)
    .order("created_at");
  return data ?? [];
}

async function fetchTodayDeepWork() {
  const today = getToday();
  const { data } = await supabase
    .from("deep_work_sessions")
    .select("*")
    .eq("date", today)
    .order("started_at", { ascending: false });
  return data ?? [];
}

async function fetchYesterdayTasks() {
  const yesterday = getYesterday();
  const { data } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("date", yesterday)
    .order("created_at");
  return data ?? [];
}

async function fetchYesterdayDeepWork() {
  const yesterday = getYesterday();
  const { data } = await supabase
    .from("deep_work_sessions")
    .select("*")
    .eq("date", yesterday)
    .order("started_at", { ascending: false });
  return data ?? [];
}

async function fetchStreak() {
  const { data } = await supabase
    .from("streaks")
    .select("*")
    .limit(1)
    .single();
  return data;
}

async function fetchActiveCompetition() {
  const { data } = await supabase
    .from("competitions")
    .select("*")
    .eq("status", "active")
    .limit(1)
    .single();
  return data;
}

async function fetchSummaries() {
  const { data } = await supabase
    .from("daily_summaries")
    .select("*")
    .order("date", { ascending: false })
    .limit(200);
  return data ?? [];
}

async function fetchBreaks() {
  const { data } = await supabase
    .from("breaks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// SWR hooks with fast revalidation
const swrOptions = {
  revalidateOnFocus: true,
  dedupingInterval: 2000,
};

export function useTodayTasks() {
  return useSWR("today-tasks", fetchTodayTasks, swrOptions);
}

export function useTodayDeepWork() {
  return useSWR("today-deepwork", fetchTodayDeepWork, swrOptions);
}

export function useYesterdayTasks() {
  return useSWR("yesterday-tasks", fetchYesterdayTasks, swrOptions);
}

export function useYesterdayDeepWork() {
  return useSWR("yesterday-deepwork", fetchYesterdayDeepWork, swrOptions);
}

export function useStreak() {
  return useSWR("streak", fetchStreak, swrOptions);
}

export function useActiveCompetition() {
  return useSWR("active-competition", fetchActiveCompetition, swrOptions);
}

export function useSummaries() {
  return useSWR("summaries", fetchSummaries, swrOptions);
}

export function useBreaks() {
  return useSWR("breaks", fetchBreaks, swrOptions);
}

// Auto-trigger daily summary for yesterday if it's missing (gap between midnight and cron)
export function useGapFiller() {
  const triggered = useRef(false);
  const { data: summaries } = useSummaries();

  useEffect(() => {
    if (triggered.current || !summaries) return;

    const yesterday = getYesterday();
    const hasYesterdaySummary = summaries.some((s) => s.date === yesterday);

    if (!hasYesterdaySummary) {
      triggered.current = true;
      fetch("/api/admin/trigger-cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: yesterday }),
      }).then(() => {
        // Revalidate all caches after summary is created
        mutate("summaries");
        mutate("streak");
      }).catch(() => {
        // Silently fail — the frontend fallback still handles display
        triggered.current = false;
      });
    }
  }, [summaries]);
}

// Real-time subscription: auto-revalidate SWR caches when DB changes
export function useRealtimeSync() {
  useEffect(() => {
    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_tasks" },
        () => {
          mutate("today-tasks");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deep_work_sessions" },
        () => {
          mutate("today-deepwork");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_summaries" },
        () => {
          mutate("summaries");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "streaks" },
        () => {
          mutate("streak");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competitions" },
        () => {
          mutate("active-competition");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "breaks" },
        () => {
          mutate("breaks");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
