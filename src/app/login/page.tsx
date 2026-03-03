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
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden noise">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0c0a09]" />

      {/* Dramatic orbs */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute top-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full bg-flame/[0.08] blur-[200px] animate-gradient" />
        <div className="absolute bottom-[-30%] right-[-15%] w-[700px] h-[700px] rounded-full bg-partner/[0.06] blur-[180px] animate-gradient" style={{ animationDelay: "4s" }} />
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-amber-500/[0.04] blur-[120px] animate-float" />
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-8 shadow-[0_0_60px_-12px_rgba(249,115,22,0.15)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-flame/30 rounded-2xl blur-2xl scale-150" />
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-flame/20 to-orange-600/10 border border-flame/20">
                <Image src="/logo.png" alt="365 Days" width={48} height={48} className="rounded-xl" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-extrabold mt-5 tracking-tight">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-sm text-stone-500 mt-1.5">
              {isSignUp
                ? "Join your accountability partner"
                : "Let's crush today's goals"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.12em]">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-flame/40 focus:ring-flame/20 text-sm placeholder:text-stone-600"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.12em]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-flame/40 focus:ring-flame/20 text-sm placeholder:text-stone-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.12em]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-flame/40 focus:ring-flame/20 text-sm placeholder:text-stone-600"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-flame via-orange-500 to-amber-500 text-white font-bold text-sm shadow-[0_0_24px_-4px_rgba(249,115,22,0.5)] hover:shadow-[0_0_32px_-4px_rgba(249,115,22,0.6)] hover:brightness-110 transition-all"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Loading...
                </div>
              ) : isSignUp ? (
                "Sign Up"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-flame hover:text-amber-400 font-semibold transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>

        <div className="text-center mt-8 flex items-center justify-center gap-2 text-xs text-stone-700">
          <Flame className="h-3 w-3 text-flame/60" />
          <span className="font-medium tracking-wide">365 Days of Accountability</span>
        </div>
      </div>
    </div>
  );
}
