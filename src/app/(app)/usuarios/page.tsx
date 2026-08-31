import { saveUser, toggleUser } from "@/app/actions/users";
import { humanLabel } from "@/lib/ui/labels";
import { requireAdmin } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

export default async function Users() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return <>
    <div className="topbar"><div><div className="eyebrow">Accesos y permisos</div><h1>Usuarios</h1></div></div>
    <section className="grid grid-2 users-layout">
      <div>
        <div className="section-head"><h2>Equipo con acceso</h2></div>
        <div className="stack">{users.map((user) =>
          <details className="card user-card" key={user.id}>
            <summary className="row space">
              <div className="user-summary">
                <span className="avatar" aria-hidden>{user.name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{user.name}</strong><div className="muted">{user.email} · {humanLabel(user.role)}</div></div>
              </div>
              <span className={`badge ${user.active ? "badge-green" : ""}`}>{user.active ? "Activo" : "Inactivo"}</span>
            </summary>
            <form action={saveUser} className="form edit-panel">
              <input type="hidden" name="id" value={user.id} />
              <div className="field"><label>Nombre</label><input name="name" defaultValue={user.name} required /></div>
              <div className="field"><label>Email</label><input name="email" type="email" defaultValue={user.email} required /></div>
              <div className="field"><label>Rol</label><select name="role" defaultValue={user.role}><option value="ADMIN">Administrador</option><option value="ADMIN_FINANCIERO">Administración financiera</option><option value="OPERACIONES">Operaciones</option><option value="STAFF">Personal</option></select></div>
              <div className="field"><label>Nueva contraseña (opcional)</label><input name="password" type="password" /></div>
              <div className="row"><button className="btn btn-primary">Guardar cambios</button></div>
            </form>
            <form action={toggleUser.bind(null, user.id)} className="user-toggle"><button className="btn btn-secondary">{user.active ? "Desactivar" : "Activar"}</button></form>
          </details>
        )}</div>
      </div>
      <div>
        <div className="section-head"><h2>Crear usuario</h2></div>
        <form action={saveUser} className="card form">
          <div className="field"><label>Nombre *</label><input name="name" required /></div>
          <div className="field"><label>Email *</label><input name="email" type="email" required /></div>
          <div className="field"><label>Rol *</label><select name="role"><option value="OPERACIONES">Operaciones</option><option value="ADMIN_FINANCIERO">Administración financiera</option><option value="OPERACIONES">Operaciones</option><option value="STAFF">Personal</option><option value="ADMIN">Administrador</option></select></div>
          <div className="field"><label>Contraseña inicial *</label><input name="password" type="password" required /><small className="muted">Usá una contraseña temporal y compartila por un canal seguro.</small></div>
          <button className="btn btn-primary">Crear usuario</button>
        </form>
      </div>
    </section>
  </>;
}
