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
        return "bg-blue-400/[0.08] text-blue-400 border-blue-400/[0.15]";
      case "emergency":
        return "bg-red-400/[0.08] text-red-400 border-red-400/[0.15]";
      case "solo":
        return "bg-amber-400/[0.08] text-amber-400 border-amber-400/[0.15]";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Breaks</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white shadow-lg shadow-flame/20 hover:shadow-flame/30 hover:brightness-110 transition-all">
              <Plus className="h-4 w-4 mr-1" />
              Request Break
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-white/[0.1] bg-background/95 backdrop-blur-2xl">
            <DialogHeader>
              <DialogTitle>Request a Break</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Break Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["mutual", "emergency", "solo"] as BreakType[]).map(
                    (type) => (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBreakType(type);
                          setDays("1");
                        }}
                        className={cn(
                          "text-xs rounded-xl transition-all",
                          breakType === type
                            ? "bg-flame/[0.1] text-flame border border-flame/[0.15]"
                            : "bg-white/[0.04] border border-white/[0.06] text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06]"
                        )}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground/50">
                  {breakType === "mutual" &&
                    "Both agree. Streak paused for both."}
                  {breakType === "emergency" &&
                    "No approval needed. Max 2/month."}
                  {breakType === "solo" &&
                    "1 day only. Partner's streak continues. Max 2/month."}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration (days)</Label>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  min={1}
                  max={maxDays}
                  className="h-11 rounded-xl bg-white/[0.06] border-white/[0.1] focus:border-flame/40 focus:ring-flame/20"
                />
                <p className="text-xs text-muted-foreground/50">
                  Max {maxDays} day{maxDays > 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason (optional)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Not feeling well..."
                  className="h-11 rounded-xl bg-white/[0.06] border-white/[0.1] focus:border-flame/40 focus:ring-flame/20 placeholder:text-muted-foreground/40"
                />
              </div>
              <Button
                onClick={requestBreak}
                disabled={creating}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white shadow-lg shadow-flame/20"
              >
                {creating ? "Requesting..." : "Request Break"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Approvals */}
      {pendingBreaks.length > 0 && (
        <Card className="border-blue-400/[0.12]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/[0.04] to-transparent pointer-events-none rounded-2xl" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-base text-blue-400">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-3">
            {pendingBreaks.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-blue-400/[0.04] border border-blue-400/[0.08]"
              >
                <div>
                  <div className="text-sm font-medium">
                    {partner?.name ?? "Partner"} wants a{" "}
                    {b.type} break
                  </div>
                  <div className="text-xs text-muted-foreground/50">
                    {format(new Date(b.start_date), "MMM d")} —{" "}
                    {format(new Date(b.end_date), "MMM d")}
                    {b.reason && ` — "${b.reason}"`}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => approveBreak(b.id)}
                  className="rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white shadow-lg shadow-flame/20"
                >
                  Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Break History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/[0.1] border border-primary/[0.15] flex items-center justify-center">
              <Coffee className="h-3.5 w-3.5 text-primary" />
            </div>
            Break History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {breaks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground/50 text-sm">
              No breaks taken yet. Stay consistent!
            </div>
          ) : (
            <div className="space-y-2">
              {breaks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="text-muted-foreground/40">
                      {getBreakIcon(b.type as BreakType)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {b.requested_by === userId
                          ? me?.name ?? "You"
                          : partner?.name ?? "Partner"}
                      </div>
                      <div className="text-xs text-muted-foreground/50">
                        {format(new Date(b.start_date), "MMM d")} —{" "}
                        {format(new Date(b.end_date), "MMM d")}
                        {b.reason && ` — ${b.reason}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("rounded-lg", getBreakColor(b.type as BreakType))}
                    >
                      {b.type}
                    </Badge>
                    {b.approved ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Break Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Break Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground/60">
          <p>
            <strong className="text-foreground/90">Mutual:</strong> Both agree.
            Streak paused for both. 1-3 days.
          </p>
          <p>
            <strong className="text-foreground/90">Emergency:</strong> No approval
            needed. Streak paused. 1-7 days. Max 2/month.
          </p>
          <p>
            <strong className="text-foreground/90">Solo Pause:</strong> 1 day only.
            Partner&apos;s streak continues. 0 points. Max 2/month.
          </p>
          <p className="text-xs text-muted-foreground/40">
            Break days don&apos;t count toward the 30-day competition (cycle
            extends).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
