"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FlameLogo } from "@/components/shared/flame-logo";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      router.replace(user ? "/dashboard" : "/login");
    });
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <FlameLogo animate className="h-16 w-16" />
    </div>
  );
}
