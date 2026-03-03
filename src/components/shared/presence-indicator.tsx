"use client";

import { cn } from "@/lib/utils";

export type PresenceStatus = "online" | "idle" | "offline";

interface PresenceIndicatorProps {
  status: PresenceStatus;
  showLabel?: boolean;
  lastSeen?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig = {
  online: {
    dot: "bg-emerald-500",
    animate: "animate-presence-pulse",
    label: "Online",
  },
  idle: {
    dot: "bg-amber-400",
    animate: "",
    label: "Idle",
  },
  offline: {
    dot: "bg-muted-foreground/40",
    animate: "",
    label: "Offline",
  },
};

const sizeConfig = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
};

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PresenceIndicator({
  status,
  showLabel = false,
  lastSeen,
  size = "sm",
  className,
}: PresenceIndicatorProps) {
  const config = statusConfig[status];

  const label =
    status === "offline" && lastSeen
      ? `Last seen ${formatLastSeen(lastSeen)}`
      : config.label;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "rounded-full shrink-0",
          sizeConfig[size],
          config.dot,
          config.animate
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
