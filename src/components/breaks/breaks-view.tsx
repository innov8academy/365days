"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Coffee,
  Plus,
  AlertTriangle,
  Pause,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  MAX_MUTUAL_BREAK_DAYS,
  MAX_EMERGENCY_BREAK_DAYS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Break, BreakType } from "@/types/database";

interface BreaksViewProps {
  userId: string;
  me: { id: string; name: string } | undefined;
  partner: { id: string; name: string } | undefined;
  breaks: Break[];
}

export function BreaksView({
  userId,
  me,
  partner,
  breaks: initialBreaks,
}: BreaksViewProps) {
  const [breaks, setBreaks] = useState(initialBreaks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [breakType, setBreakType] = useState<BreakType>("mutual");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  const maxDays =
    breakType === "mutual"
      ? MAX_MUTUAL_BREAK_DAYS
      : breakType === "emergency"
        ? MAX_EMERGENCY_BREAK_DAYS
        : 1;

  const pendingBreaks = breaks.filter(
    (b) => !b.approved && b.type === "mutual" && b.requested_by !== userId
  );

  async function requestBreak() {
    setCreating(true);
    try {
      const startDate = format(new Date(), "yyyy-MM-dd");
      const endDate = format(
        addDays(new Date(), parseInt(days) - 1),
        "yyyy-MM-dd"
      );

      const { data, error } = await supabase
        .from("breaks")
        .insert({
          requested_by: userId,
          type: breakType,
          start_date: startDate,
          end_date: endDate,
          reason: reason || null,
          approved: breakType !== "mutual",
        })
        .select()
        .single();

      if (error) throw error;
      setBreaks((prev) => [data as Break, ...prev]);
      setDialogOpen(false);
      setReason("");
      setDays("1");
      toast.success(
        breakType === "mutual"
          ? "Break requested! Waiting for partner approval."
          : "Break activated!"
      );
    } catch {
      toast.error("Failed to request break");
    } finally {
      setCreating(false);
    }
  }

  async function approveBreak(breakId: string) {
    const { error } = await supabase
      .from("breaks")
      .update({ approved: true })
      .eq("id", breakId);

    if (error) {
      toast.error("Failed to approve break");
      return;
    }

    setBreaks((prev) =>
      prev.map((b) => (b.id === breakId ? { ...b, approved: true } : b))
    );
    toast.success("Break approved!");
  }

  const getBreakIcon = (type: BreakType) => {
    switch (type) {
      case "mutual":
        return <Users className="h-4 w-4" />;
      case "emergency":
        return <AlertTriangle className="h-4 w-4" />;
      case "solo":
        return <Pause className="h-4 w-4" />;
    }
  };

  const getBreakColor = (type: BreakType) => {
    switch (type) {
      case "mutual":
        return "bg-blue-500/15 text-blue-500 border-blue-500/30";
      case "emergency":
        return "bg-red-500/15 text-red-500 border-red-500/30";
      case "solo":
        return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Breaks</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-primary to-flame text-primary-foreground shadow-sm">
              <Plus className="h-4 w-4 mr-1" />
              Request Break
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a Break</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Break Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["mutual", "emergency", "solo"] as BreakType[]).map(
                    (type) => (
                      <Button
                        key={type}
                        variant={breakType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setBreakType(type);
                          setDays("1");
                        }}
                        className={cn(
                          "text-xs",
                          breakType === type && "bg-gradient-to-r from-primary to-flame text-primary-foreground"
                        )}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {breakType === "mutual" &&
                    "Both agree. Streak paused for both."}
                  {breakType === "emergency" &&
                    "No approval needed. Max 2/month."}
                  {breakType === "solo" &&
                    "1 day only. Partner's streak continues. Max 2/month."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  min={1}
                  max={maxDays}
                />
                <p className="text-xs text-muted-foreground">
                  Max {maxDays} day{maxDays > 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Not feeling well..."
                />
              </div>
              <Button
                onClick={requestBreak}
                disabled={creating}
                className="w-full bg-gradient-to-r from-primary to-flame text-primary-foreground"
              >
                {creating ? "Requesting..." : "Request Break"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Approvals */}
      {pendingBreaks.length > 0 && (
        <Card className="border-blue-500/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-500">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingBreaks.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5"
              >
                <div>
                  <div className="text-sm font-medium">
                    {partner?.name ?? "Partner"} wants a{" "}
                    {b.type} break
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(b.start_date), "MMM d")} —{" "}
                    {format(new Date(b.end_date), "MMM d")}
                    {b.reason && ` — "${b.reason}"`}
                  </div>
                </div>
                <Button size="sm" onClick={() => approveBreak(b.id)} className="bg-gradient-to-r from-primary to-flame text-primary-foreground">
                  Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Break History */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            Break History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {breaks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No breaks taken yet. Stay consistent!
            </div>
          ) : (
            <div className="space-y-3">
              {breaks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getBreakIcon(b.type as BreakType)}
                    <div>
                      <div className="font-medium">
                        {b.requested_by === userId
                          ? me?.name ?? "You"
                          : partner?.name ?? "Partner"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(b.start_date), "MMM d")} —{" "}
                        {format(new Date(b.end_date), "MMM d")}
                        {b.reason && ` — ${b.reason}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getBreakColor(b.type as BreakType)}
                    >
                      {b.type}
                    </Badge>
                    {b.approved ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Break Rules */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Break Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Mutual:</strong> Both agree.
            Streak paused for both. 1-3 days.
          </p>
          <p>
            <strong className="text-foreground">Emergency:</strong> No approval
            needed. Streak paused. 1-7 days. Max 2/month.
          </p>
          <p>
            <strong className="text-foreground">Solo Pause:</strong> 1 day only.
            Partner&apos;s streak continues. 0 points. Max 2/month.
          </p>
          <p className="text-xs">
            Break days don&apos;t count toward the 30-day competition (cycle
            extends).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
