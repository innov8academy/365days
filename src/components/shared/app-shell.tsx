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
  const { partnerStatus } = usePresence(
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <FlameLogo animate className="h-16 w-16 mx-auto" />
          <div className="text-sm text-muted-foreground">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <AppHeader
        userName={profile?.name}
        partnerName={partner?.name}
        partnerPresence={partnerStatus}
      />
      <BottomNav />
      <SidebarNav
        partnerName={partner?.name}
        partnerPresence={partnerStatus}
      />
      <div className="lg:pl-60">
        <DesktopHeader userName={profile?.name} />
        <main className="mx-auto px-4 py-4 pb-20 lg:pb-8 lg:px-8 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
