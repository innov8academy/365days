"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { usePresence } from "@/lib/hooks/use-presence";
import { AppHeader, DesktopHeader } from "@/components/shared/app-header";
import { BottomNav } from "@/components/shared/bottom-nav";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { FlameLogo } from "@/components/shared/flame-logo";
import { useRealtimeSync } from "@/lib/hooks/use-data";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, partner, membership, loading } = useAuth();
  const { partnerStatus, partnerLastSeen } = usePresence(
    user?.id ?? null,
    profile?.name ?? null
  );
  const router = useRouter();
  useRealtimeSync();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background noise">
        <div className="text-center space-y-4 animate-slide-up">
          <FlameLogo animate className="h-20 w-20 mx-auto drop-shadow-[0_0_20px_var(--flame-glow)]" />
          <div className="text-sm text-muted-foreground font-medium tracking-wide">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!profile || (membership && !membership.active)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-lg border border-white/[0.08] bg-white/[0.03] p-6 text-center space-y-4">
          <FlameLogo className="h-12 w-12 mx-auto" />
          <div>
            <h1 className="text-lg font-semibold">Private access only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This account is not active for this 365 Days workspace.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen noise">
      <AppHeader
        userName={profile?.name}
        partnerName={partner?.name}
        partnerPresence={partnerStatus}
        partnerLastSeen={partnerLastSeen}
      />
      <BottomNav />
      <SidebarNav
        partnerName={partner?.name}
        partnerPresence={partnerStatus}
        partnerLastSeen={partnerLastSeen}
      />
      <div className="lg:pl-64">
        <DesktopHeader userName={profile?.name} />
        <main className="relative mx-auto px-4 py-6 pb-28 lg:pb-10 lg:px-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
}
