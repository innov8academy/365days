"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  variant?: "default" | "flame" | "success" | "partner"
}) {
  const variantClasses = {
    default: "bg-primary shadow-[0_0_12px_-2px_rgba(251,146,60,0.5)]",
    flame: "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 shadow-[0_0_14px_-2px_rgba(249,115,22,0.6)]",
    success: "bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_14px_-2px_rgba(34,197,94,0.5)]",
    partner: "bg-gradient-to-r from-violet-500 to-purple-400 shadow-[0_0_14px_-2px_rgba(167,139,250,0.5)]",
  }

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 rounded-full", variantClasses[variant])}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
