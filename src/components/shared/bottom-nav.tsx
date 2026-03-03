"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Timer,
  Flame,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/timer", label: "Timer", icon: Timer },
  { href: "/streak", label: "Streak", icon: Flame },
  { href: "/leaderboard", label: "Board", icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="mx-auto max-w-lg px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 rounded-2xl mb-2 border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-lg shadow-black/20">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-4 py-2 text-[10px] font-medium transition-all duration-300",
                  isActive
                    ? "text-flame"
                    : "text-muted-foreground/70 hover:text-foreground/80"
                )}
              >
                {/* Active pill background */}
                {isActive && (
                  <div className="absolute inset-0 mx-1 rounded-xl bg-flame/[0.1] border border-flame/[0.15]" />
                )}
                <item.icon
                  className={cn(
                    "relative h-5 w-5 transition-all duration-300",
                    isActive && "scale-110 drop-shadow-[0_0_6px_var(--flame-glow)]"
                  )}
                />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
