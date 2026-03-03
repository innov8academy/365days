"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import type { DailyTask } from "@/types/database";

interface TaskListProps {
  tasks: DailyTask[];
  isOwner: boolean;
  onTaskToggled: (taskId: string, completed: boolean) => void;
  onTaskDeleted: (taskId: string) => void;
}

export function TaskList({
  tasks,
  isOwner,
  onTaskToggled,
  onTaskDeleted,
}: TaskListProps) {
  const supabase = createClient();
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#f59e0b", "#ef4444", "#10b981", "#8b5cf6"],
    });
  }, []);

  async function toggleTask(task: DailyTask) {
    if (!isOwner) return;
    const newCompleted = !task.completed;

    if (newCompleted) {
      setAnimatingId(task.id);
      setTimeout(() => setAnimatingId(null), 300);
    }

    onTaskToggled(task.id, newCompleted);

    if (newCompleted) {
      const allDone = tasks.every((t) =>
        t.id === task.id ? true : t.completed
      );
      if (allDone && tasks.length > 0) {
        setTimeout(fireConfetti, 200);
      }
    }

    const { error } = await supabase
      .from("daily_tasks")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      onTaskToggled(task.id, !newCompleted);
      toast.error("Failed to update task");
    }
  }

  async function deleteTask(taskId: string) {
    if (!isOwner) return;
    onTaskDeleted(taskId);

    const { error } = await supabase
      .from("daily_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] py-8 text-center text-stone-600 text-sm">
        No tasks yet. Add your first task above!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className={cn(
            "group flex items-center gap-3 py-3 px-4 rounded-xl border border-white/[0.05] bg-white/[0.02] transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] animate-slide-in",
            task.completed && "opacity-40",
            animatingId === task.id && "animate-check-pop"
          )}
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => toggleTask(task)}
            disabled={!isOwner}
            className="shrink-0 rounded-md border-stone-600 data-[state=checked]:bg-success data-[state=checked]:border-success data-[state=checked]:shadow-[0_0_8px_-2px_rgba(34,197,94,0.5)]"
          />
          <span
            className={cn(
              "flex-1 text-sm transition-all duration-300",
              task.completed && "line-through text-stone-600"
            )}
          >
            {task.title}
          </span>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-lg text-stone-700 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
