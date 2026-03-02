import { AuthProvider } from "@/lib/hooks/use-auth";
import { AppShell } from "@/components/shared/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
