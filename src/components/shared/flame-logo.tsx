import { cn } from "@/lib/utils";

interface FlameLogoProps {
  className?: string;
  animate?: boolean;
}

export function FlameLogo({ className, animate = false }: FlameLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(animate && "animate-pulse", className)}
    >
      <defs>
        <linearGradient id="flame-grad" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Outer flame shape matching the Nano icon */}
      <path
        d="M32 4C32 4 18 22 18 38c0 7.7 6.3 14 14 14s14-6.3 14-14C46 22 32 4 32 4z"
        fill="url(#flame-grad)"
      />
      {/* Inner cutout — lighter inner flame */}
      <path
        d="M32 24c0 0-8 10-8 20c0 4.4 3.6 8 8 8s8-3.6 8-8C40 34 32 24 32 24z"
        fill="currentColor"
        className="text-background"
      />
    </svg>
  );
}
