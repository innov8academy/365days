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
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        All Done! +10pts
      </Badge>
    ) : myTotal > 0 ? (
      <Badge variant="secondary">
        <XCircle className="h-3 w-3 mr-1" />
        {myCompleted}/{myTotal} — 0pts
      </Badge>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold lg:text-2xl">Today&apos;s Tasks</h1>
        <div className="flex items-center gap-2">{statusBadge}</div>
      </div>

      {/* Mobile: Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="mine" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="mine" className="flex-1">
              {me?.name ?? "My Tasks"} ({myCompleted}/{myTotal})
            </TabsTrigger>
            <TabsTrigger value="partner" className="flex-1">
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
                <span className="text-muted-foreground font-normal">
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
                  <span className="text-muted-foreground font-normal">
                    ({partnerCompleted}/{partnerTotal})
                  </span>
                </CardTitle>
                {partnerTotal > 0 && partnerCompleted === partnerTotal ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    +10pts
                  </Badge>
                ) : partnerTotal > 0 ? (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    0pts
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {partnerTasks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
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
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {partner?.name ?? "Partner"} hasn&apos;t added tasks yet today.
          </CardContent>
        </Card>
      ) : (
        <TaskList
          tasks={partnerTasks}
          isOwner={false}
          onTaskToggled={() => {}}
          onTaskDeleted={() => {}}
        />
      )}
      {partnerTotal > 0 && (
        <Card>
          <CardContent className="py-3">
            {partnerCompleted === partnerTotal ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  All tasks completed! +10pts
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">
                  {partnerCompleted}/{partnerTotal} completed — 0pts
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
