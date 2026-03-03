"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PresenceIndicator } from "@/components/shared/presence-indicator";
import type { PresenceStatus } from "@/components/shared/presence-indicator";
import { LogOut, Coffee } from "lucide-react";

interface HeaderProps {
  userName?: string;
  partnerName?: string;
  partnerPresence?: PresenceStatus;
}

export function AppHeader({ userName, partnerName, partnerPresence = "offline" }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 lg:hidden">
      <div className="border-b border-white/[0.06] bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex items-center justify-between h-14 px-4 max-w-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold bg-gradient-to-r from-flame via-orange-400 to-amber-400 bg-clip-text text-transparent">365</span>
            {userName && (
              <span className="text-sm text-muted-foreground/80">
                Hey, <span className="text-foreground/90 font-medium">{userName}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Partner presence chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
              <PresenceIndicator status={partnerPresence} size="sm" />
              <span className="text-xs text-muted-foreground/80">
                {partnerName ?? "Partner"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/breaks")}
              title="Breaks"
              className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06]"
            >
              <Coffee className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
              className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06]"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function DesktopHeader({ userName }: { userName?: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="hidden lg:flex sticky top-0 z-50 h-16 items-center justify-between px-8 border-b border-white/[0.06] bg-background/80 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-muted-foreground/80">
            Welcome back, <span className="text-foreground font-medium">{userName}</span>
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="text-muted-foreground/60 hover:text-foreground rounded-xl hover:bg-white/[0.06]"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </header>
  );
}
