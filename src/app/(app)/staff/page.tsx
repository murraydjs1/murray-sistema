import { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { requireRole } from "@/server/auth/authorization";

export default async function StaffHome(){
  const user=await requireRole([UserRole.STAFF]);
  const staff=await prisma.staff.findUnique({
    where:{userId:user.id},
    select:{id:true,name:true,eventAssignments:{
      where:{active:true},orderBy:{event:{eventDate:"asc"}},
      select:{id:true,assignmentType:true,notes:true,event:{select:{
        id:true,number:true,eventDate:true,startTime:true,endTime:true,setupTime:true,venue:true,address:true,locality:true,googleMapsUrl:true,status:true,
        managerStaff:{select:{name:true}},
        staffAssignments:{where:{active:true},select:{assignmentType:true,staff:{select:{name:true}}}}
      }}}
    }}
  });
  return <><div className="topbar"><div><div className="eyebrow">Vista operativa</div><h1>Hola, {user.name}</h1><p className="muted">Estos son únicamente tus eventos asignados.</p></div></div>{!staff?<div className="card empty"><h2>Usuario sin perfil de personal</h2><p>Pedile a un administrador que vincule tu usuario con tu ficha de Staff.</p></div>:<div className="staff-events">{staff.eventAssignments.map(a=>{const e=a.event,dj=e.staffAssignments.filter(x=>x.assignmentType==="DJ"||x.assignmentType==="DJ_TECNICO").map(x=>x.staff.name).join(", ")||"A definir",mates=[...new Set(e.staffAssignments.map(x=>x.staff.name).filter(n=>n!==staff.name))].join(", ")||"Sin otros compañeros";return <article className="card staff-event" key={a.id}><div className="row space"><div><div className="eyebrow">{e.number}</div><h2>{e.eventDate.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"})}</h2></div><span className="badge badge-green">{e.status}</span></div><div className="ops-grid"><Info label="Tu función" value={a.assignmentType.replaceAll("_"," ")}/><Info label="Horario" value={`${e.startTime}–${e.endTime}`}/><Info label="Armado" value={e.setupTime||"A definir"}/><Info label="Lugar" value={e.venue}/><Info label="Encargado" value={e.managerStaff?.name||"A definir"}/><Info label="DJ" value={dj}/><Info label="Compañeros" value={mates}/></div>{[e.address,e.locality].filter(Boolean).length>0&&<p className="muted">{[e.address,e.locality].filter(Boolean).join(", ")}</p>}{e.googleMapsUrl&&<a className="btn btn-secondary" href={e.googleMapsUrl} target="_blank" rel="noreferrer">Abrir Google Maps</a>}{a.notes&&<p><strong>Indicaciones:</strong> {a.notes}</p>}</article>})}{!staff.eventAssignments.length&&<div className="card empty"><h2>Sin eventos asignados</h2><p>Cuando te asignen a un evento, aparecerá acá con toda la información operativa.</p></div>}</div>}</>
}
function Info({label,value}:{label:string;value:string}){return <div><small>{label}</small><strong>{value}</strong></div>}
