"use client";

import { cn } from "@/lib/utils";

export type PresenceStatus = "online" | "idle" | "offline";

interface PresenceIndicatorProps {
  status: PresenceStatus;
  showLabel?: boolean;
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

export function PresenceIndicator({
  status,
  showLabel = false,
  size = "sm",
  className,
}: PresenceIndicatorProps) {
  const config = statusConfig[status];

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
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
