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
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="mx-auto flex items-center justify-between h-14 px-4 max-w-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-flame to-orange-500 bg-clip-text text-transparent">365</span>
          {userName && (
            <span className="text-sm text-muted-foreground">
              Hey, {userName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Partner presence chip */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
            <PresenceIndicator status={partnerPresence} size="sm" />
            <span className="text-xs text-muted-foreground">
              {partnerName ?? "Partner"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/breaks")}
            title="Breaks"
          >
            <Coffee className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
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
    <header className="hidden lg:flex sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 items-center justify-between px-8">
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-muted-foreground">
            Welcome back, <span className="text-foreground font-medium">{userName}</span>
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="text-muted-foreground"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </header>
  );
}
