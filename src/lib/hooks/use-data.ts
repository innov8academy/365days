"use client";

import { useEffect } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";
import { getToday, getISTMonthRange } from "@/lib/dates";

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

async function fetchStreak() {
  const { data } = await supabase
    .from("streaks")
    .select("*")
    .limit(1)
    .single();
  return data;
}

async function fetchSummaries() {
  const { data } = await supabase
    .from("daily_summaries")
    .select("*")
    .order("date", { ascending: false })
    .limit(800);
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

async function fetchMorningPasses() {
  const today = getToday();
  const { start: monthStart, end: monthEnd } = getISTMonthRange(today);
  const { data } = await supabase
    .from("morning_passes")
    .select("*")
    .gte("date", monthStart)
    .lte("date", monthEnd)
    .order("date", { ascending: false });
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

export function useStreak() {
  return useSWR("streak", fetchStreak, swrOptions);
}

export function useSummaries() {
  return useSWR("summaries", fetchSummaries, swrOptions);
}

export function useBreaks() {
  return useSWR("breaks", fetchBreaks, swrOptions);
}

export function useMorningPasses() {
  return useSWR("morning-passes", fetchMorningPasses, swrOptions);
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
        { event: "*", schema: "public", table: "breaks" },
        () => {
          mutate("breaks");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "morning_passes" },
        () => {
          mutate("morning-passes");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
