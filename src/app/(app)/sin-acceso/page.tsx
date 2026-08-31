import Link from "next/link";
import { requireUser } from "@/server/auth/authorization";
export default async function NoAccess(){const user=await requireUser();return <div className="card empty"><h1>Sin acceso</h1><p>Tu usuario {user.name} no tiene permiso para ver esta sección.</p><Link className="btn btn-primary" href={user.role==="STAFF"?"/staff":user.role==="OPERACIONES"?"/eventos":"/dashboard"}>Volver al inicio</Link></div>}
