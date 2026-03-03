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
      <div className="mx-auto max-w-lg px-3 pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="flex items-center justify-around h-[64px] rounded-2xl border border-white/[0.06] bg-[#0f0d0c]/90 backdrop-blur-2xl shadow-[0_-4px_30px_-4px_rgba(0,0,0,0.6)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-[2px] px-4 py-2 text-[10px] font-semibold transition-all duration-300",
                  isActive
                    ? "text-flame"
                    : "text-stone-500 active:text-stone-300"
                )}
              >
                {isActive && (
                  <div className="absolute inset-1 rounded-xl bg-flame/[0.08] border border-flame/[0.12]" />
                )}
                <item.icon
                  className={cn(
                    "relative h-5 w-5 transition-all duration-300",
                    isActive && "scale-110 drop-shadow-[0_0_8px_var(--flame-glow)]",
                    item.href === "/timer" && !isActive && "scale-110 drop-shadow-[0_0_8px_var(--flame-glow)]"
                  )}
                />
                <span className="relative tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
