"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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

    // Trigger check-pop animation
    if (newCompleted) {
      setAnimatingId(task.id);
      setTimeout(() => setAnimatingId(null), 300);
    }

    onTaskToggled(task.id, newCompleted);

    // Check if all tasks are now completed
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
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center text-muted-foreground">
          No tasks yet. Add your first task above!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className={cn(
            "shadow-sm transition-all duration-300",
            task.completed && "opacity-60",
            animatingId === task.id && "animate-check-pop"
          )}
        >
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleTask(task)}
              disabled={!isOwner}
              className="shrink-0 data-[state=checked]:bg-success data-[state=checked]:border-success"
            />
            <span
              className={cn(
                "flex-1 text-sm transition-all duration-300",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
