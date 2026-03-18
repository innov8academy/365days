"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PresenceIndicator } from "@/components/shared/presence-indicator";
import type { PresenceStatus } from "@/components/shared/presence-indicator";
import { EquippedBadge } from "@/components/badges/equipped-badge";
import { LogOut, Coffee, Award } from "lucide-react";

interface HeaderProps {
  userName?: string;
  partnerName?: string;
  partnerPresence?: PresenceStatus;
  partnerLastSeen?: string | null;
  myEquippedBadge?: string | null;
  partnerEquippedBadge?: string | null;
}

export function AppHeader({ userName, partnerName, partnerPresence = "offline", partnerLastSeen, myEquippedBadge, partnerEquippedBadge }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 lg:hidden">
      <div className="border-b border-white/[0.06] bg-[#0c0a09]/90 backdrop-blur-2xl">
        <div className="mx-auto flex items-center justify-between h-14 px-4 max-w-lg">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-xl bg-gradient-to-r from-flame via-amber-400 to-orange-300 bg-clip-text text-transparent">
              365
            </span>
            {userName && (
              <span className="text-sm text-stone-500 flex items-center gap-1.5">
                Hey, <span className="text-stone-300 font-medium">{userName}</span>
                <EquippedBadge achievementId={myEquippedBadge} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <PresenceIndicator status={partnerPresence} lastSeen={partnerLastSeen} size="sm" />
              <span className="text-xs text-stone-500 font-medium">
                {partnerName ?? "Partner"}
              </span>
              <EquippedBadge achievementId={partnerEquippedBadge} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/achievements")}
              title="Achievements"
              className="h-8 w-8 rounded-xl text-stone-600 hover:text-stone-300 hover:bg-white/[0.04]"
            >
              <Award className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/breaks")}
              title="Breaks"
              className="h-8 w-8 rounded-xl text-stone-600 hover:text-stone-300 hover:bg-white/[0.04]"
            >
              <Coffee className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
              className="h-8 w-8 rounded-xl text-stone-600 hover:text-stone-300 hover:bg-white/[0.04]"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function DesktopHeader({ userName, equippedBadge }: { userName?: string; equippedBadge?: string | null }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="hidden lg:flex sticky top-0 z-50 h-16 items-center justify-between px-8 border-b border-white/[0.06] bg-[#0c0a09]/80 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-stone-500 flex items-center gap-1.5">
            Welcome back, <span className="text-stone-200 font-semibold">{userName}</span>
            <EquippedBadge achievementId={equippedBadge} />
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="text-stone-600 hover:text-stone-300 rounded-xl hover:bg-white/[0.04]"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </header>
  );
}
