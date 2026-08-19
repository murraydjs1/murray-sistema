"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Contact, FileText, Landmark, LayoutDashboard, LogOut, Menu, Music2, PackagePlus, ReceiptText, UserRoundCog, Users } from "lucide-react";
type Role = "ADMIN" | "ADMIN_FINANCIERO" | "STAFF";
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
const management: NavItem[] = [
  {href:"/dashboard",label:"Inicio",icon:LayoutDashboard},{href:"/agenda",label:"Agenda",icon:CalendarDays},
  {href:"/personal",label:"Personal",icon:UserRoundCog},{href:"/presupuestos",label:"Presupuestos",icon:FileText},
  {href:"/clientes",label:"Clientes",icon:Contact},{href:"/catalogo",label:"Catálogo",icon:PackagePlus},
  {href:"/gastos",label:"Gastos",icon:ReceiptText},{href:"/tesoreria",label:"Tesorería",icon:Landmark},{href:"/reportes/rentabilidad",label:"Rentabilidad",icon:BarChart3},
];
function isActive(pathname:string,href:string){return pathname===href||(href!=="/dashboard"&&pathname.startsWith(`${href}/`))}
function NavLink({item,compact=false}:{item:NavItem;compact?:boolean}){const pathname=usePathname();const Icon=item.icon;const selected=isActive(pathname,item.href);return <Link href={item.href} className={selected?"active":""} aria-current={selected?"page":undefined}><Icon size={compact?21:19} strokeWidth={1.8}/><span>{item.label}</span></Link>}
export function AppNavigation({role,name,logoutAction}:{role:Role;name:string;logoutAction:()=>Promise<void>}){
 const staff=role==="STAFF";const desktop=staff?[{href:"/staff",label:"Mis eventos",icon:CalendarDays}]:management;
 const primary=management.filter(i=>["/dashboard","/agenda","/presupuestos","/clientes"].includes(i.href));const more=management.filter(i=>["/personal","/catalogo","/gastos","/tesoreria","/reportes/rentabilidad"].includes(i.href));if(role==="ADMIN")more.push({href:"/usuarios",label:"Usuarios",icon:Users});
 return <><aside className="sidebar"><Link href={staff?"/staff":"/dashboard"} className="brand" aria-label="Murray DJs — inicio"><span className="brand-mark"><Music2 size={20}/></span><span className="brand-word">MURRAY <b>DJs</b></span></Link><div className="nav-label">Navegación</div><nav className="nav" aria-label="Navegación principal">{desktop.map(i=><NavLink item={i} key={i.href}/>)}{role==="ADMIN"&&<NavLink item={{href:"/usuarios",label:"Usuarios",icon:Users}}/>}</nav><div className="sidebar-footer"><div className="sidebar-user"><span>{name.slice(0,1).toUpperCase()}</span><div><strong>{name}</strong><small>{role.replace("_"," ")}</small></div></div><form action={logoutAction}><button className="btn btn-ghost sidebar-logout"><LogOut size={18}/>Salir</button></form></div></aside><nav className={`mobilebar ${staff?"staff-mobilebar":""}`} aria-label="Navegación móvil">{staff?<NavLink item={{href:"/staff",label:"Mis eventos",icon:CalendarDays}} compact/>:<>{primary.map(i=><NavLink item={i} key={i.href} compact/>)}<details className="mobile-more"><summary aria-label="Más secciones"><Menu size={21}/><span>Más</span></summary><div className="mobile-more-menu"><div className="mobile-more-title">Más secciones</div>{more.map(i=><NavLink item={i} key={i.href}/>)}<form action={logoutAction}><button className="mobile-menu-action"><LogOut size={19}/>Salir</button></form></div></details></>}</nav></>;
}
