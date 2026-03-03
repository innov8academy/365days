"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TASK_TITLE_MAX_LENGTH } from "@/lib/constants";
import type { DailyTask } from "@/types/database";

interface TaskInputProps {
  userId: string;
  date: string;
  onTaskAdded: (task: DailyTask) => void;
}

export function TaskInput({ userId, date, onTaskAdded }: TaskInputProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    if (trimmed.length > TASK_TITLE_MAX_LENGTH) {
      toast.error(`Task title must be ${TASK_TITLE_MAX_LENGTH} characters or less`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_tasks")
        .insert({
          user_id: userId,
          date,
          title: trimmed,
        })
        .select()
        .single();

      if (error) throw error;
      onTaskAdded(data as DailyTask);
      setTitle("");
      mutate("today-tasks");
      toast.success("Task added!");
    } catch {
      toast.error("Failed to add task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="What will you accomplish today?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={TASK_TITLE_MAX_LENGTH}
        className="flex-1 h-10 rounded-xl bg-white/[0.06] border-white/[0.1] focus:border-flame/40 focus:ring-flame/20 transition-all placeholder:text-muted-foreground/40"
      />
      <Button
        type="submit"
        size="icon"
        disabled={loading || !title.trim()}
        className="h-10 w-10 rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white shadow-lg shadow-flame/20 hover:shadow-flame/30 hover:brightness-110 transition-all disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
