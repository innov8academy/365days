"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { getToday } from "@/lib/dates";

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
    .limit(60);
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
