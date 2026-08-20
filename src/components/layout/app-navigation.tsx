"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Contact, Landmark, LayoutDashboard, LogOut, Menu, PackagePlus, ReceiptText, Upload, UserRoundCog, Users } from "lucide-react";
type Role = "ADMIN" | "ADMIN_FINANCIERO" | "STAFF";
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };
const management: NavItem[] = [
  {href:"/dashboard",label:"Inicio",icon:LayoutDashboard},{href:"/agenda",label:"Agenda",icon:CalendarDays},
  {href:"/personal",label:"Personal",icon:UserRoundCog},{href:"/eventos",label:"Eventos",icon:CalendarDays},
  {href:"/clientes",label:"Clientes",icon:Contact},{href:"/catalogo",label:"Catálogo",icon:PackagePlus},
  {href:"/gastos",label:"Gastos",icon:ReceiptText},{href:"/tesoreria",label:"Tesorería",icon:Landmark},{href:"/reportes/rentabilidad",label:"Rentabilidad",icon:BarChart3},{href:"/configuracion/importar-excel",label:"Importar Excel",icon:Upload},
];
function isActive(pathname:string,href:string){return pathname===href||(href!=="/dashboard"&&pathname.startsWith(`${href}/`))}
function NavLink({item,compact=false}:{item:NavItem;compact?:boolean}){const pathname=usePathname();const Icon=item.icon;const selected=isActive(pathname,item.href);return <Link href={item.href} className={selected?"active":""} aria-current={selected?"page":undefined}><Icon size={compact?21:19} strokeWidth={1.8}/><span>{item.label}</span></Link>}
export function AppNavigation({role,name,logoutAction}:{role:Role;name:string;logoutAction:()=>Promise<void>}){
 const staff=role==="STAFF";const desktop=staff?[{href:"/staff",label:"Mis eventos",icon:CalendarDays}]:role==="ADMIN"?[...management,{href:"/usuarios",label:"Usuarios",icon:Users}]:management;
  const primary=management.filter(i=>["/dashboard","/agenda","/eventos","/clientes"].includes(i.href));const more=management.filter(i=>["/personal","/catalogo","/gastos","/tesoreria","/reportes/rentabilidad","/configuracion/importar-excel"].includes(i.href));if(role==="ADMIN"){primary.push({href:"/usuarios",label:"Usuarios",icon:Users});more.push({href:"/usuarios",label:"Usuarios",icon:Users});}
 return <><aside className="sidebar"><Link href={staff?"/staff":"/dashboard"} className="brand" aria-label="Murray DJs — inicio"><Image src="/brand/murray-logo-dark.svg" alt="Murray Disc Jockeys" width={168} height={96} priority style={{width:168,height:"auto"}} /></Link><div className="nav-label">Navegación</div><nav className="nav" aria-label="Navegación principal">{desktop.map(i=><NavLink item={i} key={i.href}/>)}</nav><div className="sidebar-footer"><div className="sidebar-user"><span>{name.slice(0,1).toUpperCase()}</span><div><strong>{name}</strong><small>{role.replace("_"," ")}</small></div></div><form action={logoutAction}><button className="btn btn-ghost sidebar-logout"><LogOut size={18}/>Salir</button></form></div></aside><nav className={`mobilebar ${staff?"staff-mobilebar":""}`} aria-label="Navegación móvil">{staff?<NavLink item={{href:"/staff",label:"Mis eventos",icon:CalendarDays}} compact/>:<>{primary.map(i=><NavLink item={i} key={i.href} compact/>)}<details className="mobile-more"><summary aria-label="Más secciones"><Menu size={21}/><span>Más</span></summary><div className="mobile-more-menu"><div className="mobile-more-title">Más secciones</div>{more.map(i=><NavLink item={i} key={i.href}/>)}<form action={logoutAction}><button className="mobile-menu-action"><LogOut size={19}/>Salir</button></form></div></details></>}</nav></>;
}
