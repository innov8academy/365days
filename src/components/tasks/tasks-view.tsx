"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TaskList } from "./task-list";
import { TaskInput } from "./task-input";
import { CheckCircle2, XCircle } from "lucide-react";
import type { DailyTask } from "@/types/database";

interface TasksViewProps {
  userId: string;
  me: { id: string; name: string } | undefined;
  partner: { id: string; name: string } | undefined;
  myTasks: DailyTask[];
  partnerTasks: DailyTask[];
  today: string;
}

export function TasksView({
  userId,
  me,
  partner,
  myTasks: initialMyTasks,
  partnerTasks: initialPartnerTasks,
  today,
}: TasksViewProps) {
  const [myTasks, setMyTasks] = useState(initialMyTasks);
  const [partnerTasks] = useState(initialPartnerTasks);

  const myCompleted = myTasks.filter((t) => t.completed).length;
  const myTotal = myTasks.length;
  const partnerCompleted = partnerTasks.filter((t) => t.completed).length;
  const partnerTotal = partnerTasks.length;

  function handleTaskAdded(task: DailyTask) {
    setMyTasks((prev) => [...prev, task]);
  }

  function handleTaskToggled(taskId: string, completed: boolean) {
    setMyTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
          : t
      )
    );
  }

  function handleTaskDeleted(taskId: string) {
    setMyTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  const statusBadge =
    myTotal > 0 && myCompleted === myTotal ? (
      <Badge className="bg-success/[0.12] text-success border-success/[0.2] rounded-lg">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        All Done! +10pts
      </Badge>
    ) : myTotal > 0 ? (
      <Badge variant="secondary" className="rounded-lg bg-white/[0.06] border-white/[0.08]">
        <XCircle className="h-3 w-3 mr-1" />
        {myCompleted}/{myTotal} — 0pts
      </Badge>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold lg:text-2xl tracking-tight">Today&apos;s Tasks</h1>
        <div className="flex items-center gap-2">{statusBadge}</div>
      </div>

      {/* Mobile: Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="mine" className="w-full">
          <TabsList className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] p-1">
            <TabsTrigger value="mine" className="flex-1 rounded-lg data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground">
              {me?.name ?? "My Tasks"} ({myCompleted}/{myTotal})
            </TabsTrigger>
            <TabsTrigger value="partner" className="flex-1 rounded-lg data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground">
              {partner?.name ?? "Partner"} ({partnerCompleted}/{partnerTotal})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="space-y-4 mt-4">
            <TaskInput userId={userId} date={today} onTaskAdded={handleTaskAdded} />
            <TaskList
              tasks={myTasks}
              isOwner={true}
              onTaskToggled={handleTaskToggled}
              onTaskDeleted={handleTaskDeleted}
            />
          </TabsContent>

          <TabsContent value="partner" className="mt-4">
            <PartnerTaskSection
              partner={partner}
              partnerTasks={partnerTasks}
              partnerCompleted={partnerCompleted}
              partnerTotal={partnerTotal}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Side by side */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        {/* My Tasks */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {me?.name ?? "My Tasks"}{" "}
                <span className="text-muted-foreground/60 font-normal">
                  ({myCompleted}/{myTotal})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TaskInput userId={userId} date={today} onTaskAdded={handleTaskAdded} />
              <TaskList
                tasks={myTasks}
                isOwner={true}
                onTaskToggled={handleTaskToggled}
                onTaskDeleted={handleTaskDeleted}
              />
            </CardContent>
          </Card>
        </div>

        {/* Partner's Tasks */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {partner?.name ?? "Partner"}{" "}
                  <span className="text-muted-foreground/60 font-normal">
                    ({partnerCompleted}/{partnerTotal})
                  </span>
                </CardTitle>
                {partnerTotal > 0 && partnerCompleted === partnerTotal ? (
                  <Badge className="bg-success/[0.12] text-success border-success/[0.2] rounded-lg">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    +10pts
                  </Badge>
                ) : partnerTotal > 0 ? (
                  <Badge variant="secondary" className="rounded-lg bg-white/[0.06] border-white/[0.08]">
                    <XCircle className="h-3 w-3 mr-1" />
                    0pts
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {partnerTasks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground/60 text-sm">
                  {partner?.name ?? "Partner"} hasn&apos;t added tasks yet today.
                </div>
              ) : (
                <TaskList
                  tasks={partnerTasks}
                  isOwner={false}
                  onTaskToggled={() => {}}
                  onTaskDeleted={() => {}}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PartnerTaskSection({
  partner,
  partnerTasks,
  partnerCompleted,
  partnerTotal,
}: {
  partner: { id: string; name: string } | undefined;
  partnerTasks: DailyTask[];
  partnerCompleted: number;
  partnerTotal: number;
}) {
  return (
    <div className="space-y-3">
      {partnerTasks.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] py-8 text-center text-muted-foreground/60 text-sm">
          {partner?.name ?? "Partner"} hasn&apos;t added tasks yet today.
        </div>
      ) : (
        <TaskList
          tasks={partnerTasks}
          isOwner={false}
          onTaskToggled={() => {}}
          onTaskDeleted={() => {}}
        />
      )}
      {partnerTotal > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] py-3 px-4">
          {partnerCompleted === partnerTotal ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">
                All tasks completed! +10pts
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                {partnerCompleted}/{partnerTotal} completed — 0pts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
