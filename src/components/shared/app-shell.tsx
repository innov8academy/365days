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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, partner, loading } = useAuth();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background noise">
        <div className="text-center space-y-4 animate-slide-up">
          <div className="relative">
            <div className="absolute inset-0 bg-flame/30 rounded-full blur-3xl scale-[2]" />
            <FlameLogo animate className="relative h-20 w-20 mx-auto drop-shadow-[0_0_20px_var(--flame-glow)]" />
          </div>
          <div className="text-sm text-muted-foreground font-medium tracking-wide">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen noise">
      {/* Rich ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[200px] -left-[100px] w-[700px] h-[700px] rounded-full bg-flame/[0.05] blur-[180px] animate-gradient" />
        <div className="absolute -bottom-[200px] -right-[100px] w-[600px] h-[600px] rounded-full bg-partner/[0.04] blur-[160px] animate-gradient" style={{ animationDelay: "4s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-amber-500/[0.02] blur-[200px]" />
      </div>

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
        <main className="relative mx-auto px-4 py-6 pb-28 lg:pb-10 lg:px-8 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
