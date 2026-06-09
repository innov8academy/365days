"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch {
      toast.error("Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0c0a09] p-4 noise">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-8 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.85)]">
          <div className="mb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-lg border border-flame/20 bg-flame/[0.08]">
              <Image src="/logo.png" alt="365 Days" width={42} height={42} className="rounded-md" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">
              365 Days
            </h1>
            <p className="mt-1.5 text-sm text-stone-500">Alex & Sivakami</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-lg border-white/[0.08] bg-white/[0.04] text-sm placeholder:text-stone-600 focus:border-flame/40 focus:ring-flame/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-lg border-white/[0.08] bg-white/[0.04] text-sm placeholder:text-stone-600 focus:border-flame/40 focus:ring-flame/20"
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-lg bg-flame text-sm font-bold text-white shadow-[0_0_24px_-8px_rgba(249,115,22,0.7)] hover:bg-orange-500"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-stone-700">
          <Flame className="h-3 w-3 text-flame/70" />
          <span className="font-medium tracking-wide">Private consistency workspace</span>
        </div>
      </div>
    </div>
  );
}
