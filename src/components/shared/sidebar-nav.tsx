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
  partnerLastSeen?: string | null;
}

export function SidebarNav({
  partnerName,
  partnerPresence = "offline",
  partnerLastSeen,
}: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-white/[0.06] bg-[#0f0d0c]/90 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-white/[0.06]">
        <Image src="/logo.png" alt="365 Days" width={36} height={36} className="rounded-xl" />
        <div>
          <span className="font-display font-bold text-lg bg-gradient-to-r from-flame via-amber-400 to-orange-300 bg-clip-text text-transparent">
            365 Days
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
            Menu
          </span>
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                isActive
                  ? "text-flame font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active background glow */}
              {isActive && (
                <>
                  <div className="absolute inset-0 rounded-xl bg-flame/[0.08] border border-flame/[0.15]" />
                  <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-flame shadow-[0_0_8px_2px_var(--flame-glow)]" />
                </>
              )}
              <item.icon className={cn(
                "relative h-[18px] w-[18px] shrink-0 transition-all",
                isActive && "drop-shadow-[0_0_6px_var(--flame-glow)]"
              )} />
              <span className="relative">{item.label}</span>
              {!isActive && (
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-white/[0.03] transition-opacity" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Partner Presence */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-partner/20 flex items-center justify-center text-sm font-bold text-partner">
              {partnerName ? partnerName.charAt(0).toUpperCase() : "P"}
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f0d0c]",
                partnerPresence === "online" && "bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]",
                partnerPresence === "idle" && "bg-amber-400",
                partnerPresence === "offline" && "bg-stone-600"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {partnerName ?? "Partner"}
            </div>
            <PresenceIndicator status={partnerPresence} showLabel lastSeen={partnerLastSeen} size="sm" />
          </div>
        </div>
      </div>
    </aside>
  );
}
