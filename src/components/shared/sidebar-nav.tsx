"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Timer,
  Flame,
  Trophy,
  Coffee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PresenceIndicator } from "@/components/shared/presence-indicator";
import type { PresenceStatus } from "@/components/shared/presence-indicator";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/timer", label: "Deep Work", icon: Timer },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/breaks", label: "Breaks", icon: Coffee },
];

interface SidebarNavProps {
  partnerName?: string;
  partnerPresence?: PresenceStatus;
}

export function SidebarNav({
  partnerName,
  partnerPresence = "offline",
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:border-r bg-sidebar">
      <div className="flex items-center gap-2 h-16 px-6 border-b">
        <Image src="/logo.png" alt="365 Days" width={32} height={32} className="rounded" />
        <span className="text-sm text-muted-foreground">Days</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-primary to-flame text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Partner Presence */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-2">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-partner/15 flex items-center justify-center text-xs font-medium text-partner">
              {partnerName ? partnerName.charAt(0).toUpperCase() : "P"}
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar",
                partnerPresence === "online" && "bg-emerald-500",
                partnerPresence === "idle" && "bg-amber-400",
                partnerPresence === "offline" && "bg-muted-foreground/40"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {partnerName ?? "Partner"}
            </div>
            <PresenceIndicator status={partnerPresence} showLabel size="sm" />
          </div>
        </div>
      </div>
    </aside>
  );
}
