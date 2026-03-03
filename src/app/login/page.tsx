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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-background" />
      <div className="fixed inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-flame/[0.07] blur-[120px] animate-gradient" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-partner/[0.06] blur-[120px] animate-gradient" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-primary/[0.04] blur-[80px] animate-float" />
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-2xl p-8 shadow-2xl">
          {/* Logo area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-flame/20 to-orange-500/10 border border-flame/20 mb-4">
              <Image src="/logo.png" alt="365 Days" width={40} height={40} className="rounded-lg" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSignUp
                ? "Join your accountability partner"
                : "Let's crush today's goals"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  className="h-11 rounded-xl bg-white/[0.06] border-white/[0.1] focus:border-flame/40 focus:ring-flame/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl bg-white/[0.06] border-white/[0.1] focus:border-flame/40 focus:ring-flame/20 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 rounded-xl bg-white/[0.06] border-white/[0.1] focus:border-flame/40 focus:ring-flame/20 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-flame to-orange-500 text-white font-medium shadow-lg shadow-flame/20 hover:shadow-flame/30 hover:brightness-110 transition-all"
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

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-flame hover:text-flame/80 font-medium transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>

        {/* Bottom accent text */}
        <div className="text-center mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50">
          <Flame className="h-3 w-3 text-flame/50" />
          <span>365 Days of Accountability</span>
        </div>
      </div>
    </div>
  );
}
