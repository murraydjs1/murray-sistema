import { logout } from "@/app/actions/auth";
import { AppNavigation } from "@/components/layout/app-navigation";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { requireUser } from "@/server/auth/authorization";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="shell">
    <AppNavigation role={user.role} name={user.name} logoutAction={logout} />
    <main className="main">
      <WorkspaceHeader name={user.name} role={user.role} />
      <div className="main-content">{children}</div>
    </main>
  </div>;
}
