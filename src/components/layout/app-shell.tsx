import { logout } from "@/app/actions/auth";
import { AppNavigation } from "@/components/layout/app-navigation";
import { requireUser } from "@/server/auth/authorization";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="shell">
    <AppNavigation role={user.role} name={user.name} logoutAction={logout} />
    <main className="main">
      <header className="workspace-header">
        <div className="workspace-brand">MURRAY <span>DJs</span></div>
        <div className="user"><strong>{user.name}</strong><div className="muted user-role">{user.role.replace("_", " ")}</div></div>
      </header>
      {children}
    </main>
  </div>;
}
