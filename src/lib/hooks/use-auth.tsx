"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { AppMember } from "@/types/database";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  equipped_badge: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  partner: Profile | null;
  membership: AppMember | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  partner: null,
  membership: null,
  loading: true,
});

const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<AppMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }
      setUser(authUser);

      const { data: member, error: memberError } = await supabase
        .from("app_members")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (!memberError && member) {
        setMembership(member as AppMember);
        if (!member.active) {
          setProfile(null);
          setPartner(null);
          setLoading(false);
          return;
        }
      } else if (!memberError) {
        setMembership(null);
        setProfile(null);
        setPartner(null);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase.from("profiles").select("*");
      if (profiles) {
        setProfile(profiles.find((p) => p.id === authUser.id) ?? null);
        setPartner(profiles.find((p) => p.id !== authUser.id) ?? null);
      }
      setLoading(false);
    }
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setPartner(null);
        setMembership(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, partner, membership, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
