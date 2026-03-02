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
        <h1 className="text-xl font-bold">Leaderboard</h1>
        {!competition && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-primary to-flame text-primary-foreground shadow-sm">
                <Plus className="h-4 w-4 mr-1" />
                New Competition
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a 30-Day Competition</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Total Pool Amount (₹)</Label>
                  <Input
                    type="number"
                    value={poolAmount}
                    onChange={(e) => setPoolAmount(e.target.value)}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    ₹{(parseFloat(poolAmount) / 2).toLocaleString()} each
                  </p>
                </div>
                <Button
                  onClick={createCompetition}
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-primary to-flame text-primary-foreground"
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
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Active Competition
                </CardTitle>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Calendar className="h-3 w-3 mr-1" />
                  {daysRemaining}d left
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Me */}
              <div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  leader === "me" && "bg-primary/10 border border-primary/30"
                )}
              >
                {leader === "me" && <Crown className="h-5 w-5 text-amber-500 shrink-0" />}
                <div className="flex-1">
                  <div className="font-medium">{me?.name ?? "You"}</div>
                  <div className="text-xs text-muted-foreground">
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
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  leader === "partner" &&
                    "bg-partner/10 border border-partner/30"
                )}
              >
                {leader === "partner" && (
                  <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {partner?.name ?? "Partner"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {partnerDaysCompleted} perfect days
                  </div>
                </div>
                <div className="text-2xl font-bold text-partner">
                  <AnimatedCounter value={partnerPoints} />
                </div>
              </div>

              <Separator />

              <div className="text-center space-y-1">
                <div className="text-sm text-muted-foreground">Prize Pool</div>
                <div className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  ₹{competition.pool_amount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(competition.start_date), "MMM d")} —{" "}
                  {format(new Date(competition.end_date), "MMM d, yyyy")}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How Points Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  All tasks completed
                </span>
                <span className="font-medium text-success">+10 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incomplete tasks</span>
                <span className="font-medium text-destructive">0 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  4+ hours deep work
                </span>
                <span className="font-medium text-success">+2 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Streak active</span>
                <span className="font-medium text-success">+1 pt/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">No tasks written</span>
                <span className="font-medium text-destructive">-2 pts</span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center space-y-3">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <div className="text-lg font-medium">No Active Competition</div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Start a 30-day competition to put real money on the line and see who
              can be more consistent!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Past Competitions */}
      {pastCompetitions.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Past Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastCompetitions.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
                >
                  <div>
                    <div className="text-muted-foreground">
                      {format(new Date(comp.start_date), "MMM d")} —{" "}
                      {format(new Date(comp.end_date), "MMM d")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ₹{comp.pool_amount.toLocaleString()}
                    </div>
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
