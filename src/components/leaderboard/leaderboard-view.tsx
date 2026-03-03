"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trophy, Plus, Crown, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEFAULT_POOL_AMOUNT, COMPETITION_DURATION_DAYS } from "@/lib/constants";
import { format, addDays, differenceInDays } from "date-fns";
import type { Competition } from "@/types/database";

interface LeaderboardViewProps {
  userId: string;
  me: { id: string; name: string } | undefined;
  partner: { id: string; name: string } | undefined;
  competition: Competition | null;
  myPoints: number;
  partnerPoints: number;
  myDaysCompleted: number;
  partnerDaysCompleted: number;
  pastCompetitions: Competition[];
}

export function LeaderboardView({
  me,
  partner,
  competition,
  myPoints,
  partnerPoints,
  myDaysCompleted,
  partnerDaysCompleted,
  pastCompetitions,
}: LeaderboardViewProps) {
  const [poolAmount, setPoolAmount] = useState(DEFAULT_POOL_AMOUNT.toString());
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const supabase = createClient();

  const leader =
    myPoints > partnerPoints ? "me" : myPoints < partnerPoints ? "partner" : "tie";
  const daysRemaining = competition
    ? Math.max(0, differenceInDays(new Date(competition.end_date), new Date()))
    : 0;

  async function createCompetition() {
    setCreating(true);
    try {
      const startDate = format(new Date(), "yyyy-MM-dd");
      const endDate = format(
        addDays(new Date(), COMPETITION_DURATION_DAYS),
        "yyyy-MM-dd"
      );
      const { error } = await supabase.from("competitions").insert({
        start_date: startDate,
        end_date: endDate,
        pool_amount: parseFloat(poolAmount),
        status: "active",
      });
      if (error) throw error;
      toast.success("Competition started!");
      setDialogOpen(false);
      window.location.reload();
    } catch {
      toast.error("Failed to create competition");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold tracking-tight">Leaderboard</h1>
        {!competition && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white shadow-lg shadow-flame/20 hover:shadow-flame/30 hover:brightness-110 transition-all">
                <Plus className="h-4 w-4 mr-1" />
                New Competition
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-white/[0.1] bg-background/95 backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle>Start a 30-Day Competition</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pool Amount (₹)</Label>
                  <Input
                    type="number"
                    value={poolAmount}
                    onChange={(e) => setPoolAmount(e.target.value)}
                    min={0}
                    className="h-11 rounded-xl bg-white/[0.06] border-white/[0.1] focus:border-flame/40 focus:ring-flame/20"
                  />
                  <p className="text-xs text-muted-foreground/60">
                    ₹{(parseFloat(poolAmount) / 2).toLocaleString()} each
                  </p>
                </div>
                <Button
                  onClick={createCompetition}
                  disabled={creating}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white shadow-lg shadow-flame/20"
                >
                  {creating ? "Creating..." : "Start Competition"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {competition ? (
        <>
          {/* Active Competition */}
          <Card className="border-amber-400/[0.12] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/[0.06] to-yellow-500/[0.02] pointer-events-none" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-400/[0.1] border border-amber-400/[0.15] flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  Active Competition
                </CardTitle>
                <Badge variant="secondary" className="bg-amber-400/[0.08] text-amber-400 border-amber-400/[0.15] rounded-lg">
                  <Calendar className="h-3 w-3 mr-1" />
                  {daysRemaining}d left
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              {/* Me */}
              <div
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl transition-colors",
                  leader === "me" && "bg-primary/[0.06] border border-primary/[0.12]"
                )}
              >
                {leader === "me" && <Crown className="h-5 w-5 text-amber-400 shrink-0 drop-shadow-[0_0_4px_oklch(0.8_0.18_85/30%)]" />}
                <div className="flex-1">
                  <div className="font-medium">{me?.name ?? "You"}</div>
                  <div className="text-xs text-muted-foreground/50">
                    {myDaysCompleted} perfect days
                  </div>
                </div>
                <div className="text-2xl font-bold text-primary">
                  <AnimatedCounter value={myPoints} />
                </div>
              </div>

              {/* Partner */}
              <div
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl transition-colors",
                  leader === "partner" &&
                    "bg-partner/[0.06] border border-partner/[0.12]"
                )}
              >
                {leader === "partner" && (
                  <Crown className="h-5 w-5 text-amber-400 shrink-0 drop-shadow-[0_0_4px_oklch(0.8_0.18_85/30%)]" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {partner?.name ?? "Partner"}
                  </div>
                  <div className="text-xs text-muted-foreground/50">
                    {partnerDaysCompleted} perfect days
                  </div>
                </div>
                <div className="text-2xl font-bold text-partner">
                  <AnimatedCounter value={partnerPoints} />
                </div>
              </div>

              <Separator className="bg-white/[0.06]" />

              <div className="text-center space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium">Prize Pool</div>
                <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  ₹{competition.pool_amount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground/50">
                  {format(new Date(competition.start_date), "MMM d")} —{" "}
                  {format(new Date(competition.end_date), "MMM d, yyyy")}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How Points Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground/60">All tasks completed</span>
                <span className="font-medium text-success">+10 pts</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground/60">Incomplete tasks</span>
                <span className="font-medium text-destructive">0 pts</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground/60">4+ hours deep work</span>
                <span className="font-medium text-success">+2 pts</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground/60">Streak active</span>
                <span className="font-medium text-success">+1 pt/day</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground/60">No tasks written</span>
                <span className="font-medium text-destructive">-2 pts</span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <Trophy className="h-8 w-8 text-muted-foreground/20" />
            </div>
            <div className="text-lg font-medium">No Active Competition</div>
            <p className="text-sm text-muted-foreground/50 max-w-xs mx-auto">
              Start a 30-day competition to put real money on the line and see who
              can be more consistent!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Past Competitions */}
      {pastCompetitions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Past Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastCompetitions.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]"
                >
                  <div className="text-muted-foreground/60">
                    {format(new Date(comp.start_date), "MMM d")} —{" "}
                    {format(new Date(comp.end_date), "MMM d")}
                  </div>
                  <div className="font-medium bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    ₹{comp.pool_amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
